// ===============================================================
// HALLOWEEN 01 - JACK O'LANTERN
// Calabaza tallada con volumen real: gajos redondeados con brillo
// especular, piel rugosa, luz de la vela que se filtra por la cascara
// junto a los cortes, humo que sale por los ojos, piso de madera con
// el charco de luz y brasas en el aire.
// Speed mueve la llama, el humo y las brasas. El bajo sube la luz de
// adentro; el golpe aviva la llama y suelta brasas. LOCURA (Chaos):
// la cara se deforma, salen lenguas de fuego por ojos y boca, sacudida.
// El piano enciende los ojos.
//
// @D1: tamano de la calabaza
// @D2: fuerza de la llama interior
// @D3: brasas y humo
// @D4: sonrisa (seria <-> enorme)
// @D5: relieve de los gajos
// @D6: aura y charco de luz
// ===============================================================

float hwTri(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 e0 = b - a, e1 = c - b, e2 = a - c;
    vec2 v0 = p - a, v1 = p - b, v2 = p - c;
    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                     vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                 vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
}

float hwFace(vec2 q, float smile, float rage) {
    float eh = 0.24 + rage * 0.08;
    float eyeL = hwTri(q, vec2(-0.42, 0.10), vec2(-0.10, 0.10), vec2(-0.30, 0.10 + eh));
    float eyeR = hwTri(q, vec2(0.10, 0.10), vec2(0.42, 0.10), vec2(0.30, 0.10 + eh));
    float nose = hwTri(q, vec2(-0.07, -0.03), vec2(0.07, -0.03), vec2(0.0, 0.10));
    float x = q.x;
    float curve = -0.21 + (0.20 + smile * 0.55) * x * x;
    float halfH = 0.075 + smile * 0.04 + rage * 0.05;
    float band = abs(q.y - curve) - halfH * (1.0 - smoothstep(0.30, 0.55, abs(x)));
    float u = fract(x * 5.0 + 0.25);
    float colUp = (abs(u - 0.75) - 0.25) / 5.0;
    float colDn = (abs(u - 0.25) - 0.25) / 5.0;
    float upper = max(curve + halfH - 0.060 - q.y, colUp + 0.012);
    float lower = max(q.y - (curve - halfH + 0.060), colDn + 0.012);
    float mouth = max(band, -min(upper, lower));
    mouth = max(mouth, abs(x) - 0.52);
    return min(min(eyeL, eyeR), min(nose, mouth));
}

