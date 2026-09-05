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
    float lineW = 0.6 + uD1 * 2.5;
    float flowFreq = 0.4 + uD2 * 1.4;

    vec3 col = vec3(0.0);
    float h = audioHue(uHue, uMid * 0.16);

    // Bucle de conteo fijo con corte temprano: nunca mas de 10 lineas.
    for (int i = 0; i < 10; i++) {
        if (i >= int(count)) break;

        float fi = float(i);
        float baseY = -1.0 + spacing * (fi + 1.0);

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
        // D3: variacion de color por linea -- en 0 todas comparten el
        // mismo tono, en 1 cada una se aleja bastante del hue base.
        vec3 lineCol = hsv2rgb(vec3(fract(h + fi * 0.09 * uD3), 0.70, 1.0));
        float line = edgeLine(sdf, lineW);
        // D4: resplandor ancho ademas del trazo nitido -- en 0 no hay
        // nada extra, en 1 cada linea tiene un halo notable.
        float glow = exp(-abs(sdf) * abs(sdf) / (0.004 + uD4 * 0.05)) * uD4;

        col += lineCol * (line + glow * 0.6);
    }

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.45);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
