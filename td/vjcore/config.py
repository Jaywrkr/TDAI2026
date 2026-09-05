"""Configuracion global del rig. Editar aqui, no dentro del build."""

# Subido de 20 a 34: 4 escenas promovidas desde los prototipos de "ideas
# nuevas" (cracked glass, bokeh, osciloscopio, nebulosa) + 10 escenas
# totalmente nuevas.
N_SCENES = 34

# Escenas que necesitan un SEGUNDO input de imagen/video (ademas de la
# textura de control) -- hoy solo scene19 (efecto sobre imagen/GIF). Se
# les agrega un Movie File In TOP como input 1 del GLSL TOP y un
# parametro Mediafile en su pagina de escena. El resto de las escenas
# jamas referencia sTD2DInputs[1] en su .frag, asi que no les afecta.
MEDIA_SCENES = {19}
# 6x6 = 36 casilleros para 34 escenas (2 casilleros de sobra en la
# ultima fila, sin usar -- el loop del dashboard solo crea tiles para
# escenas que existen de verdad).
GRID_COLS = 6
GRID_ROWS = 6

# TouchDesigner NON-COMMERCIAL limita la salida a 1280x1280.
DEFAULT_OUTPUT_W = 1280
DEFAULT_OUTPUT_H = 720
MAX_OUTPUT = 1280

# Dashboard
# Thumbnails achicados (208x117 -> 150x84, misma proporcion) al pasar de
# 20 a 34 escenas -- si se mantenia el tamano viejo con 36 casilleros el
# dashboard entero quedaba enorme.
THUMB_W = 150
THUMB_H = 84
GAP = 8
DASH_MARGIN = 18
PROGRAM_W = 640
PROGRAM_H = 360

DEFAULT_TRANSITION_SECONDS = 0.45

# Resolucion de los thumbnails del dashboard.
# Con Previewall default True (ver builder.py) las 34 escenas cocinan
# siempre -- resolucion de thumbnail bajada (256x144 -> 192x108) para que
# ese costo no crezca proporcional a la cantidad de escenas.
THUMB_RES_W = 192
THUMB_RES_H = 108

# ---------------------------------------------------------------
# CONTRATO DE CONTROL
# ---------------------------------------------------------------
# Este es el orden CANONICO de canales del CHOP /project1/ctrl.
# El header GLSL se genera leyendo el orden REAL en runtime, asi que
# si esto cambia los shaders siguen funcionando sin editarlos.
CTRL_CHANNELS = [
    'speed',    # 0  knob 1   0..1
    'density',  # 1  knob 2   0..1
    'hue',      # 2  knob 3   0..1
    'chaos',    # 3  knob 4   0..1
    'bright',   # 4  master fade (INFO - el core ya lo aplica)
    'level',    # 5  RMS global
    'bass',     # 6  20-180 Hz
    'mid',      # 7  180-2000 Hz
    'high',     # 8  2k-12k Hz
    'kick',     # 9  transitorio de graves 0..1
    'beat',     # 10 envolvente AR disparada por el kick
    # Fase 3 - piano. keypulse decae solo tras cada tecla (como 'beat');
    # keypos/keyvel se fijan en el evento y se mantienen hasta la siguiente.
    'keypulse', # 11 pulso al tocar cualquier tecla del piano, decae solo
    'keypos',   # 12 grave..agudo de la ULTIMA tecla tocada, 0..1
    'keyvel',   # 13 fuerza de esa tecla, 0..1
    # Fase 3 - efectos de pad (8, pads 9-16 = ch10 notas 45-52 del MiniLab
    # mkII, ver DEFAULT_MIDI). Decaen solos tras cada golpe, como 'beat' y
    # 'keypulse'.
    'grain',     # 14 efecto de grano
    'glitch',    # 15 desplazamiento RGB
    'pixelate',  # 16 pixelacion (geometrico, se aplica antes de render())
    'strobe',    # 17 destello
    'invert',    # 18 inversion de color
    'mirror',    # 19 espejo horizontal (geometrico, antes de render())
    'zoom',      # 20 acercamiento al centro (geometrico, antes de render())
    'posterize', # 21 cuantizacion de color
    # Fase 3 - perillas de detalle, significan algo distinto por escena.
    # Ver @D1.._at6 en el .frag y docs/03_VISUAL_SPEC.md.
    'd1', 'd2', 'd3', 'd4', 'd5', 'd6',         # 22-27
    'time',     # 28 tiempo YA escalado por Speed (usar este para animar)
    'rtime',    # 29 tiempo real en segundos (independiente de Speed)
    'resw',     # 30 ancho de salida
    'resh',     # 31 alto de salida
]

# Parametros custom de /project1 que expone el Parameter CHOP.
# (nombre del parametro, nombre del canal)
PAR_CHANNELS = [
    ('Speed', 'speed'),
    ('Density', 'density'),
    ('Hue', 'hue'),
    ('Chaos', 'chaos'),
    ('Brightness', 'bright'),
    ('Outputwidth', 'resw'),
    ('Outputheight', 'resh'),
    ('Keypos', 'keypos'),
    ('Keyvel', 'keyvel'),
    ('Keypulseraw', 'keypulse'),
    ('Grain', 'grain'),
    ('Glitch', 'glitch'),
    ('Pixelate', 'pixelate'),
    ('Strobe', 'strobe'),
    ('Invert', 'invert'),
    ('Mirror', 'mirror'),
    ('Zoom', 'zoom'),
    ('Posterize', 'posterize'),
    ('Detail1', 'd1'),
    ('Detail2', 'd2'),
    ('Detail3', 'd3'),
    ('Detail4', 'd4'),
    ('Detail5', 'd5'),
    ('Detail6', 'd6'),
]

