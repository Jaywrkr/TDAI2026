#!/usr/bin/env python3
"""EASTER EGG "JAY INFINITO" (fase 38).

  1. Canal 'secret' y parametro Secreton; pad 9 en Halloween = lanzarlo
  2. triggerSecret: lo pide ya; mientras dura, otra pulsada no lo reinicia
  3. Cada escena con hkEgg: se ve (render_jay.py --check) y en sus 5 s no
     pasa de 3 destellos por segundo (si hay moderngl)
"""
import os
import re
import subprocess
import sys

os.environ['TDAI_SET'] = 'halloween'
HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

from vjcore import config, shader  # noqa: E402

fails = []


def check(label, ok, extra=''):
    print('  [{}] {}{}'.format('OK' if ok else '!!', label, ('  ' + extra) if extra else ''))
    if not ok:
        fails.append(label)


def main():
    print('--- 1. Canal y pad ---')
    check('canal secret', 'secret' in config.CTRL_CHANNELS)
    check('Secreton -> secret', ('Secreton', 'secret') in config.PAR_CHANNELS)
    check('pad 9 = easter egg', config.MIDI_REDIRECT.get('Retro') == 'triggerSecret')
    with open(os.path.join(TD, 'sets', 'halloween', 'common.glsl')) as f:
        glsl = f.read()
    m = re.search(r'#define HK_EGG_LEN ([0-9.]+)', glsl)
    with open(os.path.join(TD, 'vjcore', 'dats', 'control_script.py')) as f:
        cs_src = f.read()
    m2 = re.search(r'SECRET_SECONDS = ([0-9.]+)', cs_src)
    check('mismo largo en GLSL y Python', m and m2 and float(m.group(1)) == float(m2.group(1)))

    print('\n--- 2. triggerSecret ---')
    import test_estado_seguro as S
    p = S.full_project(Secreton=-1.0)
    cs = S.load(p)
    clock = {'t': 100.0}
    cs.__dict__['_momentClock'] = lambda: clock['t']
    cs.triggerSecret()
    check('lo pide ya', p.par.Secreton.val == 100.0, str(p.par.Secreton.val))
    clock['t'] = 102.0
    cs.triggerSecret()
    check('mientras dura no se reinicia', p.par.Secreton.val == 100.0)
    clock['t'] = 106.0
    cs.triggerSecret()
    check('despues se puede pedir de nuevo', p.par.Secreton.val == 106.0)

    print('\n--- 3. Cada escena ---')
    scenes = [i for i in range(config.N_SCENES) if shader.find_visual(i) and 'hkEgg(' in shader.read_body(i)[0]]
    print('  escenas con easter egg:', ' '.join('{:02d}'.format(i) for i in scenes))
    try:
        import moderngl  # noqa: F401
    except ImportError:
        print('  (sin moderngl: se salta)')
        scenes = []
    if scenes:
        r = subprocess.run([sys.executable, os.path.join(HERE, 'render_jay.py'), '--check',
                            '--scenes', ','.join(str(i) for i in scenes)], capture_output=True, text=True)
        print(r.stdout.strip())
        check('render_jay --check', r.returncode == 0, r.stderr.strip()[-500:])

    print()
    if fails:
        print('RESULTADO: FALLA ({})'.format(len(fails)))
        return 1
    print('RESULTADO: TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
