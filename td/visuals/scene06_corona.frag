// ===============================================================
// SCENE 10 - CORONA (ECLIPSE)
// Reemplaza al diafragma mecanico de camara: un disco oscuro (como la
// luna tapando el sol) rodeado de una corona de luz turbulenta y rayos
// radiales -- atmosferico en vez de metal fotografiado, mismo criterio
// que aurora/nebula del set ya perfecto.
// ===============================================================
//
// COMO FUNCIONA
// La corona sale de un fbm evaluado en coordenadas (angulo, radio) que
// fluye con el tiempo -- el mismo domain-warp continuo que el resto del
// set -- multiplicado por unos "rayos" radiales (un seno en el angulo,
// elevado a una potencia para afinarlos) que le dan la textura de
// streamers de una corona solar real. Un anillo fino justo en el borde
// del disco da el destello tipo "anillo de diamante" de un eclipse
// real. El disco en si sigue reaccionando a Bass/Kick con geometria
// real -- crece un poco -- mismo criterio que ya tenia esta escena
// cuando era un diafragma.
//
// CONTROLES
//   Speed    no usado directo (reservado)
//   Density  no usado directo (reservado)
//   Hue      color base de la corona
//   Chaos    no usado directo (reservado)
//   Bass     agranda el disco un poco (geometria real) + brillo
//   Mid      tinte adicional (audioHue)
//   Kick     el anillo de borde destella mas fuerte un instante
//   High     no usado directo (reservado)
//
// @D1: rugosidad de la turbulencia de la corona
// @D2: cantidad de rayos/streamers radiales
// @D3: contraste de la corona
// @D4: tamano del disco oscuro
// @D5: velocidad de la turbulencia
// @D6: brillo del anillo de borde (efecto "diamante")
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);
    float h = audioHue(uHue, uMid * 0.15);

    // D4: tamano del disco. Bass lo agranda un poco (geometria real,
    // mismo criterio que ya tenia esta escena de diafragma).
    float diskR = mix(0.12, 0.34, uD4) + uBass * 0.03;
    // PIANO: el disco crece un instante con cada tecla -- decae solo
    // con uKeypulse, uKeyvel escala cuanto.
    diskR += uKeypulse * (0.05 + uKeyvel * 0.08);

    float turbSpeed = 0.05 + uD5 * 0.35;
    float turb = fbm(vec2(ang * 2.5, r * 4.0) + vec2(t * turbSpeed, -t * turbSpeed * 0.7), 5, 0.5 + uD1 * 0.2);

    float rayFreq = mix(6.0, 26.0, uD2);
    float rays = pow(abs(sin(ang * rayFreq * 0.5 + turb * 4.0)), 3.0);

    float corona = (0.35 + turb * 0.9) * (0.3 + rays * 1.0);
    float contrast = mix(1.0, 3.2, uD3);
    corona = pow(clamp(corona, 0.0, 1.0), contrast);

    float falloff = exp(-max(r - diskR, 0.0) * 3.2);
    vec3  hotCol = hsv2rgb(vec3(fract(h), 0.5, 1.0));
    vec3  coolCol = hsv2rgb(vec3(fract(h + 0.12), 0.7, 1.0));
    vec3  col = mix(coolCol, hotCol, smoothstep(0.0, 0.5, corona)) * corona * falloff * 1.4;

    // D6: anillo de borde tipo "anillo de diamante" de un eclipse real.
    float ringD = abs(r - diskR);
    float ring = exp(-ringD * ringD / 0.0006) * (0.5 + uD6 * 1.4);
    col += vec3(1.0, 0.95, 0.85) * ring;

    // Kick: el anillo de borde destella mas fuerte un instante, ademas
    // del flash general de mas abajo.
    col += vec3(1.0, 0.9, 0.7) * ring * uKick * 0.8;

    // Disco oscuro solido -- nada de corona adentro.
    col *= smoothstep(diskR * 0.7, diskR, r);

    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.35);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
