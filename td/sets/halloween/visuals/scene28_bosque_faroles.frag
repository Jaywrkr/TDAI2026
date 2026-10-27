// ===============================================================
// HALLOWEEN 28 - EL BOSQUE DE LOS FAROLES
// Bosque de otono denso de noche, en tres profundidades (LAMINAS
// horneadas, plates/scene28, ver td/tools/bake_plates_faroles.py):
// troncos lejanos en la niebla, robles con ramas que cruzan, y dos
// troncos enormes adelante con una rama gruesa que cruza arriba; el suelo
// es una alfombra de hojas secas con un sendero. De las ramas cuelgan
// faroles de papel (en vivo), cada uno con su largo de cuerda, que
// iluminan los troncos de su capa. Entre capa y capa hay niebla.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> los faroles se balancean como pendulos (cada cuerda a su
//             ritmo: las largas lento, las cortas rapido)
//   medios -> el viento los empuja de costado y mueve la niebla
//   agudos -> luciernagas
//   golpe  -> un farol se aviva de golpe y su cuerda baja de un tiron
// PIANO: la tecla prende el farol que esta en esa posicion (grave =
//   izquierda) y lo hace brillar; un acorde prende varios. Mantenida,
//   el farol sigue avivado.
// Speed mueve la camara entre los arboles (paralaje), la niebla y los
//   pendulos aun en silencio.
// HISTORIA: cada acto cambia cuantos faroles hay; cada ~59 s pasa una
//   rafaga que agita todo y hace caer hojas; cada ~79 s algo mira desde
//   el fondo.
// CLIMAX (~93 s, 20 s, en tres tiempos): los faroles se apagan de a uno
//   y entre los troncos se encienden ojos; los faroles vuelven a
//   prenderse desde el fondo hacia adelante, como un camino que llega a
//   la camara; despues los ojos se cierran. Gran climax (~4.5 min o el
//   pad Momento): los faroles vuelven rojos, muchos mas ojos y una
//   rafaga de hojas.
//
// @D1: cantidad de faroles (aparecen de a uno)
// @D2: largo de las cuerdas
// @D3: niebla entre las capas
// @D4: hojas que caen
// @D5: color de los faroles (naranja <-> violeta)
// @D6: ojos entre los troncos
// ===============================================================

// >>> FAROLES_GEOM (bake_plates_faroles.py hornea con este mismo bloque)
// y de la rama de donde cuelgan los faroles, por capa (0 lejos, 1 medio, 2 cerca)
float flBranch(int L, float x) {
    if (L == 2) return 0.90 - 0.12 * cos(x * 0.75) + 0.03 * sin(x * 3.1);
    if (L == 1) return 0.60 - 0.06 * cos(x * 1.3 + 0.5) + 0.02 * sin(x * 4.7);
    return 0.40 + 0.03 * sin(x * 2.3);
}
// suelo de cada capa
float flGround(int L, float x) {
    if (L == 2) return -0.72 + 0.04 * sin(x * 1.7) + 0.02 * sin(x * 5.3);
    if (L == 1) return -0.44 + 0.03 * sin(x * 2.1 + 1.0);
    return -0.26 + 0.02 * sin(x * 3.0);
}
// <<< FAROLES_GEOM

const vec4 PL_R = vec4(-3.4, -1.25, 6.8, 2.5);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

#define FL_N 16
// faroles: x, capa, largo de cuerda (0..1), fase
const vec4 FL[16] = vec4[16](
    vec4(-1.90, 2.0, 0.55, 0.3), vec4(-0.85, 2.0, 0.30, 1.7), vec4(0.35, 2.0, 0.70, 2.9),
    vec4(1.30, 2.0, 0.40, 4.1), vec4(2.15, 2.0, 0.60, 5.3),
    vec4(-2.30, 1.0, 0.50, 0.9), vec4(-1.30, 1.0, 0.75, 2.2), vec4(-0.20, 1.0, 0.35, 3.4),
    vec4(0.85, 1.0, 0.60, 4.6), vec4(1.80, 1.0, 0.45, 5.8),
    vec4(-2.00, 0.0, 0.60, 1.1), vec4(-1.15, 0.0, 0.40, 2.5), vec4(-0.45, 0.0, 0.70, 3.7),
    vec4(0.30, 0.0, 0.50, 4.9), vec4(1.05, 0.0, 0.35, 0.4), vec4(1.75, 0.0, 0.65, 1.6));
