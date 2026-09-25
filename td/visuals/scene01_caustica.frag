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
//   Bass     brillo de lo ya claro (audioLift) + empuje de la
//            turbulencia del warp -- el fluido se agita de verdad con
//            el grave, acotado (nunca se dispara, sigue el nivel)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del destello, un empujon fuerte y breve de
//            turbulencia -- el fluido se mueve de verdad en el golpe,
//            no solo brilla, y vuelve solo cuando uKick decae
//   High     vibracion micro del warp (excepcion del contrato) + destello
//            en las crestas de las bandas de luz mas brillantes
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
    // Bass: el fluido/noise baila con el bajo tambien -- pedido
    // explicito, empuje acotado sobre la turbulencia (nunca se dispara,
    // sigue el nivel en vivo como el resto de los empujones de bajo del
    // set).
    float turb = 0.6 + uChaos * 1.4 + uD2 * 1.2 + uBass * 1.1 + uKick * 1.8;
    vec2  warp = vec2(fbm(p * 1.8 + t * warpSpeed, 4), fbm(p * 1.8 - t * warpSpeed * 0.8 + 9.0, 4)) - 0.5;
    // uHigh: vibracion micro del warp -- unica excepcion del contrato.
    warp += uHigh * 0.015 * vec2(sin(t * 9.0), cos(t * 7.5));
    vec2  wp = p + warp * turb * 0.5;

    // PIANO: "piedra en la pileta". Cada tecla tira una piedra en el punto
    // que elige uKeypos: un frente de onda circular sale de ahi, DOBLA el
    // agua a su paso (refraccion real: empuja wp, asi la trama de luz se
    // tuerce siguiendo el anillo) y las bandas de caustica se encienden
    // sobre el frente. Velocity = piedra mas grande: el anillo viaja mas
    // lejos y dobla mas.
    float keyFront = 0.0;
    if (uKeypulse > 0.0015) {
        vec2  gp = centered(vec2(mix(0.15, 0.85, uKeypos), 0.5));
        vec2  dv = wp - gp;
        float dg = length(dv);
        float front = (1.0 - uKeypulse) * (0.5 + uKeyvel * 0.9);
        float env = exp(-pow((dg - front) * 4.5, 2.0));
        wp += dv / (dg + 1e-3) * sin((dg - front) * 28.0) * env
              * uKeypulse * (0.05 + uKeyvel * 0.08);
        keyFront = env * uKeypulse;
    }

    float freq = mix(4.0, 16.0, uDensity);
    float breathe = t * (0.3 + uD4 * 1.4);
    float field = fbm(wp * 2.0 + breathe * 0.1, 5);
    float rings = sin(length(wp) * freq - breathe + field * 5.0) * 0.5 + 0.5;

    // D1: contraste de las bandas.
    float contrast = mix(1.2, 5.0, uD1);
    float bands = pow(rings, contrast);
    bands *= 1.0 + keyFront * (3.0 + uKeyvel * 3.0);

    // D5: separacion de color nucleo/borde.
    vec3  edgeCol = hsv2rgb(vec3(fract(h), 0.65, 1.0));
    vec3  coreCol = hsv2rgb(vec3(fract(h + 0.08 + uD5 * 0.3), 0.5, 1.0));
    vec3  col = mix(edgeCol, coreCol, smoothstep(0.6, 0.0, r)) * bands;

    // D3: brillo del nucleo central.
    col += coreCol * exp(-r * r * 3.0) * (0.3 + uD3 * 1.0);

    // uHigh: destello en las crestas de las bandas de luz -- reusa 'bands'
    // (0..1, mas alto en la cresta), asi los agudos se notan como brillo
    // extra justo donde la caustica ya es mas intensa.
    col += coreCol * bands * uHigh * 0.5;

    col += col * uKick * 0.3;
    col *= 0.6 + uD6 * 0.8;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.25);

    return vec4(col, 1.0);
}
