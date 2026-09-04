// ===============================================================
// SCENE 06 - GRID
// Reticula que se deforma y se colorea por celda, estilo Felipe Pantone.
// ===============================================================
//
// COMO FUNCIONA
//
// Cada linea de la rejilla sale de edgeLine() sobre fract(coord)-0.5: esa
// expresion vale 0 exactamente en el borde de cada celda, y edgeLine()
// convierte eso en una linea de ancho CONSTANTE EN PIXELES via fwidth().
// Sin eso el ancho de linea cambiaria con Density (que controla cuantas
// celdas hay) y se veria inconsistente.
//
// El color por celda sale de floor(coord): cada celda tiene un indice
// entero (cx,cy), y ese indice hasheado da un matiz. Asi cada celda es un
// bloque de color solido, como en los trabajos de Felipe Pantone.
//
// El domain warp (Chaos) deforma el espacio ANTES de tomar fract/floor,
// asi que la rejilla se curva en vez de romperse en cuadrados sueltos.
//
// CONTROLES
//   Speed    velocidad de rotacion + desplazamiento de la rejilla
//   Density  cuantas celdas hay (frecuencia de la rejilla)
//   Hue      paleta de color por celda
//   Chaos    cuanto se curva la rejilla (domain warp)
//   Bass     brillo de las lineas (audioLift)
//   Mid      tinte del color de celda (audioHue)
//   Kick     flash breve
//   High     vibracion micro de la fase de la rejilla (excepcion del
//            contrato de audio, ya suavizado)
//
// @D1: grosor de las lineas
// @D2: mezcla bloque de color / rejilla de lineas
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Rotacion lenta + deriva.
    p = rot2(t * (0.02 + uSpeed * 0.06)) * p;
    p += vec2(t * (0.01 + uSpeed * 0.04), t * (0.008 + uSpeed * 0.025));

    // Domain warp: sin esto la rejilla se ve rigida, con esto se curva
    // organicamente sin dejar de leerse como rejilla.
    float wAmt = 0.10 + uChaos * 0.35;
    vec2 w = vec2(fbm(p * 0.6 + 5.0, 3), fbm(p * 0.6 - 3.0, 3)) - 0.5;
    vec2 pw = p + w * wAmt;

    // Frecuencia de la rejilla: mas Density = mas celdas.
    float freq = 2.0 + uDensity * 8.0;
    vec2 g = pw * freq;

    // uHigh: vibracion micro de fase -- la unica excepcion del contrato de
    // audio, y a esta escala (0.03 celdas como mucho) es un detalle, no una
    // reestructuracion. uHigh ya llega suavizado desde el core.
    g += uHigh * 0.03 * vec2(sin(t * 9.0), cos(t * 7.0));

    vec2 cellId = floor(g);
    vec2 cellUv = fract(g) - 0.5;

    // Lineas de ancho constante en pixeles.
    float lineW = 0.8 + uD1 * 3.0;
    float lx = edgeLine(cellUv.x, lineW);
    float ly = edgeLine(cellUv.y, lineW);
    float lines = max(lx, ly);

    // Color por celda: cada indice entero hasheado da un matiz distinto.
    float cellHue = audioHue(fract(uHue + hash21(cellId) * 0.5), uMid * 0.05);
    vec3 cellCol = hsv2rgb(vec3(cellHue, 0.85, 0.55));

    // Color de linea: version mas clara/saturada del mismo matiz.
    vec3 lineCol = hsv2rgb(vec3(cellHue, 0.55, 1.0));

    // uD2 mezcla entre "solo lineas sobre negro" y "bloques de color solido
    // con lineas mas claras encima" -- dos lecturas distintas del mismo
    // patron.
    vec3 base = mix(vec3(0.0), cellCol * 0.5, uD2);
    vec3 col = base + lineCol * lines;

    // Kick: flash breve sobre toda la escena.
    col += lineCol * lines * uKick * 0.6;

    // Bajos: brillo de lo que ya esta claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
