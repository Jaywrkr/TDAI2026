// ===============================================================
// SCENE 19 - VOID
// Casi negro total, un solo elemento sutil. La escena de bajada, para
// respirar a mitad del set.
// ===============================================================
//
// COMO FUNCIONA
//
// Un unico orbe tenue que deriva lento por la pantalla. Nada de ruido 2D,
// nada de rejillas -- es la escena mas barata de las 20 por lejos, y la
// mas minimal a proposito: cuando el set lleva un rato de mucha imagen,
// esta es la que corta el ritmo sin cortar la musica.
//
// CONTROLES
//   Speed    velocidad de deriva del orbe
//   Density  radio de la orbita que recorre
//   Hue      color del orbe
//   Chaos    cuanto se desvia de una orbita perfecta
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     el orbe pulsa un instante
//   High     vibracion micro de posicion (excepcion del contrato)
//
// @D1: tamano del orbe
// @D2: brillo/opacidad del orbe
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float orbitR = 0.10 + uDensity * 0.35;
    vec2 pos = orbitR * vec2(sin(t * (0.04 + uSpeed * 0.10)),
                             cos(t * (0.03 + uSpeed * 0.08) * 0.8));

    // Chaos desvia la orbita de ser un circulo perfecto.
    pos += uChaos * 0.08 * vec2(sin(t * 0.13), cos(t * 0.11));

    // uHigh: vibracion micro de posicion -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    pos += uHigh * 0.004 * vec2(sin(t * 9.0), cos(t * 8.0));

    float d = length(p - pos);
    float size = 0.05 + uD1 * 0.14;
    float orb = exp(-d * d / (size * size) * 2.0);

    float h = audioHue(uHue, uMid * 0.16);
    float opacity = 0.15 + uD2 * 0.45;
    vec3 col = hsv2rgb(vec3(h, 0.50, 1.0)) * orb * opacity;

    // Kick: el orbe pulsa un instante.
    col += col * uKick * 0.8;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    // Vignette muy suave, casi nada -- no queremos que el fondo llame
    // la atencion, el punto es el vacio.
    col *= vignette(uv, 0.12);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.006;

    return vec4(col, 1.0);
}
