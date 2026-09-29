#!/usr/bin/env python3
"""Regresiones de errores vistos DENTRO de TouchDesigner.

    python3 td/tools/test_errores_red.py

- trails_fb (Feedback TOP) sin input propio: "Not enough sources specified".
- dashboard_ui/beat_light: op('/project1/ctrl')['beat'][0] con el canal
  todavia inexistente -> "TypeError: 'NoneType' object is not subscriptable".
"""
import os
import re
import sys

TD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS = []


def check(label, cond):
    print('  [{}] {}'.format('OK' if cond else '!!', label))
    if not cond:
        FAILS.append(label)


def src(name):
    with open(os.path.join(TD, 'vjcore', name), encoding='utf-8') as f:
        return f.read()


prog = src('program.py')
check('trails_fb recibe program_clean como input 0',
      'connect(fb, clean, 0)' in prog)
check('verify() cuenta el input de trails_fb',
      "('trails_fb', 1)" in src('builder.py'))

# Ninguna expresion puede indexar un canal por NOMBRE sin guarda.
for name in ('dashboard.py', 'program.py', 'control.py', 'audio.py',
             'scenes.py', 'laser.py'):
    bad = re.findall(r"\['[a-z]+'\]\[0\]", src(name))
    check('{}: sin op(...)[\'canal\'][0] sin guarda'.format(name), not bad)
dash = src('dashboard.py')
check('beat_light protegido si falta el canal beat',
      "['beat'] is not None" in dash)

# Audio sin Device elegido: a_level_smooth existe pero con 0 canales, y
# op(...)[0] da None -> "'NoneType' object has no attribute 'eval'" en
# time_scaled, time_real y music_gate.
sys.path.insert(0, TD)
from vjcore import control  # noqa: E402


class _Par:
    def eval(self):
        return 0.5


class _Proj:
    class par:
        Speed = _Par()


class _Empty:
    numChans = 0

    def __getitem__(self, i):
        return None


ops = {'/project1': _Proj(), '/project1/a_level_smooth': _Empty(),
       '/project1/a_bass_out': _Empty()}
try:
    v = eval(control.speed_rate_expression(),
             {'op': ops.get, 'max': max, 'min': min})
    check('Speed 0.5 sin audio conectado -> media velocidad (no error, no se congela)', v == 1.0)
except Exception as e:
    check('Speed sin audio conectado (no error): {}'.format(e), False)
for name in ('audio.py', 'control.py', 'program.py', 'scenes.py'):
    raw = re.findall(r"op\('[^']+'\)\[0\]\.eval\(\)(?! if)", src(name))
    check('{}: todo op(...)[0].eval() va con guarda de canales'.format(name),
          not raw)

# Rebuild borraba el Device de audio1 -> sin audio nada bailaba.
b = src('builder.py')
check('el build guarda y restaura los Devices (audio1, midi1, midi_out)',
      '_snapshot_devices(old)' in b and '_restore_devices(proj, devices)' in b
      and "DEVICE_NODES = ('audio1', 'midi1', 'midi_out')" in b)
check('verify avisa si audio1 no tiene Device', 'audio1 con Device elegido' in b)

print()
print('TODO OK' if not FAILS else 'FALLARON {}: {}'.format(len(FAILS), FAILS))
sys.exit(1 if FAILS else 0)
