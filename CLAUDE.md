# Relevo de TDAI2026 para Claude

Lee primero [docs/51_SPEED_Y_BAILE.md](docs/51_SPEED_Y_BAILE.md). Ese documento distingue el código actual de los dos cambios pendientes y contiene criterios de prueba. Después consulta [docs/03_VISUAL_SPEC.md](docs/03_VISUAL_SPEC.md) y el [README.md](README.md). `docs/05_VISUALES_GUIA.md` contiene ejemplos históricos; sus descripciones de piano y efectos para escenas recientes no son la fuente de verdad del código actual.

## Estado al 28 de septiembre de 2026

- Rama local: `codex/speed-and-reactive-details`. Último commit de implementación: `f255057`; el relevo anterior quedó en `7baf599`. Hay 98 escenas (`00–97`); las 40 recientes son `58–97`.
- **Todavía sin resolver:** la deformación compartida `audioDanceUV` de `td/vjcore/shader.py` se percibe como un *twirl* común; `td/vjcore/control.py` detiene el reloj de Speed cuando no hay audio y el máximo de la perilla resulta lento. No describas estos puntos como corregidos hasta implementar y probar el cambio.
- El usuario quiere que Speed produzca movimiento propio aun en silencio. El movimiento causado **solo** por audio debe cesar en silencio. Con audio, el bajo suma un impulso pequeño y siempre positivo a la velocidad base, sin reducirla. Ejemplo: base 100 → entre 100 y aproximadamente 104–108. Subir bastante el máximo de Speed.
- En las escenas nuevas, eliminar el twirl/deformación global y hacer que audio/kick muevan componentes internos de modo distinto por escena; dar más brillo a las escenas apagadas sin perder negros ni FPS. Conservar el piano y los seis Detail perceptibles.

## Actualización 20 de octubre de 2026

- Rama de trabajo: `claude/upbeat-bell-m4iut3`. El reloj de Speed ya está corregido (ver la actualización al inicio de docs/51). El twirl de `audioDanceUV` sigue pendiente.
- Láser ILDA opcional: docs/52_LASER_ILDA.md.
- Show de **Halloween el 30 de octubre**: set aparte con el mismo núcleo, ver docs/53_SETS_Y_HALLOWEEN.md.
- Halloween tiene 29 escenas (26 mansión, 27 reloj, 28 bosque de faroles): 20–25 usan la carpeta Media (`media_scenes` en set.json) y el set trae `"setlist"` que las intercala; ver docs/53.
- Estilo aerógrafo retro: perillas Estilo/Estilomarco (canales `style`/`stylearch`), `hkStyle` en common.glsl; adaptado a fondo en 00, 01, 04, 13, 14 y 16 (docs/53).
- MiniLab en Halloween: `set.json` → `midi_redirect` (perillas 2/4/15/16 = paleta/estilo/noche/marco, pad 7 = noche on/off); `Nocheon` apaga el efecto de la noche. Test: `td/tools/test_minilab_halloween.py`.
- Halloween trae miniaturas (`td/tools/render_thumbs.py`) y presets de fábrica por escena (`presets_default.json`; Snapshot del usuario gana encima). Test: `td/tools/test_presets_fabrica.py`.
- **Guion sin MIDI** (docs/54_GUION.md): `td/vjcore/guion.py` + sección GUION de control_script; el guion de Halloween es `td/sets/halloween/guion.json` (22:00→05:30). Pruebas: `td/tools/test_guion.py`.

## Entrega

Trabajar en una rama; hacer **commit y push**. Desde el 21 de octubre de 2026: **solo commit y push, sin abrir PR ni hacer merge** (pedido del usuario; antes Claude hacía PR + merge). Cada fase de trabajo va en una rama nueva anidada sobre la anterior (`claude/halloween-f6-...`, `claude/halloween-f7-...`). Verificar shaders y controles fuera de TD; cualquier afirmación sobre aspecto o FPS reales requiere prueba en el TouchDesigner del usuario. Si cambian CHOPs, DATs o el header/footer, indicar **Reconstruir Todo**.
- **Fase 11** (rama `claude/halloween-f11-detalle-piano`): piano polifónico (6 voces, `keyEnv`), Detail con Lag y `revealAt`, clímax en tres tiempos (`hkClimax`, `hkGrandClimax`) y setlist reordenado; escenas 00–06 rehechas (docs/53). Siguen las fases 12 (07–13), 13 (14–19), 14 (20–25) y 15 (pad momento y transiciones).
- **Fase 12** (rama `claude/halloween-f12-escenas-07-13`, sobre f11): escenas 07–13 con el mismo tratamiento.
- **Fase 13** (rama `claude/halloween-f13-escenas-14-19`, sobre f12): escenas 14–19, y piano optimizado (`keyEnv` corta si la voz no suena).
- **Fase 14** (rama `claude/halloween-f14-escenas-20-25`, sobre f13): escenas de imagen 20–25; miniaturas sin clímax (`HK_STILL`).
- **Fase 15** (rama `claude/halloween-f15-momento-transiciones`, sobre f14): pad 16 = Momento (`triggerMoment`, canal `moment`, override en `hkClimax`); transiciones Niebla/Sangre/Rayo/Apagón (`program_trans`, `Transitionstyle`, Halloween = al azar). Test: `td/tools/test_transiciones.py`.
- **Fase 16** (rama `claude/halloween-f16-escenas-nuevas`, sobre f15): escenas 26 mansión y 27 reloj (el reloj marca la hora de la fiesta y dispara su gran clímax a la medianoche real); setlist y `guion.json` para 28 escenas. 
- **Fase 17** (rama `claude/halloween-f17-bosque-faroles`, sobre f16): escena 28 bosque de faroles (16 faroles en 3 capas con paralaje). Siguen 29 morgue y 30 carnaval.
