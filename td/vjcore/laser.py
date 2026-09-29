"""Salida laser (ILDA) OPCIONAL: se habilita o deshabilita desde /project1.

    /project1 > Laser > Modo laser
        0 APAGADO     -> /project1/laser no cocina. Costo cero. Por defecto.
        1 SIMULADOR   -> se calcula el frame laser y se dibuja en pantalla
                         (laser_preview / ventana "Abrir simulador"). No
                         hace falta ningun hardware.
        2 SALIDA DAC  -> ademas sale al DAC (Helios / Ether Dream / ...),
                         SOLO si 'ARMAR emision' esta prendido y no hay
                         blackout. Si este build de TD no tiene el CHOP
                         del DAC, se queda en simulador y lo avisa.

Todo vive dentro de UN COMP (/project1/laser). Apagar el modo apaga el
cooking del COMP entero, asi que un show sin laser es exactamente el mismo
rig de antes: nada de esto se calcula.

La logica que decide QUE puntos salen (patrones, trazado de la escena,
zona, brillo, blanking) esta en laserfx.py, Python puro, probada fuera de
TD. Este archivo solo la cablea:

    /project1/ctrl ──> laser_points (Script CHOP: x y r g b) ──> laser_dac
    show_out ─> laser_down (96x54, en /project1) ┘  │
    ctrl_tex ──> laser_preview (Script TOP) <─┘ (lee el ultimo frame)
                        └──> laser_window (ventana del simulador)
"""

try:
    from td import *          # noqa: F401,F403
except ImportError:
    pass


import os
import time

from . import laserfx
from .tdutil import safe_set, safe_set_first, safe_expr, connect, log


# Tamano de la imagen que se traza en modo AUTO. Chica a proposito: el
# laser no tiene resolucion de pixel, tiene presupuesto de PUNTOS, y a
# esta escala el borde de una escena son unos cientos de pixeles.
TRACE_W, TRACE_H = 96, 54
# El simulador se calcula a 256 (numpy, ~4 ms) y la ventana lo agranda.
# A 512 costaba ~14 ms por frame: demasiado para correr al lado del show.
PREVIEW_SIZE = 256
WINDOW_SIZE = 640

# CHOPs de DAC que se prueban, en orden. Que existan depende del build y
# del sistema operativo; ninguno es obligatorio.
DAC_TYPES = ['laserdeviceCHOP', 'heliosdacCHOP', 'etherdreamCHOP']

EXPORT_SECONDS = 5.0


# ---------------------------------------------------------------
# BUILD
# ---------------------------------------------------------------

def build(proj, show, ctrl_chop, ctrl_tex):
    comp = proj.create(baseCOMP, 'laser')
    comp.nodeX, comp.nodeY = 1760, -400

    # laser_down vive en /project1, AL LADO de show_out, con un cable
    # directo: TD no permite cables entre redes distintas, y dentro del
    # COMP quedaba sin input ("Not enough sources specified"). Fuera del
    # COMP no cuesta nada con el laser apagado: solo cocina si alguien lo
    # pide, y el unico que lo pide es laser_points en modo AUTO.
    down = proj.create(resolutionTOP, 'laser_down')
    down.nodeX, down.nodeY = 1760, -560
    safe_set_first(down, ['outputresolution', 'resolution'], 'custom')
    safe_set_first(down, ['resolutionw', 'resw'], TRACE_W)
    safe_set_first(down, ['resolutionh', 'resh'], TRACE_H)
    connect(down, show)

    # Los Script OPs NO tienen inputs a proposito: con ctrl de input
    # cocinaban en CADA frame (Python a 60 fps) y hundian el FPS del show.
    # Ahora los cocina un reloj propio (tick) a un ritmo fijo: el frame
    # laser a ~30 Hz y el simulador a ~15 Hz. Un galvo redibuja cada
    # figura miles de veces por segundo por su cuenta; mandarle una figura
    # nueva 30 veces por segundo sobra.
    pts = comp.create(scriptCHOP, 'laser_points')
    pts.nodeX, pts.nodeY = 200, 100
    _set_callbacks(comp, pts, _POINTS_CALLBACKS, 200, 300)

    prev = comp.create(scriptTOP, 'laser_preview')
    prev.nodeX, prev.nodeY = 200, -150
    _set_callbacks(comp, prev, _PREVIEW_CALLBACKS, 200, -350)
    safe_set_first(prev, ['outputresolution', 'resolution'], 'custom')
    safe_set_first(prev, ['resolutionw', 'resw'], PREVIEW_SIZE)
    safe_set_first(prev, ['resolutionh', 'resh'], PREVIEW_SIZE)

    win = comp.create(windowCOMP, 'laser_window')
    win.nodeX, win.nodeY = 400, -150
    safe_set_first(win, ['op', 'operator', 'winop'], prev.path)
    safe_set_first(win, ['opensize', 'size'], 'custom')
    safe_set_first(win, ['winw', 'w'], WINDOW_SIZE)
    safe_set_first(win, ['winh', 'h'], WINDOW_SIZE)
    safe_set(win, 'monitor', 0)

    dac, dac_type = _build_dac(comp, pts)

    # Arranca APAGADO: sin laser conectado, esto no debe costar nada.
    comp.allowCooking = False
    comp.store('laser_dac_type', dac_type or '')
    log('LASER: modulo listo y APAGADO (DAC: {})'.format(
        dac_type or 'ninguno en este build -> solo simulador'))
    return comp


