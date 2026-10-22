#!/usr/bin/env python3
"""RESPLANDOR: cuanto brilla lo claro (bloom de program.py).

  1. Canal 'glow' en la textura de control y parametro Resplandor (0.5 =
     normal por defecto)
  2. MiniLab en Halloween: la tira de Mod (CC1) escribe Resplandor y ya
     no recorre la carpeta de imagenes (set.json midi_redirect)
  3. GLSL del bloom (render_resplandor.py --check), si hay moderngl:
     0 = sin glow, 0.5 = glow de siempre, 1 = lo oscuro se hunde y el
     bajo hunde aun mas
"""
import os
import re
import subprocess
import sys
import types

os.environ['TDAI_SET'] = 'halloween'
HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

import test_capas_miedo as T  # noqa: E402
from vjcore import config  # noqa: E402


def main():
    print('--- 1. Canal y parametro ---')
    T.check('canal glow en la textura de control', 'glow' in config.CTRL_CHANNELS, True)
    T.check('Resplandor -> glow', ('Resplandor', 'glow') in config.PAR_CHANNELS, True)
    with open(os.path.join(TD, 'vjcore', 'builder.py')) as f:
        b = f.read()
    m = re.search(r"add_float\(cp, 'Resplandor', '[^']*', ([0-9.]+)", b)
    T.check('Resplandor arranca en 0.5 (normal)', float(m.group(1)) if m else None, 0.5)

    print('\n--- 2. Tira de Mod en Halloween ---')
    T.check('Mediascrub -> Resplandor', config.MIDI_REDIRECT.get('Mediascrub'), 'Resplandor')
    p = T.project(Midimediascrub='ch1ctrl1', Resplandor=0.5, Mediascrub=0.25)
    cs, _, _ = T.load(p)
    with open(T.MIDI_LOGIC) as f:
        src = f.read()
    ml = types.ModuleType('midi_logic')
    ctrl = types.SimpleNamespace(module=cs)
    ml.__dict__['op'] = lambda path=None: {'/project1': p, '/project1/control_script': ctrl}.get(path)
    ml.__dict__['run'] = lambda *a, **k: None
    exec(compile(src, T.MIDI_LOGIC, 'exec'), ml.__dict__)
    ml._handle(types.SimpleNamespace(name='ch1ctrl1'), 127, False)
    T.check('tira arriba = solo lo que brilla', p.par.Resplandor.val, 1.0)
    ml._handle(types.SimpleNamespace(name='ch1ctrl1'), 0, False)
    T.check('tira abajo = sin brillo', p.par.Resplandor.val, 0.0)
    T.check('la carpeta de imagenes no se mueve', p.par.Mediascrub.val, 0.25)

    print('\n--- 3. GLSL del bloom ---')
    try:
        import moderngl  # noqa: F401
        r = subprocess.run([sys.executable, os.path.join(HERE, 'render_resplandor.py'), '--check',
                            '--set', 'halloween', '--size', '256x102', '--scenes', '0,16'],
                           capture_output=True, text=True)
        print('   ', (r.stdout.strip().splitlines() or [''])[-1])
        T.check('render_resplandor --check', r.returncode, 0)
    except ImportError:
        print('  (sin moderngl: se salta)')

    print()
    if T.fails:
        print('RESULTADO: FALLA ({})'.format(len(T.fails)))
        return 1
    print('RESULTADO: TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
