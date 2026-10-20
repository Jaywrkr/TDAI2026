"""Pruebas de la NOCHE (avance de la fiesta 22:00 -> 05:30).

uso: python3 td/tools/test_noche.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

from vjcore import config   # noqa: E402

fails = []


def check(label, cond, detail=''):
    print('  [{}] {}{}'.format('OK' if cond else 'FALLA', label, ('  -> ' + str(detail)) if detail else ''))
    if not cond:
        fails.append(label)


def night_progress():
    src = open(os.path.join(TD, 'vjcore', 'dats', 'diagnostics.py'), encoding='utf-8').read()
    code = 'def night_progress' + src.split('def night_progress')[1].split('def updateNight')[0]
    ns = {}
    exec(code, ns)
    return ns['night_progress']


def main():
    f = night_progress()
    check('22:00 -> 0', abs(f(22.0, 22.0, 5.5)) < 1e-6)
    check('01:45 -> 0.5 (mitad de la noche)', abs(f(1.75, 22.0, 5.5) - 0.5) < 1e-6)
    check('05:30 -> 1', abs(f(5.5, 22.0, 5.5) - 1.0) < 1e-6)
    check('crece siempre entre 22 y 5:30',
          all(f(h1 % 24, 22, 5.5) <= f(h2 % 24, 22, 5.5) + 1e-9
              for h1, h2 in zip([22 + i * 0.25 for i in range(29)], [22 + (i + 1) * 0.25 for i in range(29)])))
    check('de dia, despues del fin -> 1', abs(f(7.0, 22.0, 5.5) - 1.0) < 1e-6)
    check('a la tarde, antes del inicio -> 0', abs(f(19.0, 22.0, 5.5)) < 1e-6)
    check('canal night en la textura de control', 'night' in config.CTRL_CHANNELS)
    check('Nochevalor -> night en PAR_CHANNELS', ('Nochevalor', 'night') in config.PAR_CHANNELS)
    b = open(os.path.join(TD, 'vjcore', 'builder.py'), encoding='utf-8').read()
    check('pagina Noche con sus parametros',
          all(n in b for n in ('Nocheauto', 'Nocheinicio', 'Nochefin', 'Nochemanual', 'Nocheintensidad', 'Nochevalor')))
    k = open(os.path.join(TD, 'sets', 'halloween', 'common.glsl'), encoding='utf-8').read()
    check('el kit de Halloween aplica la noche en hkFinish',
          'hkNightFrame(hkNightGrade(col), uv)' in k)
    print('TODO OK' if not fails else 'FALLARON {}: {}'.format(len(fails), fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
