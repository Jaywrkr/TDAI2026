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
// Sin puntos de nodo: solo la red de segmentos, mas un resplandor (glow)
// suave alrededor de cada linea que le da profundidad neon sin llenar el
// centro de cada celda de manchas -- reusa dist2-dist1, asi que no cuesta
// nada extra.
//
// CONTROLES
//   Speed    velocidad de los pulsos que recorren la red
//   Density  cuantas celdas hay (mas celdas = red mas fina)
//   Hue      paleta
//   Chaos    cuanto se alejan los sitios del centro de su celda -- mas
//            Chaos = red mas irregular, menos = mas ordenada/rejilla
//   Bass     brillo de lo ya claro (audioLift) + un poco de movimiento de
//            los sitios (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro de los sitios (excepcion del contrato)
//
// @D1: grosor de los segmentos
// @D2: cantidad de resplandor (glow) alrededor de los segmentos
// @D3: frecuencia radial del pulso (pocos anillos anchos <-> muchos y finos)
// @D4: velocidad de deriva de los sitios (rejilla casi fija <-> siempre
//      reacomodandose)
// ===============================================================

// Punto aleatorio pero animado dentro de cada celda -- se mueve poco a
// poco, asi la red respira en vez de quedar congelada.
//
// OJO: el offset base (donde vive el sitio dentro de su celda) tiene que
// escalar con Chaos, no solo el drift animado -- si el offset base fuera
// fijo, Chaos casi no cambiaria nada (se probo con un render en CPU: a
// Chaos=0.05 la red se veia casi identica a Chaos=0.5).
// driftAmt (D4): escala tanto la VELOCIDAD del drift (t * driftRate) como
// su alcance -- en 0 los sitios casi no se mueven (rejilla congelada), en 1
// se reacomodan todo el tiempo, notablemente mas vivo que Chaos solo.
// bassAmt: un poco de movimiento de los sitios con los graves, ademas del
// brillo de mas abajo -- seguro porque uBass ya llega suavizado desde
// audio.py (Fase 2), escala chica igual que la excepcion de uHigh.
vec2 sitePoint(vec2 cellId, float t, float chaosAmt, float highAmt, float driftAmt, float bassAmt)
{
    vec2 base = hash22(cellId);
    float driftRate = 0.05 + driftAmt * 0.35;
    vec2 drift = vec2(sin(t * driftRate + base.x * 6.28), cos(t * driftRate * 0.8 + base.y * 6.28));
    float spread = 0.08 + chaosAmt * 0.62;
    return 0.5 + (base - 0.5) * spread + drift * (0.015 + driftAmt * 0.14)
         + highAmt * 0.02 * sin(t * 9.0 + cellId.x * 3.1 + cellId.y * 2.3)
         + bassAmt * 0.03 * sin(t * 2.0 + cellId.x * 1.3 + cellId.y * 1.7);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Celdas mas grandes que antes (freq base bajo): antes iba de 3 a 12,
    // ahora de 1.6 a 7.6 -- Density sigue funcionando igual de proporcional,
    // solo que el rango entero da celdas mas grandes en cualquier posicion
    // de la perilla.
    float freq = 1.6 + uDensity * 6.0;
    vec2  g = p * freq;
    vec2  cellId = floor(g);
    vec2  cellF = fract(g);

    float dist1 = 1e5;
    float dist2 = 1e5;

    for (int oy = -1; oy <= 1; oy++) {
        for (int ox = -1; ox <= 1; ox++) {
            vec2 neighbor = vec2(float(ox), float(oy));
            vec2 site = sitePoint(cellId + neighbor, t, uChaos, uHigh, uD4, uBass);
            vec2 diff = neighbor + site - cellF;
            float d = length(diff);

            if (d < dist1) {
                dist2 = dist1;
                dist1 = d;
            } else if (d < dist2) {
                dist2 = d;
            }
        }
    }

    float gap = dist2 - dist1;

    // D1: grosor del segmento nitido. Rango mas amplio que antes (0.008 a
    // 0.10) para que se note en toda la perilla, no solo en la mitad de
    // arriba.
    float edgeWidth = 0.008 + uD1 * 0.10;
    float edge = 1.0 - smoothstep(0.0, edgeWidth, gap);

    // D2: resplandor (glow) ancho alrededor de cada segmento -- en 0 no
    // hay nada extra (solo la linea nitida de arriba), en 1 cada linea
    // tiene un halo neon notable. Reusa 'gap', cero costo de muestreo
    // adicional.
    float glowWidth = 0.03 + uD2 * 0.55;
    float glow = exp(-max(gap, 0.0) / glowWidth) * uD2;

    float h = audioHue(uHue, uMid * 0.16);
    vec3 edgeCol = hsv2rgb(vec3(h, 0.80, 0.85));
    vec3 glowCol = hsv2rgb(vec3(fract(h + 0.04), 0.55, 1.0));

    // Pulso que recorre la red: modula el brillo de los segmentos segun
    // su distancia al centro, viajando con el tiempo. D3 controla cuantos
    // anillos concentricos entran en pantalla -- pocos y anchos <-> muchos
    // y finos, rango bien amplio para que se note en toda la perilla.
    float pulseFreq = 1.0 + uD3 * 7.0;
    float pulse = 0.5 + 0.5 * sin(length(p) * pulseFreq - t * (0.6 + uSpeed * 1.5));

    vec3 col = edgeCol * edge * (0.5 + 0.5 * pulse) * (1.0 + uKick * 1.2);
    col += glowCol * glow * 0.8 * (0.6 + 0.4 * pulse);

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
