# Sets de visuales y el show de Halloween

Un **set** es un show: sus escenas, su cantidad y sus ajustes. El **núcleo** (`td/vjcore/`) es uno solo para todos los sets: MIDI, audio, dashboard, transiciones, Master FX, texto, grabación, láser y failsafe son los mismos. Cualquier arreglo del núcleo les llega a todos los shows a la vez.

![Halloween](img/halloween_hoja.jpg)

![Halloween en el golpe con locura](img/halloween_locura.jpg)

![Halloween en el minuto 8](img/halloween_minuto8.jpg)

*Arriba: al empezar, con música y Chaos en 0.3. Al medio: en el golpe con la locura (Chaos) en 0.85. Abajo: la misma música en el minuto 8 (otro acto: otro encuadre, clima y color). Renderizadas fuera de TouchDesigner con `td/tools/render_scenes.py` (escena sola, sin bloom ni Master FX).*

## Elegir el show

En el Text DAT donde pegaste `td/RUN_ME.py`:

```python
SET = 'halloween'      # o 'tdai2026' para el set de siempre
```

y **Run Script**. El reporte del build lo confirma en la primera línea:

```
VERIFICACION DEL BUILD   [...]
  set: HALLOWEEN 2026  (20 escenas, sets/halloween/visuals)
```

El build guarda el set en `td/config/active_set.txt`, así que al reabrir el `.toe` (o con **Reconstruir Todo**) sigue siendo el mismo. En `/project1` → System, **Set de visuales** lo muestra, pero no se cambia ahí: se cambia en `RUN_ME.py`.

Los Devices de audio y MIDI y el mapeo MIDI se conservan al cambiar de set. Los **presets por escena** y las **miniaturas** van por separado en cada set, porque la escena 3 de un set no tiene nada que ver con la 3 del otro.

## Dónde vive cada cosa

```
td/
├── visuals/                     ← set 'tdai2026' (98 escenas, sin cambios)
└── sets/
    └── halloween/
        ├── set.json             ← lo que cambia en este set
        └── visuals/             ← scene00_*.frag ... scene19_*.frag
```

`set.json` de Halloween:

| Clave | Valor | Qué hace |
|---|---|---|
| `modern_from` | `0` | Todas las escenas usan la lógica nueva: Detail con más recorrido al centro, audio cortado por la compuerta de música, gestos de piano |
| `audio_dance` | `false` | **Sin el twirl global** (`audioDanceUV`): el audio mueve elementos de cada escena, no la imagen entera |
| `media_scenes` | `[6]` | La escena 6 (VHS de terror) usa la carpeta Media |
| `fullres_scenes` | `[8, 9]` | Telaraña y tormenta, de líneas finas, siempre a resolución completa |
| `output` | `[1280, 512]` | Salida **panorámica 2,5:1** para la tela de 5,0 × 2,0 m (ver abajo) |

La cantidad de escenas sale de contar los `.frag` de la carpeta.

## Las 20 escenas

