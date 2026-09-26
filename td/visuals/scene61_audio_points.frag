// SCENE - PUNTOS DE AUDIO
// Una nube de puntos se dispersa con el kick y vibra con el sonido.
// @D1: separacion de puntos
// @D2: radio de punto
// @D3: ondulacion espacial
// @D4: profundidad de capas
// @D5: respuesta al kick
// @D6: intensidad de halos
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * mix(0.08, 0.8, uSpeed);
    float kick = max(uKick, uBeat * 0.7) * uAudioamt;
    float cells = mix(9.0, 29.0, uDensity) * mix(1.3, 0.7, uD1);
    vec2 g = p * cells;
    vec2 base = floor(g);
    float light = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 c = base + vec2(float(x), float(y));
            vec2 rand = hash22(c);
            vec2 point = c + 0.5 + (rand - 0.5) * uChaos * 0.65;
            point.y += sin(c.x * 0.42 + t + rand.y * TAU) * (0.08 + uD3 * 0.3);
            point += normalize(point + vec2(0.001)) * kick * uD5 * 0.32;
            float depth = 0.4 + rand.x * (0.4 + uD4 * 0.6);
            float d = length(g - point);
            float dotLight = 1.0 - smoothstep(0.02, 0.08 + uD2 * 0.22, d);
            light += dotLight * depth + exp(-d * (8.0 - uD6 * 5.0)) * uD6 * 0.07;
        }
    }
    vec3 col = hsv2rgb(vec3(audioHue(uHue + p.y * 0.07, uMid * 0.08), 0.65, light));
    return vec4(audioLift(col, uBass * 0.75 + kick * 0.4 + uHigh * 0.22), 1.0);
}
