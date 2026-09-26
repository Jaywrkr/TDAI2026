// SCENE - TINTA FLUIDA
// Remolinos de tinta y filamentos fluidos sin buffer temporal.
// @D1: escala de remolinos
// @D2: torsion del flujo
// @D3: grosor de los filamentos
// @D4: mezcla de tonos
// @D5: contraste del fondo
// @D6: intensidad de la tinta
vec4 render(vec2 uv) {
    vec2 p = centered(uv) * mix(1.1, 3.6, uD1);
    float t = uTime * 0.7;
    float kick = max(uKick, uBeat * 0.7) * uAudioamt;
    float a = noise21(p * 0.9 + vec2(t, -t * 0.5));
    p = rot2((a - 0.5) * (1.0 + uD2 * 4.0 + uChaos * 2.0) + kick * 0.28) * p;
    float n = fbm(p + vec2(t * 0.4, -t * 0.2), 3);
    float thread = ridge(n, mix(1.5, 8.0, uD3));
    float cloud = smoothstep(mix(0.2, 0.55, uD5), 0.78, n);
    float l = (thread * 0.65 + cloud * 0.35) * (0.35 + uD6 * 1.2);
    float hue = audioHue(uHue + n * (0.1 + uD4 * 0.4), uMid * 0.1);
    vec3 col = hsv2rgb(vec3(hue, 0.7 + uD4 * 0.25, l));
    return vec4(audioLift(col, uBass * 0.65 + kick * 0.3 + uHigh * 0.12), 1.0);
}
