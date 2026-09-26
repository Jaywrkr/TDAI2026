"""/project1/midi_logic  -  CHOP Execute DAT sobre midi1.

El MIDI ESCRIBE en los parametros; no los secuestra con expresiones.
Solo corre Python cuando algo se mueve de verdad.

PIANO (Fase 3): a diferencia de los knobs/pads (un valor MIDI unico), las
25 teclas son un RANGO continuo -- se calibran con Learn Piano (2 toques:
tecla mas grave + mas aguda, ver control_script.armLearnPiano/
applyLearnPiano), no asumiendo canal/notas fijos para siempre. El rango
aprendido vive en /project1.Pianochannel/Pianolonote/Pianohinote
(builder.py los crea con el default de fabrica del MiniLab: canal 13,
notas 49-73); PIANO_CHANNEL/PIANO_LO/PIANO_HI de aca abajo son solo el
fallback si esos parametros todavia no existen (build viejo) o el rig
corre fuera de TouchDesigner.

El nombre exacto que TD le da a un canal de nota puede variar entre
builds (ya paso con los CC: 'ch1cc112' en un build, 'ch1ctrl76' en otro),
asi que _parse_note() prueba varios patrones en vez de asumir uno solo.
Si el patron real no es ninguno de estos, el sintoma es "el anillo de
tecla no aparece nunca" -- nunca rompe nada mas. Reportar el nombre real
del canal (visor de midi1) si eso pasa.
"""

import re

# Default de fabrica del MiniLab mkII -- fallback si /project1.Piano* no
# existe todavia. Los pads del banco B (ver EFFECT_TRIGGERS mas abajo)
# mandan canal 10, notas 45-52 -- esas notas 49-52 SE PISAN con el piano
# si solo se mira el numero de nota, por eso el chequeo de canal es
# obligatorio, no cosmetico.
PIANO_CHANNEL = 13
PIANO_LO = 49
PIANO_HI = 73

_NOTE_PATTERNS = [
    re.compile(r'^ch(\d+)n(\d+)$', re.IGNORECASE),
    re.compile(r'^ch(\d+)note(\d+)$', re.IGNORECASE),
    re.compile(r'^ch(\d+)key(\d+)$', re.IGNORECASE),
]

_PITCH_RE = re.compile(r'^ch(\d+)pitch$', re.IGNORECASE)


def _norm01(name, val):
    """0..1 desde el valor RAW de un canal MIDI.

    BUG real reportado en vivo: Detail6 (mapeado a la rueda de pitch
    bend, ch1pitch -- ver config.DEFAULT_MIDI) practicamente no se movia
    ("el valor sigue siendo demasiado bajo"). Causa: CC/nota vienen de
    TD como el byte MIDI crudo, 0..127 -- por eso el resto de este
    archivo divide por 127.0 -- pero Pitch Bend NO es un CC: es un valor
    ya centrado en 0 que TD normaliza aparte, tipicamente -1..1 (bend
    para abajo <-> para arriba). Dividir ESO por 127 lo deja practicamente
    inmovil (como mucho +-0.0078, el mismo numero que el bug de rango
    de hace un tiempo, pero esta vez la causa es una escala distinta,
    no el dialogo de Parameters corrompido).
    """
    if _PITCH_RE.match(name):
        v = float(val)
        if -1.5 <= v <= 1.5:
            return max(0.0, min(1.0, (v + 1.0) * 0.5))
        # Por si algun build expone Pitch ya en 0..1, o crudo de 14 bits
        # (0..16383, centro 8192) -- para que esto se degrade con
        # gracia en vez de volver a quedar mudo si la suposicion de
        # arriba no aplica en un build puntual.
        if 0.0 <= v <= 1.0:
            return v
        return max(0.0, min(1.0, v / 16383.0))
    return max(0.0, min(1.0, float(val) / 127.0))


def _parse_note(name):
    """(canal, nota) de un nombre de canal MIDI tipo 'ch13n49', o None si
    el nombre no matchea ningun patron conocido (CC, no nota)."""
    for pat in _NOTE_PATTERNS:
        m = pat.match(name)
        if m:
            return int(m.group(1)), int(m.group(2))
    return None


