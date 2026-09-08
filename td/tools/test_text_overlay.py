#!/usr/bin/env python3
"""Testea la parte de Python del overlay de texto: toggleTextVisible,
nextFont y currentFontName (control_script.py).

Todo lo demas del overlay (Text TOP, Transform TOP, la cadena de fundido
Parametro->Lag, el composite GLSL) es CHOP/TOP puro, sin Python en el
medio a proposito -- no hay nada que este test pueda tocar sin TD
abierto. El shader en si ya pasa por validate_shaders.py (glslangValidator,
gate aparte). Lo que SI se puede probar aca es la logica de:

  1. toggleTextVisible() invierte el booleano (y no rompe si faltan pars)
  2. nextFont() cicla el indice dentro de config.FONTS, con loop
  3. currentFontName() nunca tira excepcion y devuelve algo razonable
     incluso con Font fuera de rango -- se llama desde una expresion de
     parametro (el 'font' del Text TOP), y ahi una excepcion rompe el TOP
     entero, exactamente el mismo contrato que currentMediaPath().
"""
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

from vjcore import config as c  # noqa: E402

CONTROL_SCRIPT = os.path.join(TD, 'vjcore', 'dats', 'control_script.py')


class FakePar:
    def __init__(self, v):
        self.val = v

    def eval(self):
        return self.val


class FakePars:
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, FakePar(v))

    def __setattr__(self, k, v):
        cur = self.__dict__.get(k)
        if isinstance(cur, FakePar) and not isinstance(v, FakePar):
            cur.val = v
        else:
            self.__dict__[k] = v


class FakeProject:
    def __init__(self, **pars):
        self.par = FakePars(**pars)


def load(proj):
    with open(CONTROL_SCRIPT) as f:
        src = f.read()
    mod = types.ModuleType('control_script')
    mod.__dict__['op'] = lambda p=None: proj if p in ('/project1', None) else None
    mod.__dict__['run'] = lambda *a, **k: None
    mod.__dict__['project'] = types.SimpleNamespace(cookRate=60.0)
    mod.__dict__['absTime'] = types.SimpleNamespace(seconds=0.0)
    exec(compile(src, CONTROL_SCRIPT, 'exec'), mod.__dict__)
    return mod


def main():
    fails = []

    def check(label, got, want):
        ok = got == want
        print('  [{}] {}  -> {!r}{}'.format(
            'OK' if ok else '!!', label, got,
            '' if ok else '  ESPERABA {!r}'.format(want)))
        if not ok:
            fails.append(label)

    n = len(c.FONTS)
    check('config.FONTS no esta vacia (o nextFont/currentFontName no '
          'tienen nada que ciclar)', n > 0, True)

    print('--- toggleTextVisible ---')
    p = FakeProject(Textvisible=False)
    m = load(p)
    m.toggleTextVisible()
    check('prende', p.par.Textvisible.val, True)
    m.toggleTextVisible()
    check('apaga', p.par.Textvisible.val, False)

    p = FakeProject()  # sin Textvisible: no tiene que tirar excepcion
    m = load(p)
    m.toggleTextVisible()
    check('sin el parametro, no rompe (no hay assert posible, '
          'solo que no haya tirado)', True, True)

    print('\n--- nextFont ---')
    p = FakeProject(Font=0)
    m = load(p)
    seen = [p.par.Font.val]
    for _ in range(n):
        m.nextFont()
        seen.append(p.par.Font.val)
    check('recorre las {} fuentes y vuelve a la primera'.format(n),
          seen, list(range(n)) + [0])

    print('\n--- currentFontName ---')
    p = FakeProject(Font=0)
    m = load(p)
    check('indice 0 -> primera fuente del banco',
          m.currentFontName(), c.FONTS[0])

    p.par.Font.val = n - 1
    check('ultimo indice -> ultima fuente',
          m.currentFontName(), c.FONTS[-1])

    # El caso real que esto tiene que blindar: Font quedo desincronizado
    # (por ejemplo, alguien edito config.FONTS a mano y achico la lista)
    # y el indice guardado en el parametro ya no entra. Sin este clamp,
    # currentFontName() tira IndexError -- y como la llama una EXPRESION
    # de parametro, eso rompe el Text TOP entero, no solo el nombre.
    p.par.Font.val = 999
    got = m.currentFontName()
    check('indice fuera de rango no tira excepcion, cae a una fuente valida',
          got in c.FONTS, True)

    p.par.Font.val = -3
    got = m.currentFontName()
    check('indice negativo tampoco tira excepcion',
          got in c.FONTS, True)

    p = FakeProject()  # ni siquiera existe el parametro Font
    m = load(p)
    got = m.currentFontName()
    check('sin el parametro Font, cae a la primera fuente igual',
          got, c.FONTS[0])

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
