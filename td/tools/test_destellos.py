#!/usr/bin/env python3
"""Limite de destellos: ninguna escena, transicion ni el Miedo pasa de 3
destellos por segundo (criterio WCAG 2.3.1 de "destello general").

Por que: en una fiesta con publico hay gente fotosensible. Un relampago,
un apagon que titila o un parpadeo de luz que cambia el brillo de buena
parte de la pantalla mas de 3 veces por segundo puede provocar una crisis.

Como se mide (fuera de TD, mismo GLSL que corre en TD):
  - Cada escena se dibuja cuadro a cuadro (60 por segundo, imagen chica)
    durante su gran climax (forzado con el canal 'moment', como el pad
    Momento), con bombo a 128 BPM, Chaos 0.9, Detail 0.5 y la noche
    avanzada: el peor caso razonable de la noche.
  - Por cuadro: luminancia relativa (lineal) media de cada casillero de
    una grilla de 3 x 3 (un casillero ~ 1/9 de la tela de 5 x 2 m, mucho
    mas que el area minima del criterio).
  - Un destello = un par de cambios opuestos de luminancia de al menos
    0.10 con el lado oscuro por debajo de 0.80. Se cuenta el maximo de
    destellos en cualquier ventana de 1 s.
  - Las transiciones (program_trans) se miden igual, de una escena gris a
    otra, a la duracion minima de cada estilo; el Miedo (program_capas)
    al maximo sobre una escena gris.

    python3 td/tools/test_destellos.py                 # todo el set de Halloween
    python3 td/tools/test_destellos.py --scenes 4,9    # algunas escenas
    python3 td/tools/test_destellos.py --fps 30        # mas rapido, menos fino

Sale con error si algo pasa de 3 por segundo.
"""
import math
import os
import sys

if '--set' not in sys.argv:
    sys.argv += ['--set', 'halloween']
if '--size' not in sys.argv:
    sys.argv += ['--size', '160x64']

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

import numpy as np  # noqa: E402

import render_scenes as R  # noqa: E402  (lee --set y --size)
from vjcore import config, program, shader  # noqa: E402

MAX_PER_SECOND = 3
DELTA = 0.10
DARK = 0.80
GRID = 3
BPM = 128.0


def _lin(img):
    c = np.clip(img, 0.0, 1.0)
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722


