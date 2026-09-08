"""MIDI: Arturia MiniLab MkII (o cualquier controlador).

Decisiones clave, distintas del script original:

1. El MIDI **escribe** en los parametros de /project1; NO los secuestra con
   expresiones. Con el metodo anterior los sliders del dashboard quedaban
   inservibles: cualquier valor que pusieras a mano lo pisaba la expresion.
   Ahora knob y mano conviven, y solo se ejecuta Python cuando de verdad se
   mueve un control (evento), no 60 veces por segundo.

2. MIDI LEARN. No dependes de adivinar los CC de fabrica: armas un slot,
   mueves el knob, queda mapeado.

3. El mapeo se guarda en disco (td/config/midi_map.json) y se recarga al
   arrancar, asi que reconstruir el rig ya no borra tu configuracion.
"""

# TouchDesigner inyecta sus globales (op, run, absTime, project y las
# constantes de tipo como baseCOMP o glslTOP) en su propio namespace y en los
# DATs, pero NO en modulos importados desde sys.path. Hay que pedirlos.
# El try existe para que las herramientas de td/tools/ puedan importar este
# modulo fuera de TouchDesigner.
try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass


from . import config
from .tdutil import safe_set, safe_set_first, safe_expr, connect, log


def build(proj, dat_text):
    try:
        midi_in = proj.create(midiinCHOP, 'midi1')
        midi_in.nodeX, midi_in.nodeY = -1400, 380
    except Exception as e:
        log('ERROR creando midi1: {}'.format(e))
        return None, None

    logic = proj.create(chopexecuteDAT, 'midi_logic')
    logic.nodeX, logic.nodeY = -1240, 380
    safe_set(logic, 'chop', 'midi1')
    safe_set(logic, 'valuechange', True)
    safe_set(logic, 'offtoon', True)
    logic.text = dat_text

    # --- MIDI OUT: LEDs de los pads (Fase 5) ---
    # Se crea siempre pero no manda nada hasta que /project1.Padleds este
    # en ON (default OFF). Hace falta elegirle el mismo Device que a
    # midi1, igual que con la entrada.
    #
    # SIN VERIFICAR: el color de los pads del MiniLab mkII se setea por
    # SysEx propietario de Arturia, que no se pudo confirmar contra la
    # unidad real. Lo implementado (note-on al pad, ver
    # control_script.sendPadLed) es el metodo que funciona en varios
    # controladores y esta listo para probar; si esta unidad no responde
    # asi, hay que cambiar esa funcion y nada mas -- el resto del rig no
    # depende de esto.
    try:
        midi_out = proj.create(midioutCHOP, 'midi_out')     # noqa: F821
        midi_out.nodeX, midi_out.nodeY = -1240, 500
        log('MIDI: midi_out creado (LEDs de pads, falta elegir el Device)')
    except Exception as e:
        midi_out = None
        log('MIDI: midi_out no disponible ({})'.format(type(e).__name__))

    log('MIDI: midi1 + midi_logic creados (falta elegir el Device en midi1)')
    return midi_in, logic


