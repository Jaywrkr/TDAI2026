// ===============================================================
// SCENE 20 - VIDRIO TRIZADO
// Grietas tipo Voronoi (misma tecnica F2-F1 de scene01/neural) que se
// "revelan" hacia afuera desde el centro con cada golpe de bombo -- como
// un impacto real agrietando un vidrio, no una textura estatica.
// ===============================================================
//
// COMO FUNCIONA
// Las grietas salen de la MISMA tecnica Voronoi F2-F1 de scene01: los
// bordes entre celdas (donde dist2-dist1 ~ 0) forman una red de lineas
// rectas. La diferencia es la "revelacion": un CAMPO DE RUIDO fijo
// (fbm, no anima) cubre toda la pantalla con valores 0..1, y un umbral
// que SUBE con cada kick decide que zonas del ruido ya "rompieron" --
// donde el ruido da bajo se revela primero, donde da alto tarda mas.
// Como el ruido no tiene ninguna simetria radial, las zonas que se
// agrietan primero quedan REPARTIDAS por toda la pantalla (arriba, en
// una esquina, al costado...), no una mancha circular creciendo desde
// el centro -- que es justo lo que se ve mal en vidrio roto real: un
// impacto real no rompe en circulos perfectos.
//
// CONTROLES
//   Speed    no usado directo (las grietas son estaticas por celda)
//   Density  cuantas celdas de grieta hay (mas Density = red mas fina)
//   Hue      color base de la dispersion en el borde
//   Chaos    cuanto se alejan los "puntos de impacto" del centro de su
//            celda (grietas mas rectas <-> mas irregulares)
//   Bass     brillo de lo ya claro (audioLift) + nivel de revelacion en
//            reposo un poco mas alto
//   Mid      tinte adicional (audioHue)
//   Kick     el nivel de revelacion sube -- se agrietan mas ZONAS
//            REPARTIDAS por la pantalla con cada golpe
//   High     vibracion micro de los puntos (excepcion del contrato)
//
// @D1: grosor de la grieta nitida
// @D2: cantidad de glow ancho alrededor de cada grieta
// @D3: prominencia del core saturado en el borde de la grieta
// @D4: cuanto se cierra la revelacion en reposo (mas vidrio ya roto de
//      entrada <-> casi nada hasta el primer golpe)
// @D5: suavidad del borde de revelacion (recorte duro <-> se pierde
//      gradualmente)
// @D6: variacion de hue a lo largo de las grietas
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float freq = 3.0 + uDensity * 8.0;
    vec2  g = p * freq;
    vec2  cellId = floor(g);
    vec2  cellF = fract(g);

    float dist1 = 1e5;
    float dist2 = 1e5;
    for (int oy = -1; oy <= 1; oy++) {
        for (int ox = -1; ox <= 1; ox++) {
            vec2 nb = vec2(float(ox), float(oy));
            vec2 site = (hash22(cellId + nb) - 0.5) * (0.3 + uChaos * 0.6);
            // uHigh: vibracion micro de los puntos -- excepcion del
            // contrato, amplitud pequena, ya suavizado.
            site += uHigh * 0.02 * vec2(sin(t * 9.0 + cellId.x), cos(t * 7.0 + cellId.y));
            vec2 diff = nb + 0.5 + site - cellF;
            float d = length(diff);
            if (d < dist1) { dist2 = dist1; dist1 = d; }
            else if (d < dist2) { dist2 = d; }
        }
    }
    float crack = dist2 - dist1;

    // D1: grosor de la grieta nitida.
    // Grieta 0.006 -> 0.020 de ancho: con D1 en 0 las grietas eran
    // hilos de menos de un pixel y de la escena solo se veian los
    // puntos donde se cruzaban. No se leia como vidrio roto.
    float edge = 1.0 - smoothstep(0.0, 0.020 + uD1 * 0.028, crack);
    // D2: glow ancho.
    // Y el glow y el nucleo estaban multiplicados por uD2/uD3 CRUDOS,
    // asi que en 0 valian exactamente cero: la escena arrancaba sin
    // ningun brillo. Ahora tienen piso propio.
    float glow = exp(-crack * crack / (0.004 + uD2 * 0.03)) * (0.25 + uD2 * 0.85);

    // Revelacion por RUIDO, no por distancia radial: 'revealField' es un
    // fbm FIJO (no anima con el tiempo) que cubre toda la pantalla con
    // valores 0..1 sin ninguna simetria -- las zonas donde da mas bajo
    // "rompen" primero. 'shatterLevel' es el umbral, sube con cada kick
    // igual que antes (D4 sube el piso en reposo), pero ahora empuja el
    // umbral contra el CAMPO DE RUIDO en vez de contra un radio: mas
    // umbral = mas AREA del ruido por debajo de el = mas zonas
    // repartidas por la pantalla se revelan, no un circulo creciendo.
    float revealField = fbm(p * 1.35 + 41.0, 4, 0.55);
    float shatterLevel = (0.30 + uD4 * 0.45) + uKick * 0.55 + uBass * 0.06;
    float revealSoft = 0.05 + uD5 * 0.28;
    float reveal = smoothstep(shatterLevel + revealSoft, shatterLevel - revealSoft * 0.65, revealField);

    float h = audioHue(uHue, uMid * 0.15);
    float crackHueVar = 0.5 + uD6 * 4.0;

    // Atmosfera de fondo: un lift de color muy sutil detras del vidrio,
    // en vez de negro absoluto -- da la sensacion de estar iluminado por
    // algo, no de flotar en el vacio. Amplitud chica a proposito, nunca
    // compite con las grietas.
    vec3 col = hsv2rgb(vec3(fract(h + 0.55), 0.5, 0.35)) * (1.0 - smoothstep(0.1, 1.3, length(p))) * 0.05;

    col += hsv2rgb(vec3(fract(h + crack * crackHueVar), 0.55, 1.0)) * edge * reveal;
    col += hsv2rgb(vec3(fract(h + 0.5), 0.35, 1.0)) * glow * reveal * 0.6;
    // Bloom ancho: un segundo halo bastante mas difuso que 'glow' para
    // que el brillo de la grieta "sangre" al aire, no solo el trazo con
    // blur fijo de siempre.
    float bloomWide = exp(-crack * crack / (0.05 + uD2 * 0.12)) * (0.10 + uD2 * 0.25);
    col += hsv2rgb(vec3(fract(h + 0.5), 0.35, 1.0)) * bloomWide * reveal;

    // Nucleo saturado justo en el borde -- D3.
    // Mismo problema que el glow: estaba multiplicado por uD3 CRUDO, o
    // sea que con la perilla en 0 (el default) el nucleo brillante de la
    // grieta valia exactamente cero. Ahora tiene piso propio y D3 lo
    // sube desde ahi.
    float core = smoothstep(0.018, 0.0, crack);
    col += hsv2rgb(vec3(fract(h + 0.05), 0.85, 1.0)) * core
         * (0.35 + uD3 * 0.9) * reveal;

    // PIANO: un impacto EXTRA agrieta el vidrio en el punto que elige
    // uKeypos, ademas de la revelacion central -- reusa la misma red de
    // grietas (crack/edge/glow), solo cambia donde se revela. uKeypulse
    // decae solo, uKeyvel escala que tan lejos llega el impacto.
    // Radio excede el shatterR normal (0.35-0.75) a proposito -- rompe
    // de golpe una zona entera que aun NO deberia verse rota, como un
    // golpe real, no solo iluminar grietas que ya estaban ahi.
    if (uKeypulse > 0.0015) {
        vec2 impactPos = vec2((uKeypos - 0.5) * 2.4, cos(uKeypos * 9.0) * 0.8);
        float rImpact = length(p - impactPos);
        float impactR = (1.0 - uKeypulse) * (0.9 + uKeyvel * 0.9);
        // Mismo campo de ruido mezclado con el radio: el impacto puntual
        // tambien rompe en un borde irregular, no un circulo perfecto.
        float impactField = rImpact + (revealField - 0.5) * 0.6;
        float revealP = smoothstep(impactR + 0.28, impactR - 0.14, impactField) * uKeypulse;
        col += hsv2rgb(vec3(fract(h + crack * crackHueVar), 0.55, 1.0)) * edge * revealP;
        col += hsv2rgb(vec3(fract(h + 0.05), 0.85, 1.0)) * core * revealP;
    }

    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
