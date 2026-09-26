"""Sin musica no tiene que reaccionar NADA.

8 s de sala sin musica (ruido de fondo + voces/aplausos sueltos) y despues
entra un tema. Compara la cadena sin y con la compuerta de musica
(audio.py: 'music', umbral Musicgate en dBFS sobre el nivel CRUDO, antes
del auto-gain).
"""
import numpy as np
from scipy import signal
from sim_audio import (techno, bandpass, envelope, gauss_causal, lag, trigger,
                       rms_frames, FS, FPS)

rng = np.random.default_rng(7)


def sala(seconds):
    n = int(seconds * FS)
    # Ruido de fondo (aire, gente) ~ -46 dBFS, con graves (el aire y la sala
    # retumban) -- es justo lo que el auto-gain amplificaba.
    x = signal.lfilter([1], [1, -0.97], rng.standard_normal(n)) * 0.0009
    # Voces / aplausos sueltos ~ -30 dBFS
    for t0 in (1.2, 2.9, 3.3, 5.1, 6.4, 6.6):
        i = int(t0 * FS)
        m = int(0.25 * FS)
        x[i:i + m] += rng.standard_normal(m) * 0.05 * np.exp(-np.arange(m) / (0.06 * FS))
    return x


def chain(x, gate_db=None):
    pure = envelope(bandpass(x, hi=180), 0.07, 8.0, 1.0)
    bass = lag(pure, 0.05, 0.20)
    slow = gauss_causal(pure, 0.35)
    kr = np.clip((pure - np.maximum(slow, 0.65)) * 6.0, 0, 1)
    kick = lag(kr, 0.008, 0.15)
    beat = trigger(kr, 0.30, release=0.18)
    groove = lag(beat, 0.0, 0.8)
    music = np.ones_like(bass)
    if gate_db is not None:
        raw = gauss_causal(rms_frames(x), 0.15)
        sw = (raw > 10 ** (gate_db / 20.0)).astype(float)
        m1 = lag(sw, 0.8, 2.5)
        m2 = np.clip((m1 - 0.5) * 20.0, 0, 1)
        music = lag(m2, 0.15, 0.3)
    return dict(bass=bass * music, kick=kick * music, beat=beat * music,
                groove=groove * music, music=music)


def full(x, gate_db=None):
    names = {'level': (None, None, 4.0, 0.15), 'bass': (None, 180, 8.0, 0.07),
             'mid': (180, 2000, 6.0, 0.09), 'high': (2000, 12000, 10.0, 0.06)}
    out = chain(x, gate_db)
    for ch, (lo, hi, fac, sm) in names.items():
        src = x if ch == 'level' else bandpass(x, lo=lo, hi=hi)
        out[ch] = lag(envelope(src, sm, fac), 0.05, 0.2) * out['music']
    return out


if __name__ == '__main__':
    import sys
    gente = 4.4  # sala con gente: ~-32 dBFS
    amb = sala(8.0) * gente
    x = np.concatenate([amb, techno(8.0, breakdown=(99, 99))[0] + sala(8.0) * gente * 0.5])
    amb_db = 20 * np.log10(gauss_causal(rms_frames(amb), 0.15)[60:].mean())
    cal = amb_db + 8.0
    print('sala con gente, sin musica: {:.0f} dBFS -> calibrada: compuerta en {:.0f} dB'.format(amb_db, cal))
    t = np.arange(len(rms_frames(x))) / FPS
    silencio = t < 8.0
    musica = t > 9.0
    for nombre, s in (('HOY (sin compuerta)', full(x)), ('COMPUERTA default -26 dB', full(x, -26.0)),
                      ('COMPUERTA calibrada {:.0f} dB'.format(cal), full(x, cal))):
        print('=== {} ==='.format(nombre))
        for ch in ('level', 'bass', 'mid', 'high', 'kick', 'beat', 'groove'):
            print('  {:6s} sin musica: max {:.2f} media {:.2f} | con musica: max {:.2f}'.format(
                ch, s[ch][silencio].max(), s[ch][silencio].mean(), s[ch][musica].max()))
        rise = t[1:][(s['beat'][1:] > 0.99) & (s['beat'][:-1] < 0.99)]
        print('  golpes detectados sin musica: {}'.format(int(np.sum(rise < 8.0))))
        on = t[np.argmax(s['music'] > 0.5)] if s['music'].max() > 0.5 else None
        if on is not None and nombre.startswith('COMP'):
            print('  la compuerta abre a los {:.2f} s (el tema entra a los 8.00 s)'.format(on))