def build_keypulse(proj):
    """Envolvente que decae sola tras cada tecla del piano.

    NO se arma con un Select CHOP de canales de nota: el nombre exacto que
    TD le da a un canal de nota varia entre builds (ya paso con los CC:
    'ch1cc112' en un build, 'ch1ctrl76' en otro) y adivinar mal aca
    significaria otro ciclo de "no funciona, prueba otro nombre". En vez de
    eso, midi_logic.py detecta la tecla en Python (evento, no por frame) y
    escribe 1.0 en el parametro 'Keypulseraw'; esta cadena SOLO transforma
    ese pulso en una envolvente Attack/Release nativa, igual que kick->beat.
    Si el patron de nombre de canal de nota estuviera mal, el sintoma es
    "el anillo de tecla no aparece nunca" -- nunca un build roto.
    """
    par = proj.create(parameterCHOP, 'key_par')
    par.nodeX, par.nodeY = -1240, 1000
    safe_set_first(par, ['op', 'ops'], config.PROJECT_PATH)
    safe_set(par, 'custom', True)
    safe_set(par, 'builtin', False)
    safe_set_first(par, ['parameters', 'pars', 'parameter'], 'Keypulseraw')

    trig = proj.create(triggerCHOP, 'key_trigger')
    trig.nodeX, trig.nodeY = -1080, 1000
    safe_set(trig, 'threshold', 0.5)
    safe_set_first(trig, ['attack', 'attacklength'], 0.005)
    safe_set_first(trig, ['decay', 'decaylength'], 0.0)
    safe_set_first(trig, ['sustain', 'sustainlevel'], 1.0)
    safe_set_first(trig, ['release', 'releaselength'], 0.35)
    safe_set(trig, 'retrigger', True)
    connect(trig, par)

    ren = proj.create(renameCHOP, 'key_named')
    ren.nodeX, ren.nodeY = -920, 1000
    safe_set(ren, 'renamefrom', '*')
    safe_set(ren, 'renameto', 'keypulse')
    connect(ren, trig)

    log('PIANO: cadena de keypulse construida')
    return ren


def build_effects_envelope(proj):
    """Envolvente que decae sola tras cada pad de efecto (Grain, Glitch,
    Pixelate, Strobe, Invert, Mirror, Zoom, Posterize).

    Bug real que esto arregla: antes, esos 8 parametros iban DIRECTO a la
    textura de control (via config.PAR_CHANNELS, sin ninguna cadena en el
    medio). midi_logic.py escribe la velocidad del pad en el parametro y
    lo resetea a 0 dos frames despues (_resetEffect) -- eso genera el
    FLANCO que una envolvente necesita para dispararse, pero SIN
    envolvente esos ~2 frames (~0.03s a 60fps) eran literalmente todo lo
    que llegaba a pantalla. Invisible. Es el mismo patron que
    build_keypulse() ya resolvia para el piano (por eso 'keypulse' si se
    veia), solo que nunca se replico aca.

    LAG, no Trigger: a diferencia de 'keypulse' (que siempre dispara a
    1.0 -- la intensidad la aporta 'keyvel' aparte), estos parametros SI
    llevan la velocidad del pad en su propio valor (val = velocidad/127,
    ver midi_logic.EFFECT_TRIGGERS) y el shader la usa directo para medir
    cuanto efecto aplicar. Un Trigger CHOP fuerza todo a 1.0 y borraria
    esa sensibilidad; un Lag CHOP conserva el pico y solo suaviza cuanto
    tarda en subir y en bajar -- igual que kick_raw -> kick en audio.py.
    """
    pars = [p for p, _ in config.FX_TRIGGER_PARS]
    chans = [c for _, c in config.FX_TRIGGER_PARS]

    par = proj.create(parameterCHOP, 'fx_par')
    par.nodeX, par.nodeY = -1240, 1120
    safe_set_first(par, ['op', 'ops'], config.PROJECT_PATH)
    safe_set(par, 'custom', True)
    safe_set(par, 'builtin', False)
    safe_set_first(par, ['parameters', 'pars', 'parameter'], ' '.join(pars))

    lag = proj.create(lagCHOP, 'fx_lag')          # noqa: F821
    lag.nodeX, lag.nodeY = -1080, 1120
    safe_set(lag, 'lag1', 0.008)                  # subida: casi instantanea
    safe_set(lag, 'lag2', config.FX_DECAY_SECONDS)  # bajada: la que se ve
    safe_set_first(lag, ['lagmethod', 'method'], 'slew')
    connect(lag, par)

    ren = proj.create(renameCHOP, 'fx_named')
    ren.nodeX, ren.nodeY = -920, 1120
    safe_set(ren, 'renamefrom', ' '.join(pars))
    safe_set(ren, 'renameto', ' '.join(chans))
    connect(ren, lag)

    log('FX: cadena de envolvente de pads construida ({}s)'.format(
        config.FX_DECAY_SECONDS))
    return ren
