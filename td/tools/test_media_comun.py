#!/usr/bin/env python3
"""Testea el motor de la CARPETA COMUN de media de control_script.py,
con los globales de TouchDesigner stubbeados y una carpeta de archivos
falsos en disco.

Por que existe: la carpeta comun es la unica parte del rig donde una
misma variable (Mediaindex) la escriben cinco caminos distintos --
tiempo, beat, compas, piano y los botones -- mas dos que la bloquean
(Medialock) o la reordenan (Mediashuffle). Ahi es exactamente donde
viven los off-by-one y los "avanza dos veces por golpe". Nada de eso da
error en TD: simplemente la imagen cambia cuando no debe, y te enteras
en vivo.

Lo que se verifica:
  1. escaneo de la carpeta (filtrado por extension, orden, cache)
  2. avance/retroceso con loop en los dos sentidos
  3. Medialock congela TODOS los caminos automaticos
  4. modo BEAT vs COMPAS (cada N golpes, no cada golpe)
  5. modo TIEMPO no se mueve por beat, y BEAT no se mueve por tiempo
  6. modo PIANO mapea 0..1 sobre la carpeta entera, extremos incluidos
  7. Mediashuffle recorre TODA la carpeta sin repetir
"""
import os
import shutil
import sys
import tempfile
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


class FakeProject:
    def __init__(self, **pars):
        self.par = FakePars(**pars)
        self._store = {}

    def fetch(self, k, d=None):
        return self._store.get(k, d)

    def store(self, k, v):
        self._store[k] = v

    def unstore(self, k):
        self._store.pop(k, None)


def load_control_script(proj):
    with open(CONTROL_SCRIPT) as f:
        src = f.read()
    mod = types.ModuleType('control_script')
    mod.__dict__['op'] = lambda p=None: proj if p in ('/project1', None) else None
    # run() de TD agenda para despues; aca no queremos que _mediaTick se
    # dispare solo -- cada test llama a mano lo que quiere probar.
    mod.__dict__['run'] = lambda *a, **k: None
    mod.__dict__['project'] = types.SimpleNamespace(cookRate=60.0)
    mod.__dict__['absTime'] = types.SimpleNamespace(seconds=0.0)
    exec(compile(src, CONTROL_SCRIPT, 'exec'), mod.__dict__)
    return mod


def make_folder(names):
    d = tempfile.mkdtemp(prefix='tdai_media_')
    for n in names:
        open(os.path.join(d, n), 'w').close()
    return d


def new_proj(folder, mode='MANUAL', **extra):
    pars = dict(Mediafolder=folder,
                Mediaindex=0,
                Mediamode=c.MEDIA_MODES.index(mode),
                Mediaseconds=0.0,
                Mediabeats=4,
                Mediashuffle=False,
                Medialock=False,
                Speed=0.5)
    pars.update(extra)
    return FakeProject(**pars)


