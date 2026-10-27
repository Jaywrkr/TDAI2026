// ===============================================================
// HALLOWEEN 01 - JACK O'LANTERN
// Bodegon de Halloween en una cabana: la calabaza tallada principal
// sobre una mesa de madera, una calabaza blanca, una calabaza chica
// tallada, calabacitas, velas con chorreado de cera y libros viejos,
// frente a una pared de tablones con una ventana a la noche (luna,
// ramas y relampagos) por la que entra un rayo de luna con polvo.
// Lo quieto viene de LAMINAS horneadas (plates/scene01, ver
// td/tools/bake_plates_calabaza.py); en vivo se calcula la LUZ: la vela
// de adentro de la calabaza, las velas y la luna iluminan la pared, la
// mesa y los objetos, y la calabaza principal se ilumina con su propio
// relieve (gajos, estrias, granos).
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la luz de adentro de la calabaza, el charco de luz y el aura
//   medios -> las llamas de las velas se inclinan; humo; ramas afuera
//   agudos -> brasas y polvo en el rayo de luna; la calabaza chica titila
//   golpe  -> llamarada y brasas; con Chaos: lenguas de fuego y relampago
// PIANO: cada tecla enciende una llama flotante (un fuego fatuo de vela)
//   en esa posicion, que ilumina la pared y la mesa; la fuerza la hace
//   mas grande y una tecla fuerte hace reir a la calabaza; apretada, la
//   llama se queda; al soltarla sube y se apaga. Los ojos se encienden.
// Speed mueve llamas, humo, brasas, nubes y ramas aun en silencio.
// REPERTORIO (fase 31, motor hkSuceso del kit):
//   ESTADOS (~5 min): noche quieta, tormenta afuera (un relampago cada
//     tanto en la ventana) y noche de viento (las llamas y las ramas se
//     mueven mas).
//   SUCESOS (~55 s, 7): la calabaza mira de un lado al otro; una vela se
//     apaga sola y vuelve a prender; un gato negro cruza la ventana; una
//     arana baja sobre la calabaza; la calabaza chica se rie; una bruja en
//     escoba cruza la luna; la calabaza se rie.
//   DETALLES (~30 s, 5): un murcielago pasa por la ventana, sale mas humo
//     por los ojos, salta una chispa, un relampago lejano, brilla el polvo
//     en el rayo de luna.
//   CLIMAX (~4 min, 15 s, rotan 3 guiones en tres tiempos):
//     A viento: las llamas se inclinan y se apagan, quedan los ojos rojos y
//       vuelve con una llamarada, lenguas de fuego y risa.
//     B la calabaza habla: la luz late con la musica, la boca se mueve con
//       el bajo y le sale fuego por los ojos con cada golpe.
//     C ronda de llamas: aparecen llamitas alrededor, giran cada vez mas
//       rapido y se meten en la calabaza, que se enciende entera.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con la tormenta.
// @EST: noche quieta | tormenta afuera | noche de viento
// @SUC: mira a los lados | una vela se apaga | gato en la ventana | arana que baja | la chica se rie | bruja en la luna | risa
// @DET: murcielago en la ventana | humo por los ojos | chispa | relampago lejano | polvo en el rayo
// @CLX: A viento | B la calabaza habla | C ronda de llamas
//
// @D1: tamano de la calabaza
// @D2: fuerza de la llama interior
// @D3: brasas, humo y polvo
// @D4: sonrisa (seria <-> enorme)
// @D5: relieve de los gajos
// @D6: aura y charco de luz
// ===============================================================

const vec4 WALL_R = vec4(-3.2, -0.62, 6.4, 1.87);     // x0, y0, ancho, alto
const vec4 TABLE_R = vec4(-3.2, -1.25, 6.4, 0.77);
const vec4 PROPS_R = vec4(-3.2, -0.80, 6.4, 1.05);
const vec4 HERO_R = vec4(-0.85, -0.62, 1.70, 1.42);
const vec2 WIN_C = vec2(-1.55, 0.30), WIN_H = vec2(0.42, 0.50);
const vec2 HERO_C = vec2(0.0, -0.15);
// velas: x, base, alto (las mismas posiciones que la lamina 3_objetos)
const vec3 CAND[4] = vec3[](vec3(-0.72, -0.60, 0.42), vec3(0.80, -0.62, 0.30),
                            vec3(0.95, -0.66, 0.17), vec3(2.20, -0.37, 0.16));

// luz calida que llega a un punto: calabaza + velas
// llamas flotantes del piano: x segun la tecla, altura segun la voz
vec2 hwKeyFlame(int k) { return vec2(hkKeyX(k) * 0.92, 0.05 + 0.30 * fract(float(k) * 0.37 + keyPos(k) * 3.1) + min(keyAge(k), 3.0) * 0.02); }
float hwKeyLight(vec2 q) {
    float w = 0.0;
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.08, 1.2);
        if (e < 0.005) continue;
        w += e * (0.35 + keyVel(k) * 0.65) * exp(-length(q - hwKeyFlame(k)) * 3.2) * 0.6;
    }
    return w;
}

