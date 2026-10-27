# Halloween: tres escenas VJ para tocar en vivo

Estas tres escenas forman parte del set Halloween. El set tiene **39 escenas** con las cinco de [la siguiente entrega](56_HALLOWEEN_VJ_CINCO.md) (el Pinball embrujado, 39, se quitó en la fase 40). Las nuevas son procedurales: no necesitan Media ni láminas adicionales. Van intercaladas en el setlist (fase 40) y tienen miniatura y preset de fábrica.

| Índice | Escena | Movimiento |
|---|---|---|
| 31 | Portal ritual | Sellos concéntricos con runas, filigrana, iris de fibras y brasas |
| 32 | Calabazas acid | Máscara de líneas finas, anillos grabados, chevrones y sellos orbitales |
| 33 | Espectros neón | Mandala de siluetas de neón, dobles contornos, filamentos y estrellas |

Las seis Detail de cada escena están descritas en su `.frag`. Speed mantiene el movimiento sin audio; los golpes avivan los elementos; cada voz del piano ilumina su zona. **Momento** activa el clímax de 22 segundos, con entrada y salida suaves. Mantienen el acabado, paletas, capas y controles del set Halloween.

Para probar: actualizar la rama, seleccionar `SET = 'halloween'` en el Text DAT de arranque y **Reconstruir Todo**, pues cambió la cantidad de escenas. Confirmar 40 escenas en el reporte y lanzar 31–33 desde el dashboard o navegador. Los snapshots personales existentes prevalecen sobre los presets de fábrica.

El guion horario conserva sus 158 cues y el cierre de las 05:31: estas tres escenas están disponibles para selección manual y para el setlist/autopilot, pero todavía no están programadas en el guion.

## Texto en Mac: diagnóstico pendiente

Se reportó un damero al activar el texto. El shader del texto compila fuera de TD; eso no demuestra que los TOPs o sus parámetros funcionen en el Mac. No se atribuye aún a GLSL ni se aplica una corrección especulativa.

Con el fallo visible, revisar **View Errors** en `/project1/program_text`, `/project1/text_overlay_src`, `/project1/text_overlay_y` y `/project1/text_fade_tex`. Copiar el mensaje exacto y la versión de TD para corregir la causa y reproducirla en una prueba. Mientras tanto, ensayar también con Textvisible apagado y comprobar que el show continúa.

## Dirección visual: trazos finos de neón

El Portal ritual (31) se conserva. Las escenas 32 y 33 usan líneas sobre negro: sin iluminación de superficies ni volumen 3D. El núcleo de cada trazo usa cobertura antialias calculada con derivadas de pantalla (`fwidth`), con un halo estrecho independiente para conservar el filo. Los detalles usan distancias a segmentos, triángulos y curvas; el piano acentúa los trazos existentes.

La 32 combina una máscara de calabaza de doble contorno, dientes de polilínea, meridianos abiertos, grabados en las mejillas, marcas de calibración y sellos en órbita. La 33 organiza siluetas espectrales en una corona giratoria, con ojos y boca de contorno, filamentos internos, rosetas en contrarrotación y estrellas de cuatro puntas. D1 cambia la cantidad de símbolos, D2 abre los anillos, D3 revela filigrana, D4 ajusta el movimiento, D5 cambia la paleta y D6 regula el halo fino.

Para cargar esta revisión basta **Recargar Shaders**; no cambia el número de escenas ni la red. Las miniaturas de 32 y 33 también se actualizaron. La compilación y los renders se prueban fuera de TD; el rendimiento real debe comprobarse en el Mac.
