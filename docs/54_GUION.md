# Guion: el show sin MIDI

El rig puede correr toda la noche **sin controlador**. Un archivo JSON con
*cues* en el tiempo decide qué escena va al aire, cómo se mueven las
perillas (Speed, Chaos, los seis Detail…), qué efectos pegan y qué texto
aparece. El audio sigue haciendo bailar los visuales igual que siempre;
el guion solo reemplaza las manos.

No hay un segundo sistema: el MIDI ya funcionaba escribiendo en los
parámetros de `/project1` ([01_ARQUITECTURA](01_ARQUITECTURA.md), "MIDI:
escribe, no secuestra"). El guion escribe en esos mismos parámetros. Por
eso se pueden usar los dos a la vez: si mueves una perilla a mano, tu
valor queda hasta que otro cue vuelva a nombrar esa perilla.

## Usarlo

1. **Reconstruir Todo** (este cambio agrega la página **Guion** a `/project1`).
2. `/project1` → **Guion** → **Arrancar desde 0:00**. O, para el show,
   prende **Seguir la hora real**: el guion se posiciona según el reloj
   de la máquina y el `"inicio"` del archivo. Si abres TD a las 22:40,
   entra directo en el minuto 40; antes de la hora de inicio espera.
3. El panel de estado del dashboard muestra `>> GUION ON 1:12:30 / 7:31:00
   cue 18/102: …` y cuánto falta para el próximo cue.

Controles de la página:

| Control | Qué hace |
|---|---|
| Guion activo | prendido = el guion manda. Apagarlo congela todo donde está |
| Arrancar desde 0:00 | empieza de cero (apaga el Autopilot: no pueden mandar los dos) |
| Pausa / seguir | congela el reloj del guion; las escenas siguen bailando con el audio |
| Próximo cue / Cue anterior / Ir al cue | salta, y deja la escena y todas las perillas como si el guion hubiera corrido hasta ahí. No repite los efectos de los cues saltados |
| Seguir la hora real | la posición sale del reloj (no hay pausa en este modo) |
| Archivo | vacío = `guion.json` del set activo; puede ser otra ruta (relativa al set o absoluta) |
| Recargar archivo | relee el JSON después de editarlo, sin reconstruir |

El MIDI no hace falta para nada de esto: sin MiniLab conectado, el rig
arranca igual y el panel muestra MIDI "SIN DATOS", sin error.

## El archivo

`td/sets/<set>/guion.json`. Para Halloween ya viene uno armado
(`td/sets/halloween/guion.json`): las 20 escenas de 22:00 a 05:30, 22,5
minutos cada una, de la más sobria a la más gore. Cada escena tiene
cinco momentos: entra calma, **sube** (rampa de 2 min), **pico** (más Detail,
locura y estela), **golpe** (Zoom en la primera mitad de la noche, Glitch
en la segunda) y **baja**. Al final hay un fundido a negro. Es un punto de partida: edítalo a mano.

```json
{
 "nombre": "Halloween 30 oct",
 "inicio": "22:00",
 "cues": [
  {"t": "0:00", "nombre": "Entrada", "escena": 0, "fundido": 3,
   "pars": {"speed": 0.4, "chaos": 0.1, "d1": 0.3}},
  {"t": "6:00", "nombre": "Sube", "pars": {"d1": 0.9, "chaos": 0.3}, "rampa": 120},
  {"hora": "00:00", "nombre": "Medianoche", "texto": "MEDIANOCHE", "fx": "Strobe"},
  {"hora": "00:05", "texto": ""}
 ]
}
```

Campos de un cue (todos opcionales menos el tiempo):

| Campo | Ejemplo | Qué hace |
|---|---|---|
| `t` | `90`, `"1:30"`, `"2:05:00"` | momento desde el inicio del guion |
| `hora` | `"23:15"` | en lugar de `t`: hora real (necesita `"inicio"`) |
| `nombre` | `"pico"` | se ve en el panel y en el Textport |
| `escena` + `fundido` | `4`, `3` | cambia de escena con ese fundido en segundos |
| `pars` | `{"speed": 0.6, "d3": 1}` | perillas, de 0 a 1 |
| `rampa` | `120` | segundos para deslizar las `pars` desde donde estaban; sin rampa, saltan |
| `fx` | `"Strobe"` o `["Glitch", "Zoom"]` | golpe de efecto: Grain, Glitch, Pixelate, Strobe, Invert, Mirror, Zoom, Posterize |
| `texto` | `"FELIZ HALLOWEEN"` / `""` | muestra el texto; `""` lo saca |
| `blackout` | `true` / `false` | negro total o salir del negro |
| `accion` | `"mediaNext"` | toggleTrails, toggleDual, swapLayer, nextBlendMode, mediaNext, mediaPrev, mediaRandom, toggleMediaLock, nextFont, resetControls, snapshotPreset |
| `nota` | | solo para leer |

Nombres de perilla para `pars`: `speed`, `density`, `hue`, `chaos` (o
`locura`), `master` (Master Fade), `audio`, `bass`, `mid`, `high`,
`trails` (o `estela`), `trailszoom`, `layermix`, `look`, `lookamt`,
`paleta`, `palettehue`, `palettespread`, `energia`, `fundido`
(Transitionseconds, 0.05–20 s), `noche` (Noche manual: solo vale con
**Noche automática** apagada), `d1`…`d6`. También sirve el nombre real
del parámetro (`Detail3`). Un nombre que no está en la lista hace que el archivo
no cargue, con un mensaje que dice cuál es. Así un error de tipeo no puede
escribir en cualquier parámetro.

Reglas:

- Los cues se ordenan solos por tiempo; el orden en el archivo no importa.
- Lo que un cue no nombra, no lo toca.
- Una rampa arranca desde el valor que la perilla tiene en ese momento
  (si la moviste a mano, desliza desde ahí). Al terminar, la perilla queda
  libre hasta el próximo cue que la nombre.
- Si TD se traba y pasan varios cues juntos, solo el último dispara efectos;
  los del medio se aplican como estado (perillas, texto, blackout, escena).
- La **Noche** sigue funcionando sola con el reloj (página Noche); el guion
  no la necesita.

## Revisarlo antes del show (fuera de TD)

```bash
python3 td/tools/guion.py --set halloween                # línea de tiempo + avisos
python3 td/tools/guion.py --set halloween --hora 01:30   # qué está pasando a esa hora
python3 td/tools/test_guion.py                           # pruebas del motor
```

Avisa de escenas que no existen, rampas más largas que el hueco hasta el
próximo cue y cues que no hacen nada. Los mismos avisos salen en el
Textport al cargar el archivo dentro de TD.

## Dónde vive

- `td/vjcore/guion.py`: formato, validación y cálculo (Python puro, se prueba afuera).
- `td/vjcore/dats/control_script.py`, sección GUION: el reloj y los cues
  (`_guionTick` cada 250 ms, se reagenda solo como el autopilot).
- `td/vjcore/builder.py`: página Guion y sus pulsos.
- `td/vjcore/dats/diagnostics.py`: líneas del panel de estado.

## No verificado

Todo lo de arriba está probado contra un `/project1` simulado
(`test_guion.py`). Todavía falta probarlo en tu TouchDesigner, en
particular el modo reloj durante una noche entera y que los fundidos del
guion se vean bien con el failsafe activo.
