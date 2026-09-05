"""/project1/media_logic  -  CHOP Execute DAT sobre media_beat_chan.

media_beat_chan es un Select CHOP que aisla el canal 'beat' de /project1/ctrl
(ver vjcore/media.py) -- asi este Execute SOLO ve ese canal, nunca los demas
knobs/perillas de ctrl (que tambien cruzan 0.5 al moverse y dispararian
onOffToOn sin sentido si estuvieramos escuchando todo el CHOP).

Cada vez que 'beat' cruza de apagado a encendido (un golpe de bombo), las
escenas de MEDIA_SCENES (hoy solo scene19) avanzan una imagen mas, ADEMAS
del ciclo automatico por tiempo que ya corre solo (control_script.py,
_scheduleMediaAdvance) -- asi el avance se siente reactivo a la musica sin
depender solo de ella: sin audio, el ciclo por tiempo lo sigue moviendo
igual.
"""


def onOffToOn(channel, sampleIndex, val, prev):
    ctrl = op('/project1/control_script')
    if not ctrl:
        return
    try:
        import vjcore.config as _vjconfig
    except Exception as e:
        print('media_logic: no se pudo leer MEDIA_SCENES:', e)
        return
    for idx in _vjconfig.MEDIA_SCENES:
        ctrl.module.advanceMediaIndex(idx)
    return


def onValueChange(channel, sampleIndex, val, prev):
    return


def onOnToOff(channel, sampleIndex, val, prev):
    return


def whileOn(channel, sampleIndex, val, prev):
    return


def whileOff(channel, sampleIndex, val, prev):
    return


def onValuesChanged(channels):
    return
