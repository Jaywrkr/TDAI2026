// ===============================================================
// SCENE 37 - FICHAS
// Un tablero dividido en celdas por una grilla fina: algunas celdas
// tienen una "ficha" (circulo o cuadrado, relleno o solo contorno) en
// un color de una paleta chica y saturada. La mayoria de las fichas
// quedan quietas en su color -- unas pocas van CAMBIANDO de color a
// saltos, como carretes de tragamonedas que nunca terminan de parar.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. GRILLA: se corrige el aspecto (uv.x * uAspect) antes de escalar
//    por la cantidad de columnas, asi las celdas salen cuadradas sin
//    importar la resolucion de salida. Las lineas finas son la
//    distancia de cada pixel al borde de celda mas cercano.
//
// 2. UNA FICHA POR CELDA (o ninguna): todo se decide por hash de la
//    coordenada de celda (id) -- si hay ficha, que forma, relleno o
//    contorno, tamano, y el COLOR BASE. Es el mismo patron de "hash
//    por celda decide todo" que usan scene08/scene09 para sus columnas.
//
// 3. PARPADEO: una fraccion de las celdas (elegida tambien por hash,
//    fija por celda -- no cambia cual parpadea) tiene su indice de
//    color reemplazado por floor(t/intervalo + fase propia) en vez del
//    indice fijo -- un salto discreto de un color de la paleta al
//    siguiente, nunca un degradado. La fase (hash por celda) hace que
//    no parpadeen todas sincronizadas.
//
// CONTROLES
//   Speed    no se usa para animar geometria (el parpadeo tiene su
//            propia velocidad, D6) -- SI acelera la reaccion visual
//            del tablero al beat (ver Kick)
//   Density  cuantas celdas tiene la grilla (pocas y grandes <-> muchas
//            y chicas)
//   Hue      hue base de toda la paleta (las 8 fichas mantienen su
//            separacion relativa, rotan todas juntas)
//   Chaos    no usado directo (reservado) -- el tablero es
//            deliberadamente ESTATICO en su layout, mezclar Chaos aca
//            rompe la lectura de "tablero", no la mejora
//   Bass     brillo de lo ya claro (audioLift), mas fuerte en las
//            fichas rellenas que en los contornos (que son mas tenues)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, ACELERA el parpadeo un instante (multiplica
//            el avance del contador de color) -- geometria de color, no
//            de forma/posicion/cantidad, sigue dentro del contrato
//   High     vibracion micro del borde de cada ficha (excepcion del
//            contrato)
//
// @D1: probabilidad de que una celda tenga ficha (tablero casi vacio
//      <-> casi lleno)
// @D2: mezcla de forma (todo circulos <-> todo cuadrados)
// @D3: tamano de las fichas
// @D4: mezcla relleno/contorno (todo contorno <-> todo relleno)
// @D5: fraccion de fichas que parpadean de color (ninguna <-> casi
//      todas)
// @D6: velocidad del parpadeo (carretes lentos <-> rapidos)
// ===============================================================

// 8 hues fijos, espaciados a mano (no parejo en la rueda) para que se
// lea como una paleta de fichas de juego -- rojo/naranja/amarillo/
// verde/cian/azul/magenta/rosa -- y no como un barrido de color liso.
float paletteHue(int i) {
    if (i == 0) return 0.00;
    if (i == 1) return 0.07;
    if (i == 2) return 0.13;
    if (i == 3) return 0.33;
    if (i == 4) return 0.52;
    if (i == 5) return 0.68;
    if (i == 6) return 0.82;
    return 0.93;
}

