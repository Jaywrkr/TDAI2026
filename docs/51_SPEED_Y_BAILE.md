# Relevo para Claude: Speed, baile, brillo y piano

## Estado del repo al recibir este relevo

El proyecto tiene 98 escenas (`scene00`–`scene97`). Las escenas 58–97 son las 40 más recientes. La rama de trabajo es `codex/speed-and-reactive-details`; el último commit antes de este relevo es `f255057`. Los cambios descritos aquí como **pendientes** son instrucciones para el siguiente trabajo: **no están implementados por esta actualización de documentación**.

Ya se hizo lo siguiente:

- Se quitó una segunda multiplicación por `uSpeed` de las escenas 58–97. La perilla alimenta un reloj integrado `uTime`, sin saltos de fase al moverla.
- Los seis Detail de las escenas nuevas tienen más recorrido cerca del centro; se reforzaron controles especialmente débiles en 21 escenas.
- Las escenas 58–97 reciben una deformación espacial compartida por audio (`audioDanceUV` en `td/vjcore/shader.py`) y seis gestos de piano (`pianoGestureUV` y `pianoGestureLight`). El MIDI del piano acepta velocidades de nota 0–1 y 0–127.
- El canal `music` usa el nivel de audio crudo para impedir que una envolvente residual mueva los visuales al pausar el audio.
- Se probaron la conexión de canales, Speed y MIDI, se compararon fotogramas sintéticos de las 40 escenas y compilaron los 99 shaders en dos escenarios. **El aspecto y los FPS no se han validado en el TouchDesigner del usuario.**

**Comportamiento actual que hay que corregir:** `td/vjcore/control.py` calcula el reloj aproximadamente como `2 × Speed × (1 + 0.25 × bajo suavizado)` **solo mientras detecta audio**; en silencio lo pone en cero. Por eso Speed no anima por sí solo cuando el audio está pausado. `audioDanceUV` desplaza toda la imagen de cada escena nueva con ondas compartidas. Aunque cambia fase y frecuencia por escena, el usuario percibe el mismo giro o *twirl* en todo el bloque. El gesto de piano de tipo torsión también usa una rotación localizada; revisarlo al quitar el twirl.

## Criterio corregido por el usuario

Hay dos fuentes distintas de movimiento:

1. **Speed es el movimiento base intencional.** Debe seguir moviendo ruido, figuras o rotaciones propias de cada escena incluso sin audio. En cero, ese movimiento base se detiene; en el máximo debe ser bastante más rápido que ahora.
2. **El audio aporta reacción adicional.** Sin audio, desaparecen solo los gestos causados por graves, medios, agudos o kick. Con audio, los componentes de la escena reaccionan según su naturaleza. El bajo puede **sumar un poco** de velocidad al valor fijado por Speed; nunca debe restarla ni sustituirla. Ejemplo del usuario: si Speed fija 100, con audio oscila entre 100 y aproximadamente 104–108, jamás por debajo de 100. Es un ejemplo de proporción, no una unidad literal del CHOP.

Así, **silencio no significa imagen completamente congelada cuando Speed está por encima de cero**. La regla antigua de detener absolutamente todo en silencio queda reemplazada por esta aclaración. En silencio deben quedar quietos el baile y los destellos provocados por audio, mientras continúa el movimiento base de Speed.

## Siguiente paso 1 — escenas recientes 58–97

- Quitar el *twirl* o desplazamiento global que hace que todas las escenas parezcan moverse igual. Revisar `audioDanceUV` en `td/vjcore/shader.py`, su llamada en el footer y la torsión compartida del piano. No eliminar una rotación propia de una escena si esa rotación es parte de su diseño y está controlada por Speed.
- Hacer que el audio afecte **elementos internos** de cada visual, con gestos distintos: cada triángulo o figura puede responder en otra fase/dirección; el ruido puede variar su escala, visibilidad, densidad o movimiento; filamentos, partículas, mallas y bordes deben reaccionar según su material. Evitar deformar la imagen completa como si fuera una sola lámina. Evitar que la respuesta sea solo más brillo.
- Subir el brillo donde los visuales nuevos se ven apagados, conservando negros, contraste y color. Revisar tanto el brillo en reposo como el brillo durante golpes; no blanquear todo el fotograma.
- Respetar el significado `@D1`–`@D6` de cada `.frag`, la respuesta del piano y el objetivo de buen rendimiento. No añadir cadenas costosas de TOPs ni feedback innecesario.
- Comprobar, al menos con escenas representativas de cada familia y después en las 40, que: sin audio el movimiento propio de Speed continúa; con audio se mueven rasgos internos; no aparece twirl global; los detalles y las teclas siguen siendo perceptibles. Compilar los shaders y probar FPS en TouchDesigner si está disponible.

## Siguiente paso 2 — Speed en todas las escenas, especialmente 00–57

- Corregir el reloj compartido en `td/vjcore/control.py`: quitar la dependencia del detector de audio de la **velocidad base**. Mantener la integración del reloj para evitar saltos de fase. `Speed=0` detiene el movimiento propio del reloj; cualquier valor mayor avanza también en silencio.
- Aumentar de forma perceptible la velocidad máxima de la perilla. El bajo suavizado puede añadir una variación positiva pequeña sobre la velocidad seleccionada (el ejemplo de 100→104–108 es una buena referencia inicial); nunca debe reducirla. El 25 % máximo actual es mayor que el ejemplo reciente del usuario y debe revisarse.
- Auditar las escenas 00–57 y las 58–97 para evitar dobles multiplicaciones por `uSpeed`, animaciones con `uRTime` que ignoren la perilla y otras dependencias de audio que detengan el movimiento base. Conservar animaciones específicas de audio que se apaguen en silencio. Revisar el reloj `rtime`, que actualmente también se congela con la compuerta de música, antes de cambiarlo para no reactivar pulsos no deseados.
- Probar Speed en 0, mitad y máximo, cada uno con silencio y con audio. Medir que el mínimo de velocidad con audio **nunca** sea menor que la velocidad base seleccionada. Evaluar escenas viejas y nuevas en TouchDesigner, incluido el efecto real sobre FPS.

## Entrega y operación

El usuario quiere **commit y push a una rama**; él crea el PR y hace el merge. No abrir PR ni mezclar en `main` automáticamente. Tras cambios de `control.py`, `shader.py` o `midi_logic.py`, usar **Reconstruir Todo** en TouchDesigner o `vjcore.reload_all(); vjcore.build()` desde el Text DAT. No basta con `Recargar Shaders` para cambios de CHOP o DAT.
