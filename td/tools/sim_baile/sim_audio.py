"""Simulacion offline de la cadena de audio del rig (audio.py) + el brillo
que termina saliendo en pantalla para un pixel tipico (filo rojo sobre
negro), para medir cuanto "baila" de verdad.

Aproxima la semantica de los CHOPs de TD a 60 fps:
  Analyze RMS por frame, Filter gaussian causal, Lag exponencial
  (lag1 subida / lag2 bajada), Trigger con attack/release.
"""
import os
import numpy as np

OUT = os.path.dirname(os.path.abspath(__file__))
from scipy import signal

FS = 48000
FPS = 60
HOP = FS // FPS


def lag(x, up, down):
    y = np.zeros_like(x)
    v = 0.0
    dt = 1.0 / FPS
    for i, xi in enumerate(x):
        t = up if xi > v else down
        a = 1.0 if t <= 0 else 1.0 - np.exp(-dt / t)
        v += (xi - v) * a
        y[i] = v
    return y


def gauss_causal(x, width):
    n = max(1, int(round(width * FPS)))
    k = np.exp(-0.5 * (np.arange(n) / (n / 2.5)) ** 2)
    k /= k.sum()
    return signal.lfilter(k, [1.0], x)


def rms_frames(x):
    n = len(x) // HOP
    return np.sqrt(np.mean(x[:n * HOP].reshape(n, HOP) ** 2, axis=1))


def bandpass(x, lo=None, hi=None):
    if lo and hi:
        sos = signal.butter(4, [lo, hi], 'bandpass', fs=FS, output='sos')
    elif hi:
        sos = signal.butter(4, hi, 'lowpass', fs=FS, output='sos')
    else:
        sos = signal.butter(4, lo, 'highpass', fs=FS, output='sos')
    return signal.sosfilt(sos, x)


def envelope(x, smooth, factory, amount=1.0, agc=True, release=12.0, floor=0.25):
    fl = gauss_causal(rms_frames(x), smooth)
    if agc:
        peak = lag(fl, 0.0, release)
        div = np.maximum(peak, floor / factory)
        norm = fl / div
        gain = 1.0  # par/factory con el default
    else:
        norm = fl
        gain = factory
    return np.clip(norm * gain * amount, 0, 1)


def trigger(x, thr, release=0.22):
    y = np.zeros_like(x)
    v = 0.0
    step = 1.0 / (release * FPS)
    for i, xi in enumerate(x):
        v = 1.0 if xi > thr else max(0.0, v - step)
        y[i] = v
    return y


# ------------------------------------------------------------------
# Pistas sinteticas
# ------------------------------------------------------------------
rng = np.random.default_rng(1)


def kick(t0, dur, n):
    t = np.arange(n) / FS
    f = 45 + 75 * np.exp(-t / 0.04)
    ph = 2 * np.pi * np.cumsum(f) / FS
    return np.sin(ph) * np.exp(-t / 0.18)


def techno(seconds=16.0, bpm=128, breakdown=(8.0, 12.0)):
    n = int(seconds * FS)
    x = np.zeros(n)
    beat = 60.0 / bpm
    t = 0.0
    while t < seconds:
        i = int(t * FS)
        in_break = breakdown[0] <= t < breakdown[1]
        if not in_break:
            k = kick(0, 0.4, min(int(0.4 * FS), n - i))
            x[i:i + len(k)] += 0.9 * k
        # bajo en el contratiempo (sigue en el break)
        j = int((t + beat / 2) * FS)
        m = min(int(0.2 * FS), n - j)
        if m > 0:
            tt = np.arange(m) / FS
            x[j:j + m] += 0.35 * np.sin(2 * np.pi * 55 * tt) * np.minimum(1, (0.2 - tt) * 30)
        # hats en semicorcheas
        for s in range(4):
            h = int((t + s * beat / 4) * FS)
            hm = min(int(0.03 * FS), n - h)
            if hm > 0:
                x[h:h + hm] += 0.15 * rng.standard_normal(hm) * np.exp(-np.arange(hm) / (0.008 * FS))
        t += beat
    tt = np.arange(n) / FS
    x += 0.12 * (np.sin(2 * np.pi * 440 * tt) + np.sin(2 * np.pi * 554 * tt)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * tt))
    hp = bandpass(rng.standard_normal(n), lo=5000)
    x[:len(hp)] += 0.0
    return x, beat


