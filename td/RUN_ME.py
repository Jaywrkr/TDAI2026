"""
PEGA ESTO EN UN TEXT DAT DENTRO DE TOUCHDESIGNER Y HAZ "Run Script".

Es lo unico que vive dentro del .toe. Todo lo demas esta en disco y en git.
Reconstruir ya no significa perder tu trabajo: los visuales son archivos
.frag y el mapeo MIDI se guarda en td/config/midi_map.json.
"""

import sys

# --- 1. Ajusta esta ruta a donde clonaste el repo ---------------
REPO = 'C:/TDAI2026/td'
# Si dejas el .toe al lado del repo, esto tambien sirve:
# REPO = project.folder + '/TDAI2026/td'
# ----------------------------------------------------------------

if REPO not in sys.path:
    sys.path.insert(0, REPO)

# TD solo dice "Exception occurred during run operation" y esconde el
# error real. Con este try el traceback COMPLETO sale en la Textport
# (Alt+T / Dialogs > Textport): copia desde "BUILD FALLO" hacia abajo.
try:
    import vjcore          # noqa: E402
    vjcore.reload_all()    # recoge cambios en los .py sin reiniciar TD
    vjcore.build()
except Exception:
    import traceback
    print('=' * 58)
    print('BUILD FALLO -- copia desde aqui:')
    traceback.print_exc()
    print('=' * 58)
    raise


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
