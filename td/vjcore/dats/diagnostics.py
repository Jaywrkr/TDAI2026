"""/project1/diagnostics  -  panel de estado del sistema."""

import os


def _p():
    return op('/project1')


def _par_val(name, default=0.0):
    p = _p()
    par = getattr(p.par, name, None) if p else None
    try:
        return float(par.eval()) if par is not None else default
    except Exception:
        return default


def _chan_val(path, name, default=0.0):
    o = op(path)
    if not o:
        return default
    try:
        return float(o[name][0])
    except Exception:
        return default


def _bar(v, width=14):
    """Barra tipo VU meter en texto monoespaciado: '[#######-------]'."""
    v = max(0.0, min(1.0, float(v)))
    n = int(round(v * width))
    return '[' + ('#' * n) + ('-' * (width - n)) + ']'


def _sceneName(index):
    """'INK', 'METABALL', etc a partir del nombre del archivo .frag --
    para que el panel diga que escena esta activa, no solo el numero."""
    try:
        import vjcore.shader as shader
        path = shader.find_visual(index)
    except Exception:
        path = None
    if not path:
        return ''
    stem = os.path.basename(path).split('.')[0]
    parts = stem.split('_', 1)
    name = parts[1] if len(parts) > 1 else stem
    return name.upper().replace('_', ' ')


def _chans(path):
    o = op(path)
    if not o:
        return 0
    try:
        return int(o.numChans)
    except Exception:
        return 0


def _errors():
    d = op('/project1/system_errors')
    if not d:
        return 0
    try:
        return max(0, int(d.numRows) - 1)
    except Exception:
        return 0


def _gpu_ms():
    t = op('/project1/show_out')
    try:
        return float(t.gpuCookTime)
    except Exception:
        return -1.0


def _watchdog(fps, warn):
    """Failsafe: si el FPS lleva Failsafeseconds SEGUIDOS por debajo del
    umbral, baja un escalon de calidad (ver control_script.failsafeStep).

    Se mide por TIEMPO acumulado y no por cantidad de ticks porque el
    intervalo del diagnostico es configurable (Diagnosticinterval): con
    ticks, cambiar esa perilla cambiaria sin querer cuanto tarda el
    failsafe en actuar. Y se exige que sea CONTINUO -- un bajon aislado
    de un frame (abrir un menu, cambiar de escena) no puede disparar una
    degradacion de show.
    """
    p = _p()
    if not p:
        return
    try:
        if not bool(p.par.Failsafe.eval()):
            p.store('failsafe_low_since', 0.0)
            return
        now = float(absTime.seconds)
        if fps >= warn:
            p.store('failsafe_low_since', 0.0)
            return
        since = float(p.fetch('failsafe_low_since', 0.0) or 0.0)
        if since <= 0.0:
            p.store('failsafe_low_since', now)
            return
        if now - since >= float(p.par.Failsafeseconds.eval()):
            ctrl = op('/project1/control_script')
            if ctrl:
                ctrl.module.failsafeStep()
            # Se reinicia el reloj: el proximo escalon exige otra ventana
            # completa en rojo, no se encadenan todos de golpe.
            p.store('failsafe_low_since', now)
    except Exception as e:
        print('_watchdog ERROR:', e)


def _blend_modes():
    try:
        import vjcore.config as _vjconfig
        return _vjconfig.BLEND_MODES
    except Exception:
        return ['MIX', 'ADD', 'SCREEN', 'MULTIPLY', 'DIFFERENCE', 'LIGHTEN']


def _arrow(v):
    """Para las perillas de 0.5-neutro de la estela: dice hacia DONDE va,
    no solo el numero. '0.71' no le dice nada a nadie en vivo; 'ADENTRO'
    si."""
    if v > 0.53:
        return 'ADENTRO'
    if v < 0.47:
        return 'AFUERA '
    return 'NEUTRO '


