// ===============================================================
// HALLOWEEN 05 - SANGRE QUE CHORREA
// Un bano de hospital abandonado: azulejos viejos con juntas sucias,
// azulejos caidos, oxido, pintura descascarada arriba, un fluorescente
// y piso de baldosas con desague (LAMINAS horneadas, plates/scene05,
// ver td/tools/bake_plates_sangre.py). En la pared hay huellas de manos
// arrastradas y salpicaduras secas; desde arriba chorrea sangre fresca
// que brilla y se junta en un charco en el piso.
// Tres luces iluminan el relieve de los azulejos en vivo: el
// fluorescente, una luz roja de emergencia y una linterna que barre.
//
// BAILE (cada luz y cada cosa escucha una parte distinta):
//   bajo   -> late la luz roja de emergencia; mas brillo humedo
//   medios -> la linterna barre la pared
//   agudos -> el fluorescente zumba y parpadea
//   golpe  -> se sueltan hilos nuevos y rapidos; con Chaos: salpicaduras
// PIANO: cada tecla suelta un chorro grueso desde arriba en esa posicion
//   que baja por la pared (la fuerza: mas grueso y rapido); mientras la
//   tecla siga apretada sigue manando; al soltarla el chorro se corta y
//   cae. Un acorde suelta varios.
// Speed hace bajar los hilos aun en silencio.
// REPERTORIO (fase 31, motor hkSuceso del kit):
//   ESTADOS (~5 min): luz normal, tubo moribundo (el fluorescente a media
//     luz, manda la emergencia) y sangre que sube (mas hilos, charco grande).
//   SUCESOS (~55 s, 7): estalla una salpicadura; se corta la luz; una mano
//     se arrastra por la pared (cuatro surcos); una mano golpea la pared y
//     deja la huella, despues otra; una sombra pasa por la luz de la
//     linterna; la linterna falla y se apaga; el charco borbotea y crece.
//   DETALLES (~30 s, 5): una gota grande cae, una cucaracha cruza la pared,
//     el tubo se apaga un momento, la emergencia late fuerte, una burbuja
//     en el charco.
//   CLIMAX (~4 min, 22 s, rotan 3 guiones en tres tiempos):
//     A la cortina: mas hilos, la pared sangra entera desde arriba y el
//       charco avanza; se corta la luz y quedan la emergencia y la linterna.
//     B las manos: aparecen huellas de manos por toda la pared, de a una
//       con el bajo; se corta la luz y todas se escurren hacia abajo.
//     C la inundacion: el charco sube por la pared hasta la mitad, con olas
//       que brillan, y despues baja por el desague.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con salpicaduras.
// @EST: luz normal | tubo moribundo | sangre que sube
// @SUC: salpicadura | se corta la luz | mano que se arrastra | manos que golpean | sombra en la linterna | la linterna falla | el charco borbotea
// @DET: gota grande | cucaracha | el tubo se apaga | la emergencia late | burbuja en el charco
// @CLX: A la cortina | B las manos | C la inundacion
//
// @D1: cantidad de hilos (cada uno nuevo nace arriba y crece)
// @D2: largo de los chorreones
// @D3: grosor de los hilos
// @D4: brillo humedo
// @D5: color (rojo vivo <-> sangre negra)
// @D6: manchas y huellas en la pared
// ===============================================================

const vec4 PL_R = vec4(-3.1, -1.2, 6.2, 2.4);
const float FLOOR_Y = -0.70;
const float TILE_TOP = 0.78;
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 alb(vec3 c) { return pow(c, vec3(2.2)); }