# ---------------------------------------------------------------
# PIANO - teclado de 25 teclas del MiniLab MkII
# ---------------------------------------------------------------
# Confirmado en la unidad de produccion: el teclado manda en CANAL 13,
# notas 49-73 (25 teclas). Antes se asumia un rango generico 36-60 sin
# canal fijo -- pero los PADS del banco B (ver DEFAULT_MIDI) mandan notas
# 45-52 en canal 10, que se pisan numericamente con 49-52 del piano. Sin
# distinguir por canal un pad quedaria mal detectado como tecla.
#
# Estos 3 valores son solo el DEFAULT DE FABRICA -- en runtime el rango
# real y el canal se leen de los parametros /project1.Pianochannel/
# Pianolonote/Pianohinote (builder.py los crea con estos defaults), que
# se pueden RECALIBRAR con Learn Piano (2 toques: tecla mas grave + mas
# aguda, ver control_script.armLearnPiano/applyLearnPiano y
# dats/midi_logic.py _piano_range) sin tocar codigo -- necesario si se
# usa otro controlador, o si se corrio la octava con los botones
# Octave -/+ del MiniLab (eso NO le avisa al software).
PIANO_CHANNEL = 13
PIANO_LO_NOTE = 49
PIANO_HI_NOTE = 73

# ---------------------------------------------------------------
# MIDI - Arturia MiniLab MkII
# ---------------------------------------------------------------
# Estos son los canales REALES confirmados con MIDI Learn en la unidad de
# produccion (TouchDesigner Build 2025.32820, macOS). NO coinciden con los
# CC de fabrica de la Memoria 1 documentados por Arturia -- ese build de TD
# nombra los canales como 'ch1ctrl<N>' en vez de 'ch1cc<N>', y el preset
# activo en el teclado tampoco es el de fabrica. Ver docs/02 para el detalle.
#
# Con esto ya escrito, /project1/midi1 solo necesita el Device seleccionado
# para que los 6 knobs y los 5 pads funcionen desde el primer arranque, sin
# pasar por Learn. Learn sigue disponible para remapear o para otro
# controlador.
DEFAULT_MIDI = {
    # Actualizado con el mapeo REAL confirmado via MIDI Learn en la pagina
    # MIDI Mapping del usuario (todos los knobs/perillas ya aprendidos,
    # no solo los 6 originales) -- ver captura de la sesion. Detail5/6
    # se dejan sin default: el controlador no tiene mas perillas libres
    # ("ya no tengo perillas libres", dicho explicitamente antes).
    'Speed':      'ch1ctrl75',
    'Density':    'ch1ctrl72',
    'Hue':        'ch1ctrl77',
    'Chaos':      'ch1ctrl78',
    'Brightness': 'ch1ctrl94',
    'Transition': 'ch1ctrl74',
    'Next':       'ch1ctrl30',
    'Prev':       'ch1ctrl29',
    'Blackout':   'ch1ctrl28',
    'Snapshot':   'ch1ctrl27',
    'Reset':      'ch1ctrl26',
    'Audioamount': 'ch1ctrl76',
    'Bassamount': 'ch1ctrl19',
    'Midamount': 'ch1ctrl20',
    'Highamount': 'ch1ctrl17',
    'Detail1': 'ch1ctrl18',
    'Detail2': 'ch1ctrl92',
    'Detail3': 'ch1ctrl80',
    'Detail4': 'ch1ctrl73',
    'Detail5': '',
    'Detail6': '',
    # 8 efectos en los 8 pads del banco B del MiniLab mkII (pads 9-16),
    # confirmados por el usuario: canal 10, notas 45-52 consecutivas. Ya
    # vienen con default -- no hace falta Learn para que funcionen desde
    # el primer arranque (igual que los knobs).
    'Grain':     'ch10n45',
    'Glitch':    'ch10n46',
    'Pixelate':  'ch10n47',
    'Strobe':    'ch10n48',
    'Invert':    'ch10n49',
    'Mirror':    'ch10n50',
    'Zoom':      'ch10n51',
    'Posterize': 'ch10n52',
}

# Orden en que aparecen en la pagina MIDI Mapping. Esto es lo unico que
# builder.py/control_script.py necesitan para crear los pares Midi<slot>/
# Learn<slot> -- el COMPORTAMIENTO real de cada slot (si es un knob
# continuo, un pad de disparo, o un pad de efecto) vive en
# dats/midi_logic.py (CONTINUOUS/TRIGGERS/EFFECT_TRIGGERS), que es quien
# de verdad lo usa en runtime.
MIDI_SLOTS = ['Speed', 'Density', 'Hue', 'Chaos', 'Brightness', 'Transition',
              'Audioamount', 'Bassamount', 'Midamount', 'Highamount',
              'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'Detail6',
              'Next', 'Prev', 'Blackout', 'Snapshot', 'Reset',
              'Grain', 'Glitch', 'Pixelate', 'Strobe', 'Invert',
              'Mirror', 'Zoom', 'Posterize']

# Parametros que se guardan/recuperan por escena (presets).
PRESET_PARS = ['Speed', 'Density', 'Hue', 'Chaos',
               'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'Detail6']

PROJECT_PATH = '/project1'
