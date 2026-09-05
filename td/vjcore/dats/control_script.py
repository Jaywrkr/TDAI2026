"""/project1/control_script  -  cerebro del rig en runtime.

Se carga como texto dentro de un Text DAT. Se accede como
    op('/project1/control_script').module.<funcion>()
"""

import json
import os


def _n_scenes():
    """Antes esto era una constante duplicada (N_SCENES = 20) que habia
    que recordar mantener sincronizada a mano con vjcore.config.N_SCENES
    -- se leyo directo de la fuente de verdad para que agregar escenas
    (config.py) nunca vuelva a desincronizar este script standalone."""
    try:
        import vjcore.config as _vjconfig
        return _vjconfig.N_SCENES
    except Exception:
        return 34


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

    for i in range(_n_scenes()):
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

    for i in range(_n_scenes()):
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
        index = max(0, min(_n_scenes() - 1, int(index)))
        if not _valid(index):
            print('SCENE {} INVALIDA - ignorada'.format(index))
            return

        active = int(p.par.Activeindex.eval())
        moving = bool(p.fetch('transitioning', False))
        if index == active and not moving:
            return

        # El lado entrante se calcula SIEMPRE a partir de 'active_side'
        # (que solo cambia en _finishFade, cuando una transicion de verdad
        # termina), nunca releyendo Xfadetarget aca. Xfadetarget es el
        # PARAMETRO que _startFade ya invierte apenas arranca la rampa --
        # si un segundo click llega mientras la primera transicion sigue
        # en curso (rampa a mitad de camino), Xfadetarget YA vale el
        # destino nuevo, y recalcular 'incoming' desde ahi da el lado
        # EQUIVOCADO (el que esta por desaparecer, no el que esta
        # apareciendo) -- eso pisaba el lado saliente a mitad de fundido y
        # el click de verdad no llevaba a ningun lado (el bug reportado de
        # "a veces el next/click no funciona"). Con 'active_side' fijo
        # durante toda la transicion, cualquier cantidad de clicks
        # seguidos siempre apunta al mismo lado entrante, y solo cambia
        # QUE escena va a aparecer ahi.
        active_side = str(p.fetch('active_side', 'A') or 'A')
        incoming = 'B' if active_side == 'A' else 'A'
        p.store('incoming_side', incoming)

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

        # Se agenda un _startFade nuevo SIEMPRE, incluso si ya habia una
        # transicion en curso -- eso invalida (por token) el _startFade/
        # _finishFade pendientes del click anterior y hace que el fundito
        # se reinicie apuntando al destino mas reciente, en vez de quedar
        # con dos ciclos de fade compitiendo o -peor- ninguno terminando
        # nunca (_finishFade viejo abortando por token viejo sin que haya
        # uno nuevo agendado que reemplace lo que hacia).
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
        # Xfadetarget se fija a partir de 'incoming_side' (guardado por
        # selectScene), no invirtiendo ciegamente el valor actual -- asi
        # coincide siempre con el lado que de verdad tiene la escena
        # nueva cargada, sin importar cuantos clicks se acumularon antes
        # de que esta func corriera.
        incoming = str(p.fetch('incoming_side', 'B') or 'B')
        p.par.Xfadetarget = 1.0 if incoming == 'B' else 0.0

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
        p.store('active_side', str(p.fetch('incoming_side', 'B') or 'B'))
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


def _navBase(p):
    """Desde que indice contar el +1/-1 de Next/Prev.

    Si ya hay una transicion en curso, contar desde Activeindex (que
    todavia NO se actualizo, se actualiza recien en _finishFade) hace
    que pulsar Next dos veces seguidas rapido calcule el MISMO destino
    las dos veces -- se ve como si el boton no respondiera al segundo
    toque. Contando desde Targetindex mientras se esta moviendo, cada
    pulsada avanza una escena mas alla de la ultima que se pidio.
    """
    moving = bool(p.fetch('transitioning', False))
    return int(p.par.Targetindex.eval()) if moving else int(p.par.Activeindex.eval())


def nextScene():
    p = _p()
    if p:
        selectScene((_navBase(p) + 1) % _n_scenes())


def prevScene():
    p = _p()
    if p:
        selectScene((_navBase(p) - 1) % _n_scenes())


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

def _mediaScenePath(scene_index):
    return '/project1/scenes/scene{}'.format(scene_index)


_MEDIA_EXTS = ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff',
              '.mov', '.mp4', '.webp')


