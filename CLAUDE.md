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
- Halloween tiene 31 escenas (26 mansión, 27 reloj, 28 bosque de faroles, 29 morgue, 30 carnaval): 20–25 usan la carpeta Media (`media_scenes` en set.json) y el set trae `"setlist"` que las intercala; ver docs/53.
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
- **Fase 17** (rama `claude/halloween-f17-bosque-faroles`, sobre f16): escena 28 bosque de faroles (16 faroles en 3 capas con paralaje). 
- **Fase 18** (rama `claude/halloween-f18-morgue`, sobre f17): escena 29 morgue (luz de tubos en vivo con la profundidad horneada). 
- **Fase 19** (rama `claude/halloween-f19-carnaval`, sobre f18): escena 30 carnaval abandonado (rueda, carrusel y focos en vivo; el payaso del clímax).
- **Fase 20** (rama `claude/halloween-f20-cementerio-3d`, sobre f19): prueba de realismo en la escena 00: lápidas horneadas como sólidos 3D con normal, luz en vivo (`stoneLight`). Comparación en docs/img/cementerio_2d_vs_3d*.jpg.
- **Fase 21** (rama `claude/halloween-f21-calabazas-3d`, sobre f20): calabaza 3D (01 y 13) y tallado con grosor en la 01. Plan de fases 22–28 (3D): 22 mansión, 23 reloj, 24 momia+esqueleto, 25 bosque+fantasmas, 26 castillo+tormenta, 27 manos+túnel, 28 velas+caldero(+sábanas morgue).
- **Fase 22** (rama `claude/halloween-f22-mansion-3d`, sobre f21): relieve de la fachada de la mansión (26) con luz en vivo.
- **Fase 23** (rama `claude/halloween-f23-reloj-3d`, sobre f22): relieve de la torre y la esfera del reloj (27).
- **Fase 24** (rama `claude/halloween-f24-momia-esqueleto-3d`, sobre f23): huesos con volumen (17) y vendas como tubos (12).
- **Fase 25** (rama `claude/halloween-f25-bosque-fantasmas-3d`, sobre f24): relieve en el bosque (28, capa cercana) y en el pasillo (07, normal en el mundo).
- **Fase 26** (rama `claude/halloween-f26-castillo-tormenta-3d`, sobre f25): relieve en el castillo (04, normal dentro de `3_ventanas`) y en el árbol de la tormenta (09); el relámpago ilumina por su lado.
- **Fase 27** (rama `claude/halloween-f27-manos-tunel-3d`, sobre f26): relieve de manos (15: falanges, nudillos, tendones) y calaveras del túnel (18), más el arreglo de la base de la normal del túnel.
- **Fase 28** (rama `claude/halloween-f28-velas-caldero-3d`, sobre f27): relieve a escala real en velas (16) y caldero (11). Con esto termina el plan 3D (fases 20–28); las sábanas de la morgue quedan como están.
- **Fase 29** (rama `claude/halloween-f29-capas-miedo-navegador`, sobre f28): capas encima de las escenas (`program_capas`, pads 14/15, `capas_excluir`), perilla 1 = Miedo (+ clic = Momento), perilla 9 = navegador del setlist (+ clic = lanzar), guardián de FPS 40/55 sobre `Renderscale` con FPS real (Perform CHOP `perf`; `project.cookRate` era la tasa pedida), límite de destellos (`test_destellos.py`, máx. 3/s; tormenta 09 ajustada), lectura relativa solo en `config.RELATIVE_CHANNELS` y migración `MIDI_LAYOUT_V2` vaciada. Tests: `test_capas_miedo.py`, `test_destellos.py`.
- **Fase 30** (rama `claude/halloween-f30-sucesos-mansion`, sobre f29): motor de repertorio en common.glsl (`hkSuceso`/`hkDetalle`/`hkClimaxV`+`hkClimaxVar`/`hkGrandV`/`hkEstado`, `hkSetClimax`, permutación (a·i+b) mod n) y la mansión (26) con 4 estados, 9 sucesos, 6 detalles y 3 guiones de clímax. Herramientas: `timeline_sucesos.py`, `test_sucesos.py`. Siguen las fases 31 (00–05), 32 (06–11), 33 (12–17), 34 (18–25), 35 (27–30) y 36 (control en vivo y arco de la noche).
- **Fase 31** (rama `claude/halloween-f31-sucesos-00-05`, sobre f30): repertorio en las escenas 00–05 (3 estados, 7 sucesos, 5 detalles y clímax A/B/C cada una) y `hkPick` más barato con el mismo calendario. Siguen 32 (06–11), 33 (12–17), 34 (18–25), 35 (27–30) y 36 (control en vivo y arco de la noche).
- **Fase 32** (rama `claude/halloween-f32-sucesos-06-11`, sobre f31): repertorio en las escenas 06–11 (docs/53). Siguen 33 (12–17), 34 (18–25), 35 (27–30) y 36.
- **Fase 33** (rama `claude/halloween-f33-sucesos-12-17`, sobre f32): repertorio en las escenas 12–17; `test_destellos.py --sucesos` mide cada suceso y clímax (la medición de 31 y 32 daba 0 por un error del script); 00 y 02 bajadas a 3 destellos/s (docs/53). Siguen 34 (18–25), 35 (27–30) y 36.
- **Fase 34** (rama `claude/halloween-f34-sucesos-18-25`, sobre f33): repertorio liviano en las escenas 18–25 (3 estados, 5 sucesos, 4 detalles y clímax A/B/C); parpadeos rápidos de 19, 20, 24 y 25 bajados (docs/53). Siguen 35 (27–30) y 36.
- **Fase 35** (rama `claude/halloween-f35-resplandor`, sobre f34): Resplandor (canal `glow`, tira de Mod en Halloween): 0 sin brillo, 0,5 normal, 1 solo lo que brilla con el bajo; arreglo del tamaño de pixel del bloom y del texto (`res.xy`, antes `.zw`). Test: `test_resplandor.py`. Siguen 36 (sucesos 27–30) y 37 (control en vivo y arco de la noche).
- **Fase 36** (rama `claude/halloween-f36-ritmo`, sobre f35): el calendario sigue a la música (`td/vjcore/ritmo.py`: pulso por recta, frases de 32 tiempos, break, drop): sucesos y detalles en el "1", respiro en el break, pico del clímax en el drop, clímax por frase si no hay drops; canales `mbeat`…`mclxarm`, `Ritmoon`. Con los canales en 0 el calendario es idéntico al de reloj. Test: `test_ritmo.py`. Siguen: teclas en todas las escenas, nitidez, momentos muertos, repertorio 27–30 y control en vivo.
- **Fase 37** (rama `claude/halloween-f37-teclas`, sobre f36): `medir_teclas.py` (cuánto cambia la imagen con un acorde) y `hkKeyLit` en common.glsl: cada tecla ilumina la escena con su luz propia; las 17 escenas flojas pasan del <3 % al 14–45 %. Test: `test_teclas.py`. Siguen: nitidez, momentos muertos, repertorio 27–30 y control en vivo.
- **Fase 38** (ramas `claude/halloween-f38-jay-NN-...`, una por escena, anidadas desde f37; la de la 00 trae el motor): easter egg "JAY INFINITO" en cada escena (`hkEgg`, `hkText`, `hkInfD`/`hkInfPath` en common.glsl; canal `secret`, `Secreton`, pad 9 / Capas > Lanzar easter egg). Herramienta `render_jay.py`, test `test_jay.py`. El usuario pidió PR + merge en orden de estas ramas al terminar.
- **Fase 39** (ramas `claude/halloween-f39-jay-sutil-NN-...`, una por escena desde `main`; la de la 00 trae el motor): easter eggs más sutiles: susurro 2 de 3 veces (`hkEggS` 0,6, fuerza 0,42), visible 1 de 3 y a mano (0,78 / 0,75); cada escena escala sus medidas con `hkEggS`. `render_jay.py --susurro`. El usuario pidió PR + merge en orden al terminar.
