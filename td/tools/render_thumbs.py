"""Miniaturas del dashboard sin abrir TouchDesigner.

Renderiza cada escena del set (con el mismo renderizador que
render_scenes.py), recorta el centro a 16:9 y la guarda como
<set>/thumbs/sceneNN.png, que es donde el dashboard busca los posters
(dashboard.poster_path). Dentro de TD, Bakethumbs las vuelve a sacar del
render real y las pisa.

uso:
  python3 td/tools/render_thumbs.py --set halloween
  python3 td/tools/render_thumbs.py --set halloween --media mi_imagen.png --scenes 20,21
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# Halloween: segundo del poster por escena (los demas, --t)
THUMB_T = {15: 44.0, 22: 48.0, 23: 20.0, 25: 12.0}
TD = os.path.dirname(HERE)


def main():
    args = sys.argv[1:]
    opt = {'--set': '', '--media': '', '--scenes': '', '--t': '40'}
    for k in opt:
        if k in args:
            opt[k] = args[args.index(k) + 1]
    if opt['--set']:
        os.environ['TDAI_SET'] = opt['--set']
    sys.path.insert(0, TD)
    sys.path.insert(0, HERE)
    import numpy as np
    from PIL import Image
    import moderngl
    import render_scenes as rs
    from vjcore import config, shader, dashboard

    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    rs.W, rs.H = config.DEFAULT_OUTPUT_W, config.DEFAULT_OUTPUT_H
    names = list(config.CTRL_CHANNELS)

    def vals(i):
        # momento lindo de cada escena (evita eventos que la dejan negra)
        t = THUMB_T.get(i, float(opt['--t'])) if config.SET_NAME == 'halloween' else float(opt['--t'])
        v = rs.ctrl_values(t, 'musica', 0.6, 0.3)
        v[names.index('d5')] = 0.0                  # el color "de siempre" de cada escena
        return v
    media = rs.media_image()
    if opt['--media']:
        media = (np.asarray(Image.open(opt['--media']).convert('RGBA')).astype(np.float32) / 255.0)[::-1].copy()
    out = dashboard.thumbs_dir()
    os.makedirs(out, exist_ok=True)
    indices = [int(s) for s in opt['--scenes'].split(',')] if opt['--scenes'] else range(config.N_SCENES)
    tw, th = config.THUMB_RES_W, config.THUMB_RES_H
    fails = 0
    for i in indices:
        if not shader.find_visual(i):
            continue
        try:
            # HK_STILL: sin climax (la miniatura muestra la escena en reposo)
            img, _ = rs.render(ctx, i, vals(i), media, '#define HK_STILL 1\n')
        except Exception as e:
            print('[!!] escena {:02d}: {}'.format(i, str(e)[:200]))
            fails += 1
            continue
        im = Image.fromarray((img * 255).astype(np.uint8))
        w, h = im.size
        cw = min(w, int(h * tw / th))                 # recorte central a 16:9
        x0 = (w - cw) // 2
        im = im.crop((x0, 0, x0 + cw, h)).resize((tw, th), Image.LANCZOS)
        path = dashboard.poster_path(i)
        im.save(path)
        print('[OK]', os.path.relpath(path, TD))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
