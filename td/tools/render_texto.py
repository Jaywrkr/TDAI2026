#!/usr/bin/env python3
"""TEXTO CON PRESETS (fase 41) fuera de TD: hoja con los presets del
texto, 3 variantes (Textseed) cada uno, sobre escenas del set. Usa el
mismo GLSL que program.py (_TEXTFX_FRAG) y un atlas de 4 nombres + la
fila de signos, armado con la misma cuenta de tamano que los Text TOP.

    python3 td/tools/render_texto.py docs/img/texto_presets.jpg
    python3 td/tools/render_texto.py hoja.jpg --frag otro.glsl     # probar un borrador
"""
import os
import sys
import textwrap

OUT = [a for a in sys.argv[1:] if not a.startswith('--')]
FRAG = sys.argv[sys.argv.index('--frag') + 1] if '--frag' in sys.argv else None
if FRAG in OUT:
    OUT.remove(FRAG)
sys.argv = [sys.argv[0], '--set', 'halloween', '--size', '1000x400']
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import render_scenes as R  # noqa: E402
from vjcore import program  # noqa: E402

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_R = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
NAMES = ['JAY INFINITO', 'DJ LUNA', 'MORTEM', 'CALAVERA B2B']
ROWS = program.TEXT_ROWS


def atlas(names):
    rw, rh = 1280, 160
    im = Image.new('RGBA', (rw, rh * ROWS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rows = [names[i % len(names)] for i in range(4)] + [program.TEXT_SCRAMBLE]
    for i, nm in enumerate(rows):
        # mismo tamano que el Text TOP de program.py (min(106, 1875/len))
        f = ImageFont.truetype(FONT, int(min(106.0, 1875.0 / max(1, len(nm)))))
        d.text((rw / 2, rh * i + rh / 2), nm, font=f, fill=(255, 255, 255, 255), anchor='mm')
    return im


PRESETS = [
    ('1 CENTRO', 'chico al centro; late con el bombo', 26, 1),
    ('2 FLOTA', 'respira, sube/baja y se inclina en profundidad', 0, 1),
    ('3 REBOTE', 'rebota por toda la pantalla, cambia de color', 13, 1),
    ('4 BAILA', 'las letras ondulan con el bajo y saltan con el bombo', 33, 1),
    ('5 LLUVIA', 'nombres que caen a distintas profundidades', 9, 4),
    ('6 ORBITA', 'los nombres giran en un anillo inclinado', 10, 3),
    ('7 GLITCH', 'rebanadas y colores corridos en cada bombo', 19, 1),
    ('8 RECORTADO', 'nombre gigante; la escena se ve solo dentro', 26, 1),
    ('9 GOLPE', 'el nombre golpea en el drop y se va', 4, 1),
    ('10 PATRON', 'filas del nombre en sentidos alternos, a veces cinta', 28, 3),
    ('11 DECODIFICAR', 'signos al azar que se resuelven en el nombre', 31, 1),
    ('12 PROFUNDIDAD', 'copias en 3D: extrusion o tunel', 18, 1),
    ('13 CAMBIO', 'en cada tiempo otro estilo: borde, recorte, invertido...', 1, 1),
]
# (tiempo, segundos desde que se prendio, kick, bajo, semilla)
FR = [(10.0, 0.9, 0.2, 0.4, 0.11), (13.25, 2.4, 0.95, 0.8, 0.53), (17.6, 0.25, 0.4, 0.6, 0.87)]


def main():
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    media = R.media_image()
    frag = open(FRAG).read() if FRAG else program._TEXTFX_FRAG
    pre = ('#version 330\nuniform sampler2D sTD2DInputs[2];\nin vec3 vUV;\n'
           'vec4 TDOutputSwizzle(vec4 c){return c;}\n')
    at = atlas(NAMES)
    tw, th = 500, 200
    sheet = Image.new('RGB', (3 * tw + 230, len(PRESETS) * (th + 6)), (12, 12, 12))
    dr = ImageDraw.Draw(sheet)
    f_t, f_s = ImageFont.truetype(FONT, 22), ImageFont.truetype(FONT_R, 15)
    bg = {}
    for r, (name, desc, scene, count) in enumerate(PRESETS):
        if scene not in bg:
            bg[scene], _ = R.render(ctx, scene, R.ctrl_values(30.0, 'musica', 0.5), media)
        for c, (t, since, k, b, sd) in enumerate(FR):
            defs = ('#define uRTime {:.4f}\n#define uKick {:.3f}\n#define uBass {:.3f}\n'
                    '#define uTxtn {:.1f}\n#define uTxtsize 0.5\n#define uTxtpre {:.1f}\n'
                    '#define uTxtseed {:.4f}\n#define uMbeat 0.5\n#define uTxtt {:.4f}\n'
                    '#define uTxtlen {:.1f}\n#define uMbrk0 0.0\n#define uMbrk1 0.0\n#define uTxtdbg 0.0\n').format(
                        t, k, b, count, r, sd, t - since, len(NAMES[0]))
            prog = ctx.program(vertex_shader=R._VERT, fragment_shader=pre + defs + frag)
            vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
            vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
            img = np.clip(bg[scene][..., :3], 0, 1)
            bt = ctx.texture((R.W, R.H), 3, np.ascontiguousarray(img[::-1]).astype('f4').tobytes(), dtype='f4')
            atx = ctx.texture(at.size, 4, at.transpose(Image.FLIP_TOP_BOTTOM).tobytes())
            atx.build_mipmaps()
            atx.filter = (ctx.LINEAR_MIPMAP_LINEAR, ctx.LINEAR)
            bt.use(0)
            atx.use(1)
            prog['sTD2DInputs'].value = [0, 1]
            out = ctx.texture((R.W, R.H), 4, dtype='f2')
            fbo = ctx.framebuffer([out])
            fbo.use()
            vao.render(moderngl.TRIANGLE_STRIP)
            data = np.frombuffer(out.read(), 'f2').astype('f4').reshape(R.H, R.W, 4)[::-1, :, :3]
            for o in (prog, vbo, vao, bt, atx, out, fbo):
                o.release()
            pil = Image.fromarray((np.clip(data, 0, 1) * 255).astype('uint8')).resize((tw, th))
            sheet.paste(pil, (230 + c * tw, r * (th + 6)))
        y = r * (th + 6)
        dr.text((10, y + 40), name, font=f_t, fill=(255, 170, 60))
        for k2, line in enumerate(textwrap.wrap(desc, 24)):
            dr.text((10, y + 76 + k2 * 19), line, font=f_s, fill=(220, 220, 220))
        dr.text((10, y + 160), '{} nombre{}'.format(count, 's' if count > 1 else ''), font=f_s, fill=(140, 140, 140))
    out = OUT[0] if OUT else 'texto_presets.jpg'
    sheet.save(out, quality=88)
    print('->', out)


if __name__ == '__main__':
    main()
