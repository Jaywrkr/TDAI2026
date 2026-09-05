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


def update():
    p = _p()
    status = op('/project1/dashboard_ui/system_status_src')
    if not p or not status:
        return

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

    cooking = 0
    scenes = op('/project1/scenes')
    if scenes:
        for i in range(20):
            sc = scenes.op('scene{}'.format(i))
            if sc and sc.allowCooking:
                cooking += 1

    fps_state = 'OK' if fps >= warn else 'BAJO'
    overall = 'CHECK' if (errors > 0 or fps < warn or ctrl_ch == 0) else 'OK'

    lines = [
        'SISTEMA     {}'.format(overall),
        'FPS         {:.1f}  ({})'.format(fps, fps_state),
        'GPU show    {:.2f} ms'.format(gpu) if gpu >= 0 else 'GPU show    n/d',
        'MIDI        {} ({} ch)'.format(
            'CONECTADO' if midi_ch else 'SIN DATOS', midi_ch),
        'AUDIO       {} ({} ch)'.format(
            'CONECTADO' if audio_ch else 'SIN DATOS', audio_ch),
        'CTRL        {} canales'.format(ctrl_ch),
        'SALIDA      {} x {}'.format(
            int(p.par.Outputwidth.eval()), int(p.par.Outputheight.eval())),
        'ACTIVA      ESCENA {:02d}'.format(active),
        'DESTINO     {}'.format(
            'ESCENA {:02d}'.format(target) if moving else '-'),
        'COOCINANDO  {} / 20 escenas'.format(cooking),
        'BLACKOUT    {}'.format('ON' if p.par.Blackout.eval() else 'OFF'),
        'ERRORES     {}'.format(errors),
    ]
    if learn:
        lines.append('')
        lines.append('>> MIDI LEARN ARMADO: {}'.format(learn))

    # Valores en vivo: contexto pedido explicitamente -- saber en que
    # posicion esta cada perilla (y cada banda de audio) sin tener que
    # adivinar mirando solo el visual. Mismo tick que el resto del panel
    # (Diagnosticinterval, ~5x por segundo por defecto) -- suficiente
    # para leer una perilla en movimiento sin gastar mas costo por frame.
    lines.append('')
    lines.append('ESCENA      {:02d} {}'.format(active, _sceneName(active)))
    lines.append('')
    lines.append('VALORES EN VIVO')
    lines.append('Speed {:.2f}  Density {:.2f}  Hue {:.2f}  Chaos {:.2f}  Bright {:.2f}'.format(
        _par_val('Speed'), _par_val('Density'), _par_val('Hue'),
        _par_val('Chaos'), _par_val('Brightness')))
    lines.append('Detail  D1 {:.2f}  D2 {:.2f}  D3 {:.2f}  D4 {:.2f}  D5 {:.2f}  D6 {:.2f}'.format(
        _par_val('Detail1'), _par_val('Detail2'), _par_val('Detail3'),
        _par_val('Detail4'), _par_val('Detail5'), _par_val('Detail6')))
    lines.append('Audio   Bass {:.2f}  Mid {:.2f}  High {:.2f}  Kick {:.2f}  Beat {:.2f}'.format(
        _chan_val('/project1/ctrl', 'bass'), _chan_val('/project1/ctrl', 'mid'),
        _chan_val('/project1/ctrl', 'high'), _chan_val('/project1/ctrl', 'kick'),
        _chan_val('/project1/ctrl', 'beat')))

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
