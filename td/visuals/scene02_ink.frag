// ===============================================================
// SCENE 02 - INK
// Tinta difundiendose en agua. Bordes suaves a proposito -- es la
// contraparte organica de la familia Pantone (scene06-10), que usa
// edgeLine para bordes duros. Aca el borde ES difuso, esa es la idea.
// ===============================================================
//
// COMO FUNCIONA
//
// Domain warp EN CADENA (warp de un warp): el espacio se desplaza una vez
// con un fbm, y ESE resultado se vuelve a desplazar con un segundo fbm.
// Una sola capa de warp da curvas; dos capas encadenadas dan el aspecto
// de tinta que se pliega sobre si misma, con zarcillos que se separan y
// se vuelven a juntar.
//
// El "cuerpo" de tinta sale de un smoothstep ANCHO sobre el campo final
// (no edgeLine): a diferencia de una vena o una linea, un borde de tinta
// en agua real no es nitido, se difumina en un rango ancho. D1 controla
// ese ancho.
//
// CONTROLES
//   Speed    velocidad de la deriva
//   Density  frecuencia del campo base (mas Density = mas zarcillos,
//            mas finos)
//   Hue      color de la tinta
//   Chaos    intensidad del domain warp encadenado -- cuanto se pliega
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro del segundo warp (excepcion del contrato)
//
// @D1: ancho del borde difuso (nitido <-> muy difuminado)
// @D2: cuanto se separa el segundo warp del primero (mas capas de pliegue)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    p += vec2(t * 0.02, t * 0.015);

    // Primer warp.
    vec2 w1 = vec2(fbm(p * 0.55 + 1.0, 4), fbm(p * 0.55 - 3.0, 4)) - 0.5;
    vec2 p2 = p + w1 * (0.35 + uChaos * 1.1);

    // Segundo warp, sobre el resultado del primero -- esto es lo que da
    // el aspecto de pliegue en vez de una sola curva simple.
    vec2 w2 = vec2(fbm(p2 * 0.85 + 7.0, 3), fbm(p2 * 0.85 - 5.0, 3)) - 0.5;
    vec2 p3 = p2 + w2 * (0.20 + uD2 * 0.9);

    // uHigh: vibracion micro del segundo warp -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    p3 += uHigh * 0.02 * vec2(sin(t * 8.0), cos(t * 6.5));

    float freq = 0.7 + uDensity * 1.8;
    float ink = fbm(p3 * freq, 5, 0.55);

    // Borde ANCHO y difuso -- D1 controla que tan nitido o difuminado es.
    float softness = 0.22 - uD1 * 0.18;
    float shape = smoothstep(0.5 - softness, 0.5 + softness, ink);

    float h = audioHue(uHue, uMid * 0.05);
    vec3 inkCol = hsv2rgb(vec3(h, 0.75, 1.0));

    vec3 col = inkCol * shape;

    // Un nucleo mas saturado donde el campo esta mas "concentrado", para
    // dar sensacion de profundidad dentro de la propia tinta.
    float core = smoothstep(0.65, 0.95, ink);
    col += hsv2rgb(vec3(fract(h + 0.03), 0.55, 1.0)) * core * 0.4;

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.45);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
