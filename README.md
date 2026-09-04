# TDAI2026 — Rig de VJ para TouchDesigner

Sistema de 20 escenas con control MIDI (Arturia MiniLab MkII), audio reactivo,
crossfade A/B y dashboard clickable.

![veins](docs/img/veins_default.png)

## Qué es esto

Una reescritura del build script original con tres cambios de fondo:

| | Antes | Ahora |
|---|---|---|
| **Dónde vive el código** | Un `.py` de 1600 líneas dentro de un Text DAT | Paquete `td/vjcore/` en git + un loader de 8 líneas en TD |
| **Qué es un visual** | 12–20 TOPs cableados desde Python | Un archivo `.frag` = **una** pasada de GPU |
| **Reconstruir** | `destroy()` de todo: pierdes mapeo, devices y visuales | `Recargar Shaders` no toca la red |

## Arranque rápido

> Guía completa con checkpoints y diagnóstico:
> **[docs/06_PRIMERA_PRUEBA.md](docs/06_PRIMERA_PRUEBA.md)**

1. Clona el repo.
2. En TouchDesigner: nuevo **Text DAT**, pega el contenido de [`td/RUN_ME.py`](td/RUN_ME.py), ajusta `REPO`, **Run Script**.
3. Lee el reporte de verificación en la Textport.
4. `/project1/audio1` → elige el Device de audio.
5. `/project1/midi1` → elige `Arturia MiniLab mkII`.
6. `/project1` → pestaña **MIDI Mapping** → `Learn Speed` → mueve el knob 1. Repite.
7. `/project1` → **System** → desmarca `Safe Start Blackout`.
8. Abre `/project1/dashboard_ui` en modo Perform.

## Documentación

| Doc | Para qué |
|---|---|
| [06 — **Primera prueba, paso a paso**](docs/06_PRIMERA_PRUEBA.md) | **Empieza por aquí**: 12 fases con checkpoints |
| [00 — Análisis del script original](docs/00_ANALISIS.md) | Qué estaba mal y por qué |
| [01 — Arquitectura](docs/01_ARQUITECTURA.md) | Cómo está armado el rig |
| [02 — MIDI MiniLab MkII](docs/02_MIDI_MINILAB_MKII.md) | Mapeo, MIDI Learn, CCs de fábrica |
| [03 — Spec de visuales](docs/03_VISUAL_SPEC.md) | El contrato que cumple todo `.frag` |
| [04 — Prompt para IA](docs/04_PROMPT_PARA_IA.md) | **Copia y pega esto** en ChatGPT/Claude para generar escenas |
| [05 — Performance](docs/05_PERFORMANCE.md) | Dónde se van los fps y cómo recuperarlos |

## Crear una escena nueva

```bash
cp td/visuals/_TEMPLATE.frag td/visuals/scene03_loquesea.frag
# edita el archivo (o pásale docs/04_PROMPT_PARA_IA.md a una IA)
python3 td/tools/validate_shaders.py    # compila sin abrir TD
```

Luego en TD: `/project1` → **System** → `Recargar Shaders`.

## Verificación fuera de TouchDesigner

```bash
python3 td/tools/validate_shaders.py     # compila los .frag con glslangValidator
python3 td/tools/preview_veins_cpu.py out.png "{'density':0.8,'hue':0.5}"
```

El validador inyecta el mismo header/footer que TD y compila de verdad. Un
shader generado por IA que pase esto ya no te va a romper el show en vivo.

---

## Estado: qué está verificado y qué no

**Verificado en este repo:**

- Los 18 módulos de Python parsean.
- Los dos `.frag` **compilan de verdad** con `glslangValidator`, con el mismo
  header y footer que TouchDesigner inyecta.
- El shader de venas se renderizó en CPU para validar el look (las imágenes de
  `docs/img/` salen de `td/tools/preview_veins_cpu.py`).

**No verificado —** no tengo TouchDesigner en este entorno. Lo que puede
necesitar un ajuste en el primer arranque son **nombres de parámetros de OPs
que cambian entre builds de TD**. Por eso todo pasa por `safe_set` /
`safe_set_first`, que prueban varios nombres alternativos y avisan en la
Textport en vez de abortar el build.

Candidatos concretos si ves avisos:

| OP | Parámetro | Alternativas que ya se prueban |
|---|---|---|
| Parameter CHOP | `op`, `parameters` | `ops`, `pars`, `parameter` |
| Audio Filter CHOP | `cutofffrequency` | `cutoff`, `frequency` |
| Math CHOP | `chopop` | `chanop` |
| Select CHOP | `channames` | `chan`, `channels` |
| CHOP to TOP | `chop`, `dataformat` | `top`, `format`, `pixelformat` |
| Lag CHOP | `lagmethod` | `method` |
| Trigger CHOP | `attack`/`release` | `attacklength`/`releaselength` |
| GLSL TOP | `pixeldat` | `pixelshader` |

El reporte de `verify()` al final del build te dice si algo quedó mal
conectado, con `[OK]` o `[!!]` por comprobación.
