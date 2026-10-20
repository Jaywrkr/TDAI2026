// ===============================================================
// HALLOWEEN 03 - OJOS EN LA OSCURIDAD
// Pares de ojos de bestia que se abren y parpadean en la negrura, con
// pupila de gato y un brillo que se derrama en la niebla.
// Speed marca el ritmo de parpadeo y la mirada. El golpe abre de golpe
// mas pares de ojos (cada uno con su retraso); el bajo dilata el brillo
// del iris. Las pupilas siguen la ultima tecla del piano.
//
// @D1: cantidad de pares de ojos
// @D2: cuantos estan abiertos
// @D3: tamano de los ojos
// @D4: brillo del iris
// @D5: color (amarillo <-> rojo sangre)
// @D6: niebla iluminada
// ===============================================================

// Ojo almendrado: 'open' 0..1. Devuelve (mascara, iris, pupila).
vec3 hwEye(vec2 q, float open, vec2 look) {
    float lid = max(open, 0.001);
    vec2 a = vec2(q.x, q.y / lid);
    // almendra = interseccion de dos circulos
    float d = max(length(a - vec2(0.0, -0.55)), length(a - vec2(0.0, 0.55))) - 0.80;
    float mask = 1.0 - smoothstep(-0.02, 0.02, d);
    // Todo el ojo brilla (como ojos de gato con luz), mas fuerte al centro.
    vec2 ip = q - vec2(look.x * 0.18, look.y * 0.05);
    float iris = clamp(1.15 - length(ip * vec2(1.6, 2.6)), 0.0, 1.0);
    // pupila: rendija vertical, se abre un poco con la luz baja
    float pupil = 1.0 - smoothstep(0.75, 1.0, length(ip / vec2(0.055, 0.30)));
    return vec3(mask, iris * mask, pupil * mask);
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = clamp(max(uKick, uBeat * 0.75), 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.01);

    vec3 irisCol = mix(hsv2rgb(vec3(fract(0.13 + hue), 0.95, 1.0)),
                       hsv2rgb(vec3(fract(0.995 + hue), 1.0, 1.0)), uD5);

    // niebla de fondo
    float fog = fbm(p * 1.4 + vec2(t * 0.03, -t * 0.01), 4, 0.55);
    vec3 col = vec3(0.012, 0.008, 0.020) + vec3(0.03, 0.02, 0.05) * fog;

    float cells = 2.0 + floor(uD1 * 4.0 + uDensity * 2.0);
    vec2 g = p * cells * 0.5 + vec2(17.0, 3.0);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float glowSum = 0.0;

    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
        vec2 cid = id + vec2(float(i), float(j));
        vec2 h = hash22(cid);
        float present = step(0.42, hash21(cid + 9.1));
        if (present < 0.5) continue;
        vec2 center = vec2(float(i), float(j)) + (h - 0.5) * 0.45;
        vec2 q = (f - center) / (0.27 + uD3 * 0.14 + h.x * 0.06);
        if (abs(q.x) > 2.6 || abs(q.y) > 1.8) continue;
        // abierto: base por Detail, mas los que despierta el golpe
        float wake = smoothstep(0.38 - uD2 * 0.35, 0.58 - uD2 * 0.35, hash21(cid + 2.7));
        float kickWake = step(hash21(cid + 4.4), hit * (0.6 + uD2 * 0.4));
        float base = max(wake, kickWake);
        // parpadeo: cada par a su ritmo
        float bph = fract(t * (0.15 + h.y * 0.18) + h.x * 7.0);
        float blink = 1.0 - smoothstep(0.0, 0.03, bph) * (1.0 - smoothstep(0.03, 0.07, bph));
        float open = base * blink;
        if (open < 0.02) continue;
        vec2 look = vec2(mix(-1.0, 1.0, uKeypos), 0.2 * sin(t * 0.7 + h.y * 9.0));
        look.x = mix(sin(t * 0.5 + h.x * 11.0), look.x, uKeypulse);
        for (int s = -1; s <= 1; s += 2) {
            vec2 eq = q - vec2(float(s) * 0.55, 0.0);
            eq.x *= float(s);                  // espejo: rabillo hacia afuera
            eq = rot2(0.18) * eq;
            vec3 e = hwEye(eq, open, look * vec2(float(s), 1.0));
            float rad = 0.95 + uD4 * 0.6 + bass * 0.7 + hit * 0.35;
            vec3 hot = mix(irisCol, vec3(1.0, 0.95, 0.75), 0.35);
            vec3 eyeC = mix(irisCol * 0.35, hot, e.y) * rad;
            eyeC = mix(eyeC, vec3(0.01, 0.0, 0.0), e.z * 0.92);
            col = mix(col, eyeC, e.x);
            glowSum += exp(-dot(eq, eq) * 1.2) * open * rad;
        }
    }
    col += irisCol * glowSum * (0.10 + uD6 * 0.25) * (0.5 + fog);
    col *= vignette(uv, 0.40);
    return vec4(col, 1.0);
}
