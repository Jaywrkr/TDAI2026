// ===============================================================
// SCENE 38 - CONSTELACION
// Un mapa de regiones de color solido (Voronoi con bordes en bloques,
// tipo pixel-art) con puntos negros marcando cada semilla, y encima una
// curva blanca tipo Lissajous que se va DIBUJANDO sola, se queda quieta
// un rato ya completa, y despues el mapa entero se reordena de golpe
// (nuevas regiones, nuevos puntos, curva nueva) y vuelve a dibujarse.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. RESEED PERIODICO: genSeed = floor(t / cicloTotal) es un numero que
//    cambia de golpe cada 'cicloTotal' segundos. TODO lo demas (semillas
//    del Voronoi, paleta asignada a cada region, forma de la curva) se
//    deriva de un hash que incluye genSeed -- asi el "corte" a un mapa
//    nuevo es instantaneo, no una transicion, igual que en el video de
//    referencia.
//
// 2. MAPA: Voronoi de siempre (3x3 celdas vecinas, semilla jitterada por
//    celda -- mismo patron que los marcadores de scene36), pero la
//    distancia se mide sobre una coordenada CUANTIZADA (pixelada) en vez
//    de la posicion real del pixel. Cuantizar antes de medir es lo que
//    da el borde "en bloques" (voxel), no una curva Voronoi suave.
//
// 3. PUNTOS: la MISMA busqueda de vecinos, pero esta vez la distancia se
//    mide con la posicion REAL del pixel (sin cuantizar) -- por eso los
//    puntos salen circulos lisos aunque las regiones sean de bloques.
//    Se dibujan restando color (dotMask empuja hacia 0), asi quedan
//    negros de verdad sin importar que haya debajo -- region o curva.
//
// 4. CURVA: mismo truco de scene22_oscilloscope (traceFigure: distancia
//    al SEGMENTO entre cada par de muestras consecutivas de una figura
//    de Lissajous, no punto por punto) pero con un limite de cuantas
//    muestras entran segun cuanto avanzo el dibujo (drawFrac) -- eso es
//    lo que hace que la curva se vea "dibujandose" en vez de aparecer
//    entera de una.
//
// CONTROLES
//   Speed    cuanto dura cada ciclo completo (dibujo + pausa + reseed) --
//            mas Speed, ciclos mas cortos y seguidos
//   Density  cuantas regiones tiene el mapa (pocas y grandes <-> muchas
//            y chicas)
//   Hue      hue base de la paleta de regiones (las 5 fijas rotan juntas)
//   Chaos    que tan organicas son las semillas del Voronoi (casi
//            grilla <-> bien irregulares)
//   Bass     brillo de lo ya claro (audioLift) -- los puntos negros NO
//            se tocan (siguen en 0, por construccion)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, empuja un poco el AVANCE del dibujo de la
//            curva (bounded, decae solo -- mismo criterio que el
//            "kickPush" de radio en scene13)
//   High     vibracion micro de la curva (excepcion del contrato)
//
// @D1: pixelado del borde de las regiones (bloques grandes <-> casi
//      suave)
// @D2: complejidad de la curva (pocos lobulos <-> muchos, mas enredada)
// @D3: grosor de la curva
// @D4: tamano de los puntos semilla (chicos <-> grandes)
// @D5: cuanto dura la pausa con la curva ya completa antes del reseed
// @D6: resplandor debajo de la curva
// ===============================================================

float paletteHue(int i) {
    if (i == 0) return 0.06;   // naranja
    if (i == 1) return 0.92;   // magenta
    if (i == 2) return 0.40;   // verde
    if (i == 3) return 0.60;   // azul
    return 0.99;                // rojo
}