def _piano_range():
    """(canal, grave, aguda) aprendidos via Learn Piano -- con fallback a
    los defaults de arriba si /project1.Piano* no existe todavia."""
    p = op('/project1')
    if p:
        chan = getattr(p.par, 'Pianochannel', None)
        lo = getattr(p.par, 'Pianolonote', None)
        hi = getattr(p.par, 'Pianohinote', None)
        if chan is not None and lo is not None and hi is not None:
            return int(chan.eval()), int(lo.eval()), int(hi.eval())
    return PIANO_CHANNEL, PIANO_LO, PIANO_HI


def _piano_note(name):
    parsed = _parse_note(name)
    if not parsed:
        return None
    chan, note = parsed
    pchan, plo, phi = _piano_range()
    if chan == pchan and plo <= note <= phi:
        return note
    return None


def _handlePianoKey(note, val):
    p = op('/project1')
    if not p:
        return

    # Piano COMPLETO (rango aprendido, 25 teclas): Keypos/Keyvel/Keypulse
    # para el movimiento de firma propio de cada escena. Los 8 efectos
    # (Grain/Glitch/Pixelate/Strobe/Invert/Mirror/Zoom/Posterize) viven en
    # los pads del banco B (canal 10, notas 45-52, ver EFFECT_TRIGGERS mas
    # abajo), no en el teclado -- pedido explicito del usuario al
    # descubrir que su controlador tiene 16 pads (2 bancos de 8) y no
    # necesita sacrificar teclas para los efectos.
    _, plo, phi = _piano_range()
    pos = max(0.0, min(1.0, (note - plo) / float(max(phi - plo, 1))))
    vel = max(0.0, min(1.0, float(val) / 127.0))

    for par_name, v in (('Keypos', pos), ('Keyvel', vel), ('Keypulseraw', 1.0)):
        par = getattr(p.par, par_name, None)
        if par is not None:
            par.val = v

    # Modo PIANO de la carpeta de media: la tecla ELIGE la imagen (no
    # avanza a la siguiente). Se le pasa el mismo 'pos' 0..1 que acaba de
    # calcularse con el rango aprendido, asi la carpeta entera queda
    # repartida sobre las 25 teclas. control_script decide si corresponde
    # hacer algo -- en cualquier otro modo esto es un no-op.
    ctrl = op('/project1/control_script')
    if ctrl:
        try:
            ctrl.module.mediaPianoSelect(pos)
        except Exception as e:
            print('mediaPianoSelect:', e)

    # Se resetea un par de frames despues para que la SIGUIENTE tecla
    # produzca un flanco de subida nuevo y el Trigger CHOP la detecte --
    # si se quedara en 1.0, una tecla sostenida jamas volveria a disparar.
    run("op('/project1/midi_logic').module._resetKeypulse()", delayFrames=2)


def _resetKeypulse():
    p = op('/project1')
    if p:
        par = getattr(p.par, 'Keypulseraw', None)
        if par is not None:
            par.val = 0.0


def _resetEffect(effect_name):
    p = op('/project1')
    if p:
        par = getattr(p.par, effect_name, None)
        if par is not None:
            par.val = 0.0
    _refreshLeds()


def _refreshLeds():
    """Refleja el estado de los efectos en los LEDs de los pads. No hace
    nada si Padleds esta en OFF (el default) -- ver control_script."""
    ctrl = op('/project1/control_script')
    if ctrl:
        try:
            ctrl.module.refreshPadLeds()
        except Exception:
            pass


