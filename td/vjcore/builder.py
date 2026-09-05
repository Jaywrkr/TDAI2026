"""Construccion del rig completo dentro de /project1."""

# TouchDesigner inyecta sus globales (op, run, absTime, project y las
# constantes de tipo como baseCOMP o glslTOP) en su propio namespace y en los
# DATs, pero NO en modulos importados desde sys.path. Hay que pedirlos.
# El try existe para que las herramientas de td/tools/ puedan importar este
# modulo fuera de TouchDesigner.
try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass


import os

from . import (config, audio, control, midi, scenes, program, dashboard, shader,
              media, keyboard, autopilot)
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
    # Perillas de performance: cuanto deja pasar el audio hacia los visuales.
    # Default 1.0 = no cambia nada hasta que se toquen (sin sorpresas para
    # quien ya tenia el rig funcionando).
    add_float(a, 'Audioamount', 'Audio Amount (master)', 1.0, 0, 1)
    add_float(a, 'Bassamount', 'Bass Amount', 1.0, 0, 1)
    add_float(a, 'Midamount', 'Mid Amount', 1.0, 0, 1)
    add_float(a, 'Highamount', 'High Amount', 1.0, 0, 1)

    perf = proj.appendCustomPage('Performance')
    add_toggle(perf, 'Performancemode', 'Freeze Inactive Scenes', True)
    # Default vuelto a False (habia pasado a True con 20 escenas para que
    # el dashboard no se viera todo negro -- ver comentario historico
    # abajo). Con 34 escenas eso hundio el FPS a ~9 al abrir el viewer
    # del dashboard (34 shaders completos cocinando a la vez, no 20):
    # pedido explicito del usuario de que SOLO cocine la escena activa y
    # la que esta por entrar durante una transicion, no las 34 juntas.
    # setSceneCooking() ya hace exactamente eso con Previewall=False --
    # indices = visibleScenes() = {activa} o {activa, entrante} mientras
    # dura el fundido. El resto del grid queda con el ultimo frame que
    # llego a cocinar (negro hasta la primera vez que se visita esa
    # escena, snapshot fijo despues) en vez de una miniatura siempre viva.
    add_toggle(perf, 'Previewall', 'Preview All (caro)', False)
    add_int(perf, 'Prewarmframes', 'Prewarm Frames', 2, 0, 30)

    ap = proj.appendCustomPage('Autopilot')
    add_toggle(ap, 'Autopilot', 'Autopilot (hands-free)', False)
    add_float(ap, 'Autopilotseconds', 'Autopilot Seconds', 20.0, 3.0, 120.0)

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

    # Fase 3: perillas de detalle. Significan algo distinto en cada escena
    # -- el .frag las documenta con comentarios @D1.._at6 y el dashboard
    # muestra esa leyenda para la escena activa. Ver docs/03_VISUAL_SPEC.md.
    # Default cambiado de 0.5 a 0.0 (pedido explicito): todas las escenas
    # arrancan en su version mas subtil/apagada, y el efecto de cada
    # Detail crece a medida que la perilla sube -- no un punto medio ya
    # con la mitad del efecto puesto.
    d = proj.appendCustomPage('Detail')
    for i in range(1, 7):
        add_float(d, 'Detail{}'.format(i), 'Detail {}'.format(i), 0.0, 0, 1)

    s = proj.appendCustomPage('System')
    add_string(s, 'Repopath', 'Repo td/ Path', '')
    add_toggle(s, 'Safestartblackout', 'Safe Start Blackout', True)
    add_int(s, 'Fpswarning', 'FPS Warning', 55, 1, 240)
    # Bajado de 30 a 12 (~5x/seg a 60fps, ~4x/seg a 50fps): este panel
    # ahora tambien muestra los valores en vivo de las perillas y del
    # audio (diagnostics.py), asi que se lee como un medidor, no solo
    # como un chequeo de sistema ocasional -- 30 frames (~0.5s) se sentia
    # con retraso notable al mover una perilla.
    add_int(s, 'Diagnosticinterval', 'Diagnostic Interval Frames', 12, 5, 600)
    add_toggle(s, 'Systemready', 'System Ready', False)
    add_pulse(s, 'Reloadshaders', 'Recargar Shaders')
    add_pulse(s, 'Rebuild', 'Reconstruir Todo')
    # Estado interno del piano (Fase 3) -- no se tocan a mano, los escribe
    # midi_logic.py en cada tecla. Viven aca porque necesitan ser
    # parametros custom reales para que el Parameter CHOP los pueda leer.
    add_float(s, 'Keypos', 'Keypos (interno)', 0.5, 0, 1)
    add_float(s, 'Keyvel', 'Keyvel (interno)', 0.0, 0, 1)
    add_float(s, 'Keypulseraw', 'Keypulseraw (interno)', 0.0, 0, 1)
    # Efectos de pad (Fase 3, movidos del piano C1-E1 a pads aprendidos
    # con Learn -- ver pagina MIDI Mapping) -- se escriben desde
    # midi_logic.py (EFFECT_TRIGGERS).
    add_float(s, 'Grain', 'Grain', 0.0, 0, 1)
    add_float(s, 'Glitch', 'Glitch', 0.0, 0, 1)
    add_float(s, 'Pixelate', 'Pixelate', 0.0, 0, 1)
    add_float(s, 'Strobe', 'Strobe', 0.0, 0, 1)
    add_float(s, 'Invert', 'Invert', 0.0, 0, 1)


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
        for s in m._midi_slots():
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
    try:
        op
    except NameError:
        raise RuntimeError(
            'Los globales de TouchDesigner (op, baseCOMP...) no estan '
            'disponibles en este modulo. Falta "from td import *" arriba de '
            'vjcore/builder.py, o estas ejecutando el build fuera de '
            'TouchDesigner.')

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
    midi.build(proj, _dat_text('midi_logic'))
    key_chop = midi.build_keypulse(proj)
    ctrl_chop, ctrl_tex = control.build(proj, audio_chop, key_chop)

    channels = control.resolve_channels(proj)
    log('CTRL canales: {}'.format(channels))

    # --- avance de imagen/GIF por beat (config.MEDIA_SCENES) ---
    beat_chan, _media_logic = media.build(proj)

    # --- autopilot (avance de ESCENA hands-free, por tiempo + beat) ---
    autopilot.build(proj, beat_chan)

    # --- atajos de teclado (respaldo del MIDI) ---
    keyboard.build(proj)

    # --- escenas + program + dashboard ---
    _, outs, thumbs = scenes.build_all(proj, channels)
    ops = program.build(proj, outs)
    dashboard.build(proj, thumbs, ops['bloom'])

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

    # 'delayFrames' arranca aqui, NO desde runtime_manager.onStart(). onStart
    # de un Execute DAT dispara una sola vez por SESION de TouchDesigner (al
    # abrir/arrancar el proyecto), no cada vez que este script recrea
    # /project1 mientras TD ya esta corriendo -- que es exactamente lo que
    # pasa al usar "Run Script" repetidas veces. El runtime_manager recien
    # creado nunca recibia ese evento, asi que el bucle que reprograma el
    # refresco del diagnostico (tickDiag -> run(delayFrames=N) -> tickDiag)
    # jamas arrancaba: el panel de estado quedaba con el primer valor para
    # siempre, aunque MIDI y audio si funcionaran (esos son 100% por evento,
    # no dependen de este bucle).
    run("op('/project1/control_script').module.safeStartup()", delayFrames=3)
    run("op('/project1/runtime_manager').module.tickDiag()", delayFrames=5)

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
    check('{} escenas completas'.format(config.N_SCENES), not bad, 'faltan en {}'.format(bad))

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
