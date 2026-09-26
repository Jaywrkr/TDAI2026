// ===============================================================
// SCENE - PLANT TRAILS
// Tallos verdes finos con brotes anaranjados, violeta y blanco.
// Referencia: https://www.youtube.com/watch?v=Bbc1iiXc2_o
// El tutorial usa POPs, atributos y trails. Aqui cada pixel consulta
// una fibra analitica: una pasada GLSL sin particulas ni historial.
// El reloj musical se congela en silencio; no hay zoom automatico.
//
// @D1: cantidad de tallos
// @D2: curvatura de los tallos
// @D3: rango de alturas
// @D4: longitud de los brotes
// @D5: variedad naranja y violeta
// @D6: brillo de tallos y puntas
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.35;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float count = 54.0 + uDensity * 42.0 + uD1 * 68.0;
    float cellW = 2.0 * uAspect / count;

    // El desplazamiento se evalua antes de seleccionar la fibra: cada
    // pixel consulta una sola planta, incluso al variar Density.
    float growth = smoothstep(-0.95, 0.55, p.y);
    float bend = (0.009 + uD2 * 0.105) * growth *
                 (sin(p.y * 2.9 + p.x * 1.6 + t * 0.20) +
                  0.28 * sin(p.y * 6.8 - t * 0.12));
    float id = floor((p.x - bend + uAspect) / cellW);
    float jitter = mix(0.22, 0.78, hash21(vec2(id, 17.0)));
    float xSeed = -uAspect + (id + jitter) * cellW;
    float dx = p.x - (xSeed + bend);
    float plantOn = step(0.17, hash21(vec2(id, 91.0))) *
                   (1.0 - smoothstep(0.77, 1.30, abs(xSeed)));

    float h = hash21(vec2(id, 47.0));
    float tall = hash21(vec2(id, 72.0));
    float head = -0.42 + h * (0.86 + uD3 * 0.38) +
                 step(0.87, tall) * 0.15;
    head += (uChaos - 0.5) * (tall - 0.5) * 0.20;
    float stemVisible = smoothstep(-1.0, -0.72, p.y) *
                        (1.0 - smoothstep(head - 0.015,
                                          head + 0.012, p.y));
    float stem = exp(-abs(dx) / (0.0018 + uD6 * 0.0015)) *
                 stemVisible * plantOn;
    float stemHalo = exp(-abs(dx) / 0.011) *
                     stemVisible * plantOn;

    // El brote es una capsula vertical con extremo blanco.
    float budLen = (0.042 + uD4 * 0.090 + kick * 0.015) *
                   mix(0.68, 1.38, hash21(vec2(id, 112.0)));
    float by = head - p.y;
    float budRegion = step(0.0, by) * (1.0 - step(budLen, by));
    float taper = 0.30 + 0.70 * sin(PI * clamp(by / budLen, 0.0, 1.0));
    float budRadius = (0.003 + uD4 * 0.008) * taper;
    float bud = (1.0 - smoothstep(budRadius,
                                  budRadius + 0.004, abs(dx))) *
                budRegion * plantOn;
    float tip = exp(-dot(vec2(dx * 115.0, (p.y - head) * 105.0),
                         vec2(dx * 115.0, (p.y - head) * 105.0))) * plantOn;

    float greenH = audioHue(fract(uHue + 0.355), uMid * 0.012);
    float orangeH = audioHue(fract(uHue + 0.055), uMid * 0.012);
    float goldH = audioHue(fract(uHue + 0.105), uMid * 0.012);
    float violetH = audioHue(fract(uHue + 0.77), uMid * 0.012);
    vec3 green = hsv2rgb(vec3(greenH, 0.80, 0.73));
    vec3 orange = hsv2rgb(vec3(orangeH, 0.89, 1.0));
    vec3 gold = hsv2rgb(vec3(goldH, 0.76, 1.0));
    vec3 violet = hsv2rgb(vec3(violetH, 0.58, 1.0));
    float colorSeed = hash21(vec2(id, 134.0));
    vec3 warm = mix(orange, gold, smoothstep(0.29, 0.74, colorSeed));
    vec3 budColor = mix(warm, violet,
                        smoothstep(0.08, 0.82, colorSeed) * uD5);
    vec3 col = green * (stem * (0.30 + uD6 * 0.46) +
                        stemHalo * 0.07);
    col += budColor * bud *
           (0.59 + uD6 * 0.54 + kick * 0.48);
    col += mix(budColor, vec3(1.0), 0.72) * tip *
           (0.35 + uD6 * 0.94 + kick * 0.33);
    col = audioLift(col, uBass * 0.25 + uHigh * 0.18);
    return vec4(col, 1.0);
}