CONTINUOUS = {
    'Speed': ('Speed', 0.0, 1.0),
    'Density': ('Density', 0.0, 1.0),
    'Hue': ('Hue', 0.0, 1.0),
    'Chaos': ('Chaos', 0.0, 1.0),
    'Brightness': ('Brightness', 0.0, 1.0),
    'Transition': ('Transitionseconds', 0.05, 2.0),
    'Audioamount': ('Audioamount', 0.0, 1.0),
    'Bassamount': ('Bassamount', 0.0, 1.0),
    'Midamount': ('Midamount', 0.0, 1.0),
    'Highamount': ('Highamount', 0.0, 1.0),
    # BUG encontrado en vivo: Learn Detail1..6 guardaba bien el mapeo
    # (midiMap() lo devolvia correcto), pero como estos 6 slots NUNCA
    # estuvieron en este diccionario, _handle() nunca escribia el valor
    # en ningun par -- el knob quedaba "conectado" pero mudo. Sintoma
    # exacto reportado: el panel Detail se queda fijo en 0.5 pase lo que
    # pase con el knob fisico, aunque el Learn si se haya hecho bien.
    'Detail1': ('Detail1', 0.0, 1.0),
    'Detail2': ('Detail2', 0.0, 1.0),
    'Detail3': ('Detail3', 0.0, 1.0),
    'Detail4': ('Detail4', 0.0, 1.0),
    'Detail5': ('Detail5', 0.0, 1.0),
    'Detail6': ('Detail6', 0.0, 1.0),
    # Master FX (Fase 4) -- ver program.py. Continuos como cualquier
    # perilla; sin default de fabrica porque el controlador ya no tiene
    # perillas libres, quedan listos para Learn.
    'Trails': ('Trails', 0.0, 1.0),
    'Layermix': ('Layermix', 0.0, 1.0),
    'Lookamount': ('Lookamount', 0.0, 1.0),
    'Palettelock': ('Palettelock', 0.0, 1.0),
    # MACRO ENERGIA (layout v2): la perilla principal del show. Ademas de
    # escribir Energy, la PRENDE (Energyactive) -- asi despues de un Reset
    # (que la apaga, ver control_script.resetControls) basta con tocarla
    # para que vuelva a mandar. Ver control_script.applyEnergy.
    'Energy': ('Energy', 0.0, 1.0),
    # Zoom de la estela, centrado en 0.5 = neutro: ideal para la tira de
    # pitch (vuelve sola al centro al soltarla).
    'Trailszoom': ('Trailszoom', 0.0, 1.0),
    # Carpeta comun de media: perilla continua, recorre TODA la carpeta
    # por posicion (0..1 = primera..ultima imagen). El trabajo de mapear
    # esa posicion a un indice de imagen NO pasa por aca -- lo hace
    # control_script.mediaScrubSelect(), disparado por onValueChange en
    # builder.py apenas este parametro cambia (mismo patron que 'Energy').
    'Mediascrub': ('Mediascrub', 0.0, 1.0),
}

TRIGGERS = {
    'Next': 'nextScene',
    'Prev': 'prevScene',
    'Blackout': 'toggleBlackout',
    'Snapshot': 'snapshotPreset',
    'Reset': 'resetControls',
    # Master FX: prender/apagar y ciclar desde un pad, sin mouse.
    'Trailstoggle': 'toggleTrails',
    'Duallayer': 'toggleDual',
    'Blendnext': 'nextBlendMode',
    'Layerswap': 'swapLayer',
    # Preview/cue y panico (Fase 5).
    'Take': 'takePreview',
    'Cuemode': 'toggleCue',
    'Cuenext': 'cueNext',
    'Cueprev': 'cuePrev',
    'Panic': 'panic',
    # Carpeta comun de media (scene19/34/35). Sirven en cualquier modo:
    # en MANUAL son LA forma de pasar imagenes, y en los automaticos son
    # el override de mano cuando algo tiene que cambiar ahora.
    'Medianext': 'mediaNext',
    'Mediaprev': 'mediaPrev',
    'Mediarandom': 'mediaRandom',
    'Medialock': 'toggleMediaLock',
    # Overlay de texto: separar "tipear" (mouse/teclado) de "mostrar"
    # (pad) es todo el punto -- ver control_script.toggleTextVisible.
    'Textvisible': 'toggleTextVisible',
    'Fontnext': 'nextFont',
    # Layout v2: autopilot en un pad (con Energia manejando su ritmo).
    'Autopilot': 'toggleAutopilot',
}

# Pads que disparan VARIOS efectos juntos (layout v2): con 16 pads y 8
# efectos + la navegacion, dos efectos que se llevan bien comparten pad
# para liberar uno. RETRO = pocos colores + grano, el look de pantalla
# vieja completo en un solo golpe.
EFFECT_COMBOS = {
    'Retro': ('Grain', 'Posterize'),
}

