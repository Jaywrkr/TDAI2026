// ===============================================================
// SCENE - COLOR RIBBON
// Cintas luminosas entrelazadas con centro blanco y bordes cromaticos.
// Referencia: https://www.youtube.com/watch?v=LaXM51XhpJM
// El tutorial usa particulas, ruido y posprocesamiento de color.
// Esta version usa tres contornos polares y una cola en una pasada GLSL,
// sin simulacion ni textura de historial.
// El tiempo musical queda fijo en silencio; no hay zoom global.
//
// @D1: separacion entre cintas
// @D2: cantidad de pliegues
// @D3: complejidad de los cruces
// @D4: anchura de las cintas
// @D5: separacion cromatica
// @D6: intensidad del centro blanco
// ===============================================================

float ribbonSegment(vec2 p, vec2 a, vec2 b) {
    vec2 v = b - a;
    return length(p - a - v * clamp(dot(p - a, v) /
                                   max(dot(v, v), 0.0001), 0.0, 1.0));
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv) - vec2(0.07, 0.0);
    float r = length(p * vec2(0.93, 1.09));
    if (r > 1.28) return vec4(0.0, 0.0, 0.0, 1.0);
    float theta = atan(p.y, p.x);
    float t = uTime * 0.34;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float spread = 0.010 + uD5 * 0.046;
    float width = 0.034 + uD4 * 0.065;
    float warp = (noise21(p * (4.0 + uDensity * 2.5) +
                   vec2(t * 0.025, -t * 0.018)) - 0.5) *
                 (0.075 + uChaos * 0.085);
    vec3 warm = hsv2rgb(vec3(audioHue(fract(uHue + 0.035),
                                        uMid * 0.012), 0.80, 1.0));
    vec3 cool = hsv2rgb(vec3(audioHue(fract(uHue + 0.54),
                                        uMid * 0.012), 0.73, 1.0));
    vec3 col = vec3(0.0);

    for (int i = 0; i < 3; i++) {
        float id = float(i);
        float fold = 2.0 + floor(uD2 * 2.0) + id;
        float phase = theta * fold + r * (2.2 + uDensity * 2.0) +
                      id * 2.3 + t * (0.13 + id * 0.045);
        float radius = 0.25 + id * (0.13 + uD1 * 0.045) +
                       (0.095 + uChaos * 0.073) * sin(phase) +
                       uD3 * 0.074 * sin(theta * (4.0 + id * 2.0) -
                                         t * 0.09 + id) + warp;
        float d = r - radius;
        float shell = exp(-abs(d) / width);
        float redEdge = exp(-abs(d + spread) / (width * 0.73));
        float blueEdge = exp(-abs(d - spread) / (width * 0.73));
        float whiteCore = exp(-abs(d) / (0.012 + uD4 * 0.019));
        float w = 0.75 + id * 0.13;
        col += w * (warm * redEdge * 0.41 +
                    cool * blueEdge * 0.47 +
                    vec3(1.0) * whiteCore *
                    (0.27 + uD6 * 0.72 + kick * 0.30) +
                    mix(warm, cool, 0.5) * shell * 0.13);
    }

    // Dos rayos finos prolongan el nudo hacia abajo y a la derecha.
    float tailMask = smoothstep(0.10, 0.48, p.x) *
                     (1.0 - smoothstep(0.95, 1.23, p.x));
    float tailA = ribbonSegment(p, vec2(0.22, -0.08),
                                vec2(1.13, -0.71));
    float tailB = ribbonSegment(p, vec2(0.14, -0.19),
                                vec2(1.05, -0.81));
    col += tailMask * (warm * exp(-tailA / 0.023) * 0.35 +
                       cool * exp(-tailB / 0.019) * 0.43);
    col = audioLift(col, uBass * 0.37 + uHigh * 0.14);
    return vec4(col, 1.0);
}
