// ===============================================================
// SCENE - AUDIO ORBIT
// Red circular de puntos rosa y enlaces entre anillos.
// Referencia: https://www.youtube.com/watch?v=kcHhg9JXE90
// Version analitica en una pasada: sin SOP, feedback ni blur.
// Solo uTime mueve la geometria; en silencio queda fija.
//
// @D1: separacion de los anillos
// @D2: cantidad de nodos
// @D3: curvatura de los enlaces
// @D4: grosor de las lineas
// @D5: tamano de los puntos
// @D6: brillo central
// ===============================================================

float orbitSegment(vec2 p, vec2 a, vec2 b) {
    vec2 v = b - a;
    return length(p - a - v * clamp(dot(p - a, v) /
                                   max(dot(v, v), 0.0001), 0.0, 1.0));
}

vec2 orbitNode(float ring, float id, float count, float t,
               float spacing, float bend, float kick) {
    float angle = 6.2831853 * (id / count + ring * 0.012) +
                  t * (0.052 + ring * 0.009);
    angle += bend * 0.13 * sin(id * 1.7 + ring * 2.1 + t * 0.18);
    float radius = 0.20 + ring * spacing +
                   kick * (0.012 + ring * 0.006);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float radius = length(p);
    if (radius > 1.22) return vec4(0.0, 0.0, 0.0, 1.0);

    float t = uTime * (0.18 + uSpeed * 0.38);
    float kick = max(uKick, uBeat * 0.65) * uAudioamt;
    float count = 22.0 + floor(uD2 * 16.0 + uDensity * 12.0);
    float spacing = 0.19 + uD1 * 0.025;
    float bend = uD3 * (0.4 + uChaos * 0.6);
    float lineWidth = 0.0028 + uD4 * 0.0032;
    float dotRadius = 0.009 + uD5 * 0.008;
    float aa = 1.5 / max(uResH, 360.0);
    float angle = atan(p.y, p.x) - t * 0.052;
    float network = 0.0;
    float nodes = 0.0;

    for (int ringIndex = 0; ringIndex < 4; ringIndex++) {
        float ring = float(ringIndex);
        float ringRadius = 0.20 + ring * spacing +
                           kick * (0.012 + ring * 0.006);
        float sector = angle / 6.2831853 - ring * 0.012;
        float nearId = floor(sector * count + 0.5);
        for (int side = -2; side <= 2; side++) {
            float id = nearId + float(side);
            vec2 a = orbitNode(ring, id, count, t, spacing, bend, kick);
            float da = length(p - a);
            nodes = max(nodes, 1.0 - smoothstep(dotRadius - aa,
                                                 dotRadius + aa, da));
            if (ringIndex < 3) {
                vec2 b = orbitNode(ring + 1.0, id + mod(ring, 2.0),
                                   count, t, spacing, bend, kick);
                float d = orbitSegment(p, a, b);
                network = max(network,
                              1.0 - smoothstep(lineWidth,
                                               lineWidth + aa, d));
            }
        }
        float circle = abs(radius - ringRadius);
        network = max(network, (1.0 - smoothstep(lineWidth * 0.6,
                                                lineWidth * 0.6 + aa,
                                                circle)) * 0.42);
    }

    float core = exp(-radius * (9.0 - uD6 * 4.0)) *
                 (0.18 + uD6 * 0.30 + kick * 0.18);
    float halo = exp(-radius * 2.9) * 0.027;
    float hue = audioHue(fract(uHue + 0.89), uMid * 0.013);
    vec3 pink = hsv2rgb(vec3(hue, 0.57, 1.0));
    vec3 col = pink * (network * (0.53 + kick * 0.24) +
                       nodes * (0.78 + uHigh * 0.20) + core + halo);
    col += vec3(1.0, 0.77, 0.88) * nodes * (0.20 + kick * 0.12);
    col = audioLift(col, uBass * 0.25 + uHigh * 0.10);
    return vec4(col, 1.0);
}
