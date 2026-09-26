// ===============================================================
// SCENE 87 - ORGANIC STRUCTURE
// Referencia: https://www.youtube.com/watch?v=cnIK7aGHf6o
// Membrana de celdas irregulares y nervios cromados violetas.
// Una pasada GLSL; sin red de feedback ni geometria 3D.
// Solo uTime cambia los centros: en silencio queda inmovil.
//
// @D1: grosor de los nervios
// @D2: irregularidad de las celdas
// @D3: brillo especular del metal
// @D4: mezcla de reflejos azul y violeta
// @D5: oscuridad del interior de las celdas
// @D6: ancho del reflejo difuso
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float scale = 3.4 + uDensity * 3.2;
    vec2 g = p * scale;
    float t = uTime * (0.08 + uSpeed * 0.27);
    // Dobla los lados rectos de Voronoi en nervios de membrana.
    vec2 warp = vec2(sin(g.y * 1.15 + sin(g.x * 0.71) + t * 0.18),
                     sin(g.x * 1.22 - sin(g.y * 0.83) - t * 0.15));
    g += warp * (0.13 + uChaos * 0.17);
    vec2 id = floor(g);
    vec2 f = fract(g);
    float nearest = 10.0;
    float second = 10.0;
    float seed = 0.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 siteId = id + offset;
            vec2 randomPos = hash22(siteId);
            vec2 centerPos = mix(vec2(0.5), randomPos,
                                 0.50 + uD2 * 0.38 + uChaos * 0.12);
            centerPos += 0.10 * vec2(sin(t + randomPos.x * 6.283),
                                      cos(t * 0.77 + randomPos.y * 6.283));
            vec2 delta = offset + centerPos - f;
            float dist = dot(delta, delta);
            if (dist < nearest) {
                second = nearest;
                nearest = dist;
                seed = hash21(siteId + 21.7);
            } else if (dist < second) {
                second = dist;
            }
        }
    }

    float gap = sqrt(second) - sqrt(nearest);
    float thickness = 0.65 + uD1 * 0.85;
    float darkSeam = exp(-pow(gap / (0.018 * thickness), 2.0));
    float brightRim = exp(-pow((gap - 0.042 * thickness) /
                               (0.025 * thickness), 2.0));
    float wideMetal = exp(-pow((gap - 0.105 * thickness) /
                               (0.075 * thickness + uD6 * 0.050), 2.0));
    float fineGlint = exp(-pow((gap - 0.070 * thickness) /
                               (0.012 + uD3 * 0.015), 2.0));
    float cellShade = 0.20 + 0.16 * sin(seed * 16.0 + nearest * 7.0);

    float hue = audioHue(uHue, uMid * 0.010);
    vec3 purple = hsv2rgb(vec3(fract(hue + 0.73), 0.56, 1.0));
    vec3 blue = hsv2rgb(vec3(fract(hue + 0.58), 0.50, 1.0));
    vec3 iridescence = mix(purple, blue,
                           clamp(0.15 + uD4 * 0.70 + seed * 0.12, 0.0, 1.0));
    vec3 interior = mix(vec3(0.03, 0.035, 0.07),
                        iridescence * cellShade, 1.0 - uD5 * 0.75);
    vec3 col = interior;
    col += iridescence * wideMetal * (0.30 + uD6 * 0.43);
    col += mix(iridescence, vec3(0.92, 0.94, 1.0), 0.65) *
           brightRim * (0.42 + uD3 * 0.50);
    col += vec3(0.88, 0.91, 1.0) * fineGlint * (0.18 + uD3 * 0.45);
    col *= 1.0 - darkSeam * 0.78;

    float kick = max(uKick, uBeat * 0.6) * uAudioamt;
    col += iridescence * (brightRim + fineGlint) * kick * 0.25;
    float key = exp(-pow((uv.x - uKeypos) / 0.085, 2.0)) * uKeypulse;
    col += vec3(0.65, 0.75, 1.0) * brightRim * key * 0.55;
    col = audioLift(col, uBass * 0.14 + uHigh * 0.13);
    return vec4(col, 1.0);
}
