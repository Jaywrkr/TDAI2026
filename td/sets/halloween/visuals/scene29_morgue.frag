// ===============================================================
// HALLOWEEN 29 - LA MORGUE
// Una sala de autopsias en perspectiva (LAMINAS horneadas,
// plates/scene29, ver td/tools/bake_plates_morgue.py): azulejos con
// junta sucia, la pared izquierda de cajones refrigerados de acero, la
// puerta de salida al fondo a la derecha, piso de baldosas con desague y
// dos mesas de acero con un cuerpo bajo la sabana. En vivo: la luz de los
// cuatro tubos fluorescentes (cada uno con su parpadeo) sobre cada punto
// de la sala, el vapor frio, las gotas, la sangre, los cajones que se
// abren y lo que pasa bajo las sabanas.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> los tubos zumban y parpadean
//   medios -> el vapor frio sale de los cajones
//   agudos -> gotas que caen del techo
//   golpe  -> una sabana se mueve, como si respirara
// PIANO: se abre el cajon de esa posicion (grave = el mas cercano), sale
//   vapor y asoma una mano; la fuerza: cuanto se abre. Mantenida, la mano
//   se queda afuera; al soltarla vuelve a entrar.
// Speed mueve el vapor y el parpadeo aun en silencio.
// HISTORIA: cada acto cambia cuantos tubos andan; cada ~57 s un tubo se
//   muere un rato; cada ~77 s una camilla tiembla.
// CLIMAX (~97 s, 20 s, en tres tiempos): los tubos se apagan de a uno
//   hacia el fondo y queda solo la luz roja de emergencia; bajo la sabana
//   de la mesa de adelante una figura se sienta; cuando la luz vuelve,
//   parpadeando, la mesa esta vacia. Gran climax (~4.5 min o el pad
//   Momento): ademas se abren todos los cajones y asoman las manos.
//
// @D1: tubos que funcionan
// @D2: vapor frio
// @D3: sabanas que respiran
// @D4: parpadeo con el golpe
// @D5: color de la luz (blanco clinico <-> verde enfermo)
// @D6: sangre en el piso
// ===============================================================

// >>> MORGUE_GEOM (bake_plates_morgue.py hornea con este mismo bloque)
const vec2 MG_VP = vec2(0.0, 0.08);
const float MG_HF = 0.95, MG_HC = 0.85, MG_WC = 1.90, MG_ZB = 4.0;
// cajones en la pared izquierda: 5 columnas (a lo largo de z) x 3 filas
vec4 mgDrawer(int c, int r) {       // z0, z1, y0, y1
    float z0 = 0.95 + 0.52 * float(c);
    float y0 = -0.86 + 0.42 * float(r);
    return vec4(z0, z0 + 0.44, y0, y0 + 0.36);
}
// mesas: centro x, z0, z1, alto de la tapa
const vec4 MG_TABLE[2] = vec4[2](vec4(0.10, 1.10, 1.95, -0.30), vec4(0.95, 2.35, 3.10, -0.30));
const float MG_TW = 0.27;           // medio ancho de la tapa
// tubos: z de cada uno (x 0.20, medio largo 0.32, colgados del techo)
const float MG_TUBE[4] = float[4](0.90, 1.70, 2.50, 3.30);
const vec3 MG_EXIT = vec3(1.88, 0.30, 3.50);   // luz de emergencia sobre la puerta
// <<< MORGUE_GEOM

