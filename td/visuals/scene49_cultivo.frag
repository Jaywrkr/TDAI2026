// ===============================================================
// SCENE 49 - CULTIVO
// Colonias circulares (metaballs, se fusionan al acercarse -- mismo
// mecanismo que scene03) de un tono claro, con un borde rojo ANCHO y
// GRANULADO tipo aerosol/spray, sobre un fondo solido. Grano fino en
// toda la imagen, no solo en el borde.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. COLONIAS: metaballs de siempre -- cada bolita suma
//    radio*radio/(dist*dist+eps) a un campo comun, y donde se
//    superponen se fusionan solas (sale de sumar, no hay logica de
//    fusion aparte). Posiciones a la deriva, lenta y con fase propia
//    por bolita (igual que scene03).
//
// 2. TRES ZONAS, NO DOS: en vez de un solo borde nitido (edgeLine),
//    el campo se compara contra DOS umbrales separados por un ancho
//    (D2) -- adentro de los dos, rojo; mas adentro que el umbral alto,
//    el tono claro; mas afuera que el bajo, el fondo. Antes de
//    comparar, se le suma al campo un ruido de alta frecuencia (D3) --
//    eso es lo que rompe el borde en una textura granulada, como una
//    plantilla de aerosol, en vez de una linea lisa.
//
// 3. GRANO GENERAL: un ruido fino y animado se suma a TODA la imagen
//    (no solo al borde), para que hasta el fondo solido y el interior
//    de las colonias tengan la textura visible del video de
//    referencia.
//
// CONTROLES
//   Speed    velocidad de la deriva de las colonias
//   Density  cuantas colonias hay
//   Hue      hue base (fondo y colonias rotan juntos)
//   Chaos    cuanto varia el tamano entre colonias (parejas <-> bien
//            mezcladas)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, las colonias crecen un instante
//            (bounded, decae solo)
//   High     vibracion micro de la posicion de cada colonia
//            (excepcion del contrato)
//
// @D1: tamano base de las colonias
// @D2: ancho de la banda roja del borde
// @D3: grano/dither del borde (cuanto se nota la textura de aerosol)
// @D4: grano general de toda la imagen
// @D5: amplitud de la deriva de las colonias
// @D6: saturacion/contraste general
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);
    float sat = mix(0.45, 0.85, uD6);

    vec3  bgCol = hsv2rgb(vec3(fract(h0 + 0.08), sat, 0.92));   // naranja
    vec3  blobCol = hsv2rgb(vec3(fract(h0 + 0.62), sat * 0.55, 0.85));  // celeste
    vec3  borderCol = hsv2rgb(vec3(fract(h0 + 0.98), sat, 0.55));      // rojo

    int   nBalls = 4 + int(floor(uDensity * 7.99));
    float field = 0.0;

    for (int i = 0; i < 12; i++) {
        if (i >= nBalls) break;
        float fi = float(i);
        vec2  seed = vec2(fi * 7.3 + 1.0, fi * 3.1 + 2.0);
        vec2  basePos = (hash22(seed) - 0.5) * vec2(2.6, 2.1);
        // D5: amplitud de la deriva. Speed: velocidad.
        float drift = mix(0.05, 0.5, uD5);
        vec2  pos = basePos + drift * vec2(
            sin(t * (0.1 + uSpeed * 0.4) + fi * 1.7),
            cos(t * (0.08 + uSpeed * 0.35) + fi * 2.1));
        // uHigh: vibracion micro de la posicion -- unica excepcion
        // del contrato, amplitud pequena, ya suavizado.
        pos += uHigh * 0.01 * vec2(sin(t * 11.0 + fi), cos(t * 9.0 + fi));

        float sizeJ = mix(1.0, 0.3 + hash21(seed + 5.0) * 1.4, uChaos);
        // Kick: las colonias crecen un instante, ademas del flash de
        // mas abajo -- bounded, decae solo con uKick.
        float r = mix(0.22, 0.55, uD1) * sizeJ * (1.0 + uKick * 0.25);

        float d2 = dot(p - pos, p - pos);
        field += r * r / (d2 + 0.002);
    }

    // D3: grano/dither del borde -- ruido de alta frecuencia sumado
    // al campo ANTES de comparar contra los umbrales, asi la
    // frontera queda granulada en vez de lisa.
    float ditherAmt = mix(0.0, 2.2, uD3);
    float fieldN = field + (hash21(uv * 420.0) - 0.5) * ditherAmt;

    float threshMid = 1.6;
    float bandW = mix(0.15, 1.1, uD2);
    float dTh = fieldN - threshMid;
    float isBlob = step(bandW, dTh);
    float isBorder = step(-bandW, dTh) - isBlob;

    vec3 col = bgCol;
    col = mix(col, borderCol, isBorder);
    col = mix(col, blobCol, isBlob);

    // D4: grano general, animado, en TODA la imagen.
    float grain = hash21(uv * uResW * 0.5 + fract(uRTime) * 13.0) - 0.5;
    col += grain * (0.03 + uD4 * 0.10);

    // PIANO: una colonia invitada, grande, aparece en la posicion que
    // elige uKeypos y se apaga sola (uKeypulse decae) -- mismo
    // tratamiento que el resto de las bolitas (suma al campo antes de
    // los umbrales, no un circulo aparte encima).
    if (uKeypulse > 0.0015) {
        vec2  guestPos = centered(vec2(mix(0.12, 0.88, uKeypos), 0.5));
        float dG2 = dot(p - guestPos, p - guestPos);
        float guestR = mix(0.25, 0.55, uKeyvel) * uKeypulse;
        float guestField = guestR * guestR / (dG2 + 0.002);
        float guestBlob = step(threshMid + bandW, field + guestField) - isBlob;
        col = mix(col, blobCol * 1.3, clamp(guestBlob, 0.0, 1.0));
    }

    // Kick: flash breve, ademas del crecimiento de colonias de arriba.
    col += col * uKick * 0.25;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    return vec4(col, 1.0);
}
