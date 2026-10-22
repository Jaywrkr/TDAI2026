// ===============================================================
// HALLOWEEN 15 - MANOS DE ZOMBIE
// Matte painting con LAMINAS horneadas (plates/scene15, ver
// td/tools/bake_plates_zombies.py): cementerio de noche con reja de
// hierro, mausoleo, lapidas torcidas y arboles pelados; adelante, la
// tierra recien removida con montículos, terrones, raices y un agujero
// en cada tumba. De los agujeros salen manos de zombie (piel podrida,
// venas, hueso en las puntas, manga rota) que abren y cierran los dedos:
// el shader mezcla la pose abierta y la de garra. Una luz verde
// enfermiza sale de la tierra.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la luz de la tierra crece y late
//   medios -> las manos se mecen y abren/cierran los dedos
//   agudos -> brillo humedo en la piel y en la niebla
//   golpe  -> estiron (D4), cada mano con su retraso, y saltan terrones;
//             con Chaos salen casi enteras y tiemblan
// PIANO: cada tecla hace salir con fuerza la mano de la tumba mas cercana
//   (grave a la izquierda), que se estira y cierra la garra mientras la
//   tecla siga apretada, con terrones que saltan; al soltarla vuelve a
//   hundirse. Un acorde saca varias.
// Speed mueve la niebla, las nubes y el ritmo de los dedos en silencio.
// Cada acto cambia cuantas manos hay.
// REPERTORIO (fase 33, motor hkSuceso del kit):
//   ESTADOS (~5 min): niebla verde, luna clara y tormenta (un relampago
//     lejano cada tanto, a lo sumo uno cada 5 s).
//   SUCESOS (~55 s, 7): un relampago lejano recorta el fondo; una mano
//     saluda; un cuervo se posa en una mano y se va; se abre la puerta de
//     la cripta con luz; una cabeza asoma de la tierra; los dedos
//     tamborilean de a uno; la tierra se raja con luz entre las tumbas.
//   DETALLES (~30 s, 5): un dedo se mueve solo, una luciernaga verde, cae
//     un terron, una nube tapa la luna, ojos en la cripta.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A la ola: la tierra tiembla, cae un rayo y sale una mano sola;
//       despues salen todas en ola y se quedan aranando el aire.
//     B manos al aire: salen todas y se mecen juntas con el bajo, de un
//       lado al otro, como el publico de un recital.
//     C el zombi: del agujero del centro sube un cuerpo entero con los
//       brazos levantados y los ojos encendidos; despues se hunde.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con relampagos.
// @EST: niebla verde | luna clara | tormenta
// @SUC: relampago | saluda | el cuervo | la cripta se abre | asoma una cabeza | tamborilean | la tierra se raja
// @DET: un dedo | luciernaga | cae un terron | nube en la luna | ojos en la cripta
// @CLX: A la ola | B manos al aire | C el zombi
//
// @D1: cantidad de manos (cada una nueva sale de la tierra)
// @D2: cuanto salen de la tierra
// @D3: cuanto se abren los dedos
// @D4: estiron con el golpe
// @D5: luz (verde enfermizo <-> rojo)
// @D6: tierra que salta
// ===============================================================

const vec4 BACK_R = vec4(-3.1, -0.8, 6.2, 1.4);
const vec4 GROUND_R = vec4(-3.1, -1.2, 6.2, 0.95);
const vec4 HAND_R = vec4(-0.5, -0.25, 1.0, 1.55);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// agujeros de las tumbas: la misma lista que el horneado
const vec2 HOLES[9] = vec2[9](vec2(-2.25, -0.50), vec2(-1.50, -0.47), vec2(-0.75, -0.52), vec2(0.0, -0.46), vec2(0.75, -0.51),
                              vec2(1.50, -0.47), vec2(2.25, -0.50), vec2(-1.12, -0.60), vec2(1.12, -0.60));
// orden en que aparecen las manos al subir D1 (centro primero)
const int ORDER[9] = int[9](3, 2, 4, 1, 5, 7, 8, 0, 6);

