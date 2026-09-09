// ===============================================================
// SCENE 44 - SEDA
// Bandas verticales de un pastel/neon suave, con anchos irregulares
// (no una grilla pareja) que derivan lento hacia un lado, tejidas por
// una trama cruzada fina -- el mismo cruce de dos rejillas diagonales
// que forma un tejido de tela real -- que titila despacio encima. El
// resultado se lee como seda o un tejido pintado a mano, nunca como
// una imagen fija.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. BANDAS: la coordenada X se dobla con un fbm de baja frecuencia
//    ANTES de repartirla en bandas -- eso es lo que da anchos
//    irregulares (unas bandas mas anchas que otras) en vez de una
//    grilla perfectamente pareja. Encima, un segundo fbm (mas lento,
//    en Y tambien) ondula el borde entre bandas para que no sean
//    lineas rectas. Cada banda elige su color de una paleta pastel/neon
//    chica por hash, y los bordes se funden con un degradado suave
//    (D2), no un corte duro.
//
// 2. DERIVA: toda la coordenada de banda se corre con el tiempo -- las
//    bandas fluyen hacia un lado, despacio, como si la tela entera se
//    deslizara.
//
// 3. TEJIDO: dos rejillas diagonales (+45 y -45 grados) en seno, cuyo
//    PRODUCTO forma la textura de trama cruzada de un tejido real --
//    picos chicos y periodicos en cada cruce, no una sola rejilla. La
//    fase de las dos rejillas deriva despacio con el tiempo (shimmer),
//    asi la textura titila sin ser ruido al azar.
//
// CONTROLES
//   Speed    velocidad de la deriva horizontal de las bandas
//   Density  cuantas bandas hay (pocas y anchas <-> muchas y finas)
//   Hue      hue base de la paleta (rota junto con todo)
//   Chaos    cuanto se ondulan los bordes entre bandas (rectos <->
//            bien ondulados)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, el tejido se marca mas fuerte un
//            instante (empuja D4 hacia arriba, decae solo con uKick)
//   High     vibracion micro de la fase del tejido (excepcion del
//            contrato)
//
// @D1: variabilidad del ancho de cada banda (parejas <-> bien
//      mezcladas anchas y finas, como el video de referencia)
// @D2: suavidad del borde entre bandas (corte marcado <-> degradado
//      largo)
// @D3: frecuencia del tejido cruzado (trama gruesa <-> fina)
// @D4: cuanto se nota el tejido sobre el color de fondo
// @D5: velocidad del shimmer del tejido
// @D6: saturacion/contraste general de la paleta
// ===============================================================

float pastelHue(int i) {
    if (i == 0) return 0.25;   // amarillo-verde
    if (i == 1) return 0.92;   // rosa
    if (i == 2) return 0.72;   // lavanda
    if (i == 3) return 0.06;   // durazno
    return 0.46;                 // menta
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);
    float sat = mix(0.30, 0.75, uD6);

    // --- BANDAS: ancho irregular via warp de baja frecuencia ---
    float widthVar = uD1 * 1.4;
    float warpedX = p.x + (fbm(vec2(p.x * 0.35, 5.0), 3) - 0.5) * widthVar;

    // Chaos: ondula el borde entre bandas ademas del ancho irregular.
    float edgeWave = (fbm(vec2(p.x * 0.5 + 20.0, p.y * 0.6 + t * 0.05), 3) - 0.5)
                    * (0.3 + uChaos * 1.3);

    float freq = mix(1.2, 7.0, uDensity);
    float drift = t * (0.02 + uSpeed * 0.18);
    float bandCoord = (warpedX + edgeWave) * freq + drift;

    float bandF = floor(bandCoord);
    float bandT = fract(bandCoord);

    int   idxA = int(mod(hash21(vec2(bandF, 3.0)) * 5.0, 5.0));
    int   idxB = int(mod(hash21(vec2(bandF + 1.0, 3.0)) * 5.0, 5.0));
    vec3  colA = hsv2rgb(vec3(fract(audioHue(pastelHue(idxA), 0.0) + h0), sat, 0.95));
    vec3  colB = hsv2rgb(vec3(fract(audioHue(pastelHue(idxB), 0.0) + h0), sat, 0.95));

    // D2: suavidad del borde entre bandas.
    float edgeSoft = mix(0.02, 0.85, uD2);
    float blend = smoothstep(0.5 - edgeSoft, 0.5 + edgeSoft, bandT);
    vec3  col = mix(colA, colB, blend);

    // --- TEJIDO CRUZADO ---
    float weaveFreq = mix(18.0, 80.0, uD3);
    // Kick: el tejido se marca mas fuerte un instante, ademas del
    // flash de mas abajo -- decae solo con uKick.
    float weaveAmt = clamp(uD4 + uKick * 0.4, 0.0, 1.0);
    float shimmerSpeed = 0.3 + uD5 * 2.2;
    // uHigh: vibracion micro de la fase -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    float highJit = uHigh * 0.4;
    float g1 = sin((p.x + p.y) * weaveFreq + t * shimmerSpeed + highJit);
    float g2 = sin((p.x - p.y) * weaveFreq - t * shimmerSpeed * 0.7 - highJit);
    float cross = abs(g1) * abs(g2);
    col = mix(col, col * (0.55 + cross * 0.9), weaveAmt);

    // PIANO: una franja vertical brillante aparece en la X que elige
    // uKeypos y se apaga sola (uKeypulse decae) -- color encima, no
    // reordena las bandas.
    if (uKeypulse > 0.0015) {
        float guestX = mix(-1.3, 1.3, uKeypos);
        float dGuest = abs(p.x - guestX);
        float guestGlow = exp(-dGuest * dGuest * 20.0) * uKeypulse * (0.6 + uKeyvel * 0.7);
        col += vec3(1.0) * guestGlow;
    }

    // Kick: flash breve, ademas del refuerzo del tejido de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    col *= vignette(uv, 0.15);

    return vec4(col, 1.0);
}
