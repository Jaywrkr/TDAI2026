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
    vec3 metalCol = hsv2rgb(vec3(h, 0.15, 0.32));
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
