# MIDI — Arturia MiniLab MkII

## Lo primero: no confíes en ninguna tabla, usa MIDI Learn

El rig trae un mapeo por defecto, pero el MiniLab MkII es **reprogramable**
desde el MIDI Control Center. Si alguien tocó esa unidad alguna vez —o si
Arturia cambió la memoria de fábrica entre revisiones— la tabla que sea deja
de aplicar.

Por eso el flujo correcto es aprender, no configurar:

1. `/project1/midi1` → parámetro **Device** → `Arturia MiniLab mkII`.
2. `/project1` → pestaña **MIDI Mapping**.
3. Pulsa **`Learn Speed`**. El panel de estado muestra
   `>> MIDI LEARN ARMADO: Speed`.
4. Mueve el knob que quieras para Speed. Queda mapeado y se guarda solo.
5. Repite para Density, Hue, Chaos, Brightness, Transition, y los pads.

**`Cancelar Learn`** desarma sin asignar. **`Guardar Mapeo`** / **`Cargar
Mapeo`** escriben `td/config/midi_map.json`, que se recarga en cada arranque.

---

## Mapeo por defecto que trae el rig

| Slot | Canal MIDI | Control físico | Qué hace |
|---|---|---|---|
| Speed | `ch1cc112` | Encoder 1 | Velocidad global de los visuales |
| Density | `ch1cc74` | Encoder 2 | Densidad / cantidad de detalle |
| Hue | `ch1cc71` | Encoder 3 | Paleta de color |
| Chaos | `ch1cc76` | Encoder 4 | Distorsión / turbulencia |
| Brightness | `ch1cc77` | Encoder 5 | Master fade |
| Transition | `ch1cc93` | Encoder 6 | Duración del fundido (0.05–2 s) |
| Next | `ch10n36` | Pad 1 | Siguiente escena |
| Prev | `ch10n37` | Pad 2 | Escena anterior |
| Blackout | `ch10n38` | Pad 3 | Blackout on/off |
| Snapshot | `ch10n39` | Pad 4 | Guardar knobs de la escena activa |
| Reset | `ch10n40` | Pad 5 | Reset de controles |

---

## CC de fábrica de los 16 encoders

Memoria 1 (Analog Lab), **canal 1**:

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

Los 8 pads salen por **canal 10**, notas **36–43** (banco 1) y **44–51**
(banco 2).

> Los CC no son consecutivos. El script original asumía 112–116; solo 112 y
> 114 existen de verdad. Verifica siempre en el visor del MIDI In CHOP: abre
> `/project1/midi1`, mueve un knob, y mira qué nombre de canal aparece.

---

## Cómo se leen los nombres de canal

TouchDesigner nombra los canales del MIDI In CHOP así:

```
ch<canal>cc<número>     control continuo   → ch1cc112
ch<canal>n<nota>        nota               → ch10n36
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
