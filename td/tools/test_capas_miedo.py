#!/usr/bin/env python3
"""Fase 29 de Halloween: capas encima, MIEDO, NAVEGADOR y guardian de FPS.

  1. MiniLab en Halloween (fase 43): perilla 2 -> Miedo; las perillas 1 y
     9 y sus clics sin uso; los pads 14 y 15 son momentos (la capa y el
     navegador siguen andando desde /project1). Antes: pad 14 -> capa ON/OFF, pad 15
     -> siguiente capa (set.json midi_redirect)
  2. Capas: el pad 14 prende/apaga; el 15 cambia con fundido (se apaga,
     espera CAPA_FADE_SECONDS, entra la nueva); si la capa no pega con la
     escena (capas_excluir) se elige la proxima que si
  3. Al cambiar a una escena donde la capa no pega, cambia sola
  4. LEDs: pad 14 con el color de la capa si esta puesta, pad 15 siempre
  5. Navegador: la perilla es una posicion en el setlist; elige sin tocar
     el aire (preview); el clic la lanza; a los 8 s deja de cocinarla
  6. Guardian: baja un escalon con el FPS bajo durante un rato, espera un
     fundido para aplicarlo, y vuelve a subir con el FPS alto
  7. El GLSL de program_capas con capa y miedo en 0 devuelve la escena
     EXACTA (render_capas.py --check), si hay moderngl
"""
import os
import subprocess
import sys
import types

os.environ['TDAI_SET'] = 'halloween'
HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)
sys.path.insert(0, HERE)

import test_estado_seguro as S  # noqa: E402
from vjcore import config  # noqa: E402

MIDI_LOGIC = os.path.join(TD, 'vjcore', 'dats', 'midi_logic.py')
DIAG = os.path.join(TD, 'vjcore', 'dats', 'diagnostics.py')

fails = []


def check(label, got, want):
    ok = got == want if not isinstance(want, float) else abs(got - want) < 1e-6
    print('  [{}] {}{}'.format('OK' if ok else '!!', label,
                               '' if ok else '  -> {!r} ESPERABA {!r}'.format(got, want)))
    if not ok:
        fails.append(label)


def project(**kw):
    pars = dict(Capaon=0.0, Capasel=1, Miedo=0.0, Navegador=0.0, Momenton=-1.0,
                Cuemode=False, Usesetlist=True,
                Setlist=' '.join(str(i) for i in config.DEFAULT_SETLIST),
                Activeindex=0, Targetindex=0, Previewindex=0)
    pars.update({'Midi' + s.lower(): '' for s in config.MIDI_SLOTS})
    pars.update(kw)
    return S.full_project(**pars)


def load(p):
    m = S.load(p)
    runs = []
    m.__dict__['run'] = lambda *a, **k: runs.append((a, k))
    m.__dict__['refreshPadLeds'] = lambda *a, **k: None
    sel = []
    m.__dict__['_startFade'] = lambda *a, **k: sel.append(a)
    return m, runs, sel


