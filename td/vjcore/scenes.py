"""Escenas: una sola pasada GLSL por escena.

Cambio arquitectonico central respecto al script original.

ANTES: cada visual era una cadena de 12-20 TOPs (noise, blur, level,
threshold, displace, composite, resolution...). Cada TOP es un render
fullscreen completo con lectura/escritura de VRAM. Tres Blur TOPs con
filtersize animado por audio son, por si solos, mas caros que todo el
resto del rig junto.

AHORA: cada escena es UN GLSL TOP. Una pasada de GPU. El shader vive en
un archivo .frag versionado en git, no enterrado dentro del build script.

Estructura de cada escena:

    /project1/scenes/sceneN/
        content/
            ctrl_in      Select TOP -> /project1/ctrl_tex
            shader_src   Text DAT   (header + .frag + footer)
            shader       GLSL TOP
            content_out  Null TOP   <- CONTRATO: la salida siempre se llama asi
        thumb            Resolution TOP a 256x144 (para el dashboard)
        out1             Null TOP   <- lo que consume el program bus
"""

# TouchDesigner inyecta sus globales (op, run, absTime, project y las
# constantes de tipo como baseCOMP o glslTOP) en su propio namespace y en los
# DATs, pero NO en modulos importados desde sys.path. Hay que pedirlos.
# El try existe para que las herramientas de td/tools/ puedan importar este
# modulo fuera de TouchDesigner.
try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass


from . import config, shader as shadermod
from .tdutil import safe_set, safe_set_first, safe_expr, connect, log


def build_all(proj, channels):
    scenes = proj.create(baseCOMP, 'scenes')
    scenes.nodeX, scenes.nodeY = 0, 300
    outs, thumbs = [], []
    for i in range(config.N_SCENES):
        o, t = build_scene(scenes, i, channels)
        outs.append(o)
        thumbs.append(t)
    return scenes, outs, thumbs


def build_scene(scenes, i, channels):
    sc = scenes.create(baseCOMP, 'scene{}'.format(i))
    sc.nodeX = (i % config.GRID_COLS) * 200
    sc.nodeY = -(i // config.GRID_COLS) * 200

    page = sc.appendCustomPage('Scene')
    from .tdutil import add_int, add_string
    add_int(page, 'Sceneindex', 'Scene Index', i, 0, config.N_SCENES - 1)
    add_string(page, 'Shaderfile', 'Shader File', '')
    # Leyenda de las perillas Detail 1-6 para ESTA escena, parseada de los
    # comentarios @D1..@D6 del .frag. control_script.py la lee al activar
    # la escena y la muestra en el dashboard.
    add_string(page, 'Detaillegend', 'Detail Legend', '')

    has_media = i in config.MEDIA_SCENES
    if has_media:
        # Carpeta con las imagenes/GIFs/videos que esta escena va rotando
        # sola -- no un archivo unico. control_script.py escanea la
        # carpeta (_scanMediaFolder), y el indice actual (Mediaindex,
        # interno) avanza automaticamente: por tiempo (ritmo segun Speed,
        # ver _scheduleMediaAdvance) y ademas en cada golpe de bombo
        # (dats/media_logic.py) -- sin gastar ninguna perilla nueva.
        add_string(page, 'Mediafolder', 'Media Folder Path', '')
        add_int(page, 'Mediaindex', 'Media Index (interno)', 0, 0, 9999)

    content = sc.create(baseCOMP, 'content')
    content.nodeX, content.nodeY = 0, 0

    # Puente local hacia la textura de control global.
    ctrl_in = content.create(selectTOP, 'ctrl_in')
    ctrl_in.nodeX, ctrl_in.nodeY = -200, 0
    safe_set(ctrl_in, 'top', '/project1/ctrl_tex')

    src = content.create(textDAT, 'shader_src')
    src.nodeX, src.nodeY = 0, 150

    glsl = content.create(glslTOP, 'shader')
    glsl.nodeX, glsl.nodeY = 0, 0
    safe_set_first(glsl, ['pixeldat', 'pixelshader'], src.path)
    connect(glsl, ctrl_in, 0)

    if has_media:
        # Input 1: imagen/GIF/video que el .frag de esta escena procesa.
        # 'play' en loop para que un gif corto no se quede congelado en
        # el primer frame. Sin archivo cargado, sale negro -- el .frag
        # tiene que verse bien igual (ver contrato en scene19).
        media_in = content.create(moviefileinTOP, 'media_in')
        media_in.nodeX, media_in.nodeY = -200, 150
        safe_expr(media_in, 'file',
                  "op('/project1/control_script').module.currentMediaPath({})".format(i))
        safe_set(media_in, 'play', True)
        safe_set_first(media_in, ['cueloop', 'loop'], True)
        connect(glsl, media_in, 1)
    # IMPORTANTE: sin esto el GLSL TOP hereda la resolucion del input 0,
    # que es la textura de control de 1 x 15 px.
    safe_set(glsl, 'outputresolution', 'custom')
    safe_expr(glsl, 'resolutionw', "op('/project1').par.Outputwidth")
    safe_expr(glsl, 'resolutionh', "op('/project1').par.Outputheight")
    safe_set_first(glsl, ['format', 'pixelformat'], 'rgba16float')

    out_top = content.create(nullTOP, 'content_out')
    out_top.nodeX, out_top.nodeY = 0, -150
    connect(out_top, glsl)

    # Puente a la red padre. Los TOPs de /sceneN no se cablean directo a los
    # de /content: se referencian con un Select TOP. Esto es lo que el script
    # original ya hacia bien y se conserva.
    bridge = sc.create(selectTOP, 'content_src')
    bridge.nodeX, bridge.nodeY = 0, -150
    safe_set(bridge, 'top', out_top.path)

    out1 = sc.create(nullTOP, 'out1')
    out1.nodeX, out1.nodeY = 0, -300
    connect(out1, bridge)

    # Thumbnail dedicado: el dashboard NUNCA muestra el TOP a resolucion de
    # salida. 20 tiles muestreando 1280x720 es un costo real y evitable.
    thumb = sc.create(resolutionTOP, 'thumb')
    thumb.nodeX, thumb.nodeY = 200, -300
    safe_set(thumb, 'outputresolution', 'custom')
    safe_set(thumb, 'resolutionw', config.THUMB_RES_W)
    safe_set(thumb, 'resolutionh', config.THUMB_RES_H)
    connect(thumb, bridge)

    load_shader(sc, i, channels)
    return out1, thumb


def load_shader(sc, i, channels):
    """(Re)compone el texto del shader de una escena. Es lo que llama Reload."""
    src = sc.op('content/shader_src')
    if not src:
        log('ERROR scene{}: no existe content/shader_src'.format(i))
        return False
    try:
        text, path = shadermod.compose(i, channels)
    except Exception as e:
        log('ERROR scene{} componiendo shader: {}'.format(i, e))
        return False
    src.text = text
    safe_set(sc, 'Shaderfile', path)

    try:
        body, _ = shadermod.read_body(i)
        safe_set(sc, 'Detaillegend', shadermod.parse_detail_legend(body))
    except Exception as e:
        log('AVISO scene{} leyenda de detail: {}'.format(i, e))

    return True


def reload_all(proj, channels):
    ok = 0
    for i in range(config.N_SCENES):
        sc = proj.op('scenes/scene{}'.format(i))
        if sc and load_shader(sc, i, channels):
            ok += 1
    log('RELOAD: {}/{} shaders recargados'.format(ok, config.N_SCENES))
    return ok