// orden en que aparecen con D1 (primero los mas visibles)
const float FL_ORD[16] = float[16](0.0, 3.0, 1.0, 6.0, 2.0, 4.0, 9.0, 5.0, 11.0, 7.0, 8.0, 13.0, 10.0, 15.0, 12.0, 14.0);
// ojos entre los troncos (en la profundidad media)
const vec3 FL_EYE[10] = vec3[10](vec3(-1.62, -0.10, 0.0), vec3(0.55, -0.18, 1.0), vec3(-0.55, 0.05, 2.0),
    vec3(1.55, -0.05, 3.0), vec3(-2.25, -0.20, 4.0), vec3(2.30, 0.10, 5.0), vec3(0.05, -0.28, 6.0),
    vec3(-1.05, -0.30, 7.0), vec3(1.10, 0.18, 8.0), vec3(-0.15, 0.22, 9.0));

float flScale(float L) { return L > 1.5 ? 1.0 : (L > 0.5 ? 0.62 : 0.38); }
float flPar(float L) { return L > 1.5 ? 1.0 : (L > 0.5 ? 0.45 : 0.15); }

// un farol de papel en q (local, alto ~1): vec4(color, cuanto tapa)
vec4 flLantern(vec2 q, float L, vec3 lc, float flick) {
    float body = length(q * vec2(1.0, 0.78)) - 0.5;
    float cap = max(abs(q.x) - 0.24, abs(abs(q.y) - 0.62) - 0.06);
    float a = 1.0 - smoothstep(-0.03, 0.03, min(body, cap));
    if (a <= 0.0) return vec4(0.0);
    float ribs = 0.78 + 0.22 * smoothstep(0.0, 0.25, abs(fract(q.y * 4.5) - 0.5));
    float core = exp(-dot(q, q) * 3.5);
    vec3 paper = lc * L * (0.18 + 0.50 * core) * ribs * flick + lc * 0.025;
    vec3 c = cap < body ? vec3(0.04, 0.03, 0.025) + lc * L * 0.08 : paper;
    return vec4(c, a);
}

