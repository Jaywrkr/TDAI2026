# Correccion de la ruta compartida de salida

Se corrige una diferencia entre la red construida y la probada fuera de TouchDesigner: `bloom_prefilter` conectaba la imagen en 0 y el control en 2, dejando vacia la entrada 1, y el header leia el sampler 2. El validador manual probaba dos entradas contiguas y un header distinto. El constructor usa ahora 0/1 para el prefiltro y 0/1/2 para la segunda pasada. La nueva prueba ejecuta el constructor y compila sus DAT con la cantidad de entradas conectadas; reproduce el indice invalido anterior y comprueba la correccion.

Texto y bloom calculan el tamano de texel con `textureSize`, sin depender de una estructura `uTD2DInfos` simulada por el validador. La prueba de texto ejecuta el shader sin esos metadatos, con fundido apagado y encendido, y verifica el fondo y la cobertura de letras.

`Recargar Shaders` actualiza tambien el bus de salida y repara el cableado anterior del prefiltro. Reconstruir vuelve a leer los modulos Python del disco. El build muestra `shared-output-fix-v1`.

La comprobacion de salida, desde el diagnostico, conserva la imagen de entrada cuando un efecto de postproceso no puede compilar. Si falla el shader del texto, se usa una composicion nativa con el mismo Text TOP y el mismo fundido. El panel indica `SALIDA RECUPERADA` y los efectos afectados; no se oculta el fallo ni se puentean los shaders de escena hacia la textura de control. La recarga permite reintentar los efectos. El registro de shaders incluye tambien texto, bloom y capas.

Para instalar en una sesion ya abierta, actualizar `main` y volver a ejecutar el Text DAT de arranque (`RUN_ME`, con la ruta local y Halloween seleccionados). Esto carga los modulos corregidos y reconstruye la red, incluida la ruta nativa del texto. Las 40 escenas y los presets del set se conservan.

Las pruebas de red, compilacion y render fuera de TD no sustituyen la verificacion de la salida en el equipo del evento. Esta correccion reproduce y elimina el defecto de cableado encontrado; no establece, por si sola, la causa de todos los 59 avisos observados en el Mac.
