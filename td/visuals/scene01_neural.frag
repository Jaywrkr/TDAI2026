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

// Punto aleatorio pero animado dentro de cada celda -- se mueve de verdad,
// asi la red baila en vez de quedar congelada (referencia: red Voronoi
// neon que se reacomoda notoriamente todo el tiempo, no un jitter sutil).
//
// OJO: el offset base (donde vive el sitio dentro de su celda) tiene que
// escalar con Chaos, no solo el drift animado -- si el offset base fuera
// fijo, Chaos casi no cambiaria nada (se probo con un render en CPU: a
// Chaos=0.05 la red se veia casi identica a Chaos=0.5).
// driftAmt (D4): escala tanto la VELOCIDAD del drift como su alcance -- en
// 0 los sitios se mueven poco (rejilla mas calma), en 1 se reacomodan
// fuerte y rapido. Dos frecuencias superpuestas por eje (en vez de un solo
// seno) para que el reacomodo no se vea como una oscilacion mecanica
// repetitiva, sino como un baile organico que no se repite igual.
// bassAmt: un poco mas de empuje con los graves, ademas del brillo de mas
// abajo -- seguro porque uBass ya llega suavizado desde audio.py (Fase 2).
vec2 sitePoint(vec2 cellId, float t, float chaosAmt, float highAmt, float driftAmt, float bassAmt)
{
    vec2 base = hash22(cellId);
    vec2 phase = base * TAU;
    float rate1 = 0.18 + driftAmt * 0.60;
    float rate2 = rate1 * 1.7 + 0.08;
    vec2 drift = vec2(sin(t * rate1 + phase.x) + 0.5 * sin(t * rate2 * 1.3 + phase.y * 1.9),
                      cos(t * rate1 * 0.85 + phase.y) + 0.5 * cos(t * rate2 * 1.1 + phase.x * 1.3));
    float reach = 0.05 + driftAmt * 0.22 + bassAmt * 0.05;
    float spread = 0.08 + chaosAmt * 0.62;
    return 0.5 + (base - 0.5) * spread + drift * reach
         + highAmt * 0.02 * sin(t * 9.0 + cellId.x * 3.1 + cellId.y * 2.3);
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

    // D1: grosor del segmento nitido. Piso subido (0.005->0.012): la red
    // se leia demasiado fina/apagada en reposo.
    float edgeWidth = 0.012 + uD1 * 0.19;
    float edge = 1.0 - smoothstep(0.0, edgeWidth, gap);

    // D2: resplandor (glow) ancho alrededor de cada segmento -- en 0 no
    // hay nada extra (solo la linea nitida de arriba), en 1 cada linea
    // tiene un halo neon grueso, tipo tubo de luz. Reusa 'gap', cero costo
    // de muestreo adicional. Rango subido de nuevo (0.06-1.1) para que el
    // maximo sea un resplandor que casi funde la red entera.
    // El glow respira con los bajos -- mismo patron que el perimetro de
    // las metaballs, uBass ya suavizado (Fase 2).
    float glowWidth = (0.06 + uD2 * 1.10) * (1.0 + uBass * 0.3);
    float glow = exp(-max(gap, 0.0) / glowWidth) * (0.20 + uD2 * 1.0);

    float h = audioHue(uHue, uMid * 0.16);
    vec3 edgeCol = hsv2rgb(vec3(h, 0.75, 1.0));
    vec3 glowCol = hsv2rgb(vec3(fract(h + 0.02), 0.85, 1.0));

    // Pulso que recorre la red: modula el brillo de los segmentos segun
    // su distancia al centro, viajando con el tiempo. D3 controla cuantos
    // anillos concentricos entran en pantalla -- pocos y anchos <-> muchos
    // y finos, rango bien amplio para que se note en toda la perilla.
    float pulseFreq = 1.0 + uD3 * 7.0;
    float pulse = 0.5 + 0.5 * sin(length(p) * pulseFreq - t * (0.6 + uSpeed * 1.5));

    // "Paquetes de datos": un segundo anillo, mas angosto y rapido, que
    // SOLO se ve sobre los segmentos ya encendidos (edge) -- se lee como
    // un pulso viajando por la red, no como otro halo generico. La
    // velocidad sube con Mid/High, como si mas agudos = mas trafico.
    float packetFreq = pulseFreq * 2.3;
    float packetPhase = fract(length(p) * packetFreq * 0.15 - t * (0.8 + uMid * 2.0 + uHigh * 1.5));
    float packet = smoothstep(0.08, 0.0, abs(packetPhase - 0.5)) * edge;

    vec3 col = edgeCol * edge * (0.5 + 0.5 * pulse) * (1.0 + uKick * 1.2);
    col += glowCol * glow * 1.3 * (0.6 + 0.4 * pulse);
    col += vec3(1.0) * packet * 1.4;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
