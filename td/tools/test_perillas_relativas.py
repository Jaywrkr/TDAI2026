#!/usr/bin/env python3
"""Perillas absolutas y relativas en midi_logic._handle().

Se prueba fuera de TD con el mismo arnes que test_layout_v2.py: se
ejecuta midi_logic.py de verdad (sin mockear _norm01, para que
_relativePosition vea los valores RAW 0..127 que manda un CHOP MIDI).

Fase 29: la lectura relativa ya no se adivina. Antes, una perilla
ABSOLUTA cuyo primer valor caia cerca de la mitad (58..70) quedaba leida
como relativa y sumaba pasos en vez de tomar su posicion. Ahora solo se
lee relativo un canal declarado en config.RELATIVE_CHANNELS.

Casos:
  1. Una perilla absoluta se lee val/127, aunque arranque en la mitad y
     se mueva despacio por la zona central (el bug de antes).
  2. Un canal declarado relativo ACUMULA pasos (65 = +1, 63 = -1).
  3. Si ese canal manda un valor bien afuera de la banda, se confirma
     absoluto y deja de acumular.
  4. Dos canales distintos no se pisan entre si.
  5. La tira de pitch nunca pasa por la lectura relativa.
"""
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

import test_estado_seguro as T  # noqa: E402
from vjcore import config  # noqa: E402

MIDI_LOGIC = os.path.join(TD, 'vjcore', 'dats', 'midi_logic.py')


def load_midi_logic(p):
    cs = T.load(p)
    with open(MIDI_LOGIC) as f:
        src = f.read()
    ml = types.ModuleType('midi_logic')
    ctrl = types.SimpleNamespace(module=cs)

    def fake_op(path=None):
        return {'/project1': p, '/project1/control_script': ctrl}.get(path)

    ml.__dict__['op'] = fake_op
    ml.__dict__['run'] = lambda *a, **k: None
    exec(compile(src, MIDI_LOGIC, 'exec'), ml.__dict__)
    return ml


def project_with_midi(**extra):
    pars = {'Midi' + s.lower(): '' for s in config.MIDI_SLOTS}
    pars.update(Energy=0.5, Energyactive=True, Detail1=0.0, Repopath='')
    pars.update(extra)
    return T.FakeProject(**pars)


def main():
    fails = []

    def check(label, got, want, tol=1e-6):
        ok = abs(got - want) < tol if isinstance(want, float) else got == want
        print('  [{}] {}  -> {!r}{}'.format('OK' if ok else '!!', label, got,
                                          '' if ok else '  ESPERABA {!r}'.format(want)))
        if not ok:
            fails.append(label)

    print('--- Perilla NORMAL (absoluta): toma su posicion ---')
    p = project_with_midi(Midienergy='ch1ctrl74')
    ml = load_midi_logic(p)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 100, False)
    check('valor absoluto de siempre', p.par.Energy.val, 100 / 127.0)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 20, False)
    check('salta directo a la nueva posicion (no acumula)',
          p.par.Energy.val, 20 / 127.0)

    print('\n--- Absoluta que ARRANCA en la mitad y se mueve despacio (el bug) ---')
    p = project_with_midi(Mididetail2='ch1ctrl19', Detail2=0.0)
    ml = load_midi_logic(p)
    for v in (64, 65, 66, 67, 66, 65):
        ml._handle(types.SimpleNamespace(name='ch1ctrl19'), v, False)
    check('queda en su posicion real (65/127), no suma pasos',
          p.par.Detail2.val, 65 / 127.0)

    print('\n--- Canal declarado RELATIVO (config.RELATIVE_CHANNELS) ---')
    old = list(config.RELATIVE_CHANNELS)
    config.RELATIVE_CHANNELS[:] = ['ch1ctrl74', 'ch1ctrl18']
    try:
        p = project_with_midi(Midienergy='ch1ctrl74')
        ml = load_midi_logic(p)
        ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 65, False)  # +1
        check('primer paso: sube', p.par.Energy.val, 0.5 + 1 / 127.0)
        ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 65, False)
        ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 65, False)
        check('varios pasos hacia arriba: acumula', p.par.Energy.val, 0.5 + 3 / 127.0)
        ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 63, False)  # -1
        check('un paso hacia abajo', p.par.Energy.val, 0.5 + 2 / 127.0)

        print('\n--- Confirma absoluta si algun dia manda un valor lejos de 64 ---')
        ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 10, False)
        check('valor bien afuera de la banda se toma tal cual', p.par.Energy.val, 10 / 127.0)
        ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 65, False)
        check('confirmada absoluta: ya no vuelve a acumular', p.par.Energy.val, 65 / 127.0)

        print('\n--- Dos canales relativos no se pisan ---')
        p = project_with_midi(Midienergy='ch1ctrl74', Mididetail1='ch1ctrl18')
        ml = load_midi_logic(p)
        ml._handle(types.SimpleNamespace(name='ch1ctrl18'), 65, False)
        ml._handle(types.SimpleNamespace(name='ch1ctrl18'), 65, False)
        check('Detail1 (relativo) acumula independiente', p.par.Detail1.val, 0.5 + 2 / 127.0)
        ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 90, False)
        check('Energy (otro canal) toma su valor', p.par.Energy.val, 90 / 127.0)
    finally:
        config.RELATIVE_CHANNELS[:] = old

    print('\n--- La tira de pitch (Detail6) nunca pasa por deteccion relativa ---')
    p = project_with_midi(Mididetail6='ch1pitch', Detail6=0.0)
    ml = load_midi_logic(p)
    ml._handle(types.SimpleNamespace(name='ch1pitch'), 0.0, False)  # centro real de pitch
    check('pitch centrado -> 0.5 (via _norm01, no relativo)', p.par.Detail6.val, 0.5)

    print()
    if fails:
        print('FALLOS:', fails)
        sys.exit(1)
    print('RESULTADO: TODO OK')


if __name__ == '__main__':
    main()
