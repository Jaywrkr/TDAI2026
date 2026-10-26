# Halloween: tres escenas VJ para tocar en vivo

El set Halloween tiene ahora **34 escenas**. Las nuevas son procedurales: no necesitan Media ni láminas adicionales. Aparecen al final del setlist y tienen miniatura y preset de fábrica.

| Índice | Escena | Movimiento |
|---|---|---|
| 31 | Portal ritual | Túnel de pentagramas y anillos de neón en perspectiva |
| 32 | Calabazas acid | Mosaico de caras talladas, giro independiente y luz de golpe |
| 33 | Espectros neón | Fantasmas de líneas luminosas con ondas y ojos |

Las seis Detail de cada escena están descritas en su `.frag`. Speed mantiene el movimiento sin audio; los golpes avivan los elementos; cada voz del piano ilumina su zona. **Momento** activa el clímax de 22 segundos, con entrada y salida suaves. Mantienen el acabado, paletas, capas y controles del set Halloween.

Para probar: actualizar la rama, seleccionar `SET = 'halloween'` en el Text DAT de arranque y **Reconstruir Todo**, pues cambió la cantidad de escenas. Confirmar 34 escenas en el reporte y lanzar 31–33 desde el dashboard o navegador. Los snapshots personales existentes prevalecen sobre los presets de fábrica.

El guion horario conserva sus 158 cues y el cierre de las 05:31: estas tres escenas están disponibles para selección manual y para el setlist/autopilot, pero todavía no están programadas en el guion.

## Texto en Mac: diagnóstico pendiente

Se reportó un damero al activar el texto. El shader del texto compila fuera de TD; eso no demuestra que los TOPs o sus parámetros funcionen en el Mac. No se atribuye aún a GLSL ni se aplica una corrección especulativa.

Con el fallo visible, revisar **View Errors** en `/project1/program_text`, `/project1/text_overlay_src`, `/project1/text_overlay_y` y `/project1/text_fade_tex`. Copiar el mensaje exacto y la versión de TD para corregir la causa y reproducirla en una prueba. Mientras tanto, ensayar también con Textvisible apagado y comprobar que el show continúa.
