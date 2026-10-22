// ===============================================================
// HALLOWEEN 13 - CALABAZAS EN HILERA
// Un campo de calabazas de noche (LAMINAS horneadas, plates/scene13,
// ver td/tools/bake_plates_hilera.py): colinas con arboles pelados, una
// casa y un granero con las ventanas encendidas, maizal seco, fardos de
// paja, una cerca y calabacitas en el campo. Adelante, un muro de piedra
// con remate de lajas y musgo; arriba, una fila de calabazas talladas
// (la calabaza con relieve de la escena 01), cada una con su cara. Laten
// como un ecualizador y cada una ILUMINA en vivo el muro y a sus vecinas.
//
// BAILE (cada calabaza escucha una banda distinta):
//   bajo   -> las de la izquierda;   medios -> las del centro
//   agudos -> las de la derecha;     tambien titilan las estrellas
//   golpe  -> ola de destellos de un lado al otro (D3); con Chaos
//             saltan, cada una a su tiempo, y el fuego se pone rojo
// PIANO: cada tecla prende con todo la calabaza de esa posicion (grave a
//   la izquierda): abre la boca y le sale una lengua de fuego por arriba;
//   la fuerza la hace mas alta; apretada sigue ardiendo. Acordes: varias.
// Speed mueve las llamas, la niebla y las nubes aun en silencio.
// Cada acto cambia cuantas hay.
// REPERTORIO (fase 33, motor hkSuceso del kit):
//   ESTADOS (~5 min): noche clara, niebla (el campo se pierde) y viento
//     (las llamas se acuestan y las nubes corren).
//   SUCESOS (~55 s, 7): persecucion de luz; un cuervo se posa en el muro;
//     una calabaza se apaga y se vuelve a prender de golpe; cantan en ola
//     (abren la boca de a una); un murcielago cruza la luna; se encienden
//     todas las ventanas de la granja; todas miran hacia un lado.
//   DETALLES (~30 s, 5): estrella fugaz, una chispa salta de una calabaza,
//     una calabaza parpadea, cae una hoja, una nube tapa la luna.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A al rojo: la persecucion va cada vez mas rapido con el cuervo
//       mirando; todas giran a rojo y escupen fuego; el cuervo se va.
//     B el coro: abren la boca y echan fuego por turnos, de un lado al
//       otro, con el bajo, como un organo.
//     C la luna calabaza: la luna crece y se vuelve una cara tallada que
//       brilla; todas las calabazas la miran; despues vuelve a ser luna.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A mas largo.
// @EST: noche clara | niebla | viento
// @SUC: persecucion | el cuervo | se apaga y se prende | cantan en ola | murcielago en la luna | la granja se enciende | miran a un lado
// @DET: estrella fugaz | chispa | parpadea | hoja que cae | nube en la luna
// @CLX: A al rojo | B el coro | C la luna calabaza
//
// @D1: cantidad de calabazas (la fila se acomoda y la nueva crece)
// @D2: cuanto laten con el audio
// @D3: ola del golpe (lenta <-> instantanea)
// @D4: tamano
// @D5: color (naranja <-> violeta embrujado)
// @D6: niebla del piso
// ===============================================================