# 8 efectos en los 8 pads del banco B del MiniLab mkII (canal 10, ver
# config.DEFAULT_MIDI) -- se comportan como cualquier otro TRIGGER (se
# pueden reaprender con Learn), solo que en vez de llamar una funcion sin
# argumentos, escriben la velocidad del pad (0..1) en su parametro y se
# resetean solas un par de frames despues -- mismo patron/funcion
# (_resetEffect) que ya usaba el piano.
#
# OJO: esos 2 frames son solo el FLANCO de subida, no la duracion real
# del efecto. Antes no habia nada mas: el parametro raw iba derecho a la
# textura de control (config.PAR_CHANNELS) y un pad duraba en pantalla
# esos mismos ~2 frames (~0.03s a 60fps) -- invisible. Ahora
# midi.build_effects_envelope() intercepta ese flanco con un Lag CHOP
# (config.FX_DECAY_SECONDS, hoy 1.4s) antes de que llegue a la textura de
# control, asi que lo que SE VE es la envolvente, no el flanco crudo.
EFFECT_TRIGGERS = ['Grain', 'Glitch', 'Pixelate', 'Strobe', 'Invert',
                    'Mirror', 'Zoom', 'Posterize']


# --- MODO RELATIVO (perillas 1 y 9 de fabrica, ver docs/02) --------------
# Las perillas CLICABLES (1 y 9) del MiniLab mkII vienen en modo RELATIVO
# de fabrica (pensado para navegar presets): en vez de mandar la posicion
# real 0..127 como el resto de las perillas, mandan siempre un numero
# pegado a 64 en cada paso (Arturia 'Relative #2' / 2's complement: 65 =
# +1 paso, 63 = -1, nunca los extremos). _handle() asumia SIEMPRE que
# 'val' era la posicion absoluta -- en una perilla relativa eso se lee
# como "salta cerca de la mitad y se queda ahi", que es justo el sintoma
# reportado (Energia/Detail1 "no responden bien").
#
# La solucion de fondo (docs/02_MIDI_MINILAB_MKII.md) es poner esas 2
# perillas en modo Absolute desde Arturia MIDI Control Center -- pero
# mientras eso no este hecho (o con otro controlador que tambien mande
# relativo), esto detecta el patron solo y acumula en vez de quedarse
# mudo. Deteccion CONSERVADORA: se asume relativo solo si TODO lo que
# llego de ese canal cayo siempre en la banda angosta de abajo. En cuanto
# llega un solo valor fuera de la banda, se confirma ABSOLUTO para
# siempre y esto deja de intervenir -- asi una perilla que ya manda
# absoluto (todas las demas) nunca cambia de comportamiento.
_REL_BAND_LO = 58
_REL_BAND_HI = 70
_REL_STEP = 1.0 / 127.0  # un "tic" relativo mueve lo mismo que 1 unidad MIDI


def _relativePosition(p, name, val):
    """None si el canal ya esta confirmado absoluto (comportamiento de
    siempre); si no, la posicion 0..1 acumulada a partir de los pasos
    relativos vistos hasta ahora."""
    try:
        v = int(round(float(val)))
    except (TypeError, ValueError):
        return None
    key_mode = 'relmode_' + name
    key_pos = 'relpos_' + name
    mode = p.fetch(key_mode, None)

    if mode is None:
        # Primera lectura de este canal: si ya viene fuera de la banda
        # angosta, es absoluto (un valor relativo real NUNCA pega en los
        # extremos ni lejos de 64).
        mode = 'relative' if _REL_BAND_LO <= v <= _REL_BAND_HI else 'absolute'
        p.store(key_mode, mode)
        if mode == 'relative':
            p.store(key_pos, 0.5)

    if mode == 'absolute':
        return None

    if not (_REL_BAND_LO <= v <= _REL_BAND_HI):
        # Un valor fuera de la banda desmiente la hipotesis "relativo":
        # confirma absoluto para siempre.
        p.store(key_mode, 'absolute')
        return None

    pos = max(0.0, min(1.0, float(p.fetch(key_pos, 0.5)) + (v - 64) * _REL_STEP))
    p.store(key_pos, pos)
    return pos


def _ctx():
    return op('/project1'), op('/project1/control_script')


