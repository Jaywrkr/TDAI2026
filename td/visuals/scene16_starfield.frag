// ===============================================================
// SCENE 16 - STARFIELD
// Campo de puntos con profundidad, muy lento. Tres capas de paralaje.
// ===============================================================
//
// COMO FUNCIONA
//
// Tres capas fijas (cerca/media/lejos). Cada capa es una rejilla de
// celdas propia (mas fina cuanto mas "lejos"), y una celda tiene o no
// tiene estrella segun un hash de su indice contra un umbral -- asi las
// estrellas quedan siempre en el mismo lugar relativo a su celda (no
// saltan de frame a frame), sin necesidad de guardar ninguna lista de
// posiciones.
//
// El paralaje sale de que las capas lejanas se desplazan mas lento y son
// mas chicas/tenues -- la misma logica que una foto tomada desde un tren:
// lo cercano pasa rapido, lo lejano casi no se mueve.
//
// El titileo (twinkle) es una funcion seno por estrella con fase propia
// (del hash) -- brillo, no geometria, asi que no rompe el contrato de
// audio aunque se sienta "vivo".
//
// CONTROLES
//   Speed    velocidad de deriva de las capas
//   Density  cuantas celdas tienen estrella (mas Density = campo mas denso)
//   Hue      tinte de las estrellas (quedan casi blancas, saturacion baja)
//   Chaos    velocidad del titileo
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todo el campo
//   High     vibracion micro de posicion (excepcion del contrato)
//
// @D1: tamano de las estrellas
// @D2: escala de la rejilla (cuantas celdas caben por capa)
// @D3: contraste de profundidad (capas casi igual de brillantes <-> las
//      lejanas casi desaparecen frente a las cercanas)
// @D4: cuanto se diferencia la velocidad entre capas (paralaje sutil <->
//      muy marcado)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float h = audioHue(uHue, uMid * 0.16);
    float threshold = 0.92 - uDensity * 0.55;
    float dotBase = 0.012 + uD1 * 0.025;
    float cellSize = 0.35 - uD2 * 0.22;

    vec3 col = vec3(0.0);

    // Tres capas fijas: no dependen de ningun knob, la profundidad es
    // parte de la identidad de la escena.
    // D4: cuanto se diferencia la velocidad entre capas -- paralaje
    // sutil (todas casi igual de rapido) <-> muy marcado. Solo afecta la
    // velocidad, no el tamano/brillo por profundidad (eso sigue en 'depth').
    float parallaxAmt = 0.25 + uD4 * 2.5;

    for (int layer = 0; layer < 3; layer++) {
        float fl = float(layer);
        float depth = 1.0 + fl * 1.6;
        float speedDepth = 1.0 + fl * 1.6 * parallaxAmt;

        float speed = (0.015 + uSpeed * 0.03) / speedDepth;
        vec2 pl = p * depth + vec2(t * speed, t * speed * 0.4);

        vec2 g = pl / cellSize;
        vec2 cellId = floor(g);
        vec2 cellUv = fract(g) - 0.5;

        // uHigh: vibracion micro de posicion -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        cellUv += uHigh * 0.015 * vec2(sin(t * 8.0 + cellId.x),
                                       cos(t * 6.0 + cellId.y));

        float starHash = hash21(cellId + fl * 13.7);
        if (starHash < threshold) continue;

        float dotSize = dotBase / depth;
        float d = length(cellUv);
        float star = smoothstep(dotSize, dotSize * 0.3, d);

        // Titileo: brillo, no geometria.
        float twinkleRate = 0.5 + uChaos * 3.0;
        float twinkle = 0.55 + 0.45 * sin(t * twinkleRate
                                         + starHash * 30.0);

        // D3: contraste de profundidad -- bajo = las 3 capas casi igual
        // de brillantes, alto = las lejanas casi desaparecen.
        float depthFalloff = pow(depth, 0.3 + uD3 * 2.0);
        vec3 starCol = hsv2rgb(vec3(fract(h + starHash * 0.08), 0.12, 1.0));
        col += starCol * star * twinkle / depthFalloff;
    }

    // Kick: destello breve.
    col += col * uKick * 0.6;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
