"""/project1/diagnostics  -  panel de estado del sistema."""


def _p():
    return op('/project1')


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
