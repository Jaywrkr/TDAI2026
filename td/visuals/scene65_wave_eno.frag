// ===============================================================
// SCENE - WAVE ENO
// Hebras violetas, puntos blancos y reflejo tenue sobre negro.
// Referencia: https://www.youtube.com/watch?v=lDSLWmBagqA
// Captura del usuario: columnas irregulares agrupadas en olas.
//
// Cada pixel consulta una sola fibra por fase horizontal. La escena
// no crea SOPs, particulas ni feedback: una pasada GLSL analitica.
// El tiempo compartido deja de avanzar en silencio.
//
// @D1: cantidad de fibras
// @D2: curvatura de las fibras
// @D3: longitud de las estelas
// @D4: complejidad de las olas
// @D5: intensidad del reflejo
// @D6: brillo de puntos y hebras
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.13 + uSpeed * 0.30);
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float floorY = -0.68;
    float mirror = step(p.y, floorY);
    float y = mix(p.y, floorY * 2.0 - p.y, mirror);

    float bend = (0.018 + uD2 * 0.245) *
                 sin(y * 3.6 + p.x * 1.7 + t * 0.22) *
                 (0.25 + smoothstep(-0.42, 0.72, y) * 0.75);
    bend += mirror * 0.018 * sin(p.y * 86.0 + p.x * 7.0);
    float count = 94.0 + uDensity * 62.0 + uD1 * 82.0;
    float coord = (p.x - bend + uAspect) * count /
                  (2.0 * uAspect);
    float id = floor(coord);
    float local = fract(coord);
    float jitter = mix(0.31, 0.69, hash21(vec2(id, 17.3)));
    float line = 1.0 - smoothstep(0.05, 0.25,
                                   abs(local - jitter));

    float xSeed = ((id + 0.5) / count * 2.0 - 1.0) * uAspect;
    float wave = 0.31 * sin(xSeed * 3.2 + t * 0.17) +
                 (0.09 + uD4 * 0.29) *
                 sin(xSeed * 7.1 - t * 0.12) +
                 0.11 * sin(xSeed * 1.9 + t * 0.07);
    float head = -0.02 + wave +
                 (hash21(vec2(id, 42.7)) - 0.5) *
                 (0.17 + uChaos * 0.27);
    head = floorY + (head - floorY) * (0.57 + uD3 * 0.78);
    float visible = smoothstep(floorY - 0.02, floorY + 0.06, y) *
                    (1.0 - smoothstep(head - 0.025, head + 0.015, y));
    float group = smoothstep(0.23, 0.65,
                  0.50 + 0.29 * sin(xSeed * 2.4 + t * 0.10) +
                  0.21 * sin(xSeed * 5.6 - t * 0.08));
    visible *= group;

    float cellW = 2.0 * uAspect / count;
    float tipDist = length(vec2((local - jitter) * cellW,
                                 y - head));
    float tip = 1.0 - smoothstep(0.002, 0.009, tipDist);
    tip *= group;
    float beadId = floor((y - floorY) * 25.0);
    float beadY = floorY + (beadId + 0.5) / 25.0;
    float beads = step(0.86, hash21(vec2(id, beadId + 73.0))) *
                  (1.0 - smoothstep(0.002, 0.012, abs(y - beadY))) *
                  line * visible;

    float reflected = mix(1.0,
                    exp((p.y - floorY) * 6.0) * (0.14 + uD5 * 0.65),
                    mirror);
    float h = audioHue(fract(uHue + 0.76), uMid * 0.018);
    vec3 violet = hsv2rgb(vec3(h, 0.74, 1.0));
    vec3 white = mix(violet, vec3(1.0, 0.94, 1.0), 0.83);
    vec3 col = violet * line * visible *
               (0.28 + uD6 * 0.65);
    col += white * (tip * (0.62 + uD6 * 1.35 + kick * 0.42) +
                    beads * (0.23 + uD6 * 0.75));
    col *= reflected;
    col = audioLift(col, uBass * 0.50 + uHigh * 0.13);
    return vec4(col, 1.0);
}
