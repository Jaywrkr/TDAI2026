// ===============================================================
// SCENE - X-RAY VISION
// Silueta bilateral organica: borde verde, estratos azules y vacios.
// Referencia: https://www.youtube.com/watch?v=HJp-4ypmSAY
// El original usa particulas, feedback y ruido; esta version reduce la
// composicion a un campo analitico de una pasada sin media externa.
// El reloj uTime se detiene sin musica; no hay zoom global.
//
// @D1: anchura de los lobulos
// @D2: cantidad de lineas interiores
// @D3: definicion del borde verde
// @D4: irregularidad del contorno
// @D5: mezcla verde y azul
// @D6: intensidad de la luz
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.32;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;

    // Los dos lados comparten estructura, con diferencias internas.
    // La variacion temporal viene del reloj musical compartido.
    vec2 q = p;
    float broad = noise21(vec2(abs(q.x) * 3.8 + t * 0.08,
                               q.y * 3.8 - t * 0.05));
    float fine = noise21(q * (11.0 + uDensity * 6.0) +
                         vec2(-t * 0.13, t * 0.09));
    float wobble = (broad - 0.5) * (0.12 + uChaos * 0.10 +
                                    uD4 * 0.15);
    float y = q.y + wobble * 0.34;
    float upper = exp(-pow((y - 0.32) * 2.8, 2.0));
    float lower = exp(-pow((y + 0.32) * 3.4, 2.0));
    float waist = exp(-pow(y * 6.0, 2.0));
    float width = (0.24 + uD1 * 0.22) +
                  upper * (0.16 + uD1 * 0.15) +
                  lower * (0.11 + uD1 * 0.12) - waist * 0.14;
    width += 0.035 * sin(y * 18.0 + t * 0.16);
    float edge = abs(q.x) - width - wobble;
    float ax = abs(q.x);
    float roof = 0.46 + 0.33 * smoothstep(0.04, 0.44, ax) -
                 0.23 * smoothstep(0.50, 0.76, ax) +
                 (broad - 0.5) * 0.07;
    float floorDepth = 0.39 + 0.40 * smoothstep(0.02, 0.43, ax) -
                       0.23 * smoothstep(0.50, 0.76, ax) +
                       (broad - 0.5) * 0.07;
    float dist = max(edge, max(y - roof, -y - floorDepth));
    float inside = 1.0 - smoothstep(-0.014, 0.012, dist);

    // Halo estrecho y capas que muestran el volumen interior.
    float rimWidth = mix(0.060, 0.020, uD3);
    float rim = exp(-abs(dist) / rimWidth);
    float inner = inside * (1.0 - smoothstep(-0.19, -0.02, dist));
    float phase = (abs(q.x) / max(width, 0.12) * 0.75 +
                   y * 0.45 + broad * 0.30) *
                   (16.0 + uDensity * 8.0 + uD2 * 20.0);
    float strata = pow(max(0.0, sin(phase)), 11.0) * inside;
    float fractured = smoothstep(0.38, 0.70, fine) *
                      (0.50 + 0.50 * sin(q.x * 21.0 + y * 14.0 +
                                         broad * 9.0) *
                               sin(y * 27.0 - fine * 11.0));
    float fissure = 1.0 - smoothstep(0.01, 0.16,
                    abs(sin(q.x * 20.0 + y * 10.0 + broad * 10.0)));

    float greenH = audioHue(fract(uHue + 0.37), uMid * 0.012);
    float blueH = audioHue(fract(uHue + 0.64), uMid * 0.012);
    vec3 green = hsv2rgb(vec3(greenH, 0.90, 1.0));
    vec3 blue = hsv2rgb(vec3(blueH, 0.93, 0.95));
    vec3 col = blue * (inner * (0.15 + 0.29 * broad) +
                       strata * (0.20 + uD2 * 0.23));
    col += green * (rim * (0.47 + uD6 * 0.95 + kick * 0.42) +
                    fractured * inside * (0.10 + uD5 * 0.29));
    col += mix(blue, green, 0.45 + uD5 * 0.40) *
           inside * fine * (1.0 - fissure * 0.78) * 0.16;

    // Bruma muy tenue alrededor, calculada con el mismo campo.
    float halo = exp(-max(dist, 0.0) * 10.0) * (1.0 - inside);
    col += green * halo * (0.025 + uD6 * 0.045);
    col = audioLift(col, uBass * 0.32 + uHigh * 0.10);
    return vec4(col, 1.0);
}
