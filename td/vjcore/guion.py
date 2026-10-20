"""GUION: el show definido por un archivo, sin MIDI.

El MIDI nunca secuestro nada: escribe en los parametros de /project1 y
listo (docs/01, "MIDI: escribe, no secuestra"). Un guion hace exactamente
eso mismo, pero leyendo de un archivo JSON con CUES ordenados en el
tiempo: a tal minuto, tal escena, tales perillas, tal efecto. El runner
vive en dats/control_script.py (_guionTick, se reagenda solo como el
autopilot); este modulo es PURO Python -- sin globales de TouchDesigner --
para poder validarlo y probarlo afuera (td/tools/guion.py, test_guion.py).

Formato (td/sets/<set>/guion.json; ver docs/54_GUION.md):

{
  "nombre": "Halloween 30 oct",
  "inicio": "22:00",                 # hora real de t=0 (modo reloj)
  "cues": [
    {"t": "0:00", "nombre": "Entrada", "escena": 0, "fundido": 3,
     "pars": {"speed": 0.4, "chaos": 0.1, "d1": 0.3}, "rampa": 0},
    {"t": "3:00", "pars": {"d1": 0.9, "chaos": 0.3}, "rampa": 60},
    {"t": "18:00", "fx": ["Strobe"], "texto": "FELIZ HALLOWEEN"},
    {"t": "22:30", "escena": 16, "fundido": 4, ...}
  ]
}

- "t": segundos, "mm:ss" o "h:mm:ss" desde el inicio del guion. Tambien
  "hora": "23:15" (hora real; se convierte usando "inicio").
- "pars": perillas por alias (speed, density, hue, chaos, master, audio,
  trails, d1..d6, look, lookamt, paleta, energia...) o por nombre real
  del parametro (Speed, Detail1...). Con "rampa" (segundos) deslizan desde
  el valor que tenian hasta el nuevo; sin rampa, saltan.
- "escena" + "fundido": cambia de escena con ese fundido (segundos).
- "fx": efectos de un golpe (Grain, Glitch, Pixelate, Strobe, Invert,
  Mirror, Zoom, Posterize); "accion": funciones de control_script sin
  argumentos (toggleTrails, mediaNext, ...).
- "texto" (+ "textovisible"), "blackout", "nota" (solo para leer).

Regla de mano: lo que el guion no toca, no lo toca. Terminada una rampa,
la perilla queda libre hasta el proximo cue que la nombre: mover una
perilla a mano entre cues gana.
"""

import json
import os

# Alias cortos -> parametro real de /project1 (solo floats 0..1 salvo
# Transitionseconds). Mismos nombres que midi_logic.CONTINUOUS.
PAR_ALIAS = {
    'speed': 'Speed', 'density': 'Density', 'densidad': 'Density',
    'hue': 'Hue', 'chaos': 'Chaos', 'locura': 'Chaos',
    'master': 'Brightness', 'brightness': 'Brightness', 'brillo': 'Brightness',
    'audio': 'Audioamount', 'audioamount': 'Audioamount',
    'bass': 'Bassamount', 'mid': 'Midamount', 'high': 'Highamount',
    'trails': 'Trails', 'estela': 'Trails', 'trailszoom': 'Trailszoom',
    'layermix': 'Layermix', 'mezcla': 'Layermix',
    'look': 'Look', 'lookamt': 'Lookamount', 'lookamount': 'Lookamount',
    'paleta': 'Palettelock', 'palette': 'Palettelock', 'palettelock': 'Palettelock',
    'palettehue': 'Palettehue', 'palettespread': 'Palettespread',
    'energia': 'Energy', 'energy': 'Energy',
    'transicion': 'Transitionseconds', 'transition': 'Transitionseconds',
    'fundido': 'Transitionseconds',
    'noche': 'Nochemanual', 'night': 'Nochemanual',
    'd1': 'Detail1', 'd2': 'Detail2', 'd3': 'Detail3',
    'd4': 'Detail4', 'd5': 'Detail5', 'd6': 'Detail6',
}
for _i in range(1, 7):
    PAR_ALIAS['detail{}'.format(_i)] = 'Detail{}'.format(_i)

