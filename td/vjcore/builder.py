"""Construccion del rig completo dentro de /project1."""

import os

from . import config, audio, control, midi, scenes, program, dashboard, shader
from .tdutil import (safe_set, safe_expr, add_float, add_int, add_toggle,
                     add_string, add_pulse, log, clear_log, chan_names)

DAT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dats')


def _dat_text(name):
    with open(os.path.join(DAT_DIR, name + '.py'), 'r', encoding='utf-8') as f:
        return f.read()


# ---------------------------------------------------------------
# PARAMETROS
# ---------------------------------------------------------------

def _parameters(proj):
    c = config

    p = proj.appendCustomPage('Control')
    add_float(p, 'Speed', 'Speed', 0.5, 0, 1)
    add_float(p, 'Density', 'Density', 0.5, 0, 1)
    add_float(p, 'Hue', 'Hue', 0.0, 0, 1)
    add_float(p, 'Chaos', 'Chaos', 0.3, 0, 1)
    add_float(p, 'Brightness', 'Master Fade', 1.0, 0, 1)
    add_toggle(p, 'Blackout', 'BLACKOUT', False)
    add_int(p, 'Activeindex', 'Active Scene', 0, 0, c.N_SCENES - 1)
    add_int(p, 'Targetindex', 'Target Scene', 0, 0, c.N_SCENES - 1)
    add_pulse(p, 'Nextscene', 'Next Scene')
    add_pulse(p, 'Prevscene', 'Prev Scene')

    t = proj.appendCustomPage('Transitions')
    add_float(t, 'Transitionseconds', 'Transition Seconds',
              c.DEFAULT_TRANSITION_SECONDS, 0.05, 4.0)
    add_float(t, 'Xfadetarget', 'Xfade Target (interno)', 0.0, 0, 1)

    o = proj.appendCustomPage('Output')
    add_int(o, 'Outputwidth', 'Output Width', c.DEFAULT_OUTPUT_W, 320, c.MAX_OUTPUT)
    add_int(o, 'Outputheight', 'Output Height', c.DEFAULT_OUTPUT_H, 240, c.MAX_OUTPUT)

    a = proj.appendCustomPage('Audio')
    add_float(a, 'Mastergain', 'Master Gain', 4.0, 0.1, 40)
    add_float(a, 'Bassgain', 'Bass Gain', 8.0, 0.1, 60)
    add_float(a, 'Midgain', 'Mid Gain', 6.0, 0.1, 60)
    add_float(a, 'Highgain', 'High Gain', 10.0, 0.1, 60)
    add_float(a, 'Kickwindow', 'Kick Window (s)', 0.35, 0.05, 2.0)
    add_float(a, 'Kickgain', 'Kick Gain', 9.0, 0.1, 60)
    add_float(a, 'Kickthreshold', 'Beat Threshold', 0.30, 0.01, 1.0)

    perf = proj.appendCustomPage('Performance')
    add_toggle(perf, 'Performancemode', 'Freeze Inactive Scenes', True)
    add_toggle(perf, 'Previewall', 'Preview All (caro)', False)
    add_int(perf, 'Prewarmframes', 'Prewarm Frames', 2, 0, 30)

    m = proj.appendCustomPage('MIDI Mapping')
    for slot in c.MIDI_SLOTS:
        add_string(m, 'Midi' + slot.lower(), slot, c.DEFAULT_MIDI.get(slot, ''))
        add_pulse(m, 'Learn' + slot.lower(), 'Learn ' + slot)
    add_pulse(m, 'Cancellearn', 'Cancelar Learn')
    add_pulse(m, 'Savemidi', 'Guardar Mapeo')
    add_pulse(m, 'Loadmidi', 'Cargar Mapeo')

    pr = proj.appendCustomPage('Presets')
    add_toggle(pr, 'Usepresets', 'Recall al cambiar escena', True)
    add_pulse(pr, 'Snapshot', 'Snapshot escena activa')

    s = proj.appendCustomPage('System')
    add_string(s, 'Repopath', 'Repo td/ Path', '')
    add_toggle(s, 'Safestartblackout', 'Safe Start Blackout', True)
    add_int(s, 'Fpswarning', 'FPS Warning', 55, 1, 240)
    add_int(s, 'Diagnosticinterval', 'Diagnostic Interval Frames', 30, 5, 600)
    add_toggle(s, 'Systemready', 'System Ready', False)
    add_pulse(s, 'Reloadshaders', 'Recargar Shaders')
    add_pulse(s, 'Rebuild', 'Reconstruir Todo')


