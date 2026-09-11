// ===============================================================
// SCENE 43 - TOTEM
// Un panel enmarcado, simetrico izquierda/derecha, dividido en filas y
// columnas -- como un totem tallado -- donde CADA celda muestra un
// patron completo (no un color liso): a cuadros, rayas, chevron,
// cuadrados concentricos, matriz de puntos o nube de ruido. Un "ojo"
// fijo (rectangulos anidados) queda siempre en el centro. Cada tanto
// el panel entero se reordena de golpe. Afuera del marco, un fondo de
// manchas en bloques.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. SIMETRIA: todo el layout de columnas se calcula sobre abs(x) --
//    nunca sobre x -- asi el lado derecho es automaticamente el
//    espejo del izquierdo, sin duplicar nada a mano.
//
// 2. FILAS Y COLUMNAS: las filas dividen el panel entero en bandas
//    horizontales (BSP de 1 eje, igual que scene40_paneles). DENTRO de
//    cada fila, las columnas dividen la MITAD del ancho (abs(x)) en
//    otro BSP de 1 eje -- cada fila puede tener su propia cantidad de
//    columnas.
//
// 3. PATRON POR CELDA: el hash de la celda (fila+columna+reseed)
//    elige uno de 7 patrones (cuadros, rayas horizontales, rayas
//    verticales, chevron diagonal, cuadrados concentricos, puntos,
//    nube de ruido en bloques) y dos colores de una paleta chica.
//    Mismo espiritu que scene39_modular, pero aca CADA celda tiene
//    patron (nunca solido ni vacio) para el look de "tallado".
//
// 4. OJO CENTRAL: rectangulos anidados fijos, siempre en el mismo
//    lugar -- la unica parte que NUNCA se reordena, la identidad
//    visual del totem.
//
// 5. RESEED: igual que scene38/39/40/41 -- gs = floor(t/cicloTotal)
//    entra en todos los hash del panel (fondo, filas, columnas,
//    patrones), asi el reordene es un corte instantaneo. Kick lo
//    adelanta.
//
// CONTROLES
//   Speed    cuanto dura cada ciclo antes de reordenar el panel
//   Density  escala del panel (chico <-> ocupa casi toda la pantalla)
//   Hue      hue base de la paleta (rota junto con todo)
//   Chaos    irregularidad de las filas/columnas (parejo tipo grilla
//            <-> anchos bien mezclados)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash, ademas de adelantar el reseed del panel completo
//   High     no usado directo (reservado) -- el panel es
//            deliberadamente RIGIDO/tallado, temblor aca rompe la
//            lectura de "totem"
//
// @D1: cuantas filas tiene el panel
// @D2: cuantos niveles de columnas por fila (pocas y anchas <-> muchas
//      y finas)
// @D3: frecuencia de los patrones dentro de cada celda
// @D4: cuanta mancha tiene el fondo exterior
// @D5: tamano del ojo central
// @D6: contraste/saturacion general de la paleta
// ===============================================================

