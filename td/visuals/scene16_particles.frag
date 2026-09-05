// ===============================================================
// SCENE 16 - PARTICLES
// Enjambre de particulas brillantes que fluyen con un campo de ruido
// (curl-noise-like), cada una con una cola corta tipo cometa. Reemplaza
// a "starfield".
// ===============================================================
//
// COMO FUNCIONA
//
// Nada de simulacion con estado (un GLSL TOP no tiene memoria entre
// frames) -- la posicion de cada particula en el instante t se calcula
// de forma CERRADA: un punto "guia" que viaja en un Lissajous lento
// (dos senos de frecuencia distinta) mas un desplazamiento de un fbm
// evaluado en (guia, t), que le da el aspecto de fluir en un campo de
// viento turbulento en vez de una orbita perfecta. La cola sale de
// evaluar la MISMA formula con un t un poco menor (varias muestras) y
// dibujar puntos cada vez mas tenues -- barato, sin necesidad de guardar
// ninguna posicion anterior real.
//
// CONTROLES
//   Speed    velocidad de flujo de las particulas
//   Density  cuantas particulas hay
//   Hue      paleta base
//   Chaos    intensidad de la turbulencia (cuanto se desvian del
//            Lissajous base)
//   Bass     brillo de lo ya claro (audioLift) + tamano de las
//            particulas respira con los graves (ya suavizado)
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todo el enjambre -- ya llega con
//            envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro de posicion (excepcion del contrato)
//
// @D1: tamano de las particulas
// @D2: longitud de la cola tipo cometa
// @D3: velocidad/alcance de la turbulencia (flujo suave <-> muy agitado)
// @D4: dispersion del enjambre (agrupado al centro <-> repartido por
//      toda la pantalla)
// ===============================================================

vec2 particlePos(vec2 seed, float t, float turbAmt, float spread)
{
    float speedX = 0.15 + hash21(seed) * 0.35;
    float speedY = 0.12 + hash21(seed + 1.0) * 0.30;
    float phaseX = hash21(seed + 2.0) * TAU;
    float phaseY = hash21(seed + 3.0) * TAU;

    vec2 guide = spread * vec2(sin(t * speedX + phaseX),
                               cos(t * speedY + phaseY));

    vec2 turb = vec2(fbm(guide * 1.5 + seed + t * 0.15, 3),
                     fbm(guide * 1.5 + seed - t * 0.12 + 5.0, 3)) - 0.5;
    return guide + turb * turbAmt;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Acotado a proposito (max 45 particulas x 5 muestras de cola = 225
    // evaluaciones de fbm por pixel en el peor caso) -- mas que eso en un
    // doble bucle con fbm adentro se vuelve caro de verdad.
    int   n = 10 + int(floor(uDensity * 34.99));
    float size = 0.010 + uD1 * 0.022;
    int   trailN = 1 + int(floor(uD2 * 4.99));
    float turbAmt = 0.10 + uD3 * 0.55;
    // El "perimetro" del enjambre (cuanto se dispersa) respira con los
    // bajos -- uBass ya suavizado (Fase 2), mismo patron que las
    // metaballs.
    float spread = (0.20 + uD4 * 0.65) * (1.0 + uBass * 0.25);

    float h = audioHue(uHue, uMid * 0.16);
    vec3 col = vec3(0.0);

    // Bass: tamano respira con los graves, ademas del brillo de mas
    // abajo -- seguro porque uBass ya llega suavizado (Fase 2).
    float sizeNow = size * (1.0 + uBass * 0.4);

    for (int i = 0; i < 45; i++) {
        if (i >= n) break;
        float fi = float(i);
        vec2 seed = vec2(fi * 12.9, fi * 7.3);

        for (int k = 0; k < 6; k++) {
            if (k >= trailN) break;
            float fk = float(k);
            float tt = t - fk * 0.045 * (0.5 + uSpeed);

            vec2 pos = particlePos(seed, tt, turbAmt, spread);
            // uHigh: vibracion micro de posicion -- unica excepcion del
            // contrato, amplitud pequena, ya suavizado.
            pos += uHigh * 0.006 * vec2(sin(t * 10.0 + fi), cos(t * 9.0 + fi));

            float d = length(p - pos);
            float trailFade = 1.0 - fk / float(trailN + 1);
            float dot = exp(-d * d / (sizeNow * sizeNow)) * trailFade;
            // La cola cambia de tono a lo largo de si misma -- velocidad
            // del corrimiento segun Mid, look mas magico/energetico.
            vec3 trailCol = hsv2rgb(vec3(fract(h + hash21(seed + 4.0) * 0.12
                                              + fk * (0.03 + uMid * 0.06)), 0.65, 1.0));
            col += trailCol * dot;
        }
    }

    // Kick: destello breve en todo el enjambre.
    col += col * uKick * 0.6;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.5);

    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
