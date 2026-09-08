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
from .tdutil import (safe_set, safe_expr, safe_mark, add_float, add_int,
                     add_toggle, add_string, add_pulse, log, clear_log,
                     chan_names)

DAT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dats')


def _menu_hint(names):
    """Etiqueta legible para un int que en realidad es un menu: sin esto,
    'Mediamode = 3' en el panel de parametros no dice nada."""
    return '(' + '  '.join('{}={}'.format(i, n) for i, n in enumerate(names)) + ')'


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

    # --- CARPETA COMUN DE MEDIA ---
    # UNA carpeta para las tres escenas que usan imagen (config.MEDIA_SCENES:
    # 19 glitch, 34 caleidoscopio, 35 trama). Las tres muestran la MISMA
    # imagen al mismo tiempo, asi que pasar de una a otra en vivo se lee
    # como el mismo material tratado de tres formas -- y la ruta se carga
    # una sola vez, no una por escena.
    #
    # Mediaindex es interno: no se toca a mano, lo escriben el modo
    # automatico y los botones de abajo.
    md = proj.appendCustomPage('Media')
    add_string(md, 'Mediafolder', 'Carpeta de imagenes / GIFs',
               c.DEFAULT_MEDIA_FOLDER)
    add_int(md, 'Mediaindex', 'Imagen actual (interno)', 0, 0, 9999)
    # Contador interno que solo existe para el sistema de dependencias de
    # TD: la expresion 'file' de los Movie File In depende de Mediaindex,
    # asi que cuando cambia la LISTA (rescan / reordenado) y NO el
    # indice, no tendria motivo para reevaluarse. control_script lo
    # incrementa en esos dos casos. No se toca a mano.
    add_int(md, 'Mediagen', 'Generacion de la lista (interno)', 0, 0, 99999)
    add_int(md, 'Mediamode', 'Como cambia de imagen  ' + _menu_hint(c.MEDIA_MODES),
            1, 0, len(c.MEDIA_MODES) - 1)
    # 0 = el intervalo lo saca de la perilla Speed (comportamiento
    # historico). Cualquier otro valor manda sobre Speed.
    add_float(md, 'Mediaseconds', 'TIEMPO: segundos (0 = segun Speed)',
              0.0, 0.0, 60.0)
    add_int(md, 'Mediabeats', 'COMPAS: cada cuantos golpes', 4, 1, 32)
    # Shuffle no es "random cada vez": genera un ORDEN barajado estable y
    # lo recorre. Asi no repite la misma imagen dos veces seguidas ni deja
    # media carpeta sin salir nunca, que es lo que pasa con random puro.
    add_toggle(md, 'Mediashuffle', 'Orden barajado (no repite)', False)
    # Lock congela la imagen actual pase lo que pase con el modo. Es el
    # equivalente de media al blackout: un solo toggle para cuando algo
    # esta quedando bien y no se quiere que se vaya.
    add_toggle(md, 'Medialock', 'CONGELAR imagen actual', False)
    add_pulse(md, 'Medianext', 'Imagen siguiente')
    add_pulse(md, 'Mediaprev', 'Imagen anterior')
    add_pulse(md, 'Mediarandom', 'Imagen al azar')
    # Perilla continua: recorre la carpeta ENTERA por posicion (0 =
    # primera imagen, 1 = ultima), como un scrub -- pedido explicito del
    # usuario para no gastar un pad por cada paso. Es un control
    # CONTINUO (CONTINUOUS en midi_logic.py, no un TRIGGER): el valor se
    # escribe solo mientras se aprende/mueve el knob fisico; el trabajo
    # de verdad (mover Mediaindex) lo hace mediaScrubSelect() al
    # detectar el cambio (ver _PAR_EXEC.onValueChange mas abajo).
    add_float(md, 'Mediascrub', 'Recorrer carpeta (perilla)', 0.0, 0, 1)
    # La carpeta se escanea una vez y queda cacheada (se llama desde una
    # expresion de parametro, o sea todos los frames: un os.listdir por
    # frame es inaceptable). Este boton tira el cache -- hay que apretarlo
    # despues de agregar o sacar archivos con TD abierto.
    add_pulse(md, 'Mediarescan', 'Releer la carpeta')

    # --- OVERLAY DE TEXTO: nombres de artista, tipeados en vivo ---
    # Textcontent se escribe a mano en el momento (no hay banco/lista --
    # eso fue lo pedido explicito: "quiero yo setear los textos con la
    # compu en vivo"). Textvisible es aparte a proposito: separa "ya lo
    # tipee" de "que aparezca ahora", asi se puede escribir el nombre
    # siguiente con tiempo, mientras el anterior sigue en pantalla, y
    # mostrarlo justo cuando entra el artista con un solo toque (pad
    # aprendible). El fundido al prender/apagar lo arma program.py con
    # una cadena de CHOP nativa (mismo patron que la transicion de
    # escenas), no hay perilla de "duracion del fundido" aca -- es
    # config.TEXT_FADE_SECONDS.
    tx = proj.appendCustomPage('Texto')
    add_string(tx, 'Textcontent', 'Texto (se tipea en vivo)', '')
    add_toggle(tx, 'Textvisible', 'MOSTRAR texto', False)
    add_int(tx, 'Font', 'Fuente  ' + _menu_hint(c.FONTS), 0, 0, len(c.FONTS) - 1)
    add_pulse(tx, 'Fontnext', 'Fuente siguiente')
    add_float(tx, 'Textsize', 'Tamano', 0.5, 0, 1)
    add_float(tx, 'Texty', 'Posicion vertical (0 abajo, 1 arriba)', 0.18, 0, 1)

    # --- MASTER FX (Fase 4): estela + dos capas ---
    # Los dos viven en el program bus, DESPUES de las escenas y ANTES del
    # bloom (ver program.py). Los dos tienen bypass real por Switch TOP:
    # en 0 / apagado no cocinan y no cuestan nada.
    fx = proj.appendCustomPage('Master FX')
    add_float(fx, 'Trails', 'Estela (0 = apagada)', 0.0, 0, 1)
    # 0.5 = neutro en las dos: una sola perilla cubre los dos sentidos
    # (hacia adentro/afuera, horario/antihorario) sin gastar dos.
    add_float(fx, 'Trailszoom', 'Estela: Zoom (0.5 neutro)', 0.5, 0, 1)
    add_float(fx, 'Trailsrotate', 'Estela: Giro (0.5 neutro)', 0.5, 0, 1)
    add_toggle(fx, 'Duallayer', 'Dos Capas (A + B a la vez)', False)
    add_float(fx, 'Layermix', 'Dos Capas: Mezcla A>B', 0.5, 0, 1)
    # Int y no menu: el Parameter CHOP tiene que poder llevar esto a la
    # textura de control como un numero, y el comportamiento de un menu
    # ahi varia entre builds de TD. Los nombres viven en
    # config.BLEND_MODES y se muestran en el panel del dashboard.
    add_int(fx, 'Blendmode', 'Dos Capas: Modo de Mezcla', 0,
            0, len(c.BLEND_MODES) - 1)
    # Que capa recibe el proximo cambio de escena (click en el dashboard,
    # Next/Prev, MIDI). Sin esto no habria forma de cargar la capa B.
    add_int(fx, 'Activelayer', 'Dos Capas: Capa que se edita (0=A 1=B)',
            0, 0, 1)

    # --- LOOK MAESTRO (Fase 5): el color del show ---
    # Se aplica en el FOOTER, o sea despues de CUALQUIER escena. Todo
    # arranca en 0 = no-op exacto: mientras no se toque, el set se ve
    # igual que antes de que esto existiera.
    lk = proj.appendCustomPage('Look')
    add_int(lk, 'Look', 'Look del show', 0, 0, len(c.LOOKS) - 1)
    add_float(lk, 'Lookamount', 'Look: cuanto se aplica', 0.0, 0, 1)
    add_float(lk, 'Palettelock', 'Paleta del show (0 = libre)', 0.0, 0, 1)
    add_float(lk, 'Palettehue', 'Paleta: color base', 0.55, 0, 1)
    add_float(lk, 'Palettespread', 'Paleta: apertura (mono <-> 2 tonos)',
              0.5, 0, 1)

    # --- PREVIEW (cue) ---
    pv = proj.appendCustomPage('Preview')
    add_int(pv, 'Previewindex', 'Escena en preview', 0, 0, c.N_SCENES - 1)
    # Con Cue ON, un click en la grilla NO tira la escena al aire: la
    # carga en el preview y espera el TAKE. Es el flujo de una mesa real,
    # y es lo que evita el "la puse y no era esa" en vivo.
    add_toggle(pv, 'Cuemode', 'Cue: click carga preview, no programa', False)
    add_pulse(pv, 'Take', 'TAKE (preview -> programa)')

    # --- SALIDAS + GRABACION ---
    ou = proj.appendCustomPage('Salidas')
    add_toggle(ou, 'Externalout', 'Salida externa (NDI / Syphon-Spout)', False)
    add_toggle(ou, 'Record', 'GRABAR (usa el boton, no este toggle)', False)
    add_string(ou, 'Recordfolder', 'Carpeta de grabacion', '')
    add_pulse(ou, 'Togglerecord', 'Empezar / parar grabacion')

    # --- FAILSAFE DE VIVO ---
    # No es un lujo: un rig que se cae a mitad del set es peor que uno
    # sin efectos. Degrada SOLO cuando el FPS lleva rato abajo, y en
    # pasos, empezando por lo mas caro y menos esencial.
    fs = proj.appendCustomPage('Failsafe')
    add_toggle(fs, 'Failsafe', 'Failsafe automatico', True)
    add_float(fs, 'Failsafeseconds', 'Segundos en rojo antes de actuar',
              4.0, 1.0, 30.0)
    # Tope holgado a proposito: el techo REAL de la escalera lo pone
    # control_script (_FAILSAFE_MAX_LEVEL, derivado de _FAILSAFE_STEPS).
    # Si aca quedara clampeado justo en el largo de la escalera, agregar
    # un escalon dejaria el nivel trabado repitiendo el ultimo para
    # siempre.
    add_int(fs, 'Failsafelevel', 'Nivel actual (0 = todo OK)', 0, 0, 8)
    add_pulse(fs, 'Failsafereset', 'Reset del failsafe')
    add_pulse(fs, 'Panic', 'PANICO (blackout + escena 0 + FX a cero)')

    # --- BANCOS + SETLIST (Fase 5) ---
    # Con 34 escenas, Next/Prev lineal ya queda corto: llegar de la 3 a
    # la 28 son 25 pulsaciones. Los bancos parten la grilla en bloques y
    # el setlist define un ORDEN propio para una noche concreta.
    bk = proj.appendCustomPage('Bancos')
    add_int(bk, 'Banksize', 'Escenas por banco', 8, 2, 16)
    add_int(bk, 'Bank', 'Banco actual', 0, 0, 16)
    add_pulse(bk, 'Banknext', 'Banco siguiente')
    add_pulse(bk, 'Bankprev', 'Banco anterior')
    # Setlist: indices separados por coma o espacio, ej "0, 4, 17, 23".
    # Vacio = sin setlist, Next/Prev recorren las 34 en orden numerico.
    add_string(bk, 'Setlist', 'Setlist (ej: 0, 4, 17, 23)', '')
    add_toggle(bk, 'Usesetlist', 'Next/Prev siguen el setlist', False)

    # --- MACRO ENERGIA ---
    # Una perilla que arma el build-up entero. Escribe Speed/Density/
    # Chaos/Trails de una sola vez: mover una perilla despues la pisa sin
    # drama (gana lo ultimo que tocaste), que es como se espera que se
    # comporte un macro en vivo.
    add_float(bk, 'Energy', 'MACRO ENERGIA (calma <-> pico)', 0.5, 0, 1)
    add_toggle(bk, 'Energyactive', 'Energia escribe las perillas', False)

    # --- LEDs DE LOS PADS (sin verificar) ---
    # Default APAGADO a proposito: el protocolo de color del MiniLab mkII
    # es SysEx propietario de Arturia y no se pudo verificar contra la
    # unidad real. Lo que hay implementado es el envio de note-on al pad
    # (el metodo que funciona en varios controladores), listo para
    # probar; si tu unidad no responde asi, hay que cambiar sendPadLed()
    # en control_script.py por el SysEx correcto. Ver docs/02.
    add_toggle(bk, 'Padleds', 'LEDs de pads (SIN VERIFICAR)', False)
    add_int(bk, 'Padledchannel', 'LEDs: canal MIDI de los pads', 10, 1, 16)
    add_int(bk, 'Padlednote', 'LEDs: nota del primer pad', 45, 0, 127)

    m = proj.appendCustomPage('MIDI Mapping')
    for slot in c.MIDI_SLOTS:
        add_string(m, 'Midi' + slot.lower(), slot, c.DEFAULT_MIDI.get(slot, ''))
        add_pulse(m, 'Learn' + slot.lower(), 'Learn ' + slot)
    add_pulse(m, 'Cancellearn', 'Cancelar Learn')
    add_pulse(m, 'Savemidi', 'Guardar Mapeo')
    add_pulse(m, 'Loadmidi', 'Cargar Mapeo')

    # Learn de RANGO del piano (no es un slot mas: las 25 teclas son un
    # rango continuo, no un valor unico como un knob o un pad). Se
    # aprende con 2 toques -- la tecla mas grave y la mas aguda -- en vez
    # de asumir canal 13 / notas 49-73 fijo, que se descalibra si el
    # usuario usa otro controlador o corre la octava con los botones
    # Octave -/+ del MiniLab (eso NO le avisa al software). Ver
    # dats/midi_logic.py (_piano_range) y control_script.py
    # (armLearnPiano/applyLearnPiano).
    add_int(m, 'Pianochannel', 'Piano Canal (aprendido)', c.PIANO_CHANNEL, 1, 16)
    add_int(m, 'Pianolonote', 'Piano Nota Grave (aprendida)', c.PIANO_LO_NOTE, 0, 127)
    add_int(m, 'Pianohinote', 'Piano Nota Aguda (aprendida)', c.PIANO_HI_NOTE, 0, 127)
    add_pulse(m, 'Learnpianolo', 'Learn Piano: tecla mas GRAVE')
    add_pulse(m, 'Learnpianohi', 'Learn Piano: tecla mas AGUDA')

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
    # Hornea las miniaturas de la grilla del dashboard (ver
    # config.THUMBS_DIRNAME y control_script.bakeThumbs). Hay que
    # correrlo una vez despues de instalar, y de nuevo cada vez que se
    # edite un visual y se quiera actualizar su miniatura.
    add_pulse(s, 'Bakethumbs', 'Hornear Miniaturas (grilla)')
    add_pulse(s, 'Rebuild', 'Reconstruir Todo')
    # Estado interno del piano (Fase 3) -- no se tocan a mano, los escribe
    # midi_logic.py en cada tecla. Viven aca porque necesitan ser
    # parametros custom reales para que el Parameter CHOP los pueda leer.
    add_float(s, 'Keypos', 'Keypos (interno)', 0.5, 0, 1)
    add_float(s, 'Keyvel', 'Keyvel (interno)', 0.0, 0, 1)
    add_float(s, 'Keypulseraw', 'Keypulseraw (interno)', 0.0, 0, 1)
    # Efectos de pad (Fase 3, 8 pads del banco B del MiniLab mkII, ver
    # config.DEFAULT_MIDI) -- se escriben desde midi_logic.py
    # (EFFECT_TRIGGERS).
    add_float(s, 'Grain', 'Grain', 0.0, 0, 1)
    add_float(s, 'Glitch', 'Glitch', 0.0, 0, 1)
    add_float(s, 'Pixelate', 'Pixelate', 0.0, 0, 1)
    add_float(s, 'Strobe', 'Strobe', 0.0, 0, 1)
    add_float(s, 'Invert', 'Invert', 0.0, 0, 1)
    add_float(s, 'Mirror', 'Mirror', 0.0, 0, 1)
    add_float(s, 'Zoom', 'Zoom', 0.0, 0, 1)
    add_float(s, 'Posterize', 'Posterize', 0.0, 0, 1)


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
    elif n == 'Bakethumbs':
        m.bakeThumbs()
    elif n == 'Rebuild':
        import vjcore
        vjcore.build()
    elif n == 'Learnpianolo':
        m.armLearnPiano('lo')
    elif n == 'Learnpianohi':
        m.armLearnPiano('hi')
    elif n == 'Take':
        m.takePreview()
    elif n == 'Togglerecord':
        m.toggleRecord()
    elif n == 'Failsafereset':
        m.failsafeReset()
    elif n == 'Panic':
        m.panic()
    elif n == 'Banknext':
        m.nextBank()
    elif n == 'Bankprev':
        m.prevBank()
    elif n == 'Medianext':
        m.mediaNext()
    elif n == 'Mediaprev':
        m.mediaPrev()
    elif n == 'Mediarandom':
        m.mediaRandom()
    elif n == 'Mediarescan':
        m.mediaRescan()
    elif n == 'Fontnext':
        m.nextFont()
    elif n.startswith('Learn'):
        slot = n[5:]
        for s in m._midi_slots():
            if s.lower() == slot:
                m.armLearn(s)
                break
    return


