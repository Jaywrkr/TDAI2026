// ===============================================================
// SCENE - LUCIFER STUDY
// Mascara organica fragmentada: rojo caliente, hielo cian y vacios.
// Referencia: https://www.youtube.com/watch?v=XXRD9NAN654
//
// El original usa video y mapas de altura/normal/alfa generados fuera
// de TD, mas feedback. Aqui solo se recrea la composicion visible con
// una pasada GLSL y un campo de ruido corto; no se usa media externa.
//
// @D1: tamano de la mascara
// @D2: cantidad de fragmentos
// @D3: profundidad de las grietas negras
// @D4: longitud de las esquirlas
// @D5: mezcla entre rojo y cian
// @D6: brillo de las zonas encendidas
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    vec2 q = p - vec2(0.18, 0.04);
    float t = uTime * 0.34;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;

    // Silueta irregular con esquirlas cortas alrededor. No hay zoom:
    // los cambios ocurren dentro de la materia y su contorno.
    float n = fbm(q * 2.7 + vec2(t * 0.045, -t * 0.055), 3);
    float grain = noise21(q * (6.0 + uDensity * 5.0) +
                          vec2(-t * 0.06, t * 0.04));
    float theta = atan(q.y, q.x);
    float radius = length(q / (vec2(0.63, 0.87) *
                             (0.80 + uD1 * 0.45)));
    float warp = (n - 0.5) * (0.14 + uChaos * 0.12) +
                 0.047 * sin(theta * 9.0 - t * 0.11);
    float shards = pow(abs(sin(theta * (17.0 + uD2 * 13.0) +
                               grain * 4.0)), 9.0) *
                   (0.035 + uD4 * 0.18);
    float rimDist = radius - (1.0 + warp + shards);
    float body = 1.0 - smoothstep(-0.06, 0.025, rimDist);
    float rim = 1.0 - smoothstep(0.0, 0.058, abs(rimDist));

    // Placas irregulares y hendiduras: dos escalas de material,
    // reutilizando el ruido ya calculado.
    float plateWave = sin(q.x * (16.0 + uD2 * 10.0) + n * 10.0) *
                      sin(q.y * (19.0 + uD2 * 9.0) - grain * 7.0);
    float plates = smoothstep(-0.35, 0.30, plateWave);
    float crack = 1.0 - smoothstep(0.015, 0.20,
                    abs(sin(q.x * 23.0 + q.y * 9.0 + n * 13.0)));
    float material = body * (0.12 + plates * 0.88) *
                     (0.22 + grain * 0.90) *
                     (1.0 - crack * (0.08 + uD3 * 0.90));

    // Huecos que sugieren un rostro erosionado, sin dibujar una cara
    // lisa ni repetir la misma luz sobre toda la superficie.
    vec2 eyeL = (q - vec2(-0.21, 0.16)) * vec2(5.3, 7.3);
    vec2 eyeR = (q - vec2( 0.19, 0.20)) * vec2(5.4, 7.0);
    vec2 mouth = (q - vec2(0.00, -0.30)) * vec2(3.2, 5.0);
    float voids = max(max(exp(-dot(eyeL, eyeL) * 1.8),
                          exp(-dot(eyeR, eyeR) * 1.8)),
                      exp(-dot(mouth, mouth) * 1.3));
    material *= 1.0 - voids * 0.94;

    float redH = audioHue(fract(uHue + 0.995), uMid * 0.012);
    float cyanH = audioHue(fract(uHue + 0.52), uMid * 0.012);
    vec3 red = hsv2rgb(vec3(redH, 0.90, 1.0));
    vec3 cyan = hsv2rgb(vec3(cyanH, 0.78, 1.0));
    float split = smoothstep(-0.32, 0.34,
                  q.x + (uD5 - 0.5) * 0.85 + (grain - 0.5) * 0.48 +
                  0.13 * sin(q.y * 7.0 + n * 5.0));
    vec3 pigment = mix(red, cyan, split);

    float hot = smoothstep(0.46, 0.80, grain) * plates;
    vec3 col = pigment * material *
               (0.52 + uD6 * 1.12 + kick * hot * 0.57);
    col += cyan * rim * body * (0.06 + uD4 * 0.19);
    float spine = exp(-abs(q.x + 0.08 * sin(q.y * 8.0 + t * 0.07)) * 9.0) *
                  smoothstep(-1.15, -0.72, q.y) *
                  (1.0 - smoothstep(-0.50, -0.30, q.y));
    col += cyan * spine * (0.08 + grain * 0.18);
    col = audioLift(col, uBass * 0.45 + uHigh * 0.10);
    return vec4(col, 1.0);
}
