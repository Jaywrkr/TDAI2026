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


from . import config
from .tdutil import safe_set, safe_set_first, safe_expr, connect, log


def build(proj, scene_outs):
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

    clean = proj.create(nullTOP, 'program_clean')
    clean.nodeX, clean.nodeY = 1160, 280
    connect(clean, cross)

    # --- master fade / blackout (solo en SHOW OUT) ---
    black = proj.create(constantTOP, 'black')
    black.nodeX, black.nodeY = 960, 60
    for p, v in (('colorr', 0), ('colorg', 0), ('colorb', 0), ('alpha', 1)):
        safe_set(black, p, v)

    master = proj.create(crossTOP, 'master_fade')
    master.nodeX, master.nodeY = 1160, 60
    connect(master, black, 0)
    connect(master, clean, 1)
    safe_expr(master, 'cross',
              "0 if op('/project1').par.Blackout.eval() "
              "else op('/project1').par.Brightness.eval()")

    show = proj.create(nullTOP, 'show_out')
    show.nodeX, show.nodeY = 1360, 60
    connect(show, master)

    # Resolucion global solo donde hace falta declararla.
    for t in (black, cross, clean, master, show):
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
    return {'a': sw_a, 'b': sw_b, 'cross': cross, 'clean': clean,
            'master': master, 'show': show, 'window': win}
