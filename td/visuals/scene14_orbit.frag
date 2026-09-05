// ===============================================================
// SCENE 14 - ORBIT
// Pocas orbitas circulares de trazo fino, con un nodo viajando en cada una.
// ===============================================================
//
// COMO FUNCIONA
//
// Cada orbita es un circulo tenue (edgeLine sobre |r - radio|, como en
// scene10 pero una sola linea, no un sawtooth repetido) mas un punto
// brillante que viaja sobre ese circulo a su propia velocidad. El circulo
// en si queda muy tenue -- es guia visual, no protagonista; el nodo que
// viaja es lo que se lee primero.
//
// Bucle de conteo fijo (max 6) con corte temprano segun Density.
//
// CONTROLES
//   Speed    velocidad de traslacion de los nodos
//   Density  cuantas orbitas hay (2 a 6)
//   Hue      paleta: cada orbita un matiz distinto, derivados de Hue
//   Chaos    cuanto respira el radio de cada orbita (deja de ser un
//            circulo perfecto y quieto)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve en todos los nodos
//   High     vibracion micro del angulo (excepcion del contrato)
//
// @D1: visibilidad del trazo de la orbita (circulo guia)
// @D2: tamano del nodo
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);

    int   n = 2 + int(floor(uDensity * 4.99));
    float trackAlpha = 0.06 + uD1 * 0.35;
    float dotSize = 0.010 + uD2 * 0.030;

    float h = audioHue(uHue, uMid * 0.16);
    vec3 col = vec3(0.0);

    for (int i = 0; i < 6; i++) {
        if (i >= n) break;

        float fi = float(i);
        float radius = 0.15 + fi * 0.11
                     + uChaos * 0.02 * sin(t * 0.3 + fi * 1.3);

        vec3 orbitCol = hsv2rgb(vec3(fract(h + fi * 0.09), 0.65, 1.0));

        // Trazo tenue del circulo -- guia, no protagonista.
        float track = edgeLine(r - radius, 1.0);
        col += orbitCol * track * trackAlpha;

        // Nodo viajando sobre la orbita.
        float speed = 0.12 + fi * 0.04 + uSpeed * 0.35;
        float ang = t * speed + fi * 2.4;

        // uHigh: vibracion micro del angulo -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        ang += uHigh * 0.02 * sin(t * 11.0 + fi);

        vec2 dotPos = radius * vec2(cos(ang), sin(ang));
        float d = length(p - dotPos);
        float dot = smoothstep(dotSize, dotSize * 0.25, d);

        col += orbitCol * dot * (1.0 + uKick * 1.5);

        // Estela corta detras del nodo, para que se lea el movimiento.
        float trailAng = ang - 0.25;
        vec2 trailPos = radius * vec2(cos(trailAng), sin(trailAng));
        float dTrail = length(p - trailPos);
        col += orbitCol * smoothstep(dotSize * 1.5, dotSize * 0.3, dTrail) * 0.25;
    }

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.45);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
