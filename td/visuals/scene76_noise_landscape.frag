// ===============================================================
// SCENE - NOISE LANDSCAPE
// Manchas cristalinas azules, violetas y rojas con aristas oscuras.
// Referencia: https://www.youtube.com/watch?v=PIoq2BFtMAc&t=249s
// @D1: escala de los parches
// @D2: deformacion del terreno
// @D3: dureza de los bordes
// @D4: facetas pequenas
// @D5: contraste cromatico
// @D6: zonas oscuras
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.06 + uSpeed * 0.19);
    float scale = 2.0 + uD1 * 2.2 + uDensity * 0.7;
    vec2 q = p * scale;
    vec2 drift = vec2(t * 0.23, -t * 0.17);
    float warpX = noise21(q * 0.55 + drift);
    float warpY = noise21(q * 0.55 - drift + vec2(7.1, 9.3));
    vec2 warped = q + (vec2(warpX, warpY) - 0.5) *
                      (1.0 + uD2 * 2.2 + uChaos * 0.7);
    float large = noise21(warped * 0.75 + drift * 0.25);
    float medium = noise21(warped * (1.65 + uD4 * 0.75));
    float fine = noise21(warped * 3.3 + vec2(4.2, 7.5));
    float field = large * 0.52 + medium * 0.35 + fine * 0.13;
    float hard = 0.05 + (1.0 - uD3) * 0.17;
    float warm = smoothstep(0.48 - hard, 0.48 + hard, field);
    float purple = smoothstep(0.35 - hard, 0.35 + hard,
                              medium + (large - 0.5) * 0.25);
    float fracture = abs(medium - 0.5) + abs(fine - 0.5) * 0.24;
    float shadow = smoothstep(0.05, 0.24 + uD6 * 0.16, fracture);
    float h = audioHue(uHue, uMid * 0.012);
    vec3 blue = hsv2rgb(vec3(fract(h + 0.64), 0.88, 0.87));
    vec3 violet = hsv2rgb(vec3(fract(h + 0.76), 0.85, 1.0));
    vec3 red = hsv2rgb(vec3(fract(h + 0.02), 0.91, 1.0));
    vec3 col = mix(blue, violet, purple);
    col = mix(col, red, warm * (0.47 + uD5 * 0.40));
    col *= (0.30 + medium * 0.87) * (0.42 + shadow * 0.64);
    col += vec3(0.16, 0.02, 0.04) *
           (1.0 - shadow) * (0.15 + uD6 * 0.18);
    col = audioLift(col, uBass * 0.23 + uHigh * 0.09);
    return vec4(col, 1.0);
}
