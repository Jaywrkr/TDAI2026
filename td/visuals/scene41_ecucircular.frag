// ===============================================================
// SCENE - ECUALIZADOR CIRCULAR
// El mismo espiritu que un ecualizador de audio, pero las barras
// salen en circulo desde un nucleo central en vez de alinearse en
// fila -- cada una crece hacia afuera, con su propio baile de fase
// (ola que recorre el circulo) y un empujon real de bajo encima.
// ===============================================================
//
// COMO FUNCIONA
// El angulo de cada pixel se cuantiza en N cunas (Density); cada cuna
// es una barra que crece radialmente desde un radio base. Igual que un
// ecualizador lineal: una ola de fase por barra da la danza de base, y
// Bass empuja la longitud real de la barra encima.
//
// CONTROLES
//   Speed    velocidad de la ola que recorre las barras
//   Density  cuantas barras entran en la vuelta completa
//   Hue      color base
//   Chaos    variacion de longitud entre barras
//   Bass     empuje real de longitud + brillo de lo ya claro
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todo el anillo
//   High     vibracion micro de la longitud (excepcion del contrato)
//
// @D1: cuanto reacciona cada barra al bajo
// @D2: largo base de las barras
// @D3: radio del nucleo central (chico <-> grande)
// @D4: grosor de cada barra
// @D5: brillo del nucleo central
// @D6: cantidad de resplandor (glow) en las puntas
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);

    float nBars = 10.0 + floor(uDensity * 26.99);
    float seg = TAU / nBars;
    float idx = floor((ang + PI) / seg);
    float within = fract((ang + PI) / seg) - 0.5;

    vec2  seed = vec2(idx * 3.1 + 2.0, idx * 1.7 + 6.0);
    float waveSpeed = 0.5 + uSpeed * 2.0;
    float wave = 0.5 + 0.5 * sin(t * waveSpeed - idx * 0.5 + hash21(seed) * TAU);

    float lenJitter = mix(1.0, 0.3 + hash21(seed + 1.0) * 1.4, uChaos);
    float coreR = mix(0.12, 0.35, uD3);
    float baseLen = mix(0.08, 0.55, uD2) * lenJitter;
    float reactivity = 0.3 + hash21(seed + 3.0) * 0.9;
    float barLen = baseLen * (0.6 + wave * 0.4) * (1.0 + uBass * uD1 * 1.6 * reactivity);
    barLen += uHigh * 0.015 * sin(t * 14.0 + idx);

    float halfW = mix(seg * 0.15, seg * 0.48, uD4);
    bool  inBar = abs(within) < halfW && r > coreR && r < coreR + barLen;

    float h = audioHue(uHue, uMid * 0.10);
    vec3  barCol = hsv2rgb(vec3(fract(h + hash21(seed + 5.0) * 0.05), 0.7, 1.0));

    vec3  col = vec3(0.0);
    if (inBar) col = barCol;

    float tipD = abs(r - (coreR + barLen));
    float tipGlow = exp(-tipD * tipD / (0.0006 + uD6 * 0.01)) * step(abs(within), halfW);
    col += barCol * tipGlow * (0.3 + uD6 * 0.7);

    vec3  coreCol = hsv2rgb(vec3(fract(h + 0.5), 0.5, 1.0));
    col += coreCol * exp(-r * r * 5.0 / max(coreR * coreR, 0.001)) * (0.3 + uD5 * 0.9);

    // PIANO: la barra mas cercana a uKeypos brilla blanco.
    if (uKeypulse > 0.0015) {
        float targetIdx = floor(uKeypos * nBars);
        float onBar = 1.0 - smoothstep(0.0, 1.2, abs(idx - targetIdx));
        if (inBar) col += vec3(1.0) * onBar * uKeypulse * (0.5 + uKeyvel * 1.0);
    }

    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
