// HALLOWEEN VJ 39 — CONTORNO NEON: los bordes de la imagen hechos lineas de neon (Media).
// @D1: sensibilidad (cuantos bordes se encienden)
// @D2: velocidad del trazo que dibuja en cada golpe
// @D3: doble linea desplazada
// @D4: vibracion con el bajo
// @D5: calabaza a veneno
// @D6: fantasma de la imagen detras
// PIANO: cada nota enciende su franja de lineas. Momento las enciende todas.
float cnLum(vec2 muv, float has) {
    // raiz: los bordes de lo oscuro cuentan casi tanto como los de lo claro
    return sqrt(dot(hkMediaGet(muv, 0.6, has), vec3(0.2126, 0.7152, 0.0722)));
}
float cnEdge(vec2 muv, vec2 px, float has) {
    float l = cnLum(muv - vec2(px.x, 0.0), has), r = cnLum(muv + vec2(px.x, 0.0), has);
    float d = cnLum(muv - vec2(0.0, px.y), has), u = cnLum(muv + vec2(0.0, px.y), has);
    return length(vec2(r - l, u - d));
}
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.2, hit = hkHit(), B = hkBass(), st = hkStepBeat();
    float has = hkMediaHas();
    vec4 C = hkClimax(39.0, 147.0, 22.0);
    vec3 ink = mix(vec3(1.0, 0.42, 0.04), vec3(0.42, 1.0, 0.08), uD5);
    vec3 accent = mix(vec3(0.62, 0.12, 1.0), vec3(1.0, 0.1, 0.06), uD5);
    // el bajo hace vibrar las lineas: ondas finas sobre la imagen
    vec2 wob = vec2(sin(uv.y * 40.0 + t * 9.0), cos(uv.x * 34.0 - t * 7.0)) * 0.0025 * hkDR(0.0, 0.7, 3.5, uD4) * (0.3 + 2.0 * B);
    vec2 muv = hkMediaCover(uv + wob, uAspect);
    vec2 px = 1.2 / vec2(textureSize(sTD2DInputs[1], 0));
    float e = cnEdge(muv, px, has);
    float thr = hkDR(0.17, 0.036, 0.006, uD1);
    float line = smoothstep(thr, thr * 2.2, e);
    // el trazo se dibuja desde el centro en cada tiempo (escalon del pulso)
    float prog = fract(st * mix(0.25, 1.0, uD2)) ;
    float r = length(p) / (uAspect * 1.1);
    float reveal = st > 0.0 ? smoothstep(prog + 0.05, prog - 0.05, r) + step(0.98, prog) : 1.0;
    reveal = max(reveal, 0.35 + 0.65 * C.y);
    vec3 col = hkMediaGet(muv, 2.5, has) * hkMediaGain(has) * hkDR(0.0, 0.06, 0.5, uD6);
    col += ink * line * reveal * (0.9 + 0.8 * hit + 0.5 * B);
    // segunda linea desplazada, en otro color
    float e2 = cnEdge(muv + vec2(0.006, -0.004) * (1.0 + 2.0 * hit) * hkDR(0.5, 1.0, 3.0, uD3), px, has);
    col += accent * smoothstep(thr, thr * 2.2, e2) * hkDR(0.0, 0.3, 1.3, uD3) * reveal;
    // halo fino alrededor de las lineas
    float glow = smoothstep(thr * 0.5, thr * 3.0, cnEdge(muv, px * 3.0, has));
    col += ink * glow * 0.12 * (0.5 + B);
    // piano: franjas verticales
    for (int k = 0; k < N_KEYS; k++) {
        float ek = keyEnv(k, 0.04, 0.8);
        if (ek < 0.001) continue;
        float band = exp(-pow((uv.x - keyPos(k)) * 9.0, 2.0));
        col += accent * line * band * ek * 1.2;
    }
    col = hkKeyLit(col, p, 0.0, vec2(0.36, 0.9), ink, accent, 0.04, 0.8);
    return vec4(hkFinish(col, uv, vec3(0.0)), 1.0);
}
