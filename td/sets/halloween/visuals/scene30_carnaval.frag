// ===============================================================
// HALLOWEEN 30 - EL CARNAVAL ABANDONADO
// Una feria vieja de noche (LAMINAS horneadas, plates/scene30, ver
// td/tools/bake_plates_carnaval.py): carpas rayadas y rotas, la
// estructura del carrusel con su techo de lona, la boleteria, las patas
// de la rueda de la fortuna, la reja y el suelo con papeles. En vivo: la
// rueda (aro, rayos y gondolas que se mecen), los caballos del carrusel
// que suben y bajan mientras giran, las guirnaldas de focos, las chispas
// de un cable suelto, la niebla y el payaso.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> los focos laten en cadena
//   medios -> la rueda se mece y cruje
//   agudos -> chispas del cable suelto
//   golpe  -> el carrusel da medio paso y un caballo salta
// PIANO: la tecla enciende los focos de esa seccion de la feria (grave =
//   izquierda) como un juego de feria; mantenida, la luz corre por las
//   guirnaldas hacia los costados.
// Speed hace girar la rueda y el carrusel aun en silencio (D2: la rueda).
// HISTORIA: cada acto cambia cuantos focos andan; cada ~63 s se corta la
//   luz de una guirnalda; cada ~81 s una gondola se queda balanceando.
// CLIMAX (~99 s, 20 s, en tres tiempos): la rueda acelera hasta chirriar y
//   tiembla todo; los focos se vuelven rojos y en la gondola mas alta
//   aparece la silueta de un payaso; se apaga todo de golpe salvo su
//   sonrisa, que despues se desvanece y la feria vuelve. Gran climax
//   (~4.5 min o el pad Momento): ademas, lluvia de chispas y el carrusel
//   desbocado.
//
// @D1: focos encendidos
// @D2: velocidad de la rueda
// @D3: niebla
// @D4: caballos que saltan
// @D5: color de los focos (feria <-> rojo sangre)
// @D6: oxido y deterioro
// ===============================================================

// >>> CARNAVAL_GEOM (bake_plates_carnaval.py hornea con este mismo bloque)
const vec3 CV_WHEEL = vec3(1.25, 0.22, 0.80);     // centro y radio de la rueda
const vec4 CV_CAROUSEL = vec4(-0.80, 0.02, 0.88, 0.13);  // centro del borde del techo, radio x, radio y
const float CV_CPLAT = -0.68;                     // piso del carrusel
float cvGround(float x) { return -0.76 + 0.02 * sin(x * 2.3) + 0.01 * sin(x * 7.1); }
// guirnaldas de las carpas: dos tramos (a, b) por carpa
const vec4 CV_GARL[4] = vec4[4](vec4(-2.55, -0.05, -2.05, 0.42), vec4(-2.05, 0.42, -1.55, -0.05),
                                vec4(1.95, -0.18, 2.35, 0.20), vec4(2.35, 0.20, 2.75, -0.18));
// <<< CARNAVAL_GEOM

const vec4 PL_R = vec4(-3.4, -1.25, 6.8, 2.5);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }
const vec2 CABLE = vec2(0.42, 0.10);              // punta del cable suelto

// foco: brillo en d (distancia), encendido e
vec3 cvBulb(float d, float e, vec3 c, float s) {
    return c * e * (smoothstep(0.016 * s, 0.006 * s, d) * 1.8 + exp(-d / (0.035 * s)) * 0.45);
}

// un foco de la feria en x, numero n de la cadena: cuantos andan (nB), la
// ola del bajo que corre por la cadena, los que fallan, el corte de una
// guirnalda (evento) y el piano (enciende su seccion; mantenida, corre)
float bulbOn(float x, float n, float t, float bass, float nB, float keyX[6], float keyE[6], float cut, float rust) {
    float on = step(hash21(vec2(n, 3.0)), nB);
    float chase = 0.5 + 0.5 * sin(n * 0.9 - t * 3.0);
    float e = on * (0.45 + 0.55 * mix(1.0, chase, 0.35 + bass * 0.65));
    e *= 1.0 - 0.7 * step(0.85 - rust * 0.25, hash21(vec2(n, 5.0))) * step(0.5, noise21(vec2(uRTime * 12.0, n)));
    e *= 1.0 - cut * step(39.5, n) * step(n, 57.5);
    for (int k = 0; k < N_KEYS; k++) {
        if (keyE[k] <= 0.001) continue;
        float w = 0.30 + keyHeld(k) * min(keyAge(k), 3.0) * 0.6;
        e = max(e, keyE[k] * smoothstep(w, w * 0.4, abs(x - keyX[k])) * (1.2 + keyVel(k) * 0.6));
    }
    return e;
}

