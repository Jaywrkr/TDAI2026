// ===============================================================
// SCENE 23 - NEBULOSA / CAMPO ESTELAR PROFUNDO
// Nube de gas en capas (calido/frio) con estrellas titilando adentro --
// hermano de scene07 (aurora) y scene02 (ink), pero a escala de espacio
// profundo, con la SILUETA de la nube retorciendose con Mid (geometria
// real, no solo brillo) y conectando con el hilo sistema-solar/
// constelacion de scene14/15.
// ===============================================================
//
// COMO FUNCIONA
// Un domain warp (igual espiritu que scene02/ink) deforma el espacio
// ANTES de evaluar el campo de nube -- Mid controla cuanto, asi la forma
// de la nube se retuerce de verdad con la musica. Encima, una rejilla
// fina de "estrellas" (mismo hash-por-celda que scene15/dots) titila a
// su propio ritmo, independiente de la nube.
//
// CONTROLES
//   Speed    velocidad de deriva de la nube
//   Density  cuantas estrellas hay
//   Hue      color base de la nube (calido/frio se derivan de este)
//   Chaos    intensidad del domain warp base (ademas del que mete Mid)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      RETUERCE la silueta de la nube (geometria real)
//   Kick     destello breve en toda la nube + estrellas
//   High     vibracion micro del warp (excepcion del contrato)
//
// @D1: brillo/contraste general de la nube
// @D2: cuantas estrellas se dejan ver (rejilla dispersa <-> casi todas)
// @D3: separacion de color entre las zonas calidas y frias de la nube
// @D4: tamano/prominencia de las estrellas
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    vec2 warp = vec2(fbm(p * 0.8 + t * 0.02, 4), fbm(p * 0.8 - t * 0.015 + 9.0, 4)) - 0.5;
    // Mid retuerce la silueta de verdad -- pedido de "geometria real",
    // no solo un brillo modulado.
    vec2 pw = p + warp * (0.25 + uChaos * 0.35 + uMid * 0.55);
    // uHigh: vibracion micro del warp -- excepcion del contrato.
    pw += uHigh * 0.02 * vec2(sin(t * 8.0), cos(t * 6.5));

    // PIANO: la explosion empuja el warp real (pw) desde el punto que
    // elige uKeypos -- dispersa la nube de verdad (silueta deformada),
    // no un anillo dibujado encima. uKeypulse decae solo; uKeyvel
    // escala la fuerza del empujon.
    if (uKeypulse > 0.0015) {
        vec2 novaPosW = vec2((uKeypos - 0.5) * 2.4, cos(uKeypos * 7.0) * 0.8);
        vec2 toNova = pw - novaPosW;
        float dNova2 = dot(toNova, toNova);
        pw += toNova / sqrt(dNova2 + 0.02) * uKeypulse * (0.4 + uKeyvel * 0.7) * exp(-dNova2 * 2.0);
    }

    float cloud = fbm(pw * 1.1 + vec2(t * 0.01, -t * 0.008), 5, 0.55);
    float h = audioHue(uHue, uMid * 0.08);
    vec3 warmCol = hsv2rgb(vec3(fract(h + 0.02), 0.75, 1.0));
    vec3 coolCol = hsv2rgb(vec3(fract(h + 0.52 + uD3 * 0.15), 0.65, 0.85));
    float zoneMix = smoothstep(0.35, 0.75, cloud);
    vec3 col = mix(coolCol, warmCol, zoneMix) * smoothstep(0.15, 0.7, cloud) * (0.5 + uD1 * 0.9);

    // Estrellas: rejilla fina, hash por celda, titileo independiente.
    float sfreq = 18.0 + uDensity * 26.0;
    vec2  sg = p * sfreq;
    vec2  sid = floor(sg);
    vec2  sf = fract(sg) - 0.5;
    float starHash = hash21(sid + 3.0);
    float onThresh = 0.985 - uD2 * 0.10;
    float isStar = step(onThresh, starHash);
    float starSize = 0.10 + uD4 * 0.18;
    float starD = length(sf);
    float twinkle = 0.5 + 0.5 * sin(t * (0.4 + hash21(sid + 6.0) * 1.6) + hash21(sid + 11.0) * TAU);
    float star = smoothstep(starSize, 0.0, starD) * isStar * twinkle;
    col += vec3(1.0) * star * (1.0 + uKick * 1.0);

    // PIANO: nucleo brillante de la explosion en si -- la dispersion
    // real de la nube ya paso arriba (empuja pw), esto solo marca el
    // punto de origen.
    if (uKeypulse > 0.0015) {
        vec2 novaPos = vec2((uKeypos - 0.5) * 2.4, cos(uKeypos * 7.0) * 0.8);
        float dNova = length(p - novaPos);
        float novaCore = exp(-dNova * dNova / 0.002) * uKeypulse * (0.8 + uKeyvel * 1.4);
        col += vec3(1.0, 0.85, 0.6) * novaCore;
    }

    col += col * uKick * 0.3;
    col = audioLift(col, uBass * 0.6);
    col *= vignette(uv, 0.15);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
