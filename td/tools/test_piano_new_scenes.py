"""Comprueba el contrato MIDI y de piano de las escenas 58–97."""

import importlib.util
import math
import os
import sys

TD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TD)

from vjcore import config, shader

logic_path = os.path.join(TD, 'vjcore', 'dats', 'midi_logic.py')
spec = importlib.util.spec_from_file_location('midi_logic_test', logic_path)
logic = importlib.util.module_from_spec(spec)
spec.loader.exec_module(logic)

for raw, expected in ((0.25, 0.25), (0.75, 0.75),
                      (32, 32 / 127.0), (64, 64 / 127.0), (127, 1.0)):
    assert math.isclose(logic._piano_velocity(raw), expected), (raw, expected)

assert logic._parse_note('ch13n49') == (13, 49)
assert logic._parse_note('ch13note73') == (13, 73)


class Param:
    def __init__(self, value=0.0):
        self.val = value
        self.min = self.max = self.normMin = self.normMax = 0.0

    def eval(self):
        return self.val


class Params:
    Pianochannel = Param(13)
    Pianolonote = Param(49)
    Pianohinote = Param(73)
    Keypos = Param()
    Keyvel = Param()
    Keypulseraw = Param()


class Project:
    par = Params()

    @staticmethod
    def fetch(name, default):
        return default


class Control:
    class module:
        @staticmethod
        def mediaPianoSelect(pos):
            Control.selected = pos


project = Project()
control = Control()
queued = []
logic.op = {'/project1': project,
            '/project1/control_script': control}.get
logic.run = lambda command, delayFrames: queued.append((command, delayFrames))


class Channel:
    name = 'ch13n61'


logic.onOffToOn(Channel(), 0, 0.64, 0.0)
assert math.isclose(project.par.Keypos.val, 0.5)
assert math.isclose(project.par.Keyvel.val, 0.64)
assert project.par.Keypulseraw.val == 1.0
assert project.par.Keyvel.max == project.par.Keyvel.normMax == 1.0
assert math.isclose(Control.selected, 0.5)
assert queued and queued[-1][1] == 2

logic.onOffToOn(Channel(), 0, 64.0, 0.0)
assert math.isclose(project.par.Keyvel.val, 64 / 127.0)

header = shader.make_header(58, config.CTRL_CHANNELS)
assert '#define uKeypulse  _ctrl(11)' in header
assert '#define uKeypos    _ctrl(12)' in header
assert '#define uKeyvel    _ctrl(13)' in header
assert 'vec2 pianoGestureUV(vec2 uv)' in header
assert 'vec3 pianoGestureLight(vec2 uv, vec3 col)' in header
assert 'if (pulse < 0.0015) return uv;' in header
assert 'if (pulse < 0.0015) return col;' in header
assert 'mod(scene, 6.0)' in header
assert 'pianoGestureUV(renderUV)' in shader._FOOTER
assert 'pianoGestureLight(vUV.st, c.rgb)' in shader._FOOTER

print('Piano MIDI 0–1/0–127 y seis gestos en escenas 58–97: TODO OK')
