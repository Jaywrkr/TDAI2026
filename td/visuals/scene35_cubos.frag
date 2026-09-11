// ===============================================================
// SCENE - CUBOS (ECUALIZADOR)
// Una fila de barras rectangulares con una sombra/highlight que las
// hace leer como cubos extruidos (una cara de frente + tapa arriba +
// lateral a un costado), como un ecualizador de audio real pero en 3D
// falso. Las barras se reparten en TRES grupos que se comportan
// distinto -- no todas iguales -- asi se lee mejor que estan vivas:
// un grupo crece/decrece con el BAJO, otro grupo bambolea su angulo
// con los MEDIOS, y otro pega saltitos de brillo/altura con los
// AGUDOS.
// ===============================================================
//
// COMO FUNCIONA
// Density pone el techo de barras posibles. D3 decide cuantas de esas
// barras se ven -- por defecto (perilla al centro) ya se ven CASI
// TODAS, y subir la perilla las va bajando de a poco (la curva es
// mas plana cerca del centro y cae fuerte recien pasando la mitad,
// para que el default siempre arranque lleno). Cada barra tiene ademas
// una fase propia (hash) para la ola que la hace bailar -- eso es lo
// que da "cada una con su movimiento" sin depender de audio real por
// banda. El look de cubo sale de dibujar, ademas de la cara de frente,
// una franja mas clara arriba (la "tapa") y una mas oscura a la
// derecha (el "lateral").
//
// LOS TRES GRUPOS (colI % 3)
//   Grupo 0  altura crece/decrece con el BAJO (empuje fuerte, encima
//            de su baile propio)
//   Grupo 1  el ANGULO de la barra bambolea con los MEDIOS (se ve
//            clarisimo, no es solo brillo)
//   Grupo 2  pega saltitos de altura con los AGUDOS (rapidos, se
//            notan pero no rompen el piso comun)
//
// CONTROLES
//   Speed    velocidad de la ola que recorre las barras
//   Density  techo de cuantas barras puede haber como maximo
//   Hue      color base
//   Chaos    variacion de altura entre barras (parejas <-> irregulares)
//   Bass     empuje de altura del Grupo 0 + brillo de lo ya claro
//            (audioLift)
//   Mid      bamboleo de angulo del Grupo 1 + tinte adicional (audioHue)
//   Kick     destello breve en toda la fila
//   High     saltitos del Grupo 2 (mas fuerte que el contrato estandar,
//            pedido asi a proposito para que se note el agudo)
//
// @D1: cuanto reacciona el Grupo 0 al bajo (poco <-> mucho)
// @D2: altura base de las barras (bajas <-> casi tocan arriba)
// @D3: cuantas barras se ven (todas por defecto <-> pocas)
// @D4: separacion entre barras (juntas <-> bien separadas)
// @D5: inclinacion base de cada barra (rectas <-> en abanico)
// @D6: profundidad del efecto cubo (tapa/lateral apenas <-> bien marcados)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float nBarsMax = 8.0 + floor(uDensity * 16.99);
    // D3: la caida es cubica -- queda casi plana cerca del centro (el
    // default ya muestra casi todas las barras) y recien cae fuerte
    // pasando la mitad de la perilla.
    float shrink = uD3 * uD3 * uD3;
    float nBars = floor(mix(nBarsMax, 4.0, shrink) + 0.5);

    float totalW = uAspect * 2.0;
    float barSpan = totalW / nBars;
    float gap = mix(0.05, 0.35, uD4) * barSpan;
    float barW = barSpan - gap;

    float colI = floor((p.x + uAspect) / barSpan);
    vec2  seed = vec2(colI * 3.7 + 1.0, colI * 1.9 + 5.0);
    float group = mod(colI, 3.0);

    float floorY = -0.85;
    vec2  localP = vec2(mod(p.x + uAspect, barSpan) - barSpan * 0.5, p.y - floorY);

    // D5: inclinacion base propia por barra. El Grupo 1 le suma un
    // bamboleo real con los medios -- amplitud acotada, oscila con el
    // tiempo (no un salto crudo de nivel), asi se ve como vida propia
    // y no como jitter.
    float phaseOff = hash21(seed) * TAU;
    float tilt = (hash21(seed + 9.0) - 0.5) * uD5 * 0.7;
    if (group < 0.5) {
        tilt += sin(t * (1.1 + uSpeed * 0.6) + phaseOff * 1.7) * uMid * 0.45;
    }
    localP = rot2(-tilt) * localP;

    float waveSpeed = 0.5 + uSpeed * 2.2;
    float wave = 0.5 + 0.5 * sin(t * waveSpeed - colI * 0.4 + phaseOff);

    float heightJitter = mix(1.0, 0.3 + hash21(seed + 2.0) * 1.4, uChaos);
    float baseH = mix(0.15, 1.5, uD2) * heightJitter;
    float barH = baseH * (0.6 + wave * 0.4);

    if (group < 1.5 && group >= 0.5) {
        // Grupo 1 ya baila por el angulo -- altura solo con su baile
        // de base, sin empuje extra de bajo/agudo para que el
        // contraste entre grupos se note.
    } else if (group < 0.5) {
        // Grupo 0: empuje fuerte de BAJO.
        float barReact = 0.3 + hash21(seed + 4.0) * 0.9;
        barH *= 1.0 + uBass * uD1 * 1.6 * barReact;
    } else {
        // Grupo 2: saltitos de AGUDO -- rapidos, amplitud generosa a
        // proposito (pedido explicito de que se note el agudo), pero
        // siguen siendo una oscilacion acotada que vuelve sola a la
        // base cuando uHigh baja.
        float hopPhase = t * (10.0 + hash21(seed + 7.0) * 6.0) + phaseOff;
        barH += uHigh * baseH * 0.9 * (0.5 + 0.5 * sin(hopPhase));
    }

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
