// ===============================================================
// HALLOWEEN 19 - GLITCH DEMONIACO
// Una transmision maldita: el rostro de un demonio de frente (LAMINA
// horneada con relieve, plates/scene19, ver td/tools/bake_plates_demonio.py:
// cuernos con anillos, ceja fruncida, cuencas hondas, colmillos, venas)
// iluminado en vivo desde abajo por fuego, que respira y se rompe en
// bloques de glitch, con los canales de color separados, lineas de
// barrido y estatica. Alrededor, humo rojo y brasas.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> arden los ojos y el fuego de abajo crece
//   medios -> el rostro respira y la imagen ondula
//   agudos -> estatica y chispas
//   golpe  -> se rompe en bloques que se van cada uno para su lado (D2)
//             y se desdobla; con Chaos se invierte y aparecen copias
// PIANO: cada tecla hace arder los ojos y corta la senal con una franja
//   de glitch a la altura de la nota (la fuerza: mas ancha y corrida);
//   apretada, la franja repta y los ojos siguen ardiendo.
// Speed hace respirar el rostro y mover el ruido aun en silencio.
// Cada acto cambia la textura de la senal.
// REPERTORIO (fase 34, motor hkSuceso del kit, version liviana):
//   ESTADOS (~5 min): senal estable, interferencia (mas estatica y
//     rasgado) y fuego alto (el fuego de abajo y las brasas crecen).
//   SUCESOS (~55 s, 5): el rostro se derrite; llora fuego; se corta la
//     senal (barras de color con el rostro detras); el rostro se acerca a
//     la camara; mosaico de rostros.
//   DETALLES (~30 s, 4): parpadea, chispas, una linea de tracking, la
//     imagen en espejo.
//   CLIMAX (~4 min, 20 s, rotan 3 guiones en tres tiempos):
//     A la posesion: interferencia, se derrite, se rompe en bloques con
//       copias fantasma y vuelve limpio con los ojos ardiendo.
//     B el tercer ojo: se abre un ojo en la frente que echa rayos y mira
//       a los lados; despues se cierra.
//     C partido al medio: la cara se abre en dos mitades y detras hay
//       fuego; despues se vuelve a cerrar.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con la imagen
//     invertida.
// @EST: senal estable | interferencia | fuego alto
// @SUC: se derrite | llora fuego | sin senal | se acerca | mosaico
// @DET: parpadea | chispas | linea de tracking | espejo
// @CLX: A la posesion | B el tercer ojo | C partido al medio
//
// @D1: cantidad de lineas de barrido
// @D2: cuanto se rompe con el golpe
// @D3: separacion de color
// @D4: ojos
// @D5: color (rojo infierno <-> violeta)
// @D6: estatica
// ===============================================================

const vec4 FACE_R = vec4(-1.3, -1.1, 2.6, 2.35);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// rostro iluminado en la posicion q (coordenadas del rostro)
vec4 g19Face(vec2 q, vec3 fireC, vec3 rimC, float eyesK) {
    vec2 fu = rUV(q, FACE_R);
    vec4 c = plate0(fu);
    if (c.a <= 0.0) return vec4(0.0);
    vec4 nr = plate1(fu);
    vec2 nxy = nr.rg * 2.0 - 1.0;
    vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
    vec3 alb = plateCol(c.rgb);
    float under = max(dot(n, normalize(vec3(0.0, -0.8, 0.6))), 0.0);   // fuego desde abajo
    float rim = pow(max(dot(n, normalize(vec3(0.0, 0.9, 0.3))), 0.0), 3.0);
    float low = 0.25 + 0.9 * smoothstep(0.9, -0.9, q.y);             // el fuego esta abajo
    vec3 col = alb * (fireC * (0.08 + under * 2.4) * low + rimC * rim * 1.2 + vec3(0.015));
    col += fireC * pow(max(dot(n, normalize(vec3(0.0, -0.6, 0.8))), 0.0), 18.0) * 0.25;  // brillo humedo
    col += mix(fireC, vec3(1.0, 0.9, 0.6), 0.4) * nr.b * eyesK * 2.5;
    return vec4(col, c.a);
}

