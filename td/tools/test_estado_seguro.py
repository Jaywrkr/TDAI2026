#!/usr/bin/env python3
"""Testea las tres funciones cuyo trabajo es dejar el rig en un estado
PREDECIBLE: resetControls(), panic() y la escalera del failsafe.

Por que existe: las tres se aprietan cuando algo ya salio mal y no hay
tiempo de mirar la pantalla de parametros. Un modo que sobrevive a un
Reset o a un PANICO no da error -- simplemente sigue prendido, invisible,
y te enteras cuando el proximo click hace algo que no esperabas. Es
exactamente el tipo de fallo que ningun test de compilacion ve.

Lo que se verifica:
  1. Reset lleva a cero TODAS las perillas, incluidas audio y brillo
  2. Reset apaga todos los modos (blackout, autopilot, energia, lock de
     media, cue) y deja las perillas centradas en su neutro
  3. Reset NO cambia de escena -- el pedido explicito era "manteniendo el
     visual en el que esta"
  4. Panic apaga los mismos modos, prende el blackout y va a la escena 0
  5. La escalera del failsafe recorre TODOS sus escalones, incluido el
     ultimo (resolucion), y se frena ahi
  6. La escalera sigue completa si se le agrega un escalon -- que es el
     bug que tenia: el tope estaba escrito a mano
"""
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

CONTROL_SCRIPT = os.path.join(TD, 'vjcore', 'dats', 'control_script.py')


class FakePar:
    def __init__(self, v):
        self.val = v

    def eval(self):
        return self.val


class FakePars:
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, FakePar(v))

    def __setattr__(self, k, v):
        # p.par.X = True (sin .val) tiene que escribir el valor, no
        # reemplazar el objeto parametro -- igual que en TD.
        cur = self.__dict__.get(k)
        if isinstance(cur, FakePar) and not isinstance(v, FakePar):
            cur.val = v
        else:
            self.__dict__[k] = v


class FakeProject:
    def __init__(self, **pars):
        self.par = FakePars(**pars)
        self._store = {}

    def fetch(self, k, d=None):
        return self._store.get(k, d)

    def store(self, k, v):
        self._store[k] = v

    def unstore(self, k):
        self._store.pop(k, None)


def full_project(**overrides):
    """Un /project1 con TODO prendido y subido, para que el reset tenga
    algo real que apagar."""
    pars = dict(
        Speed=0.9, Density=0.8, Hue=0.7, Chaos=0.9, Brightness=1.0,
        Audioamount=1.0, Bassamount=1.0, Midamount=1.0, Highamount=1.0,
        Detail1=0.9, Detail2=0.9, Detail3=0.9,
        Detail4=0.9, Detail5=0.9, Detail6=0.9,
        Grain=1.0, Glitch=1.0, Pixelate=1.0, Strobe=1.0,
        Invert=1.0, Mirror=1.0, Zoom=1.0, Posterize=1.0,
        Trails=0.8, Layermix=0.7, Lookamount=0.9, Palettelock=0.9,
        Energy=0.9, Trailszoom=0.0, Trailsrotate=1.0,
        Blackout=False, Autopilot=True, Energyactive=True,
        Medialock=True, Cuemode=True, Duallayer=False,
        Activeindex=17, Targetindex=17, Previewindex=5,
        Outputwidth=1280, Outputheight=720,
        Failsafelevel=0, Usepresets=False, Transitionseconds=0.45,
        Look=0, Palettehue=0.55, Palettespread=0.3, Activelayer=0,
        Mediafolder='', Mediaindex=0, Mediagen=0, Mediamode=0,
        Mediaseconds=0.0, Mediabeats=4, Mediashuffle=False,
        Banksize=8, Bank=0, Setlist='', Usesetlist=False,
        Prewarmframes=2, Performancemode=True, Previewall=False,
        Xfadetarget=0.0, Safestartblackout=True,
    )
    pars.update(overrides)
    return FakeProject(**pars)


class FakeSwitch:
    """Los Switch TOP del bus A/B. Sin ellos selectScene() corta antes de
    hacer nada y el test de panic() daria un falso negativo."""
    def __init__(self):
        self.par = FakePars(index=0)