| # | Escena | Speed mueve | El audio hace | Detail |
|---|---|---|---|---|
| 00 | Cementerio en la niebla | nubes y niebla | bajo espesa y enciende la niebla; golpe = relámpago que recorta las lápidas | niebla, lápidas, luna, relámpago, verde tóxico, horizonte |
| 01 | Jack o'Lantern | llama y brasas | bajo sube la luz interior; golpe aviva la llama y suelta brasas; piano enciende los ojos | tamaño, llama, brasas, sonrisa, gajos, aura |
| 02 | Calaveras de neón | las tres capas | cada calavera mastica a su ritmo; golpe abre las mandíbulas; bajo enciende los ojos | tamaño, grosor, ojos, masticar, colores, halo |
| 03 | Ojos en la oscuridad | parpadeo y mirada | golpe abre más pares de ojos; bajo aviva el iris; las pupilas siguen la tecla del piano | cantidad, abiertos, tamaño, brillo, amarillo↔rojo, niebla |
| 04 | Murciélagos y castillo | bandada y aleteo | golpe dispersa a cada murciélago hacia su lado y hace parpadear ventanas; bajo = halo de la luna | cantidad, luna, aleteo, dispersión, luna sangre, ventanas |
| 05 | Sangre que chorrea | los hilos bajan | golpe estira de golpe la mitad de los hilos; bajo = brillo húmedo | hilos, largo, grosor, brillo, rojo↔negro, pared |
| 06 | VHS de terror (Media) | banda y ruido | golpe = salto de tracking; bajo separa el color | ruido, tracking, sepia↔rojo, barrido, banda, contraste |
| 07 | Fantasmas | flotan y ondulan | medios agitan el borde de cada uno; golpe hace que se asomen | cantidad, transparencia, borde, brillo, blanco↔verde, niebla |
| 08 | Araña en su tela | araña y brisa | golpe hace vibrar los hilos (cada anillo con su fase); agudos = destellos del rocío | radios, anillos, araña, vibración, rocío, plata↔violeta |
| 09 | Tormenta gótica | nubes y lluvia | golpe = rayo (en otro lugar cada vez) que enciende las nubes; agudos en la lluvia | lluvia, ramas del rayo, rayos sin golpe, brillo, violeta↔azul, árbol |
| 10 | Portal infernal | remolino y llamas | bajo levanta las llamas; golpe hace latir el anillo y enciende runas; medios mueven el remolino | tamaño, llamas, remolino, runas, naranja↔verde, humo |
| 11 | Caldero de bruja | vapor y burbujas | bajo enciende el líquido; golpe revienta burbujas grandes y aviva las brasas | burbujas, vapor, brillo, brasas, verde↔violeta, chispas |
| 12 | Momia | polvo y respiración de las vendas | bajo enciende los ojos; golpe afloja las vendas; el piano mueve la mirada | vendas, separación, ojos, aflojar, verde↔ámbar, polvo |
| 13 | Calabazas en hilera | llamas y niebla | cada calabaza sigue una banda (graves a la izquierda, agudos a la derecha); golpe = ola de luz | cantidad, latido, ola, tamaño, naranja↔violeta, niebla |
| 14 | Luna de sangre y cuervos | nubes, vuelo y ramas | bajo hace latir la luna; golpe espanta a los cuervos posados | cuervos volando, luna, ramas, posados, cobre↔sangre, nubes |
| 15 | Manos de zombie | suben y mueven los dedos | golpe = estirón (cada mano con su retraso) y saltan terrones; bajo = luz de la tierra | manos, cuánto salen, dedos, estirón, verde↔rojo, tierra |
| 16 | Velas | titilan | bajo agranda los halos; golpe estira las llamas; medios las inclinan | velas, llama, halo, salto, cálida↔verde, humo |
| 17 | Esqueleto bailando | paso de baile | golpe = salto y brazos arriba; bajo enciende las baldosas; medios mueven la cadera | tamaño, energía, grosor, salto, hueso↔neón, piso |
| 18 | Túnel de calaveras | avance por el túnel | bajo enciende el fondo; golpe = anillo de luz hacia la cámara; medios giran el túnel | calaveras por vuelta, avance, anillo, ojos, antorcha↔verde, niebla |
| 19 | Glitch demoníaco | respira y mueve el ruido | golpe lo rompe en bloques; bajo hace arder los ojos; agudos = estática | líneas, ruptura, separación de color, ojos, rojo↔violeta, estática |

Con **Speed en 0** todo queda quieto. Con Speed arriba de 0 y **en silencio**, el movimiento propio sigue y solo se apagan las reacciones al audio.

## Locura (perilla Chaos) y kit compartido