def main():
    print('--- 1. MiniLab en Halloween ---')
    r = config.MIDI_REDIRECT
    for slot, want in (('Hue', 'Miedo'), ('Energy', 'Ninguno'), ('Detail1', 'Ninguno'),
                       ('Clic1', 'nada'), ('Clic9', 'nada'), ('Mirror', 'triggerMurcielagos'),
                       ('Zoom', 'triggerRebobinar')):
        check('{} -> {}'.format(slot, want), r.get(slot), want)
    check('el set pide el pase de capas', config.CAPAS_ON, True)
    check('6 capas', len(config.CAPAS), 6)

    # la perilla 2 escribe Miedo por la redireccion (no Hue); la 1 no hace nada
    p = project(Midihue='ch1ctrl75', Midienergy='ch1ctrl113', Midiclic1='ch1ctrl112', Energy=0.3, Hue=0.0)
    cs, runs, _ = load(p)
    with open(MIDI_LOGIC) as f:
        src = f.read()
    ml = types.ModuleType('midi_logic')
    ctrl = types.SimpleNamespace(module=cs)
    ml.__dict__['op'] = lambda path=None: {'/project1': p, '/project1/control_script': ctrl}.get(path)
    ml.__dict__['run'] = lambda *a, **k: None
    exec(compile(src, MIDI_LOGIC, 'exec'), ml.__dict__)
    ml._handle(types.SimpleNamespace(name='ch1ctrl75'), 127, False)
    check('perilla 2 = Miedo arriba', p.par.Miedo.val, 1.0)
    check('Hue no se toca', p.par.Hue.val, 0.0)
    ml._handle(types.SimpleNamespace(name='ch1ctrl113'), 65, False)
    check('perilla 1: Energia no se toca', p.par.Energy.val, 0.3)
    called = []
    cs.__dict__['triggerMoment'] = lambda: called.append('moment')
    ml._handle(types.SimpleNamespace(name='ch1ctrl112'), 127, True)
    check('clic 1 no hace nada', called, [])

    print('\n--- 2. Capas ---')
    p = project(Activeindex=0)
    m, runs, _ = load(p)
    m.toggleCapa()
    check('pad 14: prende', p.par.Capaon.val, 1.0)
    m.toggleCapa()
    check('pad 14: apaga', p.par.Capaon.val, 0.0)
    m.nextCapa()
    check('pad 15 con la capa apagada: pasa a la 2 y la prende', (p.par.Capasel.val, p.par.Capaon.val), (2, 1.0))
    runs.clear()
    m.nextCapa()
    check('pad 15 con la capa puesta: primero fundido de salida', p.par.Capaon.val, 0.0)
    check('...y la elegida todavia no cambio', p.par.Capasel.val, 2)
    ms = [k.get('delayMilliSeconds') for a, k in runs]
    check('...espera el fundido', ms, [int(config.CAPA_FADE_SECONDS * 1000)])
    exec(runs[-1][0][0].replace("op('/project1/control_script').module.", 'm.'), {'m': m})
    check('...al terminar entra la 3', (p.par.Capasel.val, p.par.Capaon.val), (3, 1.0))
    # lluvia (3) no pega en la morgue (29): pad 14 elige la proxima
    p = project(Activeindex=29, Capasel=3)
    m, runs, _ = load(p)
    m.toggleCapa()
    check('lluvia en la morgue: elige otra (aranas)', (p.par.Capasel.val, p.par.Capaon.val), (4, 1.0))
    p = project(Activeindex=29, Capasel=5)
    m, runs, _ = load(p)
    m.nextCapa()
    check('pad 15 en la morgue salta lluvia y cuervos: de brasas a niebla', p.par.Capasel.val, 1)

    print('\n--- 3. Cambio a una escena donde la capa no pega ---')
    p = project(Activeindex=0, Capasel=3, Capaon=1.0)
    m, runs, _ = load(p)
    m._capaCompat(7)
    check('lluvia al entrar al pasillo: fundido de salida', p.par.Capaon.val, 0.0)
    exec(runs[-1][0][0].replace("op('/project1/control_script').module.", 'm.'), {'m': m})
    check('...y entra la proxima que pega (aranas)', (p.par.Capasel.val, p.par.Capaon.val), (4, 1.0))
    p = project(Activeindex=0, Capasel=1, Capaon=1.0)
    m, runs, _ = load(p)
    m._capaCompat(7)
    check('niebla en el pasillo: se queda', (p.par.Capasel.val, p.par.Capaon.val), (1, 1.0))

    print('\n--- 4. LEDs de los pads 14 y 15 (momentos) ---')
    p = project(Capasel=2, Capaon=1.0, Padleds=True)
    m, _, _ = load(p)
    leds = m.padLedColors()
    check('pad 14 = murcielagos (violeta en reposo)', leds[13], 'purple')
    check('pad 15 = rebobinar (cian en reposo)', leds[14], 'cyan')

    print('\n--- 5. Navegador ---')
    p = project(Activeindex=0)
    m, runs, _ = load(p)
    sl = list(config.DEFAULT_SETLIST)
    check('izquierda = primera del setlist', m.navPick(0.0), sl[0])
    check('derecha = ultima del setlist', m.navPick(1.0), sl[-1])
    check('mitad = la del medio', m.navPick(0.5), sl[len(sl) // 2])
    m.navSelect(0.5)
    check('elige en el preview', p.par.Previewindex.val, sl[len(sl) // 2])
    check('no toca el aire', p.par.Activeindex.val, 0)
    idle = [a for a, k in runs if '_navIdle' in a[0]]
    check('agenda dejar de cocinar a los 8 s', len(idle), 1)
    exec(idle[-1][0].replace("op('/project1/control_script').module.", 'm.'), {'m': m})
    check('a los 8 s el preview vuelve a la del aire (no cocina de mas)', p.par.Previewindex.val, 0)
    check('...pero la eleccion queda guardada', p.fetch('nav_sel'), sl[len(sl) // 2])
    got = []
    m.__dict__['selectScene'] = lambda i: got.append((i, p.fetch('taking')))
    m.launchNav()
    check('clic 9 lanza la elegida (aunque este en cue)', got, [(sl[len(sl) // 2], True)])
    check('...y la eleccion se limpia', p.fetch('nav_sel'), None)

    print('\n--- 6. Guardian de FPS ---')
    with open(DIAG) as f:
        dsrc = f.read()
    p = project(Renderscale=0.75, Guardian=True, Guardianbaja=40, Guardianbajaseg=2.0,
                Guardiansube=55, Guardiansubeseg=5.0, Guardianmin=0.5, Failsafelevel=0)
    d = types.ModuleType('diagnostics')
    d.__dict__['op'] = lambda path=None: p if path in ('/project1', None) else None
    d.__dict__['project'] = types.SimpleNamespace(cookRate=60.0)
    d.__dict__['absTime'] = types.SimpleNamespace(seconds=0.0, frame=0)
    exec(compile(dsrc, DIAG, 'exec'), d.__dict__)
    clock = [100.0]
    import time as _time
    real = _time.perf_counter
    _time.perf_counter = lambda: clock[0]
    try:
        check('escalones', d.guardianScales(0.75, 0.5), [0.75, 0.6, 0.5])
        for _ in range(4):
            d._guardian(30.0)
            clock[0] += 1.0
        check('con 30 FPS 2 s: queda pendiente (no salta en medio de la escena)',
              p.par.Renderscale.val, 0.75)
        p.store('transitioning', True)
        d._guardian(30.0)
        check('en el fundido aplica 0.6', p.par.Renderscale.val, 0.6)
        p.store('transitioning', False)
        for _ in range(4):
            d._guardian(30.0)
            clock[0] += 1.0
        clock[0] += 20.0
        d._guardian(30.0)
        check('sin fundido en 15 s igual aplica 0.5', p.par.Renderscale.val, 0.5)
        for _ in range(10):
            d._guardian(30.0)
            clock[0] += 1.0
        check('no baja de Guardianmin', p.par.Renderscale.val, 0.5)
        for _ in range(8):
            d._guardian(60.0)
            clock[0] += 1.0
        p.store('transitioning', True)
        d._guardian(60.0)
        check('con 60 FPS 5 s vuelve a subir un escalon', p.par.Renderscale.val, 0.6)
        p.store('transitioning', False)
        p.par.Failsafelevel = 1
        for _ in range(8):
            d._guardian(60.0)
            clock[0] += 1.0
        clock[0] += 20.0
        d._guardian(60.0)
        check('con el failsafe actuado no sube solo', p.par.Renderscale.val, 0.6)
    finally:
        _time.perf_counter = real

    print('\n--- 7. GLSL: capa y miedo en 0 = escena exacta ---')
    try:
        import moderngl  # noqa: F401
        r = subprocess.run([sys.executable, os.path.join(HERE, 'render_capas.py'), '--check',
                            '--set', 'halloween', '--size', '256x102'],
                           capture_output=True, text=True)
        print('   ', (r.stdout.strip().splitlines() or [''])[-1])
        check('render_capas --check', r.returncode, 0)
    except ImportError:
        print('  (sin moderngl: se salta)')

    print()
    if fails:
        print('FALLOS:', fails)
        sys.exit(1)
    print('RESULTADO: TODO OK')


if __name__ == '__main__':
    main()
