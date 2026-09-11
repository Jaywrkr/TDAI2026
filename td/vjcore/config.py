"""Configuracion global del rig. Editar aqui, no dentro del build."""

import math

# Bajado de 48 a 38: se eliminaron 10 escenas (oscilloscope, inksplatter,
# wormhole, constelacion, paneles, kiosko, atlas, sampler, delta,
# bienestar) por pedido directo del usuario, y el resto se renumero para
# cerrar los huecos (mismo mecanismo de dos pasadas usado para mandar
# escenas a "la carcel").
N_SCENES = 48

# Escenas que necesitan un SEGUNDO input de imagen/video (ademas de la
# textura de control): se les agrega un Movie File In TOP como input 1
# del GLSL TOP. El resto de las escenas jamas referencia sTD2DInputs[1]
# en su .frag, asi que no les afecta.
#
# Las cuatro comparten UNA SOLA CARPETA -- la de la pagina "Media" de
# /project1 -- y muestran siempre la MISMA imagen al mismo tiempo. Eso es
# a proposito: al cambiar de escena entre ellas se ve el mismo material
# tratado de cuatro maneras distintas (eco/feedback / glitch / mandala /
# trama impresa), que en vivo se lee como una progresion y no como cuatro
# cosas sueltas. Antes la carpeta era un parametro POR ESCENA, lo que
# obligaba a cargar la ruta varias veces y a que se desincronizaran solas.
#
# Indices re-mapeados cada vez que un grupo de escenas se manda a "la
# carcel" (bloqueadas, al final de la lista): primero scene00-07
# (veins/neural/ink/metaball/caustics/flow/web/aurora) -- mediaecho
# 16->8, mediaglitch 19->11, kaleido 34->26, halftone 35->27 -- y despues
# lines/contour/ripple/orbit/dots/crackedglass/bokeh/nebula -- mediaecho
# 8->3, mediaglitch 11->6, kaleido 26->18, halftone 27->19. Y despues, al
# eliminar 7 escenas (pulso/cristal/fusion/telarana/jellyfish/
# floweroflife/eqbars) y cerrar los huecos -- mediaecho 3->2, mediaglitch
# 6->3, kaleido 18->11, halftone 19->12. Y despues, al eliminar otras 10
# (oscilloscope/inksplatter/wormhole/constelacion/paneles/kiosko/atlas/
# sampler/delta/bienestar) -- mediaecho se queda en 2, mediaglitch en 3,
# kaleido 11->8, halftone 12->9. Y al agregar 3 escenas nuevas de imagen
# (imgfuego/mosaico/persianas, indices 45/46/47) se suman al set. Los
# nombres de archivo son la fuente de verdad real (scenes.py arma esto
# leyendo el prefijo sceneNN_ de cada .frag), este set tiene que seguir
# esos mismos indices o las escenas de imagen quedan sin su segundo
# input.
MEDIA_SCENES = {2, 3, 8, 9, 45, 46, 47}

# Extensiones que control_script.mediaFiles() acepta de la carpeta comun.
MEDIA_EXTS = ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff',
              '.mov', '.mp4', '.webp')

# Ruta de arranque del parametro Mediafolder -- para no tener que pegarla
# a mano cada vez que se reconstruye el proyecto desde cero. Es SOLO el
# valor inicial: sigue siendo un campo de texto editable en /project1 ->
# Media, y una maquina distinta (o un cambio de carpeta) lo pisa sin
# tocar este archivo.
DEFAULT_MEDIA_FOLDER = '/Users/juanjaramillo/Desktop/TD2026/IMAGENES'

# COMO CAMBIA DE IMAGEN. Un solo parametro (Mediamode) decide quien
# manda; el resto de los controles (Next/Prev/Random/Lock) funcionan
# siempre, en cualquier modo.
#   MANUAL  no cambia sola. Solo Next/Prev/Random (pad o dashboard).
#   TIEMPO  cada N segundos (Mediaseconds; en 0 el intervalo lo saca de
#           la perilla Speed, que es como venia funcionando).
#   BEAT    una imagen por golpe de bombo. Muy rapido, casi estrobo.
#   COMPAS  una imagen cada N golpes (Mediabeats) -- esto es lo que de
#           verdad se usa en un set: cambia "en el 1" del compas.
#   PIANO   la tecla ELIGE la imagen. Las 25 teclas se reparten sobre la
#           carpeta entera, asi que tocar una escala pasa las imagenes en
#           orden y volver a una tecla vuelve exactamente a esa imagen.
MEDIA_MODES = ['MANUAL', 'TIEMPO', 'BEAT', 'COMPAS', 'PIANO']

