"""/project1/runtime_manager  -  Execute DAT.

onFrameStart NO esta activo. El script original corria Python en cada
frame solo para hacer un modulo; a 60 fps son 60 llamadas por segundo de
puro overhead. En su lugar, diagnostics se auto-reagenda con run().

El bucle de refresco (tickDiag -> run(delayFrames=N) -> tickDiag) lo arranca
builder.py al final del build, NO onStart() de aqui abajo. onStart() de un
Execute DAT dispara una sola vez por SESION de TouchDesigner (al abrir o dar
play al proyecto), no cada vez que un script recrea /project1 mientras TD ya
esta corriendo. Se deja igual como red de seguridad: si algun dia guardas el
.toe y lo vuelves a abrir sin correr RUN_ME, esto reinicia el bucle solo.
"""


def onStart():
    ctrl = op('/project1/control_script')
    if ctrl:
        ctrl.module.safeStartup()
    _scheduleDiag()
    return


def _scheduleDiag():
    p = op('/project1')
    if not p:
        return
    try:
        n = max(5, int(p.par.Diagnosticinterval.eval()))
    except Exception:
        n = 30
    run("op('/project1/runtime_manager').module.tickDiag()", delayFrames=n)


def tickDiag():
    d = op('/project1/diagnostics')
    if d:
        try:
            d.module.update()
        except Exception as e:
            print('diagnostics:', e)
    _scheduleDiag()


def onDeviceChange():
    d = op('/project1/diagnostics')
    if d:
        d.module.refreshDevices()
    return


def onExit():
    return


def onPlayStateChange(state):
    return


def onProjectPreSave():
    return


def onProjectPostSave():
    return