# Rango de cada parametro que un cue puede escribir (lo, hi). Todo lo
# que no este aca se rechaza en validar(): un typo no puede escribir en
# cualquier parametro del proyecto.
PAR_RANGE = {
    'Speed': (0.0, 1.0), 'Density': (0.0, 1.0), 'Hue': (0.0, 1.0),
    'Chaos': (0.0, 1.0), 'Brightness': (0.0, 1.0),
    'Audioamount': (0.0, 1.0), 'Bassamount': (0.0, 1.0),
    'Midamount': (0.0, 1.0), 'Highamount': (0.0, 1.0),
    'Trails': (0.0, 1.0), 'Trailszoom': (0.0, 1.0), 'Layermix': (0.0, 1.0),
    'Look': (0.0, 1.0), 'Lookamount': (0.0, 1.0), 'Palettelock': (0.0, 1.0),
    'Palettehue': (0.0, 1.0), 'Palettespread': (0.0, 1.0),
    'Energy': (0.0, 1.0), 'Transitionseconds': (0.05, 20.0),
    'Nochemanual': (0.0, 1.0),
    'Detail1': (0.0, 1.0), 'Detail2': (0.0, 1.0), 'Detail3': (0.0, 1.0),
    'Detail4': (0.0, 1.0), 'Detail5': (0.0, 1.0), 'Detail6': (0.0, 1.0),
}

# Nombre corto para imprimir (timeline, panel).
SHORT_NAME = {'Speed': 'speed', 'Density': 'density', 'Hue': 'hue',
              'Chaos': 'chaos', 'Brightness': 'master', 'Audioamount': 'audio',
              'Trails': 'trails', 'Lookamount': 'lookamt', 'Palettelock': 'paleta',
              'Energy': 'energia', 'Transitionseconds': 'fundido',
              'Nochemanual': 'noche'}
for _i in range(1, 7):
    SHORT_NAME['Detail{}'.format(_i)] = 'd{}'.format(_i)

FX_NAMES = ['Grain', 'Glitch', 'Pixelate', 'Strobe', 'Invert',
            'Mirror', 'Zoom', 'Posterize']

# Funciones de control_script que un cue puede llamar (sin argumentos).
ACCIONES = ['toggleTrails', 'toggleDual', 'swapLayer', 'nextBlendMode',
            'mediaNext', 'mediaPrev', 'mediaRandom', 'toggleMediaLock',
            'nextFont', 'resetControls', 'snapshotPreset']

GUION_FILE = 'guion.json'


class GuionError(ValueError):
    pass


def parse_time(v):
    """Segundos desde un numero, 'mm:ss' o 'h:mm:ss'."""
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if not s:
        raise GuionError('tiempo vacio')
    parts = s.split(':')
    if len(parts) > 3:
        raise GuionError('tiempo invalido: {!r}'.format(v))
    try:
        nums = [float(x) for x in parts]
    except ValueError:
        raise GuionError('tiempo invalido: {!r}'.format(v))
    secs = 0.0
    for n in nums:
        secs = secs * 60.0 + n
    return secs


def parse_clock(v):
    """Hora del dia en horas (0..24) desde 'hh:mm' o 'hh:mm:ss' o numero."""
    if isinstance(v, (int, float)):
        h = float(v)
    else:
        parts = str(v).strip().split(':')
        try:
            nums = [float(x) for x in parts]
        except ValueError:
            raise GuionError('hora invalida: {!r}'.format(v))
        h = nums[0] + (nums[1] if len(nums) > 1 else 0.0) / 60.0 \
            + (nums[2] if len(nums) > 2 else 0.0) / 3600.0
    return h % 24.0


def fmt_time(secs):
    secs = max(0, int(round(secs)))
    h, r = divmod(secs, 3600)
    m, s = divmod(r, 60)
    if h:
        return '{}:{:02d}:{:02d}'.format(h, m, s)
    return '{}:{:02d}'.format(m, s)


def fmt_clock(hours):
    hours = hours % 24.0
    h = int(hours)
    m = int(round((hours - h) * 60.0))
    if m == 60:
        h, m = (h + 1) % 24, 0
    return '{:02d}:{:02d}'.format(h, m)


def par_name(key):
    """Nombre real del parametro para un alias o nombre; None si no es
    un parametro permitido."""
    k = str(key).strip()
    if k in PAR_RANGE:
        return k
    real = PAR_ALIAS.get(k.lower())
    if real is None and k[:1].upper() + k[1:] in PAR_RANGE:
        real = k[:1].upper() + k[1:]
    return real


