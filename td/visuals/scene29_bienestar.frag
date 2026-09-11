// ===============================================================
// SCENE - BIENESTAR
// Un tablero tipo dashboard de salud/finanzas (bento grid): la pantalla
// se parte en tarjetas redondeadas de tamanos irregulares -- cada una
// con su propio "widget": un numero en fuente de puntos (como un
// display digital), un anillo punteado de progreso con un numero en el
// centro, una onda brillante con un marcador que la recorre, o unos
// puntos orbitando de forma decorativa. Inspirada en capturas de apps
// de salud (Superpower, monitores de glucosa) y dashboards tipo CRM que
// el usuario mando como referencia: fondo casi negro con manchas de
// color muy difusas detras de cada tarjeta, o -- deslizando D6 -- el
// modo claro, tarjetas pastel con tinta oscura, igual que las capturas
// en blanco.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. TARJETAS: particion BSP de 1 eje (misma tecnica de scene40/43),
//    pero sobre el espacio CENTRADO (no uv 0..1) para que las tarjetas
//    salgan con aspecto parejo sin importar la resolucion de salida.
//    Cada tarjeta es un rectangulo con esquinas redondeadas de verdad
//    (SDF, no un recorte a lo bruto) con un margen fijo entre tarjetas
//    vecinas -- el "gutter" del bento grid.
//
// 2. RESEED PERIODICO: mismo mecanismo que scene38-41/43 -- un contador
//    que avanza cada 'cicloTotal' segundos (Speed) y de un salto de
//    Kick, entra en TODOS los hash de color y contenido. El reordene es
//    un corte instantaneo, no una transicion.
//
// 3. CUATRO WIDGETS (D4 sesga la mezcla hacia pocos tipos o la mezcla
//    completa, elegido por hash de la tarjeta):
//    - NUMERO: dos digitos en una fuente de puntos 3x5 (el mismo
//      lenguaje que "37", "25", "70" de las capturas), bitmask fijo por
//      digito (igual tecnica que los muñequitos de scene24_radar).
//    - ANILLO: una corona de "ticks" repartidos en un circulo -- los
//      primeros N (segun el progreso, que avanza solo con el tiempo)
//      se ven brillantes/de color, el resto tenues -- con el mismo
//      numero de puntos en el centro.
//    - ONDA: una curva seno brillante con un punto marcador que la
//      recorre, como la curva de "Sugar 90 mg/dL".
//    - ORBITA: unos pocos puntos girando sobre un circulo tenue,
//      decorativo, como los infogramas chicos de las tarjetas moradas/
//      rosas de referencia.
//
// 4. MODO OSCURO <-> CLARO (D6, un solo control global): en 0, cada
//    tarjeta es casi negra con una mancha de color muy difusa detras
//    del widget (glow real); en 1, la tarjeta es pastel clarito y el
//    contenido se dibuja en tinta oscura -- las dos familias de
//    referencia (salud oscura / CRM claro) son los dos extremos de la
//    MISMA perilla, no dos escenas distintas.
//
// CONTROLES
//   Speed    cuanto dura cada ciclo antes de reordenar todo el tablero
//   Density  profundidad de la particion (pocas tarjetas grandes <->
//            muchas chicas)
//   Hue      hue base de la paleta (rota junto con todo)
//   Chaos    irregularidad de los cortes (tarjetas parejas <-> anchos
//            bien mezclados)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, ADELANTA el reseed -- todo el tablero se
//            reordena de golpe con el golpe de graves
//   High     vibracion micro de las tarjetas (excepcion del contrato)
//
// @D1: densidad/grosor del punteado (puntos de los numeros, ticks del
//      anillo, grosor de la onda)
// @D2: intensidad de la mancha de color de fondo de cada tarjeta (modo
//      oscuro) / fuerza del tinte de color (modo claro)
// @D3: velocidad de la animacion interna (avance del anillo, ondulacion
//      de la onda, giro de la orbita)
// @D4: variedad de widgets (pocos tipos <-> mezcla completa)
// @D5: amplitud de la onda decorativa
// @D6: mezcla modo oscuro <-> modo claro del tablero entero
// ===============================================================

