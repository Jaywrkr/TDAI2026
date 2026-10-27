// HALLOWEEN VJ 45 — CALAVERA CIBERNETICA: un busto de metal casi a oscuras que solo se ve por
// las luces de color que lo barren y saltan en cada golpe; ojos rojos y dientes que se encienden.
// @D1: cuantas luces (2 a 4) y que tan fuertes
// @D2: cada cuanto saltan las luces (4 tiempos -> cada tiempo)
// @D3: paneles, remaches y cables
// @D4: ojos y dientes encendidos
// @D5: magenta/cian a calabaza/veneno
// @D6: cielo y halo detras
// PIANO: cada nota prende una luz desde su lado. Momento: todo el cromo se enciende.

float cyE(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return length(q); }   // 1 = borde
float cyBand(float d, float w) { return smoothstep(w, 0.0, abs(d)); }

// ALTURA del busto (relieve): define la forma 3D que leen las luces
float cyH(vec2 q, out float mat) {
    mat = 0.0;                                  // 0 metal, 1 ojo, 2 diente, 3 fondo
    float h = -1.0;
    // hombros y cuello (placas inclinadas)
    for (int s = -1; s <= 1; s += 2) {
        float fs = float(s);
        vec2 sq = vec2(q.x * fs, q.y);
        vec2 pq = rot2(0.25) * (sq - vec2(0.95, -1.0));
        float plate = hkBox(pq, vec2(0.6, 0.12)) - 0.03;
        if (plate < 0.0) h = max(h, 0.14 + 0.06 * step(0.0, pq.y) + 0.03 * step(0.3, abs(pq.x)));

        float strut = hkSeg(sq, vec2(0.32, -0.62), vec2(1.15, -0.82)) - 0.035;
        if (strut < 0.0) h = max(h, 0.18 + 0.05 * sqrt(max(0.0, 1.0 - pow(abs(strut) / 0.035 - 1.0, 2.0))));
        // cables del cuello: segmentos redondos
        float cx = sq.x - 0.24;
        if (abs(cx) < 0.06 && sq.y < -0.42 && sq.y > -1.0) {
            float seg = step(0.2, fract(sq.y * 22.0));
            h = max(h, 0.12 + 0.07 * sqrt(1.0 - pow(cx / 0.06, 2.0)) * (0.7 + 0.3 * seg));
        }
    }
    // columna central del cuello
    if (abs(q.x) < 0.11 && q.y < -0.5 && q.y > -1.0) h = max(h, 0.1 + 0.06 * sqrt(1.0 - pow(q.x / 0.11, 2.0)));
    // craneo (cupula)
    float rc = cyE(q, vec2(0.0, 0.3), vec2(0.5, 0.64));
    if (rc < 1.0) {
        // placas del craneo: cada una a su altura (las luces las separan)
        float pid = floor(atan(q.y - 0.1, q.x) / 0.7) + floor((q.y + 0.1) / 0.28) * 7.0;
        h = max(h, 0.2 + 0.5 * sqrt(1.0 - rc * rc) + 0.035 * (hash21(vec2(pid, 2.0)) - 0.5) * (0.4 + 0.6 * uD3));
    }
    // cara (mas plana) y pomulos
    float rf = cyE(q, vec2(0.0, -0.12), vec2(0.44, 0.48));
    if (rf < 1.0) h = max(h, 0.25 + 0.38 * sqrt(1.0 - rf * rf));
    for (int s = -1; s <= 1; s += 2) {
        float rk = cyE(q, vec2(float(s) * 0.3, -0.12), vec2(0.13, 0.08));
        if (rk < 1.0) h = max(h, 0.55 + 0.12 * sqrt(1.0 - rk * rk));
    }
    // mandibula
    vec2 jq = vec2(q.x / (1.0 + (q.y + 0.5) * 0.9), q.y);
    float jw = hkBox(jq - vec2(0.0, -0.5), vec2(0.27, 0.13)) - 0.04;
    if (jw < 0.0) h = max(h, 0.42 + 0.08 * clamp(-jw * 6.0, 0.0, 1.0));
    if (h < -0.5) { mat = 3.0; return 0.0; }
    // costuras de paneles en el craneo y remaches
    float det = 0.4 + 0.6 * uD3;
    float seam = min(abs(q.y - 0.42 - 0.08 * q.x * q.x), abs(q.x - 0.12 - 0.15 * (q.y - 0.3)));
    if (rc < 1.0) h -= 0.035 * cyBand(seam, 0.012) * det;
    vec2 rv = q - vec2(clamp(floor(q.x / 0.12 + 0.5), -3.0, 3.0) * 0.12, 0.47);
    h += 0.03 * smoothstep(0.022, 0.0, length(rv)) * det * step(rc, 1.0);
    // ceja saliente y sienes hundidas
    for (int s = -1; s <= 1; s += 2) {
        float fs = float(s);
        float rb = cyE(rot2(fs * 0.25) * (q - vec2(fs * 0.2, 0.13)), vec2(0.0), vec2(0.2, 0.05));
        if (rb < 1.0) h += 0.07 * sqrt(1.0 - rb * rb);
        float rt = cyE(q, vec2(fs * 0.44, 0.12), vec2(0.1, 0.22));
        if (rt < 1.0) h -= 0.08 * (1.0 - rt * rt);
    }
    // cuencas de los ojos (hundidas, borde filoso) y ojos
    for (int s = -1; s <= 1; s += 2) {
        float fs = float(s);
        float re = cyE(rot2(fs * 0.15) * (q - vec2(fs * 0.19, 0.03)), vec2(0.0), vec2(0.14, 0.095));
        if (re < 1.0) {
            h -= 0.26 * smoothstep(1.0, 0.75, re);
            if (re < 0.38) mat = 1.0;
        }
    }
    // nariz (triangulo hundido)
    vec2 nq = q - vec2(0.0, -0.17);
    if (nq.y < 0.08 && nq.y > -0.08 && abs(nq.x) < 0.06 * (0.08 - nq.y) / 0.16 + 0.01) h -= 0.15;
    // boca y dientes
    if (abs(q.x) < 0.25 && abs(q.y + 0.4) < 0.08) {
        float tx = fract(q.x / 0.06 + 0.5);
        float gap = smoothstep(0.08, 0.0, abs(tx - 0.5) - 0.38) + smoothstep(0.012, 0.0, abs(q.y + 0.4));
        h += 0.04 - 0.08 * clamp(gap, 0.0, 1.0);
        if (gap < 0.5) mat = 2.0;
    }
    return h;
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float hit = hkHit(), B = hkBass(), st = hkStepBeat();
    vec4 C = hkClimax(45.0, 149.0, 22.0);
    float bt = uMbeat > 0.05 ? uMbeat : 0.5;
    float ph = uMbeat > 0.05 ? fract((uRTime - uManchor) / uMbeat) : fract(uRTime * 0.5);
    // cielo: azul/violeta abajo, negro arriba
    vec3 sky = mix(vec3(0.0), mix(vec3(0.02, 0.05, 0.3), vec3(0.18, 0.04, 0.3), step(0.5, uD5)), smoothstep(0.6, -0.9, p.y)) * (0.4 + 0.8 * uD6);
    // busto: un poco hacia el frente en el golpe
    vec2 q = p / (0.95 + 0.03 * hit);
    q.y += 0.02 * pow(1.0 - ph, 3.0) * (uMbeat > 0.05 ? 1.0 : 0.0);
    float mat;
    float h = cyH(q, mat);
    if (mat > 2.5) {
        vec3 col = sky;
        return vec4(hkFinish(col, uv, vec3(0.0)), 1.0);
    }
    float e = 0.006, m2;
    vec3 n = normalize(vec3(-(cyH(q + vec2(e, 0.0), m2) - cyH(q - vec2(e, 0.0), m2)) / (2.0 * e),
                            -(cyH(q + vec2(0.0, e), m2) - cyH(q - vec2(0.0, e), m2)) / (2.0 * e), 3.0));
    // LUCES: 2 a 4 de colores, rasantes, que saltan a otro angulo cada tanto
    float every = uD2 < 0.34 ? 4.0 : (uD2 < 0.67 ? 2.0 : 1.0);
    float k = uMbeat > 0.05 ? floor(st / every) : floor(uRTime / 2.0);
    float nl = 2.0 + floor(uD1 * 2.99);
    vec3 pA = mix(vec3(1.0, 0.08, 0.45), vec3(1.0, 0.42, 0.04), step(0.5, uD5));
    vec3 pB = mix(vec3(0.1, 0.85, 1.0), vec3(0.4, 1.0, 0.1), step(0.5, uD5));
    vec3 pC = vec3(0.55, 0.3, 1.0);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 col = vec3(0.006, 0.006, 0.012);        // metal casi negro
    float flash = exp(-ph * 5.0) * (uMbeat > 0.05 ? 1.0 : 0.0);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        if (fi >= nl) break;
        float a = hash21(vec2(k, fi * 7.1)) * TAU + 0.25 * sin(uRTime * 0.6 + fi);   // barre despacio entre saltos
        vec3 L = normalize(vec3(cos(a), sin(a), 0.12 + 0.25 * hash21(vec2(k, fi + 3.0))));
        vec3 lc = fi < 0.5 ? pA : (fi < 1.5 ? pB : (fi < 2.5 ? pC : vec3(1.0, 0.9, 0.8)));
        // brillos recortados (formas planas, como dibujados) y bordes encendidos
        float dif = max(dot(n, L), 0.0);
        float sp = max(dot(reflect(-L, n), V), 0.0);
        float spe = smoothstep(0.9, 0.93, sp) + 0.25 * smoothstep(0.8, 0.83, sp);
        float rimt = (1.0 - max(n.z, 0.0)) * max(dot(normalize(n.xy + 1e-4), L.xy), 0.0);
        float rim = smoothstep(0.32, 0.38, rimt);
        float gain = (0.55 + 0.6 * uD1) * (0.8 + 0.6 * flash + 0.3 * B);
        col += lc * (dif * 0.03 + spe * 1.1 + rim * 0.8) * gain;
    }
    // piano: cada nota prende una luz desde su lado
    for (int kk = 0; kk < N_KEYS; kk++) {
        float ek = keyEnv(kk, 0.04, 0.8);
        if (ek < 0.001) continue;
        vec3 L = normalize(vec3(keyPos(kk) * 2.0 - 1.0, 0.2, 0.35));
        col += mix(pB, pA, keyPos(kk)) * pow(max(dot(reflect(-L, n), V), 0.0), 30.0) * ek * 1.4;
    }
    col *= 1.0 + 1.5 * C.y;
    // ojos rojos y dientes que se encienden (cada tanto y con el golpe)
    float glowOn = (0.25 + 0.75 * uD4) * max(step(0.5, hash21(vec2(floor(st / 2.0), 9.0))), hit) + C.y;
    if (mat > 0.5 && mat < 1.5) {
        float r = length(fract(q * vec2(1.0, 1.0)) * 0.0 + (abs(q) - vec2(0.19, 0.03)) * vec2(1.0, 1.4));
        col += vec3(1.0, 0.08, 0.04) * (0.5 + 1.8 * glowOn) * smoothstep(0.06, 0.0, r) + vec3(1.0, 0.3, 0.1) * smoothstep(0.015, 0.0, r) * glowOn;
    }
    if (mat > 1.5) col += vec3(1.0, 0.92, 0.7) * (0.8 * step(0.55, hash21(vec2(floor(st), 4.0))) * (0.3 + uD4) + 0.12 * glowOn);
    // halo de los ojos sobre la cara
    vec2 eq = abs(q) - vec2(0.19, 0.03);
    col += vec3(1.0, 0.05, 0.03) * exp(-length(eq) * 14.0) * 0.25 * glowOn;
    // luces chicas de la pechera (LEDs)
    vec2 lq = q - vec2(0.0, -0.78);
    float led = step(abs(lq.y), 0.015) * step(abs(lq.x), 0.32) * step(0.5, fract(lq.x * 12.0));
    col += mix(pA, pB, fract(q.x * 3.0 + st * 0.25)) * led * 0.6 * (0.4 + B);
    col += (hash21(uv * 1000.0 + floor(uRTime * 24.0)) - 0.5) * 0.015;
    return vec4(hkFinish(max(col, 0.0), uv, vec3(0.0)), 1.0);
}
