# Primera prueba — paso a paso

Guía para levantar el rig desde cero y comprobar que cada capa funciona
**antes** de conectar la siguiente. El orden importa: si conectas audio, MIDI
y proyector a la vez y algo falla, no sabes qué falló.

Cada fase termina en un **checkpoint**: qué debes ver, y qué hacer si no lo ves.

---

## Fase 0 — Preparación

1. Clona el repo en la máquina donde corre TouchDesigner.
2. Anota la ruta a la carpeta `td/`. Ejemplo: `C:\TDAI2026\td`.

> **Windows:** en Python usa barras normales o dobles invertidas.
> `C:/TDAI2026/td` ✅ · `C:\\TDAI2026\\td` ✅ · `C:\TDAI2026\td` ❌
> (`\T` es un escape y la ruta se rompe.)

---

## Fase 1 — Validar los shaders sin abrir TouchDesigner *(opcional)*

Si tienes Python en esa máquina:

```bash
python3 td/tools/validate_shaders.py
```

**Checkpoint 1**

```
[OK]   _TEMPLATE    _TEMPLATE.frag           completo sin audio
[OK]   scene00      scene00_veins.frag       completo sin audio

2 shader(s) x 2 escenarios, 0 con error
```

Prueba cada shader en dos escenarios: con todos los canales de control, y
como si arrancaras **sin device de audio**. Si ambos dan OK, no vas a tener un
error de compilación dentro de TD.

Requiere `glslangValidator` (paquete `glslang-tools` en Linux, o el binario del
Vulkan SDK en Windows). Si no lo tienes, salta esta fase: TD te dirá igual si
un shader no compila, solo que más tarde.

---

## Fase 2 — Construir el rig

1. Abre TouchDesigner. Proyecto nuevo, vacío.
2. **Borra el `/project1` que TD crea por defecto.** El build va a crear el suyo.
3. Abre la Textport: `Alt + T` (o *Dialogs → Textport and DATs*). **Déjala
   abierta**: todo el reporte sale ahí.
4. En la red raíz `/`, crea un **Text DAT** (`Tab` → DAT → Text).
5. Pega dentro el contenido de `td/RUN_ME.py`.
6. Cambia la línea `REPO = 'C:/TDAI2026/td'` por tu ruta real.
7. Click derecho en el Text DAT → **Run Script**.

**Checkpoint 2** — en la Textport debe salir:

```
==========================================================
VERIFICACION DEL BUILD
==========================================================
  [OK] ctrl tiene canales -> 15 canales
  [OK] sin canales de control faltantes
  [OK] program_a con 20 inputs -> 20
  [OK] program_b con 20 inputs -> 20
  [OK] 20 escenas completas
  [OK] ctrl_tex existe
  [OK] dashboard existe
  [OK] show_out existe
  [OK] show_window existe
  [OK] Repopath configurado -> C:/TDAI2026/td
  [OK] visuals/ encontrado -> C:/TDAI2026/td/visuals

  RESULTADO: TODO OK
```

**Si no:**

| Síntoma | Causa | Solución |
|---|---|---|
| `ModuleNotFoundError: No module named 'vjcore'` | La ruta `REPO` está mal | Comprueba que `REPO` apunta a la carpeta `td/`, no a la raíz del repo, y que usa `/` |
| `[!!] ctrl tiene canales -> 0 canales` | Normal si el CHOP aún no cocinó | Corre el script otra vez; si persiste, mira los `AVISO` de más arriba |
| `[!!] visuals/ encontrado` | El repo está incompleto | Faltan `td/visuals/*.frag` |
| Líneas `AVISO set <op>.<par>` | Un nombre de parámetro cambió en tu build de TD | Anótalas y pásamelas: el build sigue, pero ese parámetro quedó sin poner |

Los `AVISO` **no** abortan el build a propósito. Un `AVISO` sobre un
parámetro cosmético (color, posición) es irrelevante; uno sobre `cutofffrequency`
o `pixeldat` sí importa.

---

## Fase 3 — Primera imagen (sin audio, sin MIDI)

