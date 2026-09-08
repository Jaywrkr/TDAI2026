#!/usr/bin/env python3
"""Verifica que los nodos de NIVEL SUPERIOR (hijos directos de
/project1) no se pisen en el canvas de TouchDesigner.

Por que existe: la posicion de un nodo (nodeX/nodeY) es 100% cosmetica
-- nunca afecta como corre el rig -- pero el rig se construyo en muchas
sesiones separadas, cada una agregando su propio modulo (audio.py,
midi.py, control.py, program.py...) con sus propias coordenadas, sin que
ningun modulo supiera donde habian quedado los demas. El resultado
real, medido: varios grupos de nodos de MODULOS DISTINTOS terminaron
literal o casi literalmente en la misma posicion (el caso mas flagrante:
midi.py y control.py con dos cadenas distintas ambas en (-1240, 200)).

Esto NO puede probarse abriendo TD (no hay TD en este entorno) y
tampoco ejecutando build() (necesita tipos reales de TD -- baseCOMP,
parameterCHOP... que no existen fuera de TD). Lo que SI se puede probar
sin TD es la aritmetica: parsear el AST de cada modulo, extraer cada
'x.nodeX, x.nodeY = A, B' de un nodo creado directo sobre 'proj' (no
anidado en un sub-COMP, que tiene su PROPIO canvas y no puede chocar con
el de arriba), y verificar que ningun par de cajas se superponga.

La caja de un nodo (160x50) es una estimacion conservadora del tamano
real en la vista normal de TD -- sin TD abierto no se puede confirmar el
numero exacto, asi que el test es deliberadamente generoso (mejor una
falsa alarma que dejar pasar una colision real).

Solo cubre HIJOS DIRECTOS de /project1 (proj.create(...)) en los modulos
del build principal. Nodos dentro de sub-COMPs (scenes/sceneN/content/*,
dashboard_ui/*) tienen su propio canvas local y quedan fuera de este
chequeo a proposito -- no pueden chocar con nada de aca.
"""
import ast
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
VJCORE = os.path.join(TD, 'vjcore')
sys.path.insert(0, TD)

FILES = ['audio.py', 'midi.py', 'control.py', 'media.py', 'autopilot.py',
         'keyboard.py', 'scenes.py', 'program.py', 'dashboard.py',
         'builder.py']

# Caja conservadora de un nodo en vista normal de TD (icono + label).
BOX_W, BOX_H = 160, 50


def _const_num(node):
    """int/float literal, o None si no es un literal simple (para no
    fallar silenciosamente sobre una expresion que no se puede evaluar)."""
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        inner = _const_num(node.operand)
        return -inner if inner is not None else None
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    return None