def _set_callbacks(comp, script_op, text, x, y):
    """TD crea solo un DAT de callbacks (con la plantilla por defecto)
    al crear un Script OP. Se reusa ese mismo DAT y se le pone nuestro
    texto; crear otro aparte dejaba dos DATs y el de TD sin uso."""
    dat = None
    try:
        dat = script_op.par.callbacks.eval()
    except Exception:
        dat = None
    if dat is None:
        dat = comp.create(textDAT, script_op.name + '_callbacks')
        safe_set(script_op, 'callbacks', dat.path)
    dat.text = text
    dat.nodeX, dat.nodeY = x, y
    return dat


def _build_dac(comp, pts):
    g = globals()
    for type_name in DAC_TYPES:
        t = g.get(type_name)
        if t is None:
            continue
        try:
            dac = comp.create(t, 'laser_dac')
        except Exception as e:
            log('LASER: {} no se pudo crear ({})'.format(
                type_name, type(e).__name__))
            continue
        dac.nodeX, dac.nodeY = 400, 0
        connect(dac, pts)
        # Doble candado: laser_points ya manda colores en 0 si no esta
        # armado, y ademas el DAC mismo queda inactivo.
        safe_expr_first_quiet(dac, ['active', 'enable', 'output'],
                              _ARMED_EXPR)
        safe_set_first(dac, ['pointrate', 'pps', 'samplerate', 'rate'],
                       30000)
        return dac, type_name
    return None, None


_ARMED_EXPR = ("int(op('/project1').par.Lasermode) == 2 and "
               "bool(op('/project1').par.Laserarm) and "
               "not bool(op('/project1').par.Blackout)")


def safe_expr_first_quiet(o, names, expression):
    for n in names:
        if safe_expr(o, n, expression):
            return n
    log('LASER AVISO: {} no expone parametro de activacion ({}); '
        'la emision queda protegida solo por los colores en 0'.format(
            o.path, names))
    return None


# ---------------------------------------------------------------
# HABILITAR / DESHABILITAR
# ---------------------------------------------------------------

def apply_mode(proj):
    """Llamado cuando cambia Lasermode (par_exec) y al arrancar. Prende o
    apaga el cooking del COMP entero y desarma si no es SALIDA."""
    comp = proj.op('laser')
    if comp is None:
        return
    mode = _mode(proj)
    comp.allowCooking = mode != laserfx.MODE_OFF
    if mode != laserfx.MODE_DAC:
        safe_set(proj, 'Laserarm', False)
    if mode != laserfx.MODE_OFF:
        start_loop()
    log('LASER: modo {}'.format(laserfx.MODES[mode]))


# Cada cuantos frames del show se recalcula cada cosa. A 60 fps:
# puntos cada 2 = 30 Hz; trazado AUTO cada 4 = 15 Hz; simulador cada 4
# con la ventana abierta (15 Hz) o cada 12 si solo se mira el nodo.
POINTS_EVERY = 2
TRACE_EVERY = 4
PREVIEW_EVERY = 4
PREVIEW_EVERY_CLOSED = 12


def start_loop():
    _STATE['token'] = _STATE.get('token', 0) + 1
    _STATE['tick'] = 0
    run('import vjcore.laser as _L; _L.tick({})'.format(_STATE['token']),
        delayFrames=1)


