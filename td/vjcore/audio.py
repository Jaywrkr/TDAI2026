"""Cadena de audio reactivo.

Cambios respecto al script original:
- Se convierte a MONO antes de filtrar (mitad de trabajo de CPU).
- El kick deja de ser "bass - umbral" y pasa a ser deteccion de transitorio
  real: bass instantaneo menos su media movil. Eso dispara con el golpe, no
  con la energia sostenida de graves.
- Se agrega 'beat': envolvente Attack/Release nativa (Trigger CHOP), que es
  lo que de verdad sirve para flashes en los visuales.
- Todo queda en CHOPs nativos: cero Python por frame.

Fase 2 (estabilidad de audio):
- 'Audioamount' (master) y 'Bassamount'/'Midamount'/'Highamount' (por banda)
  son perillas de performance de 0 a 1. Se pliegan DENTRO de la expresion de
  ganancia que ya existia -- cero nodos nuevos. En 0, esa banda deja de
  tocar los visuales por completo.
- Cada banda tiene dos copias: la "rapida" (_envelope, la que ya existia)
  alimenta la deteccion de kick, que necesita el transitorio sin demora. Una
  segunda etapa (_smooth_out, Lag CHOP con ataque rapido / caida lenta) es
  la que de verdad llega a los visuales como uBass/uMid/uHigh/uLevel. Sin
  esto el ruido de sala del microfono se notaba como temblor en cualquier
  visual que reaccionara al nivel de audio.
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


from .tdutil import safe_set, safe_set_first, safe_expr, connect, log

# Bandas en Hz
BASS_HI = 180.0
MID_LO = 180.0
MID_HI = 2000.0
HIGH_LO = 2000.0
HIGH_HI = 12000.0


def _filter(proj, src, name, ftype, cutoff, x, y):
    f = proj.create(audiofilterCHOP, name)
    f.nodeX, f.nodeY = x, y
    safe_set(f, 'filter', ftype)
    safe_set(f, 'units', 'frequency')
    safe_set_first(f, ['cutofffrequency', 'cutoff', 'frequency'], cutoff)
    safe_set(f, 'rolloff', 24)
    safe_set(f, 'drywet', 1)
    connect(f, src)
    return f


def _envelope(proj, src, name, x, y, smooth, gain_par, amount_par=None):
    """RMS -> suavizado -> ganancia*amount -> clamp 0..1.

    amount_par es la perilla de performance de esa banda (Bassamount,
    Midamount, Highamount). Se multiplica DENTRO de la misma expresion de
    ganancia que ya existia -- no agrega ningun nodo, es gratis. El master
    'Audioamount' siempre se aplica, tenga o no la banda su propia perilla.
    """
    an = proj.create(analyzeCHOP, name + '_rms')
    an.nodeX, an.nodeY = x, y
    safe_set(an, 'function', 'rms')
    connect(an, src)

    fl = proj.create(filterCHOP, name + '_smooth')
    fl.nodeX, fl.nodeY = x + 150, y
    safe_set(fl, 'type', 'gaussian')
    safe_set(fl, 'units', 'seconds')
    safe_set(fl, 'width', smooth)
    connect(fl, an)

    mt = proj.create(mathCHOP, name + '_gain')
    mt.nodeX, mt.nodeY = x + 300, y
    parts = ["op('/project1').par.{}.eval()".format(gain_par)]
    if amount_par:
        parts.append("op('/project1').par.{}.eval()".format(amount_par))
    parts.append("op('/project1').par.Audioamount.eval()")
    safe_expr(mt, 'gain', ' * '.join(parts))
    safe_set(mt, 'clamplow', True)
    safe_set(mt, 'clamphigh', True)
    safe_set_first(mt, ['clamplowvalue', 'clamplowval'], 0.0)
    safe_set_first(mt, ['clamphighvalue', 'clamphighval'], 1.0)
    connect(mt, fl)
    return mt


def _smooth_out(proj, src, name, x, y, attack=0.05, release=0.20):
    """Segunda etapa de suavizado SOLO para el canal que ven los visuales.

    Ataque rapido / caida lenta: el golpe entra sin demora perceptible pero
    la caida no tiembla. No se usa en la cadena de deteccion de kick (ahi
    la rapidez del envelope de _envelope() es lo que hace que el transitorio
    se detecte bien) -- solo en la copia que termina en uBass/uMid/uHigh.
    """
    lag = proj.create(lagCHOP, name)
    lag.nodeX, lag.nodeY = x, y
    safe_set(lag, 'lag1', attack)
    safe_set(lag, 'lag2', release)
    safe_set_first(lag, ['lagmethod', 'method'], 'slew')
    connect(lag, src)
    return lag


def build(proj):
    """Devuelve un CHOP con los canales level/bass/mid/high/kick/beat, o None."""
    try:
        audio_in = proj.create(audiodeviceinCHOP, 'audio1')
        audio_in.nodeX, audio_in.nodeY = -1400, 700
    except Exception as e:
        log('ERROR creando audio1: {}'.format(e))
        return None

    # Mono: la mitad del trabajo de los filtros.
    mono = proj.create(mathCHOP, 'audio_mono')
    mono.nodeX, mono.nodeY = -1240, 700
    safe_set_first(mono, ['chopop', 'chanop'], 'average')
    connect(mono, audio_in)

    level_env = _envelope(proj, mono, 'a_level', -1060, 860, 0.15, 'Mastergain')
    level = _smooth_out(proj, level_env, 'a_level_out', -900, 900)

    bass_f = _filter(proj, mono, 'a_bass_lp', 'lowpass', BASS_HI, -1060, 700)
    # bass_env se queda RAPIDO a proposito: lo usa la deteccion de kick de
    # abajo, y suavizarlo de mas ahi mata el transitorio que se busca
    # detectar. bass (mas abajo) es la copia suavizada que ven los visuales.
    bass_env = _envelope(proj, bass_f, 'a_bass', -900, 700, 0.07, 'Bassgain',
                         'Bassamount')

    mid_hp = _filter(proj, mono, 'a_mid_hp', 'highpass', MID_LO, -1060, 540)
    mid_lp = _filter(proj, mid_hp, 'a_mid_lp', 'lowpass', MID_HI, -900, 540)
    mid_env = _envelope(proj, mid_lp, 'a_mid', -740, 540, 0.09, 'Midgain',
                        'Midamount')
    mid = _smooth_out(proj, mid_env, 'a_mid_out', -580, 540)

    hi_hp = _filter(proj, mono, 'a_high_hp', 'highpass', HIGH_LO, -1060, 380)
    hi_lp = _filter(proj, hi_hp, 'a_high_lp', 'lowpass', HIGH_HI, -900, 380)
    high_env = _envelope(proj, hi_lp, 'a_high', -740, 380, 0.06, 'Highgain',
                         'Highamount')
    high = _smooth_out(proj, high_env, 'a_high_out', -580, 380)

    # ---- KICK: transitorio = bass - media movil del bass ----
    # Usa bass_env (rapido), NO la copia suavizada de mas abajo.
    slow = proj.create(filterCHOP, 'a_bass_slow')
    slow.nodeX, slow.nodeY = -600, 780
    safe_set(slow, 'type', 'gaussian')
    safe_set(slow, 'units', 'seconds')
    safe_expr(slow, 'width', "op('/project1').par.Kickwindow")
    connect(slow, bass_env)

    diff = proj.create(mathCHOP, 'a_kick_diff')
    diff.nodeX, diff.nodeY = -440, 740
    safe_set_first(diff, ['chopop', 'chanop'], 'subtract')
    connect(diff, bass_env, 0)
    connect(diff, slow, 1)

    # Copia suavizada de bass para el canal que ven los visuales -- se crea
    # DESPUES de que kick ya tomo su entrada de bass_env, para no competir.
    bass = _smooth_out(proj, bass_env, 'a_bass_out', -580, 660)

    kick = proj.create(mathCHOP, 'a_kick')
    kick.nodeX, kick.nodeY = -280, 740
    safe_expr(kick, 'gain', "op('/project1').par.Kickgain")
    safe_set(kick, 'clamplow', True)
    safe_set(kick, 'clamphigh', True)
    safe_set_first(kick, ['clamplowvalue', 'clamplowval'], 0.0)
    safe_set_first(kick, ['clamphighvalue', 'clamphighval'], 1.0)
    connect(kick, diff)

    # ---- BEAT: envolvente AR nativa ----
    beat = proj.create(triggerCHOP, 'a_beat')
    beat.nodeX, beat.nodeY = -120, 740
    safe_expr(beat, 'threshold', "op('/project1').par.Kickthreshold")
    safe_set_first(beat, ['attack', 'attacklength'], 0.005)
    safe_set_first(beat, ['decay', 'decaylength'], 0.0)
    safe_set_first(beat, ['sustain', 'sustainlevel'], 1.0)
    safe_set_first(beat, ['release', 'releaselength'], 0.22)
    safe_set(beat, 'retrigger', True)
    connect(beat, kick)

    # ---- Renombrar y unir ----
    named = []
    for src, chan, x, y in [(level, 'level', -520, 900),
                            (bass, 'bass', -520, 620),
                            (mid, 'mid', -520, 500),
                            (high, 'high', -520, 380),
                            (kick, 'kick', -120, 640),
                            (beat, 'beat', 40, 740)]:
        r = proj.create(renameCHOP, 'a_n_' + chan)
        r.nodeX, r.nodeY = x + 180, y
        safe_set(r, 'renamefrom', '*')
        safe_set(r, 'renameto', chan)
        connect(r, src)
        named.append(r)

    merge = proj.create(mergeCHOP, 'audio_ctrl')
    merge.nodeX, merge.nodeY = 200, 640
    for i, n in enumerate(named):
        connect(merge, n, i)

    log('AUDIO: cadena construida (level/bass/mid/high/kick/beat)')
    return merge
