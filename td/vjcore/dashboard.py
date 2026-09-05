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

    # El panel de status quedo CORTADO en un build real (foto del usuario):
    # el supuesto de "~16px por linea" era muy optimista -- el interlineado
    # real de un Text TOP a fontsize 12 es mas cerca de 1.6-1.7x el
    # fontsize. Calculado explicito por CANTIDAD DE LINEAS en vez de una
    # reserva de pixeles adivinada, con el peor caso (Learn armado +
    # Autopilot ON a la vez) contemplado.
    STATUS_FONTSIZE = 12
    STATUS_LINE_H = STATUS_FONTSIZE * 1.7
    STATUS_MAX_LINES = 24
    status_h = int(STATUS_MAX_LINES * STATUS_LINE_H) + 16

    BEAT_STRIP_H = 40
    BEAT_GAP = 8
    legend_h = 110
    legend_gap = 10
    dash_h = (max(grid_h, c.PROGRAM_H + BEAT_STRIP_H + BEAT_GAP
                  + legend_h + legend_gap + status_h + legend_gap + 12)
              + c.DASH_MARGIN * 2)

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
    # Franja de BEAT_STRIP_H+BEAT_GAP reservada arriba del monitor (ver
    # dash_h mas arriba) para la luz de beat -- el monitor queda ese tanto
    # mas abajo de lo que estaria pegado al techo del dashboard.
    py = dash_h - c.DASH_MARGIN - c.PROGRAM_H - BEAT_STRIP_H - BEAT_GAP

    mon = dash.create(containerCOMP, 'program_monitor')
    safe_set(mon, 'x', px)
    safe_set(mon, 'y', py)
    safe_set(mon, 'w', c.PROGRAM_W)
    safe_set(mon, 'h', c.PROGRAM_H)
    safe_set(mon, 'top', program_clean.path)
    safe_set(mon, 'topfill', 'fillaspect')
    safe_set(mon, 'enable', False)

    # --- luz de beat: destella con cada golpe detectado (confirmacion
    # visual de que el beat-detection esta afinado, sin tener que mirar
    # el visual para notarlo) ---
    beat_y = dash_h - c.DASH_MARGIN - BEAT_STRIP_H
    build_beat_light(dash, px, beat_y, BEAT_STRIP_H)

    # Columna derecha, de abajo hacia arriba: leyenda de Detail (chica, la
    # escena activa la reescribe en cada cambio), status (el resto). Altura
    # ya reservada arriba en dash_h -- esto solo posiciona.
    status_y = c.DASH_MARGIN + legend_h + legend_gap

    build_status_panel(dash, px, status_y, c.PROGRAM_W, status_h,
                       fontsize=STATUS_FONTSIZE)
    build_detail_legend_panel(dash, px, c.DASH_MARGIN, c.PROGRAM_W, legend_h)

    log('DASHBOARD: {} tiles + monitor + beat light + status + detail legend'.format(len(thumbs)))
    return dash


def _build_text_panel(dash, prefix, x, y, w, h, initial_text,
                      fontsize=14, fontcolor=(0.90, 0.94, 0.90),
                      bgcolor=(0.06, 0.06, 0.07)):
    """Panel de texto multilinea como TOP, no como Text COMP.

    El parametro 'text' de un Text COMP tuvo un problema real: los saltos de
    linea llegaban aplastados en un solo parrafo corrido, sin espacio entre
    lo que eran lineas distintas. Cambiar el parametro de word wrap no lo
    arreglo -- la causa no era esa.

    En vez de seguir adivinando el nombre de parametro correcto en un Text
    COMP (que varia de semantica entre builds de TD), se usa el mismo
    mecanismo que YA funciona en este dashboard: los thumbnails de escena
    son TOPs mostrados dentro de un container via 'top' = path. Un Text DAT
    SIEMPRE preserva saltos de linea tal cual -- y un Text TOP renderiza ese
    contenido como imagen respetando cada linea. Cero ambiguedad.

    Devuelve (src, render, panel). 'src' es el Text DAT que hay que
    actualizar (src.text = '...') para cambiar lo que se ve.
    """
    src = dash.create(textDAT, prefix + '_src')
    src.nodeX, src.nodeY = -200, -200
    src.text = initial_text

    render = dash.create(textTOP, prefix + '_render')
    render.nodeX, render.nodeY = -200, -350
    safe_expr(render, 'text', "op('{}').text".format(src.path))
    safe_set_first(render, ['wordwrap', 'wrapwords'], False)
    safe_set_first(render, ['alignx', 'justifyx', 'textalignx'], 'left')
    safe_set_first(render, ['aligny', 'justifyy', 'textaligny'], 'top')
    safe_set_first(render, ['fontsizex', 'fontsize'], fontsize)
    # 'Consolas' es de Windows y no existe en macOS: TD la sustituye por
    # Helvetica en cada cook y lo registra como warning en system_errors,
    # que tiene un limite de 60 lineas -- eso puede tapar un error real.
    # 'Courier New' es monoespaciada y viene instalada de fabrica en
    # Windows, macOS y la mayoria de Linux.
    safe_set_first(render, ['font', 'fontname'], 'Courier New')
    for p, v in zip(('fontcolorr', 'fontcolorg', 'fontcolorb'), fontcolor):
        safe_set(render, p, v)
    for p, v in zip(('bgcolorr', 'bgcolorg', 'bgcolorb'), bgcolor):
        safe_set(render, p, v)
    safe_set(render, 'outputresolution', 'custom')
    safe_set(render, 'resolutionw', int(w))
    safe_set(render, 'resolutionh', int(h))

    panel = dash.create(containerCOMP, prefix)
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


