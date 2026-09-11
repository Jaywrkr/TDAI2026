// ===============================================================
// SCENE 36 - FILAMENTOS DE FLUJO
// Un campo de flujo organico (curl-noise via fbm) doblando espacio, y
// sobre ese mismo campo se dibuja una hebra (nucleo + un solo
// acompañante) que se curva, se separa y se vuelve a juntar siguiendo
// el campo -- como una linea de corriente de un fluido. Simplificada a
// proposito (pedido explicito, "mas sencillo todo"): se saco la capa
// de marcadores flotantes y se bajo de 3 colores a 2.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. CAMPO DE FLUJO: se dobla el espacio (warpP) con dos capas de fbm
//    evaluadas en el tiempo -- el mismo truco de dominio-warp que usan
//    scene00/scene02, pero aca el resultado se usa como coordenada base
//    para la linea entera, no solo para una mascara.
//
// 2. LINEA: se toma una coordenada "a lo largo del flujo" (bandCoord,
//    la Y del espacio doblado mas una segunda capa de curvatura) y se
//    la vuelve periodica (fract(bandCoord*freq - scroll)) -- eso es
//    literalmente el mismo patron de "cresta que se repite" que usan
//    scene05/scene07 para sus cortinas, solo que aca la coordenada de
//    base ya viene curvada por el warp en vez de ser recta.
//
// CONTROLES
//   Speed    velocidad a la que el campo de flujo se retuerce y a la
//            que la hebra se desplaza
//   Density  cuanto se nota el hilo acompañante junto al nucleo
//   Hue      hue base de la hebra (offset fijo sobre este, no barrido
//            completo)
//   Chaos    cuanto se dobla el espacio (turbulencia del campo de flujo)
//   Bass     brillo de lo ya claro (audioLift) + la frecuencia de la
//            hebra respira un poco (empujon chico, uBass ya suavizado)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro del doblez de espacio (excepcion del
//            contrato)
//
// @D1: nitidez/grosor del nucleo de la hebra (difuso y ancho <-> fino
//      y nitido)
// @D2: frecuencia de la hebra (pocas y separadas <-> muchas y juntas)
// @D3: separacion de fase entre el nucleo y su acompañante (casi
//      pegados <-> bien separados)
// @D4: reservado (antes controlaba los marcadores, ya sacados de esta
//      escena para simplificarla)
// @D5: reservado (antes controlaba la deriva de los marcadores)
// @D6: ancho del resplandor suave debajo de la linea nitida
// ===============================================================

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

    // Density: cuanto se nota el hilo acompañante -- simplificado a UN
    // solo acompañante (antes hasta 4 pares en 2 colores) para que la
    // escena se lea mas simple, pedido explicito ("mas sencillo todo").
    float halfW = coreHalf * 0.5;
    float dA = abs(fract(phase + sep) - 0.5);
    float lineA = (1.0 - smoothstep(halfW, halfW + aaPhase * 2.0, dA)) * uDensity;
    vec3  colA = hsv2rgb(vec3(fract(h0 + 0.5), 0.6, 1.0));    // cyan
    col += colA * lineA;

    // D6: resplandor suave debajo de las lineas nitidas (gaussiana ancha
    // centrada en el nucleo, mismo espiritu que la cortina de scene07).
    float glowW = 0.05 + uD6 * 0.35;
    float glow = exp(-coreD * coreD / (glowW * glowW));
    col += coreCol * glow * (0.12 + uD6 * 0.28);

    // PIANO: un destello extra, mucho mas brillante, nace en la posicion
    // que elige uKeypos y se apaga solo (uKeypulse decae).
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
