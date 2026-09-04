# Spec de visuales — el contrato

Un visual es **un archivo**: `td/visuals/sceneNN_nombre.frag`, con `NN` de
`00` a `19`.

## Regla única

El archivo define **una** función:

```glsl
vec4 render(vec2 uv)
```

Nada más. El `main()`, los uniforms, los helpers y el swizzle de salida los
inyecta el sistema al cargar. Tú (o la IA) escribes solo la imagen.

---

## Uniforms disponibles

No los declares: ya están.

| Uniform | Rango | Qué es |
|---|---|---|
| `uSpeed` | 0–1 | Knob 1. **Ya está aplicado en `uTime`** — úsalo solo para efectos extra |
| `uDensity` | 0–1 | Knob 2. Cantidad de detalle / cobertura |
| `uHue` | 0–1 | Knob 3. Rota la paleta completa |
| `uChaos` | 0–1 | Knob 4. Turbulencia / distorsión |
| `uBright` | 0–1 | Master fade. **Informativo: NO multipliques por él** |
| `uLevel` | 0–1 | RMS global del audio |
| `uBass` | 0–1 | 20–180 Hz |
| `uMid` | 0–1 | 180–2000 Hz |
| `uHigh` | 0–1 | 2–12 kHz |
| `uKick` | 0–1 | Transitorio de graves. Pico corto en el golpe |
| `uBeat` | 0–1 | Envolvente que decae tras cada golpe (~0.22 s) |
| `uTime` | seg | **Tiempo para animar.** Ya escalado por Speed e integrado |
| `uRTime` | seg | Segundos reales, independientes de Speed |
| `uResW`, `uResH` | px | Resolución de salida |
| `uAspect` | — | `uResW / uResH` |
| `uScene` | 0–19 | Índice de esta escena |
| `uD1`…`uD6` | 0–1 | Perillas de Detail. **Significan lo que tú definas** — documéntalo con `@D1`…`@D6`, ver abajo |
| `uKeypulse` | 0–1 | Pulso al tocar cualquier tecla del piano, decae solo (~0.35 s). El anillo base ya sale gratis del footer — usa esto si quieres un efecto propio además |
| `uKeypos` | 0–1 | Grave→agudo de la última tecla tocada |
| `uKeyvel` | 0–1 | Fuerza de esa tecla |

### Por qué `uTime` y no `uRTime * uSpeed`

`uTime` viene de un Speed CHOP que **integra**. Si multiplicas tiempo real por
Speed, mover el knob cambia la fase de golpe y todo el visual salta. Con
`uTime` la velocidad cambia suavemente y nunca hay discontinuidad. Este es el
detalle que más se nota en directo.

---

## Helpers incluidos

```glsl
mat2  rot2(float a)
float hash21(vec2 p)                     // ruido blanco 0–1
vec2  hash22(vec2 p)
float noise21(vec2 p)                    // ruido de gradiente 0–1
float fbm(vec2 p, int oct)               // rugosidad 0.5 por defecto
float fbm(vec2 p, int oct, float rough)
float ridge(float n, float sharp)        // 1-|2n-1| elevado: filamentos
vec3  hsv2rgb(vec3 hsv)
vec2  centered(vec2 uv)                  // x∈[-aspect,aspect], y∈[-1,1]
float vignette(vec2 uv, float amt)
vec3  audioLift(vec3 col, float amount)  // ver "Contrato de audio" abajo
float audioHue(float hue, float amount)  // ver "Contrato de audio" abajo
```

Constantes: `PI`, `TAU`.

---

## Contrato de audio: solo brillo y color, nunca geometría

Regla dura, sin excepciones salvo una: **el audio no mueve posición, ancho
de línea, radio, umbral de cobertura ni cantidad de elementos.** Solo brillo
y color.

Motivo: con un micrófono de ambiente el nivel nunca está perfectamente
quieto. Cualquier cosa cuya *forma* dependa de él tiembla sin parar — no se
lee como "reacciona a la música", se lee como un glitch. `scene00_veins.frag`
tenía exactamente este bug (el nivel escalaba la posición de cada píxel, los
graves engordaban el ancho de línea) y así se manifestaba.

**La única excepción es `uHigh`**, y solo a escala micro (un par de píxeles
como mucho) — una vibración de detalle, nunca una reestructuración. `uHigh`
además llega ya suavizado desde `audio.py` (ver Fase 2), así que no
reintroduce temblor aunque toque geometría.

### `audioLift` — cómo deben usar bajos/nivel

```glsl
col = audioLift(col, uBass * 0.8);
```

