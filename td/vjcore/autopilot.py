"""Modo 'hands-free': con el toggle Autopilot prendido, el rig avanza de
escena solo -- por TIEMPO (Autopilotseconds) Y por beat, mismo espiritu
dual que el auto-avance de imagenes en MEDIA_SCENES (ver media.py /
control_script.py._scheduleMediaAdvance).

El ciclo por TIEMPO vive enteramente en Python (control_script.py:
_scheduleAutopilot, con run(delayMilliSeconds=) reagendandose solo) y
corre SIEMPRE de fondo, prendido o no el toggle -- revisa el toggle en
cada tick y solo actua si esta prendido, asi no hay que arrancar/parar un
loop cada vez que alguien lo prende o apaga.

Este modulo solo arma el camino del avance EXTRA por golpe de bombo:
reusa el canal 'beat' que media.py ya aisla en su propio Select CHOP (no
hace falta un segundo Select para el mismo canal), y le cuelga un CHOP
Execute propio que solo actua si Autopilot esta prendido.
"""

try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass


from .tdutil import safe_set, log


def build(proj, beat_chan):
    logic = proj.create(chopexecuteDAT, 'autopilot_logic')
    logic.nodeX, logic.nodeY = -240, 980
    safe_set(logic, 'chop', beat_chan.path)
    safe_set(logic, 'offtoon', True)
    logic.text = _dat_text()
    log('AUTOPILOT: avance por beat conectado (gateado por el toggle Autopilot)')
    return logic


def _dat_text():
    import os
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dats')
    with open(os.path.join(d, 'autopilot_logic.py'), 'r', encoding='utf-8') as f:
        return f.read()
