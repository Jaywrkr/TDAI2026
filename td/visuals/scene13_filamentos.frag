// ===============================================================
// SCENE 36 - FILAMENTOS DE FLUJO
// Un campo de flujo organico (curl-noise via fbm) doblando espacio, y
// sobre ese mismo campo se dibujan varias familias de lineas paralelas
// que se curvan, se separan y se vuelven a juntar siguiendo el campo --
// como una visualizacion cientifica de lineas de corriente (streamlines)
// de un fluido, con marcadores tipo "sensor" (cruz, anillo, mas,
// triangulo) flotando y derivando a lo largo de esas mismas lineas.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. CAMPO DE FLUJO: se dobla el espacio (warpP) con dos capas de fbm
//    evaluadas en el tiempo -- el mismo truco de dominio-warp que usan
//    scene00/scene02, pero aca el resultado se usa como coordenada base
//    para TODO lo que sigue (lineas y marcadores viven en ese espacio
//    doblado), no solo para una mascara.
//
// 2. LINEAS: se toma una coordenada "a lo largo del flujo" (bandCoord,
//    la Y del espacio doblado mas una segunda capa de curvatura) y se
//    la vuelve periodica (fract(bandCoord*freq - scroll)) -- eso es
//    literalmente el mismo patron de "cresta que se repite" que usan
//    scene05/scene07 para sus cortinas, solo que aca la coordenada de
//    base ya viene curvada por el warp en vez de ser recta. El resultado
//    son bandas que se leen como hebras que se separan y confluyen.
//    Se dibujan 3 capas de color (nucleo grueso + dos acompañantes finas,
//    corridas en fase) para el look de "varios hilos trenzados".
//
// 3. MARCADORES: una grilla jitterada (mismo patron de sitio-por-celda
//    que scene01_neural, recorriendo las 3x3 celdas vecinas para que no
//    haya popping en los bordes) ubicada TAMBIEN en el espacio doblado y
//    corrida en el tiempo -- por eso los marcadores parecen viajar sobre
//    las mismas hebras en vez de ser un overlay independiente. Cada
//    marcador es una de 4 figuras simples (cruz/anillo/mas/triangulo,
//    elegida por hash) en uno de 4 colores (magenta/verde/naranja/rosa).
//
// CONTROLES
//   Speed    velocidad a la que el campo de flujo se retuerce y a la
//            que las hebras se desplazan
//   Density  cuantos hilos acompañantes tiene cada hebra principal (1 a 4)
//   Hue      hue base de las 3 hebras y de la paleta de marcadores
//            (offsets fijos sobre este, no barrido completo)
//   Chaos    cuanto se dobla el espacio (turbulencia del campo de flujo)
//   Bass     brillo de lo ya claro (audioLift) + la frecuencia de las
//            hebras respira un poco (empujon chico, uBass ya suavizado)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro del doblez de espacio (excepcion del
//            contrato)
//
// @D1: nitidez/grosor del nucleo de cada hebra (difuso y ancho <->
//      fino y nitido)
// @D2: frecuencia de las hebras (pocas y separadas <-> muchas y juntas)
// @D3: separacion de fase entre el nucleo y sus dos acompañantes (casi
//      pegadas <-> bien separadas, trenza abierta)
// @D4: densidad de marcadores (casi ninguno <-> campo lleno)
// @D5: velocidad a la que los marcadores derivan sobre las hebras
// @D6: ancho del resplandor suave debajo de las lineas nitidas
// ===============================================================

// --- SDFs chicas para los marcadores tipo "sensor" ---
float sdSegment(vec2 p, vec2 a, vec2 b, float thick) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - thick;
}

float sdTriangle(vec2 p, float r) {
    const float k = 1.7320508;
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}