vec4 render(vec2 uv) {
    vec2 p = hkPunch(hkShake(centered(uv)));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    float size = 0.80 + uD1 * 0.30;
    vec2 center = vec2(0.0, -0.10);
    vec2 q = (p - center) / size;
    // locura: la calabaza "respira" deformandose con el golpe
    q.x *= 1.0 - hit * loco * 0.06 * sin(q.y * 6.0 + uRTime * 20.0);

    float flick = 0.70 + 0.18 * sin(t * 7.3) + 0.12 * sin(t * 13.1 + 1.7) + 0.10 * noise21(vec2(t * 3.0, 1.0));
    float inner = flick * (0.85 + uD2 * 0.70) + bass * 0.40 + hit * 0.70;
    vec3 orange = hsv2rgb(vec3(fract(0.065 + hue), 0.95, 1.0));
    vec3 hot = vec3(1.0, 0.86, 0.50);

    // --- fondo y piso de madera ---
    float floorY = center.y - 0.47 * size;
    vec3 col = mix(vec3(0.012, 0.006, 0.020), vec3(0.05, 0.02, 0.035), smoothstep(1.2, 0.0, length(p - center)));
    if (p.y < floorY) {
        float z = 1.0 / max(floorY - p.y + 0.12, 0.05);
        float plank = fract(p.x * z * 0.9);
        float grain = fbm(vec2(p.x * z * 6.0, z * 0.6), 3);
        vec3 wood = vec3(0.10, 0.05, 0.025) * (0.5 + 0.7 * grain) * (0.75 + 0.25 * smoothstep(0.0, 0.05, plank) * smoothstep(1.0, 0.95, plank));
        float pool = exp(-length((p - vec2(center.x, floorY)) * vec2(0.9, 3.2)) * 2.2);
        col = wood * (0.25 + pool * (1.2 + uD6) * inner) + orange * pool * 0.25 * inner * (0.5 + uD6);
        // reflejo borroso de la calabaza en la madera barnizada
        col += orange * 0.10 * exp(-abs(p.x - center.x) * 3.0) * smoothstep(floorY - 0.35, floorY, p.y) * inner;
    }
    float aura = exp(-max(length(q * vec2(0.85, 1.05)) - 0.55, 0.0) * 3.0);
    col += orange * aura * (0.10 + uD6 * 0.35) * (0.6 + inner * 0.5);

    // --- cuerpo: cinco gajos con normales de esfera ---
    float body = 1e3;
    vec3 nrm = vec3(0.0, 0.0, 1.0);
    for (int i = -2; i <= 2; i++) {
        float fi = float(i);
        vec2 c = vec2(fi * 0.21, 0.0);
        vec2 r = vec2(0.36 - abs(fi) * 0.045, 0.50 - abs(fi) * 0.035);
        vec2 d = (q - c) / r;
        float e = (length(d) - 1.0) * min(r.x, r.y);
        if (e < body) {
            body = e;
            float zz = sqrt(max(1.0 - dot(d, d), 0.0));
            nrm = normalize(vec3(d * (0.6 + uD5 * 0.6), zz + 0.2));
        }
    }
    float bodyMask = 1.0 - smoothstep(-0.004, 0.004, body);
    float bump = fbm(q * 14.0, 3) - 0.5;
    nrm = normalize(nrm + vec3(bump * 0.25, bump * 0.15, 0.0));
    vec3 L = normalize(vec3(-0.5, 0.6, 0.8));
    float diff = clamp(dot(nrm, L), 0.0, 1.0);
    float spec = pow(clamp(dot(reflect(-L, nrm), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 18.0);
    vec3 skinDark = hsv2rgb(vec3(fract(0.035 + hue), 1.0, 0.10));
    vec3 skinLit = hsv2rgb(vec3(fract(0.070 + hue), 0.97, 0.55));
    vec3 skin = mix(skinDark, skinLit, diff * 0.85);
    skin *= 0.80 + 0.25 * fbm(q * vec2(3.0, 1.4) + 2.0, 3);
    skin += vec3(1.0, 0.85, 0.6) * spec * 0.25;
    // luz que se filtra por la cascara cerca de los cortes (subsurface)
    float rage = hit * loco;
    float faceD = hwFace(q, uD4, rage);
    float sss = exp(-max(faceD, 0.0) * 18.0);
    skin += orange * sss * inner * 0.35 + hot * sss * sss * inner * 0.10;
    col = mix(col, skin, bodyMask);

    // --- tallo con textura ---
    vec2 sq = rot2(0.25) * (q - vec2(0.03, 0.55));
    float stem = max(abs(sq.x) - 0.045 + sq.y * 0.06, abs(sq.y) - 0.10);
    float stemMask = 1.0 - smoothstep(-0.004, 0.004, stem);
    vec3 stemC = vec3(0.10, 0.11, 0.04) * (0.6 + 0.8 * noise21(vec2(sq.x * 80.0, sq.y * 10.0))) * (0.6 + 0.4 * smoothstep(0.05, -0.05, sq.x));
    col = mix(col, stemC, stemMask);

    // --- cortes: se ve la llama y la pared interior ---
    float hole = (1.0 - smoothstep(-0.005, 0.005, faceD)) * bodyMask;
    float flameN = fbm(vec2(q.x * 6.0, q.y * 4.0 - t * 2.2), 3);
    vec3 flame = mix(orange, hot, smoothstep(0.35, 0.80, flameN)) * inner * 1.35;
    float wall = smoothstep(-0.04, -0.004, faceD);
    flame = mix(flame, skinDark * 1.2 + orange * 0.3, wall * 0.6);
    float eyes = step(0.10, q.y) * step(q.y, 0.40);
    flame += hot * eyes * uKeypulse * (0.6 + uKeyvel);
    col = mix(col, flame, hole);

    // --- humo saliendo por los ojos ---
    for (int s = -1; s <= 1; s += 2) {
        vec2 sp = q - vec2(float(s) * 0.26, 0.30);
        float rise = clamp(sp.y / 0.9, 0.0, 1.0);
        float sm = fbm(vec2(sp.x * 5.0 + sin(sp.y * 3.0 - t), sp.y * 2.5 - t * 0.8) + float(s) * 3.0, 4, 0.55);
        float cone = smoothstep(0.10 + rise * 0.35, 0.0, abs(sp.x)) * smoothstep(0.0, 0.08, sp.y) * (1.0 - rise);
        col += vec3(0.30, 0.25, 0.22) * smoothstep(0.45, 0.85, sm) * cone * (0.25 + uD3 * 0.5);
    }
    // --- locura: lenguas de fuego que salen de ojos y boca ---
    if (rage > 0.01) {
        for (int s = -1; s <= 1; s++) {
            vec2 jp = (s == 0) ? q - vec2(0.0, -0.22) : q - vec2(float(s) * 0.27, 0.22);
            vec2 dir = (s == 0) ? vec2(0.0, -1.0) : normalize(vec2(float(s) * 0.6, 1.0));
            float along = dot(jp, dir);
            float across = abs(dot(jp, vec2(-dir.y, dir.x)));
            float n = fbm(vec2(across * 9.0, along * 5.0 - uRTime * 8.0), 3);
            float jet = smoothstep(0.08 + along * 0.25, 0.0, across) * smoothstep(0.0, 0.05, along) * smoothstep(0.6 * rage + 0.05, 0.0, along);
            col += mix(orange, hot, n) * jet * n * 2.5;
        }
    }
    // --- brasas ---
    float emb = hkParticles(p, t + hit * 0.3, 0.10 + uD3 * 0.25, vec2(0.15, 1.0), 0.05);
    col += orange * emb * (0.8 + hit * 1.2) * smoothstep(1.0, -0.4, p.y);

    return vec4(hkFinish(col, uv, vec3(0.9, 0.4, 0.1)), 1.0);
}
