# MIDI — Arturia MiniLab MkII

## Layout v2 — el mapa actual

**Qué tiene el controlador:** 16 perillas, 8 pads × 2 bancos (botón
`Pad 1-8 / 9-16`) = 16 pads, tira de pitch, tira de modulación, 25 teclas.
Extras: `Shift` + perilla 1 o 9 manda un CC alternativo (2 perillas más).

> ⚠️ **`Shift` + pad NO cambia de banco: cambia de MEMORIA** del MiniLab
> (y con eso todos los CC). El banco se cambia con el botón
> **`Pad 1-8 / 9-16`**.

**`/project1` → `MIDI Mapping`** muestra ahora exactamente los 36 controles
de abajo (16 perillas, Shift+1, Shift+9, las 2 tiras y los 16 pads), en el
MISMO orden físico y con el MISMO nombre en español que esta página y el
manual (`docs/10_MANUAL_MINILAB.html`) — por ejemplo la fila de `Trails` en
esa página dice **"Estela"**, no "Trails". Lo que no tiene pad ni perilla
asignado hoy (Snapshot, Reset, Grain suelto, Bass/Mid/High Amount, etc.) no
aparece ahí: sigue en el dashboard o en su propia página de parámetros — ver
"Lo que salió del controlador" más abajo.

### Perillas

CC leído directo de `/project1` → `MIDI Mapping` (capturas del usuario,
panel ya en orden físico) — esto es lo que hoy manda cada perilla de
verdad, ya cargado como default en `config.DEFAULT_MIDI`:

| Perilla | Manda | Función |
|---|---|---|
| 1 | `ch1ctrl113` | **ENERGÍA** — la principal: velocidad, densidad, caos, estela, duración del fundido y ritmo del autopilot. Tocarla la reactiva después de un Reset |
| 2 | `ch1ctrl75` | Hue |
| 3 | `ch1ctrl72` | Speed (pisa a Energía hasta que vuelvas a moverla) |
| 4 | `ch1ctrl77` | Density |
| 5 | `ch1ctrl78` | Chaos |
| 6 | `ch1ctrl94` | Audio (reacción al sonido) |
| 7 | `ch1ctrl74` | Estela (Trails) |
| 8 | `ch1ctrl76` | Master (brillo general) |
| 9 | `ch1ctrl115` | Detail 1 |
| 10 | `ch1ctrl19` | Detail 2 |
| 11 | `ch1ctrl20` | Detail 3 |
| 12 | `ch1ctrl17` | Detail 4 |
| 13 | `ch1ctrl18` | Detail 5 |
| 14 | `ch1ctrl92` | Detail 6 |
| 15 | `ch1ctrl80` | Look |
| 16 | `ch1ctrl73` | Paleta |
| `Shift` + 1 | `ch1ctrl23` | Mezcla 2 Capas |
| `Shift` + 9 | `ch1ctrl24` | Transición (fundido a mano, pisa a Energía) |
| tira **mod** | `ch1ctrl1` | Imagen (scrub, recorre la carpeta con el dedo) |
| tira **pitch** | — | Zoom Estela — todavía sin aprender, ver "Lo que salió" |

Las bandas Bass/Mid/High Amount salen del controlador porque con
**Auto-gain** ya no hace falta corregirlas en vivo: quedan en la pestaña
**Audio**.

### Perillas 1 y 9: ya en modo Absolute

Las perillas 1 y 9 son las clicables, y las que venían de fábrica en modo
relativo (ver más abajo la nota de "red de seguridad"). Hoy mandan `CC 113`
y `CC 115` — dos números lejos de la banda angosta donde cae una perilla
relativa (58..70), lo que confirma que ya están en modo **Absolute**
(seguramente reconfiguradas en Arturia MIDI Control Center): responden 1:1,
sin el paso extra de "acumular". Si alguna vez vuelven a comportarse raro
(saltan cerca de la mitad y se quedan mudas), repetí este chequeo:

1. Abre **Arturia MIDI Control Center**, memoria que usás: perilla 1 y 9 →
   **Mode: Absolute**, Min 0, Max 127. **Store To** → la misma memoria.
2. Verificá con el probador del manual (`docs/10_MANUAL_MINILAB.html`): al
   girarlas tiene que decir **✓ Modo absoluto**.

