#!/usr/bin/env python3
"""Compila fuera de TouchDesigner todos los visuals/*.frag.

Simula lo que TouchDesigner inyecta en un GLSL TOP (vUV, sTD2DInputs,
TDOutputSwizzle) y pasa el resultado por glslangValidator.

    python3 td/tools/validate_shaders.py

Atrapa errores de sintaxis GLSL ANTES de abrir TD. Es la red de seguridad
principal cuando una IA genera un visual nuevo.
"""

import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

from vjcore import config, shader  # noqa: E402

# Prologo que TouchDesigner inyecta por su cuenta en cada GLSL TOP.
TD_PROLOGUE = """#version 330
uniform sampler2D sTD2DInputs[1];
in vec3 vUV;
vec4 TDOutputSwizzle(vec4 c) { return c; }
"""


def build_source(index, force_template=False):
    if force_template:
        path = shader.template_path()
        with open(path, 'r', encoding='utf-8') as f:
            body = f.read()
    else:
        body, path = shader.read_body(index)
    src = (TD_PROLOGUE
           + shader.make_header(index, config.CTRL_CHANNELS)
           + body
           + shader._FOOTER)
    return src, path


def validate(index, force_template=False):
    src, path = build_source(index, force_template)
    with tempfile.NamedTemporaryFile('w', suffix='.frag', delete=False) as f:
        f.write(src)
        tmp = f.name
    try:
        r = subprocess.run(['glslangValidator', '-S', 'frag', tmp],
                           capture_output=True, text=True)
        return r.returncode == 0, path, r.stdout + r.stderr, src
    finally:
        os.unlink(tmp)


def annotate(out, src):
    lines = src.split('\n')
    res = []
    for ln in out.strip().split('\n'):
        if not ln.strip():
            continue
        res.append('    ' + ln)
        m = re.search(r':(\d+):', ln)
        if m:
            n = int(m.group(1))
            if 0 < n <= len(lines):
                res.append('        >> ' + lines[n - 1].strip())
    return '\n'.join(res)


def main():
    targets = [('_TEMPLATE', 0, True)]
    for i in range(config.N_SCENES):
        if shader.find_visual(i):
            targets.append(('scene{:02d}'.format(i), i, False))

    failures = 0
    for label, i, forced in targets:
        ok, path, out, src = validate(i, forced)
        print('[{}] {:<12} {}'.format('OK' if ok else 'FAIL', label,
                                      os.path.basename(path)))
        if not ok:
            failures += 1
            print(annotate(out, src))
    print('')
    print('{} shader(s) revisados, {} con error'.format(len(targets), failures))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
