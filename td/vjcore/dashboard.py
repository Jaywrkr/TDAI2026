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
from .tdutil import safe_set, safe_set_first, safe_expr, log

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

    status_h = max(120, py - c.DASH_MARGIN - 12)
    build_status_panel(dash, px, c.DASH_MARGIN, c.PROGRAM_W, status_h)

    log('DASHBOARD: {} tiles + monitor + status'.format(len(thumbs)))
    return dash


def build_status_panel(dash, x, y, w, h):
    """Panel de diagnostico como TOP, no como Text COMP.

    El parametro 'text' de un Text COMP tuvo un problema real: los saltos de
    linea que genera diagnostics.py llegaban aplastados en un solo parrafo
    corrido, sin espacio entre lo que eran lineas distintas. Cambiar el
    parametro de word wrap no lo arreglo -- la causa no era esa.

    En vez de seguir adivinando el nombre de parametro correcto en un Text
    COMP (que varia de semantica entre builds de TD), se usa el mismo
    mecanismo que YA funciona en este dashboard: los thumbnails de escena
    son TOPs mostrados dentro de un container via 'top' = path. Un Text DAT
    SIEMPRE preserva saltos de linea tal cual -- es como ya funcionan
    control_script y diagnostics -- y un Text TOP renderiza ese contenido
    como imagen respetando cada linea. Cero ambiguedad.
    """
    src = dash.create(textDAT, 'system_status_src')
    src.nodeX, src.nodeY = -200, -200
    src.text = 'SYSTEM INITIALIZING...'

    render = dash.create(textTOP, 'system_status_render')
    render.nodeX, render.nodeY = -200, -350
    safe_expr(render, 'text', "op('{}').text".format(src.path))
    safe_set_first(render, ['wordwrap', 'wrapwords'], False)
    safe_set_first(render, ['alignx', 'justifyx', 'textalignx'], 'left')
    safe_set_first(render, ['aligny', 'justifyy', 'textaligny'], 'top')
    safe_set_first(render, ['fontsizex', 'fontsize'], 14)
    # 'Consolas' es de Windows y no existe en macOS: TD la sustituye por
    # Helvetica en cada cook y lo registra como warning en system_errors,
    # que tiene un limite de 60 lineas -- eso puede tapar un error real.
    # 'Courier New' es monoespaciada y viene instalada de fabrica en
    # Windows, macOS y la mayoria de Linux.
    safe_set_first(render, ['font', 'fontname'], 'Courier New')
    for p, v in (('fontcolorr', 0.90), ('fontcolorg', 0.94), ('fontcolorb', 0.90)):
        safe_set(render, p, v)
    for p, v in (('bgcolorr', 0.06), ('bgcolorg', 0.06), ('bgcolorb', 0.07)):
        safe_set(render, p, v)
    safe_set(render, 'outputresolution', 'custom')
    safe_set(render, 'resolutionw', int(w))
    safe_set(render, 'resolutionh', int(h))

    panel = dash.create(containerCOMP, 'system_status')
    safe_set(panel, 'x', x)
    safe_set(panel, 'y', y)
    safe_set(panel, 'w', w)
    safe_set(panel, 'h', h)
    safe_set(panel, 'top', render.path)
    # 'fillaspect' es el mismo modo ya probado en los thumbnails y el
    # monitor de program; el Text TOP se renderiza a la resolucion exacta
    # del panel, asi que no hay reescalado real.
    safe_set(panel, 'topfill', 'fillaspect')
    safe_set(panel, 'enable', False)
    return src, render, panel


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
