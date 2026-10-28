#!/usr/bin/env python3
"""MOMENTOS de los pads (fase 43) fuera de TD: Linterna, Ojos, Subida ->
impacto, Murcielagos y Rebobinar, cada uno en 4 instantes sobre escenas del
set. Usa el mismo GLSL que program.py (_MOMENTOS_FRAG).

    python3 td/tools/render_momentos.py docs/img/momentos.jpg
"""
import sys
OUT = ([a for a in sys.argv[1:] if not a.startswith('--')] or ['momentos.jpg'])[0]
sys.argv = ['x', '--set', 'halloween', '--size', '1000x400']
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE)); sys.path.insert(0, HERE)
import numpy as np, moderngl
from PIL import Image, ImageDraw, ImageFont
import render_scenes as R
from vjcore import program
frag = program._MOMENTOS_FRAG
ctx = moderngl.create_standalone_context(backend='egl', require=330)
media = R.media_image()
pre = '#version 330\nuniform sampler2D sTD2DInputs[2];\nin vec3 vUV;\nvec4 TDOutputSwizzle(vec4 c){return c;}\n'
def run(base, old, d):
    defs = ''.join('#define {} {:.4f}\n'.format(k, v) for k, v in d.items())
    prog = ctx.program(vertex_shader=R._VERT, fragment_shader=pre + defs + frag)
    vbo = ctx.buffer(np.array([-1,-1,1,-1,-1,1,1,1],'f4').tobytes()); vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    texs = []
    for i, im in enumerate((base, old)):
        t = ctx.texture((R.W, R.H), 3, np.ascontiguousarray(np.clip(im[..., :3], 0, 1)[::-1]).astype('f4').tobytes(), dtype='f4'); t.use(i); texs.append(t)
    n = prog['sTD2DInputs'].array_length; prog['sTD2DInputs'].value = [0, 1][:n] if n > 1 else 0
    out = ctx.texture((R.W, R.H), 4, dtype='f2'); f = ctx.framebuffer([out]); f.use(); vao.render(moderngl.TRIANGLE_STRIP)
    r = np.frombuffer(out.read(), 'f2').astype('f4').reshape(R.H, R.W, 4)[::-1, :, :3]
    for o in [prog, vbo, vao, out, f] + texs: o.release()
    return np.clip(r, 0, 1)
T = 50.0
base = {s: R.render(ctx, s, R.ctrl_values(T, 'musica', 0.5), media)[0] for s in (26, 0, 4, 13, 28)}
old = {s: R.render(ctx, s, R.ctrl_values(T - 1.8, 'musica', 0.5), media)[0] for s in (13,)}
Z = dict(uRTime=T, uMbeat=0.5, uKick=0.3, uBass=0.5, uMseed=0.37, uMlin=-1, uMlinoff=-1, uMojos=-1, uMojosoff=-1, uMsub=-1, uMsuboff=-1, uMbat=-1, uMbatoff=-1, uMrew=-1)
rows = [
 ('10 LINTERNA (prende/apaga)', 26, [dict(uMlin=T-0.5), dict(uMlin=T-1.8), dict(uMlin=T-3.3), dict(uMlin=T-4.0, uMlinoff=T-0.05)]),
 ('11 OJOS (prende/apaga)', 0, [dict(uMojos=T-0.4), dict(uMojos=T-1.2), dict(uMojos=T-6.0), dict(uMojos=T-8.15, uMojosoff=T-0.15)]),
 ('13 SUBIDA -> IMPACTO (2 toques)', 4, [dict(uMsub=T-2.0), dict(uMsub=T-6.0), dict(uMsub=T-6.2, uMsuboff=T-0.12), dict(uMsub=T-6.6, uMsuboff=T-0.45)]),
 ('14 MURCIELAGOS (prende/apaga)', 28, [dict(uMbat=T-0.6), dict(uMbat=T-1.4), dict(uMbat=T-2.1), dict(uMbat=T-6.1)]),
 ('15 REBOBINAR VHS', 13, [dict(uMrew=T-0.3), dict(uMrew=T-0.9), dict(uMrew=T-1.4), dict(uMrew=T-1.8)]),
]
tw, th = 400, 160
sheet = Image.new('RGB', (4 * tw + 200, len(rows) * (th + 6)), (12, 12, 12)); dr = ImageDraw.Draw(sheet)
fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
for r, (name, sc, cols) in enumerate(rows):
    for c, extra in enumerate(cols):
        d = dict(Z); d.update(extra)
        im = run(base[sc], old.get(sc, base[sc]), d)
        sheet.paste(Image.fromarray((im * 255).astype('uint8')).resize((tw, th)), (200 + c * tw, r * (th + 6)))
    dr.text((8, r * (th + 6) + 60), name, font=fnt, fill=(255, 170, 60))
sheet.save(OUT, quality=88); print('->', OUT)