// caballo de carrusel (q local, mirando a la derecha si dir > 0), distancia
float cvHorse(vec2 q, float leg) {
    float body = length((q - vec2(0.0, 0.0)) * vec2(0.85, 1.6)) - 0.22;
    float neck = hkSeg(q, vec2(0.18, 0.05), vec2(0.30, 0.25)) - 0.06;
    float head = length((q - vec2(0.36, 0.27)) * vec2(1.0, 1.6)) - 0.08;
    float snout = hkSeg(q, vec2(0.36, 0.26), vec2(0.47, 0.21)) - 0.035;
    float l1 = hkSeg(q, vec2(0.15, -0.08), vec2(0.25 + leg * 0.10, -0.32 + leg * 0.08)) - 0.025;
    float l2 = hkSeg(q, vec2(-0.15, -0.08), vec2(-0.28 - leg * 0.06, -0.30)) - 0.025;
    float tail = hkSeg(q, vec2(-0.24, 0.04), vec2(-0.34, -0.12)) - 0.03;
    return min(min(min(body, neck), min(head, snout)), min(min(l1, l2), tail));
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv)))) * 1.14 + vec2(0.0, 0.06);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float hue = audioHue(uHue, mid * 0.006);

    vec4 G = hkGrandClimax(10.0);
    vec4 C = hkClimaxOr(G, hkClimax(10.0, 99.0, 20.0));
    float cph = C.w;
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    float cut = hkEvent(4.0, 63.0, 5.0);
    float swingE = hkEvent(7.0, 81.0, 8.0);
    // el pico: todo tiembla; al final se apaga todo menos la sonrisa
    float screech = C.x * (1.0 - C.z);
    float black = smoothstep(0.60, 0.63, cph) * (1.0 - smoothstep(0.80, 0.92, cph));
    p += (vec2(noise21(vec2(uRTime * 30.0, 1.0)), noise21(vec2(uRTime * 30.0, 5.0))) - 0.5) * screech * C.y * 0.03;

    float rust = uD6;
    float nB = min(0.25 + uD1 * 0.75 + hkActVal(3.0) * 0.1, 1.0) * (1.0 - rust * 0.35);
    vec3 redB = vec3(1.0, 0.10, 0.05);
    vec3 fair = vec3(1.0, 0.85, 0.45);
    float redK = clamp(uD5 + C.x * (1.0 - C.z), 0.0, 1.0);
    // piano: seccion encendida por tecla
    float keyX[6];
    float keyE[6];
    for (int k = 0; k < N_KEYS; k++) {
        keyE[k] = keyEnv(k, 0.05, 1.0);
        keyX[k] = hkKeyX(k) * 1.08;
    }

    vec2 pu = rUV(p);
    vec4 fa = plate0(pu);

    // --- cielo ---
    vec3 col = mix(vec3(0.08, 0.05, 0.12), vec3(0.015, 0.012, 0.03), smoothstep(-0.4, 1.1, p.y));
    float cl = plate1Wrap(vec2(p.x * 0.2 + t * 0.01, p.y * 0.35)).r;
    col = mix(col, vec3(0.05, 0.035, 0.07), smoothstep(0.5, 0.8, cl) * 0.8);
    col += vec3(0.7) * step(0.996, hash21(floor(p * 140.0))) * smoothstep(0.1, 0.8, p.y);
    col += mix(fair, redB, redK) * 0.04 * exp(-abs(p.y + 0.3) * 2.5) * nB;

    // --- la rueda de la fortuna (detras de sus patas) ---
    vec2 wc = CV_WHEEL.xy;
    float WR = CV_WHEEL.z;
    vec2 wq = p - wc;
    float wr = length(wq);
    float spin = t * (0.05 + uD2 * 0.20) + mid * 0.04 * sin(uRTime * 1.7) + C.x * C.x * cph * 9.0;
    vec3 ironC = mix(vec3(0.18, 0.17, 0.19), vec3(0.22, 0.10, 0.05), rust);
    if (wr < WR + 0.15) {
        float wa = atan(wq.y, wq.x) + spin;
        float rim = min(abs(wr - WR) - 0.010, abs(wr - WR * 0.93) - 0.006);
        float spokes = abs(sin(wa * 8.0)) * wr - 0.006;
        float lace = abs(fract(wa / 6.2831853 * 32.0) - 0.5) * wr * 0.2 - 0.003;
        lace = max(lace, max(wr - WR, WR * 0.93 - wr));
        float hub = wr - 0.05;
        float d = min(min(rim, max(spokes, wr - WR)), min(lace, hub));
        col = mix(col, ironC * (0.5 + 0.5 * noise21(vec2(wa * 20.0, wr * 30.0))), 1.0 - smoothstep(0.0, 0.003, d));
        // focos del aro (giran con la rueda)
        for (int i = 0; i < 16; i++) {
            float fi = float(i);
            float a = fi / 16.0 * 6.2831853 - spin;
            vec2 bp = wc + vec2(cos(a), sin(a)) * WR;
            float e = bulbOn(bp.x, fi, t, bass, nB, keyX, keyE, cut, rust);
            col += cvBulb(length(p - bp), e, mix(fair, redB, redK), 1.0);
        }
    }
    // gondolas: cuelgan de los rayos y se mecen
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float a = fi / 8.0 * 6.2831853 - spin;
        vec2 piv = wc + vec2(cos(a), sin(a)) * WR;
        float sw = (0.06 + mid * 0.15) * sin(uRTime * 1.3 + fi * 1.1) + (i == 2 ? swingE * 0.4 * sin(uRTime * 3.0) : 0.0) + screech * C.y * 0.3 * sin(uRTime * 9.0 + fi);
        vec2 gd = vec2(sin(sw), -cos(sw));
        vec2 gc = piv + gd * 0.12;
        vec2 gq = p - gc;
        gq = mat2(cos(sw), sin(sw), -sin(sw), cos(sw)) * gq;
        if (abs(gq.x) > 0.16 || abs(gq.y) > 0.16) continue;
        float cab = hkRBox(gq + vec2(0.0, 0.02), vec2(0.085, 0.045), 0.02);
        float roof = hkRBox(gq - vec2(0.0, 0.06), vec2(0.07, 0.012), 0.008);
        float bar = hkSeg(p, piv, gc + gd * -0.02) - 0.004;
        float d = min(min(cab, roof), bar);
        vec3 gcol = mix(vec3(0.30, 0.10, 0.10), vec3(0.15, 0.25, 0.35), step(0.5, fract(fi * 0.5))) * (0.35 + 0.3 * smoothstep(0.05, -0.05, gq.y));
        gcol = mix(gcol, ironC * 0.6, rust * 0.6);
        col = mix(col, gcol, 1.0 - smoothstep(0.0, 0.004, d));
        // el payaso en la gondola mas alta
        float top = smoothstep(0.85, 0.99, sin(a));
        float clown = top * smoothstep(0.30, 0.45, cph) * (1.0 - smoothstep(0.92, 0.99, cph));
        if (clown > 0.001) {
            vec2 cq = gq - vec2(0.0, 0.07);
            float head = length(cq * vec2(1.0, 0.9)) - 0.045;
            float hair = min(length(cq - vec2(-0.045, 0.01)) - 0.028, length(cq - vec2(0.045, 0.01)) - 0.028);
            float hat = max(abs(cq.x) - (0.07 - cq.y) * 0.35, max(-cq.y + 0.03, cq.y - 0.11));
            float sil = min(min(head, hair), hat);
            col = mix(col, vec3(0.01), (1.0 - smoothstep(0.0, 0.004, sil)) * clown * (1.0 - black));
        }
    }

    // --- la feria horneada (patas de la rueda, carpas, carrusel, boleteria) ---
    vec3 alb = plateCol(fa.rgb);
    alb = mix(alb, alb * vec3(0.75, 0.55, 0.40) * (0.6 + 0.6 * plate1Wrap(pu * 6.0).a), rust * 0.7);
    vec3 amb = vec3(0.13, 0.11, 0.17);
    // luz de las guirnaldas sobre la feria (aprox.: por cercania a cada guirnalda)
    vec3 glow = vec3(0.0);
    for (int g = 0; g < 4; g++) {
        vec4 s = CV_GARL[g];
        float d = hkSeg(p, s.xy, s.zw);
        glow += mix(fair, redB, redK) * nB * exp(-d * 6.0) * 0.6;
    }
    float cd = length((p - CV_CAROUSEL.xy) / CV_CAROUSEL.zw * vec2(1.0, 1.0)) - 1.0;
    glow += mix(fair, redB, redK) * nB * exp(-max(cd, 0.0) * 1.2) * 0.35 * smoothstep(0.3, -0.7, p.y - CV_CAROUSEL.y);
    vec3 fair2 = alb * (amb + glow * 1.4);
    col = mix(col, fair2, fa.a);

    // --- caballos del carrusel: giran (medio frente) y suben y bajan ---
    vec2 cc = CV_CAROUSEL.xy;
    float crot = t * 0.18 + hit * uD4 * 0.25 + grand * G.y * cph * 6.0;
    for (int h = 0; h < 6; h++) {
        float fh = float(h);
        float a = fh / 6.0 * 6.2831853 + crot;
        float front = sin(a);                         // > 0 adelante
        if (front < -0.15) continue;
        float x = cc.x + cos(a) * CV_CAROUSEL.z * 0.72;
        float bob = 0.06 * sin(t * 2.0 + fh * 1.7) + (h == int(mod(floor(uRTime * 0.9), 6.0)) ? hit * uD4 * 0.10 : 0.0);
        float y = CV_CPLAT + 0.34 + bob;
        float s = 0.44 * (0.85 + 0.15 * front);
        vec2 hq = (p - vec2(x, y)) / s;
        float dir = -sign(sin(a) * 0.0 - cos(a) + 1e-3);
        hq.x *= dir;
        if (abs(hq.x) > 0.7 || abs(hq.y) > 0.6) {
            // el poste igual se dibuja
        }
        float pole = abs(p.x - x) - 0.008;
        pole = max(pole, max(p.y - (CV_CAROUSEL.y - 0.02), CV_CPLAT - p.y));
        vec3 brass = vec3(0.55, 0.42, 0.18) * (0.5 + glow.r * 0.8) * (1.0 - rust * 0.5);
        float vis = smoothstep(-0.15, 0.1, front);
        col = mix(col, brass, (1.0 - smoothstep(0.0, 0.003, pole)) * vis);
        float hd = cvHorse(hq, sin(t * 2.0 + fh));
        vec3 hc = mix(vec3(0.75, 0.70, 0.62), vec3(0.45, 0.12, 0.10), step(0.5, fract(fh * 0.5))) * (amb * 1.5 + glow * 2.4) * (0.6 + 0.4 * front);
        hc = mix(hc, hc * vec3(0.7, 0.55, 0.45), rust);
        col = mix(col, hc, (1.0 - smoothstep(0.0, 0.02, hd)) * vis);
    }

    // --- focos: borde del techo del carrusel y guirnaldas de las carpas ---
    for (int i = 0; i < 18; i++) {
        float fi = float(i);
        float a = fi / 18.0 * 6.2831853 + crot * 0.5;
        if (sin(a) < -0.05) continue;
        vec2 bp = CV_CAROUSEL.xy + vec2(cos(a) * CV_CAROUSEL.z, -sin(a) * CV_CAROUSEL.w);
        float e = bulbOn(bp.x, fi + 20.0, t, bass, nB, keyX, keyE, cut, rust);
        col += cvBulb(length(p - bp), e, mix(fair, redB, redK), 1.0);
    }
    for (int g = 0; g < 4; g++) {
        vec4 s = CV_GARL[g];
        float d = hkSeg(p, s.xy, s.zw);
        if (d > 0.08) continue;
        // 9 focos por tramo, colgando en catenaria
        for (int i = 0; i < 9; i++) {
            float k = (float(i) + 0.5) / 9.0;
            vec2 bp = mix(s.xy, s.zw, k) - vec2(0.0, 0.04 * sin(k * 3.14159));
            float e = bulbOn(bp.x, float(g * 9 + i) + 40.0, t, bass, nB, keyX, keyE, cut, rust);
            vec3 bc = mix(mix(fair, hsv2rgb(vec3(fract(float(i) * 0.17 + hue), 0.6, 1.0)), 0.6), redB, redK);
            col += cvBulb(length(p - bp), e, bc, 0.8);
        }
    }

    // --- EASTER EGG "JAY INFINITO" (fase 38): dentro de la rueda se prende
    // una guirnalda de focos con forma de infinito, que se va encendiendo
    // en carrera, y arriba del infinito un cartelito de feria: JAY'S ---
    vec2 EG = hkEgg(30.0);
    if (EG.x > 0.0) {
        vec2 wcE = CV_WHEEL.xy;
        vec2 iq = p - wcE;
        if (abs(iq.x) < CV_WHEEL.z && abs(iq.y) < CV_WHEEL.z * 0.6) {
            float ia = CV_WHEEL.z * 0.78;
            for (int i = 0; i < 30; i++) {
                float fi = float(i);
                vec2 bp = hkInfPath(fi / 30.0 * 6.2831853, ia);
                float on = step(fi / 30.0, smoothstep(0.05, 0.45, EG.y) * 1.02) * (0.75 + 0.25 * step(0.5, fract(uRTime * 2.0 + fi * 0.5)));
                col += cvBulb(length(iq - bp), on * EG.x, mix(fair, hsv2rgb(vec3(fract(fi * 0.11 + hue), 0.55, 1.0)), 0.5), 0.9);
            }
        }
        vec2 sq = p - (wcE + vec2(0.0, CV_WHEEL.z * 0.56));
        if (abs(sq.x) < 0.30 && abs(sq.y) < 0.10) {
            float plaque = hkBox(sq, vec2(0.25, 0.075)) - 0.01;
            float dj = hkText(sq / 0.085, int[16](74, 65, 89, 39, 83, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 5) * 0.085;
            float lit = smoothstep(0.4, 0.6, EG.y) * EG.x;
            col = mix(col, vec3(0.35, 0.05, 0.06) * (0.3 + glow * 1.5), (1.0 - smoothstep(0.0, 0.004, plaque)) * EG.x);
            col += mix(fair, vec3(1.0, 0.85, 0.55), 0.5) * (1.0 - smoothstep(0.004, 0.009, dj)) * lit * 1.4;
        }
    }
    // --- chispas del cable suelto (agudos; lluvia de chispas en el gran climax) ---
    float sd = length(p - CABLE);
    if (sd < 0.6 || grand > 0.0) {
        float sp = hkParticles((p - CABLE) * 2.2, uRTime * 1.5, 0.04 + high * 0.30, vec2(0.15, -1.0), 0.03);
        float cone = exp(-sd * 4.0) * smoothstep(0.05, -0.3, p.y - CABLE.y);
        float rain = grand * G.y * smoothstep(1.2, -0.2, p.y) * 0.6;
        col += vec3(1.0, 0.75, 0.35) * sp * (cone * (0.5 + high * 3.0) + rain);
        col += vec3(0.6, 0.8, 1.0) * exp(-sd * 60.0) * step(0.7, noise21(vec2(uRTime * 25.0, 1.0))) * (0.5 + high);
    }

    // --- niebla (D3) ---
    float fz = plate1Wrap(vec2(p.x * 0.25 + t * 0.012, p.y * 0.6)).g;
    float fogA = (0.10 + uD3 * 0.6) * smoothstep(-0.1, -0.85, p.y) * (0.5 + 0.7 * fz);
    col = mix(col, vec3(0.12, 0.10, 0.16) + mix(fair, redB, redK) * nB * 0.05, clamp(fogA, 0.0, 0.8));

    // --- apagon: solo queda la sonrisa del payaso ---
    if (black > 0.0) {
        col *= 1.0 - black * 0.97;
        // gondola mas alta: la de angulo mas cercano a 90 grados
        float best = -2.0; vec2 bc = vec2(0.0);
        for (int i = 0; i < 8; i++) {
            float a = float(i) / 8.0 * 6.2831853 - spin;
            if (sin(a) > best) { best = sin(a); bc = wc + vec2(cos(a), sin(a)) * WR - vec2(0.0, 0.12) + vec2(0.0, 0.07); }
        }
        vec2 sq = (p - bc - vec2(0.0, -0.03)) / 0.11;
        float smile = abs(length(sq - vec2(0.0, 0.9)) - 1.25) - 0.07;
        smile = max(smile, sq.y - 0.15);
        smile = max(smile, abs(sq.x) - 0.95);
        float eyes = min(length(sq - vec2(-0.45, 0.85)) - 0.12, length(sq - vec2(0.45, 0.85)) - 0.12);
        float g = (1.0 - smoothstep(0.0, 0.08, min(smile, eyes)));
        col += vec3(1.0, 0.95, 0.85) * g * black * 1.5 + vec3(1.0, 0.3, 0.1) * exp(-max(min(smile, eyes), 0.0) * 6.0) * black * 0.25;
    }

    col = audioLift(col, high * 0.05);
    // LUZ DE TECLA (fase 37): luces de feria
    col = hkKeyLit(col, p, 0.05, vec2(0.3, 0.55), vec3(1.0, 0.3, 0.5), vec3(0.3, 0.8, 1.0), 0.04, 1.0);
    return vec4(hkFinish(col, uv, vec3(0.5, 0.3, 0.5)), 1.0);
}
