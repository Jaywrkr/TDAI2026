"""Program bus A/B + crossfade + master fade.

Cambio importante: el crossfade ya NO se anima programando una llamada
run() por frame (0.45 s a 60 fps eran 27 callbacks de Python por
transicion, mas la logica de tokens para cancelarlas). Ahora:

    /project1.Xfadetarget  (0 o 1)
        -> Parameter CHOP -> Lag CHOP (lag = Transition Seconds) -> Null
        -> expresion unica en program_cross.cross

La rampa la hace TouchDesigner de forma nativa. Python solo dispara el
cambio de destino y agenda UNA sola llamada para cerrar la transicion.
"""

# TouchDesigner inyecta sus globales (op, run, absTime, project y las
# constantes de tipo como baseCOMP o glslTOP) en su propio namespace y en los
# DATs, pero NO en modulos importados desde sys.path. Hay que pedirlos.
# El try existe para que las herramientas de td/tools/ puedan importar este
# modulo fuera de TouchDesigner.
try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass


from . import config, shader
from .tdutil import (safe_set, safe_set_first, safe_expr, safe_expr_first,
                     connect, log)


# ---------------------------------------------------------------
# BLOOM - dos GLSL TOP: prefiltro de brillos + glow por mipmaps
# ---------------------------------------------------------------
# Version anterior: UNA pasada con 16 muestras en dos anillos (4 y 8 px).
# Daba un halo angosto y con "dientes" -- a 1280 px de salida, 8 px de
# radio no llega a leerse como resplandor, y 8 muestras por anillo dejan
# el patron del anillo a la vista sobre lineas finas.
#
# Ahora:
#   1. bloom_prefilter: se queda solo con lo que pasa del umbral (con
#      rodilla suave, sin corte duro). Tiene que ser una pasada APARTE:
#      si el umbral se aplicara sobre los mipmaps de la imagen completa,
#      una linea fina brillante se promediaria con el negro de al lado
#      en los niveles chicos, caeria bajo el umbral y perderia el glow
#      justo donde mas se luce en este set.
#   2. program_bloom: lee los MIPMAPS del prefiltro (textureLod, niveles
#      1..6 = de ~2 a ~64 px) con 4 muestras giradas por nivel. El GPU ya
#      hizo el promedio al generar los mips, asi que 24 muestras cubren
#      un radio que a mano pediria cientos. Resultado: glow ancho y suave
#      tipo lente, por el mismo costo que el anillo de antes.
#
# Siguen siendo GLSL TOP y no Blur/Level/Composite TOP: los nombres de
# parametro de esos varian entre builds de TD y no se pueden verificar
# sin la app abierta; estos se validan con glslangValidator como las
# escenas. El unico parametro nuevo es el filtro de entrada en mipmap
# (ver _build_bloom); si esa build de TD no lo acepta, las muestras
# desplazadas por nivel igual dan un blur -- mas grueso, no negro.
#
# RESPLANDOR (canal 'glow', parametro Resplandor; en Halloween la tira de
# Mod): pedido del VJ, que a mano usaba Bloom + Level subiendo con el
# bajo para que "solo los detalles mas claros brillen y lo demas no".
#   0.5 = el bloom de siempre, EXACTO (render_resplandor.py --check).
#   0.5 -> 0: el glow baja hasta desaparecer (nada brilla).
#   0.5 -> 1: "solo lo que brilla": sube el umbral (solo lo mas claro
#     entra al glow), lo oscuro de la imagen se hunde a negro (nivel de
#     negro, como el Level TOP), el glow crece y sube el grano. El BAJO
#     empuja las tres cosas: en cada bajo queda aun menos y brilla mas.
#     Usa el bajo (envolvente suave) y no el kick: late con la musica sin
#     cortar a negro de golpe, y no suma destellos.
_BLOOM_PREFILTER_FRAG = """
out vec4 fragColor;

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    // Mismo umbral que la version de una pasada (0.35): el glow tiene que
    // notarse SIEMPRE por defecto, no solo en las partes casi quemadas.
    // KNEE: la entrada al glow es una curva cuadratica de ancho 2*KNEE
    // alrededor del umbral, no un escalon -- sin esto, un brillo que
    // oscila justo en el umbral (audioLift) hace titilar el halo.
    //
    // KICK: pedido explicito ("que la intensidad se prenda y se apague y
    // se note, sobre todo el brillo"). En escenas negras con solo filos
    // finos (esos filos SON la iluminacion de la sala), un kick baja el
    // umbral -- mas del filo entra al glow en el golpe -- y program_bloom
    // (input 2, textura de control) multiplica el resultado. uKick ya es
    // un transitorio que decae solo (ver audio.py): sube y baja el mismo,
    // no hace falta ninguna logica de encendido/apagado aca.
    const float THRESH = 0.35;
    const float KNEE = 0.2;
    float thresh = THRESH - clamp(uKick, 0.0, 1.0) * 0.16;
    // Resplandor arriba de 0.5: solo lo mas claro entra al glow
    float hi = clamp(clamp(uGlow, 0.0, 1.0) * 2.0 - 1.0, 0.0, 1.0);
    float bassG = clamp(uBass, 0.0, 1.0) * clamp(uAudioamt, 0.0, 1.0);
    thresh += hi * (0.22 + 0.10 * bassG);

    vec3 c = texture(sTD2DInputs[0], vUV.st).rgb;
    float l = luminance(c);
    float soft = clamp(l - thresh + KNEE, 0.0, 2.0 * KNEE);
    soft = soft * soft / (4.0 * KNEE);
    float contrib = max(soft, l - thresh) / max(l, 1e-4);

    fragColor = TDOutputSwizzle(vec4(c * contrib, 1.0));
}
"""

_BLOOM_FRAG = """
out vec4 fragColor;

void main() {
    // AMOUNT: cuanto glow se suma (afinado en simulacion CPU contra el
    // bloom anterior: mismo pico junto a la linea, mas aire alrededor).
    // LEVELS: cuantos niveles de mip (el ultimo, 6, cubre ~64 px).
    const float AMOUNT = 1.6;
    const int LEVELS = 6;
    // Kick: mismo motivo que en el prefiltro. KICK_GLOW empuja el glow.
    const float KICK_GLOW = 1.1;
    float kick = clamp(uKick, 0.0, 1.0);

    // PUMP ("sidechain" visual): la imagen ENTERA baja entre golpes y
    // pega arriba en cada bombo. Subir solo el brillo en el golpe no
    // alcanzaba: los visuales ya estan cerca de su tope y el tonemap se
    // comia la diferencia (medido: un filo rojo oscilaba x1.09). Para que
    // "se prenda y se apague" hace falta tambien el "se apague": entre
    // golpes baja a PUMP_FLOOR, en el golpe sube a 1+PUMP_BOOST.
    // Simulado con techno y reggaeton: x2.5-2.8 de oscilacion.
    //   depth = perilla Audio x groove: sin bombo sonando (break, entre
    //   temas, sin microfono) groove cae a 0 y la imagen vuelve SOLA a su
    //   brillo normal; con la perilla Audio en 0 no bombea nunca.
    const float PUMP_FLOOR = 0.45;
    const float PUMP_BOOST = 0.60;
    float env = pow(max(clamp(uBeat, 0.0, 1.0), kick), 0.8);
    float depth = clamp(uAudioamt, 0.0, 1.0)
                * smoothstep(0.30, 0.70, clamp(uGroove, 0.0, 1.0));
    float pump = 1.0 + depth * (PUMP_FLOOR + (1.0 + PUMP_BOOST - PUMP_FLOOR) * env - 1.0);

    vec2 uv = vUV.st;
    // Input 0: imagen original. Input 1: prefiltro (solo brillos).
    // textureLod 0 explicito: la entrada tiene filtro mipmap y no hace
    // falta que el GPU adivine el nivel por derivadas.
    vec3 base = textureLod(sTD2DInputs[0], uv, 0.0).rgb;
    vec2 texel = uTD2DInfos[1].res.xy;   // res = (1/ancho, 1/alto, ancho, alto)

    vec3 glow = vec3(0.0);
    float wsum = 0.0;
    for (int i = 1; i <= LEVELS; i++) {
        float lod = float(i);
        // 4 muestras en cruz a ~1 texel DEL NIVEL (2^lod px de salida),
        // giradas distinto en cada nivel: los mips de caja dejan bloques
        // cuadrados, y la cruz girada los redondea sin sumar costo.
        float ang = lod * 0.9;
        vec2 d1 = vec2(cos(ang), sin(ang)) * texel * exp2(lod) * 0.75;
        vec2 d2 = vec2(-d1.y, d1.x);
        vec3 s = textureLod(sTD2DInputs[1], uv + d1, lod).rgb
               + textureLod(sTD2DInputs[1], uv - d1, lod).rgb
               + textureLod(sTD2DInputs[1], uv + d2, lod).rgb
               + textureLod(sTD2DInputs[1], uv - d2, lod).rgb;
        // Peso 1/nivel: los niveles chicos dan el nucleo junto a la
        // linea, los anchos el "aire" alrededor. Con peso plano el
        // nucleo quedaba debil y el glow se leia como neblina.
        float w = 1.0 / lod;
        glow += s * 0.25 * w;
        wsum += w;
    }
    glow /= wsum;

    // RESPLANDOR (ver la nota arriba de _BLOOM_PREFILTER_FRAG)
    float g = clamp(uGlow, 0.0, 1.0);
    float lo = clamp(1.0 - g * 2.0, 0.0, 1.0);       // 1 en 0: sin brillo
    float hi = clamp(g * 2.0 - 1.0, 0.0, 1.0);       // 1 en 1: solo lo que brilla
    float bassG = clamp(uBass, 0.0, 1.0) * clamp(uAudioamt, 0.0, 1.0);
    float amount = AMOUNT * (1.0 - lo) * (1.0 + hi * (1.6 + 1.8 * bassG));
    // fase 43: el BRILLO (tira Mod) late con la musica en cualquier nivel,
    // no solo arriba: con la perilla Audio en 0 queda quieto como antes;
    // con audio, entre golpes baja un poco y con el bajo sube.
    float aud = clamp(uAudioamt, 0.0, 1.0);
    amount *= (1.0 - 0.35 * aud) + 0.9 * bassG;
    if (hi > 0.0) {
        // nivel de negro: lo que no es claro se hunde (sin cambiar el tono)
        float l = dot(base, vec3(0.299, 0.587, 0.114));
        float bp = hi * (0.15 + 0.11 * bassG);
        base *= smoothstep(bp, bp + 0.18 + 0.20 * (1.0 - hi), l) * (1.0 + hi * (0.25 + 0.35 * bassG));
    }

    vec3 col = (base + glow * amount * (1.0 + kick * KICK_GLOW)) * pump;

    // grano de pelicula, mas fuerte en los medios: con lo oscuro hundido
    // es lo que mantiene la textura del cuadro
    if (hi > 0.0) {
        vec2 px = floor(gl_FragCoord.xy);
        float n = fract(sin(dot(px + floor(uRTime * 24.0) * vec2(17.0, 31.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        float lc = dot(col, vec3(0.299, 0.587, 0.114));
        col = max(col + n * hi * 0.10 * (0.25 + sqrt(clamp(lc, 0.0, 1.0))), 0.0);
    }

    // Tonemap de hombro suave. El footer de las escenas ya comprime lo
    // que pasa de 1.0, pero el glow se suma DESPUES de eso y nadie lo
    // frenaba: donde el bloom caia sobre algo ya brillante, el pixel
    // volvia a pasar de 1.0 y la salida de 8 bits lo recortaba a blanco
    // plano. Por debajo de KNEE esto no toca nada (el set se ve igual en
    // medios tonos y sombras); por encima, curva asintotica hacia 1.0,
    // asi el pico conserva forma en vez de ser una mancha.
    const float KNEE = 0.8;
    vec3 over = max(col - KNEE, 0.0);
    col = col - over + over / (1.0 + over / (1.0 - KNEE));

    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
"""


_BLOOM_NOCTRL = ('#define uKick 0.0\n#define uBeat 0.0\n'
                 '#define uGroove 0.0\n#define uAudioamt 0.0\n'
                 '#define uGlow 0.5\n#define uBass 0.0\n#define uRTime 0.0\n')


def _build_bloom(proj, src_top, ctrl_tex=None, channels=None):
    # uKick (input 2, textura de control) empuja el glow con cada golpe de
    # bomba -- ver la nota en _BLOOM_PREFILTER_FRAG/_BLOOM_FRAG. Sin
    # ctrl_tex (build() suelto, sin audio) cae a 0.0: mismo bloom fijo de
    # siempre, sin uKick indefinido.
    if ctrl_tex is not None and channels:
        head = shader.ctrl_header(channels, 2)
    else:
        head = _BLOOM_NOCTRL

    pre_src = proj.create(textDAT, 'bloom_prefilter_src')
    pre_src.nodeX, pre_src.nodeY = 1000, 160
    pre_src.text = head + _BLOOM_PREFILTER_FRAG

    pre = proj.create(glslTOP, 'bloom_prefilter')
    pre.nodeX, pre.nodeY = 1000, 380
    safe_set_first(pre, ['pixeldat', 'pixelshader'], pre_src.path)
    connect(pre, src_top, 0)
    if ctrl_tex is not None and channels:
        connect(pre, ctrl_tex, 2)
    safe_set_first(pre, ['format', 'pixelformat'], 'rgba16float')

    src = proj.create(textDAT, 'bloom_src')
    src.nodeX, src.nodeY = 1160, 160
    src.text = head + _BLOOM_FRAG

    glsl = proj.create(glslTOP, 'program_bloom')
    glsl.nodeX, glsl.nodeY = 1160, 380
    safe_set_first(glsl, ['pixeldat', 'pixelshader'], src.path)
    connect(glsl, src_top, 0)
    connect(glsl, pre, 1)
    if ctrl_tex is not None and channels:
        connect(glsl, ctrl_tex, 2)
    safe_set_first(glsl, ['format', 'pixelformat'], 'rgba16float')
    # Filtro de entrada en mipmap: es lo que hace que TD genere los mips
    # del prefiltro para que textureLod los lea. 'Input Smoothness' en la
    # pagina Common del TOP.
    if not safe_set_first(glsl, ['inputfiltertype', 'inputfilter'], 'mipmap'):
        log('AVISO BLOOM: sin filtro mipmap -- el glow sale mas grueso. '
            'Poner a mano program_bloom > Common > Input Smoothness = '
            'Mipmap Pixels')
    log('BLOOM: prefiltro + glow por mipmaps OK')
    return {'bloom': glsl, 'bloom_prefilter': pre}


