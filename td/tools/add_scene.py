#!/usr/bin/env python3
"""Da de alta una escena NUEVA a partir de un .frag generado por una IA
(ChatGPT, Claude, etc.) siguiendo el contrato de docs/04_PROMPT_PARA_IA.md.

Automatiza TODO lo que hoy hay que acordarse de hacer a mano para que
una escena nueva funcione en TD sin tocar nada mas que este comando:

  1. Elige el proximo indice libre (el que sigue al ultimo usado).
  2. Compila el .frag (mismo glslangValidator que validate_shaders.py,
     en los dos escenarios: con audio y sin device de audio) ANTES de
     escribir nada.
  3. Si compila: copia el .frag a visuals/sceneNN_<slug>.frag y sube
     N_SCENES en vjcore/config.py si hace falta (nunca lo baja).
  4. Avisa (sin bloquear) si el header no documenta las 6 perillas
     Detail, o si documenta una que despues no se usa en el codigo.

MIDI, audio y las perillas Detail NO se cablean por escena: todo llega
por la misma textura de control 1xN que ya comparten las otras
escenas (ver vjcore/shader.py). Mientras el .frag respete el contrato,
esas conexiones ya funcionan solas -- este script no toca nada de eso,
solo valida que el archivo este bien y lo registra.

USO
    # una escena
    python3 td/tools/add_scene.py --slug tunel_particulas archivo.frag
    cat respuesta_chatgpt.frag | python3 td/tools/add_scene.py --slug tunel_particulas

    # varias de una (10 archivos .frag en una carpeta -> 10 escenas nuevas)
    python3 td/tools/add_scene.py --dir ~/Descargas/visuales_chatgpt/

    # forzar un indice puntual (por defecto usa el siguiente libre)
    python3 td/tools/add_scene.py --slug tunel --index 40 archivo.frag

En modo --dir es todo o nada: si UN archivo no compila, no se escribe
NINGUNO y no se toca config.py -- para no dejar N_SCENES apuntando a
escenas a medio cargar.

No requiere TD abierto.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

from vjcore import config, shader  # noqa: E402
import validate_shaders as vs       # noqa: E402  reutiliza _compile/annotate
import test_detail_knobs as tdk     # noqa: E402  reutiliza parse_legend

VISUALS = os.path.join(TD, 'visuals')
CONFIG_PATH = os.path.join(TD, 'vjcore', 'config.py')

RENDER_SIG_RE = re.compile(r'vec4\s+render\s*\(\s*vec2\s+uv\s*\)')

BANNED_SNIPPETS = [
    ('void main(', 'El sistema ya inyecta main(). Definir SOLO vec4 render(vec2 uv).'),
    ('#version', 'El sistema ya agrega el #version. No lo repitas.'),
    ('gl_FragColor', 'GLSL 3.30 core: gl_FragColor no existe. Devolve el vec4 desde render().'),
    ('sTD2DInputs', 'Es un uniform que ya inyecta el sistema. No lo declares ni lo muestrees directo.'),
]


def usage(code=1):
    print(__doc__)
    sys.exit(code)


def parse_args(argv):
    opts = {'slug': None, 'index': None, 'dir': None, 'path': None}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--slug':
            i += 1
            opts['slug'] = argv[i]
        elif a == '--index':
            i += 1
            opts['index'] = int(argv[i])
        elif a == '--dir':
            i += 1
            opts['dir'] = argv[i]
        elif a in ('-h', '--help'):
            usage(0)
        else:
            opts['path'] = a
        i += 1
    return opts


def sanitize_slug(raw):
    s = re.sub(r'[^a-z0-9_]+', '_', raw.strip().lower()).strip('_')
    return s or 'visual'


def sanity_check(body):
    problems = []
    for snippet, why in BANNED_SNIPPETS:
        if snippet in body:
            problems.append('Contiene "{}" -- {}'.format(snippet, why))
    if not RENDER_SIG_RE.search(body):
        problems.append('No encuentro "vec4 render(vec2 uv)" -- revisa que sea '
                         'el contrato correcto (ver docs/04_PROMPT_PARA_IA.md).')
    return problems


def compose_for_check(index, body, channels=None):
    """Igual que validate_shaders.build_source, pero con el .frag TODAVIA
    en memoria (no escrito a disco todavia) -- para poder validar antes
    de tocar el filesystem."""
    n_inputs = 2 if index in config.MEDIA_SCENES else 1
    src = (vs._td_prologue(n_inputs)
           + shader.make_header(index, channels or config.CTRL_CHANNELS)
           + body + shader._FOOTER)
    return src


def compile_check(index, body):
    """(ok, mensaje) -- compila en los dos escenarios de validate_shaders."""
    msgs = []
    ok_all = True
    for label, channels in (('completo', None), ('sin audio', vs.CHANNELS_NO_AUDIO)):
        src = compose_for_check(index, body, channels)
        ok, out = vs._compile(src)
        if not ok:
            ok_all = False
            msgs.append('--- escenario {} ---\n{}'.format(label, vs.annotate(out, src)))
    return ok_all, '\n'.join(msgs)


def bump_n_scenes(new_total):
    """Sube N_SCENES en config.py si el nuevo total es mayor. Nunca lo baja."""
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        text = f.read()
    m = re.search(r'^N_SCENES = (\d+)', text, re.MULTILINE)
    current = int(m.group(1))
    if new_total <= current:
        return current, False
    new_text = text[:m.start()] + 'N_SCENES = {}'.format(new_total) + text[m.end():]
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        f.write(new_text)
    return new_total, True


def legend_warnings(fname, body):
    warnings = []
    legend = tdk.parse_legend(body)
    missing = [d for d in ('D1', 'D2', 'D3', 'D4', 'D5', 'D6') if d not in legend]
    if missing:
        warnings.append(
            '{}: el header no documenta {} -- el dashboard no muestra esas '
            'lineas en la Leyenda Detail (el visual funciona igual, pero '
            'conviene documentarlas, aunque sea como "reservado").'
            .format(fname, missing))
    for d, reserved in legend.items():
        if reserved:
            continue
        uname = 'u' + d
        if not re.search(r'\b{}\b'.format(uname), body):
            warnings.append('{}: @{} esta documentado pero {} no aparece en '
                            'el codigo -- perilla muerta.'.format(fname, d, uname))
    return warnings


def read_content(path):
    if path:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    if sys.stdin.isatty():
        print('Pega el .frag por stdin y termina con Ctrl+D (o pasa la ruta '
              'como argumento).', file=sys.stderr)
    return sys.stdin.read()


def collect_dir_jobs(dirpath, start_index):
    files = sorted(f for f in os.listdir(dirpath) if f.endswith('.frag'))
    if not files:
        print('No hay archivos .frag en {}'.format(dirpath))
        sys.exit(1)
    jobs = []
    idx = start_index
    for fn in files:
        slug = sanitize_slug(os.path.splitext(fn)[0])
        with open(os.path.join(dirpath, fn), 'r', encoding='utf-8') as f:
            body = f.read()
        jobs.append((idx, slug, body, fn))
        idx += 1
    return jobs


def run_jobs(jobs):
    """Valida TODOS los jobs antes de escribir NINGUNO (todo o nada)."""
    failures = []
    for index, slug, body, origin in jobs:
        existing = shader.find_visual(index)
        if existing:
            failures.append('{}: el indice {} ya esta ocupado por {} -- '
                            'usa --index para elegir otro.'
                            .format(origin, index, os.path.basename(existing)))
            continue
        problems = sanity_check(body)
        if problems:
            failures.append('{}: no pasa el chequeo basico:\n  {}'
                            .format(origin, '\n  '.join(problems)))
            continue
        ok, msg = compile_check(index, body)
        if not ok:
            failures.append('{}: NO COMPILA:\n{}'.format(origin, msg))

    if failures:
        print('NADA SE ESCRIBIO -- {} de {} escena(s) fallaron:\n'
              .format(len(failures), len(jobs)))
        for f in failures:
            print(f)
            print('')
        sys.exit(1)

    written = []
    for index, slug, body, origin in jobs:
        fname = 'scene{:02d}_{}.frag'.format(index, slug)
        dest = os.path.join(VISUALS, fname)
        with open(dest, 'w', encoding='utf-8') as f:
            f.write(body)
        written.append((index, fname, body))
        print('Escrito: visuals/{}  (de {})'.format(fname, origin))

    max_index = max(i for i, _, _, _ in jobs)
    total, bumped = bump_n_scenes(max_index + 1)
    if bumped:
        print('\nN_SCENES subido a {} en vjcore/config.py'.format(total))
    else:
        print('\nN_SCENES ya cubria el indice {} (sigue en {})'.format(max_index, total))

    warnings = []
    for index, fname, body in written:
        warnings += legend_warnings(fname, body)
    if warnings:
        print('\nAvisos (no bloquean, el visual funciona igual):')
        for w in warnings:
            print('  !!', w)

    print('\n{} escena(s) dada(s) de alta. MIDI, audio y las perillas '
          'Detail ya funcionan solas: llegan por la misma textura de '
          'control que usan todas las demas escenas, no hace falta '
          'cablear nada mas.'.format(len(written)))
    print('\nProximo paso en TouchDesigner: /project1 -> System -> '
          'Recargar Shaders, despues click en la escena nueva en el '
          'dashboard.')


def main():
    opts = parse_args(sys.argv[1:])

    if opts['dir']:
        if opts['slug'] or opts['path']:
            print('--dir no se combina con --slug ni con un archivo suelto.')
            sys.exit(1)
        start = opts['index'] if opts['index'] is not None else config.N_SCENES
        jobs = collect_dir_jobs(opts['dir'], start)
        run_jobs(jobs)
        return

    if not opts['slug']:
        print('Falta --slug (nombre corto para el archivo, ej: tunel_particulas).')
        sys.exit(1)

    body = read_content(opts['path'])
    if not body.strip():
        print('El contenido esta vacio.')
        sys.exit(1)

    index = opts['index'] if opts['index'] is not None else config.N_SCENES
    slug = sanitize_slug(opts['slug'])
    origin = opts['path'] or '(stdin)'
    run_jobs([(index, slug, body, origin)])


if __name__ == '__main__':
    main()
