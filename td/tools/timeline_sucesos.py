#!/usr/bin/env python3
"""Linea de tiempo del REPERTORIO de una escena (fase 30, docs/53).

Lee del MISMO GLSL de la escena (compilado con HK_TIMELINE) lo que el
calendario elige en cada momento -- estado, sucesos, detalles, climax y
gran climax -- y lo lista para N minutos, con un resumen y chequeos:
  - ningun suceso ni detalle cae encima de un climax
  - la misma variante nunca sale dos veces seguidas
  - cuantas veces sale cada cosa en el tiempo pedido

    python3 td/tools/timeline_sucesos.py 26                 # 30 min de la mansion
    python3 td/tools/timeline_sucesos.py 26 --min 60 --night 0.8 --fear 0.5
    python3 td/tools/timeline_sucesos.py 26 --sheet hoja.png   # + un cuadro de cada cosa

Los nombres salen de las lineas @EST/@SUC/@DET/@CLX del encabezado del .frag.
"""
import os
import re
import sys

if '--set' not in sys.argv:
    sys.argv += ['--set', 'halloween']
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

import numpy as np  # noqa: E402

import render_scenes as R  # noqa: E402
from vjcore import config, shader  # noqa: E402

STEP = 0.5


def names(body):
    out = {}
    for key in ('EST', 'SUC', 'DET', 'CLX'):
        m = re.search(r'//\s*@' + key + r':\s*(.*)', body)
        out[key] = [x.strip() for x in m.group(1).split('|')] if m else []
    return out


def sample(index, minutes, night, fear, t0=600.0):
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    body, path = shader.read_body(index)
    n_inputs = config.scene_input_count(index)
    main = ('\nvoid main() { vec4 c = render(vec2(0.5));'
            ' fragColor = gl_FragCoord.x < 1.0 ? hkTL0 : hkTL1 + c * 0.0; }\n')
    src = ('#version 330\nuniform sampler2D sTD2DInputs[{}];\n'
           'in vec3 vUV;\nvec4 TDOutputSwizzle(vec4 c) {{ return c; }}\n#define HK_TIMELINE 1\n'
           .format(n_inputs) + shader.make_header(index, config.CTRL_CHANNELS) + body + main)
    prog = ctx.program(vertex_shader=R._VERT, fragment_shader=src)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    ch = list(config.CTRL_CHANNELS)
    n = len(ch)
    ctrl = ctx.texture((1, n), 1, np.zeros(n, 'f4').tobytes(), dtype='f4')
    ctrl.filter = (ctx.NEAREST, ctx.NEAREST)
    try:
        prog['sTD2DInputs'].value = 0 if prog['sTD2DInputs'].array_length <= 1 else [0] * prog['sTD2DInputs'].array_length
    except Exception:
        pass
    fbo = ctx.simple_framebuffer((2, 1), components=4, dtype='f4')
    rows = []
    for k in range(int(minutes * 60 / STEP)):
        t = t0 + k * STEP
        v = R.ctrl_values(t, 'musica', 0.5)
        for name, val in (('night', night), ('fear', fear), ('kclock', t), ('moment', -1.0)):
            if name in ch:
                v[ch.index(name)] = val
        ctrl.write(v.tobytes())
        ctrl.use(0)
        fbo.use()
        vao.render(mode=ctx.TRIANGLE_STRIP)
        d = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(2, 4)
        rows.append((t, d[0].copy(), d[1].copy()))
    return rows, path


def segments(rows, var_i, env_i, which):
    """Tramos donde la envolvente pasa de 0: (inicio, fin, variante)."""
    out = []
    cur = None
    for t, a, b in rows:
        src = a if which == 0 else b
        on = src[env_i] > 0.001
        var = int(round(src[var_i]))
        if on and cur is None:
            cur = [t, t, var]
        elif on:
            cur[1] = t
        elif cur is not None:
            out.append(tuple(cur))
            cur = None
    if cur is not None:
        out.append(tuple(cur))
    return out


