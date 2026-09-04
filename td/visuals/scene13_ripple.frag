// ===============================================================
// SCENE 13 - RIPPLE
// Ondas concentricas desde 1 a 3 puntos, disparadas por el ritmo.
// ===============================================================
//
// COMO FUNCIONA
//
// Cada fuente es un punto que se desplaza lento en un circulo propio.
// Alrededor de cada uno, el mismo patron de anillos de scene10 (sawtooth
// de distancia -> edgeLine), pero en vez de viajar con el tiempo de forma
// continua, la fase esta ligada a uBeat: cada golpe empuja una onda nueva
// hacia afuera. Sin audio, las ondas igual viajan con uTime como respaldo
// (si no hay musica sonando, la escena no se queda estatica).
//
// Bucle de conteo fijo (max 3) con corte temprano segun Density.
//
// CONTROLES
//   Speed    velocidad de deriva de las fuentes + respaldo sin audio
//   Density  cuantas fuentes hay (1 a 3)
//   Hue      color de las ondas
//   Chaos    cuanto se mueven las fuentes en su circulo propio
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     empuja una onda nueva en cada fuente
//   Beat     fase continua de la expansion de las ondas
//   High     vibracion micro del radio (excepcion del contrato)
//
// @D1: grosor de las ondas
// @D2: separacion entre ondas (frecuencia radial)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int   n = 1 + int(floor(uDensity * 2.99));
    float freq = 4.0 + uD2 * 12.0;
    float ringW = 0.7 + uD1 * 2.5;

    // La fase avanza con uBeat (empuja al tocar) y con el tiempo como
    // respaldo, para que la escena no se quede quieta sin musica.
    float phase = t * (0.3 + uSpeed * 0.6) + uBeat * 3.0;

    float h = audioHue(uHue, uMid * 0.05);
    vec3 waveCol = hsv2rgb(vec3(h, 0.80, 1.0));

    vec3 col = vec3(0.0);

    for (int i = 0; i < 3; i++) {
        if (i >= n) break;

        float fi = float(i);
        float orbitR = 0.15 + fi * 0.12;
        float orbitSpeed = 0.05 + fi * 0.03;
        vec2 src = orbitR * (0.3 + uChaos * 0.7)
                 * vec2(cos(t * orbitSpeed + fi * 2.1),
                        sin(t * orbitSpeed * 0.8 + fi * 2.1));

        float r = length(p - src);

        // uHigh: vibracion micro del radio -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        r += uHigh * 0.008 * sin(t * 14.0 + fi * 5.0);

        float ring = edgeLine(fract(r * freq - phase - fi * 0.33) - 0.5, ringW);

        // La onda se apaga con la distancia, como una onda real perdiendo
        // energia -- sin esto los anillos lejanos se ven igual de fuertes
        // que los cercanos y no se lee como "expansion".
        float falloff = exp(-r * 0.9);

        col += waveCol * ring * falloff;
    }

    // Kick: flash breve en el momento del golpe (ademas del empuje de fase).
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
