// HALLOWEEN VJ 43 — PARED DE TELEVISORES: recortes de la imagen en televisores que se prenden con el ritmo (Media).
// @D1: cantidad de televisores
// @D2: cuantos prendidos
// @D3: rayas, ruido y curvatura de tubo
// @D4: que tan seguido cambian
// @D5: fosforo verde a ambar/sangre
// @D6: a veces la imagen completa repartida en todos
// PIANO: cada nota prende su columna. Momento: todos muestran la imagen completa.
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.2, hit = hkHit(), B = hkBass(), st = hkStepBeat();
    float has = hkMediaHas();
    vec4 C = hkClimax(43.0, 155.0, 22.0);
    vec3 phos = mix(vec3(0.45, 1.0, 0.35), vec3(1.0, 0.55, 0.12), uD5);
    float cols = 3.0 + floor(uD1 * 4.0);
    float rows = max(2.0, floor(cols * 0.6 + 0.5));
    vec2 g = uv * vec2(cols, rows);
    vec2 id = floor(g), f = fract(g);
    float beat = floor(st * mix(0.25, 1.0, uD4) + 0.0001);
    float ph = fract(st * mix(0.25, 1.0, uD4));
    float h = hash21(id + beat * 7.31);
    bool on = h < mix(0.35, 0.95, uD2);
    for (int k = 0; k < N_KEYS; k++) {
        float ek = keyEnv(k, 0.04, 0.8);
        if (ek > 0.2 && abs(keyPos(k) * cols - id.x - 0.5) < 0.5) on = true;
    }
    // cada cierto tiempo (D6) todos muestran su pedazo de la imagen entera
    bool whole = hash21(vec2(beat, 3.7)) < uD6 * 0.5 || C.y > 0.5;
    // mueble y pantalla redondeada
    vec2 s = (f - 0.5) * vec2(1.0, 1.0);
    float bez = hkBox(s, vec2(0.44, 0.42)) - 0.04;
    float scr = hkBox(s * (1.0 + uD3 * 0.08 * dot(s, s)), vec2(0.36, 0.33)) - 0.05;
    vec3 col = vec3(0.025, 0.02, 0.018) * (1.0 - smoothstep(0.0, 0.01, bez));
    col += vec3(0.07, 0.05, 0.04) * smoothstep(0.02, 0.0, abs(bez)) * 0.6;
    if (scr < 0.0) {
        vec2 su = s / vec2(0.72, 0.66) + 0.5;
        vec2 muv;
        if (whole) muv = (id + su) / vec2(cols, rows);
        else {
            vec2 c0 = vec2(hash21(id + beat), hash21(id.yx + beat + 4.0)) * 0.6 + 0.2;
            muv = c0 + (su - 0.5) * (0.25 + 0.2 * hash21(id + 9.0));
        }
        vec3 im = hkMediaGet(hkMediaCover(muv, uAspect), 0.5, has) * hkMediaGain(has) * 1.3;
        float l = dot(im, vec3(0.2126, 0.7152, 0.0722));
        vec3 tv = mix(im, phos * l * 1.6, 0.55);
        float scan = 0.82 + 0.18 * sin(su.y * uResH / rows * 1.4);
        float noise = hash21(floor(su * vec2(120.0, 90.0)) + floor(uRTime * 24.0));
        tv = tv * mix(1.0, scan, uD3) + noise * 0.08 * uD3;
        // prender: una raya que se abre al empezar el tiempo
        float open = on ? smoothstep(0.0, 0.12, ph) : 0.0;
        float lineOn = 1.0 - smoothstep(0.0, 0.02 + open * 0.5, abs(su.y - 0.5));
        float vis = on ? max(open, lineOn) : 0.0;
        vec3 off = vec3(0.01) + noise * 0.025 * uD3;
        col = mix(off, tv * (0.9 + 0.6 * hit + 0.3 * B), vis);
        col *= 1.0 - smoothstep(-0.06, 0.0, scr) * 0.6;         // borde del tubo
    }
    col = hkKeyLit(col, p, 0.0, vec2(0.36, 0.9), phos, vec3(0.6, 0.2, 1.0), 0.04, 0.8);
    return vec4(hkFinish(col, uv, vec3(0.0)), 1.0);
}
