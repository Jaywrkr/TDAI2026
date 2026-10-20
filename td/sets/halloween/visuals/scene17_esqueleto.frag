// ===============================================================
// HALLOWEEN 17 - ESQUELETO BAILANDO
// Un esqueleto de huesos brillantes (tipo rayos X / neon) que baila
// sobre un piso que se enciende por baldosas.
// Speed marca el paso de baile. El golpe lo hace saltar y abrir los
// brazos (es el que mas "baila" con el bombo); el bajo enciende las
// baldosas; los medios mueven la cadera.
//
// @D1: tamano
// @D2: energia del baile
// @D3: grosor de los huesos
// @D4: salto con el golpe
// @D5: color (hueso <-> neon verde)
// @D6: piso de baldosas
// ===============================================================

float hwBone(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d = length(pa - ba * h) - r;
    // nudos en los extremos
    d = min(d, length(p - a) - r * 1.6);
    d = min(d, length(p - b) - r * 1.6);
    return d;
}

vec2 hwLimb(vec2 o, float len, float ang) {
    return o + vec2(sin(ang), -cos(ang)) * len;
}

vec4 render(vec2 uv) {
    vec2 p = hkPunch(hkShake(centered(uv)));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.008);

    vec3 boneC = mix(vec3(0.95, 0.92, 0.82), hsv2rgb(vec3(fract(0.33 + hue), 0.80, 1.0)), uD5);
    vec3 col = vec3(0.01, 0.006, 0.02);

    // piso de baldosas en perspectiva
    float floorY = -0.62;
    if (p.y < floorY) {
        float z = 1.0 / max(floorY - p.y + 0.05, 0.02);
        vec2 tq = vec2(p.x * z * 0.35, z * 0.6);
        vec2 tid = floor(tq);
        vec2 tf = fract(tq);
        float lit = step(0.55 - bass * 0.4, hash21(tid + floor(uRTime * 2.0)));
        float grid = smoothstep(0.0, 0.04, tf.x) * smoothstep(1.0, 0.96, tf.x) * smoothstep(0.0, 0.06, tf.y) * smoothstep(1.0, 0.94, tf.y);
        vec3 tc = hsv2rgb(vec3(fract(0.80 + hue + hash21(tid) * 0.25), 0.8, 1.0));
        col = tc * grid * (0.05 + lit * (0.35 + bass * 0.6)) * (0.35 + 0.65 * uD6) * smoothstep(-1.1, floorY, p.y) + vec3(0.01);
    }

    float s = 0.62 + uD1 * 0.28;
    // locura: baile poseido, los miembros se sacuden el doble
    float e = (0.4 + uD2 * 0.9) * (1.0 + hit * loco * 1.6);
    float beat = sin(t * 3.0);
    float jump = hit * (0.05 + uD4 * 0.20);
    vec2 hip = vec2(0.10 * sin(t * 1.5) * e + mid * 0.05 * sin(t * 6.0),
                    floorY + 0.88 * s + 0.04 * abs(beat) * e + jump);
    float lean = 0.10 * sin(t * 1.5) * e;
    vec2 neck = hip + vec2(sin(lean), cos(lean)) * 0.52 * s;
    vec2 head = neck + vec2(sin(lean * 1.5), cos(lean * 1.5)) * 0.16 * s;
    float r = (0.018 + uD3 * 0.014) * s;

    float d = 1e3;
    // columna y costillas
    d = min(d, hwBone(p, hip, neck, r));
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 c = mix(hip, neck, 0.45 + fi * 0.13);
        float w = (0.14 - abs(fi - 1.5) * 0.02) * s;
        vec2 pq = p - c;
        pq = rot2(-lean) * pq;
        float rib = abs(length(pq / vec2(1.0, 0.45)) - w) - r * 0.5;
        rib = max(rib, -pq.y - 0.02 * s);
        d = min(d, rib);
    }
    // pelvis
    vec2 pv = rot2(-lean) * (p - hip);
    d = min(d, abs(length(pv / vec2(1.0, 0.6)) - 0.10 * s) - r * 0.6);
    // craneo
    vec2 hq = p - head;
    float skull = length(hq / vec2(1.0, 1.1)) - 0.11 * s;
    float sockets = length(vec2(abs(hq.x) - 0.04 * s, hq.y + 0.005)) - 0.028 * s;
    float jaw = max(abs(hq.x) - 0.06 * s, abs(hq.y + 0.10 * s) - 0.035 * s);
    d = min(d, min(max(skull, -sockets), jaw));
    float eyeGlow = 1.0 - smoothstep(0.0, 0.01, sockets);

    // brazos: se abren con el golpe
    float armUp = hit * (0.8 + uD4 * 0.8);
    for (int sgn = -1; sgn <= 1; sgn += 2) {
        float sd = float(sgn);
        vec2 sh = neck + vec2(sd * 0.14 * s, -0.06 * s);
        float a1 = sd * (0.5 + 0.5 * e * sin(t * 3.0 + sd) + armUp);
        vec2 el = hwLimb(sh, 0.26 * s, a1);
        float a2 = a1 + sd * (0.6 + 0.6 * e * sin(t * 3.0 + 1.2 + sd));
        vec2 wr = hwLimb(el, 0.24 * s, a2);
        d = min(d, hwBone(p, sh, el, r));
        d = min(d, hwBone(p, el, wr, r * 0.9));
        // piernas
        vec2 hp = hip + vec2(sd * 0.08 * s, -0.02 * s);
        float l1 = sd * 0.10 + 0.45 * e * sin(t * 3.0 + (sd > 0.0 ? 0.0 : PI)) * 0.6;
        vec2 kn = hwLimb(hp, 0.40 * s, l1);
        vec2 ft = hwLimb(kn, 0.38 * s, l1 - abs(l1) * 0.8 * sd + 0.05 * sd);
        ft.y = max(ft.y, floorY);
        d = min(d, hwBone(p, hp, kn, r * 1.1));
        d = min(d, hwBone(p, kn, ft, r));
    }

    // foco cenital: cono de luz con polvo y circulo en el piso
    float coneW = 0.20 + (1.0 - (p.y - floorY) / 1.9) * 0.45;
    float cone = smoothstep(coneW, coneW * 0.5, abs(p.x - hip.x * 0.5)) * step(floorY, p.y);
    col += vec3(0.35, 0.40, 0.55) * cone * 0.12 * (0.7 + 0.3 * fbm(p * 4.0 + t * 0.1, 3));
    col += vec3(0.5, 0.55, 0.7) * exp(-pow((p.x - hip.x * 0.5) / 0.5, 2.0)) * exp(-pow((p.y - floorY + 0.03) / 0.06, 2.0)) * 0.35;
    float bone = 1.0 - smoothstep(-0.0015, 0.0015, d);
    float glow = exp(-max(d, 0.0) * 40.0) * 0.45 + exp(-max(d, 0.0) * 8.0) * 0.12;
    // locura: destello de rayos X (el esqueleto se invierte un instante)
    float xray = hit * step(0.6, loco) * step(0.6, noise21(vec2(floor(uRTime * 14.0), 5.0)));
    vec3 bc = mix(boneC, vec3(0.6, 0.9, 1.0), xray);
    col += bc * (bone * 1.1 + glow * (0.7 + hit * 0.6));
    col = mix(col, vec3(1.0) - col * 0.8, xray * 0.6);
    col += hsv2rgb(vec3(fract(0.02 + hue), 0.9, 1.0)) * eyeGlow * (0.6 + bass * 0.8);
    // sombra en el piso
    col *= 1.0 - 0.6 * exp(-pow((p.x - hip.x) / (0.35 * s), 2.0)) * exp(-pow((p.y - floorY + 0.02) / 0.03, 2.0));

    return vec4(hkFinish(col, uv, vec3(0.3, 0.6, 0.4)), 1.0);
}
