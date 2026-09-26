// SCENE - MATRIZ DE CIRCULOS
// Circulos variables de color y escala llenan una cuadricula.
// @D1: numero de columnas
// @D2: tamano de circulos
// @D3: movimiento por celda
// @D4: variacion de escala
// @D5: giro del patron
// @D6: contraste de color
vec4 render(vec2 uv) {
    vec2 p = rot2((uD5 - 0.5) * 0.7) * centered(uv);
    float cells = floor(mix(5.0, 22.0, uDensity) * (0.7 + uD1 * 0.6));
    vec2 g = p * cells;
    vec2 id = floor(g), q = fract(g) - 0.5;
    float seed = hash21(id);
    float t = uTime * mix(0.08, 0.8, uSpeed);
    float kick = max(uKick, uBeat * 0.7) * uAudioamt;
    q -= vec2(sin(t + seed * TAU), cos(t * 0.7 + seed * TAU)) * (uD3 * 0.2 + kick * 0.14);
    float radius = (0.12 + uD2 * 0.34) * mix(1.0, 0.4 + seed * 1.2, uD4);
    radius *= 1.0 + kick * 0.25;
    float d = length(q) - radius;
    float disc = 1.0 - smoothstep(-0.015, 0.015, d);
    float rim = exp(-abs(d) * 35.0) * 0.3;
    float h = audioHue(uHue + seed * (0.1 + uChaos * 0.45), uMid * 0.08);
    vec3 col = hsv2rgb(vec3(h, 0.4 + uD6 * 0.5,
                            disc * (0.35 + uD6 * 0.65) + rim));
    return vec4(audioLift(col, uBass * 0.7 + kick * 0.32 + uHigh * 0.13), 1.0);
}
