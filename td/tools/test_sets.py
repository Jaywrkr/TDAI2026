#!/usr/bin/env python3
"""Sets de visuales: el nucleo es uno, cada show es un set.

    python3 td/tools/test_sets.py

- El set por defecto (tdai2026) queda EXACTAMENTE como antes: 98 escenas
  en td/visuals/, logica "reciente" desde la 58, audioDanceUV prendido.
- Cada set de td/sets/<nombre>/ carga su set.json, cuenta sus escenas,
  tiene una .frag por indice, documenta y usa sus 6 Detail, y compila
  (header + .frag + footer) en los dos escenarios de validate_shaders.
- RUN_ME.py elige el set; el build lo recuerda; las herramientas lo
  aceptan con --set.
"""
import glob
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
FAILS = []


def check(label, cond, detail=''):
    print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                               ('  -> ' + str(detail)) if detail else ''))
    if not cond:
        FAILS.append(label)


def probe(set_name):
    """Lee config/shader en un proceso aparte con TDAI_SET puesto."""
    code = (
        'import sys, json; sys.path.insert(0, %r)\n'
        'from vjcore import config, shader\n'
        'h = shader.make_header(0, config.CTRL_CHANNELS)\n'
        'print(json.dumps({"name": config.SET_NAME, "n": config.N_SCENES,'
        ' "modern": config.MODERN_FROM, "dance": config.AUDIO_DANCE,'
        ' "media": sorted(config.MEDIA_SCENES), "visuals": shader.visuals_dir(),'
        ' "thumbs": config.THUMBS_DIRNAME, "presets": config.PRESETS_FILE,'
        ' "rows": config.GRID_ROWS, "header": h,'
        ' "out": [config.DEFAULT_OUTPUT_W, config.DEFAULT_OUTPUT_H],'
        ' "found": [bool(shader.find_visual(i)) for i in range(config.N_SCENES)]}))\n'
        % TD)
    env = dict(os.environ, TDAI_SET=set_name)
    out = subprocess.run([sys.executable, '-c', code], env=env,
                         capture_output=True, text=True)
    return json.loads(out.stdout.strip().splitlines()[-1]), out.stdout


def main():
    print('SET POR DEFECTO (tdai2026)')
    d, _ = probe('tdai2026')
    check('98 escenas en td/visuals', d['n'] == 98 and
          d['visuals'].endswith(os.path.join('td', 'visuals')), d['n'])
    check('logica reciente desde la 58 y audioDanceUV prendido',
          d['modern'] == 58 and d['dance'] is True)
    check('header lo dice', '#define MODERN_FROM 58' in d['header']
          and '#define AUDIO_DANCE 1' in d['header'])
    check('presets.json de siempre', d['presets'] == 'presets.json')
    check('salida 1280x720 de siempre', d['out'] == [1280, 720], d['out'])

    sets_dir = os.path.join(TD, 'sets')
    names = sorted(n for n in os.listdir(sets_dir)
                   if os.path.isfile(os.path.join(sets_dir, n, 'set.json')))
    check('hay al menos un set extra', bool(names), names)
    for name in names:
        print('SET', name)
        d, raw = probe(name)
        check('carga su set.json (no cae al de por defecto)',
              d['name'] == name, d['name'])
        check('una .frag por cada indice 0..{}'.format(d['n'] - 1),
              d['n'] > 0 and all(d['found']))
        check('visuals/ propia', os.path.join('sets', name) in d['visuals'])
        check('miniaturas y presets propios',
              name in d['thumbs'] and name in d['presets'])
        with open(os.path.join(sets_dir, name, 'set.json')) as f:
            sj = json.load(f)
        check('MODERN_FROM y AUDIO_DANCE del set.json en el header',
              '#define MODERN_FROM {}'.format(sj.get('modern_from', 0)) in d['header']
              and '#define AUDIO_DANCE {}'.format(1 if sj.get('audio_dance') else 0)
              in d['header'])
        if sj.get('output'):
            check('salida del set.json, dentro del tope 1280',
                  d['out'] == sj['output'] and max(d['out']) <= 1280, d['out'])
        for i in sj.get('media_scenes', []):
            check('escena de media {} existe'.format(i), i < d['n'])
        vis = d['visuals']
        for fn in sorted(os.listdir(vis)):
            if not re.match(r'scene\d+_.*\.frag$', fn):
                continue
            body = open(os.path.join(vis, fn), encoding='utf-8').read()
            legend = set(re.findall(r'//\s*@D([1-6])\s*:', body))
            code = re.sub(r'//[^\n]*', '', body)
            used = set(re.findall(r'\buD([1-6])\b', code))
            check('{}: documenta y usa las 6 Detail'.format(fn),
                  legend == set('123456') and used == set('123456'),
                  'leyenda {} uso {}'.format(sorted(legend), sorted(used)))
            check('{}: sin main()/uBright'.format(fn),
                  'void main' not in code and 'uBright' not in code)
        r = subprocess.run([sys.executable, os.path.join(HERE, 'validate_shaders.py')],
                           env=dict(os.environ, TDAI_SET=name),
                           capture_output=True, text=True)
        tail = (r.stdout.strip().splitlines() or [''])[-1]
        check('compila todo el set (glslangValidator)', r.returncode == 0, tail)
        # laminas: PNG por escena, dentro del tope de 1280 px de la licencia
        code = ('import sys, json; sys.path.insert(0, %r)\n'
                'from vjcore import config, shader\n'
                'print(json.dumps({str(k): [v, shader.plates_header(k).count("vec4 plate")]'
                ' for k, v in config.PLATES.items()}))\n' % TD)
        out = subprocess.run([sys.executable, '-c', code], env=dict(os.environ, TDAI_SET=name),
                             capture_output=True, text=True)
        plates = json.loads(out.stdout.strip().splitlines()[-1])
        from PIL import Image
        for k, (files, nfun) in sorted(plates.items(), key=lambda kv: int(kv[0])):
            sizes = [Image.open(f).size for f in files]
            check('laminas de la escena {}: {} PNG <= 1280 px y sus plateN()'.format(k, len(files)),
                  all(max(sz) <= 1280 for sz in sizes) and nfun >= 2 * len(files), sizes)
            # atlas (build_atlas.py): tambien dentro del tope de 1280 px
            for a in sorted(glob.glob(os.path.join(os.path.dirname(files[0]), 'atlas*.png'))):
                check('atlas {} de la escena {} <= 1280 px'.format(os.path.basename(a), k),
                      max(Image.open(a).size) <= 1280, Image.open(a).size)

    print('ELECCION DEL SET')
    run_me = open(os.path.join(TD, 'RUN_ME.py'), encoding='utf-8').read()
    check("RUN_ME.py tiene SET = '...' y lo pasa a TDAI_SET",
          re.search(r"^SET = '\w+'", run_me, re.M) is not None
          and "os.environ['TDAI_SET'] = SET" in run_me)
    b = open(os.path.join(TD, 'vjcore', 'builder.py'), encoding='utf-8').read()
    check('el build recuerda el set (active_set.txt)',
          'config.save_active_set()' in b)
    a = open(os.path.join(HERE, 'add_scene.py'), encoding='utf-8').read()
    check('add_scene.py acepta --set', "'--set' in sys.argv" in a)

    print()
    if FAILS:
        print('FALLARON {}: {}'.format(len(FAILS), FAILS))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
