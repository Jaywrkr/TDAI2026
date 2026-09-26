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

Auto-gain (normalizacion automatica por banda):
- Antes cada banda era RMS * ganancia FIJA, recortado a 1.0. En un venue
  real el volumen cambia 15-20 dB entre prueba de sonido, apertura, pico y
  cambio de DJ: en lo fuerte el bass quedaba clavado en 1.0 (los visuales
  dejaban de reaccionar justo en el drop) y en lo suave casi no se movia
  nada; el umbral del beat, absoluto, disparaba sin parar o nunca.
- Ahora cada banda se divide por su propio PICO RECIENTE (Lag CHOP: sube
  al instante, baja en Agcrelease segundos). 1.0 = "lo mas fuerte de los
  ultimos segundos", suene la sala como suene. Como el kick sale de la
  banda de graves ya normalizada, su umbral queda relativo solo.
- Piso (Agcfloor): debajo de ese nivel no se amplifica mas -- el silencio
  entre temas no se convierte en "musica". Esta expresado como fraccion
  del fondo de escala de la ganancia fija de fabrica, asi que un solo
  valor sirve para las 4 bandas.
- Las ganancias por banda (Mastergain, Bassgain...) siguen existiendo como
  AJUSTE FINO relativo a su valor de fabrica: con Autogain prendido, 8 en
  Bassgain = x1.0, 16 = x2.0. Con Autogain apagado vuelven a ser lo que
  eran (el comportamiento de antes, bit a bit).
- Todo en CHOPs nativos: 3 nodos por banda, cero Python por frame.
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
from .tdutil import (safe_set, safe_set_first, safe_expr, safe_expr_first,
                     connect, log)

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


# Ganancia de fabrica de cada banda (tiene que coincidir con los defaults
# de builder.py, pagina Audio). Con Autogain prendido, la ganancia de la
# banda se lee RELATIVA a este valor (ajuste fino, 1.0 en el default) y el
# piso del auto-gain se escala por el mismo numero.
FACTORY_GAIN = {
    'Mastergain': 4.0,
    'Bassgain': 8.0,
    'Midgain': 6.0,
    'Highgain': 10.0,
}


