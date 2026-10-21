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
// HISTORIA: cada ~47 s persecucion de luz (se encienden de a una); cada
// ~61 s un cuervo se posa en el muro; cada acto cambia cuantas hay.
// CLIMAX (~83 s, 18 s, en tres tiempos): la persecucion de luz va cada vez
//   mas rapido con el cuervo mirando desde el muro; todas giran a rojo a
//   la vez y escupen fuego; el cuervo levanta vuelo. Cada ~4.5 min mas
//   largo y con la persecucion al rojo (gran climax).
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

    vec4 G = hkGrandClimax(4.0);
    vec4 C = hkClimaxOr(G, hkClimax(4.0, 83.0, 18.0));
    float clph = C.w;
    float chase = max(hkEvent(3.0, 47.0, 8.0), C.x * (1.0 - C.y));
    float redE = max(C.y, C.z * 0.4);
    // el cuervo: posado durante el aviso y el pico del climax, levanta vuelo despues
    float crowE = max(hkEvent(5.0, 61.0, 10.0), step(0.0001, clph) * (1.0 - smoothstep(0.92, 1.0, clph)));
    float crowFly = clamp((clph - 0.68) / 0.30, 0.0, 1.0) * step(0.0001, clph);
    // cantidad continua: la fila se acomoda sin saltar y la nueva crece
    float n = 4.0 + uD1 * 4.0 + hkActVal(5.0) * 1.5;
    float nSlots = ceil(n);
    float span = uAspect * 1.7;
    float cw = span / n;

    // --- cielo: luna de cosecha, nubes, estrellas ---
    vec3 col = mix(vec3(0.05, 0.03, 0.08), vec3(0.006, 0.004, 0.014), smoothstep(-0.3, 1.0, p.y));
    vec2 mc = vec2(-uAspect * 0.55, 0.55);
    float md = length(p - mc);
    col += vec3(1.0, 0.75, 0.45) * (1.0 - smoothstep(0.17, 0.18, md)) * (0.8 + 0.2 * plate5Wrap((p - mc) * 0.6).a);
    col += vec3(1.0, 0.6, 0.3) * exp(-max(md - 0.17, 0.0) * 4.0) * 0.25;
    col = hkStyleMoon(col, p, mc, 0.17);
    float cl = plate5Wrap(vec2(p.x * 0.10 - t * 0.004, p.y * 0.4)).r;
    col = mix(col, vec3(0.02, 0.015, 0.03) + vec3(1.0, 0.6, 0.3) * 0.08 * exp(-md * 2.0), smoothstep(0.55, 0.75, cl) * smoothstep(0.0, 0.4, p.y) * 0.8);
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
    float cph = fract(uRTime * (0.6 + C.x * C.x * 3.0));
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
        lits[j] = ((0.75 + band * (0.4 + uD2 * 1.4) + wave * 0.8) * mix(1.0, 0.25 + chaseOn * 2.0, chase) * flick
                  + kb * 1.6 + C.y * 0.8) * grow;
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
        fc = mix(fc, vec3(1.0, 0.65, 0.25) * (0.8 + 0.2 * sin(t * 3.0)) * winOn, winM);
        col = mix(col, fc, fl.a);
    }
    // niebla del campo
    float fz = plate5Wrap(vec2(p.x * 0.10 - t * 0.005, p.y * 0.5)).g;
    col = mix(col, vec3(0.12, 0.10, 0.16), smoothstep(0.40, 0.75, fz) * exp(-pow((p.y + 0.30) / 0.12, 2.0)) * 0.5);

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

    // --- calabazas ---
    for (int k = 1; k <= 3; k++) {
        if (ss[k] <= 0.0) continue;
        float lit = lits[k];
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
        float holeD = hwFace(q, hsh, max(hit * loco, max(keyBoost[k], C.y)));
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
        float fk = max(keyBoost[k], C.y * 0.8);
        if (ss[k] <= 0.0 || fk < 0.02) continue;
        vec2 fq = (p - cs[k] - vec2(0.0, ss[k] * 0.42)) / ss[k];
        float hgt = 0.5 + fk * 0.9;
        float fn = noise21(vec2(fq.x * 6.0, fq.y * 3.0 - uRTime * 6.0 + float(k) * 3.0));
        float tongue = smoothstep(0.30 * (1.0 - fq.y / hgt), 0.0, abs(fq.x + (fn - 0.5) * 0.25 * fq.y)) * step(0.0, fq.y) * smoothstep(hgt, hgt * 0.4, fq.y);
        col += mix(fireC, vec3(1.0, 0.85, 0.5), smoothstep(0.5, 1.0, tongue * fn * 1.3)) * tongue * (0.5 + fn) * 0.75 * min(fk, 1.3);
    }

    // --- cuervo que se posa en el muro (evento) ---
    if (crowE > 0.01) {
        float cx = -span * 0.5 + floor(n * 0.5 - 0.5) * cw + cw;
        float land = clph > 0.0 ? smoothstep(0.0, 0.15, clph) : smoothstep(0.0, 0.3, hkEventPhase(5.0, 61.0, 10.0));
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

    col = audioLift(col, high * 0.08);
    return vec4(hkFinish(col, uv, vec3(0.8, 0.35, 0.1)), 1.0);
}
