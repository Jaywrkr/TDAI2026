# Fuentes del texto y orden de la red (fase 42)

## Fuentes

Para que los nombres no salgan en Arial: copia cualquier `.ttf` u `.otf` en **`td/fonts/`** (sirve para todos los sets) o en `td/sets/halloween/fonts/` (solo Halloween) y vuelve a correr el Text DAT de arranque. En `/project1` > Parameters > página **Texto** > **Fuente** salen primero las de esas carpetas y después las del sistema; el botón **Fuente siguiente** las recorre. No hace falta instalarlas en la Mac: el Text TOP las carga por archivo (parámetro `fontfile`).

Ya vienen ocho, con licencia SIL Open Font License (`td/fonts/licencias/`):

| Fuente | Estilo |
|---|---|
| Anton | Gruesa, angosta, muy legible (la de arranque) |
| BebasNeue | Mayúsculas finas y altas |
| Bungee | Bloque, de cartel |
| Creepster | Terror clásico, letras que chorrean |
| Butcherman | Terror, cortada |
| Eater | Terror, mordida |
| Nosifer | Sangre que gotea |
| Monoton | Neón de líneas |

Más fuentes gratis en https://fonts.google.com (Get font > Download all; usar el `.ttf` de la carpeta `static/` si viene una variable).

## Orden de la red

Al terminar el build, `vjcore/orden.py` acomoda los nodos de `/project1` en bloques con título (Annotate COMP), leyendo la señal de arriba hacia abajo y de izquierda a derecha:

1. **AUDIO** · **MIDI Y PIANO** · **CONTROL** (entradas → textura de control)
2. **ESCENAS** · **PROGRAMA** (bus A/B, transiciones, estela, capas) · **BRILLO** · **TEXTO** · **SALIDAS**
3. **PANEL** · **SISTEMA** (los DAT de Python) · **OTROS**

Dentro de cada bloque, cada nodo queda a la derecha de sus entradas. Solo mueve nodos; no cambia conexiones ni parámetros. Los nodos de adentro de `scenes` y `dashboard` no se tocan.
