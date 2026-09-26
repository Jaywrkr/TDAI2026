// ===============================================================
// SCENE 92 - FREQUENCY GUIDED PARTICLES
// Referencia: https://www.youtube.com/watch?v=A1TfrWmrOfA
// Nucleo blanco, haces cruzados y nube de particulas amarillo lima.
// Aproximacion en una pasada GLSL, sin simulacion por instancias.
// Solo uTime desplaza los puntos: en silencio quedan inmoviles.
//
// @D1: inclinacion de los haces
// @D2: grosor del nucleo luminoso
// @D3: cantidad de particulas
// @D4: extension de la nube
// @D5: amarillo hacia verde lima
// @D6: halo de los haces
// ===============================================================

float spectralPoint(vec2 p, float grid, float seed, float amount, float size) {
    vec2 id = floor(p * grid);
    vec2 local = fract(p * grid);
    vec2 pos = hash22(id + seed);
    float present = step(1.0 - amount, hash21(id + seed * 3.1));
    float dist = length(local - pos);
    return exp(-dist * dist / (size * size)) * present *
           (0.32 + 0.68 * hash21(id + seed * 5.7));
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.06 + uSpeed * 0.24);
    float kick = max(uKick, uBeat * 0.68) * uAudioamt;
    float bass = uBass * uAudioamt;
    float high = uHigh * uAudioamt;
    float angle = -0.25 + uD1 * 0.40;
    vec2 major = normalize(vec2(0.27 + angle, 1.0));
    vec2 minor = normalize(vec2(1.0, -0.15 - angle * 0.40));
    float alongA = dot(p, major);
    float acrossA = abs(major.x * p.y - major.y * p.x);
    float alongB = dot(p, minor);
    float acrossB = abs(minor.x * p.y - minor.y * p.x);
    float width = 0.008 + uD2 * 0.014;
    float beamA = exp(-pow(acrossA / width, 2.0)) *
                  exp(-pow(alongA / 1.10, 2.0));
    float beamB = exp(-pow(acrossB / (width * 0.66), 2.0)) *
                  exp(-pow(alongB / 1.28, 2.0));
    float haloA = exp(-pow(acrossA / (0.08 + uD6 * 0.12), 2.0)) *
                  exp(-pow(alongA / 0.76, 2.0));
    float haloB = exp(-pow(acrossB / (0.045 + uD6 * 0.07), 2.0)) *
                  exp(-pow(alongB / 0.93, 2.0));
    float core = exp(-dot(p, p) / (0.005 + uD2 * 0.016));

    // La nube se concentra a la derecha y se desprende del nucleo.
    vec2 cloudCenter = vec2(0.42 + uD4 * 0.15, 0.22);
    vec2 cloudPos = (p - cloudCenter) /
                    vec2(0.45 + uD4 * 0.43, 0.35 + uD4 * 0.28);
    float cloudMask = exp(-dot(cloudPos, cloudPos) * 1.10);
    float amount = clamp(0.14 + uD3 * 0.43 + uDensity * 0.12, 0.0, 0.88);
    vec2 drift = vec2(t * 0.016, -t * 0.010);
    float dust = spectralPoint(p + drift, 81.0, 13.2,
                               amount, 0.14 + uD4 * 0.12);
    dust += spectralPoint(p * 1.13 - drift * 0.7, 113.0, 48.6,
                          amount * 0.54, 0.10) * 0.57;
    dust *= cloudMask * (0.70 + high * 0.45);

    vec3 white = vec3(0.88, 0.93, 1.0);
    vec3 lime = hsv2rgb(vec3(audioHue(uHue + 0.15 + uD5 * 0.10,
                                    uMid * 0.009), 0.82, 1.0));
    vec3 col = white * (beamA * (0.82 + bass * 0.22) +
                        beamB * 0.69 +
                        core * (1.45 + kick * 0.72) +
                        haloA * uD6 * 0.24 + haloB * uD6 * 0.16);
    col += lime * dust * (3.10 + high * 0.48);
    float key = exp(-pow((uv.x - uKeypos) / 0.065, 2.0)) * uKeypulse;
    col += white * (beamA + beamB) * key * 0.50;
    col = audioLift(col, bass * 0.10 + high * 0.10);
    return vec4(col, 1.0);
}