float sgD(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
// huella de una mano (palma + cuatro dedos + pulgar), s = alto de la palma;
// sm (0..1) la escurre: los dedos se estiran hacia abajo
float handD(vec2 p, vec2 c, float s, float ang, float sm) {
    vec2 q = rot2(ang) * (p - c) / s;
    q.y += sm * 0.6 * smoothstep(0.3, -1.4, q.y);              // la sangre baja
    float d = length(max(abs(q * vec2(1.0, 1.1)) - vec2(0.32, 0.28), 0.0)) - 0.16;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float x = -0.33 + fi * 0.22;
        float l = (i == 0 ? 0.48 : (i == 3 ? 0.55 : 0.68 + fi * 0.04));
        d = min(d, sgD(q, vec2(x, 0.35), vec2(x * 1.25, 0.35 + l)) - 0.085);
    }
    d = min(d, sgD(q, vec2(0.40, 0.0), vec2(0.78, 0.36)) - 0.09);
    d += 0.05 * (noise21(q * 7.0) - 0.5);
    return d * s;
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 p = hkCam(p0);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.006);

    // --- calendario (fase 31) ---
    hkSetClimax(3.0, 22.0, 26.0);
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
    vec4 D = hkDetalle(3.0, 5, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(3.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(3.0, 3));
    float bleed = cA * max(C.y, C.z * 0.7) + EST.z * 0.25;
    float splatE = max(sv == 0 ? se * (1.0 - smoothstep(0.0, 0.4, sp)) * step(0.05, sp) : 0.0,
                       G.y * step(0.6, noise21(vec2(uRTime * 3.0, 2.0))));
    // B: al final se corta la luz y las huellas se escurren
    float handsOff = cB * smoothstep(0.66, 0.70, C.w) * (1.0 - smoothstep(0.92, 0.98, C.w));
    float powerOut = max(max(sv == 1 ? se : 0.0, cA * C.z), handsOff);
    // C: el nivel de la sangre sube por la pared y despues baja
    float flood = cC * smoothstep(0.10, 0.55, C.w) * (1.0 - smoothstep(0.75, 0.98, C.w));

    vec3 red = hsv2rgb(vec3(fract(0.995 + hue), 1.0, 0.62));
    vec3 dark = hsv2rgb(vec3(fract(0.985 + hue), 1.0, 0.22));
    vec3 bc = mix(red, dark, uD5 * 0.8);

    // --- luces ---
    float buzz = step(0.82 - high * 0.5, hash21(vec2(floor(uRTime * (10.0 + high * 25.0)), 5.0)));
    float fluo = (0.95 - buzz * (0.6 + high * 0.3)) * (1.0 - powerOut * step(0.15, hash21(vec2(floor(uRTime * 9.0), 2.0))));
    fluo *= 1.0 - EST.y * 0.55 * (0.6 + 0.4 * noise21(vec2(uRTime * 0.8, 3.0)));   // tubo moribundo
    if (dv == 2) fluo *= 1.0 - D.x * smoothstep(0.30, 0.34, D.y) * (1.0 - smoothstep(0.62, 0.66, D.y));
    vec3 fluoC = vec3(0.80, 1.0, 0.88) * fluo;
    float emerg = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uRTime * 3.0), 3.0);
    if (dv == 3) emerg *= 1.0 + D.x * 1.2;
    vec3 emergC = vec3(1.0, 0.08, 0.04) * (emerg * 0.6 + bass * 1.4) * (1.0 + powerOut * 0.8 + EST.y * 0.5);
    vec2 lc = vec2(sin(t * 0.22) * uAspect * 0.55 + mid * 0.35 * sin(t * 1.3), 0.15 + 0.15 * sin(t * 0.17) + mid * 0.1 * cos(t * 1.1));
    vec3 Pl0 = vec3(clamp(p.x, -0.55, 0.55), 1.06, 0.12);
    vec3 Pl1 = vec3(-2.55, 0.98, 0.15);

    // --- pared y piso (relieve de laminas) ---
    vec2 pu = rUV(p);
    vec3 wa = alb(plate0(pu).rgb);
    vec4 wn = plate1(pu);
    vec2 nxy = wn.rg * 2.0 - 1.0;
    vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
    float rough = wn.b;
    // manchas secas: oscurecen y enrojecen el azulejo
    float st = plate2(pu).r * (0.25 + uD6 * 0.9);
    vec3 dried = mix(vec3(0.20, 0.025, 0.02), dark * 0.6, 0.4) * (0.7 + 0.5 * plate2(pu).g);
    wa = mix(wa, dried, clamp(st, 0.0, 0.92));
    rough = mix(rough, 0.6, st);

    bool onFloor = p.y < FLOOR_Y;
    vec3 P = vec3(p, 0.0);
    // en el piso la "pared" es horizontal: normal hacia arriba, inclinada a la camara
    if (onFloor) n = normalize(vec3(nxy * 0.6, 0.0) + vec3(0.0, 0.85, 0.5));
    vec3 V = vec3(0.0, 0.0, 1.0);
    float shin = mix(80.0, 6.0, rough);
    vec3 lit = vec3(0.012, 0.012, 0.016);
    vec3 spec = vec3(0.0);
    {
        vec3 v = Pl0 - P; float dd = dot(v, v); vec3 L = v * inversesqrt(dd);
        float att = 1.0 / (1.0 + dd * 0.45);
        lit += fluoC * max(dot(n, L), 0.0) * att * 1.5;
        spec += fluoC * pow(max(dot(reflect(-L, n), V), 0.0), shin) * att * (1.0 - rough) * 1.4;
    }
    {
        vec3 v = Pl1 - P; float dd = dot(v, v); vec3 L = v * inversesqrt(dd);
        float att = 1.0 / (1.0 + dd * 1.6);
        lit += emergC * max(dot(n, L), 0.0) * att * 1.6;
        spec += emergC * pow(max(dot(reflect(-L, n), V), 0.0), shin) * att * (1.0 - rough);
    }
    // linterna: circulo de luz que barre
    vec2 sq = (p - lc) * vec2(0.85, 1.15);
    float spot = exp(-dot(sq, sq) * 2.6) * (0.7 + 0.3 * smoothstep(0.0, 0.5, length(sq)));
    // suceso: la linterna falla (tiembla a media luz, se apaga y vuelve)
    if (sv == 5) spot *= 1.0 - se * mix(0.5 * step(0.5, noise21(vec2(uRTime * 3.0, 7.0))), 0.85, smoothstep(0.45, 0.5, sp) * (1.0 - smoothstep(0.80, 0.86, sp)));
    // suceso: la sombra de alguien pasa por delante de la linterna
    if (sv == 4 && se > 0.0) {
        vec2 sc0 = lc + vec2(mix(-1.0, 1.0, ss > 0.5 ? sp : 1.0 - sp) * 0.9, -0.15);
        vec2 sq0 = p - sc0;
        vec2 tq = sq0 - vec2(0.0, -0.25);
        tq.x /= 1.0 + 0.35 * smoothstep(0.30, -0.10, tq.y);        // hombros anchos, cintura angosta
        float sil = min(length(max(abs(tq) - vec2(0.17, 0.42), 0.0)) - 0.09,
                        length((sq0 - vec2(0.0, 0.40)) / vec2(0.10, 0.125)) * 0.11 - 0.11);
        sil = hkSmin(sil, length(max(abs(sq0 - vec2(0.0, 0.27)) - vec2(0.045, 0.06), 0.0)), 0.03);
        spot *= 1.0 - se * 0.92 * smoothstep(0.03, -0.03, sil);
    }
    vec3 Lf = normalize(vec3(-0.15, 0.25, 1.0));
    lit += vec3(1.0, 0.92, 0.75) * spot * max(dot(n, Lf), 0.0) * 1.3;
    spec += vec3(1.0, 0.92, 0.75) * spot * pow(max(dot(reflect(-Lf, n), V), 0.0), shin) * (1.0 - rough) * 1.2;
    vec3 col = wa * lit + spec;
    // brillo del tubo del fluorescente
    float tube = exp(-abs(p.y - 1.06) * 90.0) * step(abs(p.x), 0.56);
    col += fluoC * tube * 1.6 + fluoC * exp(-length((p - vec2(clamp(p.x, -0.55, 0.55), 1.06)) * vec2(1.0, 2.5)) * 6.0) * 0.12;
    col += emergC * exp(-length(p - Pl1.xy) * 14.0) * 0.8;

    // --- sangre fresca: franja de arriba y chorreones ---
    float top = TILE_TOP - 0.02 - 0.04 * sin(p.x * 3.0 + 0.7) - 0.03 * noise21(vec2(p.x * 5.0, 0.0));
    // columnas FIJAS: D1 (y el aviso del climax) decide cuantas tienen
    // hilo, y el nuevo nace arriba y crece -- antes D1 cambiaba la cantidad
    // de columnas y todos los hilos saltaban de lugar
    const float cols = 40.0;
    float amount = clamp(0.20 + uD1 * 0.62 + uDensity * 0.08 + hkActVal(5.0) * 0.10 + cA * C.x * 0.45 + EST.z * 0.20, 0.0, 1.05);
    float cw = 2.0 * uAspect / cols;
    float cx = floor((p.x + uAspect) / cw);
    float d = max(top - p.y, p.y - 1.00);   // franja entre la moldura y el techo
    for (int k = -1; k <= 1; k++) {
        float id = cx + float(k);
        float h1 = hash21(vec2(id, 1.7));
        float h2 = hash21(vec2(id, 8.3));
        float present = smoothstep(0.0, 0.06, amount - hash21(vec2(id, 4.1)));
        // cuando la cortina ya cubrio la pared, los hilos sueltos sobran
        present *= 1.0 - cA * smoothstep(0.50, 0.62, C.w);
        if (present < 0.005) continue;
        float x0 = (id + 0.5) * cw - uAspect + (h2 - 0.5) * cw * 0.5;
        float speed = 0.05 + 0.10 * h2;
        float cyc = fract(t * speed + h1 * 5.0);
        float len = (0.55 + 1.3 * uD2) * (0.25 + 0.75 * h1) * smoothstep(0.0, 0.85, cyc);
        len *= (1.0 + hit * (0.15 + 0.35 * h2) * step(0.5, h1) + bleed * 0.8 + cA * C.x * 0.4) * present;
        len = min(len, top - FLOOR_Y - 0.02);
        float w = cw * (0.08 + 0.20 * uD3) * (0.6 + 0.8 * h2);
        float tipY = top - len;
        float yy = clamp((top - p.y) / max(len, 1e-3), 0.0, 1.0);
        float width = w * mix(1.7, 0.6, yy) * (0.8 + 0.4 * noise21(vec2(p.y * 9.0, id)));
        float wob = (noise21(vec2(p.y * 3.0, id * 1.7)) - 0.5) * w * 2.0;
        float strand = max(abs(p.x - x0 - wob) - width, max(p.y - top, tipY - p.y));
        float wobT = (noise21(vec2(tipY * 3.0, id * 1.7)) - 0.5) * w * 2.0;
        float drop = length((p - vec2(x0 + wobT, tipY)) / vec2(1.0, 1.35)) - w * 1.35;
        float dd = min(strand, drop);
        float fall = smoothstep(0.85, 1.0, cyc);
        float fy = tipY - fall * 0.9;
        float falling = length((p - vec2(x0, fy)) / vec2(1.0, 1.4)) - w * 1.2 * step(0.86, cyc) * step(FLOOR_Y, fy);
        dd = min(dd, falling);
        d = min(d, dd);
    }
    // --- PIANO: chorros gruesos que bajan por la pared ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.02, 3.0);
        if (e < 0.005) continue;
        float vel = keyVel(k), age = keyAge(k), rel = keyRelAge(k);
        float x0 = hkKeyX(k) * 0.95;
        float w = 0.018 + vel * 0.022;
        float len = min(age * (0.45 + vel * 0.75), top - FLOOR_Y - 0.02);
        // al soltarla el chorro se corta arriba y cae
        float top2 = top - rel * rel * 1.8;
        float tipY = top - len - rel * rel * 1.8;
        float yy = clamp((top2 - p.y) / max(top2 - tipY, 1e-3), 0.0, 1.0);
        float wob = (noise21(vec2(p.y * 3.0, float(k) * 5.3 + keyPos(k) * 9.0)) - 0.5) * w * 1.6;
        float width = w * mix(1.5, 0.9, yy) * (0.85 + 0.3 * noise21(vec2(p.y * 7.0 - uKclock * 2.0, float(k))));
        float strand = max(abs(p.x - x0 - wob) - width, max(p.y - top2, tipY - p.y));
        float drop = length((p - vec2(x0, tipY)) / vec2(1.0, 1.3)) - w * 1.5;
        d = min(d, min(strand, drop) + (1.0 - e) * 0.02);
    }
    // --- CLIMAX: la pared sangra entera, como una cortina desde arriba ---
    if (cA > 0.0 && (C.y > 0.0 || C.z > 0.0)) {
        float down = smoothstep(0.33, 0.68, C.w);                  // cuanto bajo la cortina
        float edgeY = top - down * (top - FLOOR_Y + 0.05)
                    - 0.10 * noise21(vec2(p.x * 6.0, 3.0)) - 0.05 * sin(p.x * 17.0) * noise21(vec2(p.x * 2.0, 5.0));
        // dedos que se adelantan a la cortina
        // (ruido suave: con cortes bruscos el brillo humedo se rompe en rayas)
        float finger = 0.16 * pow(noise21(vec2(p.x * 9.0, 9.0)), 2.0) + 0.05 * noise21(vec2(p.x * 31.0, 4.0));
        float sheet = max(edgeY - finger * down - p.y, p.y - 1.0);
        // union suave: con min() el brillo salta donde se cruzan hilos y cortina
        d = hkSmin(d, sheet + (1.0 - max(C.y, C.z)) * 0.05, 0.06);
    }
    // EASTER EGG "JAY INFINITO" (fase 38): alguien escribe JAY con sangre
    // en la pared, de izquierda a derecha, y despues las letras chorrean
    vec2 EG = hkEgg(5.0);
    if (EG.x > 0.0) {
        vec2 jc = vec2(-0.62, 0.24);
        float jh = 0.36;
        vec2 jq = (p - jc) / jh;
        if (abs(jq.x) < 2.0 && jq.y > -4.0 && jq.y < 1.0) {
            float reveal = smoothstep(0.0, 0.45, EG.y) * 2.6 - 1.3;          // de izquierda a derecha
            float tx = hkText(jq, int[16](74, 65, 89, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 3) * jh;
            float jd = tx - 0.028 + max(jq.x - reveal, 0.0) * 0.5;
            // chorreado: un hilo bajo cada letra que crece despues de escrita
            for (int i = 0; i < 4; i++) {
                float fx = (float(i) - 1.5) * 0.62 + 0.12 * sin(float(i) * 7.0);
                float run = smoothstep(0.35, 1.0, EG.y) * (0.25 + 0.20 * fract(float(i) * 0.37));
                float y0 = jc.y - 0.12, y1 = y0 - run;
                float st = max(abs(p.x - jc.x - fx * jh) - 0.010 * (1.0 + 0.4 * sin(p.y * 30.0)), max(p.y - y0, y1 - p.y));
                st = min(st, length((p - vec2(jc.x + fx * jh, y1)) / vec2(1.0, 1.3)) - 0.017);
                jd = min(jd, st + (run < 0.01 ? 1.0 : 0.0));
            }
            d = min(d, jd + (1.0 - EG.x) * 0.03);
        }
    }
    // suceso: una mano se arrastra por la pared (cuatro surcos que bajan)
    if (sv == 2 && se > 0.0) {
        float hx = (ss - 0.5) * 3.0, y0 = 0.55, y1 = y0 - smoothstep(0.1, 0.7, sp) * 0.95;
        for (int i = 0; i < 4; i++) {
            float fi = float(i);
            float x = hx + (fi - 1.5) * 0.065 + 0.04 * sin((y0 - p.y) * 3.0 + fi);
            float w = 0.020 * (1.0 - 0.5 * clamp((y0 - p.y) / 0.95, 0.0, 1.0)) + 0.004 * noise21(vec2(p.y * 20.0, fi));
            float sd = max(abs(p.x - x) - w, max(p.y - y0 - fi * 0.01 * (fi - 1.5), y1 - p.y));
            d = min(d, sd + (1.0 - se) * 0.02);
        }
    }
    // suceso: una mano golpea la pared, y despues otra; B: huellas por toda la pared
    if (sv == 3 && se > 0.0) {
        for (int i = 0; i < 2; i++) {
            float fi = float(i);
            float on = smoothstep(0.15 + fi * 0.30, 0.17 + fi * 0.30, sp);
            vec2 hc = vec2((ss - 0.5) * 2.6 + fi * 0.55, 0.20 + fi * 0.12);
            if (on > 0.0 && length(p - hc) < 0.45) d = min(d, handD(p, hc, 0.15, 0.25 - fi * 0.5, smoothstep(0.6, 1.0, sp)) + (1.0 - se) * 0.02);
        }
    }
    if (cB > 0.0) {
        float smear = smoothstep(0.68, 0.95, C.w);
        for (int i = 0; i < 14; i++) {
            float fi = float(i);
            vec2 hh = hash22(vec2(fi, 77.0));
            vec2 hc = vec2((hh.x - 0.5) * uAspect * 1.75, mix(-0.45, 0.55, hh.y));
            float on = smoothstep(0.05 + fi * 0.032, 0.06 + fi * 0.032, C.w) * (1.0 - smoothstep(0.93, 0.99, C.w));
            if (on > 0.0 && length(p - hc) < 0.38 + smear * 0.5) d = min(d, handD(p, hc, 0.09 + 0.05 * hh.y, (hh.x - 0.5) * 0.9, smear * (0.6 + hh.y)));
        }
    }
    // C: el nivel sube por la pared, con olas
    if (flood > 0.0) {
        float lvl = FLOOR_Y + flood * 0.95 + 0.025 * sin(p.x * 5.0 - uRTime * 1.8) + 0.012 * sin(p.x * 13.0 + uRTime * 2.7) + bass * 0.01;
        d = hkSmin(d, p.y - lvl, 0.04);
    }
    // detalle: una gota grande cae por delante
    if (dv == 0) {
        vec2 gq = (p - vec2((D.w - 0.5) * 3.2, mix(1.0, FLOOR_Y, D.y * D.y))) / vec2(1.0, 1.5);
        d = min(d, length(gq) - 0.022 * D.x);
    }
    float mask = (1.0 - smoothstep(-0.0025, 0.0025, d)) * step(FLOOR_Y, p.y);
    // el relieve de la sangre vive en el borde: mas adentro es plana (si no,
    // la forma ondulada del borde de la cortina se ve como rayas de brillo)
    float dn = max(d, -0.03);
    // adentro de la cortina: ondas suaves que bajan (sangre que corre)
    dn += 0.010 * noise21(vec2(p.x * 4.0, p.y * 1.5 + t * 0.35)) * smoothstep(-0.02, -0.08, d);
    vec2 gd = vec2(dFdx(dn), dFdy(dn));
    vec3 bn = normalize(vec3(-gd * 60.0, 1.0));
    float bd1 = max(dot(bn, normalize(Pl0 - P)), 0.0), bd2 = max(dot(bn, normalize(Pl1 - P)), 0.0);
    float bs0 = pow(max(dot(reflect(-normalize(Pl0 - P), bn), V), 0.0), 40.0);
    float bs1 = pow(max(dot(reflect(-normalize(Pl1 - P), bn), V), 0.0), 40.0);
    float bsf = pow(max(dot(reflect(-Lf, bn), V), 0.0), 40.0) * spot;
    float depthShade = smoothstep(0.05, -0.02, d);
    vec3 bcol = bc * (0.12 + 0.45 * (bd1 * fluo + bd2 * emerg * 0.5) + spot * 0.55) * mix(1.0, 0.55, depthShade);
    bcol += (fluoC * bs0 + emergC * bs1 + vec3(1.0, 0.9, 0.8) * bsf) * (0.25 + uD4 * 0.9 + bass * 0.6);
    col = mix(col, bcol, mask);
    // la sangre fresca deja un tinte en el azulejo de abajo
    col += red * 0.03 * exp(-max(d, 0.0) * 20.0) * (1.0 - mask) * step(FLOOR_Y, p.y);

    // --- charco en el piso con reflejos ---
    if (onFloor) {
        float depth = FLOOR_Y - p.y;
        float z = 1.0 / (depth + 0.12);
        vec2 pc2 = vec2(p.x * z * 0.45, depth * 3.0);
        float edge = plate3Wrap(vec2(pc2.x * 0.08, pc2.y * 0.12)).a;
        float boil = sv == 6 ? se * smoothstep(0.0, 0.7, sp) : 0.0;
        float r = length(vec2(p.x * 0.30, depth * 2.2 - 0.45)) - (0.25 + bleed * 0.55 + uD2 * 0.12 + boil * 0.35 + flood * 2.0) - (edge - 0.5) * 0.12;
        float pool = smoothstep(0.01, -0.01, r);
        vec3 pref = fluoC * exp(-pow(p.x * 2.2, 2.0) - pow((depth - 0.10) * 14.0, 2.0)) * 0.35
                  + emergC * exp(-pow((p.x + 2.2) * 1.6, 2.0) - pow((depth - 0.08) * 12.0, 2.0)) * 0.35
                  + vec3(1.0, 0.9, 0.8) * exp(-pow((p.x - lc.x) * 2.0, 2.0) - pow((depth - 0.12) * 12.0, 2.0)) * 0.2;
        vec3 poolC = dark * 0.12 + bc * 0.10 + bc * 0.08 * (lit.r + 0.1) + pref * bc * 1.6 * (0.4 + uD4 * 0.6) + pref * 0.15;
        // gotas que caen al charco: anillos
        float rings = 0.0;
        vec2 rg = vec2(p.x * z * 1.2, z * 1.0);
        vec2 rid = floor(rg);
        float rt = fract(uRTime * 0.7 + hash21(rid) * 5.0);
        rings = exp(-pow((length((fract(rg) - 0.5) * vec2(1.0, 2.0)) - rt * 0.45) * 28.0, 2.0)) * (1.0 - rt) * step(0.6, hash21(rid + 2.0));
        poolC += (fluoC * 0.3 + vec3(0.1)) * rings * (0.4 + hit);
        // borbotones (suceso) y una burbuja (detalle)
        if (boil > 0.0 || dv == 4) {
            vec2 bg = vec2(p.x * z * 2.0, z * 1.6);
            vec2 bid = floor(bg);
            float bt = fract(uRTime * 1.3 + hash21(bid + 9.0) * 7.0);
            float bm = step(dv == 4 ? 0.97 : 0.55, hash21(bid + 4.0)) * (dv == 4 ? D.x : boil);
            float bub = length((fract(bg) - 0.5) * vec2(1.0, 1.6)) - 0.18 * sin(bt * PI);
            poolC += (bc * 0.5 + fluoC * 0.25 + vec3(0.12)) * (1.0 - smoothstep(-0.02, 0.03, abs(bub) - 0.02)) * bm;
        }
        col = mix(col, poolC, pool);
    }

    // --- LOCURA: salpicaduras frescas con el golpe ---
    float splatOn = max(hit * smoothstep(0.3, 0.9, loco), splatE);
    if (splatOn > 0.01 && !onFloor) {
        float sl = floor(uRTime * 2.0);
        for (int i = 0; i < 3; i++) {
            float fi = float(i);
            vec2 sc = (hash22(vec2(sl, fi)) - 0.5) * vec2(uAspect * 1.6, 1.0);
            vec2 sq2 = p - sc;
            float ang = atan(sq2.y, sq2.x);
            float spikes = 0.07 + 0.09 * pow(noise21(vec2(ang * 4.0, sl + fi)), 2.0) + 0.12 * pow(noise21(vec2(ang * 17.0, sl + fi + 3.0)), 6.0);
            float sd = length(sq2) - spikes * (0.4 + splatOn * 0.8);
            vec2 dg = sq2 * 22.0;
            vec2 did = floor(dg);
            vec2 df = fract(dg) - 0.5 - (hash22(did + sl) - 0.5) * 0.6;
            float dr = 0.10 + 0.25 * hash21(did + fi);
            float drops = (1.0 - smoothstep(dr - 0.05, dr, length(df))) * step(0.80, hash21(did + sl * 3.0))
                        * smoothstep(0.40 * splatOn + 0.05, 0.10, length(sq2));
            float m = max(1.0 - smoothstep(-0.004, 0.004, sd), drops);
            col = mix(col, bc * (0.18 + 0.45 * spot + 0.30 * fluo), m * splatOn);
        }
    }

    // detalle: una cucaracha cruza la pared
    if (dv == 1 && !onFloor) {
        vec2 rc = vec2(mix(-uAspect - 0.1, uAspect + 0.1, ss > 0.5 ? D.y : 1.0 - D.y), (D.w - 0.5) * 1.1 + 0.05 * sin(D.y * 30.0));
        vec2 rq = (p - rc) / 1.6;
        float body = length(rq / vec2(0.032, 0.016)) - 1.0;
        float legs = 1e3;
        for (int i = -1; i <= 1; i++) {
            for (int sd = -1; sd <= 1; sd += 2) {
                float lx = float(i) * 0.013;
                float wig = 0.006 * sin(uRTime * 30.0 + float(i * sd) * 2.0);
                legs = min(legs, sgD(rq, vec2(lx, 0.0), vec2(lx + wig - 0.006, float(sd) * 0.027)));
            }
        }
        float ant = min(sgD(rq, vec2(0.030, 0.004), vec2(0.060, 0.022)), sgD(rq, vec2(0.030, -0.004), vec2(0.060, -0.022)));
        float rm = max(1.0 - smoothstep(0.0, 0.08, body), 1.0 - smoothstep(0.0013, 0.0028, min(legs, ant)));
        col = mix(col, vec3(0.03, 0.015, 0.005) + spec * 0.3, rm * D.x);
    }

    col = audioLift(col, high * 0.06);
    // LUZ DE TECLA (fase 37): columna roja donde cae la sangre
    col = hkKeyLit(col, p, 0.1, vec2(0.18, 0.9), vec3(1.0, 0.12, 0.08), vec3(1.0, 0.35, 0.15), 0.02, 1.5);
    return vec4(hkFinish(col, uv, vec3(0.6, 0.05, 0.05)), 1.0);
}