# GRID_ROWS se calcula SOLO a partir de N_SCENES (con GRID_ROWS=6 fijo
# quedo un bug real: al pasar de 36 a 46 escenas, dashboard.build()
# seguia poniendo un tile por escena mas alla de la fila 5, fuera del
# area de grilla reservada -- invisibles o pisando otros paneles en un
# build real). Con el ceil() la grilla siempre tiene exactamente las
# filas que necesita, sin volver a tocar esto a mano cada vez que se
# agregan o sacan escenas.
GRID_COLS = 6
GRID_ROWS = math.ceil(N_SCENES / GRID_COLS)

# TouchDesigner NON-COMMERCIAL limita la salida a 1280x1280.
DEFAULT_OUTPUT_W = 1280
DEFAULT_OUTPUT_H = 720
MAX_OUTPUT = 1280

# Dashboard
# Thumbnails achicados (208x117 -> 150x84, misma proporcion) al pasar de
# 20 a 34 escenas -- si se mantenia el tamano viejo con 36 casilleros el
# dashboard entero quedaba enorme.
# Achicados otra vez (150 -> 120, y 104 -> 84 abajo) al pasar GRID_ROWS
# de fijo en 6 a dinamico: con 46 escenas la grilla necesita 8 filas, y
# al tile viejo no le entraban sin invadir el panel de Master FX de
# abajo. Con este tamano las 8 filas caben en el mismo alto que ya
# reservaba la columna derecha (ver mas abajo), asi que el dashboard NO
# crece -- de hecho el dashboard entero se angosta un poco, porque la
# grilla tambien se achica a lo ancho.
THUMB_W = 120
# Subido de 84 a 104 para hacerle lugar a la ETIQUETA (numero + nombre)
# abajo de cada miniatura. Sin nombre, una grilla de 34 casilleros obliga
# a acordarse de memoria que la 17 es "triangles" -- y con las miniaturas
# congeladas (ver POSTER FRAMES abajo) no habia forma de saberlo.
# El alto del dashboard NO lo manda la grilla sino la columna derecha,
# asi que agrandar el tile no agranda el dashboard -- pero si GRID_ROWS
# crece (ver arriba), la grilla SI puede empezar a comerse el hueco de
# abajo (Master FX + preview + TAKE/PANICO), que es lo que paso con 46
# escenas y forzo bajar esto de 104 a 84.
THUMB_H = 84
THUMB_LABEL_H = 18

# Antes vivian SOLO adentro de dashboard.build() (definian el alto
# reservado del panel), asi que diagnostics.py no tenia forma de saber
# cuantas lineas entran de verdad y podia armar mas texto del que cabe
# -- Text TOP no hace word-wrap (dashboard._build_text_panel pone
# wordwrap=False), asi que lo que sobra se CORTA en silencio, sin
# aviso. Con esto centralizado, diagnostics.update() puede truncar el
# panel de status el mismo antes de escribirlo (ver ese archivo) en vez
# de confiar en que nunca se junten demasiados avisos a la vez.
STATUS_FONTSIZE = 12
STATUS_MAX_LINES = 22

# Leyenda de Detail (que hace cada perilla D1-D6 EN LA ESCENA ACTIVA,
# ver shader.parse_detail_legend). Son SIEMPRE como mucho 6 lineas (una
# por perilla documentada), nunca menos previsible que el panel de
# status -- pero a fontsize 13 y 110px de alto (lo que tenia este panel
# antes) solo entraban 5 de esas 6 lineas: la convencion del repo pide
# documentar las 6 perillas en CADA .frag, asi que la ultima linea
# (D6) se cortaba en silencio en TODAS las escenas, siempre, no en un
# caso raro. Subido a 130 -- entran las 6 con margen -- usando el
# colchon de 30px que sobraba entre la columna derecha real (1014px) y
# el limite de 1080p (el dashboard sigue entrando: 1070 de 1080).
LEGEND_H = 130
LEGEND_GAP = 10

