// ===============================================================
// SCENE - GEOMETRIC FRACTALS
// Columnas ambar y celdas repetidas con franjas de sombra y color.
// Referencia: https://www.youtube.com/watch?v=8-lD2MTsfLA
// El tutorial usa transformacion, mosaico, ruido y feedback. Aqui se
// aproxima el aspecto con tres escalas de celdas en una pasada GLSL;
// no hay bucle de feedback ni textura de historial.
// El reloj musical congela la imagen en silencio. No hay zoom global.
//
// @D1: anchura de las columnas
// @D2: densidad de franjas horizontales
// @D3: presencia de escalas fractales
// @D4: distorsion de las celdas
// @D5: acentos cian y violeta
// @D6: brillo del ambar
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.10 + uSpeed * 0.26);
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float ax = abs(p.x);
    float warp = (0.004 + uChaos * 0.008 + uD4 * 0.022) *
                 (sin(p.y * 12.0 + t * 0.22) +
                  0.42 * sin(p.y * 35.0 - t * 0.15));
    float x = ax + warp;
    float y = p.y + 0.005 * sin(ax * 14.0 + t * 0.12);

    // Tres escalas recuerdan las copias encadenadas del feedback.
    // Se evalua una celda por escala, sin multiples samples de imagen.
    float cells = 0.0;
    float rails = 0.0;
    float weight = 1.0;
    float scale = 1.0;
    for (int i = 0; i < 3; i++) {
        vec2 grid = vec2((5.0 + uDensity * 5.0) * scale,
                         (7.0 + uD2 * 7.0) * scale);
        vec2 c = abs(fract(vec2(x, y) * grid +
                     vec2(0.10, 0.31) * float(i)) - 0.5);
        float column = 1.0 - smoothstep(0.20 + uD1 * 0.09,
                                       0.29 + uD1 * 0.09, c.x);
        float row = 1.0 - smoothstep(0.23, 0.34, c.y);
        float edge = 1.0 - smoothstep(0.01, 0.075,
                      min(abs(c.x - 0.39), abs(c.y - 0.38)));
        float chip = mix(0.53, 1.25,
                         hash21(floor(vec2(x, y) * grid)));
        cells += column * row * chip * weight;
        rails += edge * column * weight;
        scale *= 1.78;
        weight *= 0.38 + uD3 * 0.31;
    }

    // La matriz no llena todo: hay huecos anchos entre columnas y
    // un vacio oscuro central, como en la salida del tutorial.
    float columnGate = smoothstep(-0.23, 0.38,
                       sin(x * (11.0 + uDensity * 5.0) +
                           0.14 * sin(y * 23.0)));
    float scan = 0.20 + 0.80 * smoothstep(-0.28, 0.24,
                 sin(y * (55.0 + uD2 * 72.0) + x * 2.0));
    float slit = exp(-pow(p.x * 4.2, 2.0)) *
                 exp(-pow((p.y - 0.07) * 2.8, 2.0));
    float lit = (cells * 1.06 + rails * 0.45) *
                (0.33 + columnGate * 0.67) * scan *
                (1.0 - slit * 0.88);
    float fineLine = 1.0 - smoothstep(0.015, 0.14,
                     abs(sin(y * 168.0 + warp * 13.0)));
    lit += fineLine * columnGate * cells * 0.12;

    float goldH = audioHue(fract(uHue + 0.095), uMid * 0.012);
    float amberH = audioHue(fract(uHue + 0.055), uMid * 0.012);
    vec3 gold = hsv2rgb(vec3(goldH, 0.89, 1.0));
    vec3 amber = hsv2rgb(vec3(amberH, 0.91, 1.0));
    float goldMix = smoothstep(-0.30, 0.56,
                    sin(x * 6.0 + y * 1.9 + t * 0.08));
    vec3 col = mix(amber, gold, goldMix) * lit *
               (0.69 + uD6 * 1.08 + kick * 0.32) *
               (0.75 + 0.27 * smoothstep(-0.9, 0.9, y));

    // Los acentos frios ocupan solo algunas celdas cerca del centro.
    float accentCell = hash21(floor(vec2(x * 15.0, y * 11.0)));
    float accent = smoothstep(0.75, 0.94, accentCell) *
                   exp(-ax * 1.8) * cells * uD5;
    vec3 cold = hsv2rgb(vec3(fract(uHue + 0.54 +
                        0.27 * step(0.88, accentCell)), 0.82, 1.0));
    col = mix(col, cold * (0.22 + lit * 0.9), accent * 0.85);
    col = audioLift(col, uBass * 0.35 + uHigh * 0.12);
    return vec4(col, 1.0);
}