Todavía no conectes nada.

1. Ve a `/project1`.
2. Busca el TOP **`program_clean`** y activa su viewer (el círculo pequeño
   abajo a la derecha del nodo).

**Checkpoint 3** — debes ver la escena 0: **venas rojas luminosas moviéndose
lentamente sobre negro**, con pulsos que recorren los filamentos.

> `show_out` estará **negro**, y eso es correcto: `Safe Start Blackout` está
> activo a propósito para que nunca arranques mandando imagen al proyector.
> `program_clean` es el monitor limpio, sin master fade.

**Si no:**

| Síntoma | Causa | Solución |
|---|---|---|
| Negro total en `program_clean` | La escena 0 está congelada | `/project1` → Performance → desmarca y vuelve a marcar `Freeze Inactive Scenes` |
| Imagen de 1×15 píxeles | El GLSL TOP heredó la resolución del input | Mira si hubo `AVISO` sobre `outputresolution` en `/project1/scenes/scene0/content/shader` |
| El GLSL TOP en rojo (error) | El shader no compiló | Click derecho en `shader` → *View Errors*. Pásame el mensaje |
| Se ve pero está congelado | El Speed CHOP no avanza | Comprueba que el timeline de TD está en play |

---

## Fase 4 — Los knobs, a mano

Sin MIDI todavía. En `/project1`, pestaña **Control**, mueve los sliders:

| Slider | Qué debe pasar en las venas |
|---|---|
| `Speed` | El movimiento acelera/frena **suavemente, sin saltos** |
| `Density` | Se abre o se cierra la red: más venas y más ramificación |
| `Hue` | La paleta completa cambia: sangre → naranja → verde → cyan → violeta |
| `Chaos` | Las venas se retuercen más o van más rectas |
| `Brightness` | No verás nada en `program_clean` (solo afecta `show_out`) |

**Checkpoint 4** — los cuatro primeros cambian el visual de forma **clara y
distinta entre sí**.

> Que `Speed` no produzca saltos es intencional y es uno de los arreglos: el
> tiempo se integra en un Speed CHOP en vez de multiplicar tiempo real por
> Speed. Si mueves Speed y la imagen **salta de fase**, algo está mal.

---

## Fase 5 — Cambio de escena y dashboard

1. En `/project1`, activa el viewer de **`dashboard_ui`**.
2. Verás 20 tiles en rejilla 4×5 y el monitor de program a la derecha.
3. Haz click en el tile de la escena 1.

**Checkpoint 5**

- La escena 0 (venas) hace **fundido** hacia la escena 1.
- La escena 1 es un placeholder: un campo de ruido de color. **Cada escena
  placeholder tiene un color distinto**, así que ves de verdad que cambió.
- El borde del tile activo se pone **verde**. Durante el fundido, el tile de
  destino se pone **naranja**.
- En el panel de estado: `ACTIVA  ESCENA 01` y `COOCINANDO  1 / 20 escenas`.

Prueba también:
- `/project1` → Control → botones `Next Scene` / `Prev Scene`.
- `/project1` → Transitions → `Transition Seconds` a `2.0` y cambia de escena:
  el fundido debe durar 2 segundos.
- Cambia de escena **a mitad de un fundido**: debe redirigirse suave, sin
  parpadeo ni salto.

**Si no:**

| Síntoma | Causa | Solución |
|---|---|---|
| Los thumbnails están negros o congelados | Correcto: las escenas inactivas no cocinan | `/project1` → Performance → `Preview All` un momento para refrescarlos, luego apágalo |
| El click no hace nada | El viewer del container no está activo | Activa `Viewer Active` en `dashboard_ui` |
| Cambia de golpe, sin fundido | El Lag CHOP no está en cadena | Mira `/project1/xfade`: su valor debe **rampar** entre 0 y 1, no saltar |
| `COOCINANDO 20 / 20` | Performance Mode apagado | `/project1` → Performance → marca `Freeze Inactive Scenes` |

---

## Fase 6 — Audio

