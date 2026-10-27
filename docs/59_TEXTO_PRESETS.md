# Texto con presets (fase 41)

Los nombres que se escriben en `/project1` > Parameters > página **Texto** salen encima de la escena con uno de 13 presets. Todos bailan: crecen con el bombo, se mecen y ondulan con el bajo. Hoja: `docs/img/texto_presets.jpg` (`python3 td/tools/render_texto.py salida.jpg`).

| # | Preset | Movimiento |
|---|---|---|
| 1 | Centro | Chico en el centro; late con el bombo |
| 2 | Flota | Respira, sube y baja, se inclina despacio en profundidad |
| 3 | Rebote | Rebota por toda la pantalla; cambia de color en cada choque |
| 4 | Baila | Las letras ondulan con el bajo y saltan con el bombo |
| 5 | Lluvia | Nombres que caen a distintas profundidades |
| 6 | Órbita | Los nombres giran en un anillo inclinado |
| 7 | Glitch | Rebanadas y colores corridos en cada bombo |
| 8 | Recortado | Nombre gigante de lado a lado; la escena se ve solo dentro de las letras (a veces al revés) |
| 9 | Golpe | El nombre golpea con sacudida y un destello en el drop (y al prenderlo; sin drops, cada 8 compases) y se va |
| 10 | Patrón | Filas del nombre que corren en sentidos alternos, rectas o en diagonal; a veces como cinta de color |
| 11 | Decodificar | Signos al azar que se resuelven letra por letra en el nombre; se repite cada 8 compases |
| 12 | Profundidad | Copias en 3D detrás del nombre (extrusión) o un túnel de nombres que viene hacia la cámara |
| 13 | Cambio | En cada tiempo otro estilo: relleno, contorno, recortado, invertido o colores corridos |

**Variante.** Cada vez que se muestra el texto se sortea: ángulo (recto, ±8°, ±26°, ±45° o vertical), inclinación en profundidad, distancia, tamaño, color del halo, velocidad y estilo. Es `Textseed`; el botón "Otra variante" la cambia sin apagar.

**Elegir el preset.** Página Texto > Preset (0 = uno distinto al azar en cada encendido, 1–13 fijo), o en vivo con **Shift + perilla 1** del MiniLab (abajo del todo = al azar).

**Mostrar.** Pad 5 (banco A) o MOSTRAR/OCULTAR del dashboard.

**Varios nombres.** En Texto se separan con `+`: `JAY INFINITO + DJ LUNA + MORTEM` (hasta 4). Los presets de un nombre usan el primero; Lluvia, Órbita y Patrón usan todos.

**Red.** 5 Text TOP (filas de 2048×256: los 4 nombres y los signos de Decodificar) → Transform → Over → `text_atlas` → `program_textfx` (GLSL de 3 inputs: imagen, atlas, control) → `program_text` (Cross: fundido con `Textvisible` → Constant CHOP → Lag CHOP). Canales nuevos: `txtpre`, `txtseed`, `txtn`, `txtsize`, `txtt`, `txtlen`. Cambian CHOP y DAT: correr el Text DAT de arranque (o **Reconstruir Todo**).