float patternHue(int i) {
    if (i == 0) return 0.98;   // rojo
    if (i == 1) return 0.33;   // verde
    if (i == 2) return 0.68;   // azul/violeta
    if (i == 3) return 0.80;   // purpura
    return 0.92;                 // magenta
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);
    float sat = mix(0.55, 0.95, uD6);

    float cycleLen = mix(9.0, 3.0, uSpeed);
    float gs = floor(t * cycleLen + uKick * 23.0);

    // --- FONDO EXTERIOR: manchas en bloques ---
    float pxStep = mix(0.09, 0.02, uD4);
    vec2  pq = (floor(p / pxStep) + 0.5) * pxStep;
    float bgN = fbm(pq * 2.0 + 5.0, 3);
    float bgBlot = step(0.62 - uD4 * 0.18, bgN);
    vec3  bgA = hsv2rgb(vec3(fract(h0 + 0.68), sat, 0.85));   // azul
    vec3  bgB = hsv2rgb(vec3(fract(h0 + 0.98), sat, 0.85));   // rojo
    vec3  col = mix(bgA, bgB, bgBlot);

    // --- PANEL ENMARCADO ---
    float panelScale = mix(1.35, 0.55, uDensity);
    vec2  panelHalf = vec2(0.82, 0.42) * panelScale;
    vec2  frameDist = panelHalf - abs(p);
    float inPanel = step(0.0, min(frameDist.x, frameDist.y));

    if (inPanel > 0.5) {
        // Coordenada normalizada dentro del panel: x en [-1,1]
        // (espejado via abs mas abajo), y en [0,1] de arriba a abajo.
        vec2 pn = p / panelHalf;
        float py = (pn.y + 1.0) * 0.5;
        float pxAbs = abs(pn.x);

        float splitVar = 0.08 + uChaos * 0.30;

        // FILAS: BSP de 1 eje sobre py (global, no espejado).
        int   rowDepth = 1 + int(floor(uD1 * 2.99));
        float rLo = 0.0, rHi = 1.0;
        float rowHash = 3.0;
        for (int i = 0; i < 3; i++) {
            if (i >= rowDepth) break;
            float rnd = hash21(vec2(rowHash, gs * 11.0 + float(i) * 7.0 + 1.0));
            float split = mix(0.5 - splitVar, 0.5 + splitVar, rnd);
            float mid = mix(rLo, rHi, split);
            if (py < mid) { rHi = mid; rowHash = rowHash * 2.0 + 1.0; }
            else           { rLo = mid; rowHash = rowHash * 2.0 + 2.0; }
        }
        float rowLocal = (py - rLo) / max(rHi - rLo, 1e-4);

        // COLUMNAS: BSP de 1 eje sobre pxAbs (media pantalla), propio
        // de esta fila (rowHash entra en el hash) -- asi cada fila
        // puede tener su propia cantidad de columnas.
        int   colDepth = 1 + int(floor(uD2 * 2.99));
        float cLo = 0.0, cHi = 1.0;
        float colHash = rowHash * 7.0 + 5.0;
        for (int i = 0; i < 3; i++) {
            if (i >= colDepth) break;
            float rnd = hash21(vec2(colHash, gs * 13.0 + float(i) * 5.0 + 2.0));
            float split = mix(0.5 - splitVar, 0.5 + splitVar, rnd);
            float mid = mix(cLo, cHi, split);
            if (pxAbs < mid) { cHi = mid; colHash = colHash * 2.0 + 1.0; }
            else              { cLo = mid; colHash = colHash * 2.0 + 2.0; }
        }
        float colLocal = (pxAbs - cLo) / max(cHi - cLo, 1e-4);

        vec2 cellUV = vec2(colLocal, rowLocal);
        float cellId = colHash;

        // --- PATRON DE LA CELDA ---
        int   colorIdxA = int(mod(hash21(vec2(cellId, gs * 3.0 + 9.0)) * 5.0, 5.0));
        int   colorIdxB = int(mod(hash21(vec2(cellId, gs * 3.0 + 10.0)) * 5.0, 5.0));
        vec3  colA = hsv2rgb(vec3(fract(audioHue(patternHue(colorIdxA), 0.0) + h0), sat, 1.0));
        vec3  colB = hsv2rgb(vec3(fract(audioHue(patternHue(colorIdxB), 0.0) + h0), sat * 0.4, 0.12));

        float freq = mix(2.5, 11.0, uD3);
        int   ptype = int(floor(hash21(vec2(cellId, gs * 5.0 + 20.0)) * 6.999));
        vec2  fc = cellUV * freq;

        float mixV;
        if (ptype == 0) {          // cuadros
            mixV = mod(floor(fc.x) + floor(fc.y), 2.0);
        } else if (ptype == 1) {   // rayas horizontales
            mixV = mod(floor(fc.y), 2.0);
        } else if (ptype == 2) {   // rayas verticales
            mixV = mod(floor(fc.x), 2.0);
        } else if (ptype == 3) {   // chevron diagonal
            mixV = mod(floor(abs(cellUV.x - 0.5) * freq * 1.4 + fc.y), 2.0);
        } else if (ptype == 4) {   // cuadrados concentricos
            vec2  cc = (cellUV - 0.5) * freq * 0.6;
            mixV = mod(floor(max(abs(cc.x), abs(cc.y))), 2.0);
        } else if (ptype == 5) {   // matriz de puntos
            vec2  dg = fract(fc) - 0.5;
            mixV = step(length(dg), 0.30);
        } else {                    // nube de ruido en bloques
            vec2  nq = (floor(cellUV * freq) + 0.5) / freq;
            mixV = step(0.5, fbm(nq * 3.0 + cellId, 3));
        }

        col = mix(colA, colB, mixV);

        // Relieve tallado: cada celda se ilumina un poco cerca de su
        // centro y se oscurece hacia sus bordes -- el bisel que separa
        // "un patron plano" de "una talla real con profundidad".
        vec2  cCenter = cellUV - 0.5;
        float carve = 1.0 - dot(cCenter, cCenter) * 1.4;
        col *= mix(0.78, 1.15, clamp(carve, 0.0, 1.0));
    }

    // --- MARCO (linea oscura del borde del panel) ---
    float frameLineD = min(abs(frameDist.x), abs(frameDist.y));
    float frameAA = max(fwidth(frameLineD), 1e-4) * 2.0;
    float onFrameEdge = 1.0 - smoothstep(0.0, frameAA, abs(min(frameDist.x, frameDist.y)) - 0.02 * panelScale);
    float nearFrame = step(-0.05 * panelScale, min(frameDist.x, frameDist.y))
                     * step(min(frameDist.x, frameDist.y), 0.05 * panelScale);
    col = mix(col, vec3(0.03, 0.03, 0.10), onFrameEdge * nearFrame);

    // --- OJO CENTRAL (rectangulos anidados, SIEMPRE en el mismo lugar) ---
    float eyeSize = mix(0.05, 0.16, uD5) * panelScale;
    vec2  eyeC = p / max(eyeSize, 1e-4);
    float eyeD = max(abs(eyeC.x) * 1.7, abs(eyeC.y));
    if (eyeD < 1.15) {
        float ring = mod(floor(eyeD * 4.0), 2.0);
        vec3  eyeA = hsv2rgb(vec3(fract(h0 + 0.98), sat, 1.0));
        vec3  eyeB = hsv2rgb(vec3(fract(h0 + 0.68), sat, 0.15));
        col = mix(eyeA, eyeB, ring);
    }
    // Bloom ancho: el ojo central derrama un halo tenue sobre el panel a
    // su alrededor, como si tuviera luz propia -- la identidad visual
    // del totem se nota incluso fuera de su propio marco.
    col += hsv2rgb(vec3(fract(h0 + 0.98), sat, 1.0)) * exp(-eyeD * eyeD * 2.0) * 0.10;

    // PIANO: la celda de columna mas cercana a uKeypos destella blanco
    // -- color encima, no reordena nada.
    if (uKeypulse > 0.0015) {
        float guestX = mix(-panelHalf.x, panelHalf.x, uKeypos);
        float dGuest = abs(p.x - guestX);
        float onGuest = (1.0 - smoothstep(0.0, 0.08, dGuest)) * step(abs(p.y), panelHalf.y);
        col += vec3(1.0) * onGuest * uKeypulse * (0.5 + uKeyvel * 0.6);
    }

    // Kick: flash breve, ademas del adelanto de reseed de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    return vec4(col, 1.0);
}
