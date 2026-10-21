// ===============================================================
// HALLOWEEN 24 - LA IMAGEN QUE SANGRA (usa la carpeta Media)
// Una pared de revoque sucio bajo una lampara de jaula. La imagen de la
// carpeta Media llega en pedazos de papel rasgado desde todos los
// costados, se pega en la pared como un afiche y empieza a sangrar: las
// partes oscuras de la imagen se manchan de rojo, chorrean hilos hasta
// el piso y se junta un charco. Al final de cada vuelta los pedazos se
// despegan y caen, y la imagen vuelve a llegar. Es el unico color de la
// escena: todo lo demas es gris.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la sangre baja mas rapido y la lampara late
//   medios -> los pedazos se mueven un poco en la pared (corriente)
//   agudos -> brillo humedo en la sangre
//   golpe  -> salpicadura sobre la imagen; con Chaos los pedazos saltan
//             de la pared y vuelven
// PIANO: cada tecla hace brotar un chorro de sangre de la imagen en esa
//   posicion (grave a la izquierda) que baja hasta el piso; la fuerza: mas
//   grueso y rapido; apretada sigue manando; al soltarla el chorro cae.
// Speed marca el ritmo de cada vuelta (llegar, sangrar, caer).
// HISTORIA: cada ~50 s la pared entera llora sangre desde arriba.
// CLIMAX (~79 s, 18 s, en tres tiempos): la lampara titila y la imagen
//   empieza a sangrar; la imagen llora sangre a chorros; la lampara se
//   apaga y solo queda el brillo de la sangre. Cada ~4.5 min con la pared
//   llorando (gran climax).
//
// @D1: cantidad de cortes (los pedazos sin cortar quedan pegados como una hoja)
// @D2: sangre
// @D3: salpicaduras
// @D4: desgarro (cuanto se separan y tuercen los pedazos)
// @D5: tono de la imagen (gris <-> sepia)
// @D6: charco y goteo al piso
// ===============================================================