# ---------------------------------------------------------------
# POSTER FRAMES (miniaturas pre-renderizadas)
# ---------------------------------------------------------------
# Con Previewall=False -- que es lo que salvo el FPS (ver builder.py) --
# solo cocinan la escena activa y la del preview. Las otras 32 miniaturas
# muestran el ultimo frame que alcanzaron a cocinar, o NEGRO si esa
# escena no se visito nunca en la sesion. O sea: la grilla ocupaba el
# 55% del dashboard y no comunicaba nada.
#
# La salida es guardar en disco un "poster" de cada escena (se hornean
# con el boton Hornear Miniaturas -- control_script.bakeThumbs) y que la
# grilla muestre ESOS archivos en vez del TOP vivo. Grilla completa y
# legible a costo cero de GPU, sin volver a tocar Previewall.
THUMBS_DIRNAME = 'thumbs'
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
    # Fase 4 - MASTER FX. NO los lee ninguna escena: los leen los shaders
    # de post-proceso del program bus (ver program.py), que reciben esta
    # misma textura de control como un input mas. Viven aca y no como
    # uniforms del GLSL TOP por el mismo motivo que todo lo demas: los
    # nombres de uniform cambian entre builds de TD, una textura no.
    'trails',      # 22 cantidad de estela (0 = bypass real, ver program.py)
    'trailszoom',  # 23 zoom del feedback   (0.5 = neutro)
    'trailsrot',   # 24 giro del feedback   (0.5 = neutro)
    'layermix',    # 25 mezcla A/B en modo dos capas
    'blendmode',   # 26 indice de modo de mezcla (0..5, ver program.py)
    # Fase 5 - LOOK MAESTRO. Se aplican en el FOOTER (shader.py), o sea
    # despues del render de CUALQUIER escena: es el "color del show"
    # completo, no un ajuste por escena. En 0 no tocan absolutamente
    # nada (el set se ve exactamente igual que antes de existir esto).
    'look',        # 27 indice de look (0 = NEUTRO, ver config.LOOKS)
    'lookamt',     # 28 cuanto se aplica el look (0 = nada)
    'palette',     # 29 cuanto se fuerza la paleta del show (0 = nada)
    'palettehue',  # 30 hue base de esa paleta
    'palettespread',  # 31 que tan abierta es (mono <-> dos tonos lejanos)
    # Fase 3 - perillas de detalle, significan algo distinto por escena.
    # Ver @D1.._at6 en el .frag y docs/03_VISUAL_SPEC.md.
    'd1', 'd2', 'd3', 'd4', 'd5', 'd6',         # 32-37
    'time',     # 38 tiempo YA escalado por Speed (usar este para animar)
    'rtime',    # 39 tiempo real en segundos (independiente de Speed)
    'resw',     # 40 ancho de salida
    'resh',     # 41 alto de salida
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
    # 'keypulse' y los 8 efectos de pad (grain..posterize) NO van aca a
    # proposito -- ver FX_TRIGGER_PARS mas abajo. Si un raw de estos
    # entrara tal cual a la textura de control, el pad durearia en
    # pantalla los ~2 frames que Python tarda en resetearlo (el bug que
    # tenian: "nunca se llega a un efecto"). En vez de eso pasan por una
    # envolvente Lag CHOP (midi.build_effects_envelope, igual que
    # build_keypulse ya hacia solo para el piano) que estira esos ~2
    # frames a FX_DECAY_SECONDS reales y SI se ve.
    ('Trails', 'trails'),
    ('Trailszoom', 'trailszoom'),
    ('Trailsrotate', 'trailsrot'),
    ('Layermix', 'layermix'),
    ('Blendmode', 'blendmode'),
    ('Look', 'look'),
    ('Lookamount', 'lookamt'),
    ('Palettelock', 'palette'),
    ('Palettehue', 'palettehue'),
    ('Palettespread', 'palettespread'),
    ('Detail1', 'd1'),
    ('Detail2', 'd2'),
    ('Detail3', 'd3'),
    ('Detail4', 'd4'),
    ('Detail5', 'd5'),
    ('Detail6', 'd6'),
]

