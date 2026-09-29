"""Nucleo del laser: geometria, seguridad, simulador y archivos .ild.

Python puro + numpy, SIN nada de TouchDesigner. Es a proposito: todo lo
que decide que puntos salen hacia un proyector laser (y cuales NO) se
puede probar fuera de TD y sin hardware -- ver td/tools/test_laser.py y
td/tools/preview_laser.py. laser.py solo cablea esto dentro de TD.

Un "frame laser" es lo que el galvo recorre una y otra vez: una lista de
puntos (x, y, r, g, b). x, y en -1..1 (centro = 0, arriba = +y); r, g, b
en 0..1. Un punto con color 0 es un punto APAGADO (blanking): el galvo
pasa por ahi sin emitir. Asi se salta de una figura a otra.

Convencion de imagen: igual que TOP.numpyArray() de TouchDesigner, la
fila 0 es la de ABAJO. Las herramientas offline generan sus imagenes con
la misma convencion y voltean solo al guardar el PNG.
"""

import colorsys
import math
import struct

import numpy as np


# Patrones. El indice es el valor del parametro Laserpattern en /project1.
PATTERNS = ['AUTO', 'CIRCULO', 'LISSAJOUS', 'TUNEL', 'ONDA']

# Modos. El indice es el valor del parametro Lasermode en /project1.
MODES = ['APAGADO', 'SIMULADOR', 'SALIDA DAC']
MODE_OFF, MODE_SIM, MODE_DAC = 0, 1, 2


# ---------------------------------------------------------------
# PATRONES VECTORIALES
# ---------------------------------------------------------------
# Cada patron devuelve una lista de trazos: [(xy (N,2), rgb (N,3)), ...].
# Un trazo es una linea continua encendida; entre trazos finalize() mete
# el blanking. `c` es un dict con los canales de la textura de control
# (mismos nombres que config.CTRL_CHANNELS): speed, hue, chaos, bass, ...

def _g(c, name, default=0.0):
    try:
        return float(c.get(name, default))
    except Exception:
        return default


def _rgb(h, s=1.0, v=1.0):
    return np.array(colorsys.hsv_to_rgb(h % 1.0, s, v), dtype=np.float32)


def _stroke(xy, color):
    xy = np.asarray(xy, dtype=np.float32)
    rgb = np.tile(np.asarray(color, dtype=np.float32), (len(xy), 1))
    return (xy, rgb)


def pattern_circle(c, n=160):
    t = _g(c, 'time')
    bass, kick = _g(c, 'bass'), _g(c, 'kick')
    wob = 0.08 + 0.25 * _g(c, 'chaos')
    a = np.linspace(0.0, 2 * math.pi, n)
    r = 0.55 + 0.25 * bass + wob * 0.3 * np.sin(a * 6 + t * 3) * (0.3 + kick)
    xy = np.stack([r * np.cos(a), r * np.sin(a)], axis=1)
    return [_stroke(xy, _rgb(_g(c, 'hue')))]


def pattern_lissajous(c, n=400):
    t = _g(c, 'time')
    dens = _g(c, 'density', 0.5)
    fa = 1 + round(dens * 4)
    fb = fa + 1
    s = np.linspace(0.0, 2 * math.pi, n)
    amp = 0.6 + 0.3 * _g(c, 'level')
    xy = np.stack([amp * np.sin(fa * s + t),
                   amp * np.sin(fb * s + t * 0.7)], axis=1)
    rgb = np.array([_rgb(_g(c, 'hue') + 0.15 * math.sin(k))
                    for k in s], dtype=np.float32)
    return [(xy.astype(np.float32), rgb)]


def pattern_tunnel(c, rings=5, sides=6):
    t = _g(c, 'time')
    beat = _g(c, 'beat')
    out = []
    for i in range(rings):
        ph = (i / rings + t * 0.15) % 1.0
        r = 0.1 + 0.8 * ph
        rot = t * 0.4 * (1 if i % 2 else -1)
        a = np.linspace(0.0, 2 * math.pi, sides + 1) + rot
        xy = np.stack([r * np.cos(a), r * np.sin(a)], axis=1)
        # Densificar las aristas: un poligono de 7 puntos el galvo lo
        # redondea; 8 puntos por lado lo mantiene recto.
        xy = _densify(xy, 8)
        v = 0.4 + 0.6 * (1.0 - ph) + 0.4 * beat
        out.append(_stroke(xy, _rgb(_g(c, 'hue') + i * 0.08, 1.0, min(v, 1.0))))
    return out