float hwWarm(vec2 q, float heroK, vec4 cf) {
    float w = heroK * exp(-length((q - HERO_C) * vec2(0.8, 1.0)) * 1.3) + hwKeyLight(q);
    w += cf.x * exp(-length(q - vec2(CAND[0].x, CAND[0].y + CAND[0].z)) * 3.0) * 0.55;
    w += cf.y * exp(-length(q - vec2(CAND[1].x, CAND[1].y + CAND[1].z)) * 3.0) * 0.45;
    w += cf.z * exp(-length(q - vec2(CAND[2].x, CAND[2].y + CAND[2].z)) * 3.5) * 0.30;
    w += cf.w * exp(-length(q - vec2(CAND[3].x, CAND[3].y + CAND[3].z)) * 3.0) * 0.40;
    return w;
}

vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 alb(vec3 c) { return pow(c, vec3(2.2)); }

float hwTri(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 e0 = b - a, e1 = c - b, e2 = a - c;
    vec2 v0 = p - a, v1 = p - b, v2 = p - c;
    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                     vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                 vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
}

// EASTER EGG "JAY INFINITO" (fase 38): 0..1, la boca tallada pasa a ser
// un infinito (la luz de adentro sale por el)
float gInfMouth = 0.0;

float hwFace(vec2 q, float smile, float rage) {
    float eh = 0.24 + rage * 0.08;
    float eyeL = hwTri(q, vec2(-0.42, 0.10), vec2(-0.10, 0.10), vec2(-0.30, 0.10 + eh));
    float eyeR = hwTri(q, vec2(0.10, 0.10), vec2(0.42, 0.10), vec2(0.30, 0.10 + eh));
    float nose = hwTri(q, vec2(-0.07, -0.03), vec2(0.07, -0.03), vec2(0.0, 0.10));
    float x = q.x;
    float curve = -0.21 + (0.20 + smile * 0.55) * x * x;
    float halfH = 0.075 + smile * 0.04 + rage * 0.05;
    float band = abs(q.y - curve) - halfH * (1.0 - smoothstep(0.30, 0.55, abs(x)));
    float u = fract(x * 5.0 + 0.25);
    float colUp = (abs(u - 0.75) - 0.25) / 5.0;
    float colDn = (abs(u - 0.25) - 0.25) / 5.0;
    float upper = max(curve + halfH - 0.060 - q.y, colUp + 0.012);
    float lower = max(q.y - (curve - halfH + 0.060), colDn + 0.012);
    float mouth = max(band, -min(upper, lower));
    mouth = max(mouth, abs(x) - 0.52);
    // fase 39: la boca queda como esta; un infinito chico tallado entre los ojos
    float infH = gInfMouth > 0.0 ? hkInfD(q - vec2(0.0, 0.24), 0.13 * hkEggS) - 0.022 * hkEggS + (1.0 - gInfMouth) * 0.1 : 1e3;
    return min(min(min(eyeL, eyeR), min(nose, mouth)), infH);
}

