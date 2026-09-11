// ===============================================================
// SCENE - TORMENTA
// Un rayo de verdad (trazo quebrado, con un par de ramificaciones) que
// cae desde arriba y destella fuerte por un instante, sobre una nube de
// tormenta que deriva lento y unos relampagos lejanos que titilan
// dentro de las nubes, fuera de fase con el rayo principal. Es la unica
// escena del set que es mayormente calma-violenta-calma en vez de
// movimiento continuo -- un respiro distinto para un pico de la noche.
// ===============================================================
//
// COMO FUNCIONA
// El tiempo se corta en PERIODOS (uSpeed decide que tan seguido cae un
// rayo); dentro de cada periodo hay una fase 0..1 y un envolvente de
// flash que es brillante justo al arrancar el periodo y se apaga rapido
// -- asi el rayo "pasa" en vez de quedar prendido. La forma del rayo
// (por donde zigzaguea, donde ramifica) sale de un hash fijo POR
// PERIODO -- se mueve por el paso del tiempo, nunca tiembla con el
// audio. El camino se dibuja igual que el cometa de scene04
// (oscilloscope): una polilinea de segmentos con segDist22. Los
// relampagos lejanos son sin geometria de rayo, solo un resplandor
// suave en el cielo, cada uno con su propio desfasaje de periodo para
// que nunca destellen todos juntos.
//
// CONTROLES
//   Speed    que tan seguido cae un rayo (spaciado <-> casi continuo)
//   Density  cuantos relampagos lejanos titilan en el fondo
//   Hue      tinte del nucleo del rayo y del resplandor lejano
//   Chaos    cuanto zigzaguea el rayo (recto y contenido <-> muy quebrado)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional de la nube (audioHue)
//   Kick     empuja el brillo del flash actual, mas fuerte
//   High     vibracion micro del trazo del rayo (excepcion del contrato)
//
// @D1: grosor del nucleo del rayo
// @D2: cantidad de resplandor (glow) alrededor del rayo
// @D3: mezcla entre blanco puro y el tinte de Hue en el rayo
// @D4: cuantas ramificaciones salen del rayo principal
// @D5: contraste/densidad de la nube de tormenta de fondo
// @D6: velocidad de deriva de la nube de fondo
// ===============================================================

float segDist22(vec2 pp, vec2 a, vec2 b)
{
    vec2 ab = b - a;
    vec2 ap = pp - a;
    float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return length(ap - ab * h);
}

// Distancia MINIMA de `p` a una polilinea quebrada de nSeg tramos
// empezando en `start`, cayendo hacia abajo, con jitter horizontal por
// hash (seed unico por llamada). Importante: es un MINIMO, no una suma
// -- los tramos de una polilinea conectada quedan pegados unos a otros,
// asi que sumar el aporte de cada uno por separado cuenta el mismo
// pixel varias veces cerca de cada union y termina en un chorizo
// borroso saturado en vez de un trazo fino. Con el minimo, cada pixel
// cerca del rayo se ilumina UNA vez, sin importar cuantos tramos pasen
// cerca.
float boltMinDist(vec2 p, vec2 start, float totalDrop, int nSeg,
                  float seed, float jag, float highJit)
{
    vec2 prev = start;
    float best = 1e6;
    for (int i = 1; i <= 9; i++) {
        if (i > nSeg) break;
        float fi = float(i);
        float y = start.y - totalDrop * (fi / float(nSeg));
        float xh = (hash21(vec2(seed, fi * 3.7)) - 0.5) * jag;
        float x = start.x + xh * fi + highJit * (hash21(vec2(seed, fi + 50.0)) - 0.5);
        vec2 cpt = vec2(x, y);
        best = min(best, segDist22(p, prev, cpt));
        prev = cpt;
    }
    return best;
}

