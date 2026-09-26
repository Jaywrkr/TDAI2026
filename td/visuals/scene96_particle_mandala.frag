// ===============================================================
// SCENE 96 - PARTICLE MANDALA
// Referencia: https://www.youtube.com/watch?v=oSvO30HW12k
// Nube de puntos espejada en cunas radiales, con silueta de flor.
// Una pasada GLSL sin SOPs ni miles de instancias reales.
// uTime se detiene sin musica y no hay zoom automatico.
//
// @D1: densidad de puntos
// @D2: numero de sectores de simetria
// @D3: profundidad de los pliegues
// @D4: tamano de los puntos
// @D5: mezcla de colores frios y arcoiris
// @D6: luz del nucleo
// ===============================================================

float mandalaDots(vec2 q, float scale, float seed, float size) {
    vec2 grid = q * scale + seed;
    vec2 id = floor(grid);
    vec2 jitter = hash22(id + seed * 9.3);
    vec2 center = vec2(0.5) + (jitter - 0.5) * 0.65;
    float d = length(fract(grid) - center);
    float radius = (0.14 + size * 0.17) *
                   (0.66 + hash21(id + seed * 13.7) * 0.68);
    return 1.0 - smoothstep(radius - 0.045, radius + 0.045, d);
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    p *= 0.83;
    p.x *= 1.12;
    float r = length(p);
    if (r > 1.14) return vec4(0.0, 0.0, 0.0, 1.0);
    float a = atan(p.y, p.x);
    float sectors = 8.0 + floor(uD2 * 6.0 + 0.5);
    float wedge = TAU / sectors;
    float fold = abs(mod(a + wedge * 0.5, wedge) - wedge * 0.5);
    float t = uTime * 0.165;
    float kick = max(uKick, uBeat * 0.60) * uAudioamt;
    float pleat = (0.06 + uD3 * 0.12 + uChaos * 0.035) *
                  sin(r * 12.0 - fold * sectors * 3.0 + t * 0.42);
    vec2 q = vec2(cos(fold), sin(fold)) * r;
    q += vec2(pleat * 0.23, pleat * 0.14);

    float petals = 0.72 +
                   (0.09 + uD3 * 0.10) * cos(a * sectors) +
                   0.045 * cos(a * sectors * 2.0 + r * 8.0);
    float envelope = 1.0 - smoothstep(petals - 0.12,
                                       petals + 0.03, r);
    float inner = smoothstep(0.09, 0.28, r);
    float band = 0.55 + 0.45 * sin(r * 23.0 - fold * sectors * 4.0);
    float scatter = 0.48 + 0.52 * noise21(q * 13.0 + vec2(t * 0.15, 0.0));
    float shape = envelope * (0.75 + 0.25 * band) *
                  (0.70 + 0.30 * scatter);

    float scale = 80.0 + uD1 * 55.0 + uDensity * 28.0;
    float dots1 = mandalaDots(q + vec2(t * 0.002, 0.0),
                              scale, 2.1, uD4);
    float dots2 = mandalaDots(q + vec2(0.0, -t * 0.0015),
                              scale * 0.73, 8.7, uD4 * 0.8);
    float dotField = (dots1 * 1.10 + dots2 * 0.65) * shape;
    float glint = pow(dots1, 3.0) * shape;

    float hue = audioHue(uHue + r * 0.39 +
                         0.18 * sin(fold * sectors * 2.0),
                         uMid * 0.008);
    vec3 rainbow = hsv2rgb(vec3(fract(hue), 0.84, 1.0));
    vec3 ice = hsv2rgb(vec3(fract(uHue + 0.49 + r * 0.13),
                            0.44, 1.0));
    vec3 ink = mix(ice, rainbow, 0.12 + uD5 * 0.82);
    float ray = pow(max(0.0, 1.0 - abs(sin(fold * sectors * 3.0 +
                                           r * 25.0 + pleat * 13.0))),
                    12.0) * shape * inner;
    float center = exp(-r * (12.0 - uD6 * 8.0)) *
                   (0.05 + uD6 * 1.5);
    float key = exp(-pow((uv.x - uKeypos) / 0.075, 2.0)) * uKeypulse;
    vec3 col = ink * (dotField * (1.00 + uBright * 0.50 +
                                 kick * 0.30 + key * 0.30) +
                      ray * 0.19);
    col += vec3(0.85, 0.98, 1.0) *
           (glint * (0.16 + kick * 0.22) + center);
    col = audioLift(col, uBass * 0.12 + uHigh * 0.18);
    return vec4(col, 1.0);
}
