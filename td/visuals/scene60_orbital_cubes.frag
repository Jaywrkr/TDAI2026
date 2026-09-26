// SCENE - CUBOS ORBITALES
// Cubos estilizados orbitan en un plano inclinado.
// @D1: radio orbital
// @D2: cantidad de piezas
// @D3: tamano de los cubos
// @D4: inclinacion del plano
// @D5: brillo de aristas
// @D6: profundidad aparente
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * mix(0.08, 0.7, uSpeed);
    float kick = max(uKick, uBeat * 0.7) * uAudioamt;
    float n = floor(mix(18.0, 48.0, uDensity) * (0.5 + uD2));
    float radius = 0.25 + uD1 * 0.58 + kick * 0.08;
    float ring = length(p) / radius;
    float angle = atan(p.y / mix(0.3, 0.95, uD4), p.x) + PI - t;
    float sector = floor(angle / TAU * n);
    float phi = (sector + 0.5) / n * TAU + t - PI;
    vec2 center = vec2(cos(phi), sin(phi) * mix(0.3, 0.95, uD4)) * radius;
    vec2 q = rot2(phi * 0.3 + t * 0.3) * (p - center);
    float sz = (0.014 + uD3 * 0.047) * (0.75 + uD6 * 0.5 * sin(phi));
    float boxDist = max(abs(q.x), abs(q.y)) - sz;
    float cube = 1.0 - smoothstep(-0.002, 0.006, boxDist);
    float edge = (1.0 - smoothstep(0.0, 0.012 + uD5 * 0.02, abs(boxDist))) * uD5;
    float depth = 0.5 + 0.5 * sin(phi);
    float h = audioHue(uHue + sector / n * 0.22, uMid * 0.08);
    vec3 col = hsv2rgb(vec3(h, 0.75, (cube * 0.75 + edge * 0.5) * (0.5 + depth * uD6)));
    col += hsv2rgb(vec3(fract(h + 0.1), 0.45, 0.08 * exp(-abs(ring - 1.0) * 9.0)));
    return vec4(audioLift(col, uBass * 0.7 + kick * 0.35 + uHigh * 0.15), 1.0);
}