def load(proj, switches=None):
    with open(CONTROL_SCRIPT) as f:
        src = f.read()
    mod = types.ModuleType('control_script')

    def fake_op(path=None):
        if path in ('/project1', None):
            return proj
        if switches is not None and path in ('/project1/program_a',
                                             '/project1/program_b'):
            return switches[path[-1]]
        return None

    mod.__dict__['op'] = fake_op
    mod.__dict__['run'] = lambda *a, **k: None
    mod.__dict__['project'] = types.SimpleNamespace(cookRate=60.0)
    mod.__dict__['absTime'] = types.SimpleNamespace(seconds=0.0)
    exec(compile(src, CONTROL_SCRIPT, 'exec'), mod.__dict__)
    # Estos tocan nodos reales que no existen fuera de TD.
    mod.__dict__['setSceneCooking'] = lambda *a, **k: None
    mod.__dict__['updateHighlight'] = lambda *a, **k: None
    mod.__dict__['updateDetailLegend'] = lambda *a, **k: None
    mod.__dict__['_valid'] = lambda i: True
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

    print('--- RESET: todo a cero ---')
    p = full_project()
    m = load(p)
    m.resetControls()
    for name in m._RESET_TO_ZERO:
        v = getattr(p.par, name).val
        if v != 0.0:
            check('{} a cero'.format(name), v, 0.0)
    check('las {} perillas de _RESET_TO_ZERO quedaron en 0'.format(
        len(m._RESET_TO_ZERO)),
        all(getattr(p.par, n).val == 0.0 for n in m._RESET_TO_ZERO), True)
    check('   incluido el master de audio', p.par.Audioamount.val, 0.0)
    check('   incluidas las 3 bandas',
          [p.par.Bassamount.val, p.par.Midamount.val, p.par.Highamount.val],
          [0.0, 0.0, 0.0])
    check('   incluido el brillo', p.par.Brightness.val, 0.0)

    print('\n--- RESET: perillas centradas a su NEUTRO, no a cero ---')
    for name, want in m._RESET_TO_NEUTRAL:
        check('{} al neutro'.format(name), getattr(p.par, name).val, want)

    print('\n--- RESET: ningun modo sobrevive invisible ---')
    for name in ('Blackout', 'Autopilot', 'Energyactive', 'Medialock',
                 'Cuemode'):
        check('{} apagado'.format(name), bool(getattr(p.par, name).val), False)

    print('\n--- RESET: NO cambia de escena ---')
    check('sigue en la escena 17', p.par.Activeindex.val, 17)

    print('\n--- PANICO ---')
    p = full_project()
    sw = {'a': FakeSwitch(), 'b': FakeSwitch()}
    m = load(p, switches=sw)
    m.panic()
    check('blackout prendido', bool(p.par.Blackout.val), True)
    # Activeindex recien llega a 0 cuando TERMINA el fundido (_finishFade,
    # que corre con delay). Lo que panic() garantiza en el acto es que el
    # destino es la escena 0 y que el fundido arranco.
    check('destino: escena 0', p.par.Targetindex.val, 0)
    check('el lado entrante quedo cargado con la escena 0',
          sw['b'].par.index.val, 0)
    check('el fundido arranco', bool(p.fetch('transitioning')), True)
    for name in ('Grain', 'Glitch', 'Pixelate', 'Strobe', 'Invert',
                 'Mirror', 'Zoom', 'Posterize', 'Trails',
                 'Lookamount', 'Palettelock'):
        v = getattr(p.par, name).val
        if v != 0.0:
            check('{} a cero'.format(name), v, 0.0)
    check('los 11 efectos a cero',
          all(getattr(p.par, n).val == 0.0 for n in
              ('Grain', 'Glitch', 'Pixelate', 'Strobe', 'Invert', 'Mirror',
               'Zoom', 'Posterize', 'Trails', 'Lookamount', 'Palettelock')),
          True)
    for name in ('Autopilot', 'Cuemode', 'Medialock'):
        check('{} apagado'.format(name), bool(getattr(p.par, name).val), False)

    print('\n--- FAILSAFE: la escalera se recorre entera ---')
    p = full_project(Trails=0.8, Duallayer=True)
    m = load(p)
    n_steps = len(m._FAILSAFE_STEPS)
    check('el tope se deriva de la lista, no esta escrito a mano',
          m._FAILSAFE_MAX_LEVEL, n_steps + 1)

    for i in range(n_steps):
        m.failsafeStep()
        check('escalon {} ({}) aplicado'.format(i + 1, m._FAILSAFE_STEPS[i][0]),
              getattr(p.par, m._FAILSAFE_STEPS[i][1]).val,
              m._FAILSAFE_STEPS[i][2])

    # El ultimo escalon es el de resolucion: el mas efectivo, y el que el
    # tope escrito a mano dejaba inalcanzable en cuanto crecia la lista.
    m.failsafeStep()
    check('ultimo escalon: ancho al 70%', p.par.Outputwidth.val, int(1280 * 0.7))
    check('ultimo escalon: alto al 70%', p.par.Outputheight.val, int(720 * 0.7))
    check('nivel al tope', p.par.Failsafelevel.val, n_steps + 1)

    w_bajo, h_bajo = p.par.Outputwidth.val, p.par.Outputheight.val
    m.failsafeStep()
    check('en el tope ya no baja nada mas',
          [p.par.Outputwidth.val, p.par.Outputheight.val], [w_bajo, h_bajo])
    check('el nivel no se pasa del tope', p.par.Failsafelevel.val, n_steps + 1)

    m.failsafeReset()
    check('reset devuelve la resolucion original',
          [p.par.Outputwidth.val, p.par.Outputheight.val], [1280, 720])
    check('reset pone el nivel en 0', p.par.Failsafelevel.val, 0)

    print('\n--- FAILSAFE: sigue entero si se agrega un escalon ---')
    # Este es el bug exacto que tenia: con el tope en 3 escrito a mano,
    # agregar un escalon dejaba el de resolucion inalcanzable.
    p = full_project(Trails=0.8, Duallayer=True, Chaos=0.9)
    m = load(p)
    m._FAILSAFE_STEPS = list(m._FAILSAFE_STEPS) + [('caos a cero', 'Chaos', 0.0)]
    m._FAILSAFE_MAX_LEVEL = len(m._FAILSAFE_STEPS) + 1
    for _ in range(len(m._FAILSAFE_STEPS) + 1):
        m.failsafeStep()
    check('el escalon agregado se aplico', p.par.Chaos.val, 0.0)
    check('y el de resolucion SIGUE alcanzandose',
          p.par.Outputwidth.val, int(1280 * 0.7))

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
