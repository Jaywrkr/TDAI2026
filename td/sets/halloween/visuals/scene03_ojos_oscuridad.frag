// ===============================================================
// HALLOWEEN 03 - OJOS EN LA OSCURIDAD
// Un bosque de noche en tres profundidades (LAMINAS horneadas,
// plates/scene03, ver td/tools/bake_plates_bosque.py): troncos lejanos
// en la niebla, troncos con corteza y musgo, y arbustos y troncos
// grandes adelante. Entre los arboles y desde los arbustos miran pares
// de ojos de animal con brillo de reflejo (tapetum): unos de gato, otros
// redondos de lechuza, otros rojos. Los cercanos asoman entre las hojas
// y las iluminan; los lejanos se pierden en la niebla.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> brillan los iris y tinen la niebla y las hojas
//   medios -> los arbustos se mueven; las miradas recorren
//   agudos -> titilan las luciernagas; brillos humedos en los ojos
//   golpe  -> se abren mas pares de ojos (cada uno con su retraso);
//             con Chaos: se abre el ojo gigante
// PIANO: cada tecla abre un par de ojos nuevo en esa posicion (la fuerza
//   los hace mas grandes y brillantes); apretada siguen abiertos, al
//   soltarla parpadean y se cierran. Las pupilas de todos miran hacia la
//   ultima tecla.
// Speed marca el parpadeo, la niebla y las luciernagas aun en silencio.
// REPERTORIO (fase 31, motor hkSuceso del kit):
//   ESTADOS (~5 min): luna clara (rayos fuertes), niebla y noche cerrada
//     (menos ojos, mas oscuro, mas ojos rojos).
//   SUCESOS (~55 s, 7): parpadean todos juntos; un par rojo se acerca
//     desde el fondo; un par parpadea en codigo; todos miran hacia el mismo
//     lado; un par llora luz; cruza una bandada de ojitos; algo se mueve
//     entre los arbustos de adelante.
//   DETALLES (~30 s, 5): un par se cierra, las luciernagas brillan, cae una
//     hoja, un buho abre los ojos, el rayo de luna se aviva.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A el ojo gigante: se cierran todos, el ojo gigante se abre despacio,
//       mira a los lados y fija la mirada; despues vuelven de a uno.
//     B la mirada: todos se abren, crecen y siguen a la camara de lado a
//       lado al mismo tiempo; se cierran todos de golpe.
//     C la cara: los ojos se juntan en una cara enorme en la oscuridad,
//       con una sonrisa hecha de ojitos; despues se deshace.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con el par rojo.
// @EST: luna clara | niebla | noche cerrada
// @SUC: todos parpadean | par rojo | codigo | todos miran | llora luz | bandada de ojitos | algo en los arbustos
// @DET: un par se cierra | luciernagas | hoja que cae | buho | rayo de luna
// @CLX: A el ojo gigante | B la mirada | C la cara
// @D1: cantidad de pares de ojos (aparecen de a uno)
// @D2: cuantos estan abiertos
// @D3: tamano de los ojos
// @D4: brillo del iris
// @D5: color (amarillo <-> rojo sangre)
// @D6: niebla iluminada
// ===============================================================

const vec4 PL_R = vec4(-3.1, -1.2, 6.2, 2.4);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// escondites: xy, capa (0 lejos, 1 medio, 2 cerca)
const vec3 SPOT[14] = vec3[](
    vec3(-1.90, 0.05, 0.0), vec3(-0.62, 0.16, 0.0), vec3(0.72, 0.06, 0.0),
    vec3(1.82, 0.22, 0.0), vec3(-1.22, -0.12, 0.0), vec3(2.32, -0.06, 0.0),
    vec3(-2.20, -0.22, 1.0), vec3(-0.22, -0.05, 1.0), vec3(1.22, -0.16, 1.0),
    vec3(0.40, 0.34, 1.0),
    vec3(-1.50, -0.55, 2.0), vec3(0.90, -0.60, 2.0), vec3(2.10, -0.50, 2.0),
    vec3(-0.60, -0.66, 2.0));