def pattern_wave(c, n=200):
    t = _g(c, 'time')
    x = np.linspace(-0.9, 0.9, n)
    amp = 0.1 + 0.5 * _g(c, 'level') + 0.3 * _g(c, 'kick')
    y = amp * np.sin(x * (4 + 8 * _g(c, 'density', 0.5)) + t * 4) \
        * np.sin(x * 1.3 - t)
    xy = np.stack([x, y], axis=1)
    return [_stroke(xy, _rgb(_g(c, 'hue') + 0.5))]


def _densify(xy, per_edge):
    pts = []
    for a, b in zip(xy[:-1], xy[1:]):
        for k in range(per_edge):
            pts.append(a + (b - a) * (k / per_edge))
    pts.append(xy[-1])
    return np.array(pts, dtype=np.float32)


# ---------------------------------------------------------------
# AUTO: trazar la escena que esta al aire
# ---------------------------------------------------------------

_NEIGHBORS = ((1, 0), (-1, 0), (0, 1), (0, -1),
              (1, 1), (-1, -1), (1, -1), (-1, 1))


def trace_image(img, threshold=0.35, max_edge_px=900):
    """Convierte una imagen (H, W, 3 o 4, 0..1, fila 0 = abajo) en trazos
    siguiendo los BORDES de lo que brilla.

    Un laser no puede rellenar areas: dibuja contornos. Se marca lo que
    pasa del umbral, se queda con el borde (pixel encendido con algun
    vecino apagado) y se encadena ese borde en trazos caminando de vecino
    en vecino. Cuando un trazo se corta, salta al punto libre mas cercano
    -- ese salto es el blanking.

    Pensado para una imagen chica (~96 x 54): a esa escala el borde son
    unos cientos de pixeles y esto corre en pocos ms. max_edge_px es el
    tope de seguridad por si una escena muy ruidosa llena todo de bordes.
    """
    img = np.asarray(img, dtype=np.float32)
    if img.ndim != 3 or img.shape[0] < 3 or img.shape[1] < 3:
        return []
    h, w = img.shape[:2]
    rgb = img[..., :3]
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    on = lum > threshold
    if not on.any():
        return []
    pad = np.pad(on, 1, constant_values=False)
    inner = (pad[1:-1, 2:] & pad[1:-1, :-2] & pad[2:, 1:-1] & pad[:-2, 1:-1])
    edge = on & ~inner
    ys, xs = np.nonzero(edge)
    if len(xs) == 0:
        return []
    if len(xs) > max_edge_px:
        keep = np.linspace(0, len(xs) - 1, max_edge_px).astype(int)
        ys, xs = ys[keep], xs[keep]

    free = set(zip(xs.tolist(), ys.tolist()))
    coords = np.stack([xs, ys], axis=1).astype(np.float32)
    alive = np.ones(len(xs), dtype=bool)
    index = {p: i for i, p in enumerate(zip(xs.tolist(), ys.tolist()))}

    # Proporcion de la imagen: x ocupa -1..1, y se achica igual que la
    # imagen para que un circulo siga siendo un circulo.
    sx = 2.0 / (w - 1)
    aspect = (h - 1) / float(w - 1)

    strokes = []
    cur = (int(xs[0]), int(ys[0]))
    while True:
        path = [cur]
        free.discard(cur)
        alive[index[cur]] = False
        while True:
            nxt = None
            for dx, dy in _NEIGHBORS:
                cand = (cur[0] + dx, cur[1] + dy)
                if cand in free:
                    nxt = cand
                    break
            if nxt is None:
                break
            free.discard(nxt)
            alive[index[nxt]] = False
            path.append(nxt)
            cur = nxt
        if len(path) >= 3:
            p = np.array(path, dtype=np.float32)
            xy = np.stack([p[:, 0] * sx - 1.0,
                           (p[:, 1] * sx - aspect)], axis=1)
            # Suavizado de 3 puntos: quita la "escalera" de pixeles, que
            # el galvo dibujaria como vibracion en las diagonales.
            if len(xy) >= 5:
                xy[1:-1] = (xy[:-2] + xy[1:-1] * 2 + xy[2:]) / 4.0
            col = rgb[p[:, 1].astype(int), p[:, 0].astype(int)]
            # Un laser no tiene "gris": un borde tenue sale igual de
            # saturado; el brillo lo manda Laserbright, no la escena.
            peak = np.maximum(col.max(axis=1, keepdims=True), 1e-4)
            strokes.append((xy.astype(np.float32),
                            np.clip(col / peak, 0, 1).astype(np.float32)))
        if not free:
            break
        rest = np.nonzero(alive)[0]
        d = ((coords[rest] - np.array(cur, dtype=np.float32)) ** 2).sum(axis=1)
        j = rest[int(np.argmin(d))]
        cur = (int(xs[j]), int(ys[j]))
    return strokes


