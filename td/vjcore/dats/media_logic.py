"""/project1/media_logic  -  CHOP Execute DAT sobre media_beat_chan.

media_beat_chan es un Select CHOP que aisla el canal 'beat' de /project1/ctrl
(ver vjcore/media.py) -- asi este Execute SOLO ve ese canal, nunca los demas
knobs/perillas de ctrl (que tambien cruzan 0.5 al moverse y dispararian
onOffToOn sin sentido si estuvieramos escuchando todo el CHOP).

Cada golpe de bombo se lo pasa a control_script.mediaBeat(), que decide si
mueve algo o no segun Mediamode: en BEAT avanza una imagen por golpe, en
COMPAS avanza cada N golpes (que es lo que de verdad se usa en un set: el
cambio cae "en el 1"), y en MANUAL / TIEMPO / PIANO el bombo no toca nada.

Esa decision vive alla y no aca a proposito: aca no hay forma de testear
nada, y en control_script.py el modo se lee una sola vez para todos los
caminos (tiempo, beat, piano, botones).
"""


def onOffToOn(channel, sampleIndex, val, prev):
    ctrl = op('/project1/control_script')
    if ctrl:
        ctrl.module.mediaBeat()
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
