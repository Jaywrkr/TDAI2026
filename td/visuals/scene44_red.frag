// ===============================================================
// SCENE - RED
// Una nube de nodos (fija por perillas, no por tiempo) donde cada uno
// se conecta con sus vecinos mas cercanos por una linea fina -- un
// grafo de red, no una constelacion de figuras armadas a mano. Los
// nodos laten solos y las conexiones se iluminan mas fuerte con el
// bajo.
// ===============================================================
//
// COMO FUNCIONA
// Los nodos salen de una grilla jitterada (3x3 celdas vecinas, mismo
// patron que scene21_neural) -- cada celda tiene un nodo o no, por
// hash. Para cada pixel se recorren los nodos de esa vecindad y se
// dibuja el segmento entre cada par cercano -- eso es lo que da el
// look de "red", no una grilla ni un circulo de puntos.
//
// CONTROLES
//   Speed    velocidad del latido de los nodos
//   Density  cuantos nodos hay
//   Hue      color base
//   Chaos    cuanto se dispersan los nodos dentro de su celda
//   Bass     brillo de las conexiones (mas fuerte que el de los nodos)
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en toda la red
//   High     vibracion micro de la posicion de los nodos (excepcion)
//
// @D1: tamano de los nodos
// @D2: grosor de las conexiones
// @D3: distancia maxima de conexion (pocas lineas <-> red tupida)
// @D4: cantidad de resplandor (glow) en los nodos
// @D5: velocidad del latido de los nodos
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec2 nodeSite(vec2 id, float chaosAmt)
{
    vec2 jitter = (hash22(id + 11.0) - 0.5) * chaosAmt;
    return id + 0.5 + jitter;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float cell = mix(0.55, 0.16, uDensity);
    vec2  g = p / cell;
    vec2  gi = floor(g);
    float chaosAmt = 0.15 + uChaos * 0.7;
    float presence = mix(0.35, 0.95, uDensity);

    float h = audioHue(uHue, uMid * 0.10);
    vec3  col = vec3(0.0);

    float maxConn = mix(0.5, 2.2, uD3);

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            vec2  idA = gi + vec2(dx, dy);
            float hasA = step(hash21(idA + 3.0), presence);
            if (hasA < 0.5) continue;
            vec2  siteA = nodeSite(idA, chaosAmt) * cell;

            for (int ddy = 0; ddy <= 1; ddy++) {
                for (int ddx = -1; ddx <= 1; ddx++) {
                    if (ddy == 0 && ddx <= 0) continue;
                    vec2  idB = idA + vec2(ddx, ddy);
                    float hasB = step(hash21(idB + 3.0), presence);
                    if (hasB < 0.5) continue;
                    vec2  siteB = nodeSite(idB, chaosAmt) * cell;

                    float distAB = length(siteB - siteA);
                    if (distAB > maxConn * cell * 2.2) continue;

                    vec2  ab = siteB - siteA;
                    vec2  ap = p - siteA;
                    float hh = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
                    float d = length(ap - ab * hh);

                    float lineW = 0.003 + uD2 * 0.01;
                    float lineCov = 1.0 - smoothstep(0.0, lineW, d);
                    float fadeEdge = 1.0 - smoothstep(maxConn * cell * 1.6, maxConn * cell * 2.2, distAB);

                    vec3  connCol = hsv2rgb(vec3(fract(h + 0.5), 0.55, 1.0));
                    col += connCol * lineCov * fadeEdge * (0.5 + uBass * 1.3);
                }
            }
        }
    }

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            vec2  id = gi + vec2(dx, dy);
            float has = step(hash21(id + 3.0), presence);
            if (has < 0.5) continue;
            vec2  site = nodeSite(id, chaosAmt) * cell;
            // uHigh: vibracion micro -- unica excepcion del contrato.
            site += uHigh * 0.006 * vec2(sin(t * 9.0 + id.x), cos(t * 7.0 + id.y));

            float pulseSpeed = 0.4 + uD5 * 2.0;
            float pulse = 0.6 + 0.4 * sin(t * pulseSpeed + hash21(id + 5.0) * TAU);

            float size = mix(0.02, 0.05, uD1) * cell / 0.35;
            float d = length(p - site);
            float nodeCov = 1.0 - smoothstep(size * 0.5, size * 0.5 + 0.005, d);
            float nodeGlow = exp(-d * d / (0.001 + uD4 * 0.01));

            vec3  nodeCol = hsv2rgb(vec3(h, 0.65, 1.0));
            col += nodeCol * (nodeCov + nodeGlow * 0.5) * pulse;
        }
    }

    col *= 0.5 + uD6 * 0.8;

    // PIANO: un nodo invitado, mucho mas brillante, aparece en la
    // posicion que elige uKeypos.
    if (uKeypulse > 0.0015) {
        vec2  gp = centered(vec2(mix(0.12, 0.88, uKeypos), 0.5));
        float dG = length(p - gp);
        float burst = exp(-dG * dG * 12.0) * uKeypulse * (0.7 + uKeyvel * 0.9);
        col += hsv2rgb(vec3(fract(h + 0.5), 0.7, 1.0)) * burst;
    }

    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.4);
    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
