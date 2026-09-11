// ===============================================================
// SCENE 11 - VENAS
// Reemplaza a la placa de circuito (PCB rigida, angulos rectos): una
// red de venas bioluminiscentes que se ramifican organicamente, con
// pulsos de energia viajando por ellas y nodos que laten -- conexion
// directa con "veins", la escena hermana que ya esta en la carcel.
// ===============================================================
//
// COMO FUNCIONA
// Un campo fbm domain-warped (mismo mecanismo que scene02_caustica) se
// pasa por ridge() -- la funcion del header que convierte un campo de
// ruido continuo en filamentos finos que se ramifican solos, sin
// ninguna rejilla ni logica de caminos: es la MISMA tecnica que usa la
// escena "veins" original, aca aplicada de nuevo. El "pulso de datos"
// de la version PCB se reemplaza por una fase que viaja usando el
// VALOR del campo como aproximacion de "distancia a lo largo de la
// vena" (el mismo truco que antes usaba la suma de indices de celda,
// pero ahora coherente con una red organica en vez de una grilla).
//
// CONTROLES
//   Speed    no usado directo (el pulso tiene su propia velocidad, D3)
//   Density  escala de la red (venas grandes y pocas <-> finas y
//            muchas)
//   Hue      tinte base de las venas
//   Chaos    no usado directo (reservado)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      velocidad extra del pulso + tinte adicional
//   Kick     los pulsos se disparan mas brillantes
//   High     no usado directo (reservado)
//
// @D1: grosor de las venas
// @D2: densidad de ramificacion (rugosidad del campo -- pocas ramas
//      grandes <-> muchas y finas)
// @D3: velocidad del pulso que viaja por la red
// @D4: turbulencia del domain warp (venas rectas <-> muy retorcidas)
// @D5: brillo de los nodos (puntos donde la vena "late")
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h = audioHue(fract(uHue + 0.38), uMid * 0.1);

    float turb = 0.4 + uD4 * 1.3;
    vec2  warp = vec2(fbm(p * 1.2 + t * 0.03, 4), fbm(p * 1.2 - t * 0.025 + 9.0, 4)) - 0.5;
    vec2  wp = p * mix(1.5, 4.0, uDensity) + warp * turb;
    float field = fbm(wp, 6, 0.45 + uD2 * 0.2);

    float sharp = mix(2.0, 14.0, uD1);
    float veins = ridge(field, sharp);
    float veinLine = smoothstep(0.55, 0.98, veins);

    // Pulso viajero: el VALOR del campo aproxima "distancia a lo largo
    // de la vena" -- mismo espiritu que la fase por indice de celda de
    // la version PCB, pero coherente con una red organica.
    float pulseSpeed = 0.3 + uD3 * 1.8 + uMid * 0.8;
    float travel = fract(field * 6.0 - t * pulseSpeed);
    float pulse = smoothstep(0.10, 0.0, abs(travel - 0.5)) * veinLine;

    vec3  col = hsv2rgb(vec3(fract(h + 0.5), 0.4, 0.02));
    vec3  veinCol = hsv2rgb(vec3(h, 0.65, 1.0));
    col += veinCol * veinLine * (0.7 + uD6 * 0.5);
    col += vec3(0.6, 1.0, 0.9) * pulse * (1.0 + uKick * 1.8);
    // Bloom ancho: la vena "sangra" un halo tenue, como luz real bajo
    // la piel en vez de un trazo con blur fijo.
    col += veinCol * exp(-pow(1.0 - veins, 2.0) * 30.0) * 0.15;

    // D5: nodos -- puntos donde la vena late, elegidos por hash de una
    // sub-rejilla del espacio ya doblado (aproximado, no geometria
    // exacta -- alcanza para el efecto de "pulso de vida").
    vec2  nodeId = floor(wp * 6.0);
    float nodeHash = hash21(nodeId + 3.0);
    float isNode = step(0.85, nodeHash) * veinLine;
    float nodePulse = 0.5 + 0.5 * sin(t * 2.0 + nodeHash * 20.0);
    col += veinCol * isNode * nodePulse * (0.4 + uD5 * 1.6);

    // PIANO: sobrecarga real -- un nodo nuevo y brillante aparece cerca
    // de la posicion que elige uKeypos, como un latido extra fuerte que
    // se propaga por la vena mas cercana. uKeypulse decae solo.
    if (uKeypulse > 0.0015) {
        vec2  gp = centered(vec2(mix(0.12, 0.88, uKeypos), 0.5));
        float dg2 = dot(p - gp, p - gp);
        float surge = exp(-dg2 * 8.0) * uKeypulse * (0.7 + uKeyvel * 1.0);
        col += hsv2rgb(vec3(fract(h + 0.5), 0.6, 1.0)) * surge * veinLine * 2.0;
        col += hsv2rgb(vec3(fract(h + 0.5), 0.4, 1.0)) * surge * 0.3;
    }

    col += col * uKick * 0.3;
    col *= 0.6 + uD6 * 0.6;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
