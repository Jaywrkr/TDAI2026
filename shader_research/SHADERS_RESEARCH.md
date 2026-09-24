# Investigación de Shaders — Catálogo para el rig VJ (TDAI2026)

> **Este documento es solo investigación.** No modifica `td/vjcore/`, `td/visuals/`, el mapeo MIDI ni ninguna
> escena existente. Es un catálogo para que el VJ revise y decida qué portar después.
>
> Ver también: [`catalogo.html`](./catalogo.html) — versión navegable con preview por tarjeta y detalle al click.

## 1. Resumen

- **38 shaders candidatos** catalogados (rango pedido: 30–40), cubriendo: fluidos, tinta/acuarela, humo,
  metaballs/goo, plasma, iridiscencia/cromado, túneles infinitos, fractales/raymarching SDF, kaleidoscopios
  (vía túneles), espacio/nebulosas/galaxias, agujeros negros/wormholes, electricidad, grids/neón, glitch,
  Voronoi/células, autómatas celulares, campos de partículas/flow fields, paisajes generativos (mountains/fbm),
  y nubes volumétricas.
- **35 de 38** tienen preview real enlazado desde la fuente original (CDN de Shadertoy, patrón
  `shadertoy.com/media/shaders/<ID>.jpg`). Los 3 restantes son `.tox` de TouchDesigner ya portados
  (repo `exsstas/Shadertoy-TD-ports`) sin thumbnail propio disponible fuera del repo.
- **3 shaders identificados como YA PORTADOS a TouchDesigner** (con `.tox` funcional en GitHub), útiles
  como referencia de arquitectura de port, no para copiar tal cual (su arquitectura de parámetros no coincide
  con el contrato `render(uv)` de este rig).
- **Ningún archivo de código con licencia permisiva confirmada fue descargado** a `refs/` — ver sección 6.
  La gran mayoría de shaders de Shadertoy usan la licencia por defecto de la plataforma
  (CC BY-NC-SA 3.0 salvo que el autor indique otra explícitamente en la página), que **no** es "código abierto
  reutilizable libremente" — cualquier port debe reescribirse desde cero mirando la técnica, no copiar/pegar
  el código fuente, o confirmar antes los términos exactos en la página de cada shader.

## 2. Nota sobre acceso a fuentes durante esta investigación

El entorno de esta sesión tiene bloqueado el acceso directo (`curl`/`WebFetch`) a `shadertoy.com` por política
de red del proxy saliente. Toda la información de cada shader (nombre, autor cuando estaba disponible, ID,
técnica, categoría) se obtuvo vía búsqueda web (snippets indexados), **no** visitando la página del shader
directamente ni ejecutándolo. Esto significa:

- Los **links a Shadertoy son correctos** (IDs confirmados por los resultados de búsqueda).
- Las **URLs de preview** siguen el patrón público y estable de Shadertoy
  (`https://www.shadertoy.com/media/shaders/<ID>.jpg`) pero no pudieron verificarse con un `curl` real desde
  esta sesión; en el navegador del VJ (sin el proxy de este entorno) deberían cargar con normalidad. El HTML
  del catálogo tiene manejo de error (`onerror`) para mostrar un placeholder si alguna imagen no carga.
- Los **autores** se listan como "ver perfil en Shadertoy" cuando la búsqueda no devolvió el nombre de usuario
  exacto — nunca se inventó un autor. Cuando el snippet sí traía el nombre (ej. Dave_Hoskins, iq, michael0884,
  dugufly, Infantus, ESpitz, jarble) se incluyó.
- El **costo GPU** y la **dificultad de port** son estimaciones razonadas por técnica (raymarching, número de
  octavas de fbm, uso de multipass/feedback, etc.), no medidas de FPS reales — ningún shader se ejecutó
  realmente en esta sesión. Recomendación: antes de portar cualquiera, probarlo en el navegador del VJ en
  shadertoy.com para confirmar el costo real en su hardware.

## 3. Contexto de compatibilidad con el rig (recordatorio)