# ---------------------------------------------------------------
# MASTER FX 1 - DOS CAPAS (dual layer) con modos de mezcla
# ---------------------------------------------------------------
# El bus A/B ya existia, pero SOLO como mecanismo de transicion: las dos
# ramas siempre terminaban en la misma escena y el crossTOP nativo iba de
# una a otra. Este shader usa esas MISMAS dos ramas como dos CAPAS vivas
# a la vez, con modos de mezcla -- 34 escenas sueltas pasan a ser cientos
# de combinaciones sin escribir una escena nueva.
#
# Va en PARALELO al crossTOP, no en su lugar: un Switch TOP elige cual de
# los dos sale (ver 'program_pick' en build()). Asi la transicion normal
# sigue siendo exactamente la de antes -- rampa nativa, cero Python por
# frame -- y el modo dos capas no le agrega ningun riesgo.
#
# uLayermix hace lo mismo en todos los modos: 0 = solo capa A, 1 = efecto
# completo. En MIX eso es un cross normal; en el resto es cuanto entra el
# resultado de la operacion. Asi el knob NUNCA "no hace nada", cambies al
# modo que cambies.
_BLEND_FRAG = """
out vec4 fragColor;

void main() {
    vec2 uv = vUV.st;
    vec3 a = texture(sTD2DInputs[0], uv).rgb;
    vec3 b = texture(sTD2DInputs[1], uv).rgb;

    float m = clamp(uLayermix, 0.0, 1.0);
    int mode = int(uBlendmode + 0.5);

    // Orden = config.BLEND_MODES. Si se agrega uno alla, agregarlo aca.
    vec3 blended;
    if (mode == 1)      blended = a + b;                          // ADD
    else if (mode == 2) blended = 1.0 - (1.0 - a) * (1.0 - b);    // SCREEN
    else if (mode == 3) blended = a * b;                          // MULTIPLY
    else if (mode == 4) blended = abs(a - b);                     // DIFFERENCE
    else if (mode == 5) blended = max(a, b);                      // LIGHTEN
    else                blended = b;                              // MIX

    vec3 col = mix(a, blended, m);

    // Mismo freno de blancos solidos que usa el footer de las escenas:
    // ADD y SCREEN pasan de 1.0 con facilidad donde las dos capas tienen
    // algo brillante en el mismo pixel, y eso se lee como una mancha
    // plana. Comprimir lo que sobra en vez de recortarlo mantiene la
    // forma del brillo.
    vec3 excess = max(col - 1.0, 0.0);
    col = col - excess + excess / (1.0 + excess);

    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
"""


# ---------------------------------------------------------------
# MASTER FX 2 - ESTELA (trails / feedback)
# ---------------------------------------------------------------
# Realimenta el frame anterior con un zoom y un giro minimos: es el truco
# mas barato que existe para que cualquier visual gane cola, profundidad
# y arrastre. El frame previo entra por el input 1 (Feedback TOP apuntado
# a la salida de este mismo shader, que es como TD rompe el ciclo).
#
# OJO con la operacion de mezcla: se usa max(), no suma. Con suma, un
# fondo que ya es casi negro se va acumulando hasta lavar toda la
# pantalla a gris/blanco despues de unos segundos -- justo lo contrario
# de la estetica de este set (formas brillantes sobre negro absoluto).
# max() deja el negro en negro por construccion y solo arrastra lo que
# de verdad brillaba, que es como se ve una estela real.
_TRAILS_FRAG = """
out vec4 fragColor;

void main() {
    vec2 uv = vUV.st;
    vec3 cur = texture(sTD2DInputs[0], uv).rgb;

    // Zoom y giro del frame anterior. 0.5 = neutro en las dos perillas,
    // a proposito: asi una sola perilla cubre "hacia adentro" (tunel) y
    // "hacia afuera" (explosion) sin necesitar dos.
    vec2 c = uv - 0.5;
    float ang = (uTrailsrot - 0.5) * 0.06;
    float ca = cos(ang), sa = sin(ang);
    c = mat2(ca, -sa, sa, ca) * c * (1.0 - (uTrailszoom - 0.5) * 0.10);
    vec3 prev = texture(sTD2DInputs[1], c + 0.5).rgb;

    // Cuanto sobrevive del frame anterior. Nunca llega a 1.0: si llegara,
    // la estela no se apagaria jamas y la pantalla quedaria congelada
    // con el rastro mas brillante que haya pasado.
    float decay = 0.55 + clamp(uTrails, 0.0, 1.0) * 0.42;

    fragColor = TDOutputSwizzle(vec4(max(cur, prev * decay), 1.0));
}
"""


# ---------------------------------------------------------------
# OVERLAY DE TEXTO - nombres de artista, tipeados en vivo (ver
# builder.py pagina "Texto" y control_script.py toggleTextVisible/
# nextFont/currentFontName)
# ---------------------------------------------------------------
# Input 0: imagen (bloom). Input 1: Text TOP (texto BLANCO sobre fondo
# transparente -- el color de verdad, relleno + contorno, se decide ACA,
# no en el Text TOP, para no depender de que parametro de color tenga
# esa version de TD). Input 2: textura de 1x1 con el fundido 0..1.
#
# CONTORNO hecho a mano (anillo de muestras sobre la cobertura del Text
# TOP) en vez de confiar en un borde nativo del Text TOP: el nombre de
# ese parametro es justo el tipo de cosa que varia entre builds de TD
# (ver el header de shader.py), y asi ademas se puede validar con
# glslangValidator como cualquier otro shader del rig -- sin esto, un
# typo en el nombre del borde recien se notaria con TD abierto y el
# texto se veria plano sobre cualquier escena clara.
_TEXT_FRAG = """
out vec4 fragColor;

// DITHER DE SALIDA. Este es el ultimo GLSL del program bus antes del
// master fade, asi que es el lugar para romper el banding: todo el rig
// trabaja en 16 bits float, pero al proyector salen 8, y en esta
// estetica (halos suaves y degradados sobre negro) eso se ve como
// escalones concentricos. Ruido triangular de +-1 LSB por pixel
// (dos hashes restados): invisible como ruido, pero convierte el
// escalon en un degradado continuo. Fijo en el tiempo a proposito --
// animado titila en zonas planas oscuras.
float ditherHash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
vec3 ditherOut(vec3 col) {
    vec2 fc = gl_FragCoord.xy;
    float tpdf = ditherHash(fc) + ditherHash(fc + vec2(37.1, 91.7)) - 1.0;
    return max(col + tpdf / 255.0, 0.0);
}

void main() {
    vec2 uv = vUV.st;
    vec3 base = texture(sTD2DInputs[0], uv).rgb;

    // Fundido: 0 = apagado. Corte temprano -- se salta el anillo de
    // muestras enterito, que es lo unico caro de este shader.
    float fade = texelFetch(sTD2DInputs[2], ivec2(0, 0), 0).r;
    if (fade < 0.001) {
        fragColor = TDOutputSwizzle(vec4(ditherOut(base), 1.0));
        return;
    }

    float textCov = texture(sTD2DInputs[1], uv).a;

    vec2 texel = uTD2DInfos[1].res.xy;   // res = (1/ancho, 1/alto, ancho, alto)
    const float TAU = 6.2831853072;
    const int N = 8;
    const float THICK = 2.5;
    float ring = 0.0;
    for (int i = 0; i < N; i++) {
        float ang = (float(i) / float(N)) * TAU;
        vec2 off = vec2(cos(ang), sin(ang)) * texel * THICK;
        ring = max(ring, texture(sTD2DInputs[1], uv + off).a);
    }
    // Anillo MENOS el relleno: el area de solo-contorno, para pintarla
    // de un color y el relleno de otro sin que se pisen.
    float outlineCov = clamp(ring - textCov, 0.0, 1.0);

    // TEXTO INTEGRADO AL VISUAL. Un halo ancho alrededor de las letras
    // (por fuera del contorno negro, que se queda: es lo que garantiza
    // que se lea sobre cualquier fondo) toma el COLOR DEL VISUAL que
    // tiene detras -- promedio de la imagen en un anillo de ~40 px,
    // llevado a brillo pleno -- y se enciende con el kick. Asi el nombre
    // se ve parte del show y no un cartel pegado encima. Solo cuesta
    // mientras el texto esta visible (el corte temprano de arriba).
    // Dos anillos (10 y 22 px, el segundo girado para no alinear las
    // muestras): halo pegado a la letra + aire alrededor. Con uno solo de
    // 9 px quedaba escondido detras del contorno (simulado en CPU).
    const int NH = 12;
    float halo1 = 0.0;
    float halo2 = 0.0;
    for (int i = 0; i < NH; i++) {
        float ang = (float(i) / float(NH)) * TAU;
        halo1 += texture(sTD2DInputs[1], uv + vec2(cos(ang), sin(ang)) * texel * 10.0).a;
        halo2 += texture(sTD2DInputs[1], uv + vec2(cos(ang + 0.26), sin(ang + 0.26)) * texel * 22.0).a;
    }
    float halo = (halo1 * 0.6 + halo2 * 0.4) / float(NH);
    vec2 texel0 = uTD2DInfos[0].res.xy;
    vec3 amb = vec3(0.0);
    for (int i = 0; i < 8; i++) {
        float ang = (float(i) / 8.0 + 0.0625) * TAU;
        amb += texture(sTD2DInputs[0], uv + vec2(cos(ang), sin(ang)) * texel0 * 40.0).rgb;
    }
    amb /= 8.0;
    float ambMax = max(max(amb.r, amb.g), amb.b);
    // Fondo casi negro: el halo cae a un blanco frio tenue en vez de un
    // color inventado.
    vec3 glowCol = mix(vec3(0.75, 0.85, 1.0), amb / max(ambMax, 1e-3),
                       smoothstep(0.02, 0.12, ambMax));
    float kick = clamp(uKick, 0.0, 1.0);
    float glow = halo * (1.0 - textCov) * (0.5 + 0.9 * kick) * 1.6;

    vec3 col = base + glowCol * glow * fade;
    col = mix(col, vec3(0.0), outlineCov * fade);
    col = mix(col, vec3(1.0), textCov * fade);

    fragColor = TDOutputSwizzle(vec4(ditherOut(col), 1.0));
}
"""


