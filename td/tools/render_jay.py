#!/usr/bin/env python3
"""EASTER EGG "JAY INFINITO" (fase 38) fuera de TD.

Para cada escena fuerza el easter egg con el canal 'secret' (como el pad
9) y:
  - hoja: la escena sin y con el easter egg (a la mitad, y al 80 %), y un
    recorte agrandado de donde aparece
  - --check: que se vea (cambia al menos 0.15 % de la pantalla) y que en
    sus 5 s no pase de 3 destellos por segundo (test_destellos.py)

    python3 td/tools/render_jay.py hoja.png --scenes 0
    python3 td/tools/render_jay.py --check --scenes 0,1,2
"""
import os
import sys

if '--set' not in sys.argv:
    sys.argv += ['--set', 'halloween']
if '--size' not in sys.argv:
    sys.argv += ['--size', '1000x400']          # el formato de la salida de Halloween (2.5:1)
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import render_scenes as R  # noqa: E402
import test_destellos as TD  # noqa: E402
from vjcore import config, shader  # noqa: E402

EGG_LEN = 5.0
T0 = 47.0
MIN_AREA = 0.15     # % de pantalla que tiene que cambiar


def values(t, secret_at):
    v = TD.show_values(t, -1.0)
    ch = list(config.CTRL_CHANNELS)
    v[ch.index('secret')] = secret_at
    # sin golpe fuerte: se mira el easter egg, no el bombo
    for name, val in (('kick', 0.0), ('beat', 0.0), ('bass', 0.4), ('night', 0.4)):
        v[ch.index(name)] = val
    return v


def lum(img):
    return np.clip(img, 0, 1) @ np.array([0.299, 0.587, 0.114], 'f4')


def scene_check(ctx, idx, media, fps=30):
    sc = TD.Scene(ctx, idx, media)
    # si en T0 la escena esta a oscuras por un suceso propio (un apagon), se
    # mira en otro momento: el easter egg se mide sobre la escena encendida
    t = T0
    for cand in (T0, T0 + 13.0, T0 + 43.0):
        if float(lum(sc.frame(values(cand, -1.0))).mean()) > 0.012:
            t = cand
            break
    base = sc.frame(values(t, -1.0))
    mid = sc.frame(values(t, t - EGG_LEN * 0.5))
    late = sc.frame(values(t, t - EGG_LEN * 0.8))
    d = np.maximum(np.abs(lum(mid) - lum(base)), np.abs(lum(late) - lum(base)))
    area = float((d > 0.04).mean() * 100.0)
    series = [[] for _ in range(TD.GRID * TD.GRID)]
    for k in range(int((EGG_LEN + 0.6) * fps)):
        tt = t + k / fps
        for c, val in enumerate(TD.cells(sc.frame(values(tt, t + 0.3)))):
            series[c].append(val)
    fl = max(TD.flashes_per_second(s, fps) for s in series)
    return base, mid, late, d, area, fl


def crop_box(d):
    ys, xs = np.where(d > 0.04)
    if len(xs) == 0:
        return 0, 0, d.shape[1], d.shape[0]
    x0, x1 = np.percentile(xs, 2), np.percentile(xs, 98)
    y0, y1 = np.percentile(ys, 2), np.percentile(ys, 98)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    w = max(x1 - x0, (y1 - y0) * 2.5, 60) * 1.4
    h = w / 2.5
    x0 = int(max(0, min(d.shape[1] - w, cx - w / 2)))
    y0 = int(max(0, min(d.shape[0] - h, cy - h / 2)))
    return x0, y0, int(x0 + w), int(y0 + h)


def main():
    args = [a for a in sys.argv[1:]]
    scenes = [int(x) for x in args[args.index('--scenes') + 1].split(',')] if '--scenes' in args else \
        [i for i in range(config.N_SCENES) if shader.find_visual(i)]
    check = '--check' in args
    out = args[0] if args and not args[0].startswith('--') else None
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    media = R.media_image()
    ok = True
    rows = []
    for idx in scenes:
        base, mid, late, d, area, fl = scene_check(ctx, idx, media)
        good = area >= MIN_AREA and fl <= 3
        ok = ok and good
        print('  [{}] {:02d}  cambia {:.2f} % de la pantalla, {} destellos/s'.format(
            'OK' if good else '!!', idx, area, fl))
        rows.append((idx, base, mid, late, d, area))
    if out:
        tw, th = 400, int(400 * R.H / R.W)
        sheet = Image.new('RGB', (4 * tw, len(rows) * (th + 16)), (10, 10, 10))
        dr = ImageDraw.Draw(sheet)
        for r, (idx, base, mid, late, d, area) in enumerate(rows):
            x0, y0, x1, y1 = crop_box(d)
            zoom = Image.fromarray((np.clip(mid, 0, 1) * 255).astype('uint8')).crop((x0, y0, x1, y1))
            for c, im in enumerate((base, mid, late)):
                sheet.paste(Image.fromarray((np.clip(im, 0, 1) * 255).astype('uint8')).resize((tw, th)),
                            (c * tw, r * (th + 16)))
            sheet.paste(zoom.resize((tw, th)), (3 * tw, r * (th + 16)))
            dr.text((4, r * (th + 16) + th + 2), '{:02d}  sin | easter egg 50 % | 80 % | recorte    ({:.2f} %)'.format(
                idx, area), fill=(220, 220, 220))
        sheet.save(out)
        print('->', out)
    print('RESULTADO:', 'TODO OK' if ok else 'FALLA')
    return 0 if (ok or not check) else 1


if __name__ == '__main__':
    sys.exit(main())
