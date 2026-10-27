# Correccion de la ruta compartida de salida

Se corrige una diferencia entre la red construida y la probada fuera de TouchDesigner: `bloom_prefilter` conectaba la imagen en 0 y el control en 2, dejando vacia la entrada 1, y el header leia el sampler 2. El validador manual probaba dos entradas contiguas y un header distinto. El constructor usa ahora 0/1 para el prefiltro y 0/1/2 para la segunda pasada. La nueva prueba ejecuta el constructor y compila sus DAT con la cantidad de entradas conectadas; reproduce el indice invalido anterior y comprueba la correccion.

Texto y bloom calculan el tamano de texel con `textureSize`, sin depender de una estructura `uTD2DInfos` simulada por el validador. La prueba de texto ejecuta el shader sin esos metadatos, con fundido apagado y encendido, y verifica el fondo y la cobertura de letras.

`Recargar Shaders` actualiza tambien el bus de salida y repara el cableado anterior del prefiltro. Reconstruir vuelve a leer los modulos Python del disco. El build muestra `shared-output-fix-v1`.

La comprobacion de salida, desde el diagnostico, conserva la imagen de entrada cuando un efecto de postproceso no puede compilar. Si falla el shader del texto, se usa una composicion nativa con el mismo Text TOP y el mismo fundido. El panel indica `SALIDA RECUPERADA` y los efectos afectados; no se oculta el fallo ni se puentean los shaders de escena hacia la textura de control. La recarga permite reintentar los efectos. El registro de shaders incluye tambien texto, bloom y capas.

Para instalar en una sesion ya abierta, actualizar `main` y volver a ejecutar el Text DAT de arranque (`RUN_ME`, con la ruta local y Halloween seleccionados). Esto carga los modulos corregidos y reconstruye la red, incluida la ruta nativa del texto. Las 40 escenas y los presets del set se conservan.

Las pruebas de red, compilacion y render fuera de TD no sustituyen la verificacion de la salida en el equipo del evento. Esta correccion reproduce y elimina el defecto de cableado encontrado; no establece, por si sola, la causa de todos los 59 avisos observados en el Mac.

## Revertido (fase 40, 27 de octubre de 2026)

Con esta corrección, en el Mac todas las escenas salían en gris con o sin audio. Se volvió el núcleo de salida (`program.py`, `__init__.py`, `config.py`, `control_script.py`, `diagnostics.py`, `validate_shaders.py`, `render_resplandor.py`) a la versión del merge 7f0ff32, la última que funcionó en el TD del usuario, y se quitó `test_program_runtime.py`, que probaba el código revertido. Las escenas 31–39, el setlist, los presets y las miniaturas de Codex se conservan. El build muestra `restaurado-f40 2026-10-27`.

## Causa real del gris (fase 40, segunda parte)

En el build del Mac, `ctrl` salía **sin los 7 canales de audio** (`level`, `bass`, `mid`, `high`, `kick`, `beat`, `groove`): audio1 se crea sin Device y el Device se restaura después del build. El header de cada shader se arma con los canales que tiene `ctrl` en ese momento; al llegar el audio, esos 7 canales entran en el índice 5 y todos los de después se corren 7 lugares. Cada escena lee entonces perillas equivocadas (pixelado, posterizado, tiempo, resolución) y la salida queda en un gris parejo, con o sin audio. Reproducido fuera de TD: `docs/img/gris_canales_corridos.jpg` (izquierda bien, derecha con los canales corridos).

Arreglo: `audio.py` agrega `audio_silent` (Constant CHOP con los 7 canales en 0) y `audio_out` (Switch CHOP): mientras `audio_ctrl` no tenga sus 7 canales, sale el silencio, así el orden de `ctrl` es siempre el mismo. Además, `program_text` no admite un cuarto input en el Mac (`ERROR conectando program_text[3]`): si la textura de control no entra, el texto usa el header sin control en vez de leer `sTD2DInputs[3]`. El build muestra `restaurado-f40b 2026-10-27`.

