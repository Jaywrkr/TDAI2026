// ===============================================================
// SCENE 12 - CONTOUR
// Curvas de nivel topograficas de un campo de ruido lento.
// ===============================================================
//
// COMO FUNCIONA
//
// Un solo campo de altura h = fbm(...) se evalua UNA vez por pixel.
// Density decide cuantas curvas de nivel se dibujan (entre 3 y 10,
// bucle de conteo fijo con corte temprano); cada curva es simplemente
// edgeLine(h - umbral_i, ancho) para un umbral distinto, reusando el
// mismo campo h -- no hay que recalcular ruido por curva, solo comparar
// contra un numero distinto. Por eso sale barato aunque haya varias
// curvas.
//
// Mas alto (mas cerca de la cima del "terreno") se ve un poco mas
// brillante, como en un mapa topografico real -- ayuda a leer la forma
// del terreno en vez de ver solo lineas sueltas.
//
// CONTROLES
//   Speed    el terreno se desplaza lento
//   Density  cuantas curvas de nivel hay (3 a 10)
//   Hue      color de las curvas
//   Chaos    rugosidad del terreno (domain warp + octavas efectivas)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro de las curvas (excepcion del contrato)
//
// @D1: grosor de las curvas
// @D2: escala del terreno (mas D2 = terreno mas fino y detallado)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float scale = 0.5 + uD2 * 1.5;
    vec2 warpP = p * scale + vec2(t * (0.01 + uSpeed * 0.06), t * (0.008 + uSpeed * 0.04));

    // uChaos anade un domain warp que rompe la simetria del ruido base --
    // sin esto el terreno se ve demasiado regular.
    vec2 warp = vec2(fbm(warpP + 4.0, 3), fbm(warpP - 2.0, 3)) - 0.5;
    warpP += warp * (0.15 + uChaos * 0.6);

    float h = fbm(warpP, 4, 0.5);

    // uHigh: vibracion micro del campo de altura -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    h += uHigh * 0.015 * sin(t * 10.0 + p.x * 6.0 + p.y * 6.0);

    float lineW = 0.6 + uD1 * 2.2;
    float levels = 3.0 + floor(uDensity * 7.0);

    float hCol = audioHue(uHue, uMid * 0.05);
    vec3 col = vec3(0.0);

    // Bucle de conteo fijo con corte temprano: nunca mas de 10 curvas.
    for (int i = 0; i < 10; i++) {
        if (i >= int(levels)) break;

        float threshold = (float(i) + 0.5) / levels;
        float line = edgeLine(h - threshold, lineW);

        // Mas alto = un poco mas brillante, como en un mapa real.
        float bright = 0.5 + 0.5 * (float(i) / max(levels - 1.0, 1.0));
        col += hsv2rgb(vec3(hCol, 0.65, bright)) * line;
    }

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.45);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