**Red de seguridad en software (igual sigue activa):** `dats/midi_logic.py`
detecta solo las perillas que SIEMPRE mandan un valor pegado a 64 (nunca un
extremo) y las trata como relativas, acumulando en vez de quedarse mudas.
Con las perillas 1 y 9 ya en `CC 113`/`115` (fuera de esa banda desde el
primer mensaje) esto queda inactivo para ellas por diseño -- solo entraría
a ayudar si algún día otra perilla (u otro controlador) vuelve a mandar en
relativo.

### Pads — banco A (`Pad 1-8`): el show

Estos 8 pads mandan **nota** de canal 10 (no CC):

| Pad | Manda | Función |
|---|---|---|
| 1 | `ch10n38` | NEXT |
| 2 | `ch10n37` | PREV |
| 3 | `ch10n39` | BLACKOUT |
| 4 | `ch10n40` | AUTOPILOT on/off |
| 5 | `ch10n41` | TEXTO mostrar/ocultar |
| 6 | `ch10n42` | IMAGEN → |
| 7 | `ch10n43` | DOS CAPAS on/off |
| 8 | `ch10n44` | IMAGEN FIJA |

### Pads — banco B (`Pad 9-16`): efectos (golpe, decaen solos)

Estos 6 quedaron en **CC** de canal 1, no en nota; Retro y Glitch (pads 9 y
10) todavía no están aprendidos -- ver "Lo que salió del controlador".

| Pad | Manda | Función |
|---|---|---|
| 9 | — (sin aprender) | RETRO = Grain + Posterize juntos |
| 10 | — (sin aprender) | Glitch |
| 11 | `ch1ctrl25` | Pixelate |
| 12 | `ch1ctrl26` | Strobe (tope 3 Hz) |
| 13 | `ch1ctrl27` | Invert |
| 14 | `ch1ctrl28` | Mirror |
| 15 | `ch1ctrl29` | Zoom |
| 16 | `ch1ctrl30` | Modo de Mezcla de Dos Capas (cicla) |

### Lo que salió del controlador (y dónde quedó)

Nada se pierde:

| Qué | Dónde |
|---|---|
| Pánico, Take | Dashboard (botones grandes) |
| Snapshot, Reset | `/project1` → pulsos (y `Learn` si algún día liberas algo) |
| Imagen ←, imagen al azar, fuente siguiente | `/project1` → Media / Texto |
| Bass/Mid/High Amount | `/project1` → Audio (con Auto-gain no hace falta tocarlos) |
| Cue (modo, siguiente, anterior), Layerswap, Trails on/off | Dashboard / `/project1` |
| Zoom de estela | slot `Trailszoom` listo para Learn (ideal en la tira de pitch) |
| Retro (pad 9), Glitch (pad 10) | Todavía sin aprender -- `/project1` → MIDI Mapping → `Learn Pad 9: Retro` / `Learn Pad 10: Glitch` con el pad correspondiente |

### Colores de los pads

Cada pad puede mostrar el **estado** de su función (apagado por defecto
hasta confirmar que tu unidad responde):

| Pad | Reposo | Activo |
|---|---|---|
| 1 NEXT | cian | **late blanco con el beat** mientras el autopilot anda |
| 2 PREV | cian | — |
| 3 BLACKOUT | rojo | blanco = en negro |
| 4 AUTOPILOT | apagado | verde |
| 5 TEXTO | azul = hay un nombre listo · apagado = nada que mostrar | blanco = en pantalla |
| 6 IMAGEN → | amarillo | — |
| 7 DOS CAPAS | apagado | violeta |
| 8 IMAGEN FIJA | apagado | azul |
| 9–15 efectos | un color por efecto | blanco mientras pega |
| 16 MODO MEZCLA | apagado | verde (solo con Dos Capas) |

**Cómo activarlo:** `/project1/midi_out` → **Device** = el MiniLab (igual que
`midi1`) → pestaña **Bancos** → pulsa **Probar colores de pads**. Si los
16 pads se pintan de colores durante 3 s, prende **Colores de pads según
estado**. Si no se encienden, la unidad no acepta el mensaje (hay reportes
así en el foro de Arturia): déjalo apagado, no afecta nada más.

Mensaje usado: `F0 00 20 6B 7F 42 02 00 10 <70+pad> <color> F7`, colores
`00` apagado · `01` rojo · `04` verde · `05` amarillo · `10` azul ·
`11` violeta · `14` cian · `7F` blanco. Se manda solo cuando un color
cambia, unas 5 veces por segundo como mucho: no carga la PC.

