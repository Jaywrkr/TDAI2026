#!/usr/bin/env python3
"""Cuanto cambia cada escena entre una perilla Detail en 0 y en 1, fuera de TD.

Por escena y por Detail (D1..D6): renderiza con esa perilla en 0 y en 1 (las
otras en 0.5) en varios instantes y mide el cambio medio de color (el canal
que mas cambia, asi cuenta tambien un cambio de tono) y el % de pixeles que
cambian mas de 0.05. Ademas mide el MOVIMIENTO (cuanto cambia la imagen en
0.2 s) con la perilla en 0 y en 1: una perilla de velocidad no cambia la
foto quieta pero si eso. Se marca FLOJA la perilla que no llega a ninguna
de las dos cosas.

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

# (instante, audio): uno con golpe, para las perillas que actuan con el bombo
TIMES = ((9.0, 'musica'), (47.0, 'golpe'), (131.0, 'musica'))
WEAK_MEAN = 0.01
WEAK_AREA = 8.0     # una perilla de ventanas o hiedra cambia poca area y se nota mucho
WEAK_MOVE = 0.5     # el movimiento cambia menos del 50 %
DT = 0.2
STILL = '#define HK_STILL 1\n'


def cdiff(a, b):
    return np.abs(np.clip(a[..., :3], 0, 1) - np.clip(b[..., :3], 0, 1)).max(-1)


def values(t, d, x, audio='musica'):
    v = R.ctrl_values(t, audio, 0.5)
    ch = list(config.CTRL_CHANNELS)
    for k in range(1, 7):
        name = 'd{}'.format(k)
        if name in ch:
            v[ch.index(name)] = x if k == d else 0.5
    if 'moment' in ch:
        v[ch.index('moment')] = -1.0
    # musica con pulso a 128 BPM (las perillas que siguen el tiempo)
    if 'mbeat' in ch:
        v[ch.index('mbeat')] = 60.0 / 128.0
        v[ch.index('manchor')] = 0.0
    return v


def measure(ctx, idx, media, d):
    best = None
    mv = [0.0, 0.0]
    for t, au in TIMES:
        a, _ = R.render(ctx, idx, values(t, d, 0.0, au), media, STILL)
        b, _ = R.render(ctx, idx, values(t, d, 1.0, au), media, STILL)
        diff = cdiff(a, b)
        m, area = float(diff.mean()), float((diff > 0.05).mean() * 100.0)
        a2, _ = R.render(ctx, idx, values(t + DT, d, 0.0, au), media, STILL)
        b2, _ = R.render(ctx, idx, values(t + DT, d, 1.0, au), media, STILL)
        mv[0] += float(cdiff(a, a2).mean())
        mv[1] += float(cdiff(b, b2).mean())
        # la media de los instantes; guardamos el primero para la hoja
        if best is None:
            best = [m, area, a, b, 1]
        else:
            best[0] += m
            best[1] += area
            best[4] += 1
    best[0] /= best[4]
    best[1] /= best[4]
    # cambio relativo del movimiento entre perilla en 0 y en 1
    move = abs(mv[1] - mv[0]) / max(mv[0], mv[1], 1e-4)
    if max(mv) / best[4] < 0.002:
        move = 0.0          # casi quieta en los dos extremos: no cuenta
    return best + [move]


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
    print('esc ' + ''.join('{:>7}'.format('D{}'.format(k)) for k in range(1, 7))
          + '   (% area que cambia de 0 a 1; m = cambia el movimiento; * = FLOJA)')
    weak = []
    pics = []
    for idx in scenes:
        cells = []
        row = []
        for d in range(1, 7):
            m, area, a, b, _, move = measure(ctx, idx, media, d)
            flag = (m < WEAK_MEAN or area < WEAK_AREA) and move < WEAK_MOVE
            if flag:
                weak.append((idx, d))
            cells.append('{:>3.0f}%{}{}'.format(area, 'm' if move >= WEAK_MOVE else ' ',
                                                 '*' if flag else ' '))
            row.append((a, b, m, area, flag))
        pics.append((idx, row))
        print('{:02d}  {}'.format(idx, ' '.join(cells)), flush=True)
    print('\nflojas (*): {} de {}'.format(len(weak), 6 * len(scenes)))
    if sheet:
        tw = int(os.environ.get('MD_TW', '160'))
        th = int(tw * R.H / R.W)
        im = Image.new('RGB', (12 * tw, len(pics) * (th + 12)), (10, 10, 10))
        dr = ImageDraw.Draw(im)
        for r, (idx, row) in enumerate(pics):
            y = r * (th + 12)
            for d, (a, b, m, area, flag) in enumerate(row):  # noqa
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
