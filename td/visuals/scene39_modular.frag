// ===============================================================
// SCENE 39 - MODULAR
// Una pared de "pantallitas" independientes -- una grilla donde cada
// celda corre su PROPIO patron chico (solido, degradado, grilla de
// alambre, matriz de puntos, nube de ruido en bloques, o una mancha
// organica), muchas vacias (negras) de por medio -- como el panel de
// un sintetizador modular lleno de mini-pantallas. Cada tanto TODO se
// reordena de golpe: nuevos patrones, nuevos colores, en otras celdas.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. RESEED PERIODICO: mismo mecanismo que scene38_constelacion --
//    gs = floor(t / cicloTotal) cambia de golpe cada 'cicloTotal'
//    segundos (Speed), y ese numero entra en TODOS los hash de abajo.
//    Por eso el reordene es un corte instantaneo, no una transicion.
//
// 2. UNA CELDA, UN PATRON: no hay busqueda de vecinos como en
//    scene36/scene38 -- cada pixel pertenece a EXACTAMENTE una celda
//    (floor/fract directo), mucho mas barato. El hash de esa celda
//    (combinado con gs) decide todo: si esta vacia, que patron tiene,
//    que color, y los parametros internos de ese patron.
//
// 3. LOS 6 PATRONES (elegidos por hash, D2 inclina la mezcla hacia
//    simples o complejos): solido, degradado en un angulo al azar,
//    grilla de alambre (lineas finas, con o sin fondo tenue), matriz de
//    puntos (con su propia densidad de puntos por celda), nube de
//    ruido cuantizada (mismo truco de "pixelar antes de medir" que el
//    mapa de scene38), y mancha organica (fbm con un borde suave, mitad
//    de las veces como mancha de color sobre negro, mitad como agujero
//    negro sobre color -- las dos variantes se ven en el video).
//
// CONTROLES
//   Speed    cuanto dura cada ciclo antes de reordenar todo
//   Density  cuantas columnas tiene la grilla (pocas y grandes <->
//            muchas y chicas)
//   Hue      hue base de la paleta (7 tonos fijos, rotan juntos)
//   Chaos    desorden interno de los patrones que lo permiten (jitter
//            de los puntos, turbulencia del ruido/mancha)
//   Bass     brillo de lo ya claro (audioLift) -- las celdas vacias
//            (negras) no se ven afectadas, por construccion
//   Mid      tinte adicional (audioHue)
//   Kick     flash de toda la pared, ademas de encender la COLUMNA que
//            elige uKeypos con cada tecla (ver PIANO)
//   High     vibracion micro de la posicion interna de cada patron
//            (excepcion del contrato)
//
// @D1: fraccion de celdas vacias (pared casi llena <-> casi toda negra)
// @D2: mezcla de complejidad (patrones simples: solido/degradado <->
//      complejos: ruido/mancha)
// @D3: saturacion de la paleta (pastel/tenue <-> saturado a full)
// @D4: resolucion interna (grilla/puntos/ruido finos <-> gruesos)
// @D5: tamano de las manchas organicas
// @D6: brillo/resplandor general de las celdas con contenido
// ===============================================================

float paletteHue(int i) {
    if (i == 0) return 0.06;   // naranja
    if (i == 1) return 0.50;   // cian
    if (i == 2) return 0.33;   // verde
    if (i == 3) return 0.90;   // magenta
    if (i == 4) return 0.72;   // violeta
    if (i == 5) return 0.98;   // rojo
    return 0.14;                // amarillo
}

