#!/usr/bin/env python3
"""Corre flake8 (solo F821/F822/F823/F841) sobre vjcore/ para atrapar
nombres indefinidos y variables muertas -- el tipo de bug que ni
compila mal (es Python valido) ni lo agarra ningun otro gate de este
repo, y que solo se nota en TIEMPO DE EJECUCION, adentro de TD, cuando
justo se ejecuta esa rama de codigo.

Nacio de un bug real: _mark_setup_nodes() en builder.py usaba 'c.X' en
vez de 'config.X' -- 'c' existe como alias local DENTRO de otra funcion
del mismo archivo (_parameters), pero no en esta. Ni ast.parse ni
ninguno de los otros tools/test_*.py lo hubieran encontrado: solo
truena cuando el build llega a llamar esa funcion.

Alcance: SOLO vjcore/*.py (los modulos de nivel superior, que declaran
"from td import *" para traer los globales de TD). vjcore/dats/*.py
queda AFUERA a proposito: esos archivos corren como texto de un DAT
DENTRO de TD, que les inyecta 'op'/'run'/'project'/'absTime' directo en
su namespace de ejecucion -- no hay ningun import posible ahi, asi que
flake8 los marca TODOS como "indefinidos" aunque no lo esten. Se
verifico a mano que esos 4 nombres son los UNICOS que flake8 marca en
dats/ (ver el commit que agrego este test) -- si algun dia aparece un
quinto nombre distinto en esa lista, es una senal real de que hay que
mirarlo.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
VJCORE = os.path.join(TD, 'vjcore')

RULES = 'F821,F822,F823,F841'

# Los unicos nombres que TD inyecta en el namespace de un DAT y que por
# eso NO son un bug real en vjcore/dats/*.py.
TD_INJECTED = {'op', 'run', 'project', 'absTime'}


def _run_flake8(paths):
    try:
        r = subprocess.run(
            ['flake8', '--select=' + RULES] + paths,
            capture_output=True, text=True)
    except FileNotFoundError:
        return None
    return r.stdout


def main():
    fails = []

    def check(label, cond, detail=''):
        print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                                   ('  -> ' + detail) if detail else ''))
        if not cond:
            fails.append(label)

    top_level = [os.path.join(VJCORE, f) for f in os.listdir(VJCORE)
                 if f.endswith('.py')]
    out = _run_flake8(top_level)
    if out is None:
        print('  flake8 no esta instalado -- se salta este gate '
              '(no cuenta como fallo, pero corre en el entorno de dev).')
        return 0

    print('--- vjcore/*.py (modulos con "from td import *") ---')
    lines = [l for l in out.splitlines() if l.strip()]
    for l in lines:
        print('  !!', l)
    check('cero nombres indefinidos / variables muertas', not lines,
          '{} encontrados'.format(len(lines)))

    print('\n--- vjcore/dats/*.py (corren dentro de un DAT, sin import) ---')
    dats_dir = os.path.join(VJCORE, 'dats')
    dats_files = [os.path.join(dats_dir, f) for f in os.listdir(dats_dir)
                 if f.endswith('.py')]
    out = _run_flake8(dats_files)
    lines = [l for l in out.splitlines() if l.strip()] if out else []

    unexpected = []
    f821_names = set()
    for l in lines:
        if ': F821 ' in l:
            name = l.split("undefined name '")[-1].rstrip("'")
            f821_names.add(name)
            if name not in TD_INJECTED:
                unexpected.append(l)
        else:
            unexpected.append(l)  # F841/F822/F823: siempre real aca tambien

    check('los F821 son SOLO los globales que TD inyecta ({})'
          .format(sorted(TD_INJECTED)),
          f821_names <= TD_INJECTED,
          'aparecieron ademas: {}'.format(sorted(f821_names - TD_INJECTED)))
    for l in unexpected:
        print('  !!', l)
    check('sin variables muertas (F841) ni otros hallazgos reales en dats/',
          not unexpected, '{} encontrados'.format(len(unexpected)))

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
