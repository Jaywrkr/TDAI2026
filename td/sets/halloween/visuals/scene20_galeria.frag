// ===============================================================
// HALLOWEEN 20 - GALERIA EMBRUJADA (usa la carpeta Media)
// Una sala de museo abandonada: empapelado de damasco gastado, zocalo
// de madera, piso encerado que refleja. En la pared cuelgan 3 a 5
// cuadros con marco tallado, cada uno con la imagen de la carpeta Media
// pintada como oleo viejo (casi sin color). Entre los cuadros, candelabros
// de pared; arriba de cada cuadro, una lampara de galeria. Telaranas en
// las esquinas y polvo en la luz.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> las lamparas laten y la luz de las velas crece
//   medios -> los cuadros se balancean de su clavo, cada uno a su tiempo
//   agudos -> brilla el polvo en el aire
//   golpe  -> los cuadros dan un tiron y la imagen "grita" (se estira y
//             se hunde en el centro); con Chaos, se tuercen y tiemblan
// PIANO: cada tecla hace gritar el cuadro de esa posicion (la imagen se
//   estira y se hunde, pasa a negativo un instante) y su lampara se aviva;
//   la fuerza: mas grito; apretada sigue gritando.
// Speed mueve las llamas, el polvo y el balanceo aun en silencio.
// REPERTORIO (fase 34, motor hkSuceso del kit, version liviana):
//   ESTADOS (~5 min): lamparas, velas (lamparas bajas) y penumbra (mas
//     polvo, todo mas oscuro).
//   SUCESOS (~55 s, 5): apagon (solo quedan las imagenes, palidas); un
//     cuadro se suelta de un lado; las imagenes se corren dentro de los
//     marcos, como si miraran; pasa una sombra por la pared; un cuadro
//     sangra por debajo del marco.
//   DETALLES (~30 s, 4): una vela se apaga, una lampara titila, cae
//     polvo, una arana baja por su hilo.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A el negativo: apagon, los cuadros se tuercen de a uno, todos pasan
//       a negativo y gritan; vuelven parpadeando.
//     B la ronda: los cuadros giran una vuelta entera en sus clavos, cada
//       uno a su tiempo.
//     C el cuadro gigante: la imagen del centro crece hasta llenar la
//       pared y los demas se apagan; despues vuelve a su marco.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con un cuadro que
//     se suelta.
// @EST: lamparas | velas | penumbra
// @SUC: apagon | se suelta | se corren | una sombra | sangra
// @DET: una vela | lampara titila | polvo | arana
// @CLX: A el negativo | B la ronda | C el cuadro gigante
//
// @D1: cantidad de cuadros (3 <-> 5; se reacomodan y el nuevo crece)
// @D2: balanceo con el golpe
// @D3: grito (deformacion de la imagen)
// @D4: velas y lamparas
// @D5: tratamiento (oleo sepia <-> negativo)
// @D6: polvo y telaranas
// ===============================================================

const float FLOOR_Y = -0.74;
const float WAIN_Y = -0.46;

mat2 g20rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// empapelado de damasco: un motivo simetrico repetido, gastado
float g20Damask(vec2 p) {
    vec2 g = p * vec2(5.2, 3.6);
    vec2 id = floor(g);
    vec2 q = fract(g) - 0.5;
    q.x = abs(q.x);
    float petal = length((q - vec2(0.12, 0.05)) * vec2(1.0, 0.55)) - 0.13;
    float stem = abs(q.x) - 0.018 + step(0.32, abs(q.y)) * 0.1;
    float leaf = length((q - vec2(0.22, -0.24)) * vec2(0.8, 1.3)) - 0.08;
    float d = min(min(petal, stem), leaf);
    return 1.0 - smoothstep(0.0, 0.015, d);
}

// segundos desde la tecla mas reciente (para el destello en negativo)
float keyAgeMin() { float a = 1e4; for (int i = 0; i < N_KEYS; i++) a = min(a, keyAge(i)); return a; }