1. Selecciona `/project1/audio1` → parámetro **Device** → tu entrada
   (interfaz, o un loopback tipo VB-Cable / Blackhole si quieres capturar lo
   que suena en el sistema).
2. Pon música.

**Checkpoint 6** — activa el viewer de **`/project1/ctrl`** (Null CHOP). Debes
ver 15 canales, y `level`, `bass`, `mid`, `high` **moviéndose con la música**.

Ajusta en `/project1` → pestaña **Audio**:

- `Master/Bass/Mid/High Gain` → sube hasta que los canales lleguen cerca de 1
  en los picos, sin quedarse clavados arriba.
- `Beat Threshold` → baja hasta que `beat` dispare en cada bombo.
- `Kick Window` (0.35 s por defecto) → ventana de la media móvil. Más corta =
  más sensible a golpes rápidos.

**Checkpoint 6b** — vuelve a `program_clean`: las venas deben **pulsar con el
bombo** y engrosar con los graves.

**Si no:**

| Síntoma | Causa | Solución |
|---|---|---|
| `AUDIO  SIN DATOS (0 ch)` en el panel | Device no seleccionado | Elígelo en `audio1` |
| Canales existen pero valen 0 | Ganancia muy baja, o entrada muda | Sube los `Gain`; verifica en `audio1` que entra señal |
| `kick` clavado en 1 | Ganancia demasiado alta | Baja `Kick Gain` |
| `beat` no dispara nunca | Umbral muy alto | Baja `Beat Threshold` |

---

## Fase 7 — MIDI

1. Enchufa el MiniLab MkII **antes** de esto. Si lo enchufaste después,
   `/project1` → System → `Reconstruir Todo`.
2. `/project1/midi1` → parámetro **Device** → `Arturia MiniLab mkII`.
3. Mueve cualquier knob.

**Checkpoint 7a** — activa el viewer de `/project1/midi1`: deben aparecer
canales con nombres tipo `ch1cc112`. **Un control no aparece hasta que lo mueves
por primera vez.**

Ahora el mapeo:

4. `/project1` → pestaña **MIDI Mapping**.
5. Pulsa **`Learn Speed`**. El panel de estado del dashboard muestra
   `>> MIDI LEARN ARMADO: Speed`.
6. Mueve el knob que quieras para Speed.
7. El campo `Speed` se rellena solo (ej. `ch1cc112`) y se guarda en
   `td/config/midi_map.json`.
8. Repite: `Learn Density`, `Learn Hue`, `Learn Chaos`, `Learn Brightness`,
   `Learn Transition`.

**Checkpoint 7b** — mueve los knobs físicos: los sliders de `/project1` →
Control se mueven, y el visual cambia.

**Si no:**

| Síntoma | Causa | Solución |
|---|---|---|
| `MIDI  SIN DATOS (0 ch)` | Device no elegido, o no has movido nada | Elige Device y mueve un knob |
| Learn no captura | El slot no quedó armado | Pulsa `Cancelar Learn` y vuelve a intentar |
| El knob mueve **dos** parámetros | El mismo CC está en dos slots | Revisa la pestaña MIDI Mapping: no repitas nombres de canal |
| Funcionaba y dejó de funcionar tras reconstruir | El mapeo no se cargó | `/project1` → MIDI Mapping → `Cargar Mapeo`. Verifica que `Repopath` esté puesto |

---

## Fase 8 — Los pads

Con los pads es lo mismo, pero ojo: de fábrica salen por **canal 10**, no por
canal 1. Por eso el mapeo por defecto dice `ch10n36`.

1. `Learn Next` → golpea el pad 1.
2. `Learn Prev` → pad 2.
3. `Learn Blackout` → pad 3.
4. `Learn Snapshot` → pad 4.
5. `Learn Reset` → pad 5.

**Checkpoint 8** — pad 1 avanza de escena con fundido; pad 3 apaga y enciende
la salida (se nota en `show_out`, no en `program_clean`).

---

## Fase 9 — Presets por escena