def reggaeton(seconds=16.0, bpm=95, breakdown=(8.0, 12.0)):
    """Dembow con 808 sostenido: el caso dificil (graves casi continuos)."""
    n = int(seconds * FS)
    x = np.zeros(n)
    beat = 60.0 / bpm
    t = 0.0
    tt_all = np.arange(n) / FS
    # 808 sostenido que cambia de nota cada compas
    notes = [49, 49, 44, 46]
    bar = 4 * beat
    for b in range(int(seconds / bar) + 1):
        i0 = int(b * bar * FS)
        i1 = min(n, int((b + 1) * bar * FS))
        if i0 >= n:
            break
        tt = tt_all[i0:i1] - b * bar
        x[i0:i1] += 0.45 * np.sin(2 * np.pi * notes[b % 4] * tt) * np.exp(-tt / 1.2)
    while t < seconds:
        in_break = breakdown[0] <= t < breakdown[1]
        for off in (0.0, 1.0):  # kick en 1 y 3 (cada negra en 2 lados)
            i = int((t + off * beat) * FS)
            if i < n and not in_break:
                k = kick(0, 0.3, min(int(0.3 * FS), n - i))
                x[i:i + len(k)] += 0.8 * k
        # snare dembow: 3/16 y 3/8 del compas de 2 tiempos
        for off in (0.75, 1.5):
            i = int((t + off * beat) * FS)
            m = min(int(0.12 * FS), n - i)
            if m > 0:
                x[i:i + m] += 0.3 * rng.standard_normal(m) * np.exp(-np.arange(m) / (0.03 * FS))
        t += 2 * beat
    x += 0.1 * np.sin(2 * np.pi * 523 * tt_all) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * tt_all))
    return x, beat


# ------------------------------------------------------------------
# Cadena del rig
# ------------------------------------------------------------------
def rig_chain(x, audioamount=1.0, kickwindow=0.35, kickgain=9.0, kickthr=0.30):
    bass_env = envelope(bandpass(x, hi=180), 0.07, 8.0, audioamount)
    mid_env = envelope(bandpass(x, lo=180, hi=2000), 0.09, 6.0, audioamount)
    high_env = envelope(bandpass(x, lo=2000, hi=12000), 0.06, 10.0, audioamount)
    bass = lag(bass_env, 0.05, 0.20)
    mid = lag(mid_env, 0.05, 0.20)
    high = lag(high_env, 0.05, 0.20)
    diff = bass_env - gauss_causal(bass_env, kickwindow)
    kick_raw = np.clip(diff * kickgain, 0, 1)
    kickv = lag(kick_raw, 0.008, 0.22)
    beat = trigger(kick_raw, kickthr)
    return dict(bass=bass, mid=mid, high=high, kick=kickv, beat=beat, kick_raw=kick_raw)


def lum(c):
    return c @ np.array([0.299, 0.587, 0.114])


def grade(c):
    s = c * c * (3 - 2 * np.clip(c, 0, 1))
    c = c + (s - c) * 0.22
    l = lum(c)[..., None]
    d = np.clip((l - 0.55) / (1.5 - 0.55), 0, 1)
    d = d * d * (3 - 2 * d) * 0.18
    return c + (l - c) * d


