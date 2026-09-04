"""Rig de VJ para TouchDesigner - nucleo modular.

Uso desde un Text DAT dentro de TouchDesigner:

    import sys
    REPO = '/ruta/a/TDAI2026/td'
    if REPO not in sys.path:
        sys.path.insert(0, REPO)
    import vjcore
    vjcore.reload_all()
    vjcore.build()
"""

# TouchDesigner inyecta sus globales (op, run, absTime, project y las
# constantes de tipo como baseCOMP o glslTOP) en su propio namespace y en los
# DATs, pero NO en modulos importados desde sys.path. Hay que pedirlos.
# El try existe para que las herramientas de td/tools/ puedan importar este
# modulo fuera de TouchDesigner.
try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass


import importlib
import sys

_SUBMODULES = ['config', 'tdutil', 'shader', 'audio', 'control',
               'midi', 'scenes', 'program', 'dashboard', 'builder']


def _mod(name):
    """Importa un submodulo por nombre completo."""
    return importlib.import_module('{}.{}'.format(__name__, name))


# NOTA IMPORTANTE PARA QUIEN AÑADA MODULOS:
# ningun submodulo puede llamarse igual que una funcion publica de aqui.
# Python asigna el submodulo como atributo del paquete al importarlo, asi
# que 'vjcore/build.py' pisaba a la funcion vjcore.build() en cuanto se
# importaba una sola vez. Por eso el modulo se llama 'builder'.
# td/tools/smoke_import.py verifica esto.


def reload_all():
    """Recarga todos los submodulos. Necesario tras editar los .py."""
    for name in _SUBMODULES:
        full = '{}.{}'.format(__name__, name)
        if full in sys.modules:
            importlib.reload(sys.modules[full])
    importlib.reload(sys.modules[__name__])


def build(verbose=True):
    return _mod('builder').build(verbose=verbose)


def reload_shaders():
    """Recompone los .frag desde disco sin reconstruir la red."""
    proj = op('/project1')
    if not proj:
        print('No existe /project1 - ejecuta vjcore.build() primero')
        return 0
    channels = _mod('control').resolve_channels(proj)
    return _mod('scenes').reload_all(proj, channels)
