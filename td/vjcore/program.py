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
# Umbral/cantidad quedan fijos (no son perillas en vivo) -- es un acabado
# estetico del programa completo, no un parametro de performance que el
# VJ necesite tocar escena por escena.
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
    vec2 texel = uTD2DInfos[1].res.zw;

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

    vec3 col = (base + glow * AMOUNT * (1.0 + kick * KICK_GLOW)) * pump;

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
                 '#define uGroove 0.0\n#define uAudioamt 0.0\n')


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

    vec2 texel = uTD2DInfos[1].res.zw;
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
    vec2 texel0 = uTD2DInfos[0].res.zw;
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


def _build_text_overlay(proj, base_top, ctrl_tex=None, channels=None):
    """Nombre de artista tipeado en vivo, compositado sobre el programa.

    Fundido: Parametro (Textvisible, 0/1) -> Lag CHOP -> CHOP to TOP de
    1x1 -> input 2 del shader de arriba. Es la MISMA idea que la
    transicion de escenas (xfade_lag mas abajo en este archivo): TD hace
    la rampa nativa, nada de Python por frame.

    Posicion vertical con un Transform TOP (parametro 'ty', de los mas
    estables que tiene TD) en vez de los parametros de posicion propios
    del Text TOP -- por la misma razon que el contorno se hace a mano:
    menos superficie que pueda variar de nombre entre builds.
    """
    text_top = proj.create(textTOP, 'text_overlay_src')  # noqa: F821
    text_top.nodeX, text_top.nodeY = 960, 780
    safe_expr(text_top, 'text', "op('/project1').par.Textcontent")
    safe_expr_first(text_top, ['font', 'fontfile'],
                     "op('/project1/control_script').module.currentFontName()")
    # Rango de tamano en pixeles: 24 (perilla en 0) a 220 (perilla en 1,
    # un titular de pantalla completa) sobre una salida tipica de 720p.
    safe_expr_first(text_top, ['fontsizex', 'fontsize'],
                     "24 + op('/project1').par.Textsize.eval() * 196")
    safe_set_first(text_top, ['alignx', 'justifyx', 'textalignx'], 'center')
    safe_set_first(text_top, ['aligny', 'justifyy', 'textaligny'], 'middle')
    safe_set_first(text_top, ['wordwrap', 'wrapwords'], False)
    for pn, v in zip(('fontcolorr', 'fontcolorg', 'fontcolorb', 'fontcolora'),
                     (1, 1, 1, 1)):
        safe_set(text_top, pn, v)
    safe_set(text_top, 'outputresolution', 'custom')
    safe_expr(text_top, 'resolutionw', "op('/project1').par.Outputwidth")
    safe_expr(text_top, 'resolutionh', "op('/project1').par.Outputheight")

    text_y = proj.create(transformTOP, 'text_overlay_y')  # noqa: F821
    text_y.nodeX, text_y.nodeY = 1120, 780
    connect(text_y, text_top)
    # Texty 0..1 (0 abajo, 1 arriba) -> desplazamiento en pixeles desde el
    # centro. 0.5 (parametro por defecto de la pagina) cae cerca del
    # tercio inferior, que es donde va un nombre sin tapar el visual.
    safe_expr(text_y, 'ty',
              "(0.5 - op('/project1').par.Texty.eval()) "
              "* op('/project1').par.Outputheight.eval() * 0.7")

    # --- fundido: Parametro -> Lag -> CHOP to TOP de 1x1 ---
    fp = proj.create(parameterCHOP, 'text_fade_par')
    fp.nodeX, fp.nodeY = 960, 900
    safe_set_first(fp, ['op', 'ops'], config.PROJECT_PATH)
    safe_set(fp, 'custom', True)
    safe_set(fp, 'builtin', False)
    safe_set_first(fp, ['parameters', 'pars', 'parameter'], 'Textvisible')

    flag = proj.create(lagCHOP, 'text_fade_lag')
    flag.nodeX, flag.nodeY = 1120, 900
    safe_set(flag, 'lag1', config.TEXT_FADE_SECONDS)
    safe_set(flag, 'lag2', config.TEXT_FADE_SECONDS)
    safe_set_first(flag, ['lagmethod', 'method'], 'slew')
    connect(flag, fp)

    fade_tex = proj.create(choptoTOP, 'text_fade_tex')  # noqa: F821
    fade_tex.nodeX, fade_tex.nodeY = 1280, 900
    safe_set_first(fade_tex, ['chop', 'top'], flag.path)
    safe_set_first(fade_tex, ['dataformat', 'format', 'pixelformat'], '32bitfloat')

    # --- composite ---
    src = proj.create(textDAT, 'program_text_src')
    src.nodeX, src.nodeY = 1280, 780
    # Con textura de control (input 3), el halo del texto late con el
    # kick. Sin ella el shader compila igual, con el halo quieto.
    if ctrl_tex is not None and channels:
        src.text = shader.ctrl_header(channels, 3) + _TEXT_FRAG
    else:
        src.text = '#define uKick 0.0\n' + _TEXT_FRAG

    glsl = proj.create(glslTOP, 'program_text')
    glsl.nodeX, glsl.nodeY = 1440, 780
    safe_set_first(glsl, ['pixeldat', 'pixelshader'], src.path)
    connect(glsl, base_top, 0)
    connect(glsl, text_y, 1)
    connect(glsl, fade_tex, 2)
    if ctrl_tex is not None and channels:
        connect(glsl, ctrl_tex, 3)
    safe_set_first(glsl, ['format', 'pixelformat'], 'rgba16float')

    log('OVERLAY DE TEXTO: Text TOP + fundido nativo + composite OK')
    return {'text_top': text_top, 'text_y': text_y, 'fade_tex': fade_tex,
            'text_composite': glsl}


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
    safe_expr(trails_pick, 'index',
              "1 if op('/project1').par.Trails.eval() > 0.005 else 0")

    log('MASTER FX: dos capas + estela (con bypass real por switch) OK')
    return {'blend': blend, 'pick': pick, 'clean': clean,
            'trails': trails, 'trails_fb': fb, 'trails_pick': trails_pick}


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
    safe_expr(lag, 'lag1', "op('/project1').par.Transitionseconds")
    safe_expr(lag, 'lag2', "op('/project1').par.Transitionseconds")
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
    if ctrl_tex is not None and channels:
        fx = _build_master_fx(proj, sw_a, sw_b, cross, ctrl_tex, channels)
        clean = fx['clean']
        post = fx['trails_pick']
    else:
        fx = {}
        clean = proj.create(nullTOP, 'program_clean')
        clean.nodeX, clean.nodeY = 1160, 280
        connect(clean, cross)
        post = clean

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
                 text_fx['text_y'], text_fx['text_composite']]
    res_nodes += [fx[k] for k in ('blend', 'pick', 'trails', 'trails_fb',
                                  'trails_pick') if k in fx]
    for t in res_nodes:
        safe_set(t, 'outputresolution', 'custom')
        safe_expr(t, 'resolutionw', "op('/project1').par.Outputwidth")
        safe_expr(t, 'resolutionh', "op('/project1').par.Outputheight")

    # Ventana de salida al proyector. Se crea pero NO se abre sola: abrirla
    # es una accion de show, no de build.
    win = proj.create(windowCOMP, 'show_window')
    win.nodeX, win.nodeY = 1560, -160
    safe_set_first(win, ['op', 'operator', 'winop'], show.path)
    safe_set(win, 'borders', False)
    safe_set_first(win, ['opensize', 'size'], 'fill')
    safe_set(win, 'monitor', 1)
    safe_set(win, 'cursorvisible', False)

    _build_outputs(proj, show)

    log('PROGRAM: bus A/B + preview + crossfade nativo + master fade OK')
    out = {'a': sw_a, 'b': sw_b, 'preview': sw_prev, 'cross': cross,
           'clean': clean, 'bloom': bloom, 'master': master, 'show': show,
           'bloom_prefilter': bloom_fx['bloom_prefilter'],
           'window': win}
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

    # Grabacion a disco. El nombre de archivo lo arma control_script en
    # el momento de grabar (con fecha y hora), no una expresion: si fuera
    # una expresion se reevaluaria sola y podria cambiar el archivo a
    # mitad de grabacion.
    try:
        rec = proj.create(moviefileoutTOP, 'recorder')       # noqa: F821
        rec.nodeX, rec.nodeY = 1560, 440
        connect(rec, show)
        safe_expr(rec, 'record', "op('/project1').par.Record")
        made.append('grabacion')
    except Exception as e:
        log('SALIDA: grabacion no disponible ({})'.format(type(e).__name__))

    log('SALIDAS: {}'.format(', '.join(made) if made else 'ninguna disponible'))