def normalize(data):
    """Guion crudo (dict del JSON) -> guion normalizado:
    {'nombre', 'inicio' (horas o None), 'cues': [cue...]} con los cues
    ordenados por t. Cada cue: t, nombre, escena (int|None), fundido
    (float|None), pars {Par: val}, rampa, fx [..], accion [..], texto
    (str|None), textovisible (bool|None), blackout (bool|None), nota.
    Lanza GuionError con un mensaje claro si algo no sirve."""
    if not isinstance(data, dict):
        raise GuionError('el guion tiene que ser un objeto JSON con "cues"')
    inicio = data.get('inicio')
    inicio_h = parse_clock(inicio) if inicio not in (None, '') else None
    raw = data.get('cues')
    if not isinstance(raw, list) or not raw:
        raise GuionError('"cues" tiene que ser una lista con al menos un cue')
    cues = []
    for n, c in enumerate(raw):
        if not isinstance(c, dict):
            raise GuionError('cue {}: tiene que ser un objeto'.format(n))
        where = 'cue {} ({})'.format(n, c.get('nombre', 'sin nombre'))
        if 't' in c:
            t = parse_time(c['t'])
        elif 'hora' in c:
            if inicio_h is None:
                raise GuionError(where + ': usa "hora" pero el guion no tiene "inicio"')
            t = ((parse_clock(c['hora']) - inicio_h) % 24.0) * 3600.0
        else:
            raise GuionError(where + ': falta "t" (o "hora")')
        pars = {}
        for k, v in (c.get('pars') or {}).items():
            real = par_name(k)
            if real is None:
                raise GuionError(where + ': parametro desconocido {!r}'.format(k))
            try:
                fv = float(v)
            except (TypeError, ValueError):
                raise GuionError(where + ': {} = {!r} no es un numero'.format(k, v))
            lo, hi = PAR_RANGE[real]
            pars[real] = min(hi, max(lo, fv))
        fx = c.get('fx') or []
        if isinstance(fx, str):
            fx = [fx]
        fx = [str(f)[:1].upper() + str(f)[1:].lower() for f in fx]
        for f in fx:
            if f not in FX_NAMES:
                raise GuionError(where + ': efecto desconocido {!r} (van {})'.format(f, ', '.join(FX_NAMES)))
        acc = c.get('accion') or []
        if isinstance(acc, str):
            acc = [acc]
        for a in acc:
            if a not in ACCIONES:
                raise GuionError(where + ': accion desconocida {!r} (van {})'.format(a, ', '.join(ACCIONES)))
        escena = c.get('escena')
        if escena is not None:
            try:
                escena = int(escena)
            except (TypeError, ValueError):
                raise GuionError(where + ': "escena" tiene que ser un numero')
        fundido = c.get('fundido')
        if fundido is not None:
            fundido = min(20.0, max(0.05, float(fundido)))
        rampa = max(0.0, float(c.get('rampa', 0) or 0))
        texto = c.get('texto')
        tv = c.get('textovisible')
        if texto is not None and tv is None:
            tv = bool(str(texto).strip())
        bo = c.get('blackout')
        cues.append({
            't': t, 'nombre': str(c.get('nombre') or ''),
            'escena': escena, 'fundido': fundido, 'pars': pars,
            'rampa': rampa, 'fx': fx, 'accion': list(acc),
            'texto': None if texto is None else str(texto),
            'textovisible': None if tv is None else bool(tv),
            'blackout': None if bo is None else bool(bo),
            'nota': str(c.get('nota') or ''),
        })
    cues.sort(key=lambda c: c['t'])
    return {'nombre': str(data.get('nombre') or ''), 'inicio': inicio_h, 'cues': cues}


