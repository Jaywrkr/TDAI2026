#!/usr/bin/env python3
"""Transiciones con tema y pad MOMENTO (fase 15 de Halloween).

  1. Estilo 'fundido': Transitionfx queda en 0 (no cocina program_trans)
  2. Un estilo fijo: Transitionfx = +-(estilo + semilla), con el signo del
     lado que entra, y Transitionmin = sus segundos minimos
  3. 'halloween': elige uno de los cuatro y nunca repite el anterior
  4. Otro Next a mitad de un cambio NO cambia el efecto que corre
  5. _startFade agenda el final con la duracion real (max con el minimo)
  6. MOMENTO: el pad escribe el kclock; otra pulsada durante el climax no
     lo reinicia; al terminar se puede volver a disparar
  7. El GLSL de program_trans devuelve EXACTAMENTE la escena de cada lado
     en los extremos (render_transitions.py --check), si hay moderngl
"""
import os
import subprocess
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import test_estado_seguro as S  # noqa: E402


class Chan:
    def __init__(self, v):
        self.v = v

    def eval(self):
        return self.v


class FakeChop:
    def __init__(self, **chans):
        self.chans = {k: Chan(v) for k, v in chans.items()}

    def __getitem__(self, k):
        return self.chans[k] if isinstance(k, str) else list(self.chans.values())[k]


def setup(style, x=0.0, clock=100.0):
    p = S.full_project(Transitionstyle=style, Transitionfx=0.0, Transitionmin=0.0,
                       Momenton=-1.0)
    m = S.load(p)
    xfade = FakeChop(Xfadetarget=x)
    kclock = FakeChop(kclock=clock)
    runs = []

    def fake_op(path=None):
        if path in ('/project1', None):
            return p
        if path == '/project1/xfade':
            return xfade
        if path == '/project1/key_clock':
            return kclock
        return None

    m.op = fake_op
    m.run = lambda *a, **k: runs.append((a, k))
    m.refreshPadLeds = lambda *a, **k: None
    return p, m, xfade, kclock, runs


def main():
    fails = []

    def check(label, cond, detail=''):
        print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                                  ('  -> ' + str(detail)) if detail != '' else ''))
        if not cond:
            fails.append(label)

    sys.path.insert(0, os.path.dirname(HERE))
    from vjcore import config
    names = [n for n, _, _ in config.TRANSITION_STYLES]

    print('--- fundido ---')
    p, m, *_ = setup('fundido')
    got = m._pickTransition(p, 'B')
    check('fundido: sin efecto', p.par.Transitionfx.val == 0.0 and got == 0.0)

    print('--- estilo fijo ---')
    for name in ('niebla', 'sangre', 'rayo', 'apagon'):
        idx = names.index(name)
        for side, sign in (('B', 1.0), ('A', -1.0)):
            p, m, *_ = setup(name)
            secs = m._pickTransition(p, side)
            fx = p.par.Transitionfx.val
            check('{} entra {}: estilo y signo'.format(name, side),
                  int(abs(fx)) == idx and (fx > 0) == (sign > 0), fx)
            check('{} entra {}: segundos minimos'.format(name, side),
                  secs == config.TRANSITION_STYLES[idx][2] == p.par.Transitionmin.val, secs)

    print('--- halloween al azar ---')
    p, m, *_ = setup('halloween')
    seen, prev, repeats = set(), None, 0
    for _ in range(60):
        m._pickTransition(p, 'B')
        cur = names[int(abs(p.par.Transitionfx.val))]
        seen.add(cur)
        repeats += cur == prev
        prev = cur
    check('usa los cuatro', seen == {'niebla', 'sangre', 'rayo', 'apagon'}, sorted(seen))
    check('nunca repite el anterior', repeats == 0, repeats)

    print('--- Next a mitad de un cambio ---')
    p, m, xfade, *_ = setup('halloween')
    m._pickTransition(p, 'B')
    before = p.par.Transitionfx.val
    xfade.chans['Xfadetarget'].v = 0.4
    m._pickTransition(p, 'B')
    check('el efecto en curso sigue igual', p.par.Transitionfx.val == before)

    print('--- duracion real del fundido ---')
    p, m, xfade, kclock, runs = setup('apagon')
    p.par.Transitionseconds.val = 0.45
    p.store('transition_token', 7)
    p.store('incoming_side', 'B')
    m._startFade(7)
    frames = runs[-1][1].get('delayFrames') if runs else None
    want = int(round(2.2 * 60)) + 3
    check('apagon dura al menos 2.2 s (no 0.45)', frames == want, frames)
    check('Xfadetarget al lado que entra', p.par.Xfadetarget.val == 1.0)

    print('--- MOMENTO ---')
    p, m, xfade, kclock, runs = setup('fundido', clock=100.0)
    m.triggerMoment()
    check('el pad guarda el kclock', p.par.Momenton.val == 100.0, p.par.Momenton.val)
    check('activo mientras dura', m.momentActive())
    kclock.chans['kclock'].v = 110.0
    m.triggerMoment()
    check('otra pulsada no lo reinicia', p.par.Momenton.val == 100.0, p.par.Momenton.val)
    kclock.chans['kclock'].v = 100.0 + m.MOMENT_SECONDS + 0.5
    check('termina solo', not m.momentActive())
    m.triggerMoment()
    check('y se puede volver a disparar', p.par.Momenton.val == kclock.chans['kclock'].v)
    common = open(os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'common.glsl')).read()
    check('MOMENT_SECONDS coincide con HK_MOMENT_LEN',
          '#define HK_MOMENT_LEN {:.1f}'.format(m.MOMENT_SECONDS) in common)

    print('--- GLSL: bordes exactos ---')
    try:
        import moderngl  # noqa: F401
        out = subprocess.run([sys.executable, os.path.join(HERE, 'render_transitions.py'),
                              '--check', '--set', 'halloween'], capture_output=True, text=True)
        check('program_trans en los extremos = la escena de ese lado', out.returncode == 0,
              (out.stdout + out.stderr).strip().splitlines()[-1:])
    except ImportError:
        print('  (sin moderngl: se salta)')

    print()
    print('TODO OK' if not fails else 'FALLAS: {}'.format(fails))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
