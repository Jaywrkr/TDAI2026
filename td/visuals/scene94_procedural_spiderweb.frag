// ===============================================================
// SCENE 94 - PROCEDURAL SPIDERWEB
// Referencia: https://www.youtube.com/watch?v=dPSB9sudk7Q
// Dos telaranas radiales de hilos finos sobre negro.
// Una pasada GLSL, sin feedback ni topologia SOP.
// Solo uTime deforma los hilos; en silencio quedan inmoviles.
//
// @D1: cantidad de radios
// @D2: cantidad de anillos
// @D3: grosor de los hilos
// @D4: irregularidad de la trama
// @D5: tinte violeta del blanco
// @D6: halo en los cruces
// ===============================================================

vec3 spiderwebField(vec2 p, float scale, float t, float seed, float kick) {
    vec2 q = p / scale;
    float r = length(q);
    float a = atan(q.y, q.x);
    float distortion = 0.02 + uD4 * 0.055 + uChaos * 0.018;
    float radialWarp = distortion *
        (0.62 * sin(a * 6.0 + seed + t * 0.13) +
         0.38 * sin(a * 13.0 - seed * 1.7 - t * 0.09));
    radialWarp += kick * 0.012 * sin(a * 9.0 + seed * 2.0);
    float ringsCount = 27.0 + uD2 * 22.0 + uDensity * 13.0;
    float ringsPhase = (r + radialWarp) * ringsCount +
                       sin(a * 4.0 + r * 3.0 - t * 0.14) * uD4 * 0.55;
    float rings = pow(max(0.0, 1.0 - abs(sin(ringsPhase))),
                      21.0 - uD3 * 13.0);
    float spokeCount = 16.0 + uD1 * 20.0;
    float spokePhase = a * spokeCount * 0.5 +
                       sin(r * 4.0 + a * 7.0 + t * 0.11 + seed) *
                       (0.08 + uD4 * 0.28);
    float spokes = pow(max(0.0, 1.0 - abs(sin(spokePhase))),
                       25.0 - uD3 * 15.0);
    float mask = exp(-pow(r / 1.38, 8.0)) *
                 smoothstep(0.015, 0.090, r);
    return vec3(rings, spokes, rings * spokes) * mask;
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.28;
    float kick = max(uKick, uBeat * 0.62) * uAudioamt;
    vec3 left = spiderwebField(p - vec2(-0.62, 0.06),
                               1.02, t, 1.7, kick);
    vec3 right = spiderwebField(p - vec2(1.25, -0.13),
                                0.78, t * 0.79, 8.3, kick * 0.75);
    float threads = left.x * 0.52 + left.y * 0.66 +
                    right.x * 0.36 + right.y * 0.45;
    float knots = left.z * 0.55 + right.z * 0.42;
    float halo = pow(max(threads, 0.0), 0.68) * uD6 * 0.085;
    float hue = audioHue(uHue + 0.74, uMid * 0.008);
    vec3 white = vec3(0.88, 0.91, 0.95);
    vec3 violet = hsv2rgb(vec3(hue, 0.45, 1.0));
    vec3 ink = mix(white, violet, uD5 * 0.72);
    vec3 col = ink * (threads * (1.72 + uBass * uAudioamt * 0.24) +
                      knots * (0.68 + kick * 0.54) + halo);
    float key = exp(-pow((uv.x - uKeypos) / 0.08, 2.0)) * uKeypulse;
    col += ink * (threads + knots) * key * 0.48;
    col = audioLift(col, uBass * 0.10 + uHigh * 0.14);
    return vec4(col, 1.0);
}
