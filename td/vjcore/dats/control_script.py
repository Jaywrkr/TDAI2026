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


def _dual():
    """True si el modo DOS CAPAS esta activo."""
    p = _p()
    try:
        return bool(p.par.Duallayer.eval()) if p else False
    except Exception:
        return False


def _layerSwitch(layer=None):
    """El Switch TOP de la capa indicada (None = la que se esta editando).

    En modo dos capas program_a/program_b dejan de ser "el lado que se ve"
    y "el lado que entra" (mecanismo de transicion) para pasar a ser dos
    CAPAS vivas al mismo tiempo -- ver program.py.
    """
    p = _p()
    if layer is None:
        try:
            layer = int(p.par.Activelayer.eval()) if p else 0
        except Exception:
            layer = 0
    return op('/project1/program_' + ('b' if int(layer) else 'a'))


def _layerScene(layer):
    sw = _layerSwitch(layer)
    try:
        return int(sw.par.index.eval()) if sw else 0
    except Exception:
        return 0


def setSceneCooking(indices=None):
    p = _p()
    scenes = op('/project1/scenes')
    if not p or not scenes:
        return
    if indices is None:
        indices = visibleScenes()
    indices = set(int(x) for x in indices)

    # La escena en PREVIEW tambien tiene que cocinar: si no, el monitor
    # de cue mostraria el ultimo frame congelado (o negro si nunca se
    # visito) y no serviria para lo unico que existe -- ver como se ve
    # ANTES de tirarla. Es UNA escena de mas, no las 34 de Previewall.
    try:
        indices.add(int(p.par.Previewindex.eval()))
    except Exception:
        pass

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


# ---------------------------------------------------------------
# PREVIEW (cue) + TAKE
# ---------------------------------------------------------------
# Flujo de mesa real: cargas la escena en el preview, la MIRAS, y recien
# entonces la tiras al aire. Cuesta UNA escena cocinando de mas (la del
# preview), no las 34 que cocinaba Previewall.

def previewScene(index):
    """Carga una escena en el bus de preview (no toca el programa)."""
    p = _p()
    if not p:
        return
    try:
        index = max(0, min(_n_scenes() - 1, int(index)))
        if not _valid(index):
            print('SCENE {} INVALIDA - ignorada'.format(index))
            return
        p.par.Previewindex = index
        setSceneCooking()
        updateHighlight()
    except Exception as e:
        print('previewScene ERROR:', e)


def takePreview():
    """TAKE: manda al programa lo que esta en preview.

    Usa selectScene(), o sea que respeta TODO lo de siempre: el fundido
    nativo, el modo dos capas (entra en la capa que se este editando) y
    el recall de preset de esa escena.
    """
    p = _p()
    if not p:
        return
    try:
        # La bandera evita el bucle obvio: selectScene, con Cue ON,
        # reenvia todo al preview -- incluido este TAKE, que quedaria sin
        # hacer nada. Se limpia en finally para que un fallo a mitad no
        # deje el modo cue mudo para siempre.
        p.store('taking', True)
        try:
            selectScene(int(p.par.Previewindex.eval()))
        finally:
            p.store('taking', False)
    except Exception as e:
        print('takePreview ERROR:', e)


def cueNext():
    p = _p()
    if p:
        previewScene((int(p.par.Previewindex.eval()) + 1) % _n_scenes())


def cuePrev():
    p = _p()
    if p:
        previewScene((int(p.par.Previewindex.eval()) - 1) % _n_scenes())