vec4 render(vec2 uv)
{
    float t = uTime;

    // --- GRILLA (celdas cuadradas sin importar el aspecto) ---
    float cols = 3.0 + floor(uDensity * 7.99);
    vec2  uvAsp = vec2(uv.x * uAspect, uv.y);
    vec2  g = uvAsp * cols;
    vec2  gi = floor(g);
    vec2  cellF = fract(g) - 0.5;

    // Lineas finas de la grilla: distancia al borde mas cercano de la
    // celda, ancho constante en pixeles via fwidth.
    vec2  edgeDist = 0.5 - abs(cellF);
    float lineD = min(edgeDist.x, edgeDist.y);
    float aaLine = max(fwidth(lineD), 1e-5);
    float gridLine = 1.0 - smoothstep(0.0, aaLine * 1.5, lineD);
    // Tablero real, no vacio: un fondo oscuro con un leve tinte (fieltro
    // de mesa de juego) en vez de negro plano detras de la grilla.
    vec3  col = hsv2rgb(vec3(fract(audioHue(uHue, uMid * 0.10) + 0.42), 0.35, 0.05));
    col += vec3(gridLine) * 0.10;

    // --- LA FICHA DE ESTA CELDA ---
    // D1: probabilidad de que la celda tenga ficha.
    float tokenProb = mix(0.12, 0.85, uD1);
    float hasToken = step(hash21(gi + 1.0), tokenProb);

    if (hasToken > 0.5) {
        // D2: mezcla de forma.
        float isSquare = step(hash21(gi + 2.0), uD2);
        // D3: tamano.
        float sizeBase = mix(0.26, 0.42, hash21(gi + 4.0));
        float size = sizeBase * (0.55 + uD3 * 0.9);
        // D4: mezcla relleno/contorno.
        float isFilled = step(hash21(gi + 3.0), uD4);
        float strokeW = size * 0.22;

        // uHigh: vibracion micro del borde -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        vec2 jitter = uHigh * 0.01 * vec2(sin(t * 12.0 + gi.x * 3.0),
                                          cos(t * 10.0 + gi.y * 3.0));
        vec2 q = cellF + jitter;

        float dCircle = length(q) - size * 0.5;
        float dSquare = max(abs(q.x), abs(q.y)) - size * 0.5;
        float d = mix(dCircle, dSquare, isSquare);

        float aa = max(fwidth(d), 1e-5) * 1.5;
        float filledCov = 1.0 - smoothstep(0.0, aa, d);
        float outlineCov = 1.0 - smoothstep(strokeW, strokeW + aa, abs(d));
        float coverage = mix(outlineCov, filledCov, isFilled);

        // --- COLOR: fijo, o parpadeando ---
        // D5: fraccion de fichas que parpadean (fijo por celda, decide
        // SI esta celda es de las que parpadean, no cambia con el tiempo).
        float doesFlicker = step(hash21(gi + 6.0), mix(0.03, 0.6, uD5));
        float ownPhase = hash21(gi + 7.0) * 20.0;

        // D6: velocidad del parpadeo. Kick: ademas del flash de mas
        // abajo, acelera el AVANCE del contador un instante -- sigue
        // siendo un cambio de COLOR, no de forma/posicion/cantidad,
        // por eso esta dentro del contrato de audio aunque sea Kick
        // (no Bass/Mid) el que lo dispara.
        float flickerRate = mix(0.5, 4.5, uD6) * (1.0 + uKick * 2.5);
        float flickerStep = floor(t * flickerRate + ownPhase);

        float fixedIdx = floor(hash21(gi + 5.0) * 8.0);
        float flickerIdx = mod(flickerStep, 8.0);
        int   colorIdx = int(mix(fixedIdx, flickerIdx, doesFlicker));

        float h = audioHue(paletteHue(colorIdx) + uHue, uMid * 0.10);
        // Las fichas de contorno se leen mas tenues que las rellenas en
        // el tablero de referencia -- menos saturacion, no menos brillo.
        float sat = mix(0.55, 0.85, isFilled);
        vec3  tokenCol = hsv2rgb(vec3(h, sat, 1.0));

        col += tokenCol * coverage;
        // Bloom ancho: la ficha "sangra" un halo tenue sobre el fieltro,
        // como una pieza real con brillo propio en vez de un color plano.
        col += tokenCol * exp(-d * d * 10.0) * 0.18;

        // Bajos: brillo de lo ya claro, mas fuerte en fichas rellenas
        // (tienen mas superficie solida para lucir el bloom) que en
        // contornos finos. Nunca geometria.
        col = audioLift(col, uBass * mix(0.35, 0.9, isFilled) * coverage
                              + uBass * 0.25 * gridLine * (1.0 - coverage));
    } else {
        col = audioLift(col, uBass * 0.25);
    }

    // PIANO: una ficha invitada, mucho mas grande y brillante, aparece
    // en la celda mas cercana a la posicion que elige uKeypos y se
    // apaga sola (uKeypulse decae) -- mismo tratamiento que el blob de
    // invitado en otras escenas, integrada a la grilla real en vez de
    // ser un circulo suelto encima.
    if (uKeypulse > 0.0015) {
        // Blob en coordenadas continuas de grilla (no atado a "la celda
        // actual"), asi sale UN circulo puntual centrado en la fila del
        // medio en la columna que elige uKeypos -- no una franja vertical
        // repetida en cada fila (eso pasaba con un intento anterior que
        // comparaba contra cellF.y, local a la fila de CADA pixel).
        vec2  guestCell = vec2(mix(0.5, cols - 0.5, uKeypos), cols / uAspect * 0.5);
        float dGuest = length(g - guestCell) - (0.55 + uKeyvel * 0.45);
        float aaGuest = max(fwidth(dGuest), 1e-4);
        float guestCov = (1.0 - smoothstep(0.0, aaGuest * 1.5, dGuest)) * uKeypulse;
        vec3  guestCol = hsv2rgb(vec3(fract(uHue + 0.5), 0.8, 1.0));
        col += guestCol * guestCov * (0.7 + uKeyvel * 0.9);
    }

    // Kick: flash breve.
    col += col * uKick * 0.35;

    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
