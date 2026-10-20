"""Pruebas del GUION (show por archivo, sin MIDI).

uso: python3 td/tools/test_guion.py

1. vjcore/guion.py: tiempos, alias, rampas, saltos, reloj.
2. Cada guion.json de los sets se carga y valida contra sus escenas.
3. El runner de control_script (_guionTick, guionGo...) corre contra un
   /project1 simulado: dispara cues a tiempo, desliza rampas, salta sin
   repetir efectos, pausa y sigue la hora real.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

from vjcore import guion as G   # noqa: E402

fails = []


def check(label, cond, detail=''):
    print('  [{}] {}{}'.format('OK' if cond else 'FALLA', label, ('  -> ' + str(detail)) if detail else ''))
    if not cond:
        fails.append(label)


def near(a, b, eps=1e-6):
    return abs(a - b) < eps


def unit():
    print('guion.py')
    check('tiempo mm:ss', near(G.parse_time('3:30'), 210))
    check('tiempo h:mm:ss', near(G.parse_time('1:02:03'), 3723))
    check('tiempo numero', near(G.parse_time(12.5), 12.5))
    check('hora 23:15', near(G.parse_clock('23:15'), 23.25))
    check('alias d1 -> Detail1', G.par_name('d1') == 'Detail1')
    check('alias locura -> Chaos', G.par_name('locura') == 'Chaos')
    check('nombre real Speed', G.par_name('Speed') == 'Speed')
    check('parametro raro rechazado', G.par_name('Repopath') is None)

    def bad(data, txt):
        try:
            G.normalize(data)
        except G.GuionError as e:
            return txt in str(e)
        return False
    check('error: sin cues', bad({}, 'cues'))
    check('error: parametro desconocido', bad({'cues': [{'t': 0, 'pars': {'zzz': 1}}]}, 'zzz'))
    check('error: efecto desconocido', bad({'cues': [{'t': 0, 'fx': 'Boom'}]}, 'Boom'))
    check('error: accion desconocida', bad({'cues': [{'t': 0, 'accion': 'panicx'}]}, 'panicx'))
    check('error: hora sin inicio', bad({'cues': [{'hora': '23:00', 'escena': 1}]}, 'inicio'))

    g = G.normalize({'inicio': '22:00', 'cues': [
        {'t': '0:10', 'nombre': 'b', 'pars': {'d1': 1.0}, 'rampa': 10},
        {'t': 0, 'nombre': 'a', 'escena': 2, 'pars': {'d1': 0.0, 'speed': 2.0}},
        {'hora': '23:00', 'nombre': 'c', 'escena': 3, 'blackout': True},
    ]})
    cues = g['cues']
    check('ordena por t', [c['nombre'] for c in cues] == ['a', 'b', 'c'])
    check('"hora" -> segundos desde el inicio', near(cues[2]['t'], 3600))
    check('valores fuera de rango se recortan', near(cues[0]['pars']['Speed'], 1.0))
    check('index_at antes de empezar', G.index_at(cues, -5) == -1)
    check('index_at en el medio', G.index_at(cues, 12) == 1)
    check('rampa a mitad = mitad', near(G.ramp_values(cues, 1, 15)['Detail1'], 0.5))
    check('rampa termina en el valor final', near(G.ramp_values(cues, 1, 30)['Detail1'], 1.0))
    check('rampa desde la base dada', near(G.ramp_values(cues, 1, 15, {'Detail1': 0.6})['Detail1'], 0.8))
    check('estado acumulado', G.state_at(cues, 1) == {'Detail1': 1.0, 'Speed': 1.0})
    check('escena al aire en el cue 1', G.scene_at(cues, 1) == (2, None))
    check('extras: blackout del cue c', G.extras_before(cues, 3)['blackout'] is True)
    check('reloj: 23:30 con inicio 22 -> 5400 s', near(G.clock_position(23.5, 22.0), 5400))
    check('reloj cruza medianoche', near(G.clock_position(1.0, 22.0), 3 * 3600))
    check('reloj: 19:00 = antes del inicio (negativo)', G.clock_position(19.0, 22.0, 7.5 * 3600) < 0)
    check('validar avisa rampa larga', any('rampa' in w for w in G.validate(G.normalize(
        {'cues': [{'t': 0, 'pars': {'d1': 1}, 'rampa': 30}, {'t': 10, 'escena': 1}]}))))
    check('validar avisa escena inexistente', any('no existe' in w for w in G.validate(G.normalize(
        {'cues': [{'t': 0, 'escena': 40}]}), n_scenes=20)))
    check('timeline imprime una linea por cue', len(G.timeline(g)) == 3)


def sets():
    print('guion.json de cada set')
    import re
    roots = [TD] + [os.path.join(TD, 'sets', d) for d in sorted(os.listdir(os.path.join(TD, 'sets')))
                    if os.path.isdir(os.path.join(TD, 'sets', d))]
    for root in roots:
        path = G.default_path(root)
        if not os.path.isfile(path):
            continue
        vis = os.path.join(root, 'visuals')
        n = len([f for f in os.listdir(vis) if re.match(r'scene\d+_.*\.frag$', f)]) if os.path.isdir(vis) else None
        try:
            g = G.load(path)
            probs = G.validate(g, n)
        except G.GuionError as e:
            check(os.path.relpath(path, TD) + ' carga', False, e)
            continue
        check('{} carga y valida ({} cues, {})'.format(os.path.relpath(path, TD), len(g['cues']),
                                                       G.fmt_time(G.duration(g))), not probs, probs[:3])
        if 'halloween' in root:
            scenes = sorted({c['escena'] for c in g['cues'] if c['escena'] is not None})
            check('halloween: pasan todas las escenas ({})'.format(n), scenes == list(range(n)), scenes)
            check('halloween: dura 22:00 -> 05:30 (7:30 h)', near(G.duration(g), 7.5 * 3600, 120))
            check('halloween: arranca a las 22:00', near(g['inicio'], 22.0))


# --- runner contra un /project1 simulado -------------------------------

class _Par(object):
    def __init__(self, v):
        self.val = v

    def eval(self):
        return self.val


class _Pars(object):
    def __init__(self, vals):
        object.__setattr__(self, '_d', {k: _Par(v) for k, v in vals.items()})

    def __getattr__(self, k):
        d = object.__getattribute__(self, '_d')
        if k in d:
            return d[k]
        raise AttributeError(k)

    def __setattr__(self, k, v):
        self._d[k].val = v


class _Proj(object):
    def __init__(self, vals):
        self.par = _Pars(vals)
        self._s = {}

    def store(self, k, v):
        self._s[k] = v

    def fetch(self, k, d=None):
        return self._s.get(k, d)


class _Clock(object):
    seconds = 1000.0


def runner(tmpdir):
    print('runner (control_script) con /project1 simulado')
    import json
    path = os.path.join(tmpdir, 'guion_test.json')
    with open(path, 'w') as f:
        json.dump({'inicio': '22:00', 'cues': [
            {'t': 0, 'nombre': 'abre', 'escena': 1, 'fundido': 2, 'pars': {'d1': 0.0, 'chaos': 0.1}, 'blackout': False},
            {'t': 60, 'nombre': 'sube', 'pars': {'d1': 1.0}, 'rampa': 20},
            {'t': 120, 'nombre': 'strobe', 'fx': ['Strobe'], 'texto': 'HOLA'},
            {'t': 180, 'nombre': 'cambia', 'escena': 4, 'fundido': 5, 'pars': {'chaos': 0.8}},
            {'t': 240, 'nombre': 'negro', 'blackout': True},
        ]}, f)
    vals = {'Guionactivo': False, 'Guionpausa': False, 'Guionreloj': False, 'Guionarchivo': path,
            'Guionposicion': 0.0, 'Guioncue': 0, 'Autopilot': True, 'Nocheinicio': 22.0,
            'Transitionseconds': 1.0, 'Targetindex': 0, 'Activeindex': 0, 'Blackout': True,
            'Textcontent': '', 'Textvisible': False, 'Detail1': 0.5, 'Chaos': 0.5, 'Strobe': 0.0,
            'Cuemode': False}
    proj = _Proj(vals)
    clock = _Clock()
    runs = []
    src = open(os.path.join(TD, 'vjcore', 'dats', 'control_script.py'), encoding='utf-8').read()
    ns = {'__name__': 'control_script_sim', 'op': lambda path: proj if path == '/project1' else None,
          'run': lambda *a, **k: runs.append(a[0]), 'absTime': clock}
    exec(compile(src, 'control_script.py', 'exec'), ns)
    scenes = []

    def select(i):
        scenes.append((i, proj.par.Transitionseconds.eval()))
        proj.par.Targetindex = i
        proj.par.Activeindex = i
    ns['selectScene'] = select
    ns['_valid'] = lambda i: True
    ns['_n_scenes'] = lambda: 20
    m = type('M', (), {})()
    tick = ns['_guionTick']

    def at(t):
        clock.seconds = 1000.0 + t
        tick(reschedule=False)

    ns['startGuion'](0.0)
    check('arrancar apaga el autopilot', proj.par.Autopilot.eval() is False)
    check('cue 0: escena 1 con fundido 2', scenes[-1:] == [(1, 2.0)], scenes)
    check('cue 0: saca el blackout', proj.par.Blackout.eval() is False)
    check('cue 0: perillas', near(proj.par.Detail1.eval(), 0.0) and near(proj.par.Chaos.eval(), 0.1))
    at(59)
    check('antes del cue 1 no cambia nada', near(proj.par.Detail1.eval(), 0.0))
    at(70)
    check('rampa a la mitad (d1 = 0.5)', near(proj.par.Detail1.eval(), 0.5), proj.par.Detail1.eval())
    proj.par.Detail1 = 0.9                      # alguien toca la perilla a mano...
    at(85)
    check('rampa terminada = valor final', near(proj.par.Detail1.eval(), 1.0))
    proj.par.Detail1 = 0.3
    at(100)
    check('terminada la rampa la perilla queda libre (gana la mano)', near(proj.par.Detail1.eval(), 0.3))
    n_runs = len(runs)
    at(121)
    check('cue strobe: efecto a full + reset agendado', near(proj.par.Strobe.eval(), 1.0) and len(runs) == n_runs + 1)
    check('cue strobe: texto', proj.par.Textcontent.eval() == 'HOLA' and proj.par.Textvisible.eval() is True)
    proj.par.Strobe = 0.0
    ns['toggleGuionPausa']()
    at(400)
    check('en pausa no avanza', proj.fetch('guion_last') == 2 and proj.par.Blackout.eval() is False)
    ns['toggleGuionPausa']()
    at(400 + 50)
    check('despues de la pausa sigue desde donde estaba (t=171)', near(proj.par.Guionposicion.eval(), 171, 0.01),
          proj.par.Guionposicion.eval())
    at(400 + 70)
    check('cue cambia: escena 4 con fundido 5', scenes[-1] == (4, 5.0), scenes[-1])
    ns['guionGo'](1)
    check('saltar al cue 1: escena que estaba al aire (1)', scenes[-1][0] == 1, scenes[-1])
    check('saltar al cue 1: chaos del cue 0', near(proj.par.Chaos.eval(), 0.1))
    n_runs = len(runs)
    ns['guionGo'](3)
    check('saltar al cue 3 no repite el strobe saltado', near(proj.par.Strobe.eval(), 0.0) and len(runs) == n_runs)
    check('saltar al cue 3 deja el texto del cue 2', proj.par.Textcontent.eval() == 'HOLA')
    check('saltar al cue 3: d1 final de la rampa saltada', near(proj.par.Detail1.eval(), 1.0))
    # cue final y modo reloj
    at(400 + 70 + 300)
    check('cue negro: blackout', proj.par.Blackout.eval() is True)
    info = ns['guionInfo']()
    check('guionInfo para el panel', info and info['n'] == 5 and info['idx'] == 4, info)
    ns['stopGuion']()
    check('parar', proj.par.Guionactivo.eval() is False)

    # Reloj: la posicion sale de la hora real
    import datetime as _dt

    class _FakeDT(_dt.datetime):
        now_h = 22.0

        @classmethod
        def now(cls, tz=None):
            h = cls.now_h % 24.0
            return cls(2026, 10, 30, int(h), int((h % 1) * 60), 0)
    real = _dt.datetime
    _dt.datetime = _FakeDT
    try:
        proj.par.Guionreloj = True
        proj.par.Guionactivo = True
        proj.store('guion_last', -1)
        _FakeDT.now_h = 19.0
        tick(reschedule=False)
        check('reloj 19:00: todavia no empieza', proj.fetch('guion_last') == -1)
        _FakeDT.now_h = 22.0 + 2.5 / 60.0           # 22:02:30 -> entre cue 1 y 2
        tick(reschedule=False)
        check('reloj 22:02: entra en el cue 2 (rampa saltada al final)',
              proj.fetch('guion_last') == 2 and near(proj.par.Detail1.eval(), 1.0), proj.fetch('guion_last'))
    finally:
        _dt.datetime = real


def main():
    import tempfile
    unit()
    sets()
    with tempfile.TemporaryDirectory() as d:
        runner(d)
    print()
    if fails:
        print('FALLAS: {}'.format(len(fails)))
        for f in fails:
            print('  -', f)
        sys.exit(1)
    print('TODO OK')


if __name__ == '__main__':
    main()
