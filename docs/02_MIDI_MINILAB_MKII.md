# MIDI — Arturia MiniLab MkII

## Mapeo por defecto — confirmado en vivo, no adivinado

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
