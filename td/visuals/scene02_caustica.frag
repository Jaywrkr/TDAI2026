// ===============================================================
// SCENE 02 - CAUSTICA
// Reemplaza a los anillos con fringing cromatico: un patron de luz tipo
// caustics (la trama de luz que se ve en el fondo de una pileta) que
// fluye y respira, cian/azul, en vez de anillos concentricos fijos con
// arcoiris en el borde.
// ===============================================================
//
// COMO FUNCIONA
// Un domain warp (mismo espiritu que scene28_atlas/scene00) deforma el
// espacio antes de medir un campo de anillos concentricos -- el warp
// es lo que convierte "anillos de dardo" en una trama de luz que se
// mueve y se retverce como agua real. El nucleo brillante en el centro
// da el punto de donde "sale" la luz.
//
// CONTROLES
//   Speed    velocidad de flujo del patron
//   Density  frecuencia de los anillos de caustics
//   Hue      color base
//   Chaos    turbulencia del domain warp (agua quieta <-> agitada)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todo el patron
//   High     vibracion micro del warp (excepcion del contrato)
//
// @D1: contraste de las bandas de luz (suaves <-> nitidas)
// @D2: turbulencia adicional del warp
// @D3: brillo del nucleo central
// @D4: velocidad de la respiracion del patron
// @D5: separacion de color entre el nucleo y el borde
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    // Offset +0.55: default azul/cian (Hue arranca en 0) en vez de
    // rojo, coherente con la paleta fria del resto del set.
    float h = audioHue(fract(uHue + 0.55), uMid * 0.12);

    float warpSpeed = 0.15 + uSpeed * 0.4;
    float turb = 0.6 + uChaos * 1.4 + uD2 * 1.2;
    vec2  warp = vec2(fbm(p * 1.8 + t * warpSpeed, 4), fbm(p * 1.8 - t * warpSpeed * 0.8 + 9.0, 4)) - 0.5;
    // uHigh: vibracion micro del warp -- unica excepcion del contrato.
    warp += uHigh * 0.015 * vec2(sin(t * 9.0), cos(t * 7.5));
    vec2  wp = p + warp * turb * 0.5;

    float freq = mix(4.0, 16.0, uDensity);
    float breathe = t * (0.3 + uD4 * 1.4);
    float field = fbm(wp * 2.0 + breathe * 0.1, 5);
    float rings = sin(length(wp) * freq - breathe + field * 5.0) * 0.5 + 0.5;

    // D1: contraste de las bandas.
    float contrast = mix(1.2, 5.0, uD1);
    float bands = pow(rings, contrast);

    // D5: separacion de color nucleo/borde.
    vec3  edgeCol = hsv2rgb(vec3(fract(h), 0.65, 1.0));
    vec3  coreCol = hsv2rgb(vec3(fract(h + 0.08 + uD5 * 0.3), 0.5, 1.0));
    vec3  col = mix(edgeCol, coreCol, smoothstep(0.6, 0.0, r)) * bands;

    // D3: brillo del nucleo central.
    col += coreCol * exp(-r * r * 3.0) * (0.3 + uD3 * 1.0);

    // PIANO: una onda de choque nueva sale del punto que elige uKeypos
    // y se apaga sola con uKeypulse -- geometria de color sobre el
    // mismo campo, no un anillo aparte.
    if (uKeypulse > 0.0015) {
        vec2  gp = centered(vec2(mix(0.15, 0.85, uKeypos), 0.5));
        float dg = length(p - gp);
        float shock = exp(-dg * dg * 6.0) * uKeypulse * (0.7 + uKeyvel * 1.0);
        col += hsv2rgb(vec3(fract(h + 0.5), 0.6, 1.0)) * shock;
    }

    col += col * uKick * 0.3;
    col *= 0.6 + uD6 * 0.8;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.25);

    return vec4(col, 1.0);
}
