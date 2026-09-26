# Acabados 001–010 integrados

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
| `acabado006.toe` | 59 `chromatic_feedback` | Imagen deformada y separación RGB. |
| `acabado007.toe` | 60 `orbital_cubes` | Cubos esquemáticos sobre una órbita inclinada. |
| `acabado008.toe` | 61 `audio_points` | Nube de puntos que se abre con el kick. |
| `acabado009.toe` | 62 `circle_tiles` | Matriz de círculos con posición, tamaño y color variables. |
| `acabado010.toe` | 63 `type_torus` | Marcas tipográficas abstractas sobre un aro orgánico. |

Cada escena es un solo GLSL TOP, usa `Detail 1–6`, `Speed`, `Density`, `Hue`,
`Chaos` y los canales compartidos de audio. Las deformaciones disparadas por
`Kick` y `Beat` quedan en cero en silencio; la animación propia de `Speed`
continúa como en las otras escenas. La escena 61 usa el análisis de audio del
rig y no necesita el archivo de audio que había dentro del TOE.

Las escenas 56 y 59 leen la carpeta **Media** común. El TOE 006 referenciaba
una imagen de una ruta local que no venía con los archivos recibidos; se
reemplazó por esta entrada. Ambas escenas tienen un patrón procedural visible
cuando falta la imagen.

La integración reemplaza las redes originales de múltiples TOPs, feedback,
render 3D y controles de interfaz por una pasada de shader por escena. Eso
reduce el número de pases de GPU y evita las texturas intermedias grandes de
los originales. La compilación está verificada fuera de TouchDesigner; el
aspecto final y los FPS se deben comprobar en el equipo de show.

Tras actualizar el código del repo en la máquina de TouchDesigner, hay que
reconstruir el proyecto para crear los nueve componentes nuevos. `Recargar
Shaders` solo recarga escenas que ya existen. Luego se pueden hornear las
miniaturas desde el dashboard para sustituir las tarjetas provisionales
de las escenas 55–63 en la guía web.
