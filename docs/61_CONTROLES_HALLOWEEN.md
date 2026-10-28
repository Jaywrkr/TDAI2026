# MiniLab en Halloween y los momentos de los pads (fase 43)

Las perillas **1 y 9** del MiniLab (y sus clics y Shift) son encoders relativos: mandan pasos (+1/−1 alrededor de 64) y TouchDesigner solo avisa cuando el valor cambia, así que no se pueden leer como posición. En Halloween quedan **sin función** (en el set principal siguen como siempre). El resto se reacomodó así (`td/sets/halloween/set.json` → `midi_redirect`):

![MiniLab en Halloween](img/minilab_halloween.png)

Mapa: `docs/img/minilab_halloween.png` (`python3 td/tools/render_minilab.py`; si cambia el `midi_redirect`, actualizar su tabla y volver a correr).

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

## Escenas VJ de imagen 39–43 (fase 44)

Cinco escenas que usan la imagen de la carpeta Media (como 20–25; todas muestran la misma imagen). `hkMediaGain` sube la exposición hasta ×4 si la foto es oscura. Hoja: `docs/img/visuales_imagen.jpg` (`python3 td/tools/render_visuales_imagen.py`, con la mansión y las calabazas del set como imagen).

| # | Escena | Qué hace con la imagen | Baile |
|---|---|---|---|
| 39 | Contorno neón | Sus bordes como líneas de neón sobre negro (D1 sensibilidad) | el trazo se dibuja desde el centro en cada tiempo; el bajo hace vibrar las líneas |
| 40 | Puntos de neón | La imagen hecha de puntos o rayas de luz (D1 grilla, D2 puntos→rayas) | crecen con el bajo; una onda sale del centro en cada tiempo |
| 41 | Caleidoscopio ritual | Mandala de 6 a 12 espejos con sello de neón | gira a saltos en cada tiempo; zoom con el bajo |
| 42 | Túnel de cuadros | Marcos dorados con la imagen que vuelan hacia la cámara | avanzan de a saltos en cada tiempo; la imagen late con el golpe; velas con el bajo |
| 43 | Pared de televisores | Recortes de la imagen en televisores viejos (D6: a veces todos muestran su parte de la imagen completa) | se prenden y apagan con el ritmo |

Van intercaladas en el setlist (después de 00, 13, 20, 10 y 35). Destellos ≤ 3/s (en la 42 el clímax ya no cambia la velocidad: multiplicar el tiempo por algo que cambia hacía saltar los cuadros). Para cambiar de imagen: pad 6 (Imagen siguiente).

## Escena 44: Villanos (fase 45)

Caras de villanos propios en estilo caricatura de los 80, como la referencia del usuario (colores planos, contorno grueso oscuro, tramas, look VHS), dibujadas en el shader: **hechicero calavera encapuchado, vampiro, bruja, rey calabaza y demonio**. Hoja: `docs/img/villanos.jpg` (arriba la paleta clásica, abajo la alterna con D5).

- **D1** una cara grande / trío / pared de 10 caras (cada casillero su villano).
- Cada 8 tiempos cambia el villano con un glitch de rebanadas; cabecean en cada golpe (en la pared, a destiempo), la mandíbula muerde con el bombo y los ojos brillan con el bajo. **D2** VHS (colores corridos, rayas, temblor), **D3** tramas, **D4** cuánto bailan, **D5** paleta, **D6** estrellas y halo.
- Piano: cada nota enciende los ojos de su villano. Momento: todos gritan.
- Destellos 2/s. Va en el setlist después del bosque de faroles (28).

## Escena 45: Revelado (fase 47)

La técnica de la segunda referencia del usuario (todo a oscuras y solo se prenden **pedazos del arte** con luces de color) aplicada a arte de Halloween: la **mansión** de la escena 26 (sus láminas, copiadas en `plates/scene45`, con su relieve). La fachada queda casi negra; está partida en pedazos irregulares (Voronoi) y en cada salto (cada 4, 2 o 1 tiempos, D2) se prenden otros. Cada pedazo es un foco rasante de un color (calabaza, violeta o veneno; con D5, magenta, cian o veneno) que enciende los filos del relieve: tablas, molduras, tejas. Algunas ventanas se encienden como ojos (D4) y un barrido tenue cruza cada 8 tiempos. D1 cuántos pedazos, D3 tamaño de los pedazos, D6 luna y cielo. Piano: prende los pedazos de su lado. Momento: se revela la casa entera. Hoja: `docs/img/revelado.jpg`. Destellos 0/s. En el setlist, después de la momia (12).

