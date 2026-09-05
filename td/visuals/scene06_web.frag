// ===============================================================
// SCENE 06 - RAYOS (LIGHTNING)
// Rayos electricos zigzagueantes que caen de arriba a abajo, con
// ramificaciones y parpadeo tipo tormenta. Reemplaza al "hairball" de
// lineas rectas que tenia esta escena antes.
// ===============================================================
//
// COMO FUNCIONA
//
// Cada rayo es una polilinea de 5-8 segmentos que va de arriba a abajo
// de la pantalla -- en cada segmento el siguiente punto se desplaza en X
// por un hash pseudo-aleatorio (una caminata aleatoria acotada), dando
// el zigzag tipico de un rayo real en vez de una curva suave. Ademas,
// 0-2 ramas se desprenden a mitad de camino con su propio angulo y menos
// segmentos -- misma tecnica, semilla distinta, arrancando en un punto
// aproximado del tronco. La distancia punto-segmento (formula estandar)
// alimenta un trazo nitido (edgeLine) + un halo ancho (exp) para el glow.
//
// El flicker (parpadeo tipo tormenta electrica) sale de un hash por rayo
// contra el tiempo CUANTIZADO -- los rayos estan "apagados" la mayor
// parte del tiempo y "prenden" de golpe en pasos discretos, no es un
// fade continuo. Kick ademas dispara SIEMPRE un rayo central extra,
// brillante, ademas de los que ya esten parpadeando solos.
//
// CONTROLES
//   Speed    velocidad del flicker (cuantos parpadeos de tormenta por
//            segundo)
//   Density  cuantos rayos pueden estar activos a la vez
//   Hue      tinte del nucleo (queda casi blanco-azulado a proposito,
//            saturacion baja)
//   Chaos    cuanto se inclina cada rayo de arriba a abajo (casi vertical
//            <-> bien diagonal)
//   Bass     brillo de lo ya claro (audioLift) + el zigzag tiembla un
//            poco mas fuerte con los graves (uBass ya suavizado, no
//            reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     un rayo extra, central y brillante, se dispara SIEMPRE en
//            el golpe (ademas del flicker normal de los demas)
//   High     vibracion micro del trazo (excepcion del contrato)
//
// @D1: grosor del trazo nitido
// @D2: cantidad de resplandor (glow) alrededor del rayo
// @D3: cuanto zigzaguea cada segmento (quiebres suaves <-> muy quebrado
//      y agresivo)
// @D4: cuantas ramas se desprenden de cada rayo (0 a 2)
// ===============================================================

float segDist(vec2 p, vec2 a, vec2 b)
{
    vec2 ab = b - a;
    vec2 ap = p - a;
    float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return length(ap - ab * h);
}

