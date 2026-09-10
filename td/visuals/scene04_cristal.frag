// ===============================================================
// SCENE 04 - CRISTAL
// Reemplaza al mosaico de triangulos saturado: facetas de cristal mas
// grandes y menos numerosas, con un campo de luz tipo caustics
// refractando adentro de cada una -- paleta fria y contenida en vez de
// arcoiris pleno.
// ===============================================================
//
// COMO FUNCIONA
// La misma reticula de triangulos de siempre (floor/fract de una
// coordenada escalada, con el triangulo superior/inferior elegido por
// gf.x+gf.y) pero en vez de un color plano por celda, cada faceta
// muestra un recorte de un UNICO campo fbm continuo que fluye con el
// tiempo -- por eso la luz "atraviesa" las facetas en vez de que cada
// una sea un color aislado, como un vitral de verdad.
//
// CONTROLES
//   Speed    velocidad de flujo de la luz adentro del cristal
//   Density  tamano de las facetas (grandes <-> muchas y chicas)
//   Hue      color base
//   Chaos    turbulencia del campo de luz interno
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todo el cristal
//   High     vibracion micro del borde de cada faceta (excepcion)
//
// @D1: contraste del campo de luz interno
// @D2: visibilidad del borde entre facetas
// @D3: variacion de color entre facetas
// @D4: velocidad de flujo del campo interno
// @D5: brillo de los reflejos (highlights) por faceta
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv) * 1.4;
    // Offset +0.58: default azul (Hue arranca en 0) en vez de rojo,
    // coherente con la paleta fria del resto del set.
    float h = audioHue(fract(uHue + 0.58), uMid * 0.12);

    float freq = mix(1.4, 4.5, uDensity);
    vec2  g = p * freq;
    vec2  gi = floor(g);
    vec2  gf = fract(g);
    float tri = step(gf.x + gf.y, 1.0);
    vec2  cellId = gi + tri * 0.3;
    float cHash = hash21(cellId);

    // Campo de luz interno: un fbm continuo que fluye, compartido por
    // todas las facetas -- lo que hace que la luz parezca atravesar el
    // cristal entero, no que cada faceta brille sola.
    float flowSpeed = 0.06 + uD4 * 0.35;
    float turb = 0.4 + uChaos * 1.2;
    vec2  warp = vec2(fbm(p * 0.8 + t * flowSpeed, 3), fbm(p * 0.8 - t * flowSpeed * 0.8 + 5.0, 3)) - 0.5;
    float field = fbm(p * 1.4 + warp * turb + t * flowSpeed * 0.3, 5);

    // D1: contraste del campo.
    float contrast = mix(1.0, 3.5, uD1);
    field = pow(clamp(field, 0.0, 1.0), contrast);

    // D3: variacion de color entre facetas, sobre la base de Hue.
    vec3  baseCol = hsv2rgb(vec3(fract(h + cHash * 0.14 * uD3), 0.55, 1.0));
    vec3  col = baseCol * (0.25 + field * 0.85);

    // D5: reflejo (highlight) fijo por faceta, como una luz que pega
    // distinto en cada plano del cristal.
    vec2  hDir = normalize(vec2(-0.5, 0.8));
    float hAmt = clamp(dot(normalize(gf - 0.5 + 1e-4), hDir), 0.0, 1.0);
    col += vec3(1.0) * pow(hAmt, 6.0) * (0.2 + uD5 * 0.8);

    // D2: borde entre facetas -- distancia a la hipotenusa/lados del
    // triangulo, ancho constante via fwidth.
    float edgeD = min(min(gf.x, gf.y), abs(1.0 - gf.x - gf.y));
    float edgeLineV = edgeLine(edgeD, mix(0.5, 3.0, uD2));
    col = mix(col, col * 0.35, edgeLineV * uD2);

    // uHigh: vibracion micro del borde -- unica excepcion del contrato.
    col *= 1.0 + uHigh * 0.02 * sin(t * 12.0 + cHash * 20.0);

    // PIANO: una faceta invitada, muy brillante, destella en la
    // posicion que elige uKeypos -- decae sola con uKeypulse.
    if (uKeypulse > 0.0015) {
        vec2  gp = centered(vec2(mix(0.12, 0.88, uKeypos), 0.5)) * 1.4;
        float dg = length(p - gp);
        float flash = exp(-dg * dg * 6.0) * uKeypulse * (0.7 + uKeyvel * 1.0);
        col += hsv2rgb(vec3(fract(h + 0.5), 0.5, 1.0)) * flash;
    }

    col += col * uKick * 0.3;
    col *= 0.6 + uD6 * 0.8;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.3);

    return vec4(col, 1.0);
}