# ---------------------------------------------------------------
# TEXTO CON PRESETS (fase 41)
# ---------------------------------------------------------------
# Los nombres se dibujan con Text TOPs nativos en un ATLAS (5 filas de
# 1280x160: 4 nombres y los signos de Decodificar) y un GLSL de 3 inputs los pone encima de la
# imagen: imagen, atlas, control (el Mac no acepta un cuarto input). Los
# 13 presets y sus variantes viven en _TEXTFX_FRAG; el fundido es un Cross
# TOP nativo (program_text), igual que master_fade.
TEXT_ROWS = 5          # 4 nombres + la fila de signos de 'decodificar'
TEXT_SCRAMBLE = '#7@K%2&Q$9!Z*4?X'
_TEXTFX_FRAG = """// TEXTO CON PRESETS (fase 41). Input 0: imagen. Input 1: atlas (5 filas
// de 8:1: los 4 nombres y una fila de signos para "decodificar"; letras
// blancas sobre transparente). Input 2: control. Cada nombre es un plano
// 3D (giro, diagonal, profundidad) visto en perspectiva; todos bailan con
// el bajo y el bombo. uTxtseed cambia en cada encendido: angulo,
// inclinacion, profundidad, tamano, color, velocidad y estilo.
out vec4 fragColor;

#define T_ROWS 5.0
#define T_ROWA 8.0
#define T_F 1.6
#define T_SCRAMBLE 4.0

float tH(float k) { return fract(sin((uTxtseed * 91.7 + k) * 12.9898) * 43758.5453); }
float tHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float tTri(float x) { return abs(fract(x) - 0.5) * 4.0 - 1.0; }

mat3 tRot(vec3 r) {
    float cx = cos(r.x), sx = sin(r.x), cy = cos(r.y), sy = sin(r.y), cz = cos(r.z), sz = sin(r.z);
    mat3 X = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
    mat3 Y = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
    mat3 Z = mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
    return Z * Y * X;
}

// Punto de pantalla p -> coordenadas sobre un plano centrado (en
// pantalla) en c, a profundidad z, girado r. vec2(1e4) si no lo ve.
vec2 tPlane(vec2 p, vec2 c, float z, vec3 r) {
    mat3 R = tRot(r);
    vec3 n = R[2];
    vec3 o = vec3(0.0, 0.0, -T_F);
    vec3 d = vec3(p, T_F);
    vec3 P0 = vec3(c * (T_F + z) / T_F, z);
    float den = dot(d, n);
    if (abs(den) < 1e-4) return vec2(1e4);
    float tt = dot(P0 - o, n) / den;
    if (tt <= 0.0) return vec2(1e4);
    vec3 hit = o + tt * d - P0;
    return vec2(dot(hit, R[0]), dot(hit, R[1]));
}

// cuanto de letra hay en un texel del atlas. Se lee por el BLANCO de las
// letras, no por el alfa: sirve igual si el Text TOP sale con fondo negro
// opaco o transparente (antes, con alfa 1 en todo el atlas o alfa 0 en las
// letras, el nombre no se veia).
float tCov(vec4 c) { return clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0); }

// colores de Halloween para halos, cintas y estilos
vec3 tPal(float i) {
    i = mod(floor(i), 6.0);
    return i < 1.0 ? vec3(1.0, 0.45, 0.05)      // calabaza
         : i < 2.0 ? vec3(0.6, 0.15, 1.0)       // hechizo violeta
         : i < 3.0 ? vec3(0.45, 1.0, 0.1)       // veneno verde
         : i < 4.0 ? vec3(0.85, 0.03, 0.02)     // sangre
         : i < 5.0 ? vec3(1.0, 0.75, 0.1)       // brasa
         :           vec3(1.0, 0.92, 0.75);     // hueso
}

vec2 tRowUV(float row, vec2 q, float pad) {
    return vec2(q.x / T_ROWA + 0.5, (T_ROWS - 1.0 - row + clamp(q.y + 0.5, pad, 1.0 - pad)) / T_ROWS);
}

// q en unidades del nombre (alto 1, ancho T_ROWA): cobertura y halo
vec2 tSample(float row, vec2 q) {
    vec2 ruv = vec2(q.x / T_ROWA + 0.5, q.y + 0.5);
    if (ruv.x < -0.05 || ruv.x > 1.05 || ruv.y < -0.7 || ruv.y > 1.7) return vec2(0.0);
    float inside = step(0.0, ruv.y) * step(ruv.y, 1.0) * step(0.0, ruv.x) * step(ruv.x, 1.0);
    float a = tCov(texture(sTD2DInputs[1], tRowUV(row, q, 0.0))) * inside;
    float g = tCov(textureLod(sTD2DInputs[1], tRowUV(row, q, 0.02), 4.0))
            * smoothstep(-0.7, 0.1, ruv.y) * smoothstep(1.7, 0.9, ruv.y);
    return vec2(a, g);
}

// borde fino de las letras (nivel de mip chico menos el relleno)
float tEdge(float row, vec2 q) {
    if (abs(q.x) > T_ROWA * 0.52 || abs(q.y) > 0.6) return 0.0;
    float a = tCov(texture(sTD2DInputs[1], tRowUV(row, q, 0.0)));
    float b = tCov(textureLod(sTD2DInputs[1], tRowUV(row, q, 0.0), 1.6));
    return clamp(b * 2.2 - a * 2.0, 0.0, 1.0) * step(abs(q.y), 0.5);
}

vec2 tName(float row, vec2 p, vec2 c, float z, vec3 r, float h, float wAmp, float wPh) {
    vec2 q = tPlane(p, c, z, r) / h;
    q.y += sin(q.x * 1.6 - wPh) * wAmp;
    return tSample(row, q) * (1.0 - clamp(z, 0.0, 2.0) * 0.22);
}

// que fraccion del ancho de su fila ocupa un nombre de L letras (el
// tamano de letra del atlas sale de la misma cuenta, ver program.py)
float tInk(float L) {
    L = max(L, 1.0);
    return clamp(L * 0.62 * min(106.0, 1875.0 / L) / 1280.0, 0.08, 0.92);
}

void main() {
    vec2 uv = vUV.st;
    vec3 base = texture(sTD2DInputs[0], uv).rgb;
    vec2 res = vec2(textureSize(sTD2DInputs[0], 0));
    float A = res.x / res.y;
    vec2 p = (uv - 0.5) * vec2(A, 1.0);
    float n = clamp(floor(uTxtn + 0.5), 1.0, 4.0);
    int P = int(clamp(floor(uTxtpre + 0.5), 0.0, 12.0));
    float kick = clamp(uKick, 0.0, 1.0);
    float bass = clamp(uBass, 0.0, 1.0);
    float spd = 0.75 + 0.5 * tH(6.0);
    float t = uRTime * spd;
    float bt = uMbeat > 0.05 ? uMbeat : 0.5;           // s por tiempo
    float since = max(uRTime - uTxtt, 0.0);           // desde que se prendio
    float L = max(uTxtlen, 1.0);
    float ink = tInk(L);
    // alto con el que el nombre cruza la pantalla de lado a lado
    float hFull = min(A * 0.78 / (T_ROWA * ink), 0.7);

    // --- variante de este encendido ---
    float S = (0.6 + 0.8 * clamp(uTxtsize, 0.0, 1.0)) * (0.85 + 0.3 * tH(1.0));
    float ai = floor(tH(2.0) * 8.0);
    float ang = ai < 1.0 ? 0.0 : ai < 3.0 ? (ai < 2.0 ? 0.14 : -0.14) : ai < 5.0 ? (ai < 4.0 ? 0.45 : -0.45)
              : ai < 7.0 ? (ai < 6.0 ? 0.78 : -0.78) : 1.5708 * sign(tH(9.0) - 0.5);
    vec2 tilt = (vec2(tH(3.0), tH(4.0)) - 0.5) * 1.5;
    float zv = tH(7.0) * 0.8;
    vec3 tint = tPal(tH(5.0) * 6.0);

    // --- baile comun a todos ---
    float pulse = 1.0 + 0.2 * kick;
    float sway = 0.07 * sin(t * 2.1) * (0.3 + bass);
    float wAmp = 0.05 + 0.12 * bass;
    float wPh = t * 4.0;
    vec3 dance = vec3(0.12 * sin(t * 0.9) * (0.4 + bass), 0.18 * sin(t * 0.7 + 1.0) * (0.4 + bass), sway);

    vec2 acc = vec2(0.0);
    vec3 rgbCov = vec3(-1.0);
    bool done = false;                 // el preset ya armo el color final
    vec3 col = base;

    if (P == 0) {          // 1 CENTRO
        float h = 0.075 * S * pulse;
        vec3 r = vec3(tilt * 0.6, ang * 0.5) + dance;
        acc = tName(0.0, p, vec2(0.0, 0.012 * kick), zv * 0.4, r, h, wAmp, wPh);
        acc.y *= 0.6 + 1.4 * kick;
    } else if (P == 1) {   // 2 FLOTA
        float b = sin(t * 0.7);
        vec2 c = vec2(0.06 * sin(t * 0.31), 0.04 * b);
        vec3 r = vec3(tilt + vec2(0.35 * sin(t * 0.5), 0.45 * sin(t * 0.37)), ang * 0.7 + 0.05 * sin(t * 0.4)) + dance * 0.6;
        acc = tName(0.0, p, c, zv * 0.6 + 0.2 * b, r, 0.07 * S * (pulse * 0.6 + 0.4 + 0.08 * bass), wAmp * 0.7, wPh * 0.5);
        acc.x *= 0.75 + 0.25 * sin(t * 0.7 + 1.0);
    } else if (P == 2) {   // 3 REBOTE
        float h = 0.06 * S;
        float w = h * T_ROWA * ink * 0.5;
        float fx = 0.045 + 0.02 * tH(11.0), fy = 0.061 + 0.02 * tH(12.0);
        vec2 c = vec2(tTri(t * fx + tH(13.0)) * max(A * 0.3 - w * 0.5, 0.05), tTri(t * fy + tH(14.0)) * 0.22);
        float k = floor((t * fx + tH(13.0)) * 2.0) + floor((t * fy + tH(14.0)) * 2.0);
        vec3 r = vec3(tilt * 0.5, ang * 0.4 + 0.25 * sin(k * 2.3)) + dance;
        acc = tName(0.0, p, c, zv * 0.3, r, h * pulse, wAmp, wPh);
        tint = tPal(k + tH(15.0) * 6.0);
    } else if (P == 3) {   // 4 BAILA
        float h = 0.085 * S;
        vec3 r = vec3(tilt * 0.5, ang * 0.5) + dance * 1.6;
        vec2 q = tPlane(p, vec2(0.0), zv * 0.3, r) / (h * pulse);
        q.y += sin(q.x * 1.6 - t * 5.0) * (0.08 + 0.25 * bass) - 0.25 * kick * sin(q.x * 0.8 + t);
        q.x += sin(q.y * 3.0 + t * 3.0) * 0.08 * bass;
        acc = tSample(0.0, q);
    } else if (P == 4) {   // 5 LLUVIA (con profundidad)
        mat2 fr = mat2(cos(ang * 0.6), sin(ang * 0.6), -sin(ang * 0.6), cos(ang * 0.6));
        vec2 pr = fr * p;
        for (int i = 0; i < 7; i++) {
            float fi = float(i);
            float z = tHash(fi + 21.0 + tH(17.0)) * 1.4;
            float par = T_F / (T_F + z);
            float h = (0.04 + 0.02 * tHash(fi + 3.0)) * S;
            float x = (fi / 6.0 - 0.5) * A * 0.6 * par;
            float y = (0.7 - fract(t * (0.04 + 0.03 * tHash(fi)) * par + tHash(fi + 9.0)) * 1.4) * par;
            vec3 r = vec3(tilt * 0.4, 0.0) + dance * 0.6;
            vec2 rr = tName(mod(fi, n), pr, vec2(x, y), z, r, h * pulse, wAmp, wPh + fi);
            acc += rr * smoothstep(0.7, 0.45, abs(y)) * (0.5 + 0.5 * tHash(fi + 1.0));
        }
    } else if (P == 5) {   // 6 ORBITA (anillo inclinado)
        mat3 ring = tRot(vec3(0.45 + tilt.x * 0.5, 0.0, ang * 0.5));
        float m = max(n, 3.0);
        for (int i = 0; i < 4; i++) {
            float fi = float(i);
            if (fi >= m) break;
            float a = t * 0.35 + fi * 6.2831 / m;
            vec3 w = ring * vec3(cos(a) * A * 0.24, 0.0, sin(a) * 0.5);
            float z = w.z + 0.4;
            vec2 c = w.xy * T_F / (T_F + z);
            vec3 r = vec3(0.0, -cos(a) * 0.5, ang * 0.3) + dance * 0.5;
            vec2 rr = tName(mod(fi, n), p, c, z, r, 0.065 * S * pulse, wAmp, wPh + fi);
            acc += rr * (0.55 + 0.45 * smoothstep(1.0, -0.2, z));
        }
    } else if (P == 6) {   // 7 GLITCH
        float slice = floor(uv.y * 24.0);
        float j = (tHash(slice + floor(t * 12.0)) - 0.5) * 0.12 * kick * step(0.55, tHash(slice * 1.7 + floor(t * 12.0)));
        vec2 pj = p + vec2(j, 0.0);
        float sp = 0.006 + 0.02 * kick;
        vec3 r = vec3(tilt * 0.4, ang * 0.4) + dance;
        float h = 0.08 * S * pulse;
        vec2 cr = tName(0.0, pj + vec2(sp, 0.0), vec2(0.0), zv * 0.3, r, h, wAmp, wPh);
        vec2 cg = tName(0.0, pj, vec2(0.0), zv * 0.3, r, h, wAmp, wPh);
        vec2 cb = tName(0.0, pj - vec2(sp, 0.0), vec2(0.0), zv * 0.3, r, h, wAmp, wPh);
        rgbCov = vec3(cr.x, cg.x, cb.x);
        acc = vec2(0.0, cg.y * (0.5 + kick));
        tint = tPal(2.0);
    } else if (P == 7) {   // 8 RECORTADO: la escena se ve solo dentro del nombre gigante
        float h = hFull * (0.9 + 0.1 * S) * (1.0 + 0.06 * kick);
        vec3 r = vec3(tilt * 0.25, ang * 0.1) + dance * 0.35;
        vec2 q = tPlane(p, vec2(0.0), zv * 0.15, r) / h;
        q.y += sin(q.x * 1.6 - wPh) * wAmp * 0.4;
        vec2 m = tSample(0.0, q);
        float e = tEdge(0.0, q);
        bool inv = tH(20.0) > 0.75;    // a veces al reves: el nombre negro sobre la escena
        float k = inv ? 1.0 - m.x : m.x;
        col = base * (0.05 + 1.25 * k) + tint * (e * (0.5 + 0.8 * kick) + m.y * 0.15 * (1.0 - k));
        done = true;
    } else if (P == 8) {   // 9 GOLPE: el nombre golpea en el drop (y al prenderlo)
        float dropT = (uMbrk1 - uMbrk0 >= 4.0 && uMbrk1 <= uRTime) ? uMbrk1 : -1e4;
        float every = bt * 32.0;       // sin drops: un golpe cada 8 compases
        float autoT = uTxtt + floor(since / every) * every;
        float hitT = max(autoT, dropT);
        float dt = max(uRTime - hitT, 0.0);
        float env = exp(-dt * 1.3);
        float slam = exp(-dt * 7.0);
        vec2 shake = (vec2(tHash(floor(uRTime * 40.0)), tHash(floor(uRTime * 40.0) + 3.0)) - 0.5) * 0.04 * slam;
        float h = hFull * 0.55 * S * (1.0 + 0.45 * slam + 0.08 * kick);
        vec3 r = vec3(tilt * 0.3 * (1.0 - slam), ang * 0.25) + dance * 0.5;
        acc = tName(0.0, p + shake, vec2(0.0), zv * 0.2, r, h, wAmp, wPh) * env;
        acc.y *= 1.5;
        col = base * (1.0 + 0.5 * exp(-dt * 10.0));      // un solo destello por golpe
        base = col;
    } else if (P == 9) {   // 10 PATRON: filas del nombre que corren en sentidos alternos
        float fa = ai < 2.0 ? 0.0 : ai < 4.0 ? 0.35 * sign(tH(9.0) - 0.5) : ai < 6.0 ? 0.78 * sign(tH(9.0) - 0.5) : 0.2;
        mat2 fr = mat2(cos(fa), sin(fa), -sin(fa), cos(fa));
        vec2 pr = fr * p;
        float rowH = 0.07 * S;
        float spacing = rowH * 2.3;
        float ri = floor(pr.y / spacing + 0.5);
        float ly = pr.y - ri * spacing;
        float dir = mod(ri, 2.0) * 2.0 - 1.0;
        float beatK = mod(floor(uRTime / bt), 2.0);
        float hop = (mod(ri, 2.0) == beatK ? 1.0 : 0.0) * kick;
        float span = rowH * T_ROWA * ink + rowH * 1.2;
        float x = pr.x + dir * t * 0.09 + dir * 0.02 * hop;
        float cell = floor(x / span);
        float lx = mod(x, span) - span * 0.5;
        vec2 q = vec2(lx, ly - 0.01 * hop) / (rowH * (1.0 + 0.12 * hop));
        q.y += sin(q.x * 1.6 - wPh) * wAmp * 0.5;
        vec2 m = tSample(mod(ri + cell, n), q);
        if (tH(21.0) > 0.5) {          // cinta: franja de color, letras oscuras
            float band = smoothstep(rowH * 0.62, rowH * 0.56, abs(ly));
            col = mix(base * 0.8, tint * (0.75 + 0.25 * hop), band);
            col = mix(col, vec3(0.03), m.x * band);
        } else {                       // letras blancas sobre la escena oscurecida
            col = base * (0.55 - 0.25 * m.y) + tint * m.y * 0.4;
            col = mix(col, vec3(1.0), m.x);
        }
        done = true;
    } else if (P == 10) {  // 11 DECODIFICAR: signos al azar que se resuelven en el nombre
        float h = hFull * 0.45 * S * pulse;
        vec3 r = vec3(tilt * 0.3, ang * 0.2) + dance * 0.6;
        vec2 q = tPlane(p, vec2(0.0), zv * 0.2, r) / h;
        q.y += sin(q.x * 1.6 - wPh) * wAmp * 0.5;
        float half_ = T_ROWA * ink * 0.5;
        float u = (q.x + half_) / (2.0 * half_);
        float ci = floor(u * L);
        float cycle = bt * 32.0;
        float tc = mod(since, cycle);
        float at = bt * (0.5 + tHash(ci + tH(23.0) * 17.0) * min(L, 12.0) * 0.5);
        if (ci >= 0.0 && ci < L && tc < at) {
            // signo de la fila de signos (16 caracteres), cambia 12 veces por segundo
            float g = floor(tHash(ci * 3.1 + floor(uRTime * 12.0)) * 16.0);
            float sHalf = T_ROWA * tInk(16.0) * 0.5;
            float fx = fract(u * L);
            vec2 sq = vec2(-sHalf + (g + fx) / 16.0 * 2.0 * sHalf, q.y);
            vec2 m = tSample(T_SCRAMBLE, sq);
            acc = vec2(m.x * 0.85, m.y);
            rgbCov = vec3(-2.0);       // marca: signos en el color del halo
        } else {
            acc = tSample(0.0, q);
            float flash = (ci >= 0.0 && ci < L) ? exp(-(tc - at) * 8.0) : 0.0;
            acc.y += flash * 1.2;
        }
    } else if (P == 11) {  // 12 PROFUNDIDAD: copias en 3D (extrusion o tunel)
        float h = 0.1 * S * pulse;
        vec3 r = vec3(tilt * 0.5 + vec2(0.25 * sin(t * 0.5), 0.5 * sin(t * 0.37)), ang * 0.3) + dance * 0.6;
        bool tunnel = tH(22.0) > 0.55;
        for (int i = 9; i >= 0; i--) {
            float fi = float(i);
            float z = tunnel ? fract(-t * 0.12 + fi / 10.0) * 3.0 - 0.2 : zv * 0.3 + fi * 0.035 * (1.0 + 1.5 * bass);
            vec2 m = tName(0.0, p, vec2(0.0), z, r, h, wAmp, wPh - fi * 0.3);
            float fade = tunnel ? smoothstep(2.8, 2.0, z) * smoothstep(-0.2, 0.2, z) : 1.0;
            vec3 lc = (!tunnel && i == 0) || (tunnel && z < 0.5) ? vec3(1.0) : tint * (1.0 - fi / 12.0);
            col = mix(col, lc, m.x * fade);
            acc.y = max(acc.y, m.y * fade * 0.6);
        }
        col += tint * acc.y * 0.3 * (0.5 + kick);
        done = true;
    } else {               // 13 CAMBIO POR TIEMPO: en cada tiempo, otro estilo
        float k = floor(uRTime / bt);
        float st = floor(tHash(k + tH(24.0) * 31.0) * 5.0);
        float pop = exp(-fract(uRTime / bt) * 6.0);
        vec2 off = (vec2(tHash(k * 1.3), tHash(k * 2.7)) - 0.5) * vec2(A * 0.35, 0.25) * step(0.5, tHash(k * 4.1));
        float h = hFull * 0.45 * S * (1.0 + 0.12 * pop);
        vec3 r = vec3(tilt * 0.4, ang * 0.3 + (tHash(k * 5.3) - 0.5) * 0.5) + dance * 0.6;
        vec2 q = tPlane(p, off, zv * 0.2, r) / h;
        q.y += sin(q.x * 1.6 - wPh) * wAmp * 0.5;
        vec2 m = tSample(0.0, q);
        if (st < 1.0) {        // relleno blanco con halo
            col = base * (1.0 - 0.6 * m.y) + tint * m.y * 0.7;
            col = mix(col, vec3(1.0), m.x);
        } else if (st < 2.0) { // solo el contorno
            col = mix(base * (1.0 - 0.3 * m.y), tint * 1.2, tEdge(0.0, q));
        } else if (st < 3.0) { // recortado: la escena dentro de las letras
            col = base * (0.12 + 1.2 * m.x);
        } else if (st < 4.0) { // invertido dentro de las letras
            col = mix(base, 1.0 - base, m.x);
        } else {               // colores corridos
            vec2 sp = vec2(0.02 + 0.03 * pop, 0.0) / h;
            vec3 rc = vec3(tSample(0.0, q + sp).x, m.x, tSample(0.0, q - sp).x);
            col = base * (1.0 - max(max(rc.r, rc.g), rc.b)) + rc;
        }
        done = true;
    }

    if (uTxtdbg > 0.5) {
        // DIAGNOSTICO (Texto > Ver atlas): el atlas tal como llega, abajo a
        // la izquierda; si aca no hay letras, el problema esta antes del shader
        vec2 duv = uv / vec2(0.45, 0.45 * A / T_ROWA * T_ROWS);
        if (duv.x < 1.0 && duv.y < 1.0) {
            vec4 at = texture(sTD2DInputs[1], duv);
            base = mix(base * 0.3 + vec3(0.05, 0.0, 0.08), vec3(1.0, 0.6, 0.1), tCov(at));
            col = base;
            done = true;
        }
    }

    if (!done) {
        float a = clamp(acc.x, 0.0, 1.0);
        float g = clamp(acc.y, 0.0, 1.5);
        col = base * (1.0 - 0.7 * clamp(g * 1.5, 0.0, 1.0));   // sombra: se lee encima de todo
        col += tint * g * 0.8;                                    // halo de color
        if (rgbCov.x >= 0.0) {
            vec3 rc = clamp(rgbCov, 0.0, 1.0);
            col = col * (1.0 - max(max(rc.r, rc.g), rc.b)) + rc;
        } else if (rgbCov.x < -1.5) {
            col = mix(col, tint * 1.3, a);                        // signos de decodificar
        } else {
            col = mix(col, vec3(1.0), a);
        }
    }
    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
"""