float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a, ap = p - a;
    float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return length(ap - ab * h);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // --- RESEED PERIODICO ---
    float cycleLen = mix(11.0, 3.5, uSpeed);
    float cycleT = mod(t, cycleLen);
    float gs = floor(t / cycleLen);

    // --- MAPA DE REGIONES (Voronoi de bordes en bloques) ---
    float pxStep = mix(0.16, 0.008, uD1);
    vec2  pq = (floor(p / pxStep) + 0.5) * pxStep;

    float nCells = 3.0 + uDensity * 8.0;
    float cellSize = 2.6 / nCells;
    float chaosAmt = 0.15 + uChaos * 0.75;

    vec2  g = pq / cellSize;
    vec2  gi = floor(g);

    float minBlockD = 1e5;
    vec2  bestId = gi;
    float minDotD = 1e5;

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            vec2 id = gi + vec2(dx, dy);
            vec2 jitter = hash22(id + gs * 17.0) - 0.5;
            vec2 site = (id + 0.5 + jitter * chaosAmt) * cellSize;

            float dBlock = length(pq - site);
            if (dBlock < minBlockD) { minBlockD = dBlock; bestId = id; }

            float dDot = length(p - site);
            minDotD = min(minDotD, dDot);
        }
    }

    float h0 = audioHue(uHue, uMid * 0.12);
    int   colorIdx = int(mod(hash21(bestId + gs * 5.3 + 3.0) * 5.0, 5.0));
    float regionH = audioHue(paletteHue(colorIdx), 0.0) + h0;
    vec3  col = hsv2rgb(vec3(fract(regionH), 0.78, 0.82));

    // --- CURVA (Lissajous, se dibuja de a poco y se queda quieta) ---
    // D2: complejidad -- rango de lobulos que puede tocar el hash.
    float fa = 3.0 + floor(hash21(vec2(gs, 11.0)) * (3.0 + uD2 * 5.0));
    float fb = 2.0 + floor(hash21(vec2(gs, 23.0)) * (2.0 + uD2 * 4.0));
    float amp = mix(0.40, 0.85, hash21(vec2(gs, 31.0)));
    float phase = hash21(vec2(gs, 41.0)) * TAU;

    // D5: cuanto dura la pausa (curva ya completa) antes del reseed.
    float holdFrac = mix(0.12, 0.55, uD5);
    float drawDur = cycleLen * (1.0 - holdFrac);
    float drawFrac = clamp(cycleT / max(drawDur, 0.001), 0.0, 1.0);
    // Kick: empuje chico y acotado al avance del dibujo, ademas del
    // flash de mas abajo -- mismo criterio que el "kickPush" de radio
    // en scene13 (geometria, pero bounded y decae solo con uKick).
    drawFrac = clamp(drawFrac + uKick * 0.05, 0.0, 1.0);

    const int NSTEPS = 80;
    int nDrawn = 1 + int(floor(float(NSTEPS) * drawFrac));

    // uHigh: vibracion micro de la curva -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    vec2 pj = p + uHigh * 0.008 * vec2(sin(t * 13.0), cos(t * 11.0));

    float minCurveD = 1e5;
    vec2 prev = amp * vec2(sin(phase), 0.0);
    for (int i = 1; i <= NSTEPS; i++) {
        if (i > nDrawn) break;
        float u = float(i) / float(NSTEPS) * TAU;
        vec2 c = amp * vec2(sin(fa * u + phase), sin(fb * u));
        minCurveD = min(minCurveD, segDist(pj, prev, c));
        prev = c;
    }

    // D3: grosor. D6: resplandor debajo de la curva.
    float lineW = 0.006 + uD3 * 0.020;
    float aaCurve = max(fwidth(minCurveD), 1e-5);
    float curveCore = 1.0 - smoothstep(lineW, lineW + aaCurve * 2.0, minCurveD);
    float glowW = 0.02 + uD6 * 0.12;
    float curveGlow = exp(-minCurveD * minCurveD / (glowW * glowW)) * (0.15 + uD6 * 0.35);
    col = mix(col, vec3(1.0), curveCore);
    col += vec3(1.0) * curveGlow;

    // PIANO: un punto de la curva ya dibujada se enciende de golpe con
    // color propio en la posicion que elige uKeypos -- geometria de
    // COLOR (no mueve la curva ni la reordena), decae con uKeypulse.
    if (uKeypulse > 0.0015) {
        float uGuest = uKeypos * float(nDrawn) / float(NSTEPS) * TAU;
        vec2  guestPt = amp * vec2(sin(fa * uGuest + phase), sin(fb * uGuest));
        float dGuest = length(p - guestPt);
        float guestGlow = exp(-dGuest * dGuest / (0.002 + uKeyvel * 0.01)) * uKeypulse;
        col += hsv2rgb(vec3(fract(h0 + 0.5), 0.85, 1.0)) * guestGlow * 2.0;
    }

    // --- PUNTOS SEMILLA: negros de verdad, encima de todo ---
    // D4: tamano.
    float dotR = mix(0.010, 0.028, uD4);
    float aaDot = max(fwidth(minDotD), 1e-5);
    float dotMask = 1.0 - smoothstep(dotR, dotR + aaDot * 1.5, minDotD);
    col *= (1.0 - dotMask);

    // Kick: flash breve, ademas del empuje de dibujo de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro. Los puntos negros no se ven
    // afectados -- audioLift multiplica luminancia existente, y la de
    // un pixel en 0 sigue siendo 0 por construccion.
    col = audioLift(col, uBass * 0.55);

    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