// piano: cuanto grita el cuadro k (la tecla mas cercana en posicion)
float g20Key(float k, float nSlots) {
    float kb = 0.0;
    for (int i = 0; i < N_KEYS; i++) {
        float e = keyEnv(i, 0.06, 0.6);
        if (e < 0.01) continue;
        if (abs(floor(keyPos(i) * nSlots * 0.999) - k) < 0.5) kb = max(kb, e * (0.5 + keyVel(i) * 0.7));
    }
    return kb;
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float has = hkMediaHas();

    // --- calendario (fase 34) ---
    hkSetClimax(22.0, 18.0, 22.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(22.0, 5, 10.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(22.0, 4, 3.5);
    int dv = int(D.z);
    vec4 EST = hkEstado(22.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(22.0, 3));
    float cph = cA * C.w;
    float dark = max(sv == 0 ? se : 0.0, cA * C.x * (1.0 - C.z) * 0.9);   // apagon
    float fallE = max(sv == 1 ? se : 0.0, G.x);                          // un cuadro se suelta
    // pico: todos negativos; secuelas: vuelven parpadeando (a lo sumo dos veces por segundo)
    float negE = cA * max(C.y, C.z * step(0.55, noise21(vec2(floor(uRTime * 3.0), 3.0))) * (1.0 - smoothstep(0.85, 0.95, cph)));
    float fallPh = G.w > 0.0 ? G.w : sp;
    float spinK = cB * smoothstep(0.08, 0.85, C.w);
    float bigK = cC * smoothstep(0.08, 0.40, C.w) * (1.0 - smoothstep(0.75, 0.95, C.w));
    float lookM = sv == 2 ? se * sin(sp * TAU) * 0.12 : 0.0;

    // cantidad continua de cuadros: se reacomodan sin saltar y el nuevo crece
    float n = 3.0 + uD1 * 2.0;
    float nSlots = ceil(n - 1e-3);
    float span = (uAspect - 0.55) * 2.0;
    float cw = span / n;
    float fh = min(0.96, cw * 1.15);             // alto del marco
    float ia = clamp(hkMediaAspect(), 0.62, 1.25);
    float fw = min(fh * ia, cw * 0.78);          // ancho del marco
    fh = fw / ia;
    float cy = 0.12;
    float lampOn = (0.25 + uD4 * 0.75) * (1.0 - dark * 0.92) * (1.0 - EST.y * 0.55) * (1.0 - EST.z * 0.35) * (1.0 - bigK * 0.6);
    if (dv == 1) lampOn *= 1.0 - D.x * 0.5 * step(0.5, noise21(vec2(floor(uRTime * 4.0), 6.0)));
    float fallK = floor(ss * 2.99);

    // --- pared ---
    float dm = g20Damask(p);
    float stain = fbm(p * vec2(1.4, 2.2) + 3.0, 4, 0.55);
    vec3 wall = mix(vec3(0.050, 0.054, 0.052), vec3(0.068, 0.070, 0.064), dm * (0.3 + 0.7 * smoothstep(0.35, 0.7, stain)));
    wall *= 0.55 + 0.6 * stain;
    wall = mix(wall, vec3(0.03, 0.025, 0.02), smoothstep(0.62, 0.8, fbm(p * vec2(0.8, 3.0) + 9.0, 4, 0.5)) * 0.7);  // manchas de humedad
    float tear = smoothstep(0.66, 0.70, fbm(p * 1.3 + 17.0, 4, 0.55)) * step(WAIN_Y, p.y);           // papel arrancado
    wall = mix(wall, vec3(0.055, 0.05, 0.045) * (0.6 + 0.5 * noise21(p * 30.0)), tear);

    // zocalo y piso
    if (p.y < WAIN_Y) {
        float px = fract(p.x * 1.1);
        float panel = smoothstep(0.02, 0.05, px) * smoothstep(0.98, 0.95, px) * smoothstep(WAIN_Y - 0.02, WAIN_Y - 0.05, p.y);
        float grain = 0.6 + 0.4 * noise21(vec2(p.x * 40.0, p.y * 3.0));
        wall = vec3(0.07, 0.045, 0.03) * grain * (0.55 + 0.45 * panel);
        wall += vec3(0.10, 0.07, 0.04) * smoothstep(WAIN_Y - 0.012, WAIN_Y, p.y);   // moldura
    }
    vec3 col = wall;
    bool floorPx = p.y < FLOOR_Y;
    vec2 pw = p;
    if (floorPx) pw.y = 2.0 * FLOOR_Y - p.y;     // reflejo en el piso

    // --- luces: velas entre cuadros + lampara sobre cada cuadro ---
    vec3 light = vec3(0.012, 0.012, 0.014);
    vec3 warm = vec3(1.0, 0.74, 0.50);
    for (int k = 0; k <= 5; k++) {
        float fk = float(k);
        if (fk > nSlots) break;
        float x = -span * 0.5 + fk * cw;
        float fl = (0.8 + 0.2 * noise21(vec2(t * 5.0, fk * 3.1))) * (1.0 + EST.y * 0.8);
        if (dv == 0 && abs(fk - floor(D.w * nSlots)) < 0.5) fl *= 1.0 - D.x;
        vec2 cp = vec2(x, cy + 0.10);
        float d2 = dot((pw - cp) * vec2(0.8, 1.0), (pw - cp) * vec2(0.8, 1.0));
        light += warm * fl * lampOn * (0.55 + bass * 0.5) * 0.10 / (0.04 + d2);
    }
    for (int k = 0; k < 5; k++) {
        float fk = float(k);
        if (fk >= nSlots) break;
        float x = -span * 0.5 + (fk + 0.5) * cw;
        vec2 lp = vec2(x, cy + fh * 0.5 + 0.10);
        vec2 dq = pw - lp;
        float cone = smoothstep(0.9, 0.2, abs(dq.x) / max(-dq.y * 1.1 + 0.08, 0.02)) * step(dq.y, 0.0);
        light += vec3(1.0, 0.85, 0.65) * cone * exp(dq.y * 1.4) * (lampOn + g20Key(fk, nSlots) * 0.8) * (0.35 + bass * 0.45) * 0.55 * revealAt(n, fk);
    }
    col *= light * 6.0;

    // --- cuadros ---
    float idx = clamp(floor((pw.x + span * 0.5) / cw), 0.0, nSlots - 1.0);
    // (C: el cuadro del centro se dibuja ultimo y desde cualquier pixel)
    float midK = floor((nSlots - 1.0) * 0.5);
    for (int kk = -1; kk <= 2; kk++) {
        float k = kk == 2 ? midK : idx + float(kk);
        if (kk == 2 && bigK <= 0.0 && abs(midK - idx) <= 1.0) continue;
        if (kk == 2 && bigK <= 0.0) continue;
        if (kk < 2 && bigK > 0.0 && k == midK) continue;
        if (k < 0.0 || k >= nSlots) continue;
        float grow = revealAt(n, k);
        float hs = hash21(vec2(k, 2.0));
        float kb = g20Key(k, nSlots);
        // climax: se tuercen de a uno en el aviso y se enderezan al final
        float tilt = cph > 0.0 ? smoothstep(0.05 + k * 0.06, 0.12 + k * 0.06, cph) * (1.0 - smoothstep(0.80, 0.92, cph)) : 0.0;
        // B: una vuelta entera, cada uno a su tiempo
        float spin = TAU * smoothstep(0.0, 1.0, clamp((spinK - k * 0.08) / 0.6, 0.0, 1.0));
        float x = -span * 0.5 + (k + 0.5) * cw;
        vec2 nail = vec2(x, cy + fh * 0.5 + 0.06);
        // balanceo: medios + tiron del golpe con retraso propio
        float sw = sin(t * (0.9 + hs * 0.6) + hs * 6.28) * (0.006 + mid * 0.02);
        sw += hit * uD2 * 0.07 * sin(uRTime * (7.0 + hs * 3.0) + hs * 10.0);
        sw += hit * loco * (hs - 0.5) * 0.25;
        float fallen = step(abs(k - fallK), 0.1) * smoothstep(0.0, 0.08, fallPh) * fallE;
        sw += fallen * (hs > 0.5 ? 0.42 : -0.42) * (1.0 + 0.03 * sin(uRTime * 3.0));
        sw += tilt * (hs - 0.5) * 0.55 + spin;
        // el cuadro nuevo crece desde su clavo; C: el del centro crece hasta
        // llenar la pared y los demas se apagan
        float isMid = 1.0 - step(0.5, abs(k - floor((nSlots - 1.0) * 0.5)));
        float bigS = 1.0 + bigK * isMid * 1.3;
        vec2 bigOff = vec2(-x * bigK * isMid, (fh * 0.5 + 0.06) * (bigS - 1.0) - 0.08 * bigK * isMid);   // el centro del cuadro queda en el centro
        vec2 q = g20rot(-sw) * (pw - nail - bigOff) / max(grow * bigS, 0.05) + vec2(0.0, fh * 0.5 + 0.06);
        // alambre al clavo
        if (!floorPx) {
            vec2 qa = g20rot(-sw) * (pw - nail);
            float wire = min(hkSeg(qa, vec2(0.0), vec2(-fw * 0.35, -0.06)), hkSeg(qa, vec2(0.0), vec2(fw * 0.35, -0.06)));
            col = mix(col, vec3(0.15) * light * 5.0, hkLine(wire, 0.8) * 0.8);
        }
        float outer = hkBox(q, vec2(fw, fh) * 0.5);
        if (outer > 0.03) continue;
        // sombra del marco en la pared
        col *= mix(1.0, 0.45, (1.0 - smoothstep(-0.01, 0.05, hkBox(q - vec2(0.02, -0.03), vec2(fw, fh) * 0.5))) * step(0.0, outer));
        if (outer > 0.0) continue;
        float mb = fh * 0.10;                     // ancho de la moldura
        float inner = hkBox(q, vec2(fw, fh) * 0.5 - mb);
        vec3 lt = light * 6.0;
        if (inner > 0.0) {
            // marco tallado: perfil con bisel + ornamento a lo largo
            float e = clamp(-outer / mb, 0.0, 1.0);
            float prof = sin(e * 3.14159) * 0.7 + 0.3 * smoothstep(0.6, 0.9, e);
            float along = (abs(q.x) > fw * 0.5 - mb) ? q.y : q.x;
            float orn = 0.5 + 0.5 * sin(along * 90.0 + e * 6.0) * smoothstep(0.25, 0.5, e) * smoothstep(0.85, 0.6, e);
            float corner = 1.0 - smoothstep(0.0, mb * 1.2, length(abs(q) - (vec2(fw, fh) * 0.5 - mb * 0.5)));
            vec3 gold = vec3(0.16, 0.13, 0.08) * (0.15 + 1.1 * prof * orn) + vec3(0.12, 0.10, 0.06) * corner;
            gold *= 0.55 + 0.6 * noise21(q * 60.0 + k);
            gold *= mix(1.0, 0.35, smoothstep(0.75, 1.0, e));                  // labio interior en sombra
            col = gold * lt * 1.1 + vec3(0.5, 0.42, 0.3) * pow(prof * orn, 8.0) * 0.12 * lampOn;
        } else {
            // la imagen como oleo viejo: craquelado, barniz amarillento
            vec2 m = (q / (vec2(fw, fh) - 2.0 * mb)) + 0.5;
            vec2 c = vec2(0.5, 0.52);
            float scream = hit * (0.35 + uD3 * 0.65) + negE * 0.3 + kb * (0.6 + uD3 * 0.6);
            vec2 dm2 = m - c;
            m = c + dm2 * (1.0 + scream * 0.35 * exp(-dot(dm2, dm2) * 9.0)) * vec2(1.0, 1.0 + scream * 0.25);
            m += (vec2(noise21(m * 6.0 + uRTime), noise21(m * 6.0 - uRTime)) - 0.5) * hit * loco * 0.03;
            m.x += lookM;                                    // suceso: se corren
            // cada cuadro con su encuadre: mas cerca, corrido, en espejo
            float zk = 1.0 - 0.32 * hash21(vec2(k, 5.0)) * step(0.5, k);
            vec2 mk = (m - 0.5) * zk + 0.5 + (hash22(vec2(k, 6.0)) - 0.5) * (1.0 - zk) * vec2(0.8, 0.6) + vec2(0.0, (1.0 - zk) * 0.2);
            if (fract(k * 0.5) > 0.25) mk.x = 1.0 - mk.x;
            vec2 muv = hkMediaCover(mk, ia);
            vec3 im = hkMediaGet(muv, 0.6, has);
            float neg = clamp(uD5 * step(0.5, fract(k * 0.5)) + uD5 * 0.35 + negE + kb * exp(-keyAgeMin() * 3.0), 0.0, 1.0);
            vec3 oil = hkTone(im, 0.10, vec3(1.0, 0.86, 0.62), 1.15);
            float lum = dot(oil, vec3(0.33));
            float lp = pow(clamp(lum * 1.6, 0.0, 1.0), 1.0 / 2.2);
            oil = mix(oil, vec3(0.85, 0.9, 1.0) * pow(1.0 - lp, 2.2) * 0.45, neg);
            float crack = smoothstep(0.92, 1.0, 1.0 - abs(noise21(m * vec2(38.0, 30.0) + k * 7.0) - 0.5) * 2.0);
            oil *= 1.0 - crack * 0.35;
            oil *= 0.75 + 0.25 * noise21(m * 4.0 + k);          // barniz desparejo
            float glowSelf = dark * 0.35 + negE * 0.2;
            col = oil * (lt * 0.85 + glowSelf + bigK * isMid * 0.6) * (1.0 - bigK * (1.0 - isMid) * 0.7);
            col *= 1.0 - 0.35 * smoothstep(0.25, 0.75, length((m - 0.5) * vec2(1.0, 0.8)));   // marco hace sombra
        }
    }

    // --- suceso: un cuadro sangra por debajo del marco ---
    if (sv == 4 && se > 0.0 && !floorPx) {
        float k5 = floor(ss * (nSlots - 0.01));
        float x5 = -span * 0.5 + (k5 + 0.5) * cw;
        float bottom = cy - fh * 0.5 + 0.06 - 0.06;
        float cx5 = floor((p.x - x5) / 0.035);
        float h5 = hash21(vec2(cx5, k5));
        float len = smoothstep(0.05, 0.8, sp) * (0.15 + 0.5 * h5) * step(abs(p.x - x5), fw * 0.4) * step(0.3, h5);
        float xd = (cx5 + 0.5) * 0.035 + x5;
        float dd = max(abs(p.x - xd) - 0.006 * (1.0 + h5), max(p.y - bottom, bottom - len - p.y));
        dd = min(dd, length(vec2(p.x - xd, (p.y - (bottom - len)) * 0.8)) - 0.009 * (1.0 + h5));
        col = mix(col, vec3(0.20, 0.0, 0.0) * (0.4 + light * 2.0), (1.0 - smoothstep(-0.002, 0.002, dd)) * step(0.01, len) * se);
    }
    // --- suceso: pasa una sombra por la pared ---
    if (sv == 3 && se > 0.0 && !floorPx) {
        vec2 sq = (p - vec2(mix(-uAspect - 0.5, uAspect + 0.5, ss > 0.5 ? sp : 1.0 - sp), -0.05)) / 0.55;
        float sh = min(length(sq - vec2(0.0, 0.62)) - 0.16, length(max(abs(sq - vec2(0.0, -0.1)) - vec2(0.22 - sq.y * 0.08, 0.6), 0.0)) - 0.08);
        col *= 1.0 - 0.75 * (1.0 - smoothstep(-0.08, 0.08, sh)) * se;
    }
    // --- detalle: una arana baja por su hilo ---
    if (dv == 3) {
        vec2 ap = vec2((D.w - 0.5) * span, 1.0 - D.y * 0.7);
        col += vec3(0.4) * (1.0 - smoothstep(0.0, 0.002, abs(p.x - ap.x))) * step(ap.y, p.y) * 0.3 * D.x * lampOn;
        col = mix(col, vec3(0.01), (1.0 - smoothstep(0.012, 0.018, length((p - ap) * vec2(1.0, 1.3)))) * D.x);
    }

    // --- candelabros de pared (entre cuadros) ---
    if (!floorPx && uD4 > 0.02 && bigK < 0.15) {        // (con el cuadro gigante no se ven)
        float k2 = floor((p.x + span * 0.5) / cw + 0.5);
        if (k2 >= 0.0 && k2 <= nSlots) {
            float x = -span * 0.5 + k2 * cw;
            vec2 b = vec2(x, cy + 0.02);
            float arm = min(hkSeg(p, b + vec2(0.0, -0.10), b), hkRBox(p - (b + vec2(0.0, -0.12)), vec2(0.025, 0.02), 0.01));
            col = mix(col, vec3(0.020, 0.018, 0.016) * (light * 3.0 + 0.3), (1.0 - smoothstep(0.0, 0.006, arm - 0.006)));
            vec4 cd = hkCandle(p, b, 0.012, 0.07, t + k2 * 3.0, k2);
            col = mix(col, cd.rgb * (0.4 + 0.6 * lampOn), cd.a * step(0.02, lampOn));
            col += vec3(1.0, 0.55, 0.2) * exp(-length(p - b - vec2(0.0, 0.10)) * 9.0) * lampOn * 0.25;
        }
        // lamparas de galeria (barra de bronce)
        float k3 = floor((p.x + span * 0.5) / cw);
        if (k3 >= 0.0 && k3 < nSlots && revealAt(n, k3) > 0.5) {
            float x = -span * 0.5 + (k3 + 0.5) * cw;
            vec2 lp = vec2(x, cy + fh * 0.5 + 0.10);
            float bar = hkRBox(p - lp, vec2(fw * 0.28, 0.012), 0.01);
            col = mix(col, vec3(0.12, 0.10, 0.06) + vec3(1.0, 0.85, 0.6) * lampOn * 0.5 * smoothstep(0.0, -0.01, p.y - lp.y), 1.0 - smoothstep(0.0, 0.004, bar));
        }
    }

    // --- piso: reflejo apagado + tablas ---
    if (floorPx) {
        float boards = 0.6 + 0.4 * noise21(vec2(p.x * 2.0 + floor(p.y * 14.0) * 3.1, p.y * 60.0));
        float seam = smoothstep(0.02, 0.0, abs(fract(p.y * 14.0) - 0.5) - 0.47);
        vec3 wood = vec3(0.05, 0.032, 0.02) * boards * (1.0 - seam * 0.5);
        float fres = 0.25 + 0.35 * smoothstep(FLOOR_Y, FLOOR_Y - 0.25, p.y);
        col = wood + col * fres * (1.0 - 0.5 * noise21(p * vec2(3.0, 40.0)));
    }

    // --- placas de bronce bajo cada cuadro ---
    if (!floorPx) {
        float k4 = floor((p.x + span * 0.5) / cw);
        if (k4 >= 0.0 && k4 < nSlots && revealAt(n, k4) > 0.5) {
            vec2 pq = p - vec2(-span * 0.5 + (k4 + 0.5) * cw, cy - fh * 0.5 - 0.07);
            float pl = hkRBox(pq, vec2(0.075, 0.022), 0.004);
            float txt = step(0.55, noise21(vec2(floor(pq.x * 160.0), k4))) * step(abs(pq.y - 0.004), 0.004) * step(abs(pq.x), 0.06)
                      + step(0.6, noise21(vec2(floor(pq.x * 220.0), k4 + 9.0))) * step(abs(pq.y + 0.009), 0.003) * step(abs(pq.x), 0.045);
            col = mix(col, vec3(0.13, 0.10, 0.06) * (light * 5.0 + 0.1) * (1.0 - txt * 0.7), 1.0 - smoothstep(0.0, 0.003, pl));
        }
    }

    // --- cortinas de terciopelo a los costados ---
    float cx = abs(p.x) - (uAspect - 0.42 - 0.04 * sin(p.y * 2.0 + 1.0));
    if (cx > 0.0) {
        float fold = sin((abs(p.x) * 26.0 + noise21(vec2(p.y * 2.0, 1.0)) * 2.0) + sin(p.y * 1.3) * 1.5);
        float sh = 0.25 + 0.75 * (0.5 + 0.5 * fold);
        vec3 vel = vec3(0.10, 0.025, 0.03) * sh * (0.5 + 0.8 * smoothstep(1.0, -0.6, p.y));
        vel *= 0.55 + light * 2.5;
        float edge = smoothstep(0.0, 0.03, cx);
        col = mix(col * 0.6, vel, edge);
        // borla dorada
        vec2 tq = vec2(cx - 0.06, p.y - 0.05);
        float tas = length(tq * vec2(1.0, 0.6)) - 0.035;
        col = mix(col, vec3(0.16, 0.12, 0.06) * (0.4 + light * 3.0), 1.0 - smoothstep(0.0, 0.006, tas));
    }
    // --- cordon de museo adelante (postes de bronce) ---
    {
        float post = 1.2;
        float px2 = mod(p.x + post * 0.5, post) - post * 0.5;
        float stand = hkRBox(vec2(px2, p.y + 0.86), vec2(0.018, 0.16), 0.008);
        float knob = length(vec2(px2, p.y + 0.69)) - 0.03;
        float sag = -0.74 - 0.06 * (1.0 - pow(px2 / (post * 0.5), 2.0));
        float rope = abs(p.y - sag) - 0.012;
        vec3 brass = vec3(0.14, 0.11, 0.06) * (0.5 + 0.9 * smoothstep(0.018, -0.018, px2)) * (0.4 + light * 3.0);
        col = mix(col, vec3(0.09, 0.015, 0.02) * (0.5 + light * 2.0) * (0.6 + 0.4 * sin(p.x * 120.0)), 1.0 - smoothstep(0.0, 0.004, rope));
        col = mix(col, brass, 1.0 - smoothstep(0.0, 0.004, min(stand, knob)));
    }

    // --- polvo en la luz y telaranas ---
    float dust = hkParticles(p * 0.8, t * 0.4, 0.10 + uD6 * 0.25 + EST.z * 0.2 + (dv == 2 ? D.x * 0.3 : 0.0), vec2(0.15, -0.3), 0.05);
    col += vec3(0.9, 0.8, 0.65) * dust * (0.02 + high * 0.05 + uD6 * 0.03) * (0.3 + lampOn);
    float web = hkCornerWeb(p, vec2(-uAspect, 1.0), 0.55 + uD6 * 0.35) + hkCornerWeb(p, vec2(uAspect, 1.0), 0.45 + uD6 * 0.4);
    col = mix(col, vec3(0.45, 0.43, 0.40) * (0.15 + light * 2.0), clamp(web, 0.0, 1.0) * (0.25 + uD6 * 0.6));

    // apagon: casi negro, las imagenes quedan
    col *= 1.0 - dark * 0.35;
    // --- EASTER EGG "JAY INFINITO" (fase 38): bajo el cuadro del medio
    // (el de la derecha) aparece una placa de bronce: "J.INFINITO 1666" ---
    vec2 EG = hkEgg(20.0);
    if (EG.x > 0.0 && !floorPx) {
        float xm = -span * 0.5 + (min(midK + 1.0, nSlots - 1.0) + 0.5) * cw;   // el de al lado: el del medio tiene el candelabro adelante
        vec2 pq = p - vec2(xm, cy - fh * 0.5 - 0.08);
        float plate = hkBox(pq, vec2(0.30, 0.050));
        if (plate < 0.02) {
            vec3 brass = vec3(0.55, 0.40, 0.16) * (0.35 + light * 2.6) * (0.85 + 0.15 * sin(pq.x * 60.0 + pq.y * 20.0));
            brass += vec3(1.0, 0.85, 0.5) * exp(-pow((pq.y - 0.03) / 0.01, 2.0)) * 0.15 * (0.3 + light * 3.0);  // canto de arriba
            float dt = hkText(pq / 0.042, int[16](74, 46, 73, 78, 70, 73, 78, 73, 84, 79, 32, 49, 54, 54, 54, 0), 15) * 0.042;
            brass = mix(brass, brass * 0.25, 1.0 - smoothstep(0.0025, 0.005, dt));        // letras grabadas
            float a = (1.0 - smoothstep(0.0, 0.003, plate)) * EG.x;
            col = mix(col, col * 0.5, (1.0 - smoothstep(0.0, 0.02, plate - 0.004)) * EG.x * 0.5);   // sombra
            col = mix(col, brass, a);
        }
    }
    return vec4(hkFinish(col, uv, vec3(0.35, 0.3, 0.25)), 1.0);
}