Cada escena del rig es un `.frag` que define únicamente `vec4 render(vec2 uv)`; el header/footer
(`td/vjcore/shader.py`) inyecta uniforms, helpers de noise/hash/fbm y los controles D1–D6 + Speed/Density/
Hue/Chaos/Brightness vía una textura de control (no uniforms directos). Reglas duras para cualquier candidato:

1. **Audio (uAudio/uBass/uMid/uHigh/uKick) solo puede afectar brillo/color**, nunca geometría, posición ni
   cantidad de elementos.
2. Debe correr a **60 FPS en GPU integrada o gama media**.
3. Preferible **una sola pasada** (el contrato actual es `render(uv)` puro, sin buffers). Shaders que en
   Shadertoy usan Buffer A/B/feedback (fluidos reales, autómatas celulares, trails persistentes, partículas con
   estado) **no encajan directo** — requerirían agregar un `Feedback TOP` al patch, lo cual es un cambio de
   arquitectura, no solo un nuevo `.frag`. Se marcan explícitamente abajo.

## 4. Catálogo completo

Leyenda — GPU: BAJO/MEDIO/ALTO · Port: dificultad de adaptación BAJO/MEDIO/ALTO (o "YA EXISTE" si ya hay un
`.tox`) · Compat: compatibilidad con el contrato de una sola pasada del rig.

### 4.1 Fluidos / Tinta / Humo

