// ===============================================================
// SCENE 08 - BARCODE
// Columnas verticales tipo codigo de barras, con interferencia
// horizontal interna -- glitch de equalizer/VHS vertical. Ambar por
// defecto, con algunas columnas en otro acento de color.
// ===============================================================
//
// COMO FUNCIONA
//
// La pantalla se divide en columnas (floor(uv.x * numCols)). Dentro de
// cada columna, DOS senos de frecuencia casi identica (una ligeramente
// desafinada respecto a la otra) se multiplican -- el batido/interferencia
// entre ambas es lo que da el bandeado irregular (ni parejo ni periodico
// limpio) que se ve en la referencia, no un simple sin() solo. Cada
// columna tiene su propia frecuencia y fase (hasheadas por su indice), asi
// que el patron no se repite identico de columna a columna.
//
// Casi todas las columnas usan el mismo hue base (Hue) -- unas pocas,
// elegidas por hash de la columna, saltan a un acento de color distinto.
// Eso es lo que da "mayoria ambar, alguna columna verde/azul" sin volverse
// un visual arcoiris.
//
// CONTROLES
//   Speed    velocidad de scroll vertical del patron interno
//   Density  cuantas columnas hay
//   Hue      color base de las columnas
//   Chaos    irregularidad del glitch: cuanto varia la frecuencia entre
//            columnas y cuanto "tearing" (columnas que se apagan a
//            saltos) hay
//   Bass     brillo de lo ya claro (audioLift) + un poco de movimiento de
//            fase (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro de fase (excepcion del contrato)
//
// @D1: contraste/brillo del patron de interferencia interno
// @D2: ancho del espacio negro entre columnas
// @D3: frecuencia del bandeado interno (pocas bandas anchas <-> muchas y
//      finas)
// @D4: cuantas columnas saltan a un acento de color (casi ninguna <->
//      muchas)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;

    float numCols = 8.0 + uDensity * 40.0;
    float colF = uv.x * numCols;
    float colId = floor(colF);
    float colX = fract(colF);

    // Espacio negro entre columnas (D2) -- respira con los bajos (uBass
    // ya suavizado, Fase 2), como si las columnas "inhalaran".
    float gapW = (0.04 + uD2 * 0.28) * (1.0 + uBass * 0.3);
    float colMask = smoothstep(0.0, gapW, colX) * smoothstep(1.0, 1.0 - gapW, colX);

    // Parpadeo de entrelazado tipo CRT: filas alternas levemente mas
    // oscuras, con ritmo de Agudos -- da autenticidad de video viejo.
    float interlace = 0.85 + 0.15 * sin(uv.y * uResH * PI * 0.5 + t * (4.0 + uHigh * 30.0));

    // Jitter por columna: frecuencia y fase distinta -- Chaos aumenta la
    // irregularidad entre columnas vecinas.
    float colHash = hash21(vec2(colId, 7.0));
    float freqJit = 1.0 + (colHash - 0.5) * uChaos * 1.6;
    float phaseJit = colHash * 40.0;

    // Interferencia: dos senos de frecuencia casi identica multiplicados
    // -- el batido entre ambos es el bandeado irregular de la referencia.
    // Bass: un poco de movimiento de fase ademas del brillo de mas abajo
    // -- seguro porque uBass ya llega suavizado (Fase 2).
    float y = uv.y * uResH * 0.06 + t * (0.5 + uSpeed * 3.0) + uBass * 8.0;
    // D3: frecuencia del bandeado -- pocas bandas anchas <-> muchas finas.
    float bandFreq = 3.0 + uD3 * 22.0;

    // PIANO: TODAS las columnas saltan de fase/frecuencia JUNTAS un
    // instante -- termino GLOBAL (igual en cualquier columna) sumado a
    // 'y' y a bandFreq, asi el patron de interferencia entero se
    // glitchea de golpe, un corte digital real, no una linea de mas
    // encima. uKeypulse decae solo; uKeypos escala el salto de fase;
    // uKeyvel la intensidad del glitch de frecuencia.
    if (uKeypulse > 0.0015) {
        y += uKeypos * 30.0 * uKeypulse;
        bandFreq *= 1.0 + uKeypulse * (0.8 + uKeyvel * 1.4);
    }

    float b1 = sin((y + phaseJit) * bandFreq * freqJit);
    float b2 = sin((y + phaseJit) * bandFreq * freqJit * 1.08 + 1.7);
    float band = abs(b1 * b2);

    // Parche de baja frecuencia adicional: el brillo no queda parejo,
    // hay zonas mas claras y mas oscuras dentro de la misma columna.
    float patchV = 0.5 + 0.5 * sin(y * 0.15 + colHash * 6.28);
    float bright = band * (0.5 + 0.5 * patchV);

    // D1: contraste/brillo general del patron.
    bright = pow(bright, 0.4 + (1.0 - uD1) * 0.9);

    // Tearing ocasional: alguna columna se apaga a saltos con Chaos.
    float tear = step(0.5, hash21(vec2(colId, floor(t * (2.0 + uChaos * 10.0)))));
    bright *= mix(1.0, tear, uChaos * 0.5);

    // uHigh: vibracion micro de fase -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    bright *= 1.0 + uHigh * 0.06 * sin(t * 20.0 + colId);

    // La mayoria de columnas usa Hue; unas pocas (por hash) saltan a un
    // acento de color distinto. D4 baja los umbrales -- casi ninguna
    // columna con acento (D4=0) hasta mas de la mitad con acento (D4=1).
    float accentPick = hash21(vec2(colId, 3.0));
    float accentThresh1 = 0.97 - uD4 * 0.62;
    float accentThresh2 = 0.90 - uD4 * 0.55;
    float isAccent1 = step(accentThresh1, accentPick);
    float isAccent2 = step(accentThresh2, accentPick) - isAccent1;
    float h = audioHue(uHue, uMid * 0.16);
    h = fract(h + isAccent1 * 0.42 + isAccent2 * 0.55);

    vec3 col = hsv2rgb(vec3(h, 0.85, 1.0)) * bright * colMask * interlace;

    // Linea de scanner: un lector de codigo de barras real barre con un
    // laser rojo -- pedido de "dale mas profesionalidad", un detalle de
    // producto real en vez de solo columnas de color.
    float scanY = fract(t * (0.15 + uSpeed * 0.4));
    float scanDist = abs(uv.y - scanY);
    float scanLine = exp(-scanDist * scanDist / 0.0004);
    col += vec3(1.0, 0.12, 0.10) * scanLine * (0.6 + colMask * 0.4);

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
