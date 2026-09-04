// ===============================================================
// SCENE 08 - NEBULA
// Humo/plasma turbulento en capas, dos hues mezclados suavemente.
// Reemplaza a la vieja "moire" (entramado de lineas geometricas, muy
// fria/grafica): misma familia organica que caustics/ink.
// ===============================================================
//
// COMO FUNCIONA
//
// Domain warp encadenado (igual que scene02_ink / scene06_marble) sobre
// un campo fbm, pero el resultado pasa por ridge() en vez de un
// smoothstep de forma: ridge() (ya definido en el header comun) convierte
// un campo de ruido en FILAMENTOS finos en vez de manchas -- eso es lo
// que da el aspecto de humo/tendril en vez de nubes solidas. Chaos
// controla que tan afilados son esos filamentos.
//
// El color mezcla DOS hues (offset chico entre si, no un barrido) segun
// un segundo campo fbm INDEPENDIENTE del que define la forma -- asi el
// color no queda pegado 1:1 a la forma del humo, se lee como si el humo
// mismo tuviera regiones de temperatura distinta.
//
// CONTROLES
//   Speed    velocidad de la deriva del humo
//   Density  escala del patron (mas Density = filamentos mas finos)
//   Hue      hue base; el segundo hue es un offset chico sobre este
//   Chaos    que tan afilados/turbulentos son los filamentos
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     pulso de humo brillante, breve
//   High     vibracion micro del warp (excepcion del contrato)
//
// @D1: cuanto se pliega el humo (domain warp)
// @D2: densidad general del humo (opacidad)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    p += vec2(t * 0.020, -t * 0.015);

    float turb = 0.3 + uD1 * 1.4;
    vec2 w1 = vec2(fbm(p * 0.50 + 2.0, 4), fbm(p * 0.50 - 6.0, 4)) - 0.5;
    vec2 p2 = p + w1 * turb;

    vec2 w2 = vec2(fbm(p2 * 1.10 + 9.0, 3), fbm(p2 * 1.10 - 1.0, 3)) - 0.5;
    vec2 p3 = p2 + w2 * (turb * 0.6);

    // uHigh: vibracion micro del warp -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    p3 += uHigh * 0.02 * vec2(sin(t * 9.0), cos(t * 7.0));

    float freq = 0.8 + uDensity * 1.6;
    float density = 0.4 + uD2 * 1.3;

    float n = fbm(p3 * freq, 5, 0.55);
    float smoke = ridge(n, 1.5 + uChaos * 2.0) * density;

    float h = audioHue(uHue, uMid * 0.05);
    vec3 colA = hsv2rgb(vec3(h, 0.70, 1.0));
    vec3 colB = hsv2rgb(vec3(fract(h + 0.18), 0.55, 1.0));

    // Segundo campo, independiente del que define la forma -- decide la
    // mezcla de color, no la forma del humo.
    float mixField = fbm(p3 * freq * 0.5 + 13.0, 3);
    vec3 col = mix(colA, colB, mixField) * smoke;

    // Kick: pulso de humo brillante, breve.
    col += col * uKick * 0.6;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.75);

    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
