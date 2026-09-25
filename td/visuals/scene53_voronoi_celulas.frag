// ===============================================================
// VORONOI CELULAS
// Una sola pasada de Voronoi (celdas de la distancia al punto mas cercano
// entre una grilla de 3x3 vecinos) -- de las tecnicas mas usadas y mas
// baratas de todo el shader art, dominio publico. No es un port de ningun
// shader puntual de Shadertoy.
// ===============================================================
//
// CONTROLES
//   Speed    velocidad con la que se mueven los centros de celda
//   Density  cuantas celdas entran en pantalla (tamano de grilla)
//   Hue      paleta completa (cada celda toma un tono distinto)
//   Chaos    cuanto se desvia cada centro de su casilla (organico <-> regular)
//   Bass     brillo general (audioLift)
//   Mid      tinte que se mueve con la musica (audioHue)
//   Kick     destello breve en los bordes
//
// @D1: grosor de la linea entre celdas
// @D2: cuanto varia el color entre celdas vecinas
// @D3: velocidad de la respiracion de cada celda (brillo que sube y baja)
// @D4: saturacion de las celdas (mono <-> color pleno)
// @D5: cuanto se hunde el sombreado hacia el centro de cada celda
// @D6: brillo del centro de cada celda (el punto semilla)
// ===============================================================

vec2 gooey_cellCenter(vec2 cell, float t) {
    vec2 base = hash22(cell);
    float wob = uChaos * 0.42;
    return base + wob * vec2(sin(t * 0.9 + base.x * 20.0), cos(t * 1.1 + base.y * 20.0)) * 0.5;
}

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);
    float scale = mix(2.0, 7.0, uDensity);
    p *= scale;

    float t = uTime * (0.3 + uSpeed * 0.7);
    vec2 cellId = floor(p);
    vec2 f = fract(p);

    float d1 = 1e5, d2 = 1e5;
    vec2 bestCell = cellId;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 off = vec2(float(x), float(y));
            vec2 c = gooey_cellCenter(cellId + off, t);
            float dist = length(off + c - f);
            if (dist < d1) { d2 = d1; d1 = dist; bestCell = cellId + off; }
            else if (dist < d2) { d2 = dist; }
        }
    }

    float edge = edgeLine(d2 - d1, mix(1.0, 4.0, uD1));
    float seed = hash21(bestCell);
    float hueShift = seed * mix(0.05, 0.35, uD2);

    // Respiracion: cada celda sube y baja de brillo a su propio ritmo,
    // controlado por D3 -- puramente en brillo, nunca en forma.
    float breathe = 0.55 + 0.45 * sin(t * (1.0 + seed * 2.0) * mix(0.3, 1.6, uD3) + seed * 6.2831);

    float sat = mix(0.1, 1.0, uD4);
    vec3 col = hsv2rgb(vec3(fract(uHue + hueShift), sat, 0.85)) * breathe;
    col *= 1.0 - d1 * mix(0.05, 0.6, uD5); // sombreado hacia el centro de la celda
    col += vec3(1.0) * edge;

    float core = smoothstep(0.12, 0.0, d1) * mix(0.4, 1.6, uD6);
    col += hsv2rgb(vec3(fract(uHue + hueShift), sat * 0.4, 1.0)) * core;

    // AUDIO -- bajos = brillo, medios = tinte, agudos = destello micro en
    // los bordes de celda (edge ya es una mascara de pocos pixeles).
    col = audioLift(col, uBass * 0.75);
    float h2 = audioHue(uHue, uMid * 0.05);
    col = mix(col, hsv2rgb(vec3(fract(h2 + hueShift), sat, 0.85)) * breathe, 0.45);
    col += vec3(1.0) * edge * uHigh * 0.6;
    col += col * uKick * 0.35;

    col = col / (1.0 + col);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;
    return vec4(max(col, 0.0), 1.0);
}
