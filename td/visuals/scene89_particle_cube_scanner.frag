// ===============================================================
// SCENE 89 - PARTICLE CUBE SCANNER
// Referencia: https://www.youtube.com/watch?v=hviSCGjDO7Q
// Cubo de alambre gris y barrido de particulas rojo.
// Aproximacion 2D en una pasada GLSL, sin POPs ni feedback.
// Solo uTime mueve el escaner; en silencio queda inmovil.
//
// @D1: grosor de las aristas
// @D2: ancho de la franja roja
// @D3: cantidad de particulas
// @D4: irregularidad del barrido
// @D5: rojo hacia naranja
// @D6: halo de los extremos
// ===============================================================

vec2 cubeProject(vec3 v) {
    return vec2(v.x * 0.82 + v.z * 0.28,
                v.y * 0.72 + v.z * 0.19);
}

float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
    return length(p - a - h * ab);
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.15 + uSpeed * 0.56);
    float kick = max(uKick, uBeat * 0.65) * uAudioamt;
    float wireWidth = 0.004 + uD1 * 0.006;
    vec2 a = cubeProject(vec3(-1.0, -0.68, -1.0));
    vec2 b = cubeProject(vec3( 1.0, -0.68, -1.0));
    vec2 c = cubeProject(vec3( 1.0,  0.68, -1.0));
    vec2 d = cubeProject(vec3(-1.0,  0.68, -1.0));
    vec2 e = cubeProject(vec3(-1.0, -0.68,  1.0));
    vec2 f = cubeProject(vec3( 1.0, -0.68,  1.0));
    vec2 g = cubeProject(vec3( 1.0,  0.68,  1.0));
    vec2 h = cubeProject(vec3(-1.0,  0.68,  1.0));
    float wire = 0.0;
    wire += exp(-pow(segmentDistance(p, a, b) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, b, c) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, c, d) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, d, a) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, e, f) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, f, g) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, g, h) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, h, e) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, a, e) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, b, f) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, c, g) / wireWidth, 2.0));
    wire += exp(-pow(segmentDistance(p, d, h) / wireWidth, 2.0));

    float scanY = 0.43 * sin(t * 0.72);
    scanY = mix(scanY, mix(-0.43, 0.43, uKeypos), uKeypulse * 0.72);
    vec2 left = cubeProject(vec3(-1.0, scanY, 0.0));
    vec2 right = cubeProject(vec3(1.0, scanY, 0.0));
    float irregular = noise21(p * 9.0 + vec2(t * 0.24, -t * 0.18));
    float beamDist = segmentDistance(p, left, right);
    float beamWidth = 0.025 + uD2 * 0.066;
    beamDist += (irregular - 0.5) * uD4 * 0.028;
    float beam = exp(-pow(beamDist / beamWidth, 2.0));
    float capWidth = 0.045 + uD6 * 0.070;
    float caps = exp(-pow(length(p - left) / capWidth, 2.0)) +
                 exp(-pow(length(p - right) / capWidth, 2.0));
    float halo = exp(-pow(beamDist / (beamWidth * 2.6), 2.0));

    vec2 cell = floor(p * 75.0);
    vec2 local = fract(p * 75.0);
    vec2 pos = hash22(cell + vec2(4.2, 18.1));
    float fleck = exp(-pow(length(local - pos) / 0.14, 2.0));
    float keep = step(0.76 - uD3 * 0.15 - uDensity * 0.07,
                      hash21(cell + 33.4));
    float inside = (1.0 - smoothstep(0.82, 1.07, abs(p.x))) *
                   (1.0 - smoothstep(0.48, 0.70, abs(p.y)));
    float sparks = fleck * keep * inside * (0.18 + beam * 0.82);

    vec3 red = hsv2rgb(vec3(audioHue(uHue + uD5 * 0.08,
                                     uMid * 0.008), 0.95, 1.0));
    vec3 col = vec3(0.59, 0.61, 0.66) * min(wire, 1.0) * 0.52;
    col += red * (beam * (0.27 + kick * 0.16) +
                  caps * (0.77 + kick * 0.55) +
                  halo * uD6 * 0.11 + sparks * 1.10);
    col = audioLift(col, uBass * 0.18 + uHigh * 0.11);
    return vec4(col, 1.0);
}
