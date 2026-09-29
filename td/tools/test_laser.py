#!/usr/bin/env python3
"""Laser ILDA opcional: se puede probar entero SIN hardware y sin TD.

    python3 td/tools/test_laser.py

Cubre lo que importa cuando no siempre hay laser:
  - por defecto esta APAGADO y no cocina (costo cero en un show sin laser),
  - nunca arranca armado; PANICO lo desarma,
  - las reglas de seguridad de laserfx.finalize (blackout, zona, techo de
    brillo, presupuesto de puntos, blanking),
  - sin armar, al DAC solo le llegan colores en 0,
  - los .ild que se escriben se pueden volver a leer (formato 5),
  - el trazado AUTO de una escena es rapido y no explota con ruido.
"""
import os
import sys
import tempfile
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

from vjcore import laserfx as L  # noqa: E402
from preview_laser import test_image, fake_ctrl  # noqa: E402

FAILS = []


def check(label, cond, detail=''):
    print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                               ('  -> ' + str(detail)) if detail else ''))
    if not cond:
        FAILS.append(label)


def src(*parts):
    with open(os.path.join(TD, *parts), encoding='utf-8') as f:
        return f.read()


def lit(frame):
    return int(((frame['r'] + frame['g'] + frame['b']) > 0).sum())


def main():
    print('HABILITAR / DESHABILITAR')
    b = src('vjcore', 'builder.py')
    check('Lasermode arranca en APAGADO',
          "laserfx.MODE_OFF, 0, len(laserfx.MODES) - 1)" in b)
    check('Laserarm arranca desarmado',
          "'Laserarm', 'ARMAR emision (solo SALIDA DAC)', False)" in b)
    check('par_exec aplica el modo al cambiar Lasermode',
          "par.name == 'Lasermode'" in b and 'L.apply_mode(' in b)
    check('par_exec: Abrir simulador y Exportar .ild',
          "n == 'Laserwindow'" in b and "n == 'Laserexport'" in b)
    lz = src('vjcore', 'laser.py')
    check('el COMP laser se construye SIN cocinar',
          'comp.allowCooking = False' in lz)
    check('apply_mode apaga el cooking en APAGADO',
          'comp.allowCooking = mode != laserfx.MODE_OFF' in lz)
    check('salir de SALIDA DAC desarma',
          "if mode != laserfx.MODE_DAC:\n        safe_set(proj, 'Laserarm', False)"
          in lz)
    check('sin CHOP de DAC en este build -> se sigue (no aborta el build)',
          'g.get(type_name)' in lz and 'return None, None' in lz)
    check('laser_down en /project1 con cable directo a show_out',
          "proj.create(resolutionTOP, 'laser_down')" in lz
          and 'connect(down, show)' in lz
          and "op('/project1/laser_down')" in lz)
    check('Script OPs sin inputs: no cocinan cada frame del show',
          'connect(pts,' not in lz and 'connect(prev,' not in lz)
    check('reloj propio: puntos cada 2 frames, simulador cada 4 (o 12)',
          'POINTS_EVERY = 2' in lz and 'PREVIEW_EVERY = 4' in lz
          and 'PREVIEW_EVERY_CLOSED = 12' in lz and 'def tick(token)' in lz)
    check('un solo reloj a la vez (token)',
          "if token != _STATE.get('token'):" in lz)
    check('AUTO lee la GPU en diferido (sin frenar el frame)',
          'numpyArray(delayed=True)' in lz)
    check('patron por defecto no es AUTO (el mas caro)',
          "1, 0, len(laserfx.PATTERNS) - 1)" in b)
    check('se reusa el DAT de callbacks que crea TD',
          'script_op.par.callbacks.eval()' in lz)
    cs = src('vjcore', 'dats', 'control_script.py')
    panic = cs[cs.index('def panic():'):cs.index('def toggleRecord():')]
    check('PANICO desarma el laser', 'L.disarm(p)' in panic)
    start = cs[cs.index('def safeStartup():'):]
    check('arranque: desarma y aplica el modo',
          'L.disarm(p)' in start and 'L.apply_mode(p)' in start)
    init = src('vjcore', '__init__.py')
    check('reload_all recarga laserfx y laser',
          "'laserfx'" in init and "'laser'" in init)

    print('SEGURIDAD (laserfx.finalize)')
    strokes = L.pattern_strokes(1, fake_ctrl(0.3))          # CIRCULO
    f_on = L.finalize(strokes, {'bright': 1.0})
    check('patron normal emite', lit(f_on) > 50, lit(f_on))
    f_bo = L.finalize(strokes, {'emit': False})
    check('blackout -> 0 puntos encendidos', lit(f_bo) == 0)
    f_m0 = L.finalize(strokes, {'master': 0.0})
    check('Master Fade en 0 -> 0 puntos encendidos', lit(f_m0) == 0)
    f_b = L.finalize(strokes, {'bright': 0.3})
    peak = max(f_b['r'].max(), f_b['g'].max(), f_b['b'].max())
    check('techo de brillo respetado (<= 0.3)', peak <= 0.3 + 1e-6, peak)
    f_z = L.finalize(strokes, {'zone': (-1.0, 1.0, 0.0, 1.0), 'bright': 1.0})
    lit_below = ((f_z['r'] + f_z['g'] + f_z['b']) > 0) & (f_z['y'] < 0.0)
    check('zona: nada encendido fuera de la zona', not lit_below.any())
    check('zona: posiciones recortadas al borde', f_z['y'].min() >= 0.0,
          f_z['y'].min())
    many = [L._stroke(np.random.rand(50, 2) * 2 - 1, (1, 1, 1))
            for _ in range(40)]
    f_bud = L.finalize(many, {'max_points': 300})
    check('presupuesto de puntos respetado (<= 300)',
          len(f_bud['x']) <= 300, len(f_bud['x']))
    two = [L._stroke([[-0.5, 0], [-0.4, 0], [-0.3, 0]], (1, 0, 0)),
           L._stroke([[0.3, 0], [0.4, 0], [0.5, 0]], (0, 1, 0))]
    f2 = L.finalize(two, {'size': 1.0, 'bright': 1.0, 'blank_points': 4})
    col = f2['r'] + f2['g'] + f2['b']
    jump = [i for i in range(1, len(col))
            if abs(f2['x'][i] - f2['x'][i - 1]) > 0.2]
    check('el salto entre trazos va APAGADO',
          jump and all(col[i] == 0 and col[i - 1] == 0 for i in jump), jump)
    fe = L.finalize([])
    check('sin trazos -> 1 punto apagado (el DAC nunca recibe vacio)',
          len(fe['x']) == 1 and lit(fe) == 0)
    fb = L.blank(f_on)
    check('sin armar -> al DAC le llega el recorrido con colores en 0',
          lit(fb) == 0 and len(fb['x']) == len(f_on['x']))

    print('PATRONES')
    for i, name in enumerate(L.PATTERNS):
        fr = L.finalize(L.pattern_strokes(i, fake_ctrl(1.0), test_image(1.0)),
                        {'bright': 1.0})
        ok = (lit(fr) > 20 and np.all(np.abs(fr['x']) <= 1)
              and np.all(np.abs(fr['y']) <= 1))
        check('{} dibuja dentro del campo'.format(name), ok, lit(fr))
    check('AUTO sin imagen -> sin trazos',
          L.pattern_strokes(0, fake_ctrl(0), None) == [])
    check('AUTO con imagen negra -> sin trazos',
          L.trace_image(np.zeros((54, 96, 4), np.float32)) == [])
    rng = np.random.default_rng(1)
    noisy = rng.random((54, 96, 4)).astype(np.float32)
    t0 = time.time()
    fr = L.finalize(L.trace_image(noisy, 0.5), {'max_points': 800})
    dt = (time.time() - t0) * 1000
    check('AUTO con ruido: respeta el presupuesto', len(fr['x']) <= 800,
          len(fr['x']))
    check('AUTO con ruido: rapido (< 60 ms en CPU)', dt < 60, '{:.1f} ms'.format(dt))

    print('ARCHIVO .ILD')
    frames = [L.finalize(L.pattern_strokes(3, fake_ctrl(k / 30.0)),
                         {'bright': 1.0}) for k in range(5)]
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, 't.ild')
        L.write_ilda(path, frames)
        back = L.read_ilda(path)
        with open(path, 'rb') as fh:
            head = fh.read(8)
    check('empieza con cabecera ILDA formato 5',
          head[:4] == b'ILDA' and head[7] == 5)
    check('mismo numero de frames', len(back) == len(frames), len(back))
    check('mismo numero de puntos',
          all(len(a['x']) == len(b_['x']) for a, b_ in zip(frames, back)))
    err = max(np.abs(np.array(b_['x']) - a['x']).max()
              for a, b_ in zip(frames, back))
    check('coordenadas fieles (error < 1e-4)', err < 1e-4, err)
    st = back[0]['status']
    check('ultimo punto marcado', st[-1] & 0x80 and not any(s & 0x80 for s in st[:-1]))
    blank_ok = all(bool(s & 0x40) == (r == 0 and g == 0 and b_ == 0)
                   for s, r, g, b_ in zip(st, back[0]['r'], back[0]['g'],
                                          back[0]['b']))
    check('bit de blanking = punto apagado', blank_ok)

    print('SIMULADOR')
    img = L.render_preview(f_on, 256, True, (-1, 1, -1, 1))
    check('preview 256x256 RGBA', img.shape == (256, 256, 4))
    check('preview muestra el haz', img[..., :3].max() > 0.5)
    dark = L.render_preview(f_bo, 256, False, None)
    check('preview en blackout queda negro', dark[..., :3].max() < 1e-6)

    print()
    if FAILS:
        print('FALLARON {}: {}'.format(len(FAILS), FAILS))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
