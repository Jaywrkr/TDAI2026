// ===============================================================
// SCENE 05 - FUSION
// Reemplaza al glitch de bloques RGB: el mismo lenguaje de bandas
// horizontales que se desplazan, pero "derretidas" -- el corte es un
// campo de ruido continuo, no un salto duro entre bloques, y la paleta
// es fria y contenida en vez de canales RGB puros por separado.
// ===============================================================
//
// COMO FUNCIONA
// La pantalla se corta en bandas horizontales (como cualquier glitch),
// pero el desplazamiento de cada banda sale de un fbm evaluado en
// (x, tiempo) -- un campo CONTINUO -- en vez de un hash por banda que
// salta de golpe. Eso es lo que hace que el corte se vea como liquido
// fluyendo en vez de datos corruptos saltando.
//
// CONTROLES
//   Speed    velocidad a la que fluye el derretido
//   Density  cuantas bandas horizontales hay
//   Hue      color base
//   Chaos    turbulencia del derretido (leve ondulacion <-> caos)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     el derretido se agita mas fuerte un instante
//   High     vibracion micro adicional (excepcion del contrato)
//
// @D1: fuerza del desplazamiento (derretido leve <-> fuerte)
// @D2: frecuencia del campo interno (bandas anchas <-> onda fina)
// @D3: contraste de las bandas de color
// @D4: velocidad del flujo de color interno
// @D5: cantidad de bandas visibles como capas separadas
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = uv;
    float h = audioHue(uHue, uMid * 0.12);

    float bands = mix(6.0, 26.0, uDensity);
    float bandId = floor(p.y * bands);
    float bandY = bandId / bands;

    // Campo continuo (fbm), no un hash por banda -- el desplazamiento
    // "fluye" en vez de saltar entre valores random.
    float meltFreq = mix(1.5, 6.0, uD2);
    float meltSpeed = 0.15 + uSpeed * 0.6;
    float melt = fbm(vec2(p.x * meltFreq, bandY * 3.0 - t * meltSpeed), 4, 0.5 + uChaos * 0.3);
    float shiftAmt = mix(0.02, 0.22, uD1) * (1.0 + uKick * 1.4);
    float shift = (melt - 0.5) * shiftAmt;
    // uHigh: vibracion micro adicional -- unica excepcion del contrato.
    shift += uHigh * 0.006 * sin(t * 11.0 + bandId);

    vec2  pp = vec2(p.x + shift, p.y);
    float flowSpeed = 0.1 + uD4 * 0.5;
    float field = fbm(pp * (2.0 + uD2 * 2.0) + vec2(t * flowSpeed, -t * flowSpeed * 0.7), 5);

    // D3: contraste de las bandas de color.
    float contrast = mix(1.0, 3.0, uD3);
    field = pow(clamp(field, 0.0, 1.0), contrast);

    // D5: capas visibles -- cuantiza el campo en unos pocos escalones
    // de color en vez de un gradiente continuo.
    float steps = mix(1.0, 6.0, uD5);
    float quant = steps > 1.5 ? floor(field * steps) / steps : field;

    vec3 colLo = hsv2rgb(vec3(fract(h + 0.55), 0.55, 0.35));
    vec3 colHi = hsv2rgb(vec3(fract(h), 0.65, 1.0));
    vec3 col = mix(colLo, colHi, quant);

    // PIANO: una banda entera invitada se ilumina con su propio color
    // en la fila mas cercana a la posicion Y que elige uKeypos.
    if (uKeypulse > 0.0015) {
        float targetBand = floor(uKeypos * bands);
        float onBand = 1.0 - smoothstep(0.0, 0.6, abs(bandId - targetBand));
        col += hsv2rgb(vec3(fract(h + 0.5), 0.6, 1.0)) * onBand * uKeypulse * (0.5 + uKeyvel * 0.7);
    }

    col += col * uKick * 0.3;
    col *= 0.6 + uD6 * 0.8;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
