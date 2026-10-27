// HALLOWEEN VJ 41 — CALEIDOSCOPIO RITUAL: la imagen en un mandala de espejos (Media).
// @D1: cantidad de espejos (6 a 12)
// @D2: zoom hacia adentro
// @D3: sello de neon en el centro
// @D4: giro a saltos en cada tiempo
// @D5: violeta/calabaza a verde/sangre
// @D6: cuanto color de Halloween toma la imagen
// PIANO: cada nota abre un anillo del mandala. Momento: el mandala se abre.
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.12, hit = hkHit(), B = hkBass(), st = hkStepBeat();
    float has = hkMediaHas();
    vec4 C = hkClimax(41.0, 149.0, 22.0);
    vec3 cA = mix(vec3(0.6, 0.12, 1.0), vec3(0.4, 1.0, 0.1), uD5);
    vec3 cB = mix(vec3(1.0, 0.45, 0.05), vec3(0.85, 0.03, 0.02), uD5);
    float N = 6.0 + 2.0 * floor(uD1 * 3.0);
    float seg = TAU / N;
    float rot = t * 0.15 + st * seg * 0.5 * (0.3 + uD4);
    float r = length(p) * (1.0 - 0.12 * B - 0.08 * hit) / (1.0 + C.y * 0.3);
    float a = atan(p.y, p.x) + rot;
    a = mod(a, seg);
    a = abs(a - seg * 0.5);                      // espejo
    vec2 q = vec2(cos(a), sin(a)) * r;
    q = q * hkDR(0.9, 0.4, 0.15, uD2) + vec2(0.18 + 0.05 * sin(t * 0.7), 0.0);
    vec2 muv = hkMediaCover(q / vec2(uAspect, 1.0) + 0.5, uAspect);
    vec3 im = hkMediaGet(muv, 0.8, has) * hkMediaGain(has) * 1.3;
    float l = dot(im, vec3(0.2126, 0.7152, 0.0722));
    vec3 tint = mix(cA, cB, smoothstep(0.1, 0.7, l)) * (0.3 + l * 1.6);
    vec3 col = mix(im, tint, uD6) * (0.85 + 0.4 * B);
    // anillos de neon y sello central
    float ringN = r * 6.0;
    float rings = exp(-abs(fract(ringN - st * 0.25) - 0.5) * 60.0) * (0.06 + 0.3 * hit);
    col += cB * rings * smoothstep(0.2, 0.5, r);
    float seal = exp(-abs(r - 0.18 - 0.03 * hit) * 120.0) + exp(-abs(r - 0.24) * 160.0) * 0.6;
    float spokes = exp(-abs(sin((atan(p.y, p.x) + rot) * N * 0.5)) * 40.0) * step(r, 0.24) * step(0.06, r);
    col += cA * (seal + spokes * 0.5) * hkDR(0.0, 0.6, 1.8, uD3);
    col *= smoothstep(1.9, 0.9, length(p) / uAspect * 1.6) * 0.7 + 0.3;
    for (int k = 0; k < N_KEYS; k++) {
        float ek = keyEnv(k, 0.04, 0.8);
        if (ek < 0.001) continue;
        col += cB * exp(-abs(r - 0.3 - keyPos(k) * 1.4) * 40.0) * ek * 0.8;
    }
    col = hkKeyLit(col, p, 0.0, vec2(0.36, 0.9), cB, cA, 0.04, 0.8);
    return vec4(hkFinish(col, uv, vec3(0.0)), 1.0);
}
