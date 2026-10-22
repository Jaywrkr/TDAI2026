// ===============================================================
// HALLOWEEN 25 - POSESION (usa la carpeta Media)
// Un cuarto de exorcismo a la luz de las velas: pared rajada con cruces
// invertidas y marcas de unas, candelabros a los costados y un circulo
// de tiza con runas en el piso. En la pared, la imagen de la carpeta
// Media poseida: casi en gris, partida en tiras que se corren, en
// espejo (todo se vuelve simetrico), con venas negras que avanzan desde
// los bordes. Lo oscuro de la imagen rodeado de luz (ojos, boca) brilla
// rojo cuando la posesion sube.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> las venas laten y las velas crecen
//   medios -> las tiras se deslizan despacio
//   agudos -> estatica fina sobre la imagen
//   golpe  -> las tiras saltan a los costados y la imagen se desdobla;
//             con Chaos se invierte y la camara tiembla fuerte
// PIANO: cada tecla da un tiron a la tira de la imagen a la altura de la
//   nota (grave abajo) y hace brillar los ojos; la fuerza: mas tiron;
//   apretada, la tira tiembla corrida.
// Speed mueve las tiras, el humo y las llamas aun en silencio.
// REPERTORIO (fase 34, motor hkSuceso del kit, version liviana):
//   ESTADOS (~5 min): velas, las venas (avanzan mas) y frio (las velas
//     bajan y la luz se vuelve azulada).
//   SUCESOS (~55 s, 5): se encienden los ojos; las velas se avivan todas
//     juntas; la imagen se da vuelta (cabeza abajo) y vuelve; aparecen
//     aranazos nuevos en la pared; las tiras se desordenan.
//   DETALLES (~30 s, 4): una vela se apaga, una gota negra baja por
//     la imagen, una cruz gira, una sombra cruza por el costado.
//   CLIMAX (~4 min, 20 s, rotan 3 guiones en tres tiempos):
//     A la posesion: se avivan las velas y se encienden los ojos; las
//       venas llegan al centro con tirones, espejo e inversion; despues
//       todo queda rojo y las venas se retiran despacio.
//     B el exorcismo: el circulo de tiza se enciende runa por runa, la
//       imagen se sacude y al final una luz blanca la limpia.
//     C los ojos en la pared: se abren ojos rojos por toda la pared,
//       miran a la imagen y despues se cierran.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A mas largo.
// @EST: velas | las venas | frio
// @SUC: los ojos | las velas | se da vuelta | aranazos | las tiras
// @DET: una vela | gota negra | la cruz | una sombra
// @CLX: A la posesion | B el exorcismo | C los ojos en la pared
//
// @D1: cantidad de tiras (sin saltos)
// @D2: cuanto saltan con el golpe
// @D3: espejo (simetria)
// @D4: venas
// @D5: tono (gris <-> rojo)
// @D6: sombras que entran por los bordes
// ===============================================================

const float FLOOR_Y = -0.70;

