"""/project1/midi_logic  -  CHOP Execute DAT sobre midi1.

El MIDI ESCRIBE en los parametros; no los secuestra con expresiones.
Solo corre Python cuando algo se mueve de verdad.

PIANO (Fase 3): a diferencia de los knobs/pads, las 25 teclas NO se mapean
con Learn -- son un rango fijo de notas siempre activo. El nombre exacto
que TD le da a un canal de nota puede variar entre builds (ya paso con los
CC: 'ch1cc112' en un build, 'ch1ctrl76' en otro), asi que _piano_note()
prueba varios patrones en vez de asumir uno solo. Si el patron real no es
ninguno de estos, el sintoma es "el anillo de tecla no aparece nunca" --
nunca rompe nada mas. Reportar el nombre real del canal (visor de midi1)
si eso pasa.
"""

import re

# 2 octavas, C1-C3 -- el default de fabrica del MiniLab MkII. Los botones
# Octave -/+ del teclado corren esto sin avisar al software.
PIANO_LO = 36
PIANO_HI = 60

_NOTE_PATTERNS = [
    re.compile(r'^ch\d+n(\d+)$', re.IGNORECASE),
    re.compile(r'^ch\d+note(\d+)$', re.IGNORECASE),
    re.compile(r'^ch\d+key(\d+)$', re.IGNORECASE),
]


def _piano_note(name):
    for pat in _NOTE_PATTERNS:
        m = pat.match(name)
        if m:
            note = int(m.group(1))
            if PIANO_LO <= note <= PIANO_HI:
                return note
    return None


def _handlePianoKey(note, val):
    p = op('/project1')
    if not p:
        return

    # Notas 36-40 (C1-E1): efectos en lugar de posicion de piano
    effect_map = {
        36: 'Grain',      # C1
        37: 'Glitch',     # C#1
        38: 'Pixelate',   # D1
        39: 'Strobe',     # D#1
        40: 'Invert',     # E1
    }

    if note in effect_map:
        # Trigger de efecto
        effect_name = effect_map[note]
        par = getattr(p.par, effect_name, None)
        if par is not None:
            par.val = max(0.0, min(1.0, float(val) / 127.0))
        run("op('/project1/midi_logic').module._resetEffect('{}')".format(effect_name), delayFrames=2)
    else:
        # Piano normal: notas 41-60 (F1-C3)
        pos = max(0.0, min(1.0, (note - PIANO_LO) / float(PIANO_HI - PIANO_LO)))
        vel = max(0.0, min(1.0, float(val) / 127.0))

        for par_name, v in (('Keypos', pos), ('Keyvel', vel), ('Keypulseraw', 1.0)):
            par = getattr(p.par, par_name, None)
            if par is not None:
                par.val = v

        # Se resetea un par de frames despues para que la SIGUIENTE tecla
        # produzca un flanco de subida nuevo y el Trigger CHOP la detecte --
        # si se quedara en 1.0, una tecla sostenida jamas volveria a disparar.
        run("op('/project1/midi_logic').module._resetKeypulse()", delayFrames=2)


def _resetKeypulse():
    p = op('/project1')
    if p:
        par = getattr(p.par, 'Keypulseraw', None)
        if par is not None:
            par.val = 0.0


def _resetEffect(effect_name):
    p = op('/project1')
    if p:
        par = getattr(p.par, effect_name, None)
        if par is not None:
            par.val = 0.0


CONTINUOUS = {
    'Speed': ('Speed', 0.0, 1.0),
    'Density': ('Density', 0.0, 1.0),
    'Hue': ('Hue', 0.0, 1.0),
    'Chaos': ('Chaos', 0.0, 1.0),
    'Brightness': ('Brightness', 0.0, 1.0),
    'Transition': ('Transitionseconds', 0.05, 2.0),
    'Audioamount': ('Audioamount', 0.0, 1.0),
    'Bassamount': ('Bassamount', 0.0, 1.0),
    'Midamount': ('Midamount', 0.0, 1.0),
    'Highamount': ('Highamount', 0.0, 1.0),
    # BUG encontrado en vivo: Learn Detail1..6 guardaba bien el mapeo
    # (midiMap() lo devolvia correcto), pero como estos 6 slots NUNCA
    # estuvieron en este diccionario, _handle() nunca escribia el valor
    # en ningun par -- el knob quedaba "conectado" pero mudo. Sintoma
    # exacto reportado: el panel Detail se queda fijo en 0.5 pase lo que
    # pase con el knob fisico, aunque el Learn si se haya hecho bien.
    'Detail1': ('Detail1', 0.0, 1.0),
    'Detail2': ('Detail2', 0.0, 1.0),
    'Detail3': ('Detail3', 0.0, 1.0),
    'Detail4': ('Detail4', 0.0, 1.0),
    'Detail5': ('Detail5', 0.0, 1.0),
    'Detail6': ('Detail6', 0.0, 1.0),
}

TRIGGERS = {
    'Next': 'nextScene',
    'Prev': 'prevScene',
    'Blackout': 'toggleBlackout',
    'Snapshot': 'snapshotPreset',
    'Reset': 'resetControls',
}


def _ctx():
    return op('/project1'), op('/project1/control_script')


def _handle(channel, val, is_trigger):
    p, ctrl = _ctx()
    if not p or not ctrl:
        return
    m = ctrl.module
    name = channel.name

    # MIDI LEARN tiene prioridad sobre cualquier mapeo existente.
    if str(p.fetch('learn_slot', '') or ''):
        m.applyLearn(name)
        return

    slot = m.midiMap().get(name)
    if not slot:
        return

    if slot in CONTINUOUS:
        par_name, lo, hi = CONTINUOUS[slot]
        par = getattr(p.par, par_name, None)
        if par is not None:
            par.val = lo + (hi - lo) * max(0.0, min(1.0, float(val) / 127.0))
    elif is_trigger and slot in TRIGGERS:
        getattr(m, TRIGGERS[slot])()


def onValueChange(channel, sampleIndex, val, prev):
    _handle(channel, val, False)
    return


def onOffToOn(channel, sampleIndex, val, prev):
    note = _piano_note(channel.name)
    if note is not None:
        _handlePianoKey(note, val)
        return
    _handle(channel, val, True)
    return


def onOnToOff(channel, sampleIndex, val, prev):
    return


def whileOn(channel, sampleIndex, val, prev):
    return


def whileOff(channel, sampleIndex, val, prev):
    return


def onValuesChanged(channels):
    return
