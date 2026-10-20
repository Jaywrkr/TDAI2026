// ===============================================================
// HALLOWEEN 04 - MURCIELAGOS Y CASTILLO
// Bandada de murcielagos que cruza una luna enorme sobre la silueta de
// un castillo. Ventanas encendidas en las torres.
// Speed mueve la bandada y el aleteo. El golpe dispersa a los
// murcielagos (cada uno hacia su lado) y hace parpadear las ventanas;
// el bajo enciende el halo de la luna. Historia: cada ~61 s cruza una
// bandada enorme, cada ~53 s relampaguea y cada ~2 min la luna sangra.
//
// @D1: cantidad de murcielagos
// @D2: tamano de la luna
// @D3: velocidad del aleteo
// @D4: cuanto se dispersan con el golpe
// @D5: color de la luna (palida <-> sangre)
// @D6: luz de las ventanas
// ===============================================================

float hwBox2(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Murcielago de ~1 de envergadura. flap -1..1.
float hwBat(vec2 p, float flap) {
    float ax = abs(p.x);
    float body = length(p / vec2(0.07, 0.13)) - 1.0;
    body *= 0.07;
    // orejas
    vec2 ep = vec2(ax - 0.035, p.y - 0.13);
    float ear = max(abs(ep.x) * 2.2 + ep.y - 0.06, -ep.y);
    body = min(body, ear);
    // ala: borde superior arqueado, inferior festoneado; gira con el aleteo
    float y = p.y - flap * 0.35 * ax;
    float top = 0.07 + 0.10 * sin(ax * 4.2) - 0.22 * ax * ax;
    float span = 0.52;
    float thick = 0.20 * (1.0 - ax / span) + 0.05;
    float scallop = 0.05 * abs(sin(ax * PI * 3.0 / span));
    float bottom = top - thick + scallop;
    float wing = max(max(y - top, bottom - y), max(ax - span, 0.04 - ax));
    return min(body, wing);
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.01);

    // cielo
    vec3 col = mix(hsv2rgb(vec3(fract(0.70 + hue), 0.75, 0.20)),
                   hsv2rgb(vec3(fract(0.66 + hue), 0.85, 0.02)),
                   smoothstep(-0.6, 1.0, p.y));
    // estrellas
    vec2 sg = floor(p * 90.0);
    float star = step(0.993, hash21(sg)) * (0.4 + 0.6 * sin(t * 2.0 + hash21(sg + 1.0) * 30.0));
    col += vec3(0.8, 0.8, 1.0) * max(star, 0.0) * smoothstep(-0.2, 0.6, p.y);

    // luna
    vec2 mc = vec2(uAspect * 0.18, 0.18);
    float moonR = 0.42 + uD2 * 0.30;
    vec2 mp = p - mc;
    float mr = length(mp);
    vec3 pale = vec3(1.0, 0.93, 0.78);
    vec3 blood = hsv2rgb(vec3(fract(0.015 + hue), 0.85, 1.0));
    // historia: la luna cambia de color segun el acto y a veces sangra
    float bloodE = hkEvent(4.0, 117.0, 20.0);
    vec3 moonC = mix(pale, blood, clamp(uD5 + hkActVal(5.0) * 0.25 + bloodE, 0.0, 1.0));
    float crater = mr < moonR + 0.01 ? fbm(mp * 4.0 / moonR + 5.0, 3, 0.55) : 0.5;
    float disk = 1.0 - smoothstep(moonR - 0.004, moonR + 0.004, mr);
    float limb = sqrt(max(1.0 - pow(mr / moonR, 2.0), 0.0));
    col += moonC * exp(-max(mr - moonR, 0.0) * 4.0) * (0.25 + bass * 0.45);
    col = mix(col, moonC * (0.55 + 0.45 * limb) * (0.80 + 0.35 * crater), disk);
    // rayos de luna y relampago de locura
    col += moonC * hkRays(p, mc, t, 14.0) * 0.18 * (1.0 - disk);
    float zap = max(hit * smoothstep(0.4, 0.9, loco), hkEvent(6.0, 53.0, 6.0) * step(0.85, noise21(vec2(uRTime * 6.0, 1.0))));
    float bslot = floor(uRTime * 1.5);
    float bd = hkBolt(p, (hash21(vec2(bslot, 2.0)) - 0.5) * uAspect * 1.6, 1.05, -0.55, bslot * 5.0, 0.4);
    col += vec3(0.8, 0.75, 1.0) * (exp(-bd * 160.0) + exp(-bd * 20.0) * 0.3) * zap * 1.5;
    col += vec3(0.5, 0.45, 0.8) * zap * 0.15;
    // nubes finas
    float cl = fbm(vec2(p.x * 0.9 - t * 0.03, p.y * 4.0), 3, 0.5);
    col = mix(col, col * 0.35, smoothstep(0.55, 0.80, cl) * 0.8);

    // castillo
    float ground = -0.62;
    float castle = p.y - (ground + 0.03 * sin(p.x * 3.0));
    float x = p.x + uAspect * 0.35;
    float towers = 1e3;
    float windows = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float tx = (fi - 2.0) * 0.30 + 0.05 * sin(fi * 3.1);
        float th = 0.35 + 0.30 * fract(sin(fi * 12.9) * 43.7);
        float tw = 0.07 + 0.03 * fract(sin(fi * 7.1) * 13.3);
        vec2 q = vec2(x - tx, p.y - ground);
        float tower = hwBox2(q - vec2(0.0, th * 0.5), vec2(tw, th * 0.5));
        // techo conico
        vec2 r = q - vec2(0.0, th);
        float roof = max(abs(r.x) * 2.4 + r.y - tw * 2.6, -r.y);
        towers = min(towers, min(tower, roof));
        // ventanas
        vec2 wq = q - vec2(0.0, th * 0.70);
        float win = max(abs(wq.x) - tw * 0.22, abs(wq.y) - 0.025);
        float lit = step(0.35, hash21(vec2(fi, floor(t * 0.6 + fi))));
        windows += (1.0 - smoothstep(-0.003, 0.003, win)) * mix(1.0, lit, 0.6);
    }
    float wall = hwBox2(vec2(x, p.y - ground) - vec2(0.0, 0.10), vec2(0.62, 0.10));
    // almenas
    float crenel = max(wall, -(step(0.5, fract(x * 14.0)) - 0.5) * 0.02 + (p.y - ground - 0.17));
    float solid = min(min(towers, crenel), castle);
    float mask = 1.0 - smoothstep(-0.003, 0.003, solid);
    col = mix(col, vec3(0.008, 0.006, 0.014), mask);
    vec3 winC = vec3(1.0, 0.65, 0.25);
    float flick = 0.75 + 0.25 * sin(t * 9.0) - hit * 0.5 * step(0.5, hash21(vec2(floor(t * 4.0), 3.0)));
    col += winC * windows * (0.9 + uD6 * 1.2) * flick;
    // halo de las ventanas en el aire humedo
    col += winC * 0.04 * (0.5 + uD6) * flick * exp(-abs(p.y - ground - 0.35) * 4.0) * smoothstep(0.9, 0.2, abs(x));

    // bandada: tres capas de profundidad en grilla. Cada pixel solo mira
    // el murcielago de SU celda en cada capa (3 en total, no 24): el
    // costo ya no depende de cuantos murcielagos hay.
    float swarmE = hkEvent(3.0, 61.0, 9.0);
    float presence = clamp(0.30 + uD1 * 0.45 + uDensity * 0.10 + swarmE * 0.45, 0.0, 0.95);
    float bats = 1e3;
    for (int L = 0; L < 3; L++) {
        float fl = float(L);
        float depth = 1.25 - fl * 0.35;
        float cs = 0.62 * depth;                       // celda
        vec2 q0 = p + vec2(t * (0.10 + 0.05 * fl) * depth, 0.0);
        vec2 cid = floor(q0 / cs);
        if (cid.y * cs < -0.75 || cid.y * cs > 1.1) continue;
        vec2 h = hash22(cid + fl * 13.0);
        if (hash21(cid + fl * 7.0 + 0.5) > presence) continue;
        vec2 center = (cid + 0.5 + (h - 0.5) * 0.35) * cs;
        center.y += 0.06 * sin(t * (0.8 + h.x) + h.y * 9.0);
        // dispersion con el golpe: cada uno se aleja de la luna a su modo
        vec2 world = center - vec2(t * (0.10 + 0.05 * fl) * depth, 0.0);
        vec2 away = normalize(world - mc + 1e-4);
        center += (away + (h - 0.5)) * hit * (0.03 + uD4 * 0.10) * depth;
        // locura: se vienen encima de la camara (limitado a la celda)
        float scale = 0.17 * depth * (1.0 + hit * loco * 0.6 * h.x + swarmE * 0.25);
        vec2 bq = (q0 - center) / scale;
        if (dot(bq, bq) > 0.6) { bats = min(bats, (length(bq) - 0.55) * scale); continue; }
        float flap = sin(t * (9.0 + uD3 * 12.0) * (0.8 + h.y * 0.4) + h.x * 20.0);
        bq = rot2((h.x - 0.5) * 0.5) * bq;
        bats = min(bats, hwBat(bq, flap) * scale);
    }
    float batMask = 1.0 - smoothstep(-0.0015, 0.0015, bats);
    col = mix(col, vec3(0.0), batMask);
    // borde rojizo cuando el murcielago pasa delante de la luna
    col += moonC * (1.0 - smoothstep(0.0, 2.4 / uResH, abs(bats))) * disk * 0.5;

    return vec4(hkFinish(col, uv, vec3(0.35, 0.3, 0.8)), 1.0);
}
