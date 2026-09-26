// ===============================================================
// SCENE - SPECTRAL VEIL
// Velos blancos translucidos que se pliegan sobre fondo negro.
// Referencia: https://www.youtube.com/watch?v=YD53eo5znuU
//
// Tres capas de hebras analiticas, un solo campo de ruido de dos
// octavas y una sola pasada GLSL. Sin particulas, feedback ni raymarch.
// El reloj del rig se inmoviliza cuando la entrada de audio esta muda.
//
// @D1: anchura de los velos
// @D2: brillo de los bordes
// @D3: cantidad de hebras finas
// @D4: turbulencia de los pliegues
// @D5: tinte frio de la luz blanca
// @D6: brillo general del tejido
// ===============================================================

float veilLayer(vec2 p, float t, float id, float field) {
    float angle = -0.95 + id * 0.70;
    vec2 q = rot2(angle) * p;
    q.x += sin(id * 2.4) * 0.17;
    q.y += sin(id * 2.1) * 0.06;
    float bend = sin(q.y * (3.1 + id) + id * 1.8 - t * 0.21) * 0.18;
    bend += sin(q.y * 7.3 - id * 2.1 + t * 0.13) * 0.055;
    bend += (field - 0.5) * (0.07 + uD4 * 0.23 + uChaos * 0.08);
    float axis = q.x - bend;
    float width = 0.095 + uD1 * 0.19 +
                  0.075 * sin(q.y * 2.5 + id * 2.4 + t * 0.10);
    width = max(width, 0.04);
    float span = smoothstep(-0.92, -0.60, q.y) *
                 (1.0 - smoothstep(0.55, 0.97, q.y));
    float sheet = 1.0 - smoothstep(width * 0.55, width * 1.12,
                                   abs(axis));
    float edge = edgeLine(abs(axis) - width, 0.80 + uD2 * 0.82);
    float crease = edgeLine(axis - width * 0.35 *
                           sin(q.y * 5.0 + id * 2.0), 0.62);
    float phase = axis * (27.0 + uDensity * 23.0 + uD3 * 37.0) +
                  q.y * (9.0 + id * 3.0) + field * 7.0;
    float fibers = 1.0 - smoothstep(0.015, 0.14, abs(sin(phase)));
    float diffuse = exp(-abs(axis) * 11.0) * 0.055;
    return span * (sheet * (0.055 + fibers * 0.21) +
                   edge * (0.21 + uD2 * 0.44) +
                   crease * 0.17 + diffuse * 1.4);
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.42;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float field = fbm(p * 2.35 + vec2(t * 0.055, -t * 0.07), 2);
    float weave = 0.0;
    for (int i = 0; i < 3; i++) {
        weave += veilLayer(p, t, float(i), field);
    }
    float h = audioHue(fract(uHue + 0.56), uMid * 0.012);
    vec3 white = hsv2rgb(vec3(h, 0.03 + uD5 * 0.18, 1.0));
    float accent = smoothstep(0.16, 0.72, weave);
    vec3 col = white * weave * (0.78 + uD6 * 1.25) *
               (1.0 + kick * accent * 0.65);
    col = audioLift(col, uBass * 0.60 + uHigh * 0.15);
    return vec4(col, 1.0);
}