def tick(token):
    """Reloj del laser: se reagenda solo mientras el modo no sea
    APAGADO. Un token nuevo (start_loop) mata al anterior, asi nunca
    corren dos relojes a la vez."""
    if token != _STATE.get('token'):
        return
    proj = op('/project1')
    if proj is None or _mode(proj) == laserfx.MODE_OFF:
        return
    k = _STATE.get('tick', 0)
    _STATE['tick'] = k + 1
    try:
        comp = proj.op('laser')
        if k % POINTS_EVERY == 0:
            pts = comp.op('laser_points')
            if pts is not None:
                pts.cook(force=True)
        win = comp.op('laser_window')
        is_open = False
        try:
            is_open = bool(win.isOpen) if win is not None else False
        except Exception:
            is_open = False
        every = PREVIEW_EVERY if is_open else PREVIEW_EVERY_CLOSED
        if k % every == 0:
            prev = comp.op('laser_preview')
            if prev is not None:
                prev.cook(force=True)
    except Exception as e:
        print('LASER tick ERROR:', e)
    run('import vjcore.laser as _L; _L.tick({})'.format(token),
        delayFrames=1)


def disarm(proj):
    safe_set(proj, 'Laserarm', False)


def _mode(proj):
    try:
        m = int(proj.par.Lasermode.eval())
    except Exception:
        return laserfx.MODE_OFF
    return m if 0 <= m < len(laserfx.MODES) else laserfx.MODE_OFF


def status(proj):
    """Una linea para el panel de diagnostico."""
    comp = proj.op('laser')
    if comp is None:
        return 'LASER: no construido'
    mode = _mode(proj)
    if mode == laserfx.MODE_OFF:
        return 'LASER: APAGADO'
    st = _STATE.get('stats') or {'points': 0, 'lit': 0}
    dac = comp.fetch('laser_dac_type', '') or ''
    head = laserfx.MODES[mode]
    if mode == laserfx.MODE_DAC:
        if not dac:
            head += ' (SIN DAC -> solo simulador)'
        elif bool(_par(proj, 'Laserarm', False)):
            head += ' ARMADO'
        else:
            head += ' desarmado'
    extra = ' | exportando .ild' if _STATE.get('export_until') else ''
    return 'LASER: {} | {} pts ({} encendidos){}'.format(
        head, st['points'], st['lit'], extra)


# ---------------------------------------------------------------
# RUNTIME (lo llaman los callbacks de los Script OPs)
# ---------------------------------------------------------------

_STATE = {'frame': None, 'stats': None, 'export_until': 0.0,
          'export_frames': [], 'export_path': ''}


def _par(proj, name, default):
    try:
        return getattr(proj.par, name).eval()
    except Exception:
        return default


def options(proj):
    """Parametros de /project1 -> opciones de laserfx.finalize()."""
    return {
        'size': float(_par(proj, 'Lasersize', 0.8)),
        'offx': float(_par(proj, 'Laseroffsetx', 0.0)),
        'offy': float(_par(proj, 'Laseroffsety', 0.0)),
        'zone': (float(_par(proj, 'Laserzoneleft', -1.0)),
                 float(_par(proj, 'Laserzoneright', 1.0)),
                 float(_par(proj, 'Laserzonebottom', -1.0)),
                 float(_par(proj, 'Laserzonetop', 1.0))),
        'bright': float(_par(proj, 'Laserbright', 0.5)),
        'master': float(_par(proj, 'Brightness', 1.0)),
        'emit': not bool(_par(proj, 'Blackout', False)),
        'max_points': int(_par(proj, 'Laserpoints', 800)),
    }


def cook_points(scriptOp):
    proj = op('/project1')
    scriptOp.clear()
    frame = laserfx.empty_frame()
    try:
        if proj is not None and _mode(proj) != laserfx.MODE_OFF:
            c = {}
            ctrl = op('/project1/ctrl')
            if ctrl is not None:
                for ch in ctrl.chans():
                    c[ch.name] = ch.eval()
            pattern = int(_par(proj, 'Laserpattern', 1))
            if laserfx.PATTERNS[pattern % len(laserfx.PATTERNS)] == 'AUTO':
                strokes = _auto_strokes(proj)
            else:
                strokes = laserfx.pattern_strokes(pattern, c)
            frame = laserfx.finalize(strokes, options(proj))
            _capture(frame)
    except Exception as e:
        # Un error aca NUNCA debe dejar el laser con el ultimo frame
        # prendido: se manda un frame apagado y se avisa.
        print('LASER cook ERROR:', e)
        frame = laserfx.empty_frame()

    _STATE['frame'] = frame
    _STATE['stats'] = laserfx.frame_stats(frame)

    armed = (proj is not None and _mode(proj) == laserfx.MODE_DAC
             and bool(_par(proj, 'Laserarm', False))
             and not bool(_par(proj, 'Blackout', False)))
    out = frame if armed else laserfx.blank(frame)
    scriptOp.numSamples = len(out['x'])
    for name in ('x', 'y', 'r', 'g', 'b'):
        ch = scriptOp.appendChan(name)
        ch.vals = [float(v) for v in out[name]]