const vec4 PL_R = vec4(-3.4, -1.25, 6.8, 2.5);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// una mano palida que sale (q local: x a lo ancho del cajon, y hacia afuera)
float mgHand(vec2 q) {
    float palm = length((q - vec2(0.0, -0.05)) * vec2(1.0, 1.3)) - 0.22;
    float f = 1e3;
    for (int k = 0; k < 4; k++) {
        float fk = float(k);
        vec2 a = vec2(-0.15 + fk * 0.10, 0.08);
        f = min(f, hkSeg(q, a, a + vec2((fk - 1.5) * 0.03, 0.30 + 0.05 * sin(fk * 2.0))) - 0.045);
    }
    f = min(f, hkSeg(q, vec2(0.18, -0.05), vec2(0.34, 0.12)) - 0.045);
    float arm = max(abs(q.x + 0.02) - 0.16, q.y + 0.05);
    return min(min(palm, f), arm);
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv)))) * 1.06 + vec2(0.0, 0.05);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float hue = audioHue(uHue, mid * 0.005);

    vec4 G = hkGrandClimax(9.0);
    vec4 C = hkClimaxOr(G, hkClimax(9.0, 97.0, 20.0));
    float cph = C.w;
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    float dying = hkEvent(4.0, 57.0, 6.0);
    float shake = hkEvent(7.0, 77.0, 4.0);

    vec3 clinic = vec3(0.85, 0.92, 1.0);
    vec3 sick = hsv2rgb(vec3(fract(0.30 + hue), 0.55, 1.0));
    vec3 tubeC = mix(clinic, sick, uD5);
    vec3 redC = vec3(1.0, 0.08, 0.04);

    // --- los tubos: cuales andan y cuanto ---
    float nT = min(1.0 + uD1 * 3.0 + hkActVal(2.0) * 0.6, 4.0);
    float T[4];
    float sumT = 0.0;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float on = revealAt(nT, fi == 0.0 ? 0.0 : (fi == 2.0 ? 1.0 : (fi == 1.0 ? 2.0 : 3.0)));
        // zumbido: el bajo los hace parpadear, cada uno a su manera
        float n = noise21(vec2(uRTime * (9.0 + fi * 3.0), fi * 7.0));
        float flick = 1.0 - (0.05 + bass * 0.45) * step(0.62 - bass * 0.25, n);
        flick *= 1.0 - hit * uD4 * 0.8 * step(0.5, hash21(vec2(floor(uRTime * 8.0), fi)));
        if (i == 1) flick *= 1.0 - dying * step(0.4, noise21(vec2(uRTime * 14.0, 3.0)));
        // climax: se apagan hacia el fondo y vuelven parpadeando
        if (cph > 0.0) {
            float a0 = 0.03 + fi * 0.07;
            float back = 0.72 + fi * 0.04;
            float off = smoothstep(a0, a0 + 0.02, cph) * (1.0 - smoothstep(back, back + 0.02, cph));
            float rf = step(back, cph) * step(cph, back + 0.10) * step(0.5, noise21(vec2(uRTime * 20.0, fi)));
            flick *= (1.0 - off) * (1.0 - rf);
        }
        T[i] = on * flick;
        sumT += T[i];
    }
    // emergencia roja: cuando no hay luz
    float emer = clamp(1.0 - sumT * 0.6, 0.0, 1.0) * (0.6 + 0.4 * step(0.5, fract(uRTime * 0.8)));

    vec2 pu = rUV(p);
    // la sabana respira (golpe, D3)
    vec4 mk0 = plate1(pu);
    float breath = (0.25 * sin(uRTime * 1.4) + hit * 1.2 + shake * sin(uRTime * 30.0)) * uD3 + shake * 0.6 * sin(uRTime * 35.0);
    pu.y -= mk0.r * breath * 0.004;
    vec4 rm = plate0(pu);
    vec4 mk = plate1(pu);
    float z = max(mk.b * 6.0, 0.4);
    vec3 X = vec3((p - MG_VP) * z, z);

    // --- luz de los tubos y de la emergencia sobre cada punto ---
    vec3 alb = plateCol(rm.rgb);
    vec3 light = vec3(0.012, 0.014, 0.02);
    vec3 spec = vec3(0.0);
    for (int i = 0; i < 4; i++) {
        if (T[i] <= 0.001) continue;
        vec3 a = vec3(0.20 - 0.32, MG_HC - 0.05, MG_TUBE[i]);
        vec3 b = vec3(0.20 + 0.32, MG_HC - 0.05, MG_TUBE[i]);
        vec3 pa = X - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        vec3 dv = pa - ba * h;
        float d2 = dot(dv, dv);
        light += tubeC * T[i] / (1.0 + d2 * 1.6);
        spec += tubeC * T[i] * exp(-d2 * 3.0);
    }
    vec3 de = X - MG_EXIT;
    light += redC * emer * (0.9 / (1.0 + dot(de, de) * 0.8) + 0.10);
    vec3 col = alb * light * 1.5 + spec * mk.g * alb * 1.2;

    // --- sangre en el piso, desde el desague (D6) ---
    if (X.y < -MG_HF + 0.02 && mk.r < 0.5) {
        vec2 fp = X.xz - vec2(0.55, 2.15);
        float n = plate2Wrap(fp * 0.35).g;
        float arr = length(fp * vec2(1.0, 0.7)) * 1.1 + (n - 0.5) * 0.45;
        float bl = smoothstep(arr, arr + 0.04, uD6 * 1.1);
        vec3 blood = vec3(0.18, 0.005, 0.01) * (0.6 + 0.4 * n);
        col = mix(col, blood * (light * 1.4 + 0.02) + spec * 0.35 * vec3(1.0, 0.4, 0.4), bl * 0.95);
    }

    // --- cajones que se abren: piano y gran climax ---
    if (X.x < -MG_WC + 0.02 && mk.r < 0.5) {
        float cz = clamp(floor((X.z - 0.95) / 0.52), 0.0, 4.0);
        float cr = clamp(floor((X.y + 0.86) / 0.42), 0.0, 2.0);
        vec4 dr = mgDrawer(int(cz), int(cr));
        if (X.z > dr.x && X.z < dr.y && X.y > dr.z && X.y < dr.w) {
            float open = grand * smoothstep(0.10 + cz * 0.04, 0.25 + cz * 0.04, cph) * (1.0 - smoothstep(0.85, 0.95, cph));
            for (int k = 0; k < N_KEYS; k++) {
                float e = keyEnv(k, 0.12, 0.9);
                if (e <= 0.001) continue;
                float kc = floor(keyPos(k) * 4.99);
                float kr = floor(fract(keyPos(k) * 7.3) * 2.99);
                if (abs(kc - cz) < 0.5 && abs(kr - cr) < 0.5) open = max(open, e * (0.6 + keyVel(k) * 0.4));
            }
            if (open > 0.001) {
                vec2 q = vec2((X.z - (dr.x + dr.y) * 0.5) / 0.22, (X.y - (dr.z + dr.w) * 0.5) / 0.18);
                float gap = smoothstep(1.0, 0.85, abs(q.x)) * smoothstep(1.0, 0.82, abs(q.y));
                vec3 dark = vec3(0.01, 0.012, 0.016) + tubeC * 0.02;
                col = mix(col, dark, gap * open);
                // la mano: sale del hueco hacia la sala
                float hd = mgHand(vec2(q.y * 0.9, q.x * 0.8 - 0.9 + open * 1.1));
                vec3 skin = vec3(0.55, 0.60, 0.55) * (light * 1.6 + 0.03);
                col = mix(col, skin, (1.0 - smoothstep(0.0, 0.05, hd)) * gap * smoothstep(0.3, 0.7, open));
            }
        }
    }

    // --- la figura que se sienta bajo la sabana (climax) ---
    vec4 T0 = MG_TABLE[0];
    if (cph > 0.0) {
        float sit = smoothstep(0.38, 0.62, cph) * (1.0 - step(0.72, cph));
        float empty = step(0.72, cph) * (1.0 - smoothstep(0.94, 1.0, cph));
        // la mesa vacia: la sabana desaparece (queda el acero)
        col = mix(col, vec3(0.30, 0.32, 0.34) * light * 1.3 + spec * 0.5, mk.r * empty);
        if (sit > 0.001) {
            float zz = T0.z - 0.20;          // la cabecera, al fondo de la mesa
            vec2 base = MG_VP + vec2(T0.x, T0.w + 0.05) / zz;
            float s = 1.0 / zz;
            vec2 q = (p - base) / (s * 1.7);
            float rise = sit;
            float head = length((q - vec2(0.0, 0.42 * rise + 0.08)) * vec2(1.0, 0.9)) - 0.12;
            float torso = max(abs(q.x) - (0.20 + max(0.0, 0.3 * rise - q.y) * 0.25), max(q.y - 0.36 * rise - 0.05, -q.y));
            float d = hkSmin(head, torso, 0.08);
            vec3 sheetC = vec3(0.75, 0.78, 0.80) * (light * 1.6 + 0.05) * (0.8 + 0.2 * sin(q.x * 30.0 + q.y * 8.0));
            col = mix(col, sheetC, (1.0 - smoothstep(-0.01, 0.01, d)) * smoothstep(0.0, 0.1, rise));
        }
    }

    // --- tubos en pantalla ---
    for (int i = 0; i < 4; i++) {
        float zt = MG_TUBE[i];
        vec2 a = MG_VP + vec2(0.20 - 0.32, MG_HC - 0.05) / zt;
        vec2 b = MG_VP + vec2(0.20 + 0.32, MG_HC - 0.05) / zt;
        float d = hkSeg(p, a, b);
        float w = 0.012 / zt;
        float on = revealAt(nT, i == 0 ? 0.0 : (i == 2 ? 1.0 : (i == 1 ? 2.0 : 3.0)));
        col = mix(col, vec3(0.10, 0.11, 0.12), (1.0 - smoothstep(w, w * 1.3, d)) * on * 0.8);
        col += tubeC * T[i] * ((1.0 - smoothstep(w * 0.6, w, d)) * 1.6 + exp(-d / (w * 4.0)) * 0.35);
    }
    // luz de emergencia
    vec2 ep = MG_VP + MG_EXIT.xy / MG_EXIT.z;
    col += redC * emer * (exp(-length((p - ep) * vec2(1.0, 1.6)) * 40.0) * 1.5 + exp(-length(p - ep) * 6.0) * 0.12);

    // --- vapor frio de los cajones (medios, D2) y gotas (agudos) ---
    float va = (0.08 + uD2 * 0.55 + mid * 0.35) * smoothstep(-0.2, -1.4, p.x - (MG_VP.x)) * smoothstep(0.5, -0.9, p.y);
    if (va > 0.002) {
        float v = plate2Wrap(vec2(p.x * 0.6 + t * 0.03 + mid * 0.02, p.y * 0.9 - t * 0.02)).g;
        float v2 = plate2Wrap(vec2(p.x * 1.3 - t * 0.05, p.y * 1.6 + t * 0.01)).b;
        col = mix(col, vec3(0.30, 0.35, 0.40) * (sumT * 0.35 + 0.05) + redC * emer * 0.06, clamp(va * smoothstep(0.35, 0.8, v * 0.7 + v2 * 0.5), 0.0, 0.7));
    }
    float drops = 0.0;
    for (int k = 0; k < 3; k++) {
        float fk = float(k);
        vec2 g = vec2(p.x * (7.0 + fk * 4.0) + fk * 3.3, p.y * 1.0 + uRTime * (1.6 + fk * 0.4));
        float id = floor(g.x);
        float h = hash21(vec2(id, fk));
        if (h > 0.025 + high * 0.10) continue;
        float y = fract(g.y + h * 7.0);
        drops += smoothstep(0.06, 0.0, abs(fract(g.x) - 0.5)) * smoothstep(0.0, 0.02, y) * smoothstep(0.08, 0.02, y);
    }
    col += (tubeC * sumT * 0.25 + 0.02) * drops * 1.5;

    col = audioLift(col, high * 0.05);
    // LUZ DE TECLA (fase 37): el tubo de esa zona se prende
    col = hkKeyLit(col, p, -0.05, vec2(0.3, 0.6), vec3(0.7, 1.0, 0.85), vec3(0.9, 1.0, 1.0), 0.04, 1.0);
    return vec4(hkFinish(col, uv, vec3(0.35, 0.5, 0.5)), 1.0);
}