// Cadena de segmentos de topY a botY, con zigzag por hash en cada paso.
// baseX/endDx definen el desplazamiento horizontal TOTAL a lo largo del
// rayo (la tendencia general); zigzagAmt es el ruido fino encima de esa
// tendencia. Devuelve la distancia minima de 'p' a cualquier segmento.
float boltDist(vec2 p, vec2 seed, float topY, float botY, int segs,
               float zigzagAmt, float baseX, float endDx)
{
    float best = 1e5;
    vec2 prev = vec2(baseX, topY);
    for (int i = 1; i <= 8; i++) {
        if (i > segs) break;
        float fi = float(i);
        float frac = fi / float(segs);
        float y = mix(topY, botY, frac);
        float jitter = (hash21(seed + fi * 3.7) - 0.5) * 2.0;
        float x = baseX + endDx * frac + jitter * zigzagAmt;
        vec2 cur = vec2(x, y);
        best = min(best, segDist(p, prev, cur));
        prev = cur;
    }
    return best;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int   n = 2 + int(floor(uDensity * 5.99));
    // El grosor del rayo respira con los bajos -- uBass ya suavizado
    // (Fase 2), mismo patron que el perimetro de las metaballs.
    // Base bajada (0.7->0.5, tope 3.2->2.6): con tronco+rama cruzandose
    // por el zigzag aleatorio, un trazo de base ya grueso hacia que esas
    // zonas de cruce se leyeran como una maraña blanca solida.
    float lineW = (0.5 + uD1 * 2.1) * (1.0 + uBass * 0.3);
    float glowAmt = 0.12 + uD2 * 1.0;
    float zigzagAmt = 0.025 + uD3 * 0.24;
    int   nBranches = int(floor(uD4 * 2.99));   // 0 a 2 ramas

    float flickerRate = 1.2 + uSpeed * 4.5;

    vec3 col = vec3(0.0);
    float h = audioHue(uHue, uMid * 0.16);
    vec3 coreCol = hsv2rgb(vec3(fract(h + 0.55), 0.25, 1.0));  // blanco-azulado

    for (int i = 0; i < 6; i++) {
        if (i >= n) break;
        float fi = float(i);
        vec2 seed = vec2(fi * 11.3 + 4.0, fi * 7.1 + 2.0);

        // Flicker tipo tormenta: hash por rayo Y por paso de tiempo --
        // cambia a saltos discretos, no en fade suave.
        float step_t = floor(t * flickerRate + fi * 3.7);
        float flickerHash = hash21(seed + step_t * 1.7);
        if (flickerHash < 0.4) continue;

        float baseX = (hash21(seed) - 0.5) * 2.8;
        // Chaos: cuanto se inclina el rayo de arriba a abajo.
        float dirX = (hash21(seed + 5.0) - 0.5) * (0.25 + uChaos * 1.4);

        // Bass/High: el zigzag se sacude un poco mas con audio, ademas
        // del brillo de mas abajo -- ambos ya llegan suavizados.
        float zz = zigzagAmt * (1.0 + uBass * 0.5 + uHigh * 0.3);

        int segs = 5 + int(floor(hash21(seed + 9.0) * 3.99));
        float d = boltDist(p, seed, 1.15, -1.15, segs, zz, baseX, dirX);

        // Ramas: se desprenden a mitad de camino del tronco, con su
        // propio angulo y menos segmentos.
        for (int br = 0; br < 2; br++) {
            if (br >= nBranches) break;
            float fbr = float(br);
            vec2 bseed = seed + fbr * 31.0 + 100.0;
            float branchFrac = 0.30 + hash21(bseed + 20.0) * 0.35;
            float branchTopY = mix(1.15, -1.15, branchFrac);
            float branchBaseX = baseX + dirX * branchFrac;
            float branchEndDx = (hash21(bseed + 17.0) - 0.5) * 0.9;
            float dBranch = boltDist(p, bseed, branchTopY, branchTopY - 0.65,
                                     3, zz * 0.8, branchBaseX, branchEndDx);
            d = min(d, dBranch);
        }

        float core = edgeLine(d, lineW);
        float glow = exp(-d * d / (0.006 + glowAmt * 0.012)) * glowAmt;
        col += coreCol * (core + glow);
    }

    // Kick: un rayo extra, central y brillante, se dispara SIEMPRE en el
    // golpe -- ya llega con envolvente de golpe-y-caida (audio.py).
    if (uKick > 0.015) {
        // Zigzag mas moderado (1.5->1.0) y core mas fino (1.3->0.9): con
        // el zigzag amplio, los segmentos se cruzaban entre si en el
        // centro del rayo y esa maraña de lineas gruesas se leia como
        // un blob blanco solido en vez de un solo rayo brillante.
        vec2 seedK = vec2(63.0, 29.0);
        float dK = boltDist(p, seedK, 1.15, -1.15, 7, zigzagAmt * 1.0, 0.0, 0.0);
        float coreK = edgeLine(dK, lineW * 0.9);
        float glowK = exp(-dK * dK / 0.008);
        col += vec3(1.0) * (coreK + glowK * 0.6) * uKick * 0.9;
    }

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
