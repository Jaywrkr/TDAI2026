// ===============================================================
// SCENE 90 - THE SHORE
// Referencia: https://www.youtube.com/watch?v=bBbyMkzTNpg
// Cascada de lineas azules que desemboca en oleaje de filamentos.
// Una pasada GLSL con patrones continuos, sin cientos de lineas TOP.
// Solo uTime mueve las ondas; sin musica queda inmovil.
//
// @D1: densidad de los filamentos del oleaje
// @D2: altura de las olas
// @D3: irregularidad de las lineas
// @D4: ancho de la cascada
// @D5: mezcla azul y blanco
// @D6: halo de la espuma
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.275;
    float kick = max(uKick, uBeat * 0.65) * uAudioamt;
    float wave = sin(p.x * 2.8 - t * 0.65) * 0.65 +
                 sin(p.x * 5.9 + t * 0.38) * 0.25 +
                 sin(p.x * 11.7 - t * 0.24) * 0.10;
    float ridgeY = 0.05 + wave * (0.055 + uD2 * 0.115 + kick * 0.025);
    float ridgeDist = abs(p.y - ridgeY);
    float shoreMask = 1.0 - smoothstep(-0.04, 0.09, p.y - ridgeY);
    float depth = clamp((ridgeY - p.y) / 1.08, 0.0, 1.0);

    // Muchos contornos en una evaluacion analitica, con deformacion suave.
    float warp = sin(p.x * 3.1 + depth * 5.2 - t * 0.31) *
                 (0.35 + uD3 * 0.90 + uChaos * 0.45);
    warp += sin(p.x * 8.5 - depth * 9.2 + t * 0.18) *
            (0.17 + uD3 * 0.34);
    float frequency = 51.0 + uD1 * 61.0 + uDensity * 24.0;
    float phase = depth * frequency + p.x * 30.0 + warp * 5.0;
    float strands = pow(max(0.0, 1.0 - abs(sin(phase))), 15.0);
    float waveBands = 0.53 + 0.47 * sin(p.x * 5.0 + depth * 13.0 - t * 0.27);
    float surface = strands * shoreMask * (0.46 + waveBands * 0.65) *
                    (1.0 - depth * 0.57);
    float foam = exp(-pow(ridgeDist / (0.022 + uD6 * 0.040), 2.0)) *
                 (0.45 + uD6 * 0.42 + kick * 0.27);

    // Las hebras verticales se apagan en la cresta y se recogen al centro.
    float fallX = p.x + 0.023 * sin(p.y * 5.3 + t * 0.37 + p.x * 7.0);
    float fallWidth = 0.25 + uD4 * 0.43;
    float fallMask = exp(-pow(fallX / fallWidth, 4.0)) *
                     smoothstep(0.02, 0.22, p.y - ridgeY);
    float fallPhase = fallX * (72.0 + uDensity * 40.0);
    float fallLines = pow(max(0.0, 1.0 - abs(sin(fallPhase))), 6.0);
    float fallGlow = exp(-pow(fallX / (fallWidth * 0.70), 2.0)) * 0.12;
    float fall = fallMask * (fallLines * 1.12 + fallGlow);

    float hue = audioHue(uHue, uMid * 0.008);
    vec3 blue = hsv2rgb(vec3(fract(hue + 0.63), 0.79, 1.0));
    vec3 pale = vec3(0.77, 0.88, 1.0);
    vec3 ink = mix(blue, pale, uD5 * 0.54);
    vec3 col = ink * (surface * 1.15 + fall * 1.25 + foam * 0.77);
    float key = exp(-pow((p.x - mix(-1.2, 1.2, uKeypos)) / 0.10, 2.0));
    col += pale * (surface + foam) * key * uKeypulse * 0.72;
    col = audioLift(col, uBass * 0.15 + uHigh * 0.12);
    return vec4(col, 1.0);
}
