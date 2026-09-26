// ===============================================================
// SCENE - NEBULOSA DE PARTICULAS
// Nube esferica de puntos en turbulencia: trazos cortos, lazos largos,
// nucleos blanco-cian y grandes huecos negros. Referencia visual:
// https://www.youtube.com/watch?v=qKzo4lpGAjk (tddsash, SOP particles 5.4)
// La captura del usuario marca la composicion y la paleta final.
//
// Traduccion del tutorial: esfera/Sprinkle -> puntos sobre una mascara
// circular; Particle/Force -> desplazamiento local del campo; Line MAT
// -> segmentos finos; feedback -> filamentos de flujo; Lookup azul y
// Bloom -> color HDR que pasa por el bloom comun del rig. Es una pasada
// GLSL, sin 10 000 SOPs ni buffers 4K, y no pretende ser la simulacion
// fisica exacta del tutorial.
//
// @D1: radio y apertura de la nube
// @D2: cantidad de chispas por superficie
// @D3: fuerza de la turbulencia local
// @D4: longitud de los trazos de particulas
// @D5: presencia de filamentos largos
// @D6: brillo de los nucleos y halo
// ===============================================================

float pnSegment(vec2 q, vec2 dir, float halfLen, float width) {
    float along = dot(q, dir);
    float across = abs(dot(q, vec2(-dir.y, dir.x)));
    float aa = max(fwidth(across), 0.025);
    return (1.0 - smoothstep(width, width + aa, across)) *
           (1.0 - smoothstep(halfLen, halfLen + aa * 2.0, abs(along)));
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.18 + uSpeed * 0.36);
    float radius = mix(0.80, 1.17, uD1);
    float kick = max(uKick, uBeat * 0.6) * uAudioamt;

    // Deformacion suave de la superficie; el centro no se dilata entero.
    vec2 drift = vec2(noise21(p * 2.3 + vec2(t * 0.4, 3.7)),
                      noise21(p * 2.3 + vec2(7.1, -t * 0.35))) - 0.5;
    vec2 warped = p + drift * (0.10 + uD3 * 0.24 + kick * 0.045);
    float r = length(warped);
    float shell = 1.0 - smoothstep(radius * 0.73, radius * 1.19, r);
    float structure = noise21(warped * 3.5 + vec2(t * 0.2, 4.0));
    float coverage = shell * smoothstep(0.34, 0.72 - uChaos * 0.10, structure);

    // Puntos del Sprinkle: un punto por celda con fase, orientacion y
    // longitud propias. Solo 3x3 vecinos por pixel, incluso con Density
    // alta. La orientacion tangencial sugiere la fuerza radial del video.
    float cells = mix(34.0, 72.0, uDensity) * mix(0.72, 1.35, uD2);
    vec2 g = warped * cells;
    vec2 base = floor(g);
    mat2 particleTurn = rot2(t * 0.16);
    float sparks = 0.0;
    float hot = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 id = base + vec2(float(x), float(y));
            vec2 rnd = hash22(id + 19.7);
            float seed = hash21(id + 8.3);
            vec2 center = id + 0.5 + (rnd - 0.5) * 0.75;
            vec2 q = g - center;
            vec2 tangent = normalize(vec2(-id.y, id.x) + vec2(0.001));
            vec2 dir = normalize(particleTurn *
                                 (tangent + (rnd - 0.5) * (1.0 + uChaos * 3.0)));
            float len = (0.22 + uD4 * 0.65) * (0.4 + rnd.x);
            float mark = pnSegment(q, dir, len, 0.035 + rnd.y * 0.035);
            float clump = smoothstep(0.35, 0.84, hash21(id * 0.13 + 4.1));
            float weight = mix(0.30, 1.0, clump) * (0.45 + seed * 0.7);
            sparks += mark * weight;
            hot += mark * pow(seed, 9.0) * 1.9;
        }
    }
    sparks *= coverage * 0.55;
    hot *= coverage;

    // Curvas continuas entre los puntos: pocas hebras largas y vacios,
    // no un relleno uniforme de ruido.
    vec2 flow = warped + drift * (0.25 + uD3 * 0.35);
    float n1 = fbm(flow * 2.6 + vec2(t * 0.13, -t * 0.08), 3);
    float n2 = fbm(rot2(0.8) * flow * 4.7 - vec2(t * 0.09, t * 0.06), 3);
    float filA = edgeLine(n1 - 0.51, 0.85);
    float filB = edgeLine(n2 - 0.48, 0.65);
    float ang = atan(flow.y, flow.x);
    float spiralPhase = ang * 3.7 + r * 13.0 + (n1 - 0.5) * 13.0;
    float arc = edgeLine(sin(spiralPhase), 1.3) *
                smoothstep(0.27, 0.67, structure);
    float strands = (filA * 1.1 + filB * 0.55 + arc * 1.15) * uD5 *
                    smoothstep(0.24, 0.57, structure) * shell;
    float outside = (1.0 - smoothstep(radius * 1.10, radius * 1.40, r)) *
                    smoothstep(radius * 0.82, radius * 1.05, r);
    strands += outside * (filA * 0.7 + arc * 0.65) * uD5;

    float core = pow(max(1.0 - r / max(radius, 0.01), 0.0), 2.0) *
                 smoothstep(0.44, 0.68, structure) * 0.18;
    float light = sparks * 0.57 + strands * 1.75 + core;
    float white = hot * (0.35 + uD6 * 1.0) +
                  pow(max(strands, 0.0), 2.0) * (0.13 + uD6 * 0.72);
    vec3 blue = hsv2rgb(vec3(audioHue(fract(uHue + 0.59), uMid * 0.035),
                             0.82, 1.0));
    vec3 col = blue * light * (0.65 + uD6 * 0.55) +
               vec3(0.72, 0.93, 1.0) * white;
    float haze = shell * smoothstep(0.43, 0.73, structure) * 0.045;
    float flowGlow = (exp(-abs(n1 - 0.51) * 22.0) * 0.16 +
                      exp(-abs(sin(spiralPhase)) * 5.0) * 0.10) *
                     shell * smoothstep(0.30, 0.68, structure) * uD5;
    col += blue * (haze + flowGlow + exp(-r * r * 5.0) * core * uD6 * 0.20);
    col *= 1.35;
    col = audioLift(col, uBass * 0.6 + kick * 0.18 + uHigh * 0.13);
    return vec4(col, 1.0);
}