vec4 render(vec2 uv) {
    vec2 p0 = hkCam(hkPunch(hkShake(centered(uv)))) * 1.10 + vec2(0.0, 0.06);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float hue = audioHue(uHue, mid * 0.006);

    vec4 G = hkGrandClimax(8.0);
    vec4 C = hkClimaxOr(G, hkClimax(8.0, 93.0, 20.0));
    float cph = C.w;
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    float gust = max(hkEvent(5.0, 59.0, 6.0), grand * G.y);
    float watcher = hkEvent(6.0, 79.0, 9.0);

    vec3 orange = vec3(1.0, 0.55, 0.20);
    vec3 violet = hsv2rgb(vec3(fract(0.76 + hue), 0.70, 1.0));
    vec3 lcol = mix(orange, violet, uD5);
    lcol = mix(lcol, vec3(1.0, 0.12, 0.06), grand * smoothstep(0.35, 0.5, cph) * (1.0 - smoothstep(0.85, 1.0, cph)));
    float drift = sin(t * 0.045) * 0.28 + sin(t * 0.017 + 1.0) * 0.12;

    // --- faroles: posicion y luz (una vez por pixel, 16) ---
    float nL = min(hkDR(0.0, 10.0, 16.0, uD1) + uDensity * 2.0 + hkActVal(3.0) * 2.0, 16.0);
    float sel = floor(hash21(vec2(floor(uRTime * 0.8), 28.0)) * 16.0);
    // piano: el farol mas cercano en x a la nota
    int keyLan[6];
    float keyE[6];
    for (int k = 0; k < N_KEYS; k++) {
        keyE[k] = keyEnv(k, 0.08, 1.4);
        keyLan[k] = -1;
        if (keyE[k] <= 0.001) continue;
        float kx = hkKeyX(k);
        float best = 1e3;
        for (int j = 0; j < FL_N; j++) {
            float dx = abs(FL[j].x + drift * flPar(FL[j].y) - kx) + FL[j].y * 0.05;
            if (dx < best) { best = dx; keyLan[k] = j; }
        }
    }
    vec3 LP[16];      // centro del farol (x, y) y escala
    float LL[16];     // luz
    for (int i = 0; i < FL_N; i++) {
        vec4 f = FL[i];
        float fi = float(i);
        float s = flScale(f.y);
        float on = revealAt(nL, FL_ORD[i]);
        float len = (0.10 + 0.32 * f.z) * hkDR(0.2, 1.0, 2.0, uD2) * s;
        float drop = (abs(fi - sel) < 0.5 ? hit : 0.0) * 0.12 * s;
        len += drop;
        float ax = f.x;
        float ay = flBranch(int(f.y), ax);
        float w = 1.6 / sqrt(max(len / s, 0.05));               // pendulo: cuerda larga, lento
        float ang = (0.06 + bass * 0.22) * sin(t * w + f.w) + (0.05 + mid * 0.18 + gust * 0.35) * sin(uRTime * 1.3 + f.w * 1.7) * 0.6;
        vec2 c = vec2(ax, ay) + vec2(sin(ang), -cos(ang)) * len;
        LP[i] = vec3(c, s);
        float L = on * (0.85 + 0.15 * noise21(vec2(uRTime * 3.0, fi)));
        L *= 1.0 + (abs(fi - sel) < 0.5 ? hit * 0.9 : 0.0);
        for (int k = 0; k < N_KEYS; k++) {
            if (keyLan[k] == i) L = max(L, keyE[k] * (1.1 + keyVel(k) * 0.8)) + keyE[k] * 0.3;
        }
        // climax: se apagan de a uno y vuelven desde el fondo hacia adelante
        if (cph > 0.0) {
            float a0 = 0.02 + fract(fi * 0.618) * 0.28;
            float depthRank = (2.0 - f.y) * 0.5;                      // 1 al fondo, 0 adelante
            float back = 0.36 + 0.32 * (1.0 - depthRank) + abs(f.x) * 0.02;
            float off = smoothstep(a0, a0 + 0.04, cph) * (1.0 - smoothstep(back, back + 0.03, cph));
            L = L * (1.0 - off) + exp(-max(cph - back, 0.0) * 30.0) * step(back, cph) * 1.2 * step(cph, back + 0.3);
        }
        LL[i] = L;
    }

    // --- fondo: niebla profunda con el resplandor del sendero ---
    vec3 col = mix(vec3(0.05, 0.045, 0.08), vec3(0.015, 0.015, 0.035), smoothstep(-0.3, 1.0, p0.y));
    col += lcol * 0.05 * exp(-abs(p0.y + 0.2) * 3.0) * (0.5 + nL / 16.0) * (1.0 - C.x * 0.6);

    // capas de atras hacia adelante: plate, luz de sus faroles, faroles, niebla
    for (int Ly = 0; Ly < 3; Ly++) {
        float Lf = float(Ly);
        vec2 p = p0 + vec2(drift * flPar(Lf), 0.0);
        vec2 pu = rUV(p);
        // viento en las ramas de adelante (medios)
        if (Ly == 2) pu.x += (mid * 0.004 + gust * 0.006) * sin(uRTime * 2.1 + p.x * 3.0) * smoothstep(0.4, 1.0, p.y);
        vec4 pl = Ly == 0 ? plate0(pu) : (Ly == 1 ? plate1(pu) : plate2(pu));
        // luz de los faroles de esta capa sobre sus troncos y su suelo
        vec3 light = vec3(0.0);
        // relieve de la capa cercana (fase 25): cada farol ilumina el tronco
        // del lado que lo mira
        vec3 nrm = vec3(0.0, 0.0, 1.0);
        float rlOn = 0.0;
        if (Ly == 2 && pl.a > 0.01) {
            vec4 rl = plate4(pu);
            rlOn = rl.a;
            nrm = vec3(rl.rg * 2.0 - 1.0, 0.0);
            nrm.z = sqrt(max(1.0 - dot(nrm.xy, nrm.xy), 0.0));
        }
        for (int i = 0; i < FL_N; i++) {
            if (pl.a < 0.01) break;
            if (abs(FL[i].y - Lf) > 0.5 || LL[i] <= 0.01) continue;
            vec2 d = (p - LP[i].xy) / LP[i].z;
            float face = mix(1.0, 0.40 + 1.7 * max(dot(nrm, normalize(vec3(LP[i].xy - p, 0.20 * LP[i].z))), 0.0), rlOn);
            light += lcol * LL[i] / (1.0 + dot(d, d) * 5.0) * face;
        }
        vec3 alb = plateCol(pl.rgb);
        vec3 amb = vec3(0.14, 0.14, 0.21) * (Ly == 0 ? 1.4 : 1.0);
        vec3 lay = alb * (amb + light * 2.6);
        if (Ly == 0) lay = mix(vec3(0.06, 0.055, 0.09), vec3(0.02, 0.02, 0.035), pl.r) + light * 0.15;
        col = mix(col, lay, pl.a);
        // ojos detras de la capa del medio (los tapan sus troncos)
        if (Ly == 0) {
            float nE = uD6 * 10.0 + C.x * 6.0 * (1.0 - C.z) + grand * G.x * 4.0 + watcher * 1.5;
            for (int e = 0; e < 10; e++) {
                vec3 ey = FL_EYE[e];
                float on = revealAt(nE, ey.z);
                if (on <= 0.0) continue;
                vec2 eq = p0 + vec2(drift * 0.3, 0.0) - ey.xy;
                if (abs(eq.x) > 0.08 || abs(eq.y) > 0.05) continue;
                float blink = step(0.06, fract(uRTime * 0.21 + ey.z * 0.37));
                vec2 a = vec2(abs(eq.x) - 0.026, eq.y);
                float eye = 1.0 - smoothstep(0.004, 0.008, length(a * vec2(1.0, 1.0 + (1.0 - blink) * 6.0)));
                vec3 ec = mix(vec3(1.0, 0.85, 0.2), vec3(1.0, 0.1, 0.05), clamp(C.x + grand, 0.0, 1.0));
                col += ec * eye * on * 1.6 + ec * exp(-length(a) * 90.0) * on * 0.3;
            }
        }
        // los faroles de esta capa
        for (int i = 0; i < FL_N; i++) {
            if (abs(FL[i].y - Lf) > 0.5) continue;
            vec3 lp = LP[i];
            float s = lp.z;
            vec2 d = p - lp.xy;
            if (abs(d.x) > 0.6 * s + 0.02 || d.y > 1.4 || d.y < -0.5 * s) continue;
            float on = revealAt(nL, FL_ORD[i]);
            // cuerda hasta la rama
            vec2 an = vec2(FL[i].x, flBranch(Ly, FL[i].x));
            float rope = hkSeg(p, an, lp.xy + vec2(0.0, 0.09 * s)) - 0.003 * s;
            col = mix(col, vec3(0.03, 0.025, 0.02), (1.0 - smoothstep(0.0, 0.002, rope)) * on);
            vec4 lan = flLantern(d / (0.17 * s), LL[i], lcol, 0.9 + 0.1 * noise21(vec2(uRTime * 5.0, float(i))));
            col = mix(col, lan.rgb, lan.a * on);
            col += lcol * LL[i] * exp(-length(d) / (0.12 * s)) * 0.30 * (1.0 - lan.a);
        }
        // niebla entre esta capa y la siguiente
        if (Ly < 2) {
            float fz = plate3Wrap(vec2(p.x * (0.22 + Lf * 0.1) + t * (0.008 + Lf * 0.004) + mid * 0.01, p.y * 0.5 + Lf)).g;
            float fogA = hkDR(0.0, 0.375, 1.0, uD3) * (0.6 + 0.6 * fz) * smoothstep(0.9, -0.6, p.y) * (Ly == 0 ? 1.0 : 0.6);
            col = mix(col, vec3(0.10, 0.10, 0.15) + lcol * 0.04 * nL / 16.0, clamp(fogA, 0.0, 0.8));
        }
    }

    // --- luciernagas (agudos) y hojas que caen (D4, la rafaga) ---
    float ff = hkParticles(p0 * 0.9 + vec2(sin(t * 0.3) * 0.2, 0.0), uRTime, 0.03 + high * 0.18, vec2(0.2, 0.3), 0.025);
    col += vec3(0.75, 1.0, 0.35) * ff * (0.4 + high * 2.0) * smoothstep(0.7, -0.3, p0.y);
    float nLeaf = hkDR(0.0, 0.3, 1.0, uD4) + gust * 0.5;
    if (nLeaf > 0.01) {
        for (int k = 0; k < 2; k++) {
            float fk = float(k);
            float sc = 5.0 + fk * 3.0;
            vec2 g = p0 * sc + vec2(uRTime * (0.6 + gust * 3.0) - sin(uRTime * 0.7 + fk) * 0.6, uRTime * (1.0 + fk * 0.5)) + fk * 9.0;
            vec2 id = floor(g);
            vec2 f = fract(g) - 0.5;
            vec2 h = hash22(id + fk * 5.0);
            if (h.x > nLeaf * hkDR(0.3, 0.3, 0.6, uD4)) continue;
            float a = uRTime * (2.0 + h.y * 3.0) + h.x * 6.28;
            f -= (h - 0.5) * 0.5;
            vec2 lq = mat2(cos(a), -sin(a), sin(a), cos(a)) * f;
            float leaf = 1.0 - smoothstep(0.08, 0.11, length(lq * vec2(1.0, 2.4 + 1.6 * abs(sin(a)))));
            vec3 lc2 = mix(vec3(0.55, 0.20, 0.05), vec3(0.65, 0.40, 0.08), h.y) * hkDR(0.35, 0.35, 0.75, uD4);
            col = mix(col, lc2, leaf * 0.9);
        }
    }

    col = audioLift(col, high * 0.05);
    // EASTER EGG "JAY INFINITO" (fase 38): dos faroles se sueltan y flotan
    // cruzandose: sus luces dejan dibujado un infinito en el aire
    vec2 EG = hkEgg(28.0);
    if (EG.x > 0.0) {
        vec2 ic = vec2(0.0, 0.22);
        float ia = 0.62 * hkEggS;                              // fase 39: mas chico
        vec2 iq = p0 - ic;
        float tr = exp(-hkInfD(iq, ia) / 0.006) * smoothstep(0.1, 0.5, EG.y);
        col += vec3(1.0, 0.55, 0.25) * (tr * 0.45 + exp(-hkInfD(iq, ia) / 0.06) * 0.08) * EG.x;
        for (int k = 0; k < 2; k++) {
            vec2 lp = hkInfPath(uRTime * 1.4 + float(k) * 3.14159, ia);
            vec2 lq = (iq - lp) / (0.05 * hkEggS);
            float body = 1.0 - smoothstep(0.8, 1.0, length(lq * vec2(1.0, 0.75)));
            vec3 paper = vec3(1.0, 0.45, 0.25) * (0.9 + 0.4 * (1.0 - length(lq) * 0.6));
            col = mix(col, paper * 1.4, body * smoothstep(0.0, 0.3, EG.x));
            col += vec3(1.0, 0.6, 0.3) * exp(-length(iq - lp) / 0.10) * 0.35 * EG.x;
        }
    }
    // LUZ DE TECLA (fase 37): el farol se aviva
    col = hkKeyLit(col, p0, 0.2, vec2(0.3, 0.5), vec3(1.0, 0.45, 0.25), vec3(1.0, 0.75, 0.35), 0.05, 1.2);
    return vec4(hkFinish(col, uv, vec3(0.5, 0.3, 0.5)), 1.0);
}
