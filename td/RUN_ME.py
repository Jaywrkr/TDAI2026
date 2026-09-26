"""
PEGA ESTO EN UN TEXT DAT DENTRO DE TOUCHDESIGNER Y HAZ "Run Script".

Es lo unico que vive dentro del .toe. Todo lo demas esta en disco y en git.
Reconstruir ya no significa perder tu trabajo: los visuales son archivos
.frag y el mapeo MIDI se guarda en td/config/midi_map.json.
"""

import importlib
import os
import sys

# --- 1. Ajusta esta ruta a donde clonaste el repo ---------------
REPO = 'C:/TDAI2026/td'
# Si dejas el .toe al lado del repo, esto tambien sirve:
# REPO = project.folder + '/TDAI2026/td'
# ----------------------------------------------------------------

REPO = os.path.abspath(REPO)
if not os.path.isfile(os.path.join(REPO, 'vjcore', 'config.py')):
    raise FileNotFoundError('REPO debe apuntar a la carpeta td: ' + REPO)

# TD conserva modulos Python entre ejecuciones del Text DAT. Un import
# anterior desde otra copia del repo puede quedar en sys.modules sin spec y
# romper importlib.reload() con "spec not found for vjcore.config".
if REPO in sys.path:
    sys.path.remove(REPO)
sys.path.insert(0, REPO)
for name in list(sys.modules):
    if name == 'vjcore' or name.startswith('vjcore.'):
        del sys.modules[name]
importlib.invalidate_caches()

import vjcore          # noqa: E402
vjcore.build()


# ================================================================
# DESPUES DEL PRIMER BUILD YA NO NECESITAS ESTO.
# Para el dia a dia usa los botones de /project1:
#
#   System   > Recargar Shaders   <- tras editar un .frag
#   System   > Reconstruir Todo   <- solo si tocaste el codigo de vjcore
#
# Recargar Shaders NO destruye la red: no pierdes device de audio,
# device MIDI, ni mapeo.
# ================================================================
