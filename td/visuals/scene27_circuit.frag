// ===============================================================
// SCENE 27 - CIRCUITO / PCB
// Placa de circuito glowing: trazas tipo Truchet (arcos de cuarto de
// circulo por celda, orientacion al azar) que forman caminos continuos e
// irregulares, con pulsos de datos viajando por ellas y "chips"
// ocasionales.
// ===============================================================
//
// COMO FUNCIONA
// TRUCHET TILES: cada celda de una rejilla dibuja UNO de dos arcos
// posibles (esquina inferior-izquierda o superior-derecha), elegido por
// hash de la celda -- cuando arcos vecinos coinciden en sus extremos, se
// leen como un camino continuo que serpentea, sin ninguna logica de
// pathfinding real (tecnica clasica, barata). El "pulso de datos" es una
// fase viajera basada en la suma de indices de celda (aproxima la
// distancia a lo largo de la red) modulada por Mid/Speed.
//
// CONTROLES
//   Speed    velocidad de los pulsos de datos
//   Density  finura de la rejilla de trazas
//   Hue      tinte base de las trazas (verde/azul tipo PCB por defecto)
//   Chaos    no usado directo (reservado)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      velocidad extra de los pulsos + tinte adicional
//   Kick     los pulsos de datos se disparan mas brillantes
//   High     no usado directo (reservado)
//
// @D1: grosor de las trazas
// @D2: brillo general de las trazas (apenas visibles <-> placa iluminada)
// @D3: cuantos "chips" (cuadraditos brillantes) hay
// @D4: no usado directo (reservado para variantes futuras)
// ===============================================================

float truchetSDF(vec2 cellF, float variant)
{
    vec2 c = mix(vec2(0.0, 0.0), vec2(1.0, 1.0), variant);
    return abs(length(cellF - c) - 0.5);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float freq = 4.0 + uDensity * 10.0;
    vec2  g = p * freq;
    vec2  cellId = floor(g);
    vec2  cellF = fract(g);

    float variant = step(0.5, hash21(cellId));
    float d = truchetSDF(cellF, variant);
    float lineW = 0.03 + uD1 * 0.07;
    float trace = 1.0 - smoothstep(0.0, lineW, d);

    // Pulso viajero: fase basada en la suma de indices de celda, que
    // aproxima "distancia a lo largo de la red" sin pathfinding real.
    float travelPhase = fract((cellId.x + cellId.y) * 0.12 - t * (0.4 + uSpeed * 1.8 + uMid * 1.5));
    float pulse = smoothstep(0.12, 0.0, abs(travelPhase - 0.5)) * trace;

    float h = audioHue(fract(uHue + 0.38), uMid * 0.1);
    vec3 traceCol = hsv2rgb(vec3(h, 0.6, 0.55));
    // Piso subido (0.25->0.45): las trazas quedaban casi invisibles al
    // lado de los chips, que si se veian bien -- desbalanceado.
    vec3 col = traceCol * trace * (0.45 + uD2 * 0.5);
    col += vec3(0.6, 1.0, 0.85) * pulse * (1.0 + uKick * 1.8);

    // Chips: cuadraditos brillantes ocasionales en celdas hasheadas.
    float chipHash = hash21(cellId + 50.0);
    float isChip = step(0.93 - uD3 * 0.35, chipHash);
    float chipShape = 1.0 - smoothstep(0.24, 0.31, max(abs(cellF.x - 0.5), abs(cellF.y - 0.5)));
    col += vec3(1.0, 0.82, 0.3) * isChip * chipShape * 0.75;

    // PIANO: sobrecarga real -- aparecen chips NUEVOS y brillantes en
    // celdas al azar (distintas de los chips normales de arriba, hash
    // propio elegido con uKeypos), como si la placa se sobrecargara de
    // golpe, no solo un pulso de luz viajando por una traza existente.
    // uKeypulse decae solo; uKeyvel escala el brillo.
    if (uKeypulse > 0.0015) {
        float surgeChipHash = hash21(cellId + 150.0 + floor(uKeypos * 37.0));
        float isSurgeChip = step(0.72, surgeChipHash);
        col += vec3(1.0, 0.35, 0.25) * isSurgeChip * chipShape * uKeypulse * (0.8 + uKeyvel * 0.9);
    }

    col += col * uKick * 0.3;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
