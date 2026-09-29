# Relevo de TDAI2026 para Claude

Lee primero [docs/51_SPEED_Y_BAILE.md](docs/51_SPEED_Y_BAILE.md). Ese documento distingue el código actual de los dos cambios pendientes y contiene criterios de prueba. Después consulta [docs/03_VISUAL_SPEC.md](docs/03_VISUAL_SPEC.md) y el [README.md](README.md). `docs/05_VISUALES_GUIA.md` contiene ejemplos históricos; sus descripciones de piano y efectos para escenas recientes no son la fuente de verdad del código actual.

## Estado al 28 de septiembre de 2026

- Rama local: `codex/speed-and-reactive-details`. Último commit de implementación: `f255057`; el relevo anterior quedó en `7baf599`. Hay 98 escenas (`00–97`); las 40 recientes son `58–97`.
- **Todavía sin resolver:** la deformación compartida `audioDanceUV` de `td/vjcore/shader.py` se percibe como un *twirl* común; `td/vjcore/control.py` detiene el reloj de Speed cuando no hay audio y el máximo de la perilla resulta lento. No describas estos puntos como corregidos hasta implementar y probar el cambio.
- El usuario quiere que Speed produzca movimiento propio aun en silencio. El movimiento causado **solo** por audio debe cesar en silencio. Con audio, el bajo suma un impulso pequeño y siempre positivo a la velocidad base, sin reducirla. Ejemplo: base 100 → entre 100 y aproximadamente 104–108. Subir bastante el máximo de Speed.
- En las escenas nuevas, eliminar el twirl/deformación global y hacer que audio/kick muevan componentes internos de modo distinto por escena; dar más brillo a las escenas apagadas sin perder negros ni FPS. Conservar el piano y los seis Detail perceptibles.

## Entrega

Trabajar en una rama; hacer **commit y push**. El usuario crea el PR y hace el merge. No abrir PR ni mezclar en `main` por cuenta propia. Verificar shaders y controles fuera de TD; cualquier afirmación sobre aspecto o FPS reales requiere prueba en el TouchDesigner del usuario. Si cambian CHOPs, DATs o el header/footer, indicar **Reconstruir Todo**.
