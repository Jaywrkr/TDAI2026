// ===============================================================
// HALLOWEEN 26 - LA MANSION EMBRUJADA
// Fachada victoriana de noche, de frente (LAMINAS horneadas,
// plates/scene26, ver td/tools/bake_plates_mansion.py): cuerpo de dos
// pisos con tablas gastadas, mansarda de pizarra con cresteria, torre
// central con aguja, ala con frontispicio, torreon redondo, porche,
// tres chimeneas, setos secos, la reja de lanzas y dos arboles muertos.
// En vivo: el cielo (luna, nubes, estrellas), la luz de las 19 ventanas
// (cada una con su cuarto, sus cortinas y a veces alguien mirando), la
// luz que derraman sobre la fachada, las chispas de las chimeneas, la
// hiedra, la niebla del jardin y los murcielagos.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> las ventanas laten con luz calida
//   medios -> se mecen las cortinas
//   agudos -> chispas de las chimeneas
//   golpe  -> en una ventana distinta cada vez aparece una silueta (una
//             mujer, un nino, una mano en el vidrio, alguien con una vela)
// PIANO: la nota elige la ventana (grave = izquierda) y la enciende; la
//   fuerza decide que tan nitida se ve la silueta. Mantenida, la silueta
//   se queda mirando; al soltarla se va de a poco. Un acorde llena
//   varias ventanas a la vez.
// Speed mueve las nubes, la niebla y las cortinas aun en silencio.
// HISTORIA: cada acto cambia cuantas ventanas viven; cada ~61 s alguien
//   se asoma al atico; cada ~67 s cae un relampago lejos.
// CLIMAX (~89 s, 20 s, en tres tiempos): las ventanas se apagan de a una
//   hasta quedar a oscuras; una luz de vela aparece arriba, en la torre,
//   y va bajando de ventana en ventana como alguien que baja la escalera;
//   la puerta se abre con un golpe de luz; despues la puerta se apaga y
//   las ventanas vuelven de a una. Gran climax (~4.5 min o el pad
//   Momento): ademas, relampagos y murcielagos que salen de la torre.
//
// @D1: ventanas que viven (se encienden de a una)
// @D2: niebla del jardin
// @D3: luz de luna
// @D4: siluetas con el golpe
// @D5: color de las ventanas (calido <-> verde espectral)
// @D6: hiedra que crece en la fachada
// ===============================================================

