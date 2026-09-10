// ===============================================================
// SCENE 40 - PANELES
// Un vitral tipo Mondrian: la pantalla se parte en paneles
// rectangulares de tamanos irregulares (particion binaria, no una
// grilla pareja), cada uno con su propio degradado de dos colores. La
// PARTICION es fija (depende de Density/Chaos, no del tiempo) -- lo que
// cambia todo el tiempo son los colores y el angulo del degradado de
// cada panel, a saltos, como un organo de luces cambiando de escena.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. PARTICION BSP: se arranca con el rectangulo completo [0,1]x[0,1] y
//    se lo va cortando 'profundidad' veces, alternando corte vertical y
//    horizontal, en una posicion con algo de azar (Chaos controla
//    cuanto se aleja del 50/50 -- parejo da paneles tipo grilla,
//    desparejo da la mezcla de anchos/altos del video). En cada corte
//    el pixel cae de un lado o del otro, y ese camino (izq/der, arriba/
//    abajo en cada nivel) se va acumulando en 'nodeHash' -- al final
//    del bucle, nodeHash identifica de forma unica el panel donde cayo
//    ese pixel, y (lo,hi) son sus bordes reales. Es la misma idea que
//    un arbol kd, evaluada analiticamente por pixel, sin recursion real.
//
// 2. RESEED DE COLOR (no de layout): colorGs = floor(t*velocidad) +
//    un empujon de uKick -- por eso los paneles cambian de color TODOS
//    JUNTOS y de golpe, y un golpe de graves fuerte adelanta el cambio
//    (el panel "flashea" a un color nuevo con el kick). La particion
//    en si NUNCA se recalcula con el tiempo, solo con las perillas.
//
// 3. DEGRADADO: dos colores por panel (mismo hue base +/- un delta) se
//    interpolan a lo largo de un angulo elegido por hash -- D3 decide
//    si ese angulo es siempre vertical o puede ser cualquiera
//    (incluidos los diagonales que se ven en el video).
//
// CONTROLES
//   Speed    velocidad a la que los paneles cambian de color
//   Density  profundidad de la particion (pocos paneles grandes <->
//            muchos chicos)
//   Hue      hue base de la paleta (rota junto a todos los paneles)
//   Chaos    irregularidad de los cortes (paneles parejos tipo grilla
//            <-> anchos/altos bien mezclados)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, ADELANTA el reseed de color -- todos los
//            paneles cambian de golpe con el golpe de graves
//   High     vibracion micro del degradado dentro de cada panel
//            (excepcion del contrato)
//
// @D1: probabilidad de paneles "casi blancos" (paleta a full color <->
//      bastantes paneles palidos, como en el video)
// @D2: saturacion general de la paleta
// @D3: variacion del angulo del degradado (siempre vertical <->
//      cualquier angulo, incluidos diagonales)
// @D4: separacion de hue entre los dos extremos del degradado de cada
//      panel (solo cambia el brillo <-> dos colores bien distintos)
// @D5: visibilidad de la costura fina entre paneles
// @D6: ganancia general antes del brillo de audio
// ===============================================================