def cells(img):
    y = _lin(img)
    h, w = y.shape
    out = []
    for j in range(GRID):
        for i in range(GRID):
            out.append(float(y[j * h // GRID:(j + 1) * h // GRID, i * w // GRID:(i + 1) * w // GRID].mean()))
    return out


def transitions(series):
    """Cuadros donde se completa un cambio de luminancia >= DELTA (con el
    lado oscuro < DARK) en sentido contrario al cambio anterior."""
    events = []
    direction = 0
    lo = hi = ext = series[0]
    for k, v in enumerate(series[1:], 1):
        if direction == 0:
            lo, hi = min(lo, v), max(hi, v)
            if v - lo >= DELTA and lo < DARK:
                events.append(k)
                direction, ext = 1, v
            elif hi - v >= DELTA and v < DARK:
                events.append(k)
                direction, ext = -1, v
        elif direction > 0:
            if v > ext:
                ext = v
            elif ext - v >= DELTA and v < DARK:
                events.append(k)
                direction, ext = -1, v
        else:
            if v < ext:
                ext = v
            elif v - ext >= DELTA and ext < DARK:
                events.append(k)
                direction, ext = 1, v
    return events


def flashes_per_second(series, fps):
    """Maximo de destellos (un destello = dos cambios opuestos) en
    cualquier ventana de 1 s."""
    ev = transitions(series)
    win = int(round(fps))
    best = 0
    j = 0
    for i in range(len(ev)):
        while ev[i] - ev[j] >= win:
            j += 1
        best = max(best, (i - j + 1) // 2)
    return best


def _selftest():
    fps = 30
    # 2 Hz cuadrado de 0.1 a 0.6: 2 destellos por segundo
    sq = [0.6 if (k // 7) % 2 else 0.1 for k in range(90)]
    # 5 Hz: 5 por segundo
    fast = [0.6 if (k // 3) % 2 else 0.1 for k in range(90)]
    # cambios chicos (0.05): ninguno
    small = [0.30 + (0.05 if k % 2 else 0.0) for k in range(90)]
    # todo brillante (lado oscuro > 0.8): no cuenta
    bright = [0.95 if k % 2 else 0.85 for k in range(90)]
    return (flashes_per_second(sq, fps) == 2 and flashes_per_second(fast, fps) == 5
            and flashes_per_second(small, fps) == 0 and flashes_per_second(bright, fps) == 0)


class Scene:
    """Escena compilada una vez; cada cuadro solo reescribe el control."""

    def __init__(self, ctx, index, media):
        body, self.path = shader.read_body(index)
        n_inputs = config.scene_input_count(index)
        src = ('#version 330\nuniform sampler2D sTD2DInputs[{}];\n'
               'in vec3 vUV;\nvec4 TDOutputSwizzle(vec4 c) {{ return c; }}\n'
               .format(n_inputs) + shader.make_header(index, config.CTRL_CHANNELS)
               + body + shader._FOOTER)
        self.ctx = ctx
        self.prog = ctx.program(vertex_shader=R._VERT, fragment_shader=src)
        vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
        self.vao = ctx.simple_vertex_array(self.prog, vbo, 'in_pos')
        n = len(config.CTRL_CHANNELS)
        self.ctrl = ctx.texture((1, n), 1, np.zeros(n, 'f4').tobytes(), dtype='f4')
        self.ctrl.filter = (ctx.NEAREST, ctx.NEAREST)
        from PIL import Image
        self.tex = []
        units = [0]
        if index in config.MEDIA_SCENES:
            t = ctx.texture((media.shape[1], media.shape[0]), 4, media.astype('f4').tobytes(), dtype='f4')
            t.build_mipmaps()
            self.tex.append((t, 1))
        atlas = config.PLATE_ATLAS.get(index)
        for k, ppath in enumerate(atlas['paths'] if atlas else config.PLATES.get(index, [])):
            im = Image.open(ppath).convert('RGBA').transpose(Image.FLIP_TOP_BOTTOM)
            t = ctx.texture(im.size, 4, im.tobytes())
            t.build_mipmaps()
            t.filter = (ctx.LINEAR_MIPMAP_LINEAR, ctx.LINEAR)
            self.tex.append((t, config.plate_base(index) + k))
        units += [u for _, u in self.tex]
        try:
            na = self.prog['sTD2DInputs'].array_length
            self.prog['sTD2DInputs'].value = units[:na] if na > 1 else units[0]
        except Exception:
            pass
        self.fbo = ctx.simple_framebuffer((R.W, R.H), components=4, dtype='f4')

    def frame(self, values):
        self.ctrl.write(values.tobytes())
        self.ctrl.use(0)
        for t, u in self.tex:
            t.use(u)
        self.fbo.use()
        self.fbo.clear(0, 0, 0, 1)
        self.vao.render(mode=self.ctx.TRIANGLE_STRIP)
        data = np.frombuffer(self.fbo.read(components=4, dtype='f4'), 'f4')
        return data.reshape(R.H, R.W, 4)[::-1, :, :3]


def show_values(t, t_moment):
    """Peor caso razonable: bombo a 128 BPM, Chaos alto, climax pedido."""
    v = R.ctrl_values(t, 'musica', 0.5, 0.9)
    ch = list(config.CTRL_CHANNELS)
    ph = (t * BPM / 60.0) % 1.0
    kick = math.exp(-ph * 9.0)
    beat = math.exp(-ph * 4.0)
    for name, val in (('kick', kick), ('beat', beat), ('bass', 0.55 + 0.4 * kick),
                      ('level', 0.6 + 0.2 * kick), ('night', 0.8), ('kclock', t),
                      ('moment', t_moment)):
        if name in ch:
            v[ch.index(name)] = val
    for i in range(6):
        if 'k{}on'.format(i) in ch:
            v[ch.index('k{}on'.format(i))] = -1.0
            v[ch.index('k{}off'.format(i))] = -1.0
    return v


def audit_scene(ctx, index, media, fps, t0=60.0, seconds=24.0):
    sc = Scene(ctx, index, media)
    series = [[] for _ in range(GRID * GRID)]
    n = int(seconds * fps)
    for k in range(n):
        t = t0 + k / fps
        img = sc.frame(show_values(t, t0 + 0.5))
        for c, val in enumerate(cells(img)):
            series[c].append(val)
    worst = max(flashes_per_second(s, fps) for s in series)
    return worst, os.path.splitext(os.path.basename(sc.path))[0]


def _post(ctx, frag, n_inputs, ctrl_index, images, values):
    src = ('#version 330\nuniform sampler2D sTD2DInputs[{}];\n'.format(n_inputs)
           + 'in vec3 vUV;\nvec4 TDOutputSwizzle(vec4 c) { return c; }\n'
           + shader.ctrl_header(config.CTRL_CHANNELS, ctrl_index) + frag)
    prog = ctx.program(vertex_shader=R._VERT, fragment_shader=src)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    texs = []
    for k, im in enumerate(images):
        t = ctx.texture((R.W, R.H), 3, np.ascontiguousarray(im).astype('f4').tobytes(), dtype='f4')
        t.build_mipmaps()
        texs.append((t, k))
    n = len(config.CTRL_CHANNELS)
    ctrl = ctx.texture((1, n), 1, np.zeros(n, 'f4').tobytes(), dtype='f4')
    ctrl.filter = (ctx.NEAREST, ctx.NEAREST)
    texs.append((ctrl, ctrl_index))
    try:
        prog['sTD2DInputs'].value = list(range(n_inputs))[:prog['sTD2DInputs'].array_length]
    except Exception:
        pass
    fbo = ctx.simple_framebuffer((R.W, R.H), components=4, dtype='f4')

    def frame(vals):
        v = {c: 0.0 for c in config.CTRL_CHANNELS}
        v.update(resw=float(R.W), resh=float(R.H))
        v.update(vals)
        ctrl.write(np.array([v[c] for c in config.CTRL_CHANNELS], 'f4').tobytes())
        for t, u in texs:
            t.use(u)
        fbo.use()
        vao.render(mode=ctx.TRIANGLE_STRIP)
        return np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(R.H, R.W, 4)[::-1, :, :3]
    return frame


def audit_transitions(ctx, fps):
    # escenas CLARAS a los dos lados: en luminancia lineal un gris oscuro
    # nunca llega a un cambio de 0.10 y el test pasaria sin medir nada
    gray_a = np.full((R.H, R.W, 3), 0.80, 'f4')
    gray_b = np.full((R.H, R.W, 3), 0.85, 'f4')
    frame = _post(ctx, program._TRANS_FRAG, 3, 2, (gray_a, gray_b), {})
    out = []
    for i, (name, label, secs) in enumerate(config.TRANSITION_STYLES):
        if name in ('fundido', 'halloween'):
            continue
        dur = max(float(secs), 0.3)
        series = [[] for _ in range(GRID * GRID)]
        n = int((dur + 1.0) * fps)
        for k in range(n):
            t = k / fps
            x = min(max((t - 0.5) / dur, 0.0), 1.0)
            img = frame({'xfade': x, 'transfx': i + 0.37, 'kclock': 50.0 + t, 'rtime': 50.0 + t})
            for c, val in enumerate(cells(img)):
                series[c].append(val)
        out.append((max(flashes_per_second(s, fps) for s in series), 'transicion ' + label, dur))
    return out


def audit_fear(ctx, fps):
    gray = np.full((R.H, R.W, 3), 0.85, 'f4')     # escena clara: peor caso
    frame = _post(ctx, program._CAPAS_FRAG, 2, 1, (gray,), {})
    out = []
    for label, extra in (('Miedo al maximo', {'fear': 1.0}),
                         ('Miedo + capa brasas', {'fear': 1.0, 'capa': 5.0, 'capaon': 1.0}),
                         ('Miedo + capa niebla', {'fear': 1.0, 'capa': 1.0, 'capaon': 1.0})):
        series = [[] for _ in range(GRID * GRID)]
        for k in range(int(20 * fps)):
            t = 30.0 + k / fps
            ph = (t * BPM / 60.0) % 1.0
            vals = dict(rtime=t, kclock=t, beat=math.exp(-ph * 4.0), kick=math.exp(-ph * 9.0),
                        bass=0.8, music=1.0)
            vals.update(extra)
            for c, val in enumerate(cells(frame(vals))):
                series[c].append(val)
        out.append((max(flashes_per_second(s, fps) for s in series), label))
    return out


def main():
    args = sys.argv[1:]
    fps = float(args[args.index('--fps') + 1]) if '--fps' in args else 60.0
    if '--scenes' in args:
        scenes = [int(x) for x in args[args.index('--scenes') + 1].split(',')]
    else:
        scenes = [i for i in range(config.N_SCENES) if shader.find_visual(i)]
    if not _selftest():
        print('[!!] el contador de destellos no pasa su propia prueba')
        return 1
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    media = R.media_image()
    bad = []
    print('destellos por segundo (maximo {}), {} cuadros/s:'.format(MAX_PER_SECOND, int(fps)))
    for i in scenes:
        worst, name = audit_scene(ctx, i, media, fps)
        flag = 'OK' if worst <= MAX_PER_SECOND else '!!'
        print('  [{}] {:<28} {}'.format(flag, name, worst))
        if worst > MAX_PER_SECOND:
            bad.append(name)
    if '--scenes' not in args:
        for worst, label, dur in audit_transitions(ctx, fps):
            flag = 'OK' if worst <= MAX_PER_SECOND else '!!'
            print('  [{}] {:<28} {}   ({:.1f} s)'.format(flag, label, worst, dur))
            if worst > MAX_PER_SECOND:
                bad.append(label)
        for worst, label in audit_fear(ctx, fps):
            flag = 'OK' if worst <= MAX_PER_SECOND else '!!'
            print('  [{}] {:<28} {}'.format(flag, label, worst))
            if worst > MAX_PER_SECOND:
                bad.append(label)
    print()
    if bad:
        print('PASAN DE {} POR SEGUNDO: {}'.format(MAX_PER_SECOND, ', '.join(bad)))
        return 1
    print('RESULTADO: TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
