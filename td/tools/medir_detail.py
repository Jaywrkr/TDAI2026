#!/usr/bin/env python3
"""Cuanto cambia cada escena entre una perilla Detail en 0 y en 1, fuera de TD.

Por escena y por Detail (D1..D6): renderiza con esa perilla en 0 y en 1 (las
otras en 0.5) en varios instantes y mide el cambio de brillo medio y el % de
pixeles que cambian mas de 0.05. Se marca FLOJA la perilla que casi no se nota.

    python3 td/tools/medir_detail.py --set halloween
    python3 td/tools/medir_detail.py --set halloween --scenes 0,5 --sheet hoja.png
    python3 td/tools/medir_detail.py --set halloween --check   # error si hay flojas
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

import render_scenes as R  # noqa: E402  (lee --set y --size)
from vjcore import config  # noqa: E402

TIMES = (9.0, 47.0, 131.0)
WEAK_MEAN = 0.03
WEAK_AREA = 15.0
STILL = '#define HK_STILL 1\n'


def lum(img):
    return np.clip(img[..., :3], 0, 1) @ np.array([0.299, 0.587, 0.114], 'f4')


def values(t, d, x):
    v = R.ctrl_values(t, 'musica', 0.5)
    ch = list(config.CTRL_CHANNELS)
    for k in range(1, 7):
        name = 'd{}'.format(k)
        if name in ch:
            v[ch.index(name)] = x if k == d else 0.5
    if 'moment' in ch:
        v[ch.index('moment')] = -1.0
    return v


def measure(ctx, idx, media, d):
    best = None
    for t in TIMES:
        a, _ = R.render(ctx, idx, values(t, d, 0.0), media, STILL)
        b, _ = R.render(ctx, idx, values(t, d, 1.0), media, STILL)
        diff = np.abs(lum(a) - lum(b))
        m, area = float(diff.mean()), float((diff > 0.05).mean() * 100.0)
        # la media de los instantes; guardamos el primero para la hoja
        if best is None:
            best = [m, area, a, b, 1]
        else:
            best[0] += m
            best[1] += area
            best[4] += 1
    best[0] /= best[4]
    best[1] /= best[4]
    return best


def main():
    args = sys.argv[1:]
    scenes = None
    if '--scenes' in args:
        scenes = [int(x) for x in args[args.index('--scenes') + 1].split(',')]
    sheet = args[args.index('--sheet') + 1] if '--sheet' in args else None
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    media = R.media_image()
    if scenes is None:
        from vjcore import shader
        scenes = [i for i in range(config.N_SCENES) if shader.find_visual(i)]
    print('esc  ' + ''.join('{:>13}'.format('D{}'.format(k)) for k in range(1, 7))
          + '   (cambio medio / % area, 0 -> 1)')
    weak = []
    pics = []
    for idx in scenes:
        cells = []
        row = []
        for d in range(1, 7):
            m, area, a, b, _ = measure(ctx, idx, media, d)
            flag = m < WEAK_MEAN or area < WEAK_AREA
            if flag:
                weak.append((idx, d))
            cells.append('{:>6.3f}/{:>3.0f}%{}'.format(m, area, '*' if flag else ' '))
            row.append((a, b, m, area, flag))
        pics.append((idx, row))
        print('{:02d}   {}'.format(idx, ' '.join(cells)), flush=True)
    print('\nflojas (*): {} de {}'.format(len(weak), 6 * len(scenes)))
    if sheet:
        tw = 160
        th = int(tw * R.H / R.W)
        im = Image.new('RGB', (12 * tw, len(pics) * (th + 12)), (10, 10, 10))
        dr = ImageDraw.Draw(im)
        for r, (idx, row) in enumerate(pics):
            y = r * (th + 12)
            for d, (a, b, m, area, flag) in enumerate(row):
                for c, img in enumerate((a, b)):
                    pil = Image.fromarray((np.clip(img[..., :3], 0, 1) * 255).astype('uint8')).resize((tw, th))
                    im.paste(pil, ((2 * d + c) * tw, y))
                dr.text((2 * d * tw + 2, y + th), '{:02d} D{} 0|1  {:.0f}%{}'.format(
                    idx, d + 1, area, ' FLOJA' if flag else ''),
                    fill=(255, 120, 60) if flag else (220, 220, 220))
        im.save(sheet)
        print('->', sheet)
    if '--check' in args and weak:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
