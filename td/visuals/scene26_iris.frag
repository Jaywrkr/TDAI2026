// ===============================================================
// SCENE 26 - IRIS / DIAFRAGMA
// Hojas mecanicas tipo diafragma de camara real, girando en pinwheel,
// que se ABREN Y CIERRAN de verdad con los graves y el kick -- geometria
// real, no un iris pintado que solo brilla distinto.
// ===============================================================
//
// COMO FUNCIONA
// El plano se parte en cunas iguales (mismo pliegue angular que un
// caleidoscopio). Dentro de cada cuna, el borde de la "hoja" es una
// recta inclinada (r*sin(angulo_local + tilt) = radio_apertura) -- el
// mismo truco que un poligono/estrella de N lados, pero con el tilt
// desplazado para que las hojas se superpongan como en un diafragma real
// en vez de formar un poligono limpio. El radio de apertura ES la
// geometria que reacciona a Bass/Kick: la abertura central crece y se
// achica de verdad.
//
// CONTROLES
//   Speed    velocidad de rotacion del diafragma entero
//   Density  cuantas hojas tiene
//   Hue      tinte del brillo que escapa por la apertura
//   Chaos    no usado directo (reservado)
//   Bass     ABRE la apertura (geometria real) + brillo de lo ya claro
//   Mid      tinte adicional (audioHue)
//   Kick     la apertura salta mas abierta un instante
//   High     no usado directo (reservado)
//
// @D1: nitidez del filo brillante de cada hoja
// @D2: cuanto se inclina/superpone cada hoja (diafragma mas limpio <->
//      mas "torcido")
// @D3: intensidad del filo de las hojas
// @D4: brillo de la luz que se escapa por el centro
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);

    float blades = 5.0 + floor(uDensity * 5.0);
    float sector = TAU / blades;
    float rot = t * (0.04 + uSpeed * 0.12);

    // Apertura real: crece con los graves y salta con el kick.
    float openR = clamp(0.10 + uBass * 0.22 + uKick * 0.3, 0.04, 0.75);

    // PIANO: "disparo" de obturador -- el diafragma se abre a fondo y
    // cierra solo con cada tecla, geometria real (no solo brillo).
    // uKeypulse decae solo (como uKick), uKeyvel escala que tan a fondo
    // se abre.
    openR = clamp(openR + uKeypulse * (0.35 + uKeyvel * 0.4), 0.04, 0.9);

    float la = mod(ang - rot, sector) - sector * 0.5;
    float tilt = 0.15 + uD2 * 0.35;
    float bladeSDF = r * sin(la + tilt) - openR;
    // Signo corregido: bladeSDF > 0 es "afuera de la apertura" (hoja de
    // metal), < 0 es la apertura misma -- al reves quedaba la hoja
    // cubriendo el centro entero y nunca se veia ninguna abertura.
    float isBlade = smoothstep(0.0, 0.012, bladeSDF);

    float edgeGlow = exp(-bladeSDF * bladeSDF / (0.0004 + uD1 * 0.004));

    float h = audioHue(uHue, uMid * 0.15);

    // METAL, no cartulina. El color plano de antes (un unico gris para
    // TODA la hoja) es lo que hacia que el diafragma se leyera como
    // papel recortado. Tres cosas lo convierten en metal, todas gratis
    // porque salen de valores que ya estaban calculados:
    //   1. gradiente A LO ANCHO de cada hoja (la luz pega distinto en
    //      cada punto de una chapa inclinada),
    //   2. variacion por hoja, para que dos hojas vecinas se separen en
    //      vez de fundirse en una mancha,
    //   3. un especular de una luz FIJA arriba-izquierda: como el
    //      diafragma gira y la luz no, el brillo barre las hojas y es
    //      justo eso lo que se lee como "esto es metal".
    float bladeIdx = floor((ang - rot) / sector);
    float across = la / (sector * 0.5);                    // -1..1
    float shade = 0.45 + 0.55 * smoothstep(-1.0, 1.0, across);
    shade *= 0.82 + hash21(vec2(bladeIdx, 3.0)) * 0.36;
    float spec = pow(max(0.0, dot(normalize(p + 1e-5),
                                  normalize(vec2(-0.6, 0.8)))), 7.0);

    vec3 metalCol = hsv2rgb(vec3(h, 0.10, 0.34)) * shade
                  + vec3(0.85, 0.90, 1.0) * spec * 0.22;
    vec3 col = metalCol * isBlade;
    col += hsv2rgb(vec3(fract(h + 0.5), 0.6, 1.0)) * edgeGlow * (0.5 + uD3 * 1.1);

    // Luz que escapa por la apertura central.
    float centerGlow = exp(-r * r / (openR * openR * 0.5 + 0.001)) * (1.0 - isBlade);
    col += hsv2rgb(vec3(fract(h + 0.05), 0.3, 1.0)) * centerGlow * (0.35 + uD4 * 0.85);

    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.35);
    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
