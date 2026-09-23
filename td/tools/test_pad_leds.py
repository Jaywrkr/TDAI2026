#!/usr/bin/env python3
"""Colores de los pads (SysEx del MiniLab mkII), fuera de TD.

  1. El mensaje tiene el formato documentado: 00 20 6B 7F 42 02 00 10
     <70+pad> <color>, y se manda con y sin F0/F7.
  2. Cada pad toma el color de SU estado (autopilot, texto, dos capas,
     efectos...), en el orden fisico del layout v2.
  3. Solo se manda un pad cuando su color cambia (en reposo, cero bytes).
  4. Con Padleds apagado no se manda nada.
"""
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

import test_estado_seguro as T  # noqa: E402


class FakeMidiOut:
    def __init__(self):
        self.sent = []

    def sendExclusive(self, *vals):
        self.sent.append(list(vals))


def load_with_out(p, out, beat=0.0):
    m = T.load(p)
    chop = {'beat': types.SimpleNamespace(eval=lambda: beat)}

    def fake_op(path=None):
        if path in ('/project1', None):
            return p
        if path == '/project1/midi_out':
            return out
        if path == '/project1/ctrl':
            return chop
        return None
    m.__dict__['op'] = fake_op
    return m


def main():
    fails = []

    def check(label, got, want):
        ok = got == want
        print('  [{}] {}  -> {!r}{}'.format('OK' if ok else '!!', label, got,
                                          '' if ok else '  ESPERABA {!r}'.format(want)))
        if not ok:
            fails.append(label)

    base = dict(Padleds=True, Blackout=False, Autopilot=False, Textvisible=False,
                Textcontent='', Textqueue='', Textqueueindex=0, Duallayer=False,
                Medialock=False, Grain=0.0, Posterize=0.0, Glitch=0.0,
                Pixelate=0.0, Strobe=0.0, Invert=0.0, Mirror=0.0, Zoom=0.0)

    print('--- formato del SysEx ---')
    p = T.FakeProject(**base)
    out = FakeMidiOut()
    m = load_with_out(p, out)
    m.sendPadColor(4, 'green', force=True)
    check('sin F0/F7', out.sent[0], [0x00, 0x20, 0x6B, 0x7F, 0x42, 0x02, 0x00, 0x10, 0x74, 0x04])
    check('con F0/F7', out.sent[1], [0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x42, 0x02, 0x00, 0x10, 0x74, 0x04, 0xF7])
    out.sent.clear()
    m.sendPadColor(15, 'white', force=True)
    check('pad 16 = 0x7F, blanco = 0x7F', out.sent[0][-2:], [0x7F, 0x7F])

    print('\n--- colores en reposo ---')
    p = T.FakeProject(**base)
    m = load_with_out(p, FakeMidiOut())
    cols = m.padLedColors()
    check('16 pads', len(cols), 16)
    check('banco A en reposo', cols[:8], ['cyan', 'cyan', 'red', 'off', 'off', 'yellow', 'off', 'off'])
    check('banco B en reposo', cols[8:], ['yellow', 'cyan', 'green', 'red', 'white', 'blue', 'purple', 'off'])

    print('\n--- colores por estado ---')
    p = T.FakeProject(**dict(base, Autopilot=True, Textvisible=True, Textcontent='DJ Ana',
                             Duallayer=True, Medialock=True, Blackout=True, Posterize=1.0, Strobe=1.0))
    m = load_with_out(p, FakeMidiOut(), beat=1.0)
    cols = m.padLedColors()
    check('NEXT late blanco en el beat con autopilot', cols[0], 'white')
    check('BLACKOUT activo', cols[2], 'white')
    check('AUTOPILOT verde', cols[3], 'green')
    check('TEXTO en pantalla = blanco', cols[4], 'white')
    check('DOS CAPAS violeta', cols[6], 'purple')
    check('IMAGEN FIJA azul', cols[7], 'blue')
    check('RETRO se enciende con Posterize', cols[8], 'white')
    check('STROBE activo', cols[11], 'white')
    check('MODO MEZCLA solo con Dos Capas', cols[15], 'green')
    p2 = T.FakeProject(**dict(base, Textqueue='A;B'))
    m2 = load_with_out(p2, FakeMidiOut())
    check('TEXTO azul si hay nombre listo en la cola', m2.padLedColors()[4], 'blue')

    print('\n--- solo manda lo que cambia ---')
    p = T.FakeProject(**base)
    out = FakeMidiOut()
    m = load_with_out(p, out)
    m.refreshPadLeds()
    check('primera vez: 16 pads x 2 formas', len(out.sent), 32)
    out.sent.clear()
    m.refreshPadLeds()
    check('en reposo: nada', len(out.sent), 0)
    p.par.Autopilot = True
    m.refreshPadLeds()
    check('prender autopilot: solo ese pad', sorted({s[-2] for s in out.sent if s[0] == 0x00}), [0x73])

    print('\n--- Padleds apagado ---')
    p = T.FakeProject(**dict(base, Padleds=False))
    out = FakeMidiOut()
    m = load_with_out(p, out)
    m.refreshPadLeds()
    check('no manda nada', len(out.sent), 0)

    print()
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        sys.exit(1)
    print('RESULTADO: TODO OK')


if __name__ == '__main__':
    main()
