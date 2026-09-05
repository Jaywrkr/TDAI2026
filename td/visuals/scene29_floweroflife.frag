// ===============================================================
// SCENE 29 - FLOR DE LA VIDA / GEOMETRIA SAGRADA
// Reticula hexagonal de circulos superpuestos (patron clasico "flor de
// la vida"), rotando lento, dorado por defecto -- conecta con el hilo de
// mandalas/simetria del set (scene14 orbit, scene22 osciloscopio).
// ===============================================================
//
// COMO FUNCIONA
// Los centros de los circulos viven en una reticula TRIANGULAR (hex
// lattice): center(i,j) = R*(i + j*0.5, j*0.866). Para cada pixel se
// recorre un vecindario fijo de esa reticula (bucle de conteo fijo,
// barato -- nada de fbm) y se mide la distancia al borde del circulo mas
// cercano de cada centro; el minimo de esas distancias, dibujado con
// edgeLine, da la retícula completa de circulos superpuestos.
//
// CONTROLES
//   Speed    velocidad de rotacion de la reticula entera
//   Density  cuantos anillos de la reticula hex entran (mas Density =
//            patron mas denso/repetido)
//   Hue      color base (dorado por defecto)
//   Chaos    no usado directo (reservado)
//   Bass     brillo de lo ya claro (audioLift) + pulso general
//   Mid      tinte adicional (audioHue)
//   Kick     destello fuerte en toda la reticula, como si "vibrara"
//   High     no usado directo (reservado)
//
// @D1: grosor del trazo nitido
// @D2: cantidad de glow alrededor de cada circulo
// @D3: no usado directo (reservado)
// @D4: radio de cada circulo (reticula mas apretada <-> circulos grandes
//      y muy superpuestos)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    p = rot2(t * (0.015 + uSpeed * 0.05)) * p;

    float R = 0.22 + uD4 * 0.16;
    float cellSpan = 4.0 + floor(uDensity * 3.0);
    float minRing = 1e5;

    for (int j = -4; j <= 4; j++) {
        if (abs(float(j)) > cellSpan) continue;
        for (int i = -4; i <= 4; i++) {
            if (abs(float(i)) > cellSpan) continue;
            float fi = float(i);
            float fj = float(j);
            vec2 center = R * vec2(fi + fj * 0.5, fj * 0.8660254);
            float d = abs(length(p - center) - R);
            minRing = min(minRing, d);
        }
    }

    float lineW = 0.004 + uD1 * 0.02;
    float line = 1.0 - smoothstep(0.0, lineW, minRing);
    float glow = exp(-minRing * minRing / (0.001 + uD2 * 0.02)) * uD2;

    float h = audioHue(uHue, uMid * 0.1);
    vec3 col = hsv2rgb(vec3(h, 0.55, 1.0)) * (line + glow * 0.5);

    // PIANO: un anillo especifico de la reticula (a la distancia del
    // centro que elige uKeypos) pulsa mas brillante con cada tecla --
    // uKeypulse decae solo, uKeyvel escala el brillo del pulso.
    if (uKeypulse > 0.0015) {
        float selectedR = mix(0.15, 1.1, uKeypos);
        float dSelected = length(p) - selectedR;
        float ringPulse = exp(-dSelected * dSelected / 0.0015) * uKeypulse * (0.6 + uKeyvel * 1.4);
        col += hsv2rgb(vec3(fract(h + 0.5), 0.5, 1.0)) * ringPulse;
    }

    col *= 1.0 + uBass * 0.3 + uKick * 0.9;
    col = audioLift(col, uBass * 0.4);
    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