| # | Nombre | Fuente | GPU | Port | Compat TD | Notas clave |
|---|---|---|---|---|---|---|
| 1 | Curling Smoke | [Shadertoy `cl23Wt`](https://www.shadertoy.com/view/cl23Wt) | MEDIO | MEDIO | Alta | Curl noise single-pass, sin buffers |
| 2 | Fluid smoke/fog shader | [Shadertoy `wfB3DG`](https://www.shadertoy.com/view/wfB3DG) | MEDIO | MEDIO | Alta | fbm + domain warp |
| 3 | Ink in Water | [Shadertoy `MddcDS`](https://www.shadertoy.com/view/MddcDS) | ALTO | ALTO | Media | Probable multipass, advección real |
| 4 | watercolor propagation | [Shadertoy `mdlXW2`](https://www.shadertoy.com/view/mdlXW2) | MEDIO | MEDIO | Alta | Post-proceso tipo acuarela sobre noise |
| 5 | Fluid simulation - Navier Stokes | [Shadertoy `l3tfz4`](https://www.shadertoy.com/view/l3tfz4) | ALTO | ALTO | Baja/Media | Multipass real (velocidad/presión/densidad), no cabe en 1 pasada |

### 4.2 Metaballs / Goo / Plasma / Iridiscencia

| # | Nombre | Fuente | GPU | Port | Compat TD | Notas clave |
|---|---|---|---|---|---|---|
| 6 | More Simple Metaballs | [Shadertoy `csVcWd`](https://www.shadertoy.com/view/csVcWd) | BAJO | BAJO | Muy alta | Suma de campos circulares, directo |
| 7 | Interactive liquid metal blob | [Shadertoy `3tGXz3`](https://www.shadertoy.com/view/3tGXz3) | MEDIO | MEDIO | Alta | Raymarching de 1 blob + shading metálico |
| 8 | Iridescent Liquid Wave | [Shadertoy `NXlXWM`](https://www.shadertoy.com/view/NXlXWM) | MEDIO | BAJO | Muy alta | Ondas + paleta coseno, muy barato |
| 9 | Black, Iridescent, Liquid | [Shadertoy `3sl3DH`](https://www.shadertoy.com/view/3sl3DH) | MEDIO | MEDIO | Alta | Domain warp + iridiscencia sobre fondo oscuro |
| 10 | An Iridescent material | [Shadertoy `wX2yRm`](https://www.shadertoy.com/view/wX2yRm) | BAJO | BAJO | Muy alta | Fresnel + paleta, "fórmula" de referencia |
| 11 | Plasma Waves of Interference | [Shadertoy `3cjyD1`](https://www.shadertoy.com/view/3cjyD1) | BAJO | BAJO | Muy alta | Plasma clásico, interferencia de senos |
| 12 | Plasma Waves | [Shadertoy `ltXczj`](https://www.shadertoy.com/view/ltXczj) | BAJO | BAJO | Muy alta | Variante del anterior |

### 4.3 Túneles / Kaleidoscopios / Fractales / Raymarching abstracto

| # | Nombre | Fuente | GPU | Port | Compat TD | Notas clave |
|---|---|---|---|---|---|---|
| 13 | Infinite Tunnel Kaleidoscope | [Shadertoy `NflSDS`](https://www.shadertoy.com/view/NflSDS) (dugufly) | MEDIO | MEDIO | Alta | Túnel raymarched con simetría radial |
| 14 | SDF Tunnel | [Shadertoy `s323Rm`](https://www.shadertoy.com/view/s323Rm) (Infantus) | MEDIO/ALTO | MEDIO | Alta | Voxel raymarching |
| 15 | Nebulous Tunnel | [Shadertoy `ltfBzM`](https://www.shadertoy.com/view/ltfBzM) | MEDIO | MEDIO | Alta | Túnel volumétrico con noise |
| 16 | Infinite repetition | [Shadertoy `4dXGRN`](https://www.shadertoy.com/view/4dXGRN) | MEDIO | BAJO | Alta | Domain repetition (mod), clásico iq |
| 17 | Raymarching - Primitives | [Shadertoy `Xds3zN`](https://www.shadertoy.com/view/Xds3zN) (Inigo Quilez) | MEDIO/ALTO | MEDIO | Alta (recortando primitivas) | Demo educativa de SDFs — usar como referencia, no copiar completa |

### 4.4 Espacio / Nebulosas / Galaxias / Agujeros negros

| # | Nombre | Fuente | GPU | Port | Compat TD | Notas clave |
|---|---|---|---|---|---|---|
| 18 | Nebula in Space | [Shadertoy `33cSWX`](https://www.shadertoy.com/view/33cSWX) | MEDIO | MEDIO | Alta | fbm + starfield; comparar con `scene32_nebula` existente |
| 19 | nebula flow | [Shadertoy `wdVXz3`](https://www.shadertoy.com/view/wdVXz3) | MEDIO | MEDIO | Alta | Flow noise animado, look de gas |
| 20 | Interstellar wormhole | [Shadertoy `stByz1`](https://www.shadertoy.com/view/stByz1) (michael0884) | ALTO | ALTO | Media | Integración de geodésicas, muy pesado; considerar versión "fake" |
| 21 | Simple 2D Black Hole | [Shadertoy `cdcBR8`](https://www.shadertoy.com/view/cdcBR8) | BAJO | BAJO | Muy alta | Distorsión UV 2D, alternativa barata a #20 |

### 4.5 Electricidad / Neón / Grids / Glitch

| # | Nombre | Fuente | GPU | Port | Compat TD | Notas clave |
|---|---|---|---|---|---|---|
| 22 | Electric Lightning | [Shadertoy `Dsd3Dj`](https://www.shadertoy.com/view/Dsd3Dj) | BAJO/MEDIO | BAJO | Muy alta | fbm jitter + glow exponencial sobre curva |
| 23 | Interactive Neon Grid Background | [Shadertoy `4XBGWV`](https://www.shadertoy.com/view/4XBGWV) | BAJO | BAJO | Muy alta | Grid con perspectiva, fract/mod, muy barato |
| 24 | Cyber Punk | [Shadertoy `7lVSDw`](https://www.shadertoy.com/view/7lVSDw) | BAJO | BAJO | Alta | Scanlines + glitch + paleta neón |
| 35 | Glitchy Glitch | [Shadertoy `wld3WN`](https://www.shadertoy.com/view/wld3WN) | BAJO/MEDIO | BAJO | Muy alta | Block displacement + RGB split; comparar con `scene03_mediaglitch` |

### 4.6 Células / Voronoi / Autómatas / Partículas / Noise orgánico

| # | Nombre | Fuente | GPU | Port | Compat TD | Notas clave |
|---|---|---|---|---|---|---|
| 25 | Voronoi - basic | [Shadertoy `MslGD8`](https://www.shadertoy.com/view/MslGD8) | BAJO | BAJO | Muy alta | Worley/Voronoi clásico, base reutilizable |
| 26 | Life-Like Cellular Automata | [Shadertoy `tljcWy`](https://www.shadertoy.com/view/tljcWy) | ALTO | ALTO | Media | Requiere Feedback TOP (estado persistente) |
| 27 | chaotic particle swarm 2 | [Shadertoy `WtK3zt`](https://www.shadertoy.com/view/WtK3zt) (michael0884) | ALTO | ALTO | Media/Baja | Voronoi particle tracking con buffer; aproximar sin estado real |
| 28 | Flow fields | [Shadertoy `ssV3Dw`](https://www.shadertoy.com/view/ssV3Dw) | MEDIO | MEDIO | Alta (sin trails persistentes) | Curl noise arrastrando color |
| 29 | field, flow and particles | [Shadertoy `DttSRB`](https://www.shadertoy.com/view/DttSRB) | MEDIO | MEDIO | Alta (variante sin memoria) | Similar a #28 |

### 4.7 Paisajes generativos / Nubes volumétricas

| # | Nombre | Fuente | GPU | Port | Compat TD | Notas clave |
|---|---|---|---|---|---|---|
| 30 | Mountains | [Shadertoy `4slGD4`](https://www.shadertoy.com/view/4slGD4) (Dave_Hoskins) | MEDIO/ALTO | MEDIO | Alta | Heightfield fbm raymarched, +58k vistas, muy citado |
| 31 | Fog Mountains | [Shadertoy `XdsGD7`](https://www.shadertoy.com/view/XdsGD7) (ESpitz) | MEDIO/ALTO | MEDIO | Alta | Variante atmosférica de #30 |
| 32 | Eroded mountain terrain (v2) | [Shadertoy `stS3zD`](https://www.shadertoy.com/view/stS3zD) (jarble) | ALTO | MEDIO | Media/Alta | fbm con derivadas de erosión, más caro |
| 33 | **60FPS Volumetric Clouds on iGPU** | [Shadertoy `DtBGR1`](https://www.shadertoy.com/view/DtBGR1) | MEDIO | MEDIO | **Muy alta — validado para el hardware objetivo** | Diseñado y probado explícitamente para 60 FPS en GPU integrada |
| 34 | Cloud raymarching | [Shadertoy `WslGWl`](https://www.shadertoy.com/view/WslGWl) | ALTO | MEDIO | Media | Sample "de libro de texto", más caro que #33 |

### 4.8 Ya portados a TouchDesigner (referencia de arquitectura)

| # | Nombre | Fuente | GPU | Estado | Notas clave |
|---|---|---|---|---|---|
| 36 | Goo.tox | [GitHub `exsstas/Shadertoy-TD-ports`](https://github.com/exsstas/Shadertoy-TD-ports) — original de "noby" en Shadertoy | BAJO | `.tox` funcional (GPL-3.0) | "slimy shiny wavy thing"; extraer el GLSL y reescribir contra `render(uv)` |
| 37 | Aya_Tunnel.tox | [GitHub `exsstas/Shadertoy-TD-ports`](https://github.com/exsstas/Shadertoy-TD-ports) — original de "BigWIngs" | MEDIO | `.tox` funcional (GPL-3.0) | Túnel raymarched generativo |
| 38 | Branching_Paths_basic.tox | [GitHub `exsstas/Shadertoy-TD-ports`](https://github.com/exsstas/Shadertoy-TD-ports) — original de "wyatt" | BAJO | `.tox` funcional (GPL-3.0) | Trails con botón de Reset → usa Feedback TOP, referencia útil para #26/#27 |

**Priorizados recomendados para primera ronda de implementación** (bajo costo + alta compatibilidad +
diversidad real frente al catálogo actual): **#8 Iridescent Liquid Wave, #11/#12 Plasma Waves,
#21 Simple 2D Black Hole, #22 Electric Lightning, #23 Interactive Neon Grid Background,
#25 Voronoi - basic, #33 60FPS Volumetric Clouds on iGPU, #6 More Simple Metaballs, #16 Infinite repetition**.

**Para evaluar con más cuidado (multipass/feedback → cambio de arquitectura, no solo un `.frag` nuevo):**
#3 Ink in Water, #5 Navier Stokes, #20 Interstellar wormhole (o su versión fake), #26 Cellular Automata,
#27 chaotic particle swarm, #38 Branching_Paths_basic (ya resuelto en TD, sirve de plantilla).

## 5. Compatibilidad general con el rig — resumen técnico

- **26 de 38** (68%) encajan directo en el contrato de una sola pasada `render(uv)` sin cambios de arquitectura.
- **12 de 38** requieren multipass/feedback (buffers de estado persistente) o son demasiado pesados tal cual:
  #3, #5, #17 (recortar), #20, #26, #27, #34 (usar #33 en su lugar), y los 3 `.tox` ya portados (#36–38, que
  por definición ya resolvieron el problema en su propia arquitectura de TD, distinta a la de este rig).
- Ninguno de los 38 shaders, tal como está documentado en su fuente, mueve geometría/cantidad de elementos con
  el audio — en todos los casos el mapeo sugerido a `uBass/uMid/uHigh/uKick` en la columna "midi" del HTML se
  limita a brillo/color/glow, respetando la regla del rig.

## 6. Referencias de código guardadas (`refs/`)

**No se guardó código fuente en `refs/` en esta ronda.** Motivo: la gran mayoría de los shaders listados están
en Shadertoy bajo su licencia por defecto (CC BY-NC-SA 3.0 no comercial, atribución requerida, share-alike) —
copiar el código tal cual y presentarlo como material de referencia interno es aceptable para estudio, pero
esta investigación no tuvo acceso de red a shadertoy.com para descargar el código fuente exacto de cada shader
(ver sección 2). El único código con licencia permisiva explícita identificado es el repo
[`exsstas/Shadertoy-TD-ports`](https://github.com/exsstas/Shadertoy-TD-ports) (GPL-3.0) — accesible pero no
descargado a `refs/` en esta pasada porque son archivos `.tox` binarios de TouchDesigner, no útiles como
"código de referencia" en el sentido de un `.frag`/`.glsl` legible; el detalle de sus 3 shaders ya está
documentado en la sección 4.8 con atribución clara a `exsstas` (port) y al autor original de Shadertoy.

**Recomendación para la siguiente ronda:** si el VJ decide portar alguno de los shaders con licencia CC
BY-NC-SA de Shadertoy, visitar la página del shader en su propio navegador (fuera de este entorno), confirmar
la licencia exacta que declara el autor (a veces se relaja a MIT o CC0 explícitamente en los comentarios),
copiar el código a `shader_research/refs/<nombre>/` con el link de la fuente y el autor en un comentario al
inicio del archivo, y recién ahí empezar la reescritura contra el contrato `render(uv)` — nunca presentarlo
como código propio.

## 7. SHADER SOURCES — colecciones y herramientas para seguir buscando

**Colecciones / plataformas de shaders**
- [Shadertoy](https://www.shadertoy.com/) — la fuente principal de este catálogo; tiene búsqueda por tag
  (`?query=tag%3Dsmoke`, `tag%3Dcyberpunk`, etc.) y ordenar por popularidad (`&sort=popular`).
- [ISF (Interactive Shader Format) / Vidvox](https://github.com/Vidvox/ISF-Files) — +200 generadores y filtros
  GLSL con metadata JSON estandarizada, pensados para VJ software (VDMX, isadora, TouchDesigner via el ISF TOP
  nativo de TD). Documentación: [docs.isf.video](https://docs.isf.video/), editor online:
  [editor.isf.video](https://editor.isf.video/). **Nota importante para este rig:** TouchDesigner tiene un
  **ISF TOP nativo** — los shaders ISF de este repo podrían probarse directo sin pasar por el pipeline
  `render(uv)` actual, como una vía paralela de exploración.
- [OneShader](https://oneshader.net/) — espejo/colección curada de shaders con metadata simplificada.
- [Godot Shaders](https://godotshaders.com/) — colección orientada a Godot pero con mucho GLSL portable
  (tags: cyberpunk, electric, iridescent, etc.), código generalmente más corto/legible que Shadertoy.
- [Book of Shaders](https://thebookofshaders.com/) — no es una colección de shaders finales sino la referencia
  didáctica de las técnicas base (fbm, Voronoi, noise) que usan casi todos los candidatos de este catálogo.
- [iquilezles.org](https://iquilezles.org/) — artículos de referencia de Inigo Quilez sobre raymarching y SDFs
  ([Raymarching Distance Fields](https://iquilezles.org/articles/raymarchingdf/),
  [3D SDFs](https://iquilezles.org/articles/distfunctions/)) — la base técnica de casi toda la categoría de
  túneles/fractales/paisajes de este catálogo.
- [Overview of Shadertoy particle algorithms (michael0884 / Michael Moroz)](https://michaelmoroz.github.io/TODO/2021-3-13-Overview-of-Shadertoy-particle-algorithms/) —
  explica las técnicas de partículas masivas (voronoi particle tracking) usadas en #27.

**Conversores / puentes Shadertoy → TouchDesigner**
- [`GregFinger/TD-Shadertoy_Converter`](https://github.com/GregFinger/TD-Shadertoy_Converter) — convierte código
  Shadertoy y arma control de parámetros para TD.
- [`matthewwachter/td-shadertoy`](https://github.com/matthewwachter/td-shadertoy) — componente `shadertoyConverter`
  que auto-adapta diferencias de sintaxis al cargar un shader.
- [`ibuibu/shadertoyToTd`](https://github.com/ibuibu/shadertoyToTd) — convierte `.glsl` de Shadertoy a GLSL TOP.
- [`exsstas/Shadertoy-TD-ports`](https://github.com/exsstas/Shadertoy-TD-ports) — shaders de Shadertoy ya
  portados y empaquetados como `.tox` (ver sección 4.8), GPL-3.0.
- [`SebastienGravel/ShaderToyTouchdesigner`](https://github.com/SebastienGravel/ShaderToyTouchdesigner) —
  otro conversor de código Shadertoy → TD.
- [Guía oficial "Importing Shadertoy" — Introduction to TouchDesigner](https://nvoid.gitbooks.io/introduction-to-touchdesigner/content/GLSL/12-6-Importing-Shadertoy.html) —
  explica a mano las diferencias de uniforms (`iTime`→`uTime`, `iResolution`→`vec3(uTD2DOutputInfo...)`, etc.)
  que hay que resolver al portar, muy relevante para escribir el mapeo hacia el header de `shader.py` de este
  rig (que ya resuelve un problema equivalente con su propio esquema de `_ctrl(i)`).

**Notas de licencia a tener en cuenta al portar cualquier cosa de estas fuentes**
- Shadertoy: licencia por defecto **CC BY-NC-SA 3.0** salvo que el autor indique otra en su página — no
  comercial, requiere atribución, comparte-igual. Un set de VJ pagado podría considerarse uso comercial;
  conviene revisar caso por caso o preferir shaders donde el autor declaró explícitamente otra licencia (MIT,
  CC0, "do whatever").
- ISF-Files (Vidvox): licencia MIT en el repo — la más permisiva de las fuentes listadas aquí.
- `exsstas/Shadertoy-TD-ports`: GPL-3.0 en el repo del port (el shader original conserva la licencia de
  Shadertoy del autor original).

---
*Documento generado como investigación pura, sin tocar `td/vjcore/`, `td/visuals/` ni el mapeo MIDI del rig.*
