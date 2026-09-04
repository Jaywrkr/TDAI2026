"""/project1/control_script  -  cerebro del rig en runtime.

Se carga como texto dentro de un Text DAT. Se accede como
    op('/project1/control_script').module.<funcion>()
"""

import json
import os

N_SCENES = 20


# ---------------------------------------------------------------
# BASICOS
# ---------------------------------------------------------------

def _p():
    return op('/project1')


def _scene(i):
    return op('/project1/scenes/scene{}'.format(int(i)))


def _valid(i):
    sc = _scene(i)
    return bool(sc and sc.op('out1') and sc.op('content/shader'))


def _config_dir():
    p = _p()
    root = ''
    try:
        root = p.par.Repopath.eval()
    except Exception:
        pass
    if not root:
        return ''
    d = os.path.join(root, 'config')
    try:
        if not os.path.isdir(d):
            os.makedirs(d)
    except Exception:
        return ''
    return d


# ---------------------------------------------------------------
# SELECCION DE ESCENA + TRANSICION
# ---------------------------------------------------------------
# El crossfade lo hace un Lag CHOP nativo. Python solo:
#   1. mete la escena entrante en el switch que ahora mismo NO se ve
#   2. invierte Xfadetarget
#   3. agenda UNA llamada para cerrar
# Cambiar de escena a mitad de fundido simplemente vuelve a invertir el
# destino: la rampa sigue desde donde va, sin saltos.

def visibleScenes():
    """Indices de escena que hay que mantener coocinando ahora mismo."""
    a, b = op('/project1/program_a'), op('/project1/program_b')
    out = set()
    for sw in (a, b):
        if sw:
            try:
                out.add(int(sw.par.index.eval()))
            except Exception:
                pass
    return out or {0}


def setSceneCooking(indices=None):
    p = _p()
    scenes = op('/project1/scenes')
    if not p or not scenes:
        return
    if indices is None:
        indices = visibleScenes()
    indices = set(int(x) for x in indices)

    try:
        perf = bool(p.par.Performancemode.eval())
    except Exception:
        perf = True
    try:
        preview = bool(p.par.Previewall.eval())
    except Exception:
        preview = False

    for i in range(N_SCENES):
        sc = scenes.op('scene{}'.format(i))
        if not sc:
            continue
        try:
            sc.allowCooking = (not perf) or preview or (i in indices)
        except Exception:
            pass


def updateHighlight():
    p = _p()
    dash = op('/project1/dashboard_ui')
    if not p or not dash:
        return
    try:
        active = int(p.par.Activeindex.eval())
        target = int(p.par.Targetindex.eval())
        moving = bool(p.fetch('transitioning', False))
    except Exception:
        return

    for i in range(N_SCENES):
        tile = dash.op('scene_btn{}'.format(i))
        if not tile:
            continue
        col = (0.16, 0.16, 0.18)
        if i == active:
            col = (0.15, 0.95, 0.40)
        if moving and i == target and target != active:
            col = (1.0, 0.72, 0.05)
        for name, v in zip(('bgcolorr', 'bgcolorg', 'bgcolorb'), col):
            par = getattr(tile.par, name, None)
            if par is not None:
                par.val = v


def selectScene(index):
    p = _p()
    if not p:
        return
    try:
        index = max(0, min(N_SCENES - 1, int(index)))
        if not _valid(index):
            print('SCENE {} INVALIDA - ignorada'.format(index))
            return

        active = int(p.par.Activeindex.eval())
        moving = bool(p.fetch('transitioning', False))
        if index == active and not moving:
            return

        # El lado entrante es aquel hacia el que NO vamos ahora mismo.
        target_val = float(p.par.Xfadetarget.eval())
        incoming = 'A' if target_val > 0.5 else 'B'
        sw = op('/project1/program_' + incoming.lower())
        if not sw:
            return
        sw.par.index = index

        p.par.Targetindex = index
        p.store('transitioning', True)
        token = int(p.fetch('transition_token', 0)) + 1
        p.store('transition_token', token)

        setSceneCooking({active, index})
        updateHighlight()

        if bool(p.par.Usepresets.eval()):
            recallPreset(index)

        prewarm = max(0, int(p.par.Prewarmframes.eval()))
        if prewarm <= 0:
            _startFade(token)
        else:
            run("op('/project1/control_script').module._startFade(args[0])",
                token, delayFrames=prewarm)
    except Exception as e:
        print('selectScene FAILSAFE:', e)
        abortTransition()


