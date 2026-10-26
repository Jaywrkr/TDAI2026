# Cinco escenas VJ de neon — Halloween 34–38

Halloween pasa a **39 escenas**. Estas cinco mantienen el trazo fino, cobertura antialias en pantalla y halo estrecho de las escenas 32 y 33. Son procedurales, sin Media ni nuevas laminas.

| # | Nombre | Composicion y movimiento | Piano |
|---|---|---|---|
| 34 | Telarana de frecuencias | Dos centros asimetricos, hilos dobles, ondas y nudos luminosos | Teje puentes entre nudos y los ilumina |
| 35 | Murcielagos en fuga | Bandada poligonal, nervaduras, aleteo y aproximacion en perspectiva | Desvia grupos a rutas propias |
| 36 | Laberinto maldito | Puertas de esquinas recortadas, rieles, marcas y simbolos grabados que se desplazan en profundidad | Ilumina secciones del pasillo |
| 37 | Serpientes electricas | Cintas sinuosas entrelazadas con escamas de diamante, espinas, ojos y lengua bifida | Acentua una serpiente por voz |
| 38 | Craneo de interferencia | Orbitas dobles, curvas de nivel, grietas y dientes individuales; franjas desplazadas y ecos laterales | Separa e ilumina zonas del grabado |

Cada shader documenta sus seis Detail. D5 cambia la paleta; D6 ajusta los detalles secundarios y el halo. Speed mantiene el movimiento en silencio; golpe y Momento aportan gestos locales. Momento usa el climax de 22 segundos con entrada y salida suaves.

## Cargar y ensayar

1. Actualizar a la rama de esta entrega, mantener `SET = 'halloween'` en el Text DAT y ejecutar **Reconstruir Todo**, porque cambio el numero de escenas.
2. Confirmar 39 escenas en el reporte del build. Lanzar 34–38 desde dashboard o navegador; tienen miniaturas y presets de fabrica propios.
3. Probar con musica, sin audio, con acordes y con Momento. Ajustar Detail desde el panel; la perilla 9 del MiniLab sigue siendo navegador.
4. Verificar nitidez y FPS en el Mac, con la resolucion real del show. Las capturas se renderizan fuera de TouchDesigner y no miden el rendimiento del equipo.

El guion de 158 cues se conserva: las cinco nuevas estan al final del setlist para seleccion manual/autopilot, **no** incorporadas al guion horario. Las escenas 00–33, el set general y el nucleo no cambian.

## Validacion

Compilacion GLSL 330 y 460/SPIR-V, con y sin audio; render Mesa/EGL; respuesta al piano y movimiento sin audio; presets y estructura del set. La prueba existente de destellos, a 60 cuadros/s y con Momento, mide maximos 2/0/0/2/0 para 34/35/36/37/38 (limite del test: 3). Es una comprobacion del escenario probado, no de todas las combinaciones posibles de controles y capas.
