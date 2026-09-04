# Performance

## Dónde se iban los fps, y qué se hizo

| Costo original | Solución |
|---|---|
| 13 TOPs por visual, 3 de ellos Blur con radio animado | 1 GLSL TOP. El glow se calcula dentro del shader reusando campos que ya se computaron |
| 20 thumbnails leyendo `out1` a 1280×720 | `thumb` = Resolution TOP a 256×144 por escena |
| `onFrameStart` activo (60 callbacks de Python/s) | Desactivado. `diagnostics` se auto-reagenda con `run(delayFrames=N)` |
| Un `run()` por frame de transición | Lag CHOP nativo. Python dispara una vez y agenda un solo cierre |
| Expresiones encadenadas de 3 saltos por control y por TOP | Parameter CHOP nativo → un único `ctrl` → textura de control |
| `scene_api` duplicando los 9 params de `sceneN` | Eliminado. Una sola fuente de verdad |
| 5 filtros de audio en estéreo a 44.1 kHz | Math CHOP a mono antes de filtrar: mitad de trabajo |

---

## Palancas, de mayor a menor efecto

### 1. Resolución de salida

`/project1` → Output → `Output Width` / `Output Height`.

El costo escala con el número de píxeles. 1280×720 → 960×540 es **44% menos
trabajo de GPU**. En proyección grande casi nadie lo nota.

> TouchDesigner **NON-COMMERCIAL** limita la salida a 1280×1280. Los
> parámetros están topados ahí a propósito.

### 2. Octavas de ruido en el shader

Arriba de cada `.frag`:

```glsl
#define OCT_TRUNK 4
#define OCT_CAP   3
#define OCT_WARP  3
```

Bajar `OCT_TRUNK` de 4 a 3 quita ~25% del costo de esa capa. **Baja octavas
antes que resolución**: se nota mucho menos.

### 3. Performance Mode

`/project1` → Performance → `Freeze Inactive Scenes` (ON por defecto).

Con 20 escenas cocinando a la vez, el rig es 20× más caro. Con esto solo
cocinan la activa y —durante un fundido— la entrante.

**`Preview All` es caro a propósito.** Descongela las 20 para refrescar los
thumbnails. Úsalo entre sets, nunca durante uno.

### 4. Duración de transición

Durante un fundido cocinan **dos** escenas. Transiciones de 2 s con visuales
pesados duplican el costo durante 2 s. Con transiciones cortas (0.3–0.6 s) el
pico es breve.

---

## Cómo medir

El panel de estado del dashboard muestra:

```
FPS         59.9  (OK)
GPU show    3.41 ms
COOCINANDO  1 / 20 escenas
```

- **GPU show** es `gpuCookTime` de `show_out`: el costo real de la cadena.
- A 60 fps tienes 16.6 ms por frame. Por debajo de 8 ms vas cómodo.
- **COOCINANDO** debería decir `1 / 20` en reposo y `2 / 20` durante un
  fundido. Si dice más, Performance Mode está apagado o Preview All encendido.

Para desglosar por operador: `Dialogs → Performance Monitor` en TouchDesigner.

---

## Presupuesto de un visual

Menos de **2 ms de GPU a 1280×720**.

Referencia: `scene00_veins.frag` hace 21 octavas de ruido por píxel
(≈84 hashes × 921.600 píxeles). Va sobrado en cualquier GPU dedicada moderna;
en gráficos integrados conviene bajar a `OCT_TRUNK 3` / `OCT_CAP 2`.

Coste aproximado por técnica:

| Técnica | Coste |
|---|---|
| `fbm` de 4 octavas | ~4 hashes × 4 = alto pero manejable |
| `fwidth()` | prácticamente cero |
| `pow()` | barato |
| Bucle de raymarching de 64 pasos | **muy caro**: sale del presupuesto |
| Bucle de partículas de 200 iteraciones | **muy caro** |

Si necesitas raymarching, redúcelo a 24–32 pasos y renderiza esa escena a
menor resolución.

---

## El truco del glow sin Blur TOP

El original usaba un Blur TOP para el halo: una pasada fullscreen extra con
un kernel que se recompilaba cada frame al animar `filtersize`.

En `scene00_veins.frag` el halo sale de reusar el mismo campo de ruido con un
ancho de línea mayor:

```glsl
float trunk = vein(na, wT);          // línea fina
float tGlow = vein(na, wT * 7.0);    // halo ancho — mismo na, coste ≈ 0
```

`na` ya está calculado. La segunda llamada son dos `smoothstep` más. Un Blur
TOP equivalente cuesta órdenes de magnitud más.

Generaliza: **si necesitas una versión suave de algo que ya calculaste, vuelve
a evaluarlo con otro parámetro en lugar de post-procesarlo con un TOP.**

---

## Si aun así bajan los fps

En orden:

1. ¿`COOCINANDO` dice más de 2? → revisa Performance Mode / Preview All.
2. ¿`GPU show` sube solo en una escena concreta? → ese `.frag` es el problema:
   baja sus octavas.
3. ¿`GPU show` es alto en todas? → baja la resolución de salida.
4. ¿Los fps caen pero `GPU show` es bajo? → el cuello está en CPU: revisa
   el Performance Monitor, típicamente devices de audio/MIDI o DATs.
5. ¿Caen solo al cambiar de escena? → sube `Prewarm Frames` o acorta la
   transición.