def _startFade(token):
    p = _p()
    if not p or int(p.fetch('transition_token', -1)) != int(token):
        return
    try:
        cur = float(p.par.Xfadetarget.eval())
        p.par.Xfadetarget = 0.0 if cur > 0.5 else 1.0

        fps = max(1.0, float(project.cookRate))
        secs = max(0.02, float(p.par.Transitionseconds.eval()))
        frames = max(2, int(round(secs * fps)) + 3)
        run("op('/project1/control_script').module._finishFade(args[0])",
            token, delayFrames=frames)
    except Exception as e:
        print('_startFade FAILSAFE:', e)
        abortTransition()


def _finishFade(token):
    p = _p()
    if not p or int(p.fetch('transition_token', -1)) != int(token):
        return
    try:
        target = int(p.par.Targetindex.eval())
        p.par.Activeindex = target
        p.store('transitioning', False)

        # Igualar el switch saliente al entrante: a partir de aqui solo hay
        # UNA escena coocinando.
        for name in ('program_a', 'program_b'):
            sw = op('/project1/' + name)
            if sw:
                sw.par.index = target

        setSceneCooking({target})
        updateHighlight()
        updateDetailLegend(target)
    except Exception as e:
        print('_finishFade FAILSAFE:', e)
        abortTransition()


def updateDetailLegend(index):
    """Refleja en el dashboard que hace cada perilla Detail EN esta escena.

    Evento infrecuente (solo al cambiar de escena), cero costo por frame.
    Si la escena no documento ningun @D1..@D6 en su .frag, se muestra un
    texto por defecto en vez de dejar la leyenda vieja pegada.
    """
    sc = _scene(index)
    dst = op('/project1/dashboard_ui/detail_legend_src')
    if not sc or not dst:
        return
    legend = ''
    par = getattr(sc.par, 'Detaillegend', None)
    if par is not None:
        legend = str(par.eval()).strip()
    dst.text = legend or '(esta escena no documento perillas Detail)'


def abortTransition():
    p = _p()
    if not p:
        return
    p.store('transition_token', int(p.fetch('transition_token', 0)) + 1)
    p.store('transitioning', False)
    try:
        active = int(p.par.Activeindex.eval())
        for name in ('program_a', 'program_b'):
            sw = op('/project1/' + name)
            if sw:
                sw.par.index = active
        setSceneCooking({active})
    except Exception:
        pass
    updateHighlight()


def nextScene():
    p = _p()
    if p:
        selectScene((int(p.par.Activeindex.eval()) + 1) % N_SCENES)


def prevScene():
    p = _p()
    if p:
        selectScene((int(p.par.Activeindex.eval()) - 1) % N_SCENES)


def toggleBlackout():
    p = _p()
    if p:
        p.par.Blackout = not bool(p.par.Blackout.eval())


def resetControls():
    p = _p()
    if not p:
        return
    p.par.Blackout = False
    p.par.Transitionseconds = 0.45
    for name, v in (('Speed', 0.5), ('Density', 0.5),
                    ('Hue', 0.0), ('Chaos', 0.3), ('Brightness', 1.0)):
        par = getattr(p.par, name, None)
        if par is not None:
            par.val = v
    abortTransition()


# ---------------------------------------------------------------
# SHADERS
# ---------------------------------------------------------------

def reloadShaders():
    """Recompone los .frag desde disco sin reconstruir la red."""
    p = _p()
    try:
        import vjcore
        vjcore.reload_shaders()
    except Exception as e:
        print('reloadShaders ERROR:', e)
        print('  Ejecuta primero RUN_ME desde el Text DAT para poner td/ en sys.path.')


# ---------------------------------------------------------------
# MIDI MAPPING (persistente)
# ---------------------------------------------------------------

MIDI_SLOTS = ['Speed', 'Density', 'Hue', 'Chaos', 'Brightness', 'Transition',
              'Audioamount', 'Bassamount', 'Midamount', 'Highamount',
              'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'Detail6',
              'Next', 'Prev', 'Blackout', 'Snapshot', 'Reset']


def _midi_path():
    d = _config_dir()
    return os.path.join(d, 'midi_map.json') if d else ''


