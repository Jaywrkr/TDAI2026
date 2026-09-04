// ===============================================================
// SCENE 09 - SCANLINE
// Glitch de bandas horizontales con separacion cromatica, estilo VHS/CRT.
// ===============================================================
//
// COMO FUNCIONA
//
// No hay video que "romper": el contenido de base es ruido de columna
// (estatica) sobre un tinte de matiz. El glitch esta en como se MUESTREA
// eso, no en el contenido:
//
// 1. La pantalla se divide en bandas horizontales (floor(uv.y * bands)).
// 2. Cada banda tiene un desplazamiento horizontal propio, sacado de
//    hashear el indice de banda (distinto por banda, cambia con el tiempo
//    a saltos -- asi se ve como un tearing real, no como una onda suave).
// 3. Los tres canales de color se muestrean con un offset horizontal
//    LIGERAMENTE distinto cada uno -- eso es la aberracion cromatica.
//
// OJO -- el contenido de base tiene que tener detalle FINO para que el
// desplazamiento se note. Un degradado liso no revela ningun corrimiento
// horizontal por mas grande que sea (un gradiente desplazado sigue siendo
// el mismo gradiente). Por eso la estatica de columna, no un degradado
// puro: verificado con un render en CPU antes de asumir que el glitch se
// veia solo por tener la matematica del shift.
//
// CONTROLES
//   Speed    velocidad a la que el tinte de fondo recorre la paleta
//   Density  cuantas bandas horizontales hay
//   Hue      color base del degradado
//   Chaos    cuanto se desplazan las bandas Y cuanta estatica hay en
//            total -- en 0 es un color liso y calmo, sin ruido
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     glitch de pantalla completa, breve
//   High     temblor micro adicional del offset (excepcion del contrato)
//
// @D1: cantidad de aberracion cromatica
// @D2: que tan seguido cambia el desplazamiento de cada banda
//
// SIMPLIFICADA: se veia demasiado ocupada por defecto (muchas bandas
// finas + estatica densa a la vez). Bajado el rango de bandas, la
// resolucion de la estatica y cuanto Chaos mezcla de estatica por
// defecto -- los knobs siguen pudiendo llevarla a full glitch, pero el
// reposo ahora es mucho mas liso.
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;

    // Cuantas bandas, y a que paso de tiempo cambian (mas D2 = cambios mas
    // frecuentes, menos D2 = bandas que se quedan quietas mas rato).
    float bands = 4.0 + uDensity * 14.0;
    float bandId = floor(uv.y * bands);
    float step_t = floor(t * (0.6 + uD2 * 4.0));

    // Desplazamiento por banda: hash distinto por banda Y por paso de
    // tiempo, asi el patron cambia a saltos en vez de deslizar suave.
    float shiftHash = hash21(vec2(bandId, step_t)) - 0.5;
    float glitchAmt = 0.02 + uChaos * 0.35;
    float shift = shiftHash * glitchAmt;

    // Kick: glitch de pantalla completa, breve y fuerte.
    shift += (hash21(vec2(bandId, floor(t * 30.0))) - 0.5) * uKick * 0.4;

    // uHigh: temblor micro adicional -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado desde el core.
    shift += uHigh * 0.01 * sin(t * 20.0 + bandId);

    // Aberracion cromatica: cada canal muestrea con su propio offset extra.
    float aberr = 0.003 + uD1 * 0.022;
    float xR = uv.x + shift + aberr;
    float xG = uv.x + shift;
    float xB = uv.x + shift - aberr;

    // Estatica de columna: ruido de alta frecuencia en x, distinto por
    // banda. Esto es lo que hace VISIBLE el desplazamiento -- sin detalle
    // fino, un corrimiento horizontal no se nota en nada.
    float cols = 24.0 + uDensity * 70.0;
    float nR = hash21(vec2(floor(xR * cols), bandId));
    float nG = hash21(vec2(floor(xG * cols), bandId));
    float nB = hash21(vec2(floor(xB * cols), bandId));

    // Tinte base: un matiz que viaja lento con el tiempo, sin depender de x
    // (asi el color de fondo no compite con el shift -- el shift se lee en
    // la estatica, el matiz da la paleta).
    float hBase = audioHue(fract(uHue + t * (0.02 + uSpeed * 0.12)), uMid * 0.05);
    vec3 base = hsv2rgb(vec3(hBase, 0.70, 1.0));
    vec3 staticCol = base * (0.30 + 0.70 * vec3(nR, nG, nB));

    // Chaos tambien controla CUANTA estatica hay en total, no solo su
    // textura -- en Chaos=0 esto es un color liso y calmo (sin esto, la
    // escena nunca tenia un extremo minimal de verdad, siempre se veia
    // ruidosa aunque Density estuviera baja).
    vec3 col = mix(base, staticCol, 0.05 + uChaos * 0.55);

    // Lineas de barrido sutiles (el propio "scanline" del nombre): una
    // banda oscura fina cada cierta cantidad de filas.
    // OJO: la frecuencia importa. "* PI" da un ciclo cada 2 pixeles
    // exactos -- el peor caso posible de aliasing (limite de Nyquist) sin
    // ningun antialiasing. "* PI * 0.5" da un ciclo cada 4 pixeles, con
    // margen de sobra.
    float scan = 0.85 + 0.15 * sin(uv.y * uResH * PI * 0.5);
    col *= scan;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.25);

    return vec4(col, 1.0);
}
