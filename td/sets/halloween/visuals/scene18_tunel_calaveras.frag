// ===============================================================
// HALLOWEEN 18 - TUNEL DE CALAVERAS
// Una catacumba de verdad: pasillo con boveda de cañon cuyas paredes
// son hileras de calaveras apiladas con filas de puntas de femur entre
// ellas (LAMINAS que se repiten sin costura, plates/scene18, ver
// td/tools/bake_plates_catacumba.py), piso de losas con huesos sueltos,
// antorchas a los costados y una luz al fondo. Se avanza por el tunel.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la luz del fondo late y las antorchas crecen
//   medios -> el tunel gira despacio
//   agudos -> titilan los ojos encendidos
//   golpe  -> un anillo de luz viaja por las paredes hacia la camara
//             (D3); con Chaos el tunel se retuerce
// PIANO: cada tecla enciende un anillo de ojos en las paredes, a una
//   profundidad segun la nota (graves cerca, agudos al fondo); la fuerza lo
//   hace mas brillante; apretada sigue encendido.
// Speed (y D2) avanzan por el tunel aun en silencio.
// Cada acto el tunel gira para otro lado.
// REPERTORIO (fase 34, motor hkSuceso del kit, version liviana):
//   ESTADOS (~5 min): antorchas, oscuridad verde (luz verde, antorchas
//     bajas) y niebla espesa.
//   SUCESOS (~55 s, 5): una ola de ojos viene hacia la camara; una figura
//     parada al fondo, contra la luz; las antorchas se apagan de a una y
//     vuelven; cae una calavera del techo; el tunel frena y retrocede.
//   DETALLES (~30 s, 4): un ojo guina, cae polvo, una antorcha
//     chisporrotea, pasan ratas por el piso.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A el aceleron: las antorchas pasan cada vez mas rapido, ola de ojos,
//       frenada con sacudida y polvo.
//     B la calavera del fondo: la luz del fondo se vuelve una calavera
//       gigante con los ojos encendidos que se acerca; despues se aleja.
//     C el fuego: corren llamas por los costados del piso hacia la camara
//       y las paredes se tinen de rojo.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A mas largo.
// @EST: antorchas | oscuridad verde | niebla espesa
// @SUC: ola de ojos | figura al fondo | se apagan las antorchas | cae una calavera | retrocede
// @DET: guina | polvo | chisporrotea | ratas
// @CLX: A el aceleron | B la calavera del fondo | C el fuego
//
// @D1: calaveras por vuelta (tamano de las hileras)
// @D2: velocidad de avance (encima de Speed)
// @D3: anillo de luz con el golpe
// @D4: ojos encendidos
// @D5: color de la luz (antorcha <-> verde)
// @D6: niebla del tunel
// ===============================================================

const float FLOOR_Y = -0.75;
const float ARCH_Y = 0.15;
const float HALF_W = 1.0;

vec4 t18Tex(int which, vec2 uv, float lod) {
    // laminas que se repiten: muestreo con nivel de mip calculado a mano
    // (con fract la derivada salta y el mip automatico dejaria una linea)
    if (which == 0) return plate0WrapLod(uv, lod);
    if (which == 1) return plate1WrapLod(uv, lod);
    if (which == 2) return plate2WrapLod(uv, lod);
    return plate3WrapLod(uv, lod);
}
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }
// profundidad de la antorcha kk (para apagarlas en orden)
float lp_z_hack(float kk, float travel) { return kk * 3.0 + 1.5 - travel; }

