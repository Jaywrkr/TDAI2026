// ===============================================================
// SCENE 07 - SPECTRUM
// Bandas de degradado espectral puro, estilo Pantone. Casi gratis.
// ===============================================================
//
// COMO FUNCIONA
//
// Una sola coordenada 'band' (proyeccion de p sobre un angulo) recorre
// 0..1 varias veces (segun Density); fract(band) da la posicion dentro de
// la banda actual, y eso se usa directamente como matiz. No hay ruido ni
// texturas: es geometria pura + hsv2rgb, por eso es de las escenas mas
// baratas del set.
//
// D1 controla si el borde entre bandas es un degradado suave o un salto
// duro (Pantone real es duro; el degradado es la opcion mas "atmosferica").
// D2 gira el angulo de las bandas independientemente de Chaos.
//
// CONTROLES
//   Speed    las bandas viajan a lo largo de su propio eje
//   Density  cuantas bandas caben en pantalla
//   Hue      punto de partida del espectro
//   Chaos    ondula el borde de las bandas (deja de ser recto)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro del borde de banda (excepcion del contrato)
//
// @D1: dureza del borde entre bandas (suave <-> duro)
// @D2: angulo de las bandas
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Angulo de las bandas: Chaos las ondula, D2 las rota.
    float ang = uD2 * 3.14159 + sin(t * 0.15) * 0.15;
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 perp = vec2(-dir.y, dir.x);

    // Ondulacion del borde: una perturbacion a lo largo del eje perpendicular.
    float wobble = fbm(vec2(dot(p, perp) * 0.8, t * 0.2), 3) - 0.5;
    float coord = dot(p, dir) + wobble * (0.15 + uChaos * 0.9);

    // Cuantas bandas caben, y a que velocidad viajan.
    float freq = 1.5 + uDensity * 7.0;
    float band = coord * freq + t * (0.06 + uSpeed * 0.25);

    // uHigh: vibracion micro del borde -- unica excepcion del contrato,
    // amplitud pequena (0.02 bandas), ya suavizado desde el core.
    band += uHigh * 0.02 * sin(t * 12.0 + coord * 20.0);

    // D1: que tan duro es el salto entre bandas. En 0, el matiz cambia
    // continuo dentro de cada banda (degradado); en 1, cada banda entera
    // es un solo color solido (escalon duro, look Pantone real).
    float hueSoft = audioHue(fract(uHue + band * 0.15), uMid * 0.05);
    float hueHard = audioHue(fract(uHue + floor(band) * 0.15), uMid * 0.05);
    float h = mix(hueSoft, hueHard, uD1);

    vec3 col = hsv2rgb(vec3(h, 0.90, 0.85));

    // Un filo sutil entre bandas para que no se lea como un solo gradiente
    // infinito. OJO: 'band' tiene un salto (fract) en cada borde de banda;
    // alimentar eso a edgeLine() usaria fwidth() justo sobre esa
    // discontinuidad y podria generar aliasing en GPU real. sin() en vez de
    // fract es continuo en todas partes, sin ese riesgo.
    float edge = smoothstep(0.80, 1.0, sin(band * 6.28318) * 0.5 + 0.5);
    col *= 1.0 - edge * 0.15;

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.30);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