// Llama de vela: gota alargada que se inclina. Devuelve (nucleo, halo).
vec2 hwFlame(vec2 d, float h, float lean) {
    d.x -= lean * max(d.y, 0.0) * max(d.y, 0.0) / max(h, 1e-3) * 2.0;
    float k = clamp(d.y / h, -0.4, 1.0);
    float w = h * 0.28 * sqrt(max(1.0 - k, 0.0)) * smoothstep(-0.35, 0.15, k);
    float core = 1.0 - smoothstep(0.0, max(w, 1e-4), length(vec2(d.x, (d.y - h * 0.35) * 0.32)) - w * 0.2);
    float halo = exp(-dot(d - vec2(0.0, h * 0.4), d - vec2(0.0, h * 0.4)) / (h * h * 1.4));
    return vec2(core, halo);
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 pc = hkCam(p0);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.008);

    vec2 dolly = vec2(sin(uRTime * 0.03) * 0.07 + sin(uRTime * 0.011 + 2.0) * 0.04, 0.0);
    vec2 pW = pc + dolly * 0.55;     // pared y ventana
    vec2 pT = pc + dolly;            // mesa y objetos

    // --- historia ---
    hkSetClimax(3.0, 15.0, 20.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(3.0, 7, 8.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(3.0, 5, 3.5);
    int dv = int(D.z);
    vec4 EST = hkEstado(3.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(3.0, 3));
    float windK = cA * C.x * (1.0 - C.y) * (1.0 - C.z) + EST.z * 0.18;   // viento
    float outE = cA * C.y;                                   // A pico: apagadas
    float relight = cA * C.z;                                // A secuelas: llamarada
    float laugh = max(sv == 6 ? se : 0.0, relight);
    float batE = dv == 0 ? D.x : 0.0;
    // B: la calabaza habla con la musica; C: las llamitas se meten adentro
    float talk = cB * C.y;
    float dive = cC * smoothstep(0.55, 0.68, C.w) * (1.0 - smoothstep(0.85, 1.0, C.w));
    float storm = max(EST.y, G.x);
    // piano: llamas flotantes; una tecla fuerte tambien hace reir
    float keyGlow = 0.0;
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.08, 1.2);
        keyGlow += e * (0.4 + keyVel(k) * 0.6);
        laugh = max(laugh, e * smoothstep(0.6, 1.0, keyVel(k)) * exp(-keyAge(k) * 0.8));
    }
    float gust = windK * (0.6 + 0.4 * noise21(vec2(uRTime * 9.0, 4.0)));
    float warmth = hkActVal(5.0);
    float flick = 0.70 + 0.18 * sin(t * 7.3) + 0.12 * sin(t * 13.1 + 1.7) + 0.10 * noise21(vec2(t * 3.0, 1.0));
    float inner = (flick * (0.85 + uD2 * 0.70) + bass * 0.55 + hit * 0.70) * (1.0 - outE * 0.96) * (1.0 - gust * 0.45)
                + relight * 1.6 + keyGlow * 0.15
                + cB * (C.x * 0.3 + C.y * (bass * 1.2 + hit * 0.8)) + dive * 1.8 - cC * C.x * (1.0 - dive) * 0.35;
    vec3 orange = hsv2rgb(vec3(fract(0.065 + hue + (warmth - 0.5) * 0.03), 0.95, 1.0));
    vec3 hot = vec3(1.0, 0.86, 0.50);
    vec3 moonC = vec3(0.55, 0.62, 0.95);
    // relampagos afuera: en la tormenta uno cada tanto (como mucho uno cada
    // 4 s); el detalle trae uno suelto
    float lslot = floor(uRTime / 4.0);
    float lk = uRTime - lslot * 4.0 - 2.5 * hash21(vec2(lslot, 7.0));
    float lpulse = smoothstep(0.0, 0.05, lk) * (1.0 - smoothstep(0.12, 0.6, lk));
    float lightning = max(max(storm * step(0.45, hash21(vec2(lslot, 2.0))) * lpulse,
                              (dv == 3 ? D.x : 0.0) * exp(-pow((D.y - 0.4) / 0.06, 2.0))),
                          hit * loco * step(0.6, loco));

    float size = 0.80 + uD1 * 0.30;
    vec2 heroC = HERO_C;

    vec4 cf;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        cf[i] = (0.75 + 0.15 * sin(t * (8.0 + fi * 1.7) + fi * 3.0) + 0.10 * noise21(vec2(t * 4.0, fi * 5.0)))
              * (0.8 + uD2 * 0.4) * (1.0 + hit * 0.5)
              * (1.0 - outE * 0.97) * (1.0 - gust * 0.5 * noise21(vec2(t * 11.0, fi))) * (1.0 + relight * 0.8);
        // suceso: una vela se apaga sola y vuelve
        if (sv == 1 && int(floor(ss * 4.0)) == i) cf[i] *= 1.0 - se * smoothstep(0.15, 0.25, sp) * (1.0 - smoothstep(0.70, 0.85, sp));
        cf[i] *= 1.0 - cC * C.x * (1.0 - dive) * 0.5;
    }
    float heroK = inner * (0.55 + uD6 * 0.9);

    // --- pared (y lo que se ve por la ventana) ---
    vec4 wl = plate0(rUV(pW, WALL_R));
    vec3 col = vec3(0.0);
    vec2 wq = pW - WIN_C;
    bool inWin = abs(wq.x) < WIN_H.x + 0.01 && abs(wq.y) < WIN_H.y + 0.01;
    if (inWin && wl.a < 0.999) {
        // cielo nocturno, luna, nubes, ramas que se mecen, relampagos
        vec3 sky = mix(vec3(0.05, 0.06, 0.16), vec3(0.01, 0.012, 0.04), smoothstep(-0.5, 0.5, wq.y));
        vec2 mq = wq - vec2(0.16, 0.24);
        float md = length(mq);
        sky += vec3(0.9, 0.9, 1.0) * (1.0 - smoothstep(0.075, 0.08, md)) * 0.9;
        sky += moonC * exp(-md * 8.0) * 0.35;
        sky = hkStyleMoon(sky, wq, vec2(0.16, 0.24), 0.08);
        float cl = plate5Wrap(vec2(wq.x * 0.25 + t * 0.008, wq.y * 0.5 + 0.2)).r;
        sky = mix(sky, vec3(0.03, 0.035, 0.07) + moonC * 0.15 * exp(-md * 5.0), smoothstep(0.55, 0.75, cl) * 0.85);
        sky += vec3(0.7, 0.75, 1.0) * lightning * 0.8;
        // ramas
        float sway = (0.03 + mid * 0.10) * sin(t * 1.2) + 0.015 * sin(t * 2.9);
        vec2 bq = wq - vec2(0.45, -0.55);
        float br = 1e3;
        for (int i = 0; i < 3; i++) {
            float fi = float(i);
            vec2 a = vec2(0.0, fi * 0.15);
            vec2 b = a + vec2(-0.55 + fi * 0.12, 0.40 + fi * 0.10) + vec2(sway * (1.0 + fi), 0.0);
            br = min(br, hkSeg(bq, a, b) - (0.020 - fi * 0.005));
            vec2 c = mix(a, b, 0.6);
            br = min(br, hkSeg(bq, c, c + vec2(-0.10, 0.18) + vec2(sway * 1.5, 0.0)) - 0.006);
        }
        br = min(br, hkSeg(bq, vec2(0.0, -0.2), vec2(0.05, 0.4)) - 0.035);
        sky = mix(sky, vec3(0.005, 0.005, 0.01) + vec3(0.4, 0.45, 0.8) * lightning * 0.15, 1.0 - smoothstep(-0.002, 0.002, br));
        // murcielago que cruza
        if (batE > 0.0) {
            float ph = hkEventPhase(5.0, 37.0, 4.0);
            vec2 bp = (wq - vec2(mix(-0.6, 0.6, ph), 0.05 + 0.10 * sin(ph * 9.0))) / 0.07;
            float flap = sin(uRTime * 22.0);
            float ax = abs(bp.x);
            float y = bp.y - flap * 0.5 * ax + 0.25 * ax * ax;
            float wing = max(abs(y) - 0.12 * (1.0 - ax), ax - 1.0);
            float bat = min(wing, length(bp / vec2(0.35, 0.22)) - 1.0);
            sky = mix(sky, vec3(0.0), (1.0 - smoothstep(-0.02, 0.02, bat)) * batE);
        }
        // suceso: una bruja en escoba cruza delante de la luna
        if (sv == 5) {
            vec2 wp = (wq - vec2(mix(-0.55, 0.65, sp), 0.22 + 0.05 * sin(sp * 6.0))) / 0.06;
            float broom = hkSeg(wp, vec2(-1.2, -0.15), vec2(1.0, 0.10)) - 0.06;
            float brush = length((wp - vec2(-1.3, -0.17)) * vec2(1.0, 1.8)) - 0.32;
            float body = length((wp - vec2(0.0, 0.35)) * vec2(1.3, 0.8)) - 0.35;
            float hat = hwTri(wp, vec2(-0.30, 0.75), vec2(0.30, 0.75), vec2(-0.05, 1.45));
            float brim = max(abs(wp.y - 0.75) - 0.05, abs(wp.x) - 0.45);
            float cape = hwTri(wp, vec2(-0.10, 0.55), vec2(0.10, 0.10), vec2(-0.85, 0.05 + 0.15 * sin(uRTime * 6.0)));
            float wd = min(min(min(broom, brush), min(body, hat)), min(brim, cape));
            sky = mix(sky, vec3(0.0), (1.0 - smoothstep(-0.03, 0.03, wd)) * se);
        }
        // suceso: un gato negro camina por el alfeizar de afuera
        if (sv == 2) {
            float dir = ss > 0.5 ? -1.0 : 1.0;
            vec2 cq = wq - vec2(mix(-0.55, 0.55, dir > 0.0 ? sp : 1.0 - sp), -WIN_H.y + 0.02);
            cq = cq / 0.09;
            cq.x *= dir;
            float gait = sin(uRTime * 8.0);
            float bodyC = length((cq - vec2(0.0, 0.45)) * vec2(0.8, 1.7)) - 0.42;
            float headC = length(cq - vec2(0.55, 0.75)) - 0.20;
            float ears = min(hwTri(cq, vec2(0.42, 0.85), vec2(0.55, 0.88), vec2(0.45, 1.08)), hwTri(cq, vec2(0.58, 0.88), vec2(0.70, 0.85), vec2(0.68, 1.06)));
            float tail = hkSeg(cq, vec2(-0.45, 0.5), vec2(-0.75, 0.95 + 0.1 * gait)) - 0.04;
            float legs = min(min(hkSeg(cq, vec2(-0.25, 0.3), vec2(-0.25 + 0.1 * gait, 0.0)), hkSeg(cq, vec2(0.30, 0.3), vec2(0.30 - 0.1 * gait, 0.0))), 1e3) - 0.05;
            float cd = min(min(min(bodyC, headC), min(ears, tail)), legs);
            sky = mix(sky, vec3(0.0), (1.0 - smoothstep(-0.03, 0.03, cd)) * se);
            vec2 eq = cq - vec2(0.62, 0.78);
            sky += vec3(0.9, 0.85, 0.2) * exp(-dot(eq, eq) * 400.0) * se * step(0.15, fract(uRTime * 0.4));
        }
        // vidrio sucio con el reflejo de las velas
        float grime = plate5Wrap(wq * vec2(0.6, 0.8) + 0.3).a;
        sky = sky * (0.75 + 0.25 * grime) + orange * 0.05 * inner * smoothstep(0.4, 0.8, grime);
        col = sky;
    }
    float wallLight = 0.10 + hwWarm(pW, heroK, cf) * 0.95;
    vec3 wallC = alb(wl.rgb) * (wallLight * vec3(1.0, 0.75, 0.50) + vec3(0.06, 0.07, 0.12));
    wallC += alb(wl.rgb) * moonC * lightning * 0.25 * exp(-length(wq) * 1.5);
    col = mix(col, wallC, wl.a);

    // --- rayo de luna que entra por la ventana (con polvo) ---
    vec2 sd = normalize(vec2(0.55, -1.0));
    vec2 sq0 = pW - WIN_C;
    float along = dot(sq0, sd);
    float across = dot(sq0, vec2(-sd.y, sd.x));
    float shaft = smoothstep(WIN_H.x * 1.05, WIN_H.x * 0.55, abs(across)) * smoothstep(-0.2, 0.3, along) * exp(-max(along, 0.0) * 0.9);
    float dustK = dv == 4 ? D.x : 0.0;
    float dust = shaft > 0.01 ? hkParticles(pW * 1.6, t * 0.25, hkDR(0.0, 0.225, 0.7, uD3) + high * 0.15 + dustK * 0.4, vec2(0.2, -0.3), 0.025) * (1.0 + dustK * 1.5) : 0.0;
    float beamOn = 1.0 - smoothstep(0.55, 0.85, plate5Wrap(vec2(t * 0.004, 0.37)).r) * 0.6;
    col += moonC * shaft * 0.10 * beamOn;
    col += vec3(0.9, 0.92, 1.0) * dust * shaft * (0.5 + high * 1.2) * beamOn;

    // --- mesa ---
    vec4 tb = plate1(rUV(pT, TABLE_R));
    if (tb.a > 0.0) {
        vec2 base = vec2(heroC.x, heroC.y - 0.42 * size);
        float pool = exp(-length((pT - base) * vec2(0.8, 3.0)) * 2.0) * inner * (1.0 + uD6 * 1.2);
        float tlight = 0.06 + hwWarm(pT, heroK, cf) * 1.1 + pool * 0.9;
        // mancha de luna en la mesa y sombra de la calabaza hacia la derecha
        float moonPatch = exp(-pow((pT.x + 0.85) / 0.45, 2.0) - pow((pT.y + 0.80) / 0.12, 2.0)) * beamOn;
        float shadowH = exp(-pow((pT.x - base.x - 0.35 * size) / (0.40 * size), 2.0) - pow((pT.y - base.y + 0.03) / 0.05, 2.0));
        vec3 tc = alb(tb.rgb) * (tlight * vec3(1.0, 0.72, 0.45) + moonC * moonPatch * 0.35 + vec3(0.04, 0.045, 0.07));
        tc *= 1.0 - 0.55 * shadowH;
        tc *= 1.0 - 0.7 * exp(-pow((pT.x - base.x) / (0.42 * size), 2.0) - pow((pT.y - base.y) / 0.025, 2.0));
        // reflejo borroso de la calabaza en la madera
        tc += orange * 0.08 * exp(-abs(pT.x - heroC.x) * 3.0) * smoothstep(base.y - 0.35, base.y, pT.y) * inner;
        col = mix(col, tc, tb.a);
    }

    // --- objetos: calabaza blanca, calabacita, calabaza chica, velas, libros ---
    vec4 pr = plate2(rUV(pT, PROPS_R));
    if (pr.a > 0.0) {
        float plight = 0.16 + hwWarm(pT, heroK, cf) * 1.35;
        vec3 pcol = alb(pr.rgb) * (plight * vec3(1.0, 0.78, 0.55) + moonC * 0.10 * smoothstep(0.0, -1.2, pT.x));
        pcol += alb(pr.rgb) * moonC * lightning * 0.3;
        col = mix(col, pcol, pr.a);
    }
    // cara de la calabaza chica (titila con los agudos)
    {
        vec2 sc = vec2(1.38, -0.42);
        vec2 q2 = (pT - sc) / 0.36;
        if (abs(q2.x) < 0.8 && abs(q2.y) < 0.7) {
            float chica = sv == 4 ? se : 0.0;                  // suceso: la chica se rie
            float fd = hwFace(q2 * vec2(1.05, 1.15) + vec2(0.0, 0.02), 0.25 + 0.35 * sin(uRTime * 0.05) + chica * (0.6 + 0.3 * sin(uRTime * 14.0)), chica * 0.4);
            float sInner = (0.45 + 0.25 * sin(t * 9.0 + 2.0) + high * 0.7 + hit * 0.35) * (1.0 - outE * 0.5) + chica * 0.9;
            float holeS = (1.0 - smoothstep(-0.006, 0.006, fd)) * pr.a;
            vec3 fl = mix(orange * 0.8, hot, 0.15 + 0.35 * noise21(q2 * 6.0 - vec2(0.0, t * 2.0))) * sInner;
            col = mix(col, fl, holeS);
            col += orange * exp(-max(fd, 0.0) * 30.0) * sInner * 0.25 * pr.a;
        }
    }

    // --- calabaza principal: color + relieve, luz en vivo ---
    vec2 q = (pT - heroC) / size;
    q.x *= 1.0 - hit * loco * 0.06 * sin(q.y * 6.0 + uRTime * 20.0);
    vec2 huv = rUV(q, HERO_R);
    vec4 hc = plate3(huv);
    float aura = exp(-max(length(q * vec2(0.85, 1.05)) - 0.55, 0.0) * 3.0);
    col += orange * aura * (0.08 + uD6 * 0.30) * (0.6 + inner * 0.5) * (1.0 - hc.a);
    float rage = max(max(hit * loco, relight * 0.85 * (1.0 - smoothstep(0.80, 0.97, C.w))), talk * (0.25 + hit * 0.6));
    float smileK = clamp(hkDR(-0.15, 0.5, 1.25, uD4) + laugh * 0.6 + talk * (bass * 0.9 + mid * 0.4 - 0.2), 0.0, 1.2);
    vec2 EG = hkEgg(1.0);
    gInfMouth = smoothstep(0.0, 0.3, EG.x);
    float faceD = hwFace(q, smileK, rage);
    if (hc.a > 0.0) {
        vec4 hn = plate4(huv);
        vec2 nxy = (hn.rg * 2.0 - 1.0) * hkDR(0.0, 1.025, 3.6, uD5);
        vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy) * 0.5, 0.05))));
        vec3 ha = alb(hc.rgb);
        vec3 Lm = normalize(vec3(-0.55, 0.45, 0.70));
        vec3 Lc1 = normalize(vec3(-0.85, 0.30, 0.45));
        vec3 Lc2 = normalize(vec3(0.85, 0.20, 0.45));
        float dm = max(dot(n, Lm), 0.0), d1 = max(dot(n, Lc1), 0.0), d2 = max(dot(n, Lc2), 0.0);
        vec3 lit = moonC * dm * 0.22 + vec3(1.0, 0.70, 0.40) * (d1 * cf[0] * 0.75 + d2 * (cf[1] + cf[2]) * 0.55) + vec3(0.05, 0.045, 0.06);
        lit += orange * inner * 0.16;   // la vela de adentro atraviesa la cascara
        lit += moonC * dm * lightning * 0.4;
        vec3 skin = ha * lit * hn.b;
        float spec = pow(max(dot(reflect(-Lc2, n), vec3(0.0, 0.0, 1.0)), 0.0), 26.0) * (cf[1] + cf[2]) * 0.10
                   + pow(max(dot(reflect(-Lm, n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0) * 0.05;
        skin += vec3(1.0, 0.85, 0.65) * spec * hn.b;
        // la luz de adentro se filtra por la cascara cerca de los cortes
        float sss = exp(-max(faceD, 0.0) * 16.0);
        skin += ha * orange * sss * inner * 0.55 + hot * sss * sss * inner * 0.08;
        col = mix(col, skin, hc.a);

        // cortes: la llama y la pared interior
        float hole = (1.0 - smoothstep(-0.005, 0.005, faceD)) * hc.a * step(huv.y, 0.85);
        if (hole > 0.0) {
            float flameN = fbm(vec2(q.x * 6.0, q.y * 4.0 - t * 2.2), 3);
            vec3 flame = mix(orange, hot, smoothstep(0.35, 0.80, flameN)) * inner * 1.35;
            // la pared de la cascara en el borde del corte (calabaza 3D): se ve
            // mas ancha del lado hacia donde se curva la superficie, como en
            // una de verdad, y la vela de adentro la ilumina
            vec2 gF = vec2(hwFace(q + vec2(0.004, 0.0), smileK, rage) - faceD,
                           hwFace(q + vec2(0.0, 0.004), smileK, rage) - faceD);
            float side = max(dot(normalize(gF + 1e-5), -nxy), 0.0);
            float wallW = 0.012 + 0.075 * side;
            float wall = smoothstep(-wallW, -wallW * 0.25, faceD);
            float fib = 0.75 + 0.25 * noise21(q * vec2(40.0, 140.0));
            vec3 flesh = vec3(1.0, 0.72, 0.30) * (0.35 + 0.65 * smoothstep(-wallW, 0.0, faceD)) * fib;
            flame = mix(flame, flesh * (0.25 + inner * 1.1) + ha * 0.1, wall);
            // canto vivo del corte del lado de la cascara: linea oscura
            col = mix(col, col * 0.4, (1.0 - smoothstep(0.0, 0.006, faceD)) * smoothstep(-0.002, 0.0, faceD) * hc.a);
            float eyes = step(0.10, q.y) * step(q.y, 0.40);
            flame += hot * eyes * min(keyGlow, 1.5) * 0.6;
            // apagada (pico del climax): solo quedan los ojos, rojos
            flame += vec3(0.9, 0.06, 0.02) * eyes * outE * (0.45 + 0.15 * sin(uRTime * 3.0));
            // suceso: pupilas oscuras que miran de un lado al otro
            if (sv == 0 && eyes > 0.0) {
                float look = 0.10 * sin(sp * 6.2832 * 1.5);
                for (int s2 = -1; s2 <= 1; s2 += 2) {
                    vec2 pq = q - vec2(float(s2) * 0.26 + look, 0.19);
                    flame = mix(flame, flame * 0.15, exp(-dot(pq, pq) * 900.0) * se);
                }
            }
            col = mix(col, flame, hole);
        }
    }

    // --- llamas de las velas: los medios las inclinan, el golpe las aviva ---
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec3 c = CAND[i];
        vec2 tip = vec2(c.x, c.y + c.z + 0.022);
        vec2 d = pT - tip;
        if (dot(d, d) > 0.09) continue;
        float h = (0.055 + uD2 * 0.025) * (0.85 + 0.25 * cf[i]) * (1.0 + hit * 0.35) * (1.0 - outE * (i == 0 ? 0.0 : 0.3));
        float lean = (0.25 + mid * 0.9) * sin(t * (1.6 + fi * 0.4) + fi * 2.0) * 0.5 + gust * (1.4 + 0.5 * sin(uRTime * 17.0 + fi));
        vec2 fl = hwFlame(d, h, lean);
        col += mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.92, 0.70), fl.x) * fl.x * 1.6 * cf[i];
        col += vec3(1.0, 0.55, 0.20) * fl.y * 0.22 * cf[i];
        col += vec3(0.3, 0.45, 1.0) * exp(-dot(d + vec2(0.0, 0.004), d + vec2(0.0, 0.004)) * 9000.0) * 0.35 * fl.x;
    }

    // --- humo saliendo por los ojos (los medios lo enroscan) ---
    for (int s = -1; s <= 1; s += 2) {
        vec2 sp = q - vec2(float(s) * 0.26, 0.30);
        float rise = clamp(sp.y / 0.9, 0.0, 1.0);
        float cone = smoothstep(0.10 + rise * 0.35, 0.0, abs(sp.x)) * smoothstep(0.0, 0.08, sp.y) * (1.0 - rise);
        if (cone <= 0.0) continue;
        vec2 su = vec2(sp.x * 0.6 + sin(sp.y * 3.0 - t) * (0.05 + mid * 0.08), sp.y * 0.35 - t * 0.02) + float(s) * 0.3;
        float sm = plate5Wrap(su).g;
        col += vec3(0.30, 0.25, 0.22) * smoothstep(0.45, 0.80, sm) * cone * (hkDR(0.0, 0.45, 1.3, uD3) + (dv == 1 ? D.x * 0.8 : 0.0) + cC * C.z * 0.5);
    }
    // --- locura: lenguas de fuego por ojos y boca ---
    if (rage > 0.01) {
        for (int s = -1; s <= 1; s++) {
            vec2 jp = (s == 0) ? q - vec2(0.0, -0.22) : q - vec2(float(s) * 0.27, 0.22);
            vec2 dir = (s == 0) ? vec2(0.0, -1.0) : normalize(vec2(float(s) * 0.6, 1.0));
            float al = dot(jp, dir);
            float ac = abs(dot(jp, vec2(-dir.y, dir.x)));
            float jet = smoothstep(0.08 + al * 0.25, 0.0, ac) * smoothstep(0.0, 0.05, al) * smoothstep(0.6 * rage + 0.05, 0.0, al);
            if (jet <= 0.0) continue;
            float n = fbm(vec2(ac * 9.0, al * 5.0 - uRTime * 8.0), 3);
            col += mix(orange, hot, n) * jet * n * 2.5;
        }
    }
    // --- suceso: una arana baja de su hilo sobre la calabaza ---
    if (sv == 3 && se > 0.0) {
        float drop = smoothstep(0.0, 0.45, sp) * (1.0 - smoothstep(0.7, 1.0, sp));
        vec2 sc = vec2(heroC.x + 0.12 * size, 1.25 - drop * (1.25 - heroC.y - 0.62 * size));
        float th = smoothstep(0.003, 0.0, abs(pT.x - sc.x)) * step(sc.y, pT.y);
        col += vec3(0.6, 0.6, 0.65) * th * 0.25 * se * (0.3 + inner * 0.3);
        vec2 aq = (pT - sc) / 0.035;
        if (dot(aq, aq) < 9.0) {
            float d = min(length(aq - vec2(0.0, -0.25)) - 0.55, length(aq - vec2(0.0, 0.45)) - 0.32);
            for (int k = 0; k < 4; k++) {
                float fk = float(k);
                float a = -0.75 + fk * 0.5 + 0.12 * sin(uRTime * 7.0 + fk);
                for (int sd2 = -1; sd2 <= 1; sd2 += 2) {
                    float sg = float(sd2);
                    vec2 b0 = vec2(sg * 0.25, 0.05);
                    vec2 kn = b0 + vec2(sg * cos(a), sin(a) + 0.6) * 0.9;
                    d = min(d, min(hkSeg(aq, b0, kn), hkSeg(aq, kn, kn + vec2(sg * 0.5, -0.9 + 0.3 * fk))) - 0.07);
                }
            }
            col = mix(col, vec3(0.01, 0.008, 0.006) + orange * 0.03 * inner, smoothstep(0.08, -0.08, d) * se);
        }
    }
    // --- C: ronda de llamitas que giran y se meten en la calabaza ---
    if (cC > 0.0) {
        float nF = 1.0 + 7.0 * smoothstep(0.0, 0.40, C.w);
        float spin = uRTime * (0.6 + 2.5 * smoothstep(0.3, 0.6, C.w));
        float rad = (0.95 * size) * (1.0 - dive);
        for (int k = 0; k < 8; k++) {
            float fk = float(k);
            if (fk >= nF) break;
            float on = clamp(nF - fk, 0.0, 1.0) * (1.0 - smoothstep(0.66, 0.70, C.w));
            float a = spin + fk * 0.785;
            vec2 fp = heroC + vec2(cos(a) * rad * 1.25, sin(a) * rad * 0.55 + 0.05);
            vec2 d = pT - fp;
            if (dot(d, d) > 0.09) continue;
            vec2 fl = hwFlame(d + vec2(0.0, 0.02), 0.07, 0.3 * sin(uRTime * 2.0 + fk));
            col += (mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.92, 0.70), fl.x) * fl.x * 1.6 + vec3(1.0, 0.55, 0.2) * fl.y * 0.35) * on;
        }
    }

    // --- llamas flotantes del piano ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.08, 1.2);
        if (e < 0.005) continue;
        vec2 fp = hwKeyFlame(k);
        // al soltarla sube un poco mientras se apaga
        fp.y += (1.0 - e) * 0.15 * (1.0 - keyHeld(k));
        vec2 d = pT - fp;
        if (dot(d, d) > 0.16) continue;
        float h = (0.09 + keyVel(k) * 0.10) * (0.85 + 0.15 * sin(uKclock * 9.0 + float(k) * 2.0));
        vec2 fl = hwFlame(d + vec2(0.0, h * 0.3), h, 0.25 * sin(uKclock * 1.7 + float(k)));
        vec3 kc = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.92, 0.70), fl.x);
        col += kc * fl.x * 1.8 * e + vec3(1.0, 0.55, 0.2) * fl.y * 0.45 * e;
        col += orange * exp(-dot(d, d) * 40.0) * 0.22 * e * (0.5 + keyVel(k));
    }
    // --- brasas (los agudos las hacen chispear; la llamarada las suelta) ---
    float sparkK = (dv == 2 ? D.x : 0.0) + dive;
    float emb = hkParticles(pT, t + hit * 0.3, hkDR(0.0, 0.19, 0.6, uD3) + relight * 0.25 + sparkK * 0.25, vec2(0.15, 1.0), 0.04);
    col += orange * emb * (0.7 + hit * 1.2 + high * 0.8 + relight * 2.5 + sparkK * 2.0) * smoothstep(1.0, -0.4, pT.y) * exp(-abs(pT.x) * 0.5);

    col = audioLift(col, high * 0.08);
    return vec4(hkFinish(col, uv, vec3(0.9, 0.4, 0.1)), 1.0);
}
