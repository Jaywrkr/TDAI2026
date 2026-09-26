// SCENE - ESPIRAL DE TRAZOS
// Marcas que evocan tipografia sobre un espiral radial.
// @D1: radio del espiral
// @D2: numero de trazos
// @D3: largo de cada trazo
// @D4: apertura del espiral
// @D5: grosor de linea
// @D6: resplandor
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * mix(0.08, 0.6, uSpeed);
    float kick = max(uKick, uBeat * 0.7) * uAudioamt;
    float n = floor(mix(20.0, 72.0, uDensity) * (0.5 + uD2));
    float angle = atan(p.y, p.x) + PI;
    float sector = floor(angle / TAU * n);
    float local = fract(angle / TAU * n) - 0.5;
    float spiral = 0.18 + uD1 * 0.15 + angle / TAU * (0.15 + uD4 * 0.55);
    spiral += 0.045 * sin(sector * 0.7 + t) * uChaos + kick * 0.06;
    float r = length(p);
    float stroke = abs(r - spiral);
    float glyph = step(0.15 + uD3 * 0.3, abs(local)) * 0.55 + 0.45;
    float line = (1.0 - smoothstep(0.002, 0.008 + uD5 * 0.026, stroke)) * glyph;
    float cross = (1.0 - smoothstep(0.003, 0.012 + uD5 * 0.03,
                   abs(local * r * TAU / n))) *
                   (1.0 - smoothstep(0.02, 0.16 + uD3 * 0.12, stroke));
    float glow = exp(-stroke * (22.0 - uD6 * 14.0)) * uD6 * 0.4;
    float l = line + cross * 0.6 + glow;
    vec3 col = hsv2rgb(vec3(audioHue(uHue + sector / n * 0.2, uMid * 0.08), 0.7, l));
    return vec4(audioLift(col, uBass * 0.7 + kick * 0.25 + uHigh * 0.2), 1.0);
}
