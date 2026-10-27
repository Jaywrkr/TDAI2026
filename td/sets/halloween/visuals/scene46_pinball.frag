// HALLOWEEN VJ 46 — VITRAL DE PINBALL: una ilustracion densa de Halloween como el vidrio de una
// maquina de pinball (rey calabaza, murcielago y luna, fantasmas, calaveras, velas, caldero,
// flippers, bumpers y focos). Siempre se ve, tenue; con el ritmo se prenden ZONAS del arte:
// en cadena, de lado a lado, con el golpe o de a una en la oscuridad; algunas se ponen blancas
// como focos y la paleta cambia cada 8 tiempos.
// @D1: cuanto se prenden las zonas
// @D2: que tan seguido cambia la secuencia de luces
// @D3: tramas, rayas y grabados
// @D4: focos blancos (zonas que queman)
// @D5: paleta calabaza/violeta a veneno/sangre
// @D6: bombillas del borde y halo
// PIANO: cada nota prende la zona de su lado. Momento: el tablero entero en blanco.

#define PB_OUT vec3(0.03, 0.012, 0.05)
float pbE(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return (length(q) - 1.0) * min(r.x, r.y); }
float pbB(vec2 p, vec2 c, vec2 b, float r) { return hkBox(p - c, b - r) - r; }
float pbT(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 e0 = b - a, e1 = c - b, e2 = a - c, v0 = p - a, v1 = p - b, v2 = p - c;
    vec2 q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(vec2(dot(q0, q0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(q1, q1), s * (v1.x * e1.y - v1.y * e1.x))),
                 vec2(dot(q2, q2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
}
float pbStar(vec2 p, float r) {
    float a = atan(p.x, p.y);
    float sec = mod(a + PI / 5.0, TAU / 5.0) - PI / 5.0;
    return length(p) - mix(r, r * 0.45, abs(sec) / (PI / 5.0));
}
// capa con contorno (el plomo del vitral) que ademas marca su ZONA
void pbLay(inout vec3 col, inout float zone, float d, vec3 c, float z, float aa) {
    float o = smoothstep(aa, -aa, d - 0.022);
    col = mix(col, PB_OUT, o);
    if (o > 0.5) zone = 0.0;
    float f = smoothstep(aa, -aa, d);
    col = mix(col, c, f);
    if (f > 0.5) zone = z;
}
void pbFlat(inout vec3 col, float d, vec3 c, float aa) { col = mix(col, c, smoothstep(aa, -aa, d)); }

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float hit = hkHit(), B = hkBass(), st = hkStepBeat();
    vec4 C = hkClimax(46.0, 147.0, 22.0);
    float beat = uMbeat > 0.05 ? 1.0 : 0.0;
    float ph = beat > 0.5 ? fract((uRTime - uManchor) / uMbeat) : fract(uRTime * 0.5);
    float aa = 2.0 / max(uResH, 1.0) * 2.0;
    float sd = sign(p.x + 1e-5);
    vec2 m = vec2(abs(p.x), p.y);              // composicion en espejo
    float det = 0.35 + 0.65 * uD3;
    // paletas: cambian cada 8 tiempos
    float pal = mod(floor(st / 8.0) + floor(uD5 * 2.0) * 2.0, 4.0);
    vec3 cO = pal < 1.0 ? vec3(1.0, 0.45, 0.04) : pal < 2.0 ? vec3(0.85, 0.08, 0.06) : pal < 3.0 ? vec3(0.45, 1.0, 0.12) : vec3(1.0, 0.6, 0.1);
    vec3 cV = pal < 1.0 ? vec3(0.45, 0.12, 0.8) : pal < 2.0 ? vec3(0.25, 0.05, 0.4) : pal < 3.0 ? vec3(0.08, 0.45, 0.35) : vec3(0.6, 0.1, 0.55);
    vec3 cG = pal < 1.0 ? vec3(0.2, 0.75, 0.25) : pal < 2.0 ? vec3(1.0, 0.55, 0.1) : pal < 3.0 ? vec3(0.6, 0.15, 0.9) : vec3(0.15, 0.6, 0.9);
    vec3 cB = vec3(0.95, 0.9, 0.78);           // hueso
    vec3 cK = vec3(0.12, 0.08, 0.16);          // sombra
    vec3 cY = vec3(1.0, 0.85, 0.2);            // fuego

    // ---- fondo: paneles del vitral con tramas ----
    vec3 col = cK;
    float zone = 1.0;
    float colx = floor((m.x + 0.0) / 0.42);
    float rowy = floor((p.y + 1.2) / 0.36 + mod(colx, 2.0) * 0.5);
    float h = hash21(vec2(colx, rowy) + 4.0);
    vec3 panel = h < 0.33 ? cV * 0.8 : (h < 0.66 ? cO * 0.55 : cG * 0.5);
    float tex = h < 0.5 ? step(0.5, fract(p.y * 18.0)) : smoothstep(0.32, 0.2, length(fract(p * 14.0) - 0.5));
    col = mix(panel, panel * 0.6, tex * det);
    zone = m.x > 1.6 ? 1.0 : 2.0;
    // plomos del fondo
    vec2 cell = vec2(fract(m.x / 0.42), fract((p.y + 1.2) / 0.36 + mod(colx, 2.0) * 0.5));
    float lead = min(min(cell.x, 1.0 - cell.x) * 0.42, min(cell.y, 1.0 - cell.y) * 0.36);
    if (lead < 0.012) { col = PB_OUT; zone = 0.0; }
    // telaranas en las esquinas de arriba
    vec2 wq = vec2(m.x - uAspect, p.y - 1.0);
    float wr = length(wq), wa = atan(wq.y, wq.x);
    float web = min(abs(sin(wa * 6.0)) * wr, abs(fract(wr * 6.0 + 0.0) - 0.5) / 6.0 + max(0.0, -0.0));
    if (wr < 0.75 && web < 0.006) { col = cB * 0.8; zone = 2.0; }
    // ojos que miran desde algunos paneles (parpadean)
    if (hash21(vec2(colx, rowy) + 9.0) > 0.78 && m.x < 2.3) {
        vec2 ec = vec2((colx + 0.5) * 0.42, (rowy + 0.5 - mod(colx, 2.0) * 0.5) * 0.36 - 1.2);
        float blink = step(0.08, fract(uRTime * 0.31 + h * 7.0));
        for (int s = -1; s <= 1; s += 2) {
            float de = pbE(m, ec + vec2(float(s) * 0.05, 0.0), vec2(0.035, 0.03 * blink + 0.002));
            if (de < 0.0) { col = cY; zone = 12.0; }
            if (pbE(m, ec + vec2(float(s) * 0.05 + 0.01, 0.0), vec2(0.012, 0.02 * blink + 0.001)) < 0.0) col = PB_OUT;
        }
    }
    // murcielagos chicos
    for (int i = 0; i < 3; i++) {
        vec2 bq = m - vec2(0.45 + float(i) * 0.55, 0.88 - 0.05 * float(i) + 0.03 * sin(uRTime * 2.0 + float(i)));
        vec2 ba = vec2(abs(bq.x), bq.y);
        float bw = max(pbT(ba, vec2(0.0, 0.0), vec2(0.11, 0.03 + 0.02 * sin(uRTime * 14.0 + float(i))), vec2(0.08, -0.03)), -pbE(ba, vec2(0.06, -0.04), vec2(0.025, 0.02)));
        bw = min(bw, pbE(ba, vec2(0.0), vec2(0.018, 0.025)));
        if (bw < 0.0) { col = PB_OUT; zone = 7.0; }
    }

    // ---- columnas de afuera: calaveras arriba, velas abajo ----
    vec2 sk = m - vec2(2.0, 0.42);
    pbLay(col, zone, min(pbE(sk, vec2(0.0, 0.02), vec2(0.22, 0.2)), pbB(sk, vec2(0.0, -0.17), vec2(0.13, 0.08), 0.03)), cB, 6.0, aa);
    for (int s = -1; s <= 1; s += 2) pbFlat(col, pbE(sk, vec2(float(s) * 0.08, 0.0), vec2(0.06, 0.07)), PB_OUT, aa);
    pbFlat(col, pbT(sk, vec2(-0.025, -0.07), vec2(0.025, -0.07), vec2(0.0, -0.02)), PB_OUT, aa);
    pbFlat(col, abs(fract((sk.x + 0.5) * 22.0) - 0.5) * 0.045 - 0.006 + max(abs(sk.y + 0.17) - 0.05, 0.0) * 10.0 + max(abs(sk.x) - 0.1, 0.0) * 10.0, PB_OUT, aa);
    for (int s = -1; s <= 1; s += 2) {
        vec2 a = vec2(float(s) * 0.17, -0.12), b = vec2(-float(s) * 0.17, -0.3);
        float bone = hkSeg(sk, a, b) - 0.022;
        bone = min(bone, min(min(length(sk - a - vec2(0.0, 0.025)), length(sk - a + vec2(0.0, 0.025))), min(length(sk - b - vec2(0.0, 0.025)), length(sk - b + vec2(0.0, 0.025)))) - 0.03);
        pbLay(col, zone, bone, cB * 0.92, 6.0, aa);
    }
    // aranas colgando de su hilo
    vec2 aq = m - vec2(1.58, 0.62 + 0.06 * sin(uRTime * 1.1));
    if (abs(m.x - 1.58) < 0.004 && m.y > aq.y + 0.62 + 0.06 * sin(uRTime * 1.1) - 0.62) { col = cB * 0.6; zone = 2.0; }
    pbLay(col, zone, min(pbE(aq, vec2(0.0), vec2(0.05, 0.06)), pbE(aq, vec2(0.0, 0.065), vec2(0.035, 0.03))), cK * 1.5, 12.0, aa);
    for (int s = -1; s <= 1; s += 2) for (int l = 0; l < 3; l++) {
        float fl = float(l);
        pbFlat(col, hkSeg(aq, vec2(float(s) * 0.03, 0.01 - fl * 0.02), vec2(float(s) * 0.1, 0.05 - fl * 0.06)) - 0.006, PB_OUT, aa);
    }
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 cq = m - vec2(1.78 + fi * 0.22, -0.55 + 0.05 * mod(fi, 2.0));
        float hgt = 0.22 + 0.06 * fi;
        pbLay(col, zone, pbB(cq, vec2(0.0, -0.1), vec2(0.06, hgt), 0.02), cB * 0.9, 11.0, aa);
        float fl = 0.03 * sin(uRTime * 9.0 + fi * 2.0);
        pbLay(col, zone, pbE(cq, vec2(fl * 0.3, hgt - 0.02), vec2(0.04, 0.09)), cY, 11.0, aa);
        pbFlat(col, pbE(cq, vec2(fl * 0.3, hgt - 0.03), vec2(0.018, 0.045)), vec3(1.0), aa);
    }
    // ---- fantasmas ----
    vec2 gq = m - vec2(1.12, 0.12 + 0.03 * sin(uRTime * 1.3));
    float gb = pbE(gq, vec2(0.0, 0.08), vec2(0.28, 0.3));
    gb = min(gb, max(pbB(gq, vec2(0.0, -0.15), vec2(0.28, 0.25), 0.0), -(gq.y + 0.38 + 0.05 * sin(gq.x * 30.0 + uRTime * 4.0))));
    pbLay(col, zone, gb, cB, 5.0, aa);
    for (int s = -1; s <= 1; s += 2) pbFlat(col, pbE(gq, vec2(float(s) * 0.1, 0.12), vec2(0.05, 0.08)), PB_OUT, aa);
    pbFlat(col, pbE(gq, vec2(0.0, -0.04), vec2(0.05, 0.07)), PB_OUT, aa);
    // ---- bumpers (circulos con estrella) ----
    for (int j = -1; j <= 1; j += 2) {
        vec2 bq = m - vec2(0.72, float(j) * 0.58);
        pbLay(col, zone, length(bq) - 0.17, cG, 9.0, aa);
        pbFlat(col, abs(length(bq) - 0.12) - 0.012, cB, aa);
        pbFlat(col, pbStar(bq, 0.08), cY, aa);
    }
    // ---- arriba: luna y murcielago ----
    vec2 tq = p - vec2(0.0, 0.73);
    pbLay(col, zone, length(tq - vec2(0.0, 0.05)) - 0.24, cB * 0.95, 7.0, aa);
    pbFlat(col, length(tq - vec2(0.06, 0.1)) - 0.05, cB * 0.8, aa);
    vec2 bt = vec2(abs(tq.x), tq.y);
    float wing = max(pbT(bt, vec2(0.0, 0.0), vec2(0.62, 0.12), vec2(0.5, -0.16)), -pbE(bt, vec2(0.38, -0.2), vec2(0.12, 0.1)));
    wing = min(wing, pbE(bt, vec2(0.0, -0.02), vec2(0.08, 0.1)));
    wing = min(wing, pbT(bt, vec2(0.02, 0.06), vec2(0.07, 0.06), vec2(0.06, 0.16)));
    pbLay(col, zone, wing, cV * 1.2, 7.0, aa);
    for (int s = -1; s <= 1; s += 2) pbFlat(col, pbE(tq, vec2(float(s) * 0.03, -0.01), vec2(0.015, 0.012)), cY, aa);
    // ---- centro: rey calabaza ----
    vec2 pq = p - vec2(0.0, -0.06);
    float pk = min(min(pbE(pq, vec2(0.0), vec2(0.36, 0.42)), pbE(pq, vec2(-0.24, -0.02), vec2(0.28, 0.38))), pbE(pq, vec2(0.24, -0.02), vec2(0.28, 0.38)));
    pbLay(col, zone, pk, cO, 3.0, aa);
    for (int s = -1; s <= 1; s += 2) pbFlat(col, abs(pbE(pq, vec2(float(s) * 0.15, 0.0), vec2(0.15, 0.4))) - 0.008, cO * 0.6, aa);
    pbFlat(col, mix(1.0, pk + 0.02, 1.0) * 0.0 + max(pk, -(pq.y - 0.1)) + 0.0, mix(cO, cO * 0.75, step(0.5, fract(pq.y * 30.0)) * det), aa);
    // corona
    float cr = pbB(pq, vec2(0.0, 0.42), vec2(0.26, 0.05), 0.0);
    for (int i = 0; i < 4; i++) {
        float x = -0.2 + float(i) * 0.133;
        cr = min(cr, pbT(pq, vec2(x - 0.06, 0.45), vec2(x + 0.06, 0.45), vec2(x, 0.62)));
    }
    pbLay(col, zone, cr, cY, 7.0, aa);
    // ojos, nariz y boca con fuego
    for (int s = -1; s <= 1; s += 2) {
        float fs = float(s);
        pbLay(col, zone, pbT(pq, vec2(fs * 0.06, 0.06), vec2(fs * 0.25, 0.06), vec2(fs * 0.16, 0.22)), cY, 4.0, aa);
    }
    pbLay(col, zone, pbT(pq, vec2(-0.045, -0.06), vec2(0.045, -0.06), vec2(0.0, 0.02)), cY, 4.0, aa);
    float mouth = max(pbE(pq, vec2(0.0, -0.2), vec2(0.24, 0.09 + 0.05 * hit)), pq.y + 0.2 - 0.045 * abs(fract(pq.x * 7.0) - 0.5) * 2.0 - 0.02);
    pbLay(col, zone, mouth, cY, 4.0, aa);
    // ---- abajo: caldero y flippers ----
    vec2 cq = p - vec2(0.0, -0.78);
    pbLay(col, zone, min(pbE(cq, vec2(0.0, -0.04), vec2(0.2, 0.14)), pbB(cq, vec2(0.0, 0.09), vec2(0.24, 0.035), 0.02)), cK * 1.6, 8.0, aa);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float yb = fract(uRTime * 0.6 + fi * 0.27);
        pbLay(col, zone, length(cq - vec2((fi - 1.5) * 0.09, 0.13 + yb * 0.18)) - 0.03 * (1.0 - yb), cG * 1.2, 8.0, aa);
    }
    vec2 fq = m - vec2(0.48, -0.8);
    float flip = min(hkSeg(fq, vec2(-0.1, 0.12), vec2(0.06, 0.0)), hkSeg(fq, vec2(0.06, 0.0), vec2(-0.1, -0.12))) - 0.035;
    pbLay(col, zone, flip, cB, 8.0, aa);
    // ---- marco y bombillas ----
    float frame = hkBox(p, vec2(uAspect - 0.04, 0.96));
    if (frame > 0.0) { col = PB_OUT; zone = 0.0; }
    if (abs(frame + 0.03) < 0.012) { col = cO * 0.8; zone = 0.0; }
    // bombillas en el borde (persiguen)
    vec2 bp = p;
    float per = 2.0 * (uAspect * 2.0 + 1.9);
    float sx = clamp(bp.x, -uAspect + 0.08, uAspect - 0.08), sy = clamp(bp.y, -0.9, 0.9);
    float isTop = step(abs(bp.y), 0.9) * 0.0;
    float bulb = 1.0;
    float bidx = 0.0;
    if (abs(abs(p.y) - 0.92) < 0.05) { float g = fract(p.x * 4.0) - 0.5; bulb = length(vec2(g / 4.0, abs(p.y) - 0.92)); bidx = floor(p.x * 4.0) + (p.y > 0.0 ? 0.0 : 50.0); }
    if (abs(abs(p.x) - (uAspect - 0.03)) < 0.05) { float g = fract(p.y * 4.0) - 0.5; float bb = length(vec2(abs(p.x) - (uAspect - 0.03), g / 4.0)); if (bb < bulb) { bulb = bb; bidx = floor(p.y * 4.0) + (p.x > 0.0 ? 100.0 : 150.0); } }

    // ---- LUCES POR ZONA: la secuencia cambia cada 8 tiempos (D2) ----
    float span = uD2 < 0.5 ? 8.0 : 4.0;
    float seq = mod(floor(st / span), 4.0);
    float k = floor(st);
    float zl = 0.0, hot = 0.0;
    if (zone > 0.5) {
        if (seq < 1.0) {                 // en cadena: cada tiempo otra zona (y su espejo)
            float target = mod(k, 11.0) + 2.0;
            zl = step(abs(zone - target), 0.5);
            hot = zl;
        } else if (seq < 2.0) {          // lado a lado
            zl = step(0.5, mod(k + (sd > 0.0 ? 0.0 : 1.0), 2.0));
            hot = zl * step(3.0, zone) * step(zone, 6.0);
        } else if (seq < 3.0) {          // con el golpe: el centro quema
            zl = 0.5 + 0.5 * B;
            hot = step(2.5, zone) * step(zone, 4.5) * hit;
        } else {                         // oscuridad y una zona de a una
            float target = floor(hash21(vec2(k, 3.0)) * 11.0) + 2.0;
            zl = step(abs(zone - target), 0.5) * 1.2 - 0.6;
            hot = step(abs(zone - target), 0.5);
        }
    }
    if (beat < 0.5) { zl = 0.3; hot = 0.0; }
    for (int kk = 0; kk < N_KEYS; kk++) {
        float ek = keyEnv(kk, 0.04, 0.8);
        if (ek > 0.001 && abs(uv.x - keyPos(kk)) < 0.12) { zl = max(zl, ek); hot = max(hot, ek * 0.7); }
    }
    zl = max(zl, C.y); hot = max(hot, C.y * step(0.5, zone));
    float base = 0.38 + 0.25 * B;
    float lvl = clamp(base + (0.75 + 0.6 * uD1) * zl, 0.08, 2.2);
    vec3 outc = col * lvl;
    // zona que quema: hacia blanco con rayas de luz
    float burn = hot * (0.25 + 0.75 * uD4) * (0.65 + 0.35 * exp(-ph * 3.0));
    burn *= zone < 2.5 ? 0.0 : 1.0;             // el fondo brilla en color, nunca en blanco
    vec3 white = mix(col, vec3(1.0, 0.96, 0.88), 0.6) * (1.6 + 0.6 * hit);
    white *= mix(1.0, 0.8 + 0.2 * step(0.5, fract(p.y * 34.0)), det);
    outc = mix(outc, white, burn);
    // bombillas: una de cada tres prendida, corren con el pulso
    float bon = step(0.5, fract((bidx + k * 3.0) / 3.0 + 0.01)) * (0.4 + 0.6 * uD6);
    outc += mix(cY, vec3(1.0), 0.6) * (smoothstep(0.035, 0.02, bulb) * (0.25 + 1.6 * bon) + exp(-bulb * 40.0) * 0.4 * bon);
    return vec4(hkFinish(pow(max(outc, 0.0), vec3(2.2)), uv, vec3(0.0)), 1.0);
}
