// ===============================================================
// SCENE - INSTANCED BLOOM
// Superficies plegadas con malla fina roja y cian sobre negro.
// Referencia: https://www.youtube.com/watch?v=yEdPYpYjRSM
// Aproximacion 2D de la figura instanciada, en una pasada GLSL.
// El movimiento depende de uTime y queda fijo sin musica.
//
// @D1: apertura de los petalos
// @D2: cantidad de petalos
// @D3: torsion de las superficies
// @D4: densidad de la malla
// @D5: separacion roja y cian
// @D6: luz del nucleo
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv) - vec2(0.06, 0.0);
    float t = uTime * (0.07 + uSpeed * 0.22);
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float blades = 3.0 + floor(uD2 * 2.0 + 0.5);
    float opening = 0.75 + uD1 * 0.46;
    float twist = 0.35 + uD3 * 0.70 + uChaos * 0.15;
    float lines = 34.0 + uD4 * 44.0 + uDensity * 18.0;
    float split = 0.012 + uD5 * 0.032;
    float aa = 2.0 / max(uResH, 360.0);
    float hRed = audioHue(fract(uHue + 0.025), uMid * 0.012);
    vec3 red = hsv2rgb(vec3(hRed, 0.88, 1.0));
    vec3 cyan = hsv2rgb(vec3(fract(hRed + 0.52), 0.80, 1.0));
    vec3 col = vec3(0.0);

    for (int i = 0; i < 5; i++) {
        if (float(i) >= blades) break;
        float id = float(i);
        float axis = id * 6.2831853 / blades + 0.18 +
                     t * (0.045 + id * 0.004);
        vec2 q = rot2(-axis) * p;
        float x = q.x / opening;
        if (x < -0.06 || x > 1.20) continue;
        float along = clamp(x, 0.0, 1.0);
        float envelope = pow(max(sin(along * 3.1415927), 0.0), 0.75);
        float width = 0.025 + (0.24 + id * 0.012) * envelope;
        float fold = twist * (0.11 * sin(x * 5.4 + id * 1.2 - t * 0.36) +
                              0.045 * sin(x * 11.0 - id * 2.1));
        float surfaceY = q.y - fold * along;
        float v = surfaceY / max(width, 0.01);
        float inside = 1.0 - smoothstep(0.94, 1.05, abs(v));
        inside *= smoothstep(-0.03, 0.08, x) *
                  (1.0 - smoothstep(1.02, 1.15, x));

        // Dos familias de lineas simulan la malla de copias curvadas.
        float strandPhase = v * lines + x * (19.0 + twist * 25.0) +
                            5.0 * sin(x * 7.0 + id);
        float crossPhase = x * (lines * 0.83) - v * 13.0;
        float strand = 1.0 - smoothstep(0.07, 0.28,
                                      abs(sin(strandPhase)));
        float crossbar = 1.0 - smoothstep(0.04, 0.17,
                                        abs(sin(crossPhase)));
        float edge = 1.0 - smoothstep(0.01, 0.06,
                                    abs(abs(v) - 1.0));
        float lit = inside * (0.09 + strand * 0.72 +
                              crossbar * 0.28 + edge * 0.50);
        float redSide = smoothstep(-split, split, v +
                                   0.20 * sin(x * 4.0 + id));
        vec3 ink = mix(cyan, red, redSide);
        col += ink * lit * (0.85 + 0.50 * envelope);

        float rimDist = abs(surfaceY) - width;
        float outerGlow = exp(-abs(rimDist) * (19.0 - uD5 * 6.0)) *
                          inside * 0.075;
        col += ink * outerGlow;
    }

    float r = length(p);
    float knot = exp(-r * (7.0 + uD6 * 3.0)) *
                 (0.26 + uD6 * 0.49 + kick * 0.21);
    float sparks = exp(-r * 18.0) * (0.25 + kick * 0.19);
    col += mix(red, cyan, 0.35) * knot +
           vec3(1.0, 0.65, 0.88) * sparks;
    col = audioLift(col, uBass * 0.32 + uHigh * 0.12);
    return vec4(col, 1.0);
}
