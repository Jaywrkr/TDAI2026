"""Comprueba la tasa real del Speed CHOP y el contrato de las escenas nuevas."""

import math
import os
import sys

TD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TD)

from vjcore import config, control, shader


class Value:
    def __init__(self, value):
        self.value = value

    def eval(self):
        return self.value


class Channel:
    # Imita un CHOP de 1 canal: numChans hace falta porque las expresiones
    # ahora comprueban que el CHOP tenga canales (audio sin Device = 0).
    numChans = 1

    def __init__(self, value):
        self.value = value

    def __getitem__(self, index):
        assert index == 0
        return Value(self.value)


def rate(speed, bass, rms):
    class Params:
        Speed = Value(speed)

    class Project:
        par = Params()

    ops = {'/project1': Project(),
           '/project1/a_bass_out': Channel(bass),
           '/project1/a_level_smooth': Channel(rms)}
    return eval(control.speed_rate_expression(),
                {'op': ops.get, 'max': max, 'min': min})


# Speed es el PISO: nunca baja por silencio ni por un hueco entre
# frases (antes el reloj se congelaba bajo el piso de RMS y se veia
# "para, se mueve, para"). El bajo solo suma, hasta BASS_SPEED_BOOST.
boost = config.BASS_SPEED_BOOST
threshold = config.SILENCE_RMS_THRESHOLD
for speed, bass, rms, expected in [
        (0.0, 0.0, threshold * 2, 0.0),
        (0.0, 1.0, threshold * 2, 0.0),
        (0.5, 0.0, threshold * 2, 1.0),
        (0.5, 1.0, threshold * 2, 1.0 * (1 + boost)),
        (1.0, 0.0, threshold * 2, 2.0),
        (1.0, 1.0, threshold * 2, 2.0 * (1 + boost)),
        (0.5, 0.0, 0.0, 1.0),             # silencio: sigue a media velocidad
        (1.0, 1.0, threshold * 0.5, 2.0 * (1 + boost)),
        (0.5, 0.5, threshold * 2, 1.0 * (1 + boost * 0.5))]:
    actual = rate(speed, bass, rms)
    assert math.isclose(actual, expected, abs_tol=1e-9), (
        speed, bass, rms, actual, expected)
    assert actual >= 2.0 * speed - 1e-9, 'Speed tiene que ser el piso'

new = [shader.read_body(i)[0] for i in range(58, config.N_SCENES)]
assert len(new) == 40
assert all('uSpeed' not in body for body in new)
recent_header = shader.make_header(97, config.CTRL_CHANNELS)
old_header = shader.make_header(57, config.CTRL_CHANNELS)
assert '#define uD1        detailDrive(_ctrl(32))' in recent_header
assert '#define uD1        _ctrl(32)' in old_header
assert '#define uMusic     _ctrl(44)' in recent_header
assert '#define uBass      (_ctrl(6) * uMusic)' in recent_header
assert 'audioDanceUV(renderUV)' in shader._FOOTER
print('Speed es el piso, el bajo solo suma, y 40 escenas: TODO OK')
