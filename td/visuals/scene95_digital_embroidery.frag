// ===============================================================
// SCENE 95 - DIGITAL EMBROIDERY
// Referencia: https://www.youtube.com/watch?v=Xcdl-16MI8Y
// Imagen/video Media recreado con cruces de hilo sobre tela oscura.
// Una pasada GLSL, sin geometria ni malla de TOPs por puntada.
// Solo uTime mueve ligeramente los hilos; en silencio quedan quietos.
//
// @D1: cantidad de puntadas
// @D2: grosor del hilo
// @D3: inclinacion de las cruces
// @D4: intensidad del color de la imagen
// @D5: color de la tela de fondo
// @D6: brillo en relieve del hilo
// ===============================================================

vec4 render(vec2 uv) {
    float rows = floor(49.0 + uDensity * 25.0 + uD1 * 22.0);
    vec2 grid = uv * vec2(uAspect, 1.0) * rows;
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float t = uTime * 0.19;
    float seed = hash21(cell + 17.3);
    float tilt = (uD3 - 0.5) * 0.35 +
                 (seed - 0.5) * uChaos * 0.18 +
                 0.025 * sin(t + seed * TAU);
    local = rot2(tilt) * local;
    float width = 0.055 + uD2 * 0.072;
    float inside = 1.0 - smoothstep(0.37, 0.50,
                                    max(abs(local.x), abs(local.y)));
    float slash = exp(-pow((local.x - local.y) / width, 2.0)) * inside;
    float backslash = exp(-pow((local.x + local.y) / width, 2.0)) * inside;
    float stitches = max(slash, backslash);
    float ridge = exp(-pow((local.x - local.y - width * 0.32) /
                            (width * 0.45), 2.0)) * inside;

    vec2 sourceUV = (cell + 0.5) /
                    (vec2(uAspect, 1.0) * rows);
    vec3 source = mediaTex(clamp(sourceUV, 0.0, 1.0)).rgb;
    float luminance = dot(source, vec3(0.299, 0.587, 0.114));
    float available = smoothstep(0.002, 0.018, luminance);
    vec3 threadColor = mix(vec3(luminance), source,
                           0.35 + uD4 * 0.65);
    vec3 fabricColor = hsv2rgb(vec3(audioHue(uHue + 0.57,
                                              uMid * 0.006),
                                     0.06 + uD5 * 0.82, 0.05 + uD5 * 0.16));
    float weave = 0.85 + 0.15 *
                  sin(grid.x * TAU) * sin(grid.y * TAU);
    float kick = max(uKick, uBeat * 0.65) * uAudioamt;
    float chosen = step(0.56, seed);
    vec3 col = fabricColor * weave * available *
               (0.72 + luminance * 0.28);
    col += threadColor * stitches * available *
           (0.92 + uBright * 0.42 + kick * chosen * 0.30);
    col += threadColor * ridge * available * uD6 * 1.0;
    float key = exp(-pow((uv.x - uKeypos) / 0.065, 2.0)) * uKeypulse;
    col += threadColor * stitches * key * 0.42;
    col = audioLift(col, uBass * 0.13 + uHigh * 0.10);
    return vec4(col, 1.0);
}