vec4 render(vec2 uv) {
    // --- calendario (fase 34) ---
    hkSetClimax(4.0, 18.0, 22.0);
    vec4 G = hkGrandV();
    vec4 CC = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (CC.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (CC.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (CC.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(4.0, 5, 9.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(4.0, 4, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(4.0, 3);
    hkTimeline(S, D, CC, cv, grand, hkEstadoIdx(4.0, 3));
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    // sacudida y golpe de zoom de la frenada del climax (se aplica a la
    // camara, antes de todo lo demas)
    {
        float cw0 = cA * CC.w;
        float br = cw0 > 0.70 ? exp(-(cw0 - 0.70) * 40.0) : 0.0;
        p += (vec2(noise21(vec2(uRTime * 40.0, 1.0)), noise21(vec2(uRTime * 40.0, 4.0))) - 0.5) * 0.08 * br;
        p *= 1.0 - 0.06 * br;
    }
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    vec3 lightC = mix(vec3(1.0, 0.55, 0.22), vec3(0.35, 1.0, 0.45), mix(uD5, 1.0, EST.y * 0.8 * 0.6));
    float cph = cA * CC.w;
    float skullK = cB * smoothstep(0.05, 0.45, CC.w) * (1.0 - smoothstep(0.75, 0.95, CC.w));
    float fireK = cC * smoothstep(0.05, 0.35, CC.w) * (1.0 - smoothstep(0.78, 0.95, CC.w));
    // aceleron: avance extra que crece con el cuadrado de la fase y se
    // congela de golpe en 0.70 (frenada). Al terminar el climax ese avance
    // vuelve a 0: lo tapa un parpadeo de las antorchas (blink).
    float rush = cph > 0.0 ? 22.0 * min(cph, 0.70) * min(cph, 0.70) : 0.0;
    // suceso: el tunel frena y retrocede un poco
    float back = sv == 4 ? se * sin(sp * PI) : 0.0;
    float travel = t * (0.6 + uD2 * 1.6) + rush - back * 2.5 * smoothstep(0.0, 1.0, sp);
    float brake = cph > 0.70 ? exp(-(cph - 0.70) * 40.0) : 0.0;
    float blink = smoothstep(0.93, 0.97, cph) * (1.0 - smoothstep(0.985, 1.0, cph));
    // ola de ojos hacia la camara en el pico
    float eyeWaveZ = mix(24.0, 0.5, clamp((cph - 0.35) / 0.33, 0.0, 1.0));
    float eyeWaveA = step(0.35, cph) * (1.0 - smoothstep(0.80, 0.92, cph));
    if (sv == 0) { eyeWaveZ = mix(20.0, 0.5, sp); eyeWaveA = max(eyeWaveA, se * 0.7); }
    float eyesAll = 0.0;
    float tile = hkDR(2.0, 0.925, 0.40, uD1);

    // rayo de la camara (con giro lento; la locura retuerce el tunel)
    float roll = (hkActVal(5.0) > 0.5 ? 1.0 : -1.0) * (0.06 * sin(t * 0.13) + mid * 0.05);
    vec3 d = normalize(vec3(p * 0.62, 1.0));
    float twist = hit * loco * 0.5 * sin(uRTime * 3.0);
    float ca = cos(roll), sa = sin(roll);
    d.xy = mat2(ca, sa, -sa, ca) * d.xy;

    // paredes, boveda o piso
    float tw = HALF_W / max(abs(d.x), 1e-4);
    float yw = d.y * tw;
    int surf;
    float th;
    vec2 tuv;
    vec3 N, T, B;
    if (yw >= FLOOR_Y && yw <= ARCH_Y) {
        surf = 0; th = tw;
        float z = th * d.z + travel;
        tuv = vec2(z, yw - FLOOR_Y) / tile;
        // T y B = hacia donde crecen u y v de la lamina (mismo marco en las dos paredes y la boveda)
        N = vec3(-sign(d.x), 0.0, 0.0); T = vec3(0.0, 0.0, 1.0); B = vec3(0.0, 1.0, 0.0);
    } else if (yw > ARCH_Y) {
        surf = 1;
        float a = dot(d.xy, d.xy), b = -2.0 * ARCH_Y * d.y, c = ARCH_Y * ARCH_Y - HALF_W * HALF_W;
        th = (-b + sqrt(max(b * b - 4.0 * a * c, 0.0))) / (2.0 * a);
        vec3 hp = d * th;
        float ang = atan(hp.x, hp.y - ARCH_Y);                     // 0 arriba
        float z = th * d.z + travel;
        tuv = vec2(z, (ARCH_Y - FLOOR_Y) + (1.5708 - abs(ang)) * HALF_W) / tile;
        N = -normalize(vec3(hp.x, hp.y - ARCH_Y, 0.0)); T = vec3(0.0, 0.0, 1.0);
        B = sign(hp.x) * normalize(vec3(ARCH_Y - hp.y, hp.x, 0.0));     // v sube hacia la clave
    } else {
        surf = 2;
        th = FLOOR_Y / min(d.y, -1e-4);
        vec3 hp = d * th;
        tuv = vec2(hp.x, hp.z + travel) / (tile * 1.4);
        N = vec3(0.0, 1.0, 0.0); T = vec3(1.0, 0.0, 0.0); B = vec3(0.0, 0.0, 1.0);
    }
    tuv.y += twist * 0.2 * sin(th * 0.8);
    float graz = max(abs(dot(d, N)), 0.12);
    float lod = log2(max(th * 1.24 / uResH / graz / tile * 768.0, 1.0));
    vec3 hp = d * th;

    vec4 ac = t18Tex(surf == 2 ? 2 : 0, tuv, lod);
    vec4 an = t18Tex(surf == 2 ? 3 : 1, tuv, lod);
    vec3 alb = plateCol(ac.rgb);
    vec2 nxy = an.rg * 2.0 - 1.0;
    vec3 n = normalize(T * nxy.x + B * nxy.y + N * sqrt(max(1.0 - dot(nxy, nxy), 0.05)));

    // luz: antorchas a los costados (las 3 mas cercanas), fondo y anillo
    vec3 L = vec3(0.008, 0.007, 0.006);
    float zw = hp.z + travel;
    float k0 = floor(zw / 3.0);
    for (int k = -1; k <= 1; k++) {
        float kk = k0 + float(k);
        float side = mod(kk, 2.0) < 1.0 ? -1.0 : 1.0;
        vec3 lp = vec3(side * 0.88, -0.05, kk * 3.0 + 1.5 - travel);
        vec3 lv = lp - hp;
        float d2 = dot(lv, lv);
        float fl = (0.8 + 0.2 * noise21(vec2(t * 8.0, kk))) * (1.0 - EST.y * 0.6);
        // suceso: se apagan de a una (de lejos hacia la camara) y vuelven
        if (sv == 2) fl *= 1.0 - se * smoothstep(0.1, 0.15, sp + lp_z_hack(kk, travel) * 0.02) * (1.0 - smoothstep(0.7, 0.8, sp));
        if (dv == 2 && mod(kk, 3.0) < 0.5) fl *= 1.0 + D.x * 0.7 * (noise21(vec2(t * 15.0, kk)) - 0.3);
        fl *= 1.0 + fireK * 0.8;
        L += vec3(1.0, 0.55, 0.22) * fl * (0.8 + bass * 0.5) * max(dot(n, normalize(lv)), 0.0) * 0.55 / (0.12 + d2);
    }
    // luz del fondo: llega por el pasillo
    L += lightC * (0.25 + bass * 0.5) * max(dot(n, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5, 0.0) * exp(-max(30.0 - th, 0.0) * 0.09) * 0.3;
    // anillo del golpe que viaja hacia la camara
    float ringZ = mix(18.0, 0.5, fract(uRTime * 0.8));
    L += lightC * exp(-pow((th * d.z - ringZ) * 1.2, 2.0)) * hit * hkDR(0.0, 1.4, 2.8, uD3);
    // C: las paredes se tinen con el fuego
    L += vec3(1.0, 0.3, 0.06) * fireK * (0.25 + 0.15 * noise21(vec2(hp.z * 2.0 - uRTime * 4.0, 2.0))) * exp(-abs(hp.y - FLOOR_Y) * 1.5) * exp(-th * 0.08);
    vec3 col = alb * L * 3.0;

    // ojos que se encienden
    if (surf < 2) {
        vec2 cell = floor(tuv * vec2(6.0, 4.0));
        float th4 = hkDR(1.05, 0.705, 0.3, uD4);
        float on = smoothstep(th4 - 0.02, th4 + 0.02, hash21(cell + 7.0));
        // climax: la ola de ojos viene hacia la camara
        float zc = th * d.z;
        float waveK = eyeWaveA * (exp(-pow((zc - eyeWaveZ) * 0.7, 2.0)) * 2.0 + step(zc, eyeWaveZ) * smoothstep(0.35, 0.68, cph) * 0.6);
        float keyRing = 0.0;
        // piano: anillos de ojos a la profundidad de la nota
        for (int k = 0; k < N_KEYS; k++) {
            float e = keyEnv(k, 0.04, 0.8);
            if (e < 0.01) continue;
            float zk = 1.2 + keyPos(k) * 12.0;
            keyRing = max(keyRing, e * (0.6 + keyVel(k)) * exp(-pow((zc - zk) * 0.8, 2.0)));
        }
        // la ola del climax: blanco caliente; el piano: rojo, sobre los ojos de siempre
        col += vec3(1.0, 0.92, 0.75) * an.b * waveK * 0.9 * exp(-th * 0.06);
        col += vec3(1.0, 0.12, 0.05) * (an.b * 3.0 + 0.18) * keyRing * exp(-th * 0.05);
        float wink = dv == 0 && abs(hash21(cell + 7.0) - D.w) < 0.06 ? 1.0 - D.x * step(0.4, D.y) * (1.0 - step(0.6, D.y)) : 1.0;
        col += lightC * an.b * on * wink * (0.35 + bass * 0.6 + high * 0.4 * sin(t * 20.0 + cell.x)) * exp(-th * 0.10);
        // EASTER EGG "JAY INFINITO" (fase 38): las calaveras de la pared de la
        // izquierda que caen dentro de JAY se encienden en rojo (ojos y
        // hueso), y en la de la derecha las de un infinito
        vec2 EG = hkEgg(18.0);
        if (EG.x > 0.0) {
            float dt = min(hkText((p - vec2(-1.70, 0.30)) / (0.62 * hkEggS), int[16](74, 65, 89, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 3),
                           hkInfD((p - vec2(1.70, 0.30)) / (0.62 * hkEggS), 0.80));   // fase 39: mas chicos
            float inside = (1.0 - smoothstep(0.09, 0.14, dt)) * EG.x;
            col = mix(col, vec3(1.0, 0.10, 0.04) * (0.10 + alb * 5.0 + an.b * 3.0) * (0.8 + bass * 0.4), inside * 0.85);
        }
    }
    // antorchas visibles (llama y soporte)
    for (int k = -1; k <= 2; k++) {
        float kk = k0 + float(k);
        float side = mod(kk, 2.0) < 1.0 ? -1.0 : 1.0;
        vec3 lp = vec3(side * 0.88, -0.05, kk * 3.0 + 1.5 - travel);
        if (lp.z < 0.2) continue;
        vec2 spx = lp.xy / lp.z / 0.62;
        vec2 sq = p - mat2(ca, -sa, sa, ca) * spx;
        float sz = 0.10 / lp.z;
        vec2 fq = sq / sz;
        fq.x += (noise21(vec2(fq.y * 1.5 - t * 6.0, kk)) - 0.5) * 0.5 * max(fq.y + 0.3, 0.0);
        float fl = 1.0 - smoothstep(0.4, 1.0, length(fq * vec2(1.0, 0.55)) + max(fq.y, 0.0) * 0.25);
        float tOn = (1.0 - EST.y * 0.5) * (sv == 2 ? 1.0 - se * smoothstep(0.1, 0.15, sp + lp.z * 0.02) * (1.0 - smoothstep(0.7, 0.8, sp)) : 1.0);
        col += mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.9, 0.6), fl) * fl * 1.5 * step(lp.z, th + 0.3) * tOn;
        col += vec3(1.0, 0.5, 0.18) * exp(-length(sq) / (sz * 2.5)) * 0.25 * tOn;
    }
    // C: llamas que corren por los costados del piso hacia la camara
    if (fireK > 0.0 && surf == 2) {
        float side = abs(hp.x) - 0.82;
        float fz = hp.z + travel;
        float fn = noise21(vec2(fz * 3.0 - uRTime * 6.0, sign(hp.x) * 3.0));
        float run = smoothstep(0.0, 1.0, (24.0 * (1.0 - smoothstep(0.05, 0.6, CC.w)) - hp.z) * 0.3);
        float flame = smoothstep(0.18, 0.0, abs(side)) * (0.5 + fn) * fireK * (1.0 - run * 0.0);
        col += mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.8, 0.35), fn) * flame * 1.2 * exp(-th * 0.05);
    }
    // suceso: cae una calavera del techo
    if (sv == 3 && se > 0.0) {
        float zf = mix(6.0, 2.5, sp);
        vec3 kp = vec3((ss - 0.5) * 0.8, mix(0.9, FLOOR_Y + 0.1, min(sp * 1.6, 1.0)), zf);
        vec2 kq2 = (p - kp.xy / kp.z / 0.62) / (0.13 / kp.z / 0.62);
        float sk2 = length(kq2 / vec2(0.85, 1.0)) - 1.0;
        vec2 eq2 = vec2(abs(kq2.x) - 0.35, kq2.y + 0.05);
        float lit2 = 0.4 + 0.6 * smoothstep(0.5, -1.0, kq2.y);
        col = mix(col, vec3(0.45, 0.40, 0.30) * lit2 * (0.15 + bass * 0.1), (1.0 - smoothstep(-0.06, 0.06, sk2)) * se);
        col = mix(col, vec3(0.0), (1.0 - smoothstep(0.2, 0.3, length(eq2))) * (1.0 - step(0.0, sk2)) * se);
    }
    // detalle: ratas por el piso
    if (dv == 3 && surf == 2) {
        float rz = hp.z + travel;
        vec2 rq = vec2((abs(hp.x) - 0.6) / 0.06, fract(rz * 0.7 - D.y * 6.0) - 0.5);
        float rat = length(rq * vec2(1.0, 6.0)) - 0.8;
        col = mix(col, vec3(0.02, 0.015, 0.01), (1.0 - smoothstep(-0.2, 0.2, rat)) * D.x * step(0.5, hash21(vec2(floor(rz * 0.7 - D.y * 6.0), 3.0))));
    }
    // niebla y resplandor del fondo
    float fog = 1.0 - exp(-th * (hkDR(0.0, 0.13, 0.45, uD6) + EST.z * 0.18));
    col = mix(col, lightC * (0.10 + bass * 0.15), fog);
    col += lightC * exp(-length(p) * (5.0 - bass * 2.0)) * (0.5 + bass);
    // B: la calavera gigante del fondo (despues del resplandor: es silueta contra la luz)
    if (skullK > 0.0) {
        float near = smoothstep(0.1, 0.6, skullK);
        vec2 kq = p / (0.18 + near * 0.55);
        float head = length(kq / vec2(0.85, 1.0)) - 1.0;
        float jaw = length(max(abs(kq - vec2(0.0, -0.75)) - vec2(0.42, 0.25), 0.0)) - 0.08;
        float sk = min(head, jaw);
        vec2 eq = vec2(abs(kq.x) - 0.38, kq.y + 0.05);
        float eye = length(eq / vec2(0.26, 0.30)) - 1.0;
        float nose = max(abs(kq.x) * 1.5 + (kq.y + 0.42) * 0.8 - 0.12, -(kq.y + 0.55));
        float m = (1.0 - smoothstep(-0.04, 0.04, sk)) * skullK;
        col = mix(col, vec3(0.012, 0.010, 0.008), m * 0.95);
        col += lightC * (1.0 - smoothstep(0.0, 0.10, abs(sk))) * 0.6 * skullK;
        float hole = max(1.0 - smoothstep(-0.05, 0.05, eye), 1.0 - smoothstep(-0.03, 0.03, nose));
        col = mix(col, vec3(0.0), hole * m);
        col += vec3(1.0, 0.15, 0.05) * exp(-dot(eq, eq) * 90.0) * skullK * (1.5 + bass);
    }
    // suceso: una figura parada al fondo, contra la luz
    if (sv == 1 && se > 0.0) {
        vec2 fq = (p - vec2(0.0, -0.04)) / 0.16;
        float fig = min(length(fq - vec2(0.0, 0.55)) - 0.17, length(max(abs(fq - vec2(0.0, -0.05)) - vec2(0.16 - fq.y * 0.05, 0.45), 0.0)) - 0.06);
        col = mix(col, vec3(0.005), (1.0 - smoothstep(-0.04, 0.04, fig)) * se);
    }
    // polvo de la frenada y parpadeo final
    col += vec3(0.55, 0.45, 0.35) * (brake * 0.25 + (dv == 1 ? D.x * 0.12 : 0.0)) * hkParticles(p * 2.0, uRTime, 0.3, vec2(0.0, -0.3), 0.05);
    col *= 1.0 - blink * 0.92;

    return vec4(hkFinish(col, uv, vec3(0.6, 0.35, 0.1)), 1.0);
}
