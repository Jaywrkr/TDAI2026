"""Antes vs. despues: luz que emite un filo rojo, con el detector nuevo y el pump."""
import os
import numpy as np

OUT = os.path.dirname(os.path.abspath(__file__))
from sim_audio import (techno, reggaeton, bandpass, envelope, gauss_causal,
                       lag, trigger, pixel_light, FPS)


def chain(x, new, audioamount=1.0):
    pure = envelope(bandpass(x, hi=180), 0.07, 8.0, 1.0)
    bass_env = pure * audioamount
    bass = lag(np.clip(bass_env, 0, 1), 0.05, 0.20)
    slow = gauss_causal(pure, 0.35)
    if new:
        kr = np.clip((pure - np.maximum(slow, 0.65)) * 6.0, 0, 1)
        kick = lag(kr, 0.008, 0.15)
        beat = trigger(kr, 0.30, release=0.18)
    else:
        kr = np.clip((bass_env - gauss_causal(bass_env, 0.35)) * 9.0, 0, 1)
        kick = lag(kr, 0.008, 0.22)
        beat = trigger(kr, 0.30, release=0.22)
    return dict(bass=bass, kick=kick, beat=beat), lag(beat, 0.0, 0.8)


def stats(L, t):
    d = L[(t > 2) & (t < 8)]
    b = L[(t > 9.5) & (t < 12)]
    return d.min(), d.max(), b.min(), b.max()


if __name__ == '__main__':
    for name, x in (('techno 128', techno()[0]), ('reggaeton 95', reggaeton()[0])):
        print('=== {} ==='.format(name))
        s0, g0 = chain(x, False)
        s1, g1 = chain(x, True)
        t = np.arange(len(s0['kick'])) / FPS
        rows = [
            ('antes de hoy', pixel_light(s0, 'antes')),
            ('rama actual', pixel_light(s0, 'actual')),
            ('detector nuevo', pixel_light(s1, 'actual')),
        ]
        for fl, bo in ((0.55, 0.5), (0.5, 0.6), (0.45, 0.6), (0.4, 0.7)):
            rows.append(('nuevo+pump {:.2f}/{:.1f}'.format(fl, bo),
                         pixel_light(s1, 'pump', floor=fl, boost=bo, groove=g1)))
        for nm, L in rows:
            dmin, dmax, bmin, bmax = stats(L, t)
            print('  {:22s} drop {:.2f}..{:.2f} (x{:.2f})   break {:.2f}..{:.2f}'.format(
                nm, dmin, dmax, dmax / dmin, bmin, bmax))
        np.savez(os.path.join(OUT, 'final_{}.npz').format(name.split()[0]),
                 t=t, antes=rows[0][1], actual=rows[1][1],
                 nuevo=pixel_light(s1, 'pump', floor=0.5, boost=0.6, groove=g1),
                 kick_old=s0['kick'], kick_new=s1['kick'], beat_new=s1['beat'], groove=g1)
