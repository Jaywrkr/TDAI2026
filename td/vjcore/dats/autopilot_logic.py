"""/project1/autopilot_logic  -  CHOP Execute DAT sobre media_beat_chan
(el canal 'beat' ya aislado por media.py -- se reusa, no se duplica).

Con el toggle Autopilot prendido, cada golpe de bombo hace avanzar una
escena mas, ADEMAS del ciclo automatico por tiempo que ya corre solo
(control_script._scheduleAutopilot) -- mismo espiritu que el avance de
imagenes: reactivo a la musica, no depende solo del reloj. Con el toggle
apagado no hace nada (el canal sigue disparando el evento, pero la
funcion revisa el toggle antes de actuar).
"""


def onOffToOn(channel, sampleIndex, val, prev):
    p = op('/project1')
    ctrl = op('/project1/control_script')
    if not p or not ctrl:
        return
    try:
        if bool(p.par.Autopilot.eval()):
            ctrl.module.nextScene()
    except Exception as e:
        print('autopilot_logic ERROR:', e)
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