En este set la perilla **Chaos (knob 4) es la locura**. En 0 las escenas son cinematográficas y sobrias; al subirla, cada golpe trae algo más fuerte: sacudida y zoom de impacto, relámpagos dobles, lenguas de fuego en la calabaza, un ojo gigante, murciélagos que se vienen encima, salpicaduras de sangre, VHS que rueda e invierte, fantasmas que se abalanzan gritando, un enjambre de arañitas, ojos dentro del portal, un géiser en el caldero, rayos de los ojos de la momia, calabazas que saltan, una bandada de cuervos, manos que revientan la tierra, ráfaga que tumba las velas, rayos X en el esqueleto, el túnel que se retuerce y el demonio que se desdobla.

Las funciones comunes viven en `td/sets/halloween/common.glsl` (en `set.json`, `"prelude": "common.glsl"`): acabado de cine (`hkFinish`: tonemap filmico, grano, negros con color, parpadeo de proyector), `hkShake`/`hkPunch`, rayos de luz `hkRays`, niebla `hkFog`, partículas `hkParticles`, rayos `hkBolt` y SDF básicos. Editar ese archivo cambia todas las escenas del set a la vez; **Recargar Shaders** lo toma.

## Rendimiento: nunca menos de 20 fps

Regla del show: **el FPS no puede bajar de 20**. Para eso:

- **Presupuesto por escena.** Medido con `render_scenes.py` (OpenGL por software, 640×360) en el **peor caso** (golpe, locura en 0.9, Detail en 0.5): las 20 escenas cuestan entre 6 y 12.4 ms, promedio 9.5. Como referencia, en la misma prueba la mediana de las 98 escenas de `tdai2026` es 8 ms y el 10 % más pesado pasa de 23 ms. Ninguna escena de Halloween está en ese grupo pesado.
- **Lo que se hizo para lograrlo:** el ruido caro se calcula solo donde se ve (niebla solo cerca del suelo, humo solo en su columna, fuego solo en los cortes), los murciélagos van en grilla por capas (cada píxel mira 3, no 24), las manos y velas lejanas se saltan, y `hkFog` usa una deformación barata.
- **Failsafe con piso propio.** En `/project1` → Failsafe, **Actuar si el FPS baja de** = 24 por defecto. Si el FPS pasa 4 s debajo de eso, el rig baja la escala de render (lo que menos se nota) antes de llegar a 20. Antes usaba el aviso de 55 fps y degradaba de más.
- **Falta medirlo en tu máquina**: los ms de arriba sirven para comparar escenas entre sí, no son los de tu GPU.

## Historia: 20-25 minutos con una sola escena

Cada escena avanza sola por **actos de ~78 s** (16 actos ≈ 21 minutos antes de repetir) y tiene **eventos propios** que aparecen solos, aunque no haya golpe. Todo esto es aritmética sobre el reloj, **no cuesta fps**. Usa el reloj real de la música (`uRTime`): se queda quieto en silencio y sigue cuando vuelve el audio.

- **En todas, cada acto:** la cámara reencuadra despacio (acercamiento y paneo suaves) y cambia algo del clima o del color.
- **Eventos por escena:**

