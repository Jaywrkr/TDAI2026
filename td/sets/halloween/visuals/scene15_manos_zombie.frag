// ===============================================================
// HALLOWEEN 15 - MANOS DE ZOMBIE
// Manos huesudas que salen de la tierra de una tumba, se abren y se
// cierran, bajo una luz verde enfermiza y niebla baja.
// Speed hace que suban y se muevan los dedos. El golpe hace que se
// estiren de golpe (cada una con su retraso); el bajo levanta la luz
// verde que sale de la tierra.
//
// @D1: cantidad de manos
// @D2: cuanto salen de la tierra
// @D3: cuanto se abren los dedos
// @D4: estiron con el golpe
// @D5: luz (verde enfermizo <-> rojo)
// @D6: tierra que salta
// ===============================================================

float hwSegZ(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// Mano abierta hacia arriba, base en 0. 'open' separa los dedos.
float hwHand(vec2 p, float open, float curl) {
    float arm = max(abs(p.x + 0.03 * sin(p.y * 6.0)) - 0.10 + p.y * 0.02, -p.y - 0.02);
    arm = max(arm, p.y - 0.75);
    float palm = length((p - vec2(0.0, 0.85)) / vec2(0.18, 0.16)) - 1.0;
    float d = min(arm, palm * 0.16);
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float a = mix(-0.55, 0.55, fi / 4.0) * (0.4 + open * 1.1);
        vec2 root = vec2(mix(-0.13, 0.13, fi / 4.0), 0.95);
        if (i == 0) { root = vec2(-0.17, 0.80); a = -0.9 - open * 0.4; }
        float len = (i == 0) ? 0.20 : (0.26 + 0.06 * (1.0 - abs(fi - 2.0) * 0.5));
        vec2 dir = vec2(sin(a), cos(a));
        vec2 mid = root + dir * len * 0.55;
        vec2 dir2 = vec2(sin(a + curl * (0.9 + fi * 0.1)), cos(a + curl * (0.9 + fi * 0.1)));
        vec2 tip = mid + dir2 * len * 0.50;
        d = min(d, hwSegZ(p, root, mid) - 0.034);
        d = min(d, hwSegZ(p, mid, tip) - 0.026);
        // nudillo
        d = min(d, length(p - mid) - 0.040);
    }
    return d;
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = clamp(max(uKick, uBeat * 0.7), 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    vec3 light = mix(hsv2rgb(vec3(fract(0.27 + hue), 0.80, 1.0)),
                     hsv2rgb(vec3(fract(0.99 + hue), 0.90, 1.0)), uD5);
    vec3 col = mix(light * 0.08, vec3(0.005, 0.008, 0.006), smoothstep(-0.7, 1.0, p.y));

    float groundY = -0.55 + 0.04 * sin(p.x * 2.3);
    float n = 3.0 + floor(uD1 * 5.0);
    float handsD = 1e3;
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        if (fi >= n) break;
        float h1 = fract(sin(fi * 12.989 + 3.0) * 43758.5);
        float h2 = fract(sin(fi * 78.233 + 1.0) * 1234.5);
        float x = mix(-uAspect * 0.85, uAspect * 0.85, (fi + 0.5) / n) + (h1 - 0.5) * 0.2;
        float rise = (0.45 + uD2 * 0.45) * (0.6 + 0.4 * sin(t * (0.25 + h2 * 0.2) + fi * 1.3) * 0.5 + 0.2);
        float stretch = hit * (0.05 + uD4 * 0.20) * step(0.35, fract(h1 * 5.0 + floor(uRTime * 2.0) * 0.21));
        float s = 0.42 + 0.20 * h2;
        vec2 base = vec2(x, groundY - s * 1.0 + (rise + stretch) * s * 1.2);
        vec2 q = (p - base) / s;
        q = rot2((h1 - 0.5) * 0.5) * q;
        if (abs(q.x) > 0.8 || q.y > 1.6) {
            handsD = min(handsD, (max(abs(q.x) - 0.6, q.y - 1.4)) * s);
            continue;
        }
        float open = clamp(0.3 + uD3 * 0.7 + 0.25 * sin(t * (1.2 + h1) + fi), 0.0, 1.2);
        float curl = 0.2 + 0.6 * (0.5 + 0.5 * sin(t * (1.5 + h2) + fi * 2.0));
        handsD = min(handsD, hwHand(q, open, curl) * s);
    }
    float handM = (1.0 - smoothstep(-0.002, 0.002, handsD)) * step(groundY, p.y);
    // piel muerta iluminada desde abajo
    float under = smoothstep(groundY + 0.6, groundY, p.y);
    vec3 skin = vec3(0.10, 0.12, 0.08) + light * 0.30 * under;
    skin *= 0.7 + 0.3 * noise21(p * 40.0);
    col = mix(col, skin, handM);
    col += light * (1.0 - smoothstep(0.0, 3.0 / uResH, abs(handsD))) * step(groundY, p.y) * (0.25 + 0.35 * under);

    // tierra
    float soil = fbm(p * vec2(6.0, 10.0), 4, 0.6);
    float groundM = 1.0 - smoothstep(groundY - 0.004, groundY + 0.004, p.y);
    vec3 dirt = vec3(0.035, 0.025, 0.018) * (0.5 + soil);
    col = mix(col, dirt, groundM);
    // luz que sale de la tierra
    float glowL = exp(-abs(p.y - groundY) * 7.0);
    col += light * glowL * (0.12 + bass * 0.45 + hit * 0.25);
    // terrones que saltan con el golpe
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 g = vec2(p.x * 18.0, (p.y - groundY) * 10.0 - hit * 2.0 * (fi + 1.0));
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float alive = step(0.95 - uD6 * 0.20, hash21(id + fi * 3.0)) * step(groundY, p.y) * step(p.y, groundY + 0.35);
        col = mix(col, dirt * 2.0 + light * 0.10, (1.0 - smoothstep(0.10, 0.18, length(f))) * alive * hit);
    }
    // niebla baja
    float fog = fbm(vec2(p.x * 1.5 - t * 0.05, p.y * 4.0), 4, 0.5);
    col = mix(col, light * 0.35, smoothstep(0.45, 0.85, fog) * exp(-pow((p.y - groundY - 0.05) / 0.15, 2.0)) * 0.6);

    col *= vignette(uv, 0.40);
    return vec4(col, 1.0);
}
