#!/usr/bin/env python3
"""RITMO (fase 36): vjcore/ritmo.py con musica sintetica.

  1. Engancha el pulso a 128 BPM (con +-12 ms de jitter, 5 % de golpes
     perdidos y contratiempos sueltos) y a 95 BPM; mide bien el BPM
  2. Las frases caen cada 32 tiempos, en el tiempo justo
  3. Break de 8 s -> break detectado; vuelve el bombo -> DROP y la frase
     arranca de nuevo en ese golpe
  4. Climax: con el break y el climax debido, el aviso crece en el break y
     el pico cae EXACTO en el drop; nunca dos climax a menos de CLX_MIN;
     sin drops, el climax cae igual en el "1" de una frase
  5. Cambio de tempo 128 -> 100: se suelta y vuelve a enganchar
  6. Sin bombo por mucho tiempo: vuelve al calendario de reloj (canales en 0)
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

from vjcore import ritmo as RM  # noqa: E402

fails = []


def check(label, ok, extra=''):
    print('  [{}] {}{}'.format('OK' if ok else '!!', label, ('  ' + extra) if extra else ''))
    if not ok:
        fails.append(label)


def kicks(t0, bpm, beats, rnd, miss=0.05, jitter=0.012, off=0.04):
    """Golpes de bombo (wall) desde t0: 'beats' tiempos a 'bpm'."""
    p = 60.0 / bpm
    out = []
    for i in range(beats):
        t = t0 + i * p
        if rnd.random() > miss:
            out.append(t + rnd.uniform(-jitter, jitter))
        if rnd.random() < off:
            out.append(t + p * 0.5)                     # contratiempo suelto
    return out, t0 + beats * p


def run(events_wall, until, rm, music=lambda t: True):
    """Corre el reloj a 60 cuadros/s: golpes en su cuadro y tick cada 0.5 s
    (como diagnostics). Aca wall == rt (la musica no para)."""
    ev = sorted(events_wall)
    i = 0
    t = 0.0
    nxt_tick = 0.0
    frames = int(until * 60) + 1
    vals = []
    for f in range(frames):
        t = f / 60.0
        while i < len(ev) and ev[i] <= t:
            rm.beat(t, t)                               # el evento cae en el cuadro
            i += 1
        if t >= nxt_tick:
            rm.tick(t, t, music(t))
            nxt_tick += 0.5
            vals.append((t, rm.values()))
    return vals


def script_check():
    import types
    import test_estado_seguro as S
    pars = {'Ritmoon': True, 'Ritmobpm': 0.0, 'Momenton': -1.0}
    pars.update({c[0].upper() + c[1:]: 0.0 for c in RM.CHANNELS})
    p = S.full_project(**pars)
    cs = S.load(p)
    clock = {'t': 0.0}
    ctrl = {'rtime': 0.0, 'music': 1.0}

    class Chan:
        def __init__(self, k):
            self.k = k

        def eval(self):
            return ctrl[self.k]

    chop = type('C', (), {'__getitem__': lambda self, k: Chan(k)})()
    real_op = cs.__dict__['op']
    cs.__dict__['op'] = lambda path=None: chop if path == '/project1/ctrl' else real_op(path)
    cs.__dict__['absTime'] = type('A', (), {'seconds': property(lambda self: clock['t'])})()
    p60 = 60.0 / 128
    for i in range(80):
        clock['t'] = ctrl['rtime'] = 1.0 + i * p60
        cs.ritmoBeat()
        if i % 2 == 0:
            cs.ritmoTick()
    check('publica el BPM', abs(p.par.Ritmobpm.val - 128.0) < 0.6, str(p.par.Ritmobpm.val))
    check('publica la grilla', abs(p.par.Mbeat.val - p60) < 0.003 and p.par.Manchor.val > 0)
    check('climax por la musica', p.par.Mclx.val == 1.0)
    check('estado en el dashboard', cs.ritmoStatus().startswith('RITMO 128'), cs.ritmoStatus())
    p.par.Ritmoon.val = False
    cs.ritmoTick()
    check('apagado: todo en 0 (calendario de reloj)',
          all(getattr(p.par, c[0].upper() + c[1:]).val == 0.0 for c in RM.CHANNELS))


def shader_check():
    """Simula 9 min de un tema (48 compases + break de 8 s, a 128 BPM) con
    Ritmo y le pasa sus canales al GLSL real de la escena (HK_TIMELINE)."""
    sys.argv = [sys.argv[0], '--set', 'halloween']
    import timeline_sucesos as TL
    TL.STEP = 0.1
    t0, minutes = 600.0, 9.0
    rnd = random.Random(21)
    ev, t = [], t0 - 40.0
    drops = []
    while t < t0 + minutes * 60 + 10:
        k, t = kicks(t, 128, 48 * 4, rnd)
        ev += k
        t += 8.0
        drops.append(t)
    rm = RM.Ritmo()
    snaps = []                                         # (rt, valores) tras cada cambio
    i, nxt = 0, 0.0
    ev.sort()
    tt = t0 - 40.0
    while tt < t0 + minutes * 60 + 1:
        while i < len(ev) and ev[i] <= tt:
            rm.beat(tt, tt)
            i += 1
        if tt >= nxt:
            rm.tick(tt, tt, True)
            nxt = tt + 0.2
        v = rm.values()
        if not snaps or snaps[-1][1] != v:
            snaps.append((tt, v))
        tt += 1.0 / 60
    import bisect
    keys = [x[0] for x in snaps]

    def at(t):
        return snaps[max(0, bisect.bisect_right(keys, t) - 1)][1]

    clx_drop = [e[1] for e in rm.events if e[0] == 'climax']
    breaks = [(e[1], next((d for d in drops if d > e[1]), 1e9)) for e in rm.events if e[0] == 'break']
    for scene in (26, 0, 18):
        rows, _ = TL.sample(scene, minutes, 0.3, 0.0, t0=t0, extra=at)
        T = [r[0] for r in rows]
        suc = [r[1][1] for r in rows]
        det = [r[1][3] for r in rows]
        sucv = [r[1][0] for r in rows]                 # variante (-1 = ninguno)
        detv = [r[1][2] for r in rows]
        cw = [r[2][1] for r in rows]
        # (a) cada suceso y detalle arranca en un "1" (grilla de 8 tiempos)
        off = []
        # el comienzo se lee en la variante: la envolvente puede caer a 0
        # adentro de un mismo detalle (los que parpadean)
        for var in (sucv, detv):
            for j in range(1, len(T)):
                if var[j] >= 0.0 and var[j - 1] < 0.0 and cw[j] <= 0.0 and cw[j - 1] <= 0.0:
                    v = at(T[j])
                    g = 8 * v['mbeat']
                    if g <= 0:
                        continue
                    lo, hi = T[j - 1] - 0.02, T[j] + 0.02
                    n = math.ceil((lo - v['manchor']) / g)
                    off.append(v['manchor'] + n * g <= hi)
        check('{:02d}: {} comienzos, todos en un "1"'.format(scene, len(off)), off and all(off),
              '{} fuera'.format(off.count(False)))
        # (b) en el break no hay sucesos ni detalles (pasado el fundido)
        quiet = all(suc[j] <= 0.0 and det[j] <= 0.0 for j in range(len(T))
                    for (b0, b1) in breaks if b0 + 1.6 < T[j] < b1)
        check('{:02d}: respiro en el break'.format(scene), quiet)
        # (c) el pico del climax cae en el drop
        ok = []
        for d in clx_drop:
            j = next((j for j in range(len(T)) if T[j] >= d), None)
            if j is None:
                continue
            ok.append(0.36 <= cw[j] <= 0.42 + 0.1 / 18.0)
        check('{:02d}: {} climax con el pico en el drop'.format(scene, len(ok)), ok and all(ok))
        # (d) ningun suceso durante un climax (salvo el segundo del fundido)
        clash = [T[j] for j in range(len(T)) if cw[j] > 0.0 and suc[j] > 0.0
                 and not (j > 12 and cw[j - 12] <= 0.0)]
        check('{:02d}: ningun suceso encima de un climax'.format(scene), not clash, str(clash[:3]))


def main():
    rnd = random.Random(7)
    print('--- 1-3. Pulso, frases, break y drop (128 BPM) ---')
    rm = RM.Ritmo()
    a, t = kicks(1.0, 128, 64 * 4, rnd)                  # 64 compases (~2 min)
    brk_end = t + 8.0                                     # break de 8 s
    b, t2 = kicks(brk_end, 128, 32 * 4, rnd)
    run(a + b, t2 + 1.0, rm)
    check('engancha el pulso', any(e[0] == 'pulso' for e in rm.events))
    lock = [e[1] for e in rm.events if e[0] == 'pulso'][0]
    check('engancha en los primeros 5 s', lock < 6.0, 't={:.2f}'.format(lock))
    check('BPM medido 128 +-1', abs(rm.bpm() - 128) < 1.0, '{:.2f}'.format(rm.bpm()))
    check('a tempo fijo no se re-engancha solo', not any(e[0] == 'tempo' for e in rm.events))
    fr = [e[1] for e in rm.events if e[0] == 'frase' and e[1] < brk_end - 8.0]
    gaps = [b_ - a_ for a_, b_ in zip(fr, fr[1:])]
    want = 32 * 60 / 128.0
    check('frases cada 32 tiempos (15 s)', gaps and all(abs(g - want) < 0.08 for g in gaps),
          'n={} gaps {:.3f}..{:.3f}'.format(len(gaps), min(gaps) if gaps else 0, max(gaps) if gaps else 0))
    # cada frase cae sobre un tiempo real del bombo
    p = 60.0 / 128
    on_beat = all(abs(((f - 1.0) / p) - round((f - 1.0) / p)) < 0.06 for f in fr)
    check('las frases caen en un tiempo', on_beat)
    brk = [e[1] for e in rm.events if e[0] == 'break']
    check('break detectado', len(brk) == 1 and brk_end - 8.0 + 2.0 < brk[0] < brk_end - 8.0 + 3.6,
          str(['{:.1f}'.format(x) for x in brk]))
    drop = [e[1] for e in rm.events if e[0] == 'drop']
    check('drop al volver el bombo', len(drop) == 1 and abs(drop[0] - brk_end) < 0.05,
          str(['{:.2f}'.format(x) for x in drop]))
    clx = [e for e in rm.events if e[0] == 'climax']
    avi = [e for e in rm.events if e[0] == 'aviso']
    check('el aviso empieza en el break', len(avi) == 1 and brk_end - 8.0 < avi[0][1] < brk_end,
          str(avi))
    check('el pico cae en el drop', any(abs(c[1] - drop[0]) < 0.05 for c in clx), str(clx))
    v = rm.values()
    check('canales con pulso', v['mbeat'] > 0 and v['mclx'] == 1.0, str(v))

    print('\n--- 4. Climax: espaciado y sin drops ---')
    rm = RM.Ritmo()
    rnd = random.Random(11)
    ev = []
    t = 1.0
    drops = []
    for sec in range(6):                                  # 6 x (break 6 s + 48 compases)
        k, t = kicks(t, 126, 48 * 4, rnd)
        ev += k
        t += 6.0
        drops.append(t)
    k, t = kicks(t, 126, 16 * 4, rnd)
    ev += k
    run(ev, t + 1.0, rm)
    clx = [e for e in rm.events if e[0] == 'climax']
    tt = [c[1] for c in clx]
    check('hay climax', len(clx) >= 3, str(['{:.0f}'.format(x) for x in tt]))
    check('nunca dos a menos de {:.0f} s'.format(RM.CLX_MIN),
          all(b_ - a_ >= RM.CLX_MIN - 0.5 for a_, b_ in zip(tt, tt[1:])))
    check('los de drop caen en el drop',
          all(any(abs(c - d) < 0.05 for d in drops) for c in tt))
    check('indices 0,1,2,... (uno de cada 3 es gran climax)',
          [c[2] for c in clx] == list(range(len(clx))))

    rm = RM.Ritmo()
    rnd = random.Random(3)
    k, t = kicks(1.0, 124, 220 * 4, rnd)                  # 7 min sin un break
    run(k, t + 1.0, rm)
    clx = [e for e in rm.events if e[0] == 'climax']
    fr = [e[1] for e in rm.events if e[0] in ('frase', 'pulso')]
    g = 32 * 60 / 124.0
    check('sin drops igual hay climax', len(clx) >= 1, str(clx))
    check('y su pico cae en el "1" de una frase',
          all(min(abs(c[1] - (f + n * g)) for f in fr for n in (0, 1, 2)) < 0.1 for c in clx))

    print('\n--- 4b. Hueco corto (3 s sin bombo, no es drop) ---')
    rm = RM.Ritmo()
    rnd = random.Random(13)
    a, t = kicks(1.0, 128, 40 * 4, rnd, miss=0.0, off=0.0)
    p = 60.0 / 128
    gap = 6                                                # 6 tiempos = 2.8 s
    b, t2 = kicks(t + gap * p, 128, 40 * 4, rnd, miss=0.0, off=0.0)
    run(a + b, t2 + 1.0, rm)
    check('no es drop', not any(e[0] == 'drop' for e in rm.events))
    fr = [e[1] for e in rm.events if e[0] == 'frase']
    # sin drop no se sabe donde esta el "1" real: la frase arranca donde se
    # engancho el pulso. Lo que importa es que despues del hueco siga ahi.
    res = [((f - 1.0) / p) % 32 for f in fr]
    check('las frases siguen en su lugar despues del hueco',
          len(fr) >= 8 and max(res) - min(res) < 0.1, str(['{:.2f}'.format(x) for x in res]))

    print('\n--- 5. Cambio de tempo ---')
    rm = RM.Ritmo()
    rnd = random.Random(5)
    a, t = kicks(1.0, 128, 40 * 4, rnd, off=0.0)
    b, t2 = kicks(t, 100, 40 * 4, rnd, off=0.0)
    run(a + b, t2 + 1.0, rm)
    check('vuelve a enganchar a 100 BPM', abs(rm.bpm() - 100) < 1.0, '{:.2f}'.format(rm.bpm()))
    tch = [e[1] for e in rm.events if e[0] == 'tempo']
    check('en menos de 8 s del cambio', len(tch) >= 1 and tch[0] - t < 8.0, str(['{:.1f}'.format(x - t) for x in tch]))

    print('\n--- 6. Sin bombo ---')
    rm = RM.Ritmo()
    rnd = random.Random(9)
    a, t = kicks(1.0, 128, 30 * 4, rnd)
    vals = run(a, t + RM.LOST + 5.0, rm)
    v = vals[-1][1]
    check('vuelve al reloj', v['mbeat'] == 0.0 and v['mclx'] == 0.0, str(v))
    rm = RM.Ritmo()
    v = rm.values()
    check('sin nada: todo en 0', all(v[c] == 0.0 for c in RM.CHANNELS), str(v))

    print('\n--- 6b. control_script: golpes -> parametros M* ---')
    script_check()

    print('\n--- 7. El shader sigue al ritmo (escenas 26, 00, 18) ---')
    try:
        import moderngl  # noqa: F401
    except ImportError:
        print('  (sin moderngl: se salta)')
    else:
        shader_check()

    print()
    if fails:
        print('RESULTADO: FALLA ({})'.format(len(fails)))
        return 1
    print('RESULTADO: TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
