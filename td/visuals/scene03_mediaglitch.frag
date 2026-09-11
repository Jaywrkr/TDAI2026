// ===============================================================
// SCENE 06 - MEDIA GLITCH (AGUA)
// Toma la imagen actual de la carpeta comun de media y la distorsiona
// como si se viera a traves de agua en movimiento -- reemplaza al
// glitch de bloques/tearing/dropout por un oleaje continuo (domain
// warp), siguiendo el mismo criterio de "organico, con glow, sin
// cortes duros" que el resto del set ya perfecto.
// ===============================================================
//
// COMO FUNCIONA
//
// mediaTex(uv) lee la carpeta comun (compartida con scene18 caleido y
// scene19 halftone -- ver config.MEDIA_SCENES). En vez de cuantizar y
// cortar el uv (pixelado + tearing de antes), se lo desplaza con un
// campo fbm CONTINUO que fluye con el tiempo -- el mismo truco de
// domain warp que scene02_caustica/scene17_wormhole -- asi la imagen
// se ve ondulada como a traves de agua, nunca rota en bloques.
//
// CONTROLES
//   Speed    velocidad del flujo del oleaje
//   Density  frecuencia del oleaje (ondas anchas <-> muchas y finas)
//   Hue      tinte adicional mezclado sobre la imagen (0 = original)
//   Chaos    turbulencia del oleaje (agua quieta <-> agitada)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     el oleaje se agita mas fuerte un instante
//   High     vibracion micro adicional (excepcion del contrato)
//
// @D1: fuerza de la distorsion del oleaje
// @D2: cuanto se separan los canales de color (aberracion suave, como
//      luz refractada)
// @D3: mezcla de tinte de Hue sobre la imagen
// @D4: velocidad del flujo interno del oleaje
// @D5: cantidad de grano fino, incluso sin kick
// @D6: profundidad de una segunda capa de oleaje mas fina, encima de
//      la primera
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float freq = mix(1.5, 6.0, uDensity);
    float flowSpeed = 0.15 + uD4 * 0.6;
    float turb = 0.5 + uChaos * 1.3;

    vec2  warp = vec2(fbm(p * freq + t * flowSpeed, 4),
                       fbm(p * freq - t * flowSpeed * 0.8 + 7.0, 4)) - 0.5;
    // D6: segunda capa de oleaje mas fina, encima de la primera.
    vec2  warp2 = vec2(fbm(p * freq * 2.6 - t * flowSpeed * 1.3 + 3.0, 3),
                        fbm(p * freq * 2.6 + t * flowSpeed * 1.1 + 11.0, 3)) - 0.5;
    vec2  totalWarp = warp * turb + warp2 * turb * uD6 * 0.6;

    // Kick: el oleaje se agita mas fuerte un instante.
    float amt = mix(0.02, 0.14, uD1) * (1.0 + uKick * 1.8);
    vec2  offset = totalWarp * amt;
    // uHigh: vibracion micro adicional -- unica excepcion del contrato.
    offset += uHigh * 0.006 * vec2(sin(t * 14.0), cos(t * 12.0));

    vec2  muv = clamp(uv + offset, 0.0, 1.0);

    // D2: aberracion cromatica suave, como luz refractada por el agua
    // (no un split duro de senal rota).
    float aberr = uD2 * 0.012 * (1.0 + uKick * 0.8);
    vec3  media;
    media.r = mediaTex(clamp(muv + offset * aberr * 8.0, 0.0, 1.0)).r;
    media.g = mediaTex(muv).g;
    media.b = mediaTex(clamp(muv - offset * aberr * 8.0, 0.0, 1.0)).b;

    // D3 + Hue/Mid: tinte mezclado sobre la imagen original.
    float h = audioHue(uHue, uMid * 0.16);
    vec3  tint = hsv2rgb(vec3(h, 0.7, 1.0));
    float lum = dot(media, vec3(0.299, 0.587, 0.114));
    vec3  col = mix(media, tint * lum, uD3 * 0.75);

    // PIANO: una onda de choque de agua nace en el punto que elige
    // uKeypos y empuja el muestreo desde ahi -- geometria real (el
    // muestreo se desplaza), decae sola con uKeypulse.
    if (uKeypulse > 0.0015) {
        vec2  gp = vec2(uKeypos, 0.5);
        vec2  toG = uv - gp;
        float dG = length(toG);
        vec2  ripple = normalize(toG + 1e-4) * sin(dG * 30.0 - t * 8.0) * uKeypulse * (0.03 + uKeyvel * 0.05);
        vec3  ripCol = mediaTex(clamp(muv + ripple, 0.0, 1.0)).rgb;
        col = mix(col, ripCol, uKeypulse * exp(-dG * dG * 8.0) * 0.8 + uKeypulse * 0.2);
    }

    // Kick: flash breve.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro. Mismo multiplicador que el resto de
    // las escenas de imagen del set.
    col = audioLift(col, uBass * 2.4);

    // D5: grano fino, incluso sin kick.
    float grain = (hash21(uv * uResW + fract(uRTime) * 23.0) - 0.5) * (0.01 + uD5 * 0.08 + uKick * 0.04);
    col += grain;
    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
