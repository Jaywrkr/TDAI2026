// ===============================================================
// SCENE 01 - NEURAL
// Red de segmentos rectos con nodos brillantes, la hermana geometrica
// de las venas (scene00): mismo espiritu de red, pero angular y
// Pantone en vez de organico.
// ===============================================================
//
// COMO FUNCIONA
//
// Voronoi por celdas (tecnica estandar, F2-F1): cada celda de una
// rejilla tiene un punto (su "sitio"), desplazado aleatoriamente dentro
// de la celda. Para cada pixel se buscan los DOS sitios mas cercanos
// (entre las 9 celdas vecinas) -- la diferencia entre la segunda y la
// primera distancia (F2-F1) vale ~0 exactamente en el borde entre dos
// celdas, y esos bordes forman una red de segmentos rectos entre sitios.
// Es continuo en todas partes (a diferencia del sawtooth de scene06/08),
// asi que no hay ningun riesgo de aliasing en el borde.
//
// Los nodos son simplemente un brillo que crece cerca de cada sitio
// (1/distancia al sitio mas cercano) -- ahi es donde "laten" los pulsos.
//
// CONTROLES
//   Speed    velocidad de los pulsos que recorren la red
//   Density  cuantas celdas hay (mas celdas = red mas fina)
//   Hue      paleta
//   Chaos    cuanto se alejan los sitios del centro de su celda -- mas
//            Chaos = red mas irregular, menos = mas ordenada/rejilla
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve en los nodos
//   High     vibracion micro de los sitios (excepcion del contrato)
//
// @D1: grosor de los segmentos
// @D2: tamano de los nodos
// ===============================================================

// Punto aleatorio pero animado dentro de cada celda -- se mueve poco a
// poco, asi la red respira en vez de quedar congelada.
//
// OJO: el offset base (donde vive el sitio dentro de su celda) tiene que
// escalar con Chaos, no solo el drift animado -- si el offset base fuera
// fijo, Chaos casi no cambiaria nada (se probo con un render en CPU: a
// Chaos=0.05 la red se veia casi identica a Chaos=0.5).
vec2 sitePoint(vec2 cellId, float t, float chaosAmt, float highAmt)
{
    vec2 base = hash22(cellId);
    vec2 drift = vec2(sin(t * 0.15 + base.x * 6.28), cos(t * 0.12 + base.y * 6.28));
    float spread = 0.08 + chaosAmt * 0.62;
    return 0.5 + (base - 0.5) * spread + drift * (0.02 + chaosAmt * 0.10)
         + highAmt * 0.02 * sin(t * 9.0 + cellId.x * 3.1 + cellId.y * 2.3);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float freq = 3.0 + uDensity * 9.0;
    vec2  g = p * freq;
    vec2  cellId = floor(g);
    vec2  cellF = fract(g);

    float dist1 = 1e5;
    float dist2 = 1e5;
    float siteDist = 1e5;

    for (int oy = -1; oy <= 1; oy++) {
        for (int ox = -1; ox <= 1; ox++) {
            vec2 neighbor = vec2(float(ox), float(oy));
            vec2 site = sitePoint(cellId + neighbor, t, uChaos, uHigh);
            vec2 diff = neighbor + site - cellF;
            float d = length(diff);

            if (d < dist1) {
                dist2 = dist1;
                dist1 = d;
            } else if (d < dist2) {
                dist2 = d;
            }

            // Distancia al sitio de la propia celda central (para el nodo).
            if (ox == 0 && oy == 0) {
                siteDist = d;
            }
        }
    }

    float edgeWidth = 0.015 + uD1 * 0.05;
    float edge = 1.0 - smoothstep(0.0, edgeWidth, dist2 - dist1);

    float nodeSize = 0.06 + uD2 * 0.18;
    float node = exp(-siteDist * siteDist / (nodeSize * nodeSize) * 3.0);

    float h = audioHue(uHue, uMid * 0.05);
    vec3 edgeCol = hsv2rgb(vec3(h, 0.80, 0.85));
    vec3 nodeCol = hsv2rgb(vec3(fract(h + 0.06), 0.35, 1.0));

    // Pulso que recorre la red: modula el brillo de los segmentos segun
    // su distancia al centro, viajando con el tiempo.
    float pulse = 0.5 + 0.5 * sin(length(p) * 3.0 - t * (0.6 + uSpeed * 1.5));

    vec3 col = edgeCol * edge * (0.5 + 0.5 * pulse);
    col += nodeCol * node * (1.0 + uKick * 1.2);

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