# ---------------------------------------------------------------
# ENVOLVENTE DE LOS 8 EFECTOS DE PAD (Grain..Posterize)
# ---------------------------------------------------------------
# Mismo par (parametro raw en /project1, nombre de canal en CTRL_CHANNELS)
# que PAR_CHANNELS, pero via midi.build_effects_envelope() -- un Lag CHOP,
# no un pasamanos directo. midi_logic.py sigue escribiendo la velocidad
# del pad en el parametro raw y reseteandolo a los ~2 frames (eso es solo
# el FLANCO que la envolvente necesita para dispararse); FX_DECAY_SECONDS
# es lo que de verdad decide cuanto dura el efecto en pantalla.
FX_TRIGGER_PARS = [
    ('Grain', 'grain'),
    ('Glitch', 'glitch'),
    ('Pixelate', 'pixelate'),
    ('Strobe', 'strobe'),
    ('Invert', 'invert'),
    ('Mirror', 'mirror'),
    ('Zoom', 'zoom'),
    ('Posterize', 'posterize'),
]

# Mas largo que el release del piano (0.35s, ver midi.build_keypulse):
# un pad es un gesto deliberado de VJ, no una nota tocada rapido -- tiene
# que leerse con claridad en pantalla, no solo destellar. Antes de esta
# envolvente, un pad duraba ~2 frames (~0.03s a 60fps): invisible.
#
# Subido de 0.6 a 1.4, y ahora a 2.2 (pedido explicito otra vez: "solo
# el glitch se llega a anotar, un segundo y levemente... la idea es que
# funcione mucho mas"). Con 1.4s un toque corto de pad seguia leyendose
# como un parpadeo breve -- 2.2s alcanza para que el ojo lo registre con
# claridad incluso en el toque mas corto.
FX_DECAY_SECONDS = 2.2

# ---------------------------------------------------------------
# MASTER FX - modos de mezcla del modo DOS CAPAS
# ---------------------------------------------------------------
# El indice (0..5) viaja por el canal 'blendmode' de la textura de
# control hasta el shader de mezcla (program.py). Esta lista es la unica
# fuente de verdad del NOMBRE de cada modo: la usan el panel del
# dashboard y control_script.nextBlendMode() para no repetirlos a mano.
# Si se agrega uno, hay que agregarlo TAMBIEN al if/else del shader.
BLEND_MODES = ['MIX', 'ADD', 'SCREEN', 'MULTIPLY', 'DIFFERENCE', 'LIGHTEN']

# ---------------------------------------------------------------
# LOOK MAESTRO - el "color del show"
# ---------------------------------------------------------------
# Mismo trato que BLEND_MODES: el indice viaja por el canal 'look' hasta
# el FOOTER (shader.py) y esta lista es la unica fuente del nombre. El
# indice 0 tiene que ser SIEMPRE el neutro -- es el default, y garantiza
# que este sistema entero no cambie nada hasta que se toque a proposito.
LOOKS = ['NEUTRO', 'NEON FRIO', 'AMBAR FILMICO', 'MONO CONTRASTE']

# ---------------------------------------------------------------
# OVERLAY DE TEXTO - nombres de artista, tipeados en vivo
# ---------------------------------------------------------------
# El texto en si (Textcontent) se tipea a mano en el dashboard, no sale
# de aca -- lo unico que vive en config.py es el BANCO DE FUENTES
# (mismo trato que BLEND_MODES/LOOKS: el indice viaja en el parametro
# Font, esta lista es la unica fuente del nombre) y cuanto tarda el
# fundido al mostrar/ocultar. Nombres de fuente que TD reconoce por
# nombre de sistema -- si una no esta instalada, Text TOP cae a una
# generica sola, no rompe nada.
FONTS = ['Arial', 'Impact', 'Courier New', 'Georgia', 'Verdana']