float paletteHue(int i) {
    if (i == 0) return 0.62;   // azul
    if (i == 1) return 0.90;   // magenta
    if (i == 2) return 0.78;   // violeta
    if (i == 3) return 0.02;   // rojo/naranja
    if (i == 4) return 0.55;   // celeste
    return 0.94;                 // rosa
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  pp = uv;

    // --- PARTICION BSP (fija, solo depende de knobs) ---
    int   depth = 2 + int(floor(uDensity * 3.99));
    float splitVar = 0.10 + uChaos * 0.32;

    vec2  lo = vec2(0.0), hi = vec2(1.0);
    float nodeHash = 1.0;

    for (int i = 0; i < 5; i++) {
        if (i >= depth) break;
        float fi = float(i);
        float rnd = hash21(vec2(nodeHash, fi * 13.7 + 7.0));
        float split = mix(0.5 - splitVar, 0.5 + splitVar, rnd);
        if (i % 2 == 0) {
            float mid = mix(lo.x, hi.x, split);
            if (pp.x < mid) { hi.x = mid; nodeHash = nodeHash * 2.0 + 1.0; }
            else            { lo.x = mid; nodeHash = nodeHash * 2.0 + 2.0; }
        } else {
            float mid = mix(lo.y, hi.y, split);
            if (pp.y < mid) { hi.y = mid; nodeHash = nodeHash * 2.0 + 1.0; }
            else            { lo.y = mid; nodeHash = nodeHash * 2.0 + 2.0; }
        }
    }

    vec2 panelSize = max(hi - lo, vec2(1e-4));
    vec2 panelLocal = (pp - lo) / panelSize;

    // uHigh: vibracion micro del degradado -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    panelLocal += uHigh * 0.01 * vec2(sin(t * 10.0 + nodeHash), cos(t * 8.0 + nodeHash));

    // --- RESEED DE COLOR (rapido, independiente del layout) ---
    // Kick: ademas del flash de mas abajo, empuja el contador de reseed
    // -- todos los paneles cambian de golpe con el golpe de graves.
    float colorRate = mix(0.15, 2.2, uSpeed);
    float colorGs = floor(t * colorRate + uKick * 37.0);

    float h0 = audioHue(uHue, uMid * 0.10);
    int   baseIdx = int(mod(hash21(vec2(nodeHash, colorGs * 5.0 + 1.0)) * 6.0, 6.0));
    float baseHue = audioHue(paletteHue(baseIdx), 0.0) + h0;

    // D4: separacion de hue entre los dos extremos del degradado.
    float hueDelta = mix(0.0, 0.5, uD4)
                    * (hash21(vec2(nodeHash, colorGs * 5.0 + 2.0)) * 2.0 - 1.0);
    float hueB = baseHue + hueDelta;

    // D1: probabilidad de panel "casi blanco" (satura para el piso).
    float whiteProb = mix(0.05, 0.55, uD1);
    float isWhite = step(1.0 - whiteProb, hash21(vec2(nodeHash, colorGs * 5.0 + 9.0)));

    // D2: saturacion general.
    float sat = mix(0.15, 0.90, uD2) * (1.0 - isWhite * 0.82);
    float satB = sat * mix(0.75, 1.15, hash21(vec2(nodeHash, colorGs * 5.0 + 5.0)));
    float valB = mix(0.82, 1.0, hash21(vec2(nodeHash, colorGs * 5.0 + 6.0)));

    vec3 colA = hsv2rgb(vec3(fract(baseHue), sat, 1.0));
    vec3 colB = hsv2rgb(vec3(fract(hueB), satB, valB));

    // D3: angulo del degradado -- siempre vertical (D3=0) o cualquiera,
    // incluidos diagonales (D3=1).
    float angRandom = hash21(vec2(nodeHash, colorGs * 3.0 + 3.0)) * TAU;
    float angle = mix(PI * 0.5, angRandom, uD3);
    vec2  dir = vec2(cos(angle), sin(angle));
    float proj = clamp(dot(panelLocal - 0.5, dir) + 0.5, 0.0, 1.0);

    vec3 col = mix(colA, colB, proj);

    // Brillo de vidrio: una franja especular diagonal fija (no rota con
    // el reseed de color) que cruza cada panel en un angulo propio --
    // como la luz de una vidriera real reflejando en el vidrio, no solo
    // el degradado plano de tinta.
    float sheenAng = hash21(vec2(nodeHash, 777.0)) * PI;
    vec2  sheenDir = vec2(cos(sheenAng), sin(sheenAng));
    float sheenPos = dot(panelLocal - 0.5, sheenDir);
    float sheen = exp(-sheenPos * sheenPos * 14.0) * 0.16;
    col += vec3(1.0) * sheen;

    // D6: ganancia general, antes del brillo de audio.
    col *= 0.6 + uD6 * 0.7;

    // D5: costura fina entre paneles.
    vec2  edgeDist2 = min(pp - lo, hi - pp);
    float edgeDist = min(edgeDist2.x, edgeDist2.y);
    float aaEdge = max(fwidth(edgeDist), 1e-5);
    float seam = (1.0 - smoothstep(0.0, aaEdge * 1.5, edgeDist - 0.0015)) * uD5;
    col = mix(col, vec3(0.05), seam * 0.6);

    // PIANO: el panel mas cercano a la posicion que elige uKeypos
    // destella con un blanco propio -- geometria de COLOR encima, no
    // cambia el reseed de los demas, decae solo con uKeypulse.
    if (uKeypulse > 0.0015) {
        float guestSel = hash21(vec2(nodeHash, 999.0));
        float onGuest = 1.0 - smoothstep(0.0, 0.05, abs(guestSel - uKeypos));
        col += vec3(1.0) * onGuest * uKeypulse * (0.4 + uKeyvel * 0.6);
    }

    // Kick: flash breve, ademas del empuje de reseed de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
