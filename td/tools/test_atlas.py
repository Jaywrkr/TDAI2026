"""Ninguna escena de Halloween pasa de 3 texturas de entrada (en la Mac,
TD sobre Metal no compila un GLSL TOP con 4 o mas) y cada escena con
laminas tiene su atlas al dia (td/tools/build_atlas.py)."""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
CODE = r'''
import sys; sys.path.insert(0, %r)
from vjcore import config
bad = [i for i in range(config.N_SCENES) if config.scene_input_count(i) > 3]
missing = [i for i in config.PLATES if i not in config.PLATE_ATLAS]
print(bad, missing)
assert not bad, 'escenas con mas de 3 inputs: %%s' %% bad
assert not missing, 'laminas sin atlas al dia (correr build_atlas.py): %%s' %% missing
''' % TD
env = dict(os.environ, TDAI_SET='halloween')
r = subprocess.run([sys.executable, '-c', CODE], env=env, capture_output=True, text=True)
print(r.stdout + r.stderr)
print('TODO OK' if r.returncode == 0 else 'FALLO')
sys.exit(r.returncode)
