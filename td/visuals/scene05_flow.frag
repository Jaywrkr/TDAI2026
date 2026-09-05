// ===============================================================
// SCENE 05 - FLOW
// Campo de flujo. Lineas de corriente, sin simular particulas reales.
// ===============================================================
//
// COMO FUNCIONA
//
// Misma estructura de lineas que scene11 (pocas lineas, bucle de conteo
// fijo, edgeLine), pero en vez de curvarlas con un seno simple (onda
// uniforme y predecible), se curvan con un fbm evaluado en la posicion --
// eso da un doblez organico e irregular, como una corriente real, en vez
// de una ola de piscina. Es la diferencia entre scene11 (minimal,
// geometrico) y esta escena (organica, turbulenta).
//
// No hay simulacion de particulas ni integracion de un campo vectorial
// real -- seria mucho mas caro. Esto es una aproximacion visual barata
// que se lee igual de bien: lineas que fluyen con curvatura organica.
//
// CONTROLES
//   Speed    velocidad de la corriente
//   Density  cuantas lineas de corriente hay
//   Hue      color de las lineas
//   Chaos    cuanto se dobla cada linea (turbulencia)
//   Bass     brillo de lo ya claro (audioLift) + un poco de movimiento del
//            doblez (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro del doblez (excepcion del contrato)
//
// @D1: grosor de las lineas
// @D2: frecuencia espacial del campo de flujo (corrientes anchas <->
//      finas y apretadas)
// @D3: variacion de color entre lineas (todas iguales <-> cada una un
//      tono bien distinto)
// @D4: resplandor (glow) alrededor de las lineas, ademas del trazo nitido
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float count = 3.0 + floor(uDensity * 7.0);
    float spacing = 2.0 / (count + 1.0);
    // El grosor respira con los bajos -- mismo patron que el perimetro
    // de las metaballs, uBass ya suavizado (Fase 2).
    // Piso subido (0.6->0.9): trazo un poco mas presente en reposo.
    float lineW = (0.9 + uD1 * 2.2) * (1.0 + uBass * 0.2);
    float flowFreq = 0.4 + uD2 * 1.4;

    vec3 col = vec3(0.0);
    float h = audioHue(uHue, uMid * 0.16);

    // PIANO: onda de choque real -- aparta las corrientes existentes
    // cerca de la altura elegida por uKeypos (empuja baseY DENTRO del
    // loop, no un overlay), como si algo real irrumpiera en el flujo.
    // uKeypulse decae solo; uKeyvel escala la fuerza del empujon.
    float guestY = mix(-0.95, 0.95, uKeypos);
    float guestPush = uKeypulse * (0.20 + uKeyvel * 0.30);

    // Bucle de conteo fijo con corte temprano: nunca mas de 10 lineas.
    for (int i = 0; i < 10; i++) {
        if (i >= int(count)) break;

        float fi = float(i);
        float baseY = -1.0 + spacing * (fi + 1.0);
        float toGuestY = baseY - guestY;
        baseY += guestPush * exp(-toGuestY * toGuestY * 12.0) * sign(toGuestY + 1e-4);

        vec2 samp = vec2(p.x * flowFreq, baseY * flowFreq + fi * 3.1)
                    + vec2(t * (0.04 + uSpeed * 0.12), 0.0);
        float bend = (fbm(samp, 4) - 0.5) * (0.5 + uChaos * 1.4);

        // uHigh: vibracion micro del doblez -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        bend += uHigh * 0.01 * sin(t * 10.0 + p.x * 6.0 + fi);
        // Bass: un poco de movimiento del doblez ademas del brillo de mas
        // abajo -- seguro porque uBass ya llega suavizado (Fase 2).
        bend += uBass * 0.04 * sin(t * 1.6 + fi * 2.3);

        float sdf = p.y - (baseY + bend);
        // sdf de arriba es solo la distancia VERTICAL a la curva, no la
        // distancia perpendicular real -- en los tramos donde el fbm
        // dobla fuerte (pendiente alta) esa distancia ingenua queda muy
        // chica en un rango ancho de pantalla, y edgeLine (que usa
        // fwidth) engorda la linea hasta volverse una barra blanca
        // solida vertical ahi. Se corrige normalizando por la magnitud
        // del gradiente en pantalla (tecnica estandar para "distancias"
        // que salen de una funcion implicita), asi el ancho percibido
        // se queda constante sin importar que tan empinada este la curva.
        float sdfG = length(vec2(dFdx(sdf), dFdy(sdf)));
        float sdfN = sdf / max(sdfG, 1e-4);

        // D3: variacion de color por linea -- en 0 todas comparten el
        // mismo tono, en 1 cada una se aleja bastante del hue base.
        vec3 lineCol = hsv2rgb(vec3(fract(h + fi * 0.09 * uD3), 0.70, 1.0));
        float line = edgeLine(sdfN, lineW);
        // D4: resplandor ancho ademas del trazo nitido -- en 0 no hay
        // nada extra, en 1 cada linea tiene un halo notable.
        float glow = exp(-abs(sdfN) * abs(sdfN) / (0.004 + uD4 * 0.05)) * uD4;

        // Chispa viajando a lo largo de la corriente -- solo se ve sobre
        // la propia linea. Kick le da un salto de velocidad instantaneo,
        // ademas del brillo de mas abajo.
        // Mascara angosta (antes lineW*3.0 -- con varias lineas juntas
        // el spark se filtraba a las lineas vecinas y, cuando varias
        // fases coincidian en la misma columna x, se veia como una
        // barra blanca solida vertical). Intensidad tambien bajada
        // (1.6 -> 0.9) por el mismo motivo.
        float sparkPhase = fract(p.x * 0.35 - t * (0.3 + uSpeed * 0.9 + uKick * 3.0) + fi * 1.3);
        float spark = smoothstep(0.05, 0.0, abs(sparkPhase - 0.5))
                    * smoothstep(lineW * 1.3, 0.0, abs(sdfN));

        col += lineCol * (line + glow * 0.6 + spark * 0.9);
    }

    // PIANO: la corriente nueva en si -- MISMO tratamiento de bend (fbm
    // real) que las demas lineas, no un blanco liso encima, asi que se
    // integra al campo de flujo de verdad.
    if (uKeypulse > 0.0015) {
        vec2 guestSamp = vec2(p.x * flowFreq, guestY * flowFreq + 9.7)
                         + vec2(t * (0.04 + uSpeed * 0.12), 0.0);
        float guestBend = (fbm(guestSamp, 4) - 0.5) * (0.5 + uChaos * 1.4);
        float guestSdf = p.y - (guestY + guestBend);
        float guestSdfG = length(vec2(dFdx(guestSdf), dFdy(guestSdf)));
        float guestSdfN = guestSdf / max(guestSdfG, 1e-4);
        float guestLine = edgeLine(guestSdfN, lineW * 1.6) * uKeypulse * (0.7 + uKeyvel * 1.3);
        col += vec3(1.0) * guestLine;
    }

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.45);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
