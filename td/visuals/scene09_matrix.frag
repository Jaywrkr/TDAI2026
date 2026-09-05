// ===============================================================
// SCENE 09 - MATRIX
// Lluvia de caracteres cayendo por columnas, como la pantalla de "the
// Matrix". Reemplaza al viejo "scanline" (glitch VHS) -- visual pedido
// explicitamente por el usuario.
// ===============================================================
//
// COMO FUNCIONA
//
// La pantalla se divide en una rejilla de columnas x filas (celdas tipo
// texto). Cada columna tiene una "cabeza" que cae de arriba a abajo a su
// propia velocidad (hash por columna) y hace loop -- la distancia de
// cada celda a la cabeza (hacia arriba, wrapping) determina el brillo:
// maximo en la cabeza, decae exponencialmente hacia arriba (la "cola" de
// caracteres que ya cayeron). La cabeza en si se pinta casi blanca, el
// resto en el tinte verde/Hue.
//
// Cada celda ademas "parpadea" entre encendida/apagada segun un hash
// contra el tiempo CUANTIZADO (glyphRate) -- eso simula que el caracter
// visible en esa celda cambia cada tanto, como en la referencia real.
//
// CONTROLES
//   Speed    velocidad de caida de las cabezas
//   Density  cuantas columnas hay (mas Density = columnas mas finas)
//   Hue      tinte base (verde por defecto, offset fijo sobre Hue)
//   Chaos    cuanto varia la velocidad de caida entre columnas vecinas
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve -- ya llega con envolvente de golpe-y-caida
//            (audio.py)
//   High     vibracion micro del ancho de celda (excepcion del contrato)
//
// @D1: relleno de cada celda de caracter (finas/chicas <-> bloques
//      grandes que casi se tocan)
// @D2: largo de la cola detras de la cabeza (corta y discreta <-> larga
//      y dramatica)
// @D3: velocidad a la que "cambian" los caracteres (parpadeo lento <->
//      muy rapido, ilegible)
// @D4: densidad de caracteres visibles (rejilla dispersa <-> casi todas
//      las celdas ocupadas)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;

    float cols = 16.0 + uDensity * 44.0;
    float rows = 24.0;

    float colF = uv.x * cols;
    float colId = floor(colF);
    float colX = fract(colF);

    float rowF = uv.y * rows;
    float rowId = floor(rowF);
    float rowY = fract(rowF);

    // Velocidad de caida por columna -- Chaos hace que columnas vecinas
    // varien mas entre si.
    float colHash = hash21(vec2(colId, 3.0));
    float speedVar = 1.0 + (colHash - 0.5) * 2.0 * (0.3 + uChaos * 1.2);
    float speed = (0.10 + uSpeed * 0.5) * speedVar;
    float headY = fract(t * speed + colHash * 17.0);

    // uHigh: vibracion micro del ancho de celda -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    float cellJitter = uHigh * 0.02 * sin(t * 10.0 + colId);

    // Distancia de esta fila a la cabeza, yendo HACIA ARRIBA (la cola
    // cae detras/arriba de la cabeza en pantalla). uv.y=0 abajo, 1 arriba.
    float dist = fract((uv.y - headY) + 1.0);

    // D2: largo de la cola -- corta y discreta <-> larga y dramatica.
    // Piso subido (0.08->0.18): con la cola tan corta, casi toda la
    // columna quedaba negra salvo un pedacito pegado a la cabeza -- la
    // "lluvia" no se leia como tal en reposo.
    float trailLen = 0.18 + uD2 * 0.45;
    float bright = exp(-dist / trailLen);

    // Cabeza: casi blanca, muy angosta.
    float isHead = smoothstep(0.025, 0.0, dist);

    // Parpadeo de caracter: cambia a saltos segun un hash contra el
    // tiempo cuantizado. D3 controla que tan rapido "cambian".
    float glyphRate = 3.0 + uD3 * 16.0;
    float glyphStep = floor(t * glyphRate + rowId * 2.3);
    float glyphHash = hash21(vec2(colId, rowId) + glyphStep * 7.7);

    // D4: densidad -- umbral mas bajo deja pasar mas celdas encendidas.
    // Piso bajado (0.75->0.55): a D4=0 solo un 25% de celdas pasaban,
    // ahora ~45% -- suficiente para leerse como lluvia continua en vez
    // de puntitos sueltos.
    float onThresh = 0.55 - uD4 * 0.45;
    float glyphOn = step(onThresh, glyphHash);

    // Mascara de celda: un bloque con margen (deja ver la rejilla como
    // caracteres separados, no una columna solida). D1 controla que tan
    // grande es el bloque dentro de su celda.
    // El bloque respira con los bajos -- uBass ya suavizado (Fase 2).
    // Piso subido (0.30->0.42): caracteres mas gruesos/legibles en reposo.
    float fill = 0.42 + uD1 * 0.43 + cellJitter + uBass * 0.06;
    float cellMaskX = 1.0 - smoothstep(fill, fill + 0.08, abs(colX - 0.5) * 2.0);
    float cellMaskY = 1.0 - smoothstep(fill, fill + 0.08, abs(rowY - 0.5) * 2.0);
    float cellMask = cellMaskX * cellMaskY;

    float glyphAlpha = glyphOn * cellMask;

    // Verde tipo Matrix por defecto: offset fijo sobre Hue, para que el
    // knob siga sirviendo para variar la paleta sin perder la identidad.
    float h = fract(uHue + 0.33 + uMid * 0.10);
    vec3 streamCol = hsv2rgb(vec3(h, 0.85, 1.0));

    // "Empuje" hacia adelante en el kick: la cola se apaga un poco mas
    // (simula que se desenfoca hacia atras) mientras la cabeza se
    // dispara mas brillante -- una version barata de profundidad de
    // campo reaccionando al golpe, sin muestreo de vecinos.
    float kickDepth = uKick * 0.5;
    vec3 col = streamCol * bright * glyphAlpha * (1.0 - kickDepth * 0.4);
    col = mix(col, vec3(0.85, 1.0, 0.9), isHead * glyphAlpha * (0.9 + kickDepth));

    // CRT scanlines: filas finas y oscuras, look de monitor viejo de
    // verdad -- pedido de "mucho mas profesional, con detalles".
    float scanline = 0.82 + 0.18 * sin(uv.y * uResH * PI);
    col *= scanline;

    // Glitch de columna: cada tanto UNA columna entera "falla" un
    // instante -- se invierte a casi blanco, como un error de
    // decodificacion en la señal. Hash contra el tiempo cuantizado a un
    // paso mas lento que el parpadeo de caracteres, asi se lee como un
    // evento aparte, no como mas parpadeo normal.
    float glitchStep = floor(t * 2.0);
    float glitchHash = hash21(vec2(colId, glitchStep) + 31.0);
    float glitchOn = step(0.985, glitchHash);
    float glitchPhase = fract(t * 2.0);
    float glitchEnv = smoothstep(0.0, 0.1, glitchPhase) * smoothstep(0.4, 0.1, glitchPhase);
    col = mix(col, vec3(0.8, 1.0, 0.9), glitchOn * glitchEnv * 0.85);

    // PIANO: "data dump" -- todas las celdas encendidas destellan casi
    // blancas juntas un instante con cada tecla, como una descarga
    // sincronizada de datos. uKeypulse decae solo, uKeyvel escala la
    // fuerza del destello.
    if (uKeypulse > 0.0015) {
        col = mix(col, vec3(0.85, 1.0, 0.9), glyphAlpha * uKeypulse * (0.5 + uKeyvel * 0.5));
    }

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.35);

    return vec4(col, 1.0);
}
