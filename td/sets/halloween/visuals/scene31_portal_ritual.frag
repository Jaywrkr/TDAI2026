// HALLOWEEN VJ 31 — PORTAL RITUAL
// Anillos de pentagramas en perspectiva, negro / violeta / fuego.
// @D1: cantidad de portales
// @D2: radio del tunel
// @D3: grosor de los simbolos
// @D4: giro entre capas
// @D5: violeta a naranja
// @D6: halo de los portales
// PIANO: cada voz enciende una columna de luz propia.
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.18;
    float hit = hkHit();
    vec4 climax = hkClimax(31.0, 145.0, 22.0);
    vec3 ink = mix(vec3(0.48, 0.08, 1.0), vec3(1.0, 0.20, 0.025), uD5);
    vec3 col = vec3(0.0);
    float count = floor(mix(5.0, 12.0, uD1));
    for (int j = 0; j < 12; j++) {
        if (float(j) >= count) continue;
        float z = fract((float(j) - t) / count);
        float radius = mix(0.06, 2.7, z * z) * mix(0.65, 1.3, uD2);
        vec2 q = rot2(t * 0.22 + float(j) * uD4 * 0.32 + climax.x * 0.30) * p / radius;
        float d = 10.0;
        for (int k = 0; k < 5; k++) {
            float a = float(k) * TAU / 5.0 + PI * 0.5;
            float b = a + TAU * 2.0 / 5.0;
            d = min(d, hkSeg(q, vec2(cos(a), sin(a)), vec2(cos(b), sin(b))));
        }
        d = min(d, abs(length(q) - 1.16));
        float px = max(2.0 / uResH, mix(0.002, 0.012, uD3)) / radius;
        float line = exp(-d / px);
        float halo = exp(-d / (px * 6.0)) * uD6 * 0.22;
        float envelope = smoothstep(0.0, 0.10, z) * (1.0 - smoothstep(0.80, 1.0, z));
        vec3 layerInk = mix(ink, vec3(1.0, 0.55, 0.08), z * (0.35 + climax.y * 0.4));
        col += layerInk * (line + halo) * envelope * (0.85 + hit * 0.45 + climax.y * 0.5);
    }
    col = hkKeyLit(col, p, 0.0, vec2(0.35, 0.8), vec3(1.0, 0.3, 0.04), vec3(0.5, 0.15, 1.0), 0.04, 0.7);
    return vec4(hkFinish(col, uv, ink), 1.0);
}