// >>> MANSION_GEOM (bake_plates_mansion.py hornea con este mismo bloque)
#define MN_NW 19
// ventanas: centro (x, y), medio ancho, medio alto
const vec4 MN_WIN[19] = vec4[19](
    vec4(-0.76, -0.30, 0.070, 0.100), vec4(-0.50, -0.30, 0.070, 0.100),   // 0-1 planta baja
    vec4(0.50, -0.30, 0.070, 0.100), vec4(0.76, -0.30, 0.070, 0.100),     // 2-3
    vec4(-0.76, 0.05, 0.070, 0.100), vec4(-0.50, 0.05, 0.070, 0.100),     // 4-5 primer piso
    vec4(-0.17, 0.05, 0.070, 0.100), vec4(0.17, 0.05, 0.070, 0.100),      // 6-7
    vec4(0.50, 0.05, 0.070, 0.100), vec4(0.76, 0.05, 0.070, 0.100),       // 8-9
    vec4(-0.55, 0.355, 0.050, 0.065), vec4(0.55, 0.355, 0.050, 0.065),    // 10-11 buhardillas
    vec4(0.00, 0.60, 0.075, 0.105),                                       // 12 torre
    vec4(-1.47, -0.30, 0.065, 0.100), vec4(-1.17, -0.30, 0.065, 0.100),   // 13-14 ala
    vec4(-1.34, 0.17, 0.060, 0.060),                                      // 15 ojo de buey
    vec4(1.20, -0.30, 0.055, 0.100), vec4(1.20, 0.05, 0.055, 0.100),      // 16-17 torreon
    vec4(1.20, 0.38, 0.050, 0.080)                                        // 18
);
// 0 rectangular, 1 con arco arriba, 2 redonda
const int MN_TYPE[19] = int[19](0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 2, 1, 1, 1);
const vec4 MN_DOOR = vec4(0.0, -0.405, 0.10, 0.155);
// chimeneas: x, alto del remate, medio ancho
const vec3 MN_CHIM[3] = vec3[3](vec3(-0.70, 0.66, 0.055), vec3(0.70, 0.66, 0.055), vec3(-1.56, 0.52, 0.045));
// distancia con signo a la abertura de la ventana i (negativa adentro)
float mnWinD(vec2 p, int i) {
    vec4 w = MN_WIN[i];
    vec2 q = p - w.xy;
    int ty = MN_TYPE[i];
    if (ty == 2) return length(q) - w.z;
    if (ty == 1) {
        float top = w.w - w.z;
        return min(max(abs(q.x) - w.z, max(q.y - top, -w.w - q.y)), length(q - vec2(0.0, top)) - w.z);
    }
    vec2 d = abs(q) - w.zw;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
// <<< MANSION_GEOM

const vec4 PL_R = vec4(-3.4, -1.25, 6.8, 2.5);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// orden en que se encienden con D1 (las primeras son las que mas se ven)
const float MN_ORD[19] = float[19](4.0, 9.0, 7.0, 14.0, 2.0, 11.0, 5.0, 1.0, 12.0, 6.0,
                                   16.0, 8.0, 0.0, 17.0, 10.0, 18.0, 13.0, 3.0, 15.0);
// la vela del climax baja por estas ventanas y termina en la puerta
const int MN_WALK[6] = int[6](12, 11, 8, 7, 6, 1);
const vec2 MOON = vec2(-1.55, 0.58);

// silueta dentro de la ventana (q en -1..1). kind 0 mujer, 1 nino,
// 2 mano en el vidrio, 3 alguien con una vela. Devuelve cuanto tapa.
float mnSil(vec2 q, int kind, float blur, float t, float seed) {
    float d;
    q.x += 0.06 * sin(t * 0.5 + seed);
    if (kind == 0) {
        float head = length((q - vec2(0.0, 0.32)) * vec2(1.0, 0.85)) - 0.24;
        float hair = length((q - vec2(0.0, 0.26)) * vec2(0.85, 0.7)) - 0.30;
        float body = max(abs(q.x) - (0.30 + (0.05 - q.y) * 0.32), q.y - 0.06);
        d = min(min(head, body), max(hair, q.y - 0.05));
    } else if (kind == 1) {
        vec2 c = q - vec2(0.18, -0.10);
        float head = length(c - vec2(0.0, 0.10)) - 0.20;
        float body = max(abs(c.x) - (0.20 + (-0.08 - c.y) * 0.2), c.y + 0.08);
        d = min(head, body);
    } else if (kind == 2) {
        vec2 c = q - vec2(-0.05, -0.15);
        float palm = length(c * vec2(1.0, 0.9)) - 0.30;
        float f = 1e3;
        for (int k = 0; k < 4; k++) {
            float fk = float(k);
            vec2 a = vec2(-0.21 + fk * 0.14, 0.15);
            f = min(f, hkSeg(c, a, a + vec2((fk - 1.5) * 0.04, 0.42 + 0.06 * sin(fk * 2.0))) - 0.07);
        }
        f = min(f, hkSeg(c, vec2(0.22, -0.05), vec2(0.46, 0.18)) - 0.07);
        d = min(palm, f);
    } else {
        float head = length(q - vec2(-0.15, 0.30)) - 0.21;
        float body = max(abs(q.x + 0.15) - (0.30 + (0.08 - q.y) * 0.25), q.y - 0.10);
        float arm = hkSeg(q, vec2(-0.05, -0.05), vec2(0.30, -0.15)) - 0.07;
        d = min(min(head, body), arm);
    }
    return 1.0 - smoothstep(-blur, blur, d);
}

vec4 render(vec2 uv) {
    // la casa entera en cuadro (con la aguja), apoyada abajo
    vec2 p = hkCam(hkPunch(hkShake(centered(uv)))) * 1.12 + vec2(0.0, 0.10);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.006);

    vec4 G = hkGrandClimax(6.0);
    vec4 C = hkClimaxOr(G, hkClimax(6.0, 89.0, 20.0));
    float cph = C.w;
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    // la vela baja por la casa en el pico y la puerta se abre al final
    float walk = smoothstep(0.33, 0.64, cph) * 6.0;
    float doorB = smoothstep(0.62, 0.66, cph) * (1.0 - smoothstep(0.78, 0.94, cph));
    float attic = hkEvent(5.0, 61.0, 7.0);
    float bolt = max(hkEvent(8.0, 67.0, 1.2), G.y * step(0.55, fract(uRTime * 1.3)));
    float bx = hash21(vec2(floor(uRTime / 67.0), 8.0)) * 3.6 - 1.8;      // donde cae el rayo

    vec3 warm = vec3(1.0, 0.60, 0.26);
    vec3 spect = hsv2rgb(vec3(fract(0.36 + hue), 0.65, 1.0));
    vec3 candleC = vec3(1.0, 0.82, 0.55);
    float moonK = (0.60 + uD3 * 0.80) * (1.0 - C.x * 0.45) + bolt * 1.6;

    vec2 pu = rUV(p);
    vec4 fa = plate0(pu);
    vec4 mk = plate1(pu);
    // relieve horneado de la fachada (fase 22): normal y cavidad
    vec4 rl = plate3(pu);
    float rlOn = rl.a;
    vec3 nrm = vec3(rl.rg * 2.0 - 1.0, 0.0);
    nrm.z = sqrt(max(1.0 - dot(nrm.xy, nrm.xy), 0.0));
    float door = smoothstep(0.8, 0.95, mk.r);
    float fore = smoothstep(0.3, 0.45, mk.r) * (1.0 - smoothstep(0.6, 0.8, mk.r));

    // --- cielo ---
    vec3 col = vec3(0.0);
    if (fa.a < 0.999) {
        vec3 sky = mix(vec3(0.07, 0.07, 0.15), vec3(0.015, 0.015, 0.045), smoothstep(-0.4, 1.1, p.y));
        vec2 mq = p - MOON;
        float mr = length(mq);
        vec3 moonC = vec3(0.95, 0.93, 0.85) * (0.8 + 0.2 * plate2Wrap(mq * 0.9 + 0.3).r);
        sky += vec3(0.45, 0.48, 0.62) * exp(-mr * 2.6) * 0.35 * moonK;
        float st = step(0.995, hash21(floor(p * 160.0))) * (0.5 + 0.5 * sin(uRTime * 3.0 + hash21(floor(p * 160.0)) * 40.0));
        sky += vec3(0.8) * st * smoothstep(0.0, 0.6, p.y) * (1.0 - smoothstep(0.0, 0.5, exp(-mr * 2.0)));
        sky = mix(sky, moonC * (0.7 + 0.5 * uD3), 1.0 - smoothstep(0.15, 0.158, mr));
        sky = hkStyleMoon(sky, p, MOON, 0.16);
        // nubes que pasan delante de la luna
        float cl = plate2Wrap(vec2(p.x * 0.22 + t * 0.012, p.y * 0.35 + 0.2)).r;
        float cl2 = plate2Wrap(vec2(p.x * 0.5 - t * 0.02, p.y * 0.7 + 0.5)).r;
        float cov = smoothstep(0.50, 0.78, cl * 0.7 + cl2 * 0.4) * smoothstep(-0.3, 0.4, p.y);
        vec3 cloudC = vec3(0.05, 0.05, 0.09) + vec3(0.35, 0.36, 0.45) * exp(-mr * 1.8) * moonK * 0.5;
        sky = mix(sky, cloudC, cov * 0.85);
        // gran climax: el cielo se carga de tormenta (los murcielagos se
        // recortan contra ese resplandor)
        sky += vec3(0.12, 0.09, 0.18) * grand * G.x * (0.6 + 0.4 * cl) * smoothstep(-0.2, 0.9, p.y);
        // relampago lejano
        if (bolt > 0.01) {
            float bd = hkBolt(p, bx, 1.1, 0.0, floor(uRTime * 7.0), 0.5);
            sky += vec3(0.8, 0.85, 1.0) * bolt * (0.004 / (bd + 0.004) + 0.25);
        }
        col = mix(sky, col, fa.a);
    }

    // --- fachada a la luz de la luna ---
    vec3 alb = plateCol(fa.rgb);
    // con relieve: la luna llega desde arriba a la izquierda y el relampago
    // desde el lado donde cae; cada tabla, moldura y persiana se marca
    float difM = max(dot(nrm, vec3(-0.6236, 0.4828, 0.6150)), 0.0);
    vec3 Lb = normalize(vec3(clamp((bx - p.x) * 0.6, -1.2, 1.2), 0.8, 0.5));
    float difB = max(dot(nrm, Lb), 0.0);
    float moonOnly = (0.60 + uD3 * 0.80) * (1.0 - C.x * 0.45);
    float rim = pow(1.0 - nrm.z, 1.5) * max(dot(normalize(nrm.xy + 1e-4), vec2(-0.79, 0.61)), 0.0);
    float keyL = mix(moonK, moonOnly * (0.30 + 1.30 * difM + rim * 0.8) + bolt * 1.6 * (0.25 + 1.8 * difB), rlOn);
    vec3 house = alb * (vec3(0.26, 0.29, 0.42) * keyL * mix(1.0, rl.b, rlOn) + vec3(0.025, 0.02, 0.025));

    // --- ventanas ---
    float nLive = min(3.0 + uD1 * 15.0 + uDensity * 2.0 + hkActVal(3.0) * 2.0, 19.0);
    float sel = floor(hash21(vec2(floor(uRTime * 0.9), 26.0)) * 19.0);    // la del golpe
    float silA = hit * (0.35 + uD4 * 0.75);
    vec3 spill = vec3(0.0);
    vec3 glass = vec3(0.0);
    float glassA = 0.0;
    // piano: la ventana de cada voz (la mas cercana en x a la nota, con un
    // poco de altura), una vez y no por ventana
    int keyWin[6];
    float keyE[6];
    for (int k = 0; k < N_KEYS; k++) {
        keyE[k] = keyEnv(k, 0.15, 1.2);
        keyWin[k] = -1;
        if (keyE[k] <= 0.001) continue;
        float kx = mix(-1.60, 1.30, keyPos(k));
        float ky = mix(-0.30, 0.60, fract(keyPos(k) * 3.7));
        float best = 1e3;
        for (int j = 0; j < MN_NW; j++) {
            vec2 dj = MN_WIN[j].xy - vec2(kx, ky);
            float dd = dj.x * dj.x + dj.y * dj.y * 0.3;
            if (dd < best) { best = dd; keyWin[k] = j; }
        }
    }
    for (int i = 0; i < MN_NW; i++) {
        vec4 w = MN_WIN[i];
        // lejos de esta ventana no llega ni su luz: nada que calcular
        float bd = mnWinD(p, i);
        if (bd > 0.32) continue;
        float fi = float(i);
        float L = revealAt(nLive, MN_ORD[i]);
        L *= 0.82 + 0.18 * noise21(vec2(uRTime * 2.0, fi * 3.1));            // titila un poco
        L *= 1.0 - hkOffWindow(cph, fract(fi * 0.618 + 0.1), fract(fi * 0.381 + 0.3));
        // silueta: golpe, piano, atico, la vela del climax
        float S = (abs(fi - sel) < 0.5 ? silA : 0.0);
        float sharp = 0.5;
        int kind = int(mod(fi * 7.0 + floor(uRTime / HK_ACT), 4.0));
        if (i == 10) { S = max(S, attic); L = max(L, attic * 0.8); kind = 0; }
        for (int k = 0; k < N_KEYS; k++) {
            if (keyWin[k] == i) {
                S = max(S, keyE[k] * (0.55 + keyVel(k) * 0.45));
                L = max(L, keyE[k] * (1.2 + keyVel(k) * 0.9));
                sharp = max(sharp, keyVel(k));
            }
        }
        float wl = 0.0;
        for (int k = 0; k < 6; k++) {
            if (MN_WALK[k] == i) wl = exp(-pow((walk - float(k)) * 1.5, 2.0)) * step(0.0, cph) * step(cph, 0.7);
        }
        if (wl > 0.001) { S = max(S, wl); kind = 3; }
        vec3 wc = mix(warm, spect, clamp(uD5 + (hash21(vec2(fi, 9.0)) - 0.5) * 0.3 * uD5, 0.0, 1.0));
        wc = mix(wc, vec3(1.0, 0.35, 0.2), step(0.85, hash21(vec2(fi, 4.0))) * 0.5);   // alguna roja
        float pulse = 0.75 + bass * 0.65;
        vec3 lc = wc * L * pulse + candleC * wl * 1.4;
        float Lt = L * pulse + wl;
        // luz que derrama sobre la fachada y el suelo
        // (con relieve: pega mas en lo que mira a la ventana, como el canto
        // de las persianas y el alfeizar)
        float face = 0.85 + 1.0 * max(dot(nrm, normalize(vec3(w.xy - p, 0.06))), 0.0);
        spill += lc * exp(-max(bd, 0.0) * (16.0 - 4.0 * step(p.y, w.y - w.w))) * 0.16 * mix(1.0, face, rlOn);
        // el cuarto, visto por el vidrio
        if (mk.g > 0.002 && bd < 0.004) {
            vec2 q = (p - w.xy) / w.zw;
            // el cuarto: pared del fondo con empapelado y una lampara
            vec2 lp = vec2((hash21(vec2(fi, 2.0)) - 0.5) * 0.9, -0.25);
            vec3 room = lc * (0.28 + 0.72 * exp(-dot(q - lp, q - lp) * 1.1));
            room *= 0.88 + 0.12 * step(0.5, fract(q.x * 3.0 + 0.2 * sin(q.y * 9.0 + fi)));
            room *= mix(0.55, 1.0, smoothstep(-0.75, -0.65, q.y));            // piso
            // la silueta tapa la luz del cuarto (entre las cortinas)
            if (S > 0.002) {
                float blur = mix(0.20, 0.025, clamp(sharp, 0.0, 1.0));
                float sm = mnSil(q * vec2(0.85, 1.0), kind, blur, uRTime, fi * 3.3) * S;
                room = mix(room, room * 0.05, sm * 0.96);
                if (kind == 3) {     // la vela que lleva
                    vec2 fq = (q - vec2(0.30, -0.08)) * vec2(1.0, 0.6);
                    room += candleC * exp(-dot(fq, fq) * 50.0) * 2.2 * S;
                }
            }
            // cortinas a los costados, recogidas con un lazo; se mecen con
            // los medios
            float sway = 0.04 * sin(t * 0.6 + fi * 1.3) + mid * 0.12 * sin(uRTime * 2.7 + fi * 1.7);
            float pinch = exp(-pow((q.y + 0.25) / 0.28, 2.0));
            float wcur = 0.42 - 0.24 * pinch;
            float cl = (-1.0 + wcur + sway * (1.0 - pinch)) - q.x;
            float cr = q.x - (1.0 - wcur + sway * 0.8 * (1.0 - pinch));
            float cur = max(smoothstep(-0.03, 0.03, cl), smoothstep(-0.03, 0.03, cr));
            cur = max(cur, smoothstep(0.76, 0.80, q.y));                         // bando
            float folds = 0.65 + 0.35 * sin((q.x - sway) * 15.0 + sin(q.y * 3.0 + fi) * 1.2);
            vec3 curC = lc * 0.30 * folds + wc * 0.015;
            room = mix(room, curC, cur * 0.94);
            glass = room;
            glassA = smoothstep(0.0, 0.05, Lt + S * 0.5);
        }
    }
    house += spill * (0.6 + 0.4 * alb.r * 4.0);

    // --- hiedra (D6 la hace subir desde el suelo) ---
    if (mk.b > 0.004) {
        float ivy = smoothstep(mk.b, mk.b + 0.035, uD6 * 1.03);
        float lf = plate2Wrap(pu * vec2(14.0, 5.5)).a;
        float leaf = smoothstep(0.35, 0.65, lf);
        vec3 ivyC = vec3(0.022, 0.040, 0.020) * (0.4 + 1.2 * leaf) * moonK + spill * 0.25 * vec3(0.5, 0.8, 0.35);
        house = mix(house, ivyC, ivy * (0.55 + 0.4 * leaf));
    }

    // --- la puerta: rendija y golpe de luz ---
    house = mix(house, candleC * 2.2, door * doorB);
    col = mix(col, house, fa.a);
    col = mix(col, glass, mk.g * glassA);

    vec2 dc = MN_DOOR.xy;
    if (doorB > 0.001) {
        // luz que sale por la puerta abierta: abanico sobre el camino y la
        // niebla (no sobre la casa) y un resplandor en el marco
        vec2 dq = p - dc;
        float below = smoothstep(0.02, -0.12, dq.y);
        float rays = hkRays(p, dc + vec2(0.0, -0.10), t, 26.0) * hkStyleRays() * below;
        float cone = below * exp(-abs(dq.x) / (0.10 + max(-dq.y, 0.0) * 0.75)) * exp(-max(-dq.y, 0.0) * 0.8);
        col += candleC * doorB * (rays * 0.55 + cone * 0.55 + exp(-length(dq * vec2(2.2, 1.2)) * 7.0) * 0.5);
    }

    // --- chispas y humo de las chimeneas ---
    for (int i = 0; i < 3; i++) {
        vec3 ch = MN_CHIM[i];
        float dx = p.x - ch.x;
        float dy = p.y - ch.y;
        if (dy < -0.02 || abs(dx) > 0.35) continue;
        float sm = plate2Wrap(vec2(dx * 1.2 - t * 0.02 + float(i), dy * 0.8 - t * 0.06)).g;
        float plume = exp(-abs(dx - dy * 0.25) / (0.05 + dy * 0.25)) * smoothstep(-0.02, 0.05, dy) * exp(-dy * 1.6);
        col = mix(col, vec3(0.10, 0.10, 0.12) * moonK * 0.6, plume * smoothstep(0.35, 0.75, sm) * 0.6);
        float sp = hkParticles(vec2(dx - dy * 0.2, dy) * 1.6 + float(i) * 3.0, uRTime, 0.05 + high * 0.30, vec2(0.0, 1.0), 0.035);
        col += vec3(1.0, 0.55, 0.18) * sp * plume * (0.6 + high * 2.5);
    }

    // --- niebla del jardin (detras de la reja y los setos) ---
    float fz = plate2Wrap(vec2(p.x * 0.18 + t * 0.010, p.y * 0.55 - t * 0.004)).g;
    float fz2 = plate2Wrap(vec2(p.x * 0.45 - t * 0.016, p.y * 1.2)).b;
    float fogA = (0.20 + uD2 * 0.70) * smoothstep(-0.35, -0.85, p.y) * (0.45 + 0.75 * (fz * 0.6 + fz2 * 0.5));
    vec3 fogC = vec3(0.22, 0.24, 0.32) * moonK + spill * 0.6 + candleC * doorB * 0.35 * exp(-abs(p.x) * 2.0);
    col = mix(col, fogC, clamp(fogA, 0.0, 0.85) * (1.0 - fore * 0.65));

    // --- murcielagos que salen de la torre (gran climax) ---
    if (grand > 0.0 && G.w > 0.30) {
        float bt = (G.w - 0.30) * 26.0;                 // segundos desde que salen
        for (int b = 0; b < 16; b++) {
            float fb = float(b);
            float h1 = hash21(vec2(fb, 2.0)), h2 = hash21(vec2(fb, 5.0));
            float age = (bt - h2 * 4.0) * (0.16 + 0.12 * h1);
            if (age <= 0.0 || age > 2.2) continue;
            float a = 1.5708 + (h1 - 0.5) * 2.8;
            vec2 bp = vec2(0.0, 0.86) + vec2(cos(a) * 1.5, sin(a) * 0.55 + age * 0.12) * age
                    + vec2(sin(age * 5.0 + fb) * 0.04, sin(age * 7.0 + fb * 2.0) * 0.03);
            float sz = 0.03 + age * 0.08;
            vec2 bq = (p - bp) / sz;
            if (abs(bq.x) > 1.4 || abs(bq.y) > 1.0) continue;
            bq.x = abs(bq.x);
            float flap = sin(uRTime * 17.0 + fb * 2.3);
            float topE = 0.08 + bq.x * (0.15 + 0.55 * flap);
            float botE = topE - 0.40 * (1.0 - bq.x / 1.25) - 0.02 + 0.12 * abs(sin(bq.x * 7.5));
            float wing = smoothstep(1.25, 1.15, bq.x) * smoothstep(-0.04, 0.04, topE - bq.y) * smoothstep(-0.04, 0.04, bq.y - botE);
            float body = 1.0 - smoothstep(0.16, 0.22, length(bq * vec2(1.4, 0.75) - vec2(0.0, 0.02)));
            float ears = smoothstep(0.06, 0.0, hkSeg(bq, vec2(0.07, 0.18), vec2(0.11, 0.30)));
            col = mix(col, vec3(0.012, 0.01, 0.015), max(max(wing, body), ears) * 0.95);
        }
    }

    col = audioLift(col, high * 0.06);
    return vec4(hkFinish(col, uv, vec3(0.35, 0.3, 0.6)), 1.0);
}