def updateMasterFX():
    """Panel de Master FX del dashboard: estado + que hace cada efecto.

    Se llama desde update(), al mismo ritmo que el panel de status.
    """
    p = _p()
    fx = op('/project1/dashboard_ui/master_fx_src')
    if not p or not fx:
        return

    trails = _par_val('Trails')
    tzoom = _par_val('Trailszoom', 0.5)
    trot = _par_val('Trailsrotate', 0.5)
    dual = bool(_par_val('Duallayer'))
    mix = _par_val('Layermix', 0.5)
    mode_i = int(_par_val('Blendmode'))
    editing = int(_par_val('Activelayer'))
    modes = _blend_modes()
    mode = modes[mode_i] if 0 <= mode_i < len(modes) else '?'

    scene_a = _switch_index('program_a')
    scene_b = _switch_index('program_b')

    # COMPACTADO a 11 lineas como maximo. El panel se achico al
    # reacomodar el bloque de abajo del dashboard (ver dashboard.py), y
    # un texto que no entra se corta SIN AVISO -- peor que uno mas corto.
    # Se fueron las lineas de explicacion larga; el estado, que es lo que
    # de verdad se mira en vivo, quedo entero.
    on = trails > 0.005
    lines = [
        'MASTER FX   (efectos del PROGRAM, no de la escena)',
        'ESTELA {}  {} {:.2f}   zoom {} giro {}'.format(
            'ON ' if on else 'OFF', _bar(trails, 8), trails,
            _arrow(tzoom).strip(), _arrow(trot).strip()),
        '',
    ]

    if dual:
        lines += [
            'DOS CAPAS ON   {}   mezcla {} {:.2f}'.format(
                mode, _bar(mix, 8), mix),
            '   A  {:02d} {:<13}{}'.format(
                scene_a, _sceneName(scene_a)[:13],
                '<< EDITANDO' if editing == 0 else ''),
            '   B  {:02d} {:<13}{}'.format(
                scene_b, _sceneName(scene_b)[:13],
                '<< EDITANDO' if editing == 1 else ''),
            '   El click carga la capa marcada EDITANDO.',
        ]
    else:
        lines += [
            'DOS CAPAS OFF  (bus A/B en transicion normal)',
            '   Prendelo para 2 escenas vivas y mezclarlas.',
            '   Modos: {}'.format(' '.join(m[:4] for m in modes)),
        ]

    # --- LOOK DEL SHOW ---
    try:
        import vjcore.config as _vjc
        looks = _vjc.LOOKS
    except Exception:
        looks = ['NEUTRO', 'NEON FRIO', 'AMBAR FILMICO', 'MONO CONTRASTE']
    look_i = int(_par_val('Look'))
    look_amt = _par_val('Lookamount')
    pal = _par_val('Palettelock')
    look_name = looks[look_i] if 0 <= look_i < len(looks) else '?'

    lines += ['']
    if look_amt > 0.005 or pal > 0.005:
        lines += [
            'LOOK  {:<15}{} {:.2f}'.format(
                look_name, _bar(look_amt, 8), look_amt),
            'PALETA DEL SHOW      {} {:.2f}'.format(_bar(pal, 8), pal),
            '   Se aplica a las 34 por igual: es el color del SHOW.',
        ]
    else:
        lines += [
            'LOOK  NEUTRO  (cada escena con su color propio)',
            '   Looks: {}'.format(' / '.join(looks)),
        ]

    fx.text = '\n'.join(lines)


def _switch_index(name):
    sw = op('/project1/' + name)
    try:
        return int(sw.par.index.eval()) if sw else 0
    except Exception:
        return 0


