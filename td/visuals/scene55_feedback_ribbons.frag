// SCENE - FRANJAS DE ECO
// Cintas horizontales y ecos distorsionados, basados en acabado001/002.
// @D1: ancho de las franjas
// @D2: separacion de ecos
// @D3: curvatura de la cinta
// @D4: desplazamiento horizontal
// @D5: suavidad del borde
// @D6: intensidad luminosa
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * mix(0.12, 0.9, uSpeed);
    float kick = max(uKick, uBeat * 0.7) * uAudioamt;
    float field = sin(p.y * (5.0 + uDensity * 13.0) +
                      sin(p.x * (2.0 + 6.0 * uD3) + t) * (0.15 + uChaos) +
                      p.x * (0.2 + uD4 * 2.0));
    float band = smoothstep(0.65 - uD1 * 0.5 - uD5 * 0.12, 0.78 + uD5 * 0.2, field);
    float echoes = 0.0;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float y = p.y + fi * (0.04 + uD2 * 0.13) - kick * fi * 0.025;
        float wobble = sin(p.x * (5.0 + uChaos * 7.0) + t + fi * 0.6) * (0.03 + uD3 * 0.09);
        echoes += (1.0 - smoothstep(0.0, 0.028 + uD5 * 0.06,
                    abs(sin((y + wobble) * (10.0 + uDensity * 18.0))))) / (1.0 + fi * 0.8);
    }
    float l = clamp(band * 0.7 + echoes * 0.43, 0.0, 1.4) * (0.45 + uD6);
    vec3 col = hsv2rgb(vec3(audioHue(uHue + p.y * 0.08, uMid * 0.08), 0.75, l));
    col = audioLift(col, uBass * 0.7 + kick * 0.3 + uHigh * 0.15);
    return vec4(col * vignette(uv, 0.45), 1.0);
}