def _assertRange(par, lo, hi):
    """Reafirma el rango real de un parametro antes de escribirle un valor.

    BUG real encontrado en vivo: el dialogo de Parameters de TD deja
    editar/arrastrar a mano el campo Range de cualquier parametro -- esta
    justo al lado de la perilla, un clic o un scroll de mas ahi alcanza.
    builder.py crea estos parametros con clampMin/clampMax=True (para que
    nunca reciban un valor fuera de rango), pero eso mismo significa que
    si el Range queda corrompido (ej. max en 0.0078 en vez de 1.0), TD
    trunca CUALQUIER valor que Python le escriba a ese rango -- aunque
    _handle() este escribiendo 0.0..1.0 perfecto, lo que llega al shader
    es como mucho 0.0078. La perilla o el pad quedan "conectados" pero el
    efecto es invisible, sin ningun error en ningun lado.

    CORREGIDO: la primera version de esto solo reafirmaba normMin/normMax
    y el bug SIGUIO pasando (reportado de nuevo en vivo, Detail6 seguia en
    0..0.0078 con el fix ya mergeado) -- porque TD tiene DOS pares de
    atributos de rango distintos (min/max, el "Range" que se ve en el
    dialogo de Parameters, y normMin/normMax, el rango normalizado) y el
    primer intento solo cubria uno de los dos. Sin poder confirmar cual de
    los dos es el que de verdad clampea el valor en esta build de TD, se
    reafirman los CUATRO juntos -- asi no importa cual sea.
    """
    try:
        par.min = lo
        par.max = hi
        par.normMin = lo
        par.normMax = hi
        par.clampMin = True
        par.clampMax = True
    except Exception:
        pass


def _handle(channel, val, is_trigger):
    p, ctrl = _ctx()
    if not p or not ctrl:
        return
    m = ctrl.module
    name = channel.name

    # MIDI LEARN tiene prioridad sobre cualquier mapeo existente.
    if str(p.fetch('learn_slot', '') or ''):
        m.applyLearn(name)
        return

    slot = m.midiMap().get(name)
    if not slot:
        return

    if slot in CONTINUOUS:
        par_name, lo, hi = CONTINUOUS[slot]
        par = getattr(p.par, par_name, None)
        if par is not None:
            _assertRange(par, lo, hi)
            if slot == 'Energy':
                ea = getattr(p.par, 'Energyactive', None)
                if ea is not None and not bool(ea.eval()):
                    ea.val = True
            pos01 = None
            if not _PITCH_RE.match(name):
                pos01 = _relativePosition(p, name, val)
            if pos01 is None:
                pos01 = _norm01(name, val)
            par.val = lo + (hi - lo) * pos01
    elif is_trigger and slot in EFFECT_COMBOS:
        for fx in EFFECT_COMBOS[slot]:
            par = getattr(p.par, fx, None)
            if par is not None:
                _assertRange(par, 0.0, 1.0)
                par.val = 1.0
            run("op('/project1/midi_logic').module._resetEffect('{}')".format(fx), delayFrames=2)
        _refreshLeds()
    elif is_trigger and slot in TRIGGERS:
        getattr(m, TRIGGERS[slot])()
    elif is_trigger and slot in EFFECT_TRIGGERS:
        # Siempre a full (1.0), no la velocidad del pad. Pedido explicito
        # ("que funcione mucho mas"): un pad de efecto es un gesto de
        # ON/OFF -- si el pad fisico manda velocidad baja o pareja (varia
        # por controlador/config), el efecto se sentia siempre a medias
        # sin ninguna forma de saberlo desde la pantalla. A full, el
        # efecto pega con toda la intensidad que ya tiene el shader
        # (ver _FOOTER) cada vez, sin depender de que tan fuerte se toque.
        par = getattr(p.par, slot, None)
        if par is not None:
            _assertRange(par, 0.0, 1.0)
            par.val = 1.0
        _refreshLeds()
        run("op('/project1/midi_logic').module._resetEffect('{}')".format(slot), delayFrames=2)


def onValueChange(channel, sampleIndex, val, prev):
    _handle(channel, val, False)
    return


def onOffToOn(channel, sampleIndex, val, prev):
    p, ctrl = _ctx()
    if p and ctrl:
        # LEARN PIANO tiene prioridad sobre todo lo demas, igual que el
        # Learn de un slot normal (ver _handle) -- intercepta la nota
        # ANTES del chequeo de rango, en CUALQUIER canal/numero, porque
        # justamente eso es lo que se esta calibrando.
        bound = str(p.fetch('learn_piano_bound', '') or '')
        if bound:
            parsed = _parse_note(channel.name)
            if parsed:
                ctrl.module.applyLearnPiano(bound, parsed[0], parsed[1])
            return

    note = _piano_note(channel.name)
    if note is not None:
        _handlePianoKey(note, val)
        return
    _handle(channel, val, True)
    return


def onOnToOff(channel, sampleIndex, val, prev):
    return


def whileOn(channel, sampleIndex, val, prev):
    return


def whileOff(channel, sampleIndex, val, prev):
    return


def onValuesChanged(channels):
    return
