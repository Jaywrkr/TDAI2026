# 09 — Overlay de texto (nombres de artista)

Un nombre de artista, tipeado a mano en el momento, sobre cualquiera de las
36 escenas — con contorno automático para que se lea encima de cualquier
fondo, y un fundido suave al mostrarlo/ocultarlo.

**A propósito no es una lista precargada.** El pedido fue explícito: *"quiero
yo setear los textos con la compu en vivo"* — así que `Textcontent` es un
campo de texto libre, no un setlist. Lo que sí se separó en dos pasos
distintos es **escribir** y **mostrar**.

---

## Cómo se usa

1. `/project1` → pestaña **Texto** → campo **Texto (se tipea en vivo)** →
   escribís el nombre del artista que sigue. Podés hacerlo con tiempo,
   mientras el nombre anterior sigue en pantalla — escribir no lo muestra.
2. Cuando entra el artista, prendés **MOSTRAR texto** — un fundido de
   medio segundo lo trae a pantalla. Es el control que conviene tener en un
   pad (`Learn Textvisible`): un solo toque, en el momento justo.
3. Para sacarlo, apagás el mismo toggle — mismo fundido, a la inversa.

El toggle es aprendible por MIDI y funciona como cualquier otro trigger del
rig: un pad lo prende, el mismo pad lo apaga.

## Banco de fuentes

`Font` elige el estilo tipográfico de una lista (`config.FONTS`); `Fontnext`
(aprendible) la va rotando sin tocar el mouse. Agregar una fuente nueva es
sumar un nombre a esa lista — si el sistema no la tiene instalada, el Text
TOP cae a una genérica sola, no rompe nada.

## Tamaño y posición

Dos perillas en la misma página:

- **Tamaño** — de un título chico a uno de pantalla completa.
- **Posición vertical** (0 abajo, 1 arriba) — por defecto cerca del tercio
  inferior, para no taparle el centro al visual.

## Por qué se lee sobre cualquier escena

El texto sale **blanco con contorno negro**, siempre — no es una perilla de
color. El contorno se calcula en el mismo shader que compone el texto sobre
el programa (no es un efecto nativo del Text TOP): sin él, un texto blanco
se pierde por completo contra las escenas más claras del set. Verificado
renderizando el shader contra un fondo oscuro y uno claro — se lee igual en
los dos.

## Dónde va en la cadena de video

El overlay se compone **después del bloom** (para que el texto salga nítido,
sin el glow difuminándolo) y **antes del master fade** — así el blackout y
el master brightness lo tapan a él también: si el show se va a negro, el
texto se va con el show.

## Dónde está cada cosa en el código

| | |
|---|---|
| El banco de fuentes | `td/vjcore/config.py` → `FONTS` |
| Cuánto tarda el fundido | `td/vjcore/config.py` → `TEXT_FADE_SECONDS` |
| Los parámetros (página Texto) | `td/vjcore/builder.py` |
| Mostrar/ocultar, ciclar fuente | `td/vjcore/dats/control_script.py` → `toggleTextVisible`, `nextFont`, `currentFontName` |
| El Text TOP + fundido nativo + composite | `td/vjcore/program.py` → `_build_text_overlay` |
| El shader de contorno/relleno | `td/vjcore/program.py` → `_TEXT_FRAG` |
| Tests offline | `python3 td/tools/test_text_overlay.py` |
