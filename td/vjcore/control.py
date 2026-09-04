"""CHOP de control unificado: /project1/ctrl

Esta es LA fuente de verdad de todos los visuales.

    Parameter CHOP (params custom de /project1)  -.
    audio_ctrl (audio reactivo)                  -+-> merge -> select (orden) -> ctrl -> ctrl_tex
    Speed CHOPs (time / rtime)                   -'

Ni una sola expresion de Python se evalua por frame en esta cadena:
el Parameter CHOP lee los parametros de forma nativa.

ctrl_tex es un CHOP to TOP de 1 x N pixeles en float32. Es lo que cada
GLSL TOP recibe como input 0.
"""

from . import config
from .tdutil import safe_set, safe_set_first, safe_expr, connect, log, chan_names


def build(proj, audio_chop):
    # --- parametros custom -> canales ---
    par_chop = proj.create(parameterCHOP, 'par_ctrl')
    par_chop.nodeX, par_chop.nodeY = -1400, 200
    safe_set_first(par_chop, ['op', 'ops'], config.PROJECT_PATH)
    safe_set(par_chop, 'custom', True)
    safe_set(par_chop, 'builtin', False)
    safe_set_first(
        par_chop, ['parameters', 'pars', 'parameter'],
        ' '.join(p for p, _ in config.PAR_CHANNELS))
    safe_set(par_chop, 'renameto', '*')

    par_ren = proj.create(renameCHOP, 'par_ctrl_named')
    par_ren.nodeX, par_ren.nodeY = -1240, 200
    safe_set(par_ren, 'renamefrom', ' '.join(p for p, _ in config.PAR_CHANNELS))
    safe_set(par_ren, 'renameto', ' '.join(c for _, c in config.PAR_CHANNELS))
    connect(par_ren, par_chop)

    # --- tiempo ---
    # 'time' avanza ya escalado por Speed. Se integra, asi que mover Speed
    # NO produce saltos de fase en los visuales (problema clasico de usar
    # absTime.seconds * Speed directamente).
    t_scaled = proj.create(speedCHOP, 'time_scaled')
    t_scaled.nodeX, t_scaled.nodeY = -1400, 60
    safe_expr(t_scaled, 'speed',
              "0.15 + op('/project1').par.Speed.eval() * 1.85")
    t_scaled_n = proj.create(renameCHOP, 'time_scaled_named')
    t_scaled_n.nodeX, t_scaled_n.nodeY = -1240, 60
    safe_set(t_scaled_n, 'renamefrom', '*')
    safe_set(t_scaled_n, 'renameto', 'time')
    connect(t_scaled_n, t_scaled)

    t_real = proj.create(speedCHOP, 'time_real')
    t_real.nodeX, t_real.nodeY = -1400, -60
    safe_set(t_real, 'speed', 1.0)
    t_real_n = proj.create(renameCHOP, 'time_real_named')
    t_real_n.nodeX, t_real_n.nodeY = -1240, -60
    safe_set(t_real_n, 'renamefrom', '*')
    safe_set(t_real_n, 'renameto', 'rtime')
    connect(t_real_n, t_real)

    # --- merge ---
    merge = proj.create(mergeCHOP, 'ctrl_merge')
    merge.nodeX, merge.nodeY = -1040, 120
    srcs = [par_ren, t_scaled_n, t_real_n]
    if audio_chop is not None:
        srcs.insert(1, audio_chop)
    for i, s in enumerate(srcs):
        connect(merge, s, i)

    # --- orden canonico ---
    # El Select CHOP fija el orden. Aun asi el header GLSL se genera leyendo
    # el orden REAL de /project1/ctrl, asi que un canal ausente nunca
    # desplaza a los demas silenciosamente.
    sel = proj.create(selectCHOP, 'ctrl_order')
    sel.nodeX, sel.nodeY = -880, 120
    safe_set_first(sel, ['channames', 'chan', 'channels'],
                   ' '.join(config.CTRL_CHANNELS))
    connect(sel, merge)

    ctrl = proj.create(nullCHOP, 'ctrl')
    ctrl.nodeX, ctrl.nodeY = -720, 120
    safe_set(ctrl, 'cooktype', 'selective')
    connect(ctrl, sel)

    # --- textura de control para los shaders ---
    tex = proj.create(choptoTOP, 'ctrl_tex')
    tex.nodeX, tex.nodeY = -560, 120
    safe_set_first(tex, ['chop', 'top'], ctrl.path)
    safe_set_first(tex, ['dataformat', 'format', 'pixelformat'], '32bitfloat')
    log('CTRL: cadena de control construida')
    return ctrl, tex


def resolve_channels(proj):
    """Orden REAL de canales en /project1/ctrl. Si el CHOP aun no coocina,
    cae al orden canonico de config."""
    ctrl = proj.op('ctrl')
    names = chan_names(ctrl) if ctrl else []
    if not names:
        log('AVISO: /project1/ctrl sin canales todavia, uso orden canonico')
        return list(config.CTRL_CHANNELS)
    missing = [c for c in config.CTRL_CHANNELS if c not in names]
    if missing:
        log('AVISO: canales de control ausentes: {}'.format(missing))
    return names
