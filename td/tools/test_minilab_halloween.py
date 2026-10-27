#!/usr/bin/env python3
"""MiniLab en Halloween: los controles redirigidos (set.json "midi_redirect").

En el set halloween, las mismas perillas/pads ya aprendidos manejan lo
nuevo del set; en el set principal hacen lo de siempre. Fase 43:

  perillas 1 y 9 (encoders relativos)  -> sin funcion
  perilla 2  (slot Hue)         -> Miedo
  perilla 4  (slot Density)     -> Estilo
  perilla 10 (slot Detail2)     -> Detail 1 ... perilla 15 (Lookamount) -> Detail 6
  perilla 16 (slot Palettelock) -> Nocheintensidad
  pad 7  -> Noche ON/OFF, pad 16 -> Momento
  pad 10 -> Linterna (apretar = On, soltar = Off), pad 14 -> Murcielagos
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
                        Midipalettelock='ch1ctrl73', Mididuallayer='ch10n43', Midiblendnext='ch1ctrl30',
                        Midienergy='ch1ctrl113', Mididetail1='ch1ctrl115', Mididetail2='ch1ctrl18',
                        Midiglitch='ch1ctrl98', Midimirror='ch1ctrl28',
                        Hue=0.0, Density=0.5, Lookamount=0.0, Palettelock=0.0, Duallayer=False,
                        Miedo=0.0, Estilo=0.0, Nocheintensidad=1.0, Nocheon=True,
                        Detail2=0.0, Detail3=0.0, Detail4=0.0, Detail5=0.0, Detail6=0.0)
ml = R.load_midi_logic(p)
cs = ml.op('/project1/control_script').module
calls = []
for fn in ('toggleNight', 'toggleDual', 'triggerMoment', 'nextBlendMode', 'linternaOn',
           'linternaOff', 'triggerMurcielagos'):
    setattr(cs, fn, (lambda f: (lambda: calls.append(f)))(fn))
ml._refreshLeds = lambda: None
ml._resetEffect = lambda *a: None
ml.run = lambda *a, **k: None
ch = lambda n: types.SimpleNamespace(name=n)
ml._handle(ch('ch1ctrl75'), 127, False)      # perilla 2
ml._handle(ch('ch1ctrl77'), 100, False)      # perilla 4
ml._handle(ch('ch1ctrl18'), 127, False)      # perilla 10
ml._handle(ch('ch1ctrl80'), 127, False)      # perilla 15
ml._handle(ch('ch1ctrl73'), 0, False)        # perilla 16
energy0 = p.par.Energy.val
ml._handle(ch('ch1ctrl113'), 65, False)      # perilla 1
ml._handle(ch('ch1ctrl115'), 65, False)      # perilla 9
ml._handle(ch('ch10n43'), 1, True)           # pad 7
ml._handle(ch('ch1ctrl30'), 127, True)       # pad 16
ml._handle(ch('ch1ctrl98'), 127, True)       # pad 10 apretar
ml.onOnToOff(ch('ch1ctrl98'), 0, 0, 127)     # pad 10 soltar
ml._handle(ch('ch1ctrl28'), 127, True)       # pad 14
print(repr(dict(miedo=p.par.Miedo.val, hue=p.par.Hue.val, est=p.par.Estilo.val, dens=p.par.Density.val,
                d1=p.par.Detail1.val, d6=p.par.Detail6.val, d2=p.par.Detail2.val,
                noche=p.par.Nocheintensidad.val, look=p.par.Lookamount.val,
                energy=(energy0, p.par.Energy.val), calls=calls, redirect=config.MIDI_REDIRECT)))
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
    check('perilla 2 -> Miedo (y Hue no se toca)', abs(r['miedo'] - 1.0) < 1e-6 and r['hue'] == 0.0, r)
    check('perilla 4 -> Estilo (y Density no se toca)', abs(r['est'] - 100 / 127.0) < 1e-6 and r['dens'] == 0.5)
    check('perilla 10 -> Detail 1 (y Detail 2 no se toca)', abs(r['d1'] - 1.0) < 1e-6 and r['d2'] == 0.0, r)
    check('perilla 15 -> Detail 6 (y Look no se toca)', abs(r['d6'] - 1.0) < 1e-6 and r['look'] == 0.0, r)
    check('perilla 16 -> Noche (intensidad)', r['noche'] == 0.0)
    check('perillas 1 y 9 no hacen nada', r['energy'][0] == r['energy'][1], r['energy'])
    check('pad 7 -> Noche, pad 16 -> Momento', r['calls'][:2] == ['toggleNight', 'triggerMoment'], r['calls'])
    check('pad 10 -> Linterna al apretar y al soltar', r['calls'][2:4] == ['linternaOn', 'linternaOff'], r['calls'])
    check('pad 14 -> Murcielagos', r['calls'][4:] == ['triggerMurcielagos'], r['calls'])
    print('SET tdai2026 (el de siempre)')
    r = run('tdai2026')
    check('sin redireccion', r['redirect'] == {})
    check('perilla 2 sigue siendo Hue', abs(r['hue'] - 1.0) < 1e-6 and r['miedo'] == 0.0)
    check('pad 7 sigue siendo Dos Capas', r['calls'][:1] == ['toggleDual'], r['calls'])
    check('pad 16 sigue siendo Modo Mezcla', r['calls'][1:2] == ['nextBlendMode'], r['calls'])
    print()
    print('TODO OK' if not fails else 'FALLAS: {}'.format(fails))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
