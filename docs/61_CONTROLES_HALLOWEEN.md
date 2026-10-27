# MiniLab en Halloween y los momentos de los pads (fase 43)

Las perillas **1 y 9** del MiniLab (y sus clics y Shift) son encoders relativos: mandan pasos (+1/−1 alrededor de 64) y TouchDesigner solo avisa cuando el valor cambia, así que no se pueden leer como posición. En Halloween quedan **sin función** (en el set principal siguen como siempre). El resto se reacomodó así (`td/sets/halloween/set.json` → `midi_redirect`):

## Perillas

| Perilla | Función |
|---|---|
| 1 | — (sin uso) |
| 2 | **Miedo** (calma → terror) |
| 3 | Velocidad |
| 4 | Estilo aerógrafo |
| 5 | Locura (Chaos) |
| 6 | Audio: cuánto baila con la música |
| 7 | Estela |
| 8 | Brillo general (master) |
| 9 | — (sin uso) |
| 10–15 | **Detail 1 a 6** |
| 16 | Noche (intensidad) |

La **paleta del estilo** queda automática (cambia en cada acto) y el **marco de arco** del estilo ya no existe.

## Tiras

| Tira | Función |
|---|---|
| Pitch (vuelve al centro) | Zoom de la estela |
| Mod (derecha) | **Brillo (bloom)**: abajo nada brilla, arriba brilla todo; siempre late con la música (con la perilla 6 en 0 queda quieto) |

## Pads

| Pad | Función | Pad | Función |
|---|---|---|---|
| 1 | Siguiente escena | 9 | Easter egg JAY |
| 2 | Escena anterior | **10** | **Linterna** (mantener) |
| 3 | Blackout | **11** | **Ojos en la oscuridad** |
| 4 | Autopilot | 12 | Strobe |
| 5 | Texto mostrar / ocultar (otro preset cada vez) | **13** | **Subida** (mantener) → **impacto** al soltar |
| 6 | Imagen siguiente (escenas de imagen) | **14** | **Murciélagos** hacia la cámara |
| 7 | Noche on/off | **15** | **Rebobinar VHS** |
| 8 | Imagen fija | 16 | Momento (clímax) |

Las capas (antes pads 14/15) y el navegador de escenas (antes perilla 9) siguen en los Parameters de `/project1`.

## Momentos (pads 10, 11, 13, 14, 15)

Hoja: `docs/img/momentos.jpg` (`python3 td/tools/render_momentos.py salida.jpg`). Cada toque sale un poco distinto (`Mseed`). Los LEDs: cada pad con su color y blanco mientras corre.

- **Linterna (10, mantener):** la sala a oscuras y solo un haz que busca por la escena, se queda en un lugar y busca otro; tiembla con el bombo. Al soltar vuelve la luz de golpe.
- **Ojos (11):** apagón de unos 2 tiempos con ~28 pares de ojos (amarillos, rojos, verdes) que se abren, parpadean y miran; vuelve la escena con un golpe.
- **Subida → impacto (13, mantener y soltar):** mientras se mantiene (hasta 8 s) zoom que entra, temblor creciente, color que se lava a blanco/rojo y respira cada vez más rápido; al soltar, onda expansiva desde el centro, saturación de golpe y un solo destello.
- **Murciélagos (14):** una bandada sale del fondo y vuela hacia el público; los más cercanos tapan la pantalla un instante.
- **Rebobinar VHS (15):** la escena retrocede ~1,6 s (Cache TOP `momento_cache`, a media resolución) con rayas de cinta, colores corridos y "◀◀", y vuelve en vivo con rayas de tracking.

Red: `momento_small` (Fit, media resolución, 8 bits) → `momento_cache` (Cache TOP, 96 cuadros) y `program_momentos` (GLSL de 3 inputs: imagen, cache, control) → `momentos_pick` (Switch: no cocina si no corre ningún momento). Va después de las capas y antes del bloom. Canales: `mlin`, `mlinoff`, `mojos`, `msub`, `msuboff`, `mbat`, `mrew`, `mseed`. El pad de mantener llama a `xOn` al apretar y a `xOff` al soltar (`midi_logic.onOnToOff`).

## Escenas VJ (31–38) con más baile

`hkBass()` (bajo suave) y `hkStepBeat()` (escalón que avanza en cada tiempo del pulso detectado; 0 sin pulso, así que en silencio se detiene) en `common.glsl`. En cada escena el audio mueve piezas propias: sellos y aros que se abren y saltan de giro (31), órbitas de máscaras y chevrones (32, 33), la telaraña y la araña que cae (34), túnel y alas (35), puertas que avanzan (36), serpientes que ondulan más y atacan (37), la calavera que muerde y crece (38). Lo que cambia con un golpe pasó del 1–19 % al 18–50 % de la imagen; destellos ≤ 3/s.

## Texto

- El atlas de nombres ahora es de **1280 × 800** (el tope de la licencia Non-Commercial; antes 2048 de ancho) y las filas se suman con Add TOP; el shader lee las letras por el blanco, no por el alfa.
- Diagnóstico: página Texto > **Ver atlas de nombres**: muestra el atlas tal como llega al shader, abajo a la izquierda.
- Colores de halos y cintas: calabaza, violeta, verde veneno, sangre, brasa y hueso. Rebote, Lluvia y Órbita se quedan más al centro.

Cambian CHOP, DAT y parámetros: correr el Text DAT de arranque. El build muestra `controles-momentos-f43`.
