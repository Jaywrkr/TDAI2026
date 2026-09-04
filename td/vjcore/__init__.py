"""Rig de VJ para TouchDesigner - nucleo modular.

Uso desde un Text DAT dentro de TouchDesigner:

    import sys
    REPO = 'C:/ruta/a/TDAI2026/td'
    if REPO not in sys.path:
        sys.path.insert(0, REPO)
    import vjcore
    vjcore.reload_all()
    vjcore.build()
"""

import importlib
import sys

_SUBMODULES = ['config', 'tdutil', 'shader', 'audio', 'control',
               'midi', 'scenes', 'program', 'dashboard', 'build']


def reload_all():
    """Recarga todos los submodulos. Necesario tras editar los .py."""
    for name in _SUBMODULES:
        full = __name__ + '.' + name
        if full in sys.modules:
            importlib.reload(sys.modules[full])
    importlib.reload(sys.modules[__name__])


def build(verbose=True):
    from . import build as _b
    return _b.build(verbose=verbose)


def reload_shaders():
    """Recompone los .frag desde disco sin reconstruir la red."""
    from . import scenes as _s, control as _c
    proj = op('/project1')
    if not proj:
        print('No existe /project1 - ejecuta vjcore.build() primero')
        return 0
    return _s.reload_all(proj, _c.resolve_channels(proj))
