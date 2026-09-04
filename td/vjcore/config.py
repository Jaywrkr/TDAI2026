"""Configuracion global del rig. Editar aqui, no dentro del build."""

N_SCENES = 20
GRID_COLS = 4
GRID_ROWS = 5

# TouchDesigner NON-COMMERCIAL limita la salida a 1280x1280.
DEFAULT_OUTPUT_W = 1280
DEFAULT_OUTPUT_H = 720
MAX_OUTPUT = 1280

# Dashboard
THUMB_W = 208
THUMB_H = 117
GAP = 10
DASH_MARGIN = 18
PROGRAM_W = 640
PROGRAM_H = 360

DEFAULT_TRANSITION_SECONDS = 0.45

# Resolucion de los thumbnails del dashboard.
# 20 thumbnails a resolucion de salida es uno de los costos ocultos mas grandes.
THUMB_RES_W = 256
THUMB_RES_H = 144

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
    # Fase 3 - perillas de detalle, significan algo distinto por escena.
    # Ver @D1.._at6 en el .frag y docs/03_VISUAL_SPEC.md.
    'd1', 'd2', 'd3', 'd4', 'd5', 'd6',         # 14-19
    'time',     # 20 tiempo YA escalado por Speed (usar este para animar)
    'rtime',    # 21 tiempo real en segundos (independiente de Speed)
    'resw',     # 22 ancho de salida
    'resh',     # 23 alto de salida
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
# Rango por defecto: 2 octavas, C1-C3 (36-60), el default de fabrica segun
# Arturia. Los botones Octave -/+ del teclado corren este rango sin avisar
# al software -- si tocas con la octava desplazada, keypos se descalibra
# (sigue funcionando, solo que "grave/agudo" deja de ser preciso). No hay
# auto-calibracion todavia; ver docs/02_MIDI_MINILAB_MKII.md.
PIANO_LO_NOTE = 36
PIANO_HI_NOTE = 60

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
    'Speed':      'ch1ctrl76',
    'Density':    'ch1ctrl73',
    'Hue':        'ch1ctrl74',
    'Chaos':      'ch1ctrl80',
    'Brightness': 'ch1ctrl94',
    'Transition': 'ch1ctrl92',
    'Next':       'ch1ctrl30',
    'Prev':       'ch1ctrl29',
    'Blackout':   'ch1ctrl28',
    'Snapshot':   'ch1ctrl27',
    'Reset':      'ch1ctrl26',
    # Sin default: no tengo confirmados los CC de estos knobs todavia.
    # Se mapean con Learn (Learn Audioamount, Learn Detail1, etc.).
    'Audioamount': '',
    'Bassamount': '',
    'Midamount': '',
    'Highamount': '',
    'Detail1': '',
    'Detail2': '',
    'Detail3': '',
    'Detail4': '',
    'Detail5': '',
    'Detail6': '',
}

# Orden en que aparecen en la pagina MIDI Mapping.
MIDI_SLOTS = ['Speed', 'Density', 'Hue', 'Chaos', 'Brightness', 'Transition',
              'Audioamount', 'Bassamount', 'Midamount', 'Highamount',
              'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'Detail6',
              'Next', 'Prev', 'Blackout', 'Snapshot', 'Reset']

# Slots continuos (knobs) vs slots de disparo (pads).
MIDI_CONTINUOUS = {
    'Speed': 'Speed',
    'Density': 'Density',
    'Hue': 'Hue',
    'Chaos': 'Chaos',
    'Brightness': 'Brightness',
    'Transition': 'Transitionseconds',
    'Audioamount': 'Audioamount',
    'Bassamount': 'Bassamount',
    'Midamount': 'Midamount',
    'Highamount': 'Highamount',
    'Detail1': 'Detail1',
    'Detail2': 'Detail2',
    'Detail3': 'Detail3',
    'Detail4': 'Detail4',
    'Detail5': 'Detail5',
    'Detail6': 'Detail6',
}
MIDI_TRIGGERS = ['Next', 'Prev', 'Blackout', 'Snapshot', 'Reset']

# Parametros que se guardan/recuperan por escena (presets).
PRESET_PARS = ['Speed', 'Density', 'Hue', 'Chaos',
               'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'Detail6']

PROJECT_PATH = '/project1'
