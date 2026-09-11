// ===============================================================
// SCENE - CUBOS (ECUALIZADOR)
// Una fila de barras rectangulares con una sombra/highlight que las
// hace leer como cubos extruidos (una cara de frente + tapa arriba +
// lateral a un costado), como un ecualizador de audio real pero en 3D
// falso -- cada barra "baila" a su propio ritmo (una ola que viaja de
// barra en barra) y ademas crece de verdad con el bajo.
// ===============================================================
//
// COMO FUNCIONA
// La pantalla se parte en columnas iguales (Density). Cada columna
// tiene una fase propia (hash) para la ola que la hace bailar -- eso
// es lo que da "cada una con su movimiento" sin depender de audio real
// por banda (solo hay un canal de graves). El BAJO empuja la altura
// encima de esa danza de base, asi la sensacion de vida propia nunca
// desaparece aunque no haya musica, y el golpe de graves se siente
// como un empujon real. El look de cubo sale de dibujar, ademas de la
// cara de frente, una franja mas clara arriba (la "tapa") y una mas
// oscura a la derecha (el "lateral"), el mismo truco que un grafico de
// barras isometrico.
//
// CONTROLES
//   Speed    velocidad de la ola que recorre las barras
//   Density  cuantas barras hay
//   Hue      color base
//   Chaos    variacion de altura entre barras (parejas <-> irregulares)
//   Bass     empuje de altura de cada barra (encima de su baile propio)
//            + brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en toda la fila
//   High     vibracion micro de la altura (excepcion del contrato)
//
// @D1: cuanto reacciona cada barra al bajo (poco <-> mucho)
// @D2: altura base de las barras (bajas <-> casi tocan arriba)
// @D3: acercar/alejar (zoom) toda la fila
// @D4: separacion entre barras (juntas <-> bien separadas)
// @D5: inclinacion de cada barra (rectas <-> en abanico)
// @D6: profundidad del efecto cubo (tapa/lateral apenas <-> bien marcados)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    float zoom = mix(1.6, 0.55, uD3);
    vec2  p = centered(uv) * zoom;

    float nBars = 8.0 + floor(uDensity * 16.99);
    float totalW = uAspect * 2.0;
    float barSpan = totalW / nBars;
    float gap = mix(0.05, 0.35, uD4) * barSpan;
    float barW = barSpan - gap;

    float colI = floor((p.x + uAspect) / barSpan);
    vec2  seed = vec2(colI * 3.7 + 1.0, colI * 1.9 + 5.0);

    float floorY = -0.85;
    vec2  localP = vec2(mod(p.x + uAspect, barSpan) - barSpan * 0.5, p.y - floorY);
    // D5: inclinacion propia por barra -- gira la coordenada LOCAL
    // alrededor de la base, asi cada una se para en su angulo sin
    // romper la fila (siguen ancladas al piso).
    float tilt = (hash21(seed + 9.0) - 0.5) * uD5 * 0.7;
    localP = rot2(-tilt) * localP;

    float waveSpeed = 0.5 + uSpeed * 2.2;
    float phaseOff = hash21(seed) * TAU;
    float wave = 0.5 + 0.5 * sin(t * waveSpeed - colI * 0.4 + phaseOff);

    float heightJitter = mix(1.0, 0.3 + hash21(seed + 2.0) * 1.4, uChaos);
    float baseH = mix(0.15, 1.5, uD2) * heightJitter;

    float barReact = 0.3 + hash21(seed + 4.0) * 0.9;
    float barH = baseH * (0.6 + wave * 0.4) * (1.0 + uBass * uD1 * 1.6 * barReact);
    // uHigh: vibracion micro de la altura -- unica excepcion del
    // contrato, amplitud pequena.
    barH += uHigh * 0.02 * sin(t * 14.0 + colI);

    float h = audioHue(uHue, uMid * 0.10);
    vec3  frontCol = hsv2rgb(vec3(fract(h + hash21(seed + 6.0) * 0.06), 0.7, 1.0));

    vec3  col = vec3(0.0);
    float halfW = barW * 0.5;
    bool  inBar = abs(localP.x) < halfW && localP.y > 0.0 && localP.y < barH;
    if (inBar) {
        col = frontCol;
        // D6: "tapa" clara cerca del tope y "lateral" oscuro cerca
        // del borde derecho -- el efecto cubo.
        float topDist = barH - localP.y;
        float capMask = (1.0 - smoothstep(0.0, 0.10, topDist)) * step(0.001, uD6);
        col = mix(col, vec3(1.0), capMask * uD6 * 0.6);

        float sideDist = halfW - localP.x;
        float sideMask = (1.0 - smoothstep(0.0, halfW * 0.6 + 0.01, sideDist)) * step(0.001, uD6);
        col = mix(col, col * 0.4, sideMask * uD6 * 0.8);
    }

    float floorLine = edgeLine(p.y - floorY, 2.0);
    col += vec3(0.2, 0.22, 0.28) * floorLine * 0.4;

    // PIANO: la barra mas cercana a uKeypos brilla blanco -- uKeypulse
    // decae solo, uKeyvel escala el brillo.
    if (uKeypulse > 0.0015) {
        float targetBar = floor(mix(0.0, nBars - 1.0, uKeypos) + 0.5);
        float onBar = 1.0 - smoothstep(0.0, 0.6, abs(colI - targetBar));
        if (inBar) col += vec3(1.0) * onBar * uKeypulse * (0.5 + uKeyvel * 1.0);
    }

    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.15);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
