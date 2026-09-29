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

print()
print('TODO OK' if not FAILS else 'FALLARON {}: {}'.format(len(FAILS), FAILS))
sys.exit(1 if FAILS else 0)
