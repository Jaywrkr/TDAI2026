# Arquitectura

## Dónde vive cada cosa

```
TDAI2026/
├── td/
│   ├── RUN_ME.py              <- lo único que se pega dentro de TouchDesigner
│   ├── vjcore/                <- el núcleo, un módulo por responsabilidad
│   │   ├── config.py          parámetros globales y contrato de canales
│   │   ├── tdutil.py          helpers defensivos (safe_set, safe_expr…)
│   │   ├── audio.py           cadena de audio reactivo
│   │   ├── control.py         CHOP de control unificado + textura de control
│   │   ├── midi.py            MIDI In + CHOP Execute
│   │   ├── scenes.py          20 escenas GLSL
│   │   ├── program.py         bus A/B, crossfade, master fade
│   │   ├── dashboard.py       UI clickable
│   │   ├── shader.py          composición header + .frag + footer
│   │   ├── build.py           orquestación + verificación
│   │   └── dats/              código que corre DENTRO de TD como módulo
│   ├── visuals/               <- un .frag por escena. Aquí trabajas tú y la IA
│   ├── config/                mapeo MIDI y presets (generados, no versionados)
│   └── tools/                 validador y preview fuera de TD
└── docs/
```

El `.toe` deja de ser el proyecto. El proyecto es el repo; el `.toe` es solo
un contenedor de ejecución.

---

## La cadena de control

Esta es la pieza central. Todo lo que un visual necesita saber viaja por un
solo camino, sin una sola expresión de Python evaluándose por frame:

```
  /project1 (params custom)
        │
        ▼
   par_ctrl ──── Parameter CHOP (nativo, sin expresiones)
        │
audio1 ─┼─ mono ─ filtros ─ RMS ─ ganancia ─┐
        │                                    ├─ ctrl_merge ─ ctrl_order ─ ctrl
   time_scaled (Speed CHOP) ────────────────┤       (Merge)   (Select)   (Null)
   time_real  (Speed CHOP) ─────────────────┘                              │
                                                                           ▼
                                                                      ctrl_tex
                                                                  (CHOP to TOP,
                                                                   1 × 15 px f32)
```

`ctrl_tex` es una textura de 1 píxel de ancho por 15 de alto. Cada escena la
recibe como **input 0** de su GLSL TOP y lee sus controles con `texelFetch`.

### Por qué una textura y no uniforms

Los nombres de los parámetros de uniform del GLSL TOP cambian entre builds de
TouchDesigner (`uniname0`/`value0x` vs. secuencias `vec0name`). Un script que
los escribe por nombre se rompe al actualizar TD. Una textura de 1×15 es
idéntica en todas las versiones, cuesta prácticamente cero, y el header GLSL
se genera **leyendo el orden real de canales de `/project1/ctrl` en runtime**:

```python
channels = control.resolve_channels(proj)   # ['speed','density',...]
```

Si un canal falta (por ejemplo el audio no está conectado), el índice no se
desplaza en silencio: la verificación del build lo reporta.

> ⚠️ El GLSL TOP hereda la resolución de su input 0. Sin
> `outputresolution = 'custom'` toda tu escena saldría a 1×15 píxeles.
> `scenes.py` lo fija explícitamente.

---

## Una escena

```
/project1/scenes/sceneN/
├── content/
│   ├── ctrl_in       Select TOP → /project1/ctrl_tex
│   ├── shader_src    Text DAT  (header auto + tu .frag + footer auto)
│   ├── shader        GLSL TOP  ← UNA pasada de GPU
│   └── content_out   Null TOP  ← contrato: la salida siempre se llama así
├── content_src       Select TOP → content/content_out
├── out1              Null TOP  → lo consume el program bus
└── thumb             Resolution TOP 256×144 → lo consume el dashboard
```

`thumb` es el que resuelve el segundo costo más grande del rig original: el
dashboard nunca muestra un TOP a resolución de salida.

---

## Program bus y transición

```
scene_src0..19 ─┬─ program_a (Switch) ─┐
                └─ program_b (Switch) ─┴─ program_cross ─ program_clean ─┐
                                                                          │
  /project1.Xfadetarget ─ Parameter CHOP ─ Lag CHOP ─ xfade ──────────────┘
                                            (lag = Transition Seconds)

  black ─┬─ master_fade ─ show_out
program_clean ─┘        (cross = 0 si Blackout, si no Brightness)
```

El crossfade lo hace un **Lag CHOP nativo**. Python solo:

1. mete la escena entrante en el switch que ahora mismo no se ve,
2. invierte `Xfadetarget`,
3. agenda **una** llamada para cerrar la transición.

El original encolaba un `run()` por frame — 27 callbacks para 0.45 s a 60 fps,
más un sistema de tokens para poder cancelarlos. Cambiar de escena a mitad de
fundido ahora simplemente invierte el destino otra vez: el Lag sigue desde
donde iba, sin saltos.

Al terminar, `_finishFade` iguala el switch saliente al entrante, así que
queda **una sola escena cocinando**.

---

## Gestión de cooking

```python
sc.allowCooking = (not perf) or preview or (i in visibles)
```

`visibleScenes()` lee los índices directamente de `program_a` y `program_b` en
vez de mantener estado paralelo — no puede desincronizarse.

- **Performance Mode** (por defecto ON): solo cocinan las escenas visibles.
- **Preview All**: descongela las 20 para refrescar los thumbnails. Es caro
  a propósito; se usa entre sets, no durante uno.
- **Prewarm Frames**: la escena entrante cocina N frames antes de empezar el
  fundido, para que no entre con el último frame congelado.

---

## MIDI: escribe, no secuestra

```
midi1 (MIDI In CHOP) ─ midi_logic (CHOP Execute)
                            │
                            └─ escribe en /project1.Speed, .Density, …
```

Python corre **solo cuando algo se mueve**, no 60 veces por segundo. Los
parámetros siguen siendo parámetros normales: los mueves a mano, los guarda un
preset, los anima un LFO si quieres.

El mapeo se guarda en `td/config/midi_map.json` y se recarga en el arranque.
Ver [02 — MIDI](02_MIDI_MINILAB_MKII.md).

---

## Runtime

| OP | Qué hace |
|---|---|
| `control_script` | Selección de escena, transición, cooking, highlight, MIDI Learn, presets |
| `diagnostics` | Panel de estado (fps, GPU ms, canales, escenas cocinando) |
| `runtime_manager` | `onStart` → arranque seguro. Se auto-reagenda con `run()` en vez de usar `onFrameStart` |
| `par_exec` | Los botones de pulso de `/project1` |
| `midi_logic` | CHOP Execute sobre `midi1` |
| `system_errors` | Error DAT |

`onFrameStart` está **desactivado** a propósito.

---

## Verificación del build

`build.py` termina con `verify()`, que comprueba en la Textport:

- que `/project1/ctrl` tenga canales y no falte ninguno,
- que ambos switches tengan las 20 entradas,
- que las 20 escenas tengan `out1`, `shader`, `content_out` y `thumb`,
- que `ctrl_tex`, `dashboard_ui` y `show_out` existan,
- que `Repopath` apunte a una carpeta `visuals/` real.

Esto importa porque un script que construye redes no se puede testear fuera
de TouchDesigner. Si algo salió mal, aparece como `[!!]` y no como un visual
negro sin explicación.