// type: 0 cruz, 1 anillo, 2 mas, 3 triangulo. Devuelve cobertura 0..1
// ya antialiaseada (aa en unidades del mismo espacio que 's').
float markerMask(int type, vec2 q, float s, float aa) {
    float d;
    if (type == 0) {
        vec2 qr = rot2(PI * 0.25) * q;
        d = min(sdSegment(qr, vec2(-s, 0.0), vec2(s, 0.0), s * 0.16),
                sdSegment(qr, vec2(0.0, -s), vec2(0.0, s), s * 0.16));
    } else if (type == 1) {
        d = abs(length(q) - s * 0.7) - s * 0.18;
    } else if (type == 2) {
        d = min(sdSegment(q, vec2(-s, 0.0), vec2(s, 0.0), s * 0.16),
                sdSegment(q, vec2(0.0, -s), vec2(0.0, s), s * 0.16));
    } else {
        d = sdTriangle(q, s * 0.8);
    }
    return 1.0 - smoothstep(0.0, aa, d);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // --- CAMPO DE FLUJO: dominio doblado por dos capas de fbm ---
    // Chaos: cuanto se dobla el espacio. uHigh: vibracion micro del
    // doblez -- unica excepcion del contrato, amplitud pequena.
    // A PROPOSITO pocos octavos y escala grande (0.3, oct=2): el warp
    // tiene que ser SUAVE. Con mas detalle de alta frecuencia aca, su
    // gradiente se vuelve enorme en algunos pixeles y mas abajo eso hace
    // que el antialiasing de las hebras (basado en fwidth) se "trague"
    // el periodo entero -- la linea nunca se apaga y el fondo sale
    // blanco en vez de negro (bug real, encontrado renderizando).
    float warpAmt = 0.45 + uChaos * 1.15;
    vec2 warpSamp = p * 0.32 + vec2(t * 0.03, -t * 0.025);
    vec2 warp = vec2(fbm(warpSamp + 11.0, 3), fbm(warpSamp + 47.0, 3)) - 0.5;
    warp += uHigh * 0.015 * vec2(sin(t * 10.0 + p.y * 3.0), cos(t * 8.0 + p.x * 3.0));
    vec2 warpP = p + warp * warpAmt;

    // Segunda capa: curva la coordenada "a lo largo del flujo" para que
    // las hebras no sean columnas rectas dobladas, sino que se lean como
    // lineas de corriente reales que se ramifican y se vuelven a juntar.
    // Misma razon que arriba: pocos octavos, amplitud contenida.
    float curveT = t * (0.02 + uSpeed * 0.06);
    float curve = fbm(warpP * 0.5 + curveT + 5.0, 3) - 0.5;
    float bandCoord = warpP.y + curve * 1.5;

    // --- HEBRAS ---
    // D2: frecuencia. Rango bajado (era 4-15): con eso entraban 15-30
    // periodos en la pantalla y CADA periodo ya trae su propio nucleo +
    // hasta 4 acompañantes -- se leia como empapelado tejido, no como
    // unas pocas hebras de corriente cruzando la pantalla (bug real,
    // encontrado renderizando). Respira un poco con los bajos (empujon
    // chico, uBass ya suavizado en Fase 2 -- mismo patron que scene19).
    float freq = (0.9 + uD2 * 2.4) * (1.0 + uBass * 0.06);
    float scroll = t * (0.05 + uSpeed * 0.35);
    float phase = bandCoord * freq - scroll;

    // Ancho de antialiasing acotado (ver comentario del warp arriba): sin
    // el clamp, un pixel con gradiente local grande puede pedir una
    // banda de suavizado mas ancha que el propio periodo de la hebra, y
    // esa hebra queda "siempre encendida" en vez de parpadear entre
    // encendida/apagada como corresponde a una linea real.
    float aaPhase = clamp(fwidth(phase), 1e-5, 0.06);

    // D1: grosor/nitidez del nucleo. coreD vive en [0, 0.5] (mitad del
    // periodo, fract-0.5) -- coreHalf tiene que quedar bien por debajo
    // de ese techo, sino la "meseta encendida" ocupa mas de la mitad del
    // periodo y el fondo deja de leerse negro (bug real, encontrado
    // renderizando: con coreHalf cerca de 0.4 el nucleo quedaba prendido
    // casi todo el tiempo).
    float coreHalf = mix(0.16, 0.025, uD1);
    float coreD = abs(fract(phase) - 0.5);
    float core = 1.0 - smoothstep(coreHalf, coreHalf + aaPhase * 2.0, coreD);

    // D3: separacion de fase de los acompañantes respecto al nucleo.
    float sep = 0.16 + uD3 * 0.34;

    float h0 = audioHue(uHue, uMid * 0.16);
    vec3 coreCol = hsv2rgb(vec3(fract(h0 + 0.66), 0.75, 1.0));   // indigo/violeta

    // Atmosfera de fondo: un lift de color muy sutil en vez de negro
    // absoluto -- como si el flujo entero estuviera suspendido en un
    // medio tenuemente iluminado, no en el vacio.
    vec3 col = coreCol * (1.0 - smoothstep(0.0, 1.4, length(p))) * 0.035;
    col += coreCol * core;

    // Density: cuantos pares acompañantes (cyan/amarillo) hay, cada uno
    // mas fino y mas tenue que el anterior -- el look de "muchos hilos
    // finos trenzados alrededor del hilo principal".
    int nPairs = 1 + int(floor(uDensity * 3.99));
    for (int i = 0; i < 4; i++) {
        if (i >= nPairs) break;
        float fi = float(i);
        float offs = sep * (fi + 1.0);
        float halfW = coreHalf * (0.55 - fi * 0.08);
        float fade = 1.0 / (1.0 + fi * 0.6);

        float dA = abs(fract(phase + offs) - 0.5);
        float lineA = (1.0 - smoothstep(halfW, halfW + aaPhase * 2.0, dA)) * fade;
        vec3 colA = hsv2rgb(vec3(fract(h0 + 0.5), 0.65, 1.0));    // cyan
        col += colA * lineA;

        float dB = abs(fract(phase - offs) - 0.5);
        float lineB = (1.0 - smoothstep(halfW, halfW + aaPhase * 2.0, dB)) * fade;
        vec3 colB = hsv2rgb(vec3(fract(h0 + 0.15), 0.85, 1.0));   // amarillo
        col += colB * lineB;
    }

    // D6: resplandor suave debajo de las lineas nitidas (gaussiana ancha
    // centrada en el nucleo, mismo espiritu que la cortina de scene07).
    float glowW = 0.05 + uD6 * 0.35;
    float glow = exp(-coreD * coreD / (glowW * glowW));
    col += coreCol * glow * (0.12 + uD6 * 0.28);

    // --- MARCADORES ---
    // Viven en el MISMO espacio doblado (warpP), corridos en el tiempo
    // -- por eso derivan sobre las hebras en vez de flotar aparte.
    // D5: velocidad de esa deriva.
    vec2 markP = warpP - vec2(0.0, 1.0) * t * (0.03 + uD5 * 0.22);
    // D4: densidad -- controla el tamano de celda de la grilla (celdas
    // mas chicas = mas marcadores por pantalla).
    float cell = mix(1.1, 0.28, uD4);
    vec2 g = markP / cell;
    vec2 gi = floor(g);

    vec3 markCol = vec3(0.0);
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            vec2 id = gi + vec2(dx, dy);
            vec2 jitter = hash22(id) - 0.5;
            vec2 site = (id + 0.5 + jitter * 0.7) * cell;

            // No todas las celdas tienen marcador -- sino se ve como una
            // grilla, no como un campo disperso.
            float spawn = hash21(id + 3.0);
            if (spawn > 0.55) continue;

            vec2 q = markP - site;
            float s = cell * (0.16 + hash21(id + 9.0) * 0.10);
            float aa = max(fwidth(q.x), fwidth(q.y)) * 1.5 + 1e-4;

            int type = int(floor(hash21(id + 21.0) * 4.0));
            float rotJ = (hash21(id + 33.0) - 0.5) * 1.4;
            vec2 qr = rot2(rotJ) * q;
            float m = markerMask(type, qr, s, aa);

            float colH = fract(h0 + 0.18 + hash21(id + 41.0) * 0.7);
            vec3 mc = hsv2rgb(vec3(colH, 0.75, 1.0));
            markCol += mc * m;
        }
    }
    col += markCol * 0.85;

    // PIANO: un marcador extra, mucho mas brillante, nace en la posicion
    // que elige uKeypos y se apaga solo (uKeypulse decae) -- mismo
    // tratamiento que el blob de invitado en otras escenas (scene03,
    // scene13), no una franja plana encima.
    if (uKeypulse > 0.0015) {
        vec2 guestPos = centered(vec2(mix(0.12, 0.88, uKeypos), 0.5));
        float dG = length(p - guestPos);
        float burst = exp(-dG * dG * 5.0) * uKeypulse * (0.6 + uKeyvel * 0.9);
        col += hsv2rgb(vec3(fract(h0 + 0.5), 0.7, 1.0)) * burst;
    }

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria (salvo el empujon
    // chico de frecuencia de arriba, ya suavizado -- ver contrato).
    col = audioLift(col, uBass * 0.75);

    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