def toggleCue():
    p = _p()
    if not p:
        return
    try:
        on = not bool(p.par.Cuemode.eval())
        p.par.Cuemode = on
        # Al ENTRAR en modo cue el preview arranca donde esta el programa:
        # si arrancara en la escena 0 sin avisar, el primer TAKE tiraria
        # una escena que el VJ no eligio.
        if on:
            p.par.Previewindex = int(p.par.Activeindex.eval())
        setSceneCooking()
        updateHighlight()
    except Exception as e:
        print('toggleCue ERROR:', e)


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

    # En modo dos capas las DOS escenas estan vivas a la vez, asi que las
    # dos se marcan -- verde la capa A, cian la B. Sin esto no habria
    # forma de saber de un vistazo que se esta mezclando con que.
    dual = _dual()
    scene_a = _layerScene(0)
    scene_b = _layerScene(1)
    try:
        editing = int(p.par.Activelayer.eval())
    except Exception:
        editing = 0

    for i in range(_n_scenes()):
        tile = dash.op('scene_btn{}'.format(i))
        if not tile:
            continue
        col = (0.16, 0.16, 0.18)
        if dual:
            # La capa que se esta editando va mas brillante que la otra:
            # el proximo click cae ahi, tiene que verse cual es.
            if i == scene_a:
                col = (0.15, 0.95, 0.40) if editing == 0 else (0.08, 0.45, 0.22)
            if i == scene_b:
                col = (0.20, 0.85, 1.00) if editing == 1 else (0.10, 0.38, 0.50)
        else:
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

        # MODO CUE: el click en la grilla carga el PREVIEW, no el aire.
        # Se chequea aca (y no en el handler del click) para que valga
        # tambien para el MIDI y para cualquier otra ruta que termine
        # llamando a selectScene -- una sola puerta, no varias.
        # takePreview() no pasa por aca dos veces: llama al camino normal
        # porque para entonces Cuemode ya cumplio su funcion.
        if bool(p.par.Cuemode.eval()) and not bool(p.fetch('taking', False)):
            previewScene(index)
            return

        # MODO DOS CAPAS: no hay transicion que hacer -- la escena entra
        # DIRECTO en la capa que se esta editando (Activelayer) y la otra
        # capa se queda donde estaba. El fundido cruzado no aplica aca:
        # lo que decide como se ven las dos juntas es Layermix/Blendmode
        # (shader de mezcla, ver program.py), no una rampa temporal.
        if _dual():
            sw = _layerSwitch()
            if not sw:
                return
            sw.par.index = index
            p.par.Activeindex = index
            p.par.Targetindex = index
            setSceneCooking()
            updateHighlight()
            updateDetailLegend(index)
            if bool(p.par.Usepresets.eval()):
                recallPreset(index)
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
    # En modo dos capas no hay transicion en curso ni "lado que entra":
    # Next/Prev tienen que contar desde la escena que tiene AHORA la capa
    # que se esta editando, no desde Activeindex (que refleja la ultima
    # cargada en cualquiera de las dos).
    if _dual():
        return _layerScene(None)
    moving = bool(p.fetch('transitioning', False))
    return int(p.par.Targetindex.eval()) if moving else int(p.par.Activeindex.eval())


def _step(delta):
    """Un paso de navegacion, respetando el setlist si esta activo.

    Con setlist, Next/Prev recorren el ORDEN del setlist, no el orden
    numerico de las escenas. Si la escena actual no esta en el setlist
    (por ejemplo porque se la eligio a mano desde la grilla), el paso
    entra por el principio en vez de quedarse trabado.
    """
    base = _navBase(_p())
    if not _usingSetlist():
        return (base + delta) % _n_scenes()
    sl = _setlist()
    try:
        pos = sl.index(base)
    except ValueError:
        return sl[0] if delta > 0 else sl[-1]
    return sl[(pos + delta) % len(sl)]


def nextScene():
    if _p():
        selectScene(_step(1))


def prevScene():
    if _p():
        selectScene(_step(-1))


# ---------------------------------------------------------------
# BANCOS + SETLIST
# ---------------------------------------------------------------
# Con 34 escenas, ir de la 3 a la 28 con Next son 25 pulsaciones. Los
# bancos parten la grilla en bloques del tamano que elijas; el setlist
# define un ORDEN propio para una noche concreta, sin renumerar nada.

def _setlist():
    """Indices del setlist, validados. Vacio = no hay setlist.

    Acepta comas, espacios o las dos cosas ("0, 4 17,23") porque es un
    campo que se tipea a mano y a las apuradas. Descarta lo que no sea
    una escena valida en vez de fallar: un setlist con un numero mal
    tipeado tiene que seguir sirviendo para el resto de la noche.
    """
    p = _p()
    if not p:
        return []
    try:
        raw = str(p.par.Setlist.eval() or '')
    except Exception:
        return []
    out = []
    for tok in raw.replace(',', ' ').split():
        try:
            i = int(tok)
        except ValueError:
            continue
        if 0 <= i < _n_scenes() and _valid(i):
            out.append(i)
    return out