def fmt(t, t0):
    s = int(t - t0)
    return '{:02d}:{:02d}'.format(s // 60, s % 60)


def main():
    args = [a for a in sys.argv[1:]]
    index = int(args[0])
    opt = {'--min': '30', '--night': '0.3', '--fear': '0.0', '--sheet': ''}
    for k in opt:
        if k in args:
            opt[k] = args[args.index(k) + 1]
    minutes = float(opt['--min'])
    t0 = 600.0
    rows, path = sample(index, minutes, float(opt['--night']), float(opt['--fear']), t0)
    body, _ = shader.read_body(index)
    nm = names(body)

    def label(key, v):
        lst = nm.get(key, [])
        return lst[v] if 0 <= v < len(lst) else '#{}'.format(v)

    suc = segments(rows, 0, 1, 0)
    det = segments(rows, 2, 3, 0)
    clx = segments(rows, 0, 1, 1)
    grand = [(a, b, v) for a, b, v in clx if any(r[2][2] > 0.5 for r in rows if a <= r[0] <= b)]
    est = []
    for t, a, b in rows:
        e = int(round(b[3]))
        if not est or est[-1][1] != e:
            est.append((t, e))

    events = [(a, 'ESTADO', label('EST', e)) for a, e in est]
    events += [(a, 'suceso', label('SUC', v)) for a, b, v in suc]
    events += [(a, 'detalle', label('DET', v)) for a, b, v in det]
    for a, b, v in clx:
        g = (a, b, v) in grand
        events.append((a, 'GRAN CLIMAX' if g else 'CLIMAX', label('CLX', v)))
    events.sort()
    print('{}  ({} min, noche {}, miedo {})'.format(os.path.basename(path), int(minutes),
                                                  opt['--night'], opt['--fear']))
    for t, kind, what in events:
        print('  {}  {:<12} {}'.format(fmt(t, t0), kind, what))

    bad = []
    for a, b, v in suc + det:
        for c0, c1, _ in clx:
            if a <= c1 and b >= c0:
                bad.append('suceso/detalle en {} encima de un climax'.format(fmt(a, t0)))
    # "seguido" = sin un climax en medio (despues de un climax, que pase
    # algo ya visto no se siente como repeticion)
    for lst, key in ((suc, 'suceso'), (det, 'detalle')):
        for x, y in zip(lst, lst[1:]):
            between = any(x[1] < c0 and c1 < y[0] for c0, c1, _ in clx)
            if x[2] == y[2] and not between:
                bad.append('{} repetido seguido en {}: {}'.format(key, fmt(y[0], t0), y[2]))
    common = [x for x in clx if x not in grand]
    for x, y in zip(common, common[1:]):
        if x[2] == y[2]:
            bad.append('climax repetido seguido en {}: {}'.format(fmt(y[0], t0), y[2]))
    print('\nresumen en {} min: {} sucesos, {} detalles, {} climax, {} gran climax, {} cambios de estado'.format(
        int(minutes), len(suc), len(det), len(clx) - len(grand), len(grand), len(est) - 1))
    for key, lst in (('SUC', suc), ('DET', det), ('CLX', [x for x in clx if x not in grand])):
        cnt = {}
        for _, _, v in lst:
            cnt[label(key, v)] = cnt.get(label(key, v), 0) + 1
        print('  {}: {}'.format(key, ', '.join('{} x{}'.format(k, c) for k, c in sorted(cnt.items()))))
    for b in bad:
        print('  [!!]', b)
    print('chequeos: {}'.format('OK' if not bad else '{} problemas'.format(len(bad))))

    if opt['--sheet']:
        sheet(index, opt['--sheet'], suc, det, clx, grand, label, t0, float(opt['--night']))
    return 1 if bad else 0


def sheet(index, out, suc, det, clx, grand, label, t0, night):
    """Un cuadro de cada variante (la primera vez que sale), a mitad de
    camino (los climax: en el pico)."""
    from PIL import Image, ImageDraw
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    media = R.media_image()
    picks = []
    seen = set()
    for key, lst, f in (('SUC', suc, 0.5), ('DET', det, 0.5), ('CLX', [x for x in clx if x not in grand], 0.5),
                        ('GRAN', grand, 0.5)):
        for a, b, v in lst:
            if (key, v) in seen:
                continue
            seen.add((key, v))
            picks.append(('{} {}'.format(key, label('CLX' if key == 'GRAN' else key, v)), a + (b - a) * f))
    tw, th = R.W, R.H
    cols = 3
    rows_n = (len(picks) + cols - 1) // cols
    img = Image.new('RGB', (cols * tw, rows_n * (th + 18)), (12, 12, 12))
    d = ImageDraw.Draw(img)
    ch = list(config.CTRL_CHANNELS)
    for k, (lab, t) in enumerate(picks):
        v = R.ctrl_values(t, 'musica', 0.5)
        for name, val in (('night', night), ('kclock', t), ('moment', -1.0)):
            if name in ch:
                v[ch.index(name)] = val
        im, _ = R.render(ctx, index, v, media)
        pil = Image.fromarray((im * 255).astype('uint8'))
        x, y = (k % cols) * tw, (k // cols) * (th + 18)
        img.paste(pil, (x, y))
        d.text((x + 4, y + th + 3), '{}  ({})'.format(lab, fmt(t, t0)), fill=(230, 220, 190))
    img.save(out)
    print('->', out)


if __name__ == '__main__':
    sys.exit(main())
