// ===============================================================
// AGUJERO NEGRO
// Lente gravitacional 2D: las coordenadas se curvan alrededor de un
// centro (UV warp radial), con un disco de acrecion hecho de bandas
// giratorias -- tecnica clasica (deformar el UV con 1/r antes de
// muestrear un patron), dominio publico, reescrita para este rig. No es
// un port de ningun shader puntual de Shadertoy.
// ===============================================================
//
// CONTROLES
//   Speed    velocidad de giro del disco de acrecion
//   Density  cuantas bandas tiene el disco
//   Hue      paleta completa (disco + estrellas de fondo)
//   Chaos    turbulencia del disco (las bandas dejan de ser perfectas)
//   Bass     brillo general (audioLift)
//   Mid      tinte que se mueve con la musica (audioHue)
//   Kick     destello breve
//
// @D1: tamano del horizonte de sucesos (el circulo negro central)
// @D2: fuerza de la lente (cuanto se curva el espacio alrededor)
// @D3: grosor de las bandas del disco
// @D4: cantidad de estrellas de fondo
// @D5: velocidad del titileo de las estrellas
// @D6: brillo del disco de acrecion
// ===============================================================

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);
    float r = length(p);
    float horizon = mix(0.10, 0.30, uD1);
    float lensK = mix(0.02, 0.14, uD2);

    // Lente: el radio efectivo de muestreo se contrae cerca del centro
    // (1/r clasico), curvando cualquier cosa que este "detras". Es un
    // UV warp puro -- no mueve ningun elemento, solo distorsiona donde
    // se lee el fondo.
    vec2 dir = r > 0.0001 ? p / r : vec2(0.0);
    float rWarp = r + lensK / max(r, horizon * 0.6);
    vec2 pw = dir * rWarp;

    // Fondo: estrellas baratas (hash puntual sobre una grilla), curvadas
    // por la lente.
    vec2 starGrid = pw * mix(6.0, 16.0, uD4);
    vec2 sc = floor(starGrid);
    float starH = hash21(sc);
    float starSeed = hash21(sc + 11.7);
    float star = smoothstep(0.985, 1.0, starH) * (0.5 + 0.5 * sin(uRTime * mix(0.3, 4.0, uD5) + starSeed * TAU));
    vec3 col = vec3(star) * hsv2rgb(vec3(fract(uHue + 0.6), 0.15, 1.0));

    // Disco de acrecion: anillo entre horizon y ~horizon*2.6, con bandas
    // giratorias en angulo. Chaos rompe la periodicidad perfecta.
    float ring = smoothstep(horizon, horizon + 0.03, r) * (1.0 - smoothstep(horizon * 2.6, horizon * 3.1, r));
    float ang = atan(p.y, p.x) + uTime * (0.4 + uSpeed * 1.4) * (horizon / max(r, 0.001));
    float bands = float(int(mix(4.0, 14.0, uDensity)));
    float turbulence = uChaos * 0.6 * sin(r * 9.0 - uTime * 0.8);
    float band = 0.5 + 0.5 * sin(ang * bands + turbulence);
    band = pow(band, mix(1.0, 4.0, 1.0 - uD3));

    vec3 discCol = hsv2rgb(vec3(fract(uHue + 0.02 - r * 0.3), 0.85, 1.0));
    col += discCol * ring * band * mix(0.6, 2.2, uD6);

    // Horizonte de sucesos: negro absoluto, tapa cualquier cosa detras.
    float voidMask = smoothstep(horizon, horizon - 0.015, r);
    col *= 1.0 - voidMask;

    // AUDIO -- bajos = brillo, medios = tinte, agudos = destello micro en
    // el borde del horizonte (los pocos px del anillo de contacto).
    col = audioLift(col, uBass * 0.8);
    float h2 = audioHue(uHue, uMid * 0.05);
    col = mix(col, hsv2rgb(vec3(fract(h2 + 0.02 - r * 0.3), 0.85, 1.0)) * ring * band, 0.4);
    float rim = (1.0 - smoothstep(0.0, 0.01, abs(r - horizon))) * (1.0 - voidMask);
    col += vec3(1.0) * rim * uHigh * 0.7;
    col += col * uKick * 0.4;

    col = col / (1.0 + col);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;
    return vec4(max(col, 0.0), 1.0);
}
