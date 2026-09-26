// ===============================================================
// SCENE - POLAR TRAILS
// Arcos blancos separados con extremos cromaticos sobre negro.
// Referencia: https://www.youtube.com/watch?v=7DkCTJ8qlPI
// Version polar analitica en una pasada, sin POPs ni feedback.
// uTime se detiene en silencio; no hay zoom automatico.
//
// @D1: distancia entre anillos
// @D2: numero de arcos
// @D3: longitud de los huecos
// @D4: grosor de trazo
// @D5: longitud de los extremos de color
// @D6: intensidad del halo
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float r = length(p);
    if (r > 1.15) return vec4(0.0, 0.0, 0.0, 1.0);
    float angle = atan(p.y, p.x);
    float t = uTime * 0.44;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float spacing = 0.19 + uD1 * 0.085;
    float stroke = 0.006 + uD4 * 0.011;
    float gap = -0.05 + uD3 * 0.42;
    float coloredWidth = 0.04 + uD5 * 0.95;
    float count = 2.0 + floor(uD2 * 2.0 + uDensity * 0.6);
    float hue = audioHue(uHue, uMid * 0.012);
    vec3 red = hsv2rgb(vec3(fract(hue + 0.02), 0.91, 1.0));
    vec3 cyan = hsv2rgb(vec3(fract(hue + 0.51), 0.84, 1.0));
    vec3 blue = hsv2rgb(vec3(fract(hue + 0.64), 0.88, 1.0));
    vec3 col = vec3(0.0);

    for (int i = 0; i < 3; i++) {
        float id = float(i);
        float radius = 0.24 + id * spacing;
        float band = abs(r - radius);
        float phase = angle * (count + id * 0.35) + id * 2.1 +
                      t * (0.25 - id * 0.13) +
                      uChaos * 0.14 * sin(angle * 3.0 + id * 1.7);
        float arcValue = sin(phase) - gap;
        float arc = smoothstep(-0.055, 0.04, arcValue);
        float tip = (1.0 - smoothstep(0.0, coloredWidth,
                                    abs(arcValue))) * arc;
        float front = step(0.0, cos(phase));
        vec3 endpoint = mix(red, mix(cyan, blue, step(1.5, id)), front);
        float core = exp(-band / stroke);
        float halo = exp(-band / (stroke * (3.2 + uD6 * 1.3)));
        vec3 ink = mix(vec3(1.0), endpoint, tip * 0.94);
        col += arc * ink * core * (0.78 + kick * 0.20);
        col += arc * ink * halo * (0.048 + uD6 * 0.071);
    }

    float center = exp(-r * 105.0) * (0.74 + kick * 0.25);
    col += vec3(1.0) * center;
    col = audioLift(col, uBass * 0.21 + uHigh * 0.12);
    return vec4(col, 1.0);
}