# ---------------------------------------------------------------
# PAR EXECUTE (pulsos)
# ---------------------------------------------------------------

_PAR_EXEC = '''
def onPulse(par):
    p = op('/project1')
    ctrl = op('/project1/control_script')
    if not p or not ctrl:
        return
    m = ctrl.module
    n = par.name

    if n == 'Nextscene':
        m.nextScene()
    elif n == 'Prevscene':
        m.prevScene()
    elif n == 'Snapshot':
        m.snapshotPreset()
    elif n == 'Savemidi':
        m.saveMidiMap()
    elif n == 'Loadmidi':
        m.loadMidiMap()
    elif n == 'Cancellearn':
        m.cancelLearn()
    elif n == 'Reloadshaders':
        m.reloadShaders()
    elif n == 'Rebuild':
        import vjcore
        vjcore.build()
    elif n.startswith('Learn'):
        slot = n[5:]
        for s in m.MIDI_SLOTS:
            if s.lower() == slot:
                m.armLearn(s)
                break
    return


def onValueChange(par, prev):
    if par.name in ('Performancemode', 'Previewall'):
        ctrl = op('/project1/control_script')
        if ctrl:
            ctrl.module.setSceneCooking()
    return


def onValuesChanged(changes):
    return
'''


# ---------------------------------------------------------------
# BUILD
# ---------------------------------------------------------------

def build(verbose=True):
    clear_log()
    root = op('/')

    old = root.op('project1')
    if old:
        old.destroy()
        log('project1 anterior eliminado')

    proj = root.create(baseCOMP, 'project1')
    proj.nodeX, proj.nodeY = 0, 0

    _parameters(proj)
    safe_set(proj, 'Repopath', shader.repo_root())

    # --- runtime DATs primero: el resto los referencia ---
    ctrl_dat = proj.create(textDAT, 'control_script')
    ctrl_dat.nodeX, ctrl_dat.nodeY = 1560, 400
    ctrl_dat.text = _dat_text('control_script')

    diag_dat = proj.create(textDAT, 'diagnostics')
    diag_dat.nodeX, diag_dat.nodeY = 1560, 260
    diag_dat.text = _dat_text('diagnostics')

    rt = proj.create(executeDAT, 'runtime_manager')
    rt.nodeX, rt.nodeY = 1560, 120
    safe_set(rt, 'start', True)
    safe_set(rt, 'devicechange', True)
    safe_set(rt, 'framestart', False)
    rt.text = _dat_text('runtime_manager')

    pe = proj.create(parameterexecuteDAT, 'par_exec')
    pe.nodeX, pe.nodeY = 1560, -20
    safe_set(pe, 'op', proj.path)
    safe_set(pe, 'pars', '*')
    safe_set(pe, 'pulse', True)
    safe_set(pe, 'valuechange', True)
    pe.text = _PAR_EXEC

    # --- audio + control + midi ---
    audio_chop = audio.build(proj)
    ctrl_chop, ctrl_tex = control.build(proj, audio_chop)
    midi.build(proj, _dat_text('midi_logic'))

    channels = control.resolve_channels(proj)
    log('CTRL canales: {}'.format(channels))

    # --- escenas + program + dashboard ---
    _, outs, thumbs = scenes.build_all(proj, channels)
    ops = program.build(proj, outs)
    dashboard.build(proj, thumbs, ops['clean'])

    # --- error log ---
    err = proj.create(errorDAT, 'system_errors')
    err.nodeX, err.nodeY = 1560, 560
    safe_set(err, 'active', True)
    safe_set(err, 'source', '/project1*')
    safe_set(err, 'severity', 'warning abort')
    safe_set(err, 'clamp', True)
    safe_set(err, 'maxlines', 60)

    # --- contrato visual visible dentro de TD ---
    contract = proj.create(textDAT, 'VISUAL_CONTRACT')
    contract.nodeX, contract.nodeY = 1560, 700
    contract.text = _contract_text(channels)

    run("op('/project1/control_script').module.safeStartup()", delayFrames=3)

    report = verify(proj, channels)
    if verbose:
        print('\n'.join(report))
    return proj


