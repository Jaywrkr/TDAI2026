// HALLOWEEN VJ 40 — PUNTOS DE NEON: la imagen hecha de puntos o rayas de luz (Media).
// @D1: tamano de la grilla
// @D2: puntos a rayas
// @D3: giro de la grilla
// @D4: onda desde el centro en cada golpe
// @D5: calabaza/violeta a veneno/sangre
// @D6: brillo y halo de cada punto
// PIANO: cada nota hace crecer los puntos de su franja. Momento: todos al maximo.
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.15, hit = hkHit(), B = hkBass(), st = hkStepBeat();
    float has = hkMediaHas();
    vec4 C = hkClimax(40.0, 151.0, 22.0);
    vec3 cLo = mix(vec3(0.55, 0.1, 1.0), vec3(0.75, 0.02, 0.02), uD5);
    vec3 cHi = mix(vec3(1.0, 0.5, 0.05), vec3(0.45, 1.0, 0.1), uD5);
    float cells = hkDR(110.0, 48.0, 14.0, uD1);
    vec2 g = rot2(hkDR(0.0, 0.4, 1.6, uD3) + 0.06 * sin(st * PI * 0.5)) * p * cells * 0.5;
    vec2 id = floor(g), f = fract(g) - 0.5;
    // centro de la celda de vuelta a pantalla para leer la imagen ahi
    vec2 cp = rot2(-(hkDR(0.0, 0.4, 1.6, uD3) + 0.06 * sin(st * PI * 0.5))) * (id + 0.5) / (cells * 0.5);
    vec2 cuv = cp / vec2(uAspect, 1.0) * 0.5 + 0.5;
    vec3 im = hkMediaGet(hkMediaCover(cuv, uAspect), 2.0, has) * hkMediaGain(has);
    float l = dot(im, vec3(0.2126, 0.7152, 0.0722));
    l = pow(clamp(l * 1.6, 0.0, 1.0), 0.7);
    // onda que sale del centro en cada tiempo
    float d = length(cp);
    float ph = fract(st);
    float ring = st > 0.0 ? exp(-abs(d - ph * 2.6) * 6.0) * (1.0 - ph) : 0.0;
    float grow = 1.0 + 0.45 * B + ring * hkDR(0.0, 1.1, 2.8, uD4) + 0.6 * C.y;
    for (int k = 0; k < N_KEYS; k++) {
        float ek = keyEnv(k, 0.04, 0.8);
        if (ek < 0.001) continue;
        grow += ek * exp(-pow((cuv.x - keyPos(k)) * 7.0, 2.0)) * 0.8;
    }
    float rad = 0.46 * sqrt(l) * grow;
    float dotd = mix(length(f), abs(f.y) + max(abs(f.x) - 0.35, 0.0), uD2);
    float core = 1.0 - smoothstep(rad - 0.08, rad, dotd);
    float halo = exp(-max(dotd - rad, 0.0) * 9.0) * hkDR(0.0, 0.4, 1.2, uD6);
    vec3 c = mix(cLo, cHi, smoothstep(0.15, 0.8, l));
    vec3 col = c * (core * (0.8 + 0.6 * hit) + halo * l) * hkDR(0.25, 0.8, 1.5, uD6);
    col = hkKeyLit(col, p, 0.0, vec2(0.36, 0.9), cHi, cLo, 0.04, 0.8);
    return vec4(hkFinish(col, uv, vec3(0.0)), 1.0);
}
