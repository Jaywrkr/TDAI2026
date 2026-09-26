# Grabar video con audio

Referencia: [*2.2 Exporting a Video from TouchDesigner with Audio*](https://www.youtube.com/watch?v=xedvh5Slszk), de Miles Montgomery. [TouchDesigner documenta](https://docs.derivative.ca/Movie_File_Out_TOP) que `Movie File Out TOP` añade audio desde un CHOP *time-sliced* mediante el parámetro `Audio CHOP`.

El rig ya tenía `/project1/recorder` para guardar la imagen final. Ahora conecta `Recorder > Audio CHOP` a `/project1/audio1`, la misma señal que analizan los visuales. Se usa la fuente original para conservar sus canales (estéreo si la entrada tiene dos); `/project1/audio_mono` solo alimenta el análisis. No se añaden filtros ni procesamiento de audio a la grabación.

## Uso

1. En `/project1/audio1`, selecciona el dispositivo que realmente recibe la música. Si los visuales oyen otra fuente, la grabación también contendrá esa otra fuente.
2. En `/project1` → **Salidas**, elige **Carpeta de grabación** y pulsa **Empezar / parar grabación**. El archivo se guarda como `tdai2026_YYYYMMDD_HHMMSS.mov`.
3. Al parar, abre el archivo y comprueba imagen, sonido y sincronía. Haz una toma corta antes del set.

El botón cancela el inicio y muestra un mensaje si `Recorder > Audio CHOP` está vacío o apunta a un operador inexistente. Si la entrada existe pero no recibe señal, el archivo tendrá una pista silenciosa; revisa el medidor de `audio1` antes de grabar. Al reconstruir desde el repo se restaura la conexión. Los códecs y FPS concretos dependen de la configuración de Movie File Out en tu instalación.

La documentación de TouchDesigner indica que el grabador puede repetir fotogramas cuando el render cae por debajo del FPS objetivo para conservar la sincronía con el audio. Esta conexión y la importación del código están verificadas en el repo; la reproducción del `.mov` debe probarse en TouchDesigner con tu dispositivo de audio.
