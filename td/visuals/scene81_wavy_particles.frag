// ===============================================================
// SCENE - WAVY PARTICLES
// Filamentos ondulados cian y violeta sobre negro.
// Referencia: https://www.youtube.com/watch?v=CZe_pBAyreU
// Una pasada analitica, sin POPs, feedback ni nube de puntos.
// Solo uTime mueve las ondas; en silencio quedan quietas.
//
// @D1: amplitud de las ondas
// @D2: ancho de las cintas
// @D3: cantidad de filamentos
// @D4: separacion vertical
// @D5: contraste cian/violeta
// @D6: brillo del halo
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    if (abs(p.x) > 1.90 || abs(p.y) > 1.12)
        return vec4(0.0, 0.0, 0.0, 1.0);

    float t = uTime * (0.12 + uSpeed * 0.28);
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float amount = 72.0 + uD3 * 87.0 + uDensity * 34.0;
    float width = 0.045 + uD2 * 0.075;
    float spread = 0.26 + uD4 * 0.16;
    float wave = 0.10 + uD1 * 0.15;
    float haloStrength = 0.07 + uD6 * 0.11;
    float hue = audioHue(uHue, uMid * 0.012);
    vec3 cyan = hsv2rgb(vec3(fract(hue + 0.50), 0.84, 1.0));
    vec3 violet = hsv2rgb(vec3(fract(hue + 0.74), 0.76, 1.0));
    vec3 col = vec3(0.0);

    for (int i = 0; i < 4; i++) {
        float id = float(i);
        float base = (id - 1.5) * spread;
        float phase = p.x * (2.8 + id * 0.37) + id * 1.72;
        float ridge = base + wave * sin(phase + t * (0.66 + id * 0.12));
        ridge += (0.037 + uChaos * 0.032) *
                 sin(p.x * (7.2 + id * 0.63) - t * 0.36 + id * 2.37);
        float q = p.y - ridge;
        float envelope = 1.0 - smoothstep(width * 0.58, width * 1.53, abs(q));
        float stripe = abs(sin(q * amount + p.x * (9.0 + id * 2.4) + id));
        float filament = pow(1.0 - stripe, 7.0);
        float fleck = noise21(vec2(p.x * (144.0 + amount * 0.15),
                                   q * (170.0 + amount)) + id * 29.0);
        float particles = smoothstep(0.73, 0.92, fleck) * envelope;
        float edge = exp(-abs(abs(q) - width * 0.69) /
                         (0.008 + uD2 * 0.005));
        float glow = exp(-abs(q) / (width * 1.8));
        float tint = clamp(0.36 + q / max(width, 0.01) * 0.42 +
                           uD5 * 0.22, 0.0, 1.0);
        vec3 ink = mix(cyan, violet, tint);
        float light = envelope * (filament * 0.46 + particles * 0.36) +
                      edge * 0.46 + glow * haloStrength;
        col += ink * light * (0.78 + kick * 0.32);
        col += vec3(0.81, 0.93, 1.0) * particles * 0.27;
    }

    col = audioLift(col, uBass * 0.22 + uHigh * 0.12);
    return vec4(col, 1.0);
}
