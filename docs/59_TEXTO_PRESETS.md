# Texto con presets (fase 41)

Los nombres que se escriben en `/project1` > página **Texto** salen chicos, encima de la escena, y se mueven con uno de 10 presets. Todos bailan: crecen con el bombo, se mecen y ondulan con el bajo. Hoja: `docs/img/texto_presets.jpg` (`python3 td/tools/render_texto.py salida.jpg`).

| # | Preset | Movimiento |
|---|---|---|
| 1 | Centro | En el centro; late con el bombo |
| 2 | Flota | Respira, sube y baja, se inclina despacio en profundidad |
| 3 | Rebote | Rebota por toda la pantalla; cambia de color en cada choque |
| 4 | Cinta | Banda con los nombres pasando; horizontal, diagonal o vertical |
| 5 | Baila | Las letras ondulan con el bajo y saltan con el bombo |
| 6 | Lluvia | Nombres que caen a distintas profundidades |
| 7 | Órbita | Los nombres giran en un anillo inclinado |
| 8 | Glitch | Rebanadas y colores corridos en cada bombo |
| 9 | Eco | Copias que se van al fondo con cada tiempo |
| 10 | Lineup | Un nombre por esquina, mirando al centro; se prende el del tiempo |

**Variante.** Cada vez que se muestra el texto (pad 5, MOSTRAR/OCULTAR del dashboard) se sortea una variante: ángulo (recto, ±8°, ±26°, ±45° o vertical), inclinación en profundidad, distancia, tamaño, color del halo y velocidad. `Textseed` en el shader; "Otra variante" la cambia sin apagar.

**Preset.** Página Texto > Preset: 0 = uno distinto al azar en cada encendido (el Lineup solo con 2 nombres o más), 1–10 = fijo.

**Varios nombres.** En Texto se separan con `+`: `JAY INFINITO + DJ LUNA + MORTEM` (hasta 4). Los presets de un nombre usan el primero; Cinta, Lluvia, Órbita y Lineup usan todos.

**Red.** 4 Text TOP (una fila de 2048×256 por nombre) → Transform → Over → `text_atlas` → `program_textfx` (GLSL de 3 inputs: imagen, atlas, control) → `program_text` (Cross, fundido con `Textvisible` → Constant CHOP → Lag CHOP). Canales nuevos: `txtpre`, `txtseed`, `txtn`, `txtsize`. Cambian CHOP y DAT: **Reconstruir Todo** (o correr el Text DAT de arranque).