def extract_direct_positions(filename):
    """[(varname, opname, x, y, lineno)] de cada 'proj.create(...)' con
    su 'var.nodeX, var.nodeY = X, Y' en el mismo archivo -- incluye los
    casos donde X/Y llegan por ARGUMENTO a un helper local (_envelope,
    _filter en audio.py) o por un for-loop de tuplas literales (la
    misma tecnica, generalizada en vez de una lista pegada a mano)."""
    path = os.path.join(VJCORE, filename)
    src = open(path, encoding='utf-8').read()
    tree = ast.parse(src, filename=path)

    proj_vars = {}     # varname -> opname
    helper_xy_arg = {}  # func_name -> (arg_index_x, arg_index_y)
    results = []

    # Paso 1: funciones locales cuyo cuerpo hace 'algo.nodeX, algo.nodeY
    # = <param>, <param>' -- sus LLAMADORES pasan el x,y real.
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            params = [a.arg for a in node.args.args]
            for stmt in ast.walk(node):
                if (isinstance(stmt, ast.Assign) and len(stmt.targets) == 1
                        and isinstance(stmt.targets[0], ast.Tuple)
                        and len(stmt.targets[0].elts) == 2):
                    e0, e1 = stmt.targets[0].elts
                    if (isinstance(e0, ast.Attribute) and e0.attr == 'nodeX'
                            and isinstance(e1, ast.Attribute) and e1.attr == 'nodeY'
                            and isinstance(stmt.value, ast.Tuple)):
                        vx, vy = stmt.value.elts
                        if (isinstance(vx, ast.Name) and isinstance(vy, ast.Name)
                                and vx.id in params and vy.id in params):
                            helper_xy_arg[node.name] = (
                                params.index(vx.id), params.index(vy.id))

    # Paso 2: proj.create(...) directos -> variable de nivel superior.
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call):
            call = node.value
            if (isinstance(call.func, ast.Attribute) and call.func.attr == 'create'
                    and isinstance(call.func.value, ast.Name)
                    and call.func.value.id == 'proj'
                    and len(node.targets) == 1
                    and isinstance(node.targets[0], ast.Name)):
                opname = '<expr>'
                if len(call.args) >= 2 and isinstance(call.args[1], ast.Constant):
                    opname = call.args[1].value
                proj_vars[node.targets[0].id] = opname

    # Paso 3a: 'var.nodeX, var.nodeY = X, Y' con X,Y literales directos.
    for node in ast.walk(tree):
        if (isinstance(node, ast.Assign) and len(node.targets) == 1
                and isinstance(node.targets[0], ast.Tuple)
                and len(node.targets[0].elts) == 2):
            e0, e1 = node.targets[0].elts
            if not (isinstance(e0, ast.Attribute) and e0.attr == 'nodeX'
                    and isinstance(e1, ast.Attribute) and e1.attr == 'nodeY'
                    and isinstance(e0.value, ast.Name) and isinstance(e1.value, ast.Name)
                    and e0.value.id == e1.value.id):
                continue
            varname = e0.value.id
            if varname not in proj_vars:
                continue
            if isinstance(node.value, ast.Tuple) and len(node.value.elts) == 2:
                x = _const_num(node.value.elts[0])
                y = _const_num(node.value.elts[1])
                if x is not None and y is not None:
                    results.append((varname, proj_vars[varname], x, y, node.lineno))

    # Paso 3b: llamadas a un helper local que fija nodeX/nodeY por
    # argumento (ej. _envelope(proj, src, name, X, Y, ...)) -- el
    # resultado se asigna a una variable de nivel superior tambien.
    for node in ast.walk(tree):
        if (isinstance(node, ast.Assign) and isinstance(node.value, ast.Call)
                and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name)):
            call = node.value
            fname = call.func.id if isinstance(call.func, ast.Name) else None
            if fname in helper_xy_arg:
                ix, iy = helper_xy_arg[fname]
                if ix < len(call.args) and iy < len(call.args):
                    x = _const_num(call.args[ix])
                    y = _const_num(call.args[iy])
                    if x is not None and y is not None:
                        results.append((node.targets[0].id, fname + '(...)',
                                        x, y, node.lineno))

    # Paso 3c: for-loop de tuplas literales que crean 'proj.create(...)'
    # dentro (patron de audio.py: rename de canales).
    for node in ast.walk(tree):
        if isinstance(node, ast.For) and isinstance(node.iter, ast.List):
            has_proj_create = any(
                isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                and n.func.attr == 'create'
                and isinstance(n.func.value, ast.Name) and n.func.value.id == 'proj'
                for n in ast.walk(node))
            if not has_proj_create:
                continue
            target_names = ([t.id for t in node.target.elts]
                            if isinstance(node.target, ast.Tuple) else [])
            if 'x' not in target_names or 'y' not in target_names:
                continue
            ix, iy = target_names.index('x'), target_names.index('y')
            for elt in node.iter.elts:
                if isinstance(elt, ast.Tuple) and len(elt.elts) == len(target_names):
                    x = _const_num(elt.elts[ix])
                    y = _const_num(elt.elts[iy])
                    if x is not None and y is not None:
                        results.append(('<loop>', '<loop iter>', x, y, node.lineno))

    return results


def overlaps(a, b):
    ax, ay = a[3], a[4]
    bx, by = b[3], b[4]
    return not (ax + BOX_W <= bx or bx + BOX_W <= ax
                or ay + BOX_H <= by or by + BOX_H <= ay)


def main():
    fails = []

    def check(label, cond, detail=''):
        print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                                   ('  -> ' + detail) if detail else ''))
        if not cond:
            fails.append(label)

    all_nodes = []  # (file, varname, opname, x, y, lineno)
    for fn in FILES:
        for varname, opname, x, y, lineno in extract_direct_positions(fn):
            all_nodes.append((fn, varname, opname, x, y, lineno))

    print('--- nodos de nivel superior encontrados ---')
    print('  {} nodos en {} archivos'.format(len(all_nodes), len(FILES)))
    check('se encontraron nodos (si esto da 0, el extractor se rompio)',
          len(all_nodes) > 40, str(len(all_nodes)))

    print('\n--- ningun nodo de un modulo choca con uno de OTRO modulo ---')
    cross = []
    for i in range(len(all_nodes)):
        for j in range(i + 1, len(all_nodes)):
            a, b = all_nodes[i], all_nodes[j]
            if a[0] == b[0]:
                continue  # dentro del mismo archivo: fuera de este gate
            if overlaps(a, b):
                cross.append((a, b))
    for a, b in cross:
        print('  !! {}:{} {} ({},{})  vs  {}:{} {} ({},{})'.format(
            a[0], a[5], a[1], a[3], a[4], b[0], b[5], b[1], b[3], b[4]))
    check('cero colisiones entre modulos distintos', len(cross) == 0,
          '{} encontradas'.format(len(cross)))

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
