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
    par.nodeX, par.nodeY = -1240, 200
    safe_set_first(par, ['op', 'ops'], config.PROJECT_PATH)
    safe_set(par, 'custom', True)
    safe_set(par, 'builtin', False)
    safe_set_first(par, ['parameters', 'pars', 'parameter'], 'Keypulseraw')

    trig = proj.create(triggerCHOP, 'key_trigger')
    trig.nodeX, trig.nodeY = -1080, 200
    safe_set(trig, 'threshold', 0.5)
    safe_set_first(trig, ['attack', 'attacklength'], 0.005)
    safe_set_first(trig, ['decay', 'decaylength'], 0.0)
    safe_set_first(trig, ['sustain', 'sustainlevel'], 1.0)
    safe_set_first(trig, ['release', 'releaselength'], 0.35)
    safe_set(trig, 'retrigger', True)
    connect(trig, par)

    ren = proj.create(renameCHOP, 'key_named')
    ren.nodeX, ren.nodeY = -920, 200
    safe_set(ren, 'renamefrom', '*')
    safe_set(ren, 'renameto', 'keypulse')
    connect(ren, trig)

    log('PIANO: cadena de keypulse construida')
    return ren
