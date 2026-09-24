#!/usr/bin/env python3
"""El manual web (docs/10_MANUAL_MINILAB.html) y el rig no se desincronizan.

El Learn guiado de la web genera td/config/midi_map.json; si la lista de
slots o los nombres de canal de la pagina no coinciden con los del rig, el
archivo cargaria mal sin ningun error visible. Chequea:

  1. MIDI_SLOTS de la pagina == vjcore.config.MIDI_SLOTS.
  2. MIDI_LAYOUT de la pagina == vjcore.config.MIDI_LAYOUT (si no, el rig
     "migraria" encima del mapeo recien aprendido).
  3. La pagina nombra los canales igual que el rig: chNctrlM / chNnM /
     chNpitch (el formato de config.DEFAULT_MIDI).
  4. Un midi_map.json con el formato que genera la pagina se carga tal cual
     en control_script.loadMidiMap(), sin migrar.
  5. La guia de escenas (D1-D6 y piano de cada escena) esta al dia con los
     .frag. Si no: python3 td/tools/build_manual_scenes.py
"""
import json
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
REPO = os.path.dirname(TD)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

from vjcore import config  # noqa: E402
import test_estado_seguro as T  # noqa: E402

MANUAL = os.path.join(REPO, 'docs', '10_MANUAL_MINILAB.html')


def main():
    fails = []

    def check(label, got, want):
        ok = got == want
        print('  [{}] {}{}'.format('OK' if ok else '!!', label,
                                   '' if ok else '  -> {!r} ESPERABA {!r}'.format(got, want)))
        if not ok:
            fails.append(label)

    html = open(MANUAL, encoding='utf-8').read()
    m = re.search(r"const MIDI_SLOTS = \[(.*?)\];", html, re.S)
    page_slots = re.findall(r"'([^']+)'", m.group(1)) if m else []
    check('MIDI_SLOTS de la pagina == config.MIDI_SLOTS', page_slots, list(config.MIDI_SLOTS))
    lay = re.search(r"const MIDI_LAYOUT = '([^']*)'", html)
    check('MIDI_LAYOUT de la pagina == config', lay.group(1) if lay else None, config.MIDI_LAYOUT)
    for pat in ("'ch' + ch + 'ctrl' + d1", "'ch' + ch + 'n' + d1", "'ch' + ch + 'pitch'"):
        check('la pagina arma nombres como el rig: {}'.format(pat), pat in html, True)
    for chan in config.DEFAULT_MIDI.values():
        check('DEFAULT_MIDI usa un formato que la pagina genera: {}'.format(chan),
              bool(re.fullmatch(r'ch\d+(ctrl\d+|n\d+|pitch)', chan)), True)

    print('\n--- un json como el de la pagina carga tal cual ---')
    data = {s: '' for s in config.MIDI_SLOTS}
    data.update({'Energy': 'ch1ctrl100', 'Trailszoom': 'ch1pitch', 'Retro': 'ch10n37',
                 'Next': 'ch1ctrl30', '_layout': config.MIDI_LAYOUT})
    d = tempfile.mkdtemp()
    path = os.path.join(d, 'midi_map.json')
    with open(path, 'w') as f:
        json.dump(data, f)
    p = T.FakeProject(**{'Midi' + s.lower(): 'viejo' for s in config.MIDI_SLOTS})
    mod = T.load(p)
    mod.__dict__['_midi_path'] = lambda: path
    saved = []
    mod.__dict__['saveMidiMap'] = lambda: saved.append(1)
    mod.loadMidiMap()
    check('Energy', p.par.Midienergy.val, 'ch1ctrl100')
    check('Trailszoom en la tira de pitch', p.par.Miditrailszoom.val, 'ch1pitch')
    check('lo no aprendido queda vacio (no quedan canales viejos)', p.par.Midisnapshot.val, '')
    check('no migra encima (ya es layout v2)', len(saved), 0)

    print('\n--- guia de escenas al dia con los .frag ---')
    import build_manual_scenes as B
    embedded = B.read_embedded(html) or []
    check('la guia trae las {} escenas'.format(config.N_SCENES), len(embedded), config.N_SCENES)
    fresh = {s['i']: s for s in B.scenes_data()}
    stale = [s['file'] for s in embedded
             if s['i'] in fresh and (s['d'] != fresh[s['i']]['d'] or s['piano'] != fresh[s['i']]['piano']
                                     or s['file'] != fresh[s['i']]['file'])]
    check('D1-D6 y piano de la guia == los .frag (si falla: python3 td/tools/build_manual_scenes.py)',
          stale, [])
    check('todas con miniatura', sum(1 for s in embedded if s.get('thumb')), config.N_SCENES)

    print()
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        sys.exit(1)
    print('RESULTADO: TODO OK')


if __name__ == '__main__':
    main()