def main():
    fails = []

    def check(label, got, want):
        ok = got == want
        print('  [{}] {}  -> {!r}{}'.format(
            'OK' if ok else '!!', label, got,
            '' if ok else '  ESPERABA {!r}'.format(want)))
        if not ok:
            fails.append(label)

    # Mezcla a proposito: mayusculas, un .txt que NO tiene que entrar, y
    # nombres desordenados para comprobar que se ordenan.
    folder = make_folder(['c.png', 'a.JPG', 'b.gif', 'leeme.txt', 'd.mp4'])
    empty = make_folder([])
    try:
        print('--- escaneo de la carpeta ---')
        p = new_proj(folder)
        m = load_control_script(p)
        files = [os.path.basename(f) for f in m.mediaFiles()]
        check('filtra por extension y ordena', files,
              ['a.JPG', 'b.gif', 'c.png', 'd.mp4'])
        check('carpeta vacia -> lista vacia',
              load_control_script(new_proj(empty)).mediaFiles(), [])
        check('carpeta inexistente -> lista vacia',
              load_control_script(new_proj('/no/existe/nada')).mediaFiles(), [])
        check('sin carpeta -> ruta vacia, no excepcion',
              load_control_script(new_proj('')).currentMediaPath(), '')

        # El cache es lo que hace que esto se pueda llamar desde una
        # expresion de parametro (o sea todos los frames). Si se rompe,
        # el rig hace un os.listdir por frame y se nota en el FPS. Se
        # verifica agregando un archivo a la MISMA carpeta: mientras el
        # cache este vigente la lista no tiene que cambiar.
        open(os.path.join(folder, 'e.png'), 'w').close()
        check('cache: un archivo nuevo no aparece solo',
              len(m.mediaFiles()), 4)
        m.mediaRescan()
        check('rescan: ahi si aparece', len(m.mediaFiles()), 5)
        check('rescan vuelve a la primera imagen', p.par.Mediaindex.val, 0)
        os.remove(os.path.join(folder, 'e.png'))
        m.mediaRescan()

        # Cambiar de carpeta invalida el cache solo (la clave del cache
        # ES la ruta): si no, la escena seguiria mostrando archivos de la
        # carpeta anterior, que casi seguro ya no existen.
        p.par.Mediafolder.val = empty
        check('cambiar de carpeta invalida el cache sin apretar nada',
              m.mediaFiles(), [])
        p.par.Mediafolder.val = folder

        print('\n--- avance y loop ---')
        p = new_proj(folder)
        m = load_control_script(p)
        m.mediaNext()
        check('next 1', p.par.Mediaindex.val, 1)
        m.mediaNext(); m.mediaNext()
        check('next x3', p.par.Mediaindex.val, 3)
        m.mediaNext()
        check('next da la vuelta al final', p.par.Mediaindex.val, 0)
        m.mediaPrev()
        check('prev da la vuelta al principio', p.par.Mediaindex.val, 3)

        print('\n--- Medialock congela todo camino automatico ---')
        p = new_proj(folder, mode='BEAT', Medialock=True, Mediaindex=2)
        m = load_control_script(p)
        m.mediaNext()
        check('lock vs boton next', p.par.Mediaindex.val, 2)
        m.mediaBeat()
        check('lock vs beat', p.par.Mediaindex.val, 2)
        m._mediaTick(0)
        check('lock vs ciclo por tiempo', p.par.Mediaindex.val, 2)
        p.par.Mediamode.val = c.MEDIA_MODES.index('PIANO')
        m.mediaPianoSelect(1.0)
        check('lock vs tecla de piano', p.par.Mediaindex.val, 2)

        print('\n--- modo BEAT vs COMPAS ---')
        p = new_proj(folder, mode='BEAT')
        m = load_control_script(p)
        for _ in range(3):
            m.mediaBeat()
        check('BEAT avanza en cada golpe', p.par.Mediaindex.val, 3)

        p = new_proj(folder, mode='COMPAS', Mediabeats=4)
        m = load_control_script(p)
        for _ in range(3):
            m.mediaBeat()
        check('COMPAS no se mueve en los primeros 3 golpes',
              p.par.Mediaindex.val, 0)
        m.mediaBeat()
        check('COMPAS avanza en el 4to golpe', p.par.Mediaindex.val, 1)
        for _ in range(4):
            m.mediaBeat()
        check('COMPAS avanza de nuevo a los 4 siguientes',
              p.par.Mediaindex.val, 2)

        print('\n--- cada modo escucha solo lo suyo ---')
        p = new_proj(folder, mode='TIEMPO')
        m = load_control_script(p)
        m.mediaBeat()
        check('TIEMPO ignora el beat', p.par.Mediaindex.val, 0)
        m._mediaTick(0)
        check('TIEMPO avanza con su propio tick', p.par.Mediaindex.val, 1)

        p = new_proj(folder, mode='BEAT')
        m = load_control_script(p)
        m._mediaTick(0)
        check('BEAT ignora el ciclo por tiempo', p.par.Mediaindex.val, 0)

        p = new_proj(folder, mode='MANUAL')
        m = load_control_script(p)
        m.mediaBeat()
        m._mediaTick(0)
        check('MANUAL no se mueve solo', p.par.Mediaindex.val, 0)
        m.mediaNext()
        check('MANUAL si obedece al boton', p.par.Mediaindex.val, 1)

        # El token es lo que impide que queden dos cadenas de run()
        # avanzando en paralelo despues de cambiar de modo.
        p = new_proj(folder, mode='TIEMPO')
        m = load_control_script(p)
        p.store('media_token', 7)
        m._mediaTick(3)
        check('tick viejo (token que no coincide) no hace nada',
              p.par.Mediaindex.val, 0)
        m._mediaTick(7)
        check('tick con el token vigente si avanza', p.par.Mediaindex.val, 1)

        print('\n--- modo PIANO: la tecla ELIGE la imagen ---')
        p = new_proj(folder, mode='PIANO')
        m = load_control_script(p)
        # 4 archivos: la tecla mas grave tiene que dar la primera y la
        # mas aguda la ULTIMA -- el off-by-one clasico aca es que la
        # tecla mas aguda nunca alcance el ultimo archivo.
        m.mediaPianoSelect(0.0)
        check('tecla mas grave -> primera imagen', p.par.Mediaindex.val, 0)
        m.mediaPianoSelect(1.0)
        check('tecla mas aguda -> ultima imagen', p.par.Mediaindex.val, 3)
        m.mediaPianoSelect(0.5)
        check('tecla del medio -> imagen del medio', p.par.Mediaindex.val, 2)
        seen = set()
        for i in range(25):
            m.mediaPianoSelect(i / 24.0)
            seen.add(p.par.Mediaindex.val)
        check('25 teclas cubren las 4 imagenes', sorted(seen), [0, 1, 2, 3])
        # Volver a la misma tecla tiene que dar la MISMA imagen: eso es
        # lo que ningun modo automatico permite y es todo el punto.
        m.mediaPianoSelect(0.33)
        first = p.par.Mediaindex.val
        m.mediaPianoSelect(0.9)
        m.mediaPianoSelect(0.33)
        check('la misma tecla vuelve a la misma imagen',
              p.par.Mediaindex.val, first)
        # En otro modo, la tecla no toca la imagen.
        p.par.Mediamode.val = c.MEDIA_MODES.index('TIEMPO')
        m.mediaPianoSelect(1.0)
        check('fuera del modo PIANO la tecla no cambia la imagen',
              p.par.Mediaindex.val, first)

        print('\n--- shuffle: recorre todo sin repetir ---')
        big = make_folder(['{:02d}.png'.format(i) for i in range(12)])
        try:
            p = new_proj(big, Mediashuffle=True)
            m = load_control_script(p)
            n = len(m.mediaFiles())
            check('12 archivos', n, 12)
            order = p.fetch('media_order')
            check('el orden es una permutacion completa',
                  sorted(order), list(range(12)))
            vistos = []
            for _ in range(n):
                vistos.append(m.currentMediaPath())
                m.mediaNext()
            check('una vuelta entera muestra las 12 sin repetir',
                  len(set(vistos)), 12)
            check('despues de la vuelta vuelve al principio',
                  m.currentMediaPath(), vistos[0])

            p = new_proj(big, Mediashuffle=False)
            m = load_control_script(p)
            m.mediaFiles()
            check('sin shuffle el orden es secuencial',
                  p.fetch('media_order'), list(range(12)))
        finally:
            shutil.rmtree(big, ignore_errors=True)
    finally:
        shutil.rmtree(folder, ignore_errors=True)
        shutil.rmtree(empty, ignore_errors=True)

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
