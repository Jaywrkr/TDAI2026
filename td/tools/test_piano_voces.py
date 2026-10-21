"""Piano polifonico: cada tecla toma una voz (K{i}pos/vel/on/off), soltarla
la libera, un acorde usa voces distintas y la misma nota reusa su voz."""

import importlib.util
import os
import sys

TD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TD)

logic_path = os.path.join(TD, 'vjcore', 'dats', 'midi_logic.py')
spec = importlib.util.spec_from_file_location('midi_logic_voces', logic_path)
logic = importlib.util.module_from_spec(spec)
spec.loader.exec_module(logic)


class Param:
    def __init__(self, value=0.0):
        self.val = value
        self.min = self.max = self.normMin = self.normMax = 0.0

    def eval(self):
        return self.val


class Params:
    pass


for name, v in (('Pianochannel', 13), ('Pianolonote', 49), ('Pianohinote', 73),
                ('Keypos', 0.5), ('Keyvel', 0.0), ('Keypulseraw', 0.0)):
    setattr(Params, name, Param(v))
for i in range(6):
    for f, v in (('pos', 0.5), ('vel', 0.0), ('on', -1.0), ('off', -1.0)):
        setattr(Params, 'K{}{}'.format(i, f), Param(v))


class Project:
    par = Params()

    @staticmethod
    def fetch(name, default):
        return default


class Clock:
    t = 10.0

    def __getitem__(self, i):
        return self

    def eval(self):
        return Clock.t


project = Project()
logic.op = {'/project1': project, '/project1/key_clock': Clock()}.get
logic.run = lambda command, delayFrames: None


class Ch:
    def __init__(self, note):
        self.name = 'ch13n{}'.format(note)


P = project.par
held = lambda i: getattr(P, 'K{}on'.format(i)).val > 0 and getattr(P, 'K{}off'.format(i)).val < getattr(P, 'K{}on'.format(i)).val
voice_of = lambda pos: [i for i in range(6) if held(i) and abs(getattr(P, 'K{}pos'.format(i)).val - pos) < 1e-6]

fails = []
def check(name, ok):
    print('  [{}] {}'.format('OK' if ok else '!!', name))
    if not ok:
        fails.append(name)

# acorde de 3 notas: 3 voces distintas, todas apretadas
for n in (49, 61, 73):
    Clock.t += 0.01
    logic.onOffToOn(Ch(n), 0, 0.8, 0.0)
check('acorde: 3 voces apretadas', sum(held(i) for i in range(6)) == 3)
check('cada nota en su voz', len(voice_of(0.0)) == 1 and len(voice_of(0.5)) == 1 and len(voice_of(1.0)) == 1)
# soltar la del medio
Clock.t += 0.5
logic.onOnToOff(Ch(61), 0, 0.0, 0.8)
check('soltar libera solo esa voz', sum(held(i) for i in range(6)) == 2 and not voice_of(0.5))
v = [i for i in range(6) if getattr(P, 'K{}pos'.format(i)).val == 0.5][0]
check('la voz soltada guarda cuando se solto', abs(getattr(P, 'K{}off'.format(v)).val - Clock.t) < 1e-6)
# 6 teclas mas: nunca mas de 6 voces y la mas vieja se reusa
for n in (50, 52, 54, 56, 58, 60):
    Clock.t += 0.01
    logic.onOffToOn(Ch(n), 0, 0.5, 0.0)
check('nunca mas de 6 voces', sum(held(i) for i in range(6)) == 6)
print('TODO OK' if not fails else 'FALLARON {}: {}'.format(len(fails), fails))
sys.exit(1 if fails else 0)