def onValueChange(par, prev):
    ctrl = op('/project1/control_script')
    if not ctrl:
        return
    if par.name in ('Performancemode', 'Previewall'):
        ctrl.module.setSceneCooking()
    elif par.name == 'Energy':
        # El macro escribe las perillas al MOVERSE, no por frame: esto
        # es un evento de valor, no un bucle.
        ctrl.module.applyEnergy()
    elif par.name == 'Mediafolder':
        # Carpeta nueva: se tira el cache y se vuelve a la primera imagen.
        # Sin esto quedaria mostrando el indice de la carpeta anterior,
        # que casi seguro apunta a otra cosa (o a nada).
        ctrl.module.mediaRescan()
    elif par.name in ('Mediamode', 'Mediaseconds'):
        # Cambiar a TIEMPO tiene que re-arrancar el ciclo aunque estuviera
        # en MANUAL hace media hora.
        ctrl.module.startMediaCycles()
    elif par.name == 'Mediashuffle':
        ctrl.module.mediaReshuffle()
    elif par.name == 'Mediascrub':
        ctrl.module.mediaScrubSelect(par.val)
    return


def onValuesChanged(changes):
    return
'''


# ---------------------------------------------------------------
# SEÑALIZACION DE LA RED
# ---------------------------------------------------------------

def _mark_setup_nodes(proj, midi_in, dash, show_window):
    """Pinta y comenta los nodos que hay que tocar A MANO antes de un
    show -- los mismos 4 pasos del reporte "SIGUIENTE PASO MANUAL" que
    imprime este mismo build() al final. Puramente cosmetico (color +
    comentario, ver tdutil.safe_mark): nunca puede romper una conexion
    ni cambiar como corre el rig, asi que se hace siempre, sin flag."""
    audio_in = proj.op('audio1')
    steps = [
        (audio_in, '1) ELEGIR DEVICE DE AUDIO ACA'),
        (midi_in, '2) ELEGIR "Arturia MiniLab mkII" ACA'),
        (dash, '5) ABRIR EN MODO PERFORM (Viewer Active)'),
        (show_window, '6) Monitor > elegir el proyector > pulso Open'),
    ]
    for node, text in steps:
        if node is not None:
            safe_mark(node, color=config.SETUP_NODE_COLOR, comment=text)
        else:
            log('AVISO _mark_setup_nodes: no encontre el nodo para "{}"'
                .format(text))

    # Opcional -- los LEDs de pads nunca se probaron contra hardware real
    # (ver builder.py pagina Bancos, 'Padleds'). Color distinto para que
    # no se confunda con los 4 pasos que si hacen falta si o si.
    midi_out = proj.op('midi_out')
    if midi_out is not None:
        safe_mark(midi_out, color=config.SETUP_NODE_COLOR_OPTIONAL,
                  comment='OPCIONAL: Device para LEDs de pads '
                          '(SIN VERIFICAR contra hardware real)')


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
    ctrl_dat.nodeX, ctrl_dat.nodeY = 1960, 400
    ctrl_dat.text = _dat_text('control_script')

    diag_dat = proj.create(textDAT, 'diagnostics')
    diag_dat.nodeX, diag_dat.nodeY = 1960, 260
    diag_dat.text = _dat_text('diagnostics')

    rt = proj.create(executeDAT, 'runtime_manager')
    rt.nodeX, rt.nodeY = 1960, 120
    safe_set(rt, 'start', True)
    safe_set(rt, 'devicechange', True)
    safe_set(rt, 'framestart', False)
    rt.text = _dat_text('runtime_manager')

    pe = proj.create(parameterexecuteDAT, 'par_exec')
    pe.nodeX, pe.nodeY = 1960, -20
    safe_set(pe, 'op', proj.path)
    safe_set(pe, 'pars', '*')
    safe_set(pe, 'pulse', True)
    safe_set(pe, 'valuechange', True)
    pe.text = _PAR_EXEC

    # --- audio + control + midi ---
    audio_chop = audio.build(proj)
    midi_in, _midi_logic_dat = midi.build(proj, _dat_text('midi_logic'))
    key_chop = midi.build_keypulse(proj)
    fx_chop = midi.build_effects_envelope(proj)
    ctrl_chop, ctrl_tex = control.build(proj, audio_chop, key_chop, fx_chop)

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
    # ctrl_tex/channels: los shaders de Master FX (dos capas + estela)
    # leen la MISMA textura de control que las escenas -- ver program.py.
    ops = program.build(proj, outs, ctrl_tex, channels)
    dash = dashboard.build(proj, thumbs, ops['bloom'])

    _mark_setup_nodes(proj, midi_in, dash, ops.get('window'))

    # --- error log ---
    err = proj.create(errorDAT, 'system_errors')
    err.nodeX, err.nodeY = 1960, 560
    safe_set(err, 'active', True)
    safe_set(err, 'source', '/project1*')
    safe_set(err, 'severity', 'warning abort')
    safe_set(err, 'clamp', True)
    safe_set(err, 'maxlines', 60)

    # --- contrato visual visible dentro de TD ---
    contract = proj.create(textDAT, 'VISUAL_CONTRACT')
    contract.nodeX, contract.nodeY = 1960, 700
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

    # Master FX: el error caro aca no es que falte un nodo, es que los
    # shaders no compilen -- eso solo se ve dentro de TD (glslangValidator
    # no puede: usan sTD2DInputs/TDOutputSwizzle). Se chequea el conteo de
    # inputs, que es lo que romperia el efecto en silencio (un input mal
    # conectado da negro o el frame sin procesar, no un error rojo).
    for name, n_inputs in (('program_blend', 3), ('program_trails', 3),
                           ('program_pick', 2), ('trails_pick', 2)):
        node = proj.op(name)
        check('{} con {} inputs'.format(name, n_inputs),
              bool(node) and len(node.inputs) == n_inputs,
              str(len(node.inputs)) if node else 'no existe')

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