def pattern_strokes(pattern, c, image=None, threshold=0.35):
    """Trazos del patron elegido. AUTO sin imagen -> sin trazos."""
    name = PATTERNS[int(pattern) % len(PATTERNS)]
    if name == 'AUTO':
        return trace_image(image, threshold) if image is not None else []
    return {
        'CIRCULO': pattern_circle,
        'LISSAJOUS': pattern_lissajous,
        'TUNEL': pattern_tunnel,
        'ONDA': pattern_wave,
    }[name](c)


# ---------------------------------------------------------------
# SEGURIDAD + FRAME FINAL
# ---------------------------------------------------------------

DEFAULT_OPTS = {
    'size': 0.8,          # escala global (1 = todo el campo del galvo)
    'offx': 0.0,
    'offy': 0.0,
    'zone': (-1.0, 1.0, -1.0, 1.0),   # izq, der, abajo, arriba
    'bright': 0.5,        # techo de brillo 0..1
    'master': 1.0,        # Master Fade del show
    'emit': True,         # False = todo apagado (blackout, no armado...)
    'max_points': 800,    # presupuesto de puntos por frame
    'blank_points': 6,    # puntos apagados en cada salto
}


def finalize(strokes, opts=None):
    """Arma el frame que sale al laser, con TODAS las reglas de seguridad.

    Orden: escala/offset -> zona (lo que cae fuera se apaga, no se dibuja
    sobre el borde) -> presupuesto de puntos -> blanking entre trazos ->
    brillo (techo * master fade, o todo a 0 si no se puede emitir).

    Siempre devuelve al menos un punto (apagado en el centro): los DACs
    esperan un frame, no uno vacio.
    """
    o = dict(DEFAULT_OPTS)
    if opts:
        o.update(opts)
    strokes = [(np.asarray(xy, np.float32), np.asarray(rgb, np.float32))
               for xy, rgb in strokes if len(xy) > 0]

    total = sum(len(xy) for xy, _ in strokes)
    budget = max(1, int(o['max_points']) -
                 int(o['blank_points']) * 2 * len(strokes))
    if total > budget and total > 0:
        keep_ratio = budget / float(total)
        thinned = []
        for xy, rgb in strokes:
            k = max(2, int(round(len(xy) * keep_ratio)))
            if k < len(xy):
                idx = np.linspace(0, len(xy) - 1, k).astype(int)
                xy, rgb = xy[idx], rgb[idx]
            thinned.append((xy, rgb))
        strokes = thinned
        # Si hay tantos trazos que ni con 2 puntos cada uno entran, se
        # cortan los ultimos: mejor menos figura que un frame que el
        # galvo no alcanza a recorrer (parpadeo).
        while strokes and (sum(len(xy) for xy, _ in strokes) +
                           int(o['blank_points']) * 2 * len(strokes)
                           > int(o['max_points'])):
            strokes.pop()

    xs, ys, cols = [], [], []
    nb = int(o['blank_points'])
    for xy, rgb in strokes:
        p = xy * float(o['size']) + np.array([o['offx'], o['offy']], np.float32)
        # Blanking: llegar apagado al inicio del trazo...
        for _ in range(nb):
            xs.append(p[0, 0]); ys.append(p[0, 1]); cols.append((0, 0, 0))
        for (x, y), col in zip(p, rgb):
            xs.append(x); ys.append(y); cols.append(tuple(col))
        # ...y quedarse apagado al final antes del salto.
        for _ in range(nb):
            xs.append(p[-1, 0]); ys.append(p[-1, 1]); cols.append((0, 0, 0))

    if not xs:
        return empty_frame()

    x = np.array(xs, np.float32)
    y = np.array(ys, np.float32)
    rgb = np.array(cols, np.float32)

    zl, zr, zb, zt = o['zone']
    outside = (x < zl) | (x > zr) | (y < zb) | (y > zt)
    rgb[outside] = 0.0
    x = np.clip(x, max(zl, -1.0), min(zr, 1.0))
    y = np.clip(y, max(zb, -1.0), min(zt, 1.0))

    gain = 0.0 if not o['emit'] else \
        max(0.0, min(1.0, float(o['bright']))) * \
        max(0.0, min(1.0, float(o['master'])))
    rgb = np.clip(rgb * gain, 0.0, 1.0)
    return {'x': x, 'y': y, 'r': rgb[:, 0], 'g': rgb[:, 1], 'b': rgb[:, 2]}


