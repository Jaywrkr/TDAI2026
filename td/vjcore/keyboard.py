"""Atajos de teclado como respaldo del MIDI -- utiles si el controlador
se desconecta a mitad de show, o para probar sin tener el hardware a mano:

    0-9             salta directo a esa escena (0..9)
    flecha izq/der  Prev/Next (relativo -- llega a todas las escenas con
                    toques repetidos, igual que el MIDI y el pulso del
                    panel)
    espacio         Blackout on/off

Mismo patron que media.py: un CHOP de entrada (aca Keyboard In, restringido
a solo estas teclas via su parametro 'keys' para no interferir con
escritura normal en otros campos de TD) + un CHOP Execute que dispara SOLO
en el flanco de subida (offtoon), una accion por tecla apretada, no una por
frame mientras se mantiene.
"""

try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass


from .tdutil import safe_set, safe_set_first, log


KEYS = '0 1 2 3 4 5 6 7 8 9 leftarrow rightarrow left right space'


def build(proj):
    kb = proj.create(keyboardinCHOP, 'keyboard_in')
    kb.nodeX, kb.nodeY = -400, 1040
    safe_set_first(kb, ['active'], 1)
    safe_set_first(kb, ['keys'], KEYS)

    logic = proj.create(chopexecuteDAT, 'keyboard_logic')
    logic.nodeX, logic.nodeY = -240, 1040
    safe_set(logic, 'chop', kb.path)
    safe_set(logic, 'offtoon', True)
    logic.text = _dat_text()
    log('KEYBOARD: atajos conectados (0-9, flechas, espacio)')
    return kb, logic


def _dat_text():
    import os
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dats')
    with open(os.path.join(d, 'keyboard_logic.py'), 'r', encoding='utf-8') as f:
        return f.read()
