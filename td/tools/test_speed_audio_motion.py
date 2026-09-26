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


threshold = config.SILENCE_RMS_THRESHOLD
for speed, bass, rms, expected in [
        (0.0, 0.0, threshold * 2, 0.0),
        (0.0, 1.0, threshold * 2, 0.0),
        (0.5, 0.0, threshold * 2, 1.0),
        (0.5, 1.0, threshold * 2, 1.25),
        (1.0, 0.0, threshold * 2, 2.0),
        (1.0, 1.0, threshold * 2, 2.5),
        (1.0, 1.0, threshold * 0.5, 0.0),
        (0.5, 0.5, threshold * 2, 1.125)]:
    actual = rate(speed, bass, rms)
    assert math.isclose(actual, expected, abs_tol=1e-9), (
        speed, bass, rms, actual, expected)

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
print('Speed 0/0.5/1, bajo +25 %, silencio y 40 escenas: TODO OK')
