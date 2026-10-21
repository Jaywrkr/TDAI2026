"""Junta las laminas de cada escena en a lo sumo 2 texturas (atlasN.png +
atlas.json).

Por que: en la MacBook del usuario (TD sobre Metal) un GLSL TOP con mas de
3 texturas de entrada no compila -- "The GLSL Shader has compile errors" en
todas las escenas con 4 o mas inputs (ctrl + laminas). Con el atlas cada
escena usa a lo sumo 3: control + 2 atlas, o control + media + 1 atlas.

La licencia limita cada textura a 1280 x 1280: si las laminas de una
escena no entran enteras, se achican todas por el mismo factor (el mayor
que entra; la salida renderiza a 960 x 384, asi que casi nunca se nota).

Cada lamina va en su rectangulo con un margen PAD: el margen repite la
propia lamina (las que el .frag lee con plateNWrap) o estira su borde (las
demas), asi el bilineal y los mips hasta PLATE_MAXLOD (shader.py) no
mezclan laminas vecinas.

uso: python3 td/tools/build_atlas.py [--set halloween]
Correrlo cada vez que se vuelve a hornear una lamina (bake_plates_*.py).
"""
import glob
import json
import math
import os
import re
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

SIDE = 1280       # tope de la licencia por lado
PAD = 16          # margen en px (mip 3 -> 2 texeles limpios)


def _skyline(sizes, n_bins):
    """Empaqueta rectangulos (w, h) en n_bins cuadrados de SIDE: skyline,
    abajo a la izquierda, de mas alto a mas bajo. {i: (bin, x, y)} o None.
    (x, y) es la esquina de arriba a la izquierda del contenido, en px."""
    order = sorted(range(len(sizes)), key=lambda i: (-sizes[i][1], -sizes[i][0]))
    bins = [[(0, 0, SIDE)] for _ in range(n_bins)]   # segmentos (x, y, ancho)
    out = {}
    for i in order:
        w, h = sizes[i][0] + 2 * PAD, sizes[i][1] + 2 * PAD
        best = None
        for b, sky in enumerate(bins):
            for s in range(len(sky)):
                x = sky[s][0]
                if x + w > SIDE:
                    break
                # altura donde apoya: el maximo de los segmentos que cubre
                y, need, k = 0, w, s
                while need > 0:
                    y = max(y, sky[k][1])
                    need -= sky[k][2]
                    k += 1
                if y + h <= SIDE and (best is None or (y + h, b, x) < best[0]):
                    best = ((y + h, b, x), b, x, y)
        if best is None:
            return None
        _, b, x, y = best
        out[i] = (b, x + PAD, y + PAD)
        sky = bins[b]
        new = []
        for (sx, sy, sw) in sky:
            # recorta los segmentos tapados por el nuevo rectangulo
            if sx + sw <= x or sx >= x + w:
                new.append((sx, sy, sw))
                continue
            if sx < x:
                new.append((sx, sy, x - sx))
            if sx + sw > x + w:
                new.append((x + w, sy, sx + sw - x - w))
        new.append((x, y + h, w))
        new.sort()
        merged = []
        for seg in new:
            if merged and merged[-1][1] == seg[1] and merged[-1][0] + merged[-1][2] == seg[0]:
                merged[-1] = (merged[-1][0], seg[1], merged[-1][2] + seg[2])
            else:
                merged.append(seg)
        bins[b] = merged
    return out


def _wrapped(frag_text, k):
    return 'plate{}Wrap'.format(k) in frag_text