def midiMap():
    """{'ch1cc112': 'Speed', ...} construido desde los parametros."""
    p = _p()
    out = {}
    if not p:
        return out
    for slot in MIDI_SLOTS:
        par = getattr(p.par, 'Midi' + slot.lower(), None)
        if par is None:
            continue
        name = str(par.eval()).strip()
        if name:
            out[name] = slot
    return out


def armLearn(slot):
    p = _p()
    if not p:
        return
    p.store('learn_slot', slot)
    print('MIDI LEARN armado para "{}": mueve el knob o pulsa el pad.'.format(slot))


def cancelLearn():
    p = _p()
    if p:
        p.store('learn_slot', '')


def applyLearn(chan_name):
    """Llamado desde midi_logic cuando hay un slot armado."""
    p = _p()
    if not p:
        return False
    slot = str(p.fetch('learn_slot', '') or '')
    if not slot:
        return False
    par = getattr(p.par, 'Midi' + slot.lower(), None)
    if par is None:
        return False
    par.val = chan_name
    p.store('learn_slot', '')
    print('MIDI LEARN: {} -> {}'.format(slot, chan_name))
    saveMidiMap()
    return True


def saveMidiMap():
    path = _midi_path()
    if not path:
        print('saveMidiMap: falta /project1.Repopath')
        return
    p = _p()
    data = {s: str(getattr(p.par, 'Midi' + s.lower()).eval())
            for s in MIDI_SLOTS if getattr(p.par, 'Midi' + s.lower(), None)}
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print('MIDI map guardado en', path)
    except Exception as e:
        print('saveMidiMap ERROR:', e)


def loadMidiMap():
    path = _midi_path()
    if not path or not os.path.isfile(path):
        return
    p = _p()
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for slot, val in data.items():
            par = getattr(p.par, 'Midi' + str(slot).lower(), None)
            if par is not None:
                par.val = str(val)
        print('MIDI map cargado desde', path)
    except Exception as e:
        print('loadMidiMap ERROR:', e)


# ---------------------------------------------------------------
# PRESETS POR ESCENA
# ---------------------------------------------------------------

PRESET_PARS = ['Speed', 'Density', 'Hue', 'Chaos',
               'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'Detail6']


def _presets_path():
    d = _config_dir()
    return os.path.join(d, 'presets.json') if d else ''


def _presets():
    p = _p()
    return p.fetch('presets', {}) if p else {}


def snapshotPreset(index=None):
    p = _p()
    if not p:
        return
    if index is None:
        index = int(p.par.Activeindex.eval())
    data = _presets()
    data[str(int(index))] = {n: float(getattr(p.par, n).eval())
                             for n in PRESET_PARS
                             if getattr(p.par, n, None) is not None}
    p.store('presets', data)
    savePresets()
    print('Preset guardado para escena', index)


def recallPreset(index):
    p = _p()
    if not p:
        return
    entry = _presets().get(str(int(index)))
    if not entry:
        return
    for n, v in entry.items():
        par = getattr(p.par, n, None)
        if par is not None:
            par.val = v


def savePresets():
    path = _presets_path()
    if not path:
        return
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(_presets(), f, indent=2)
    except Exception as e:
        print('savePresets ERROR:', e)


def loadPresets():
    path = _presets_path()
    if not path or not os.path.isfile(path):
        return
    try:
        with open(path, 'r', encoding='utf-8') as f:
            _p().store('presets', json.load(f))
        print('Presets cargados desde', path)
    except Exception as e:
        print('loadPresets ERROR:', e)


# ---------------------------------------------------------------
# ARRANQUE SEGURO
# ---------------------------------------------------------------

def safeStartup():
    p = _p()
    if not p:
        return
    try:
        p.store('transition_token', 0)
        p.store('transitioning', False)
        p.store('learn_slot', '')

        p.par.Activeindex = 0
        p.par.Targetindex = 0
        p.par.Xfadetarget = 0.0
        for name in ('program_a', 'program_b'):
            sw = op('/project1/' + name)
            if sw:
                sw.par.index = 0

        if bool(p.par.Safestartblackout.eval()):
            p.par.Blackout = True

        loadMidiMap()
        loadPresets()

        setSceneCooking({0})
        updateHighlight()
        updateDetailLegend(0)

        d = op('/project1/diagnostics')
        if d:
            d.module.update()
        print('SAFE START OK')
    except Exception as e:
        print('SAFE START ERROR:', e)