def _build_text_overlay(proj, base_top, ctrl_tex=None, channels=None):
    """Nombres de artista tipeados en vivo (pagina Texto de /project1).

    Text TOP x4 (una fila por nombre, 'NOMBRE + NOMBRE' en Texto) ->
    Transform a su fila -> Over -> atlas -> program_textfx (GLSL: preset,
    baile, angulo, profundidad) -> program_text (Cross: fundido con
    Textvisible -> Constant CHOP -> Lag CHOP).
    """
    rows = []
    for i in range(TEXT_ROWS):
        t = proj.create(textTOP, 'text_row{}'.format(i))  # noqa: F821
        t.nodeX, t.nodeY = 800, 1000 - i * 120
        if i < TEXT_ROWS - 1:
            name = "op('/project1/control_script').module.textName({})".format(i)
            safe_expr(t, 'text', name)
        else:
            # ultima fila: los signos que usa el preset Decodificar
            name = repr(TEXT_SCRAMBLE)
            safe_set(t, 'text', TEXT_SCRAMBLE)
        safe_expr(t, 'font', "op('/project1/control_script').module.currentFontName()")
        # fuente propia (td/fonts): se carga por archivo; '' = la del sistema
        safe_expr(t, 'fontfile', "op('/project1/control_script').module.currentFontFile()")
        # que el nombre entre a lo ancho de su fila (1280 px)
        safe_expr_first(t, ['fontsizex', 'fontsize'],
                        "min(106.0, 1875.0 / max(1, len({})))".format(name))
        safe_set_first(t, ['alignx', 'justifyx', 'textalignx'], 'center')
        safe_set_first(t, ['aligny', 'justifyy', 'textaligny'], 'middle')
        safe_set_first(t, ['wordwrap', 'wrapwords'], False)
        for pn in ('fontcolorr', 'fontcolorg', 'fontcolorb'):
            safe_set(t, pn, 1.0)
        safe_set_first(t, ['fontalpha', 'fontcolora'], 1.0)
        safe_set_first(t, ['bgalpha', 'bgcolora'], 0.0)
        safe_set(t, 'outputresolution', 'custom')
        # 1280 de ancho: el tope de la licencia Non-Commercial (con 2048 el
        # atlas no llegaba entero al shader)
        safe_set(t, 'resolutionw', 1280)
        safe_set(t, 'resolutionh', 160 * TEXT_ROWS)
        tr = proj.create(transformTOP, 'text_row{}_y'.format(i))  # noqa: F821
        tr.nodeX, tr.nodeY = 960, 1000 - i * 120
        connect(tr, t)
        # fila i (0 arriba): centro de la fila, en fraccion desde el medio
        safe_set_first(tr, ['tunit', 'translateunit'], 'fraction')
        safe_set(tr, 'ty', 0.5 - (i + 0.5) / TEXT_ROWS)
        rows.append(tr)
    # las filas se SUMAN con Add TOPs de 2 entradas, una por una: con Over,
    # un Text TOP que saliera con fondo opaco tapaba a las demas filas
    atlas = rows[0]
    for i in range(1, TEXT_ROWS):
        ov = proj.create(addTOP, 'text_atlas' if i == TEXT_ROWS - 1 else 'text_atlas_{}'.format(i))  # noqa: F821
        ov.nodeX, ov.nodeY = 1120 + i * 40, 1000 - i * 120
        connect(ov, atlas, 0)
        connect(ov, rows[i], 1)
        atlas = ov

    src = proj.create(textDAT, 'program_textfx_frag')
    src.nodeX, src.nodeY = 1440, 960
    if ctrl_tex is not None and channels:
        src.text = shader.ctrl_header(channels, 2) + _TEXTFX_FRAG
    else:
        src.text = ('#define uKick 0.0\n#define uBass 0.0\n#define uRTime 0.0\n'
                    '#define uMbeat 0.0\n#define uTxtpre 0.0\n#define uTxtseed 0.0\n'
                    '#define uTxtn 1.0\n#define uTxtsize 0.5\n#define uTxtt 0.0\n'
                    '#define uTxtlen 8.0\n#define uMbrk0 0.0\n#define uMbrk1 0.0\n'
                    '#define uTxtdbg 0.0\n') + _TEXTFX_FRAG
    fx = proj.create(glslTOP, 'program_textfx')
    fx.nodeX, fx.nodeY = 1440, 840
    safe_set_first(fx, ['pixeldat', 'pixelshader'], src.path)
    connect(fx, base_top, 0)
    connect(fx, atlas, 1)
    if ctrl_tex is not None and channels:
        connect(fx, ctrl_tex, 2)
    safe_set_first(fx, ['format', 'pixelformat'], 'rgba16float')
    # mipmaps del atlas: el halo de las letras sale de un nivel borroso
    safe_set_first(fx, ['inputfiltertype', 'inputfilter'], 'mipmap')

    # --- fundido: Textvisible -> Constant -> Lag ---
    fp = proj.create(constantCHOP, 'text_fade_par')
    fp.nodeX, fp.nodeY = 1280, 1080
    safe_set_first(fp, ['const0name', 'name0'], 'textvisible')
    safe_expr_first(fp, ['const0value', 'value0'],
                    "1.0 if op('/project1').par.Textvisible.eval() else 0.0")
    flag = proj.create(lagCHOP, 'text_fade_lag')
    flag.nodeX, flag.nodeY = 1440, 1080
    safe_set(flag, 'lag1', config.TEXT_FADE_SECONDS)
    safe_set(flag, 'lag2', config.TEXT_FADE_SECONDS)
    safe_set_first(flag, ['lagmethod', 'method'], 'slew')
    connect(flag, fp)

    out = proj.create(crossTOP, 'program_text')  # noqa: F821
    out.nodeX, out.nodeY = 1600, 840
    connect(out, base_top, 0)
    connect(out, fx, 1)
    safe_expr(out, 'cross',
              "op('/project1/text_fade_lag')[0].eval() "
              "if op('/project1/text_fade_lag').numChans else 0.0")

    log('OVERLAY DE TEXTO: atlas de {} filas + {} presets (program_textfx) + fundido OK'.format(TEXT_ROWS, len(config.TEXT_PRESETS)))
    return {'text_top': rows[0], 'text_y': fx, 'fade_tex': flag,
            'text_composite': out, 'text_extra': []}


def _build_master_fx(proj, sw_a, sw_b, cross, ctrl_tex, channels):
    """Dos capas + estela, entre el crossfade y el bloom.

    Los dos efectos tienen BYPASS REAL por Switch TOP (cooktype
    'selective'), no un parametro en 0: apagados, sus GLSL no cocinan y
    no cuestan nada. Es deliberado -- este rig ya perdio FPS una vez por
    dejar cocinando cosas que no se estaban viendo (ver Previewall en
    builder.py), y estos dos son de los pocos nodos a resolucion de
    salida completa que hay en toda la red.
    """
    head = shader.ctrl_header(channels, 2)

    # --- dos capas ---
    blend_dat = proj.create(textDAT, 'program_blend_frag')
    blend_dat.nodeX, blend_dat.nodeY = 760, 460
    blend_dat.text = head + _BLEND_FRAG

    blend = proj.create(glslTOP, 'program_blend')
    blend.nodeX, blend.nodeY = 960, 460
    safe_set_first(blend, ['pixeldat', 'pixelshader'], blend_dat.path)
    connect(blend, sw_a, 0)
    connect(blend, sw_b, 1)
    connect(blend, ctrl_tex, 2)
    safe_set_first(blend, ['format', 'pixelformat'], 'rgba16float')
    # Las escenas llegan a Renderscale (ver config.DEFAULT_RENDER_SCALE):
    # este nodo las reescala a la salida, con filtro lineal explicito.
    safe_set_first(blend, ['inputfiltertype', 'inputfilter'], 'linear')

    pick = proj.create(switchTOP, 'program_pick')
    pick.nodeX, pick.nodeY = 1120, 370
    connect(pick, cross, 0)
    connect(pick, blend, 1)
    safe_set(pick, 'cooktype', 'selective')
    safe_expr(pick, 'index',
              "1 if op('/project1').par.Duallayer.eval() else 0")

    # --- estela ---
    clean = proj.create(nullTOP, 'program_clean')
    clean.nodeX, clean.nodeY = 1280, 370
    connect(clean, pick)

    trails_dat = proj.create(textDAT, 'program_trails_frag')
    trails_dat.nodeX, trails_dat.nodeY = 1080, 520
    trails_dat.text = head + _TRAILS_FRAG

    trails = proj.create(glslTOP, 'program_trails')
    trails.nodeX, trails.nodeY = 1280, 520
    safe_set_first(trails, ['pixeldat', 'pixelshader'], trails_dat.path)
    # 16 bits por canal en TODO el lazo (shader + feedback): en 8 bits,
    # multiplicar por decay ~0.9 y volver a cuantizar en cada vuelta
    # escalona la estela en bandas visibles a los pocos frames.
    safe_set_first(trails, ['format', 'pixelformat'], 'rgba16float')

    # El Feedback TOP apunta a la SALIDA del shader de estela y vuelve a
    # entrar como su input 1. Es la forma en que TD cierra un ciclo sin
    # que sea un ciclo real: entrega el frame ANTERIOR, ya cocinado.
    fb = proj.create(feedbackTOP, 'trails_fb')
    fb.nodeX, fb.nodeY = 1080, 640
    safe_set_first(fb, ['top', 'targettop', 'target'], trails.path)
    safe_set_first(fb, ['format', 'pixelformat'], 'rgba16float')

    # El Feedback TOP necesita un INPUT propio ademas del 'Target TOP':
    # sin el da "Not enough sources specified" y la estela sale negra.
    # Ese input es la imagen con la que arranca (y a la que vuelve con
    # Reset); se usa el mismo program_clean, que ademas le da resolucion
    # y formato correctos desde el primer frame.
    connect(fb, clean, 0)
    connect(trails, clean, 0)
    connect(trails, fb, 1)
    connect(trails, ctrl_tex, 2)

    trails_pick = proj.create(switchTOP, 'trails_pick')
    trails_pick.nodeX, trails_pick.nodeY = 1440, 370
    connect(trails_pick, clean, 0)
    connect(trails_pick, trails, 1)
    safe_set(trails_pick, 'cooktype', 'selective')
    # Umbral, no "> 0": una perilla fisica rara vez queda clavada en cero
    # exacto, y sin umbral la estela quedaria cocinando para siempre por
    # un 0.003 que no se ve.
    # music_hold (control.py) y no el RMS crudo: con el crudo, la estela
    # se prendia y apagaba cada vez que el nivel rozaba el piso.
    safe_expr(trails_pick, 'index',
              "1 if op('/project1').par.Trails.eval() > 0.005 and "
              "(op('/project1/music_hold')[0].eval() if "
              "op('/project1/music_hold') is not None and "
              "op('/project1/music_hold').numChans else 0.0) >= 0.5 else 0")

    log('MASTER FX: dos capas + estela (con bypass real por switch) OK')
    return {'blend': blend, 'pick': pick, 'clean': clean,
            'trails': trails, 'trails_fb': fb, 'trails_pick': trails_pick}


