// ===============================================================
// SCENE 88 - AUDIO POPS
// Referencia: https://www.youtube.com/watch?v=XTIh2jwM_UY
// Nube compacta de puntos blancos y trazos brillantes reactivos.
// Aproximacion en una pasada GLSL; sin red POP ni acumulacion.
// Solo uTime anima la nube: sin sonido queda inmovil.
//
// @D1: tamano de los puntos
// @D2: largo de los trazos
// @D3: cantidad de puntos
// @D4: cantidad de trazos
// @D5: matiz azul de la luz
// @D6: halo de los trazos
// ===============================================================

float popsPoint(vec2 q, float grid, float seed, float size, float amount) {
    vec2 id = floor(q * grid);
    vec2 f = fract(q * grid);
    vec2 pos = hash22(id + seed);
    float dist = length(f - pos);
    float present = step(1.0 - amount, hash21(id + seed * 2.7));
    return exp(-dist * dist / (size * size)) * present *
           (0.28 + hash21(id + seed * 4.1) * 0.72);
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.27;
    float kick = max(uKick, uBeat * 0.70) * uAudioamt;
    float r = length(p);
    float envelope = exp(-pow(r / 0.74, 6.0));
    vec2 q = p + vec2(0.018 * sin(t * 0.37 + p.y * 3.1),
                       0.013 * cos(t * 0.29 + p.x * 2.7));

    float size = 0.11 + uD1 * 0.15;
    float amount = clamp(0.18 + uD3 * 0.37 + uDensity * 0.13, 0.0, 0.80);
    float points = popsPoint(q + vec2(t * 0.009, -t * 0.006),
                             73.0, 13.7, size, amount);
    points += popsPoint(q * 1.16 - vec2(t * 0.005, t * 0.008),
                        99.0, 48.3, size * 0.67, amount * 0.60) * 0.56;

    vec2 cell = floor(q * 13.0);
    vec2 f = fract(q * 13.0);
    vec2 start = hash22(cell + 7.1);
    float angle = hash21(cell + 31.4) * TAU;
    vec2 direction = vec2(cos(angle), sin(angle));
    float lengthPx = (0.23 + uD2 * 0.55) * (1.0 + kick * 0.65);
    vec2 a = f - start;
    float along = clamp(dot(a, direction) / lengthPx, 0.0, 1.0);
    float dist = length(a - direction * lengthPx * along);
    float keep = step(0.96 - uD4 * 0.42,
                      hash21(cell + 64.2));
    float stroke = exp(-dist * dist / 0.0013) *
                   sin(along * PI) * keep;
    float halo = exp(-dist * dist / (0.008 + uD6 * 0.022)) *
                 sin(along * PI) * keep;
    float flash = max(stroke * (0.60 + kick * 0.63), 0.0);

    vec3 white = vec3(0.89, 0.93, 1.0);
    vec3 blue = hsv2rgb(vec3(audioHue(uHue + 0.59, uMid * 0.008),
                             0.43, 1.0));
    vec3 lightColor = mix(white, blue, uD5 * 0.72);
    vec3 col = lightColor * envelope *
               (points * (2.20 + uHigh * uAudioamt * 0.35) +
                flash * 2.40 + halo * uD6 * 1.0);
    float key = exp(-pow((uv.x - uKeypos) / 0.065, 2.0)) * uKeypulse;
    col += lightColor * envelope * (points + stroke) * key * 0.75;
    col = audioLift(col, uBass * 0.12 + uHigh * 0.10);
    return vec4(col, 1.0);
}