def _usingSetlist():
    p = _p()
    try:
        return bool(p.par.Usesetlist.eval()) and bool(_setlist()) if p else False
    except Exception:
        return False


def selectInBank(slot):
    """Escena numero 'slot' DENTRO del banco actual (slot empieza en 0).

    Pensado para mapear a pads: el mismo pad siempre cae en la misma
    posicion del banco, y cambiar de banco cambia las 8 escenas que
    tenes bajo los dedos.
    """
    p = _p()
    if not p:
        return
    try:
        size = max(1, int(p.par.Banksize.eval()))
        bank = int(p.par.Bank.eval())
        selectScene(bank * size + int(slot))
    except Exception as e:
        print('selectInBank ERROR:', e)


def _bankCount():
    p = _p()
    try:
        size = max(1, int(p.par.Banksize.eval()))
    except Exception:
        size = 8
    return max(1, (_n_scenes() + size - 1) // size)


def nextBank():
    p = _p()
    if p:
        try:
            p.par.Bank = (int(p.par.Bank.eval()) + 1) % _bankCount()
            updateHighlight()
        except Exception as e:
            print('nextBank ERROR:', e)


def prevBank():
    p = _p()
    if p:
        try:
            p.par.Bank = (int(p.par.Bank.eval()) - 1) % _bankCount()
            updateHighlight()
        except Exception as e:
            print('prevBank ERROR:', e)


# ---------------------------------------------------------------
# LEDs DE LOS PADS  (SIN VERIFICAR CONTRA LA UNIDAD REAL)
# ---------------------------------------------------------------
# Encender el pad del efecto que esta activo hace que el controlador se
# sienta un instrumento y no un teclado generico enchufado.
#
# LO QUE FALTA CONFIRMAR: el MiniLab mkII setea el color de sus pads por
# SysEx propietario de Arturia (algo de la forma
# F0 00 20 6B 7F 42 02 00 10 <pad> <color> F7), y esos bytes NO se
# pudieron verificar contra la unidad. Lo de aca abajo manda un note-on
# al pad, que es el metodo que funciona en varios controladores y es
# inofensivo si este no lo entiende (simplemente no pasa nada).
#
# Por eso Padleds arranca en OFF: mientras nadie lo prenda, este codigo
# no manda un solo byte. Si al probarlo los pads no responden, hay que
# cambiar SOLO sendPadLed() por la version SysEx -- ninguna otra parte
# del rig depende de esto.

def sendPadLed(slot_index, on):
    """Prende/apaga el LED del pad numero 'slot_index' (0-based)."""
    p = _p()
    mo = op('/project1/midi_out')
    if not p or not mo:
        return
    try:
        if not bool(p.par.Padleds.eval()):
            return
        chan = int(p.par.Padledchannel.eval())
        note = int(p.par.Padlednote.eval()) + int(slot_index)
        # sendNote(canal, nota, velocidad). Velocidad 0 = apagado en la
        # mayoria de los controladores con pads iluminados.
        mo.sendNote(chan, note, 127 if on else 0)
    except Exception as e:
        print('sendPadLed ERROR:', e)


def refreshPadLeds():
    """Refleja en los pads que efectos estan activos ahora mismo.

    El orden es el de los 8 efectos en config.DEFAULT_MIDI (pads 9-16 del
    banco B), que es el orden en que estan fisicamente en el controlador.
    """
    p = _p()
    if not p:
        return
    try:
        if not bool(p.par.Padleds.eval()):
            return
        for i, name in enumerate(('Grain', 'Glitch', 'Pixelate', 'Strobe',
                                  'Invert', 'Mirror', 'Zoom', 'Posterize')):
            par = getattr(p.par, name, None)
            sendPadLed(i, par is not None and float(par.eval()) > 0.005)
    except Exception as e:
        print('refreshPadLeds ERROR:', e)


# ---------------------------------------------------------------
# MACRO ENERGIA
# ---------------------------------------------------------------

def applyEnergy():
    """Una perilla que arma el build-up entero.

    Escribe las perillas de una sola vez en vez de multiplicarlas por
    detras: asi mover una perilla despues del macro simplemente la pisa
    (gana lo ultimo que tocaste), sin estados ocultos ni valores "base"
    invisibles que despues no coinciden con lo que muestra el panel.

    NO toca Brightness: el master fade es la seguridad de la salida, no
    un parametro artistico -- un macro no deberia poder apagar el show.
    """
    p = _p()
    if not p:
        return
    try:
        if not bool(p.par.Energyactive.eval()):
            return
        e = max(0.0, min(1.0, float(p.par.Energy.eval())))
        for name, lo, hi in (('Speed', 0.25, 0.90),
                             ('Density', 0.35, 0.80),
                             ('Chaos', 0.08, 0.92),
                             ('Trails', 0.00, 0.55)):
            par = getattr(p.par, name, None)
            if par is not None:
                par.val = lo + (hi - lo) * e
    except Exception as e:
        print('applyEnergy ERROR:', e)


def toggleBlackout():
    p = _p()
    if p:
        p.par.Blackout = not bool(p.par.Blackout.eval())


# ---------------------------------------------------------------
# MASTER FX (estela + dos capas)
# ---------------------------------------------------------------
# Estas 4 funciones existen para poder manejar Master FX EN VIVO desde un
# pad (van en midi_logic.TRIGGERS, aprendibles con Learn) y desde los
# botones del dashboard -- un efecto al que solo se llega con el mouse en
# la ventana de parametros no sirve arriba del escenario.

def toggleTrails():
    """Prende/apaga la estela SIN perder la cantidad que tenias puesta.

    Guarda el valor antes de apagar y lo devuelve al prender: en vivo no
    sirve un toggle que te deje la perilla en 0 y te obligue a buscar de
    nuevo el punto que te gustaba.
    """
    p = _p()
    if not p:
        return
    try:
        cur = float(p.par.Trails.eval())
        if cur > 0.005:
            p.store('trails_last', cur)
            p.par.Trails = 0.0
        else:
            p.par.Trails = float(p.fetch('trails_last', 0.6) or 0.6)
    except Exception as e:
        print('toggleTrails ERROR:', e)


def toggleDual():
    """Entra/sale del modo dos capas dejando un estado usable.

    Al ENTRAR: si las dos capas tienen la misma escena (el caso normal,
    porque _finishFade las deja iguales) no se veria ninguna mezcla y
    parecerian rotas -- se siembra la capa B con la escena siguiente y se
    pasa a editar B, asi el primer click ya cambia lo que se ve mezclado.
    Al SALIR: las dos capas vuelven a la escena activa, que es el estado
    que el bus de transiciones espera encontrar.
    """
    p = _p()
    if not p:
        return
    try:
        going_dual = not bool(p.par.Duallayer.eval())
        # Una transicion a medio camino dejaria los dos switches en
        # escenas distintas con una rampa corriendo por encima: se corta
        # antes de cambiar de modo, en los dos sentidos.
        abortTransition()

        if going_dual:
            a = _layerScene(0)
            b = _layerScene(1)
            if a == b:
                nxt = (a + 1) % _n_scenes()
                sw_b = _layerSwitch(1)
                if sw_b:
                    sw_b.par.index = nxt
            p.par.Duallayer = True
            p.par.Activelayer = 1
        else:
            p.par.Duallayer = False
            p.par.Activelayer = 0
            active = int(p.par.Activeindex.eval())
            for name in ('program_a', 'program_b'):
                sw = op('/project1/' + name)
                if sw:
                    sw.par.index = active
        setSceneCooking()
        updateHighlight()
    except Exception as e:
        print('toggleDual ERROR:', e)


def swapLayer():
    """Cambia que capa recibe el proximo cambio de escena (A <-> B)."""
    p = _p()
    if not p:
        return
    try:
        p.par.Activelayer = 0 if int(p.par.Activelayer.eval()) else 1
        p.par.Activeindex = _layerScene(None)
        updateHighlight()
        updateDetailLegend(int(p.par.Activeindex.eval()))
    except Exception as e:
        print('swapLayer ERROR:', e)


# ---------------------------------------------------------------
# FAILSAFE DE VIVO + PANICO
# ---------------------------------------------------------------
# Un rig que se cae a mitad del set es peor que uno sin efectos. Esto
# degrada SOLO, en pasos, empezando por lo mas caro y menos esencial --
# y nunca toca la salida de show (Brightness/Blackout): apagar la imagen
# para "salvar" el FPS seria exactamente el fracaso que se quiere evitar.
#
# NO se deshace solo. Volver a subir la calidad apenas el FPS se
# recupera es como se entra en un ciclo de subir/bajar cada pocos
# segundos, que en pantalla se ve peor que quedarse degradado. Se
# recupera a mano con Failsafereset, cuando el VJ decide.

_FAILSAFE_STEPS = [
    ('estela apagada', 'Trails', 0.0),
    ('dos capas apagadas', 'Duallayer', False),
]


def failsafeStep():
    """Baja UN escalon de calidad. La llama diagnostics.py cuando el FPS
    lleva Failsafeseconds seguidos por debajo de Fpswarning."""
    p = _p()
    if not p:
        return
    try:
        level = int(p.par.Failsafelevel.eval())
        if level >= 3:
            return                       # ya no queda nada que soltar
        if level < len(_FAILSAFE_STEPS):
            label, par_name, val = _FAILSAFE_STEPS[level]
            par = getattr(p.par, par_name, None)
            if par is not None:
                par.val = val
        else:
            # Ultimo escalon: bajar la resolucion de salida a 70%. Es lo
            # mas efectivo y lo mas visible, por eso va ultimo.
            label = 'resolucion al 70%'
            w = int(p.par.Outputwidth.eval())
            h = int(p.par.Outputheight.eval())
            p.store('failsafe_res', (w, h))
            p.par.Outputwidth = max(320, int(w * 0.7))
            p.par.Outputheight = max(240, int(h * 0.7))
        p.par.Failsafelevel = level + 1
        print('FAILSAFE nivel {}: {}'.format(level + 1, label))
    except Exception as e:
        print('failsafeStep ERROR:', e)


def failsafeReset():
    """Vuelve la resolucion y el contador a como estaban. No vuelve a
    prender estela ni dos capas a proposito: eso es una decision
    artistica, no algo que un boton de recuperacion deba adivinar."""
    p = _p()
    if not p:
        return
    try:
        res = p.fetch('failsafe_res', None)
        if res:
            p.par.Outputwidth = int(res[0])
            p.par.Outputheight = int(res[1])
            p.store('failsafe_res', None)
        p.par.Failsafelevel = 0
        p.store('failsafe_low_since', 0.0)
        print('FAILSAFE reseteado')
    except Exception as e:
        print('failsafeReset ERROR:', e)


def panic():
    """Todo a un estado seguro y conocido, de una. Para cuando algo se
    fue de las manos y no hay tiempo de pensar que fue."""
    p = _p()
    if not p:
        return
    try:
        p.par.Blackout = True
        for name in ('Grain', 'Glitch', 'Pixelate', 'Strobe', 'Invert',
                     'Mirror', 'Zoom', 'Posterize', 'Trails',
                     'Lookamount', 'Palettelock'):
            par = getattr(p.par, name, None)
            if par is not None:
                par.val = 0.0
        if _dual():
            toggleDual()
        p.par.Autopilot = False
        abortTransition()
        selectScene(0)
        print('>> PANICO: blackout, escena 0, efectos a cero')
    except Exception as e:
        print('panic ERROR:', e)


# ---------------------------------------------------------------
# GRABACION
# ---------------------------------------------------------------

def toggleRecord():
    """Empieza/para la grabacion, poniendo un nombre de archivo con fecha
    y hora ANTES de arrancar.

    El nombre se calcula aca y no con una expresion en el parametro a
    proposito: una expresion se reevalua sola y podria cambiar el archivo
    de destino a mitad de grabacion.
    """
    p = _p()
    rec = op('/project1/recorder')
    if not p:
        return
    if not rec:
        print('toggleRecord: no hay grabador (ver log del build: el '
              'Movie File Out TOP no estaba disponible)')
        return
    try:
        if bool(p.par.Record.eval()):
            p.par.Record = False
            print('GRABACION detenida')
            return

        import datetime
        folder = str(p.par.Recordfolder.eval() or '').strip()
        if not folder:
            folder = _config_dir() or ''
        if folder and not os.path.isdir(folder):
            try:
                os.makedirs(folder)
            except Exception:
                folder = ''
        name = 'tdai2026_{}.mov'.format(
            datetime.datetime.now().strftime('%Y%m%d_%H%M%S'))
        path = os.path.join(folder, name) if folder else name
        par = getattr(rec.par, 'file', None)
        if par is not None:
            par.val = path
        p.par.Record = True
        print('GRABANDO en', path)
    except Exception as e:
        print('toggleRecord ERROR:', e)


def nextBlendMode():
    """Cicla el modo de mezcla. Los nombres viven en config.BLEND_MODES."""
    p = _p()
    if not p:
        return
    try:
        import vjcore.config as _vjconfig
        n = len(_vjconfig.BLEND_MODES)
    except Exception:
        n = 6
    try:
        p.par.Blendmode = (int(p.par.Blendmode.eval()) + 1) % n
    except Exception as e:
        print('nextBlendMode ERROR:', e)


# Todo a CERO. No es "volver a los valores de fabrica": es dejar el rig
# en silencio total para CONSTRUIR desde abajo -- subis brillo, despues
# audio, despues las perillas, y armas el tema desde la nada. Pedido
# explicito del usuario ("todos los valores a minimo, incluido el master
# de escuchar, los bajos, los medios, los altos, brillo, todo").
#
# OJO: Brightness tambien va a 0, o sea que despues de un Reset LA
# SALIDA QUEDA EN NEGRO hasta que subas el master. Es a proposito y es
# lo que se pidio -- pero es la razon por la que este boton NO sirve como
# "sacame del apuro" a mitad de un tema. Para eso esta PANICO, que deja
# la imagen viva.
_RESET_TO_ZERO = [
    # Perillas de look
    'Speed', 'Density', 'Hue', 'Chaos',
    # Master de salida
    'Brightness',
    # Audio: master + las tres bandas
    'Audioamount', 'Bassamount', 'Midamount', 'Highamount',
    # Detail 1-6
    'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'Detail6',
    # Efectos de pad
    'Grain', 'Glitch', 'Pixelate', 'Strobe', 'Invert',
    'Mirror', 'Zoom', 'Posterize',
    # Master FX + look del show
    'Trails', 'Layermix', 'Lookamount', 'Palettelock',
    'Energy',
]

# Estas no van a 0 sino a su punto NEUTRO: son perillas centradas, donde
# 0 no es "apagado" sino "al maximo hacia un lado" (zoom de estela hacia
# afuera, giro antihorario). Con Trails ya en 0 el efecto esta apagado
# igual, asi que dejarlas en el centro es lo unico que tiene sentido.
_RESET_TO_NEUTRAL = [
    ('Trailszoom', 0.5),
    ('Trailsrotate', 0.5),
]


def resetControls():
    """Todo a cero, SIN cambiar de escena.

    El visual activo se mantiene: esto apaga los controles, no el show.
    """
    p = _p()
    if not p:
        return
    for name in _RESET_TO_ZERO:
        par = getattr(p.par, name, None)
        if par is not None:
            try:
                par.val = 0.0
            except Exception:
                pass
    for name, v in _RESET_TO_NEUTRAL:
        par = getattr(p.par, name, None)
        if par is not None:
            try:
                par.val = v
            except Exception:
                pass

    # Modos apagados: un reset tiene que dejar un estado PREDECIBLE, y
    # un modo prendido que no se ve (porque todo esta en 0) es la peor
    # forma de descubrir que estaba prendido.
    for name in ('Blackout', 'Autopilot', 'Energyactive'):
        par = getattr(p.par, name, None)
        if par is not None:
            try:
                par.val = False
            except Exception:
                pass

    # Salir de dos capas por el mismo camino que el toggle (colapsa las
    # dos ramas a la escena activa), no bajando el flag a mano: si no,
    # el bus quedaria en modo transicion con A y B en escenas distintas.
    if _dual():
        toggleDual()

    # abortTransition corta un fundido a medio camino pero deja la escena
    # ACTIVA donde esta -- que es justo lo pedido: "manteniendo el visual
    # en el que esta".
    abortTransition()
    print('RESET: todo a cero (incluido Brightness -- subilo para ver imagen)')


# ---------------------------------------------------------------
# POSTER FRAMES (hornear miniaturas)
# ---------------------------------------------------------------
# Guarda en disco una imagen de cada escena para que la grilla del
# dashboard se vea COMPLETA sin tener que cocinar las 34 (que es lo que
# hundio el FPS a 9 cuando se intento con Previewall).
#
# Va de a UNA escena por tanda, encadenada con run(delayFrames=...), y no
# en un for: hay que prender el cooking de la escena, DEJARLA COCINAR
# unos frames y recien ahi guardar. En un for todo eso pasaria dentro del
# mismo frame y se guardarian 34 imagenes negras.

def bakeThumbs(index=0):
    """Arranca (o continua) el horneado. El boton llama a bakeThumbs()."""
    p = _p()
    if not p:
        return
    index = int(index)
    if index == 0:
        print('HORNEANDO MINIATURAS: esto tarda unos segundos, no toques nada')
    if index >= _n_scenes():
        # Se restaura el cooking normal y se recarga lo horneado.
        setSceneCooking()
        print('MINIATURAS LISTAS ({} escenas)'.format(_n_scenes()))
        return

    sc = _scene(index)
    if not sc or not _valid(index):
        run("op('/project1/control_script').module.bakeThumbs({})".format(index + 1),
            delayFrames=1)
        return
    try:
        sc.allowCooking = True
    except Exception:
        pass
    # 4 frames: uno no alcanza -- la escena tiene que cocinar y ademas
    # propagarse por el bridge hasta el Resolution TOP 'thumb'.
    run("op('/project1/control_script').module._bakeThumbSave({})".format(index),
        delayFrames=4)


def _bakeThumbSave(index):
    p = _p()
    if not p:
        return
    try:
        import vjcore.config as _vjconfig
        import vjcore.shader as _vjshader
        folder = os.path.join(_vjshader.repo_root(), _vjconfig.THUMBS_DIRNAME)
        if not os.path.isdir(folder):
            os.makedirs(folder)
        path = os.path.join(folder, 'scene{:02d}.png'.format(int(index)))

        thumb = op('/project1/scenes/scene{}/thumb'.format(int(index)))
        if thumb:
            thumb.save(path)
            # Se apunta el Movie File In del casillero al archivo recien
            # guardado: asi la grilla se actualiza SOLA al terminar, sin
            # tener que reconstruir todo el proyecto.
            poster = op('/project1/dashboard_ui/poster{}'.format(int(index)))
            if poster:
                par = getattr(poster.par, 'file', None)
                if par is not None:
                    par.val = path
                for reload_name in ('reloadpulse', 'reload'):
                    rp = getattr(poster.par, reload_name, None)
                    if rp is not None:
                        try:
                            rp.pulse()
                        except Exception:
                            pass
                        break
    except Exception as e:
        print('_bakeThumbSave ERROR (escena {}): {}'.format(index, e))

    run("op('/project1/control_script').module.bakeThumbs({})".format(int(index) + 1),
        delayFrames=1)


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

def _midi_slots():
    """Antes esto era una lista duplicada a mano (igual que N_SCENES) que
    habia que mantener sincronizada con vjcore.config.MIDI_SLOTS -- se lee
    directo de la fuente de verdad para que agregar un slot (como Grain/
    Glitch/Pixelate/Strobe/Invert al moverlos del piano a pads) nunca
    vuelva a desincronizar este script standalone."""
    try:
        import vjcore.config as _vjconfig
        return _vjconfig.MIDI_SLOTS
    except Exception:
        return ['Speed', 'Density', 'Hue', 'Chaos', 'Brightness', 'Transition',
                'Audioamount', 'Bassamount', 'Midamount', 'Highamount',
                'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'Detail6',
                'Next', 'Prev', 'Blackout', 'Snapshot', 'Reset',
                'Grain', 'Glitch', 'Pixelate', 'Strobe', 'Invert',
                'Mirror', 'Zoom', 'Posterize']


def _midi_path():
    d = _config_dir()
    return os.path.join(d, 'midi_map.json') if d else ''


def midiMap():
    """{'ch1cc112': 'Speed', ...} construido desde los parametros."""
    p = _p()
    out = {}
    if not p:
        return out
    for slot in _midi_slots():
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
        p.store('learn_piano_bound', '')


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
            for s in _midi_slots() if getattr(p.par, 'Midi' + s.lower(), None)}
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
# LEARN DE RANGO DEL PIANO (2 toques: tecla mas grave + mas aguda)
# ---------------------------------------------------------------
# A diferencia de un knob o un pad (un valor MIDI unico), las 25 teclas
# son un RANGO continuo -- no hay "el" slot a aprender, hay que aprender
# los DOS EXTREMOS. Con eso alcanza para calibrar canal + Pianolonote/
# Pianohinote sin tocar codigo: necesario si se usa otro controlador, o
# si se corrio la octava con los botones Octave -/+ del MiniLab (eso NO
# le avisa al software, y sin recalibrar keypos queda con "grave/agudo"
# desplazado aunque el resto siga funcionando).

