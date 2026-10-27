# Pinball embrujado — escena 39

Prototipo inspirado en el video de referencia de pinball ilustrado: composicion estable, superficies de color separadas por contornos negros, tramas y grupos de luces independientes. El tema es Halloween: calabaza central, calavera y fantasma en paneles laterales, murcielagos, rosetas, rampas y paletas.

La animacion se concentra en las zonas del tablero. El reloj de Speed recorre los insertos y los barridos; los golpes acentuan luces locales. Las seis voces del piano iluminan seis grupos de insertos, sin depender de que haya audio. Momento aporta un recorrido mas intenso mediante la envolvente compartida de 22 segundos.

| Detail | Funcion |
|---|---|
| D1 | Intensidad de las superficies de color |
| D2 | Recorrido automatico de luces |
| D3 | Tramas y grabados interiores |
| D4 | Barridos locales sobre las ilustraciones |
| D5 | Paleta fuego/violeta a veneno/cian |
| D6 | Bombillas y halo |

Se agrega al final del setlist, con preset y miniatura propios. Halloween pasa a **40 escenas**. Para probar, actualizar la rama y ejecutar **Reconstruir Todo**; confirmar 40 escenas y lanzar la 39. No necesita Media, laminas externas, ni dependencias nuevas. El guion horario conserva sus cues: esta escena se selecciona manualmente o desde el setlist/autopilot.

Se verifican compilacion GLSL 330/460 con y sin audio, render Mesa/EGL, respuesta al piano (ninguna medicion clasificada como floja por el test existente), estructura del set y presets. La prueba de destellos existente a 60 cuadros/s pasa con maximo 3 destellos/s en su escenario de Momento. El video de vista previa usa control y pulsos sinteticos; no es una captura de TouchDesigner ni mide FPS del Mac. Comprobar el aspecto, brillo y rendimiento en el equipo del evento.
