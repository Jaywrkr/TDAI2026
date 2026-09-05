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
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float freq = 4.0 + uDensity * 20.0;
    vec2  g = p * freq;
    vec2  cellId = floor(g);
    vec2  cellUv = fract(g) - 0.5;

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

    float baseSize = 0.12 + uD1 * 0.32;
    float size = baseSize * (0.35 + 0.65 * zone);

    float dist = length(cellUv);
    float dotShape = smoothstep(size, size * 0.6, dist);

    float hueZone = audioHue(fract(uHue + zone * 0.25), uMid * 0.16);
    vec3 col = hsv2rgb(vec3(hueZone, 0.70, 1.0)) * dotShape;

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria -- el tamano del punto
    // ya quedo fijado arriba, sin tocar audio.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.35);

    return vec4(col, 1.0);
}