1. Ve a la escena 0. Ajusta `Speed`, `Density`, `Hue`, `Chaos` a tu gusto.
2. `/project1` → Presets → **`Snapshot escena activa`** (o el pad 4).
3. Cambia a la escena 1, pon valores muy distintos, snapshot otra vez.
4. Vuelve a la escena 0.

**Checkpoint 9** — al volver, los knobs recuperan los valores que guardaste.
Se guarda en `td/config/presets.json`.

> Con knobs físicos absolutos habrá un salto la primera vez que toques el
> knob después de un recall: el preset dice 0.2 pero el knob está en 0.8.
> Es normal. Si te molesta: Presets → desmarca `Recall al cambiar escena`.

---

## Fase 10 — Salida al proyector

1. `/project1/show_out` es la salida final (con master fade y blackout).
2. `/project1/show_window` es la ventana. Ajusta **Monitor** al número de tu
   proyector.
3. Pulsa el parámetro **Open** de `show_window`.
4. `/project1` → System → **desmarca `Safe Start Blackout`**.
5. `/project1` → Control → desmarca `BLACKOUT`.

**Checkpoint 10** — la imagen aparece en el proyector. `Brightness` a 0 la
funde a negro; el pad de Blackout la corta.

> Deja `Safe Start Blackout` **activo** para el show real: garantiza que al
> abrir el proyecto nunca sale imagen sin que tú lo decidas.

---

## Fase 11 — Rendimiento

Mira el panel de estado del dashboard:

```
FPS         59.9  (OK)
GPU show    3.41 ms
COOCINANDO  1 / 20 escenas
```

**Checkpoint 11**

- `FPS` cerca de 60.
- `GPU show` por debajo de 8 ms (tienes 16.6 ms por frame a 60 fps).
- `COOCINANDO` en `1 / 20` en reposo, `2 / 20` durante un fundido.

Si no cuadra, ve a [05 — Performance](05_PERFORMANCE.md): la lista de palancas
está en orden de impacto.

---

## Fase 12 — Instalar un visual nuevo

Esta es la prueba que valida el flujo completo de trabajo.

```bash
cp td/visuals/_TEMPLATE.frag td/visuals/scene02_prueba.frag
```

Edita `scene02_prueba.frag` y cambia una línea, por ejemplo el `0.75` de la
saturación a `0.2`. Luego:

```bash
python3 td/tools/validate_shaders.py
```

En TouchDesigner: `/project1` → System → **`Recargar Shaders`**.

**Checkpoint 12** — la escena 2 cambia, y **NO pierdes** el device de audio, el
device MIDI, el mapeo ni los presets.

Eso es lo que hace que este rig se pueda seguir construyendo: recargar un
visual ya no es reconstruir el sistema.

---

## Resumen de checkpoints

| # | Fase | Señal de que va bien |
|---|---|---|
| 1 | Validar shaders | `0 con error` |
| 2 | Build | `RESULTADO: TODO OK` |
| 3 | Primera imagen | Venas rojas moviéndose en `program_clean` |
| 4 | Knobs a mano | Los 4 knobs cambian el visual de forma distinta |
| 5 | Escenas | Fundido + borde verde + `COOCINANDO 1 / 20` |
| 6 | Audio | `ctrl` moviéndose; venas pulsando con el bombo |
| 7 | MIDI | Learn captura; el knob físico mueve el slider |
| 8 | Pads | Pad 1 avanza escena; pad 3 hace blackout |
| 9 | Presets | Al volver a una escena, los knobs se recuperan |
| 10 | Proyector | Imagen en el segundo monitor |
| 11 | Rendimiento | 60 fps, `GPU show` < 8 ms |
| 12 | Visual nuevo | `Recargar Shaders` sin perder configuración |

---

## Si algo falla y no está en las tablas

Manda estas tres cosas:

1. El bloque completo de la Textport, incluyendo los `AVISO`.
2. Qué checkpoint fue el último que pasó.
3. Si es un shader: click derecho en el GLSL TOP → *View Errors*.

Con el número de checkpoint se acota el problema a una sola capa.
