# Escena 59: nebulosa de partículas

Referencia: [tutorial de tddsash, *SOP node family (particles) 5.4*](https://www.youtube.com/watch?v=qKzo4lpGAjk). La captura proporcionada por el usuario define el aspecto buscado: nube irregular de filamentos cian y blancos, chispas cortas y arcos largos sobre negro. El video explica el movimiento y la red de operadores.

| Tutorial | Escena 59 |
|---|---|
| Sphere + Sprinkle sobre la superficie | Puntos distribuidos sobre una máscara esférica irregular |
| Particle SOP, turbulencia y fuerza radial | Flujo local animado de cada punto y curvatura de filamentos |
| Line MAT dibujando puntos | Segmentos finos con longitud y dirección por partícula |
| Feedback + Level | Hebras largas y zonas de mayor concentración |
| Lookup azul + Bloom | Color azul/cian; pasa por el bloom compartido del rig |

La [vista previa del shader](img/particle_nebula_preview.png) se renderizó en WebGL a 960×540 con valores medios de las perillas, **sin el bloom final de TouchDesigner**. Sirve para juzgar la forma y detectar errores de shader antes de reconstruir el `.toe`. No es una captura de ejecución dentro de TouchDesigner.

La implementación tiene una pasada GLSL con 3×3 celdas de partículas por pixel y dos campos de filamentos de tres octavas. No crea diez mil SOPs ni feedback de alta resolución. `Detail 1–6` controlan radio, cantidad de chispas, turbulencia, longitud, filamentos y brillo. Speed anima el flujo cuando hay audio; al pausar la entrada, el reloj compartido se congela como en el resto del rig. Hue cambia la paleta completa.

Esta es una reconstrucción visual del efecto, **no una copia de la simulación de partículas del tutorial**. La compilación GLSL y la vista previa están verificadas; el aspecto con bloom y los FPS deben comprobarse en el equipo de show.
