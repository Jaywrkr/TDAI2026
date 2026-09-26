# Speed, Detail y movimiento con la música

La perilla **Speed** decide la velocidad base: en 0 el reloj no avanza, en 0.5 va a media velocidad y en 1 llega al máximo. Mientras hay música, el bajo suavizado puede sumarle hasta un 25 % de esa velocidad. El bajo no decide si el reloj avanza o se detiene. Si el medidor de entrada está bajo el umbral de silencio, el reloj queda en cero.

Las escenas **58–97** ya no vuelven a multiplicar `uTime` por `uSpeed`. Ese doble factor hacía que el punto medio de la perilla se moviera mucho menos que a media velocidad. Cada escena conserva su ritmo propio como un factor constante de `uTime`.

En esas 40 escenas, los controles `Detail 1–6` recorren más efecto cerca del centro. También se reforzaron los detalles más débiles de 21 escenas, incluidos reflejos, grietas, color, partículas, pigmento y luces centrales. Una deformación suave del dibujo responde por separado a graves, medios y golpes. Su fase y frecuencia varían por escena para que los visuales no se muevan idénticamente. La compuerta `music` corta la deformación y los cinco canales de audio de esas escenas al entrar en silencio. No se aplica zoom automático. Los gestos propios de cada visual siguen presentes.

## Teclas del piano en las escenas 58–97

Cada nota produce un gesto visible en la geometría de la escena. Hay seis formas de respuesta que se reparten entre las escenas: onda expansiva, cuerda que se flexiona, torsión localizada, barrido horizontal, pliegue diagonal y carril ondulante. La nota elige el lugar del impacto; la velocidad MIDI controla su fuerza. Un trazo de color y una luz breve en el punto de contacto muestran el recorrido del gesto, también sobre fondos negros. La tecla funciona aunque el audio esté pausado y vuelve al estado anterior cuando termina `keypulse`; no añade un ciclo de movimiento automático.

La entrada MIDI acepta velocidades expresadas en 0–1 o en 0–127. Antes, una velocidad ya normalizada se dividía entre 127 y quedaba casi en cero.

Después de actualizar el repositorio, usa el botón **Reconstruir Todo** de TouchDesigner o ejecuta `vjcore.reload_all(); vjcore.build()` desde el Text DAT del proyecto. La reconstrucción es necesaria porque cambió el Speed CHOP y el DAT de lógica MIDI, además de los shaders.

Las pruebas automáticas comprueban la curva de Speed, la compuerta de silencio, los 40 shaders y su compilación. La intensidad y los FPS finales deben comprobarse en TouchDesigner con música real.