// Ojo de animal con brillo de reflejo. kind 0 gato (rendija), 1 lechuza
// (redondo), 2 demonio (rojo, rendija fina). Devuelve (mascara, brillo).
vec2 hwEye(vec2 q, float open, vec2 look, float kind) {
    float lid = max(open, 0.001);
    vec2 a = vec2(q.x, q.y / lid);
    float d = kind > 0.5 && kind < 1.5
        ? length(a) - 0.62
        : max(length(a - vec2(0.0, -0.55)), length(a - vec2(0.0, 0.55))) - 0.80;
    float mask = 1.0 - smoothstep(-0.03, 0.03, d);
    vec2 ip = q - vec2(look.x * 0.16, look.y * 0.05);
    float glow = clamp(1.15 - length(ip * vec2(1.5, 2.2)), 0.0, 1.0);
    vec2 pw = kind > 0.5 && kind < 1.5 ? vec2(0.20, 0.20) : vec2(kind > 1.5 ? 0.035 : 0.06, 0.32);
    float pupil = 1.0 - smoothstep(0.75, 1.0, length(ip / pw));
    float b = glow * (1.0 - pupil * 0.95);
    // el parpado de arriba hace sombra sobre el iris
    b *= smoothstep(-0.6 * lid, 0.2 * lid, -q.y + 0.25 * lid) * 0.5 + 0.5;
    return vec2(mask, b * mask);
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
    float hue = audioHue(uHue, mid * 0.01);
    vec3 irisCol = mix(hsv2rgb(vec3(fract(0.13 + hue), 0.95, 1.0)),
                       hsv2rgb(vec3(fract(0.995 + hue), 1.0, 1.0)), uD5);
    vec3 moonC = vec3(0.42, 0.50, 0.80);
    vec3 fogC = mix(vec3(0.05, 0.06, 0.10), irisCol * 0.12, 0.15);

    vec2 dolly = vec2(sin(uRTime * 0.03) * 0.10 + sin(uRTime * 0.012 + 1.0) * 0.05, 0.0);
    vec2 pF = pc + dolly * 0.25, pM = pc + dolly * 0.6, pN = pc + dolly * 1.1;

    // --- calendario (fase 31) ---
    hkSetClimax(6.0, 18.0, 22.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(6.0, 7, 9.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(6.0, 5, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(6.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(6.0, 3));
    float allBlink = (sv == 0 ? step(0.5, se) : 0.0) * step(0.3, fract(uRTime * 1.4));
    float cph = cA * C.w;
    // B: abiertos y grandes, siguen a la camara; se cierran de golpe al final
    float stare = cB * smoothstep(0.0, 0.3, C.w) * (1.0 - step(0.80, C.w));
    float stareLook = sin(uRTime * 0.9);
    // el ojo gigante: se abre despacio en el pico y se cierra en las secuelas
    float giantE = smoothstep(0.34, 0.50, cph) * (1.0 - smoothstep(0.74, 0.86, cph));
    // mira a un lado, al otro, y fija la mirada en la camara
    float giantLook = cph > 0.0 ? sin(clamp((cph - 0.45) / 0.16, 0.0, 1.0) * 6.2832) * 0.9 : 0.0;
    float approach = max(sv == 1 ? se : 0.0, step(0.0001, G.w) * smoothstep(0.1, 0.3, G.w) * (1.0 - smoothstep(0.75, 0.9, G.w)));
    float apPh = G.w > 0.0 ? clamp((G.w - 0.1) / 0.75, 0.0, 1.0) : sp;
    float many = clamp(hkDR(0.0, 0.625, 1.15, uD1) + (hkActVal(8.0) - 0.5) * 0.3 + uDensity * 0.1 - EST.z * 0.25, 0.0, 1.0);
    many = max(many, stare);
    // C: los ojos de siempre se apagan mientras se arma la cara
    float faceK = cC * smoothstep(0.15, 0.40, C.w) * (1.0 - smoothstep(0.78, 0.95, C.w));
    // suceso: todos miran hacia el mismo lado
    vec2 lookAll = vec2(ss > 0.5 ? 1.0 : -1.0, 0.0);
    float lookAllK = sv == 3 ? se : 0.0;
    int codeSpot = int(floor(ss * 10.0));
    int crySpot = int(floor(ss * 10.0));
    vec2 look0 = vec2(mix(-1.0, 1.0, uKeypos), 0.0);
    // las pupilas miran hacia la ultima tecla mientras alguna suene
    float keyLook = 0.0;
    for (int k = 0; k < N_KEYS; k++) keyLook = max(keyLook, keyEnv(k, 0.1, 1.5));

    // --- cielo entre las copas, luna y rayos ---
    vec3 col = mix(vec3(0.010, 0.012, 0.025), vec3(0.03, 0.035, 0.07), smoothstep(-0.2, 1.0, pF.y));
    vec2 mc = vec2(1.4, 0.80);
    float md = length(pF - mc);
    float moonK = 0.7 + EST.x * 0.5 - EST.z * 0.4;
    col += vec3(0.85, 0.88, 1.0) * (1.0 - smoothstep(0.085, 0.09, md)) * (0.6 + 0.4 * moonK);
    col += moonC * exp(-md * 3.0) * 0.30 * moonK;
    // rayos de luna diagonales entre los arboles
    vec2 rd = normalize(vec2(-0.55, -1.0));
    float rx = dot(pM - mc, vec2(-rd.y, rd.x));
    float ry = dot(pM - mc, rd);
    float shafts = smoothstep(0.55, 0.85, plate3Wrap(vec2(rx * 0.35 + 0.1, 0.25 + t * 0.002)).r) * smoothstep(0.0, 0.6, ry) * exp(-ry * 0.45);
    shafts *= max(moonK, 0.2) * (1.0 + (dv == 4 ? D.x * 1.5 : 0.0));

    // --- lejos: troncos en la niebla ---
    vec4 far = plate0(rUV(pF));
    col = mix(col, mix(fogC * 1.15, moonC * 0.12, 0.3) * (0.6 + 0.4 * far.r), far.a * 0.85);
    // niebla que respira
    float fz = plate3Wrap(vec2(pF.x * 0.10 - t * 0.004, pF.y * 0.35 + 0.1)).g;
    float fogB = smoothstep(0.35, 0.75, fz) * exp(-pow((pF.y + 0.15) / 0.45, 2.0));
    col = mix(col, fogC * 2.2 + irisCol * bass * 0.04, fogB * (hkDR(0.0, 0.525, 1.1, uD6) + EST.y * 0.35));

    float glowSum = 0.0;
    vec2 glowAt = vec2(0.0);
    vec3 eyeAcc[3];
    float eyeM[3];
    for (int L = 0; L < 3; L++) { eyeAcc[L] = vec3(0.0); eyeM[L] = 0.0; }

    // --- ojos (se juntan por capa para que la capa de adelante los tape) ---
    for (int i = 0; i < 14; i++) {
        vec3 sp = SPOT[i];
        int L = int(sp.z);
        vec2 pp = L == 0 ? pF : (L == 1 ? pM : pN);
        float fi = float(i);
        float rank = hash21(vec2(fi, 3.1));
        // D1 suma pares DE A UNO: el nuevo se abre de a poco
        float appear = smoothstep(rank, rank + 0.07, many);
        if (appear < 0.01) continue;
        float size = (L == 0 ? 0.045 : (L == 1 ? 0.075 : 0.12)) * hkDR(0.4, 1.05, 1.9, uD3);
        vec2 dq = pp - sp.xy;
        // lejos del ojo el brillo ya es < 0.1%: no se calcula nada mas
        if (dot(dq, dq) > size * size * 60.0) continue;
        float wake = smoothstep(hkDR(0.95, 0.205, -0.1, uD2), hkDR(1.15, 0.405, 0.1, uD2), hash21(vec2(fi, 7.7)));
        float kickWake = step(hash21(vec2(fi, 4.4)), hit * (0.6 + uD2 * 0.4));
        float h = hash21(vec2(fi, 9.9));
        float bph = fract(t * (0.13 + h * 0.18) + h * 7.0);
        float blink = 1.0 - smoothstep(0.0, 0.03, bph) * (1.0 - smoothstep(0.03, 0.07, bph));
        blink *= 1.0 - allBlink;
        // climax: se cierran de a uno en el aviso y vuelven de a uno despues
        float shut = hkOffWindow(cph, hash21(vec2(fi, 21.0)), hash21(vec2(fi, 22.0)));
        // suceso: un par parpadea en codigo (a lo sumo 2 veces por segundo)
        if (sv == 2 && i == codeSpot) blink *= mix(1.0, step(0.45, fract(uRTime * 2.0 + floor(uRTime * 0.5) * 0.37)), se);
        // detalle: un par se cierra
        if (dv == 0 && i == int(floor(D.w * 14.0))) blink *= 1.0 - D.x;
        float open = max(max(wake, kickWake), stare) * blink * appear * (1.0 - shut) * (1.0 - faceK)
                   * (1.0 - cB * step(0.80, C.w) * (1.0 - smoothstep(0.90, 1.0, C.w)));
        if (open < 0.02) continue;
        float rad = (hkDR(0.25, 1.2, 3.4, uD4) + bass * 0.8 + hit * 0.3 + stare * 0.5) * (L == 0 ? 0.55 : (L == 1 ? 0.8 : 1.0));
        size *= 1.0 + stare * 0.45;
        // suceso: un par llora luz (gotas que caen debajo)
        if (sv == 4 && i == crySpot) {
            for (int s = -1; s <= 1; s += 2) {
                vec2 tq = dq - vec2(float(s) * size * 1.15, -size * 0.6);
                float fall = fract(uRTime * 0.6 + float(s) * 0.3);
                float dropY = -fall * size * 6.0;
                vec2 dd2 = (tq - vec2(0.0, dropY)) / size;
                glowSum += exp(-dot(dd2 * vec2(3.0, 1.2), dd2 * vec2(3.0, 1.2))) * se * 1.5;
                float trail = smoothstep(0.15, 0.0, abs(tq.x) / size) * step(dropY, tq.y) * step(tq.y, 0.0);
                glowSum += trail * se * 0.25;
            }
        }
        // el brillo se derrama en la niebla y las hojas (se calcula en todo
        // el cuadro, no solo cerca del ojo: si no, quedan rectangulos)
        glowSum += exp(-dot(dq, dq) / (size * size * 9.0)) * open * rad * (L == 2 ? 1.0 : 0.5);
        if (abs(dq.x) > size * 3.5 || abs(dq.y) > size * 2.0) continue;
        float kind = floor(hash21(vec2(fi, 5.5)) * 2.99);
        vec3 ec = kind > 1.5 ? mix(irisCol, vec3(1.0, 0.08, 0.04), 0.7) : (kind > 0.5 ? mix(irisCol, vec3(1.0, 0.75, 0.3), 0.5) : irisCol);
        vec2 look = mix(vec2(sin(t * (0.4 + mid * 1.2) + h * 11.0), 0.2 * sin(t * 0.7 + h * 9.0)), look0, max(uKeypulse, keyLook));
        look = mix(look, lookAll, lookAllK);
        look = mix(look, vec2(stareLook, 0.0), stare);
        for (int s = -1; s <= 1; s += 2) {
            vec2 eq = (dq - vec2(float(s) * size * 1.15, 0.0)) / size;
            eq.x *= float(s);
            eq = rot2(kind > 0.5 && kind < 1.5 ? 0.0 : 0.18) * eq;
            vec2 e = hwEye(eq, open, look * vec2(float(s), 1.0), kind);
            vec3 hot = mix(ec, vec3(1.0, 0.96, 0.8), 0.35);
            vec3 c = mix(ec * 0.25, hot, e.y) * rad;
            float wetS = exp(-dot(eq - vec2(-0.14, 0.10), eq - vec2(-0.14, 0.10)) * 140.0) * (0.5 + high);
            c += vec3(1.0) * wetS * 0.6;
            eyeAcc[L] = mix(eyeAcc[L], c, e.x);
            eyeM[L] = max(eyeM[L], e.x);
        }
    }
    // --- PIANO: un par de ojos nuevo por tecla, en la capa del medio ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.22, 0.35);
        if (e < 0.01) continue;
        float vel = keyVel(k);
        float ks = (0.06 + vel * 0.07) * hkDR(0.4, 1.05, 1.9, uD3);
        vec2 kc = vec2(hkKeyX(k) * 0.9, -0.30 + 0.45 * fract(keyPos(k) * 7.3 + float(k) * 0.29));
        vec2 dq = pM - kc;
        glowSum += exp(-dot(dq, dq) / (ks * ks * 9.0)) * e * (1.0 + vel);
        if (abs(dq.x) > ks * 3.5 || abs(dq.y) > ks * 2.0) continue;
        // al soltar parpadea antes de cerrarse
        float bl = keyHeld(k) > 0.5 ? 1.0 : 1.0 - 0.8 * step(0.5, fract(uKclock * 6.0));
        float kind = floor(fract(keyPos(k) * 13.7) * 2.99);
        vec3 ec = kind > 1.5 ? mix(irisCol, vec3(1.0, 0.08, 0.04), 0.7) : (kind > 0.5 ? mix(irisCol, vec3(1.0, 0.75, 0.3), 0.5) : irisCol);
        for (int s = -1; s <= 1; s += 2) {
            vec2 eq = (dq - vec2(float(s) * ks * 1.15, 0.0)) / ks;
            eq.x *= float(s);
            eq = rot2(kind > 0.5 && kind < 1.5 ? 0.0 : 0.18) * eq;
            vec2 ee = hwEye(eq, e * bl, look0 * vec2(float(s), 1.0), kind);
            vec3 c = mix(ec * 0.25, mix(ec, vec3(1.0, 0.96, 0.8), 0.35), ee.y) * (1.0 + vel * 0.8 + bass * 0.5);
            eyeAcc[1] = mix(eyeAcc[1], c, ee.x);
            eyeM[1] = max(eyeM[1], ee.x);
        }
    }
    // EASTER EGG "JAY INFINITO" (fase 38): un par de ojos se abre en el
    // medio y el brillo de las dos miradas se une en un infinito
    vec2 EG = hkEgg(3.0);
    if (EG.x > 0.0) {
        vec2 ic = vec2(0.0, -0.02);
        vec2 dq = pM - ic;
        float trace = smoothstep(0.15, 0.55, EG.y);                    // el trazo crece y se cierra
        float ang = atan(dq.y, dq.x * 0.6);
        float infD = hkInfD(dq, 0.36 * hkEggS);              // fase 39: mas chico
        float line = exp(-infD / 0.006) * EG.x * trace;
        glowSum += exp(-infD / 0.05) * EG.x * trace * 0.8;
        vec3 ic3 = mix(irisCol, vec3(1.0, 0.85, 0.4), 0.5);
        eyeAcc[1] = mix(eyeAcc[1], ic3 * 1.6, clamp(line, 0.0, 1.0));
        eyeM[1] = max(eyeM[1], clamp(line, 0.0, 1.0));
        float bl = 1.0 - (1.0 - smoothstep(0.0, 0.04, abs(EG.y - 0.75))) * 0.9;   // un parpadeo
        for (int s = -1; s <= 1; s += 2) {
            vec2 eq = (dq - vec2(float(s) * 0.245 * hkEggS, 0.0)) / (0.10 * hkEggS);
            eq.x *= float(s);
            vec2 e = hwEye(eq, EG.x * bl, vec2(-0.3, 0.0) * float(s), 0.0);
            vec3 c = mix(ic3 * 0.25, mix(ic3, vec3(1.0, 0.96, 0.8), 0.35), e.y) * (1.3 + bass * 0.5);
            eyeAcc[1] = mix(eyeAcc[1], c, e.x);
            eyeM[1] = max(eyeM[1], e.x);
        }
    }
    // par rojo que se acerca desde el fondo
    if (approach > 0.01) {
        float as = mix(0.03, 0.17, apPh * apPh);
        vec2 ac = vec2(0.05, mix(0.05, -0.30, apPh));
        vec2 dq = pM - ac;
        glowSum += exp(-dot(dq, dq) / (as * as * 9.0)) * approach * 1.5;
        for (int s = -1; s <= 1; s += 2) {
            vec2 eq = (dq - vec2(float(s) * as * 1.15, 0.0)) / as;
            eq.x *= float(s);
            eq = rot2(0.18) * eq;
            vec2 e = hwEye(eq, approach, vec2(0.0), 2.0);
            vec3 c = mix(vec3(0.3, 0.0, 0.0), vec3(1.0, 0.25, 0.1), e.y) * (1.2 + bass);
            eyeAcc[1] = mix(eyeAcc[1], c, e.x * approach);
            eyeM[1] = max(eyeM[1], e.x * approach);
        }
    }

    // --- C: la cara enorme, dos ojos grandes y una sonrisa de ojitos ---
    if (faceK > 0.01) {
        for (int s = -1; s <= 1; s += 2) {
            vec2 fc = vec2(float(s) * 0.55, 0.15);
            float fs = 0.16;
            vec2 dq = pM - fc;
            glowSum += exp(-dot(dq, dq) / (fs * fs * 9.0)) * faceK * 1.6;
            vec2 eq = dq / fs;
            eq.x *= float(s);
            vec2 e = hwEye(rot2(0.25) * eq, faceK, vec2(0.3 * sin(uRTime * 0.7), 0.0), 2.0);
            vec3 c = mix(vec3(0.3, 0.0, 0.0), vec3(1.0, 0.25, 0.1), e.y) * (1.3 + bass);
            eyeAcc[1] = mix(eyeAcc[1], c, e.x * faceK);
            eyeM[1] = max(eyeM[1], e.x * faceK);
        }
        for (int k = 0; k < 11; k++) {
            float fk = float(k) / 10.0;
            float on = smoothstep(fk * 0.5, fk * 0.5 + 0.1, smoothstep(0.15, 0.55, C.w)) * faceK;
            vec2 mc2 = vec2(mix(-0.75, 0.75, fk), -0.30 + 0.35 * pow(abs(fk - 0.5) * 2.0, 2.0));
            vec2 dq = pM - mc2;
            float ks = 0.035;
            glowSum += exp(-dot(dq, dq) / (ks * ks * 9.0)) * on * 0.8;
            for (int s = -1; s <= 1; s += 2) {
                vec2 eq = (dq - vec2(float(s) * ks * 1.15, 0.0)) / ks;
                vec2 e = hwEye(eq, on, vec2(0.0), 0.0);
                vec3 c = mix(irisCol * 0.25, mix(irisCol, vec3(1.0, 0.96, 0.8), 0.35), e.y) * 1.2;
                eyeAcc[1] = mix(eyeAcc[1], c, e.x * on);
                eyeM[1] = max(eyeM[1], e.x * on);
            }
        }
    }
    // --- suceso: una bandada de ojitos cruza como polillas ---
    if (sv == 5 && se > 0.0) {
        for (int k = 0; k < 9; k++) {
            float fk = float(k);
            float h1 = hash21(vec2(fk, 31.0)), h2 = hash21(vec2(fk, 37.0));
            vec2 bc = vec2(mix(-uAspect - 0.3, uAspect + 0.3, fract(sp * 0.9 + h1 * 0.25)), 0.25 + h2 * 0.45 + 0.05 * sin(uRTime * 3.0 + fk));
            if (ss > 0.5) bc.x = -bc.x;
            vec2 dq = pM - bc;
            float ks = 0.022 + h2 * 0.012;
            if (dot(dq, dq) > ks * ks * 40.0) continue;
            float bl = step(0.12, fract(uRTime * (0.8 + h1) + h2));
            glowSum += exp(-dot(dq, dq) / (ks * ks * 9.0)) * se * 0.5;
            for (int s = -1; s <= 1; s += 2) {
                vec2 eq = (dq - vec2(float(s) * ks * 1.15, 0.0)) / ks;
                vec2 e = hwEye(eq, se * bl, vec2(0.0), 1.0);
                vec3 c = mix(irisCol * 0.25, mix(irisCol, vec3(1.0, 0.96, 0.8), 0.35), e.y);
                eyeAcc[1] = mix(eyeAcc[1], c, e.x * se);
                eyeM[1] = max(eyeM[1], e.x * se);
            }
        }
    }
    // --- detalle: un buho abre los ojos en lo alto ---
    if (dv == 3) {
        vec2 oc = vec2(mix(-1.8, 1.0, D.w), 0.55);
        vec2 dq = pM - oc;
        float ks = 0.05;
        float on = D.x * smoothstep(0.1, 0.3, D.y) * (1.0 - smoothstep(0.75, 0.9, D.y));
        glowSum += exp(-dot(dq, dq) / (ks * ks * 9.0)) * on;
        for (int s = -1; s <= 1; s += 2) {
            vec2 eq = (dq - vec2(float(s) * ks * 1.3, 0.0)) / ks;
            vec2 e = hwEye(eq, on, vec2(0.0), 1.0);
            vec3 c = mix(vec3(0.3, 0.2, 0.0), vec3(1.0, 0.85, 0.3), e.y) * 1.4;
            eyeAcc[1] = mix(eyeAcc[1], c, e.x * on);
            eyeM[1] = max(eyeM[1], e.x * on);
        }
    }

    col = mix(col, eyeAcc[0], eyeM[0] * 0.75);       // lejanos: la niebla los apaga un poco

    // --- medio: troncos con corteza ---
    vec4 midP = plate1(rUV(pM));
    vec3 midC = plateCol(midP.rgb) * (2.2 + shafts * 3.0) + plateCol(midP.rgb) * irisCol * glowSum * 0.5;
    col = mix(col, midC, midP.a);
    // segunda niebla mas baja
    float fz2 = plate3Wrap(vec2(pM.x * 0.13 + t * 0.006, pM.y * 0.5 + 0.6)).b;
    col = mix(col, fogC * 2.4 + irisCol * glowSum * 0.02, smoothstep(0.40, 0.80, fz2) * exp(-pow((pM.y + 0.45) / 0.30, 2.0)) * hkDR(0.0, 0.5, 1.1, uD6));
    col = mix(col, eyeAcc[1], eyeM[1]);
    // rayos de luna en el aire
    col += moonC * shafts * 0.07 * (1.0 - midP.a * 0.6);

    // --- cerca: huecos oscuros entre las hojas, y desde ahi miran ---
    for (int i = 10; i < 14; i++) {
        vec2 d = (pN - SPOT[i].xy) * vec2(1.0, 1.6);
        col *= 1.0 - 0.97 * smoothstep(0.045, 0.0, dot(d, d));
    }
    // --- cerca: los ojos asoman entre las hojas ---
    col = mix(col, eyeAcc[2], eyeM[2]);
    // los arbustos se mueven con los medios
    vec2 nu = rUV(pN);
    float bush = sv == 6 ? se * exp(-pow((pN.x - mix(-2.4, 2.4, ss > 0.5 ? 1.0 - sp : sp)) / 0.5, 2.0)) : 0.0;
    float rustle = (0.002 + mid * 0.008 + bush * 0.03) * sin(pN.y * 30.0 + t * 2.5 + sin(pN.x * 7.0) + bush * uRTime * 6.0);
    nu.x += rustle * smoothstep(-0.30, -0.55, pN.y);
    vec4 nr = plate2(nu);
    vec3 nc = plateCol(nr.rgb) * 1.3;
    // las hojas de adelante se tinen con la luz de los ojos
    nc += plateCol(nr.rgb) * irisCol * glowSum * 2.5 * smoothstep(-0.25, -0.65, pN.y);
    col = mix(col, nc, nr.a);
    col *= 1.0 - bush * 0.45 * smoothstep(-0.2, -0.6, pN.y);       // la sombra de lo que pasa
    // detalle: una hoja que cae
    if (dv == 2) {
        vec2 lc = vec2((D.w - 0.5) * 3.5 + 0.15 * sin(D.y * 9.0), mix(0.8, -0.7, D.y));
        vec2 lq = rot2(uRTime * 3.0) * (pM - lc);
        float leaf = length(lq * vec2(1.0, 2.4)) - 0.016;
        col = mix(col, vec3(0.05, 0.04, 0.02) + moonC * 0.08, smoothstep(0.003, -0.003, leaf) * D.x);
    }

    // --- halo de los ojos en la niebla ---
    col += irisCol * glowSum * hkDR(0.0, 0.0325, 0.09, uD6) * (0.6 + bass * 0.6);

    // --- luciernagas (titilan con los agudos) ---
    float ffK = dv == 1 ? D.x : 0.0;
    float ff = hkParticles(pM * 0.8 + vec2(0.0, 0.3), t * 0.35, 0.05 + high * 0.08 + ffK * 0.10, vec2(0.3, 0.15), 0.02);
    col += vec3(0.65, 1.0, 0.35) * ff * (0.4 + high * 1.4 + ffK * 1.5) * smoothstep(0.6, -0.2, pM.y);

    // --- LOCURA: el ojo gigante se abre en el centro ---
    giantE *= cA;
    float giant = max(hit * smoothstep(0.35, 0.9, loco), giantE);
    if (giant > 0.01) {
        vec2 gq = pc / mix(0.95, 1.6, giantE);
        float lid = max(giant, 0.001);
        float d = max(length(vec2(gq.x, gq.y / lid) - vec2(0.0, -0.55)), length(vec2(gq.x, gq.y / lid) - vec2(0.0, 0.55))) - 0.80;
        float em = 1.0 - smoothstep(-0.02, 0.02, d);
        vec2 ic = gq - vec2(mix(0.18 * sin(uRTime * 3.0), 0.20 * giantLook, step(0.001, giantE)), 0.0);
        float ir = length(ic);
        float ang = atan(gq.y, gq.x);
        float veins = ridge(noise21(vec2(ang * 7.0, length(gq) * 9.0)), 10.0) * smoothstep(0.2, 0.8, length(gq));
        vec3 sclera = mix(vec3(0.85, 0.78, 0.72), vec3(0.70, 0.03, 0.03), veins);
        sclera *= 1.0 - length(gq) * 0.55;
        float irisM = 1.0 - smoothstep(0.21, 0.23, ir);
        float istr = 0.6 + 0.4 * noise21(vec2(atan(ic.y, ic.x) * 14.0, ir * 20.0));
        vec3 iris = irisCol * istr * (1.4 - ir * 2.0);
        // al fijar la mirada la pupila se dilata
        float dil = 1.0 + smoothstep(0.60, 0.70, cph) * (1.0 - smoothstep(0.74, 0.80, cph)) * 1.6;
        float pupil = 1.0 - smoothstep(0.8, 1.0, length(ic / vec2(0.035 * dil, 0.18)));
        vec3 gc = mix(sclera, iris, irisM);
        gc = mix(gc, vec3(0.0), pupil);
        gc += vec3(1.0) * exp(-dot(ic - vec2(-0.08, 0.07), ic - vec2(-0.08, 0.07)) * 400.0);
        col *= 1.0 - giant * 0.6 * smoothstep(1.4, 0.4, length(gq));     // el bosque se oscurece
        col = mix(col, gc, em * giant);
    }
    col = audioLift(col, high * 0.08);
    // LUZ DE TECLA (fase 37): los ojos tinen lo que los rodea
    col = hkKeyLit(col, p0, -0.1, vec2(0.3, 0.35), vec3(1.0, 0.25, 0.1), vec3(1.0, 0.75, 0.2), 0.1, 1.0);
    return vec4(hkFinish(col, uv, vec3(0.3, 0.35, 0.6)), 1.0);
}
