// ===============================================================
// SCENE 45 - SAMPLER
// Filas horizontales sobre negro, cada una con su propio motivo
// geometrico repetido (triangulos en zigzag, cuadros, rombos tipo
// "<>", una trenza ondulada, o barras verticales tipo codigo de
// barras) en un color de una paleta calida -- como el tejido de un
// textil tribal. Cada fila SCROLLEA por su cuenta, a su propia
// velocidad y sentido, como pistas independientes de un sampler.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. FILAS: la pantalla se parte en N franjas horizontales iguales
//    (Density). El hash de cada fila (fijo, no depende del tiempo)
//    decide todo lo que NO tiene que moverse: que motivo tiene, su
//    color, y a que velocidad y en que sentido scrollea.
//
// 2. SCROLL INDEPENDIENTE: la coordenada X que entra al motivo de
//    cada fila se corre con t*velocidadPropia -- Chaos controla cuanto
//    varia esa velocidad entre filas (todas igual <-> bien mezcladas,
//    algunas casi quietas y otras rapidas, algunas al reves).
//
// 3. LOS 5 MOTIVOS (D2 controla cuantos tipos distintos aparecen
//    mezclados): triangulos en zigzag, cuadros, rombos tipo "<>"
//    (solo el contorno), una trenza ondulada (dos senos desfasados,
//    ancho de linea constante), y barras verticales de ancho
//    irregular (tipo codigo de barras, mismo espiritu que
//    scene08_barcode).
//
// CONTROLES
//   Speed    velocidad BASE de scroll (multiplica la de cada fila)
//   Density  cuantas filas hay (pocas y anchas <-> muchas y finas)
//   Hue      hue base de la paleta (rota junto con todo)
//   Chaos    cuanto varia la velocidad/sentido de scroll entre filas
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash, ademas de un empuje chico y acotado a la
//            frecuencia del motivo de todas las filas (decae solo)
//   High     vibracion micro de la posicion del motivo (excepcion del
//            contrato)
//
// @D1: tamano/frecuencia del motivo dentro de cada fila (chico y
//      denso <-> grande y suelto)
// @D2: variedad de tipos de motivo que aparecen mezclados
// @D3: grosor de las formas de contorno (rombos, trenza, barras)
// @D4: cuanto "aire" (negro) queda entre los elementos del motivo
// @D5: saturacion/contraste de la paleta
// @D6: brillo/resplandor general
// ===============================================================

