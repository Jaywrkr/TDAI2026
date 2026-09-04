"""Helpers defensivos para construir redes de TouchDesigner desde Python.

Los nombres de parametros de algunos OPs cambian entre builds de TD.
Todo lo que toca parametros pasa por aqui para que un nombre que no existe
sea un aviso y no una excepcion que aborte el build entero.
"""

_LOG = []


def log(msg):
    _LOG.append(str(msg))
    print(msg)


def get_log():
    return list(_LOG)


def clear_log():
    del _LOG[:]


def safe_set(o, name, value):
    """Asigna o.par.<name> = value. Devuelve True si existio el parametro."""
    try:
        p = getattr(o.par, name, None)
        if p is None:
            return False
        p.val = value
        return True
    except Exception as e:
        log('AVISO set {}.{}: {}'.format(o.path, name, e))
        return False


def safe_set_first(o, names, value):
    """Prueba varios nombres alternativos de parametro (compatibilidad entre builds)."""
    for n in names:
        if safe_set(o, n, value):
            return n
    log('AVISO {}: ninguno de {} existe'.format(o.path, names))
    return None


def safe_expr(o, name, expression):
    try:
        p = getattr(o.par, name, None)
        if p is None:
            return False
        p.expr = expression
        return True
    except Exception as e:
        log('AVISO expr {}.{}: {}'.format(o.path, name, e))
        return False


def connect(dst, src, index=0):
    try:
        dst.inputConnectors[index].connect(src)
        return True
    except Exception as e:
        log('ERROR conectando {}[{}] <- {}: {}'.format(dst.path, index, src.path, e))
        return False


def add_float(page, name, label, default=0.0, minv=None, maxv=None):
    p = _first(page.appendFloat(name, label=label))
    _bounds(p, default, minv, maxv)
    return p


def add_int(page, name, label, default=0, minv=None, maxv=None):
    p = _first(page.appendInt(name, label=label))
    _bounds(p, default, minv, maxv)
    return p


def add_toggle(page, name, label, default=False):
    p = _first(page.appendToggle(name, label=label))
    try:
        p.default = default
        p.val = default
    except Exception:
        pass
    return p


def add_string(page, name, label, default=''):
    p = _first(page.appendStr(name, label=label))
    try:
        p.default = default
        p.val = default
    except Exception:
        pass
    return p


def add_pulse(page, name, label):
    return _first(page.appendPulse(name, label=label))


def add_menu(page, name, label, names, labels=None):
    p = _first(page.appendMenu(name, label=label))
    try:
        p.menuNames = list(names)
        p.menuLabels = list(labels or names)
    except Exception:
        pass
    return p


def _first(pars):
    return pars[0] if isinstance(pars, (list, tuple)) else pars


def _bounds(p, default, minv, maxv):
    try:
        p.default = default
        p.val = default
        if minv is not None:
            p.min = minv
            p.normMin = minv
            p.clampMin = True
        if maxv is not None:
            p.max = maxv
            p.normMax = maxv
            p.clampMax = True
    except Exception:
        pass


def chan_names(chop_op):
    """Lista de nombres de canal de un CHOP, vacia si no existe o no coocina."""
    try:
        return [c.name for c in chop_op.chans()]
    except Exception:
        return []