vec4 render(vec2 uv)
{
    float t = uTime;

    // --- RESEED PERIODICO ---
    float cycleLen = mix(14.0, 4.0, uSpeed);
    float gs = floor(t / cycleLen);

    // --- GRILLA (celdas cuadradas, igual que scene37/scene38) ---
    float cols = 4.0 + floor(uDensity * 8.0);
    vec2  uvAsp = vec2(uv.x * uAspect, uv.y);
    vec2  g = uvAsp * cols;
    vec2  id = floor(g);
    vec2  cellUV = fract(g);

    // uHigh: vibracion micro de la posicion interna -- unica excepcion
    // del contrato, amplitud pequena, ya suavizado.
    cellUV += uHigh * 0.006 * vec2(sin(t * 11.0 + id.x), cos(t * 9.0 + id.y));
    vec2 cellC = cellUV - 0.5;

    float h0 = audioHue(uHue, uMid * 0.10);
    float seedBase = dot(id, vec2(17.0, 31.0)) + gs * 53.0;

    // --- ELECCION DE PATRON ---
    // D1: fraccion de celdas vacias.
    float emptyProb = mix(0.12, 0.62, uD1);
    float typeH = hash21(id + gs * 11.0 + 1.0);
    // Panel real, no vacio: las celdas apagadas quedan con un gris de
    // chasis muy oscuro en vez de negro puro -- se leen como pantallitas
    // apagadas dentro de un panel fisico, no como huecos.
    vec3 col = hsv2rgb(vec3(fract(h0 + 0.6), 0.2, 0.035));

    if (typeH >= emptyProb) {
        // D2: sesga la mezcla hacia patrones simples (indice bajo) o
        // complejos (indice alto).
        float sub = hash21(id + gs * 7.0 + 60.0);
        float biased = pow(sub, mix(2.0, 0.4, uD2));
        int   ptype = 1 + int(floor(biased * 5.999));

        int   colorIdx = int(mod(hash21(id + gs * 3.0 + 2.0) * 7.0, 7.0));
        float hue = audioHue(paletteHue(colorIdx), 0.0) + h0;
        // D3: saturacion de la paleta.
        float sat = mix(0.35, 0.95, uD3);
        vec3  baseCol = hsv2rgb(vec3(fract(hue), sat, 1.0));

        // D4: resolucion interna comun a grilla/puntos/ruido.
        float detail = mix(4.0, 22.0, uD4);

        if (ptype == 1) {
            // SOLIDO
            col = baseCol;

        } else if (ptype == 2) {
            // DEGRADADO en un angulo al azar por celda.
            float ang = hash21(id + gs * 13.0 + 4.0) * TAU;
            float proj = clamp(dot(cellC, vec2(cos(ang), sin(ang))) + 0.5, 0.0, 1.0);
            int   colorIdx2 = int(mod(hash21(id + gs * 3.0 + 5.0) * 7.0, 7.0));
            vec3  baseCol2 = hsv2rgb(vec3(fract(audioHue(paletteHue(colorIdx2), 0.0) + h0), sat, 1.0));
            col = mix(baseCol, baseCol2, proj);

        } else if (ptype == 3) {
            // GRILLA DE ALAMBRE -- fondo tenue o negro, elegido por hash.
            vec2  gg = cellUV * detail;
            vec2  gf = fract(gg) - 0.5;
            vec2  edgeDist = 0.5 - abs(gf);
            float lineD = min(edgeDist.x, edgeDist.y);
            float aa = max(fwidth(lineD), 1e-5);
            float lineMask = 1.0 - smoothstep(0.0, aa * 1.5, lineD);
            float bgOn = step(0.5, hash21(id + gs * 9.0 + 6.0));
            vec3  bg = baseCol * 0.12 * bgOn;
            col = mix(bg, baseCol, lineMask);

        } else if (ptype == 4) {
            // MATRIZ DE PUNTOS -- densidad propia por celda.
            vec2  sg = cellUV * detail;
            vec2  sid = floor(sg);
            vec2  sf = fract(sg) - 0.5;
            // Chaos: jitter de la posicion de cada punto dentro de su
            // sub-celda -- prolijo en 0, desparramado en 1.
            sf -= (hash22(sid + id * 3.0) - 0.5) * uChaos * 0.5;
            float dotProb = mix(0.15, 0.75, hash21(id + gs * 5.0 + 7.0));
            float has = step(hash21(sid + id * 13.0 + gs * 4.0), dotProb);
            float dDot = length(sf) - 0.30;
            float aaDot = max(fwidth(dDot), 1e-4);
            float dotMask = (1.0 - smoothstep(0.0, aaDot * 1.5, dDot)) * has;
            col = baseCol * dotMask;

        } else if (ptype == 5) {
            // NUBE DE RUIDO -- se cuantiza ANTES de medir el fbm, mismo
            // truco que el mapa en bloques de scene38 (da el look de
            // nube "de pixeles", no una nube suave).
            float pxStep = 1.0 / detail;
            vec2  pq = (floor(cellUV / pxStep) + 0.5) * pxStep;
            float n = fbm(pq * 3.0 + id * 9.0 + gs * 4.0, 3, 0.5 + uChaos * 0.25);
            float cov = step(0.5, n);
            col = baseCol * cov;

        } else {
            // MANCHA ORGANICA -- mitad de las veces mancha de color
            // sobre negro, mitad agujero negro sobre color (las dos
            // variantes salen en el video de referencia).
            float n = fbm(cellUV * 3.0 + id * 9.0 + gs * 4.0, 4, 0.5 + uChaos * 0.2);
            float blobSize = mix(0.30, 0.68, uD5);
            float aaBlob = max(fwidth(n), 1e-4) * 2.0;
            float cov = smoothstep(blobSize - aaBlob, blobSize + aaBlob, n);
            float invert = step(0.5, hash21(id + gs * 15.0 + 8.0));
            col = baseCol * mix(cov, 1.0 - cov, invert);
        }

        // D6: brillo/resplandor general de las celdas con contenido.
        col *= 0.55 + uD6 * 0.65;
    }

    // PIANO: cada tecla enciende la COLUMNA completa que elige uKeypos
    // (como un secuenciador modular disparando una columna de pasos) --
    // geometria de COLOR encima, no reordena nada, y uKeypulse decae
    // solo.
    if (uKeypulse > 0.0015) {
        float targetCol = floor(mix(0.0, cols - 1.0, uKeypos) + 0.5);
        float onCol = 1.0 - smoothstep(0.0, 0.6, abs(id.x - targetCol));
        col += vec3(1.0) * onCol * uKeypulse * (0.35 + uKeyvel * 0.5);
    }

    // Kick: flash de toda la pared.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Las celdas "apagadas" (chasis casi
    // negro) apenas se ven afectadas -- audioLift multiplica luminancia
    // existente, y la de ese gris es minuscula por construccion.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
