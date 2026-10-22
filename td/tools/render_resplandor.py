#!/usr/bin/env python3
"""Hoja del RESPLANDOR (bloom del program bus) fuera de TD.

Renderiza escenas del set con render_scenes.py y les pasa por encima el
MISMO GLSL de program.py (_BLOOM_PREFILTER_FRAG + _BLOOM_FRAG, con los
mipmaps del prefiltro): una fila por valor de Resplandor (con y sin
bajo), una columna por escena.

    python3 td/tools/render_resplandor.py salida.png --set halloween
    python3 td/tools/render_resplandor.py salida.png --set halloween --scenes 0,16,22

--check verifica:
  - Resplandor 0: no se suma glow (sale la escena tal cual, con el pump)
  - Resplandor 0.5: el glow de siempre (mas luz que en 0, lo oscuro igual)
  - Resplandor 1: lo oscuro se hunde a negro y el bajo hunde aun mas
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

_PRE = ('#version 330\nuniform sampler2D sTD2DInputs[3];\n'
        'struct TDTexInfo { vec4 res; };\nuniform TDTexInfo uTD2DInfos[3];\n'
        'in vec3 vUV;\nvec4 TDOutputSwizzle(vec4 c) { return c; }\n')


def _pass(ctx, frag, inputs, ctrl_index):
    """Corre 'frag' con 'inputs' (texturas) y la de control en
    'ctrl_index'; devuelve la textura de salida (rgba16f)."""
    src = _PRE + shader.ctrl_header(config.CTRL_CHANNELS, ctrl_index) + frag
    prog = ctx.program(vertex_shader=R._VERT, fragment_shader=src)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    for i, tex in enumerate(inputs):
        tex.use(i)
        name = 'uTD2DInfos[{}].res'.format(i)
        if name in prog:
            w, h = tex.size
            prog[name].value = (1.0 / w, 1.0 / h, float(w), float(h))
    try:
        prog['sTD2DInputs'].value = list(range(3))[:prog['sTD2DInputs'].array_length]
    except Exception:
        pass
    out = ctx.texture((R.W, R.H), 4, dtype='f2')
    fbo = ctx.framebuffer(color_attachments=[out])
    fbo.use()
    vao.render(mode=ctx.TRIANGLE_STRIP)
    for o in (vao, vbo, prog, fbo):
        o.release()
    return out


def bloom(ctx, img, values):
    """img (H x W x 3, 0..1) -> salida de program_bloom con 'values'."""
    v = {c: 0.0 for c in config.CTRL_CHANNELS}
    v.update(resw=float(R.W), resh=float(R.H), glow=0.5)
    v.update(values)
    vals = np.array([v[c] for c in config.CTRL_CHANNELS], 'f4')
    ctrl = ctx.texture((1, len(vals)), 1, vals.tobytes(), dtype='f4')
    ctrl.filter = (ctx.NEAREST, ctx.NEAREST)
    src = ctx.texture((R.W, R.H), 3, np.ascontiguousarray(img[::-1]).astype('f4').tobytes(), dtype='f4')
    # el prefiltro tiene 1 entrada de imagen: la de control va en la 2,
    # igual que en program.py (connect(pre, ctrl_tex, 2))
    dummy = ctx.texture((1, 1), 4, dtype='f4')
    pre = _pass(ctx, program._BLOOM_PREFILTER_FRAG, [src, dummy, ctrl], 2)
    pre.build_mipmaps()
    pre.filter = (ctx.LINEAR_MIPMAP_LINEAR, ctx.LINEAR)
    out = _pass(ctx, program._BLOOM_FRAG, [src, pre, ctrl], 2)
    data = np.frombuffer(out.read(), 'f2').astype('f4').reshape(R.H, R.W, 4)[::-1, :, :3]
    for o in (ctrl, src, dummy, pre, out):
        o.release()
    return np.clip(data, 0, 1)


def audio_values(bass, t):
    return dict(rtime=t, time=t, kclock=t, level=0.5, bass=bass, mid=0.3,
                high=0.2, kick=0.0, beat=0.0, groove=0.0, music=1.0, audioamt=1.0)


ROWS = [('Resplandor 0 (sin brillo)', 0.0, 0.0),
        ('Resplandor 0.5 (normal)', 0.5, 0.0),
        ('Resplandor 0.75', 0.75, 0.0),
        ('Resplandor 1 (solo lo que brilla)', 1.0, 0.0),
        ('Resplandor 1 + bajo a fondo', 1.0, 1.0)]


def lum(im):
    return im @ np.array([0.299, 0.587, 0.114], 'f4')


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
        base.append(np.clip(img.astype('f4'), 0, 1))

    ok = True
    for img in base:
        b = audio_values(0.0, t)
        g0 = bloom(ctx, img, dict(b, glow=0.0))
        g5 = bloom(ctx, img, dict(b, glow=0.5))
        g1 = bloom(ctx, img, dict(b, glow=1.0))
        g1b = bloom(ctx, img, dict(audio_values(1.0, t), glow=1.0))
        dark = lum(img) < 0.06
        low = img.max(axis=2) < 0.78                      # arriba de 0.8 entra el hombro del tonemap
        e0 = float(np.abs(g0 - img)[low].max())
        more = float(g5.mean() - g0.mean())
        sunk = float(lum(g1)[dark].mean()) if dark.any() else 0.0
        mid = (lum(img) > 0.08) & (lum(img) < 0.25)
        sunk_b = float(lum(g1b)[mid].mean()) if mid.any() else 0.0
        sunk_n = float(lum(g1)[mid].mean()) if mid.any() else 0.0
        checks = [('0 = escena sin glow (dif max {:.4f})'.format(e0), e0 < 2e-3),
                  ('0.5 suma glow (+{:.4f} de media)'.format(more), more > 0.0),
                  ('1 hunde lo oscuro (lum media {:.4f})'.format(sunk), sunk < 0.02),
                  ('el bajo hunde los medios ({:.4f} < {:.4f})'.format(sunk_b, sunk_n), sunk_b <= sunk_n + 1e-4)]
        for label, good in checks:
            print('  [{}] {}'.format('OK' if good else '!!', label))
            ok = ok and good
    print('RESULTADO:', 'TODO OK' if ok else 'FALLA')
    if check_only:
        return 0 if ok else 1

    out = args[0]
    tw, th = 400, int(400 * R.H / R.W)
    sheet = Image.new('RGB', (len(scenes) * tw, len(ROWS) * (th + 16)), (10, 10, 10))
    d = ImageDraw.Draw(sheet)
    for r, (label, g, bass) in enumerate(ROWS):
        for c, img in enumerate(base):
            im = bloom(ctx, img, dict(audio_values(bass, t), glow=g))
            pil = Image.fromarray((im * 255).astype('uint8')).resize((tw, th))
            sheet.paste(pil, (c * tw, r * (th + 16)))
            d.text((c * tw + 4, r * (th + 16) + th + 2),
                   '{}  -  escena {:02d}'.format(label, scenes[c]), fill=(220, 220, 220))
    sheet.save(out)
    print('->', out)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
