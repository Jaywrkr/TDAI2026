// ===============================================================
// SCENE 33 - AGUJERO NEGRO / HORIZONTE DE SUCESOS
// Disco de acrecion girando alrededor de un horizonte de sucesos negro
// puro, con una lente gravitacional falsa curvando el angulo cerca del
// borde -- cierre cosmico del set (conecta con scene14 orbit y scene23
// nebula).
// ===============================================================
//
// COMO FUNCIONA
// Cerca del horizonte, el angulo de cada pixel se "curva" un extra
// (lensAmt, que crece cuanto mas cerca del horizonte) antes de evaluar el
// patron del disco -- una lente gravitacional real curva la luz mas
// fuerte cuanto mas cerca del horizonte, esto es la version barata de
// esa idea. El disco en si es un fbm evaluado en (angulo curvado, radio),
// rotando -- Bass sube la VELOCIDAD de rotacion de verdad.
//
// CONTROLES
//   Speed    velocidad base de rotacion del disco
//   Density  no usado directo (reservado)
//   Hue      color del disco (calido/frio se derivan de este)
//   Chaos    no usado directo (reservado)
//   Bass     ACELERA la rotacion del disco (geometria real) + brillo
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todo el disco
//   High     no usado directo (reservado)
//
// @D1: frecuencia de la textura del disco (bandas anchas <-> muy finas)
// @D2: fuerza de la lente gravitacional cerca del horizonte
// @D3: contraste/brillo general del disco
// @D4: tamano del horizonte de sucesos
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);

    float horizonR = 0.10 + uD4 * 0.10;
    float lensAmt = (0.3 + uD2 * 1.2) / max(r - horizonR * 0.5, 0.05);
    // PIANO: la lente gravitacional se distorsiona mucho mas fuerte un
    // instante con cada tecla -- geometria real (el angulo se curva
    // mas), como si el horizonte de sucesos se hiciera mas fuerte de
    // golpe, no un flash de brillo. uKeypulse decae solo; uKeyvel
    // escala la fuerza extra.
    lensAmt *= 1.0 + uKeypulse * (1.5 + uKeyvel * 2.5);
    float bentAng = ang + lensAmt * 0.15;

    float diskFreq = 3.0 + uD1 * 10.0;
    float rotSpeed = 0.3 + uSpeed * 1.0 + uBass * 1.6;
    // PIANO: el disco invierte el giro un instante con cada tecla --
    // geometria real (la velocidad de rotacion cambia de signo), no solo
    // brillo. uKeypulse decae solo, asi vuelve a girar normal por su
    // cuenta; uKeyvel escala que tan fuerte se invierte.
    rotSpeed = mix(rotSpeed, -rotSpeed * (0.6 + uKeyvel * 0.8), uKeypulse);
    float disk = fbm(vec2(bentAng * 2.0 - t * rotSpeed, r * diskFreq), 3);

    float diskMask = smoothstep(horizonR, horizonR + 0.06, r) * smoothstep(0.9, 0.4, r);
    float h = audioHue(uHue + 0.05, uMid * 0.15);
    vec3 hotCol = hsv2rgb(vec3(fract(h), 0.7, 1.0));
    vec3 coolCol = hsv2rgb(vec3(fract(h + 0.08), 0.85, 0.6));
    float contrast = 0.3 + uD3 * 0.7;
    vec3 col = mix(coolCol, hotCol, smoothstep(0.5 - contrast, 0.5 + contrast, disk))
             * diskMask * (0.5 + disk * 0.8) * (0.5 + uD3 * 0.7);

    // Horizonte de sucesos: borde brillante fino, negro absoluto adentro.
    float dEdge = r - horizonR;
    float horizonEdge = exp(-dEdge * dEdge / 0.0004);
    col += vec3(1.0, 0.85, 0.6) * horizonEdge * 1.4;
    col *= smoothstep(horizonR * 0.55, horizonR, r);

    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.4);
    col *= vignette(uv, 0.15);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