def empty_frame():
    z = np.zeros(1, np.float32)
    return {'x': z.copy(), 'y': z.copy(), 'r': z.copy(), 'g': z.copy(),
            'b': z.copy()}


def frame_stats(frame):
    lit = (frame['r'] + frame['g'] + frame['b']) > 0
    return {'points': int(len(frame['x'])), 'lit': int(lit.sum())}


def blank(frame):
    """Mismo recorrido, todo apagado. Lo que va al DAC si no esta armado."""
    out = dict(frame)
    for k in ('r', 'g', 'b'):
        out[k] = np.zeros_like(frame[k])
    return out


# ---------------------------------------------------------------
# SIMULADOR: dibujar el frame como se veria el haz
# ---------------------------------------------------------------

def render_preview(frame, size=512, show_blank=True, zone=None):
    """Rasteriza el frame como lo veria el ojo: lineas brillantes entre
    puntos encendidos, con un resplandor suave. Opcionalmente los saltos
    apagados en gris tenue (util para ver cuanto recorrido se pierde) y
    el recuadro de la zona permitida.

    Devuelve (size, size, 4) float32, fila 0 = abajo (convencion TD).
    """
    acc = np.zeros((size, size, 3), np.float32)
    x = np.asarray(frame['x'], np.float32)
    y = np.asarray(frame['y'], np.float32)
    col = np.stack([frame['r'], frame['g'], frame['b']], axis=1).astype(np.float32)
    s = (size - 1) / 2.0

    if zone is not None:
        zl, zr, zb, zt = zone
        _box(acc, zl, zr, zb, zt, s, (0.0, 0.12, 0.0))

    if len(x) >= 2:
        c = col[1:].copy()
        lit = c.sum(axis=1) > 0
        if show_blank:
            c[~lit] = 0.06
            keep = np.ones(len(c), dtype=bool)
        else:
            keep = lit
        px, py = (x + 1) * s, (y + 1) * s
        _lines(acc, px[:-1][keep], py[:-1][keep], px[1:][keep], py[1:][keep],
               c[keep])
    elif len(x) == 1 and col[0].sum() > 0:
        _lines(acc, np.array([(x[0] + 1) * s]), np.array([(y[0] + 1) * s]),
               np.array([(x[0] + 1) * s]), np.array([(y[0] + 1) * s]),
               col[:1])

    # El resplandor se calcula a 1/4 de resolucion y se agranda: a 512 px
    # completos los dos blurs costaban ~35 ms por frame, a 1/4 ~1 ms. Un
    # glow es borroso por definicion, no pierde nada.
    q = 4 if size % 4 == 0 else 1
    small = acc[::q, ::q].copy()
    for dy in range(q):
        for dx in range(q):
            if dx or dy:
                np.maximum(small, acc[dy::q, dx::q], out=small)
    g = _blur(small, 1) + 0.5 * _blur(small, 3)
    glow = np.repeat(np.repeat(g, q, axis=0), q, axis=1)
    img = 1.0 - np.exp(-(acc * 1.6 + glow * 2.5))
    out = np.ones((size, size, 4), np.float32)
    out[..., :3] = img
    return out


def _lines(acc, x0, y0, x1, y1, c):
    """Todas las lineas de una vez (sin bucle de Python por segmento:
    con 800 puntos el bucle costaba ~40 ms por frame)."""
    if len(x0) == 0:
        return
    n = (np.maximum(np.abs(x1 - x0), np.abs(y1 - y0)).astype(int) + 1)
    seg = np.repeat(np.arange(len(n)), n)
    start = np.repeat(np.cumsum(n) - n, n)
    t = (np.arange(len(seg)) - start) / np.maximum(n[seg] - 1, 1)
    xi = np.clip(np.round(x0[seg] + (x1 - x0)[seg] * t).astype(int),
                 0, acc.shape[1] - 1)
    yi = np.clip(np.round(y0[seg] + (y1 - y0)[seg] * t).astype(int),
                 0, acc.shape[0] - 1)
    # Asignacion directa y no np.maximum.at (10x mas lento): si dos
    # muestras caen en el mismo pixel gana una cualquiera, que para un
    # preview da igual.
    acc[yi, xi] = np.maximum(acc[yi, xi], c[seg])