def _contract_text(channels):
    names = ', '.join(shader.uniform_name(c) for c in channels)
    return (
        'CONTRATO VISUAL\n'
        '===============\n\n'
        'Un visual es UN archivo:  td/visuals/sceneNN_nombre.frag\n\n'
        'Debe definir exactamente una funcion:\n'
        '    vec4 render(vec2 uv)\n\n'
        'Uniforms disponibles (los inyecta el header automatico):\n'
        '    ' + names + '\n'
        '    uAspect, uScene\n\n'
        'Helpers: rot2 hash21 hash22 noise21 fbm ridge hsv2rgb centered vignette\n\n'
        'PROHIBIDO en un visual:\n'
        '  - declarar main()\n'
        '  - multiplicar por uBright (el master fade lo aplica el core)\n'
        '  - crear TOPs sueltos, tocar el dashboard, el program bus o el MIDI\n\n'
        'Para recargar: /project1 > System > Recargar Shaders\n'
        'Doc completa: docs/03_VISUAL_SPEC.md\n'
    )


# ---------------------------------------------------------------
# VERIFICACION
# ---------------------------------------------------------------

def verify(proj, channels):
    """Chequeos post-build. Vale oro porque este script no se puede
    testear fuera de TouchDesigner."""
    out = ['', '=' * 58, 'VERIFICACION DEL BUILD', '=' * 58]
    ok = True

    def check(label, cond, detail=''):
        nonlocal ok
        if not cond:
            ok = False
        out.append('  [{}] {}{}'.format(
            'OK' if cond else '!!', label, (' -> ' + detail) if detail else ''))

    got = chan_names(proj.op('ctrl'))
    check('ctrl tiene canales', len(got) > 0, '{} canales'.format(len(got)))
    missing = [c for c in config.CTRL_CHANNELS if c not in got]
    check('sin canales de control faltantes', not missing, str(missing))

    for name in ('program_a', 'program_b'):
        sw = proj.op(name)
        check('{} con {} inputs'.format(name, config.N_SCENES),
              bool(sw) and len(sw.inputs) == config.N_SCENES,
              str(len(sw.inputs)) if sw else 'no existe')

    bad = []
    for i in range(config.N_SCENES):
        sc = proj.op('scenes/scene{}'.format(i))
        if not (sc and sc.op('out1') and sc.op('content/shader')
                and sc.op('content/content_out') and sc.op('thumb')):
            bad.append(i)
    check('20 escenas completas', not bad, 'faltan en {}'.format(bad))

    check('ctrl_tex existe', bool(proj.op('ctrl_tex')))
    check('dashboard existe', bool(proj.op('dashboard_ui')))
    check('show_out existe', bool(proj.op('show_out')))
    check('show_window existe', bool(proj.op('show_window')))
    check('Repopath configurado', bool(proj.par.Repopath.eval()),
          proj.par.Repopath.eval())
    check('visuals/ encontrado', os.path.isdir(shader.visuals_dir()),
          shader.visuals_dir())

    out.append('')
    out.append('  RESULTADO: {}'.format('TODO OK' if ok else 'HAY FALLOS ARRIBA'))
    out.append('')
    out.append('  SIGUIENTE PASO MANUAL:')
    out.append('   1. /project1/audio1  -> elegir Device de audio')
    out.append('   2. /project1/midi1   -> elegir "Arturia MiniLab mkII"')
    out.append('   3. /project1 > MIDI Mapping > Learn <slot> y mover el knob')
    out.append('   4. /project1 > System > desmarcar Safe Start Blackout')
    out.append('   5. Abrir /project1/dashboard_ui (flag Viewer Active)')
    out.append('   6. Proyector: /project1/show_window > Monitor > pulso Open')
    out.append('')
    out.append('  GUIA COMPLETA: docs/06_PRIMERA_PRUEBA.md')
    out.append('=' * 58)
    return out
