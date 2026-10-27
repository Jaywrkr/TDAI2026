"""ORDEN DE LA RED (fase 42): acomoda los nodos de /project1 en bloques.

Al terminar el build, cada nodo va al bloque de su parte del rig (por el
nombre; si no, por la familia) y dentro del bloque se ordena por el
flujo: de izquierda a derecha en el orden en que pasa la senal (un nodo
queda a la derecha de sus entradas). Cada bloque lleva un recuadro con
titulo (Annotate COMP). Solo mueve nodos: no cambia ninguna conexion ni
ningun parametro. Los nodos de adentro de los COMP (scenes, dashboard...)
no se tocan.
"""
try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass

import re

from .tdutil import safe_set, safe_set_first, log

# (titulo, patron del nombre) -- gana el primero que coincide
GROUPS = [
    ('AUDIO', r'^(a_|audio)'),
    ('MIDI Y PIANO', r'^(midi|key|piano|pad|fx_)'),
    ('TEXTO', r'^(text_|program_text)'),
    ('MOMENTOS', r'^(momento|program_momentos)'),
    ('BRILLO', r'^(bloom|program_bloom)'),
    ('SALIDAS', r'^(show_|ndi|syphon|rec_|record|window|laser)'),
    ('PANEL', r'^(dashboard)'),
    ('ESCENAS', r'^(scenes|media|thumb)'),
    ('CONTROL', r'^(ctrl|par_|det_|xfade_ctrl|capa_|fear_|t_|music|k_clock|kclock|beat|perf)'),
    ('PROGRAMA', r'^(program|prog|sw_|src|black|master|trans|trails|blend|clean|cross|capas|preview|xfade|post)'),
]
# Si el nombre no dice nada, la familia del operador
FAMILY = {'DAT': 'SISTEMA', 'CHOP': 'CONTROL', 'TOP': 'PROGRAMA'}
# Filas de bloques (de arriba hacia abajo), como se lee la senal
ROWS = [['AUDIO', 'MIDI Y PIANO', 'CONTROL'],
        ['ESCENAS', 'PROGRAMA', 'MOMENTOS', 'BRILLO', 'TEXTO', 'SALIDAS'],
        ['PANEL', 'SISTEMA', 'OTROS']]
DX, DY = 190, 130            # separacion entre nodos
GAP_X, GAP_Y = 360, 420      # separacion entre bloques
MAX_ROWS = 14                # una columna de mas de esto se parte en dos


def group_of(o):
    name = o.name
    for title, pat in GROUPS:
        if re.match(pat, name):
            return title
    return FAMILY.get(getattr(o, 'family', ''), 'OTROS')


def _inputs(o):
    try:
        return [i for i in o.inputs if i is not None]
    except Exception:
        return []


def _columns(members):
    """Profundidad de cada nodo en su bloque: 0 si no tiene entradas del
    mismo bloque, si no 1 + la mayor de sus entradas."""
    ids = {m.id for m in members}
    depth = {}

    def d(o, stack=()):
        if o.id in depth:
            return depth[o.id]
        if o.id in stack:            # ciclo (feedback): cortar
            return 0
        ins = [i for i in _inputs(o) if i.id in ids]
        v = 0 if not ins else 1 + max(d(i, stack + (o.id,)) for i in ins)
        depth[o.id] = v
        return v
    cols = {}
    for m in members:
        cols.setdefault(d(m), []).append(m)
    out = []
    for k in sorted(cols):
        col = sorted(cols[k], key=lambda o: (-float(getattr(o, 'nodeY', 0)), o.name))
        for j in range(0, len(col), MAX_ROWS):
            out.append(col[j:j + MAX_ROWS])
    return out


def _note(proj, title, x, y, w, h):
    try:
        n = proj.create(annotateCOMP, 'nota_' + re.sub(r'\W+', '_', title.lower()))  # noqa: F821
    except Exception:
        return None
    n.nodeX, n.nodeY = x, y
    try:
        n.nodeWidth, n.nodeHeight = w, h
    except Exception:
        pass
    safe_set_first(n, ['titletext', 'Titletext', 'title'], title)
    safe_set_first(n, ['bodytext', 'Bodytext', 'text'], '')
    return n


def tidy(proj):
    nodes = [o for o in proj.children
             if not o.name.startswith('nota_')
             and getattr(o, 'type', '') not in ('annotate', 'annotateCOMP')]
    groups = {}
    for o in nodes:
        groups.setdefault(group_of(o), []).append(o)
    y0 = 0
    placed = 0
    for row in ROWS:
        x0 = 0
        row_h = 0
        for title in row:
            members = groups.get(title)
            if not members:
                continue
            cols = _columns(members)
            for ci, col in enumerate(cols):
                for ri, o in enumerate(col):
                    o.nodeX = x0 + ci * DX
                    o.nodeY = y0 - ri * DY
                    placed += 1
            w = len(cols) * DX
            h = max(len(c) for c in cols) * DY
            _note(proj, '{}  ({})'.format(title, len(members)), x0 - 60, y0 - h + 20, w + 80, h + 120)
            x0 += w + GAP_X
            row_h = max(row_h, h)
        y0 -= row_h + GAP_Y
    log('ORDEN: {} nodos en {} bloques'.format(placed, len(groups)))
    return placed
