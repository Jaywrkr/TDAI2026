// ===============================================================
// HALLOWEEN 10 - PORTAL INFERNAL
// Un anillo de fuego que gira sobre un vortice negro, rodeado por un
// circulo de runas que se encienden.
// Speed hace girar el vortice y subir las llamas. El bajo levanta las
// llamas del anillo; el golpe hace latir el anillo y enciende una tanda
// de runas (en otro orden cada vez); los medios mueven el remolino.
//
// @D1: tamano del portal
// @D2: altura de las llamas
// @D3: velocidad del remolino
// @D4: runas encendidas
// @D5: color del fuego (naranja <-> verde brujo)
// @D6: humo alrededor
// ===============================================================

// Runa procedural: trazos en una grilla de 3x3 elegidos por hash.
float hwRune(vec2 q, float seed) {
    float d = 1e3;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 a = floor(hash22(vec2(seed, fi)) * 3.0) - 1.0;
        vec2 b = floor(hash22(vec2(seed + 4.1, fi + 2.0)) * 3.0) - 1.0;
        if (a == b) b = -a;
        a *= 0.42; b *= 0.42;
        vec2 pa = q - a, ba = b - a;
        float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
        d = min(d, length(pa - ba * h));
    }
    return d;
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime;
    float rt = uRTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float hit = clamp(max(uKick, uBeat * 0.75), 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, mid * 0.008);

    float R = 0.48 + uD1 * 0.30;
    float r = length(p);
    float a = atan(p.y, p.x);

    vec3 fireA = mix(vec3(1.0, 0.35, 0.05), vec3(0.35, 1.0, 0.15), uD5);
    vec3 fireB = mix(vec3(1.0, 0.85, 0.40), vec3(0.85, 1.0, 0.55), uD5);
    fireA = hsv2rgb(vec3(fract(hue + (uD5 > 0.5 ? 0.30 : 0.04)), 0.95, 1.0)) * 0.5 + fireA * 0.5;

    // fondo y humo
    float smoke = fbm(vec2(a * 2.0, r * 3.0 - t * 0.2) + 4.0, 4, 0.55);
    vec3 col = vec3(0.012, 0.004, 0.006) + fireA * 0.05 * smoke * (0.4 + uD6 * 1.6) * smoothstep(2.0, 0.4, r);

    // vortice: espiral oscura dentro del anillo
    float swirlA = a + (2.5 / (r + 0.15)) * 0.35 + t * (0.4 + uD3 * 1.2) + mid * 0.6 * sin(r * 6.0);
    float spiral = 0.5 + 0.5 * sin(swirlA * 3.0 + r * 10.0);
    float insideM = 1.0 - smoothstep(R - 0.02, R + 0.01, r);
    vec3 vortex = mix(vec3(0.0), fireA * 0.18, pow(spiral, 3.0) * smoothstep(0.0, R, r));
    col = mix(col, vortex, insideM);

    // anillo de fuego: llamas en polares que suben hacia afuera
    float ringD = r - R;
    float flameH = 0.10 + uD2 * 0.22 + bass * 0.10;
    float fn = fbm(vec2(a * 6.0 + sin(a * 2.0), ringD * 8.0 - t * 2.4), 4, 0.6);
    float fn2 = noise21(vec2(a * 18.0, ringD * 20.0 - t * 4.0));
    float flame = smoothstep(flameH * (0.4 + fn), 0.0, ringD) * smoothstep(-0.05, 0.0, ringD);
    flame *= 0.7 + 0.5 * fn2;
    float beat = 1.0 + hit * 0.8;
    vec3 fire = mix(fireA, fireB, smoothstep(0.3, 1.0, flame)) * flame * 1.5 * beat;
    col += fire;
    // borde incandescente del anillo
    col += fireB * exp(-abs(ringD) * 70.0) * (0.8 + hit * 1.2);

    // circulo de runas
    float Rr = R + 0.20 + uD2 * 0.12;
    float nR = 14.0;
    float ang = a / TAU * nR;
    float slotI = floor(ang + 0.5);
    float local = (ang - slotI) * TAU / nR * Rr;
    vec2 rq = vec2(local, r - Rr) / 0.055;
    float rd = hwRune(rq, slotI + 3.0) * 0.055;
    float px = 2.0 / uResH;
    float rune = 1.0 - smoothstep(px * 0.6, px * 1.8, rd);
    float wave = floor(rt * 1.3);
    float on = step(1.0 - (0.20 + uD4 * 0.70), hash21(vec2(slotI, wave)));
    on = max(on, hit * step(0.5, hash21(vec2(slotI, wave + 7.0))));
    float runeGlow = exp(-rd * 120.0) * 0.5;
    col += fireB * (rune + runeGlow) * mix(0.10, 1.3, on) * step(abs(r - Rr), 0.07);
    // dos circulos finos que encierran las runas
    col += fireA * (1.0 - smoothstep(px * 0.5, px * 1.5, abs(r - Rr - 0.075))) * 0.6;
    col += fireA * (1.0 - smoothstep(px * 0.5, px * 1.5, abs(r - Rr + 0.075))) * 0.6;

    col *= vignette(uv, 0.30);
    return vec4(col, 1.0);
}
