#!/usr/bin/env python3
"""Cuanto responde cada escena al PIANO, medido fuera de TD.

Renderiza cada escena en el mismo instante sin teclas y con teclas, y mide
cuanto cambia la imagen:
  - acorde: 3 teclas sostenidas (grave, medio y agudo), fuerza 0.8,
    apretadas hace 0.4 s
  - golpe:  una tecla del medio apretada y soltada (hace 0.25 s), fuerza 1

Por escena: cambio medio de brillo (0..1), % de pixeles que cambian mas
de 0.05 y el peor de los tres instantes medidos. Se marcan FLOJA las que
casi no cambian.

    python3 td/tools/medir_teclas.py --set halloween
    python3 td/tools/medir_teclas.py --set halloween --scenes 0,5,9 --sheet hoja.png
    python3 td/tools/medir_teclas.py --set halloween --check     # sale con error si hay flojas
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
# umbrales: con menos que esto, la tecla casi no se ve en pantalla
WEAK_MEAN = 0.012
WEAK_AREA = 4.0


def lum(img):
    return np.clip(img[..., :3], 0, 1) @ np.array([0.299, 0.587, 0.114], 'f4')


def values(t, keys=None):
    """keys: lista de (pos, vel, apretada_hace, soltada_hace o None)."""
    v = R.ctrl_values(t, 'musica', 0.5)
    ch = list(config.CTRL_CHANNELS)

    def put(name, val):
        if name in ch:
            v[ch.index(name)] = val
    put('kclock', t)
    put('moment', -1.0)
    for i in range(6):
        put('k{}on'.format(i), -1.0)
        put('k{}off'.format(i), -1.0)
    if keys:
        for i, (pos, vel, ago, rel) in enumerate(keys):
            put('k{}pos'.format(i), pos)
            put('k{}vel'.format(i), vel)
            put('k{}on'.format(i), t - ago)
            put('k{}off'.format(i), (t - rel) if rel is not None else -1.0)
        # canales viejos del piano (la ultima tecla), por si la escena los usa
        put('keypulse', 0.8)
        put('keypos', keys[-1][0])
        put('keyvel', keys[-1][1])
    return v


CHORD = [(0.15, 0.8, 0.4, None), (0.5, 0.8, 0.4, None), (0.85, 0.8, 0.4, None)]
STRIKE = [(0.5, 1.0, 0.35, 0.25)]


def measure(ctx, idx, media):
    out = []
    for t in TIMES:
        base, _ = R.render(ctx, idx, values(t), media, '#define HK_STILL 1\n')
        lb = lum(base)
        row = {}
        for name, keys in (('acorde', CHORD), ('golpe', STRIKE)):
            img, _ = R.render(ctx, idx, values(t, keys), media, '#define HK_STILL 1\n')
            d = np.abs(lum(img) - lb)
            row[name] = (float(d.mean()), float((d > 0.05).mean() * 100.0), img, base)
        out.append(row)
    return out


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
    print('{:<5}{:>10}{:>9}{:>10}{:>9}   (peor instante de {})'.format(
        'esc', 'acorde', '% area', 'golpe', '% area', len(TIMES)))
    weak = []
    pics = []
    for idx in scenes:
        rows = measure(ctx, idx, media)
        am = min(r['acorde'][0] for r in rows)
        aa = min(r['acorde'][1] for r in rows)
        gm = min(r['golpe'][0] for r in rows)
        ga = min(r['golpe'][1] for r in rows)
        flag = am < WEAK_MEAN or aa < WEAK_AREA
        if flag:
            weak.append(idx)
        print('{:02d}   {:>10.4f}{:>8.1f}%{:>10.4f}{:>8.1f}%   {}'.format(
            idx, am, aa, gm, ga, 'FLOJA' if flag else ''))
        r0 = rows[0]['acorde']
        pics.append((idx, r0[3], r0[2], am, aa, flag))
    print('\nflojas ({}): {}'.format(len(weak), ' '.join('{:02d}'.format(i) for i in weak)))
    if '--check' in args and weak:
        return 1
    if sheet:
        tw, th = 320, int(320 * R.H / R.W)
        im = Image.new('RGB', (3 * tw, len(pics) * (th + 14)), (10, 10, 10))
        d = ImageDraw.Draw(im)
        for r, (idx, base, img, am, aa, flag) in enumerate(pics):
            diff = np.clip(np.abs(lum(img) - lum(base)) * 6.0, 0, 1)
            for c, a in enumerate((base, img, np.stack([diff, diff * 0.6, diff * 0.2], -1))):
                pil = Image.fromarray((np.clip(a[..., :3], 0, 1) * 255).astype('uint8')).resize((tw, th))
                im.paste(pil, (c * tw, r * (th + 14)))
            d.text((4, r * (th + 14) + th), '{:02d}  sin teclas | acorde | diferencia x6   media {:.4f}  area {:.1f}%{}'.format(
                idx, am, aa, '  FLOJA' if flag else ''), fill=(230, 230, 230))
        im.save(sheet)
        print('->', sheet)
    return 0


if __name__ == '__main__':
    sys.exit(main())
