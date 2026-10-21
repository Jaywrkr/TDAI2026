#!/usr/bin/env python3
"""Hoja de las transiciones con tema (program_trans) fuera de TD.

Renderiza dos escenas del set (A sale, B entra) con render_scenes.py y
pasa por el MISMO GLSL de program.py (_TRANS_FRAG) en varios puntos del
cambio, para cada estilo. Una fila por estilo, una columna por avance.

    python3 td/tools/render_transitions.py salida.png --set halloween
    python3 td/tools/render_transitions.py salida.png --set halloween --ab 7,14
    python3 td/tools/render_transitions.py salida.png --check   # solo bordes

--check verifica que en los extremos (avance 0 y 1) cada estilo devuelve
EXACTAMENTE la escena de ese lado: el switch trans_pick suelta ahi y no
tiene que haber salto.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

import render_scenes as R  # noqa: E402  (lee --set y --size)
from vjcore import config, program, shader  # noqa: E402

STEPS = [0.0, 0.2, 0.35, 0.5, 0.65, 0.8, 1.0]


def trans(ctx, a, b, xfade, transfx, kclock=37.0):
    src = ('#version 330\nuniform sampler2D sTD2DInputs[3];\n'
           'in vec3 vUV;\nvec4 TDOutputSwizzle(vec4 c) { return c; }\n'
           + shader.ctrl_header(config.CTRL_CHANNELS, 2) + program._TRANS_FRAG)
    prog = ctx.program(vertex_shader=R._VERT, fragment_shader=src)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    v = {c: 0.0 for c in config.CTRL_CHANNELS}
    v.update(resw=float(R.W), resh=float(R.H), kclock=kclock,
             xfade=xfade, transfx=transfx)
    vals = np.array([v[c] for c in config.CTRL_CHANNELS], 'f4')
    texs = []
    for k, im in enumerate((a, b)):
        t = ctx.texture((R.W, R.H), 3, np.ascontiguousarray(im[::-1]).astype('f4').tobytes(), dtype='f4')
        texs.append((t, k))
    ctrl = ctx.texture((1, len(vals)), 1, vals.tobytes(), dtype='f4')
    ctrl.filter = (ctx.NEAREST, ctx.NEAREST)
    texs.append((ctrl, 2))
    for t, u in texs:
        t.use(u)
    try:
        prog['sTD2DInputs'].value = [0, 1, 2][:prog['sTD2DInputs'].array_length]
    except Exception:
        pass
    fbo = ctx.simple_framebuffer((R.W, R.H), components=4, dtype='f4')
    fbo.use()
    vao.render(mode=ctx.TRIANGLE_STRIP)
    img = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(R.H, R.W, 4)[::-1, :, :3]
    for o in [vao, vbo, prog, fbo] + [t for t, _ in texs]:
        o.release()
    return np.clip(img, 0, 1)


def main():
    args = sys.argv[1:]
    check_only = '--check' in args
    ab = (0, 13)
    if '--ab' in args:
        ab = tuple(int(x) for x in args[args.index('--ab') + 1].split(','))
    out = None if check_only else args[0]
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    media = R.media_image()
    imgs = []
    for idx in ab:
        vals = R.ctrl_values(8.0, 'musica', 0.4)
        img, _ = R.render(ctx, idx, vals, media, '#define HK_STILL 1\n')
        imgs.append(img.astype('f4'))
    a, b = imgs
    styles = [(i, n, l) for i, (n, l, _) in enumerate(config.TRANSITION_STYLES)
              if n not in ('fundido', 'halloween')]
    bad = []
    for i, name, _ in styles:
        for sign in (1.0, -1.0):
            fx = sign * (i + 0.37)
            for x in (0.0, 1.0):
                got = trans(ctx, a, b, x, fx)
                want = a if x == 0.0 else b
                err = float(np.abs(got - np.clip(want, 0, 1)).max())
                if err > 2e-3:
                    bad.append((name, sign, x, err))
    for name, sign, x, err in bad:
        print('  [!!] {} ({}) en xfade={} difiere de la escena: {:.4f}'.format(
            name, 'A->B' if sign > 0 else 'B->A', x, err))
    print('bordes: {}'.format('OK' if not bad else '{} fallas'.format(len(bad))))
    if check_only:
        return 1 if bad else 0

    tw, th = 256, int(256 * R.H / R.W)
    sheet = Image.new('RGB', (len(STEPS) * tw, len(styles) * (th + 16)), (10, 10, 10))
    d = ImageDraw.Draw(sheet)
    for r, (i, name, label) in enumerate(styles):
        for c, q in enumerate(STEPS):
            im = trans(ctx, a, b, q, i + 0.37, kclock=37.0 + q * 2.0)
            pil = Image.fromarray((im * 255).astype('uint8')).resize((tw, th))
            sheet.paste(pil, (c * tw, r * (th + 16)))
            d.text((c * tw + 4, r * (th + 16) + th + 2), '{} {:.2f}'.format(label, q),
                   fill=(220, 220, 220))
    sheet.save(out)
    print('->', out)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
