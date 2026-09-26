// ===============================================================
// SCENE - NOISE CELLULAR
// Celulas rosas de borde azul y hendiduras oscuras.
// Referencia: https://www.youtube.com/watch?v=PIoq2BFtMAc&t=754s
// @D1: cantidad de celulas
// @D2: movimiento interno
// @D3: anchura de los bordes
// @D4: brillo de los centros
// @D5: contraste rosa/azul
// @D6: profundidad de las hendiduras
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.07 + uSpeed * 0.22);
    float scale = 3.0 + uD1 * 2.3 + uDensity * 0.5;
    vec2 q = p * scale;
    vec2 warp = vec2(noise21(q * 0.46 + vec2(t * 0.16, 4.7)),
                     noise21(q * 0.46 + vec2(6.2, -t * 0.13)));
    q += (warp - 0.5) * (0.34 + uChaos * 0.50);
    vec2 cell = floor(q);
    float nearest = 9.0;
    float second = 9.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 id = cell + vec2(float(x), float(y));
            float seed = hash21(id);
            vec2 point = id + 0.5 +
                         vec2(sin(t * 0.32 + seed * 6.283),
                              cos(t * 0.28 + seed * 9.41)) *
                         (0.09 + uD2 * 0.22 + uChaos * 0.06);
            float d = length(q - point);
            if (d < nearest) {
                second = nearest;
                nearest = d;
            } else if (d < second) {
                second = d;
            }
        }
    }
    float borderDist = second - nearest;
    float border = 1.0 - smoothstep(0.10,
                                    0.33 + uD3 * 0.32, borderDist);
    float seam = 1.0 - smoothstep(0.018, 0.12, borderDist);
    float center = 1.0 - smoothstep(0.10, 0.67, nearest);
    float hue = audioHue(fract(uHue + 0.91), uMid * 0.011);
    vec3 pink = hsv2rgb(vec3(hue, 0.75, 1.0));
    vec3 blue = hsv2rgb(vec3(fract(hue + 0.59), 0.93, 0.92));
    vec3 col = pink * (0.69 + uD4 * center * 0.27);
    col = mix(col, blue, border * (0.72 + uD5 * 0.25));
    col *= 1.0 - seam * (0.72 + uD6 * 0.21);
    col = audioLift(col, uBass * 0.16 + uHigh * 0.10);
    return vec4(col, 1.0);
}
