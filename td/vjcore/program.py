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
from .tdutil import safe_set, safe_set_first, safe_expr, connect, log


# ---------------------------------------------------------------
# BLOOM - post-proceso de UNA sola pasada GLSL sobre la salida final
# ---------------------------------------------------------------
# Extrae brillos por encima de un umbral y los difumina con un anillo de
# muestras (16 + centro): una aproximacion barata de un blur ancho en una
# sola pasada, sin downsample/upsample. Se suma sobre la imagen original.
#
# A proposito UN SOLO GLSL TOP, no una cadena de Blur TOP + Level TOP +
# Composite TOP: esa es exactamente la arquitectura que este rig evita
# (ver la nota al principio de scenes.py) -- ademas los nombres de
# parametro de Blur/Level TOP varian entre builds de TD y no se pueden
# verificar sin la app abierta, mientras que este shader se valida solo
# con glslangValidator, igual que las 20 escenas.
#
# Umbral/cantidad/radio quedan fijos (no son perillas en vivo) -- es un
# acabado esteticto del programa completo, no un parametro de performance
# que el VJ necesite tocar escena por escena.
_BLOOM_FRAG = """
out vec4 fragColor;

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    const float TAU = 6.2831853072;
    // Bajado el umbral (0.55->0.35) y subidos amount/radio (0.55->1.1,
    // 3.0->4.0): a pedido del usuario, el glow tiene que notarse SIEMPRE
    // por defecto en las 20 escenas, no solo en las partes casi quemadas.
    const float THRESH = 0.35;
    const float AMOUNT = 1.1;
    const float RADIUS = 4.0;

    vec2 uv = vUV.st;
    vec2 texel = uTD2DInfos[0].res.zw;

    vec3 base = texture(sTD2DInputs[0], uv).rgb;

    vec3 glow = vec3(0.0);
    float wsum = 0.0;

    // Anillo interno (8 muestras a RADIUS) + anillo externo (8 muestras a
    // 2*RADIUS).
    for (int i = 0; i < 16; i++) {
        float ring = (i < 8) ? 1.0 : 2.0;
        int idx = (i < 8) ? i : i - 8;
        float ang = (float(idx) / 8.0) * TAU;
        vec2 off = vec2(cos(ang), sin(ang)) * texel * RADIUS * ring;
        vec3 s = texture(sTD2DInputs[0], uv + off).rgb;
        float bright = max(luminance(s) - THRESH, 0.0);
        float w = 1.0 / ring;
        glow += s * bright * w;
        wsum += w;
    }
    glow /= max(wsum, 1e-5);

    vec3 col = base + glow * AMOUNT;
    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
"""


def _build_bloom(proj, src_top):
    src = proj.create(textDAT, 'bloom_src')
    src.nodeX, src.nodeY = 1160, 160
    src.text = _BLOOM_FRAG

    glsl = proj.create(glslTOP, 'program_bloom')
    glsl.nodeX, glsl.nodeY = 1160, 380
    safe_set_first(glsl, ['pixeldat', 'pixelshader'], src.path)
    connect(glsl, src_top, 0)
    safe_set_first(glsl, ['format', 'pixelformat'], 'rgba16float')
    log('BLOOM: post-proceso de una pasada OK')
    return glsl


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

    bloom = _build_bloom(proj, post)

    # --- master fade / blackout (solo en SHOW OUT) ---
    black = proj.create(constantTOP, 'black')
    black.nodeX, black.nodeY = 960, 60
    for p, v in (('colorr', 0), ('colorg', 0), ('colorb', 0), ('alpha', 1)):
        safe_set(black, p, v)

    master = proj.create(crossTOP, 'master_fade')
    master.nodeX, master.nodeY = 1160, 60
    connect(master, black, 0)
    connect(master, bloom, 1)
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
    res_nodes = [black, cross, clean, bloom, master, show]
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

    log('PROGRAM: bus A/B + crossfade nativo + master fade OK')
    out = {'a': sw_a, 'b': sw_b, 'cross': cross, 'clean': clean,
           'bloom': bloom, 'master': master, 'show': show, 'window': win}
    out.update(fx)
    return out
