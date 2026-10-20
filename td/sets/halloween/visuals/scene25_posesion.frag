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
// Speed mueve las tiras, el humo y las llamas aun en silencio.
// HISTORIA: cada ~43 s se encienden los ojos; cada ~89 s posesion total
// (tiras enloquecidas, venas hasta el centro); cada ~61 s las velas se
// avivan todas juntas.
//
// @D1: cantidad de tiras
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
    float eyesE = hkEvent(70.0, 43.0, 7.0);
    float possE = hkEvent(71.0, 89.0, 6.0);
    float flareE = hkEvent(72.0, 61.0, 4.0);
    float poss = clamp(possE + hit * loco * 0.6, 0.0, 1.0);

    // temblor extra en la posesion
    p += (vec2(noise21(vec2(uRTime * 30.0, 1.0)), noise21(vec2(uRTime * 30.0, 2.0))) - 0.5) * 0.04 * possE;

    // --- luz de velas ---
    float fl = 1.0 + flareE * 1.2 + bass * 0.4;
    vec3 L = vec3(0.020, 0.016, 0.016);
    for (int k = 0; k < 6; k++) {
        float fk = float(k);
        float sx = (fk < 3.0 ? -1.0 : 1.0) * (uAspect - 0.40 - mod(fk, 3.0) * 0.16);
        vec2 cp = vec2(sx, -0.22 + mod(fk, 3.0) * 0.10);
        float f = 0.8 + 0.2 * noise21(vec2(t * 6.0, fk * 3.0));
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
    // cruces invertidas
    for (int s = 0; s < 2; s++) {
        float sgn = s == 0 ? -1.0 : 1.0;
        vec2 xq = p - vec2(sgn * (uAspect - 0.62), 0.30);
        xq = vec2(xq.x, -xq.y);
        xq.x += sin(t * 0.7 + float(s)) * xq.y * 0.05 + hit * loco * 0.02 * sgn;
        float cr = min(hkBox(xq - vec2(0.0, -0.02), vec2(0.018, 0.16)), hkBox(xq - vec2(0.0, 0.05), vec2(0.075, 0.016)));
        wall = mix(wall, vec3(0.05, 0.04, 0.035), 1.0 - smoothstep(0.0, 0.004, cr));
        wall *= mix(1.0, 0.6, (1.0 - smoothstep(0.0, 0.03, min(hkBox(xq - vec2(0.02, -0.04), vec2(0.018, 0.16)), hkBox(xq - vec2(0.02, 0.03), vec2(0.075, 0.016))))));
    }
    vec3 col = wall * L * 4.0;

    // --- piso con circulo de tiza ---
    if (p.y < FLOOR_Y) {
        vec3 fl2 = vec3(0.07, 0.06, 0.055) * (0.5 + 0.6 * fbm(p * vec2(2.0, 8.0), 4, 0.5));
        vec2 cq = vec2(p.x, (p.y - FLOOR_Y + 0.55) * 4.0);
        float r = length(cq);
        float ring = hkLine(r - 1.25, 1.5) + hkLine(r - 1.12, 1.0);
        float a = atan(cq.y, cq.x);
        float rune = step(0.55, noise21(vec2(floor(a * 18.0), 3.0))) * step(abs(r - 1.185), 0.04) * step(0.3, fract(a * 18.0));
        float chalk = clamp(ring + rune, 0.0, 1.0) * (0.6 + 0.4 * noise21(p * 90.0));
        fl2 = mix(fl2, vec3(0.55, 0.52, 0.48), chalk * 0.7);
        col = fl2 * (L * 4.0 + 0.04) + vec3(0.6, 0.1, 0.05) * chalk * (0.04 + eyesE * 0.2 + possE * 0.2);
    }

    // --- la imagen poseida ---
    float ia = clamp(hkMediaAspect(), 0.7, 1.8);
    vec2 HS = vec2(0.76 * ia, 0.76);
    HS = min(HS, vec2(uAspect - 0.75, 0.76));
    vec2 IC = vec2(0.0, 0.06);
    vec2 iq = (p - IC) / (2.0 * HS) + 0.5;
    float inside = step(abs(iq.x - 0.5), 0.5) * step(abs(iq.y - 0.5), 0.5);
    // bordes comidos: la imagen no termina recta, se deshace en la pared
    float eat = fbm(iq * 6.0, 3, 0.5) * 0.10;
    float ed = min(min(iq.x, 1.0 - iq.x), min(iq.y, 1.0 - iq.y));
    float edgeA = smoothstep(0.0, 0.06 + eat, ed - eat * 0.5);
    if (inside > 0.5 && edgeA > 0.0) {
        // tiras horizontales que se corren
        float strips = 6.0 + floor(uD1 * 26.0) + poss * 20.0;
        float sid = floor(iq.y * strips);
        float hs = hash21(vec2(sid, floor(uRTime * (1.0 + poss * 8.0))));
        float drift = (noise21(vec2(sid * 0.7, t * 0.25)) - 0.5) * 0.03 * (0.3 + mid * 2.0);
        float jumpX = (hs - 0.5) * hit * uD2 * 0.25 + (hs - 0.5) * poss * 0.4;
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
        vec3 tint = mix(vec3(0.85, 0.85, 0.88), vec3(0.95, 0.50, 0.46), uD5);
        im = hkTone(im, 0.0, tint, 1.25);
        // ojos: lo oscuro rodeado de luz brilla rojo (contraste local)
        float lC = dot(im, vec3(0.33));
        float lB = dot(hkTone(hkMediaGet(muv, 5.5, has), 0.0, vec3(1.0), 1.25), vec3(0.33));
        float pC = pow(max(lC, 0.0), 0.4545), pB = pow(max(lB, 0.0), 0.4545);   // en escala perceptual
        float hole = smoothstep(0.10, 0.18, pB - pC) * smoothstep(0.22, 0.12, pC) * smoothstep(0.20, 0.28, pB);
        float eyesK = clamp(eyesE + poss + hit * loco * 0.5, 0.0, 1.0);
        // estatica fina
        im += (hash21(iq * vec2(800.0, 600.0) + fract(uRTime * 13.0) * 50.0) - 0.5) * (0.02 + high * 0.08);
        // linea separadora entre tiras corridas
        im *= 1.0 - 0.6 * smoothstep(0.08, 0.0, abs(fract(iq.y * strips) - 0.5) - 0.42) * step(0.01, abs(jumpX));
        // inversion con locura
        float inv = poss * step(0.5, fract(uRTime * 6.0)) + hit * loco * step(0.75, loco);
        float lp = pow(clamp(lC * 1.5, 0.0, 1.0), 1.0 / 2.2);
        im = mix(im, tint * pow(1.0 - lp, 2.2) * 0.5, clamp(inv, 0.0, 1.0));
        vec3 imgC = im * (0.95 + L * 3.0);
        imgC = mix(imgC, vec3(1.0, 0.05, 0.025) * (2.0 + bass * 1.5), hole * eyesK);
        col = mix(col * 0.4, imgC, edgeA);
    }

    // --- venas negras que avanzan desde los bordes ---
    {
        vec2 sq = p / vec2(uAspect, 1.0);
        float edgeD = 1.0 - max(abs(sq.x), abs(sq.y));                // 0 en el borde
        float reach = 0.18 + uD4 * 0.35 + poss * 0.5 + bass * 0.06;
        float grow = smoothstep(reach, reach - 0.25, edgeD + (noise21(p * 2.0) - 0.5) * 0.15);
        float v = p25Veins(p * vec2(1.0, 1.4), t) * grow * smoothstep(0.0, 0.05, uD4 + poss);
        col = mix(col, vec3(0.008, 0.0, 0.0) + vec3(0.25, 0.0, 0.0) * bass * v * 0.3, clamp(v * 1.2, 0.0, 0.95));
    }
    // --- sombras que entran por los bordes ---
    if (uD6 > 0.02) {
        float sm = fbm(vec2(p.x * 1.2 + t * 0.05 * sign(p.x), p.y * 1.5 - t * 0.04), 4, 0.55);
        float side = smoothstep(uAspect * 0.45, uAspect, abs(p.x) + sm * 0.5);
        col *= 1.0 - side * uD6 * 0.85;
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
