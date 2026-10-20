#!/usr/bin/env python3
"""Presets de fabrica del set (set.json "presets_default").

- El set de Halloween trae un preset por escena (26), con valores 0..1.
- loadPresets(): sin archivo propio quedan los de fabrica; con Snapshot
  guardados en td/config, lo guardado gana escena por escena y el resto
  sigue de fabrica.
- restoreDefaultPresets() vuelve a los de fabrica.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)

CODE = r'''
import json, os, sys, tempfile
sys.path.insert(0, %r); sys.path.insert(0, %r)
import test_estado_seguro as T
from vjcore import config
tmp = tempfile.mkdtemp()
p = T.full_project(Repopath=tmp)
cs = T.load(p)
cs.loadPresets()
fab = dict(cs._presets())
os.makedirs(os.path.join(tmp, 'config'), exist_ok=True)
with open(os.path.join(tmp, 'config', config.PRESETS_FILE), 'w') as f:
    json.dump({"3": {"Speed": 0.9, "Detail1": 0.1}}, f)
cs.loadPresets()
mix = dict(cs._presets())
cs.restoreDefaultPresets()
back = dict(cs._presets())
print(repr(dict(fab=fab, mix=mix, back=back, n=config.N_SCENES)))
''' % (TD, HERE)


def main():
    fails = []

    def check(label, cond, detail=''):
        print('  [{}] {}{}'.format('OK' if cond else '!!', label, ('  -> ' + str(detail)) if detail else ''))
        if not cond:
            fails.append(label)

    out = subprocess.run([sys.executable, '-c', CODE], env=dict(os.environ, TDAI_SET='halloween'),
                         capture_output=True, text=True)
    if out.returncode:
        print(out.stdout, out.stderr)
        sys.exit(1)
    r = eval(out.stdout.strip().splitlines()[-1])
    fab, mix, back = r['fab'], r['mix'], r['back']
    check('un preset de fabrica por escena', sorted(fab, key=int) == [str(i) for i in range(r['n'])], len(fab))
    check('valores 0..1', all(0.0 <= v <= 1.0 for e in fab.values() for v in e.values()))
    check('lo guardado con Snapshot gana en su escena', mix['3'] == {"Speed": 0.9, "Detail1": 0.1}, mix['3'])
    check('las demas siguen de fabrica', mix['4'] == fab['4'])
    check('volver a fabrica', back == fab)
    print('\nTODO OK' if not fails else 'FALLAS: {}'.format(fails))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
