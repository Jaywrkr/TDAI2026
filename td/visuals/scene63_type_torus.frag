// SCENE - ARO TIPOGRAFICO
// Marcas abstractas forman un aro organico de luz.
// @D1: radio del aro
// @D2: cantidad de marcas
// @D3: relieve del aro
// @D4: irregularidad del borde
// @D5: grosor de marcas
// @D6: resplandor
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * mix(0.08, 0.65, uSpeed);
    float kick = max(uKick, uBeat * 0.7) * uAudioamt;
    float angle = atan(p.y, p.x) + PI;
    float n = floor(mix(19.0, 64.0, uDensity) * (0.6 + uD2));
    float sector = floor(angle / TAU * n);
    float local = fract(angle / TAU * n) - 0.5;
    float organic = sin(angle * 7.0 + t) * sin(angle * 11.0 - t * 0.7);
    float radius = 0.45 + uD1 * 0.38 + organic * uD4 * 0.055 + kick * 0.075;
    float tube = abs(length(p) - radius);
    float torus = exp(-tube * mix(18.0, 7.0, uD3));
    float letter = step(0.12, abs(local)) *
                   (1.0 - smoothstep(0.0, 0.025 + uD5 * 0.035, tube));
    float crossbar = (1.0 - smoothstep(0.0, 0.02 + uD5 * 0.02, abs(local))) *
                     exp(-abs(tube - 0.07) * 25.0);
    float l = torus * (0.15 + uD3 * 0.4) + letter + crossbar * 0.65 +
              exp(-tube * 4.0) * uD6 * 0.14;
    float h = audioHue(uHue + sector / n * 0.28, uMid * 0.09);
    vec3 col = hsv2rgb(vec3(h, 0.7, l));
    return vec4(audioLift(col, uBass * 0.7 + kick * 0.3 + uHigh * 0.15), 1.0);
}
