#!/usr/bin/env python3
"""Hoja de las CAPAS encima de las escenas y del MIEDO (program_capas)
fuera de TD.

Renderiza escenas del set con render_scenes.py y les pasa por encima el
MISMO GLSL de program.py (_CAPAS_FRAG): una fila por capa (y dos de
Miedo), una columna por escena.

    python3 td/tools/render_capas.py salida.png --set halloween
    python3 td/tools/render_capas.py salida.png --set halloween --scenes 0,16,22
    python3 td/tools/render_capas.py salida.png --set halloween --t 12 --audio golpe

--check verifica que con capa y miedo en 0 el pase devuelve la escena
EXACTA (el switch capas_pick suelta ahi y no tiene que haber salto).
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


def capas(ctx, img, values):
    """Aplica _CAPAS_FRAG a 'img' (H x W x 3, 0..1) con la textura de
    control 'values' (dict canal -> valor)."""
    src = ('#version 330\nuniform sampler2D sTD2DInputs[2];\n'
           'in vec3 vUV;\nvec4 TDOutputSwizzle(vec4 c) { return c; }\n'
           + shader.ctrl_header(config.CTRL_CHANNELS, 1) + program._CAPAS_FRAG)
    prog = ctx.program(vertex_shader=R._VERT, fragment_shader=src)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    v = {c: 0.0 for c in config.CTRL_CHANNELS}
    v.update(resw=float(R.W), resh=float(R.H))
    v.update(values)
    vals = np.array([v[c] for c in config.CTRL_CHANNELS], 'f4')
    tex = ctx.texture((R.W, R.H), 3, np.ascontiguousarray(img[::-1]).astype('f4').tobytes(), dtype='f4')
    tex.build_mipmaps()
    tex.filter = (ctx.LINEAR_MIPMAP_LINEAR, ctx.LINEAR)
    ctrl = ctx.texture((1, len(vals)), 1, vals.tobytes(), dtype='f4')
    ctrl.filter = (ctx.NEAREST, ctx.NEAREST)
    tex.use(0)
    ctrl.use(1)
    try:
        prog['sTD2DInputs'].value = [0, 1][:prog['sTD2DInputs'].array_length]
    except Exception:
        pass
    fbo = ctx.simple_framebuffer((R.W, R.H), components=4, dtype='f4')
    fbo.use()
    vao.render(mode=ctx.TRIANGLE_STRIP)
    out = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(R.H, R.W, 4)[::-1, :, :3]
    for o in (vao, vbo, prog, fbo, tex, ctrl):
        o.release()
    return np.clip(out, 0, 1)


def audio_values(audio, t):
    level, bass, mid, high, kick, beat, groove, music = R.AUDIO[audio]
    return dict(rtime=t, time=t, kclock=t, level=level, bass=bass, mid=mid,
                high=high, kick=kick, beat=beat, groove=groove, music=music)


ROWS = [('{} {}'.format(i + 1, n), {'capa': float(i + 1), 'capaon': 1.0})
        for i, n in enumerate(config.CAPAS)] + [
    ('Miedo 0.5', {'fear': 0.5}),
    ('Miedo 1.0', {'fear': 1.0}),
]


def main():
    args = sys.argv[1:]
    opt = {'--scenes': '0,16,22', '--t': '9.0', '--audio': 'musica'}
    for k in opt:
        if k in args:
            opt[k] = args[args.index(k) + 1]
    check_only = '--check' in args
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    media = R.media_image()
    t = float(opt['--t'])
    scenes = [int(x) for x in opt['--scenes'].split(',')]
    base = []
    for idx in scenes:
        vals = R.ctrl_values(t, opt['--audio'], 0.4)
        img, _ = R.render(ctx, idx, vals, media, '#define HK_STILL 1\n')
        base.append(img.astype('f4'))

    # en 0 el pase no toca nada (el switch suelta sin salto)
    worst = 0.0
    for img in base:
        got = capas(ctx, img, audio_values(opt['--audio'], t))
        worst = max(worst, float(np.abs(got - np.clip(img, 0, 1)).max()))
    print('capa y miedo en 0 = escena exacta: {} (dif max {:.5f})'.format(
        'OK' if worst < 2e-3 else '!!', worst))
    if check_only:
        return 0 if worst < 2e-3 else 1

    out = args[0]
    tw, th = 400, int(400 * R.H / R.W)
    sheet = Image.new('RGB', ((len(scenes) + 0) * tw, (len(ROWS) + 1) * (th + 16)), (10, 10, 10))
    d = ImageDraw.Draw(sheet)
    rows = [('sin capa', {})] + ROWS
    for r, (label, extra) in enumerate(rows):
        for c, img in enumerate(base):
            v = audio_values(opt['--audio'], t)
            v.update(night=0.5)
            v.update(extra)
            im = capas(ctx, img, v) if extra else np.clip(img, 0, 1)
            pil = Image.fromarray((im * 255).astype('uint8')).resize((tw, th))
            sheet.paste(pil, (c * tw, r * (th + 16)))
            d.text((c * tw + 4, r * (th + 16) + th + 2),
                   '{}  -  escena {:02d}'.format(label, scenes[c]), fill=(220, 220, 220))
    sheet.save(out)
    print('->', out)
    return 0 if worst < 2e-3 else 1


if __name__ == '__main__':
    sys.exit(main())
