"""Dashboard clickable.

Se usa containerCOMP en vez de widgetCOMP: los parametros de containerCOMP
(top, topfill, bgcolorr/g/b, x/y/w/h) son estables entre builds de TD,
mientras que widgetCOMP es un componente de la Palette cuyos parametros
custom cambian.

El resaltado (activo / entrando) se hace con un container exterior de color
que asoma 3 px alrededor del thumbnail. Nada de parametros de borde con
nombres inciertos.
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
from .tdutil import safe_set, log

BORDER = 3


def build(proj, thumbs, program_clean):
    c = config
    grid_w = c.GRID_COLS * c.THUMB_W + (c.GRID_COLS - 1) * c.GAP
    grid_h = c.GRID_ROWS * c.THUMB_H + (c.GRID_ROWS - 1) * c.GAP
    dash_w = c.DASH_MARGIN * 2 + grid_w + 24 + c.PROGRAM_W
    dash_h = max(grid_h, c.PROGRAM_H + 210) + c.DASH_MARGIN * 2

    dash = proj.create(containerCOMP, 'dashboard_ui')
    dash.nodeX, dash.nodeY = 700, 900
    safe_set(dash, 'w', dash_w)
    safe_set(dash, 'h', dash_h)
    for p, v in (('bgcolorr', 0.03), ('bgcolorg', 0.03), ('bgcolorb', 0.035)):
        safe_set(dash, p, v)
    safe_set(dash, 'opacity', 1)

    click_tpl = _click_text()

    for i, thumb in enumerate(thumbs):
        col = i % c.GRID_COLS
        row = i // c.GRID_COLS
        x = c.DASH_MARGIN + col * (c.THUMB_W + c.GAP)
        y = dash_h - c.DASH_MARGIN - (row + 1) * c.THUMB_H - row * c.GAP

        frame = dash.create(containerCOMP, 'scene_btn{}'.format(i))
        safe_set(frame, 'x', x)
        safe_set(frame, 'y', y)
        safe_set(frame, 'w', c.THUMB_W)
        safe_set(frame, 'h', c.THUMB_H)
        safe_set(frame, 'cursor', 'pointer')
        for p, v in (('bgcolorr', 0.16), ('bgcolorg', 0.16), ('bgcolorb', 0.18)):
            safe_set(frame, p, v)

        inner = frame.create(containerCOMP, 'thumb')
        safe_set(inner, 'x', BORDER)
        safe_set(inner, 'y', BORDER)
        safe_set(inner, 'w', c.THUMB_W - BORDER * 2)
        safe_set(inner, 'h', c.THUMB_H - BORDER * 2)
        safe_set(inner, 'top', thumb.path)
        safe_set(inner, 'topfill', 'fillaspect')
        safe_set(inner, 'enable', False)

        pe = frame.create(panelexecuteDAT, 'click_select')
        safe_set(pe, 'panels', '..')
        safe_set(pe, 'panelvalue', 'lselect')
        safe_set(pe, 'offtoon', True)
        pe.text = click_tpl.replace('__INDEX__', str(i))

    # --- monitor de program ---
    px = c.DASH_MARGIN + grid_w + 24
    py = dash_h - c.DASH_MARGIN - c.PROGRAM_H

    mon = dash.create(containerCOMP, 'program_monitor')
    safe_set(mon, 'x', px)
    safe_set(mon, 'y', py)
    safe_set(mon, 'w', c.PROGRAM_W)
    safe_set(mon, 'h', c.PROGRAM_H)
    safe_set(mon, 'top', program_clean.path)
    safe_set(mon, 'topfill', 'fillaspect')
    safe_set(mon, 'enable', False)

    status = dash.create(textCOMP, 'system_status')
    safe_set(status, 'x', px)
    safe_set(status, 'y', c.DASH_MARGIN)
    safe_set(status, 'w', c.PROGRAM_W)
    safe_set(status, 'h', max(120, py - c.DASH_MARGIN - 12))
    safe_set(status, 'enable', False)
    safe_set(status, 'text', 'SYSTEM INITIALIZING...')
    safe_set(status, 'textalignx', 'left')
    safe_set(status, 'textaligny', 'top')
    safe_set(status, 'fontsizex', 14)
    safe_set(status, 'font', 'Consolas')
    for p, v in (('bgcolorr', 0.06), ('bgcolorg', 0.06), ('bgcolorb', 0.07)):
        safe_set(status, p, v)

    log('DASHBOARD: {} tiles + monitor + status'.format(len(thumbs)))
    return dash


def _click_text():
    return (
        "def onOffToOn(panelValue):\n"
        "    ctrl = op('/project1/control_script')\n"
        "    if ctrl:\n"
        "        ctrl.module.selectScene(__INDEX__)\n"
        "    return\n\n"
        "def whileOn(panelValue):\n    return\n\n"
        "def onOnToOff(panelValue):\n    return\n\n"
        "def whileOff(panelValue):\n    return\n\n"
        "def onValueChange(panelValue):\n    return\n"
    )
