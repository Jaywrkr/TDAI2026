#!/usr/bin/env python3
"""Layout v2 del controlador: Energia como perilla principal, autopilot a
tiempo con el beat, pad RETRO, y la migracion del mapeo MIDI guardado.

Se prueba fuera de TD con el mismo arnes que test_estado_seguro.py:

  1. applyEnergy escribe tambien el ritmo (fundido + autopilot), en los
     dos extremos, y no hace nada con Energyactive apagado.
  2. El autopilot ARMA el cambio y lo dispara el proximo golpe; un golpe
     sin cambio armado no hace nada; sin golpe, el fallback cambia igual,
     pero un fallback viejo (token vencido) no.
  3. Un Learn quita el canal al slot que lo tenia antes (un canal = un
     slot).
  4. Un midi_map.json viejo (sin '_layout') migra al layout v2: los slots
     nuevos toman sus canales y los viejos que los tenian quedan vacios.
     Un json ya migrado NO se vuelve a tocar (respeta Learns posteriores).
  5. midi_logic: la perilla Energy prende Energyactive; RETRO dispara
     Grain + Posterize.
"""
import json
import os
import sys
import tempfile
import types

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

import test_estado_seguro as T  # noqa: E402
from vjcore import config  # noqa: E402

MIDI_LOGIC = os.path.join(TD, 'vjcore', 'dats', 'midi_logic.py')


def project_with_midi(**extra):
    pars = {'Midi' + s.lower(): '' for s in config.MIDI_SLOTS}
    pars.update(Energy=0.5, Energyactive=True, Speed=0.5, Density=0.5,
                Chaos=0.5, Trails=0.0, Transitionseconds=0.45,
                Autopilot=True, Autopilotseconds=20.0, Repopath='',
                Grain=0.0, Posterize=0.0, Padleds=False)
    pars.update(extra)
    return T.FakeProject(**pars)


