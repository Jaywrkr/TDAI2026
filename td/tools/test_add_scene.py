#!/usr/bin/env python3
"""Prueba add_scene.py de punta a punta, SIN tocar el repo real: copia
td/ entero a una carpeta temporal y corre el script real ahi adentro.

Por que existe: add_scene.py es el punto de entrada que promete que
"pega un .frag generado por una IA y corre un comando" deja la escena
100% funcional (archivo bien nombrado, N_SCENES actualizado, y nunca
escribe nada si el shader no compila antes). Si ESTE script se rompe,
la promesa completa del onboarding de visuales se rompe con el -- por
eso tiene su propio test de punta a punta (subprocess real, compilador
real) en vez de confiar en una lectura del codigo.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)

OK_FRAG = """// @D1: cantidad de anillos
// @D2: grosor de linea
// @D3: no usado directo (reservado)
// @D4: no usado directo (reservado)
// @D5: velocidad de rotacion
// @D6: brillo del nucleo

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x) + uTime * (0.2 + uD5 * 1.5);
    float rings = 3.0 + uDensity * 10.0;
    float d = abs(fract(r * rings - ang * 0.1) - 0.5);
    float w = 0.02 + uD2 * 0.1;
    float line = edgeLine(d - w, 1.0 + uD1 * 4.0);
    float h = audioHue(uHue, uMid * 0.05);
    vec3 col = hsv2rgb(vec3(h, 0.8, 1.0)) * line;
    col += hsv2rgb(vec3(fract(h + 0.5), 0.5, 1.0)) * exp(-r * r * 8.0) * (0.2 + uD6 * 0.8);
    col = audioLift(col, uBass * 0.7);
    col *= vignette(uv, 0.4);
    return vec4(col, 1.0);
}
"""

BAD_MAIN_FRAG = "void main() { }\nvec4 render(vec2 uv) { return vec4(0.0); }\n"
BAD_COMPILE_FRAG = "vec4 render(vec2 uv) { return vec4(totalmenteInventado(uv), 0.0); }\n"


class Sandbox:
    """Copia td/ a una carpeta temporal y da rutas/llamadas utiles ahi."""

    def __enter__(self):
        self.root = tempfile.mkdtemp(prefix='add_scene_test_')
        self.td = os.path.join(self.root, 'td')
        shutil.copytree(TD, self.td,
                         ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        return self

    def __exit__(self, *exc):
        shutil.rmtree(self.root, ignore_errors=True)

    def run(self, args, input_text=None):
        return subprocess.run(
            [sys.executable, os.path.join(self.td, 'tools', 'add_scene.py')] + args,
            input=input_text, capture_output=True, text=True, cwd=self.td)

    def n_scenes(self):
        with open(os.path.join(self.td, 'vjcore', 'config.py'), encoding='utf-8') as f:
            m = re.search(r'^N_SCENES = (\d+)', f.read(), re.MULTILINE)
        return int(m.group(1))

    def visuals(self):
        return sorted(os.listdir(os.path.join(self.td, 'visuals')))


def main():
    fails = []

    def check(label, cond, detail=''):
        print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                                    ('  -> ' + detail) if detail else ''))
        if not cond:
            fails.append(label)

    # --- 1. alta simple, feliz ---
    with Sandbox() as sb:
        before = sb.n_scenes()
        before_files = sb.visuals()
        r = sb.run(['--slug', 'prueba_anillos'], input_text=OK_FRAG)
        check('alta simple: exit 0', r.returncode == 0, r.stdout + r.stderr)
        after = sb.n_scenes()
        check('alta simple: N_SCENES sube en 1', after == before + 1,
              'antes={} despues={}'.format(before, after))
        new_files = [f for f in sb.visuals() if f not in before_files]
        check('alta simple: escribe exactamente 1 archivo nuevo',
              len(new_files) == 1, str(new_files))
        if new_files:
            check('alta simple: nombre con el indice correcto',
                  new_files[0] == 'scene{:02d}_prueba_anillos.frag'.format(before),
                  new_files[0])

    # --- 2. rechazo: void main() ---
    with Sandbox() as sb:
        before = sb.n_scenes()
        before_files = sb.visuals()
        r = sb.run(['--slug', 'malo'], input_text=BAD_MAIN_FRAG)
        check('rechazo void main(): exit != 0', r.returncode != 0)
        check('rechazo void main(): no escribe nada', sb.visuals() == before_files)
        check('rechazo void main(): no toca N_SCENES', sb.n_scenes() == before)

    # --- 3. rechazo: no compila ---
    with Sandbox() as sb:
        before = sb.n_scenes()
        before_files = sb.visuals()
        r = sb.run(['--slug', 'malo2'], input_text=BAD_COMPILE_FRAG)
        check('rechazo no-compila: exit != 0', r.returncode != 0)
        check('rechazo no-compila: no escribe nada', sb.visuals() == before_files)
        check('rechazo no-compila: no toca N_SCENES', sb.n_scenes() == before)
        check('rechazo no-compila: el error menciona la funcion inventada',
              'totalmenteInventado' in (r.stdout + r.stderr))

    # --- 4. rechazo: indice ya ocupado (scene00 ya existe en el repo real) ---
    with Sandbox() as sb:
        before = sb.n_scenes()
        r = sb.run(['--slug', 'choque', '--index', '0'], input_text=OK_FRAG)
        check('rechazo indice ocupado: exit != 0', r.returncode != 0)
        check('rechazo indice ocupado: no toca N_SCENES', sb.n_scenes() == before)

    # --- 5. modo --dir: todo o nada ---
    with Sandbox() as sb:
        before = sb.n_scenes()
        before_files = sb.visuals()
        batch_dir = tempfile.mkdtemp(prefix='add_scene_batch_')
        try:
            with open(os.path.join(batch_dir, 'a_ok.frag'), 'w', encoding='utf-8') as f:
                f.write(OK_FRAG)
            with open(os.path.join(batch_dir, 'b_malo.frag'), 'w', encoding='utf-8') as f:
                f.write(BAD_COMPILE_FRAG)
            r = sb.run(['--dir', batch_dir])
            check('--dir con 1 malo de 2: exit != 0', r.returncode != 0)
            check('--dir con 1 malo de 2: no escribe NINGUNO (todo o nada)',
                  sb.visuals() == before_files)
            check('--dir con 1 malo de 2: no toca N_SCENES', sb.n_scenes() == before)
        finally:
            shutil.rmtree(batch_dir, ignore_errors=True)

    # --- 6. modo --dir: exito con 3 archivos ---
    with Sandbox() as sb:
        before = sb.n_scenes()
        batch_dir = tempfile.mkdtemp(prefix='add_scene_batch2_')
        try:
            for name in ('uno', 'dos', 'tres'):
                with open(os.path.join(batch_dir, name + '.frag'), 'w', encoding='utf-8') as f:
                    f.write(OK_FRAG)
            r = sb.run(['--dir', batch_dir])
            check('--dir con 3 buenos: exit 0', r.returncode == 0, r.stdout + r.stderr)
            check('--dir con 3 buenos: N_SCENES sube en 3',
                  sb.n_scenes() == before + 3,
                  'antes={} despues={}'.format(before, sb.n_scenes()))
        finally:
            shutil.rmtree(batch_dir, ignore_errors=True)

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
