// HALLOWEEN VJ 33 — ESPECTROS NEON
// Ondas espectrales simetricas con ojos y colas de fantasma.
// @D1: cantidad de espectros
// @D2: longitud de las colas
// @D3: grosor de las ondas
// @D4: amplitud del baile
// @D5: cian a ultravioleta
// @D6: ojos y halo
// PIANO: cada nota ilumina su propia franja del espectro.
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.3;
    vec4 climax = hkClimax(33.0, 151.0, 22.0);
    vec3 ink = mix(vec3(0.03, 0.9, 0.7), vec3(0.65, 0.08, 1.0), uD5);
    vec3 col = vec3(0.0);
    float count = floor(mix(3.0, 9.0, uD1));
    for (int k = 0; k < 9; k++) {
        if (float(k) >= count) continue;
        float fk = float(k);
        float x = (fk - (count - 1.0) * 0.5) * uAspect * 1.65 / count;
        vec2 q = p - vec2(x, 0.18 * sin(t + fk * 1.7));
        float width = uAspect * 0.53 / count;
        float bottom = -mix(0.2, 0.85, uD2);
        float sway = sin(q.y * 9.0 + t + fk) * mix(0.005, 0.055, uD4) * (1.0 + hkHit() * 0.4);
        q.x += sway * (1.0 - smoothstep(-0.5, 0.15, q.y));
        float shape = max(abs(q.x) - width, max(q.y - 0.30 + pow(q.x / width, 2.0) * 0.10, bottom - q.y));
        float edge = exp(-abs(shape) / mix(0.003, 0.015, uD3));
        float waves = exp(-abs(sin(q.y * 32.0 - t * 2.0 + fk)) * 12.0);
        float inside = 1.0 - smoothstep(-0.008, 0.008, shape);
        float halo = exp(-abs(shape) * 18.0) * uD6 * 0.15;
        col += ink * (edge * 0.9 + waves * inside * 0.22 + halo) * (0.85 + hkHit() * 0.25 + climax.y * 0.55);
        vec2 e = vec2(abs(q.x) - width * 0.40, q.y - 0.12);
        float eyes = exp(-dot(e / vec2(width * 0.16, 0.035), e / vec2(width * 0.16, 0.035)));
        col += vec3(0.8, 1.0, 0.85) * eyes * uD6 * inside;
    }
    col = hkKeyLit(col, p, 0.0, vec2(0.35, 0.8), vec3(0.1, 1.0, 0.8), vec3(0.7, 0.2, 1.0), 0.04, 0.7);
    return vec4(hkFinish(col, uv, ink), 1.0);
}
