// ===============================================================
// SCENE 00 - VEINS
// Red vascular luminosa con pulsos de flujo, reactiva a audio.
// ===============================================================
//
// COMO FUNCIONA (leelo si vas a modificarlo o a pedirle cambios a una IA)
//
// 1. LA FORMA no sale de un Edge TOP ni de un threshold sobre ruido.
//    Sale del CONJUNTO DE NIVEL de un campo fbm: el lugar donde el ruido
//    cruza 0.5 es una curva continua que se ramifica sola. Un threshold da
//    manchas; un conjunto de nivel da filamentos. Esa es toda la diferencia
//    entre "plasma" y "venas".
//
// 2. EL GROSOR es constante en pixeles, no en unidades de ruido. Se logra
//    dividiendo la distancia al nivel por fwidth() -> la derivada en
//    pantalla. Sin esto las venas se ensanchan en las zonas planas del
//    ruido y aparecen manchones blancos.
//
// 3. LA JERARQUIA: troncos (baja frecuencia, gruesos) + capilares (alta
//    frecuencia, finos) enmascarados por el halo de los troncos, para que
//    nazcan DE ellos y no floten sueltos.
//
// 4. LOS VACIOS: una mascara de cobertura de muy baja frecuencia apaga
//    regiones enteras. Sin ella la pantalla se llena por igual y se lee
//    como textura, no como organismo.
//
// CONTROLES
//   Speed    velocidad global (uTime ya viene integrado: sin saltos de fase)
//   Density  cuanta red se ve (abre la mascara de cobertura) + capilares
//   Hue      paleta completa: sangre / cyan / violeta...
//   Chaos    domain warp = que tan retorcidas van
//   Bass     engrosa las venas
//   Kick     flash instantaneo
//   Beat     empuja los pulsos de flujo
//   High     brillo de los capilares
//   Level    respiracion global + halo
// ===============================================================

// Baja estas octavas si te faltan fps en una GPU modesta (ver docs/05).
#define OCT_TRUNK 4
#define OCT_CAP   3
#define OCT_WARP  3

// Linea de ancho constante en pixeles sobre el nivel 0.5 de un campo.
float vein(float n, float pxWidth)
{
    float d = abs(n - 0.5);
    float g = max(fwidth(n), 1e-6);
    return 1.0 - smoothstep(0.0, pxWidth * g, d);
}

// Domain warp: desplaza el espacio antes de evaluar el ruido.
// Es lo que convierte un fbm generico en algo que parece crecido.
vec2 warp(vec2 p, float t, float amt)
{
    float a = fbm(p * 0.70 + vec2(0.0, t * 0.07), OCT_WARP);
    float b = fbm(p * 0.70 + vec2(4.3, 1.7) - vec2(t * 0.05, 0.0), OCT_WARP);
    return p + amt * (vec2(a, b) - 0.5) * 2.0;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Respiracion: el organismo late con el nivel general.
    float breathe = 1.0 + 0.04 * sin(t * 0.50) + 0.10 * uLevel;
    p /= breathe;
    p += vec2(t * 0.018, t * 0.011);          // deriva lenta

    // ---------------- COBERTURA ----------------
    // Density abre o cierra el organismo. Esto es lo que da composicion.
    float cv = fbm(p * 0.42 + vec2(3.1, t * 0.03), 3);
    float cover = smoothstep(0.52 - uDensity * 0.30,
                             0.80 - uDensity * 0.22,
                             cv + uLevel * 0.10);

    // ---------------- TRONCOS ----------------
    vec2  wa = warp(p, t, 0.25 + uChaos * 0.80);
    float na = fbm(wa * 0.85, OCT_TRUNK, 0.50);
    float wT = 1.3 + uBass * 3.0 + (1.0 - uDensity) * 1.0;
    float trunk  = vein(na, wT);
    float tGlow  = vein(na, wT * 7.0);        // halo ancho, gratis

    // ---------------- CAPILARES ----------------
    vec2  wb = warp(p * 2.6 + 7.1, t * 1.30, 0.15 + uChaos * 0.45);
    float nb = fbm(wb * 2.2, OCT_CAP, 0.55);
    float wC = 0.8 + uBass * 1.4;
    float hug = smoothstep(0.05, 0.45, tGlow);   // solo cerca de un tronco
    float cap   = vein(nb, wC) * hug * (0.35 + uDensity * 0.90);
    float cGlow = vein(nb, wC * 6.0) * hug;

    float veins = max(trunk, cap) * cover;
    tGlow *= cover;
    cGlow *= cover;

    // ---------------- FLUJO ----------------
    // Bandas que viajan a lo largo de la red, como sangre.
    float phase = fbm(wa * 0.90, 2);
    float flow  = fract(phase * 3.5 - t * 0.30 - uBeat * 0.20);
    float pulse = smoothstep(0.00, 0.30, flow) * smoothstep(0.90, 0.55, flow);

    float core = veins * (0.35 + 1.20 * pulse + 1.00 * uKick);
    float halo = (tGlow * 0.75 + cGlow * 0.30)
               * (0.45 + 0.55 * uLevel + 0.85 * uBeat);

    // ---------------- COLOR ----------------
    float h = uHue;
    vec3 cDeep = hsv2rgb(vec3(fract(h + 0.60), 0.85, 1.0)) * 0.10;  // atmosfera
    vec3 cBody = hsv2rgb(vec3(fract(h + 0.98), 0.95, 1.0));         // vaso
    vec3 cCore = hsv2rgb(vec3(fract(h + 0.06), 0.40, 1.0));         // nucleo caliente

    vec3 col = cDeep * (0.14 + 1.00 * halo)
             + cBody * core * 1.25
             + cCore * pow(core, 3.0) * 2.20
             + cBody * halo * 0.75
             + cCore * cap * uHigh * 0.35;

    // Tonemap: evita que los nucleos se claven en blanco plano.
    col = col / (1.0 + col);

    col *= vignette(uv, 0.55);

    // Dither: mata el banding en los degradados oscuros. Casi gratis.
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