def prefilter(c, kick, thresh0=0.35, knee=0.2, kick_thr=0.16):
    l = lum(c)
    th = thresh0 - kick * kick_thr
    soft = np.clip(l - th + knee, 0, 2 * knee)
    soft = soft * soft / (4 * knee)
    contrib = np.maximum(soft, l - th) / np.maximum(l, 1e-4)
    return c * contrib[:, None]


def knee(c, k=0.8):
    over = np.maximum(c - k, 0)
    return c - over + over / (1 + over / (1 - k))


EDGE = np.array([0.80, 0.06, 0.04])  # filo rojo tipico


def pixel_light(sig, mode='actual', depth=1.0, floor=0.45, boost=0.55, groove=None):
    """Luz total que emite un filo rojo (pixel + su halo de bloom) por frame."""
    k, b = sig['kick'], sig['bass']
    c = np.tile(EDGE, (len(k), 1))
    c = c * (1 + k * 0.4)[:, None]                       # col += col*uKick*0.4
    c = c * (1 + (b * 0.5) * lum(c))[:, None]            # audioLift(uBass*0.5)
    ex = np.maximum(c - 1, 0)
    c = c - ex + ex / (1 + ex)
    c = grade(c)
    if mode == 'antes':  # bloom fijo, sin nada de kick
        glow = prefilter(c, np.zeros_like(k), kick_thr=0.0) * 1.6
        out = knee(c + glow)
    elif mode == 'actual':  # lo que ya esta en la rama base
        glow = prefilter(c, k) * 1.6 * (1 + k * 1.1)[:, None]
        out = knee(c * (1 + k * 0.22)[:, None] + glow)
    else:  # 'pump': propuesta nueva
        env = np.maximum(sig['beat'], k) ** 0.8
        g = groove if groove is not None else np.ones_like(k)
        gs = np.clip((g - 0.30) / 0.40, 0, 1); gs = gs * gs * (3 - 2 * gs)
        d = depth * gs
        pump = 1 + d * (floor + (1 + boost - floor) * env - 1)
        glow = prefilter(c, k) * 1.6 * (1 + k * 1.1)[:, None]
        out = knee((c + glow) * pump[:, None])
    return lum(out)


def groove_of(beat):
    return lag(beat, 0.0, 2.5)


def report(name, x, beat_period):
    s = rig_chain(x)
    t = np.arange(len(s['bass'])) / FPS
    drop = (t > 2) & (t < 8)
    brk = (t > 9.5) & (t < 12)
    print('=== {} ==='.format(name))
    for ch in ('bass', 'mid', 'high', 'kick', 'beat'):
        v = s[ch][drop]
        print('  {:5s} drop: min {:.2f}  max {:.2f}  media {:.2f}'.format(ch, v.min(), v.max(), v.mean()))
    nb = int(np.sum(np.diff((s['beat'] > 0.99).astype(int)) == 1 & drop[1:]))
    print('  beats detectados en el drop (6 s): {}  (esperados ~{:.0f})'.format(
        nb, 6 / beat_period * (2 if name.startswith('regg') else 1) / (2 if name.startswith('regg') else 1)))
    g = groove_of(s['beat'])
    for mode in ('antes', 'actual', 'pump'):
        L = pixel_light(s, mode, groove=g)
        ld, lb = L[drop], L[brk]
        print('  luz del filo [{:6s}] drop: {:.3f}..{:.3f} = x{:.2f} de oscilacion | break: {:.3f}..{:.3f}'.format(
            mode, ld.min(), ld.max(), ld.max() / max(ld.min(), 1e-4), lb.min(), lb.max()))
    return s, g


if __name__ == '__main__':
    xt, bt = techno()
    xr, br = reggaeton()
    st, gt = report('techno 128', xt, bt)
    sr, gr = report('reggaeton 95 (808 sostenido)', xr, br)
    np.savez(os.path.join(OUT, 'sim.npz'),
             **{'t_' + k: v for k, v in st.items()}, **{'r_' + k: v for k, v in sr.items()},
             t_groove=gt, r_groove=gr)
