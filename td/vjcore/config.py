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
    'time',     # 11 tiempo YA escalado por Speed (usar este para animar)
    'rtime',    # 12 tiempo real en segundos (independiente de Speed)
    'resw',     # 13 ancho de salida
    'resh',     # 14 alto de salida
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
]

# ---------------------------------------------------------------
# MIDI - Arturia MiniLab MkII
# ---------------------------------------------------------------
# OJO: estos son los valores de fabrica REPORTADOS de la Memoria 1.
# NO los des por ciertos: usa MIDI Learn (ver docs/02_MIDI_MINILAB_MKII.md).
# Los pads de fabrica salen por canal 10, no por canal 1.
DEFAULT_MIDI = {
    'Speed':      'ch1cc112',   # Encoder 1
    'Density':    'ch1cc74',    # Encoder 2
    'Hue':        'ch1cc71',    # Encoder 3
    'Chaos':      'ch1cc76',    # Encoder 4
    'Brightness': 'ch1cc77',    # Encoder 5
    'Transition': 'ch1cc93',    # Encoder 6
    'Next':       'ch10n36',    # Pad 1
    'Prev':       'ch10n37',    # Pad 2
    'Blackout':   'ch10n38',    # Pad 3
    'Snapshot':   'ch10n39',    # Pad 4
    'Reset':      'ch10n40',    # Pad 5
}

# Orden en que aparecen en la pagina MIDI Mapping.
MIDI_SLOTS = ['Speed', 'Density', 'Hue', 'Chaos', 'Brightness', 'Transition',
              'Next', 'Prev', 'Blackout', 'Snapshot', 'Reset']

# Slots continuos (knobs) vs slots de disparo (pads).
MIDI_CONTINUOUS = {
    'Speed': 'Speed',
    'Density': 'Density',
    'Hue': 'Hue',
    'Chaos': 'Chaos',
    'Brightness': 'Brightness',
    'Transition': 'Transitionseconds',
}
MIDI_TRIGGERS = ['Next', 'Prev', 'Blackout', 'Snapshot', 'Reset']

# Parametros que se guardan/recuperan por escena (presets).
PRESET_PARS = ['Speed', 'Density', 'Hue', 'Chaos']

PROJECT_PATH = '/project1'
