// ===============================================================
// SCENE - NOISE VAPORWAVE
// Triangulos cortantes rosa y cian separados por negro.
// Referencia: https://www.youtube.com/watch?v=PIoq2BFtMAc&t=1145s
// @D1: tamano de las piezas
// @D2: rotacion de las piezas
// @D3: afilado de los vertices
// @D4: anchura del borde
// @D5: mezcla rosa/cian
// @D6: luz en las aristas
// ===============================================================

float shardCross(vec2 a, vec2 b) {
    return a.x * b.y - a.y * b.x;
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.07 + uSpeed * 0.22);
    float scale = 2.6 + uD1 * 1.8 + uDensity * 0.35;
    vec2 q = p * scale;
    vec2 warp = vec2(noise21(q * 0.34 + vec2(t * 0.10, 3.8)),
                     noise21(q * 0.34 + vec2(8.7, -t * 0.12)));
    q += (warp - 0.5) * (0.40 + uChaos * 0.56);
    vec2 cell = floor(q);
    vec2 local = fract(q) - 0.5;
    float seed = hash21(cell);
    float seed2 = hash21(cell + vec2(27.1, 8.2));
    local = rot2(seed * 6.2831853 + t * (0.08 + uD2 * 0.25)) *
            local;
    float sharp = 0.18 + uD3 * 0.34;
    vec2 a = vec2(-0.66, -0.48 + seed2 * 0.22);
    vec2 b = vec2(0.62, -0.39 + seed * 0.48);
    vec2 c = vec2(-0.33 + seed2 * 0.48, 0.54 + sharp * 0.2);
    float e1 = shardCross(b - a, local - a);
    float e2 = shardCross(c - b, local - b);
    float e3 = shardCross(a - c, local - c);
    float edge = min(e1, min(e2, e3));
    float inside = smoothstep(-0.006, 0.012, edge);
    float rim = 1.0 - smoothstep(0.0, 0.055 + uD4 * 0.072, edge);
    float diagonal = clamp((local.x - local.y + 0.7) * 0.7, 0.0, 1.0);
    float hue = audioHue(uHue, uMid * 0.012);
    vec3 pink = hsv2rgb(vec3(fract(hue + 0.91), 0.78, 1.0));
    vec3 cyan = hsv2rgb(vec3(fract(hue + 0.53), 0.87, 0.98));
    vec3 col = mix(cyan, pink,
                   smoothstep(0.20, 0.80, diagonal +
                              (seed - 0.5) * uD5 * 0.6));
    col *= inside * (0.55 + rim * (0.34 + uD6 * 0.33));
    col = audioLift(col, uBass * 0.14 + uHigh * 0.13);
    return vec4(col, 1.0);
}