def load(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return normalize(data)


def default_path(set_dir):
    return os.path.join(set_dir, GUION_FILE)


def validate(guion, n_scenes=None, valid_scene=None):
    """Lista de problemas (vacia = todo bien). No lanza: sirve para que
    el panel muestre el aviso y el guion siga sirviendo para el resto."""
    out = []
    cues = guion['cues']
    if cues and cues[0]['t'] > 0.0:
        out.append('el primer cue arranca en {} y no en 0:00 (hasta ahi no pasa nada)'.format(fmt_time(cues[0]['t'])))
    for n, c in enumerate(cues):
        where = 'cue {} {} ({})'.format(n, fmt_time(c['t']), c['nombre'] or 'sin nombre')
        if c['escena'] is not None:
            if n_scenes is not None and not (0 <= c['escena'] < n_scenes):
                out.append(where + ': escena {} no existe (hay {})'.format(c['escena'], n_scenes))
            elif valid_scene is not None and not valid_scene(c['escena']):
                out.append(where + ': escena {} invalida'.format(c['escena']))
        if n + 1 < len(cues):
            gap = cues[n + 1]['t'] - c['t']
            if c['rampa'] > gap + 1e-6:
                out.append(where + ': rampa de {}s mas larga que el hueco hasta el proximo cue ({}s)'.format(int(c['rampa']), int(gap)))
        if not (c['escena'] is not None or c['pars'] or c['fx'] or c['accion']
                or c['texto'] is not None or c['blackout'] is not None):
            out.append(where + ': no hace nada')
    return out


def index_at(cues, pos):
    """Indice del ultimo cue con t <= pos; -1 si todavia no empezo."""
    idx = -1
    for n, c in enumerate(cues):
        if c['t'] <= pos + 1e-9:
            idx = n
        else:
            break
    return idx


def state_before(cues, idx):
    """Valor acumulado de cada parametro justo antes del cue idx: lo
    ultimo que escribio cualquier cue anterior. Sirve de punto de partida
    para las rampas y para saltar a un cue con todo en su lugar."""
    st = {}
    for c in cues[:max(0, idx)]:
        st.update(c['pars'])
    return st


def extras_before(cues, idx):
    """Ultimo texto / textovisible / blackout que dejaron los cues
    anteriores a idx (None = ninguno lo toco)."""
    out = {'texto': None, 'textovisible': None, 'blackout': None}
    for c in cues[:max(0, idx)]:
        for k in out:
            if c[k] is not None:
                out[k] = c[k]
    return out


def state_at(cues, idx):
    """Estado acumulado INCLUYENDO el cue idx (valores finales)."""
    st = {}
    for c in cues[:idx + 1]:
        st.update(c['pars'])
    return st


def scene_at(cues, idx):
    """Escena (y fundido) que deberia estar al aire en el cue idx."""
    for c in reversed(cues[:idx + 1]):
        if c['escena'] is not None:
            return c['escena'], c['fundido']
    return None, None


def ramp_values(cues, idx, pos, start_state=None):
    """{Par: valor} que el cue idx manda en el instante pos. Sin rampa
    (o ya terminada) devuelve los valores finales; durante la rampa,
    interpola desde start_state (lo que habia al disparar el cue; si no
    se da, el estado acumulado de los cues anteriores)."""
    if idx < 0 or idx >= len(cues):
        return {}
    c = cues[idx]
    if not c['pars']:
        return {}
    r = c['rampa']
    k = 1.0
    if r > 0.0:
        k = min(1.0, max(0.0, (pos - c['t']) / r))
    if k >= 1.0:
        return dict(c['pars'])
    base = start_state if start_state is not None else state_before(cues, idx)
    out = {}
    for name, target in c['pars'].items():
        if name in base:
            out[name] = base[name] + (target - base[name]) * k
        else:
            out[name] = target
    return out


def ramp_done(cues, idx, pos):
    if idx < 0 or idx >= len(cues):
        return True
    return pos >= cues[idx]['t'] + cues[idx]['rampa']


def next_cue(cues, idx):
    """(indice, segundos hasta el proximo cue) o (None, None)."""
    if idx + 1 < len(cues):
        return idx + 1, cues[idx + 1]['t']
    return None, None


def duration(guion):
    cues = guion['cues']
    return cues[-1]['t'] if cues else 0.0


def clock_position(now_hours, inicio_hours, dur=None):
    """Posicion (segundos) del guion segun la hora real, con 'inicio'
    como t=0 (cruza la medianoche). Con 'dur': pasada mas de una hora del
    final se cuenta como ANTES del inicio (negativo) -- prender TD a las
    19:00 para probar no tiene que dejarte en el fundido a negro final."""
    pos = ((now_hours - inicio_hours) % 24.0) * 3600.0
    if dur is not None and pos > dur + 3600.0:
        pos -= 86400.0
    return pos


def describe(cue):
    bits = []
    if cue['escena'] is not None:
        bits.append('escena {:02d}'.format(cue['escena']) + (' (fundido {:g}s)'.format(cue['fundido']) if cue['fundido'] else ''))
    if cue['pars']:
        short = SHORT_NAME
        bits.append(' '.join('{}={:g}'.format(short.get(k, k), v) for k, v in cue['pars'].items())
                    + (' rampa {:g}s'.format(cue['rampa']) if cue['rampa'] else ''))
    if cue['fx']:
        bits.append('fx ' + '+'.join(cue['fx']))
    if cue['accion']:
        bits.append('accion ' + ','.join(cue['accion']))
    if cue['texto'] is not None:
        bits.append('texto "{}"'.format(cue['texto']) if cue['texto'] else 'texto fuera')
    if cue['blackout'] is not None:
        bits.append('BLACKOUT' if cue['blackout'] else 'blackout fuera')
    return '; '.join(bits)


def timeline(guion, inicio_hours=None):
    """Lineas de texto con el guion entero, una por cue."""
    ini = guion['inicio'] if inicio_hours is None else inicio_hours
    lines = []
    for n, c in enumerate(guion['cues']):
        clk = ('  ' + fmt_clock(ini + c['t'] / 3600.0)) if ini is not None else ''
        lines.append('{:3d}  {:>8}{}  {:<28} {}'.format(n, fmt_time(c['t']), clk, c['nombre'][:28], describe(c)))
    return lines
