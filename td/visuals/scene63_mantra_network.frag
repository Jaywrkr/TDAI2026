// ===============================================================
// SCENE - MANTRA NETWORK
// Disco de hilos radiales y constelacion blanca verdosa sobre negro.
// Referencia: https://www.youtube.com/watch?v=m3JVkRG1xSs
// Captura del usuario: nodos brillantes conectados en diagonal.
//
// La obra usa operadores C++ MCX y datos de sintesis propios. Aqui el
// audio existente del rig alimenta una reconstruccion visual GLSL.
// Solo cuatro nodos cercanos se evaluan por pixel; sin SOPs ni feedback.
//
// @D1: radio del disco
// @D2: cantidad de chispas
// @D3: densidad de filamentos radiales
// @D4: curvatura de la constelacion
// @D5: fuerza de las conexiones
// @D6: brillo de nodos y halos
// ===============================================================

vec2 mantraNode(float i, float t, float bend) {
    float n = clamp(i, 0.0, 9.0);
    float x = mix(-0.72, 0.72, n / 9.0) +
              0.085 * sin(n * 3.1 + t * 0.17);
    float y = x * 0.91 +
              (0.065 + bend * 0.25) * sin(n * 2.7 - t * 0.12);
    return vec2(x, y);
}

float mantraSegment(vec2 p, vec2 a, vec2 b) {
    vec2 v = b - a;
    float h = clamp(dot(p - a, v) / max(dot(v, v), 1e-5), 0.0, 1.0);
    return length(p - a - v * h);
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.12 + uSpeed * 0.31);
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float radius = 0.78 + uD1 * 0.18;
    float r = length(p);
    float disc = 1.0 - smoothstep(radius - 0.005, radius + 0.015, r);

    // Costillas del disco. La iluminacion cae hacia el centro para
    // que la red diagonal sea el foco de la imagen.
    float theta = atan(p.y, p.x);
    float rayCount = 50.0 + uDensity * 20.0 + uD3 * 35.0;
    float rayPhase = theta * rayCount + r * 2.8 +
                     0.32 * sin(theta * 8.0 + t * 0.15);
    float rays = 1.0 - smoothstep(0.0, 0.23, abs(sin(rayPhase)));
    rays *= smoothstep(0.08, 0.34, r) *
            (1.0 - smoothstep(radius - 0.045, radius, r));
    float rim = edgeLine(r - radius, 1.05);

    // Los nodos avanzan de abajo izquierda hacia arriba derecha. El
    // indice cercano evita recorrer toda la red en cada pixel.
    float idx = clamp(floor((p.x + 0.72) / 0.16) - 1.0, 0.0, 6.0);
    vec2 a = mantraNode(idx, t, uD4);
    vec2 b = mantraNode(idx + 1.0, t, uD4);
    vec2 c = mantraNode(idx + 2.0, t, uD4);
    vec2 d = mantraNode(idx + 3.0, t, uD4);
    vec2 satellite = b + vec2(0.10 * sin(idx * 3.3 + t * 0.09),
                              0.15 * cos(idx * 2.4 - t * 0.11));
    float da = length(p - a), db = length(p - b);
    float dc = length(p - c), dd = length(p - d);
    float node = exp(-da * da * 285.0) + exp(-db * db * 285.0) +
                 exp(-dc * dc * 285.0) + exp(-dd * dd * 285.0);
    float ds = length(p - satellite);
    node += exp(-ds * ds * 320.0) * 0.42;
    float aura = exp(-da * 12.0) + exp(-db * 12.0) +
                 exp(-dc * 12.0) + exp(-dd * 12.0);
    float linkDist = min(min(mantraSegment(p, a, b),
                             mantraSegment(p, b, c)),
                         min(mantraSegment(p, c, d),
                             mantraSegment(p, a, c)));
    linkDist = min(linkDist, min(mantraSegment(p, a, d),
                                 mantraSegment(p, b, d)));
    linkDist = min(linkDist, min(mantraSegment(p, a, satellite),
                                 mantraSegment(p, satellite, c)));
    float links = 1.0 - smoothstep(0.001, 0.005 + uD5 * 0.005,
                                   linkDist);

    // Satelites pequenos alrededor del eje aportan la malla de la foto
    // sin calcular todas las parejas de nodos.
    float spine = p.y - p.x * 0.91;
    float filaments = 1.0 - smoothstep(0.0, 0.055,
        abs(sin(p.x * 59.0 + p.y * 31.0 +
                sin(p.y * 9.0 + t * 0.22) * 2.4)));
    filaments *= exp(-abs(spine) * 4.8) * disc;

    vec2 gridUv = (p + 1.0) * 65.0;
    vec2 cell = floor(gridUv);
    vec2 jitter = hash22(cell + 35.1);
    float spark = 1.0 - smoothstep(0.04, 0.27,
                  length(fract(gridUv) - jitter));
    spark *= step(mix(0.96, 0.72, uD2), hash21(cell + 17.8));
    spark *= exp(-abs(spine) * 2.9) * disc;

    float h = audioHue(fract(uHue + 0.34), uMid * 0.015);
    vec3 ice = hsv2rgb(vec3(h, 0.19, 1.0));
    vec3 col = ice * (rays * 0.34 + rim * 0.37 +
               links * (0.19 + uD5 * 0.32) +
               filaments * 0.31 + spark * (0.22 + uD2 * 0.66) +
               node * (0.65 + uD6 * 0.92 + kick * 0.72) +
               aura * (0.11 + uD6 * 0.20));
    col *= disc;
    col = audioLift(col, uBass * 0.55 + kick * 0.32 + uHigh * 0.12);
    return vec4(col, 1.0);
}