def update():
    p = _p()
    status = op('/project1/dashboard_ui/system_status_src')
    if not p or not status:
        return
    # Aislado: si el panel de Master FX fallara (por ejemplo en un build
    # viejo, sin los parametros nuevos), el panel de status -- que es el
    # que dice si el SISTEMA esta bien -- tiene que seguir actualizandose
    # igual. Nunca al reves.
    try:
        updateMasterFX()
    except Exception as e:
        print('updateMasterFX ERROR:', e)

    try:
        fps = float(project.cookRate)
    except Exception:
        fps = 0.0
    try:
        warn = int(p.par.Fpswarning.eval())
    except Exception:
        warn = 55

    midi_ch = _chans('/project1/midi1')
    audio_ch = _chans('/project1/audio1')
    ctrl_ch = _chans('/project1/ctrl')
    errors = _errors()
    gpu = _gpu_ms()

    active = int(p.par.Activeindex.eval())
    target = int(p.par.Targetindex.eval())
    moving = bool(p.fetch('transitioning', False))
    learn = str(p.fetch('learn_slot', '') or '')

    try:
        import vjcore.config as _vjconfig
        n_scenes = _vjconfig.N_SCENES
    except Exception:
        n_scenes = 34

    cooking = 0
    scenes = op('/project1/scenes')
    if scenes:
        for i in range(n_scenes):
            sc = scenes.op('scene{}'.format(i))
            if sc and sc.allowCooking:
                cooking += 1

    fps_state = 'OK' if fps >= warn else 'BAJO'
    overall = 'CHECK' if (errors > 0 or fps < warn or ctrl_ch == 0) else 'OK'

    # El watchdog vive aca porque este es el unico lugar que ya mide el
    # FPS a intervalos regulares -- no hace falta otro bucle propio.
    _watchdog(fps, warn)

    # COMPACTADO a la mitad de lineas (el panel bajo de 24 a 18 para que
    # el dashboard entre en 1080p, ver dashboard.py). No se perdio ningun
    # dato: los campos relacionados se juntaron de a dos por linea, que
    # ademas se lee mas rapido de reojo que una columna larga.
    lines = [
        'SISTEMA {:<6}  FPS {:.1f} ({})  GPU {}'.format(
            overall, fps, fps_state,
            '{:.2f}ms'.format(gpu) if gpu >= 0 else 'n/d'),
        'MIDI {:<10} AUDIO {:<10} CTRL {} ch'.format(
            'OK({})'.format(midi_ch) if midi_ch else 'SIN DATOS',
            'OK({})'.format(audio_ch) if audio_ch else 'SIN DATOS', ctrl_ch),
        'SALIDA {}x{}   COOCINANDO {}/{}   BLACKOUT {}   ERR {}'.format(
            int(p.par.Outputwidth.eval()), int(p.par.Outputheight.eval()),
            cooking, n_scenes,
            'ON' if p.par.Blackout.eval() else 'off', errors),
        'ACTIVA {:02d} {:<14} DESTINO {}'.format(
            active, _sceneName(active),
            '{:02d}'.format(target) if moving else '-'),
    ]
    if learn:
        lines.append('')
        lines.append('>> MIDI LEARN ARMADO: {}'.format(learn))

    # Avisos de show: van ARRIBA de los valores en vivo porque son lo
    # que hay que ver primero si algo va mal.
    if bool(_par_val('Cuemode')):
        lines.append('')
        lines.append('>> CUE ON  el click carga PREVIEW (escena {:02d}), '
                     'TAKE lo tira al aire'.format(int(_par_val('Previewindex'))))
    fs_level = int(_par_val('Failsafelevel'))
    if fs_level:
        lines.append('')
        lines.append('>> FAILSAFE NIVEL {} -- se bajo calidad sola por FPS '
                     'bajo'.format(fs_level))
        lines.append('   (Failsafe > Reset del failsafe para volver)')
    if bool(_par_val('Record')):
        lines.append('')
        lines.append('>> GRABANDO')

    # Navegacion: solo se muestra cuando NO esta en el modo por defecto,
    # para no gastar lineas del panel diciendo "todo normal".
    ctrl = op('/project1/control_script')
    setlist = []
    if ctrl:
        try:
            setlist = ctrl.module._setlist()
        except Exception:
            setlist = []
    if bool(_par_val('Usesetlist')) and setlist:
        lines.append('')
        lines.append('>> SETLIST ON  ({} escenas)  Next/Prev siguen ese orden'
                     .format(len(setlist)))
        lines.append('   ' + ' '.join('{:02d}'.format(i) for i in setlist[:16]))
    size = int(_par_val('Banksize', 8))
    bank = int(_par_val('Bank'))
    if bank:
        lines.append('')
        lines.append('>> BANCO {}  (escenas {:02d}-{:02d})'.format(
            bank, bank * size, min(bank * size + size - 1, n_scenes - 1)))
    if bool(_par_val('Energyactive')):
        e = _par_val('Energy', 0.5)
        lines.append('')
        lines.append('>> ENERGIA {} {:.2f}  (escribe Speed/Density/Chaos/Trails)'
                     .format(_bar(e, 10), e))

    # Valores en vivo: contexto pedido explicitamente -- saber en que
    # posicion esta cada perilla (y cada banda de audio) sin tener que
    # adivinar mirando solo el visual. Mismo tick que el resto del panel
    # (Diagnosticinterval, ~5x por segundo por defecto) -- suficiente
    # para leer una perilla en movimiento sin gastar mas costo por frame.
    lines.append('')
    lines.append('VALORES EN VIVO')
    lines.append('Speed {:.2f}  Density {:.2f}  Hue {:.2f}  Chaos {:.2f}  Bright {:.2f}'.format(
        _par_val('Speed'), _par_val('Density'), _par_val('Hue'),
        _par_val('Chaos'), _par_val('Brightness')))
    lines.append('Detail  D1 {:.2f}  D2 {:.2f}  D3 {:.2f}  D4 {:.2f}  D5 {:.2f}  D6 {:.2f}'.format(
        _par_val('Detail1'), _par_val('Detail2'), _par_val('Detail3'),
        _par_val('Detail4'), _par_val('Detail5'), _par_val('Detail6')))

    # Medidores VU: una barra en texto por banda, mas facil de leer de
    # reojo en vivo que solo el numero. 2 lineas (no 4) para no inflar el
    # panel -- barras mas cortas (8, no 14) para que quepan dos por linea.
    bass, mid, high, kick = (_chan_val('/project1/ctrl', n)
                             for n in ('bass', 'mid', 'high', 'kick'))
    lines.append('Bass {} {:.2f}   Mid  {} {:.2f}'.format(
        _bar(bass, 8), bass, _bar(mid, 8), mid))
    lines.append('High {} {:.2f}   Kick {} {:.2f}'.format(
        _bar(high, 8), high, _bar(kick, 8), kick))

    try:
        autopilot_on = bool(p.par.Autopilot.eval())
    except Exception:
        autopilot_on = False
    if autopilot_on:
        try:
            secs = float(p.par.Autopilotseconds.eval())
        except Exception:
            secs = 0.0
        lines.append('')
        lines.append('>> AUTOPILOT ON  (cada {:.0f}s + por beat)'.format(secs))

    status.text = '\n'.join(lines)
    try:
        p.par.Systemready = (overall == 'OK')
    except Exception:
        pass


def refreshDevices():
    for path in ('/project1/midi1', '/project1/audio1'):
        o = op(path)
        if not o:
            continue
        for name in ('reset', 'reinit', 'refresh'):
            par = getattr(o.par, name, None)
            if par is not None:
                try:
                    par.pulse()
                except Exception:
                    pass
    update()
