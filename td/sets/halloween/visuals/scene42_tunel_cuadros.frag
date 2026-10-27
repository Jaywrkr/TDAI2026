// HALLOWEEN VJ 42 — TUNEL DE CUADROS: marcos de galeria con la imagen que vuelan hacia la camara (Media).
// @D1: cantidad de cuadros
// @D2: velocidad del vuelo
// @D3: marco dorado tallado
// @D4: giro de los cuadros
// @D5: oro a hueso/sangre
// @D6: velas y niebla del pasillo
// PIANO: cada nota ilumina un cuadro. Momento: los marcos se encienden.
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.1, hit = hkHit(), B = hkBass(), st = hkStepBeat();
    float has = hkMediaHas();
    vec4 C = hkClimax(42.0, 153.0, 22.0);
    vec3 gold = mix(vec3(0.95, 0.62, 0.18), vec3(0.85, 0.12, 0.06), uD5);
    // pasillo oscuro con niebla y lineas de fuga
    vec3 col = vec3(0.012, 0.008, 0.018) + vec3(0.05, 0.03, 0.06) * fbm(p * 2.0 + vec2(t * 0.3, 0.0), 3, 0.5) * hkDR(0.0, 0.5, 2.0, uD6);
    float count = 2.0 + floor(uD1 * 6.99);
    float best = -1.0;
    vec3 front = vec3(0.0);
    for (int j = 0; j < 8; j++) {
        float fj = float(j);
        if (fj >= count) break;
        // (no multiplicar el tiempo por algo que cambia: los cuadros saltarian)
        float z = fract(fj / count - t * mix(0.4, 1.5, uD2) - 0.04 * st);
        float s = 0.08 + z * z * 1.9;
        vec2 off = vec2(sin(fj * 2.3 + t * 0.6), cos(fj * 1.7 + t * 0.5)) * 0.4 * (1.0 - z);
        vec2 q = rot2((fj - count * 0.5) * 0.08 * hkDR(0.0, 0.5, 2.6, uD4) + 0.03 * sin(st * 1.3 + fj) * hkDR(0.0, 0.5, 2.6, uD4)) * (p - off) / s;
        vec2 half_ = vec2(0.62, 0.46);
        float inner = max(abs(q.x) - half_.x, abs(q.y) - half_.y);
        float outer = max(abs(q.x) - half_.x - 0.11, abs(q.y) - half_.y - 0.11);
        if (outer > 0.0 || z <= best || z > 0.8) continue;
        // se desvanecen ANTES de llegar a la camara: cerca crecen muy rapido y el
        // marco barreria la pantalla (destellos)
        float fade = smoothstep(0.0, 0.12, z) * (1.0 - smoothstep(0.6, 0.8, z));
        vec3 c;
        if (inner < 0.0) {
            vec2 fuv = q / (half_ * 2.0) + 0.5;
            c = hkMediaGet(hkMediaCover(fuv, half_.x / half_.y), 0.4, has) * hkMediaGain(has) * (1.0 + 0.5 * hit);
            c *= 1.0 - 0.5 * smoothstep(-0.12, 0.0, inner);           // sombra del marco
        } else {
            float carve = hkDR(1.0, 0.85, 0.55, uD3) + hkDR(0.0, 0.25, 0.45, uD3) * sin((q.x + q.y) * 60.0) * sin((q.x - q.y) * 60.0);
            c = gold * carve * (0.35 + 0.65 * smoothstep(0.11, 0.0, abs(outer + 0.055) * 2.0)) * (1.0 + 0.8 * C.y);
        }
        for (int k = 0; k < N_KEYS; k++) {
            float ek = keyEnv(k, 0.04, 0.8);
            if (ek < 0.001) continue;
            c *= 1.0 + ek * step(abs(keyPos(k) * count - fj - 0.5), 0.5) * 1.2;
        }
        best = z;
        front = c * fade + col * (1.0 - fade);
    }
    if (best >= 0.0) col = front;
    // velas al costado: puntos calidos que tiemblan con el bajo
    for (int k = 0; k < 6; k++) {
        float fk = float(k);
        vec2 cpos = vec2((mod(fk, 2.0) * 2.0 - 1.0) * (uAspect * 0.85), -0.55 + floor(fk / 2.0) * 0.45);
        float fl = 0.02 + 0.01 * sin(uRTime * 12.0 + fk) + 0.01 * B;
        col += vec3(1.0, 0.55, 0.15) * exp(-length((p - cpos) * vec2(1.0, 0.6)) / fl) * 0.5 * hkDR(0.0, 0.5, 1.8, uD6);
    }
    col = hkKeyLit(col, p, 0.0, vec2(0.36, 0.9), gold, vec3(0.6, 0.2, 1.0), 0.04, 0.8);
    return vec4(hkFinish(col, uv, vec3(0.0)), 1.0);
}
