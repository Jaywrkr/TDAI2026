// ===============================================================
// HALLOWEEN 14 - LUNA DE SANGRE Y CUERVOS
// Luna roja enorme detras de las ramas de un arbol muerto, con cuervos
// posados que giran la cabeza y otros que cruzan volando.
// Speed mueve las nubes, el vuelo y las ramas con el viento. El golpe
// espanta a los cuervos posados (saltan un poco, cada uno a su tiempo);
// el bajo hace latir la luna.
//
// @D1: cantidad de cuervos volando
// @D2: tamano de la luna
// @D3: cuanto se mueven las ramas
// @D4: cuervos posados
// @D5: rojo de la luna (cobre <-> sangre)
// @D6: nubes
// ===============================================================

float hwSegC(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// Cuervo posado mirando a un lado: cuerpo, cabeza, pico y cola.
float hwCrow(vec2 p, float headTurn) {
    float body = length((p - vec2(0.0, 0.0)) / vec2(0.22, 0.30)) - 1.0;
    body *= 0.22;
    float head = length(p - vec2(0.05 * headTurn, 0.34)) - 0.11;
    vec2 bq = p - vec2(0.05 * headTurn + 0.10 * headTurn, 0.33);
    float beak = max(abs(bq.y) - 0.035 + abs(bq.x) * 0.25, abs(bq.x) - 0.10);
    float tail = max(abs(p.x + 0.06 * headTurn) - 0.06, abs(p.y + 0.38) - 0.14);
    return min(min(body, head), min(beak, tail));
}

// Cuervo volando, alas en V que aletean.
float hwFlyer(vec2 p, float flap) {
    float ax = abs(p.x);
    float y = p.y - flap * 0.5 * ax + 0.25 * ax * ax;
    float wing = max(abs(y) - 0.06 * (1.0 - ax), ax - 0.55);
    float body = length(p / vec2(0.18, 0.07)) - 1.0;
    return min(wing, body * 0.07);
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.006);

    vec3 moonC = mix(hsv2rgb(vec3(fract(0.05 + hue), 0.75, 1.0)),
                     hsv2rgb(vec3(fract(0.995 + hue), 0.95, 1.0)), uD5);
    vec3 col = mix(moonC * 0.10, vec3(0.008, 0.002, 0.004), smoothstep(-0.8, 1.0, p.y));

    vec2 mc = vec2(-uAspect * 0.15, 0.10);
    float R = 0.55 + uD2 * 0.30;
    float mr = length(p - mc);
    float crater = mr < R + 0.02 ? fbm((p - mc) * 3.5 / R + 2.0, 3, 0.55) : 0.5;
    float disk = 1.0 - smoothstep(R - 0.004, R + 0.004, mr);
    float pulse = 1.0 + bass * 0.25;
    float eclipse = hkEvent(4.0, 127.0, 14.0);
    col += moonC * exp(-max(mr - R, 0.0) * 3.0) * 0.30 * pulse;
    // eclipse: una sombra cruza el disco y deja solo el anillo rojo
    float shadow = 1.0 - smoothstep(R * 0.96, R * 1.0, length(p - mc - vec2(mix(-2.2, 2.2, hkEventPhase(4.0, 127.0, 14.0)) * R, 0.0)));
    col = mix(col, moonC * (0.60 + 0.45 * crater) * (0.85 + 0.25 * pulse) * (1.0 - shadow * eclipse * 0.92), disk);
    col += moonC * hkRays(p, mc, t, 12.0) * 0.25 * (1.0 - disk);
    float cl = fbm(vec2(p.x * 0.8 - t * 0.04, p.y * 3.0), 3, 0.5);
    col = mix(col, col * 0.3, smoothstep(0.50, 0.82, cl) * (0.3 + uD6 * 0.7));

    // arbol muerto desde la derecha, ramas que se mecen
    float sway = (0.02 + uD3 * 0.06) * sin(t * 0.7);
    vec2 base = vec2(uAspect * 0.95, -1.0);
    float tree = abs(p.x - base.x - 0.1 * (p.y + 1.0) * (p.y + 1.0) * 0.2) - 0.09 + (p.y + 1.0) * 0.03;
    tree = max(tree, p.y - 0.4);
    float branches = 1e3;
    vec2 perch[4];
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 a = vec2(base.x - 0.05 - fi * 0.02, -0.35 + fi * 0.22);
        float len = 1.1 - fi * 0.15;
        vec2 b = a + vec2(-len, 0.15 + 0.10 * sin(fi * 2.0)) + vec2(0.0, sway * (1.0 + fi * 0.5));
        float d = hwSegC(p, a, b) - mix(0.028, 0.006, clamp(dot(p - a, b - a) / dot(b - a, b - a), 0.0, 1.0));
        // ramita
        vec2 c = mix(a, b, 0.6);
        vec2 e = c + vec2(-0.25, 0.22 - fi * 0.05) + vec2(0.0, sway);
        d = min(d, hwSegC(p, c, e) - 0.008);
        branches = min(branches, d);
        perch[i] = mix(a, b, 0.35 + 0.15 * fi);
    }
    float sil = min(tree, branches);

    // cuervos posados sobre las ramas
    float crows = 1e3;
    float nPerch = 1.0 + floor(uD4 * 3.0);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        if (fi >= nPerch) break;
        float jump = hit * step(0.4, fract(fi * 0.37 + floor(uRTime * 2.0) * 0.13)) * 0.06;
        float turn = sign(sin(t * 0.5 + fi * 2.1));
        vec2 q = (p - perch[i] - vec2(0.0, 0.14 + jump)) / 0.42;
        crows = min(crows, hwCrow(q, turn) * 0.42);
    }
    // cuervos volando
    // locura: con el golpe sale volando una bandada entera
    // historia: cada ~63 s pasa una bandada grande; cada ~2 min eclipse
    float flockE = hkEvent(3.0, 63.0, 8.0);
    float nF = min(2.0 + floor(uD1 * 6.0 + hit * loco * 6.0 + flockE * 6.0), 12.0);
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        if (fi >= nF) break;
        float h1 = fract(sin(fi * 12.98) * 43758.5);
        float h2 = fract(sin(fi * 78.23) * 1234.5);
        float x = mix(uAspect + 0.4, -uAspect - 0.4, fract(h1 + t * (0.03 + h2 * 0.03)));
        float y = 0.1 + h2 * 0.8 + 0.06 * sin(t * 0.9 + fi);
        float s = 0.20 + 0.12 * h2;
        vec2 q = (p - vec2(x, y)) / s;
        // lejos: distancia aproximada y seguir (sin saltos que dibujen
        // circulos en el borde de luz)
        if (length(q) > 0.8) { crows = min(crows, (length(q) - 0.55) * s); continue; }
        crows = min(crows, hwFlyer(q, sin(t * 6.0 + fi * 1.7)) * s);
    }
    float all = min(sil, crows);
    float m = 1.0 - smoothstep(-0.002, 0.002, all);
    col = mix(col, vec3(0.006, 0.0, 0.002), m);
    col += moonC * (1.0 - smoothstep(0.0, 2.4 / uResH, abs(all))) * disk * 0.6;
    // ojos rojos de los cuervos posados
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        if (fi >= nPerch) break;
        float turn = sign(sin(t * 0.5 + fi * 2.1));
        vec2 ep = perch[i] + vec2(0.0, 0.14) + vec2(0.07 * turn, 0.36 * 0.42) * vec2(1.0, 1.0);
        col += vec3(1.0, 0.05, 0.02) * exp(-dot(p - ep, p - ep) * 9000.0) * (1.0 + hit);
    }
    return vec4(hkFinish(col, uv, vec3(0.6, 0.05, 0.05)), 1.0);
}
