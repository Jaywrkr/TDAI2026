// ===============================================================
// SCENE 50 - CORTES
// El mismo vitral tipo Mondrian de scene40_paneles (particion binaria
// fija, colores que reordenan a saltos) pero cada panel ahora muestra
// uno de 4 ACABADOS distintos en vez de solo un degradado: color
// solido, una grilla con puntos en los cruces, un degradado con grano
// visible (textura de papel/ruido), o rayas verticales que van
// engrosando de un lado al otro -- como distintos cortes/texturas de
// un mismo material.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. PARTICION BSP: identica a scene40_paneles (ver ese archivo para
//    el detalle) -- fija, solo depende de Density/Chaos.
//
// 2. RESEED DE COLOR Y ACABADO: colorGs = floor(t*velocidad) +
//    empujon de uKick, igual que scene40 -- todos los paneles
//    reordenan color Y ACABADO juntos, a saltos.
//
// 3. LOS 4 ACABADOS (elegidos por hash de nodeHash+colorGs, cada
//    panel SIEMPRE tiene uno, nunca queda "vacio"):
//    - SOLIDO: un color plano.
//    - GRILLA: lineas finas del color del panel sobre fondo oscuro,
//      con un punto chico en cada cruce (mismo look que una hoja
//      cuadriculada con marcas).
//    - GRANO: un degradado de dos colores con ruido animado encima --
//      la textura de papel/aerosol que se ve en el video.
//    - RAYAS: bandas verticales que van de finas y juntas a un lado,
//      a anchas y separadas al otro (el ancho de cada banda escala
//      con su posicion en el panel).
//
// CONTROLES
//   Speed    velocidad a la que los paneles reordenan color y acabado
//   Density  profundidad de la particion (pocos paneles grandes <->
//            muchos chicos)
//   Hue      hue base de la paleta
//   Chaos    irregularidad de los cortes
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, ADELANTA el reseed -- todos los
//            paneles cambian de golpe con el golpe de graves
//   High     vibracion micro del grano (excepcion del contrato)
//
// @D1: frecuencia de la grilla (panel GRILLA)
// @D2: tamano de los puntos en los cruces (panel GRILLA)
// @D3: cantidad de grano (panel GRANO)
// @D4: frecuencia base y variacion de ancho de las rayas (panel RAYAS)
// @D5: saturacion general de la paleta
// @D6: ganancia general antes del brillo de audio
// ===============================================================

float paletteHue2(int i) {
    if (i == 0) return 0.98;   // rojo
    if (i == 1) return 0.90;   // magenta
    if (i == 2) return 0.06;   // naranja
    return 0.64;                 // azul oscuro
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  pp = uv;

    // --- PARTICION BSP (identica a scene40_paneles) ---
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

    float colorRate = mix(0.10, 1.8, uSpeed);
    float colorGs = floor(t * colorRate + uKick * 37.0);

    float h0 = audioHue(uHue, uMid * 0.10);
    float sat = mix(0.35, 0.90, uD5);
    int   baseIdx = int(mod(hash21(vec2(nodeHash, colorGs * 5.0 + 1.0)) * 4.0, 4.0));
    float baseHue = fract(audioHue(paletteHue2(baseIdx), 0.0) + h0);
    // Value bajado (0.92 -> 0.5): pedido explicito de que la escena sea
    // mucho mas oscura.
    vec3  panelCol = hsv2rgb(vec3(baseHue, sat, 0.5));

    int   finish = int(mod(hash21(vec2(nodeHash, colorGs * 7.0 + 20.0)) * 3.999, 4.0));
    vec3  col;

    if (finish == 0) {
        // SOLIDO.
        col = panelCol;

    } else if (finish == 1) {
        // GRILLA con puntos en los cruces.
        float gridFreq = mix(6.0, 24.0, uD1);
        vec2  gg = panelLocal * gridFreq;
        vec2  gf = fract(gg) - 0.5;
        vec2  edgeDist = 0.5 - abs(gf);
        float gridLine = edgeLine(min(edgeDist.x, edgeDist.y), 1.6);
        float dotR = mix(0.06, 0.22, uD2);
        float dotMask = 1.0 - smoothstep(dotR, dotR + 0.05, length(gf));
        vec3  bg = panelCol * 0.35;
        col = mix(bg, panelCol, max(gridLine, dotMask));

    } else if (finish == 2) {
        // GRANO: degradado de dos colores con ruido animado.
        int   idxB = int(mod(hash21(vec2(nodeHash, colorGs * 7.0 + 21.0)) * 4.0, 4.0));
        vec3  colB = hsv2rgb(vec3(fract(audioHue(paletteHue2(idxB), 0.0) + h0), sat, 0.55));
        vec3  grad = mix(panelCol, colB, panelLocal.y);
        // uHigh: vibracion micro del grano -- unica excepcion del
        // contrato, amplitud pequena.
        float flick = floor(t * (3.0 + uSpeed * 8.0));
        float grain = hash21(floor(pp * uResW * 0.6) + flick * 9.0 + uHigh * 3.0) - 0.5;
        col = grad + grain * (0.08 + uD3 * 0.22);

    } else {
        // RAYAS que engrosan de un lado al otro.
        float baseFreq = mix(8.0, 30.0, uD4);
        float growth = mix(0.3, 3.0, uD4);
        float freq = baseFreq / (1.0 + panelLocal.x * growth);
        float stripe = mod(floor(panelLocal.x * freq), 2.0);
        vec3  bg2 = vec3(0.03, 0.03, 0.06);
        col = mix(bg2, panelCol, stripe);
    }

    // D6: ganancia general. Rango bajado (0.6/1.3 -> 0.22/0.55): pedido
    // explicito de que la escena sea mucho mas oscura.
    col *= 0.22 + uD6 * 0.33;

    // PIANO: el panel mas cercano a uKeypos destella blanco.
    if (uKeypulse > 0.0015) {
        float guestSel = hash21(vec2(nodeHash, 999.0));
        float onGuest = 1.0 - smoothstep(0.0, 0.05, abs(guestSel - uKeypos));
        col += vec3(1.0) * onGuest * uKeypulse * (0.4 + uKeyvel * 0.6);
    }

    // Kick: flash breve, ademas del empuje de reseed de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    return vec4(col, 1.0);
}