def armLearnPiano(bound):
    """bound: 'lo' (tecla mas grave) o 'hi' (tecla mas aguda). La
    proxima tecla que se toque en CUALQUIER nota/canal queda capturada
    como ese extremo -- dats/midi_logic.py la intercepta ANTES del
    chequeo normal de rango, igual que el Learn de un slot normal."""
    p = _p()
    if not p:
        return
    bound = str(bound).strip().lower()
    if bound not in ('lo', 'hi'):
        return
    p.store('learn_piano_bound', bound)
    print('LEARN PIANO armado ({}): toca la tecla mas {} del teclado.'.format(
        bound, 'grave' if bound == 'lo' else 'aguda'))


def applyLearnPiano(bound, chan, note):
    """Llamada desde midi_logic cuando hay un extremo de piano armado."""
    p = _p()
    if not p:
        return
    p.store('learn_piano_bound', '')
    try:
        p.par.Pianochannel = int(chan)
        if bound == 'lo':
            p.par.Pianolonote = int(note)
        else:
            p.par.Pianohinote = int(note)
        # Si el usuario aprende primero la aguda y despues una grave que
        # queda MAYOR (o al reves), se intercambian solos -- no depende
        # de aprender en un orden especifico.
        lo = int(p.par.Pianolonote.eval())
        hi = int(p.par.Pianohinote.eval())
        if lo > hi:
            p.par.Pianolonote = hi
            p.par.Pianohinote = lo
    except Exception as e:
        print('applyLearnPiano ERROR:', e)
        return
    print('LEARN PIANO: canal {} nota {} -> {}'.format(chan, note, bound))
    savePianoRange()


def _piano_range_path():
    d = _config_dir()
    return os.path.join(d, 'piano_range.json') if d else ''


def savePianoRange():
    path = _piano_range_path()
    if not path:
        print('savePianoRange: falta /project1.Repopath')
        return
    p = _p()
    try:
        data = {
            'channel': int(p.par.Pianochannel.eval()),
            'lo': int(p.par.Pianolonote.eval()),
            'hi': int(p.par.Pianohinote.eval()),
        }
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print('Rango de piano guardado en', path)
    except Exception as e:
        print('savePianoRange ERROR:', e)


def loadPianoRange():
    path = _piano_range_path()
    if not path or not os.path.isfile(path):
        return
    p = _p()
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if 'channel' in data:
            p.par.Pianochannel = int(data['channel'])
        if 'lo' in data:
            p.par.Pianolonote = int(data['lo'])
        if 'hi' in data:
            p.par.Pianohinote = int(data['hi'])
        print('Rango de piano cargado desde', path)
    except Exception as e:
        print('loadPianoRange ERROR:', e)


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
        p.store('learn_piano_bound', '')
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
        loadPianoRange()
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
