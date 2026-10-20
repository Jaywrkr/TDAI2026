#!/usr/bin/env python3
"""MiniLab en Halloween: los controles redirigidos (set.json "midi_redirect").

En el set halloween, las mismas perillas/pads ya aprendidos manejan lo
nuevo del set; en el set principal hacen lo de siempre.

  perilla 2  (slot Hue)         -> Estilopaleta
  perilla 4  (slot Density)     -> Estilo
  perilla 15 (slot Lookamount)  -> Nocheintensidad
  perilla 16 (slot Palettelock) -> Estilomarco
  pad 7      (slot Duallayer)   -> toggleNight (Noche ON/OFF)
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

CODE = r'''
import os, sys, types
sys.path.insert(0, %r); sys.path.insert(0, %r)
import test_perillas_relativas as R
from vjcore import config
p = R.project_with_midi(Midihue='ch1ctrl75', Mididensity='ch1ctrl77', Midilookamount='ch1ctrl80',
                        Midipalettelock='ch1ctrl73', Mididuallayer='ch10n43',
                        Hue=0.0, Density=0.5, Lookamount=0.0, Palettelock=0.0, Duallayer=False,
                        Estilopaleta=0.0, Estilo=0.0, Nocheintensidad=1.0, Estilomarco=0.0, Nocheon=True)
ml = R.load_midi_logic(p)
cs = ml.op('/project1/control_script').module
calls = []
cs.toggleNight = lambda: calls.append('night')
cs.toggleDual = lambda: calls.append('dual')
ml._refreshLeds = lambda: None
ml._handle(types.SimpleNamespace(name='ch1ctrl75'), 127, False)
ml._handle(types.SimpleNamespace(name='ch1ctrl77'), 100, False)
ml._handle(types.SimpleNamespace(name='ch1ctrl80'), 0, False)
ml._handle(types.SimpleNamespace(name='ch1ctrl73'), 127, False)
ml._handle(types.SimpleNamespace(name='ch10n43'), 1, True)
print(repr(dict(pal=p.par.Estilopaleta.val, hue=p.par.Hue.val, est=p.par.Estilo.val, dens=p.par.Density.val,
                noche=p.par.Nocheintensidad.val, look=p.par.Lookamount.val, marco=p.par.Estilomarco.val,
                calls=calls, redirect=config.MIDI_REDIRECT)))
''' % (os.path.dirname(HERE), HERE)


def run(set_name):
    env = dict(os.environ, TDAI_SET=set_name)
    out = subprocess.run([sys.executable, '-c', CODE], env=env, capture_output=True, text=True)
    if out.returncode:
        print(out.stdout, out.stderr)
        raise SystemExit(1)
    return eval(out.stdout.strip().splitlines()[-1])


def main():
    fails = []

    def check(label, cond, detail=''):
        print('  [{}] {}{}'.format('OK' if cond else '!!', label, ('  -> ' + str(detail)) if detail else ''))
        if not cond:
            fails.append(label)

    print('SET halloween')
    r = run('halloween')
    check('perilla 2 -> Paleta del estilo (y Hue no se toca)', abs(r['pal'] - 1.0) < 1e-6 and r['hue'] == 0.0, r)
    check('perilla 4 -> Estilo (y Density no se toca)', abs(r['est'] - 100 / 127.0) < 1e-6 and r['dens'] == 0.5)
    check('perilla 15 -> Noche (intensidad, 0 = sin efecto)', r['noche'] == 0.0 and r['look'] == 0.0)
    check('perilla 16 -> Marco de arco', abs(r['marco'] - 1.0) < 1e-6)
    check('pad 7 -> Noche ON/OFF (no Dos Capas)', r['calls'] == ['night'], r['calls'])
    print('SET tdai2026 (el de siempre)')
    r = run('tdai2026')
    check('sin redireccion', r['redirect'] == {})
    check('perilla 2 sigue siendo Hue', abs(r['hue'] - 1.0) < 1e-6 and r['pal'] == 0.0)
    check('pad 7 sigue siendo Dos Capas', r['calls'] == ['dual'], r['calls'])
    print()
    print('TODO OK' if not fails else 'FALLAS: {}'.format(fails))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
