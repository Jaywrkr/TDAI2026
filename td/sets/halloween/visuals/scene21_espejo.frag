// ===============================================================
// HALLOWEEN 21 - ESPEJO MALDITO (usa la carpeta Media)
// Un bano viejo de noche: azulejos gastados con moho y manchas de agua,
// un espejo ovalado con marco de hierro sobre un lavabo, velas en el
// borde del lavabo y una bombita colgando que parpadea. Adentro del
// espejo no se ve el cuarto: se ve la imagen de la carpeta Media,
// empanada por el vapor, fria y casi sin color.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la bombita y las velas laten; el vapor respira
//   medios -> la imagen ondula como agua detras del vidrio
//   agudos -> brillos en las gotas del vidrio
//   golpe  -> el vidrio se raja desde un punto y cada pedazo corre la
//             imagen; con Chaos se rompe mas y la imagen se invierte
// PIANO: cada tecla raja el vidrio desde un punto a la altura de la nota
//   (grave a la izquierda): una estrella de grietas que crece mientras la
//   tecla siga apretada (la fuerza: mas grande) y se cierra al soltarla.
// Speed mueve el vapor, las velas y las gotas aun en silencio.
// HISTORIA: cada ~71 s una mano limpia el vapor y la imagen se ve clara;
// cada ~47 s se corta la luz y solo queda la imagen en el espejo.
// CLIMAX (~59 s, 20 s, en tres tiempos): el vapor cubre todo el espejo y
//   la bombita tiembla; una mano lo limpia y la imagen aparece nitida; el
//   espejo se raja entero y los pedazos corren la imagen. Cada ~4.5 min
//   con apagon al final (gran climax).
//
// @D1: vapor en el vidrio
// @D2: rajaduras con el golpe
// @D3: cuanto corren los pedazos
// @D4: fantasma (imagen en negativo y transparente)
// @D5: tono (frio <-> rojo)
// @D6: velas
// ===============================================================

const vec2 MC = vec2(0.0, 0.16);       // centro del espejo
const vec2 MR = vec2(0.46, 0.64);      // radios del ovalo
const float SINK_Y = -0.64;

