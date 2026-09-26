// ===============================================================
// SCENE - THE FIRST PULSE
// Cuadrado rojo luminoso, arco y diagonal entre chispas oscuras.
// Referencia: https://www.youtube.com/watch?v=u_ZhBUkBLXg
// El video es una referencia de aspecto, no un tutorial de nodos.
//
// Una sola pasada GLSL. El kick enciende el marco y una onda dentro
// del cuadrado; el tiempo compartido se detiene sin audio.
//
// @D1: tamano del cuadrado
// @D2: cantidad de particulas
// @D3: grosor del marco y los trazos
// @D4: fuerza del arco y la diagonal
// @D5: longitud del halo rojo
// @D6: brillo de particulas y trazos
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.10 + uSpeed * 0.34);
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float side = 0.41 + uD1 * 0.22;
    float boxDist = max(abs(p.x), abs(p.y)) - side;
    float inside = 1.0 - smoothstep(-0.018, 0.012, boxDist);
    float border = edgeLine(boxDist, 1.3 + uD3 * 1.7);
    float halo = exp(-abs(boxDist) * mix(34.0, 13.0, uD5));

    // La geometria del fotograma: diagonal de esquina a esquina y
    // curva que nace en la esquina superior izquierda.
    float diagDist = (p.x + p.y) * 0.70710678;
    float diagonal = edgeLine(diagDist, 0.70 + uD3 * 0.75) * inside;
    float arcDist = length(p - vec2(-side, -side)) - side * 2.0;
    float arc = edgeLine(arcDist, 0.80 + uD3 * 0.95) * inside;

    // Chispas distribuidas en celdas. Cada una conserva su posicion
    // mientras el reloj del rig esta inmovil; ninguna escala el cuadro.
    float cells = 46.0 + uDensity * 22.0 + uD2 * 32.0;
    vec2 gridUv = (p / side * 0.5 + 0.5) * cells;
    vec2 cell = floor(gridUv);
    vec2 jitter = hash22(cell + 13.7);
    jitter += 0.12 * vec2(sin(t * 0.7 + cell.x * 1.9),
                          cos(t * 0.6 + cell.y * 1.7));
    float pointDist = length(fract(gridUv) - jitter);
    float present = step(mix(0.93, 0.69, uD2), hash21(cell + 71.3));
    float spark = (1.0 - smoothstep(0.05, 0.34, pointDist)) *
                  present * inside;
    float sparkSize = step(0.87, hash21(cell + 93.1));
    spark *= mix(0.42, 1.05, sparkSize);

    // Un solo gesto local por golpe: luz que se propaga hacia el marco.
    float ringDist = length(p) - (0.10 + (1.0 - kick) * side * 0.72);
    float pulse = edgeLine(ringDist, 1.1) * kick * inside;
    float trace = (diagonal * 0.34 + arc * 0.76) *
                  (0.32 + uD4 * 1.20);
    float core = border * (0.72 + kick * 0.65) +
                 trace + spark * (0.52 + uD6 * 2.15) +
                 pulse * 0.75;

    float h = audioHue(fract(uHue + 0.004), uMid * 0.015);
    vec3 red = hsv2rgb(vec3(h, 0.95, 1.0));
    vec3 ember = hsv2rgb(vec3(fract(h + 0.035), 0.88, 1.0));
    vec3 col = mix(red, ember, spark * 0.42) * core *
               (0.48 + uD6 * 0.98);
    col += red * halo * (0.06 + uD5 * 0.19) *
           (1.0 + kick * 1.2);
    col = audioLift(col, uBass * 0.60 + uHigh * 0.10);
    return vec4(col, 1.0);
}
