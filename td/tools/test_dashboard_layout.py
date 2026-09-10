#!/usr/bin/env python3
"""Chequea la GEOMETRIA del dashboard sin abrir TouchDesigner.

El layout del dashboard es aritmetica pura (posiciones y tamanos
calculados a partir de config), y es exactamente el tipo de cosa que se
rompe en silencio: un panel que se sale del borde, dos que se pisan, o
un dashboard que no entra en la pantalla. Nada de eso tira error en TD
-- simplemente se ve mal, y te enteras en vivo.

Este test replica los mismos calculos que dashboard.build() y verifica:
  1. que el dashboard entre en 1920x1080,
  2. que ningun panel se salga del dashboard,
  3. que los paneles no se solapen entre si,
  4. que el texto de cada panel entre en el alto que tiene reservado.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

from vjcore import config as c  # noqa: E402

SCREEN_W, SCREEN_H = 1920, 1080


def layout():
    """Mismos numeros que dashboard.build(). Si aquello cambia, esto
    tiene que cambiar igual -- por eso el test compara contra el archivo
    real mas abajo (test_constantes_en_sync)."""
    grid_w = c.GRID_COLS * c.THUMB_W + (c.GRID_COLS - 1) * c.GAP
    grid_h = c.GRID_ROWS * c.THUMB_H + (c.GRID_ROWS - 1) * c.GAP
    dash_w = c.DASH_MARGIN * 2 + grid_w + 24 + c.PROGRAM_W

    STATUS_FONTSIZE, STATUS_MAX_LINES = c.STATUS_FONTSIZE, c.STATUS_MAX_LINES
    status_h = int(STATUS_MAX_LINES * STATUS_FONTSIZE * 1.7) + 16
    BEAT_STRIP_H, BEAT_GAP = 40, 8
    legend_h, legend_gap = c.LEGEND_H, c.LEGEND_GAP
    dash_h = (max(grid_h, c.PROGRAM_H + BEAT_STRIP_H + BEAT_GAP
                  + legend_h + legend_gap + status_h + legend_gap + 12)
              + c.DASH_MARGIN * 2)

    px = c.DASH_MARGIN + grid_w + 24
    py = dash_h - c.DASH_MARGIN - c.PROGRAM_H - BEAT_STRIP_H - BEAT_GAP
    status_y = c.DASH_MARGIN + legend_h + legend_gap

    # El bloque de abajo se DERIVA del hueco libre, igual que en
    # dashboard.py -- no son constantes fijas.
    FX_GAP = 12
    grid_bottom = dash_h - c.DASH_MARGIN - grid_h
    FX_H = grid_bottom - c.DASH_MARGIN - FX_GAP
    PREV_W = 300
    PREV_H = int(PREV_W * 9 / 16)
    BTN_H = 36
    prev_x = c.DASH_MARGIN + grid_w - PREV_W
    prev_y = grid_bottom - FX_GAP - PREV_H
    take_y = prev_y - 8 - BTN_H
    panic_y = take_y - 8 - BTN_H
    fx_y = grid_bottom - FX_GAP - FX_H
    fx_w = grid_w - PREV_W - 16

    panels = [
        # (nombre, x, y, w, h)
        ('grilla', c.DASH_MARGIN, grid_bottom, grid_w, grid_h),
        ('monitor program', px, py, c.PROGRAM_W, c.PROGRAM_H),
        ('status', px, status_y, c.PROGRAM_W, status_h),
        ('leyenda detail', px, c.DASH_MARGIN, c.PROGRAM_W, legend_h),
        ('master fx', c.DASH_MARGIN, fx_y, fx_w, FX_H),
        ('preview', prev_x, prev_y, PREV_W, PREV_H),
        ('boton take', prev_x, take_y, PREV_W, BTN_H),
        ('boton panico', prev_x, panic_y, PREV_W, BTN_H),
    ]
    return dash_w, dash_h, panels, status_h, STATUS_MAX_LINES, FX_H


def overlaps(a, b):
    _, ax, ay, aw, ah = a
    _, bx, by, bw, bh = b
    return not (ax + aw <= bx or bx + bw <= ax or ay + ah <= by or by + bh <= ay)


def main():
    fails = []

    def check(label, cond, detail=''):
        print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                                   ('  -> ' + detail) if detail else ''))
        if not cond:
            fails.append(label)

    dash_w, dash_h, panels, status_h, status_lines, fx_h = layout()

    print('--- tamano del dashboard ---')
    print('  {} x {} px'.format(dash_w, dash_h))
    check('entra a lo ancho en {}'.format(SCREEN_W), dash_w <= SCREEN_W,
          '{} px'.format(dash_w))
    check('entra a lo alto en {}'.format(SCREEN_H), dash_h <= SCREEN_H,
          'sobran {} px'.format(SCREEN_H - dash_h))

    print('\n--- paneles dentro del dashboard ---')
    for name, x, y, w, h in panels:
        inside = (x >= 0 and y >= 0 and x + w <= dash_w and y + h <= dash_h)
        check('{:<16} en ({},{}) {}x{}'.format(name, x, y, w, h), inside)

    print('\n--- paneles sin solaparse ---')
    for i in range(len(panels)):
        for j in range(i + 1, len(panels)):
            a, b = panels[i], panels[j]
            check('{} vs {}'.format(a[0], b[0]), not overlaps(a, b))

    print('\n--- el texto entra en su panel ---')
    # status: 22 lineas a fontsize 12
    check('status: {} lineas caben en {} px'.format(status_lines, status_h),
          status_lines * 12 * 1.7 <= status_h)
    # master fx: el caso mas largo son 11 lineas a fontsize 12
    fx_lines = 11
    check('master fx: {} lineas caben en {} px'.format(fx_lines, fx_h),
          fx_lines * 12 * 1.7 <= fx_h,
          'necesita {:.0f}, hay {}'.format(fx_lines * 12 * 1.7, fx_h))
    # leyenda detail: SIEMPRE puede tener 6 lineas (D1-D6, ver
    # shader.parse_detail_legend) a fontsize 12 -- no es un caso raro,
    # es el caso normal de CUALQUIER escena que documente las 6 perillas.
    legend_lines = 6
    check('leyenda detail: {} lineas caben en {} px'.format(
          legend_lines, c.LEGEND_H),
          legend_lines * 12 * 1.7 <= c.LEGEND_H,
          'necesita {:.0f}, hay {}'.format(legend_lines * 12 * 1.7, c.LEGEND_H))

    print('\n--- el tile deja lugar a la etiqueta ---')
    img_h = c.THUMB_H - 3 * 2 - c.THUMB_LABEL_H
    check('altura de imagen del tile > 0', img_h > 0, '{} px'.format(img_h))
    check('proporcion de imagen razonable (entre 1.2 y 2.6)',
          1.2 <= (c.THUMB_W - 6) / float(img_h) <= 2.6,
          '{:.2f}:1'.format((c.THUMB_W - 6) / float(img_h)))

    print('\n--- constantes en sync con dashboard.py ---')
    src = open(os.path.join(TD, 'vjcore', 'dashboard.py')).read()
    for needle in ('STATUS_MAX_LINES = c.STATUS_MAX_LINES', 'FX_H = avail_h',
                   'PREV_W = 300', 'BTN_H = 36', 'legend_h = c.LEGEND_H',
                   'fontsize=12, fontcolor=(0.75, 0.85, 1.0)'):
        check('dashboard.py contiene "{}"'.format(needle), needle in src)

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
