#!/usr/bin/env python3
"""TEXTO CON PRESETS (fase 41) fuera de TD: hoja con los 10 presets,
3 variantes (Textseed) cada uno, sobre escenas del set. Usa el mismo
GLSL que program.py (_TEXTFX_FRAG) y un atlas de 4 nombres como el de TD.

    python3 td/tools/render_texto.py docs/img/texto_presets.jpg
"""
import sys, math
sys.argv += ['--set', 'halloween', '--size', '1000x400']
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import render_scenes as R
import moderngl
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
NAMES = ['JAY INFINITO', 'DJ LUNA', 'MORTEM', 'CALAVERA B2B']

def atlas(names, rw=2048, rh=256):
    im = Image.new('RGBA', (rw, rh * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i, nm in enumerate(names[:4]):
        f = ImageFont.truetype(FONT, int(rh * 0.72))
        w = d.textlength(nm, font=f)
        if w > rw * 0.96:
            f = ImageFont.truetype(FONT, int(rh * 0.72 * rw * 0.96 / w))
        d.text((rw / 2, rh * i + rh / 2), nm, font=f, fill=(255, 255, 255, 255), anchor='mm')
    return im

ctx = moderngl.create_standalone_context(backend='egl', require=330)
media = R.media_image()
from vjcore import program
frag = program._TEXTFX_FRAG
PRE = '#version 330\nuniform sampler2D sTD2DInputs[2];\nin vec3 vUV;\nvec4 TDOutputSwizzle(vec4 c){return c;}\n'
prog_cache = {}

def textfx(img, at, preset, t, kick, bass, count, size=0.5, seed=0.0):
    defs = ('#define uRTime {:.4f}\n#define uKick {:.3f}\n#define uBass {:.3f}\n#define uTxtn {:.1f}\n'
            '#define uTxtsize {:.3f}\n#define uTxtpre {:.1f}\n#define uTxtseed {:.4f}\n#define uMbeat 0.5\n').format(t, kick, bass, count, size, preset, seed)
    prog = ctx.program(vertex_shader=R._VERT, fragment_shader=PRE + defs + frag)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    b = ctx.texture((R.W, R.H), 3, np.ascontiguousarray(np.clip(img[..., :3], 0, 1)[::-1]).astype('f4').tobytes(), dtype='f4')
    a = ctx.texture(at.size, 4, at.transpose(Image.FLIP_TOP_BOTTOM).tobytes())
    a.build_mipmaps(); a.filter = (ctx.LINEAR_MIPMAP_LINEAR, ctx.LINEAR)
    b.use(0); a.use(1)
    prog['sTD2DInputs'].value = [0, 1]
    out = ctx.texture((R.W, R.H), 4, dtype='f2'); fbo = ctx.framebuffer([out]); fbo.use()
    vao.render(moderngl.TRIANGLE_STRIP)
    data = np.frombuffer(out.read(), 'f2').astype('f4').reshape(R.H, R.W, 4)[::-1, :, :3]
    for o in (prog, vbo, vao, b, a, out, fbo): o.release()
    return np.clip(data, 0, 1)

PRESETS = [
    ('1 CENTRO', 'chico al centro; late con el bombo', 26, 1),
    ('2 FLOTA', 'respira y sube/baja despacio', 0, 1),
    ('3 REBOTE', 'rebota por toda la pantalla, cambia de color', 13, 1),
    ('4 DE LADO', 'cinta que cruza de lado a lado (varios nombres)', 28, 3),
    ('5 BAILA', 'las letras ondulan con el bajo y saltan con el bombo', 33, 1),
    ('6 LLUVIA', 'varios nombres caen por columnas', 9, 4),
    ('7 ORBITA', 'los nombres giran alrededor del centro', 10, 3),
    ('8 GLITCH', 'rebanadas y colores corridos en cada bombo', 19, 1),
    ('9 ECO', 'copias que se abren hacia afuera con cada golpe', 31, 1),
    ('10 LINEUP', 'un nombre por esquina; se prende el del tiempo', 30, 4),
]
FR = [(10.0, 0.2, 0.4, 0.11), (13.25, 0.95, 0.8, 0.53), (17.6, 0.4, 0.6, 0.87)]
tw, th = 500, 200
sheet = Image.new('RGB', (3 * tw + 230, len(PRESETS) * (th + 6)), (12, 12, 12))
dr = ImageDraw.Draw(sheet)
fT = ImageFont.truetype(FONT, 24); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
at = atlas(NAMES)
bgcache = {}
for r, (name, desc, scene, count) in enumerate(PRESETS):
    if scene not in bgcache:
        bgcache[scene], _ = R.render(R_ctx := ctx, scene, R.ctrl_values(30.0, 'musica', 0.5), media)
    for c, (t, k, b, sd) in enumerate(FR):
        im = textfx(bgcache[scene], at, r, t, k, b, count, seed=sd)
        sheet.paste(Image.fromarray((im * 255).astype('uint8')).resize((tw, th)), (230 + c * tw, r * (th + 6)))
    y = r * (th + 6)
    dr.text((10, y + 60), name, font=fT, fill=(255, 170, 60))
    import textwrap
    for k2, line in enumerate(textwrap.wrap(desc, 26)):
        dr.text((10, y + 100 + k2 * 20), line, font=fs, fill=(220, 220, 220))
    dr.text((10, y + 175), '{} nombre{}'.format(count, 's' if count > 1 else ''), font=fs, fill=(140, 140, 140))
OUT = [a for a in sys.argv[1:] if not a.startswith('--') and a not in ('halloween', '1000x400')]
sheet.save(OUT[0] if OUT else 'texto_presets.jpg', quality=88)
print('ok')
