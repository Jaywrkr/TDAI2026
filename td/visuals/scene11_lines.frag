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
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro de la curva (excepcion del contrato)
//
// @D1: grosor de las lineas
// @D2: frecuencia de la ondulacion (cuantas curvas por linea)
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
    vec3 lineCol = hsv2rgb(vec3(h, 0.75, 1.0));

    // Bucle de conteo fijo con corte temprano: nunca mas de 10 lineas,
    // asi el costo esta acotado sin importar el knob.
    for (int i = 0; i < 10; i++) {
        if (i >= int(count)) break;

        float baseY = -1.0 + spacing * float(i + 1);

        // uHigh: vibracion micro de la curva -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        float wobble = sin(p.x * waveFreq + t * (0.3 + uSpeed * 0.6)
                          + float(i) * 1.7)
                     * amp
                     + uHigh * 0.01 * sin(t * 12.0 + p.x * 8.0 + float(i));

        float sdf = p.y - (baseY + wobble);
        float line = edgeLine(sdf, lineW);

        col += lineCol * line;
    }

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.5);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
