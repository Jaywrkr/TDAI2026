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
//   piano  -> las pupilas siguen la ultima tecla
// Speed marca el parpadeo, la niebla y las luciernagas aun en silencio.
// HISTORIA: cada acto cambia cuantos ojos hay; cada ~37 s parpadean
// todos juntos; cada ~103 s se abre el ojo gigante; cada ~59 s un par
// rojo se acerca desde el fondo.
//
// @D1: cantidad de pares de ojos
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

    // historia
    float allBlink = step(0.5, hkEvent(5.0, 37.0, 2.6)) * step(0.3, fract(uRTime * 1.4));
    float giantE = hkEvent(6.0, 103.0, 6.0);
    float approach = hkEvent(7.0, 59.0, 9.0);
    float apPh = hkEventPhase(7.0, 59.0, 9.0);
    float many = clamp(0.25 + uD1 * 0.75 + (hkActVal(8.0) - 0.5) * 0.3 + uDensity * 0.1, 0.0, 1.0);
    vec2 look0 = vec2(mix(-1.0, 1.0, uKeypos), 0.0);

    // --- cielo entre las copas, luna y rayos ---
    vec3 col = mix(vec3(0.010, 0.012, 0.025), vec3(0.03, 0.035, 0.07), smoothstep(-0.2, 1.0, pF.y));
    vec2 mc = vec2(1.4, 0.80);
    float md = length(pF - mc);
    col += vec3(0.85, 0.88, 1.0) * (1.0 - smoothstep(0.085, 0.09, md));
    col += moonC * exp(-md * 3.0) * 0.30;
    // rayos de luna diagonales entre los arboles
    vec2 rd = normalize(vec2(-0.55, -1.0));
    float rx = dot(pM - mc, vec2(-rd.y, rd.x));
    float ry = dot(pM - mc, rd);
    float shafts = smoothstep(0.55, 0.85, plate3Wrap(vec2(rx * 0.35 + 0.1, 0.25 + t * 0.002)).r) * smoothstep(0.0, 0.6, ry) * exp(-ry * 0.45);

    // --- lejos: troncos en la niebla ---
    vec4 far = plate0(rUV(pF));
    col = mix(col, mix(fogC * 1.15, moonC * 0.12, 0.3) * (0.6 + 0.4 * far.r), far.a * 0.85);
    // niebla que respira
    float fz = plate3Wrap(vec2(pF.x * 0.10 - t * 0.004, pF.y * 0.35 + 0.1)).g;
    float fogB = smoothstep(0.35, 0.75, fz) * exp(-pow((pF.y + 0.15) / 0.45, 2.0));
    col = mix(col, fogC * 2.2 + irisCol * bass * 0.04, fogB * (0.35 + uD6 * 0.35));

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
        if (rank > many) continue;
        float size = (L == 0 ? 0.045 : (L == 1 ? 0.075 : 0.12)) * (0.7 + uD3 * 0.7);
        vec2 dq = pp - sp.xy;
        // lejos del ojo el brillo ya es < 0.1%: no se calcula nada mas
        if (dot(dq, dq) > size * size * 60.0) continue;
        float wake = smoothstep(0.38 - uD2 * 0.35, 0.58 - uD2 * 0.35, hash21(vec2(fi, 7.7)));
        float kickWake = step(hash21(vec2(fi, 4.4)), hit * (0.6 + uD2 * 0.4));
        float h = hash21(vec2(fi, 9.9));
        float bph = fract(t * (0.13 + h * 0.18) + h * 7.0);
        float blink = 1.0 - smoothstep(0.0, 0.03, bph) * (1.0 - smoothstep(0.03, 0.07, bph));
        blink *= 1.0 - allBlink;
        float open = max(wake, kickWake) * blink;
        if (open < 0.02) continue;
        float rad = (0.85 + uD4 * 0.7 + bass * 0.8 + hit * 0.3) * (L == 0 ? 0.55 : (L == 1 ? 0.8 : 1.0));
        // el brillo se derrama en la niebla y las hojas (se calcula en todo
        // el cuadro, no solo cerca del ojo: si no, quedan rectangulos)
        glowSum += exp(-dot(dq, dq) / (size * size * 9.0)) * open * rad * (L == 2 ? 1.0 : 0.5);
        if (abs(dq.x) > size * 3.5 || abs(dq.y) > size * 2.0) continue;
        float kind = floor(hash21(vec2(fi, 5.5)) * 2.99);
        vec3 ec = kind > 1.5 ? mix(irisCol, vec3(1.0, 0.08, 0.04), 0.7) : (kind > 0.5 ? mix(irisCol, vec3(1.0, 0.75, 0.3), 0.5) : irisCol);
        vec2 look = mix(vec2(sin(t * (0.4 + mid * 1.2) + h * 11.0), 0.2 * sin(t * 0.7 + h * 9.0)), look0, uKeypulse);
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

    col = mix(col, eyeAcc[0], eyeM[0] * 0.75);       // lejanos: la niebla los apaga un poco

    // --- medio: troncos con corteza ---
    vec4 midP = plate1(rUV(pM));
    vec3 midC = plateCol(midP.rgb) * (2.2 + shafts * 3.0) + plateCol(midP.rgb) * irisCol * glowSum * 0.5;
    col = mix(col, midC, midP.a);
    // segunda niebla mas baja
    float fz2 = plate3Wrap(vec2(pM.x * 0.13 + t * 0.006, pM.y * 0.5 + 0.6)).b;
    col = mix(col, fogC * 2.4 + irisCol * glowSum * 0.02, smoothstep(0.40, 0.80, fz2) * exp(-pow((pM.y + 0.45) / 0.30, 2.0)) * (0.30 + uD6 * 0.40));
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
    float rustle = (0.002 + mid * 0.008) * sin(pN.y * 30.0 + t * 2.5 + sin(pN.x * 7.0));
    nu.x += rustle * smoothstep(-0.30, -0.55, pN.y);
    vec4 nr = plate2(nu);
    vec3 nc = plateCol(nr.rgb) * 1.3;
    // las hojas de adelante se tinen con la luz de los ojos
    nc += plateCol(nr.rgb) * irisCol * glowSum * 2.5 * smoothstep(-0.25, -0.65, pN.y);
    col = mix(col, nc, nr.a);

    // --- halo de los ojos en la niebla ---
    col += irisCol * glowSum * (0.015 + uD6 * 0.035) * (0.6 + bass * 0.6);

    // --- luciernagas (titilan con los agudos) ---
    float ff = hkParticles(pM * 0.8 + vec2(0.0, 0.3), t * 0.35, 0.05 + high * 0.08, vec2(0.3, 0.15), 0.02);
    col += vec3(0.65, 1.0, 0.35) * ff * (0.4 + high * 1.4) * smoothstep(0.6, -0.2, pM.y);

    // --- LOCURA: el ojo gigante se abre en el centro ---
    float giant = max(hit * smoothstep(0.35, 0.9, loco), giantE);
    if (giant > 0.01) {
        vec2 gq = pc / 0.95;
        float lid = max(giant, 0.001);
        float d = max(length(vec2(gq.x, gq.y / lid) - vec2(0.0, -0.55)), length(vec2(gq.x, gq.y / lid) - vec2(0.0, 0.55))) - 0.80;
        float em = 1.0 - smoothstep(-0.02, 0.02, d);
        vec2 ic = gq - vec2(0.18 * sin(uRTime * 3.0), 0.0);
        float ir = length(ic);
        float ang = atan(gq.y, gq.x);
        float veins = ridge(noise21(vec2(ang * 7.0, length(gq) * 9.0)), 10.0) * smoothstep(0.2, 0.8, length(gq));
        vec3 sclera = mix(vec3(0.85, 0.78, 0.72), vec3(0.70, 0.03, 0.03), veins);
        sclera *= 1.0 - length(gq) * 0.55;
        float irisM = 1.0 - smoothstep(0.21, 0.23, ir);
        float istr = 0.6 + 0.4 * noise21(vec2(atan(ic.y, ic.x) * 14.0, ir * 20.0));
        vec3 iris = irisCol * istr * (1.4 - ir * 2.0);
        float pupil = 1.0 - smoothstep(0.8, 1.0, length(ic / vec2(0.035, 0.18)));
        vec3 gc = mix(sclera, iris, irisM);
        gc = mix(gc, vec3(0.0), pupil);
        gc += vec3(1.0) * exp(-dot(ic - vec2(-0.08, 0.07), ic - vec2(-0.08, 0.07)) * 400.0);
        col *= 1.0 - giant * 0.6 * smoothstep(1.4, 0.4, length(gq));     // el bosque se oscurece
        col = mix(col, gc, em * giant);
    }
    col = audioLift(col, high * 0.08);
    return vec4(hkFinish(col, uv, vec3(0.3, 0.35, 0.6)), 1.0);
}
