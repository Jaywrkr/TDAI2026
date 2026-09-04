"""MIDI: Arturia MiniLab MkII (o cualquier controlador).

Decisiones clave, distintas del script original:

1. El MIDI **escribe** en los parametros de /project1; NO los secuestra con
   expresiones. Con el metodo anterior los sliders del dashboard quedaban
   inservibles: cualquier valor que pusieras a mano lo pisaba la expresion.
   Ahora knob y mano conviven, y solo se ejecuta Python cuando de verdad se
   mueve un control (evento), no 60 veces por segundo.

2. MIDI LEARN. No dependes de adivinar los CC de fabrica: armas un slot,
   mueves el knob, queda mapeado.

3. El mapeo se guarda en disco (td/config/midi_map.json) y se recarga al
   arrancar, asi que reconstruir el rig ya no borra tu configuracion.
"""

from . import config
from .tdutil import safe_set, log


def build(proj, dat_text):
    try:
        midi_in = proj.create(midiinCHOP, 'midi1')
        midi_in.nodeX, midi_in.nodeY = -1400, 380
    except Exception as e:
        log('ERROR creando midi1: {}'.format(e))
        return None, None

    logic = proj.create(chopexecuteDAT, 'midi_logic')
    logic.nodeX, logic.nodeY = -1240, 380
    safe_set(logic, 'chop', 'midi1')
    safe_set(logic, 'valuechange', True)
    safe_set(logic, 'offtoon', True)
    logic.text = dat_text
    log('MIDI: midi1 + midi_logic creados (falta elegir el Device en midi1)')
    return midi_in, logic