def build_status_panel(dash, x, y, w, h, fontsize=14):
    return _build_text_panel(dash, 'system_status', x, y, w, h,
                             'SYSTEM INITIALIZING...', fontsize=fontsize)


def build_beat_light(dash, x, y, h):
    """Cuadrado que destella en blanco con cada golpe detectado.

    Usa una EXPRESION nativa de TD sobre bgcolor (leyendo el canal 'beat'
    de /project1/ctrl directo), no un valor que Python empuje por tick --
    asi actualiza cada frame de verdad, con la resolucion temporal real de
    la envolvente de beat, en vez de a la cadencia (mas lenta, pensada
    para lectura humana) del panel de status/valores en vivo.
    """
    box = dash.create(containerCOMP, 'beat_light')
    safe_set(box, 'x', x)
    safe_set(box, 'y', y)
    safe_set(box, 'w', h)
    safe_set(box, 'h', h)
    safe_set(box, 'opacity', 1)
    expr = "max(0.05, min(1.0, op('/project1/ctrl')['beat'][0]))"
    for p in ('bgcolorr', 'bgcolorg', 'bgcolorb'):
        safe_expr(box, p, expr)

    label = dash.create(containerCOMP, 'beat_label')
    safe_set(label, 'x', x + h + 8)
    safe_set(label, 'y', y)
    safe_set(label, 'w', 90)
    safe_set(label, 'h', h)
    for p, v in (('bgcolorr', 0.03), ('bgcolorg', 0.03), ('bgcolorb', 0.035)):
        safe_set(label, p, v)

    txt = label.create(textTOP, 'beat_label_render')
    safe_set(txt, 'text', 'BEAT')
    safe_set_first(txt, ['wordwrap', 'wrapwords'], False)
    safe_set_first(txt, ['alignx', 'justifyx', 'textalignx'], 'left')
    safe_set_first(txt, ['aligny', 'justifyy', 'textaligny'], 'middle')
    safe_set_first(txt, ['fontsizex', 'fontsize'], 16)
    safe_set_first(txt, ['font', 'fontname'], 'Courier New')
    for p, v in zip(('fontcolorr', 'fontcolorg', 'fontcolorb'), (0.75, 0.85, 1.0)):
        safe_set(txt, p, v)
    for p, v in zip(('bgcolorr', 'bgcolorg', 'bgcolorb'), (0.03, 0.03, 0.035)):
        safe_set(txt, p, v)
    safe_set(txt, 'outputresolution', 'custom')
    safe_set(txt, 'resolutionw', 90)
    safe_set(txt, 'resolutionh', int(h))
    safe_set(label, 'top', txt.path)
    safe_set(label, 'topfill', 'fillaspect')
    safe_set(label, 'enable', False)
    return box


def build_detail_legend_panel(dash, x, y, w, h):
    """Que hace cada perilla Detail 1-6 EN LA ESCENA ACTIVA ahora mismo.

    control_script.py actualiza el Text DAT (_src) cada vez que cambia la
    escena activa -- no hay costo por frame, es un evento infrecuente.
    """
    return _build_text_panel(
        dash, 'detail_legend', x, y, w, h,
        '(esta escena no documento perillas Detail)',
        fontsize=13, fontcolor=(0.75, 0.85, 1.0), bgcolor=(0.05, 0.055, 0.08))


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
