"""/project1/midi_logic  -  CHOP Execute DAT sobre midi1.

El MIDI ESCRIBE en los parametros; no los secuestra con expresiones.
Solo corre Python cuando algo se mueve de verdad.
"""

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
