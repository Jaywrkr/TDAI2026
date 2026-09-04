// ===============================================================
// SCENE 06 - MARBLE
// Manchas de color tipo marmol/oleo liquido, con vetas suaves entre
// regiones. Reemplaza a la vieja "grid" (rejilla de bloques duros,
// demasiado grafica/plana): misma familia organica que veins/ink/flow.
// ===============================================================
//
// COMO FUNCIONA
//
// Domain warp ENCADENADO (igual que scene02_ink: un warp sobre otro warp)
// para el pliegue de marmol. Sobre el resultado se evalua UN campo fbm
// escalar; ese campo se cuantiza en un numero chico de bandas (D2, 2 a 4)
// -- NO es un barrido continuo de matiz como el viejo "spectrum", cada
// banda usa uno de un par de hues cercanos entre si (offset chico sobre
// Hue), asi que el resultado es multicolor pero CONTENIDO, no arcoiris.
// El borde entre bandas se mezcla suave (D1) en vez de saltar duro, y una
// linea fina y oscura marca la veta -- eso es lo que lo hace leer como
// piedra en vez de como un poster de colores planos.
//
// CONTROLES
//   Speed    velocidad de deriva del patron
//   Density  escala del marmoleado (mas Density = manchas mas chicas)
//   Hue      hue base; las demas bandas son offsets chicos sobre este
//   Chaos    intensidad del domain warp -- cuanto se pliega el marmol
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro del warp (excepcion del contrato)
//
// @D1: nitidez del borde entre manchas (difuso <-> definido)
// @D2: cuantas bandas de color hay (2 a 4)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    p += vec2(t * 0.010, t * 0.006);

    // Warp encadenado: un pliegue sobre otro, como el cuerpo de tinta.
    vec2 w1 = vec2(fbm(p * 0.60 + 1.0, 4), fbm(p * 0.60 - 3.0, 4)) - 0.5;
    vec2 p2 = p + w1 * (0.40 + uChaos * 1.3);

    vec2 w2 = vec2(fbm(p2 * 0.90 + 7.0, 3), fbm(p2 * 0.90 - 5.0, 3)) - 0.5;
    vec2 p3 = p2 + w2 * (0.25 + uChaos * 0.8);

    // uHigh: vibracion micro del warp -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    p3 += uHigh * 0.02 * vec2(sin(t * 8.0), cos(t * 6.5));

    float freq = 0.6 + uDensity * 1.6;
    float m = fbm(p3 * freq, 5, 0.55);

    // Cuantiza el campo en 'bands' regiones, con blend suave en cada borde
    // (no un salto duro) -- eso es lo que da el aspecto de piedra en vez
    // de bloques planos.
    float bands = 2.0 + floor(uD2 * 2.99);
    float scaled = m * bands;
    float idx = floor(scaled);
    float f = fract(scaled);
    float edgeSoft = 0.06 + (1.0 - uD1) * 0.38;
    float blend = smoothstep(0.5 - edgeSoft, 0.5 + edgeSoft, f);

    // Offsets de hue CHICOS entre bandas -- multicolor contenido, no un
    // barrido completo del circulo de color.
    float hueA = audioHue(fract(uHue + idx * 0.13), uMid * 0.05);
    float hueB = audioHue(fract(uHue + (idx + 1.0) * 0.13), uMid * 0.05);
    vec3 colA = hsv2rgb(vec3(hueA, 0.68, 1.0));
    vec3 colB = hsv2rgb(vec3(hueB, 0.68, 1.0));
    vec3 col = mix(colA, colB, blend);

    // Veta oscura fina justo en el borde entre bandas.
    float veinLine = edgeLine(f - 0.5, 1.4);
    col *= 1.0 - veinLine * 0.30;

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
