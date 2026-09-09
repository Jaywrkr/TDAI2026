// ===============================================================
// SCENE 51 - TERMICO
// Un campo de calor (fbm domain-warped, fluye continuo) pasado por
// una paleta tipo camara termica -- azul, verde, amarillo, naranja,
// magenta en el centro mas "caliente" -- desgarrado por bandas
// horizontales que se cortan y desplazan en X a saltos, como una
// señal de camara termica rota.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. CAMPO: mismo domain-warp de scene00/scene02/scene42/scene44/
//    scene46, con el tiempo metido en la coordenada de muestreo --
//    fluye continuo, sin cortes.
//
// 2. PALETA TERMICA: el campo (0..1) pasa por una cadena de 6 colores
//    fijos (no un solo barrido de hue) -- mismo espiritu que una
//    camara termica real, donde "frio" y "caliente" no son
//    simetricos en la rueda de color.
//
// 3. DESGARRO: la pantalla se corta en bandas horizontales; cada
//    banda, a saltos de tiempo (no continuo), se corre en X un monto
//    al azar ANTES de muestrear el campo -- por eso lo que se
//    desgarra es la imagen de fondo en si, no un efecto pegado
//    encima. Kick empuja el desgarro un instante ademas del flash.
//
// CONTROLES
//   Speed    velocidad con la que fluye el campo de calor
//   Density  escala del campo (manchas grandes <-> muchas y chicas)
//   Hue      rota la paleta termica completa
//   Chaos    turbulencia del campo (domain-warp)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, el desgarro se dispara mas fuerte un
//            instante
//   High     grano/estatica de sensor -- excepcion del contrato
//            (amplitud pequena)
//
// @D1: cuantas bandas de desgarro hay (pocas y anchas <-> muchas y
//      finas)
// @D2: cuanto se desgarra cada banda
// @D3: velocidad con la que cambia el desgarro
// @D4: grano/estatica general
// @D5: contraste de las bandas de color de la paleta termica
// @D6: brillo general
// ===============================================================

vec3 thermalRamp(float v) {
    float hues[6];
    hues[0] = 0.68; hues[1] = 0.55; hues[2] = 0.42;
    hues[3] = 0.15; hues[4] = 0.05; hues[5] = 0.90;
    float seg = clamp(v, 0.0, 0.999) * 5.0;
    int   i0 = int(floor(seg));
    int   i1 = i0 + 1;
    float f = fract(seg);
    float h0 = hues[i0];
    float h1 = (i1 == 0) ? hues[0] : (i1 == 1) ? hues[1] : (i1 == 2) ? hues[2]
             : (i1 == 3) ? hues[3] : (i1 == 4) ? hues[4] : hues[5];
    return vec3(mix(h0, h1, f), 1.0, 1.0);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);

    // --- DESGARRO: corre la coordenada X POR BANDA antes de medir el
    // campo, asi lo que se rompe es la imagen de fondo en si. ---
    float bands = mix(10.0, 70.0, uD1);
    float bandId = floor(uv.y * bands);
    float tearRate = mix(0.5, 8.0, uD3);
    float stepT = floor(t * tearRate + bandId * 0.31);
    float tearHash = hash21(vec2(bandId, stepT));
    // Kick: el desgarro se dispara mas fuerte un instante, ademas del
    // flash de mas abajo -- decae solo porque uKick trae su propia
    // envolvente.
    float tearAmt = mix(0.0, 0.9, uD2) * (1.0 + uKick * 1.5);
    float tearShift = (tearHash - 0.5) * tearAmt;
    vec2  pTorn = p + vec2(tearShift, 0.0);

    // --- CAMPO DE CALOR (fluye continuo con el tiempo) ---
    float flowSpeed = 0.02 + uSpeed * 0.15;
    vec2  scaled = pTorn * mix(0.6, 1.9, uDensity);
    vec2  warp = vec2(fbm(scaled * 0.55 + t * flowSpeed + 11.0, 4),
                       fbm(scaled * 0.55 - t * flowSpeed + 37.0, 4)) - 0.5;
    float turb = 0.5 + uChaos * 1.2;
    vec2  wp = scaled + warp * turb;
    float field = fbm(wp * 0.8 + t * flowSpeed * 0.5, 6, 0.5);

    // D5: contraste de las bandas de la paleta.
    float gamma = mix(1.0, 2.4, uD5);
    field = pow(clamp(field, 0.0, 1.0), gamma);

    vec3  hsvT = thermalRamp(field);
    vec3  col = hsv2rgb(vec3(fract(hsvT.x + h0), 0.85, mix(0.4, 0.95, field) * (0.6 + uD6 * 0.6)));

    // D4: grano/estatica general. uHigh: un empujon chico extra --
    // excepcion del contrato, amplitud pequena.
    float grain = hash21(uv * uResW * 0.5 + fract(uRTime) * 15.0) - 0.5;
    col += grain * (uD4 * 0.18 + uHigh * 0.04);

    // PIANO: un punto "caliente" nuevo aparece en la posicion que
    // elige uKeypos y se apaga solo (uKeypulse decae).
    if (uKeypulse > 0.0015) {
        vec2  guestPos = centered(vec2(mix(0.1, 0.9, uKeypos), 0.5));
        float dG2 = dot(p - guestPos, p - guestPos);
        float spark = exp(-dG2 * 10.0) * uKeypulse * (0.8 + uKeyvel * 0.8);
        col += hsv2rgb(vec3(fract(0.90 + h0), 0.85, 1.0)) * spark * 1.5;
    }

    // Kick: flash breve, ademas del desgarro de arriba.
    col += col * uKick * 0.25;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    return vec4(col, 1.0);
}
