#!/usr/bin/env python3
"""Comprueba, FUERA de TouchDesigner, que el paquete se puede importar y que
los puntos de entrada resuelven a lo que deben.

    python3 td/tools/smoke_import.py

No construye nada (eso necesita TD). Lo que atrapa es la clase de fallo que
solo aparece al ejecutar: modulos que no importan, nombres mal escritos, y
sobre todo colisiones entre el nombre de un submodulo y el de una funcion
del paquete: Python asigna el submodulo como atributo del paquete al
importarlo, asi que vjcore/build.py pisaba a la funcion vjcore.build().
"""

import importlib
import os
import re
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

FAILURES = []

# Globales que TouchDesigner inyecta en su namespace y en los DATs, pero NO
# en modulos importados desde sys.path.
TD_NAMES = {'op', 'ops', 'run', 'absTime', 'project', 'parent', 'me',
            'ui', 'monitors', 'app', 'iop', 'ipar', 'var'}
TD_TYPE_RE = re.compile(r'^[a-z][A-Za-z0-9]*(COMP|TOP|CHOP|DAT|SOP|MAT)$')


def td_globals_used(path):
    """Nombres de globales de TD que el modulo lee y no define el mismo.

    Usa el AST, asi que no cuenta apariciones en comentarios ni en strings.
    """
    import ast as _ast
    with open(path, encoding='utf-8') as f:
        tree = _ast.parse(f.read())

    definidos = set()
    leidos = set()
    for node in _ast.walk(tree):
        if isinstance(node, _ast.Name):
            (definidos if isinstance(node.ctx, _ast.Store) else leidos).add(node.id)
        elif isinstance(node, (_ast.FunctionDef, _ast.AsyncFunctionDef,
                               _ast.ClassDef)):
            definidos.add(node.name)
        elif isinstance(node, (_ast.Import, _ast.ImportFrom)):
            for a in node.names:
                definidos.add((a.asname or a.name).split('.')[0])
        elif isinstance(node, _ast.arg):
            definidos.add(node.arg)

    libres = leidos - definidos
    return {n for n in libres if n in TD_NAMES or TD_TYPE_RE.match(n)}


def check(label, cond, detail=''):
    print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                               (' -> ' + detail) if detail else ''))
    if not cond:
        FAILURES.append(label)


def main():
    print('SMOKE TEST - importacion del paquete')
    print('=' * 58)

    import vjcore
    check('import vjcore', True)

    for name in vjcore._SUBMODULES:
        try:
            importlib.import_module('vjcore.' + name)
            check('import vjcore.' + name, True)
        except Exception as e:
            check('import vjcore.' + name, False, repr(e))

    # El fallo que nos mordio: _mod('build') debe devolver el MODULO,
    # no la funcion vjcore.build.
    for name in vjcore._SUBMODULES:
        m = vjcore._mod(name)
        check('_mod({!r}) devuelve un modulo'.format(name),
              isinstance(m, types.ModuleType), type(m).__name__)

    b = vjcore._mod('builder')
    check('modulo builder tiene .build()', callable(getattr(b, 'build', None)))
    check('modulo builder tiene .verify()', callable(getattr(b, 'verify', None)))

    # Ningun submodulo puede llamarse igual que una funcion publica del
    # paquete, o al importarlo la pisa.
    publicas = {n for n in dir(vjcore)
                if not n.startswith('_') and callable(getattr(vjcore, n))
                and not isinstance(getattr(vjcore, n), types.ModuleType)}
    choques = publicas & set(vjcore._SUBMODULES)
    check('sin choque submodulo/funcion', not choques, str(choques))

    for n in ('build', 'reload_all', 'reload_shaders'):
        check('vjcore.{} sigue siendo callable'.format(n),
              callable(getattr(vjcore, n, None))
              and not isinstance(getattr(vjcore, n), types.ModuleType))

    s = vjcore._mod('scenes')
    check('modulo scenes tiene .reload_all()',
          callable(getattr(s, 'reload_all', None)))
    c = vjcore._mod('control')
    check('modulo control tiene .resolve_channels()',
          callable(getattr(c, 'resolve_channels', None)))

    # Todo modulo que use globales de TouchDesigner (op, run, absTime,
    # baseCOMP, glslTOP...) tiene que traerlos con "from td import *".
    # Sin eso el modulo importa bien y revienta al ejecutarse.
    for name in vjcore._SUBMODULES + ['__init__']:
        fn = os.path.join(TD, 'vjcore', name + '.py')
        usados = td_globals_used(fn)
        tiene = 'from td import' in open(fn, encoding='utf-8').read()
        check('{}.py: globales TD declarados'.format(name),
              tiene or not usados,
              'usa {} sin "from td import *"'.format(sorted(usados)[:5])
              if usados and not tiene else '')

    # El bucle de refresco del diagnostico (tickDiag) tiene que arrancar
    # desde builder.py, no solo desde runtime_manager.onStart(). onStart de
    # un Execute DAT dispara una vez por SESION de TD, no cada vez que un
    # script recrea /project1 con TD ya corriendo -- que es el caso normal
    # de "Run Script". Si el unico disparador es onStart, el panel de
    # estado se queda congelado en el primer valor para siempre.
    builder_src = open(os.path.join(TD, 'vjcore', 'builder.py'),
                       encoding='utf-8').read()
    check('builder.py arranca tickDiag() explicitamente',
          "runtime_manager').module.tickDiag()" in builder_src
          or 'module.tickDiag()' in builder_src)

    # Los DATs de runtime tambien deben ser Python valido.
    import ast
    dat_dir = os.path.join(TD, 'vjcore', 'dats')
    for fn in sorted(os.listdir(dat_dir)):
        if not fn.endswith('.py'):
            continue
        try:
            with open(os.path.join(dat_dir, fn), encoding='utf-8') as f:
                ast.parse(f.read())
            check('dats/' + fn, True)
        except SyntaxError as e:
            check('dats/' + fn, False, str(e))

    print('')
    print('RESULTADO: {}'.format(
        'TODO OK' if not FAILURES else '{} fallo(s)'.format(len(FAILURES))))
    return 1 if FAILURES else 0


if __name__ == '__main__':
    sys.exit(main())
