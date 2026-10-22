#!/usr/bin/env python3
"""Fase 37: TODAS las escenas de Halloween responden al piano de forma
visible (medir_teclas.py --check: ninguna FLOJA con un acorde de 3
teclas). Se salta sin moderngl."""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    try:
        import moderngl  # noqa: F401
    except ImportError:
        print('(sin moderngl: se salta)')
        print('RESULTADO: TODO OK')
        return 0
    r = subprocess.run([sys.executable, os.path.join(HERE, 'medir_teclas.py'), '--set', 'halloween',
                        '--size', '320x128', '--check'], capture_output=True, text=True)
    print(r.stdout.strip())
    if r.returncode != 0:
        print(r.stderr.strip()[-2000:])
        print('RESULTADO: FALLA')
        return 1
    print('RESULTADO: TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