def _scanMediaFolder(scene_index):
    """Lista ordenada de archivos de imagen/video en Mediafolder. Vacia si
    la carpeta no esta seteada, no existe, o no tiene archivos validos --
    nunca tira excepcion (esto se llama desde una expresion de parametro,
    que no puede fallar sin romper el TOP)."""
    sc = op(_mediaScenePath(scene_index))
    if not sc:
        return []
    folder = str(sc.par.Mediafolder.eval() or '').strip()
    if not folder or not os.path.isdir(folder):
        return []
    try:
        names = sorted(f for f in os.listdir(folder)
                       if f.lower().endswith(_MEDIA_EXTS))
    except Exception as e:
        print('scanMediaFolder ERROR:', e)
        return []
    return [os.path.join(folder, n) for n in names]


def currentMediaPath(scene_index):
    """Llamada por la expresion 'file' del Movie File In TOP de esta
    escena (ver scenes.py). Vacio = TOP sin archivo = sale negro, no
    error -- el .frag esta pensado para eso."""
    files = _scanMediaFolder(scene_index)
    if not files:
        return ''
    sc = op(_mediaScenePath(scene_index))
    idx = int(sc.par.Mediaindex.eval()) % len(files) if sc else 0
    return files[idx]


def advanceMediaIndex(scene_index):
    """Avanza a la siguiente imagen/video de la carpeta (con loop). La
    llaman dos cosas de forma independiente: el ciclo automatico por
    tiempo (_mediaTick) y cada golpe de bombo (dats/media_logic.py) --
    asi el avance se siente reactivo a la musica sin depender solo de
    ella (sin audio, el ciclo por tiempo lo sigue moviendo igual)."""
    sc = op(_mediaScenePath(scene_index))
    if not sc:
        return
    files = _scanMediaFolder(scene_index)
    if not files:
        return
    cur = int(sc.par.Mediaindex.eval())
    sc.par.Mediaindex.val = (cur + 1) % len(files)


def _mediaTick(scene_index):
    advanceMediaIndex(scene_index)
    _scheduleMediaAdvance(scene_index)


def _scheduleMediaAdvance(scene_index):
    """Se reagenda solo, como tickDiag() en runtime_manager.py. El
    intervalo lo controla Speed -- perilla alta = ciclo mas rapido, sin
    necesitar ninguna perilla nueva (pedido explicito del usuario: 'ya no
    tengo perillas libres')."""
    p = _p()
    if not p:
        return
    try:
        speed = max(0.0, min(1.0, float(p.par.Speed.eval())))
    except Exception:
        speed = 0.5
    seconds = 8.0 - speed * 6.5   # Speed=0 -> 8s, Speed=1 -> 1.5s
    run("op('/project1/control_script').module._mediaTick({})".format(scene_index),
        delayMilliSeconds=int(seconds * 1000))


def startMediaCycles():
    """Arranca el auto-avance para cada escena de config.MEDIA_SCENES.
    Se llama una vez desde safeStartup(). Import absoluto (no relativo):
    este script corre como Text DAT independiente, no como parte del
    paquete vjcore -- mismo patron que 'import vjcore' en builder.py."""
    try:
        import vjcore.config as _vjconfig
        media_scenes = _vjconfig.MEDIA_SCENES
    except Exception as e:
        print('startMediaCycles: no se pudo leer MEDIA_SCENES:', e)
        return
    for idx in media_scenes:
        _scheduleMediaAdvance(idx)


# ---------------------------------------------------------------
# AUTOPILOT (avance de escena hands-free)
# ---------------------------------------------------------------

def _autopilotTick():
    p = _p()
    if p:
        try:
            if bool(p.par.Autopilot.eval()):
                nextScene()
        except Exception as e:
            print('_autopilotTick ERROR:', e)
    _scheduleAutopilot()


def _scheduleAutopilot():
    """Se reagenda solo, siempre, este prendido o no el toggle Autopilot
    -- revisa el toggle en cada tick (_autopilotTick) y solo avanza si
    esta prendido. Asi prender/apagar el toggle no tiene que arrancar ni
    parar ningun loop, igual que Previewall con setSceneCooking."""
    p = _p()
    if not p:
        return
    try:
        secs = max(1.0, float(p.par.Autopilotseconds.eval()))
    except Exception:
        secs = 20.0
    run("op('/project1/control_script').module._autopilotTick()",
        delayMilliSeconds=int(secs * 1000))


def startAutopilot():
    _scheduleAutopilot()


def safeStartup():
    p = _p()
    if not p:
        return
    try:
        p.store('transition_token', 0)
        p.store('transitioning', False)
        p.store('learn_slot', '')
        p.store('active_side', 'A')
        p.store('incoming_side', 'B')

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
        startMediaCycles()
        startAutopilot()

        d = op('/project1/diagnostics')
        if d:
            d.module.update()
        print('SAFE START OK')
    except Exception as e:
        print('SAFE START ERROR:', e)
