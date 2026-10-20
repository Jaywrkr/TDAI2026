// ===============================================================
// HALLOWEEN 08 - ARANA EN SU TELA
// Telarana grande en la esquina con gotas de rocio que destellan, y una
// arana que baja y sube por su hilo.
// Speed mueve la arana y la brisa en la tela. El golpe hace vibrar los
// hilos (cada anillo con su fase) y la arana se encoge; los agudos
// hacen destellar el rocio.
//
// @D1: cantidad de radios
// @D2: cantidad de anillos
// @D3: tamano de la arana
// @D4: vibracion con el golpe
// @D5: rocio
// @D6: color (plata <-> violeta)
// ===============================================================

float hwSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float hwSpider(vec2 p, float t, float curl) {
    float body = length(p / vec2(0.9, 1.15)) - 0.20;
    float head = length(p - vec2(0.0, 0.25)) - 0.11;
    float d = min(body, head);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float a = 0.35 + fi * 0.42;
        float sway = 0.08 * sin(t * 3.0 + fi * 1.7);
        for (int s = -1; s <= 1; s += 2) {
            float sx = float(s);
            vec2 hip = vec2(sx * 0.12, 0.08 - fi * 0.07);
            vec2 knee = hip + vec2(sx * cos(a - 0.6 + sway) , sin(a + 0.4) * 0.6 + 0.25) * (0.42 - curl * 0.18);
            vec2 foot = knee + vec2(sx * 0.18, -0.55 + fi * 0.18) * (1.0 - curl * 0.5);
            d = min(d, hwSeg(p, hip, knee) - 0.022);
            d = min(d, hwSeg(p, knee, foot) - 0.016);
        }
    }
    return d;
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float hit = hkHit();
    float loco = hkLoco();
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    vec3 col = mix(vec3(0.015, 0.010, 0.030), vec3(0.06, 0.04, 0.09),
                   smoothstep(1.4, 0.0, length(p - vec2(-uAspect * 0.6, 0.7))));
    // luna detras de la tela: contraluz que hace brillar los hilos
    vec2 moonP = vec2(-uAspect * 0.35, 0.30);
    float mr = length(p - moonP);
    float backlight = exp(-mr * 1.3);
    col += vec3(0.55, 0.50, 0.70) * exp(-max(mr - 0.28, 0.0) * 5.0) * 0.25;
    col = mix(col, vec3(0.70, 0.66, 0.78) * (0.65 + 0.35 * fbm((p - moonP) * 6.0, 3)) * (0.7 + 0.3 * sqrt(max(1.0 - pow(mr / 0.28, 2.0), 0.0))), 1.0 - smoothstep(0.275, 0.285, mr));
    col += vec3(0.6, 0.55, 0.8) * hkRays(p, moonP, t, 16.0) * 0.20;
    vec3 silver = vec3(0.85, 0.88, 0.95);
    vec3 violet = hsv2rgb(vec3(fract(0.76 + hue), 0.55, 1.0));
    vec3 ink = mix(silver, violet, uD6);

    // tela anclada arriba a la izquierda
    vec2 c = vec2(-uAspect * 0.55, 0.42);
    vec2 q = p - c;
    float r = length(q);
    float a = atan(q.y, q.x);
    // historia: rafagas de viento sacuden la tela cada tanto
    float windE = hkEvent(4.0, 43.0, 7.0);
    float breeze = (0.010 + windE * 0.03) * sin(t * (0.8 + windE * 3.0) + r * 3.0);
    float spokes = 14.0 + floor(uD1 * 14.0);
    float rings = 12.0 + floor(uD2 * 16.0 + uDensity * 6.0);
    float pxr = 1.0 / uResH;
    // anillos: espiral con comba entre radios, vibran con el golpe
    float seg = a * spokes / TAU;
    // comba clasica de telarana: entre dos radios el hilo cuelga hacia el centro
    float between = 1.0 - pow(abs(fract(seg) - 0.5) * 2.0, 2.0);
    float sag = (0.55 / rings) * between;
    float ringIdx = floor((r + sag) * rings);
    float vib = hit * (0.004 + uD4 * 0.016) * sin(ringIdx * 2.3 + t * 30.0);
    float rr = (r + sag + vib + breeze) * rings;
    float ringD = abs(fract(rr) - 0.5) / rings;
    float spokeD = abs(fract(seg + 0.5) - 0.5) * TAU / spokes * r;
    float webMask = smoothstep(1.65, 1.2, r) * smoothstep(0.02, 0.06, r);
    float lineW = 1.2 * pxr;
    float thread = (1.0 - smoothstep(lineW, lineW * 2.5, ringD)) +
                   (1.0 - smoothstep(lineW, lineW * 2.5, spokeD));
    thread = clamp(thread, 0.0, 1.0) * webMask;
    col += ink * thread * (0.65 + backlight * 0.9);
    // rocio en los cruces
    vec2 cell = vec2(fract(seg + 0.5) - 0.5, fract(rr) - 0.5);
    vec2 cid = vec2(floor(seg + 0.5), floor(rr));
    float hasDew = step(0.72 - uD5 * 0.4, hash21(cid));
    float dew = exp(-dot(cell * vec2(spokes * r * 0.6, 1.0), cell * vec2(spokes * r * 0.6, 1.0)) * 40.0);
    float twinkle = 0.5 + 0.5 * sin(t * 3.0 + hash21(cid + 3.0) * 20.0);
    col += ink * dew * hasDew * webMask * (0.4 + twinkle * 0.6 + high * 1.5) * (0.4 + uD5);

    // hilo y arana
    float sx = uAspect * 0.15;
    // historia: cada ~67 s la arana baja hasta casi tocar la camara
    float descend = hkEvent(3.0, 67.0, 9.0);
    float drop = 0.25 + 0.30 * sin(t * 0.35) + descend * 0.6;
    vec2 sp = vec2(sx, 0.75 - drop);
    float silk = abs(p.x - sx - 0.004 * sin(p.y * 20.0 + t)) ;
    float silkM = (1.0 - smoothstep(pxr, pxr * 2.5, silk)) * step(sp.y, p.y);
    col += ink * silkM * 0.7;
    float size = (0.36 + uD3 * 0.26) * (1.0 + descend * 1.4);
    vec2 aq = (p - sp) / size;
    aq.x += 0.05 * sin(t * 1.1);
    float sd = hwSpider(aq, t, hit * 0.8) * size;
    float spider = 1.0 - smoothstep(-0.002, 0.002, sd);
    col = mix(col, vec3(0.01, 0.005, 0.01), spider);
    col += ink * edgeLine(sd, 1.4) * 0.6;
    // pelos de la arana: borde difuso con ruido
    float fuzz = (1.0 - smoothstep(0.0, 0.012 + 0.01 * noise21(aq * 60.0), sd)) * (1.0 - spider);
    col = mix(col, vec3(0.01), fuzz * 0.8);
    // brillo del abdomen
    col += vec3(0.5, 0.45, 0.6) * exp(-dot(aq - vec2(-0.06, -0.05), aq - vec2(-0.06, -0.05)) * 90.0) * spider * 0.6;
    // LOCURA: un enjambre de aranitas cruza la pantalla con el golpe
    float swarm = hit * smoothstep(0.3, 0.9, loco);
    if (swarm > 0.01) {
        vec2 g = p * 2.8 + vec2(uRTime * 0.9, -uRTime * 0.4);
        vec2 gid = floor(g);
        vec2 gf = fract(g) - 0.5 - (hash22(gid) - 0.5) * 0.5;
        float on = step(1.0 - swarm * 0.6, hash21(gid + 4.0));
        float r = length(gf);
        float ang = atan(gf.y, gf.x) + sin(uRTime * 30.0 + hash21(gid) * 9.0) * 0.15;
        float legs = (1.0 - smoothstep(0.03, 0.08, abs(sin(ang * 4.0)) * r * 2.0)) * step(r, 0.42) * step(0.10, r);
        float bod = 1.0 - smoothstep(0.13, 0.16, length(gf / vec2(1.0, 1.3)));
        col = mix(col, vec3(0.005), max(bod, legs * 0.9) * on);
    }
    // ojitos rojos
    vec2 eq = vec2(abs(aq.x) - 0.045, aq.y - 0.29);
    col += vec3(1.0, 0.1, 0.05) * (1.0 - smoothstep(0.018, 0.03, length(eq))) * (0.7 + hit);

    return vec4(hkFinish(col, uv, vec3(0.4, 0.3, 0.7)), 1.0);
}
