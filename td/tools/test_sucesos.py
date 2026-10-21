#!/usr/bin/env python3
"""Repertorio de sucesos (fase 30): en cada escena que declara su
repertorio (lineas @SUC/@CLX en el .frag), durante 3 horas y con la noche
y el Miedo en tres niveles:
  - ningun suceso ni detalle cae encima de un climax
  - nada sale dos veces seguido (sin un climax en medio)
  - salen todas las variantes declaradas
Usa timeline_sucesos.py (el mismo GLSL que corre en TD).
"""
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
VIS = os.path.join(TD, 'sets', 'halloween', 'visuals')


def main():
    try:
        import moderngl  # noqa: F401
    except ImportError:
        print('(sin moderngl: se salta)')
        return 0
    scenes = []
    for f in sorted(os.listdir(VIS)):
        m = re.match(r'scene(\d+)_', f)
        if m and '@SUC:' in open(os.path.join(VIS, f), encoding='utf-8').read():
            scenes.append(int(m.group(1)))
    fails = []
    for sc in scenes:
        for night, fear in (('0.2', '0.0'), ('0.6', '0.4'), ('1.0', '1.0')):
            r = subprocess.run([sys.executable, os.path.join(HERE, 'timeline_sucesos.py'), str(sc),
                                '--min', '180', '--night', night, '--fear', fear],
                               capture_output=True, text=True)
            out = r.stdout
            ok = r.returncode == 0 and 'chequeos: OK' in out
            # todas las variantes declaradas aparecen
            src = open([os.path.join(VIS, f) for f in os.listdir(VIS) if f.startswith('scene{:02d}_'.format(sc))][0],
                       encoding='utf-8').read()
            for key in ('SUC', 'DET', 'CLX'):
                m = re.search(r'//\s*@' + key + r':\s*(.*)', src)
                if not m:
                    continue
                line = re.search(r'  ' + key + r': (.*)', out)
                got = line.group(1) if line else ''
                for name in (x.strip() for x in m.group(1).split('|')):
                    if name + ' x' not in got:
                        ok = False
                        print('  [!!] escena {:02d}: "{}" nunca sale'.format(sc, name))
            print('  [{}] escena {:02d}  noche {} miedo {}'.format('OK' if ok else '!!', sc, night, fear))
            if not ok:
                print('\n'.join(l for l in out.splitlines() if '[!!]' in l))
                fails.append((sc, night, fear))
    print()
    if fails:
        print('FALLOS:', fails)
        return 1
    print('RESULTADO: TODO OK ({} escenas con repertorio)'.format(len(scenes)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