### Cómo se aplica

**Automático:** al arrancar, si tu `td/config/midi_map.json` es del layout
anterior, se **migra solo** una vez: cada control de la tabla pasa a su
función nueva y el slot viejo queda vacío. Después se guarda marcado como
`v2`, así que un `Learn` que hagas más tarde ya no se pisa.

**A mano (lo que falta):** Retro (pad 9) y Glitch (pad 10) todavía no están
aprendidos -- un `Learn` con el pad correspondiente alcanza. Zoom Estela
(tira de pitch) también sigue libre si algún día lo querés usar.

`Learn` ahora **reasigna**: si el control ya estaba en otro slot, se lo
quita (antes quedaban los dos y ganaba uno al azar).

---

## Mapeo original (histórico)

Estos son los canales reales, verificados con MIDI Learn sobre la unidad de
producción (TouchDesigner Build 2025.32820, macOS). Con `/project1/midi1` →
Device en `Arturia MiniLab mkII`, los 6 knobs y los 5 pads funcionan desde
el primer arranque — **no hace falta pasar por Learn**.

| Slot | Canal MIDI | Control físico | Qué hace |
|---|---|---|---|
| Speed | `ch1ctrl76` | Encoder 1 | Velocidad global de los visuales |
| Density | `ch1ctrl73` | Encoder 2 | Densidad / cantidad de detalle |
| Hue | `ch1ctrl74` | Encoder 3 | Paleta de color |
| Chaos | `ch1ctrl80` | Encoder 4 | Distorsión / turbulencia |
| Brightness | `ch1ctrl94` | Encoder 5 | Master fade |
| Transition | `ch1ctrl92` | Encoder 6 | Duración del fundido (0.05–2 s) |
| Next | `ch1ctrl30` | Pad 1 | Siguiente escena |
| Prev | `ch1ctrl29` | Pad 2 | Escena anterior |
| Blackout | `ch1ctrl28` | Pad 3 | Blackout on/off |
| Snapshot | `ch1ctrl27` | Pad 4 | Guardar knobs de la escena activa |
| Reset | `ch1ctrl26` | Pad 5 | Reset de controles |

## Perillas de audio (Fase 2) — sin CC por defecto todavía

Estas 4 se agregaron después de confirmar el mapeo de arriba. No tengo sus
CC reales, así que **no van a funcionar hasta que hagas Learn una vez**:

| Slot | Qué hace |
|---|---|
| Audioamount | Master: cuánto deja pasar el audio hacia los visuales en general. En 0, ningún visual reacciona al sonido |
| Bassamount | Cuánto pesan los graves específicamente |
| Midamount | Cuánto pesan los medios específicamente |
| Highamount | Cuánto pesan los agudos específicamente |

Con tus 16 encoders, la cuenta cierra así: 6 ya mapeados arriba + estos 4 +
6 libres para los knobs de "Detail" que trae cada escena (ver
`docs/03_VISUAL_SPEC.md`) = 16.

`/project1` → MIDI Mapping → `Learn Audioamount` → mueve el knob que
quieras para eso. Repite con `Bassamount`, `Midamount`, `Highamount`. Queda
guardado solo, igual que los demás.

Dos cosas que no calzan con lo que dice Arturia en su documentación, y está
bien que no calcen:

- **`ch1ctrl<N>`, no `ch1cc<N>`.** Este build de TouchDesigner nombra los
  canales de control continuo con el prefijo `ctrl`, no `cc`. Es una
  diferencia de nomenclatura entre versiones de TD, no un error.
- **Los pads salen como `ch1ctrl<N>` también, no como notas (`ch1n<N>`).**
  El preset activo en esta unidad tiene los pads configurados para mandar
  CC en vez de Note — común en modo DAW o con un preset de usuario distinto
  al de fábrica. Funcionan igual de bien como triggers: un pad configurado
  así salta entre 0 y 127 al presionar/soltar, así que el cruce por cero que
  dispara la acción sigue siendo confiable.

## Si tocas otra unidad, o alguien reprogramó esta

El MiniLab MkII es reprogramable desde el MIDI Control Center de Arturia. Si
la tabla de arriba deja de aplicar (otra unidad, otro preset, alguien tocó la
configuración), el mapeo se rehace con Learn, sin editar código:

