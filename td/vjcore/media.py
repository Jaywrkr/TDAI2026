"""Avance de imagen/GIF reactivo al beat, para las escenas de
config.MEDIA_SCENES (hoy solo scene19).

El ciclo automatico por TIEMPO vive enteramente en Python
(dats/control_script.py: _scheduleMediaAdvance, con run(delayMilliSeconds=)
reagendandose solo, igual que tickDiag() en runtime_manager.py) -- no
necesita ningun CHOP. Este modulo solo arma el camino para el avance EXTRA
por golpe de bombo: aisla el canal 'beat' de /project1/ctrl en su propio
Select CHOP, y le cuelga un CHOP Execute (dats/media_logic.py) que dispara
onOffToOn SOLO para ese canal -- si escuchara el CHOP 'ctrl' completo,
cualquier knob (Hue, D3...) que cruce 0.5 al moverse tambien dispararia el
evento, sin sentido.
"""

try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass


from .tdutil import safe_set, safe_set_first, connect, log


def build(proj):
    beat_sel = proj.create(selectCHOP, 'media_beat_chan')
    beat_sel.nodeX, beat_sel.nodeY = -400, 900
    safe_set_first(beat_sel, ['channames', 'chan', 'channels'], 'beat')
    connect(beat_sel, proj.op('ctrl'))

    logic = proj.create(chopexecuteDAT, 'media_logic')
    logic.nodeX, logic.nodeY = -240, 900
    safe_set(logic, 'chop', beat_sel.path)
    safe_set(logic, 'offtoon', True)
    logic.text = _dat_text()
    log('MEDIA: avance por beat conectado (media_beat_chan + media_logic)')
    return beat_sel, logic


def _dat_text():
    import os
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dats')
    with open(os.path.join(d, 'media_logic.py'), 'r', encoding='utf-8') as f:
        return f.read()