const vec4 FIELD_R = vec4(-3.1, -0.45, 6.2, 0.90);
const vec4 WALL_R = vec4(-3.1, -1.2, 6.2, 0.94);
const vec4 HERO_R = vec4(-0.85, -0.62, 1.70, 1.42);
const float WALL_TOP = -0.32;
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// cara tallada (varia por calabaza); q en unidades del cuerpo (~0.8 de alto)
float hwFace(vec2 q, float hsh, float open) {
    vec2 e = vec2(abs(q.x) - 0.32, q.y - 0.18);
    float eyes = max(abs(e.x) * 1.7 + e.y * (hsh > 0.5 ? 1.0 : -1.0) - 0.16, abs(e.y) - 0.14);
    float my = q.y + 0.30 - (0.25 + hsh * 0.25 + open * 0.2) * q.x * q.x;
    float mouth = max(abs(my) - 0.09 - open * 0.05, abs(q.x) - 0.55);
    float teeth = step(0.5, fract(q.x * 3.0 + hsh)) * step(my, -0.02);
    mouth = max(mouth, -(teeth - 0.5));
    float nose = max(abs(q.x) * 1.6 + (q.y + 0.02) * 1.2 - 0.10, -(q.y + 0.06));
    return min(min(eyes, mouth), nose);
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.006);
    vec3 orange = mix(hsv2rgb(vec3(fract(0.07 + hue), 0.95, 1.0)),
                      hsv2rgb(vec3(fract(0.80 + hue), 0.75, 1.0)), uD5);
    vec3 moonC = vec3(0.55, 0.60, 0.85);

    // --- calendario (fase 33) ---
    hkSetClimax(4.0, 18.0, 24.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(4.0, 7, 10.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ssd = S.w;
    vec4 D = hkDetalle(4.0, 5, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(4.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(4.0, 3));
    float clph = cA * C.w;
    float cAy = cA * C.y;
    float chase = max(sv == 0 ? se : 0.0, cA * C.x * (1.0 - C.y));
    float redE = cA * max(C.y, C.z * 0.4);
    // el cuervo: posado durante el aviso y el pico del climax, levanta vuelo despues
    float crowE = max(sv == 1 ? se : 0.0, step(0.0001, clph) * (1.0 - smoothstep(0.92, 1.0, clph)));
    float crowFly = clamp((clph - 0.68) / 0.30, 0.0, 1.0) * step(0.0001, clph);
    // B: el coro; C: la luna se vuelve calabaza
    float choir = cB * smoothstep(0.05, 0.20, C.w) * (1.0 - smoothstep(0.85, 0.97, C.w));
    float moonJ = cC * smoothstep(0.08, 0.40, C.w) * (1.0 - smoothstep(0.75, 0.95, C.w));
    // hacia donde miran las caras (suceso y C)
    float lookX = (sv == 6 ? se * (ssd > 0.5 ? 1.0 : -1.0) * 0.10 : 0.0) - moonJ * 0.10;
    // cantidad continua: la fila se acomoda sin saltar y la nueva crece
    float n = 4.0 + uD1 * 4.0 + hkActVal(5.0) * 1.5;
    float nSlots = ceil(n);
    float span = uAspect * 1.7;
    float cw = span / n;

    // --- cielo: luna de cosecha, nubes, estrellas ---
    vec3 col = mix(vec3(0.05, 0.03, 0.08), vec3(0.006, 0.004, 0.014), smoothstep(-0.3, 1.0, p.y));
    vec2 mc = vec2(-uAspect * 0.55, 0.55) + vec2(0.4, -0.05) * moonJ;
    float mR = 0.17 * (1.0 + moonJ * 1.4);
    float md = length(p - mc);
    col += vec3(1.0, 0.75, 0.45) * (1.0 - smoothstep(mR, mR + 0.01, md)) * (0.8 + 0.2 * plate5Wrap((p - mc) * 0.6).a);
    col += vec3(1.0, 0.6, 0.3) * exp(-max(md - mR, 0.0) * 4.0) * (0.25 + moonJ * 0.3);
    col = hkStyleMoon(col, p, mc, mR);
    // C: la luna tallada como calabaza
    if (moonJ > 0.0 && md < mR * 1.05) {
        float face = hwFace((p - mc) / mR * 0.85, 0.3, 0.3 + bass * 0.4);
        float carve = (1.0 - smoothstep(-0.02, 0.02, face)) * moonJ;
        vec2 mq = (p - mc) / mR;
        float ribs = 0.75 + 0.25 * cos(mq.x * 9.0 / max(sqrt(max(1.0 - mq.y * mq.y, 0.05)), 0.3));
        vec3 skin = vec3(0.55, 0.18, 0.03) * ribs * (0.5 + 0.5 * smoothstep(1.0, 0.2, length(mq)));
        float disk = 1.0 - smoothstep(0.99, 1.01, length(mq));
        col = mix(col, skin, moonJ * disk);
        col = mix(col, vec3(1.0, 0.75, 0.25) * (1.2 + bass * 0.8), carve * disk);
    }
    // suceso: un murcielago cruza la luna
    if (sv == 4 && se > 0.0) {
        vec2 bq = (p - mc - vec2(mix(-0.5, 0.5, ssd > 0.5 ? sp : 1.0 - sp), 0.03 * sin(sp * 20.0))) / 0.06;
        float flap = sin(uRTime * 12.0);
        float ax = abs(bq.x);
        float wing = max(abs(bq.y - flap * 0.5 * ax + 0.25 * ax * ax) - 0.18 * (1.0 - ax), ax - 1.0);
        float bat = min(length(bq / vec2(0.18, 0.3)) - 1.0, wing * 3.0);
        col = mix(col, vec3(0.01), (1.0 - smoothstep(-0.05, 0.05, bat)) * se);
    }
    // detalle: estrella fugaz
    if (dv == 0) {
        vec2 s0 = vec2((D.w - 0.2) * 3.0, 0.95);
        vec2 sdir = normalize(vec2(0.8, -0.3));
        vec2 rel = p - (s0 + sdir * D.y * 1.2);
        float along = dot(rel, sdir), perp = abs(rel.x * sdir.y - rel.y * sdir.x);
        col += vec3(0.9, 0.9, 1.0) * exp(-perp * 500.0) * smoothstep(-0.3, 0.0, along) * step(along, 0.0) * (1.0 + along * 3.0) * D.x * 1.5;
    }
    float cl = plate5Wrap(vec2(p.x * 0.10 - t * (0.004 + EST.z * 0.02), p.y * 0.4)).r;
    col = mix(col, vec3(0.02, 0.015, 0.03) + vec3(1.0, 0.6, 0.3) * 0.08 * exp(-md * 2.0), smoothstep(0.55, 0.75, cl) * smoothstep(0.0, 0.4, p.y) * 0.8);
    // detalle: una nube tapa la luna
    if (dv == 4) {
        vec2 cq = (p - mc - vec2((D.y - 0.5) * 1.2, 0.0)) / vec2(0.35, 0.07);
        col = mix(col, vec3(0.02, 0.015, 0.03) + vec3(1.0, 0.6, 0.3) * 0.05, smoothstep(1.0, 0.4, length(cq) + 0.3 * noise21(p * 8.0)) * D.x * 0.9);
    }
    float sh = hash21(floor(p * 100.0));
    col += vec3(0.8) * step(0.994, sh) * (0.5 + 0.5 * sin(t * 3.0 + sh * 40.0) * (0.5 + high)) * smoothstep(0.1, 0.6, p.y);

    // --- luz de las 5 calabazas mas cercanas al pixel (j = 2 es la de
    // este pixel); se usa en el muro, el campo y las vecinas ---
    float idx = clamp(floor((p.x + span * 0.5) / cw), 0.0, nSlots - 1.0);
    float lits[5];
    vec2 cs[5];
    float ss[5];
    float keyBoost[5];
    for (int j = 0; j < 5; j++) keyBoost[j] = 0.0;
    float glowAll = 0.0;
    float wph = fract(uRTime * (0.6 + uD3 * 3.0));
    // la persecucion acelera durante el aviso del climax
    float cph = fract(uRTime * (0.6 + cA * C.x * C.x * 3.0));
    // B: el coro va de un lado al otro (un paso por compas, mas o menos)
    float choirPos = fract(uRTime * 0.45);
    for (int j = 0; j < 5; j++) {
        float i = idx + float(j - 2);
        if (i < 0.0 || i >= nSlots) { lits[j] = 0.0; cs[j] = vec2(9.0); ss[j] = 0.0; continue; }
        float grow = revealAt(n, i);
        // piano: la calabaza de la tecla arde con todo
        float kb = 0.0;
        for (int k = 0; k < N_KEYS; k++) {
            if (abs(floor(keyPos(k) * nSlots * 0.999) - i) < 0.5) kb = max(kb, keyEnv(k, 0.05, 0.9) * (0.5 + keyVel(k)));
        }
        keyBoost[j] = kb;
        float u = (i + 0.5) / n;
        float band = u < 0.34 ? bass : (u < 0.67 ? mid : high);
        float wave = hit * smoothstep(0.0, 1.0, 1.0 - abs(u - wph) * (2.0 - uD3 * 1.5));
        float cd = (u - cph) * 6.0;
        float chaseOn = exp(-cd * cd);
        float flick = 0.85 + 0.15 * sin(t * (7.0 + hash21(vec2(i, 9.0)) * 4.0) + i);
        // suceso: una se apaga y se prende de golpe
        float outK = (sv == 2 && abs(i - floor(ssd * nSlots)) < 0.5) ? se : 0.0;
        float off = outK * smoothstep(0.10, 0.25, sp) * (1.0 - smoothstep(0.62, 0.66, sp));
        float burst = outK * smoothstep(0.62, 0.66, sp) * (1.0 - smoothstep(0.66, 0.95, sp));
        // suceso: cantan en ola; B: el coro
        float sing = sv == 3 ? se * exp(-pow((u - sp * 1.3 + 0.15) * 5.0, 2.0)) : 0.0;
        float ch = choir * exp(-pow((u - choirPos) * 6.0, 2.0)) * (0.6 + bass * 0.8);
        kb = max(kb, max(sing, ch));
        keyBoost[j] = kb;
        float blinkD = (dv == 2 && abs(i - floor(D.w * nSlots)) < 0.5) ? D.x * step(0.4, D.y) * (1.0 - step(0.6, D.y)) : 0.0;
        lits[j] = ((0.75 + band * (0.4 + uD2 * 1.4) + wave * 0.8) * mix(1.0, 0.25 + chaseOn * 2.0, chase) * flick
                  + kb * 1.6 + cAy * 0.8 + burst * 2.0 + moonJ * 0.3) * grow * (1.0 - off * 0.95) * (1.0 - blinkD * 0.9);
        float sz = cw * (0.36 + uD4 * 0.12) * (0.9 + 0.2 * hash21(vec2(i, 3.0))) * 1.6 * mix(0.2, 1.0, grow);
        float hop = hit * loco * (0.15 + 0.35 * hash21(vec2(i, floor(uRTime * 2.0)))) * sz * 0.6;
        ss[j] = sz;
        cs[j] = vec2(-span * 0.5 + (i + 0.5) * cw, WALL_TOP - 0.02 + 0.5 * sz + hop);
    }
    vec3 fireC = mix(mix(orange, vec3(1.0, 0.95, 0.65), 0.35), vec3(1.0, 0.08, 0.02), max(hit * smoothstep(0.5, 1.0, loco), redE));
    vec3 P3 = vec3(p, 0.0);

    col = hkStyleBacklight(col, p, WALL_TOP + 0.20, 0.45);   // estilo: resplandor detras del campo
    // --- campo (luna + resplandor de las calabazas) ---
    vec4 fl = plate0(rUV(p, FIELD_R));
    if (fl.a > 0.0) {
        // ventanas: B puro en la lamina; el borde filtrado se trata suave
        float winM = smoothstep(0.08, 0.6, fl.b - max(fl.r, fl.g));
        vec3 fr = vec3(fl.rg, mix(fl.b, fl.g * 1.1, winM));
        vec3 fc = plateCol(fr) * (0.5 + moonC * 0.5);
        float warm = 0.0;
        for (int k = 1; k <= 3; k++) {
            warm += lits[k] * exp(-length((p - cs[k]) * vec2(0.8, 1.5)) * 2.2);
        }
        fc += plateCol(fr) * fireC * warm * 0.6;
        float ws = uRTime / 11.0;
        float winOn = mix(step(0.3, hash21(vec2(floor(p.x * 3.0), floor(ws) - 1.0))), step(0.3, hash21(vec2(floor(p.x * 3.0), floor(ws)))), smoothstep(0.0, 0.08, fract(ws)));
        winOn = max(winOn, sv == 5 ? se * smoothstep(0.0, 0.15, sp * 3.0 - fract(p.x * 0.7 + 0.3)) : 0.0);
        fc = mix(fc, vec3(1.0, 0.65, 0.25) * (0.8 + 0.2 * sin(t * 3.0)) * winOn, winM);
        col = mix(col, fc, fl.a);
    }
    // niebla del campo
    float fz = plate5Wrap(vec2(p.x * 0.10 - t * 0.005, p.y * 0.5)).g;
    col = mix(col, vec3(0.12, 0.10, 0.16), smoothstep(0.40 - EST.y * 0.3, 0.75, fz) * exp(-pow((p.y + 0.30) / (0.12 + EST.y * 0.15), 2.0)) * (0.5 + EST.y * 0.4));

    // --- muro iluminado por las calabazas ---
    vec2 wu = rUV(p, WALL_R);
    vec4 wa = plate1(wu);
    if (wa.a > 0.0) {
        vec4 wn = plate2(wu);
        vec2 nxy = wn.rg * 2.0 - 1.0;
        vec3 nn = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
        vec3 lit = vec3(0.02, 0.02, 0.03) + moonC * 0.06 * max(dot(nn, normalize(vec3(-0.5, 0.6, 0.6))), 0.0);
        for (int k = 0; k < 5; k++) {
            if (ss[k] <= 0.0) continue;
            vec3 v = vec3(cs[k] - vec2(0.0, ss[k] * 0.15), 0.25) - P3;
            float dd = dot(v, v);
            lit += fireC * max(dot(nn, v * inversesqrt(dd)), 0.0) * lits[k] / (1.0 + dd * 8.0) * 0.9;
        }
        col = mix(col, plateCol(wa.rgb) * lit * 2.4, wa.a);
    }

    // EASTER EGG "JAY INFINITO" (fase 38): las tres calabazas del medio se
    // encienden de a una y en vez de caras tienen tallado J, A, Y
    vec2 EG = hkEgg(13.0);
    // --- calabazas ---
    for (int k = 1; k <= 3; k++) {
        if (ss[k] <= 0.0) continue;
        float lit = lits[k];
        // la letra de esta calabaza: J, A, Y en las tres del medio
        int L = int(idx + float(k - 2) - (floor(n * 0.5) - 1.0));
        float egK = (L >= 0 && L <= 2) ? smoothstep(0.0, 0.3, EG.x) * smoothstep(0.05 + float(L) * 0.15, 0.15 + float(L) * 0.15, EG.y) : 0.0;
        lit = max(lit, egK * 0.5);                            // fase 39: no se encienden de mas
        float s = ss[k];
        vec2 qh = (p - cs[k]) / s;                 // unidades de la lamina
        vec2 huv = rUV(qh, HERO_R);
        vec4 hc = plate3(huv);
        if (hc.a <= 0.0) continue;
        vec4 hn = plate4(huv);
        vec2 nxy = (hn.rg * 2.0 - 1.0) * 1.2;
        vec3 nn = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy) * 0.5, 0.05))));
        float hsh = hash21(vec2(idx + float(k - 2), 9.0));
        vec2 q = qh * 1.64;
        float holeD = hwFace(q - vec2(lookX, moonJ * 0.06), hsh, max(hit * loco, max(keyBoost[k], cAy)));
        if (egK > 0.0) {
            int ch = L == 0 ? 74 : (L == 1 ? 65 : 89);
            float dl = hkText((q - vec2(0.0, -0.02)) / (0.62 * hkEggS), int[16](ch, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 1) * 0.62 * hkEggS - 0.055 * hkEggS;
            holeD = mix(holeD, dl, smoothstep(0.0, 1.0, egK));
        }
        float hole = (1.0 - smoothstep(-0.02, 0.02, holeD)) * step(qh.y, 0.40);
        vec3 ha = plateCol(hc.rgb);
        // luz: la luna, las vecinas y la propia vela filtrada por la cascara
        float nb = 0.0;
        nb += lits[k - 1] * max(dot(nn, normalize(vec3(-1.0, 0.0, 0.5))), 0.0);
        nb += lits[k + 1] * max(dot(nn, normalize(vec3(1.0, 0.0, 0.5))), 0.0);
        vec3 lt = moonC * 0.25 * max(dot(nn, normalize(vec3(-0.6, 0.5, 0.6))), 0.0) + fireC * nb * 0.35 + vec3(0.03);
        float sss = exp(-max(holeD, 0.0) * 9.0);
        vec3 skin = ha * lt * hn.b * 2.0 + ha * fireC * sss * lit * 0.9 + fireC * sss * sss * lit * 0.15;
        float fN = plate5Wrap(vec2(q.x * 0.3, q.y * 0.3 - t * 0.08) + (idx + float(k)) * 0.2).g;
        vec3 inside = mix(fireC * 0.8, vec3(1.0, 0.95, 0.70), smoothstep(0.4, 0.8, fN)) * lit * 1.3;
        col = mix(col, mix(skin, inside, hole), hc.a);
        glowAll += exp(-length(qh - vec2(0.0, -0.1)) * 1.6) * lit;
    }
    col += fireC * glowAll * 0.05;
    // lenguas de fuego que salen por arriba (piano y pico del climax)
    for (int k = 1; k <= 3; k++) {
        float fk = max(keyBoost[k], cAy * 0.8);
        if (ss[k] <= 0.0 || fk < 0.02) continue;
        vec2 fq = (p - cs[k] - vec2(0.0, ss[k] * 0.42)) / ss[k];
        float hgt = 0.5 + fk * 0.9;
        float fn = noise21(vec2(fq.x * 6.0, fq.y * 3.0 - uRTime * 6.0 + float(k) * 3.0));
        fq.x -= EST.z * 0.25 * fq.y;                     // viento: la llama se acuesta
        float tongue = smoothstep(0.30 * (1.0 - fq.y / hgt), 0.0, abs(fq.x + (fn - 0.5) * 0.25 * fq.y)) * step(0.0, fq.y) * smoothstep(hgt, hgt * 0.4, fq.y);
        col += mix(fireC, vec3(1.0, 0.85, 0.5), smoothstep(0.5, 1.0, tongue * fn * 1.3)) * tongue * (0.5 + fn) * 0.75 * min(fk, 1.3);
    }

    // --- cuervo que se posa en el muro (evento) ---
    if (crowE > 0.01) {
        float cx = -span * 0.5 + floor(n * 0.5 - 0.5) * cw + cw;
        float land = clph > 0.0 ? smoothstep(0.0, 0.15, clph) : smoothstep(0.0, 0.3, sp);
        // levanta vuelo: sube, se aleja y aletea
        vec2 flyOff = vec2(crowFly * 1.4, crowFly * crowFly * 1.1 + crowFly * 0.2);
        float csz = 0.10 * (1.0 + crowFly * 0.8);
        vec2 cq = (p - vec2(cx + (1.0 - land) * 1.5, WALL_TOP + 0.08 + (1.0 - land) * 0.6) - flyOff) / csz;
        float body = length(cq / vec2(1.0, 0.75)) - 0.5;
        float head = length(cq - vec2(0.35, 0.45)) - 0.22;
        float beak = max(abs(cq.y - 0.45) - 0.05 + (cq.x - 0.55) * 0.15, abs(cq.x - 0.68) - 0.14);
        float tail = max(abs(cq.x + 0.65) - 0.25, abs(cq.y + 0.10 + (cq.x + 0.65) * 0.4) - 0.07);
        float crow = min(min(body, head), min(beak, tail));
        if (crowFly > 0.0) {
            float flap = sin(uRTime * 14.0);
            float ax = abs(cq.x + 0.05);
            float wy = cq.y - 0.15 - flap * 0.6 * ax;
            float wing = max(max(abs(wy) - 0.12 * (1.2 - ax * 0.6), ax - 1.25), -cq.y - 0.1 + flap * 0.0);
            crow = min(crow, mix(1e3, wing, smoothstep(0.0, 0.1, crowFly)));
        }
        col = mix(col, vec3(0.005), (1.0 - smoothstep(-0.03, 0.03, crow)) * crowE);
        col += vec3(1.0, 0.1, 0.05) * exp(-dot(cq - vec2(0.42, 0.50), cq - vec2(0.42, 0.50)) * 400.0) * crowE;
    }

    // --- niebla sobre el muro ---
    float fog = plate5Wrap(vec2(p.x * 0.12 - t * 0.008, p.y * 0.6 + 0.3)).b;
    float fogBand = exp(-pow((p.y - WALL_TOP + 0.05) / 0.18, 2.0));
    col = mix(col, vec3(0.45, 0.40, 0.55) * (0.3 + bass * 0.4) + fireC * glowAll * 0.03, smoothstep(0.4, 0.8, fog) * fogBand * (0.20 + uD6 * 0.6));

    // detalles: una chispa salta de una calabaza; cae una hoja
    if (dv == 1) {
        float i = floor(D.w * nSlots);
        vec2 c0 = vec2(-span * 0.5 + (i + 0.5) * cw, WALL_TOP + 0.35);
        vec2 sq = p - c0 - vec2(0.15 * D.y, D.y * 0.6 - D.y * D.y * 0.5);
        col += vec3(1.0, 0.7, 0.3) * exp(-dot(sq, sq) * 25000.0) * D.x * 2.0;
    }
    if (dv == 3) {
        vec2 lc = vec2((D.w - 0.5) * 4.0 + 0.2 * sin(D.y * 9.0), mix(0.9, WALL_TOP, D.y));
        vec2 lq = rot2(uRTime * 3.0) * (p - lc);
        col = mix(col, vec3(0.10, 0.04, 0.01) + fireC * 0.05, (1.0 - smoothstep(-0.003, 0.003, length(lq * vec2(1.0, 2.4)) - 0.02)) * D.x);
    }

    col = audioLift(col, high * 0.08);
    return vec4(hkFinish(col, uv, vec3(0.8, 0.35, 0.1)), 1.0);
}