// voronoi: (distancia al borde, id de la celda)
vec3 e21Vor(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 9.0, d2 = 9.0;
    vec2 id = vec2(0.0);
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(x, y);
        vec2 o = g + hash22(i + g);
        float d = length(o - f);
        if (d < d1) { d2 = d1; d1 = d; id = i + g; }
        else if (d < d2) d2 = d;
    }
    return vec3(d2 - d1, id);
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

    vec4 G = hkGrandClimax(30.0);
    vec4 C = hkClimaxOr(G, hkClimax(30.0, 59.0, 20.0));
    float cph = C.w;
    float fogUp = C.x * (1.0 - C.y) * (1.0 - C.z);                  // aviso: vapor
    float crackE = C.z;                                              // secuelas: se raja
    float wipeC = smoothstep(0.34, 0.40, cph) * (1.0 - smoothstep(0.74, 0.80, cph));
    float wipeE = max(hkEvent(31.0, 71.0, 12.0), wipeC);
    float wipePh = wipeC > 0.0 ? clamp((cph - 0.36) / 0.30, 0.0, 1.0) : hkEventPhase(31.0, 71.0, 12.0);
    float darkE = max(hkEvent(32.0, 47.0, 5.0), G.z * smoothstep(0.85, 0.9, G.w));

    // bombita que parpadea
    float flick = step(0.12, noise21(vec2(uRTime * 9.0, 1.0))) * (0.75 + 0.25 * sin(t * 50.0));
    float bulb = (0.55 + bass * 0.6) * mix(1.0, flick, 0.35 + loco * 0.4 + fogUp * 0.5) * (1.0 - darkE);
    vec2 bp = vec2(0.0, 0.98);
    float candles = uD6;

    // --- luz del cuarto ---
    vec3 L = vec3(0.010, 0.011, 0.013);
    L += vec3(0.80, 0.80, 0.75) * bulb * 0.30 / (0.20 + dot(p - bp, p - bp) * 2.0);
    for (int k = 0; k < 4; k++) {
        float fk = float(k);
        float cx = (fk < 2.0 ? -1.0 : 1.0) * (0.62 + mod(fk, 2.0) * 0.30);
        vec2 cp = vec2(cx, SINK_Y + 0.14);
        float fl = 0.8 + 0.2 * noise21(vec2(t * 6.0, fk * 4.0));
        L += vec3(1.0, 0.70, 0.45) * candles * fl * (0.6 + bass * 0.4) * 0.06 / (0.02 + dot(p - cp, p - cp)) * (1.0 - darkE);
    }

    // --- azulejos ---
    vec2 tg = p * vec2(5.5, 5.5);
    vec2 ti = floor(tg), tf = fract(tg);
    float grout = smoothstep(0.015, 0.035, min(min(tf.x, 1.0 - tf.x), min(tf.y, 1.0 - tf.y)));
    float th = hash21(ti);
    vec3 tile = vec3(0.17, 0.19, 0.19) * (0.75 + 0.35 * th);
    tile *= 0.55 + 0.6 * fbm(p * 2.5 + 4.0, 4, 0.55);
    float bevel = smoothstep(0.06, 0.18, min(min(tf.x, 1.0 - tf.x), min(tf.y, 1.0 - tf.y)));
    tile *= 0.75 + 0.25 * bevel;
    // moho y manchas: mas hacia los bordes y abajo
    float edge = smoothstep(uAspect * 0.45, uAspect * 1.0, abs(p.x)) + smoothstep(-0.2, -1.0, p.y) * 0.6;
    float mold = smoothstep(0.55, 0.75, fbm(p * 3.0 + 11.0, 5, 0.55) + edge * 0.25);
    tile = mix(tile, vec3(0.05, 0.06, 0.04), mold * 0.8);
    float streak = smoothstep(0.6, 0.9, noise21(vec2(p.x * 9.0, 2.0))) * smoothstep(0.3, 1.0, fbm(vec2(p.x * 9.0, p.y * 0.8), 3, 0.5));
    tile = mix(tile, vec3(0.12, 0.09, 0.05), streak * 0.45);             // chorreadas de oxido
    float broken = step(0.93, th) * step(0.2, edge);
    tile = mix(tile, vec3(0.06, 0.055, 0.05) * (0.5 + noise21(p * 40.0)), broken);
    vec3 col = mix(vec3(0.03, 0.03, 0.028), tile, grout) * L * 3.2;
    // brillo especular de los azulejos con la bombita
    col += vec3(0.6) * bulb * pow(max(0.0, 1.0 - length(tf - 0.3) * 2.2), 6.0) * 0.05 * grout * (1.0 - mold);

    // --- espejo ---
    vec2 mq = (p - MC) / MR;
    float mr = length(mq);
    float frameIn = 1.0, frameOut = 1.14;
    if (mr < frameOut + 0.02) {
        // sombra del marco
        col *= mix(1.0, 0.4, smoothstep(frameOut + 0.08, frameOut - 0.02, length((p - MC - vec2(0.02, -0.03)) / MR)));
    }
    if (mr < frameIn) {
        vec2 m = mq * 0.5 + 0.5;                       // 0..1 en el ovalo
        // rajaduras: celdas de voronoi alrededor del punto de impacto
        vec2 imp = vec2(0.35 + 0.3 * hash21(vec2(floor(uRTime / 59.0), 1.0)), 0.40 + 0.25 * hash21(vec2(floor(uRTime / 59.0), 2.0)));
        // piano: estrellas de grietas en el punto de cada tecla
        float keyCrack = 0.0;
        vec2 keyShift = vec2(0.0);
        for (int k = 0; k < N_KEYS; k++) {
            float e = keyEnv(k, 0.03, 0.5);
            if (e < 0.01) continue;
            vec2 kp = vec2(mix(0.15, 0.85, keyPos(k)), 0.30 + 0.40 * fract(keyPos(k) * 7.1 + float(k) * 0.3));
            vec2 kr = (m - kp) * vec2(MR.x / MR.y, 1.0);
            float r = length(kr);
            float R = min(keyAge(k) * 0.9, 0.10 + keyVel(k) * 0.25) * e;
            if (r > R + 0.02) continue;
            float a = atan(kr.y, kr.x);
            float spokes = abs(sin(a * 4.5 + keyPos(k) * 31.0 + (noise21(vec2(r * 30.0, float(k))) - 0.5) * 1.2));
            float line = (1.0 - smoothstep(0.0, 0.010 + r * 0.03, spokes * r)) * (1.0 - smoothstep(R * 0.7, R, r));
            float ring = (1.0 - smoothstep(0.0, 0.006, abs(r - R * 0.55))) * step(0.5, fract(a * 1.6 + 0.3)) * 0.6;
            keyCrack = max(keyCrack, max(line, ring) * e);
            keyShift += normalize(kr + 1e-4) * 0.01 * e * (1.0 - smoothstep(0.0, R, r));
        }
        float lvl = clamp(uD2 * (0.10 + hit * (0.6 + loco)) + crackE, 0.0, 1.0);
        vec2 rel = (m - imp) * vec2(MR.x / MR.y, 1.0);
        float rr = length(rel);
        float ang = atan(rel.y, rel.x);
        vec3 vr = e21Vor(vec2(ang * 2.2, log(rr + 0.02) * 3.0));  // pedazos radiales
        float shardOn = step(rr, lvl * 0.9 + 0.02) * step(0.001, lvl);
        float crackLine = (1.0 - smoothstep(0.0, 0.05, vr.x)) * shardOn;
        vec2 shardOff = (hash22(vr.yz) - 0.5) * 0.06 * (0.3 + uD3) * shardOn;
        // ondula como agua (medios) + pedazos corridos
        vec2 w = vec2(sin(m.y * 18.0 + t * 1.5), cos(m.x * 15.0 - t * 1.2)) * 0.004 * (0.3 + mid * 2.0);
        vec2 mm = m + w + shardOff + keyShift;
        vec2 muv = hkMediaCover(mm, MR.x / MR.y);
        // vapor: desenfoque + niebla blanca
        float wipe = 0.0;
        if (wipeE > 0.01) {
            vec2 hp = mm - vec2(0.25 + wipePh * 0.5, 0.55 + 0.08 * sin(wipePh * 9.0));
            wipe = (1.0 - smoothstep(0.10, 0.22, length(hp * vec2(1.0, 0.7)))) * wipeE;
            wipe = max(wipe, smoothstep(0.35, 0.0, abs(mm.y - 0.55 - 0.08 * sin(mm.x * 9.0))) * step(mm.x, 0.25 + wipePh * 0.5) * wipeE);
        }
        float steam = clamp(max(uD1 * (0.7 + 0.3 * sin(t * 0.4 + bass)), fogUp * 1.1) - wipe, 0.0, 1.0);
        float fogN = fbm(mm * 5.0 + vec2(0.0, t * 0.03), 4, 0.55);
        vec3 im = hkMediaGet(muv, steam * 3.5, has);
        vec3 tint = mix(vec3(0.70, 0.82, 0.95), vec3(1.0, 0.35, 0.30), uD5);
        im = hkTone(im, 0.06, tint, 1.2);
        float lum = dot(im, vec3(0.33));
        float lp = pow(clamp(lum * 1.8, 0.0, 1.0), 1.0 / 2.2);
        vec3 ghost = tint * pow(1.0 - lp, 2.2) * 0.35;
        im = mix(im, ghost, uD4 * 0.8 + hit * loco * 0.5 * step(0.5, fract(uRTime * 4.0)));
        im *= 0.8 + 0.6 * bulb * 0.5;
        im *= 1.0 - 0.45 * pow(mr, 3.0);                               // oscurece el borde del ovalo
        im = mix(im, vec3(0.20, 0.21, 0.22) * (0.4 + 0.6 * fogN) * (L * 3.0 + 0.1), steam * (0.35 + 0.5 * fogN));
        // gotas que corren por el vapor
        float dc = floor(mm.x * 40.0);
        float dy = fract(mm.y * 1.5 + t * (0.05 + 0.1 * hash21(vec2(dc, 3.0))) + hash21(vec2(dc, 4.0)));
        float drop = (1.0 - smoothstep(0.0, 0.08, abs(fract(mm.x * 40.0) - 0.5) - 0.12)) * smoothstep(0.75, 1.0, dy) * step(0.82, hash21(vec2(dc, 5.0)));
        im = mix(im, im * 0.6 + vec3(0.6) * high * 0.4, drop * steam);
        // reflejo de las velas en el vidrio
        im += vec3(1.0, 0.6, 0.3) * candles * 0.04 * (exp(-length(p - vec2(-0.62, -0.25)) * 8.0) + exp(-length(p - vec2(0.62, -0.25)) * 8.0));
        // grietas: linea brillante + borde oscuro
        im = mix(im, vec3(0.75, 0.78, 0.80) * (0.4 + bulb * 0.5), max(crackLine * 0.8, keyCrack * 0.85));
        im *= 1.0 - (1.0 - smoothstep(0.05, 0.12, vr.x)) * shardOn * 0.35;
        vec3 inv = tint * pow(1.0 - pow(clamp(im * 1.8, 0.0, 1.0), vec3(1.0 / 2.2)), vec3(2.2)) * 0.65;
        im = mix(im, inv, hit * loco * step(0.7, loco) * shardOn);
        im += vec3(0.5, 0.55, 0.6) * 0.025 * smoothstep(0.08, 0.0, abs(mm.x + mm.y * 0.6 - 0.75)) * (0.3 + bulb);   // brillo del vidrio
        float dk = darkE * 0.4;                                          // apagon: el espejo brilla solo
        col = im * (1.0 - darkE * 0.2) + im * dk;
    } else if (mr < frameOut) {
        // marco de hierro forjado con relieve
        float e = (mr - frameIn) / (frameOut - frameIn);
        float a = atan(mq.y, mq.x);
        float prof = sin(e * 3.14159);
        float orn = 0.5 + 0.5 * sin(a * 36.0) * smoothstep(0.2, 0.5, e) * smoothstep(0.9, 0.6, e);
        float scroll = smoothstep(0.85, 1.0, sin(a * 6.0 + 1.0)) * smoothstep(0.3, 0.6, e);
        vec3 iron = vec3(0.10, 0.095, 0.09) * (0.2 + prof * (0.6 + 0.6 * orn) + scroll * 0.8);
        iron *= 0.6 + 0.6 * noise21(p * 70.0);
        float rim = pow(prof, 8.0) * smoothstep(0.0, 1.0, mq.y + 0.4);
        col = iron * L * 6.0 + vec3(0.5, 0.45, 0.4) * rim * bulb * 0.1;
    }
    // remate arriba del marco
    {
        vec2 cq = (p - MC - vec2(0.0, MR.y * frameOut + 0.03)) * vec2(1.0, 1.3);
        float crest = max(length(cq) - 0.09, -cq.y - 0.02);
        crest = min(crest, length(cq - vec2(0.0, 0.10)) - 0.03);
        col = mix(col, vec3(0.09) * (L * 6.0 + 0.05), 1.0 - smoothstep(0.0, 0.005, crest));
    }

    // --- lavabo ---
    if (p.y < SINK_Y + 0.05) {
        float top = hkRBox(p - vec2(0.0, SINK_Y), vec2(1.15, 0.035), 0.02);
        float bowl = length((p - vec2(0.0, SINK_Y - 0.02)) * vec2(1.0, 1.6)) - 0.55;
        bowl = max(bowl, p.y - SINK_Y + 0.02);
        float ped = hkRBox(p - vec2(0.0, -0.95), vec2(0.16, 0.25), 0.05);
        float sink = min(min(top, bowl), ped);
        float inS = 1.0 - smoothstep(0.0, 0.004, sink);
        vec3 por = vec3(0.22, 0.22, 0.21) * (0.5 + 0.5 * smoothstep(-0.6, 0.6, p.x)) * (0.6 + 0.4 * fbm(p * 8.0, 3, 0.5));
        por = mix(por, vec3(0.16, 0.10, 0.05), smoothstep(0.55, 0.8, fbm(p * 5.0 + 3.0, 4, 0.55)) * 0.7);  // sarro
        por += vec3(0.5) * pow(1.0 - clamp(abs(top) / 0.04, 0.0, 1.0), 6.0) * 0.15 * bulb;
        col = mix(col, por * L * 3.5, inS);
        // canilla
        float fau = min(hkRBox(p - vec2(0.0, SINK_Y + 0.07), vec2(0.03, 0.06), 0.015), hkRBox(p - vec2(0.0, SINK_Y + 0.12), vec2(0.07, 0.015), 0.01));
        col = mix(col, vec3(0.25, 0.24, 0.22) * (L * 4.0 + 0.05) * (0.6 + 0.6 * smoothstep(0.05, -0.05, p.x)), 1.0 - smoothstep(0.0, 0.004, fau));
    }
    // gota de la canilla
    {
        float ph = fract(t * 0.35);
        vec2 dp = vec2(0.0, SINK_Y + 0.07 - ph * 0.25);
        col += vec3(0.6, 0.65, 0.7) * (1.0 - smoothstep(0.004, 0.009, length((p - dp) * vec2(1.0, 0.7)))) * step(ph, 0.85) * (L.r * 3.0 + 0.1);
    }

    // --- velas en el lavabo ---
    if (candles > 0.02) {
        for (int k = 0; k < 4; k++) {
            float fk = float(k);
            float cx = (fk < 2.0 ? -1.0 : 1.0) * (0.62 + mod(fk, 2.0) * 0.30);
            float h = 0.08 + 0.06 * hash21(vec2(fk, 8.0));
            if (abs(p.x - cx) > 0.08) continue;
            vec4 cd = hkCandle(p, vec2(cx, SINK_Y + 0.03), 0.018, h, t + fk * 2.0, fk);
            col = mix(col, cd.rgb * (1.0 - darkE), cd.a * smoothstep(0.0, 0.1, candles));
        }
    }

    // --- detalles a los costados: canos oxidados, toallero, estante ---
    {
        float sx = uAspect - 0.22;
        float pipe = abs(abs(p.x) - sx) - 0.025;
        float joint = abs(fract(p.y * 1.4) - 0.5) < 0.03 ? -0.006 : 0.0;
        vec3 rust = mix(vec3(0.14, 0.12, 0.10), vec3(0.20, 0.09, 0.04), fbm(p * vec2(30.0, 6.0), 3, 0.5));
        rust *= 0.4 + 0.9 * smoothstep(0.025, -0.025, abs(p.x) - sx);
        col = mix(col, rust * (L * 4.0 + 0.04), 1.0 - smoothstep(0.0, 0.004, pipe + joint));
        // toallero con toalla sucia (izquierda)
        vec2 tq = p - vec2(-1.30, -0.10);
        float rail = hkRBox(tq - vec2(0.0, 0.25), vec2(0.22, 0.012), 0.01);
        float towel = hkRBox(tq - vec2(0.0, 0.02 + 0.01 * sin(tq.x * 30.0)), vec2(0.17 - tq.y * 0.05, 0.24), 0.03);
        vec3 cloth = vec3(0.18, 0.17, 0.15) * (0.6 + 0.4 * sin(tq.x * 70.0)) * (0.5 + 0.5 * fbm(tq * 12.0, 3, 0.5));
        cloth = mix(cloth, vec3(0.12, 0.02, 0.02), smoothstep(0.6, 0.75, fbm(tq * 6.0 + 2.0, 4, 0.55)) * 0.8);   // manchas
        col = mix(col, cloth * (L * 4.0 + 0.03), 1.0 - smoothstep(0.0, 0.004, towel));
        col = mix(col, vec3(0.2) * (L * 4.0 + 0.05), 1.0 - smoothstep(0.0, 0.004, rail));
        // estante con frascos (derecha)
        vec2 sq = p - vec2(1.30, 0.05);
        float shelf = hkRBox(sq, vec2(0.25, 0.012), 0.004);
        float bot = 9.0;
        for (int k = 0; k < 4; k++) {
            float fk = float(k);
            float hb = 0.06 + 0.07 * hash21(vec2(fk, 11.0));
            vec2 bq = sq - vec2(-0.18 + fk * 0.12, 0.012 + hb);
            bot = min(bot, min(hkRBox(bq, vec2(0.03, hb), 0.012), hkRBox(bq - vec2(0.0, hb + 0.02), vec2(0.012, 0.02), 0.004)));
        }
        col = mix(col, vec3(0.08, 0.09, 0.08) * (L * 5.0 + 0.04) + vec3(0.5) * 0.02 * bulb, 1.0 - smoothstep(0.0, 0.004, bot));
        col = mix(col, vec3(0.16, 0.15, 0.13) * (L * 4.0 + 0.04), 1.0 - smoothstep(0.0, 0.004, shelf));
    }

    // --- bombita y cable ---
    float cable = abs(p.x) - 0.004;
    col = mix(col, vec3(0.02), (1.0 - smoothstep(0.0, 0.004, cable)) * step(bp.y + 0.04, p.y));
    col += vec3(1.0, 0.92, 0.75) * bulb * (exp(-length(p - bp) * 14.0) * 1.2 + exp(-length(p - bp) * 3.0) * 0.08);

    // telarana y gotas de agua en la esquina
    col = mix(col, vec3(0.45) * (L * 4.0 + 0.1), clamp(hkCornerWeb(p, vec2(-uAspect, 1.0), 0.6), 0.0, 1.0) * 0.6);
    col *= 1.0 - darkE * 0.7 * step(frameIn, mr);
    return vec4(hkFinish(col, uv, vec3(0.25, 0.3, 0.35)), 1.0);
}
