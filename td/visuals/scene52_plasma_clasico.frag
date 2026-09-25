// ===============================================================
// PLASMA CLASICO
// Suma de ondas sinusoidales cruzadas -- el "plasma" original de demoscene,
// una de las tecnicas mas baratas que existen para llenar la pantalla de
// movimiento organico (unas pocas sumas de seno, nada de ruido ni loops).
// Tecnica de dominio publico (cualquier tutorial de "plasma effect" la
// tiene), reescrita para este rig -- no es un port de ningun shader
// puntual de Shadertoy.
// ===============================================================
//
// CONTROLES
//   Speed    velocidad de las ondas
//   Density  cuantas ondas se suman (mas ondas = mas detalle/textura)
//   Hue      paleta completa (barrido continuo)
//   Chaos    cuanto se deforma la grilla de ondas (turbulencia)
//   Bass     brillo general (audioLift)
//   Mid      tinte que se mueve con la musica (audioHue)
//   Kick     destello breve
//
// @D1: escala de las ondas (grande <-> fina)
// @D2: velocidad relativa de la segunda familia de ondas
// @D3: cuanto se curva la grilla (domain warp)
// @D4: contraste de las bandas de color
// @D5: saturacion de la paleta (mono <-> color pleno)
// @D6: brillo del nucleo (zonas donde las ondas coinciden)
// ===============================================================

#define OCTAVES_BUDGET 0

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);

    float scale = mix(1.5, 5.0, uD1);
    p *= scale;

    // Domain warp barato: un par de senos desplazan la grilla antes de
    // sumar las ondas -- da la sensacion de fluido sin ningun ruido.
    float warpAmt = uChaos * mix(0.3, 1.6, uD3);
    p += warpAmt * vec2(sin(p.y * 1.3 + uTime * 0.6), cos(p.x * 1.1 - uTime * 0.5));

    float t1 = uTime * (0.6 + uSpeed * 0.8);
    float t2 = uTime * (0.6 + uSpeed * 0.8) * mix(0.6, 1.8, uD2);

    // Cuantas familias de onda se suman: Density controla la cobertura /
    // cantidad de detalle, como pide el contrato.
    int waves = int(mix(2.0, 6.0, uDensity) + 0.5);

    float v = 0.0;
    for (int i = 0; i < 6; i++) {
        if (i >= waves) break;
        float fi = float(i) + 1.0;
        v += sin(p.x * (0.7 + fi * 0.35) + t1 * (0.5 + fi * 0.15));
        v += sin(p.y * (0.6 + fi * 0.30) - t2 * (0.4 + fi * 0.12));
        v += sin((p.x + p.y) * (0.4 + fi * 0.2) + t1 * 0.3 - t2 * 0.2);
    }
    v /= float(waves) * 3.0;

    // Paleta completa con Hue: barrido continuo sobre v, no un tinte.
    float contrast = mix(1.0, 2.6, uD4);
    float band = 0.5 + 0.5 * sin(v * PI * contrast);
    float sat = mix(0.15, 1.0, uD5);
    vec3 col = hsv2rgb(vec3(fract(uHue + v * 0.5), sat, band));

    // Nucleo: donde varias ondas coinciden (v cerca de su pico), un brillo
    // extra -- D6 controla cuanto.
    float core = smoothstep(0.75, 1.0, band) * mix(0.3, 1.8, uD6);
    col += col * core;

    // AUDIO -- contrato: bajos = brillo, medios = tinte, agudos = nada
    // (esta escena no tiene geometria de escala micro para engancharlos).
    col = audioLift(col, uBass * 0.75);
    float h2 = audioHue(uHue, uMid * 0.05);
    col = mix(col, hsv2rgb(vec3(fract(h2 + v * 0.5), sat, band)), 0.5);
    col += col * uKick * 0.4;

    col = col / (1.0 + col);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;
    return vec4(max(col, 0.0), 1.0);
}
