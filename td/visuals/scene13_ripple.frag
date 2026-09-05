// ===============================================================
// SCENE 13 - RIPPLE
// Varias fuentes de onda (como gotas cayendo en un estanque) pulsando
// cada una por su cuenta, con ecos detras del frente -- donde dos
// fuentes se superponen aparece interferencia real (se suman). Reescrita
// por completo: la version anterior era un solo circulo desde el centro
// y se veia demasiado simple.
// ===============================================================
//
// COMO FUNCIONA
//
// Cada fuente vive en una posicion fija (hash por indice, repartidas por
// Density/D4) y emite un pulso que crece con el tiempo y se REINICIA
// periodicamente (mod(t*rate, 1.0) -> el radio del frente vuelve a 0 y
// arranca de nuevo) -- asi cada fuente "late" sola, a su propio ritmo.
// Detras del frente hay hasta 4 ecos concentricos, cada uno mas tenue
// (D3 controla cuantos y que tan rapido se apagan). Como todas las
// fuentes se SUMAN en el mismo pixel, donde dos ondas se cruzan el
// brillo se combina -- eso es la interferencia, sale sola de sumar,
// igual que la fusion de scene03_metaball.
//
// CONTROLES
//   Speed    empuja la velocidad de pulso de todas las fuentes
//   Density  cuantas fuentes hay (2 a 5)
//   Hue      color de las ondas
//   Chaos    cuanto derivan las fuentes de su posicion fija (quietas <->
//            se mueven lento y organico)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     todas las fuentes reciben un empujon de radio sincronizado,
//            ademas del flash -- ya llega con envolvente de golpe-y-caida
//            (audio.py)
//   High     vibracion micro del radio (excepcion del contrato)
//
// @D1: ancho del pulso (fino y nitido <-> ancho y difuso)
// @D2: velocidad a la que cada fuente late/se repite
// @D3: cuantos ecos concentricos detras del frente de cada fuente
// @D4: dispersion de las fuentes (juntas al centro <-> repartidas por
//      toda la pantalla)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int   nSources = 2 + int(floor(uDensity * 3.99));
    float width = 0.025 + uD1 * 0.11;
    float h = audioHue(uHue, uMid * 0.16);
    vec3  waveCol = hsv2rgb(vec3(h, 0.75, 1.0));

    // D4: dispersion de las fuentes.
    float spread = 0.12 + uD4 * 0.60;
    // D2: velocidad de repeticion del pulso de cada fuente.
    float pulseRate = 0.12 + uD2 * 0.55 + uSpeed * 0.35;
    // D3: cuantos ecos concentricos por pulso (1 a 4).
    int   echoes = 1 + int(floor(uD3 * 3.99));
    float echoSpacing = 0.085;

    // Kick: empuje de radio sincronizado en TODAS las fuentes, ademas
    // del flash de mas abajo -- ya llega con envolvente de golpe-y-caida.
    // Subido (0.18->0.32): pedido explicito de que el salto de radio en
    // el golpe se note mas fuerte.
    float kickPush = uKick * 0.32;

    vec3 col = vec3(0.0);

    for (int s = 0; s < 5; s++) {
        if (s >= nSources) break;
        float fs = float(s);
        vec2 seed = vec2(fs * 7.3 + 1.0, fs * 3.1 + 2.0);

        vec2 srcPos = spread * vec2(cos(hash21(seed) * TAU + fs * 1.7),
                                    sin(hash21(seed + 1.0) * TAU + fs * 2.1));
        // Chaos: deriva lenta y organica de cada fuente sobre su posicion.
        srcPos += uChaos * 0.12 * vec2(sin(t * 0.15 + fs * 2.3),
                                       cos(t * 0.12 + fs * 1.9));
        // uHigh: vibracion micro de posicion -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        srcPos += uHigh * 0.006 * vec2(sin(t * 11.0 + fs), cos(t * 9.0 + fs));

        float phase = hash21(seed + 3.0) * 10.0;
        float localT = fract(t * pulseRate + phase);
        float frontR = localT * 0.85 + kickPush;

        float d = length(p - srcPos);
        for (int e = 0; e < 4; e++) {
            if (e >= echoes) break;
            float fe = float(e);
            float rr = frontR - fe * echoSpacing;
            float dd = d - rr;
            // Se apaga un poco hacia el final de cada ciclo, para que el
            // reinicio del frente no se note como un salto brusco.
            float cycleFade = 1.0 - localT * 0.35;
            float fade = exp(-fe * 0.8) * cycleFade;
            col += waveCol * exp(-dd * dd / (width * width)) * fade;
        }
    }

    // Destello de interferencia: donde varias ondas se suman (los picos
    // de brillo naturales de superponer fuentes), un extra que se
    // enciende con Agudos -- se lee como reflejos de agua real en los
    // nodos de interferencia.
    // Umbral subido (0.55->1.1) y multiplicador bajado (1.4->0.5): con
    // el umbral bajo, cualquier zona de superposicion normal (no solo
    // los nodos de interferencia real) ya disparaba el destello a full,
    // volviendose un blob blanco solido donde se cruzaban las ondas en
    // vez de un brillo puntual y contenido.
    float interfLum = dot(col, vec3(0.299, 0.587, 0.114));
    float sparkle = smoothstep(1.1, 2.2, interfLum) * uHigh * 0.5;
    col += vec3(1.0) * sparkle;

    // Kick: flash breve, ademas del empujon de radio de arriba.
    col += col * uKick * 0.35;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    // Freno LOCAL a la suma de multiples fuentes/ecos superpuestos: con
    // Density alto (hasta 5 fuentes) y varios ecos cada una, donde 3+ se
    // cruzan, mas kick y audioLift encima, el resultado ya pasa de 1.0
    // en los TRES canales -- eso no se lee como "interferencia", se lee
    // como un blob blanco solido. Se comprime ACA, despues de todo el
    // brillo de audio (si se hace antes, kick/audioLift lo vuelven a
    // pasar de 1.0), para que la zona de cruce brille mas fuerte pero
    // sin lavarse a blanco parejo.
    vec3 excessLocal = max(col - 0.65, 0.0);
    col = col - excessLocal + excessLocal / (1.0 + excessLocal * 2.5);

    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