float samplerHue(int i) {
    if (i == 0) return 0.02;   // terracota
    if (i == 1) return 0.08;   // naranja
    if (i == 2) return 0.99;   // marron oscuro (poca luz, ver abajo)
    if (i == 3) return 0.45;   // verde/teal
    return 0.92;                 // rosa
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);
    float sat = mix(0.45, 0.85, uD5);

    // --- FILAS ---
    float nRows = 4.0 + floor(uDensity * 8.0);
    float rowF = uv.y * nRows;
    float rowId = floor(rowF);
    float rowY = fract(rowF);

    // D2: variedad de tipos mezclados -- exponente que sesga el hash
    // hacia pocos indices (variedad baja) o toda la mezcla (alta).
    float typeH = hash21(vec2(rowId, 5.0));
    float typeBias = pow(typeH, mix(2.2, 0.5, uD2));
    int   mtype = int(floor(typeBias * 4.999));

    int   colorIdx = int(mod(hash21(vec2(rowId, 7.0)) * 5.0, 5.0));
    float hue = fract(audioHue(samplerHue(colorIdx), 0.0) + h0);
    float val = (colorIdx == 2) ? 0.22 : 0.95;   // el "marron" es oscuro
    vec3  motifCol = hsv2rgb(vec3(hue, sat, val));

    // Velocidad y sentido propios de la fila. Chaos: cuanto se
    // dispersan entre filas.
    float speedJ = (hash21(vec2(rowId, 11.0)) * 2.0 - 1.0);
    float rowSpeed = (0.15 + uChaos * 1.6) * speedJ * (0.3 + uSpeed * 1.3);
    // uHigh: vibracion micro de la posicion -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    float scrollX = p.x + t * rowSpeed + uHigh * 0.01 * sin(t * 12.0 + rowId);

    // D1: tamano/frecuencia. Kick: empuje chico y acotado, ademas del
    // flash de mas abajo -- decae solo con uKick.
    float freq = mix(2.0, 9.0, uD1) * (1.0 + uKick * 0.12);
    float mx = scrollX * freq;
    float cellX = floor(mx);
    float fx = fract(mx);

    // D4: aire entre elementos -- reduce el elemento hacia el centro
    // de su celda antes de evaluar cada motivo.
    float air = uD4 * 0.35;
    vec2  cellUV = vec2(fx, rowY);

    float strokeW = mix(0.06, 0.28, uD3);
    float m;

    if (mtype == 0) {
        // Triangulos en zigzag: la rampa (0->1 o 1->0 segun la celda)
        // marca la altura del triangulo -- alternar la direccion cada
        // celda es lo que da el zigzag, no un diente de sierra parejo.
        float flip = mod(cellX, 2.0);
        float ramp = mix(fx, 1.0 - fx, flip);
        m = step(rowY, ramp) * step(air, ramp);
    } else if (mtype == 1) {
        // Cuadros.
        float subY = floor(rowY * 2.0);
        m = mod(cellX + subY, 2.0);
        m *= step(air, fx) * step(fx, 1.0 - air) * step(air, rowY) * step(rowY, 1.0 - air);
    } else if (mtype == 2) {
        // Rombo tipo "<>": solo el contorno.
        vec2  c = cellUV - 0.5;
        float d = abs(abs(c.x) * 1.6 + abs(c.y) * 2.0 - 0.6);
        m = 1.0 - smoothstep(strokeW, strokeW + 0.03, d);
    } else if (mtype == 3) {
        // Trenza ondulada: dos senos desfasados, ancho constante.
        float wave1 = sin(mx * TAU * 0.5) * 0.32 + 0.5;
        float wave2 = sin(mx * TAU * 0.5 + PI) * 0.32 + 0.5;
        float d1 = abs(rowY - wave1);
        float d2 = abs(rowY - wave2);
        m = max(1.0 - smoothstep(strokeW * 0.5, strokeW * 0.5 + 0.02, d1),
                1.0 - smoothstep(strokeW * 0.5, strokeW * 0.5 + 0.02, d2));
    } else {
        // Barras verticales de ancho irregular (codigo de barras).
        float barW = mix(0.15, 0.85, hash21(vec2(cellX, rowId + 30.0)));
        m = step(fx, barW) * step(air, rowY) * step(rowY, 1.0 - air);
    }

    // Tela real, no vacio: un fondo calido muy oscuro (el color base de
    // la trama del textil) en vez de negro absoluto entre los motivos.
    vec3 col = hsv2rgb(vec3(fract(h0 + 0.03), 0.4, 0.04)) * (1.0 - m);
    col += motifCol * m;

    // D6: brillo/resplandor general.
    col *= 0.75 + uD6 * 0.6;

    // PIANO: una fila entera destella con su propio color, elegida
    // por uKeypos -- color encima, no cambia el motivo ni el scroll.
    if (uKeypulse > 0.0015) {
        float targetRow = floor(mix(0.0, nRows - 1.0, uKeypos) + 0.5);
        float onRow = 1.0 - smoothstep(0.0, 0.6, abs(rowId - targetRow));
        col += vec3(1.0) * onRow * uKeypulse * (0.35 + uKeyvel * 0.5);
    }

    // Kick: flash breve, ademas del empuje de frecuencia de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.55);

    col *= vignette(uv, 0.15);

    return vec4(col, 1.0);
}