float p25Veins(vec2 p, float t) {
    // venas: lineas de ruido "ridge" ramificadas
    float v = 0.0;
    float a = 1.0;
    vec2 q = p;
    for (int i = 0; i < 3; i++) {
        float n = noise21(q * 4.0 + float(i) * 7.3 + vec2(0.0, t * 0.02));
        v = max(v, (1.0 - smoothstep(0.0, 0.018 * a + 0.006, abs(n - 0.5))) * a);
        q = q * 2.1 + 3.1;
        a *= 0.6;
    }
    return v;
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
    hkSetClimax(71.0, 20.0, 26.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(71.0, 5, 8.0);
    int sv = int(S.z);
    float se = S.x, sph = S.y, ss = S.w;
    vec4 D = hkDetalle(71.0, 4, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(71.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(71.0, 3));
    float cph = C.w;
    float eyesE = max(sv == 0 ? se : 0.0, cA * smoothstep(0.15, 0.28, cph) * (1.0 - smoothstep(0.88, 1.0, cph)));
    float possE = cA * C.y;
    float flareE = max(sv == 1 ? se : 0.0, cA * C.x * (1.0 - C.y) * 0.8);
    float poss = clamp(possE + hit * loco * 0.6, 0.0, 1.0);
    // secuelas: la imagen queda roja y las venas se retiran despacio
    float after = cA * C.z;
    // B: el exorcismo (runas que se encienden, sacudon, luz blanca al final)
    float exo = cB * smoothstep(0.05, 0.6, C.w) * (1.0 - smoothstep(0.85, 1.0, C.w));
    float exoW = cB * smoothstep(0.62, 0.72, C.w) * (1.0 - smoothstep(0.74, 0.95, C.w));
    // C: los ojos en la pared
    float wallEyes = cC * smoothstep(0.05, 0.35, C.w) * (1.0 - smoothstep(0.80, 0.97, C.w));
    float flipE = sv == 2 ? se * smoothstep(0.15, 0.35, sph) * (1.0 - smoothstep(0.65, 0.85, sph)) : 0.0;
    float scrE = sv == 3 ? se * smoothstep(0.05, 0.6, sph) : 0.0;
    float stripE = sv == 4 ? se : 0.0;
    float keyEyes = 0.0;
    for (int k = 0; k < N_KEYS; k++) keyEyes = max(keyEyes, keyEnv(k, 0.03, 0.8) * (0.5 + keyVel(k) * 0.6));

    // temblor extra en la posesion
    p += (vec2(noise21(vec2(uRTime * 30.0, 1.0)), noise21(vec2(uRTime * 30.0, 2.0))) - 0.5) * 0.04 * max(possE, exo * 0.5);

    // --- luz de velas ---
    float fl = (1.0 + flareE * 1.2 + bass * 0.4) * (1.0 - EST.z * 0.45);
    int outK = dv == 0 ? int(D.w * 5.99) : -1;          // detalle: una vela se apaga
    vec3 L = mix(vec3(0.020, 0.016, 0.016), vec3(0.012, 0.016, 0.026), EST.z);
    for (int k = 0; k < 6; k++) {
        float fk = float(k);
        float sx = (fk < 3.0 ? -1.0 : 1.0) * (uAspect - 0.40 - mod(fk, 3.0) * 0.16);
        vec2 cp = vec2(sx, -0.22 + mod(fk, 3.0) * 0.10);
        float f = (0.8 + 0.2 * noise21(vec2(t * 6.0, fk * 3.0))) * (k == outK ? 1.0 - D.x * 0.9 : 1.0);
        L += vec3(1.0, 0.70, 0.48) * f * fl * 0.022 / (0.02 + dot(p - cp, p - cp));
    }

    // --- pared ---
    float n1 = fbm(p * 2.5 + 3.0, 5, 0.55);
    vec3 wall = vec3(0.16, 0.14, 0.13) * (0.5 + 0.7 * n1);
    wall *= 1.0 - 0.55 * hkLine(fbm(p * vec2(1.0, 2.0) + 9.0, 4, 0.55) - 0.5, 1.2);       // rajaduras
    // marcas de unas (4 surcos) en los costados
    for (int s = 0; s < 2; s++) {
        float sgn = s == 0 ? -1.0 : 1.0;
        vec2 cq = p - vec2(sgn * (uAspect - 0.95), 0.35);
        for (int k = 0; k < 4; k++) {
            float fk = float(k);
            float d = hkSeg(cq, vec2(fk * 0.05, 0.25 - fk * 0.02), vec2(fk * 0.05 + 0.10 * sgn, -0.22 - fk * 0.03));
            wall *= 1.0 - 0.7 * (1.0 - smoothstep(0.0, 0.008, d));
        }
    }
    // suceso: aranazos nuevos que se van marcando
    if (scrE > 0.0) {
        vec2 cq = p - vec2((ss - 0.5) * 2.0 * (uAspect - 0.9), -0.15 + fract(ss * 7.3) * 0.5);
        for (int k = 0; k < 4; k++) {
            float fk = float(k);
            vec2 a0 = vec2(fk * 0.06, 0.20 - fk * 0.02);
            vec2 a1 = vec2(fk * 0.06 + 0.14, -0.24 - fk * 0.03);
            float d = hkSeg(cq, a0, mix(a0, a1, clamp(scrE * 1.6 - fk * 0.12, 0.0, 1.0)));
            wall *= 1.0 - 0.8 * (1.0 - smoothstep(0.0, 0.009, d)) * step(0.01, scrE);
        }
    }
    // cruces invertidas (detalle: una gira)
    for (int s = 0; s < 2; s++) {
        float sgn = s == 0 ? -1.0 : 1.0;
        vec2 xq = p - vec2(sgn * (uAspect - 0.62), 0.30);
        xq = vec2(xq.x, -xq.y);
        if (dv == 2 && s == int(D.w * 1.99)) { float ca = cos(D.x * PI), sa = sin(D.x * PI); xq = mat2(ca, -sa, sa, ca) * (xq + vec2(0.0, 0.05)) - vec2(0.0, 0.05); }
        xq.x += sin(t * 0.7 + float(s)) * xq.y * 0.05 + hit * loco * 0.02 * sgn;
        float cr = min(hkBox(xq - vec2(0.0, -0.02), vec2(0.018, 0.16)), hkBox(xq - vec2(0.0, 0.05), vec2(0.075, 0.016)));
        wall = mix(wall, vec3(0.05, 0.04, 0.035), 1.0 - smoothstep(0.0, 0.004, cr));
        wall *= mix(1.0, 0.6, (1.0 - smoothstep(0.0, 0.03, min(hkBox(xq - vec2(0.02, -0.04), vec2(0.018, 0.16)), hkBox(xq - vec2(0.02, 0.03), vec2(0.075, 0.016))))));
    }
    vec3 col = wall * L * 4.0;
    // C: ojos rojos que se abren por toda la pared y miran a la imagen
    if (wallEyes > 0.0) {
        vec2 eg = p * vec2(3.2, 3.6);
        vec2 eid = floor(eg);
        vec2 eh = hash22(eid + 17.0);
        vec2 ec = (eid + 0.25 + eh * 0.5) / vec2(3.2, 3.6);
        // fuera de la imagen y arriba del piso
        float far = (1.0 - step(abs(ec.x), 1.0) * step(abs(ec.y - 0.06), 0.85)) * step(FLOOR_Y + 0.08, ec.y);
        float open = smoothstep(eh.x * 0.5, eh.x * 0.5 + 0.3, wallEyes) * step(0.35, eh.y) * far;
        if (open > 0.0) {
            vec2 eq = (p - ec) / vec2(0.06, 0.06);
            float blinkE = 1.0 - smoothstep(0.92, 1.0, sin(uRTime * 0.8 + eh.x * 20.0));
            float lid = length(vec2(eq.x, eq.y / max(open * 0.45 * blinkE, 0.02))) - 1.0;
            vec2 look = normalize(vec2(0.0, 0.06) - ec + 1e-4) * 0.35;
            float pup = length(eq - look) - 0.32;
            vec3 ecol = mix(vec3(0.8, 0.05, 0.02) * (1.2 + bass), vec3(0.0), 1.0 - smoothstep(-0.05, 0.05, pup));
            col = mix(col, ecol, (1.0 - smoothstep(-0.08, 0.08, lid)) * open);
        }
    }

    // B: un circulo de runas en la pared, alrededor de la imagen, que se
    // enciende runa por runa
    if (exo > 0.0) {
        vec2 rq = (p - vec2(0.0, 0.06)) / vec2(1.25, 0.98);
        float rr = length(rq);
        float ra = atan(rq.y, rq.x) / 6.2832 + 0.5;
        float cell = floor(ra * 24.0);
        vec2 gq = vec2(fract(ra * 24.0) - 0.5, (rr - 1.0) * 12.0);
        float gh = hash21(vec2(cell, 4.0));
        float glyph = min(hkSeg(gq, vec2(-0.25, -0.4), vec2(0.25 * sign(gh - 0.5), 0.4)), hkSeg(gq, vec2(-0.25, mix(-0.1, 0.2, gh)), vec2(0.25, mix(0.2, -0.2, gh))));
        glyph = min(glyph, abs(abs(gq.y) - 0.65));
        float on = step(cell / 24.0, exo * 1.15);
        float gl = (1.0 - smoothstep(0.04, 0.10, glyph)) * step(abs(gq.y), 0.75) * on;
        col += vec3(1.0, 0.75, 0.45) * gl * (0.8 + bass * 0.6) * (1.0 - exoW * 0.5);
        col += vec3(0.9, 0.5, 0.25) * exp(-abs(rr - 1.0) * 14.0) * 0.08 * exo;
    }

    // --- piso con circulo de tiza ---
    if (p.y < FLOOR_Y) {
        vec3 fl2 = vec3(0.07, 0.06, 0.055) * (0.5 + 0.6 * fbm(p * vec2(2.0, 8.0), 4, 0.5));
        vec2 cq = vec2(p.x, (p.y - FLOOR_Y + 0.55) * 4.0);
        float r = length(cq);
        float ring = hkLine(r - 1.25, 1.5) + hkLine(r - 1.12, 1.0);
        float a = atan(cq.y, cq.x);
        float rune = step(0.55, noise21(vec2(floor(a * 18.0), 3.0))) * step(abs(r - 1.185), 0.04) * step(0.3, fract(a * 18.0));
        // B: las runas se encienden una por una alrededor del circulo
        float runeOn = exo * step(fract(a / 6.2832 + 0.5), exo * 1.2);
        float chalk = clamp(ring + rune, 0.0, 1.0) * (0.6 + 0.4 * noise21(p * 90.0));
        fl2 = mix(fl2, vec3(0.55, 0.52, 0.48), chalk * 0.7);
        col = fl2 * (L * 4.0 + 0.04) + vec3(0.6, 0.1, 0.05) * chalk * (0.04 + eyesE * 0.2 + possE * 0.2)
            + vec3(1.0, 0.85, 0.6) * (rune + ring * 0.4) * runeOn * (0.8 + bass * 0.5) + vec3(0.9, 0.9, 1.0) * chalk * exoW;
    }

    // --- la imagen poseida ---
    float ia = clamp(hkMediaAspect(), 0.7, 1.8);
    vec2 HS = vec2(0.76 * ia, 0.76);
    HS = min(HS, vec2(uAspect - 0.75, 0.76));
    vec2 IC = vec2(0.0, 0.06);
    vec2 iq = (p - IC) / (2.0 * HS) + 0.5;
    iq.y = mix(iq.y, 1.0 - iq.y, smoothstep(0.0, 1.0, flipE));       // suceso: se da vuelta
    float inside = step(abs(iq.x - 0.5), 0.5) * step(abs(iq.y - 0.5), 0.5);
    // bordes comidos: la imagen no termina recta, se deshace en la pared
    float eat = fbm(iq * 6.0, 3, 0.5) * 0.10;
    float ed = min(min(iq.x, 1.0 - iq.x), min(iq.y, 1.0 - iq.y));
    float edgeA = smoothstep(0.0, 0.06 + eat, ed - eat * 0.5);
    if (inside > 0.5 && edgeA > 0.0) {
        // tiras horizontales que se corren
        float strips = 6.0 + uD1 * 26.0 + poss * 20.0 + stripE * 8.0;
        float sid = floor(iq.y * strips);
        float hs = hash21(vec2(sid, floor(uRTime * (1.0 + poss * 8.0 + stripE * 2.0))));
        float drift = (noise21(vec2(sid * 0.7, t * 0.25)) - 0.5) * 0.03 * (0.3 + mid * 2.0);
        float jumpX = (hs - 0.5) * hit * uD2 * 0.25 + (hs - 0.5) * (poss * 0.4 + stripE * 0.3 + exo * 0.15 * step(0.6, hs));
        // piano: tiron en la tira a la altura de cada tecla
        for (int k = 0; k < N_KEYS; k++) {
            float e = keyEnv(k, 0.03, 0.8);
            if (e < 0.01) continue;
            float band = exp(-pow((iq.y - mix(0.06, 0.94, keyPos(k))) / (0.03 + keyVel(k) * 0.05), 2.0));
            float dir = fract(keyPos(k) * 9.1) > 0.5 ? 1.0 : -1.0;
            jumpX += band * e * dir * (0.06 + keyVel(k) * 0.14) * (1.0 + keyHeld(k) * 0.25 * sin(uKclock * 25.0));
        }
        vec2 m = vec2(iq.x + drift + jumpX, iq.y);
        // espejo: se vuelve simetrico desde el centro
        float mir = clamp(uD3 + poss * 0.5, 0.0, 1.0);
        vec2 mm = vec2(0.5 - abs(m.x - 0.5), m.y);
        vec2 muv = hkMediaCover(fract(m), ia);
        vec2 muvM = hkMediaCover(fract(mm), ia);
        vec3 a0 = hkMediaGet(muv, 0.3, has);
        vec3 a1 = hkMediaGet(muvM, 0.3, has);
        vec3 im = mix(a0, a1, mir);
        // desdoble con el golpe (imagen fantasma corrida)
        vec3 dbl = hkMediaGet(hkMediaCover(fract(m + vec2(0.03 + poss * 0.05, 0.0)), ia), 1.0, has);
        im = mix(im, max(im, dbl * 0.8), hit * 0.5 + poss * 0.5);
        vec3 tint = mix(vec3(0.85, 0.85, 0.88), vec3(0.95, 0.50, 0.46), clamp(uD5 + after * 0.7 + poss * 0.4, 0.0, 1.0));
        im = hkTone(im, 0.0, tint, 1.25);
        // ojos: lo oscuro rodeado de luz brilla rojo (contraste local)
        float lC = dot(im, vec3(0.33));
        float lB = dot(hkTone(hkMediaGet(muv, 5.5, has), 0.0, vec3(1.0), 1.25), vec3(0.33));
        float pC = pow(max(lC, 0.0), 0.4545), pB = pow(max(lB, 0.0), 0.4545);   // en escala perceptual
        float hole = smoothstep(0.10, 0.18, pB - pC) * smoothstep(0.22, 0.12, pC) * smoothstep(0.20, 0.28, pB);
        float eyesK = clamp(eyesE + poss + hit * loco * 0.5 + keyEyes, 0.0, 1.0);
        // estatica fina
        im += (hash21(iq * vec2(800.0, 600.0) + fract(uRTime * 13.0) * 50.0) - 0.5) * (0.02 + high * 0.08);
        // linea separadora entre tiras corridas
        im *= 1.0 - 0.6 * smoothstep(0.08, 0.0, abs(fract(iq.y * strips) - 0.5) - 0.42) * step(0.01, abs(jumpX));
        // inversion con locura
        float inv = poss * step(0.5, fract(uRTime * 1.5)) + hit * loco * step(0.75, loco);   // a lo sumo 1.5 veces/s
        float lp = pow(clamp(lC * 1.5, 0.0, 1.0), 1.0 / 2.2);
        im = mix(im, tint * pow(1.0 - lp, 2.2) * 0.5, clamp(inv, 0.0, 1.0));
        vec3 imgC = im * (0.95 + L * 3.0);
        imgC = mix(imgC, vec3(1.0, 0.05, 0.025) * (2.0 + bass * 1.5), hole * max(eyesK, wallEyes * 0.8));
        imgC = mix(imgC, vec3(0.95, 0.95, 1.0) * (0.6 + lC), exoW * 0.85);   // B: la luz blanca la limpia
        col = mix(col * 0.4, imgC, edgeA);
    }

    // --- venas negras que avanzan desde los bordes ---
    {
        vec2 sq = p / vec2(uAspect, 1.0);
        float edgeD = 1.0 - max(abs(sq.x), abs(sq.y));                // 0 en el borde
        float reach = 0.18 + uD4 * 0.35 + poss * 0.9 + after * 0.45 + cA * C.x * 0.25 + bass * 0.06 + EST.y * 0.2 - exoW * 0.3;
        float grow = smoothstep(reach, reach - 0.25, edgeD + (noise21(p * 2.0) - 0.5) * 0.15);
        float v = p25Veins(p * vec2(1.0, 1.4), t) * grow * smoothstep(0.0, 0.05, uD4 + poss + after + cA * C.x + EST.y);
        // detalle: una gota negra cae del borde de abajo de la imagen
        if (dv == 1) {
            float gx = IC.x + (D.w - 0.5) * HS.x * 1.2, gtop = IC.y + HS.y * 0.85, gy = gtop - D.y * D.y * 1.3;
            float gd = min(length((p - vec2(gx, gy)) / vec2(1.0, 1.5)) - 0.02, hkSeg(p, vec2(gx, gtop), vec2(gx, gy)) - 0.005);
            v = max(v, (1.0 - smoothstep(0.0, 0.004, gd)) * D.x);
        }
        col = mix(col, vec3(0.008, 0.0, 0.0) + vec3(0.25, 0.0, 0.0) * bass * v * 0.3, clamp(v * 1.2, 0.0, 0.95));
    }
    // --- sombras que entran por los bordes ---
    if (dv == 3) {                                   // detalle: una sombra cruza por el costado
        float sx = mix(-uAspect - 0.3, -uAspect * 0.45, sin(D.y * PI)) * (D.w > 0.5 ? -1.0 : 1.0);
        float sd = length((p - vec2(sx, -0.1)) / vec2(0.18, 0.7)) - 1.0;
        col *= 1.0 - (1.0 - smoothstep(-0.3, 0.2, sd)) * 0.8 * D.x;
    }
    if (uD6 > 0.02) {
        float sm = fbm(vec2(p.x * 1.2 + t * 0.05 * sign(p.x), p.y * 1.5 - t * 0.04), 4, 0.55);
        float side = smoothstep(uAspect * 0.45, uAspect, abs(p.x) + sm * 0.5);
        col *= 1.0 - side * uD6 * 0.85;
    }

    // EASTER EGG "JAY INFINITO" (fase 38): junto a la imagen aparece un sello
    // quemado en la pared: un circulo de runas con un infinito adentro y
    // JAY debajo, que brilla como brasa
    vec2 EG = hkEgg(25.0);
    if (EG.x > 0.0) {
        vec2 sealC = vec2(IC.x + HS.x + 0.34, 0.30);
        vec2 q = p - sealC;
        if (abs(q.x) < 0.5 && abs(q.y) < 0.28) {
            float r = length(q);
            float ring = abs(r - 0.17) - 0.006;
            float ra = atan(q.y, q.x) / 6.2832 + 0.5;
            float tick = abs(fract(ra * 16.0) - 0.5) * 0.17 * 6.2832 / 16.0 * 2.0;
            ring = min(ring, max(abs(r - 0.205) - 0.004, tick - 0.006));
            float inf = hkInfD(q / 0.11, 0.85) * 0.11 - 0.008;
            float d = min(ring, inf);
            float burn = smoothstep(0.05, 0.4, EG.y);
            float m = (1.0 - smoothstep(0.0, 0.006, d)) * burn * EG.x;
            col = mix(col, col * 0.3, m);
            col += vec3(1.0, 0.35, 0.10) * m * (0.6 + bass * 0.6) + vec3(1.0, 0.3, 0.1) * exp(-max(d, 0.0) / 0.02) * 0.10 * burn * EG.x;
        }
        float dj = hkText((p - sealC - vec2(0.0, -0.30)) / 0.07, int[16](74, 65, 89, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 3) * 0.07;
        float mj = (1.0 - smoothstep(0.004, 0.008, dj)) * smoothstep(0.35, 0.6, EG.y) * EG.x;
        col = mix(col, vec3(1.0, 0.45, 0.15) * (0.7 + bass * 0.5), mj);
    }
    // --- candelabros y velas (adelante) ---
    for (int k = 0; k < 6; k++) {
        float fk = float(k);
        float sx = (fk < 3.0 ? -1.0 : 1.0) * (uAspect - 0.40 - mod(fk, 3.0) * 0.16);
        if (abs(p.x - sx) > 0.10) continue;
        float by = -0.32 + mod(fk, 3.0) * 0.10;
        float h = 0.10 + 0.06 * hash21(vec2(fk, 2.0));
        vec4 cd = hkCandle(p, vec2(sx, by), 0.020, h, t + fk, fk);
        float stand = min(hkRBox(p - vec2(sx, by - 0.02), vec2(0.04, 0.012), 0.006), hkBox(p - vec2(sx, (by - 0.02 + FLOOR_Y) * 0.5), vec2(0.008, (by - 0.02 - FLOOR_Y) * 0.5)));
        col = mix(col, vec3(0.04, 0.035, 0.03) * (L * 4.0 + 0.05), 1.0 - smoothstep(0.0, 0.004, stand));
        col = mix(col, cd.rgb * (0.8 + flareE * 0.6), cd.a);
    }
    return vec4(hkFinish(col, uv, vec3(0.35, 0.05, 0.05)), 1.0);
}