# Cuanto tarda el fundido al prender/apagar Textvisible. Mismo patron
# que la transicion de escenas (Transitionseconds): Parametro (0/1) ->
# Lag CHOP con este tiempo -> rampa nativa, sin ningun run() por frame.
TEXT_FADE_SECONDS = 0.5

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
    # antes se dejaban sin default ("ya no tengo perillas libres"), pero
    # el usuario libero/reuso dos controles mas: ch1ctrl2 (un CC que no
    # estaba en uso) y ch1pitch (la rueda de pitch bend, reusada como
    # perilla continua).
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
    'Detail5': 'ch1ctrl2',
    'Detail6': 'ch1pitch',
    # 8 efectos en los 8 pads del banco B del MiniLab mkII (pads 9-16).
    # Los primeros 5 (Grain-Invert) se remapearon de las notas 45-49 a
    # 37-41 -- confirmado por el usuario en la pagina MIDI Mapping.
    # Mirror/Zoom/Posterize se quedaron en 50-52. Ya vienen con default
    # -- no hace falta Learn para que funcionen desde el primer arranque
    # (igual que los knobs).
    'Grain':     'ch10n37',
    'Glitch':    'ch10n38',
    'Pixelate':  'ch10n39',
    'Strobe':    'ch10n40',
    'Invert':    'ch10n41',
    'Mirror':    'ch10n50',
    'Zoom':      'ch10n51',
    'Posterize': 'ch10n52',
    # Carpeta comun de media -- tambien confirmados en la misma captura,
    # antes sin default.
    'Medianext': 'ch1ctrl24',
    'Mediaprev': 'ch1ctrl23',
    'Medialock': 'ch1ctrl25',
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
              'Mirror', 'Zoom', 'Posterize',
              # Master FX (Fase 4). Sin default en DEFAULT_MIDI a
              # proposito: el controlador ya no tiene perillas ni pads
              # libres ("ya no tengo perillas libres", dicho explicito),
              # asi que estos quedan listos para Learn el dia que se
              # libere alguno -- mientras tanto se manejan desde el
              # dashboard y los parametros.
              'Trails', 'Layermix',
              'Trailstoggle', 'Duallayer', 'Blendnext', 'Layerswap',
              # Fase 5. 'Panic' y 'Take' son los dos que de verdad
              # conviene tener en un pad fisico si se libera alguno: son
              # los unicos que se aprietan con urgencia.
              'Lookamount', 'Palettelock',
              'Take', 'Cuemode', 'Cuenext', 'Cueprev', 'Panic',
              # Carpeta comun de media (ver MEDIA_SCENES). 'Medianext' es
              # el unico que de verdad pide un pad fisico: en modo
              # MANUAL es como se pasan las imagenes a mano.
              'Medianext', 'Mediaprev', 'Mediarandom', 'Medialock',
              # Perilla continua: recorre la carpeta ENTERA por posicion
              # (0 = primera imagen, 1 = ultima), como un scrub. Funciona
              # en cualquier Mediamode -- es un gesto manual directo,
              # igual que Medianext/Mediaprev, solo que continuo en vez
              # de a pasos. Sin default: el controlador no tiene
              # perillas libres, queda lista para Learn el dia que se
              # libere una (pedido explicito del usuario).
              'Mediascrub',
              # Overlay de texto. 'Textvisible' es el que de verdad pide
              # un pad: separa "ya lo tipee" de "que aparezca ahora",
              # justo cuando entra el artista.
              'Textvisible', 'Fontnext']

# Parametros que se guardan/recuperan por escena (presets).
PRESET_PARS = ['Speed', 'Density', 'Hue', 'Chaos',
               'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'Detail6']

PROJECT_PATH = '/project1'

# ---------------------------------------------------------------
# SEÑALIZACION DE LA RED
# ---------------------------------------------------------------
# Color de fondo (0..1 RGB) para los nodos que hay que tocar A MANO antes
# de un show -- los mismos 4 pasos del reporte "SIGUIENTE PASO MANUAL" al
# final del build (builder.py._mark_setup_nodes). Puramente cosmetico:
# no cambia nada de como corre el rig, solo ayuda a encontrarlos al abrir
# la red por primera vez.
SETUP_NODE_COLOR = (1.0, 0.55, 0.0)             # naranja -- hace falta si o si
SETUP_NODE_COLOR_OPTIONAL = (0.55, 0.42, 0.85)  # violeta -- opcional (LEDs de pads)
