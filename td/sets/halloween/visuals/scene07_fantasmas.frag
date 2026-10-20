// ===============================================================
// HALLOWEEN 07 - FANTASMAS
// Sabanas fantasmales translucidas que flotan en un pasillo de niebla,
// con el borde ondulando y un brillo frio por dentro.
// Speed los hace flotar y ondular. Los medios agitan el borde de abajo
// de cada uno (con su fase); el golpe hace que se asomen: brillan y se
// agrandan un instante, cada uno a su tiempo.
//
// @D1: cantidad de fantasmas
// @D2: transparencia
// @D3: ondulacion del borde
// @D4: brillo interior
// @D5: color (blanco frio <-> verde espectral)
// @D6: niebla
// ===============================================================

// Fantasma de ~1 de alto, base ondulada en y = -0.5.
float hwGhost(vec2 p, float t, float wave, float seed) {
    float head = length(p - vec2(0.0, 0.18)) - 0.30;
    float w = 0.30 + 0.06 * (p.y < 0.18 ? (0.18 - p.y) : 0.0);
    float body = max(abs(p.x) - w, p.y - 0.18);
    float hem = -0.48 + wave * 0.07 * sin(p.x * 18.0 + t * 4.0 + seed)
              + 0.03 * sin(p.x * 7.0 - t * 2.0 + seed * 2.0);
    body = max(body, hem - p.y);
    return min(head, body);
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.008);

    vec3 bgA = hsv2rgb(vec3(fract(0.58 + hue), 0.70, 0.10));
    vec3 bgB = hsv2rgb(vec3(fract(0.70 + hue), 0.60, 0.02));
    vec3 col = mix(bgA, bgB, smoothstep(-0.8, 1.0, p.y) + 0.3 * abs(p.x) / uAspect);
    float fog = fbm(vec2(p.x * 1.0 - t * 0.04, p.y * 2.0 + t * 0.02), 3, 0.55);
    col += vec3(0.10, 0.12, 0.16) * smoothstep(0.35, 0.85, fog) * (0.4 + uD6 * 1.0);

    // rayos de luz frios que entran desde arriba (ventana alta)
    col += vec3(0.30, 0.40, 0.55) * hkRays(p, vec2(-uAspect * 0.3, 1.3), t, 10.0) * 0.8;
    vec3 cold = vec3(0.80, 0.90, 1.0);
    vec3 spectral = hsv2rgb(vec3(fract(0.36 + hue), 0.60, 1.0));
    vec3 gc = mix(cold, spectral, uD5);

    // historia: cada acto cambia cuantos hay; cada ~59 s uno pasa volando
    // muy cerca de la camara; cada ~83 s se apagan y reaparecen
    float flyBy = hkEvent(3.0, 59.0, 6.0);
    float vanish = hkEvent(4.0, 83.0, 4.0);
    float n = min(3.0 + floor(uD1 * 4.0 + uDensity * 1.0 + hkActVal(5.0) * 2.0), 6.0);
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        if (fi >= n) break;
        float h1 = fract(sin(fi * 12.989 + 1.0) * 43758.5);
        float h2 = fract(sin(fi * 78.233 + 2.0) * 12345.6);
        float depth = 0.55 + 0.55 * h2;
        float x = mix(-uAspect * 0.85, uAspect * 0.85, fract(h1 + t * 0.012 * (h2 - 0.5)));
        float y = -0.05 + 0.45 * (h2 - 0.5) + 0.07 * sin(t * (0.7 + h1 * 0.5) + fi * 2.3);
        float peek = hit * step(0.45, fract(h1 * 7.0 + h2 * 3.0));
        // locura: se abalanzan hacia la camara gritando
        float rush = hit * loco * step(0.5, fract(h2 * 5.0 + floor(uRTime * 2.0) * 0.37));
        float s = (0.62 + 0.14 * h1) * depth * (1.0 + peek * 0.10 + rush * 1.2);
        if (i == 0) {   // el que pasa volando cerca de la camara
            float fp = hkEventPhase(3.0, 59.0, 6.0);
            x = mix(x, mix(-uAspect - 1.4, uAspect + 1.4, fp), step(0.01, flyBy));
            s *= 1.0 + flyBy * 1.6;
        }
        vec2 q = (p - vec2(x, y)) / s;
        if (length(q) > 1.15) continue;     // fuera del fantasma y su halo
        q.x += 0.06 * sin(q.y * 3.0 + t * 1.3 + fi);   // se mece
        float wave = 0.4 + uD3 * 1.2 + mid * 1.5;
        float d = hwGhost(q, t, wave, fi * 3.7) * s;
        float body = 1.0 - smoothstep(-0.004, 0.004, d);
        // brillo interior: mas denso arriba, se desvanece hacia el borde
        float inner = exp(-max(-d, 0.0) * 4.0);
        float density = (0.35 + 0.45 * smoothstep(-0.6, 0.3, q.y)) * (1.0 - uD2 * 0.6) * (1.0 - vanish * step(0.5, hash21(vec2(fi, floor(uRTime * 6.0)))));
        float glow = exp(-max(d, 0.0) * 18.0) * 0.35;
        // ojos y boca oscuros
        vec2 ep = vec2(abs(q.x) - 0.11, q.y - 0.22);
        float eyes = 1.0 - smoothstep(0.045, 0.06, length(ep / vec2(0.8, 1.3)));
        float mouth = 1.0 - smoothstep(0.05, 0.065, length((q - vec2(0.0, 0.04)) / vec2(0.7 + rush * 0.4, 1.0 + peek * 0.8 + rush * 2.5)));
        float holes = max(eyes, mouth) * body;
        float lum = (0.85 + uD4 * 0.70 + peek * 0.9) * depth;
        vec3 g = gc * lum;
        col = mix(col, col * 0.4 + g * (0.6 + 0.6 * (1.0 - inner)), body * density);
        col = mix(col, col * 0.15, holes * 0.9);
        col += gc * glow * lum * (1.0 - body);
    }
    col = audioLift(col, uHigh * 0.10);
    return vec4(hkFinish(col, uv, vec3(0.3, 0.6, 0.8)), 1.0);
}
