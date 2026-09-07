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

from vjcore import config, shader, program  # noqa: E402

# Prologo que TouchDesigner inyecta por su cuenta en cada GLSL TOP. El
# tamano de sTD2DInputs[] refleja la cantidad REAL de inputs de ESA
# instancia de GLSL TOP (ver config.MEDIA_SCENES: esas escenas tienen un
# input 1 extra para imagen/GIF, las demas 19 solo tienen input 0).
def _td_prologue(n_inputs):
    return """#version 330
uniform sampler2D sTD2DInputs[{}];
in vec3 vUV;
vec4 TDOutputSwizzle(vec4 c) {{ return c; }}
""".format(n_inputs)


# Escenario degradado: TD arrancado SIN device de audio seleccionado.
# Un visual debe compilar igual (uBass y compania caen a 0.0).
CHANNELS_NO_AUDIO = ['speed', 'density', 'hue', 'chaos', 'bright',
                     'time', 'rtime', 'resw', 'resh']


def build_source(index, force_template=False, channels=None):
    if force_template:
        path = shader.template_path()
        with open(path, 'r', encoding='utf-8') as f:
            body = f.read()
    else:
        body, path = shader.read_body(index)
    n_inputs = 2 if index in config.MEDIA_SCENES else 1
    src = (_td_prologue(n_inputs)
           + shader.make_header(index, channels or config.CTRL_CHANNELS)
           + body
           + shader._FOOTER)
    return src, path


def _compile(src):
    """(ok, salida) de pasar una fuente GLSL por glslangValidator."""
    with tempfile.NamedTemporaryFile('w', suffix='.frag', delete=False) as f:
        f.write(src)
        tmp = f.name
    try:
        r = subprocess.run(['glslangValidator', '-S', 'frag', tmp],
                           capture_output=True, text=True)
        return r.returncode == 0, r.stdout + r.stderr
    finally:
        os.unlink(tmp)


def validate(index, force_template=False, channels=None):
    src, path = build_source(index, force_template, channels)
    ok, out = _compile(src)
    return ok, path, out, src


# ---------------------------------------------------------------
# SHADERS DE POST-PROCESO DEL PROGRAM BUS (program.py)
# ---------------------------------------------------------------
# No son escenas -- no tienen render() ni pasan por el footer -- pero
# fallan igual de feo: un error de sintaxis aca no rompe UNA escena,
# rompe la SALIDA ENTERA (pantalla negra o el frame sin procesar, sin
# error rojo evidente). Y como las escenas, no se pueden probar sin
# abrir TD. Van por el mismo gate.

def _td_prologue_post(n_inputs):
    """Igual que el de las escenas + uTD2DInfos (tamano de texel), que el
    bloom usa para muestrear a los pixeles vecinos."""
    return _td_prologue(n_inputs) + (
        'struct TDTexInfoShim {{ vec4 res; }};\n'
        'uniform TDTexInfoShim uTD2DInfos[{}];\n'.format(n_inputs))


def postfx_sources(channels=None):
    """[(nombre, fuente)] de los shaders del program bus, armados igual
    que los arma program.py (mismo header de control, mismos inputs)."""
    head = shader.ctrl_header(channels or config.CTRL_CHANNELS, 2)
    return [
        ('bloom', _td_prologue_post(1) + program._BLOOM_FRAG),
        ('program_blend', _td_prologue_post(3) + head + program._BLEND_FRAG),
        ('program_trails', _td_prologue_post(3) + head + program._TRAILS_FRAG),
    ]


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

    escenarios = [
        ('completo', None),
        ('sin audio', CHANNELS_NO_AUDIO),
    ]

    failures = 0
    for label, i, forced in targets:
        estados = []
        for nombre, chans in escenarios:
            ok, path, out, src = validate(i, forced, chans)
            estados.append((nombre, ok))
            if not ok:
                failures += 1
                print('[FAIL] {:<12} {}  ({})'.format(
                    label, os.path.basename(path), nombre))
                print(annotate(out, src))
        if all(ok for _, ok in estados):
            print('[OK]   {:<12} {:<24} {}'.format(
                label, os.path.basename(path),
                ' '.join(n for n, _ in estados)))
    # --- post-proceso del program bus ---
    # Un solo escenario: no dependen del audio (no leen uBass y compania),
    # asi que el caso "sin device de audio" no les cambia nada.
    postfx = postfx_sources()
    for name, src in postfx:
        ok, out = _compile(src)
        if ok:
            print('[OK]   {:<12} {:<24} post-proceso'.format('programbus', name))
        else:
            failures += 1
            print('[FAIL] {:<12} {}  (post-proceso)'.format('programbus', name))
            print(annotate(out, src))

    print('')
    print('{} shader(s) x {} escenarios + {} de post-proceso, {} con error'.format(
        len(targets), len(escenarios), len(postfx), failures))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
