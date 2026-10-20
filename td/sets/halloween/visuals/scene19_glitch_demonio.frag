// ===============================================================
// HALLOWEEN 19 - GLITCH DEMONIACO
// Un rostro demoniaco con cuernos, hecho de lineas rojas, que se rompe
// en bloques de glitch, se duplica y se desplaza en canales de color.
// Speed hace respirar el rostro y mover el ruido. El golpe lo rompe en
// bloques (cada bloque se va para su lado); el bajo hace arder los ojos;
// los agudos agregan estatica.
//
// @D1: cantidad de lineas del rostro
// @D2: cuanto se rompe con el golpe
// @D3: separacion de color
// @D4: ojos
// @D5: color (rojo infierno <-> violeta)
// @D6: estatica
// ===============================================================

// Rostro: cabeza con cuernos, ceja en V, ojos, boca con colmillos.
float hwDemon(vec2 p) {
    float head = length(p / vec2(0.78, 1.0)) - 0.62;
    // cuernos: arcos que salen hacia arriba y afuera
    vec2 hq = vec2(abs(p.x) - 0.42, p.y - 0.52);
    float hr = length(hq - vec2(0.35, -0.10)) - 0.40;
    float horn = max(abs(hr) - 0.06 * (1.0 - clamp(hq.y / 0.5, 0.0, 1.0)), -hq.y);
    horn = max(horn, hq.x - 0.25);
    horn = max(horn, -(hq.x + 0.12));
    float d = min(head, horn);
    // ojos rasgados
    vec2 e = vec2(abs(p.x) - 0.22, p.y - 0.10 + abs(p.x) * 0.25);
    float eye = length(e / vec2(1.0, 0.35)) - 0.11;
    // boca con colmillos
    vec2 m = p - vec2(0.0, -0.30);
    float mouth = length(m / vec2(1.0, 0.35)) - 0.30;
    mouth = max(mouth, -m.y - 0.02 * 0.0);
    float fang = max(abs(abs(m.x) - 0.12) * 3.0 + m.y * 1.0 - 0.06, -m.y - 0.15);
    mouth = max(mouth, -fang);
    return max(d, -min(eye, mouth));
}

vec4 render(vec2 uv) {
    float t = uTime;
    float rt = uRTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = clamp(max(uKick, uBeat * 0.75), 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    vec3 red = mix(hsv2rgb(vec3(fract(0.995 + hue), 0.95, 1.0)),
                   hsv2rgb(vec3(fract(0.80 + hue), 0.80, 1.0)), uD5);

    // bloques de glitch: cada uno se desplaza distinto con el golpe
    vec2 blk = floor(uv * vec2(6.0, 14.0));
    float bh = hash21(blk + floor(rt * 8.0));
    float broken = step(1.0 - hit * (0.25 + uD2 * 0.7), bh);
    vec2 guv = uv + broken * (hash22(blk + floor(rt * 8.0)) - 0.5) * vec2(0.18, 0.03) * (0.5 + uD2);
    vec2 p = centered(guv);
    p *= 1.0 + 0.015 * sin(t * 1.3);           // respira

    float split = (0.003 + uD3 * 0.012) + hit * 0.02 + bass * 0.006;
    vec3 col = vec3(0.0);
    for (int c = 0; c < 3; c++) {
        float fc = float(c) - 1.0;
        vec2 q = p + vec2(fc * split * 2.0, 0.0);
        float d = hwDemon(q);
        // relleno de lineas horizontales (scanlines del rostro)
        float lines = 18.0 + floor(uD1 * 40.0);
        float ln = 0.5 + 0.5 * cos(q.y * lines * PI);
        float fill = (1.0 - smoothstep(-0.004, 0.004, d)) * pow(ln, 3.0);
        float outline = 1.0 - smoothstep(0.0, 3.0 / uResH, abs(d));
        float v = fill * 0.8 + outline * 1.2 + exp(-max(d, 0.0) * 25.0) * 0.12;
        if (c == 0) col.r += v;
        if (c == 1) col.g += v;
        if (c == 2) col.b += v;
    }
    // canal verde casi apagado: el rostro queda en la paleta, no blanco
    vec3 tint = red * dot(col, vec3(0.45, 0.2, 0.35)) + vec3(col.r - col.b, 0.0, col.b - col.r) * 0.25 * red;
    col = max(tint, 0.0);

    // ojos ardiendo
    vec2 e = vec2(abs(p.x) - 0.22, p.y - 0.10 + abs(p.x) * 0.25);
    float eye = length(e / vec2(1.0, 0.35)) - 0.11;
    float eyeF = 1.0 - smoothstep(-0.01, 0.01, eye);
    col += mix(red, vec3(1.0, 0.9, 0.6), 0.6) * eyeF * (0.6 + uD4 * 1.2 + bass * 1.2);
    col += red * exp(-max(eye, 0.0) * 12.0) * (0.15 + bass * 0.6) * uD4;

    // estatica y lineas de barrido
    float st = hash21(floor(uv * vec2(uResW, uResH) * 0.5) + floor(rt * 30.0));
    col += vec3(st) * (0.02 + uD6 * 0.12 + high * 0.10);
    col *= 0.85 + 0.15 * sin(uv.y * uResH * 1.2);
    col += red * broken * 0.06;

    col *= vignette(uv, 0.40);
    return vec4(col, 1.0);
}