1. `/project1/midi1` → parámetro **Device** → `Arturia MiniLab mkII`.
2. `/project1` → pestaña **MIDI Mapping**.
3. Pulsa **`Learn Speed`**. El panel de estado muestra
   `>> MIDI LEARN ARMADO: Speed`.
4. Mueve el knob que quieras para Speed. Queda mapeado y se guarda solo.
5. Repite para Density, Hue, Chaos, Brightness, Transition, y los pads.

**`Cancelar Learn`** desarma sin asignar. **`Guardar Mapeo`** / **`Cargar
Mapeo`** escriben `td/config/midi_map.json`, que se recarga en cada arranque
y sobreescribe lo que haya en `config.py`.

---

## CC de fábrica de los 16 encoders (referencia histórica, no confíes en esto)

Esto es lo que documenta Arturia para la Memoria 1 (Analog Lab), canal 1 —
**no coincide** con la tabla de arriba en esta unidad. Se deja aquí solo
como referencia si algún día reseteas el teclado a fábrica.

| Knob | CC | Knob | CC |
|---|---|---|---|
| 1 (click) | 112 | 9 (click) | 114 |
| 2 | 74 | 10 | 18 |
| 3 | 71 | 11 | 19 |
| 4 | 76 | 12 | 16 |
| 5 | 77 | 13 | 17 |
| 6 | 93 | 14 | 91 |
| 7 | 73 | 15 | 79 |
| 8 | 75 | 16 | 72 |

Pads de fábrica: **canal 10**, notas **36–43** (banco 1) y **44–51** (banco
2) — en esta unidad los pads no siguen este esquema (ver arriba).

> La lección de todo esto: nunca confíes en una tabla de CCs sin verificarla.
> Verifica siempre en el visor del MIDI In CHOP: abre `/project1/midi1`,
> mueve un knob, y mira qué nombre de canal aparece de verdad.

---

## Cómo se leen los nombres de canal

TouchDesigner nombra los canales del MIDI In CHOP así, aunque el prefijo
exacto (`cc` vs `ctrl`) varía entre versiones de TD:

```
ch<canal>cc<número>     control continuo (builds antiguos)   → ch1cc112
ch<canal>ctrl<número>   control continuo (build 2025.32820)  → ch1ctrl76
ch<canal>n<nota>        nota                                 → ch10n36
```

Un canal **no aparece hasta que ese control se mueve por primera vez**. Si
`midi1` sale con 0 canales en el panel de estado, mueve cualquier knob.

---

## Salto de valores al cambiar de escena

Los knobs del MiniLab MkII son **absolutos**: mandan su posición física. Al
cambiar de escena con presets activos, el preset mueve `Speed` a 0.2 pero el
knob sigue físicamente en 0.8 — el primer roce lo salta a 0.8 de golpe.

Tres opciones:

1. **Convivir con ello.** Es lo normal en controladores de este precio y en
   directo casi nunca molesta.
2. **Apagar presets.** `/project1` → Presets → desmarca
   `Recall al cambiar escena`. El knob es la única verdad.
3. **Modo relativo.** En el MIDI Control Center de Arturia puedes poner los
   encoders en `Relative #1/#2/#3`. Eso elimina el salto, pero requiere
   cambiar `midi_logic.py` para acumular en vez de asignar — el rig hoy
   asume absoluto.

---

## Mapear más cosas

`td/vjcore/config.py`:

```python
MIDI_SLOTS = ['Speed', 'Density', ..., 'Reset', 'MiNuevoSlot']
```

`td/vjcore/dats/midi_logic.py`:

```python
CONTINUOUS = {
    'MiNuevoSlot': ('NombreDelParametro', 0.0, 1.0),   # knob
}
TRIGGERS = {
    'MiNuevoSlot': 'nombreDeFuncionEnControlScript',   # pad
}
```

Después: `/project1` → System → **Reconstruir Todo**. El mapeo guardado en
`midi_map.json` se recupera solo.

---

## Diagnóstico

El panel de estado del dashboard muestra:

```
MIDI        CONECTADO (7 ch)
```

- **SIN DATOS (0 ch)** → no elegiste el Device, o no has movido nada aún.
- **CONECTADO** pero nada responde → el nombre del canal no coincide con el
  slot. Usa Learn.
- Un pad que no dispara → casi siempre es canal 10 vs. canal 1.
