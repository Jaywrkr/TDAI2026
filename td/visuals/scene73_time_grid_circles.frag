// ===============================================================
// SCENE - TIME GRID CIRCLES
// Una animacion de circulo ruidoso vista en fases distintas por celda.
// Referencia: https://www.youtube.com/watch?v=NK59-7UW7PA&t=1524s
// Version analitica en una pasada, sin cache ni texturas de historial.
// La fase usa uTime: en silencio todas las celdas quedan quietas.
//
// @D1: columnas de la cuadricula
// @D2: filas de la cuadricula
// @D3: separacion temporal entre celdas
// @D4: irregularidad de los bordes
// @D5: tamano de los circulos
// @D6: visibilidad de los marcos
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float cols = 5.0 + floor(uD1 * 3.0 + 0.5);
    float rows = 3.0 + floor(uD2 * 2.0 + 0.5);
    float pitch = min(3.30 / cols, 1.80 / rows);
    vec2 grid = p / pitch + vec2(cols, rows) * 0.5;
    vec2 cell = floor(grid);
    if (cell.x < 0.0 || cell.y < 0.0 ||
        cell.x >= cols || cell.y >= rows)
        return vec4(0.0, 0.0, 0.0, 1.0);

    vec2 q = fract(grid) - 0.5;
    float index = cell.x + cell.y * cols;
    float delay = 0.20 + uD3 * 0.72;
    float phase = uTime * (0.35 + uSpeed * 0.85) - index * delay;
    float freq = 3.2 + uDensity * 4.0;
    vec2 samplePoint = q * freq +
                       vec2(phase * 0.38, phase * -0.26);
    float noiseA = noise21(samplePoint);
    float noiseB = noise21(samplePoint * 2.3 + vec2(12.7, 4.1));
    float noiseC = noise21(samplePoint * 5.1 - vec2(8.1, 6.4));
    float textureValue = noiseA * 0.54 + noiseB * 0.31 + noiseC * 0.15;
    float roughness = (0.025 + uD4 * 0.074) *
                      (0.6 + uChaos * 0.8);
    float diskRadius = 0.205 + uD5 * 0.105;
    float signedEdge = length(q) - diskRadius -
                       (textureValue - 0.5) * roughness;
    float aa = 1.5 / max(pitch * uResH * 0.5, 1.0);
    float disk = 1.0 - smoothstep(-aa, aa, signedEdge);
    float rim = exp(-abs(signedEdge) * 58.0);
    float grain = smoothstep(0.28, 0.71,
                            textureValue + (noiseC - 0.5) * 0.22);
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float hue = audioHue(fract(uHue + 0.025 +
                              0.035 * sin(phase * 0.19)),
                         uMid * 0.012);
    vec3 red = hsv2rgb(vec3(hue, 0.91, 1.0));
    vec3 orange = hsv2rgb(vec3(fract(hue + 0.055), 0.82, 1.0));
    vec3 col = mix(red, orange, textureValue * 0.65) *
               disk * (0.08 + grain * 0.59 + kick * 0.24);
    col += red * rim * (0.13 + uHigh * 0.07);

    float frameDist = 0.49 - max(abs(q.x), abs(q.y));
    float frame = 1.0 - smoothstep(0.0, 0.009, abs(frameDist));
    col += vec3(0.28, 0.12, 0.15) * frame * (0.06 + uD6 * 0.32);
    col = audioLift(col, uBass * 0.20 + uHigh * 0.10);
    return vec4(col, 1.0);
}
