// ===============================================================
// SCENE - AUDIO PRISMS
// Prismas rojos y violetas de caras oscuras y aristas luminosas.
// Referencia: https://www.youtube.com/watch?v=tZt1SQUZl6U
// El tutorial usa instancing, varias camaras y composicion/feedback.
// Aqui se dibujan cinco prismas analiticos en una sola pasada GLSL.
// No hay geometria SOP ni textura de historial.
// El tiempo musical se congela en silencio; no hay zoom global.
//
// @D1: tamano de los prismas
// @D2: visibilidad de los prismas secundarios
// @D3: profundidad aparente de las caras
// @D4: grosor de las aristas
// @D5: mezcla de rojo y violeta
// @D6: brillo de las esquinas
// ===============================================================

float prismSegment(vec2 p, vec2 a, vec2 b) {
    vec2 v = b - a;
    return length(p - a - v * clamp(dot(p - a, v) /
                                   max(dot(v, v), 0.0001), 0.0, 1.0));
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.33;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    vec3 red = hsv2rgb(vec3(audioHue(fract(uHue + 0.005),
                                       uMid * 0.012), 0.94, 1.0));
    vec3 violet = hsv2rgb(vec3(audioHue(fract(uHue + 0.79),
                                          uMid * 0.012), 0.77, 1.0));
    vec3 col = vec3(0.0);

    for (int i = 0; i < 5; i++) {
        float id = float(i);
        vec2 center = vec2(-0.83, 0.29);
        if (i == 1) center = vec2(0.02, 0.34);
        if (i == 2) center = vec2(0.84, 0.25);
        if (i == 3) center = vec2(-0.50, -0.42);
        if (i == 4) center = vec2(0.54, -0.43);
        center += vec2(0.025 * sin(t * 0.18 + id * 2.3),
                       0.020 * sin(t * 0.14 + id * 1.8));
        float angle = 0.055 * sin(t * 0.25 + id * 1.3) +
                      (uChaos - 0.5) * 0.12 * sin(id * 2.7);
        vec2 q = rot2(angle) * (p - center);
        float size = (0.27 + uD1 * 0.17 + uDensity * 0.045) *
                     (1.0 - 0.08 * step(3.0, id));
        vec2 depth = vec2(0.07 + uD3 * 0.16,
                          0.055 + uD3 * 0.13) *
                     vec2(mix(-1.0, 1.0, step(2.0, id)), 1.0);
        if (abs(q.x) > size + abs(depth.x) + 0.28 ||
            abs(q.y) > size + abs(depth.y) + 0.28) continue;
        float df = max(abs(q.x) - size, abs(q.y) - size);
        vec2 qb = q - depth;
        float db = max(abs(qb.x) - size, abs(qb.y) - size);
        float seg = 9.0;
        seg = min(seg, prismSegment(q, vec2(-size, -size),
                                    vec2(-size, -size) + depth));
        seg = min(seg, prismSegment(q, vec2(size, -size),
                                    vec2(size, -size) + depth));
        seg = min(seg, prismSegment(q, vec2(-size, size),
                                    vec2(-size, size) + depth));
        seg = min(seg, prismSegment(q, vec2(size, size),
                                    vec2(size, size) + depth));
        float edge = min(min(abs(df), abs(db)), seg);
        float thick = 0.0035 + uD4 * 0.0065;
        float core = 1.0 - smoothstep(thick * 0.3, thick * 1.5, edge);
        float halo = exp(-edge / (thick * 5.5));
        float fill = (1.0 - smoothstep(-0.015, 0.015, df)) * 0.045;
        float flare = exp(-length(q - vec2(size, size)) * 19.0) +
                      exp(-length(q - vec2(-size, -size)) * 17.0);
        float streak = exp(-abs(q.y - size) * 90.0) *
                       exp(-abs(q.x - size) * 6.0) +
                       exp(-abs(q.y + size) * 90.0) *
                       exp(-abs(q.x + size) * 7.0);
        float secondary = mix(1.0, 0.14 + uD2 * 0.86,
                              step(3.0, id));
        float purple = mix(0.15, 0.80, step(1.0, mod(id, 2.0))) *
                       (0.42 + uD5 * 0.78);
        vec3 tint = mix(red, violet, clamp(purple, 0.0, 1.0));
        col += tint * secondary *
               (core * (0.44 + kick * 0.23) +
                halo * 0.27 + fill);
        col += mix(tint, vec3(1.0), 0.48) * secondary *
               (flare * (0.11 + uD6 * 0.83 + kick * 0.37) +
                streak * (0.045 + uD6 * 0.10));
    }
    col = audioLift(col, uBass * 0.36 + uHigh * 0.12);
    return vec4(col, 1.0);
}
