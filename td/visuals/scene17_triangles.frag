// ===============================================================
// SCENE 17 - TRIANGLES
// Rejilla triangulada: cada celda de una malla se parte en dos
// triangulos (arriba/abajo) que aparecen y desaparecen a saltos, estilo
// Pantone -- la version en triangulos de la vieja "blocks" (cuadrados).
// ===============================================================
//
// COMO FUNCIONA
//
// Una rejilla normal (floor/fract, igual que scene06/15/17-viejo) se
// subdivide en 2 triangulos por celda: comparando fract(g).x contra
// fract(g).y se sabe de que lado de la diagonal cae el pixel, eso separa
// "triangulo de arriba" de "triangulo de abajo" dentro de la misma
// celda. Cada triangulo tiene su propio color e indice (para el hash de
// parpadeo), asi la rejilla se lee como una malla triangulada real, no
// como cuadrados con una linea diagonal encima.
//
// El encendido/apagado por triangulo sale de hashear
// (indice_triangulo + paso_de_tiempo_cuantizado) contra un umbral --
// igual mecanismo que la vieja "blocks", cambia a saltos como un tablero
// de LEDs, no en fade suave.
//
// CONTROLES
//   Speed    la rejilla entera se desliza lento (efecto marquesina)
//   Density  cuantos triangulos hay (resolucion de la rejilla)
//   Hue      paleta, con variacion por triangulo
//   Chaos    velocidad del parpadeo (cuantos cambios por segundo)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     todos los triangulos se encienden un instante
//   High     vibracion micro del borde (excepcion del contrato)
//
// @D1: tamano de los triangulos dentro de su celda (margen entre ellos)
// @D2: proporcion de triangulos encendidos en cada paso
// @D3: variacion de matiz entre triangulos (paleta casi plana <-> muy
//      variada)
// @D4: rotacion/inclinacion de la rejilla completa
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    p += vec2(t * uSpeed * 0.08, t * uSpeed * 0.05);

    // D4: rotacion de toda la rejilla.
    float rotAmt = uD4 * 0.6;
    p = rot2(rotAmt) * p;

    // Mezcla con noise -- pedido explicito de "formas raras": un domain
    // warp deforma el espacio ANTES de calcular la rejilla, asi los
    // triangulos dejan de ser perfectamente equilateros y se doblan en
    // formas irregulares, con Chaos controlando cuanto.
    vec2 warp = vec2(fbm(p * 1.5 + 3.0, 3), fbm(p * 1.5 - 7.0, 3)) - 0.5;
    p += warp * (0.18 + uChaos * 0.4);

    float freq = 2.0 + uDensity * 5.5;
    vec2  g = p * freq;
    vec2  cellId = floor(g);
    vec2  cellF = fract(g);

    // uHigh: vibracion micro del borde -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    cellF += uHigh * 0.015 * vec2(sin(t * 8.0 + cellId.x), cos(t * 6.0 + cellId.y));

    // De que lado de la diagonal cae el pixel -- separa los 2 triangulos
    // de la celda. triId distingue cual es cual para el hash/color.
    float upper = step(cellF.x, cellF.y);
    float triId = upper;

    // Distancia al borde diagonal, en unidades de celda -- para el
    // margen entre triangulos (D1).
    float diagDist = abs(cellF.y - cellF.x);
    // Distancia tambien a los bordes exteriores de la celda.
    float edgeDist = min(min(cellF.x, 1.0 - cellF.x), min(cellF.y, 1.0 - cellF.y));

    // El tamano del triangulo (via el margen) respira con los bajos --
    // uBass ya suavizado (Fase 2), mismo patron que el perimetro de las
    // metaballs: mas bajo = margen mas chico = triangulos mas grandes.
    float margin = (0.03 + (1.0 - uD1) * 0.16) * (1.0 - uBass * 0.35);
    float inTri = smoothstep(margin, margin + 0.02, diagDist)
                * smoothstep(margin * 0.6, margin * 0.6 + 0.02, edgeDist);

    // Sombreado falso-3D: mas cerca del centro del triangulo, mas
    // brillante (como si estuviera extruido/biselado hacia la camara).
    float distToEdge = min(diagDist, edgeDist);
    float bevel = 0.55 + 0.55 * smoothstep(0.0, margin * 3.0, distToEdge);

    float rate = 0.3 + uChaos * 1.8;
    float stepT = floor(t * rate);
    float visHash = hash21(cellId + triId * 3.7 + stepT * 7.3);

    // D2: proporcion de triangulos encendidos por paso.
    float threshold = 0.90 - uD2 * 0.55;
    float on = step(threshold, visHash);
    on = max(on, uKick * step(0.5, hash21(cellId + triId * 3.7 + floor(t * 30.0))));

    // D3: variacion de matiz entre triangulos.
    float hue = audioHue(fract(uHue + hash21(cellId + triId * 5.1 + 11.0) * uD3 * 0.9), uMid * 0.16);
    vec3 triCol = hsv2rgb(vec3(hue, 0.85, 1.0));

    vec3 col = triCol * inTri * on * bevel;

    // PIANO: una onda de color invierte los triangulos que toca a su
    // paso, viajando desde el punto que elige uKeypos -- uKeypulse
    // decae solo (el radio del frente avanza mientras dura el pulso).
    if (uKeypulse > 0.0015) {
        vec2 waveCenter = vec2((uKeypos - 0.5) * 2.6, sin(uKeypos * 6.0) * 0.9);
        float waveR = (1.0 - uKeypulse) * 2.0;
        float dWaveT = abs(length(p - waveCenter) - waveR);
        float invertMask = smoothstep(0.12 + uKeyvel * 0.15, 0.0, dWaveT) * uKeypulse;
        col = mix(col, vec3(1.0) - col, invertMask * inTri * on);
    }

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.3);

    return vec4(col, 1.0);
}
