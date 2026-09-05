// ===============================================================
// SCENE 11 - LINES
// Pocas lineas paralelas que se curvan suave. Lo mas minimal del set.
// ===============================================================
//
// COMO FUNCIONA
//
// A diferencia de scene06/08/10 (rejillas y anillos densos), aca Density
// mueve la CANTIDAD de lineas en un rango bajo (2 a 10) -- el punto es que
// se puedan contar a simple vista, no que formen una textura.
//
// Cada linea es horizontal en su origen, pero se curva con un fbm de baja
// frecuencia evaluado en (x, indice_de_linea): todas comparten la misma
// forma de onda mientras se desplazan verticalmente, asi se leen como una
// familia de lineas paralelas curvandose juntas, no como lineas sueltas
// con ruido independiente.
//
// edgeLine() de nuevo para ancho constante en pixeles.
//
// CONTROLES
//   Speed    velocidad a la que viaja la curvatura
//   Density  cuantas lineas hay (2 a 10 -- pocas, a proposito)
//   Hue      color de las lineas
//   Chaos    cuanto se curvan (amplitud de la ondulacion)
//   Bass/Mid/High  cada linea reacciona a UNA banda distinta (ciclando
//            bass/mid/high entre lineas), como las barras de un
//            ecualizador -- la AMPLITUD de su ondulacion sube y baja con
//            esa banda especifica, ademas del brillo (audioLift). Las
//            tres bandas ya llegan suavizadas desde audio.py (Fase 2),
//            asi que esto no reintroduce temblor.
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//
// @D1: grosor de las lineas
// @D2: frecuencia de la ondulacion (cuantas curvas por linea)
// @D3: variacion de color entre lineas (todas iguales <-> cada una un
//      tono bien distinto)
// @D4: resplandor (glow) alrededor de las lineas, ademas del trazo nitido
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Pocas lineas: Density se queda en un rango bajo a proposito.
    float count = 2.0 + floor(uDensity * 8.0);
    float spacing = 2.0 / (count + 1.0);

    float lineW = 0.6 + uD1 * 2.5;
    float waveFreq = 0.6 + uD2 * 2.5;
    float amp = 0.05 + uChaos * 0.35;

    vec3 col = vec3(0.0);
    float h = audioHue(uHue, uMid * 0.16);

    // Bucle de conteo fijo con corte temprano: nunca mas de 10 lineas,
    // asi el costo esta acotado sin importar el knob.
    for (int i = 0; i < 10; i++) {
        if (i >= int(count)) break;

        float baseY = -1.0 + spacing * float(i + 1);

        // Ecualizador: cada linea le toca UNA banda (ciclando de a 3),
        // y esa banda escala la AMPLITUD de su propia ondulacion -- asi
        // se leen como barras de frecuencia que suben y bajan con la
        // musica, cada una a su ritmo.
        float band = mod(float(i), 3.0);
        float bandAmt = (band < 0.5) ? uBass : (band < 1.5) ? uMid : uHigh;
        float ampBand = amp * (0.5 + bandAmt * 2.2);

        // uHigh: vibracion micro de la curva -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        float wobble = sin(p.x * waveFreq + t * (0.3 + uSpeed * 0.6)
                          + float(i) * 1.7)
                     * ampBand
                     + uHigh * 0.01 * sin(t * 12.0 + p.x * 8.0 + float(i));

        float sdf = p.y - (baseY + wobble);
        // sdf es solo distancia VERTICAL a la curva -- en los tramos con
        // pendiente alta (ondulacion fuerte) esa distancia ingenua se
        // achica en un rango ancho de pantalla y edgeLine (via fwidth)
        // engorda la linea hasta una barra blanca solida vertical ahi.
        // Se normaliza por la magnitud del gradiente en pantalla para
        // que el ancho percibido quede constante sin importar la
        // pendiente de la curva en ese punto.
        float sdfG = length(vec2(dFdx(sdf), dFdy(sdf)));
        float sdfN = sdf / max(sdfG, 1e-4);

        // D3: variacion de color por linea.
        vec3 lineCol = hsv2rgb(vec3(fract(h + float(i) * 0.09 * uD3), 0.75, 1.0));
        float line = edgeLine(sdfN, lineW);
        // D4: resplandor ademas del trazo nitido.
        float glow = exp(-sdfN * sdfN / (0.004 + uD4 * 0.05)) * uD4;

        // Punto de "peak" en la cresta de la onda -- refuerza el look de
        // ecualizador/VU meter. Su tamano pulsa con los bajos (perimetro
        // bailando otra vez).
        // OJO: crestDist vive en el espacio de fase (wavePhase), que se
        // recorre en x a razon de waveFreq -- con waveFreq bajo (piso
        // 0.6) un peakSize de fase moderado ya cubre casi toda la mitad
        // de la pantalla en x, y encima el ancho en sdf se dividia por
        // waveFreq (mas chico el freq, mas ancho el punto): el "punto"
        // dejaba de ser un punto y se volvia una franja blanca solida.
        // Rango de peakSize bajado y ancho en sdf ahora fijo (sin dividir
        // por waveFreq) para que siempre quede como un punto acotado.
        float wavePhase = p.x * waveFreq + t * (0.3 + uSpeed * 0.6) + float(i) * 1.7;
        float crestDist = abs(mod(wavePhase - PI * 0.5 + PI, TAU) - PI);
        float peakSize = 0.10 + uBass * 0.16;
        float peak = smoothstep(peakSize, 0.0, crestDist) * smoothstep(lineW * 1.8, 0.0, abs(sdfN));

        col += lineCol * (line + glow * 0.6) + vec3(1.0) * peak * 0.5;
    }

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.5);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