def build_scene(folder, frag_text, n_bins):
    files = sorted(f for f in os.listdir(folder) if f.lower().endswith('.png')
                   and not f.startswith('atlas'))
    if not files:
        return None
    ims = [Image.open(os.path.join(folder, f)).convert('RGBA') for f in files]
    # escala por lamina: primero lo justo para que cada una quepa sola en
    # 1280 con su margen; despues, mientras no entren todas, se achica un 3 %
    # la que ocupa mas (las chicas quedan intactas)
    scales = [min(1.0, (SIDE - 2 * PAD) / float(max(im.size))) for im in ims]
    while True:
        sizes = [(max(1, int(round(im.size[0] * sc))), max(1, int(round(im.size[1] * sc))))
                 for im, sc in zip(ims, scales)]
        pos = _skyline(sizes, n_bins)
        if pos is not None:
            break
        k = max(range(len(ims)), key=lambda j: sizes[j][0] * sizes[j][1])
        scales[k] *= 0.97
        if scales[k] < 0.3:
            raise RuntimeError('{}: no entra ni al 30 %'.format(folder))
    used = sorted(set(b for b, _, _ in pos.values()))
    # alto real de cada atlas (recortado al contenido, multiplo de 16)
    heights = {b: min(SIDE, int(math.ceil(max(pos[i][2] + sizes[i][1] + PAD
                                              for i in pos if pos[i][0] == b) / 16.0) * 16))
               for b in used}
    atlases = {b: np.zeros((heights[b], SIDE, 4), np.uint8) for b in used}
    meta = {'side': SIDE, 'pad': PAD,
            'atlases': ['atlas{}.png'.format(b) for b in used], 'plates': []}
    for k, (im, f) in enumerate(zip(ims, files)):
        w, h = sizes[k]
        src = np.asarray(im if (w, h) == im.size else im.resize((w, h), Image.LANCZOS))
        b, x, y = pos[k]
        wrap = _wrapped(frag_text, k)
        big = np.pad(src, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='wrap' if wrap else 'edge')
        atlases[b][y - PAD:y + h + PAD, x - PAD:x + w + PAD] = big
        W, H = SIDE, heights[b]
        meta['plates'].append({
            'file': f, 'atlas': used.index(b), 'px': [x, y, w, h], 'wrap': wrap,
            # cuanto mas chica quedo la lamina que el original, en mips
            'scale': round(scales[k], 4),
            'lodbias': math.log2(scales[k]),
            # promedio (lo que da el mip mas chico): pasado PLATE_MAXLOD el
            # shader se funde hacia este color en vez de leer el margen
            'mean': [round(float(v), 5) for v in (src.reshape(-1, 4).mean(0) / 255.0)],
            # rectangulo en uv de TD (v = 0 abajo): la fila 0 del PNG es arriba
            'uv': [x / W, 1.0 - (y + h) / H, w / W, h / H]})
    for old in glob.glob(os.path.join(folder, 'atlas*.png')):
        os.remove(old)
    for b in used:
        Image.fromarray(atlases[b], 'RGBA').save(
            os.path.join(folder, 'atlas{}.png'.format(used.index(b))), optimize=True)
    with open(os.path.join(folder, 'atlas.json'), 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, indent=1)
    return len(used), ' '.join('{:.2f}'.format(sc) for sc in scales), len(files)


def main():
    set_name = 'halloween'
    if '--set' in sys.argv:
        set_name = sys.argv[sys.argv.index('--set') + 1]
    os.environ['TDAI_SET'] = set_name
    from vjcore import config
    sdir = os.path.join(TD, 'sets', set_name)
    pdir = os.path.join(sdir, 'plates')
    vdir = os.path.join(sdir, 'visuals')
    frags = {}
    for f in os.listdir(vdir):
        m = re.match(r'scene(\d+)_.*\.frag$', f)
        if m:
            with open(os.path.join(vdir, f), encoding='utf-8') as fh:
                frags[int(m.group(1))] = fh.read()
    for d in sorted(os.listdir(pdir)):
        m = re.match(r'scene(\d+)$', d)
        if not m:
            continue
        i = int(m.group(1))
        # 3 inputs como maximo: ctrl + media (si tiene) + atlas
        n_bins = 3 - config.plate_base(i)
        r = build_scene(os.path.join(pdir, d), frags.get(i, ''), n_bins)
        if r:
            print('{}: {} atlas, escalas {}, {} laminas'.format(d, *r))


if __name__ == '__main__':
    main()
