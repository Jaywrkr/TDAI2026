#!/usr/bin/env python3
"""Simulador laser FUERA de TouchDesigner y sin hardware.

    pip install numpy pillow
    python3 td/tools/preview_laser.py carpeta_salida/
    python3 td/tools/preview_laser.py carpeta_salida/ --ild   # + .ild de 2 s
    python3 td/tools/preview_laser.py carpeta_salida/ --img escena.png

Renderiza cada patron de vjcore/laserfx.py con el MISMO codigo que usa el
simulador dentro de TD (laser_preview), y escribe un PNG por patron. Con
--img traza en modo AUTO una imagen tuya (ej. una captura de show_out);
sin --img usa una imagen de prueba sintetica. Con --ild ademas graba cada
patron animado como .ild, que se abre en cualquier visor/software laser.
"""
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from vjcore import laserfx  # noqa: E402


def fake_ctrl(t):
    """Canales de control plausibles: un bombo a 120 BPM y algo de medios."""
    beat_ph = (t * 2.0) % 1.0
    kick = math.exp(-beat_ph * 8)
    return {'time': t * 0.8, 'rtime': t, 'speed': 0.5, 'density': 0.5,
            'hue': 0.55, 'chaos': 0.3, 'level': 0.4 + 0.3 * kick,
            'bass': 0.5 * kick, 'mid': 0.3, 'high': 0.2, 'kick': kick,
            'beat': kick}


def test_image(t=0.0, w=96, h=54):
    """Anillo + cuadrado girando, fila 0 = abajo (como TD)."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    x = (xx - w / 2) / (w / 2)
    y = (yy - h / 2) / (w / 2)
    r = np.sqrt(x * x + y * y)
    ring = np.abs(r - 0.45) < 0.06
    c, s = math.cos(t), math.sin(t)
    qx, qy = c * (x - 0.5) - s * y, s * (x - 0.5) + c * y
    square = (np.abs(qx) < 0.18) & (np.abs(qy) < 0.18)
    img = np.zeros((h, w, 4), np.float32)
    img[ring] = (0.2, 0.9, 1.0, 1.0)
    img[square] = (1.0, 0.3, 0.1, 1.0)
    return img


def load_image(path, w=96, h=54):
    im = Image.open(path).convert('RGB').resize((w, h), Image.BILINEAR)
    a = np.asarray(im, np.float32) / 255.0
    a = a[::-1]                                   # fila 0 = abajo
    return np.concatenate([a, np.ones((h, w, 1), np.float32)], axis=2)


def save_png(img, path):
    rgb = (np.clip(img[::-1, :, :3], 0, 1) * 255).astype(np.uint8)
    Image.fromarray(rgb).save(path)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    out = args[0]
    want_ild = '--ild' in args
    img_path = args[args.index('--img') + 1] if '--img' in args else None
    os.makedirs(out, exist_ok=True)
    opts = {'bright': 1.0, 'max_points': 800}

    for pi, name in enumerate(laserfx.PATTERNS):
        frames = []
        n_frames = 60 if want_ild else 1
        for k in range(n_frames):
            t = 1.3 + k / 30.0
            img = load_image(img_path) if img_path else test_image(t)
            strokes = laserfx.pattern_strokes(pi, fake_ctrl(t), img)
            frames.append(laserfx.finalize(strokes, opts))
        st = laserfx.frame_stats(frames[0])
        prev = laserfx.render_preview(frames[0], 512, True,
                                      laserfx.DEFAULT_OPTS['zone'])
        png = os.path.join(out, 'laser_{}.png'.format(name.lower()))
        save_png(prev, png)
        line = '{:<10} {:>4} puntos ({:>4} encendidos) -> {}'.format(
            name, st['points'], st['lit'], png)
        if want_ild:
            ild = os.path.join(out, 'laser_{}.ild'.format(name.lower()))
            laserfx.write_ilda(ild, frames, name[:8])
            line += '  + ' + ild
        print(line)
    return 0


if __name__ == '__main__':
    sys.exit(main())
