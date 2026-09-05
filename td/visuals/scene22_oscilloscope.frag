// ===============================================================
// SCENE 22 - OSCILOSCOPIO / LISSAJOUS
// Curva vectorial tipo sintetizador analogico -- las proporciones
// bass:mid SON literalmente los parametros de la curva. La geometria ES
// el audio, no una modulacion encima de una forma fija.
// ===============================================================
//
// COMO FUNCIONA
// Una curva de Lissajous x=sin(fa*u), y=sin(fb*u) se dibuja marchando un
// parametro u en un bucle de conteo fijo (sin fbm, solo trig -- barato) y
// quedandose con la distancia MINIMA de cada pixel a algun punto de la
// curva. fa y fb (cuantos "lobulos" tiene la figura en cada eje) salen
// directo de Bass y Mid -- la FORMA cambia con la musica, no solo brilla
// mas fuerte. Fase adicional en High para que la figura tambien rote
// un poco (excepcion del contrato, ya suavizado).
//
// CONTROLES
//   Speed    velocidad de rotacion de fase de la figura
//   Density  no aplica (la resolucion de muestreo es fija, barata)
//   Hue      tinte mezclado sobre el verde fosforo clasico
//   Chaos    amplitud de la figura (chica y contenida <-> llena la
//            pantalla)
//   Bass     CAMBIA LA FORMA (fa, lobulos en X) + brillo de lo ya claro
//   Mid      CAMBIA LA FORMA (fb, lobulos en Y) + tinte adicional
//   Kick     destello breve en toda la traza
//   High     rotacion de fase de la figura (excepcion del contrato)
//
// @D1: grosor del trazo nitido
// @D2: cantidad de resplandor (glow) tipo fosforo alrededor del trazo
// @D3: mezcla entre el verde fosforo clasico y el tinte de Hue
// @D4: cuantos lobulos extra se suman a fa/fb (figura mas simple <->
//      mucho mas intrincada)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Bass/Mid deciden la FORMA -- geometria real, no solo brillo.
    float fa = 1.0 + floor(uBass * 4.99) + floor(uD4 * 3.0);
    float fb = 1.0 + floor(uMid * 4.99) + floor(uD4 * 2.0);
    float phase = t * (0.15 + uSpeed * 0.4) + uHigh * 1.5;
    float amp = 0.45 + uChaos * 0.4;

    float minD = 1e5;
    const int N = 96;
    for (int i = 0; i < N; i++) {
        float u = float(i) / float(N) * TAU;
        vec2 c = amp * vec2(sin(fa * u + phase), sin(fb * u));
        minD = min(minD, length(p - c));
    }

    float lineW = 0.006 + uD1 * 0.02;
    float core = 1.0 - smoothstep(0.0, lineW, minD);
    float glowW = 0.001 + uD2 * 0.012;
    float glow = exp(-minD * minD / glowW);

    vec3 phosphor = vec3(0.25, 1.0, 0.35);
    vec3 tint = hsv2rgb(vec3(uHue, 0.6, 1.0));
    vec3 baseCol = mix(phosphor, tint, uD3);

    vec3 col = baseCol * (core * 1.6 + glow * 0.7);
    col += col * uKick * 0.6;

    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