(La fase 46 había hecho una calavera robot; el usuario quería la técnica sobre arte de Halloween, no el robot: se reemplazó.)

## Escena 46: Vitral de pinball (fase 48)

La tercera referencia del usuario (el vidrio iluminado de un pinball): una ilustración densa de Halloween en espejo, con plomos de vitral y tramas, siempre visible y tenue: rey calabaza en llamas al centro, murciélago y luna arriba, fantasmas, calaveras con huesos cruzados, velas, arañas colgando, ojos que miran desde los paneles, murciélagos chicos, bumpers con estrella, caldero y flippers, telarañas en las esquinas y bombillas en el borde. Cada pieza es una **zona**; con el ritmo se prenden en secuencias que cambian cada 8 tiempos (cada 4 con D2): en cadena (una zona por tiempo), de lado a lado, con el golpe (el centro quema) y a oscuras con una zona de a una. Las zonas que queman se ponen blancas con rayas de luz (D4; el fondo solo brilla en color). La paleta cambia cada 8 tiempos (D5 elige la familia). D1 cuánto se prenden, D3 tramas y rayas, D6 bombillas. Piano: la zona de su lado. Momento: el tablero entero en blanco. Hoja: `docs/img/pinball.jpg`. Destellos 3/s (el límite). En el setlist después del carnaval (30).


## Perillas Detail con más rango (fase 49)

El pedido: que entre la perilla en 0 y en 127 (el MiniLab manda 0–127; adentro llega como 0..1) se note mucho más la diferencia. Medido antes del cambio, 219 de las 282 perillas (47 escenas × 6) cambiaban menos del 15 % de la imagen; muchas, entre 0 y 3 %.

**Cómo se hizo.** No hay un refuerzo global posible (el valor ya llega a 1). En cada escena se agrandó el rango de lo que mueve cada perilla con `hkDR(lo, medio, hi, d)` (common.glsl): en 0,5 queda el look de siempre (los presets se ven igual) y los extremos van de "casi no está" a "mucho". Donde lo que movía la perilla era chico o casi invisible se le sumó algo propio de la escena:

- 00 D4 también cierra el cielo (tormenta).
- 26 D4 deja siluetas paradas en las ventanas aunque no haya golpe.
- 16, 10 y 12 D6: humo/arena que llena la sala.
- 28 D4: más hojas y más claras.
- 14 D1: los cuervos que vuelan pasan por la luna.
- 45: cada tecla del piano prende su luz (la prueba de teclas la daba floja desde la fase 47).

Además:

- **El estado ya no deja la perilla clavada.** En 07, 08, 10, 14, 17, 18, 21 y 23, un estado de la escena sumaba tanto a la perilla que la dejaba en el máximo; ahora el estado empuja hacia arriba, pero la perilla sigue mandando.
- **Las velocidades no se agrandaron.** Las perillas que cambian una velocidad multiplicando el tiempo (por ejemplo 13 D3, 39 D2, 41 D4, 42 D2) quedan como estaban: agrandarlas hace saltar la imagen al girarlas.

**Medir.** `td/tools/medir_detail.py --set halloween` renderiza cada escena con cada Detail en 0 y en 1 (las otras en 0,5, música con pulso a 128 BPM y un instante con golpe) y mide el color que cambia y el movimiento. `--sheet hoja.jpg` arma la hoja; `MD_TW=420` la hace en grande. Una perilla que mueve algo chico (lápidas lejanas, ojos, grietas) cambia poca área aunque se note mucho: por eso el umbral de FLOJA es 8 %, y lo demás se revisó a ojo.

**Destellos.** `test_destellos.py --detail 1` (nuevo) prueba con las 6 Detail al máximo y `--detail 0` en el mínimo: todo ≤ 3/s. En la 02 los tubos gruesos con la calavera grande pasaban a 5/s; el grosor máximo quedó como antes y se afina cuando la calavera es grande.

Hoja antes/ahora: `docs/img/detail_rango.jpg`.