| # | Eventos que pasan solos |
|---|---|
| 00 | tormenta seca con relámpagos (~47 s), luna de sangre (~2 min); el acto cambia nubes y niebla |
| 01 | la vela se apaga y vuelve con llamarada (~71 s), la calabaza se ríe (~53 s) |
| 02 | ola de luz que cruza el muro (~41 s), apagón y reencendido (~89 s); paleta distinta por acto |
| 03 | todos parpadean a la vez (~37 s), el ojo gigante se abre solo (~103 s); cantidad de ojos por acto |
| 04 | bandada enorme (~61 s), relámpago (~53 s), luna que sangra (~2 min) |
| 05 | la pared sangra entera (~50 s), salpicadura sola (~79 s); densidad por acto |
| 06 | cambio de canal con estática (~44 s), la cinta se come y estira (~97 s) |
| 07 | un fantasma pasa volando pegado a la cámara (~59 s), desaparecen y vuelven (~83 s) |
| 08 | la araña baja hasta la cámara (~67 s), ráfagas que sacuden la tela (~43 s) |
| 09 | pico de tormenta con rayos seguidos (~57 s); intensidad por acto |
| 10 | el portal se abre de par en par con ojos adentro (~73 s); el remolino cambia de sentido por acto |
| 11 | erupción sola del caldero (~64 s); color de la poción por acto |
| 12 | la antorcha casi se apaga y solo quedan los ojos (~73 s), gira la cabeza al público (~41 s) |
| 13 | persecución de luz calabaza por calabaza (~47 s), todas se vuelven rojas (~83 s) |
| 14 | bandada grande (~63 s), eclipse que cruza la luna (~2 min) |
| 15 | horda de manos y tierra que salta (~69 s); cantidad por acto |
| 16 | una corriente apaga las velas una por una y se reencienden (~61 s) |
| 17 | solo de baile enloquecido (~49 s), el piso hace olas (~91 s); estilo de baile por acto |
| 18 | acelerón por el túnel (~55 s), se encienden todos los ojos (~97 s); el túnel gira para otro lado por acto |
| 19 | el rostro se derrite (~43 s), posesión: ruptura total sin golpe (~89 s) |

Los tiempos son aproximados: cada evento cae en un momento al azar dentro de su ventana, así no se siente mecánico.

Funciones del kit para esto: `hkAct()`, `hkActVal(seed)`, `hkEvent(seed, cada, dura)`, `hkEventPhase(...)`, `hkCam(p)`.

## Agregar escenas al set

Igual que siempre, con `--set`:

```bash
python3 td/tools/add_scene.py --set halloween --slug momia respuesta.frag
python3 td/tools/add_scene.py --set halloween --dir carpeta_de_frags/
```

## Imagen panorámica (tela 5,0 × 2,0 m)

En NILA la pared llega a unos 2,7 m y la gente tapa la parte de abajo. Para una imagen amplia hay que ganar **ancho**, no alto: tela de 5,0 × 2,0 m (2,5:1), de 0,7 m a 2,7 m del piso.

- El set sale a **1280 × 512** (`output` en `set.json`). Respeta el tope de 1280 px de la licencia Non-Commercial y tiene un 29 % menos de píxeles que 1280 × 720, así que los FPS no bajan.
- Las escenas no se estiran: `centered()` usa el formato real, así que se ve más escena a los lados con la misma altura.
- `show_frame` (Fit TOP) centra la salida en un cuadro 16:9 (`config.PROJECTOR_ASPECT`) con franjas negras arriba y abajo. La ventana al proyector muestra ese cuadro. Con salida 16:9 no cambia nada.
- Para volver a 16:9, borra `output` del `set.json` o cambia Output Width/Height en /project1 > Output.
- Proyector (estimado de la foto, medir): de 10.000 a 12.000 lm ANSI, láser, 1080p, throw ratio de unos 1,1–1,3 (distancia ÷ 5,0 m), lens shift vertical, colgado invertido en la estructura.
- Tela: 5,25 × 2,1 m de lycra de proyección gris clara mate en bastidor de aluminio, de una sola pieza y opaca, para tapar el letrero NILA.
- Vista previa: `python3 td/tools/render_scenes.py salida/ --set halloween --size 1280x512`.

Después de cambiar el formato hay que **Reconstruir Todo**.

## La noche: más oscuro y más gore con la hora

La fiesta va de las 22:00 a las 05:30 y el set acompaña. El canal `night` (0..1) sale del reloj de la máquina y lo usa el kit de Halloween en `hkFinish`, así que vale para las 20 escenas sin tocarlas una por una.

- **Página Noche de /project1:**
  - **Noche automática:** usa el reloj.
  - **Hora de inicio / Hora de fin:** 22 y 5,5 por defecto; la ventana puede cruzar la medianoche.
  - **Noche manual:** se usa cuando Noche automática está apagada.
  - **Intensidad:** multiplica el efecto entero.