def _box(acc, zl, zr, zb, zt, s, c):
    n = acc.shape[0] - 1
    l, r = [int(round(min(max((v + 1) * s, 0), n))) for v in (zl, zr)]
    b, t = [int(round(min(max((v + 1) * s, 0), n))) for v in (zb, zt)]
    c = np.array(c, np.float32)
    acc[b, l:r + 1] = c
    acc[t, l:r + 1] = c
    acc[b:t + 1, l] = c
    acc[b:t + 1, r] = c


def _blur(img, r):
    """Box blur separable por sumas acumuladas (barato y sin scipy)."""
    out = img
    for axis in (0, 1):
        pad = [(0, 0)] * img.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(out, pad, mode='edge'), axis=axis)
        hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
        lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
        out = (hi - lo) / float(2 * r + 1)
    return out


# ---------------------------------------------------------------
# ARCHIVOS .ILD (ILDA Image Data Transfer Format)
# ---------------------------------------------------------------
# Formato 5: puntos 2D con color verdadero. Lo abren los visores y
# programas laser (QuickShow, Beyond, LaserOS, visores libres), asi que
# un .ild bien escrito es la prueba de que el frame es "laser de verdad"
# aunque todavia no haya un DAC conectado.

_ILDA_LAST = 0x80
_ILDA_BLANK = 0x40


def _ilda_header(fmt, name, n_records, frame_no, total, company='TDAI2026'):
    return (b'ILDA' + b'\x00\x00\x00' + bytes([fmt]) +
            name.encode('ascii', 'replace')[:8].ljust(8, b' ') +
            company.encode('ascii', 'replace')[:8].ljust(8, b' ') +
            struct.pack('>HHHBB', n_records, frame_no, total, 0, 0))


def write_ilda(path, frames, name='TDAI'):
    """Escribe una lista de frames (dicts x,y,r,g,b) como .ild formato 5."""
    total = len(frames)
    with open(path, 'wb') as f:
        for i, fr in enumerate(frames):
            n = len(fr['x'])
            f.write(_ilda_header(5, name, n, i, total))
            for k in range(n):
                x = int(round(max(-1.0, min(1.0, float(fr['x'][k]))) * 32767))
                y = int(round(max(-1.0, min(1.0, float(fr['y'][k]))) * 32767))
                r = int(round(max(0.0, min(1.0, float(fr['r'][k]))) * 255))
                g = int(round(max(0.0, min(1.0, float(fr['g'][k]))) * 255))
                b = int(round(max(0.0, min(1.0, float(fr['b'][k]))) * 255))
                status = 0
                if r == 0 and g == 0 and b == 0:
                    status |= _ILDA_BLANK
                if k == n - 1:
                    status |= _ILDA_LAST
                f.write(struct.pack('>hhBBBB', x, y, status, b, g, r))
        # Cabecera con 0 registros = fin de archivo.
        f.write(_ilda_header(5, name, 0, total, total))


def read_ilda(path):
    """Lee un .ild formato 5 (el que escribe write_ilda). Para tests."""
    frames = []
    with open(path, 'rb') as f:
        data = f.read()
    pos = 0
    while pos + 32 <= len(data):
        if data[pos:pos + 4] != b'ILDA':
            raise ValueError('cabecera ILDA invalida en byte {}'.format(pos))
        fmt = data[pos + 7]
        n = struct.unpack('>H', data[pos + 24:pos + 26])[0]
        pos += 32
        if n == 0:
            break
        if fmt != 5:
            raise ValueError('solo formato 5 (encontrado {})'.format(fmt))
        fr = {'x': [], 'y': [], 'r': [], 'g': [], 'b': [], 'status': []}
        for _ in range(n):
            x, y, st, b, g, r = struct.unpack('>hhBBBB', data[pos:pos + 8])
            pos += 8
            fr['x'].append(x / 32767.0)
            fr['y'].append(y / 32767.0)
            fr['r'].append(r / 255.0)
            fr['g'].append(g / 255.0)
            fr['b'].append(b / 255.0)
            fr['status'].append(st)
        frames.append(fr)
    return frames
