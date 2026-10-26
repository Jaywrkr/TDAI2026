// HALLOWEEN VJ 32 — CALABAZAS ACID
// Mosaico de caras talladas; cada celda baila sin deformar el cuadro.
// @D1: cantidad de caras
// @D2: tamano de las calabazas
// @D3: apertura de la boca
// @D4: movimiento de cada celda
// @D5: naranja a verde veneno
// @D6: trama de neon
// PIANO: luces por nota sobre las caras del mosaico.
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.28;
    vec4 climax = hkClimax(32.0, 157.0, 22.0);
    float n = floor(mix(2.0, 7.0, uD1));
    vec2 grid = p * n + vec2(t * 0.23, 0.0);
    vec2 id = floor(grid + 0.5);
    vec2 q = fract(grid + 0.5) - 0.5;
    float seed = hash21(id);
    q = rot2(sin(t + seed * TAU) * uD4 * 0.35) * q;
    q /= mix(0.65, 1.05, uD2) * (1.0 + hkHit() * 0.06 + climax.y * 0.18);
    vec3 ink = mix(vec3(1.0, 0.22, 0.015), vec3(0.25, 1.0, 0.025), uD5);
    float body = length(q / vec2(0.37, 0.34)) - 1.0;
    float eyes = min(length((q - vec2(0.14, 0.08)) / vec2(0.07, 0.09)), length((q - vec2(-0.14, 0.08)) / vec2(0.07, 0.09))) - 1.0;
    float teeth = 0.018 * step(0.5, fract((q.x + 0.5) * 15.0));
    float mouth = hkBox(q - vec2(0.0, -0.13), vec2(0.23, mix(0.025, 0.08, uD3) + teeth));
    float carving = max(1.0 - smoothstep(-0.06, 0.04, eyes), 1.0 - smoothstep(-0.008, 0.012, mouth));
    float inside = 1.0 - smoothstep(-0.02, 0.02, body);
    float ribs = 0.55 + 0.45 * pow(abs(cos(q.x * 23.0)), 4.0);
    vec3 col = ink * inside * (0.07 * ribs + carving * (0.6 + 0.35 * hkHit()));
    col += ink * exp(-abs(body) * 38.0) * (0.35 + climax.x * 0.25);
    col += ink * exp(-abs(body) * 8.0) * uD6 * 0.10;
    float wire = exp(-min(abs(q.x), abs(q.y)) * 90.0);
    col += ink.bgr * wire * uD6 * 0.12;
    col = hkKeyLit(col, p, 0.0, vec2(0.35, 0.8), vec3(1.0, 0.4, 0.02), vec3(0.2, 1.0, 0.05), 0.04, 0.7);
    return vec4(hkFinish(col, uv, ink), 1.0);
}
