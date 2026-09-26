# Acabados 001–010 revisados

Los `.toe` originales se inspeccionaron fuera de TouchDesigner. Las escenas nuevas
son reconstrucciones de sus ideas visuales en GLSL; no son conversiones exactas de
cada operador ni copias de sus scripts. No se incluyen los `.toe` ni sus recursos
externos en el repositorio.

| TOE | Escena | Reconstrucción |
|---|---|---|
| `acabado001.toe`, `acabado002.toe` | 55 `feedback_ribbons` | Franjas, eco y distorsión horizontal. Los archivos de entrada son idénticos por SHA-256. |
| `acabado003.toe` | 56 `tile_repack` | Recortes de imagen reordenados en baldosas. |
| `acabado004.toe` | 57 `type_spiral` | Trazos con aspecto tipográfico distribuidos en espiral. |
| `acabado005.toe` | 58 `feedback_ink` | Remolinos y filamentos de tinta. |
| `acabado006.toe`–`acabado010.toe` | Retiradas | Las escenas 59–63 se quitaron por petición del usuario (visuales 60–64 al contar desde uno). |

Cada escena es un solo GLSL TOP, usa `Detail 1–6`, `Speed`, `Density`, `Hue`,
`Chaos` y los canales compartidos de audio. Las deformaciones disparadas por
`Kick` y `Beat` quedan en cero en silencio. Los relojes de animación también
se detienen cuando el RMS de entrada cae bajo el piso de silencio.

La escena 56 lee la carpeta **Media** común y tiene un patrón procedural
visible cuando falta la imagen.

La integración reemplaza las redes originales de múltiples TOPs, feedback,
render 3D y controles de interfaz por una pasada de shader por escena. Eso
reduce el número de pases de GPU y evita las texturas intermedias grandes de
los originales. La compilación está verificada fuera de TouchDesigner; el
aspecto final y los FPS se deben comprobar en el equipo de show.

Tras actualizar el código del repo en la máquina de TouchDesigner, hay que
reconstruir el proyecto para crear cuatro componentes nuevos y retirar los
cinco eliminados. `Recargar Shaders` solo recarga escenas que ya existen.
Luego se pueden hornear las
miniaturas desde el dashboard para sustituir las tarjetas provisionales
de las escenas 55–58 en la guía web.