vec4 render(vec2 uv) {
    float t = uTime;
    float rt = uRTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    // --- calendario (fase 34) ---
    hkSetClimax(20.0, 20.0, 24.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(20.0, 5, 9.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(20.0, 4, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(20.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(20.0, 3));
    float cph = cA * C.w;
    float interf = cA * C.x * (1.0 - C.y) * (1.0 - C.z) + EST.y * 0.35;          // aviso: interferencia
    // se derrite al final del aviso (o en su suceso)
    float meltC = smoothstep(0.18, 0.33, cph) * (1.0 - smoothstep(0.36, 0.42, cph));
    float meltE = max(sv == 0 ? se : 0.0, meltC);
    float meltPh = meltC > 0.0 ? clamp((cph - 0.18) / 0.20, 0.0, 1.0) : sp;
    float possE = cA * C.y;
    float eye3 = cB * smoothstep(0.10, 0.40, C.w) * (1.0 - smoothstep(0.75, 0.92, C.w));
    float gap = cC * smoothstep(0.10, 0.45, C.w) * (1.0 - smoothstep(0.70, 0.92, C.w)) * 0.55;
    float mosaic = sv == 4 ? se * step(0.15, sp) * (1.0 - step(0.85, sp)) : 0.0;
    // piano: ojos y franjas de glitch
    float keyEyes = 0.0;
    for (int k = 0; k < N_KEYS; k++) keyEyes = max(keyEyes, keyEnv(k, 0.02, 0.6) * (0.5 + keyVel(k)));
    vec3 fireC = mix(vec3(1.0, 0.25, 0.06), vec3(0.65, 0.15, 1.0), uD5);
    vec3 rimC = mix(vec3(0.45, 0.20, 0.55), vec3(1.0, 0.2, 0.3), uD5);
    float brk = clamp(hit * hkDR(0.0, 0.7, 1.6, uD2) + possE + hit * loco * 0.5, 0.0, 1.5);

    // --- glitch de pantalla: bloques, filas que se rasgan ---
    vec2 g = uv;
    if (dv == 3 && D.x > 0.5) g.x = 1.0 - g.x;                      // detalle: espejo
    vec2 bid = floor(uv * vec2(14.0, 8.0) + hkActVal(6.0) * 3.0);
    vec2 bh = hash22(bid + floor(rt * (6.0 + possE * 10.0)));
    float on = step(1.0 - brk * 0.40, bh.x);
    g += (bh - 0.5) * vec2(0.20, 0.06) * on * brk;
    float row = floor(uv.y * hkDR(20.0, 120.0, 260.0, uD1));
    float tear = step(0.985 - brk * 0.1 - interf * 0.08, hash21(vec2(row, floor(rt * 20.0))));
    g.x += (hash21(vec2(row, 3.0)) - 0.5) * 0.15 * tear;
    // piano: franja corrida a la altura de la nota
    float keyBand = 0.0;
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.02, 0.6);
        if (e < 0.01) continue;
        float by = mix(0.08, 0.92, keyPos(k)) + keyHeld(k) * 0.04 * sin(uKclock * 2.0 + float(k));
        float band = exp(-pow((uv.y - by) / (0.02 + keyVel(k) * 0.05), 2.0)) * e;
        keyBand = max(keyBand, band);
        g.x += (hash21(vec2(floor(uv.y * 90.0), floor(uKclock * 18.0) + float(k))) - 0.5) * 0.18 * band;
    }
    g.x += sin(uv.y * 30.0 + t * 2.0) * 0.002 * (0.3 + mid * 2.0);
    vec2 p = hkCam(hkPunch(hkShake(centered(g))));

    // --- fondo: humo rojo, brasas ---
    float sm = fbm(vec2(p.x * 1.2, p.y * 1.5 - t * 0.12), 4, 0.55);
    vec3 col = fireC * 0.06 * smoothstep(0.35, 0.85, sm) * (0.4 + 0.6 * smoothstep(1.0, -1.0, p.y));
    col += fireC * exp(-pow((p.y + 1.1) / (0.45 + EST.z * 0.3), 2.0)) * (0.25 + bass * 0.4 + EST.z * 0.3);
    float emb = hkParticles(p * 0.8, t * 0.5, 0.08 + high * 0.1 + EST.z * 0.08 + (dv == 1 ? D.x * 0.25 : 0.0), vec2(0.1, 1.0), 0.035);
    col += mix(fireC, vec3(1.0, 0.8, 0.4), 0.5) * emb * 0.4;

    // --- rostro (respira; se derrite en el evento) ---
    float breath = (1.0 + 0.025 * sin(t * 0.9) + mid * 0.02) * (1.0 + (sv == 3 ? se * sin(sp * PI) * 0.7 : 0.0));
    vec2 q = p / (0.80 * breath) + vec2(0.0, 0.06);
    // suceso: mosaico de rostros (3 x 3)
    if (mosaic > 0.5) {
        vec2 cell = vec2(2.0 * uAspect / 3.0, 2.0 / 3.0);
        vec2 lp = (fract(p / cell + 0.5) - 0.5) * cell;
        q = lp * 3.0 / 0.80 + vec2(0.0, 0.06);
    }
    // C: partido al medio, cada mitad para su lado
    float inGap = 0.0;
    if (gap > 0.0) {
        inGap = 1.0 - step(gap, abs(q.x));
        q.x -= sign(q.x) * gap;
        float fz = fbm(vec2(p.x * 4.0, p.y * 2.0 - uRTime * 1.5), 3, 0.6);
        col += mix(fireC, vec3(1.0, 0.8, 0.4), fz) * (0.4 + fz) * exp(-abs(p.x) / (gap * 0.8 + 0.02)) * smoothstep(1.1, 0.0, abs(p.y)) * (gap / 0.55) * 1.2;
    }
    if (meltE > 0.01) {
        float cx = floor(q.x * 40.0);
        float drip = meltE * meltPh * (0.15 + 0.5 * hash21(vec2(cx, 9.0))) * smoothstep(-1.0, 0.8, q.y);
        q.y += drip;
        q.x += sin(q.y * 6.0 + t) * 0.02 * meltE;
    }
    float eyesK = hkDR(0.0, 0.7, 1.9, uD4) * (0.6 + bass * 1.0 + hit * 0.4) + keyEyes * 1.6 + cA * C.z * 2.2 + eye3 * 0.8;
    if (dv == 0) eyesK *= 1.0 - D.x * step(0.4, D.y) * (1.0 - step(0.55, D.y));
    float split = hkDR(0.0, 0.019, 0.06, uD3) * (1.0 + brk * 2.0 + bass * 0.5 + interf * 2.0) + keyBand * 0.03;
    vec4 fc = g19Face(q, fireC, rimC, eyesK);
    vec3 face = fc.rgb;
    if (split > 0.006) {
        vec4 fr = g19Face(q + vec2(split, 0.0), fireC, rimC, eyesK);
        vec4 fb = g19Face(q - vec2(split, split * 0.3), fireC, rimC, eyesK);
        face = vec3(fr.r, fc.g, fb.b);
        fc.a = max(fc.a, max(fr.a, fb.a) * 0.8);
    }
    col = mix(col, face, clamp(fc.a, 0.0, 1.0) * (1.0 - inGap));
    // B: el tercer ojo en la frente
    if (eye3 > 0.0) {
        vec2 ec = vec2(0.0, 0.50) * 0.80 * breath - vec2(0.0, 0.06) * 0.80 * breath;
        vec2 eq = (p - ec) / (0.13 * breath);
        float open = smoothstep(0.0, 0.6, eye3);
        float lid = length(eq / vec2(1.0, max(open * 0.55, 0.02))) - 1.0;
        float lookX = sin(uRTime * 0.8) * 0.4;
        float iris = length(eq - vec2(lookX, 0.0)) - 0.42;
        float pupil = abs(eq.x - lookX) - 0.08;
        vec3 ec3 = mix(vec3(1.0, 0.85, 0.4), fireC * 1.5, smoothstep(-0.4, 0.0, iris));
        ec3 = mix(ec3, vec3(0.0), (1.0 - smoothstep(0.0, 0.04, pupil)) * step(iris, 0.0));
        col = mix(col, ec3 * (1.0 + bass * 0.6), (1.0 - smoothstep(-0.04, 0.04, lid)) * eye3);
        float ang = atan(eq.y, eq.x);
        col += fireC * (0.5 + 0.5 * sin(ang * 12.0 + uRTime * 2.0)) * exp(-length(eq) * 0.9) * 0.18 * eye3 * step(0.0, lid);
    }
    // suceso: llora fuego
    if (sv == 1 && se > 0.0) {
        for (int s2 = -1; s2 <= 1; s2 += 2) {
            vec2 eo = vec2(float(s2) * 0.20, 0.06) * breath;
            vec2 tq = p - eo;
            float flow = smoothstep(0.0, 0.6, sp) * 0.9;
            float w = 0.018 + 0.01 * sin(tq.y * 20.0 - uRTime * 6.0);
            float tear = (1.0 - smoothstep(w, w + 0.01, abs(tq.x + 0.02 * sin(tq.y * 9.0)))) * step(-flow, tq.y) * step(tq.y, 0.0);
            col += mix(fireC, vec3(1.0, 0.75, 0.3), 0.25) * tear * se * 0.8 * (1.0 + 0.5 * noise21(vec2(tq.y * 10.0 - uRTime * 5.0, float(s2))));
        }
    }
    // copias fantasma a los costados con la locura / posesion
    float ghostK = clamp(hit * loco * step(0.5, loco) + possE, 0.0, 1.0);
    if (ghostK > 0.01) {
        for (int k = 0; k < 2; k++) {
            float sd = k == 0 ? -1.0 : 1.0;
            vec4 gc = g19Face((p - vec2(sd * 1.55, 0.05 * sin(rt * 7.0 + sd))) / 0.80, fireC, rimC, eyesK);
            col = mix(col, gc.rgb * 0.55, gc.a * ghostK * 0.8);
        }
    }

    // --- lineas de barrido, estatica, inversion ---
    float lines = 0.5 + 0.5 * sin(uv.y * uResH * hkDR(0.1, 0.65, 1.3, uD1));
    col *= 1.0 - 0.25 * lines * hkDR(0.0, 0.65, 1.2, uD1);
    float st = hash21(uv * vec2(uResW, uResH) * 0.5 + fract(rt * 31.0) * 97.0);
    col = mix(col, vec3(st) * 0.5, (hkDR(0.0, 0.13, 0.45, uD6) + high * 0.08 + brk * 0.06 + interf * 0.25 + keyBand * 0.3) * step(0.5, st + 0.3));
    float bar = smoothstep(0.02, 0.0, abs(fract(uv.y - rt * 0.07) - 0.5) - 0.06);
    col += vec3(0.04) * bar * hkDR(0.0, 1.0, 2.2, uD6);
    // detalle: una linea de tracking que sube
    if (dv == 2) col = mix(col, vec3(st * 0.7), exp(-pow((uv.y - D.y) / 0.02, 2.0)) * D.x * 0.8);
    // suceso: se corta la senal (barras de color con el rostro detras)
    if (sv == 2) {
        float bk = se * smoothstep(0.15, 0.22, sp) * (1.0 - smoothstep(0.75, 0.82, sp));
        float bi = floor(uv.x * 7.0);
        vec3 bars = vec3(step(0.5, mod(bi + 1.0, 2.0) < 0.5 ? 0.0 : 1.0) * 0.0);
        bars = vec3(bi < 4.0 ? 0.75 : 0.0, mod(bi, 4.0) < 2.0 ? 0.75 : 0.0, mod(bi, 2.0) < 0.5 ? 0.75 : 0.0);
        if (uv.y < 0.25) bars = vec3(0.04 + 0.7 * step(0.5, fract(uv.x * 3.5)) * step(uv.x, 0.6));
        col = mix(col, bars * 0.45 + col * 0.35, bk);
    }
    // (a lo sumo dos cambios por segundo: limite de destellos)
    float inv = max(hit * step(0.75, loco), G.y) * step(0.6, noise21(vec2(floor(rt * 2.0), 5.0)));
    col = mix(col, (vec3(1.0) - col) * fireC, inv * 0.7);
    // bloques corridos: un poco de color crudo en los bordes del bloque
    // EASTER EGG "JAY INFINITO" (fase 38): un cartel de canal de los de
    // antes, con colores corridos: "CANAL (infinito) - JAY"
    vec2 EG = hkEgg(19.0);
    if (EG.x > 0.0) {
        vec2 oq = (uv - vec2(0.27, 0.86)) * vec2(uAspect, 1.0) / (0.075 * hkEggS);   // fase 39: mas chico
        if (abs(oq.y) < 1.2 && abs(oq.x) < 7.0) {
            int s13[16] = int[16](67, 65, 78, 65, 76, 32, 8, 32, 45, 32, 74, 65, 89, 0, 0, 0);
            float jit = (hash21(vec2(floor(rt * 2.0), 77.0)) - 0.5) * 0.25 * (1.0 - EG.y);
            float dR = hkText(oq + vec2(0.10 + jit, 0.0), s13, 13);
            float dG = hkText(oq + vec2(jit, 0.0), s13, 13);
            float dB = hkText(oq - vec2(0.10 - jit, 0.0), s13, 13);
            vec3 txt = vec3(1.0 - smoothstep(0.06, 0.11, dR), 1.0 - smoothstep(0.06, 0.11, dG), 1.0 - smoothstep(0.06, 0.11, dB));
            float scan = 0.85 + 0.15 * sin(uv.y * uResH * 3.14159);
            float band = smoothstep(1.2, 0.9, abs(oq.y)) * smoothstep(7.0, 6.4, abs(oq.x));
            col = mix(col, col * 0.35, band * 0.6 * EG.x);
            col = max(col, txt * scan * 1.1 * EG.x);
        }
    }

    return vec4(hkFinish(col, uv, vec3(0.5, 0.05, 0.05)), 1.0);
}
