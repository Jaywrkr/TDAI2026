#!/usr/bin/env python3
"""El bloom se arma con los inputs en el orden que lee su shader (fase 51).

Arma _build_bloom con un TouchDesigner de mentira y comprueba, para cada
GLSL TOP, que los inputs conectados no tengan huecos y que el shader no lea
un sTD2DInputs[i] que no esta conectado. En la Mac un hueco (control en el
input 2 con el 1 vacio) deja el indice fuera del arreglo y el shader no
compila: "The GLSL Shader has compile errors" en bloom_prefilter.

    python3 td/tools/test_bloom_inputs.py
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from vjcore import config, program  # noqa: E402


class Conn:
    def __init__(self, owner, i):
        self.owner, self.i = owner, i

    def connect(self, src):
        self.owner.inputs[self.i] = src


class Par:
    def __init__(self):
        self.val = None
        self.expr = None


class Pars:
    def __getattr__(self, name):
        p = Par()
        setattr(self, name, p)
        return p


class Op:
    def __init__(self, kind, name):
        self.kind, self.name, self.path = kind, name, '/project1/' + name
        self.inputs = {}
        self.inputConnectors = [Conn(self, i) for i in range(8)]
        self.par = Pars()
        self.text = ''
        self.nodeX = self.nodeY = 0


class Proj:
    def __init__(self):
        self.ops = {}

    def create(self, kind, name):
        o = Op(kind, name)
        self.ops[name] = o
        return o

    def op(self, name):
        return self.ops.get(name)


fails = []


def check(name, ok, info=''):
    print('  [{}] {}{}'.format('OK' if ok else 'FALLA', name, '' if ok else '  -> {}'.format(info)))
    if not ok:
        fails.append(name)


program.textDAT, program.glslTOP = 'textDAT', 'glslTOP'
proj = Proj()
src = Op('nullTOP', 'program_src')
ctrl = Op('choptoTOP', 'ctrl_tex')
program._build_bloom(proj, src, ctrl, list(config.CTRL_CHANNELS))

for name, dat in (('bloom_prefilter', 'bloom_prefilter_src'), ('program_bloom', 'bloom_src')):
    top, text = proj.ops[name], proj.ops[dat].text
    con = sorted(top.inputs)
    check('{}: inputs sin huecos {}'.format(name, con), con == list(range(len(con))), con)
    used = sorted({int(m) for m in re.findall(r'sTD2DInputs\[(\d+)\]', text)})
    check('{}: el shader solo lee inputs conectados {}'.format(name, used),
          all(i in top.inputs for i in used), (used, con))
    ctrl_at = [i for i, o in top.inputs.items() if o is ctrl]
    check('{}: la textura de control es el ultimo input'.format(name),
          ctrl_at == [max(con)], ctrl_at)

print('\nTODO OK' if not fails else '\nFALLA: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