# ---------------------------------------------------------------
# TRANSICIONES CON TEMA (Niebla, Sangre, Rayo, Apagon con velas)
# ---------------------------------------------------------------
# Reemplaza al crossfade SOLO mientras dura un cambio de escena con un
# estilo distinto de 'fundido' (switch trans_pick): el resto del tiempo
# no cocina. Lee el avance del fundido (uXfade, la misma rampa que
# program_cross) y el efecto elegido (uTransfx, ver
# control_script._pickTransition). En los extremos del fundido devuelve
# EXACTAMENTE la escena de ese lado, asi el switch no salta al soltar.
_TRANS_FRAG = """
out vec4 fragColor;

float tr_h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float tr_h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tr_n1(float x) {
    float i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(tr_h1(i), tr_h1(i + 1.0), f);
}
float tr_noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(tr_h2(i), tr_h2(i + vec2(1.0, 0.0)), f.x),
               mix(tr_h2(i + vec2(0.0, 1.0)), tr_h2(i + vec2(1.0, 1.0)), f.x), f.y);
}
float tr_fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * tr_noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
}

void main() {
    vec2 uv = vUV.st;
    vec3 a = texture(sTD2DInputs[0], uv).rgb;
    vec3 b = texture(sTD2DInputs[1], uv).rgb;
    float x = clamp(uXfade, 0.0, 1.0);
    float tf = abs(uTransfx);
    int style = int(floor(tf));
    float seed = fract(tf) * 10.0;           // distinta en cada cambio
    bool toB = uTransfx >= 0.0;
    float q = toB ? x : 1.0 - x;             // avance 0..1 del cambio
    vec3 oldC = toB ? a : b;
    vec3 newC = toB ? b : a;
    float u = 1.0 - abs(2.0 * q - 1.0);      // 0 en los extremos, 1 a mitad
    float t = uKclock;                       // corre aun en silencio
    float asp = uResW / max(uResH, 1.0);
    vec2 p = vec2(uv.x * asp, uv.y);
    vec3 col = mix(a, b, x);

    if (style == 1) {
        // NIEBLA: sube un banco de niebla, la escena nueva aparece por
        // donde la niebla es menos densa y la niebla se va.
        vec2 drift = vec2(t * 0.06, t * 0.015);
        float f = tr_fbm(p * 2.2 + drift + seed);
        float f2 = tr_fbm(p * 5.0 - drift * 1.7 + 3.0);
        float fog = clamp(f * 0.75 + f2 * 0.35, 0.0, 1.0);
        float sw = smoothstep(0.38, 0.62, q + (0.5 - fog) * 0.25);
        vec3 base = mix(oldC, newC, sw);
        float dens = smoothstep(0.0, 1.0, u * (0.75 + 0.7 * fog));
        dens = clamp(dens * (1.15 - 0.35 * uv.y), 0.0, 1.0);   // mas densa abajo
        vec3 fogC = mix(vec3(0.20, 0.24, 0.26), vec3(0.62, 0.70, 0.68), fog);
        col = mix(base * (1.0 - 0.4 * u), fogC, dens * 0.92);
    } else if (style == 2) {
        // SANGRE: chorrea desde arriba hasta tapar todo; debajo cambia la
        // escena; la sangre se escurre hacia abajo y deja ver la nueva.
        float cx = uv.x * 34.0;
        float ci = floor(cx);
        float fc = fract(cx) - 0.5;
        float h = tr_h1(ci + seed * 13.0);
        float w = 0.22 + 0.22 * tr_h1(ci + 41.0 + seed * 7.0);
        float tip = sqrt(max(0.0, 1.0 - (fc / w) * (fc / w)));    // gota redonda
        float wob = tr_n1(uv.x * 9.0 + seed * 3.0);
        float edge, cov;
        if (q < 0.5) {
            float q1 = pow(clamp(q * 2.0, 0.0, 1.0), 1.3);
            float reach = q1 * 1.3 * (0.85 + 0.3 * wob) + q1 * tip * h * 0.35;
            edge = 1.0 - reach;
            cov = smoothstep(0.0, 0.006, uv.y - edge);
        } else {
            float q2 = pow(clamp(q * 2.0 - 1.0, 0.0, 1.0), 1.6);
            float fall = q2 * 1.4 * (0.85 + 0.3 * wob) + q2 * tip * h * 0.25;
            edge = 1.0 - fall;
            cov = smoothstep(0.0, 0.006, edge - uv.y);
        }
        float d = abs(uv.y - edge);
        vec3 blood = mix(vec3(0.55, 0.02, 0.03), vec3(0.16, 0.0, 0.01), smoothstep(0.0, 0.3, d));
        blood += vec3(0.5, 0.12, 0.1) * exp(-d * 45.0) * (0.5 + 0.5 * tip);   // brillo del borde
        blood *= 0.85 + 0.3 * tr_noise(p * vec2(6.0, 40.0) + seed);           // vetas
        vec3 base = q < 0.5 ? oldC : newC;
        col = mix(base, blood, cov);
    } else if (style == 3) {
        // RAYO: la escena se apaga en tormenta, cae un rayo y en el
        // fogonazo ya esta la escena nueva.
        vec3 base = q < 0.5 ? oldC : newC;
        float win = smoothstep(0.0, 0.12, u);
        float fl = exp(-pow((q - 0.5) * 12.0, 2.0))
                 + 0.55 * exp(-pow((q - 0.36) * 30.0, 2.0))
                 + 0.40 * exp(-pow((q - 0.63) * 26.0, 2.0));
        fl *= win;
        float lum = dot(base, vec3(0.3, 0.59, 0.11));
        base = mix(base, lum * vec3(0.6, 0.75, 1.1), 0.5 * u) * (1.0 - 0.45 * u);
        float x0 = (0.25 + 0.5 * tr_h1(seed * 3.1)) * asp;
        float path = x0 + (tr_n1(uv.y * 9.0 + seed * 17.0) - 0.5) * 0.25
                        + (tr_n1(uv.y * 31.0 + seed * 5.0) - 0.5) * 0.07;
        float yEnd = 0.08 + 0.25 * tr_h1(seed * 7.7);
        float vis = smoothstep(yEnd - 0.02, yEnd + 0.05, uv.y);
        float d = abs(p.x - path);
        float side = tr_h1(seed * 1.3) < 0.5 ? -1.0 : 1.0;
        float path2 = path + side * max(0.0, 0.62 - uv.y) * 0.55
                    + (tr_n1(uv.y * 40.0 + seed) - 0.5) * 0.04;
        float vis2 = smoothstep(0.30, 0.38, uv.y) * step(uv.y, 0.62);
        float d2 = abs(p.x - path2);
        float boltA = smoothstep(0.35, 0.9, fl);
        float core = vis * 0.003 / (d + 0.003) + vis2 * 0.0015 / (d2 + 0.002);
        float halo = vis * exp(-d * 7.0) * 0.5 + vis2 * exp(-d2 * 12.0) * 0.25;
        vec3 boltC = (vec3(0.85, 0.92, 1.0) * core * 1.6 + vec3(0.45, 0.55, 1.0) * halo) * boltA;
        col = base * (1.0 + 2.2 * fl) + vec3(0.55, 0.65, 0.9) * fl * 0.6 + boltC;
    } else if (style == 4) {
        // APAGON: la luz falla y se corta; en la oscuridad quedan unas
        // velas; vuelve la luz titilando con la escena nueva.
        float dark = q < 0.5 ? smoothstep(0.0, 0.42, q) : 1.0 - smoothstep(0.58, 1.0, q);
        vec3 base = q < 0.5 ? oldC : newC;
        // titileo lento: como mucho ~2 cortes por segundo (test_destellos.py)
        float n = tr_n1(t * 2.4 + seed * 40.0) * 0.7 + tr_n1(t * 1.1 + seed * 11.0) * 0.5;
        float flick = mix(1.0, step(0.45, n), sin(3.14159 * dark) * 0.85);
        float bri = (1.0 - dark) * flick;
        float candle = smoothstep(0.3, 0.8, dark);
        vec3 flame = vec3(0.0);
        float lit = 0.0;
        for (int i = 0; i < 5; i++) {
            float fi = float(i);
            vec2 c = vec2((fi + 0.5 + (tr_h1(fi * 3.7 + seed) - 0.5) * 0.6) / 5.0 * asp,
                          0.2 + 0.14 * tr_h1(fi * 9.1 + seed));
            float fk = 0.75 + 0.25 * tr_n1(t * 9.0 + fi * 5.0);
            vec2 dv = p - c - vec2((tr_n1(t * 5.0 + fi) - 0.5) * 0.004, 0.0);
            vec2 df = vec2(dv.x * 2.2, (dv.y - 0.01) * (dv.y > 0.01 ? 0.75 : 1.4));
            float core = exp(-dot(df, df) * 1400.0 / fk);
            float hot = exp(-dot(df, df) * 6000.0 / fk);
            float wax = smoothstep(0.017, 0.014, abs(dv.x)) * step(dv.y, -0.022) * step(-0.16, dv.y);
            lit += exp(-length(dv) * 4.5) * fk;
            flame += vec3(1.0, 0.55, 0.18) * core * 1.6 + vec3(1.0, 0.95, 0.8) * hot
                   + vec3(0.75, 0.6, 0.45) * wax * (0.35 + 0.5 * exp(dv.y * 18.0)) * fk;
        }
        vec3 warm = vec3(1.0, 0.7, 0.4);
        col = base * bri + base * warm * lit * 0.9 * candle + flame * candle
            + vec3(0.35, 0.14, 0.04) * lit * 0.12 * candle;
    }

    vec3 excess = max(col - 1.0, 0.0);
    col = col - excess + excess / (1.0 + excess);
    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
"""


def _build_transitions(proj, sw_a, sw_b, cross, ctrl_tex, channels):
    """program_trans (GLSL, 3 inputs: A, B, control) + trans_pick: el
    switch elige el crossfade de siempre o el efecto, y solo durante un
    cambio con estilo (bypass real: fuera de eso el GLSL no cocina)."""
    dat = proj.create(textDAT, 'program_trans_frag')
    dat.nodeX, dat.nodeY = 760, 620
    dat.text = shader.ctrl_header(channels, 2) + _TRANS_FRAG

    trans = proj.create(glslTOP, 'program_trans')
    trans.nodeX, trans.nodeY = 960, 620
    safe_set_first(trans, ['pixeldat', 'pixelshader'], dat.path)
    connect(trans, sw_a, 0)
    connect(trans, sw_b, 1)
    connect(trans, ctrl_tex, 2)
    safe_set_first(trans, ['format', 'pixelformat'], 'rgba16float')
    safe_set_first(trans, ['inputfiltertype', 'inputfilter'], 'linear')

    pick = proj.create(switchTOP, 'trans_pick')
    pick.nodeX, pick.nodeY = 1040, 280
    connect(pick, cross, 0)
    connect(pick, trans, 1)
    safe_set(pick, 'cooktype', 'selective')
    safe_expr(pick, 'index',
              "1 if abs(op('/project1').par.Transitionfx.eval()) > 0.5 and "
              "0.0005 < op('/project1/xfade')['Xfadetarget'].eval() < 0.9995 else 0")
    log('TRANSICIONES: niebla/sangre/rayo/apagon (bypass real por switch) OK')
    return trans, pick


