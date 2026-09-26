// ===============================================================
// SCENE - FREQUENCY MODULATION
// Lineas de barrido cian que se pliegan y se comprimen en profundidad.
// Referencia: https://www.youtube.com/watch?v=CXRVWrM4HyY
// Captura del usuario: trazos finos turquesa y vacios oscuros.
//
// El tutorial desplaza scanlines con un mapa acumulado Hillis-Steele
// construido en TOPs. Aqui se aproxima el mismo campo continuo con
// senos y ruido de baja frecuencia, en una sola pasada GLSL.
//
// @D1: cantidad de lineas
// @D2: amplitud de los pliegues
// @D3: ondulacion fina de las lineas
// @D4: tamano de las zonas oscuras
// @D5: variacion entre azul y cian
// @D6: brillo de las lineas
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = uv;
    float t = uTime * (0.08 + uSpeed * 0.28);
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;

    // Un mapa acumulado aproximado: cada escala suma desplazamiento
    // horizontal a las scanlines. Ninguna escala el cuadro completo.
    float broad = sin(p.y * 8.2 + p.x * 2.0 - t * 0.32);
    float fold = sin(p.y * 16.6 - p.x * 3.1 + broad * 1.35 + t * 0.25);
    float fine = noise21(vec2(p.y * 10.5 + t * 0.12,
                              p.x * 2.2 + broad * 0.7)) - 0.5;
    vec2 center = (p - vec2(0.49, 0.52)) * vec2(2.4, 4.2);
    float lens = exp(-dot(center, center));
    float sway = (broad * 0.083 + fold * 0.058) *
                 (0.22 + uD2 * 1.28);
    sway += lens * (0.018 + uD2 * 0.045) *
            sin(p.x * 12.0 + p.y * 6.0 + t * 0.16);
    sway += fine * (0.015 + uD3 * 0.045);
    sway += kick * 0.028 * sin(p.y * 24.0 + p.x * 8.0);
    sway *= mix(0.28, 1.0, smoothstep(0.04, 0.78, p.x));

    // A la derecha se comprimen progresivamente, como en la captura.
    float warpedX = p.x + sway;
    float count = 23.0 + uDensity * 15.0 + uD1 * 18.0;
    float phase = warpedX * (count + p.x * (11.0 + uD1 * 18.0));
    float line = 1.0 - smoothstep(0.015, 0.11,
                                abs(fract(phase) - 0.5));

    // La modulacion corta fragmentos y crea las regiones oscuras que
    // cruzan el centro. No se encienden ni se mueven si el reloj para.
    float field = fbm(vec2(p.x * 2.2 + fold * 0.16,
                            p.y * 3.4 - t * 0.05), 3);
    float hole = smoothstep(0.32 + uD4 * 0.08,
                            0.47 + uD4 * 0.07, field);
    float band = 1.0 - 0.42 * smoothstep(0.49, 0.76,
                         sin(p.y * 9.8 + p.x * 5.0 + broad) * 0.5 + 0.5);
    vec2 cavityA = (p - vec2(0.48 + fine * 0.15, 0.43)) *
                    vec2(4.1, 6.8);
    vec2 cavityB = (p - vec2(0.63 + fine * 0.11, 0.77)) *
                    vec2(5.3, 8.2);
    float cavities = max(exp(-dot(cavityA, cavityA)),
                         exp(-dot(cavityB, cavityB)));
    float ink = line * (0.42 + hole * 0.58) * band *
                (1.0 - cavities * 0.86);

    float hue = audioHue(fract(uHue + 0.515), uMid * 0.018);
    vec3 cyan = hsv2rgb(vec3(hue, 0.82, 1.0));
    vec3 blue = hsv2rgb(vec3(fract(hue + 0.055), 0.91, 1.0));
    vec3 pigment = mix(cyan, blue,
                       (0.15 + uD5 * 0.62) * smoothstep(0.2, 0.8, field));
    vec3 background = vec3(0.002, 0.041, 0.051) *
                      (0.65 + field * 0.75);
    vec3 col = background + pigment * ink * (0.78 + uD6 * 1.10);
    col = audioLift(col, uBass * 0.65 + kick * 0.15 + uHigh * 0.08);
    return vec4(col, 1.0);
}