Sube el brillo **solo donde ya hay algo brillante**: `col * (1+x)` sigue
siendo `0` si `col` era `0`, así que lo oscuro se queda oscuro por
construcción, no por ajuste fino. Pesa por la luminancia existente para que
un halo tenue no se encienda igual que el núcleo.

### `audioHue` — cómo deben usar medios

```glsl
float h = audioHue(uHue, uMid * 0.05);
vec3 col = hsv2rgb(vec3(h, sat, val));
```

Rota el matiz **antes** de convertir a RGB — mucho más barato que convertir
RGB→HSV→RGB. `amount` debe ser pequeño (unas pocas centésimas de vuelta):
esto es un tinte que se mueve con la música, no un carrusel de colores.

### Kick / Beat

Son acentos puntuales (flash, pulso), no modulación continua — están bien
donde ya se usan en `scene00_veins.frag`, ese patrón no cambia.

---

## Perillas de Detail (`uD1`…`uD6`) y su leyenda

Cada escena tiene 6 perillas propias, `uD1` a `uD6`, 0–1. Qué hace cada una
lo decide el autor del visual — no hay convención fija, y **eso es a
propósito**: en una escena `D1` puede ser "cantidad de nodos" y en otra
"velocidad de rotación".

El problema obvio de eso es que nadie se acuerda qué hace cada perilla en
cada una de 20 escenas. Se resuelve documentándolo en el propio `.frag`:

```glsl
// @D1: cantidad de nodos
// @D2: grosor de linea
// @D3: velocidad de rotacion
```

Una línea `// @D<N>: texto` por perilla que uses, en cualquier parte del
archivo (van bien juntas cerca de la cabecera). El build las lee y las
muestra en el dashboard, en un panel dedicado que se actualiza solo cada vez
que cambias de escena — no hace falta memorizar nada mientras tocas.

No hace falta documentar las 6: si tu visual solo usa `uD1` y `uD3`, escribe
solo esas dos líneas. Un visual que no usa ninguna Detail no necesita
comentarios — el panel muestra un texto por defecto.

`Detail1`–`Detail6` también se guardan por escena con el sistema de
presets (`Snapshot`), igual que Speed/Density/Hue/Chaos.

---

## Prohibido

| No hagas | Por qué |
|---|---|
| Declarar `void main()` | El footer ya lo pone: error de compilación |
| Declarar `out vec4 fragColor` | Ya está declarado |
| Multiplicar por `uBright` | El master fade se aplica en `show_out`. Se aplicaría dos veces |
| Crear TOPs, tocar el dashboard, el program bus o el MIDI | Un visual solo posee su propia imagen |
| Usar `gl_FragColor` | GLSL 3.30: no existe |
| Bucles con conteo dinámico | Usa `for (int i=0; i<MAX; i++) { if (i>=n) break; }` |

---

## Salida

Devuelve `vec4(rgb, 1.0)`. El alfa se fuerza a 1 y el RGB se recorta a
positivo en el footer. **Trabaja sobre fondo negro**: los negros del visual son
el negro real del show, y todo lo que no sea negro se acumula sobre el
crossfade.

TouchDesigner **no** aplica gamma a la salida del GLSL TOP. Lo que devuelves
es lo que se ve. Si tu visual se ve mucho más oscuro de lo esperado, es esto:
no compenses con gamma, sube los valores.

---

## Presupuesto de rendimiento

Apunta a **menos de 2 ms de GPU a 1280×720**. Como referencia,
`scene00_veins.frag` hace 21 octavas de ruido por píxel y va sobrado en
cualquier GPU dedicada moderna.

Reglas prácticas:

- Cada octava de `fbm` cuesta ~4 hashes. 4 octavas está bien; 8 rara vez se
  justifica.
- Pon las octavas en un `#define` arriba del archivo para poder bajarlas.
- Antes de bajar resolución, baja octavas: se nota mucho menos.
- Evita `pow()` con exponentes enormes en bucles.
- `fwidth()` es barato y resuelve el antialiasing de líneas gratis.

---

## Verificar sin abrir TouchDesigner

```bash
python3 td/tools/validate_shaders.py
```

Compila cada `.frag` con el mismo header y footer que TD usa, mediante
`glslangValidator`. Si sale `OK`, no vas a tener un error de compilación en
vivo.

```
[OK] _TEMPLATE    _TEMPLATE.frag
[OK] scene00      scene00_veins.frag

2 shader(s) revisados, 0 con error
```

---

## Instalar un visual nuevo

```bash
cp td/visuals/_TEMPLATE.frag td/visuals/scene05_lomio.frag
# editar
python3 td/tools/validate_shaders.py
```

En TouchDesigner: `/project1` → **System** → `Recargar Shaders`.

No se destruye nada: conservas devices, mapeo MIDI y presets.
