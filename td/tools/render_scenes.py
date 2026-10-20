#!/usr/bin/env python3
"""Renderiza escenas DE VERDAD (el mismo GLSL que corre en TD) a PNG,
fuera de TouchDesigner y sin GPU.

    pip install moderngl numpy pillow     (+ Mesa: libegl1 libgl1-mesa-dri)
    python3 td/tools/render_scenes.py salida/                 # set activo, todas
    python3 td/tools/render_scenes.py salida/ --set halloween # otro set
    python3 td/tools/render_scenes.py salida/ --set halloween --scenes 0,3,7
    python3 td/tools/render_scenes.py salida/ --audio golpe --t 12.5
    python3 td/tools/render_scenes.py salida/ --d 0.8         # las 6 Detail en 0.8
    python3 td/tools/render_scenes.py salida/ --chaos 0.9     # perilla Chaos (locura)
    python3 td/tools/render_scenes.py salida/ --size 1280x512 # otro formato

Compone header + .frag + footer exactamente como shader.py lo hace para
TD, inyecta lo mismo que inyecta un GLSL TOP (vUV, sTD2DInputs,
TDOutputSwizzle) y lo dibuja con OpenGL 3.3 por software (Mesa
llvmpipe). La textura de control es la misma de 1 x N canales, con
valores elegidos aca (Speed, audio, Detail...). No incluye el program
bus (bloom, estela, texto): es la escena sola, como su miniatura.

Escribe un PNG por escena y una hoja de contacto (_hoja.png).
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

if '--set' in sys.argv:
    _i = sys.argv.index('--set')
    os.environ['TDAI_SET'] = sys.argv[_i + 1]
    del sys.argv[_i:_i + 2]

import numpy as np                    # noqa: E402
from PIL import Image, ImageDraw     # noqa: E402

from vjcore import config, shader    # noqa: E402

W, H = 640, 360
if '--size' in sys.argv:
    _i = sys.argv.index('--size')
    W, H = (int(x) for x in sys.argv[_i + 1].lower().split('x'))
    del sys.argv[_i:_i + 2]

_VERT = """#version 330
in vec2 in_pos;
out vec3 vUV;
void main() {
    vUV = vec3(in_pos * 0.5 + 0.5, 0.0);
    gl_Position = vec4(in_pos, 0.0, 1.0);
}
"""

AUDIO = {
    # level bass mid high kick beat groove
    'silencio': (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    'musica':   (0.45, 0.45, 0.35, 0.25, 0.0, 0.2, 1.0, 1.0),
    'golpe':    (0.75, 0.85, 0.40, 0.30, 1.0, 1.0, 1.0, 1.0),
}


def ctrl_values(t, audio, detail, chaos=0.3):
    level, bass, mid, high, kick, beat, groove, music = AUDIO[audio]
    v = {name: 0.0 for name in config.CTRL_CHANNELS}
    v.update({
        'speed': 0.5, 'density': 0.5, 'hue': 0.0, 'chaos': chaos,
        'bright': 1.0, 'level': level, 'bass': bass, 'mid': mid,
        'high': high, 'kick': kick, 'beat': beat, 'groove': groove,
        'music': music, 'audioamt': 1.0, 'keypos': 0.5,
        'trailszoom': 0.5, 'trailsrot': 0.5, 'palettehue': 0.55,
        'palettespread': 0.5,
        'time': t, 'rtime': t, 'resw': float(W), 'resh': float(H),
    })
    for i in range(1, 7):
        v['d{}'.format(i)] = detail
    return np.array([v[c] for c in config.CTRL_CHANNELS], dtype='f4')


def media_image():
    """Imagen de prueba para las escenas de MEDIA_SCENES: una cara/
    calavera sintetica de alto contraste, para ver el tratamiento."""
    yy, xx = np.mgrid[0:256, 0:256].astype(np.float32) / 255.0
    x, y = (xx - 0.5) * 2, (yy - 0.5) * 2
    face = ((x / 0.62) ** 2 + ((y + 0.05) / 0.78) ** 2) < 1
    eyes = (((x - 0.26) ** 2 + (y + 0.15) ** 2) < 0.025) | \
           (((x + 0.26) ** 2 + (y + 0.15) ** 2) < 0.025)
    mouth = (np.abs(y - 0.38) < 0.05) & (np.abs(x) < 0.3)
    img = np.zeros((256, 256, 4), np.float32)
    img[..., 3] = 1
    img[face] = (0.92, 0.88, 0.80, 1)
    img[eyes | mouth] = (0.05, 0.02, 0.02, 1)
    img[..., :3] *= (0.55 + 0.45 * (1 - yy))[..., None]
    return img[::-1].copy()


def render(ctx, index, values, media):
    body, path = shader.read_body(index)
    n_inputs = config.scene_input_count(index)
    src = ('#version 330\nuniform sampler2D sTD2DInputs[{}];\n'
           'in vec3 vUV;\nvec4 TDOutputSwizzle(vec4 c) {{ return c; }}\n'
           .format(n_inputs)
           + shader.make_header(index, config.CTRL_CHANNELS)
           + body + shader._FOOTER)
    prog = ctx.program(vertex_shader=_VERT, fragment_shader=src)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')

    ctrl = ctx.texture((1, len(values)), 1, values.tobytes(), dtype='f4')
    ctrl.filter = (ctx.NEAREST, ctx.NEAREST)
    ctrl.use(0)
    units = [0]
    extra = []
    bind = []
    if index in config.MEDIA_SCENES:
        tex = ctx.texture((media.shape[1], media.shape[0]), 4,
                          media.astype('f4').tobytes(), dtype='f4')
        bind.append((tex, 1))
    # laminas: PNG de 8 bits como las lee el Movie File In TOP (abajo = v 0)
    for k, path in enumerate(config.PLATES.get(index, [])):
        im = Image.open(path).convert('RGBA').transpose(Image.FLIP_TOP_BOTTOM)
        tex = ctx.texture(im.size, 4, im.tobytes())
        tex.build_mipmaps()
        tex.filter = (ctx.LINEAR_MIPMAP_LINEAR, ctx.LINEAR)
        bind.append((tex, config.plate_base(index) + k))
    # se enlazan todas al final: crear una textura nueva puede pisar el
    # enlace de una unidad ya usada
    ctrl.use(0)
    for tex, unit in bind:
        tex.use(unit)
        units.append(unit)
        extra.append(tex)
    try:
        # el compilador descarta los inputs que el shader no usa: el arreglo
        # activo puede ser mas corto que la cantidad de inputs
        n_act = prog['sTD2DInputs'].array_length
        prog['sTD2DInputs'].value = units[:n_act] if n_act > 1 else units[0]
    except Exception:
        pass

    fbo = ctx.simple_framebuffer((W, H), components=4, dtype='f4')
    fbo.use()
    fbo.clear(0, 0, 0, 1)
    vao.render(mode=ctx.TRIANGLE_STRIP)
    data = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4')
    img = data.reshape(H, W, 4)[::-1, :, :3]
    for o in [vao, vbo, prog, ctrl, fbo] + extra:
        o.release()
    return np.clip(img, 0, 1), path


def contact_sheet(items, out_path, cols=5, tw=256):
    th = int(tw * H / W)
    rows = math.ceil(len(items) / cols)
    sheet = Image.new('RGB', (cols * tw, rows * (th + 16)), (10, 10, 10))
    d = ImageDraw.Draw(sheet)
    for k, (label, im) in enumerate(items):
        x, y = (k % cols) * tw, (k // cols) * (th + 16)
        sheet.paste(im.resize((tw, th)), (x, y))
        d.text((x + 4, y + th + 2), label, fill=(220, 220, 220))
    sheet.save(out_path)


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('--'):
        print(__doc__)
        return 1
    out = args[0]
    opt = {'--t': '8.0', '--audio': 'musica', '--d': '0.0', '--scenes': '',
           '--chaos': '0.3'}
    for k in opt:
        if k in args:
            opt[k] = args[args.index(k) + 1]
    os.makedirs(out, exist_ok=True)
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    values = ctrl_values(float(opt['--t']), opt['--audio'], float(opt['--d']),
                         float(opt['--chaos']))
    media = media_image()
    if opt['--scenes']:
        indices = [int(s) for s in opt['--scenes'].split(',')]
    else:
        indices = [i for i in range(config.N_SCENES) if shader.find_visual(i)]
    items, fails = [], []
    for i in indices:
        try:
            img, path = render(ctx, i, values, media)
        except Exception as e:
            fails.append(i)
            print('[!!] escena {:02d}: {}'.format(i, str(e).strip()[:400]))
            continue
        im = Image.fromarray((img * 255).astype(np.uint8))
        name = os.path.splitext(os.path.basename(path))[0]
        im.save(os.path.join(out, name + '.png'))
        mean = float(img.mean())
        print('[OK] {}  brillo medio {:.3f}'.format(name, mean))
        items.append((name, im))
    if items:
        contact_sheet(items, os.path.join(out, '_hoja.png'))
    print('{} escenas, {} con error -> {}'.format(len(items), len(fails), out))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
