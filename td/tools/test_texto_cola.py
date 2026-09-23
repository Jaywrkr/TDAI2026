#!/usr/bin/env python3
"""Textos: cola de nombres, anterior/siguiente y pausa de atajos de teclado.

  1. Con cola, cada MOSTRAR saca el siguiente nombre y avanza; OCULTAR no
     avanza. Al final de la cola vuelve al primero.
  2. Lo ultimo escrito a mano en 'Texto' gana sobre la cola, una vez.
  3. Sin cola, MOSTRAR muestra lo que haya en 'Texto'.
  4. MOSTRAR apaga 'Escribiendo' (los atajos vuelven solos).
  5. SIGUIENTE/ANTERIOR con el texto oculto solo mueven el puntero; con el
     texto en pantalla lo ocultan y agendan volver a mostrarlo con el
     nombre nuevo.
  6. keyboard_logic no hace nada mientras 'Escribiendo' esta prendido.
"""
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

import test_estado_seguro as T  # noqa: E402

KEYBOARD_LOGIC = os.path.join(TD, 'vjcore', 'dats', 'keyboard_logic.py')


def project(**kw):
    pars = dict(Textvisible=False, Textcontent='', Textqueue='',
                Textqueueindex=0, Textediting=False)
    pars.update(kw)
    return T.FakeProject(**pars)


def main():
    fails = []

    def check(label, got, want):
        ok = got == want
        print('  [{}] {}  -> {!r}{}'.format('OK' if ok else '!!', label, got,
                                          '' if ok else '  ESPERABA {!r}'.format(want)))
        if not ok:
            fails.append(label)

    print('--- cola: cada MOSTRAR saca el siguiente ---')
    p = project(Textqueue='DJ Ana; Nico B2B Sol ;; Ñandú')
    m = T.load(p)
    check('la cola ignora vacios y espacios', m._textQueue(), ['DJ Ana', 'Nico B2B Sol', 'Ñandú'])
    check('peek: el proximo es el primero', m.textPeek(0), 'DJ Ana')
    m.toggleTextVisible()
    check('muestra el primero', (p.par.Textcontent.val, p.par.Textvisible.val), ('DJ Ana', True))
    check('peek ahora apunta al segundo', m.textPeek(0), 'Nico B2B Sol')
    m.toggleTextVisible()
    check('ocultar no avanza', (p.par.Textvisible.val, m.textPeek(0)), (False, 'Nico B2B Sol'))
    m.toggleTextVisible(); m.toggleTextVisible()
    m.toggleTextVisible()
    check('tercero (con Ñ)', p.par.Textcontent.val, 'Ñandú')
    m.toggleTextVisible(); m.toggleTextVisible()
    check('al final vuelve al primero', p.par.Textcontent.val, 'DJ Ana')

    print('\n--- lo escrito a mano gana, una vez ---')
    p.par.Textvisible = False
    p.par.Textcontent = 'Invitada sorpresa'
    m.toggleTextVisible()
    check('muestra lo escrito a mano', p.par.Textcontent.val, 'Invitada sorpresa')
    check('y no gasta la cola', m.textPeek(0), 'Nico B2B Sol')
    m.toggleTextVisible(); m.toggleTextVisible()
    check('la siguiente vez vuelve la cola', p.par.Textcontent.val, 'Nico B2B Sol')

    print('\n--- sin cola ---')
    p = project(Textcontent='Solo esto')
    m = T.load(p)
    m.toggleTextVisible()
    check('muestra Texto tal cual', (p.par.Textcontent.val, p.par.Textvisible.val), ('Solo esto', True))

    print('\n--- MOSTRAR apaga Escribiendo ---')
    p = project(Textqueue='A;B', Textediting=True)
    m = T.load(p)
    m.toggleTextEditing()
    check('el boton ESCRIBIR lo alterna', p.par.Textediting.val, False)
    m.toggleTextEditing()
    m.toggleTextVisible()
    check('al mostrar se apaga solo', p.par.Textediting.val, False)

    print('\n--- SIGUIENTE / ANTERIOR ---')
    p = project(Textqueue='A;B;C')
    m = T.load(p)
    runs = []
    m.__dict__['run'] = lambda code, **k: runs.append((code, k))
    m.textNext()
    check('oculto: solo mueve el puntero', (m.textPeek(0), p.par.Textvisible.val, len(runs)), ('B', False, 0))
    m.textPrev()
    check('anterior vuelve', m.textPeek(0), 'A')
    m.toggleTextVisible()                      # muestra A, puntero en B
    m.textNext()
    check('en pantalla: oculta para el fundido', p.par.Textvisible.val, False)
    check('y agenda volver a mostrar', len(runs), 1)
    check('con el nombre siguiente', m.textPeek(0), 'B')
    m.toggleTextVisible()                      # lo que ejecuta el run agendado
    check('reaparece con B', (p.par.Textcontent.val, p.par.Textvisible.val), ('B', True))
    runs.clear()
    m.textPrev()
    m.toggleTextVisible()
    check('ANTERIOR en pantalla vuelve a A', p.par.Textcontent.val, 'A')

    print('\n--- teclado en pausa mientras se escribe ---')
    with open(KEYBOARD_LOGIC) as f:
        src = f.read()
    calls = []
    ctrl_mod = types.SimpleNamespace(selectScene=lambda i: calls.append(('scene', i)),
                                     prevScene=lambda: calls.append('prev'),
                                     nextScene=lambda: calls.append('next'),
                                     toggleBlackout=lambda: calls.append('blackout'))
    p = project(Textediting=True)
    kb = types.ModuleType('keyboard_logic')
    kb.__dict__['op'] = lambda path=None: {'/project1': p,
                                           '/project1/control_script': types.SimpleNamespace(module=ctrl_mod)}.get(path)
    exec(compile(src, KEYBOARD_LOGIC, 'exec'), kb.__dict__)
    for name in ('2', 'space', 'rightarrow'):
        kb.onOffToOn(types.SimpleNamespace(name=name), 0, 1, 0)
    check('escribiendo: ningun atajo dispara', calls, [])
    p.par.Textediting = False
    kb.onOffToOn(types.SimpleNamespace(name='2'), 0, 1, 0)
    kb.onOffToOn(types.SimpleNamespace(name='space'), 0, 1, 0)
    check('sin escribir: vuelven', calls, [('scene', 2), 'blackout'])

    print()
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        sys.exit(1)
    print('RESULTADO: TODO OK')


if __name__ == '__main__':
    main()
