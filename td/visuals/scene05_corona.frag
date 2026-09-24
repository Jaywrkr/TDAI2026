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
//   Bass     agranda el disco un poco (geometria real) + brillo + hace
//            bailar la turbulencia de la corona de verdad (pedido
//            explicito: sin bajo la corona casi no se mueve, con bajo
//            se nota el movimiento)
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
    // PIANO (1/2): el disco late un poco con cada tecla. Lo principal es
    // la protuberancia, mas abajo.
    diskR += uKeypulse * (0.02 + uKeyvel * 0.03);

    // Bajado (0.05/0.35 -> 0.015/0.10): idle case casi quieto -- el
    // movimiento real ahora lo trae el bajo (bassFlow), pedido
    // explicito de "sin bajo no se mueve, con bajo si". Amplitud
    // escalada por uBass (no re-escala de t), asi es continuo: crece
    // suave con el nivel en vez de saltar cuando cruza un umbral.
    float turbSpeed = 0.015 + uD5 * 0.10;
    vec2  bassFlow = uBass * (0.5 + uD5 * 0.5) * vec2(sin(t * 0.8), cos(t * 0.65));
    float turb = fbm(vec2(ang * 2.5, r * 4.0) + vec2(t * turbSpeed, -t * turbSpeed * 0.7) + bassFlow, 5, 0.5 + uD1 * 0.2);

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
    float ring = exp(-ringD * ringD / 0.0006) * (0.15 + uD6 * 2.4);   // D6 rango ampliado (auditoria)
    col += vec3(1.0, 0.95, 0.85) * ring;

    // Kick: el anillo de borde destella mas fuerte un instante, ademas
    // del flash general de mas abajo.
    col += vec3(1.0, 0.9, 0.7) * ring * uKick * 0.8;

    // Disco oscuro solido -- nada de corona adentro.
    // PIANO (2/2): "protuberancia". Cada tecla hace erupcionar un arco
    // de plasma desde el borde del disco, en el angulo que elige uKeypos
    // (el teclado da la vuelta al sol): un lazo que sube, con la textura
    // de la misma turbulencia de la corona, y se desvanece con
    // uKeypulse. Velocity = arco mas alto y mas ancho.
    if (uKeypulse > 0.0015) {
        float a0 = uKeypos * TAU - PI;
        float da = mod(ang - a0 + PI, TAU) - PI;
        float halfA = 0.25 + uKeyvel * 0.25;
        float rise = sin(min((1.0 - uKeypulse) * 3.0 + 0.4, 1.0) * PI * 0.5);
        float loopH = (0.18 + uKeyvel * 0.35) * rise;
        float u = clamp(da / halfA, -1.0, 1.0);
        float rLoop = diskR + loopH * sqrt(max(1.0 - u * u, 0.0));
        float dLoop = abs(r - rLoop) + max(abs(da) - halfA, 0.0) * r;
        float arc = exp(-dLoop * dLoop / 0.0005) + exp(-dLoop * dLoop / 0.006) * 0.35;
        col += mix(hotCol, vec3(1.0, 0.95, 0.85), 0.4) * arc * (0.6 + turb * 0.9)
             * uKeypulse * (1.8 + uKeyvel * 2.0);
    }

    col *= smoothstep(diskR * 0.7, diskR, r);

    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.35);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
