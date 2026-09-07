#!/usr/bin/env python3
"""Testea la logica pura de setlist / bancos / navegacion de
control_script.py, con los globales de TouchDesigner stubbeados.

Es lo unico de la Fase 5 que se puede verificar de verdad fuera de TD:
todo lo demas depende de nodos reales. Y es justo donde viven los
off-by-one (wraparound, escena fuera del setlist, tokens mal tipeados).
"""
import os
import sys
import types

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vjcore.config import N_SCENES  # noqa: E402


class FakePar:
    def __init__(self, v):
        self.val = v

    def eval(self):
        return self.val


class FakePars:
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, FakePar(v))


class FakeProject:
    def __init__(self, **pars):
        self.par = FakePars(**pars)
        self._store = {}

    def fetch(self, k, d=None):
        return self._store.get(k, d)

    def store(self, k, v):
        self._store[k] = v


def load_control_script(proj, scenes_valid, N=None):
    """Carga control_script.py con los globales de TD stubbeados."""
    path = '/home/user/TDAI2026/td/vjcore/dats/control_script.py'
    with open(path) as f:
        src = f.read()
    mod = types.ModuleType('control_script')

    def fake_op(p=None):
        if p in ('/project1', None):
            return proj
        return None

    mod.__dict__['op'] = fake_op
    mod.__dict__['run'] = lambda *a, **k: None
    mod.__dict__['project'] = types.SimpleNamespace(cookRate=60.0)
    mod.__dict__['absTime'] = types.SimpleNamespace(seconds=0.0)
    exec(compile(src, path, 'exec'), mod.__dict__)
    # _valid depende de nodos reales; para el test, todas validas
    mod.__dict__['_valid'] = lambda i: i in scenes_valid
    n = N if N is not None else N_SCENES
    mod.__dict__['_n_scenes'] = lambda: n
    return mod


def main():
    fails = []

    def check(label, got, want):
        ok = got == want
        print('  [{}] {}  -> {!r}{}'.format(
            'OK' if ok else '!!', label, got,
            '' if ok else '  ESPERABA {!r}'.format(want)))
        if not ok:
            fails.append(label)

    valid = set(range(N_SCENES))

    print('--- parser del setlist ---')
    for raw, want in [
        ('0, 4, 17, 23', [0, 4, 17, 23]),
        ('0 4 17 23', [0, 4, 17, 23]),        # espacios
        ('0,4 17,23', [0, 4, 17, 23]),        # mezcla
        ('', []),                              # vacio
        ('   ', []),                           # solo espacios
        ('0, 99, 4', [0, 4]),                  # fuera de rango se descarta
        ('0, abc, 4', [0, 4]),                 # basura se descarta
        ('0, -3, 4', [0, 4]),                  # negativo se descarta
        ('5, 5, 5', [5, 5, 5]),                # repetidos se permiten
    ]:
        proj = FakeProject(Setlist=raw, Usesetlist=True)
        m = load_control_script(proj, valid)
        check('setlist({!r})'.format(raw), m._setlist(), want)

    print('\n--- navegacion con setlist ---')
    proj = FakeProject(Setlist='3, 10, 25', Usesetlist=True,
                       Activeindex=10, Targetindex=10, Duallayer=False)
    m = load_control_script(proj, valid)
    check('next desde 10 (medio)', m._step(1), 25)
    check('prev desde 10 (medio)', m._step(-1), 3)

    proj.par.Activeindex.val = 25
    check('next desde 25 (ultimo) da la vuelta', m._step(1), 3)
    proj.par.Activeindex.val = 3
    check('prev desde 3 (primero) da la vuelta', m._step(-1), 25)

    # escena que NO esta en el setlist (elegida a mano en la grilla)
    proj.par.Activeindex.val = 17
    check('next desde fuera del setlist entra por el principio',
          m._step(1), 3)
    check('prev desde fuera del setlist entra por el final',
          m._step(-1), 25)

    print('\n--- navegacion SIN setlist (comportamiento de siempre) ---')
    # El wraparound se prueba contra la ULTIMA escena que exista, no
    # contra un numero escrito a mano: si no, agregar escenas convierte
    # este caso en "de la 33 a la 0", que ya no es el borde.
    last = N_SCENES - 1
    proj = FakeProject(Setlist='3, 10, 25', Usesetlist=False,
                       Activeindex=last, Targetindex=last, Duallayer=False)
    m = load_control_script(proj, valid)
    check('next desde {} (ultima) da la vuelta a 0'.format(last),
          m._step(1), 0)
    proj.par.Activeindex.val = 0
    check('prev desde 0 da la vuelta a {}'.format(last),
          m._step(-1), last)

    print('\n--- setlist activo pero VACIO: no debe romper nada ---')
    proj = FakeProject(Setlist='', Usesetlist=True,
                       Activeindex=5, Targetindex=5, Duallayer=False)
    m = load_control_script(proj, valid)
    check('cae al recorrido normal', m._step(1), 6)

    print('\n--- cantidad de bancos ---')
    # Los esperados se derivan de N_SCENES, no escritos a mano: al sumar
    # escenas (34 -> 36) este test tiene que seguir siendo valido sin
    # tocarlo, si no deja de proteger nada.
    import math as _math
    for size in (8, 16, N_SCENES, 1, 5):
        proj = FakeProject(Banksize=size, Bank=0)
        m = load_control_script(proj, valid)
        want = int(_math.ceil(N_SCENES / float(size)))
        check('{} escenas en bancos de {}'.format(N_SCENES, size),
              m._bankCount(), want)

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
