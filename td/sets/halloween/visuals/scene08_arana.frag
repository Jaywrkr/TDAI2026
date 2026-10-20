// ===============================================================
// HALLOWEEN 08 - ARANA EN SU TELA
// Plano macro en un desvan de noche: fondo desenfocado con vigas, el
// ventanal con luna y circulos de luz (LAMINAS horneadas,
// plates/scene08, ver td/tools/bake_plates_arana.py), y nitida la tela
// de una arana de jardin atada a la viga y al poste: radios, espiral,
// hilos que brillan a contraluz con un leve tornasol y gotas de rocio
// que refractan el fondo. La arana (abdomen con dibujo, patas con
// bandas) baja y sube por su hilo.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> el brillo de contraluz de los hilos late
//   medios -> la brisa mece la tela
//   agudos -> destella el rocio; brilla el polvo en el aire
//   golpe  -> la tela vibra (cada vuelta con su fase, D4) y la arana se
//             encoge; con Chaos bajan aranitas por sus hilos
// Speed mueve la arana, la brisa y el polvo aun en silencio.
// HISTORIA: cada ~67 s la arana camina hasta el centro de la tela; cada
// ~53 s una rafaga sacude todo; cada acto cambia la luz de la luna.
//
// @D1: cantidad de radios
// @D2: cantidad de anillos
// @D3: tamano de la arana
// @D4: vibracion con el golpe
// @D5: rocio
// @D6: color (plata <-> violeta)
// ===============================================================

const vec4 PL_R = vec4(-3.1, -1.2, 6.2, 2.4);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

float hwSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// Arana de jardin ~1 de largo, cabeza hacia +y. Devuelve (distancia,
// zona: 0 pata, 1 cefalotorax, 2 abdomen) y la coordenada del abdomen.
vec2 hwSpider(vec2 p, float t, float curl, out vec2 abq) {
    vec2 ab = (p - vec2(0.0, -0.22)) / vec2(0.30, 0.36);
    abq = ab;
    float abd = (length(ab) - 1.0) * 0.30;
    float cep = length((p - vec2(0.0, 0.16)) / vec2(0.15, 0.17)) - 1.0;
    cep *= 0.15;
    float d = min(abd, cep);
    float zone = abd < cep ? 2.0 : 1.0;
    float legs = 1e3;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float sway = 0.10 * sin(t * 3.0 + fi * 1.7);
        for (int s = -1; s <= 1; s += 2) {
            float sx = float(s);
            vec2 hip = vec2(sx * 0.10, 0.22 - fi * 0.05);
            float ang = (fi < 2.0 ? 0.5 - fi * 0.35 : -0.2 - (fi - 2.0) * 0.45) + sway * sx;
            vec2 dir = vec2(sx * cos(ang), sin(ang));
            vec2 knee = hip + dir * (0.32 - curl * 0.12) + vec2(0.0, 0.10);
            vec2 dir2 = vec2(sx * cos(ang - 0.9 * (fi < 2.0 ? -1.0 : 1.0) * 0.6), sin(ang) - 0.6);
            vec2 foot = knee + normalize(dir2) * (0.40 - curl * 0.18);
            vec2 tip = foot + normalize(dir2 + vec2(0.0, -0.3)) * 0.12 * (1.0 - curl);
            legs = min(legs, hwSeg(p, hip, knee) - 0.026);
            legs = min(legs, hwSeg(p, knee, foot) - 0.020);
            legs = min(legs, hwSeg(p, foot, tip) - 0.013);
        }
    }
    if (legs < d) zone = 0.0;
    d = min(d, legs);
    return vec2(d, zone);
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 p = hkCam(p0);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.006);
    float gust = hkEvent(4.0, 53.0, 4.0);
    float walk = hkEvent(3.0, 67.0, 14.0);
    vec3 moonC = mix(vec3(0.60, 0.70, 1.0), vec3(0.85, 0.80, 1.0), hkActVal(5.0));
    vec3 silk = mix(vec3(0.90, 0.92, 1.0), hsv2rgb(vec3(fract(0.78 + hue), 0.45, 1.0)), uD6);

    // --- fondo desenfocado ---
    vec3 col = plateCol(plate0(rUV(p0 + (p - p0) * 0.4)).rgb) * 1.15;
    // polvo flotando, fuera de foco
    float dust = hkParticles(p * 0.9, t * 0.12, 0.04 + high * 0.06, vec2(0.2, 0.1), 0.05);
    col += moonC * dust * (0.08 + high * 0.25);

    // --- tela ---
    vec2 C = vec2(-0.25, 0.08);
    float breeze = (0.015 + mid * 0.04 + gust * 0.10) * sin(t * 0.9) + gust * 0.04 * sin(uRTime * 9.0);
    vec2 wp = p - C - vec2(breeze, breeze * 0.4) * smoothstep(0.0, 1.0, length(p - C));
    float r = length(wp);
    float a = atan(wp.y, wp.x);
    float nSp = floor(14.0 + uD1 * 16.0);
    float sector = TAU / nSp;
    float ai = floor(a / sector);
    float al = a - (ai + 0.5) * sector;
    float px = 1.4 / uResH * 2.0;            // ~1.4 px
    float webR = 1.05;
    float web = 0.0;
    float dew = 0.0;
    vec2 dewQ = vec2(0.0);
    if (r < webR + 0.02) {
        // radios
        float spoke = abs(sin(al)) * r;
        web = max(web, (1.0 - smoothstep(0.0, px, spoke)) * smoothstep(0.03, 0.06, r));
        // espiral: tramos rectos entre radios (r del poligono)
        float rp = r * cos(al) / cos(0.0);
        float nRing = 12.0 + floor(uD2 * 20.0);
        float spacing = (webR - 0.10) / nRing;
        float k = (rp - 0.10) / spacing + (hash21(vec2(ai, 3.0)) - 0.5) * 0.35;
        float ring = floor(k);
        // vibracion del golpe: cada vuelta con su fase
        float vib = hit * (0.15 + uD4 * 0.6) * sin(ring * 1.7 + uRTime * 30.0) * 0.25;
        float fk = fract(k + vib);
        float rd = abs(fk - 0.5) * spacing;
        float onR = step(0.10, rp) * step(rp, webR) * step(ring, nRing - 1.0) * step(0.05, hash21(vec2(ring, ai + 17.0)));
        web = max(web, (1.0 - smoothstep(0.0, px, rd)) * onR);
        // gotas de rocio sobre la espiral
        float along = al * r / spacing * 1.2;
        float cid = floor(along);
        float hsd = hash21(vec2(ring * 13.0 + ai, cid));
        float has = step(1.0 - uD5 * 0.6, hsd) * onR;
        vec2 dq = vec2((fract(along) - 0.5) * spacing / 1.2, (fk - 0.5) * spacing);
        float dr = spacing * (0.16 + 0.16 * hash21(vec2(cid, ring)));
        float dd = length(dq) - dr;
        if (has > 0.5 && dd < 0.0) { dew = 1.0; dewQ = dq / dr; }
        // hilos del marco hacia la viga y el poste
    }
    float frameT = 1e3;
    frameT = min(frameT, hwSeg(wp, vec2(0.0, webR), vec2(0.25, 0.78)));
    frameT = min(frameT, hwSeg(wp, vec2(-webR * 0.8, webR * 0.6), vec2(-2.10, 0.70)));
    frameT = min(frameT, hwSeg(wp, vec2(-webR, 0.0), vec2(-2.10, -0.20)));
    frameT = min(frameT, hwSeg(wp, vec2(webR * 0.7, webR * 0.7), vec2(1.30, 0.78)));
    frameT = min(frameT, hwSeg(wp, vec2(webR * 0.6, -webR * 0.8), vec2(1.6, -1.3)));
    web = max(web, 1.0 - smoothstep(0.0, px, frameT));
    // contraluz: los hilos brillan mas del lado de la luna, con tornasol
    float back = 0.55 + 0.45 * smoothstep(-1.0, 1.0, wp.x + wp.y) + bass * 0.4;
    vec3 irid = 0.5 + 0.5 * cos(TAU * (a * 0.3 + r * 2.0 + vec3(0.0, 0.33, 0.67)));
    col += silk * web * back * 0.32 * (0.6 + 0.4 * smoothstep(webR, 0.2, r)) + irid * web * 0.05;
    // rocio: lente que refracta el fondo invertido, borde oscuro y destello
    if (dew > 0.5) {
        float rr = length(dewQ);
        vec3 refr = plateCol(plate0(rUV(p - dewQ * 0.35)).rgb) * 4.0 + moonC * 0.05;
        vec3 dc = mix(refr, refr * 0.25, smoothstep(0.75, 1.0, rr));
        float spark = exp(-dot(dewQ - vec2(0.35, 0.35), dewQ - vec2(0.35, 0.35)) * 25.0);
        float tw = 0.6 + 0.4 * sin(uRTime * (6.0 + hash21(dewQ) * 6.0) + rr * 30.0);
        dc += vec3(1.0) * spark * (0.8 + high * 2.5 * tw);
        col = mix(col, dc, smoothstep(1.0, 0.85, rr));
    }

    // --- arana en su hilo ---
    float sz = 0.28 + uD3 * 0.22;
    float hang = 0.25 + 0.30 * sin(t * 0.28) + 0.10 * sin(t * 0.71);
    vec2 sp = vec2(1.15, hang);
    // historia: camina hasta el centro de la tela y vuelve
    float wph = hkEventPhase(3.0, 67.0, 14.0);
    vec2 centerPos = C + vec2(0.0, -0.05);
    sp = mix(sp, centerPos, walk * smoothstep(0.0, 0.4, wph) * (1.0 - smoothstep(0.6, 1.0, wph)));
    float curl = hit * (0.5 + uD4 * 0.5);
    // hilo de seda
    float drag = abs(p.x - sp.x) - px * 0.5;
    drag = max(drag, max(sp.y - p.y, p.y - 0.86));
    col += silk * (1.0 - smoothstep(0.0, px, drag)) * 0.35 * (1.0 - walk);
    vec2 sq = (p - sp) / sz;
    sq = rot2(PI) * sq;                   // cuelga cabeza abajo
    if (dot(sq, sq) < 2.0) {
        vec2 abq;
        vec2 sd = hwSpider(sq, t, curl, abq);
        float m = 1.0 - smoothstep(-0.01, 0.01, sd.x);
        vec3 sc;
        if (sd.y > 1.5) {
            // abdomen: folio oscuro ondulado, puntos claros en cruz, brillo
            float fol = smoothstep(0.30, 0.26, abs(abq.x) - 0.25 * sin(abq.y * 6.0) * 0.3 - 0.15 * (1.0 - abq.y));
            vec3 base = mix(vec3(0.30, 0.20, 0.10), vec3(0.10, 0.06, 0.035), fol);
            float spots = smoothstep(0.10, 0.06, length(vec2(abq.x, fract(abq.y * 2.5) - 0.5) * vec2(1.0, 1.8))) * step(abs(abq.x), 0.1);
            spots = max(spots, smoothstep(0.08, 0.05, length(abq - vec2(0.0, 0.2) - vec2(0.18 * sign(abq.x), 0.0))));
            base = mix(base, vec3(0.75, 0.72, 0.62), spots * 0.8);
            vec3 n = normalize(vec3(abq * 0.9, sqrt(max(1.0 - dot(abq, abq), 0.0)) + 0.1));
            float dif = max(dot(n, normalize(vec3(0.5, 0.5, 0.7))), 0.0);
            float spec = pow(max(dot(reflect(-normalize(vec3(0.5, 0.5, 0.7)), n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
            sc = base * (0.25 + 0.9 * dif) * moonC * 1.2 + vec3(0.6, 0.65, 0.8) * spec * 0.5;
        } else if (sd.y > 0.5) {
            sc = vec3(0.14, 0.09, 0.05) * 1.1 * moonC;
            vec2 eq = sq - vec2(0.0, 0.25);
            sc += vec3(0.7) * smoothstep(0.02, 0.0, length(vec2(abs(eq.x) - 0.04, eq.y)) - 0.012);
        } else {
            // patas con bandas claras y oscuras
            float band = step(0.5, fract(length(sq) * 9.0));
            sc = mix(vec3(0.08, 0.05, 0.03), vec3(0.32, 0.24, 0.14), band) * moonC;
        }
        // pelitos en el borde, a contraluz
        float fuzz = (1.0 - smoothstep(0.0, 0.035, abs(sd.x))) * (0.5 + 0.5 * noise21(sq * 60.0));
        col = mix(col, sc, m);
        col += moonC * fuzz * 0.12 * (1.0 - m * 0.5);
    }

    // --- locura: aranitas que bajan por sus hilos ---
    if (hit * loco > 0.05) {
        for (int i = 0; i < 6; i++) {
            float fi = float(i);
            float bx = -1.8 + fi * 0.75 + 0.2 * hash21(vec2(fi, 3.0));
            float by = 0.86 - fract(uRTime * 0.3 + hash21(vec2(fi, 4.0))) * 1.6;
            float th = max(abs(p.x - bx) - px * 0.4, max(by - p.y, p.y - 0.86));
            col += silk * (1.0 - smoothstep(0.0, px, th)) * 0.2 * hit * loco;
            vec2 bq = rot2(PI) * (p - vec2(bx, by)) / 0.06;
            if (dot(bq, bq) > 2.0) continue;
            vec2 aq;
            vec2 bd = hwSpider(bq, t * 2.0 + fi, 0.0, aq);
            col = mix(col, vec3(0.03), (1.0 - smoothstep(-0.02, 0.02, bd.x)) * hit * loco);
        }
    }

    // --- vigas y telaranas viejas (adelante, nitidas) ---
    vec4 bm = plate1(rUV(p));
    col = mix(col, plateCol(bm.rgb) * 1.5 * (0.8 + 0.3 * moonC), bm.a);

    col = audioLift(col, high * 0.08);
    return vec4(hkFinish(col, uv, vec3(0.5, 0.5, 0.8)), 1.0);
}