# ---------------------------------------------------------------
# CAPAS ENCIMA DE LAS ESCENAS + MIEDO (Fase 29, docs/53)
# ---------------------------------------------------------------
# Un solo pase sobre la salida del program (despues del fundido, la estela
# y las dos capas; antes del bloom, asi las brasas brillan). Funciona igual
# sobre las escenas de imagen (Media) y en medio de una transicion.
#   uCapa   = capa elegida (1 niebla, 2 murcielagos, 3 lluvia, 4 aranas,
#             5 brasas, 6 cuervos; config.CAPAS)
#   uCapaon = 0..1 con fundido (Lag en control.py)
#   uFear   = MIEDO 0..1: baja la luz, sube la niebla, parpadeo lento (como
#             mucho 2 bajones por segundo: ver test_destellos), temblor y
#             rojo, y la vineta late con el bombo.
# Lo que mueve solo el audio va multiplicado por uMusic: en silencio queda
# quieto. La luz de cada capa sale de la propia escena (mipmap de la
# entrada): la niebla toma el color de lo que hay detras.
# Bypass real por switch (capas_pick): sin capa ni miedo no cocina.
_CAPAS_FRAG = """
out vec4 fragColor;

float cp_h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float cp_h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cp_n1(float x) {
    float i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(cp_h1(i), cp_h1(i + 1.0), f);
}
float cp_noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(cp_h2(i), cp_h2(i + vec2(1.0, 0.0)), f.x),
               mix(cp_h2(i + vec2(0.0, 1.0)), cp_h2(i + vec2(1.0, 1.0)), f.x), f.y);
}
float cp_fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * cp_noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
}
float cp_seg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}
float cp_lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// silueta de murcielago en coordenadas propias (ancho ~2, alto ~1)
float cp_bat(vec2 q, float flap) {
    float ax = abs(q.x);
    float body = length(q / vec2(0.13, 0.30)) - 1.0;
    float ears = max(abs(ax - 0.06) - 0.035 * (0.30 - q.y) / 0.12, abs(q.y - 0.30) - 0.06);
    float top = flap * ax * 0.75 + 0.10 * (1.0 - ax);
    float scal = 0.07 * abs(sin(ax * 9.4));
    float bot = top - 0.42 * pow(max(1.0 - ax, 0.0), 0.7) - 0.04 + scal;
    float wing = max(max(q.y - top, bot - q.y), ax - 1.0);
    return min(min(body * 0.13, ears), wing);
}
// silueta de cuervo visto desde abajo: ala ancha junto al cuerpo, borde
// de ataque recto y cinco plumas abiertas en la punta, cola en abanico
float cp_crow(vec2 q, float flap) {
    float body = (length(q / vec2(0.32, 0.10)) - 1.0) * 0.10;
    float head = length(q - vec2(0.34, 0.02)) - 0.09;
    float beak = max(abs(q.y - 0.01) - 0.035 * clamp((0.58 - q.x) / 0.14, 0.0, 1.0), abs(q.x - 0.50) - 0.08);
    float tx = -q.x - 0.20;
    float tail = max(abs(q.y) - (0.05 + 0.28 * max(tx, 0.0)), max(tx - 0.32, -tx));
    vec2 w = vec2(abs(q.x), q.y);
    float yc = 0.03 + flap * 0.55 * w.x - 0.10 * w.x * w.x;
    float inner = max(max(w.y - (yc + 0.06 * (1.0 - 0.4 * w.x)),
                          (yc - 0.24 * (1.0 - 0.55 * w.x)) - w.y), w.x - 0.78);
    float d = min(min(min(body, head), min(beak, tail)), inner);
    // plumas primarias: cinco "dedos" que salen del extremo del ala
    vec2 b0 = vec2(0.70, 0.03 + flap * 0.55 * 0.70 - 0.049 - 0.03);
    for (int k = 0; k < 5; k++) {
        float fk = float(k);
        float a = -0.70 + fk * 0.20 + flap * 0.45;
        vec2 e = b0 + vec2(cos(a), sin(a)) * (0.44 + 0.05 * (2.0 - abs(fk - 2.0)));
        d = min(d, cp_seg(w, b0, e) - 0.032);
    }
    return d;
}

void main() {
    float t = uRTime;
    float asp = uResW / max(uResH, 1.0);
    float fear = clamp(uFear, 0.0, 1.0);
    float on = clamp(uCapaon, 0.0, 1.0);
    int sel = int(floor(uCapa + 0.5));
    float bass = clamp(uBass * uMusic, 0.0, 1.0);
    float beat = clamp(uBeat * uMusic, 0.0, 1.0);
    float night = clamp(uNight, 0.0, 1.0);

    // MIEDO: temblor de camara lento (y un golpecito con el bombo)
    vec2 uv = vUV.st;
    vec2 shake = vec2(cp_n1(t * 1.7) - 0.5, cp_n1(t * 1.9 + 5.0) - 0.5) * 0.007 * fear;
    shake.y += beat * fear * 0.0035;
    vec2 suv = clamp(uv + shake, vec2(0.0), vec2(1.0));
    vec3 col = texture(sTD2DInputs[0], suv).rgb;
    vec3 env = textureLod(sTD2DInputs[0], uv, 5.0).rgb;      // luz de la escena alrededor
    float envL = cp_lum(env);
    vec2 p = vec2(uv.x * asp, uv.y);

    // NIEBLA (capa 1) -- y el Miedo siempre suma algo de niebla
    float fogAmt = (sel == 1 ? on * (0.75 + 0.35 * night) : 0.0) + fear * 0.55;
    if (fogAmt > 0.001) {
        vec2 dr = vec2(t * 0.045, 0.0);
        float f1 = cp_fbm(p * 1.7 + dr);
        float f2 = cp_fbm(p * 3.6 - dr * 1.6 + vec2(4.0, 1.0));
        float fog = clamp(f1 * 1.1 + f2 * 0.5 - 0.30, 0.0, 1.0);
        float low = smoothstep(0.80, 0.0, uv.y);                  // pegada al piso
        float dens = clamp(fog * low * fogAmt * (1.0 + 0.25 * bass), 0.0, 0.80);
        vec3 fogC = mix(vec3(0.20, 0.22, 0.24), env * 2.0 + vec3(0.04), 0.55);
        col = mix(col, fogC + col * 0.25, dens);
    }

    // MURCIELAGOS (capa 2): los de siempre + mas con el bajo (entran con fundido)
    if (sel == 2 && on > 0.001) {
        float m = 0.0;
        for (int i = 0; i < 16; i++) {
            float fi = float(i);
            float h1 = cp_h1(fi * 3.1 + 1.0), h2 = cp_h1(fi * 7.7 + 2.0), h3 = cp_h1(fi * 1.9 + 3.0);
            float vis = smoothstep(h3 - 0.15, h3, 0.35 + 0.75 * bass) + (i < 6 ? 1.0 : 0.0);
            if (vis < 0.01) continue;
            float s = 0.030 + 0.050 * h2 * h2;                    // los grandes estan mas cerca
            float dir = h1 < 0.5 ? 1.0 : -1.0;
            float sp = (0.10 + 0.10 * h2) * (1.0 + 0.6 * bass);
            float x = mix(-0.25, asp + 0.25, fract(t * sp / (asp + 0.5) + h1 * 7.0));
            if (dir < 0.0) x = asp - x;
            float y = 0.30 + 0.62 * h3 + 0.06 * sin(t * (1.1 + h1) + fi * 2.0);
            vec2 q = (p - vec2(x, y)) / s;
            if (dot(q, q) > 4.0) continue;
            float flap = sin(t * (10.0 + 4.0 * h2) + fi * 2.3);
            float d = cp_bat(vec2(q.x, q.y), flap);
            m = max(m, smoothstep(0.03, -0.03, d) * min(vis, 1.0));
        }
        col = mix(col, vec3(0.008, 0.006, 0.01) + env * 0.06, m * on);
    }

    // LLUVIA (capa 3): dos planos de gotas, iluminadas por la escena
    if (sel == 3 && on > 0.001) {
        float r = 0.0;
        for (int k = 0; k < 2; k++) {
            float fk = float(k);
            vec2 q = vec2(p.x + p.y * 0.18, p.y);
            float nx = 70.0 + fk * 60.0;
            float cx = q.x * nx;
            float ci = floor(cx);
            float hh = cp_h1(ci * 1.37 + fk * 11.0);
            float y = fract(q.y * (0.9 + 0.4 * fk) + t * (1.6 + 0.8 * hh + fk * 0.6) + hh * 13.0);
            float len = 0.10 + 0.08 * hh;
            float streak = smoothstep(0.0, 0.02, y) * (1.0 - smoothstep(0.02, len, y));
            float w = smoothstep(0.16, 0.0, abs(fract(cx) - 0.5)) * step(0.30, hh);
            r += streak * w * (1.0 - 0.4 * fk);
        }
        col *= 1.0 - 0.12 * on;
        col += (vec3(0.60, 0.68, 0.82) * (0.18 + 1.6 * envL) + vec3(0.05)) * r * on;
    }

    // ARANAS (capa 4): bajan de su hilo (mas con el bajo) y caminan por los bordes
    if (sel == 4 && on > 0.001) {
        float m = 0.0, thread = 0.0;
        for (int i = 0; i < 6; i++) {
            float fi = float(i);
            float h1 = cp_h1(fi * 5.3 + 2.0);
            vec2 c;
            float ang = 0.0;
            if (i < 4) {
                float x = (0.12 + 0.25 * fi + 0.06 * (h1 - 0.5)) * asp;
                float drop = 0.12 + 0.22 * (0.5 + 0.5 * sin(t * (0.25 + 0.1 * h1) + fi * 2.1)) + 0.12 * bass;
                c = vec2(x + 0.004 * sin(t * 0.9 + fi), 1.0 - drop);
                float dx = abs(p.x - c.x);
                thread += smoothstep(0.0016, 0.0, dx) * step(c.y, p.y);
            } else {
                float side = i == 4 ? 0.035 : asp - 0.035;
                c = vec2(side, fract(t * 0.025 * (1.0 + h1) + h1));
                ang = 1.5708;
            }
            float s = 0.028 + 0.014 * h1;
            vec2 q = (p - c) / s;
            if (dot(q, q) > 9.0) continue;
            float ca = cos(ang), sa = sin(ang);
            q = vec2(ca * q.x + sa * q.y, -sa * q.x + ca * q.y);
            float d = min(length(q - vec2(0.0, -0.25)) - 0.55, length(q - vec2(0.0, 0.45)) - 0.32);
            for (int k = 0; k < 4; k++) {
                float fk = float(k);
                float tw = 0.12 * sin(t * 7.0 + fk * 1.7 + fi * 3.0);
                float a = -0.75 + fk * 0.5 + tw;
                for (int sd = -1; sd <= 1; sd += 2) {
                    float sg = float(sd);
                    vec2 b0 = vec2(sg * 0.25, 0.05);
                    vec2 kn = b0 + vec2(sg * cos(a), sin(a) + 0.6) * 0.9;
                    vec2 tp = kn + vec2(sg * 0.5, -0.9 + 0.3 * fk);
                    d = min(d, min(cp_seg(q, b0, kn), cp_seg(q, kn, tp)) - 0.07);
                }
            }
            m = max(m, smoothstep(0.08, -0.08, d));
        }
        vec3 dark = vec3(0.01, 0.008, 0.008) + env * 0.05;
        col = mix(col, vec3(0.55, 0.55, 0.6) * (0.15 + 0.85 * envL) + 0.04, clamp(thread, 0.0, 1.0) * 0.35 * on);
        col = mix(col, dark, m * on);
    }

    // BRASAS (capa 5): suben del piso con vaiven; el bajo las aviva
    if (sel == 5 && on > 0.001) {
        vec3 e = vec3(0.0);
        for (int k = 0; k < 2; k++) {
            float fk = float(k);
            vec2 g = p * vec2(7.0 + fk * 5.0, 4.0 + fk * 3.0) + vec2(0.0, -t * (0.45 + 0.25 * fk)) + fk * 17.0;
            vec2 id = floor(g);
            vec2 f = fract(g);
            float hh = cp_h2(id + fk * 3.0);
            if (hh < 0.78 - 0.20 * bass) continue;
            vec2 c = vec2(0.5 + 0.35 * sin(t * (1.0 + hh) + hh * 20.0), 0.5 + 0.3 * (cp_h2(id + 7.0) - 0.5));
            vec2 d = (f - c) / vec2(1.0, 1.6);
            float glow = exp(-dot(d, d) * (260.0 + 200.0 * fk));
            float life = smoothstep(0.85, 0.05, uv.y);
            float tw = 0.65 + 0.35 * sin(t * (2.0 + 2.0 * hh) + hh * 40.0);
            e += mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.75, 0.30), hh) * glow * life * tw * (1.2 - 0.4 * fk);
        }
        col += e * on * (0.9 + 1.2 * bass) * (0.8 + 0.4 * night);
        col += vec3(0.30, 0.07, 0.01) * on * 0.10 * smoothstep(0.45, 0.0, uv.y);   // brillo del fuego abajo
    }

    // CUERVOS (capa 6): planean despacio y aletean con el bombo
    if (sel == 6 && on > 0.001) {
        float m = 0.0;
        for (int i = 0; i < 5; i++) {
            float fi = float(i);
            float h1 = cp_h1(fi * 4.7 + 9.0), h2 = cp_h1(fi * 2.3 + 4.0);
            float s = 0.075 + 0.055 * h2;
            float x = mix(-0.35, asp + 0.35, fract(t * (0.035 + 0.02 * h1) + h1 * 5.0));
            float y = 0.55 + 0.38 * h2 + 0.05 * sin(t * 0.4 + fi * 1.3);
            vec2 q = (p - vec2(x, y)) / s;
            if (dot(q, q) > 2.5) continue;
            // planean y cada tanto aletean; con el bombo aletea la bandada
            float flapOn = max(smoothstep(0.6, 0.9, sin(t * 0.7 + fi * 2.0)), beat);
            float flap = mix(0.12, 0.6 * sin(t * 6.0 + fi), flapOn);
            m = max(m, smoothstep(0.03, -0.03, cp_crow(q, flap)));
        }
        col = mix(col, vec3(0.01, 0.01, 0.015) + env * 0.05, m * on);
    }

    // MIEDO: luz que baja, contraste, rojo, vineta que late y parpadeo lento
    if (fear > 0.001) {
        vec2 vc = (uv - 0.5) * vec2(1.0, 1.15);
        float vig = 1.0 - fear * (0.70 + 0.15 * beat) * smoothstep(0.22, 0.85, length(vc));
        col = pow(max(col, 0.0), vec3(1.0 + 0.45 * fear)) * (1.0 - 0.18 * fear);
        float l = cp_lum(col);
        col = mix(col, l * vec3(1.30, 0.42, 0.36), 0.42 * fear);
        // a lo sumo 2 bajones de luz por segundo (casilleros de 0.5 s)
        float slot = floor(t * 2.0);
        float dip = step(0.78, cp_h1(slot * 1.31)) * sin(3.14159 * fract(t * 2.0));
        col *= vig * (1.0 - 0.32 * fear * dip);
    }

    vec3 excess = max(col - 1.0, 0.0);
    col = col - excess + excess / (1.0 + excess);
    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
"""


