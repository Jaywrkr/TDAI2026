// ===============================================================
// SCENE 85 - REACTIVE PARTICLES
// Referencia: https://www.youtube.com/watch?v=haeEIPgieLQ
// Dos coronas violetas y una nube de particulas puntuales.
// Una pasada GLSL, sin simulacion, feedback ni optical flow.
// Solo uTime mueve la escena: sin audio la imagen queda quieta.
//
// @D1: separacion de las coronas
// @D2: largo de las puntas radiales
// @D3: cantidad de particulas
// @D4: tamano de las particulas
// @D5: mezcla violeta / magenta
// @D6: halo de las coronas
// ===============================================================

float particleLayer(vec2 p, float cells, float seed, float density, float size) {
    vec2 cell = floor(p * cells);
    vec2 local = fract(p * cells);
    float keep = hash21(cell + vec2(seed, seed * 2.7));
    vec2 pos = vec2(hash21(cell + vec2(seed + 11.3, 7.1)),
                    hash21(cell + vec2(3.7, seed + 23.1)));
    float dist = length(local - pos);
    float point = exp(-dist * dist / (size * size));
    return point * step(1.0 - density, keep) *
           (0.35 + 0.65 * hash21(cell + vec2(seed + 43.0, 19.7)));
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.25;
    float kick = max(uKick, uBeat * 0.65) * uAudioamt;
    float r = length(p);
    float angle = atan(p.y, p.x);

    // Los radios no cambian con el kick: asi no aparece el zoom involuntario.
    float innerR = 0.27 - uD1 * 0.08;
    float outerR = 0.54 + uD1 * 0.21;
    float rays = 180.0 + uDensity * 95.0;
    float sector = floor((angle + 3.14159265) * rays / 6.2831853);
    float grain = hash21(vec2(sector, 8.6));
    float phase = angle * rays + 0.55 * sin(angle * 17.0 + t * 0.18);
    float spoke = pow(max(0.0, cos(phase)), 20.0);
    float rough = 0.50 + 0.50 * sin(angle * 31.0 - t * 0.27);
    float spikeLength = (0.035 + uD2 * 0.12) * (0.35 + grain * 0.65);
    spikeLength *= 1.0 + kick * 0.45;
    float innerLine = exp(-pow((r - innerR) / 0.010, 2.0));
    float outerLine = exp(-pow((r - outerR) / 0.012, 2.0));
    float innerSpike = spoke * exp(-pow((r - innerR) / spikeLength, 2.0));
    float outerSpike = spoke * exp(-pow((r - outerR) / (spikeLength * 1.55), 2.0));
    float haloWidth = 0.025 + uD6 * 0.080;
    float halo = exp(-pow((r - innerR) / haloWidth, 2.0)) * 0.35 +
                 exp(-pow((r - outerR) / (haloWidth * 1.25), 2.0)) * 0.42;
    float rings = (innerLine * 0.38 + outerLine * 0.47 +
                   innerSpike * 0.86 + outerSpike * 0.91) *
                  (0.55 + rough * 0.38);

    // Dos reticulas pequenas dan puntos dispersos sin almacenar particulas.
    vec2 drift = vec2(t * 0.017, -t * 0.011);
    float amount = clamp(0.17 + uD3 * 0.46 + uDensity * 0.13, 0.0, 0.90);
    float size = 0.12 + uD4 * 0.18;
    float cloud = particleLayer(p + drift, 86.0, 4.2, amount, size);
    cloud += particleLayer(p * 1.17 - drift * 0.7, 118.0, 37.6,
                           amount * 0.55, size * 0.65) * 0.63;
    float envelope = exp(-pow(r / 0.94, 4.0));
    cloud *= envelope * (0.80 + uChaos * 0.35);

    float hue = audioHue(uHue, uMid * 0.009);
    vec3 violet = hsv2rgb(vec3(fract(hue + 0.75), 0.84, 1.0));
    vec3 pink = hsv2rgb(vec3(fract(hue + 0.88), 0.65, 1.0));
    vec3 ringColor = mix(violet, pink, uD5);
    vec3 col = ringColor * (rings * (1.65 + kick * 0.55) +
                            halo * uD6 * 0.48);
    col += mix(violet, vec3(0.91, 0.74, 1.0), 0.31) *
           cloud * (1.75 + uHigh * uAudioamt * 0.30);
    col = audioLift(col, uBass * 0.08 + uHigh * 0.11);
    return vec4(col, 1.0);
}
