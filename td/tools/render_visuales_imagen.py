#!/usr/bin/env python3
"""Hoja de las escenas VJ de imagen 39-43 (fase 44) fuera de TD, con una
escena del set (mansion y calabazas) como imagen de Media.

    python3 td/tools/render_visuales_imagen.py
"""
import sys
sys.argv=['x','--set','halloween','--size','1000x400']
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE)); sys.path.insert(0, HERE)
import numpy as np, moderngl
from PIL import Image, ImageDraw, ImageFont
import render_scenes as R
from vjcore import config
ctx = moderngl.create_standalone_context(backend='egl', require=330)
ch = list(config.CTRL_CHANNELS)
def vals(t, kick, bass, anchor, extra={}):
    v = R.ctrl_values(t, 'musica', 0.5)
    for n, x in dict(kick=kick, beat=kick, bass=bass, mbeat=0.5, manchor=anchor, audioamt=1.0, music=1.0, **extra).items():
        if n in ch: v[ch.index(n)] = x
    return v
srcs = {}
for s in (26, 13):
    im, _ = R.render(ctx, s, R.ctrl_values(30.0, 'musica', 0.5), R.media_image(), '#define HK_STILL 1\n')
    a = np.ones(im.shape[:2] + (4,), 'f4'); a[..., :3] = np.clip(im[..., :3], 0, 1); srcs[s] = a[::-1].copy()
names = {39: 'CONTORNO NEON', 40: 'PUNTOS DE NEON', 41: 'CALEIDOSCOPIO RITUAL', 42: 'TUNEL DE CUADROS', 43: 'PARED DE TELEVISORES'}
tw, th = 500, 200
sheet = Image.new('RGB', (3 * tw + 230, 5 * (th + 6)), (12, 12, 12)); dr = ImageDraw.Draw(sheet)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
for r, s in enumerate(range(39, 44)):
    for c, (t, k, b, anc, med) in enumerate(((20.0, 0.0, 0.2, 19.85, 26), (20.0, 1.0, 0.9, 19.98, 26), (31.3, 0.5, 0.6, 31.05, 13))):
        im, _ = R.render(ctx, s, vals(t, k, b, anc, dict(d1=0.5, d2=0.5, d3=0.6, d4=0.6, d5=0.0, d6=0.5)), srcs[med], '#define HK_STILL 1\n')
        sheet.paste(Image.fromarray((np.clip(im[..., :3], 0, 1) * 255).astype('uint8')).resize((tw, th)), (230 + c * tw, r * (th + 6)))
    dr.text((10, r * (th + 6) + 80), '{} {}'.format(s, names[s]), font=f, fill=(255, 170, 60))
out = sys.argv_out if False else 'docs/img/visuales_imagen.jpg'
sheet.save(out, quality=88); print('->', out)