- **Antes y después de la ventana:** antes de la hora de inicio vale 0; después de la hora de fin (de día) vale 1.
- **Qué hace a medida que avanza:**
  - **Color:** quedan menos colores (solo rojos, naranjas y fuego), los negros se hacen más profundos, los brillos más fuertes y el viñeteo más cerrado.
  - **Desde 15 %:** humo en los bordes y brasas que suben por los costados.
  - **Desde 35–40 %:** telarañas en las esquinas de arriba y murciélagos que revolotean.
  - **Desde 55 %:** lenguas de fuego en el borde de abajo, que suben con el bajo y el golpe.
  - **Desde 70 %:** sangre que chorrea desde el borde de arriba.
  - **Desde 85 %:** latido rojo en los bordes con el bombo.
- **Rendimiento:** todo pasa en los bordes. El centro de cada escena no se tapa y ahí no se calcula nada.
- **Vista previa:** `python3 td/tools/render_scenes.py salida/ --set halloween --night 0.8`.

## Láminas: realismo sin cargar el procesador

Una escena puede traer **láminas**: capas PNG con lo que no se mueve (sierra, colinas, lápidas, suelo, luna, texturas de nubes y niebla), dibujadas con todo el detalle fuera de línea. En vivo el shader solo las lee y les pone encima todo lo que se mueve: niebla, luz, relámpagos, fuegos fatuos, viento y parallax. Leer una textura en el GPU cuesta casi nada.

- **Dónde van:** `td/sets/<set>/plates/sceneNN/*.png`. Entran al GLSL TOP después de ctrl (y de media), en orden alfabético. En el `.frag` se leen con `plate0(uv)`, `plate1(uv)`… y con `plateNWrap(uv)` para las texturas que se repiten.
- **Cuándo se cargan:** el build crea un Movie File In TOP por lámina. Si se agregan o quitan láminas, o se mueve la carpeta `td/`, hay que hacer **Reconstruir Todo**. Si solo cambia el contenido de un PNG, alcanza con recargar el archivo.
- **Tamaño:** máximo 1280 px por lado (licencia Non-Commercial). `test_sets.py` lo verifica.
- **Escena 00:** `python3 td/tools/bake_plates_cementerio.py` vuelve a generar sus 6 láminas:

| Lámina | Qué es |
|---|---|
| `1_lejos` | sierras y capilla: R luz, G cuál sierra, B ventanas, A cobertura |
| `2_medio_pocas` y `3_medio_muchas` | colinas, reja y lápidas; D2 pasa de una a otra |
| `4_cerca` | lápidas cercanas, cruz celta, suelo y pasto |
| `5_ruido` | ruido que se repite: R nubes, G y B niebla, A detalle |
| `6_luna` | luna con cráteres |

- **Codificación del color:** las láminas de color guardan color lineal ×2 con gamma 2.2; la escena lo decodifica con `plateCol()`.
- **Reemplazarlas por fotos o arte:** sirve cualquier PNG con el mismo nombre y el mismo encuadre (ver las constantes `FAR_Y`, `MID_Y` y `NEAR_Y` en la escena).

## Verificar fuera de TouchDesigner

```bash
python3 td/tools/test_sets.py                                  # sets, Detail y compilación
TDAI_SET=halloween python3 td/tools/validate_shaders.py         # compila el set
python3 td/tools/render_scenes.py salida/ --set halloween       # PNG de cada escena + _hoja.png
python3 td/tools/render_scenes.py salida/ --set halloween --audio golpe --d 0.6
```

`render_scenes.py` acepta `--chaos 0.9` para ver la locura. Dibuja el **mismo GLSL** que corre en TD (OpenGL 3.3 por software). Necesita `pip install moderngl numpy pillow` y Mesa (`libegl1 libgl1-mesa-dri` en Linux). Sirve para ver el aspecto; **no mide los FPS de tu máquina**.

## No verificado

Las escenas compilan y se ven bien en el render por software, pero **no se han probado en tu TouchDesigner**: falta ver los FPS reales y cómo se ven con bloom, Master FX y el proyector.
