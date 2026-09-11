// ===============================================================
// SCENE 01 - BIOLLUVIA
// Reemplaza a la lluvia de codigo estilo Matrix: gotas de luz
// bioluminiscente cayendo, con una estela que se apaga suave detras --
// menos densa, mas espaciosa, paleta cian/violeta en vez de rosa
// saturado. Mismo criterio que veins/caustics: fluido, con glow, frio.
// ===============================================================
//
// COMO FUNCIONA
// La pantalla se parte en columnas. Cada columna tiene su propia
// velocidad y fase (hash fijo, no cambia con el tiempo) -- la posicion
// de la gota es fract(uv.y*escala - t*velocidad + fase), y la estela
// sale de un smoothstep angosto arriba y ancho abajo de esa posicion
// (la cabeza es nitida, la cola se disuelve). Solo una fraccion de las
// columnas esta activa a la vez (Density), para dejar aire entre gotas
// en vez de empapelar la pantalla.
//
// CONTROLES
//   Speed    velocidad base de caida
//   Density  cuantas columnas estan activas a la vez
//   Hue      color base (se mezcla con el degradado cian/violeta)
//   Chaos    cuanto varia la velocidad entre columnas
//   Bass     brillo de lo ya claro (audioLift) + la cabeza de cada gota
//            crece con el golpe de grave y encoge cuando baja -- empuje
//            acotado, sigue el bajo en vivo en vez de quedar fijo
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en toda la lluvia
//   High     vibracion micro horizontal de cada gota (excepcion)
//
// @D1: tamano/nitidez de la cabeza de la gota
// @D2: largo de la estela
// @D3: cuantas columnas caben (fino <-> ancho)
// @D4: mezcla de color entre cian y violeta
// @D5: variacion de velocidad individual por gota (parejo <-> dispar)
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    float h = audioHue(uHue, uMid * 0.10);

    float cols = mix(10.0, 34.0, uD3);
    float cx = floor(uv.x * cols);
    float colSeed = hash21(vec2(cx, 1.0));

    // D5: variacion de velocidad individual. Chaos: dispersion extra
    // entre columnas.
    float speedJ = mix(0.6, 1.0 + uD5 * 1.6, colSeed) * (1.0 + (colSeed - 0.5) * uChaos * 1.2);
    float speed = (0.25 + uSpeed * 0.9) * speedJ;
    float phase = colSeed * 12.0;

    // Density: solo una fraccion de columnas activa a la vez.
    float isActiveCol = step(1.0 - mix(0.15, 0.85, uDensity), hash21(vec2(cx, 2.0)));

    float y = fract(uv.y * 2.4 - t * speed + phase);

    // D1: cabeza nitida. D2: largo de la estela.
    // Bass: la cabeza de la gota crece con el bajo y encoge cuando baja
    // -- pedido explicito ("que la llama crezca o decrezca con el
    // bajo"), acotado (headSize nunca se dispara, sigue el nivel en
    // vivo, no acumula).
    float headSize = mix(0.010, 0.05, uD1) * (1.0 + uBass * 0.9);
    float trailLen = mix(0.15, 0.85, uD2);
    float drip = smoothstep(0.0, headSize, y) * smoothstep(trailLen, headSize, y);

    // uHigh: vibracion micro horizontal -- unica excepcion del
    // contrato, amplitud pequena.
    float xf = fract(uv.x * cols) - 0.5 + uHigh * 0.01 * sin(t * 10.0 + cx);
    float xmask = exp(-xf * xf * 70.0);

    // D4: mezcla de color entre cian y violeta, hue base encima.
    vec3  dripCol = mix(hsv2rgb(vec3(fract(h + 0.5), 0.65, 1.0)),
                         hsv2rgb(vec3(fract(h + 0.78), 0.55, 1.0)),
                         mix(hash21(vec2(cx, 3.0)), uD4, 0.5));

    vec3 col = dripCol * drip * xmask * isActiveCol * 1.3;

    // PIANO: una columna invitada, mas brillante y grande, cae en la
    // posicion X que elige uKeypos -- decae sola con uKeypulse.
    if (uKeypulse > 0.0015) {
        float gcx = floor(uKeypos * cols);
        float onCol = 1.0 - smoothstep(0.0, 0.6, abs(cx - gcx));
        float gy = fract(uv.y * 2.4 - t * (0.5 + uKeyvel * 0.6) + colSeed * 12.0);
        float gdrip = smoothstep(0.0, 0.03, gy) * smoothstep(0.6, 0.03, gy);
        col += vec3(1.0) * gdrip * xmask * onCol * uKeypulse * (0.6 + uKeyvel * 0.8);
    }

    col += col * uKick * 0.4;
    col *= 0.6 + uD6 * 0.8;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
