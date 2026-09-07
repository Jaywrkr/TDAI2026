# 07 — Carpeta común de media

Tres de las 36 escenas no dibujan: **tratan una imagen tuya**.

| Escena | Qué hace con la imagen |
|---|---|
| **19 — Media Glitch** | La rompe: pixelado, separación cromática, tearing de bloques |
| **34 — Caleidoscopio** | La pliega en un mandala simétrico que gira |
| **35 — Trama / Halftone** | La reimprime como una rejilla de puntos de tinta |

Las tres leen **la misma carpeta y la misma imagen al mismo tiempo**.

Eso no es un detalle de implementación, es la razón de que existan las tres:
pasar de la 19 a la 34 a la 35 en vivo muestra **el mismo material tratado de
tres maneras**, y se lee como una progresión sobre una idea. Si cada escena
tuviera su propia carpeta (que es como estaba antes) el cambio de escena sería
también un cambio de contenido, y se leería como tres cosas sueltas.

---

## Puesta en marcha

1. Hacé una carpeta en el disco y metele imágenes, GIFs o clips.
   Extensiones que entran: `.png .jpg .jpeg .gif .bmp .tif .tiff .webp .mov .mp4`
   (lo demás se ignora, así que un `leeme.txt` ahí adentro no molesta).
2. `/project1` → pestaña **Media** → **Carpeta de imagenes / GIFs** → pegá la ruta.
3. Listo. La lista se ordena por nombre de archivo, así que si querés un orden
   concreto, numerá los archivos: `01_...`, `02_...`.

Si agregás o sacás archivos **con TouchDesigner ya abierto**, apretá
**Releer la carpeta**. La lista está cacheada a propósito: esto lo consulta la
expresión `file` de tres Movie File In TOPs, o sea que corre en cada frame, y
un `os.listdir` por frame se nota en los fps.

> **Si el visual sale negro**, el panel de estado del dashboard te dice por qué:
> muestra `MEDIA: sin carpeta o 0 archivos` cuando la escena activa es una de
> las tres y no hay nada que mostrar. Cuando sí hay, muestra el modo, la
> posición (`07/24`) y el nombre del archivo.

---

## Cómo cambia de imagen

Un solo parámetro decide quién manda: **Mediamode**. Los botones
(Next / Prev / Al azar) y el toggle **CONGELAR** funcionan siempre, en
cualquier modo.

| Modo | Cuándo cambia | Para qué sirve |
|---|---|---|
| **MANUAL** | Nunca sola | Vos elegís el momento. Es el modo de un set ensayado |
| **TIEMPO** | Cada N segundos | Fondo que respira solo mientras hacés otra cosa |
| **BEAT** | Un cambio por bombo | Muy rápido, casi estrobo. Para un pico |
| **COMPÁS** | Cada N golpes | **El que más se usa**: el cambio cae "en el 1" |
| **PIANO** | La tecla **elige** la imagen | Control directo, ver abajo |

### TIEMPO

**Segundos** en 0 significa "sacalo de la perilla Speed" (Speed al mínimo ≈ 8s,
al máximo ≈ 1.5s). Cualquier otro valor manda sobre Speed. Es así porque el
sistema nació sin perillas libres: si no querés pensar en esto, dejalo en 0 y
la perilla que ya usás para todo lo demás también controla el ritmo del pase.

### COMPÁS

**Cada cuántos golpes** = 4 es el default y es lo que querés casi siempre: la
imagen cambia una vez por compás, en el primer tiempo. Con 8 o 16 el cambio se
vuelve un evento estructural (cada dos compases, cada cuatro). Con 1 es
idéntico a BEAT.

### PIANO — el que vale la pena aprender

Las 25 teclas se reparten sobre la carpeta **entera**: la tecla más grave es la
primera imagen, la más aguda es la última, y el resto se reparte en el medio.

Lo que esto te da y ningún modo automático puede darte:

- **Tocar una escala pasa las imágenes en orden**, al ritmo que vos toques.
- **Volver a una tecla vuelve a esa imagen exacta.** Podés volver a algo que
  funcionó, en el momento justo, sin buscarlo.
- Es un instrumento: la carpeta deja de ser una playlist y pasa a ser un
  teclado.

Con carpetas de hasta ~25 archivos hay una tecla por imagen. Con más, varias
teclas caen en la misma imagen (siguen en orden, solo que en escalones).

**El teclado sigue haciendo su efecto de siempre** en el visual (el movimiento
de firma de cada escena) — elegir la imagen es un trabajo *adicional* de la
misma tecla, no un reemplazo.

---

## Los cuatro controles que funcionan siempre

| Control | Qué hace |
|---|---|
| **Imagen siguiente / anterior** | Un paso en el orden de recorrido |
| **Imagen al azar** | Salta a cualquier otra (nunca a la misma) |
| **CONGELAR imagen actual** | El blackout de la media: clava lo que hay y ningún modo automático se lo lleva |
| **Orden barajado** | Cambia el orden de recorrido, ver abajo |

Los cuatro son **aprendibles por MIDI** (pestaña MIDI Mapping: `Learn Medianext`,
`Mediaprev`, `Mediarandom`, `Medialock`). El que de verdad pide un pad físico es
**Medianext**: en modo MANUAL es *la* forma de pasar imágenes.

### Orden barajado ≠ al azar

**Al azar** tira un dado cada vez. Sirve como gesto puntual, pero como motor es
malo: repite la misma imagen dos veces seguidas y deja media carpeta sin salir
nunca.

**Orden barajado** baraja la carpeta **una sola vez** y la recorre entera. Ves
todas las imágenes, una vez cada una, y recién ahí vuelve a empezar. Es lo que
hace el shuffle de un reproductor de música decente, y es lo que querés para un
set largo.

---

## Cómo armar la carpeta (lo que importa en la práctica)

- **Contraste alto y siluetas claras.** Las tres escenas trabajan sobre la
  *forma*, no sobre el detalle fino. Una foto de paisaje con todo en medios
  tonos se convierte en papilla en las tres; un logo, una silueta, una textura
  gráfica o una foto muy contrastada funcionan en las tres.
- **El caleidoscopio no necesita que la imagen sea buena.** Es literalmente su
  razón de ser: pliega cualquier cosa en un mandala. Ahí sí podés meter
  material feo.
- **La trama sí necesita luminancia.** Trabaja con el brillo, no con el color:
  una imagen oscura y plana da una trama vacía. Probá `Detail 3` al máximo para
  que los puntos conserven el color original.
- **GIFs**: entran, y loopean solos. Un GIF corto en modo COMPÁS es una
  combinación muy buena — el clip loopea a su ritmo y la imagen cambia al tuyo.
- **Numerá los archivos** si querés un orden narrativo (y dejá **Orden
  barajado** apagado).

---

## Dónde está cada cosa en el código

| | |
|---|---|
| Qué escenas usan media | `td/vjcore/config.py` → `MEDIA_SCENES` |
| Los modos | `td/vjcore/config.py` → `MEDIA_MODES` |
| El motor (escaneo, orden, avance, lock, piano) | `td/vjcore/dats/control_script.py` → sección *CARPETA COMÚN DE MEDIA* |
| El avance por bombo | `td/vjcore/dats/media_logic.py` |
| La tecla que elige imagen | `td/vjcore/dats/midi_logic.py` → `_handlePianoKey` |
| Los parámetros | `td/vjcore/builder.py` → página *Media* |
| Tests offline | `python3 td/tools/test_media_comun.py` |
