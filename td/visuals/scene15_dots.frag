// ===============================================================
// SCENE 15 - DOTS
// Matriz de puntos que responde por zonas, estilo panel de LEDs.
// ===============================================================
//
// COMO FUNCIONA
//
// Rejilla de celdas (como scene06), un punto centrado en cada una en vez
// de lineas en el borde. El TAMANO de cada punto lo decide un campo fbm de
// baja frecuencia ("zona") evaluado en el indice de celda -- asi zonas
// enteras crecen y encogen juntas, se lee como una ola que recorre la
// matriz, no como puntos individuales parpadeando sueltos.
//
// OJO: el tamano del punto es geometria. Por el contrato de audio, NADA
// de audio puede tocarlo -- solo Density/Chaos/D1/D2 lo mueven. El audio
// (Bass, Kick) solo sube el BRILLO via audioLift, nunca el radio.
//
// CONTROLES
//   Speed    velocidad a la que viaja el campo de zonas
//   Density  cuantos puntos hay (resolucion de la rejilla)
//   Hue      paleta, con variacion leve por zona
//   Chaos    turbulencia del campo de zonas
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro de la posicion del punto (excepcion del
//            contrato)
//
// @D1: tamano base de los puntos
// @D2: escala del campo de zonas (zonas grandes <-> zonas chicas)
// @D3: contraste de tamano entre zonas (puntos casi uniformes <-> zonas
//      que crecen y encogen mucho mas)
// @D4: variacion de color entre zonas (paleta casi plana <-> arcoiris
//      por zona)
// ===============================================================

float segDist15(vec2 pp, vec2 a, vec2 b)
{
    vec2 ab = b - a;
    vec2 ap = pp - a;
    float hh = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return length(ap - ab * hh);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Rango bajado (era 4-24): con una rejilla tan tupida por defecto se
    // leia como una textura de LEDs, no como constelacion -- pocas
    // estrellas grandes y bien separadas es parte del pedido ("mas tipo
    // constelacion").
    float freq = 2.2 + uDensity * 9.0;
    vec2  g = p * freq;
    vec2  cellId = floor(g);
    vec2  cellUv = fract(g) - 0.5;

    // Dispersion tipo estrellas reales: cada punto se corre un poco de la
    // rejilla perfecta (fijo por celda, no anima) -- pedido de "mas tipo
    // constelacion", una rejilla de LEDs se ve demasiado ordenada para
    // eso. Geometria pura, sin audio (contrato de la escena).
    cellUv += (hash22(cellId + 5.0) - 0.5) * 0.55;

    // uHigh: vibracion micro de la posicion dentro de la celda -- unica
    // excepcion del contrato, amplitud pequena, ya suavizado.
    cellUv += uHigh * 0.02 * vec2(sin(t * 9.0 + cellId.x), cos(t * 7.0 + cellId.y));

    // Campo de zonas: fbm de baja frecuencia sobre el INDICE de celda
    // (no sobre la posicion en pantalla), asi la escala del patron no se
    // mezcla con la frecuencia de la rejilla.
    float zoneScale = 0.15 + uD2 * 0.5;
    float zone = fbm(cellId * zoneScale + t * (0.05 + uSpeed * 0.1), 3);
    zone += uChaos * 0.25 * sin(t * 0.2 + cellId.x * 0.4 + cellId.y * 0.4);
    zone = clamp(zone, 0.0, 1.0);

    // D3: contraste de tamano entre zonas -- bajo = puntos casi
    // uniformes, alto = zonas que crecen y encogen mucho mas.
    float zoneContrast = 0.15 + uD3 * 0.85;
    float baseSize = 0.12 + uD1 * 0.32;
    float size = baseSize * (1.0 - zoneContrast + zoneContrast * zone);

    float dist = length(cellUv);
    float dotShape = smoothstep(size, size * 0.6, dist);

    // Titileo tipo estrella: brillo (nunca tamano) de cada punto varia
    // solo, a su propio ritmo -- refuerza el look de constelacion real.
    float twinkle = 0.65 + 0.35 * sin(t * (0.4 + hash21(cellId + 40.0) * 1.6)
                                     + hash21(cellId + 9.0) * TAU);
    dotShape *= twinkle;

    // D4: variacion de color entre zonas.
    float hueZone = audioHue(fract(uHue + zone * uD4 * 0.9), uMid * 0.16);
    vec3 col = hsv2rgb(vec3(hueZone, 0.70, 1.0)) * dotShape;

    // Constelacion: conecta con lineas finas a las celdas vecinas cuya
    // zona tambien esta "encendida" -- el umbral de conexion BAJA con
    // los bajos, asi la red se extiende/reduce con la musica (el mismo
    // espiritu de "perimetro bailando" aplicado a una red en vez de un
    // circulo).
    // Umbral subido (0.55->0.68): con lineas conectando casi cualquier
    // celda vecina se veia como una red densa, no una constelacion --
    // ahora solo las zonas realmente "encendidas juntas" se conectan.
    float connectThresh = 0.68 - uBass * 0.22;
    vec2  curDotPos = p - cellUv / freq;
    for (int ny = -1; ny <= 1; ny++) {
        for (int nx = -1; nx <= 1; nx++) {
            if (nx == 0 && ny == 0) continue;
            vec2 neighbor = vec2(float(nx), float(ny));
            vec2 nCellId = cellId + neighbor;
            float nZone = fbm(nCellId * zoneScale + t * (0.05 + uSpeed * 0.1), 3);
            nZone += uChaos * 0.25 * sin(t * 0.2 + nCellId.x * 0.4 + nCellId.y * 0.4);
            nZone = clamp(nZone, 0.0, 1.0);
            float avgZone = (zone + nZone) * 0.5;
            if (avgZone < connectThresh) continue;

            vec2 nDotPos = curDotPos + neighbor / freq;
            float dLine = segDist15(p, curDotPos, nDotPos);
            float lineBright = smoothstep(0.008, 0.0, dLine)
                             * (avgZone - connectThresh) / max(1.0 - connectThresh, 1e-3);
            col += vec3(0.8, 0.9, 1.0) * lineBright * 0.4;
        }
    }

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria -- el tamano del punto
    // ya quedo fijado arriba, sin tocar audio.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.35);

    return vec4(col, 1.0);
}
