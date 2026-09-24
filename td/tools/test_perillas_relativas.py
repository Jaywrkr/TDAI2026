#!/usr/bin/env python3
"""Perillas 1 y 9 (modo relativo de fabrica del MiniLab mkII): que
_handle() no se quede mudo si el controlador nunca se paso a Absolute.

Se prueba fuera de TD con el mismo arnes que test_layout_v2.py: se
ejecuta midi_logic.py de verdad (sin mockear _norm01 esta vez, para que
_relativePosition vea los valores RAW 0..127 que manda un CHOP MIDI).

Casos:
  1. Una perilla que manda 0..127 de verdad (absoluta, como las 14 que ya
     funcionan) se comporta exactamente igual que antes: la posicion es
     val/127.0.
  2. Una perilla en modo relativo (solo manda numeros pegados a 64, nunca
     los extremos) ACUMULA en vez de quedarse en ~0.5 para siempre: cada
     paso hacia arriba/abajo mueve el valor.
  3. Si esa misma perilla de golpe manda un valor bien afuera de la banda
     angosta (alguien la paso a Absolute a mitad de show, o total nunca
     fue relativa), se confirma absoluta para siempre y deja de acumular.
  4. Dos canales distintos no se pisan entre si (cada uno con su propio
     estado guardado).
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

    print('--- Perilla NORMAL (absoluta, como siempre): sin cambios ---')
    p = project_with_midi(Midienergy='ch1ctrl74')
    ml = load_midi_logic(p)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 100, False)
    check('valor absoluto de siempre', p.par.Energy.val, 100 / 127.0)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 20, False)
    check('salta directo a la nueva posicion (no acumula)',
          p.par.Energy.val, 20 / 127.0)

    print('\n--- Perilla 1 en modo RELATIVO de fabrica (nunca sale de 58..70) ---')
    p = project_with_midi(Midienergy='ch1ctrl74')
    ml = load_midi_logic(p)
    # Arranca en 0.5 (centro) y cada paso +1/-1 mueve 1/127.
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 65, False)  # +1
    check('primer paso: sube', p.par.Energy.val, 0.5 + 1 / 127.0)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 65, False)  # +1
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 65, False)  # +1
    check('varios pasos hacia arriba: acumula (no se queda mudo)',
          p.par.Energy.val, 0.5 + 3 / 127.0)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 63, False)  # -1
    check('un paso hacia abajo', p.par.Energy.val, 0.5 + 2 / 127.0)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 66, False)  # +2 (giro rapido)
    check('paso mas grande girando rapido', p.par.Energy.val, 0.5 + 4 / 127.0)

    print('\n--- Confirma absoluta si algun dia manda un valor lejos de 64 ---')
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 10, False)
    check('valor bien afuera de la banda se toma tal cual', p.par.Energy.val, 10 / 127.0)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 65, False)
    check('confirmada absoluta: ya no vuelve a acumular', p.par.Energy.val, 65 / 127.0)

    print('\n--- Perilla 9 (Detail1) con su propio estado, no se pisa con otro canal ---')
    p = project_with_midi(Midienergy='ch1ctrl74', Mididetail1='ch1ctrl18')
    ml = load_midi_logic(p)
    ml._handle(types.SimpleNamespace(name='ch1ctrl18'), 65, False)
    ml._handle(types.SimpleNamespace(name='ch1ctrl18'), 65, False)
    check('Detail1 (relativo) acumula independiente', p.par.Detail1.val, 0.5 + 2 / 127.0)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 90, False)
    check('Energy (canal distinto) sigue absoluto sin verse afectado',
          p.par.Energy.val, 90 / 127.0)

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