def _auto_strokes(proj):
    """Trazado de la escena, recalculado solo cada TRACE_EVERY cocciones
    y con lectura DIFERIDA de la GPU: numpyArray() normal obliga a la GPU
    a terminar el frame y esperar la copia (ese era el bajon de FPS);
    delayed=True entrega la del frame anterior sin frenar nada."""
    n = _STATE.get('trace_n', 0)
    _STATE['trace_n'] = n + 1
    cached = _STATE.get('trace_strokes')
    if cached is not None and n % max(1, TRACE_EVERY // POINTS_EVERY):
        return cached
    down = op('/project1/laser_down')
    img = None
    if down is not None:
        try:
            img = down.numpyArray(delayed=True)
        except TypeError:
            img = down.numpyArray()
    strokes = laserfx.trace_image(
        img, float(_par(proj, 'Laserthreshold', 0.35))) if img is not None else []
    _STATE['trace_strokes'] = strokes
    return strokes


def cook_preview(scriptOp):
    proj = op('/project1')
    frame = _STATE.get('frame') or laserfx.empty_frame()
    zone = options(proj)['zone'] if proj is not None else None
    img = laserfx.render_preview(frame, PREVIEW_SIZE, True, zone)
    scriptOp.copyNumpyArray(img)


def open_simulator(proj):
    win = proj.op('laser/laser_window')
    if win is None:
        return
    if _mode(proj) == laserfx.MODE_OFF:
        safe_set(proj, 'Lasermode', laserfx.MODE_SIM)
        apply_mode(proj)
    try:
        win.par.winopen.pulse()
    except Exception as e:
        log('LASER: no pude abrir la ventana del simulador ({})'.format(e))


def start_export(proj, seconds=EXPORT_SECONDS):
    """Graba N segundos del frame laser a un .ild en td/config/.
    Sirve SIN hardware: el archivo se abre en cualquier visor ILDA."""
    root = ''
    try:
        root = proj.par.Repopath.eval()
    except Exception:
        pass
    folder = os.path.join(root, 'config') if root else ''
    if not folder:
        log('LASER: Repopath vacio, no hay donde guardar el .ild')
        return
    try:
        os.makedirs(folder, exist_ok=True)
    except Exception:
        pass
    if _mode(proj) == laserfx.MODE_OFF:
        safe_set(proj, 'Lasermode', laserfx.MODE_SIM)
        apply_mode(proj)
    _STATE['export_frames'] = []
    _STATE['export_path'] = os.path.join(
        folder, 'laser_{}.ild'.format(time.strftime('%Y%m%d_%H%M%S')))
    _STATE['export_until'] = time.time() + float(seconds)
    log('LASER: exportando {} s -> {}'.format(seconds, _STATE['export_path']))


def _capture(frame):
    until = _STATE.get('export_until') or 0.0
    if not until:
        return
    _STATE['export_frames'].append(frame)
    if time.time() >= until:
        frames, path = _STATE['export_frames'], _STATE['export_path']
        _STATE['export_until'] = 0.0
        _STATE['export_frames'] = []
        try:
            laserfx.write_ilda(path, frames)
            print('LASER: .ild guardado ({} frames) -> {}'.format(
                len(frames), path))
        except Exception as e:
            print('LASER: no pude guardar el .ild:', e)


_POINTS_CALLBACKS = '''# Generado por vjcore/laser.py -- no editar aca, editar el repo.
import vjcore.laser as L


def onSetupParameters(scriptOp):
    return


def onPulse(par):
    return


def onCook(scriptOp):
    L.cook_points(scriptOp)
'''

_PREVIEW_CALLBACKS = '''# Generado por vjcore/laser.py -- no editar aca, editar el repo.
import vjcore.laser as L


def onSetupParameters(scriptOp):
    return


def onPulse(par):
    return


def onCook(scriptOp):
    L.cook_preview(scriptOp)
'''
