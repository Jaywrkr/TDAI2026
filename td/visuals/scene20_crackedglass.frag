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
// rectas. La diferencia es la "revelacion": una mascara radial
// (smoothstep sobre la distancia al centro) solo deja ver grietas hasta
// un radio que SALTA con cada kick -- el vidrio se agrieta mas y mas
// lejos del centro con cada golpe, en vez de estar siempre roto igual.
//
// CONTROLES
//   Speed    no usado directo (las grietas son estaticas por celda)
//   Density  cuantas celdas de grieta hay (mas Density = red mas fina)
//   Hue      color base de la dispersion en el borde
//   Chaos    cuanto se alejan los "puntos de impacto" del centro de su
//            celda (grietas mas rectas <-> mas irregulares)
//   Bass     brillo de lo ya claro (audioLift) + radio de revelacion en
//            reposo un poco mas grande
//   Mid      tinte adicional (audioHue)
//   Kick     el radio de revelacion salta hacia afuera -- el vidrio se
//            agrieta mas con cada golpe
//   High     vibracion micro de los puntos (excepcion del contrato)
//
// @D1: grosor de la grieta nitida
// @D2: cantidad de glow ancho alrededor de cada grieta
// @D3: prominencia del core saturado en el borde de la grieta
// @D4: cuanto se cierra la revelacion en reposo (mas vidrio ya roto de
//      entrada <-> casi nada hasta el primer golpe)
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
    float edge = 1.0 - smoothstep(0.0, 0.006 + uD1 * 0.03, crack);
    // D2: glow ancho.
    float glow = exp(-crack * crack / (0.002 + uD2 * 0.03)) * uD2;

    // Revelacion radial: crece con cada kick, D4 sube el piso en reposo.
    // Piso subido (0.10->0.35): en D4=0 el vidrio quedaba practicamente
    // sin grietas visibles hasta el primer golpe -- ahora ya hay una
    // "telaraña" de grietas de entrada, y el kick sigue agrandandola.
    float r = length(p);
    float shatterR = (0.35 + uD4 * 0.4) + uKick * 1.4 + uBass * 0.12;
    float reveal = smoothstep(shatterR + 0.18, shatterR - 0.18, r);

    float h = audioHue(uHue, uMid * 0.15);
    vec3 col = hsv2rgb(vec3(fract(h + crack * 3.0), 0.55, 1.0)) * edge * reveal;
    col += hsv2rgb(vec3(fract(h + 0.5), 0.35, 1.0)) * glow * reveal * 0.6;

    // Nucleo saturado justo en el borde -- D3.
    float core = smoothstep(0.012, 0.0, crack);
    col += hsv2rgb(vec3(fract(h + 0.05), 0.85, 1.0)) * core * uD3 * reveal;

    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