vec4 render(vec2 uv) {
    // encuadre bajo: la tierra y las manos ocupan mas de la pantalla
    vec2 p = hkCam(hkPunch(hkShake(centered(uv)))) * 0.82 + vec2(0.0, -0.30);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    // --- calendario (fase 33) ---
    hkSetClimax(20.0, 18.0, 22.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(20.0, 7, 9.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(20.0, 5, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(20.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(20.0, 3));
    float cph = cA * C.w;
    float horde = 0.0;
    // aviso: tiembla la tierra; un rayo cerca del final del aviso
    float quake = cA * C.x * (1.0 - C.y) * (1.0 - C.z);
    // relampagos: el del climax A y el gran climax como antes; el del suceso
    // y la tormenta, uno por casillero de 5 s (limite de destellos)
    float boltE = max(step(0.24, cph) * step(cph, 0.30), G.y) * step(0.75, noise21(vec2(uRTime * 8.0, 2.0)));
    float fslot = floor(uRTime / 5.0);
    float fk = uRTime - fslot * 5.0 - 3.5 * hash21(vec2(fslot, 9.0));
    float pulse = smoothstep(0.0, 0.05, fk) * (1.0 - smoothstep(0.08, 0.45, fk));
    boltE = max(boltE, max(sv == 0 ? se : 0.0, EST.z * step(0.45, hash21(vec2(fslot, 5.0)))) * pulse);
    // B: todas arriba, meciendose juntas; C: el zombi
    float crowd = cB * smoothstep(0.05, 0.25, C.w) * (1.0 - smoothstep(0.82, 0.96, C.w));
    float zomb = cC * smoothstep(0.10, 0.55, C.w) * (1.0 - smoothstep(0.75, 0.95, C.w));
    // ola de izquierda a derecha en el pico
    float waveX = mix(-2.8, 2.8, clamp((cph - 0.36) / 0.28, 0.0, 1.0));
    float inWave = step(0.36, cph) * (1.0 - smoothstep(0.92, 1.0, cph));
    vec3 glowC = mix(vec3(0.35, 1.0, 0.30), vec3(1.0, 0.18, 0.08), uD5);
    float glow = 0.55 + bass * 0.9 + hit * 0.3 + cA * (C.x * 0.4 * (1.0 - C.z) + C.y * 0.6) + crowd * 0.4 + zomb * 0.5;
    vec3 moonC = vec3(0.55, 0.62, 0.75);

    // --- cielo, luna y nubes ---
    vec3 col = mix(vec3(0.020, 0.035, 0.030), vec3(0.004, 0.006, 0.010), smoothstep(-0.4, 1.0, p.y));
    vec2 mc = vec2(-uAspect * 0.62, 0.70);
    float md = length(p - mc);
    float moonK = (1.0 + EST.y * 0.6) * (1.0 - (dv == 3 ? D.x * 0.7 * sin(D.y * PI) : 0.0));
    col += moonC * (1.0 - smoothstep(0.10, 0.11, md)) * (0.45 + 0.3 * fbm((p - mc) * 14.0, 3, 0.5)) * moonK;
    col += moonC * exp(-md * 3.5) * 0.12 * moonK;
    float cl = plate7Wrap(vec2(p.x * 0.12 - t * 0.006, p.y * 0.5)).r;
    col = mix(col, vec3(0.012, 0.018, 0.018) + moonC * 0.05 * exp(-md * 2.0), smoothstep(0.5, 0.75, cl) * smoothstep(0.0, 0.5, p.y) * 0.85);
    col += vec3(0.7, 0.8, 1.0) * boltE * 0.25 * smoothstep(-0.3, 0.8, p.y);

    // --- cementerio del fondo ---
    vec4 bk = plate0(rUV(p, BACK_R));
    if (bk.a > 0.0) {
        vec3 bc = plateCol(bk.rgb) * (0.4 + moonC * 0.4 * (1.0 + EST.y * 0.8)) + glowC * 0.012;
        bc = mix(bc, vec3(0.002), boltE * 0.9);                       // recorte con el relampago
        col = mix(col, bc, bk.a);
    }
    // niebla entre el fondo y las tumbas
    float fz = plate7Wrap(vec2(p.x * 0.09 - t * 0.007, p.y * 0.6)).g;
    col = mix(col, glowC * 0.10 + moonC * 0.06, smoothstep(0.4 - EST.x * 0.15, 0.8, fz) * exp(-pow((p.y + 0.45) / (0.15 + EST.x * 0.10), 2.0)) * (0.6 + EST.x * 0.2 - EST.y * 0.3));
    // suceso: la puerta de la cripta se abre con luz; detalle: ojos en la cripta
    vec2 door = vec2(-0.25, -0.20);
    if (sv == 3) {
        vec2 dq = p - door;
        float open = se * smoothstep(0.1, 0.4, sp);
        float slit = (1.0 - smoothstep(0.035 * open, 0.035 * open + 0.01, abs(dq.x))) * step(abs(dq.y), 0.10);
        col += glowC * (slit * 0.6 + exp(-length(dq * vec2(2.0, 1.0)) * 5.0) * 0.25 * open) * (0.8 + 0.2 * sin(uRTime * 3.0));
    }
    if (dv == 4) {
        vec2 eq = vec2(abs(p.x - door.x) - 0.018, p.y - door.y - 0.02);
        col += vec3(1.0, 0.2, 0.1) * exp(-dot(eq, eq) * 30000.0) * D.x * step(0.15, fract(D.y * 3.0)) * 1.5;
    }

    // --- manos ---
    vec2 quakeOff = (vec2(noise21(vec2(uRTime * 30.0, 1.0)), noise21(vec2(uRTime * 30.0, 5.0))) - 0.5) * 0.02 * quake;
    p += quakeOff;
    float nH = 2.0 + uD1 * 6.0 + hkActVal(3.0) * 1.0;
    for (int kk = 0; kk < 9; kk++) {
        int i = ORDER[kk];
        vec2 hole = HOLES[i];
        if (abs(p.x - hole.x) > 0.65) continue;
        // presencia: D1 de a una + la mano sola del aviso + la ola del pico + el piano
        float kb = 0.0;
        for (int k = 0; k < N_KEYS; k++) {
            if (abs(hkKeyX(k) * 1.05 - hole.x) < 0.38) kb = max(kb, keyEnv(k, 0.12, 0.8) * (0.5 + keyVel(k) * 0.7));
        }
        float lone = kk == 0 ? smoothstep(0.26, 0.34, cph) : 0.0;
        float emerge = max(max(revealAt(nH, float(kk)), kb), max(lone, inWave * smoothstep(hole.x + 0.3, hole.x - 0.1, waveX)));
        emerge = max(emerge, crowd);
        if (zomb > 0.0 && i == 3) emerge *= 1.0 - zomb;                // el zombi sale por el agujero del centro
        if (emerge < 0.01) continue;
        float fi = float(i);
        float h1 = hash21(vec2(fi, 4.0));
        float s = (0.56 + 0.08 * h1) * (i >= 7 ? 0.8 : 1.0);
        // cuanto sale: D2 + ola propia + estiron del golpe con retraso
        float lag = fract(h1 * 5.0) * 0.3;
        float stretch = smoothstep(0.0, 0.25, hit - lag) * uD4 * 0.5 + kb * 0.45;
        float rise = clamp(0.40 + uD2 * 0.60 + 0.08 * sin(t * (0.6 + h1 * 0.5) + fi * 2.0) + stretch + cA * C.y * 0.35 + hit * loco * 0.3 + crowd * 0.35, 0.0, 1.15);
        // sale de la tierra: con emerge = 0 queda bajo tierra
        rise = mix(-0.15, rise, emerge);
        float sway = (0.06 + mid * 0.18) * sin(t * (0.8 + h1) + fi * 1.7) + hit * loco * 0.08 * sin(uRTime * 30.0 + fi);
        // B: todas se mecen juntas; suceso: una saluda
        sway = mix(sway, 0.35 * sin(uRTime * 2.2) * (0.8 + bass * 0.4), crowd);
        bool waver = sv == 1 && i == int(ss * 8.99);
        if (waver) sway = mix(sway, 0.45 * sin(uRTime * 6.0), se);
        vec2 base = hole + vec2(0.0, (rise - 0.95) * s * 1.2);
        vec2 q = p - base;
        float c = cos(sway), sn = sin(sway);
        q = vec2(c * q.x + sn * q.y, -sn * q.x + c * q.y) / s;
        if (h1 > 0.5) q.x = -q.x;                                     // mano izquierda/derecha
        vec2 hu = rUV(q, HAND_R);
        // abre y cierra los dedos: mezcla de las dos poses
        float open = clamp(0.5 + 0.5 * sin(t * (1.1 + h1) + fi * 3.0) * (0.4 + mid) + (uD3 - 0.5) * 1.2 + stretch, 0.0, 1.0);
        // garra: con el piano apretado o arañando el aire despues de la ola
        open = mix(open, 0.5 + 0.5 * sin(uRTime * 7.0 + fi), max(kb, cA * C.z) * 0.8);
        if (waver) open = mix(open, 1.0, se);
        if (crowd > 0.0) open = mix(open, 1.0, crowd);
        // suceso: tamborilean de a una; detalle: un dedo se mueve
        if (sv == 5) open = mix(open, 0.5 + 0.5 * sin(uRTime * 9.0 + fi * 1.3), se * exp(-pow((hole.x - mix(-2.5, 2.5, fract(sp * 2.0))) / 0.8, 2.0)));
        if (dv == 0 && i == int(D.w * 8.99)) open = mix(open, 0.5 + 0.5 * sin(uRTime * 5.0), D.x);
        vec4 ho = plate3(hu), hg = plate5(hu);
        float k = smoothstep(0.35, 0.65, open);
        vec4 hc = mix(hg, ho, k);
        if (hc.a <= 0.01) continue;
        vec4 hn = mix(plate6(hu), plate4(hu), k);
        vec2 nxy = hn.rg * 2.0 - 1.0;
        if (h1 > 0.5) nxy.x = -nxy.x;
        vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
        vec3 alb = plateCol(hc.rgb);
        // luz de la tierra desde abajo + luna arriba a la izquierda
        float below = exp(-max(p.y - hole.y, 0.0) * 1.6);
        // la tumba es una luz puntual abajo: ilumina lo que la mira (dedos por
        // debajo, el canto del antebrazo); la luna marca nudillos y tendones
        vec3 Lg = normalize(vec3((hole - p) * vec2(h1 > 0.5 ? -1.0 : 1.0, 1.0), 0.18));
        vec3 lit = glowC * glow * (0.12 + 1.1 * max(dot(n, Lg), 0.0)) * below * 1.1;
        lit += moonC * 0.34 * max(dot(n, normalize(vec3(-0.6, 0.5, 0.6))), 0.0);
        lit += glowC * glow * 0.25 * pow(1.0 - n.z, 2.0) * below;                // canto
        lit += vec3(0.02);
        vec3 hcol = alb * lit;
        hcol += vec3(0.6, 0.7, 0.6) * pow(max(dot(n, normalize(vec3(-0.3, 0.4, 0.86))), 0.0), 24.0) * (0.05 + high * 0.15);   // brillo humedo
        col = mix(col, hcol, hc.a);
    }

    // --- C: el zombi sube por el agujero del centro ---
    if (zomb > 0.0) {
        vec2 hole = HOLES[3];
        vec2 zq = (p - hole - vec2(0.0, mix(-1.2, 0.0, zomb))) / 0.55;
        zq.x += 0.03 * sin(uRTime * 1.5);
        float head = length((zq - vec2(0.03, 1.05)) / vec2(0.85, 1.0)) - 0.20;
        float shoulders = length((zq - vec2(0.0, 0.75)) / vec2(1.0, 0.45)) - 0.38;
        float torso = length(max(abs(zq - vec2(0.0, 0.35)) - vec2(0.28, 0.45), 0.0)) - 0.10;
        float up = smoothstep(0.3, 0.8, zomb);
        float armL = hkSeg(zq, vec2(-0.32, 0.72), vec2(-0.55 - 0.1 * up, mix(0.2, 1.45, up))) - 0.075;
        float armR = hkSeg(zq, vec2(0.32, 0.72), vec2(0.58 + 0.1 * up, mix(0.15, 1.40, up) + 0.05 * sin(uRTime * 3.0))) - 0.075;
        float zd = hkSmin(hkSmin(hkSmin(head, torso, 0.06), shoulders, 0.05), min(armL, armR), 0.05);
        zd += (noise21(zq * 30.0) - 0.5) * 0.02;                     // ropa rota
        float zm = 1.0 - smoothstep(-0.01, 0.01, zd);
        float below = exp(-max(zq.y, 0.0) * 1.2);
        vec3 zc = vec3(0.02, 0.025, 0.018) + glowC * glow * 0.12 * below * (0.6 + 0.4 * noise21(zq * 12.0)) + moonC * 0.025 * smoothstep(0.3, 1.0, zq.y);
        col = mix(col, zc, zm);
        col += glowC * (1.0 - smoothstep(0.0, 0.10, abs(zd))) * 0.18 * glow * (0.3 + 0.7 * below);
        vec2 eq = vec2(abs(zq.x) - 0.07, zq.y - 1.08);
        col += vec3(1.0, 0.85, 0.3) * exp(-dot(eq, eq) * 2500.0) * zomb * 1.6;
    }
    // --- suceso: una cabeza asoma de la tierra ---
    if (sv == 4 && se > 0.0) {
        vec2 hole = HOLES[int(ss * 6.99)];
        float up = sin(clamp(sp * 1.1, 0.0, 1.0) * PI);
        vec2 hq = (p - hole - vec2(0.0, mix(-0.20, 0.06, up))) / 0.16;
        float hd = length(hq / vec2(0.85, 1.0)) - 1.0;
        col = mix(col, vec3(0.012, 0.015, 0.01) + glowC * glow * 0.08 * smoothstep(0.5, -1.0, hq.y), (1.0 - smoothstep(-0.05, 0.05, hd)) * se);
        col += glowC * (1.0 - smoothstep(0.0, 0.12, abs(hd))) * 0.25 * se * glow;
        vec2 eq = vec2(abs(hq.x) - 0.32, hq.y - 0.15);
        col += vec3(1.0, 0.85, 0.3) * exp(-dot(eq, eq) * 120.0) * se * up * 1.4;
    }
    // --- suceso: un cuervo se posa en una mano ---
    if (sv == 2 && se > 0.0) {
        vec2 hole = HOLES[int(ss * 6.99)];
        vec2 perch = hole + vec2(0.0, 0.58);
        float land = smoothstep(0.0, 0.3, sp), leave = smoothstep(0.75, 1.0, sp);
        vec2 cpos = perch + vec2((1.0 - land) * 1.2 + leave * 1.5, (1.0 - land) * 0.7 + leave * leave * 1.0);
        vec2 cq = (p - cpos) / 0.10;
        float body = length(cq / vec2(1.0, 0.75)) - 0.5;
        float headC = length(cq - vec2(0.35, 0.45)) - 0.22;
        float beak = max(abs(cq.y - 0.45) - 0.05 + (cq.x - 0.55) * 0.15, abs(cq.x - 0.68) - 0.14);
        float tail = max(abs(cq.x + 0.65) - 0.25, abs(cq.y + 0.10 + (cq.x + 0.65) * 0.4) - 0.07);
        float crow = min(min(body, headC), min(beak, tail));
        float fl = max(1.0 - land, leave);
        float ax = abs(cq.x + 0.05);
        float wing = max(abs(cq.y - 0.15 - sin(uRTime * 14.0) * 0.6 * ax) - 0.12 * (1.2 - ax * 0.6), ax - 1.25);
        crow = min(crow, mix(1e3, wing, step(0.05, fl)));
        col = mix(col, vec3(0.005), (1.0 - smoothstep(-0.03, 0.03, crow)) * se);
        col += (glowC * 0.20 + moonC * 0.10) * (1.0 - smoothstep(0.0, 0.08, abs(crow))) * se * glow;
    }
    // --- tierra removida (tapa el antebrazo) ---
    vec2 gu = rUV(p, GROUND_R);
    vec4 ga = plate1(gu);
    if (ga.a > 0.0) {
        vec4 gn = plate2(gu);
        vec2 nxy = gn.rg * 2.0 - 1.0;
        vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
        vec3 alb = plateCol(ga.rgb);
        float gl = 0.0;
        for (int kk = 0; kk < 9; kk++) {
            vec2 d = (p - HOLES[ORDER[kk]]) * vec2(1.0, 2.0);
            gl += exp(-dot(d, d) * 9.0) * max(revealAt(nH, float(kk)), max(inWave, max(cA * C.x * 0.5, crowd)));
        }
        // suceso: la tierra se raja con luz entre las tumbas
        if (sv == 6) {
            float cx = mix(-2.6, 2.6, smoothstep(0.05, 0.6, sp));
            float crack = abs(p.y + 0.62 + 0.04 * sin(p.x * 7.0) + 0.02 * noise21(vec2(p.x * 20.0, 3.0)));
            gl += (1.0 - smoothstep(0.004, 0.02, crack)) * step(p.x, cx) * se * 6.0 * (1.0 - smoothstep(0.75, 1.0, sp));
        }
        vec3 lit = vec3(0.025) + moonC * 0.30 * max(dot(n, normalize(vec3(-0.6, 0.6, 0.5))), 0.0) + glowC * glow * gl * 0.45;
        col = mix(col, alb * lit * 2.2, ga.a);
    }
    // resplandor de los agujeros en el aire
    for (int kk = 0; kk < 9; kk++) {
        vec2 hole = HOLES[ORDER[kk]];
        vec2 d = (p - hole - vec2(0.0, 0.12)) * vec2(1.4, 0.9);
        col += glowC * exp(-dot(d, d) * 14.0) * glow * 0.10 * max(revealAt(nH, float(kk)), max(inWave, max(cA * C.x * 0.5, crowd)));
    }

    // --- terrones que saltan con el golpe ---
    // piano: tambien saltan terrones donde sale la mano
    float dirtAmt = max(max(uD6 * hit, 0.0), (dv == 2 ? D.x * 0.6 : 0.0) + zomb * 0.5);
    for (int k = 0; k < N_KEYS; k++) dirtAmt = max(dirtAmt, keyEnv(k, 0.05, 0.5) * exp(-keyAge(k) * 1.5) * 0.8);
    dirtAmt = max(dirtAmt, quake * 0.5);
    if (dirtAmt > 0.02) {
        float ph = fract(uRTime * 1.3);
        for (int kk = 0; kk < 4; kk++) {
            vec2 hole = HOLES[ORDER[kk]];
            if (abs(p.x - hole.x) > 0.5) continue;
            for (int j = 0; j < 5; j++) {
                float fj = float(j);
                vec2 v = (hash22(vec2(float(kk) * 7.0 + fj, floor(uRTime * 1.3))) - vec2(0.5, 0.0)) * vec2(0.9, 1.3);
                vec2 cp = hole + v * ph * 0.6 + vec2(0.0, -1.6 * ph * ph * 0.5);
                float r = 0.012 + 0.012 * hash21(vec2(fj, float(kk)));
                col = mix(col, vec3(0.06, 0.045, 0.03) + glowC * 0.05, (1.0 - smoothstep(r, r + 0.004, length(p - cp))) * dirtAmt);
            }
        }
    }

    // --- niebla baja adelante ---
    float fz2 = plate7Wrap(vec2(p.x * 0.07 - t * 0.010, p.y * 0.4 + 0.5)).b;
    col = mix(col, glowC * 0.08 + moonC * 0.05, smoothstep(0.42, 0.8, fz2) * exp(-pow((p.y + 0.85) / 0.22, 2.0)) * (0.35 + high * 0.15));

    // detalle: una luciernaga verde
    if (dv == 1) {
        vec2 fq = p - vec2((D.w - 0.5) * 4.0 + 0.3 * sin(D.y * 7.0), -0.35 + 0.15 * sin(D.y * 11.0));
        col += glowC * exp(-dot(fq, fq) * 20000.0) * D.x * (0.6 + 0.4 * sin(uRTime * 4.0)) * 1.5;
    }
    // LUZ DE TECLA (fase 37): la tierra brilla verde donde sale la mano
    col = hkKeyLit(col, p, -0.4, vec2(0.3, 0.45), vec3(0.4, 1.0, 0.5), vec3(0.7, 1.0, 0.4), 0.05, 1.2);
    return vec4(hkFinish(col, uv, vec3(0.15, 0.4, 0.2)), 1.0);
}