def main():
    fails = []

    def check(label, got, want):
        ok = got == want if not isinstance(want, float) else abs(got - want) < 1e-6
        print('  [{}] {}  -> {!r}{}'.format('OK' if ok else '!!', label, got,
                                          '' if ok else '  ESPERABA {!r}'.format(want)))
        if not ok:
            fails.append(label)

    print('--- ENERGIA: tambien maneja el ritmo ---')
    p = project_with_midi(Energy=0.0)
    m = T.load(p)
    m.applyEnergy()
    check('calma: fundido largo', p.par.Transitionseconds.val, 2.2)
    check('calma: escenas largas en autopilot', p.par.Autopilotseconds.val, 40.0)
    p.par.Energy = 1.0
    m.applyEnergy()
    check('pico: fundido corto', p.par.Transitionseconds.val, 0.3)
    check('pico: cambios frecuentes', p.par.Autopilotseconds.val, 8.0)
    check('pico: velocidad alta', p.par.Speed.val, 0.9)
    p.par.Energyactive = False
    p.par.Energy = 0.0
    m.applyEnergy()
    check('Energyactive apagado: no toca nada', p.par.Speed.val, 0.9)

    print('\n--- AUTOPILOT: el cambio cae en el golpe ---')
    p = project_with_midi()
    m = T.load(p)
    calls = []
    m.__dict__['nextScene'] = lambda: calls.append('next')
    m.__dict__['_scheduleAutopilot'] = lambda: None
    m.autopilotBeat()
    check('golpe sin cambio armado: no cambia', len(calls), 0)
    m._autopilotTick()
    check('tick: arma, no cambia en el acto', len(calls), 0)
    check('tick: queda armado', p.fetch('autopilot_armed'), True)
    m.autopilotBeat()
    check('golpe: cambia de escena', len(calls), 1)
    m.autopilotBeat()
    check('segundo golpe: ya no cambia', len(calls), 1)
    m._autopilotTick()
    tok = p.fetch('autopilot_token')
    m._autopilotFallback(tok - 1)
    check('fallback vencido: no cambia', len(calls), 1)
    m._autopilotFallback(tok)
    check('sin golpe: el fallback cambia igual', len(calls), 2)
    m.toggleAutopilot()
    check('toggleAutopilot apaga', p.par.Autopilot.val, False)
    m._autopilotTick()
    m.autopilotBeat()
    check('apagado: no cambia', len(calls), 2)

    print('\n--- LEARN: un canal = un slot ---')
    p = project_with_midi(Miditransition='ch1ctrl74')
    m = T.load(p)
    m.__dict__['saveMidiMap'] = lambda: None
    m.armLearn('Energy')
    m.applyLearn('ch1ctrl74')
    check('Energy toma el canal', p.par.Midienergy.val, 'ch1ctrl74')
    check('Transition lo suelta', p.par.Miditransition.val, '')

    print('\n--- MIGRACION: midi_map.json viejo -> layout v2 ---')
    d = tempfile.mkdtemp()
    old = {'Transition': 'ch1ctrl74', 'Bassamount': 'ch1ctrl19',
           'Snapshot': 'ch1ctrl27', 'Reset': 'ch1ctrl26',
           'Mediaprev': 'ch1ctrl23', 'Grain': 'ch10n37',
           'Posterize': 'ch10n52', 'Speed': 'ch1ctrl75'}
    path = os.path.join(d, 'midi_map.json')
    with open(path, 'w') as f:
        json.dump(old, f)
    p = project_with_midi()
    m = T.load(p)
    m.__dict__['_midi_path'] = lambda: path
    m.loadMidiMap()
    for slot, chan in config.MIDI_LAYOUT_V2.items():
        check('{} -> {}'.format(slot, chan), getattr(p.par, 'Midi' + slot.lower()).val, chan)
    for slot in ('Transition', 'Bassamount', 'Snapshot', 'Reset',
                 'Mediaprev', 'Grain', 'Posterize'):
        check('{} liberado'.format(slot), getattr(p.par, 'Midi' + slot.lower()).val, '')
    check('lo que no cambia se respeta (Speed)', p.par.Midispeed.val, 'ch1ctrl75')
    with open(path) as f:
        saved = json.load(f)
    check('se guardo con la marca de layout', saved.get('_layout'), config.MIDI_LAYOUT)
    # Un Learn posterior no se pisa al volver a cargar.
    saved['Energy'] = 'ch1ctrl99'
    with open(path, 'w') as f:
        json.dump(saved, f)
    p2 = project_with_midi()
    m2 = T.load(p2)
    m2.__dict__['_midi_path'] = lambda: path
    m2.loadMidiMap()
    check('json ya migrado: respeta el Learn nuevo', p2.par.Midienergy.val, 'ch1ctrl99')

    print('\n--- midi_logic: Energy prende el macro, RETRO son dos efectos ---')
    p = project_with_midi(Energyactive=False, Midienergy='ch1ctrl74', Midiretro='ch10n37')
    cs = T.load(p)
    with open(MIDI_LOGIC) as f:
        src = f.read()
    ml = types.ModuleType('midi_logic')
    ctrl = types.SimpleNamespace(module=cs)

    def fake_op(path=None):
        return {'/project1': p, '/project1/control_script': ctrl}.get(path)
    ml.__dict__['op'] = fake_op
    ml.__dict__['run'] = lambda *a, **k: None
    exec(compile(src, MIDI_LOGIC, 'exec'), ml.__dict__)
    ml.__dict__['_norm01'] = lambda name, val: float(val)
    ml._handle(types.SimpleNamespace(name='ch1ctrl74'), 0.8, False)
    check('Energy escribe el valor', p.par.Energy.val, 0.8)
    check('Energy prende Energyactive', p.par.Energyactive.val, True)
    ml._handle(types.SimpleNamespace(name='ch10n37'), 1.0, True)
    check('RETRO: Grain', p.par.Grain.val, 1.0)
    check('RETRO: Posterize', p.par.Posterize.val, 1.0)

    print('\n--- config: los slots del layout existen y no se repiten ---')
    check('slots unicos', len(config.MIDI_SLOTS), len(set(config.MIDI_SLOTS)))
    check('todo slot del layout esta en MIDI_SLOTS',
          all(s in config.MIDI_SLOTS for s in config.MIDI_LAYOUT_V2), True)
    chans = [v for v in config.DEFAULT_MIDI.values()]
    check('DEFAULT_MIDI sin canales repetidos', len(chans), len(set(chans)))

    print('\n--- config: pagina MIDI Mapping = orden fisico de la web ---')
    check('MIDI_PANEL_SLOTS sin repetidos',
          len(config.MIDI_PANEL_SLOTS), len(set(config.MIDI_PANEL_SLOTS)))
    check('todo slot del panel existe en MIDI_SLOTS',
          all(s in config.MIDI_SLOTS for s in config.MIDI_PANEL_SLOTS), True)
    check('16 perillas + 2 shift + 2 tiras + 16 pads = 36',
          len(config.MIDI_PANEL_SLOTS), 36)
    check('cada slot del panel tiene su nombre en español',
          all(s in config.MIDI_SLOT_LABEL_ES for s in config.MIDI_PANEL_SLOTS), True)
    check('Trails se muestra como Estela (no "Trails")',
          config.MIDI_SLOT_LABEL_ES['Trails'], 'Estela')
    check('Energy es la primera (perilla 1)', config.MIDI_PANEL_SLOTS[0], 'Energy')
    check('Palettelock es la ultima perilla (16)',
          config.MIDI_PANEL_SLOTS[15], 'Palettelock')
    check('Blendnext cierra el panel (pad 16)', config.MIDI_PANEL_SLOTS[-1], 'Blendnext')

    print()
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        sys.exit(1)
    print('RESULTADO: TODO OK')


if __name__ == '__main__':
    main()