float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Fuente de puntos 3 (ancho) x 5 (alto) para los digitos 0-9, cada uno
// codificado como un entero de 15 bits (fila por fila, MSB primero) --
// misma idea que spriteBit/spriteRow de scene24_radar, generalizada a
// 10 simbolos en vez de 2 frames.
float digitCode(int d) {
    if (d == 0) return 31599.0;
    if (d == 1) return 11415.0;
    if (d == 2) return 29671.0;
    if (d == 3) return 29647.0;
    if (d == 4) return 23497.0;
    if (d == 5) return 31183.0;
    if (d == 6) return 31215.0;
    if (d == 7) return 29330.0;
    if (d == 8) return 31727.0;
    return 31695.0;   // 9
}

float digitBit(int d, int row, int col) {
    float idx = float(row * 3 + col);
    float shift = pow(2.0, 14.0 - idx);
    return mod(floor(digitCode(d) / shift), 2.0);
}

// 'q' en unidades de "celda de punto" (1.0 = separacion entre puntos),
// origen en la esquina superior-izquierda del digito (col 0..2). La
// fila se invierte (4-row) porque el espacio de pantalla tiene Y hacia
// arriba y la fuente esta escrita de arriba hacia abajo.
float digitMask(int d, vec2 q, float dotR) {
    float cov = 0.0;
    for (int row = 0; row < 5; row++) {
        for (int col = 0; col < 3; col++) {
            if (digitBit(d, row, col) < 0.5) continue;
            vec2 dotPos = vec2(float(col), 4.0 - float(row));
            float dd = length(q - dotPos);
            cov = max(cov, 1.0 - smoothstep(dotR * 0.7, dotR, dd));
        }
    }
    return cov;
}

// Numero de 2 digitos (0-99) centrado en el origen de 'qi' (unidades de
// celda de punto): 3 columnas + separador + 3 columnas = 7 de ancho,
// 5 de alto.
float numberMask(int value, vec2 qi, float dotR) {
    vec2  q0 = qi + vec2(3.0, 2.0);
    int   tens = value / 10;
    int   ones = value - tens * 10;
    float m = digitMask(tens, q0, dotR);
    m = max(m, digitMask(ones, q0 - vec2(4.0, 0.0), dotR));
    return m;
}

// Anillo de "ticks" (rayitas radiales repartidas en un circulo): por
// cada pixel se identifica a que sector angular pertenece (sin bucle,
// analitico) y se dibuja solo la rayita de ESE sector -- los primeros
// 'progress*nTicks' sectores salen "encendidos" (litAmt=1), el resto
// tenues. Es el mismo lenguaje que los anillos punteados "37 Bad" / "79
// Good" de las capturas.
float ringTicks(vec2 q, float ringR, float tickLen, float tickW, float nTicks, float progress, out float litAmt) {
    float ang = atan(q.y, q.x) / TAU + 0.5;
    float tIdx = floor(ang * nTicks);
    float tAngC = (tIdx + 0.5) / nTicks * TAU - PI;
    vec2  dir = vec2(cos(tAngC), sin(tAngC));
    vec2  qr = vec2(dot(q, dir), dot(q, vec2(-dir.y, dir.x)));
    float dRad = abs(qr.x - ringR);
    float dTang = abs(qr.y);
    float cov = (1.0 - smoothstep(0.0, tickW, dTang))
              * (1.0 - smoothstep(tickLen * 0.5, tickLen * 0.5 + 0.01, dRad));
    litAmt = step(tIdx, progress * nTicks - 1.0);
    return cov;
}