float coreGlow(float d, float lineW, float glowW)
{
    float core = 1.0 - smoothstep(0.0, lineW, d);
    float glow = exp(-d * d / glowW);
    return core * 1.4 + glow * 0.6;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Nube de tormenta de fondo: fbm oscuro que deriva lento -- nunca es
    // vacio absoluto, es un cielo cargado.
    float driftSpeed = 0.15 + uD6 * 0.6;
    float cloud = fbm(p * 1.1 + vec2(t * 0.02 * driftSpeed, -t * 0.015 * driftSpeed), 5, 0.55);
    float h = audioHue(fract(uHue + 0.58), uMid * 0.08);
    vec3  cloudCol = hsv2rgb(vec3(h, 0.30, 0.5));
    vec3  col = cloudCol * (0.06 + cloud * (0.05 + uD5 * 0.14));

    // Relampagos lejanos: sin trazo, solo un resplandor amplio en el
    // cielo, cada uno con su propio periodo y desfasaje -- nunca
    // sincronizados entre si ni con el rayo principal.
    int nFar = 1 + int(floor(uDensity * 4.0));
    for (int i = 0; i < 4; i++) {
        if (i >= nFar) break;
        float fi = float(i);
        vec2  seed2 = vec2(fi * 11.3, fi * 5.1);
        float period = 2.5 + hash21(seed2) * 4.0;
        float phaseOff = hash21(seed2 + 7.0) * period;
        float ph = fract((t + phaseOff) / period);
        float flare = exp(-ph * 22.0);
        vec2  farPos = vec2((hash21(seed2 + 2.0) - 0.5) * 2.2, 0.5 + hash21(seed2 + 3.0) * 0.5);
        float dFar = length(p - farPos);
        col += hsv2rgb(vec3(h, 0.15, 1.0)) * exp(-dFar * dFar * 1.4) * flare * 0.35;
    }

    // Rayo principal: un periodo por cada "caida", forma fija durante
    // todo el periodo (solo el tiempo la mueve, nunca el audio).
    float period = mix(5.0, 1.1, clamp(uSpeed, 0.0, 1.0));
    float boltIdx = floor(t / period);
    float phase = fract(t / period);
    // Flash rapido justo al arrancar el periodo + un resplandor mas largo
    // detras (como el aire iluminandose despues del relampago). Acotado
    // a 0.85: en el instante exacto del arranque, flash+afterglow suma
    // mas de 1 y el nucleo (ya blanco de por si) se pasaba de brillo
    // sobre TODO el trazo -- un rayo real destella fuerte, pero no borra
    // su propia forma.
    float flash = exp(-phase * 15.0);
    float afterglow = exp(-phase * 2.2) * 0.35;
    float envelope = min(flash + afterglow, 0.85);

    if (envelope > 0.002) {
        float seed = boltIdx * 13.7 + 1.0;
        vec2  startPos = vec2((hash21(vec2(seed, 0.0)) - 0.5) * 1.6, 1.05);
        float dropLen = 1.6 + hash21(vec2(seed, 1.0)) * 0.6;
        // jag mas chico que antes: con 0.32 el zigzag se enredaba sobre
        // si mismo cerca del arranque (varios tramos pasando muy cerca
        // uno del otro), y eso -- sumado al flash -- se leia como un
        // bulto borroso en vez de un rayo quebrado legible.
        float jag = 0.035 + uChaos * 0.16;
        float lineW = 0.005 + uD1 * 0.013;
        float glowW = 0.0018 + uD2 * 0.016;
        // uHigh: vibracion micro del trazo -- unica excepcion del contrato.
        float highJit = uHigh * 0.01;

        float dMain = boltMinDist(p, startPos, dropLen, 9, seed, jag, highJit);

        // Ramificaciones: salen de un punto a mitad de camino del rayo
        // principal, mas cortas y mas finas. Se guarda la distancia
        // minima a CUALQUIER rama por separado (mismo motivo que arriba:
        // un minimo, no una suma, para no sobre-iluminar donde dos ramas
        // pasan cerca una de otra).
        float dBranch = 1e6;
        int nBranch = int(floor(uD4 * 4.0));
        for (int b = 0; b < 4; b++) {
            if (b >= nBranch) break;
            float fb = float(b);
            float seedB = seed + fb * 91.0 + 3.0;
            float along = 0.3 + hash21(vec2(seedB, 9.0)) * 0.45;
            vec2  branchStart = vec2(startPos.x, startPos.y - dropLen * along);
            // Aproxima el x del rayo principal en ese punto para que la
            // ramificacion arranque pegada al tronco, no flotando.
            float mainXh = (hash21(vec2(seed, floor(along * 9.0) * 3.7 + 3.7)) - 0.5) * jag;
            branchStart.x += mainXh * (along * 9.0);
            float branchDrop = dropLen * (0.18 + hash21(vec2(seedB, 4.0)) * 0.22);
            dBranch = min(dBranch, boltMinDist(p, branchStart, branchDrop, 4, seedB,
                                               jag * 1.3, highJit));
        }

        // Tronco y ramas se combinan por SUMA (son geometria distinta,
        // no dos tramos del mismo trazo) pero cada uno ya es un aporte
        // de un solo trazo fino, no un chorizo saturado.
        float boltShape = coreGlow(dMain, lineW, glowW)
                        + coreGlow(dBranch, lineW * 0.65, glowW * 0.7) * 0.7;
        vec3 boltCol = mix(vec3(1.0), hsv2rgb(vec3(fract(uHue + 0.55), 0.45, 1.0)), 0.15 + uD3 * 0.55);
        col += boltCol * boltShape * envelope * (1.0 + uKick * 0.8);
    }

    col += col * uKick * 0.25;
    col = audioLift(col, uBass * 0.55);
    col *= vignette(uv, 0.18);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
