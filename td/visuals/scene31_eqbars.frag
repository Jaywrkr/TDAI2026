// ===============================================================
// SCENE 31 - ECUALIZADOR 3D
// Barras verticales tipo analizador de espectro clasico, con bisel
// falso-3D por barra -- pero con MUCHAS barras (no solo 3), cada una
// una mezcla ponderada distinta de Bass/Mid/High (fija por hash), asi se
// siente como un analizador real de muchas bandas en vez de repetir las
// 3 unicas que el audio realmente entrega.
// ===============================================================
//
// COMO FUNCIONA
// Cada barra tiene tres pesos fijos (hash de su indice) que definen
// cuanto le importa Bass/Mid/High -- su altura es la MEZCLA ponderada de
// esas tres, no una sola banda repetida. Eso hace que barras vecinas se
// muevan de forma distinta entre si aunque solo haya 3 bandas reales de
// entrada, dando la sensacion de un espectro con muchas mas bandas.
//
// CONTROLES
//   Speed    no usado directo (reservado)
//   Density  cuantas barras hay
//   Hue      color base de las barras
//   Chaos    no usado directo (reservado)
//   Bass     empuja la altura de las barras que "le tocan" mas bass
//   Mid      empuja las que le tocan mas mid + tinte adicional
//   Kick     destello breve en todas las barras
//   High     empuja las que le tocan mas high
//
// @D1: altura general de las barras
// @D2: ancho del espacio entre barras
// @D3: variacion de color entre barras segun su altura
// @D4: brillo del punto "peak" en la cima de cada barra
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float nBars = 12.0 + floor(uDensity * 20.0);
    float barIdU = floor(uv.x * nBars);
    float barX = fract(uv.x * nBars);

    float wB = hash21(vec2(barIdU, 1.0));
    float wM = hash21(vec2(barIdU, 2.0));
    float wH = hash21(vec2(barIdU, 3.0));
    float wSum = max(wB + wM + wH, 0.001);
    float level = (uBass * wB + uMid * wM + uHigh * wH) / wSum;
    level += 0.05 * sin(t * (0.5 + hash21(vec2(barIdU, 4.0)) * 2.0));
    level = clamp(level, 0.02, 1.0) * (0.35 + uD1 * 1.0);

    float gap = 0.05 + uD2 * 0.14;
    float barMaskX = smoothstep(0.0, gap, barX) * smoothstep(1.0, 1.0 - gap, barX);

    float barTop = -1.0 + level * 2.0;
    float inBar = step(p.y, barTop) * barMaskX;

    float bevel = 0.5 + 0.5 * smoothstep(0.0, 1.0, barX);

    float h = audioHue(fract(uHue + level * uD3 * 0.6), uMid * 0.1);
    vec3 barCol = hsv2rgb(vec3(h, 0.8, 1.0));
    vec3 col = barCol * inBar * bevel;

    float peak = smoothstep(0.03, 0.0, abs(p.y - barTop)) * barMaskX;
    col += vec3(1.0) * peak * (0.4 + uD4 * 1.0);

    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.3);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