// Onda seno con ancho de linea constante.
float waveMask(vec2 q, float amp, float freq, float phase, float thick) {
    float wy = sin(q.x * freq + phase) * amp;
    float d = abs(q.y - wy);
    return 1.0 - smoothstep(thick * 0.5, thick * 0.5 + 0.02, d);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);

    // --- PARTICION BSP (bento grid, fija salvo por las perillas) ---
    int   depth = 2 + int(floor(uDensity * 3.99));
    float splitVar = 0.08 + uChaos * 0.30;
    vec2  lo = vec2(-uAspect, -1.0), hi = vec2(uAspect, 1.0);
    float nodeHash = 1.0;

    for (int i = 0; i < 5; i++) {
        if (i >= depth) break;
        float fi = float(i);
        float rnd = hash21(vec2(nodeHash, fi * 13.7 + 7.0));
        float split = mix(0.5 - splitVar, 0.5 + splitVar, rnd);
        if (i % 2 == 0) {
            float mid = mix(lo.x, hi.x, split);
            if (p.x < mid) { hi.x = mid; nodeHash = nodeHash * 2.0 + 1.0; }
            else            { lo.x = mid; nodeHash = nodeHash * 2.0 + 2.0; }
        } else {
            float mid = mix(lo.y, hi.y, split);
            if (p.y < mid) { hi.y = mid; nodeHash = nodeHash * 2.0 + 1.0; }
            else            { lo.y = mid; nodeHash = nodeHash * 2.0 + 2.0; }
        }
    }

    vec2 cardCenter = (lo + hi) * 0.5;
    vec2 panelHalf = (hi - lo) * 0.5;
    vec2 q = p - cardCenter;
    // uHigh: vibracion micro de la tarjeta -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    q += uHigh * 0.004 * vec2(sin(t * 10.0 + nodeHash), cos(t * 8.0 + nodeHash));

    float gap = 0.028;
    vec2  cardHalf = max(panelHalf - gap, vec2(0.01));
    float cornerR = min(cardHalf.x, cardHalf.y) * 0.28;
    float cardSDF = sdRoundBox(q, cardHalf, cornerR);
    float aaCard = max(fwidth(cardSDF), 1e-4) * 1.5;
    float insideCard = 1.0 - smoothstep(0.0, aaCard, cardSDF);
    float contentScale = min(cardHalf.x, cardHalf.y) * 0.85;

    // --- RESEED PERIODICO ---
    float reseedRate = mix(0.11, 0.33, uSpeed);
    float gs = floor(t * reseedRate + uKick * 7.0);

    // --- COLOR BASE DE LA TARJETA ---
    int   colorIdx = int(mod(hash21(vec2(nodeHash, gs * 5.0 + 1.0)) * 5.0, 5.0));
    float huesW[5];
    huesW[0] = 0.58; huesW[1] = 0.90; huesW[2] = 0.06; huesW[3] = 0.33; huesW[4] = 0.78;
    vec3  cardCol = hsv2rgb(vec3(fract(audioHue(huesW[colorIdx], 0.0) + h0), 0.68, 1.0));

    // --- CONTENIDO: 4 widgets, D4 sesga la variedad ---
    float typeH = hash21(vec2(nodeHash, gs * 3.0 + 50.0));
    float biased = pow(typeH, mix(2.0, 0.4, uD4));
    int   ctype = int(floor(biased * 3.999));

    float contentCov = 0.0;
    float contentGlow = 0.0;
    float dotR = mix(0.22, 0.42, uD1);

    if (ctype == 0) {
        // NUMERO
        int   val = int(mod(hash21(vec2(nodeHash, gs * 7.0 + 2.0)) * 100.0, 100.0));
        float unit = contentScale / 2.6;
        contentCov = numberMask(val, q / max(unit, 1e-4), dotR);
    } else if (ctype == 1) {
        // ANILLO con numero chico en el centro.
        int   val = int(mod(hash21(vec2(nodeHash, gs * 7.0 + 3.0)) * 100.0, 100.0));
        float progress = fract(hash21(vec2(nodeHash, gs * 7.0 + 4.0)) + t * (0.04 + uD3 * 0.25));
        float ringR = contentScale * 0.78;
        float tickLen = contentScale * 0.16;
        float tickW = mix(contentScale * 0.018, contentScale * 0.05, uD1);
        float litAmt;
        float tickCov = ringTicks(q, ringR, tickLen, tickW, 28.0, progress, litAmt);
        contentCov = tickCov * (0.30 + litAmt * 0.9);
        float unit = contentScale / 4.4;
        contentCov = max(contentCov, numberMask(val, q / max(unit, 1e-4), dotR) * 0.9);
    } else if (ctype == 2) {
        // ONDA con marcador.
        float freq = mix(2.0, 5.0, uD1) / max(contentScale, 1e-3);
        float amp = contentScale * 0.35 * (0.35 + uD5 * 1.1);
        float phase = t * (0.6 + uD3 * 2.2) + nodeHash;
        float thick = mix(contentScale * 0.025, contentScale * 0.06, uD1);
        contentCov = waveMask(q, amp, freq, phase, thick);
        float markerX = mix(-contentScale * 0.9, contentScale * 0.9,
                             fract(t * (0.10 + uD3 * 0.30) + nodeHash * 0.13));
        float markerY = sin(markerX * freq + phase) * amp;
        float dMarker2 = dot(q - vec2(markerX, markerY), q - vec2(markerX, markerY));
        contentGlow += exp(-dMarker2 / (contentScale * contentScale * 0.012)) * 1.3;
    } else {
        // ORBITA decorativa: puntos girando sobre un anillo tenue.
        float orbR = contentScale * 0.55;
        int   nOrb = 3 + int(floor(hash21(vec2(nodeHash, 9.0)) * 3.0));
        for (int k = 0; k < 5; k++) {
            if (k >= nOrb) break;
            float fk = float(k);
            float orbAng = t * (0.15 + uD3 * 0.5) + fk * (TAU / max(float(nOrb), 1.0)) + nodeHash;
            vec2  orbPos = orbR * vec2(cos(orbAng), sin(orbAng) * 0.65);
            float dOrb2 = dot(q - orbPos, q - orbPos);
            contentGlow += exp(-dOrb2 / (contentScale * contentScale * 0.01)) * 0.9;
        }
        float litAmtUnused;
        contentCov = ringTicks(q, orbR, contentScale * 0.02, contentScale * 0.01, 40.0, 0.0, litAmtUnused) * 0.25;
    }

    // --- MODO OSCURO <-> CLARO (D6, global) ---
    vec2  blobOff = (hash22(vec2(nodeHash, 11.0)) - 0.5) * cardHalf * 0.5;
    float blobD2 = dot(q - blobOff, q - blobOff);
    float blobGlow = exp(-blobD2 / (contentScale * contentScale * 1.4 + 1e-4)) * (0.35 + uD2 * 1.1);

    vec3  bgDark = cardCol * blobGlow * 0.9;
    vec3  bgLight = mix(vec3(0.93, 0.93, 0.95), cardCol, 0.22 + uD2 * 0.28 + blobGlow * 0.10);
    vec3  cardBg = mix(bgDark, bgLight, uD6);
    vec3  contentColBase = mix(vec3(1.0), vec3(0.08, 0.08, 0.10), uD6 * 0.85);

    vec3  cardColFull = mix(cardBg, contentColBase, contentCov);
    cardColFull += cardCol * contentGlow * (1.0 - uD6 * 0.5);

    // Brillo de vidrio: borde sutil de la tarjeta (glassmorphism).
    float edgeBand = (1.0 - smoothstep(0.0, aaCard * 3.0, abs(cardSDF + aaCard * 1.5))) * insideCard;
    cardColFull += vec3(1.0) * edgeBand * 0.05;

    vec3  baseBG = mix(vec3(0.008), vec3(0.90), uD6);
    vec3  col = mix(baseBG, cardColFull, insideCard);

    // PIANO: la tarjeta mas cercana a uKeypos destella blanco -- mismo
    // tratamiento que scene40/scene43 (comparar un hash de la tarjeta
    // contra uKeypos), decae con uKeypulse.
    if (uKeypulse > 0.0015) {
        float guestSel = hash21(vec2(nodeHash, 999.0));
        float onGuest = 1.0 - smoothstep(0.0, 0.05, abs(guestSel - uKeypos));
        col += vec3(1.0) * onGuest * insideCard * uKeypulse * (0.4 + uKeyvel * 0.6);
    }

    // Kick: flash breve, ademas del adelanto de reseed de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
