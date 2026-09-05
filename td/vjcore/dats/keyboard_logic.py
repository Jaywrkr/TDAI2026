"""/project1/keyboard_logic  -  CHOP Execute DAT sobre keyboard_in.

keyboard_in es un Keyboard In CHOP restringido (parametro 'keys', ver
vjcore/keyboard.py) a solo las teclas que este atajo usa -- asi este
Execute nunca ve el resto del teclado ni interfiere con escribir texto en
otro campo de TD.

Dispara SOLO en el flanco de subida (offtoon en keyboard_in): una accion
por tecla apretada, no una por frame mientras se mantiene.
"""


def onOffToOn(channel, sampleIndex, val, prev):
    ctrl = op('/project1/control_script')
    if not ctrl:
        return
    m = ctrl.module

    name = str(channel.name).lower()
    if name.startswith('key'):
        name = name[3:]

    try:
        if name.isdigit():
            m.selectScene(int(name))
        elif name in ('left', 'leftarrow'):
            m.prevScene()
        elif name in ('right', 'rightarrow'):
            m.nextScene()
        elif name in ('space', 'spacebar'):
            m.toggleBlackout()
    except Exception as e:
        print('keyboard_logic ERROR:', e)
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
