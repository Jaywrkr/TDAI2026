#!/usr/bin/env python3
"""Dibuja el mapa del MiniLab mkII para el set de Halloween (fase 49).

    python3 td/tools/render_minilab.py                 # docs/img/minilab_halloween.png
    python3 td/tools/render_minilab.py salida.png

Lo que dice cada control sale de la tabla de abajo; si cambia
td/sets/halloween/set.json (midi_redirect), actualizar la tabla y volver a
correr. test_minilab_halloween.py comprueba el mapeo real.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'docs', 'img', 'minilab_halloween.png')

# estilo: 'h' = propio de Halloween (ambar), 'n' = igual que siempre (gris),
# 'x' = sin uso (apagado), 'm' = momento nuevo (ambar con color propio)
KNOBS_TOP = [
    (1, 'sin uso', 'encoder relativo', 'x'),
    (2, 'MIEDO', 'calma → terror', 'h'),
    (3, 'Speed', '', 'n'),
    (4, 'ESTILO', 'aerógrafo', 'h'),
    (5, 'Chaos', '= Locura', 'n'),
    (6, 'Audio', 'cuanto baila', 'n'),
    (7, 'Estela', '', 'n'),
    (8, 'Master', 'brillo general', 'n'),
]
KNOBS_BOT = [
    (9, 'sin uso', 'encoder relativo', 'x'),
    (10, 'DETAIL 1', '', 'h'),
    (11, 'DETAIL 2', '', 'h'),
    (12, 'DETAIL 3', '', 'h'),
    (13, 'DETAIL 4', '', 'h'),
    (14, 'DETAIL 5', '', 'h'),
    (15, 'DETAIL 6', '', 'h'),
    (16, 'NOCHE', 'intensidad', 'h'),
]
PADS_A = [
    (1, 'Siguiente', '', 'n'),
    (2, 'Anterior', '', 'n'),
    (3, 'Blackout', '', 'n'),
    (4, 'Autopilot', '', 'n'),
    (5, 'Texto', 'otro preset', 'n'),
    (6, 'Imagen →', '', 'n'),
    (7, 'NOCHE', 'on / off', 'h'),
    (8, 'Imagen fija', '', 'n'),
]
# colores de los LEDs en reposo (control_script.padLedColors)
YELLOW, GREEN, RED, PURPLE, CYAN = (255, 220, 0), (40, 220, 60), (255, 45, 45), (170, 70, 255), (0, 220, 255)
# (numero, nombre, nota, estilo, color del LED)
PADS_B = [
    (9, 'EASTER EGG', 'JAY infinito', 'h', YELLOW),
    (10, 'LINTERNA', 'prende / apaga', 'm', YELLOW),
    (11, 'OJOS', 'prende / apaga', 'm', GREEN),
    (12, 'Strobe', '', 'n', RED),
    (13, 'SUBIDA', 'otro toque: impacto', 'm', RED),
    (14, 'MURCIÉLAGOS', 'prende / apaga', 'm', PURPLE),
    (15, 'REBOBINAR', 'VHS', 'm', CYAN),
    (16, 'MOMENTO', 'clímax', 'h', PURPLE),
]

BG = (14, 13, 18)
PANEL = (30, 29, 35)
EDGE = (62, 60, 70)
GREY = (150, 148, 158)
DIM = (78, 76, 86)
TEXT = (232, 230, 238)
AMBER = (255, 166, 38)


def font(size, bold=False):
    names = ['LiberationSans-Bold.ttf' if bold else 'LiberationSans-Regular.ttf',
             'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf']
    for d in ('/usr/share/fonts/truetype/liberation', '/usr/share/fonts/truetype/dejavu',
              '/Library/Fonts', '/System/Library/Fonts/Supplemental'):
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def ctext(d, x, y, s, f, fill):
    w = d.textlength(s, font=f)
    d.text((x - w / 2, y), s, font=f, fill=fill)


def color(kind):
    return {'h': AMBER, 'm': AMBER, 'n': GREY, 'x': DIM}[kind]


def knob(d, x, y, num, name, note, kind):
    c = color(kind)
    r = 33
    d.ellipse((x - r, y - r, x + r, y + r), fill=(22, 21, 26), outline=c, width=4)
    if kind != 'x':
        d.line((x + 6, y - 6, x + 19, y - 24), fill=c, width=4)
    ctext(d, x, y - 11, str(num), font(20, True), TEXT if kind != 'x' else DIM)
    ctext(d, x, y + 48, name, font(19, True), c)
    if note:
        ctext(d, x, y + 72, note, font(14), c if kind != 'n' else GREY)


def pad(d, x, y, w, h, num, name, note, kind, led=None):
    c = color(kind)
    d.rounded_rectangle((x, y, x + w, y + h), radius=10, fill=(22, 21, 26), outline=c,
                        width=4 if kind in 'hm' else 3)
    if led:
        d.ellipse((x + w - 22, y + 10, x + w - 10, y + 22), fill=led)
    ctext(d, x + w / 2, y + 12, str(num), font(20, True), TEXT)
    f = font(17, True)
    while d.textlength(name, font=f) > w - 14:
        f = font(f.size - 1, True)
    ctext(d, x + w / 2, y + 42, name, f, c)
    if note:
        ctext(d, x + w / 2, y + 66, note, font(13), c if kind != 'n' else GREY)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    W, H = 1800, 1320
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    d.text((40, 26), 'MiniLab mkII en HALLOWEEN', font=font(46, True), fill=TEXT)
    d.text((40, 86), 'Ámbar = propio de Halloween.  Gris = igual que siempre.  '
           'Apagado = sin uso.  Punto = color del LED (blanco mientras corre el momento).',
           font=font(21), fill=GREY)
    d.rounded_rectangle((30, 135, W - 30, H - 30), radius=26, fill=PANEL, outline=EDGE, width=3)

    # tiras
    d.text((60, 180), 'Tiras', font=font(22, True), fill=TEXT)
    for i, (x, name, n1, n2, kind) in enumerate((
            (100, 'Pitch', 'Zoom de la estela', '(vuelve al centro)', 'n'),
            (250, 'Mod', 'BRILLO (bloom)', 'abajo nada, arriba todo', 'h'))):
        c = color(kind)
        d.rounded_rectangle((x - 30, 225, x + 30, 545), radius=12, fill=(22, 21, 26),
                            outline=c, width=4 if kind == 'h' else 3)
        ctext(d, x, 565, name, font(19, True), c)
        ctext(d, x, 592, n1, font(15, True if kind == 'h' else False), c)
        ctext(d, x, 613, n2, font(13), c if kind == 'h' else GREY)
    ctext(d, 250, 633, 'late con la música', font(13), AMBER)

    # perillas
    x0, dx = 560, 152
    for i, k in enumerate(KNOBS_TOP):
        knob(d, x0 + i * dx, 205, *k)
    for i, k in enumerate(KNOBS_BOT):
        knob(d, x0 + i * dx, 395, *k)
    # nota de las Detail
    d.rounded_rectangle((x0 + dx - 70, 488, x0 + 6 * dx + 70, 530), radius=8,
                        outline=(120, 84, 30), width=2)
    ctext(d, x0 + 3.5 * dx, 498,
          'Cada escena usa las Detail a su manera: en 0 casi no está, en la mitad el look de siempre, '
          'arriba mucho', font(15), AMBER)
    d.text((x0 - 40, 548), 'Perillas 1 y 9 (y sus clics y Shift): sin uso en Halloween, son encoders '
           'relativos.', font=font(17), fill=GREY)

    # pads
    pw, ph, gap = 130, 88, 22
    d.text((x0 - 40, 600), 'Pads banco A  (botón Pad 1-8): el show', font=font(21, True), fill=TEXT)
    for i, p in enumerate(PADS_A):
        pad(d, x0 - 40 + i * (pw + gap), 636, pw, ph, *p)
    d.text((x0 - 40, 752), 'Pads banco B  (botón Pad 9-16): momentos', font=font(21, True),
           fill=TEXT)
    for i, p in enumerate(PADS_B):
        pad(d, x0 - 40 + i * (pw + gap), 788, pw, ph, *p[:4], led=p[4])
    d.text((x0 - 40, 892), 'Un toque prende, el siguiente apaga (no hace falta mantener).  Rebobinar, '
           'easter egg y Momento: cada toque.  Capas: Parameters de /project1.',
           font=font(15), fill=GREY)

    # teclado
    d.text((60, 945), 'Teclado (25 teclas): piano de 6 voces; cada tecla prende su luz en la '
           'escena, del grave (izquierda) al agudo.', font=font(20), fill=GREY)
    kx, ky, kh = 60, 990, 270
    kw = (W - 120) / 15.0
    white = 15
    for i in range(white):
        d.rectangle((kx + i * kw, ky, kx + (i + 1) * kw - 6, ky + kh), fill=(214, 212, 220))
    for i in range(white - 1):
        if i % 7 in (2, 6):
            continue
        bx = kx + (i + 1) * kw - 3 - kw * 0.3
        d.rectangle((bx, ky, bx + kw * 0.6, ky + 165), fill=(26, 25, 30))
    im.save(out)
    print('->', out)


if __name__ == '__main__':
    main()