def _autogain(proj, fl, name, x, y, gain_par):
    """Divide 'fl' por su pico reciente (o por 1 si Autogain esta apagado).

    peak    : Lag CHOP, ataque 0 / caida Agcrelease -> pico reciente.
    divisor : Autogain ? max(peak, piso) : 1. Con Mult-Add de Math CHOP
              (gain = Autogain, postoff = 1 - Autogain) y clamp bajo en el
              piso -- con Autogain apagado vale 1 exacto, y 1 > piso.
    norm    : fl / divisor.
    """
    P = "op('/project1').par."
    peak = proj.create(lagCHOP, name + '_peak')
    peak.nodeX, peak.nodeY = x, y
    safe_set(peak, 'lag1', 0.0)
    safe_expr(peak, 'lag2', P + 'Agcrelease')
    connect(peak, fl)

    div = proj.create(mathCHOP, name + '_agcdiv')
    div.nodeX, div.nodeY = x + 160, y
    safe_expr(div, 'gain', 'float(' + P + 'Autogain.eval())')
    safe_expr(div, 'postoff', '1.0 - float(' + P + 'Autogain.eval())')
    safe_set(div, 'clamplow', True)
    safe_expr_first(div, ['clamplowvalue', 'clamplowval'],
                    P + 'Agcfloor.eval() / {}'.format(FACTORY_GAIN[gain_par]))
    connect(div, peak)

    norm = proj.create(mathCHOP, name + '_agcnorm')
    norm.nodeX, norm.nodeY = x + 320, y
    safe_set_first(norm, ['chopop', 'chanop'], 'divide')
    connect(norm, fl, 0)
    connect(norm, div, 1)
    return norm


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

    # Auto-gain: sus 3 nodos van en una columna libre a la izquierda de
    # audio1 (x -2080..-1760), a la altura de la banda -- la zona de la
    # cadena de audio ya esta llena y ahi se pisarian en el canvas.
    norm = _autogain(proj, fl, name, -2080, y, gain_par)

    mt = proj.create(mathCHOP, name + '_gain')
    mt.nodeX, mt.nodeY = x + 300, y
    # Autogain prendido: la ganancia de la banda es un ajuste fino relativo
    # a su valor de fabrica (8 en Bassgain = x1). Apagado: la de siempre.
    parts = ["(op('/project1').par.{g}.eval() / ({f} if op('/project1').par.Autogain.eval() else 1.0))"
             .format(g=gain_par, f=FACTORY_GAIN[gain_par])]
    if amount_par:
        parts.append("op('/project1').par.{}.eval()".format(amount_par))
    parts.append("op('/project1').par.Audioamount.eval()")
    parts.append("(1.0 if op('/project1/a_level_smooth')[0].eval() >= {} else 0.0)"
                 .format(config.SILENCE_RMS_THRESHOLD))
    safe_expr(mt, 'gain', ' * '.join(parts))
    safe_set(mt, 'clamplow', True)
    safe_set(mt, 'clamphigh', True)
    safe_set_first(mt, ['clamplowvalue', 'clamplowval'], 0.0)
    safe_set_first(mt, ['clamphighvalue', 'clamphighval'], 1.0)
    connect(mt, norm)
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
    """Devuelve un CHOP con los canales level/bass/mid/high/kick/beat/groove, o None."""
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

    # ---- KICK: transitorio de graves, con COMPUERTA ----
    # Medido en simulacion (techno 128 / reggaeton 95, ver
    # docs/12_AUDIO_BAILE.md): el detector viejo (bass - su media, x9)
    # disparaba tambien con la linea de bajo -- 25 falsos en 6 s de techno
    # -- y uKick nunca bajaba de ~0.46: siempre "prendido", nada pulsaba.
    # Ahora solo cuenta como golpe lo que supera Kickgate (0.65 = 65% del
    # pico reciente de graves, ya normalizado por el auto-gain): el bombo
    # llega ahi, el bajo no. Resultado simulado: 0 falsos, 13/13 aciertos.
    #
    # Detecta sobre los graves SIN Audioamount/Bassamount: si la perilla
    # Audio bajara la senal por debajo de la compuerta, el bombo dejaria
    # de detectarse de golpe (efecto precipicio). La perilla Audio se
    # aplica despues, como profundidad del pump (ver program.py).
    det = proj.create(mathCHOP, 'a_bass_det')
    det.nodeX, det.nodeY = -760, 1000
    safe_expr(det, 'gain',
              "op('/project1').par.Bassgain.eval() / ({} if op('/project1').par.Autogain.eval() else 1.0)"
              .format(FACTORY_GAIN['Bassgain']))
    safe_set(det, 'clamplow', True)
    safe_set(det, 'clamphigh', True)
    safe_set_first(det, ['clamplowvalue', 'clamplowval'], 0.0)
    safe_set_first(det, ['clamphighvalue', 'clamphighval'], 1.0)
    connect(det, proj.op('a_bass_agcnorm'))

    slow = proj.create(filterCHOP, 'a_bass_slow')
    slow.nodeX, slow.nodeY = -600, 780
    safe_set(slow, 'type', 'gaussian')
    safe_set(slow, 'units', 'seconds')
    safe_expr(slow, 'width', "op('/project1').par.Kickwindow")
    connect(slow, det)

    ref = proj.create(mathCHOP, 'a_kick_ref')
    ref.nodeX, ref.nodeY = -600, 1000
    safe_set(ref, 'clamplow', True)
    safe_expr_first(ref, ['clamplowvalue', 'clamplowval'],
                    "op('/project1').par.Kickgate.eval()")
    connect(ref, slow)

    diff = proj.create(mathCHOP, 'a_kick_diff')
    diff.nodeX, diff.nodeY = -440, 740
    safe_set_first(diff, ['chopop', 'chanop'], 'subtract')
    connect(diff, det, 0)
    connect(diff, ref, 1)

    # Copia suavizada de bass para el canal que ven los visuales -- se crea
    # DESPUES de que kick ya tomo su entrada de bass_env, para no competir.
    bass = _smooth_out(proj, bass_env, 'a_bass_out', -580, 660)

    kick_raw = proj.create(mathCHOP, 'a_kick_raw')
    kick_raw.nodeX, kick_raw.nodeY = -280, 740
    # El mismo piso de silencio del reloj: un transitorio espurio cuando
    # la fuente esta pausada no puede disparar Beat ni el pump del bloom.
    safe_expr(kick_raw, 'gain',
              "op('/project1').par.Kickgain.eval() if "
              "op('/project1/a_level_smooth')[0].eval() >= {} else 0.0"
              .format(config.SILENCE_RMS_THRESHOLD))
    safe_set(kick_raw, 'clamplow', True)
    safe_set(kick_raw, 'clamphigh', True)
    safe_set_first(kick_raw, ['clamplowvalue', 'clamplowval'], 0.0)
    safe_set_first(kick_raw, ['clamphighvalue', 'clamphighval'], 1.0)
    connect(kick_raw, diff)

    # kick_raw es el valor INSTANTANEO del diferencial (bass_env rapido menos
    # su media movil), frame a frame -- sin envolvente propia. Con musica
    # real (o ruido de sala) el bass sube y baja todo el tiempo por razones
    # que no son un bombo real (vibrato, sostenidos, mezcla de graves), asi
    # que este valor cruza el clamp una y otra vez cada fraccion de segundo.
    # Aplicado directo a un visual (col += col*uKick), eso ES el parpadeo
    # "prende-apaga-prende-apaga" -- el mismo tipo de temblor que Fase 2 ya
    # habia resuelto para 'level', reaparecido en el transitorio de kick.
    #
    # kick (lo que ven los visuales) es kick_raw pasado por una envolvente
    # de pico-y-caida: ataque casi instantaneo (no pierde el golpe real),
    # caida audible (0.22s) para que decaiga como un flash, no como ruido.
    # A diferencia de 'beat' (Trigger CHOP, binario: siempre pega a 1.0),
    # esto SI preserva la intensidad relativa del golpe -- un golpe suave
    # sigue viendose mas chico que uno fuerte.
    # Caida 0.22 -> 0.15 s: con 0.22 a 128 BPM el flash seguia en ~0.45 a
    # mitad de camino al proximo golpe -- poco contraste entre golpe y
    # silencio, que es justo lo que se lee como "bailar".
    kick = proj.create(lagCHOP, 'a_kick')
    kick.nodeX, kick.nodeY = -120, 700
    safe_set(kick, 'lag1', 0.008)
    safe_set(kick, 'lag2', 0.15)
    safe_set_first(kick, ['lagmethod', 'method'], 'slew')
    connect(kick, kick_raw)

    # ---- BEAT: envolvente AR nativa ----
    beat = proj.create(triggerCHOP, 'a_beat')
    beat.nodeX, beat.nodeY = -120, 740
    safe_expr(beat, 'threshold', "op('/project1').par.Kickthreshold")
    safe_set_first(beat, ['attack', 'attacklength'], 0.005)
    safe_set_first(beat, ['decay', 'decaylength'], 0.0)
    safe_set_first(beat, ['sustain', 'sustainlevel'], 1.0)
    safe_set_first(beat, ['release', 'releaselength'], 0.18)
    safe_set(beat, 'retrigger', True)
    connect(beat, kick_raw)

    # ---- GROOVE: "hay bombo sonando ahora" (0..1) ----
    # Sube al instante con cada beat y cae en 0.8 s. Es lo que prende y
    # apaga el pump de program.py: en un drop se queda arriba (golpes cada
    # 0.47-0.63 s), en un break o entre temas cae solo y la imagen vuelve a
    # su brillo normal en ~1 s -- sin esto el pump dejaria la pantalla
    # oscura mientras no haya bombo.
    groove = proj.create(lagCHOP, 'a_groove')
    groove.nodeX, groove.nodeY = -120, 1000
    safe_set(groove, 'lag1', 0.0)
    safe_set(groove, 'lag2', 0.8)
    connect(groove, beat)

    # ---- Renombrar y unir ----
    named = []
    for src, chan, x, y in [(level, 'level', -520, 900),
                            (bass, 'bass', -520, 620),
                            (mid, 'mid', -520, 500),
                            (high, 'high', -520, 380),
                            (kick, 'kick', -120, 640),
                            (beat, 'beat', 40, 740),
                            (groove, 'groove', 40, 1000)]:
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

    log('AUDIO: cadena construida (level/bass/mid/high/kick/beat/groove)')
    return merge
