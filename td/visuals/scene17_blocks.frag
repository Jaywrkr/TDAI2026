// ===============================================================
// SCENE 17 - BLOCKS
// Bloques rectangulares que aparecen y desaparecen. Pantone puro.
// ===============================================================
//
// COMO FUNCIONA
//
// Rejilla de celdas (igual que scene06/15). En cada celda se dibuja un
// rectangulo solido centrado (una caja SDF: max de las dos distancias en
// x/y). Que un bloque este encendido o apagado en un momento dado sale de
// hashear (indice de celda + paso de tiempo cuantizado) contra un umbral
// -- el paso de tiempo cuantizado (floor(t*rate)) es lo que hace que el
// patron cambie A SALTOS discretos, como un tablero de LEDs, en vez de
// deslizar suave.
//
// CONTROLES
//   Speed    la rejilla entera se desliza lento (efecto marquesina)
//   Density  cuantos bloques hay (resolucion de la rejilla)
//   Hue      paleta, con variacion por bloque
//   Chaos    velocidad del parpadeo (cuantos cambios por segundo)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     todos los bloques se encienden un instante
//   High     vibracion micro del borde del bloque (excepcion del
//            contrato)
//
// @D1: tamano de los bloques dentro de su celda
// @D2: proporcion de bloques encendidos en cada paso
//
// SIMPLIFICADA: menos bloques por defecto (mas grandes), parpadeo mas
// lento, y menos variacion de matiz entre bloques -- se veia demasiado
// ocupada/arcoiris con los valores default.
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    p += vec2(t * uSpeed * 0.08, t * uSpeed * 0.05);

    float freq = 2.0 + uDensity * 5.0;
    vec2  g = p * freq;
    vec2  cellId = floor(g);
    vec2  cellUv = fract(g) - 0.5;

    // uHigh: vibracion micro del borde -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    cellUv += uHigh * 0.015 * vec2(sin(t * 8.0 + cellId.x), cos(t * 6.0 + cellId.y));

    float rate = 0.3 + uChaos * 1.8;
    float stepT = floor(t * rate);
    float visHash = hash21(cellId + stepT * 7.3);

    // D2 corre el umbral: mas D2 = mas bloques encendidos por paso.
    float threshold = 0.75 - uD2 * 0.55;
    float on = step(threshold, visHash);

    // Encendido total con el kick, sin importar el hash de esa celda.
    on = max(on, uKick * step(0.5, hash21(cellId + floor(t * 30.0))));

    float fillSize = 0.28 + uD1 * 0.19;
    vec2  d = abs(cellUv) - vec2(fillSize);
    float rect = 1.0 - smoothstep(0.0, 0.025, max(d.x, d.y));

    float hue = audioHue(fract(uHue + hash21(cellId + 11.0) * 0.12), uMid * 0.05);
    vec3 blockCol = hsv2rgb(vec3(hue, 0.85, 1.0));

    vec3 col = blockCol * rect * on;

    // Bajos: brillo de lo ya claro. Nunca geometria -- el tamano del
    // bloque ya quedo fijo arriba, sin tocar audio.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.3);

    return vec4(col, 1.0);
}