def _build_capas(proj, src_top, ctrl_tex, channels):
    """program_capas (GLSL: imagen + control) + capas_pick: el switch deja
    pasar la imagen tal cual cuando no hay capa ni miedo (no cocina)."""
    dat = proj.create(textDAT, 'program_capas_frag')
    dat.nodeX, dat.nodeY = 1160, 820
    dat.text = shader.ctrl_header(channels, 1) + _CAPAS_FRAG

    capas = proj.create(glslTOP, 'program_capas')
    capas.nodeX, capas.nodeY = 1320, 820
    safe_set_first(capas, ['pixeldat', 'pixelshader'], dat.path)
    connect(capas, src_top, 0)
    connect(capas, ctrl_tex, 1)
    safe_set_first(capas, ['format', 'pixelformat'], 'rgba16float')
    # mipmaps de la entrada: la luz de la escena alrededor (textureLod)
    if not safe_set_first(capas, ['inputfiltertype', 'inputfilter'], 'mipmap'):
        log('AVISO CAPAS: sin filtro mipmap -- la niebla toma menos el color de la escena')

    pick = proj.create(switchTOP, 'capas_pick')
    pick.nodeX, pick.nodeY = 1480, 820
    connect(pick, src_top, 0)
    connect(pick, capas, 1)
    safe_set(pick, 'cooktype', 'selective')
    safe_expr(pick, 'index',
              "1 if (op('/project1/ctrl')['capaon'].eval() > 0.002 or "
              "op('/project1/ctrl')['fear'].eval() > 0.002) else 0")
    log('CAPAS: niebla/murcielagos/lluvia/aranas/brasas/cuervos + miedo (bypass real) OK')
    return capas, pick


# ---------------------------------------------------------------
# MOMENTOS (fase 43): Linterna, Ojos, Subida -> impacto, Murcielagos y
# Rebobinar VHS, en los pads 10, 11, 13, 14 y 15 de Halloween. Despues de
# las capas y ANTES del bloom (lo que se prende en un momento brilla).
# Inputs: imagen, la imagen guardada en un Cache TOP (Rebobinar), control.
# ---------------------------------------------------------------
MOMENTO_CACHE = 96          # cuadros guardados para rebobinar (~1.6 s a 60 fps)
_MOMENTOS_FRAG = """// MOMENTOS (fase 43): pads 10, 11, 13, 14 y 15 en Halloween. Input 0: la
// imagen del programa. Input 1: la misma imagen guardada en un Cache TOP
// (para Rebobinar). Input 2: control. Cada canal m* es el rtime en que se
// apreto (o se solto) el pad; -1 = nunca. uMseed cambia en cada toque.
out vec4 fragColor;

float mH(float k) { return fract(sin((uMseed * 71.3 + k) * 12.9898) * 43758.5453); }
float mHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float mHash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// silueta de murcielago en q (ancho de alas 1): 1 adentro
float mBat(vec2 q, float flap) {
    float ax = abs(q.x);
    if (ax > 1.0 || abs(q.y) > 0.6) return 0.0;
    float top = 0.08 + 0.32 * flap * ax - 0.06 * ax * ax;
    float bot = top - 0.30 * (1.0 - ax * ax) + 0.05 * abs(sin(ax * 9.5)) * ax;
    float wing = smoothstep(0.02, -0.02, q.y - top) * smoothstep(-0.02, 0.02, q.y - bot);
    float body = smoothstep(0.03, 0.0, length(vec2(q.x * 3.2, q.y + 0.02)) - 0.16);
    float ears = smoothstep(0.02, 0.0, abs(ax - 0.06) * 3.0 + (q.y - 0.17) * -1.0 - 0.05) * step(q.y, 0.24) * step(0.1, q.y);
    return clamp(max(max(wing, body), ears), 0.0, 1.0);
}

// un ojo almendrado en q (radio 1): x = blanco del ojo, y = pupila
vec2 mEye(vec2 q, float open, vec2 look) {
    float lid = max(open, 0.02);
    float shape = length(vec2(q.x, q.y / (0.55 * lid))) - 1.0;
    float e = smoothstep(0.08, -0.04, shape);
    float pup = smoothstep(0.06, -0.02, length(vec2((q.x - look.x * 0.45) * 1.8, q.y - look.y * 0.2)) - 0.32);
    return vec2(e, pup * e);
}

void main() {
    vec2 uv = vUV.st;
    vec2 res = vec2(textureSize(sTD2DInputs[0], 0));
    float A = res.x / res.y;
    float rt = uRTime;
    float bt = uMbeat > 0.05 ? uMbeat : 0.5;
    float kick = clamp(uKick, 0.0, 1.0);
    float bass = clamp(uBass, 0.0, 1.0);

    // ---- SUBIDA -> IMPACTO (mover la imagen antes de leerla) ----
    vec2 suv = uv;
    float build = 0.0, impact = 0.0, eImp = 99.0;
    if (uMsub > 0.0) {
        float held = (uMsuboff > uMsub ? uMsuboff : rt) - uMsub;
        build = clamp(held / 8.0, 0.0, 1.0);
        if (uMsuboff > uMsub) {
            eImp = rt - uMsuboff;
            impact = eImp < 1.6 ? 1.0 : 0.0;
            build *= clamp(1.0 - eImp * 6.0, 0.0, 1.0);   // la carga se suelta de golpe
        }
        vec2 c = suv - 0.5;
        c /= 1.0 + 0.14 * build * build;                  // zoom que entra
        float fr = floor(rt * 30.0);
        c += (vec2(mHash(fr), mHash(fr + 7.0)) - 0.5) * 0.02 * build * build;   // temblor
        if (impact > 0.0) {
            vec2 cp = c * vec2(A, 1.0);
            float d = length(cp);
            float r = eImp * 1.5;
            float ring = exp(-abs(d - r) * 22.0) * (1.0 - eImp / 1.6);
            c += (cp / max(d, 1e-3)) / vec2(A, 1.0) * 0.05 * ring;
            c *= 1.0 - 0.06 * exp(-eImp * 5.0);         // golpe de zoom
        }
        suv = c + 0.5;
    }

    vec3 col = texture(sTD2DInputs[0], suv).rgb;

    // ---- REBOBINAR VHS ----
    if (uMrew > 0.0) {
        float e = rt - uMrew;
        if (e >= 0.0 && e < 2.2) {
            float back = smoothstep(0.0, 0.08, e) * (1.0 - smoothstep(1.6, 2.0, e));
            float fr = floor(rt * 24.0);
            float jit = (mHash(floor(uv.y * 90.0) + fr) - 0.5) * 0.012 * back;
            float tear = smoothstep(0.035, 0.0, abs(fract(uv.y * 1.3 + rt * 2.7) - 0.5)) * back;
            vec2 ruv = vec2(uv.x + jit + tear * 0.05, uv.y);
            vec3 old = vec3(texture(sTD2DInputs[1], ruv + vec2(0.004, 0.0)).r,
                            texture(sTD2DInputs[1], ruv).g,
                            texture(sTD2DInputs[1], ruv - vec2(0.004, 0.0)).b);
            float lines = 0.85 + 0.15 * sin(uv.y * res.y * 1.6);
            float noise = mHash2(floor(uv * vec2(320.0, 180.0)) + fr) * tear;
            old = old * lines * vec3(1.05, 0.95, 1.1) + noise * 0.6;
            // "<<" arriba a la izquierda
            vec2 ip = (uv - vec2(0.06, 0.88)) * vec2(A, 1.0) / 0.035;
            float tri1 = step(abs(ip.y), 1.0 - (ip.x + 1.0) * 0.5) * step(-1.0, ip.x) * step(ip.x, 1.0);
            vec2 ip2 = ip - vec2(1.6, 0.0);
            float tri2 = step(abs(ip2.y), 1.0 - (ip2.x + 1.0) * 0.5) * step(-1.0, ip2.x) * step(ip2.x, 1.0);
            old = mix(old, vec3(0.95), max(tri1, tri2) * step(0.5, fract(rt * 2.0)));
            col = mix(col, old, back);
            // al volver: rayas de tracking que se van
            float ret = smoothstep(1.6, 1.75, e) * (1.0 - smoothstep(1.85, 2.2, e));
            col += ret * smoothstep(0.03, 0.0, abs(fract(uv.y * 3.0 - rt * 4.0) - 0.5)) * 0.5;
        }
    }

    // ---- SUBIDA: color que se lava y respira; IMPACTO: color que explota ----
    if (build > 0.0) {
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, vec3(l) * vec3(1.25, 0.85, 0.8), 0.55 * build);
        float rate = 1.0 + 3.0 * build;                  // hasta 4 respiros por segundo
        col *= 1.0 + 0.07 * build * sin(6.2831 * rt * rate);
        col += vec3(1.0, 0.85, 0.8) * 0.22 * build * build;
    }
    if (impact > 0.0) {
        float f = exp(-eImp * 3.5);
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(l), col, 1.0 + 1.2 * f);            // saturacion de golpe
        col *= 1.0 + 0.6 * exp(-eImp * 8.0);              // un solo destello
    }

    // ---- LINTERNA (mantener) ----
    if (uMlin > 0.0) {
        float on = clamp((rt - uMlin) / 0.15, 0.0, 1.0);
        float off = uMlinoff > uMlin ? 1.0 - clamp((rt - uMlinoff) / 0.12, 0.0, 1.0) : 1.0;
        float L = on * off;
        if (L > 0.0) {
            float el = rt - uMlin;
            float seg = floor(el / 2.4);
            float fs = fract(el / 2.4);
            vec2 a0 = vec2(mH(seg * 3.1) - 0.5, mH(seg * 3.1 + 1.0) - 0.5) * vec2(A * 0.75, 0.6);
            vec2 a1 = vec2(mH(seg * 3.1 + 3.1) - 0.5, mH(seg * 3.1 + 4.1) - 0.5) * vec2(A * 0.75, 0.6);
            vec2 c = mix(a0, a1, smoothstep(0.0, 0.45, fs));       // busca y se queda
            c += vec2(sin(rt * 7.0), cos(rt * 5.3)) * 0.006;        // pulso de la mano
            vec2 p = (uv - 0.5) * vec2(A, 1.0);
            float r = 0.26 + 0.05 * mH(seg + 9.0);
            float d = length((p - c) * vec2(1.0, 1.15));
            float beam = smoothstep(r, r * 0.55, d);
            float flick = 1.0 - 0.3 * kick * step(0.6, mHash(floor(rt * 20.0)));
            vec3 lit = (col * 2.4 + vec3(0.07, 0.06, 0.04)) * vec3(1.1, 1.0, 0.85) * flick;
            vec3 dark = col * 0.035;
            vec3 lin = mix(dark, lit, beam) + vec3(0.9, 0.85, 0.6) * smoothstep(r * 1.4, r * 0.9, d) * 0.04;
            float back = uMlinoff > uMlin ? clamp(1.0 - (rt - uMlinoff) / 0.4, 0.0, 1.0) : 0.0;
            col = mix(col * (1.0 + 0.25 * back), lin, L);
        }
    }

    // ---- OJOS EN LA OSCURIDAD ----
    if (uMojos > 0.0) {
        float e = rt - uMojos;
        float D = max(1.6, bt * 4.0);
        if (e >= 0.0 && e < D + 1.2) {
            float black = smoothstep(0.0, 0.1, e) * (1.0 - smoothstep(D, D + 0.08, e));
            vec2 p = (uv - 0.5) * vec2(A, 1.0);
            vec3 eyes = vec3(0.0);
            vec2 look = vec2(sin(e * 1.3 + mH(2.0) * 6.0), sin(e * 0.9) * 0.5);
            for (int i = 0; i < 28; i++) {
                float fi = float(i);
                vec2 c = (vec2(mH(fi * 1.7), mH(fi * 2.9)) - 0.5) * vec2(A * 0.9, 0.85);
                float s = 0.012 + 0.03 * mH(fi * 4.3) * mH(fi * 4.3);
                float t0 = mH(fi * 5.1) * D * 0.6;
                float open = smoothstep(t0, t0 + 0.25, e);
                float blink = 1.0 - smoothstep(0.0, 0.06, 0.06 - abs(mod(e + mH(fi) * 3.0, 2.3) - 0.06));
                open *= blink;
                vec3 ec = mH(fi * 6.7) < 0.6 ? vec3(1.0, 0.8, 0.15) : mH(fi * 6.7) < 0.85 ? vec3(1.0, 0.15, 0.08) : vec3(0.4, 1.0, 0.25);
                for (int k = 0; k < 2; k++) {
                    vec2 q = (p - c - vec2((float(k) - 0.5) * s * 2.6, 0.0)) / s;
                    if (abs(q.x) > 1.3 || abs(q.y) > 1.0) continue;
                    vec2 m = mEye(q, open, look);
                    eyes += ec * m.x * (1.0 - 0.9 * m.y) * 1.4;
                }
            }
            vec3 dark = col * 0.02 + eyes;
            col = mix(col, dark, black);
            float back = e > D ? exp(-(e - D) * 5.0) : 0.0;     // vuelve con un golpe
            col *= 1.0 + 0.45 * back;
        }
    }

    // ---- MURCIELAGOS HACIA LA CAMARA ----
    if (uMbat > 0.0) {
        float e = rt - uMbat;
        if (e >= 0.0 && e < 4.5) {
            vec2 p = (uv - 0.5) * vec2(A, 1.0);
            vec2 ctr = (vec2(mH(1.0), mH(2.0)) - 0.5) * vec2(A * 0.3, 0.2);
            float cover = 0.0;
            for (int i = 0; i < 30; i++) {
                float fi = float(i);
                float u = (e - mH(fi * 1.3) * 1.6) / (1.6 + 0.8 * mH(fi * 2.2));
                if (u <= 0.0 || u >= 1.0) continue;
                float ang = mH(fi * 3.7) * 6.2831;
                vec2 dir = vec2(cos(ang) * 1.3, sin(ang) * 0.8);
                vec2 c = ctr + dir * (0.03 + u * u * 0.9);
                float s = 0.02 + u * u * 0.45;
                float flap = sin(rt * (16.0 + 6.0 * mH(fi)) + fi);
                vec2 q = (p - c) / s;
                q = mat2(cos(dir.y * 0.4), sin(dir.y * 0.4), -sin(dir.y * 0.4), cos(dir.y * 0.4)) * q;
                cover = max(cover, mBat(q, flap) * smoothstep(1.0, 0.85, u));
            }
            col = mix(col, vec3(0.015, 0.0, 0.02), cover);
        }
    }

    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
"""