const float FLOOR = -0.86;
mat2 b24rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float has = hkMediaHas();
    vec4 G = hkGrandClimax(61.0);
    vec4 C = hkClimaxOr(G, hkClimax(61.0, 79.0, 18.0));
    float flickC = C.x * (1.0 - C.y) * (1.0 - C.z);
    float cryE = max(hkEvent(60.0, 50.0, 9.0), max(C.y, G.y));
    float darkE = C.z * (1.0 - smoothstep(0.92, 1.0, C.w));

    // vuelta: llegan (0..0.18), sangran, se despegan (0.92..1)
    float cyc = t / 32.0;
    float cid = floor(cyc);
    float ph = fract(cyc);
    float bleed = smoothstep(0.15, 0.85, ph) * (0.3 + uD2 * 0.9) + cryE * 0.4 + C.x * 0.35;

    // lampara de jaula
    vec2 lp = vec2(0.0, 0.92);
    float lamp = (0.75 + bass * 0.4) * (1.0 - darkE * 0.95) * (0.92 + 0.08 * noise21(vec2(t * 7.0, 1.0)))
               * (1.0 - flickC * 0.8 * step(0.5, noise21(vec2(uRTime * 13.0, 5.0))));
    vec2 ld = p - lp;
    float cone = smoothstep(1.25, 0.2, abs(ld.x) / max(-ld.y + 0.25, 0.05));
    float L = 0.09 + lamp * (0.25 / (0.25 + dot(ld, ld) * 0.6)) * (0.35 + 0.65 * cone);

    // --- pared de revoque ---
    float n1 = fbm(p * 3.0, 5, 0.55);
    float n2 = fbm(p * 12.0 + 4.0, 3, 0.5);
    vec3 wall = vec3(0.30, 0.29, 0.27) * (0.55 + 0.6 * n1) * (0.85 + 0.3 * n2);
    wall = mix(wall, vec3(0.12, 0.11, 0.09), smoothstep(0.55, 0.75, fbm(p * vec2(1.5, 0.6) + 8.0, 4, 0.55)) * 0.6);   // humedad
    float crackW = hkLine(fbm(p * vec2(1.2, 2.5) + 2.0, 4, 0.55) - 0.5, 1.0) * step(0.55, n1);
    wall *= 1.0 - crackW * 0.5;
    // marcas a los costados: rayas contadas, clavos, restos de afiches
    vec2 tm = p - vec2(-uAspect + 0.45, -0.25);
    float tally = 0.0;
    for (int k = 0; k < 5; k++) tally = max(tally, hkLine(hkSeg(tm, vec2(float(k) * 0.035, 0.0), vec2(float(k) * 0.035 + 0.01, 0.16)), 1.2));
    tally = max(tally, hkLine(hkSeg(tm, vec2(-0.02, 0.03), vec2(0.17, 0.12)), 1.2));
    wall = mix(wall, vec3(0.08), tally * 0.8);
    for (int k = 0; k < 4; k++) {
        float fk = float(k);
        vec2 sp = vec2((fk < 2.0 ? -1.0 : 1.0) * (uAspect - 0.25 - 0.2 * mod(fk, 2.0)), 0.55 - fk * 0.45);
        vec2 sq = b24rot(fk * 0.9) * (p - sp);
        float scrap = hkBox(sq, vec2(0.16, 0.20)) + fbm(sq * 12.0 + fk, 3, 0.5) * 0.08 - 0.03;
        if (scrap < 0.0) wall = mix(vec3(0.42, 0.40, 0.36) * (0.6 + 0.4 * noise21(sq * 30.0)), vec3(0.20, 0.19, 0.17), smoothstep(-0.03, 0.0, scrap)) * (0.6 + 0.4 * n1);
        wall = mix(wall, vec3(0.03), 1.0 - smoothstep(0.006, 0.010, length(p - sp - vec2(0.0, 0.18))));   // clavo
    }
    vec3 col = wall * L * 2.2;
    // piso
    if (p.y < FLOOR) {
        float wet = fbm(p * vec2(3.0, 10.0), 4, 0.5);
        col = vec3(0.12, 0.115, 0.11) * (0.5 + 0.6 * wet) * L * 2.0;
    }

    // --- la imagen en pedazos de papel ---
    float ia = clamp(hkMediaAspect(), 0.7, 1.7);
    vec2 HS = vec2(0.70 * ia, 0.70);
    vec2 IC = vec2(0.0, 0.05);
    // grilla FIJA (antes D1 cambiaba la grilla y la imagen se recortaba de
    // nuevo de golpe): D1 decide cuantos pedazos se separan
    float cols = floor(4.0 * ia + 0.5);
    const float rows = 4.0;
    vec2 cell = 2.0 * HS / vec2(cols, rows);
    vec2 gl = (p - IC + HS) / cell;
    vec2 g0 = floor(gl);
    float paperA = 0.0;
    vec3 paperC = vec3(0.0);
    vec2 mImg = vec2(-1.0);
    float pieceEdge = 0.0;
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
        vec2 id = g0 + vec2(x, y);
        if (id.x < 0.0 || id.y < 0.0 || id.x >= cols || id.y >= rows) continue;
        vec2 h = hash22(id + cid * 3.7);
        // separado o pegado al resto (D1): el pegado no se corre ni gira y
        // llega junto con la hoja
        float torn = smoothstep(0.0, 0.08, mix(-0.05, 1.05, uD1) - hash21(id + 13.0));
        h = mix(vec2(0.5), h, torn);
        // llega desde el borde mas cercano de la pantalla, cada uno a su tiempo
        vec2 cc = (id + 0.5) / vec2(cols, rows) - 0.5;
        vec2 from = abs(cc.x) * 1.0 > abs(cc.y) * ia ? vec2(sign(cc.x + 1e-3) * (uAspect + 1.2), 0.0) : vec2(0.0, sign(cc.y + 1e-3) * 2.2);
        float arrive = smoothstep(0.02 + h.x * 0.10, 0.08 + h.x * 0.10, ph);
        float fall = smoothstep(0.92 + h.y * 0.05, 0.99, ph);
        float jump = hit * loco * step(0.6, h.x) * 0.15;
        vec2 off = from * (1.0 - arrive) + vec2(0.0, -2.5) * fall * fall + (h - 0.5) * cell * uD4 * 0.12;
        off += vec2(sin(t * 0.8 + h.x * 6.0), cos(t * 0.7 + h.y * 6.0)) * 0.004 * (0.3 + mid * 2.0) + vec2(0.0, jump);
        float rot = (h.y - 0.5) * (0.04 + uD4 * 0.18) * (1.0 + (1.0 - arrive) * 3.0) + fall * (h.x - 0.5) * 2.0;
        // la hoja sin cortar llega toda junta desde abajo
        off = mix(vec2(0.0, -2.2) * (1.0 - arrive) + vec2(0.0, -2.5) * fall * fall, off, torn);
        vec2 ctr = IC - HS + (id + 0.5) * cell + off;
        vec2 lq = b24rot(-rot) * (p - ctr);
        // borde rasgado (fibras blancas del papel)
        float d0 = hkBox(lq, cell * 0.5 * (1.0 + 0.08 * uD4 * torn + 0.02 * (1.0 - torn)));
        if (d0 > 0.03) continue;
        float rag = (fbm(lq * 18.0 + id * 7.0, 3, 0.5) - 0.5) * 0.035 + (noise21(lq * 90.0 + id) - 0.5) * 0.006;
        float d = d0 + rag;
        if (d < 0.0) {
            vec2 m = ((lq + (id + 0.5) * cell - HS) / (2.0 * HS)) + 0.5;
            float fiber = smoothstep(-0.018, 0.0, d) * torn;
            vec3 im = hkMediaGet(hkMediaCover(m, ia), 0.4, has);
            im = hkTone(im, 0.0, mix(vec3(0.92), vec3(1.0, 0.84, 0.62), uD5), 1.2);
            vec3 pc = mix(im, vec3(0.55, 0.53, 0.49) * (0.7 + 0.3 * noise21(lq * 200.0)), fiber);
            pc *= 0.85 + 0.25 * noise21(lq * 8.0 + id);                       // arrugas del papel
            paperC = pc;
            paperA = 1.0;
            mImg = m;
            pieceEdge = fiber;
        }
    }
    float imgDark = 0.0;
    if (paperA > 0.0) {
        float lum = dot(paperC, vec3(0.33));
        imgDark = smoothstep(0.25, 0.02, lum) * (1.0 - pieceEdge);
        // sangre que se mete en lo oscuro de la imagen
        float blot = fbm(mImg * 5.0 + cid, 3, 0.5);
        float seep = smoothstep(0.70, 0.95, bleed * 0.55 + blot * 0.75) * imgDark;
        paperC = mix(paperC, vec3(0.13, 0.006, 0.008) * (0.6 + 0.4 * noise21(mImg * 40.0)), seep * 0.8);
        col = mix(col * 0.5, paperC * L * 2.4, paperA);                    // sombra del papel
    }

    // --- hilos de sangre ---
    float dripA = 0.0;
    {
        float cw = 0.028;
        float cx = floor(p.x / cw);
        float hx = hash21(vec2(cx, cid + 2.0));
        float x0 = (cx + 0.3 + hx * 0.4) * cw;
        // nacen en lo oscuro de la imagen (o arriba de todo cuando la pared llora)
        float ys = IC.y + HS.y * (0.9 - 1.6 * hash21(vec2(cx, 7.0 + cid)));
        vec2 ms = vec2((x0 - IC.x + HS.x) / (2.0 * HS.x), (ys - IC.y + HS.y) / (2.0 * HS.y));
        float srcDark = 0.0;
        if (abs(x0 - IC.x) < HS.x) {
            vec3 sim = hkMediaGet(hkMediaCover(ms, ia), 2.0, has);
            srcDark = smoothstep(0.05, 0.005, dot(sim, vec3(0.33)));
        }
        float cryS = cryE * step(0.72, hx);
        if (cryS > 0.0) ys = 1.05;
        float on = max(step(0.25, hx) * srcDark, cryS);
        float speed = (0.4 + hx * 0.6) * (0.6 + bass * 0.8);
        float len = clamp(bleed * speed * 1.6 + cryS * cryE * 1.5, 0.0, ys - FLOOR + 0.05);
        float w = cw * (0.10 + 0.12 * hx) * (1.0 - 0.5 * smoothstep(ys - len, ys, p.y));
        float dx = abs(p.x - x0 - sin(p.y * 13.0 + hx * 6.0) * 0.004);
        float body = (1.0 - smoothstep(w, w + 0.004, dx)) * step(p.y, ys) * step(ys - len, p.y);
        float headY = ys - len;
        float head = 1.0 - smoothstep(w * 1.7, w * 1.7 + 0.004, length(vec2(dx, (p.y - headY) * 0.8)));
        dripA = max(body, head) * on * smoothstep(0.0, 0.03, len);
    }
    // salpicaduras del golpe
    float splat = 0.0;
    if (uD3 > 0.02) {
        vec2 sc = IC + (hash22(vec2(floor(uRTime * 2.0), 3.0)) - 0.5) * HS * 1.4;
        vec2 sq = p - sc;
        float r = length(sq);
        float a = atan(sq.y, sq.x);
        float rays = smoothstep(0.6, 1.0, noise21(vec2(a * 6.0, floor(uRTime * 2.0))));
        float blob = 1.0 - smoothstep(0.05, 0.07, r + (noise21(vec2(a * 3.0, 1.0)) - 0.5) * 0.04);
        vec2 dg = sq * 22.0;
        float dots = (1.0 - smoothstep(0.15, 0.3, length(fract(dg) - 0.5 - (hash22(floor(dg)) - 0.5) * 0.5)))
                   * step(0.7, hash21(floor(dg) + floor(uRTime * 2.0))) * smoothstep(0.45, 0.1, r);
        splat = max(blob, max(rays * smoothstep(0.35, 0.05, r) * step(0.07, r) * 0.0, dots)) * hit * uD3;
        float streak = smoothstep(0.02, 0.0, abs(sin(a * 9.0 + floor(uRTime * 2.0)) * r * 0.25)) * smoothstep(0.30, 0.06, r) * rays;
        splat = max(splat, streak * hit * uD3);
    }
    // --- PIANO: chorros que brotan de la imagen ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.02, 2.5);
        if (e < 0.01) continue;
        float vel = keyVel(k), age = keyAge(k), rel = keyRelAge(k);
        float x0 = IC.x + mix(-HS.x, HS.x, mix(0.1, 0.9, keyPos(k)));
        float ys = IC.y + HS.y * (0.5 - 0.6 * fract(keyPos(k) * 7.7));
        float fallK = rel * rel * 1.8;
        float top = ys - fallK;
        float len = min(age * (0.5 + vel * 0.8), ys - FLOOR + 0.03);
        float w = 0.010 + vel * 0.014;
        float dx = abs(p.x - x0 - sin(p.y * 11.0 + float(k)) * 0.005);
        float body = (1.0 - smoothstep(w, w + 0.004, dx)) * step(p.y, top) * step(ys - len - fallK, p.y);
        float head = 1.0 - smoothstep(w * 1.6, w * 1.6 + 0.004, length(vec2(dx, (p.y - (ys - len - fallK)) * 0.8)));
        float burst = (1.0 - smoothstep(0.03, 0.05 + vel * 0.04, length(p - vec2(x0, ys)))) * exp(-age * 2.0);
        dripA = max(dripA, max(max(body, head), burst) * e);
    }
    float blood = clamp(max(dripA, splat), 0.0, 1.0);
    vec3 bloodC = vec3(0.28, 0.012, 0.015) * (0.6 + 0.4 * L * 3.0);
    bloodC += vec3(0.9, 0.5, 0.5) * pow(max(0.0, 1.0 - abs(fract(p.x / 0.028) - 0.4) * 4.0), 6.0) * (0.15 + high * 0.4) * lamp * dripA;   // brillo humedo
    // con la lampara apagada la sangre brilla sola
    col = mix(col, bloodC + vec3(0.45, 0.0, 0.01) * darkE * 0.7, blood);

    // --- charco en el piso ---
    if (uD6 > 0.02 && p.y < FLOOR + 0.01) {
        float pool = fbm(vec2(p.x * 1.5, 0.0) + cid, 3, 0.5) * 1.6 - 1.2 + bleed * uD6 * 1.3;
        float pd = length(vec2((p.x - IC.x) / (HS.x * 1.3), (p.y - FLOOR + 0.07) / 0.09)) - (0.6 + pool * 0.5) - (noise21(vec2(p.x * 6.0, cid)) - 0.5) * 0.25;
        float wetA = 1.0 - smoothstep(0.0, 0.05, pd);
        vec2 rq = vec2(p.x, 2.0 * FLOOR - p.y);
        vec3 refl = vec3(0.35, 0.02, 0.02) * L * 1.5 + vec3(0.5, 0.3, 0.3) * lamp * 0.08 * exp(-abs(p.x) * 2.0);
        refl += paperA * 0.0;
        col = mix(col, refl * (0.6 + 0.4 * noise21(rq * vec2(4.0, 30.0) + t * 0.2)), wetA);
        // gotas que caen al charco
        float fallX = floor(p.x / 0.15);
        float fph = fract(t * 0.7 + hash21(vec2(fallX, 9.0)));
        float ring = hkLine((length((p - vec2((fallX + 0.5) * 0.15, FLOOR - 0.06)) * vec2(1.0, 3.5)) - fph * 0.12), 1.0) * (1.0 - fph) * wetA * step(0.6, hash21(vec2(fallX, 4.0)));
        col += vec3(0.4, 0.06, 0.06) * ring * 0.5;
    }

    // la lampara: jaula de alambre y bombita
    {
        vec2 q = p - lp;
        float bulbD = length(q * vec2(1.0, 0.8)) - 0.05;
        float cage = hkLine(abs(fract(atan(q.x, q.y + 0.02) * 1.6) - 0.5) * length(q) - 0.0, 0.8) * step(length(q * vec2(1.0, 0.8)), 0.075) * step(-0.06, q.y);
        float shade = max(hkRBox(q - vec2(0.0, 0.06), vec2(0.07, 0.02), 0.01), -1.0);
        col = mix(col, vec3(0.05), (1.0 - smoothstep(0.0, 0.004, shade)) + cage * 0.7);
        col += vec3(1.0, 0.93, 0.8) * lamp * (1.0 - smoothstep(0.0, 0.01, bulbD)) * 1.4;
        col += vec3(1.0, 0.9, 0.75) * lamp * exp(-length(q) * 7.0) * 0.12;
        col = mix(col, vec3(0.02), (1.0 - smoothstep(0.0, 0.003, abs(p.x) - 0.004)) * step(lp.y + 0.07, p.y));
    }
    return vec4(hkFinish(col, uv, vec3(0.3, 0.06, 0.06)), 1.0);
}
