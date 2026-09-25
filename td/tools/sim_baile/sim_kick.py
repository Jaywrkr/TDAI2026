"""Compara detectores de kick sobre las mismas pistas sinteticas."""
import numpy as np
from sim_audio import (techno, reggaeton, bandpass, envelope, gauss_causal,
                       lag, trigger, FPS)


def true_kicks(name, seconds=16.0):
    if name == 'techno':
        per = 60 / 128
    else:
        per = 60 / 95
    ks = np.arange(0, seconds, per)
    return ks[~((ks >= 8.0) & (ks < 12.0))]


def evaluate(name, bass_env, kick_raw, thr, kick_lag=(0.008, 0.22)):
    t = np.arange(len(bass_env)) / FPS
    beat = trigger(kick_raw, thr)
    kick = lag(kick_raw, *kick_lag)
    tk = true_kicks(name)
    tk_drop = tk[(tk > 2) & (tk < 8)]
    rising = t[1:][(beat[1:] > 0.99) & (beat[:-1] < 0.99)]
    rd = rising[(rising > 2) & (rising < 8)]
    hits = sum(1 for k in tk_drop if np.any(np.abs(rd - k) < 0.06))
    false = sum(1 for r in rd if not np.any(np.abs(tk_drop - r) < 0.06))
    rb = rising[(rising > 9.5) & (rising < 12)]
    # contraste: kick justo despues del golpe vs. a mitad de camino
    per = tk[1] - tk[0]
    on = [kick[int((k + 0.03) * FPS)] for k in tk_drop]
    off = [kick[int((k + per * 0.6) * FPS)] for k in tk_drop]
    return dict(hits=hits, n=len(tk_drop), false=false, brk=len(rb),
                on=np.mean(on), off=np.mean(off), beat=beat, kick=kick)


def detectors(bass_env):
    out = {}
    slow = gauss_causal(bass_env, 0.35)
    out['actual (x9, sin gate)'] = (np.clip((bass_env - slow) * 9.0, 0, 1), 0.30)
    for gate in (0.55, 0.65, 0.75):
        for g in (3.0, 4.0, 6.0):
            ref = np.maximum(slow, gate)
            out['gate {:.2f} x{:.0f}'.format(gate, g)] = (np.clip((bass_env - ref) * g, 0, 1), 0.30)
    return out


if __name__ == '__main__':
    tracks = {'techno': techno()[0], 'reggaeton': reggaeton()[0]}
    envs = {n: envelope(bandpass(x, hi=180), 0.07, 8.0) for n, x in tracks.items()}
    names = list(detectors(envs['techno']).keys())
    print('{:22s} | {:^34s} | {:^34s}'.format('detector', 'techno 128', 'reggaeton 95'))
    print('{:22s} | {:^34s} | {:^34s}'.format('', 'aciertos falsos break  on/off', 'aciertos falsos break  on/off'))
    for nm in names:
        row = []
        for tn in ('techno', 'reggaeton'):
            kr, thr = detectors(envs[tn])[nm]
            r = evaluate(tn, envs[tn], kr, thr)
            row.append('{:2d}/{:2d}   {:3d}    {:2d}   {:.2f}/{:.2f}'.format(
                r['hits'], r['n'], r['false'], r['brk'], r['on'], r['off']))
        print('{:22s} | {:34s} | {:34s}'.format(nm, row[0], row[1]))