def _build_momentos(proj, src_top, ctrl_tex, channels):
    """program_momentos + momentos_pick: el switch deja pasar la imagen tal
    cual cuando no corre ningun momento (el shader no cocina)."""
    cs = "op('/project1/control_script').module"
    # memoria para Rebobinar: la imagen a media resolucion y 8 bits
    old = src_top
    try:
        small = proj.create(fitTOP, 'momento_small')  # noqa: F821
        small.nodeX, small.nodeY = 1160, 1000
        connect(small, src_top)
        safe_set(small, 'outputresolution', 'custom')
        safe_expr(small, 'resolutionw', "int(op('/project1').par.Outputwidth.eval() / 2)")
        safe_expr(small, 'resolutionh', "int(op('/project1').par.Outputheight.eval() / 2)")
        safe_set_first(small, ['format', 'pixelformat'], 'rgba8fixed')
        cache = proj.create(cacheTOP, 'momento_cache')  # noqa: F821
        cache.nodeX, cache.nodeY = 1320, 1000
        connect(cache, small)
        safe_set_first(cache, ['cachesize', 'size'], MOMENTO_CACHE)
        safe_expr(cache, 'active', "0 if {}.rebobinando() else 1".format(cs))
        safe_expr_first(cache, ['outputindex', 'index'], "{}.rebobinarIndice({})".format(cs, MOMENTO_CACHE))
        old = cache
    except Exception as e:
        log('AVISO MOMENTOS: sin Cache TOP ({}) -- Rebobinar muestra la imagen en vivo'.format(e))

    dat = proj.create(textDAT, 'program_momentos_frag')
    dat.nodeX, dat.nodeY = 1160, 1140
    dat.text = shader.ctrl_header(channels, 2) + _MOMENTOS_FRAG
    mom = proj.create(glslTOP, 'program_momentos')
    mom.nodeX, mom.nodeY = 1480, 1000
    safe_set_first(mom, ['pixeldat', 'pixelshader'], dat.path)
    connect(mom, src_top, 0)
    connect(mom, old, 1)
    connect(mom, ctrl_tex, 2)
    safe_set_first(mom, ['format', 'pixelformat'], 'rgba16float')

    pick = proj.create(switchTOP, 'momentos_pick')
    pick.nodeX, pick.nodeY = 1640, 1000
    connect(pick, src_top, 0)
    connect(pick, mom, 1)
    safe_set(pick, 'cooktype', 'selective')
    safe_expr(pick, 'index', "1 if {}.momentoActivo() else 0".format(cs))
    log('MOMENTOS: linterna/ojos/subida/murcielagos/rebobinar (bypass real) OK')
    return mom, pick


def build(proj, scene_outs, ctrl_tex=None, channels=None):
    # --- puentes locales a cada escena ---
    srcs = []
    for i, out1 in enumerate(scene_outs):
        s = proj.create(selectTOP, 'scene_src{}'.format(i))
        s.nodeX = 400
        s.nodeY = 600 - i * 32
        safe_set(s, 'top', out1.path)
        srcs.append(s)

    sw_a = proj.create(switchTOP, 'program_a')
    sw_a.nodeX, sw_a.nodeY = 700, 380
    sw_b = proj.create(switchTOP, 'program_b')
    sw_b.nodeX, sw_b.nodeY = 700, 180

    for sw in (sw_a, sw_b):
        try:
            sw.setInputs(srcs)
        except Exception as e:
            log('ERROR setInputs {}: {}'.format(sw.path, e))
        safe_set(sw, 'index', 0)
        # 'selective' evita coocinar las 20 entradas del Switch.
        safe_set(sw, 'cooktype', 'selective')

    # --- BUS DE PREVIEW (cue) ---
    # Tercer switch sobre las MISMAS fuentes: deja ver una escena en el
    # dashboard ANTES de tirarla al programa. Es lo que Previewall
    # intentaba resolver por fuerza bruta (cocinar las 34 miniaturas, que
    # hundio el FPS a 9): aca cocina UNA sola, la que estas por usar.
    # Sale crudo, sin Master FX ni master fade -- un cue tiene que mostrar
    # la escena, no el programa.
    sw_prev = proj.create(switchTOP, 'preview_sw')
    sw_prev.nodeX, sw_prev.nodeY = 700, -80
    try:
        sw_prev.setInputs(srcs)
    except Exception as e:
        log('ERROR setInputs {}: {}'.format(sw_prev.path, e))
    safe_set(sw_prev, 'cooktype', 'selective')
    safe_expr(sw_prev, 'index', "op('/project1').par.Previewindex")

    for sw, n in ((sw_a, 'program_a'), (sw_b, 'program_b')):
        got = len(sw.inputs)
        if got != config.N_SCENES:
            log('ERROR {}: esperaba {} inputs, obtuve {}'.format(
                n, config.N_SCENES, got))

    # --- rampa nativa del crossfade ---
    xp = proj.create(parameterCHOP, 'xfade_par')
    xp.nodeX, xp.nodeY = 700, 20
    safe_set_first(xp, ['op', 'ops'], config.PROJECT_PATH)
    safe_set(xp, 'custom', True)
    safe_set(xp, 'builtin', False)
    safe_set_first(xp, ['parameters', 'pars', 'parameter'], 'Xfadetarget')

    lag = proj.create(lagCHOP, 'xfade_lag')
    lag.nodeX, lag.nodeY = 860, 20
    safe_expr(lag, 'lag1', config.TRANSITION_LAG_EXPR)
    safe_expr(lag, 'lag2', config.TRANSITION_LAG_EXPR)
    safe_set_first(lag, ['lagmethod', 'method'], 'slew')
    connect(lag, xp)

    xfade = proj.create(nullCHOP, 'xfade')
    xfade.nodeX, xfade.nodeY = 1020, 20
    safe_set(xfade, 'cooktype', 'selective')
    connect(xfade, lag)

    cross = proj.create(crossTOP, 'program_cross')
    cross.nodeX, cross.nodeY = 960, 280
    connect(cross, sw_a, 0)
    connect(cross, sw_b, 1)
    safe_expr(cross, 'cross', "op('/project1/xfade')['Xfadetarget']")
    # Primer nodo a resolucion de salida: reescala las escenas (que se
    # calculan a Renderscale) con filtro lineal explicito.
    safe_set_first(cross, ['inputfiltertype', 'inputfilter'], 'linear')

    # --- MASTER FX: dos capas + estela ---
    # Solo si el llamador paso la textura de control (siempre, en el build
    # normal). Sin ella se cae al bus de antes, sin Master FX, para que
    # este modulo se pueda seguir usando suelto.
    trans = None
    if ctrl_tex is not None and channels:
        trans, cross_out = _build_transitions(proj, sw_a, sw_b, cross, ctrl_tex, channels)
    else:
        cross_out = cross
    if ctrl_tex is not None and channels:
        fx = _build_master_fx(proj, sw_a, sw_b, cross_out, ctrl_tex, channels)
        clean = fx['clean']
        post = fx['trails_pick']
    else:
        fx = {}
        clean = proj.create(nullTOP, 'program_clean')
        clean.nodeX, clean.nodeY = 1160, 280
        connect(clean, cross_out)
        post = clean

    capas = None
    if ctrl_tex is not None and channels and getattr(config, 'CAPAS_ON', False):
        capas, post = _build_capas(proj, post, ctrl_tex, channels)
    momentos = None
    if config.MOMENTOS_ON and ctrl_tex is not None and channels:
        momentos, post = _build_momentos(proj, post, ctrl_tex, channels)

    bloom_fx = _build_bloom(proj, post, ctrl_tex, channels)
    bloom = bloom_fx['bloom']

    # --- overlay de texto (nombre de artista) -- DESPUES del bloom (que
    # el texto quede nitido, sin el glow difuminandolo) y ANTES del
    # master fade (que el blackout y el master brightness lo tapen a el
    # tambien: si el show se va a negro, el texto se va con el show).
    text_fx = _build_text_overlay(proj, bloom, ctrl_tex, channels)
    post_text = text_fx['text_composite']

    # --- master fade / blackout (solo en SHOW OUT) ---
    black = proj.create(constantTOP, 'black')
    black.nodeX, black.nodeY = 960, 60
    for p, v in (('colorr', 0), ('colorg', 0), ('colorb', 0), ('alpha', 1)):
        safe_set(black, p, v)

    master = proj.create(crossTOP, 'master_fade')
    master.nodeX, master.nodeY = 1160, 60
    connect(master, black, 0)
    connect(master, post_text, 1)
    safe_expr(master, 'cross',
              "0 if op('/project1').par.Blackout.eval() "
              "else op('/project1').par.Brightness.eval()")

    show = proj.create(nullTOP, 'show_out')
    show.nodeX, show.nodeY = 1360, 60
    connect(show, master)

    # Resolucion global solo donde hace falta declararla. Los nodos de
    # Master FX entran en la misma lista: un GLSL TOP sin resolucion
    # declarada hereda la del input, y el Feedback TOP de la estela tiene
    # que coincidir SI O SI con el shader que lo alimenta (si no, cada
    # frame se reescala contra el anterior y la estela "respira" sola).
    res_nodes = [black, cross, clean, bloom, bloom_fx['bloom_prefilter'],
                 master, show,
                 text_fx['text_y'], text_fx['text_composite']] + text_fx['text_extra']
    res_nodes += [fx[k] for k in ('blend', 'pick', 'trails', 'trails_fb',
                                  'trails_pick') if k in fx]
    if trans is not None:
        res_nodes += [trans, cross_out]
    if capas is not None:
        res_nodes += [capas, proj.op('capas_pick')]
    if momentos is not None:
        res_nodes += [momentos, post]
    for t in [x for x in res_nodes if x is not None]:
        safe_set(t, 'outputresolution', 'custom')
        safe_expr(t, 'resolutionw', "op('/project1').par.Outputwidth")
        safe_expr(t, 'resolutionh', "op('/project1').par.Outputheight")

    # Cuadro del proyector: la salida (que puede ser panoramica) centrada
    # en un cuadro 16:9 con franjas negras. Sin esto la ventana en 'fill'
    # estiraria una salida 1280x512 a la pantalla 16:9 y todo se veria
    # aplastado. Con salida 16:9 el Fit no hace nada.
    frame = proj.create(fitTOP, 'show_frame')
    frame.nodeX, frame.nodeY = 1360, -160
    connect(frame, show)
    safe_set(frame, 'fit', 'fitbest')
    safe_set(frame, 'outputresolution', 'custom')
    safe_expr(frame, 'resolutionw', "op('/project1').par.Outputwidth")
    safe_expr(frame, 'resolutionh',
              "max(op('/project1').par.Outputheight, "
              "int(round(op('/project1').par.Outputwidth / {:.6f})))"
              .format(config.PROJECTOR_ASPECT))

    # Ventana de salida al proyector. Se crea pero NO se abre sola: abrirla
    # es una accion de show, no de build.
    win = proj.create(windowCOMP, 'show_window')
    win.nodeX, win.nodeY = 1560, -160
    safe_set_first(win, ['op', 'operator', 'winop'], frame.path)
    safe_set(win, 'borders', False)
    safe_set_first(win, ['opensize', 'size'], 'fill')
    safe_set(win, 'monitor', 1)
    safe_set(win, 'cursorvisible', False)

    _build_outputs(proj, show)

    log('PROGRAM: bus A/B + preview + crossfade nativo + master fade OK')
    out = {'a': sw_a, 'b': sw_b, 'preview': sw_prev, 'cross': cross,
           'clean': clean, 'bloom': bloom, 'master': master, 'show': show,
           'bloom_prefilter': bloom_fx['bloom_prefilter'],
           'frame': frame, 'window': win}
    out.update(fx)
    out.update(text_fx)
    return out


# ---------------------------------------------------------------
# SALIDAS EXTERNAS + GRABACION
# ---------------------------------------------------------------

def _build_outputs(proj, show):
    """Salida a otro software (NDI / Syphon-Spout) y grabacion a disco.

    Los tres nodos se crean con try/except por TIPO: que un operador
    exista depende del build, del sistema operativo y de la LICENCIA
    (NDI y Syphon/Spout no estan disponibles en todas). Si el tipo no
    existe, `proj.create` levanta NameError sobre la constante de tipo y
    aca se registra y se sigue -- un rig que no arranca porque no hay NDI
    seria mucho peor que uno sin NDI.

    Por eso tampoco se conecta ninguno "obligatorio": la cadena de show
    (show_out -> ventana) funciona exactamente igual con o sin esto.
    """
    made = []

    # NDI: lo lee Resolume, OBS, un media server, otra maquina en la red.
    try:
        ndi = proj.create(ndioutTOP, 'ndi_out')          # noqa: F821
        ndi.nodeX, ndi.nodeY = 1560, 200
        connect(ndi, show)
        safe_set_first(ndi, ['name', 'ndiname', 'sourcename'],
                       'TDAI2026')
        safe_expr(ndi, 'active', "op('/project1').par.Externalout")
        made.append('NDI')
    except Exception as e:
        log('SALIDA: NDI no disponible en este build/licencia ({})'.format(
            type(e).__name__))

    # Syphon (macOS) / Spout (Windows): misma idea pero local, sin red.
    try:
        syp = proj.create(syphonspoutoutTOP, 'syphon_out')   # noqa: F821
        syp.nodeX, syp.nodeY = 1560, 320
        connect(syp, show)
        safe_set_first(syp, ['name', 'sendername', 'syphonname'],
                       'TDAI2026')
        safe_expr(syp, 'active', "op('/project1').par.Externalout")
        made.append('Syphon/Spout')
    except Exception as e:
        log('SALIDA: Syphon/Spout no disponible en este build/licencia '
            '({})'.format(type(e).__name__))

    # Grabacion a disco. Movie File Out recibe el TOP final y el Audio
    # Device In CHOP original, que es time-sliced y conserva sus canales
    # (estereo si la entrada tiene dos). audio_mono perderia un canal.
    # El nombre de archivo lo arma control_script al comenzar, para que
    # no cambie a mitad de grabacion.
    try:
        rec = proj.create(moviefileoutTOP, 'recorder')       # noqa: F821
        rec.nodeX, rec.nodeY = 1560, 440
        connect(rec, show)
        audio_src = proj.op('audio1')
        if audio_src is None:
            log('SALIDA: no hay audio1; la grabacion con audio no esta lista')
        elif safe_set(rec, 'audiochop', audio_src.path):
            log('SALIDA: audio de grabacion <- {}'.format(audio_src.path))
        else:
            log('SALIDA: Movie File Out TOP no expone Audio CHOP')
        safe_expr(rec, 'record', "op('/project1').par.Record")
        made.append('grabacion')
    except Exception as e:
        log('SALIDA: grabacion no disponible ({})'.format(type(e).__name__))

    log('SALIDAS: {}'.format(', '.join(made) if made else 'ninguna disponible'))
