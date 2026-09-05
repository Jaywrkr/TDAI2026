// ===============================================================
// SCENE 18 - TUNNEL
// Tunel en coordenadas polares. Sin raymarching, por eso es barato.
// ===============================================================
//
// COMO FUNCIONA
//
// El truco clasico de "tunel barato": en vez de simular una camara
// volando por un tubo 3D (raymarching, caro), se reinterpreta el plano
// 2D en coordenadas polares. El angulo (atan) se convierte en la
// coordenada "alrededor del tubo", y 1/radio se convierte en la
// coordenada "hacia adentro del tubo" -- el centro de la pantalla
// (radio chico) mapea a "lejos", el borde (radio grande) mapea a "cerca".
// Sumarle tiempo a esa segunda coordenada da la sensacion de volar hacia
// el centro.
//
// Sobre esas dos coordenadas se dibuja una rejilla (anillos + segmentos
// radiales, ambos con edgeLine) mas un relleno tipo tablero de ajedrez
// tenue -- ninguna geometria 3D real, todo pasa en 2D.
//
// CONTROLES
//   Speed    velocidad de vuelo hacia el centro
//   Density  cuantos anillos hay (frecuencia "hacia adentro")
//   Hue      color del tunel
//   Chaos    cuanto se retuerce el tunel (deja de ser recto)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro del angulo (excepcion del contrato)
//
// @D1: grosor de las lineas de la rejilla
// @D2: cuantos segmentos radiales hay (frecuencia "alrededor")
//
// SIMPLIFICADA: menos anillos y segmentos por defecto, lineas mas
// gruesas, y el relleno de tablero de ajedrez mucho mas tenue -- se
// veia demasiado ocupada con los valores default.
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float r = length(p);
    float ang = atan(p.y, p.x);

    float depth = 1.0 / (r + 0.2) + t * (0.3 + uSpeed * 1.3);

    // Chaos retuerce el angulo segun la profundidad -- el tunel deja de
    // ser recto y empieza a curvarse como una manguera.
    ang += uChaos * 0.4 * sin(depth * 1.5);

    // uHigh: vibracion micro del angulo -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    ang += uHigh * 0.01 * sin(t * 12.0 + depth * 3.0);

    float angFreq = 3.0 + uD2 * 5.0;
    float ringFreq = 3.0 + uDensity * 5.0;

    float segCoord = ang / TAU * angFreq;
    float ringCoord = depth * ringFreq * 0.25;

    float lineW = 1.2 + uD1 * 3.0;
    float ringLine = edgeLine(fract(ringCoord) - 0.5, lineW);
    float segLine = edgeLine(fract(segCoord) - 0.5, lineW);
    float lines = max(ringLine, segLine);

    // Relleno tipo tablero de ajedrez, MUY tenue -- apenas le da volumen
    // a la rejilla, sin competir con las lineas.
    float checker = mod(floor(segCoord) + floor(ringCoord), 2.0);
    float fill = checker * 0.06;

    float h = audioHue(uHue, uMid * 0.16);
    vec3 col = hsv2rgb(vec3(h, 0.70, 1.0)) * (lines + fill);

    // Niebla: se apaga hacia el centro (que es "lejos" en este mapeo),
    // para reforzar la sensacion de profundidad infinita.
    float fog = clamp(1.0 - r * 0.15, 0.15, 1.0);
    col *= fog;

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.25);

    return vec4(col, 1.0);
}
