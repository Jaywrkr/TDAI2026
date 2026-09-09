// ===============================================================
// SCENE 06 - RAYOS (LIGHTNING)
// Rayos electricos zigzagueantes que caen de arriba a abajo, con
// ramificaciones y parpadeo tipo tormenta.
// ===============================================================
//
// COMO FUNCIONA
//
// Cada rayo es una polilinea de 6-10 segmentos que va de arriba a abajo
// de la pantalla -- en cada segmento el siguiente punto se desplaza en X
// por un hash pseudo-aleatorio (una caminata aleatoria acotada), dando
// el zigzag tipico de un rayo real en vez de una curva suave. 0-2 ramas
// se desprenden a mitad de camino con su propio angulo y menos
// segmentos.
//
// TRES cosas separan esto de "una linea con blur encima" (que es lo que
// se ve como un rayo de mentira):
//
//   1. AHUSADO (taper). Un rayo real es mas grueso cerca de la nube y
//      se afina hacia la punta -- boltDist() devuelve, ademas de la
//      distancia, EN QUE FRACCION del recorrido cayo el segmento mas
//      cercano (0 = arriba, 1 = abajo), y esa fraccion escala el ancho.
//      Sin esto el trazo tiene el mismo grosor de punta a punta y se lee
//      como un cable, no como una descarga.
//   2. TRES CAPAS DE LUZ, no una. boltLayers() separa nucleo (fino,
//      case blanco, el canal de plasma real) de halo medio (azul-violeta,
//      la luz que dispersa el aire cerca del canal) de atmosfera ancha
//      (violeta tenue, el resplandor que se ve a metros de distancia).
//      Una sola linea+glow generico se ve como neon; tres capas con
//      colores distintos se ve como una descarga real.
//   3. ZIGZAG SIEMPRE PRESENTE. El piso de zigzagAmt subio bastante: un
//      rayo real NUNCA es una linea casi recta, D3 en 0 sigue siendo
//      claramente quebrado, solo que D3 en 1 es mucho mas agresivo.
//
// El flicker (parpadeo tipo tormenta) sale de un hash por rayo contra el
// tiempo CUANTIZADO -- los rayos estan "apagados" la mayor parte del
// tiempo y "prenden" de golpe en pasos discretos. Encima de eso, un rayo
// ENCENDIDO tiene un parpadeo rapido de amplitud (buzz) -- la
// inestabilidad de alto voltaje real, no un brillo parejo mientras dura.
// Kick ademas dispara SIEMPRE un rayo central extra, brillante, ademas
// de los que ya esten parpadeando solos.
//
// CONTROLES
//   Speed    velocidad del flicker (cuantos parpadeos de tormenta por
//            segundo)
//   Density  cuantos rayos pueden estar activos a la vez
//   Hue      tinte del nucleo (queda casi blanco-azulado a proposito,
//            saturacion baja) -- tambien corre el halo medio y la
//            atmosfera, que quedan siempre un poco mas saturados
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
// @D1: grosor MAXIMO del trazo -- cerca del origen; se afina solo hacia
//      la punta sin importar el valor de esta perilla
// @D2: cantidad de resplandor (halo medio + atmosfera) alrededor del rayo
// @D3: cuanto zigzaguea cada segmento (ya quebrado en 0 <-> muy agresivo
//      en 1)
// @D4: cuantas ramas se desprenden de cada rayo (0 a 2)
// @D5: duty cycle del flicker -- que tan seguido esta prendido cada rayo
//      (raro <-> casi siempre encendido)
// @D6: tinte del nucleo -- de blanco-azulado frio a un color mas saturado
//      hacia Hue
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
// tendencia. Devuelve (distancia minima de 'p' a cualquier segmento,
// fraccion del recorrido donde cayo ese segmento -- 0 arriba, 1 abajo).
// La fraccion es lo que alimenta el ahusado en boltTaper().
vec2 boltDist(vec2 p, vec2 seed, float topY, float botY, int segs,
              float zigzagAmt, float baseX, float endDx)
{
    float best = 1e5;
    float bestFrac = 0.0;
    vec2 prev = vec2(baseX, topY);
    for (int i = 1; i <= 10; i++) {
        if (i > segs) break;
        float fi = float(i);
        float frac = fi / float(segs);
        float y = mix(topY, botY, frac);
        float jitter = (hash21(seed + fi * 3.7) - 0.5) * 2.0;
        float x = baseX + endDx * frac + jitter * zigzagAmt;
        vec2 cur = vec2(x, y);
        float d = segDist(p, prev, cur);
        if (d < best) { best = d; bestFrac = frac; }
        prev = cur;
    }
    return vec2(best, bestFrac);
}

// Mas grueso cerca del origen (topY, la "nube"), se afina hacia la punta.
// Piso subido otra vez (0.55 -> 0.72): seguia leyendose fino por
// defecto -- ahora incluso la punta mas afinada queda notoriamente
// gruesa.
float boltTaper(float frac)
{
    return mix(1.5, 0.72, clamp(frac, 0.0, 1.0));
}

// Nucleo fino + halo medio + atmosfera ancha, a partir de la MISMA
// distancia con signo. SOLO el nucleo usa 'coreW' (el ancho ya
// ahusado) -- el medio y la atmosfera usan un ancho FIJO, indpendiente
// del ahusado. OJO: 'coreW' viene de la FRACCION DEL SEGMENTO MAS
// CERCANO (bestFrac de boltDist), que cambia a saltos discretos justo
// en la mediatriz entre dos segmentos vecinos -- si el glow ancho
// tambien dependiera de ese ancho, esos saltos se ven como cuñas
// oscuras en abanico sobre el halo (se probo, quedaba mal). El nucleo
// no se nota tanto porque edgeLine ya suaviza con fwidth(); el glow
// ancho directamente no toca 'coreW'.
vec3 boltLayers(float d, float coreW, float glowAmt)
{
    float core  = edgeLine(d, coreW);
    float mid   = exp(-d * d / (0.0035 + glowAmt * 0.011)) * (0.5 + glowAmt * 0.75);
    float atmos = exp(-d * d / (0.05 + glowAmt * 0.16)) * (0.07 + glowAmt * 0.20);
    return vec3(core, mid, atmos);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int   n = 2 + int(floor(uDensity * 5.99));
    // El grosor del rayo respira con los bajos -- uBass ya suavizado
    // (Fase 2), mismo patron que el perimetro de las metaballs.
    // Piso subido otra vez (1.5 -> 2.3): "por default ya deben estar mas
    // gruesos" -- seguia leyendose fino.
    float lineW = (2.3 + uD1 * 2.2) * (1.0 + uBass * 0.3);
    float glowAmt = 0.30 + uD2 * 0.9;
    // Piso subido (0.025 -> 0.09): un rayo real NUNCA se ve casi recto.
    // D3 en 0 sigue bien quebrado; D3 en 1 llega a agresivo/catico.
    float zigzagAmt = 0.09 + uD3 * 0.30;
    int   nBranches = int(floor(uD4 * 2.99));   // 0 a 2 ramas

    float flickerRate = 1.2 + uSpeed * 4.5;

    vec3 col = vec3(0.0);
    float h = audioHue(uHue, uMid * 0.16);
    vec3 coreCol  = hsv2rgb(vec3(fract(h + mix(0.55, 0.0, uD6)), mix(0.25, 0.75, uD6), 1.0));
    vec3 midCol   = hsv2rgb(vec3(fract(h + 0.62), 0.55, 1.0));   // azul-violeta
    vec3 atmosCol = hsv2rgb(vec3(fract(h + 0.80), 0.40, 1.0));   // violeta tenue

    for (int i = 0; i < 6; i++) {
        if (i >= n) break;
        float fi = float(i);
        vec2 seed = vec2(fi * 11.3 + 4.0, fi * 7.1 + 2.0);

        // Flicker tipo tormenta: hash por rayo Y por paso de tiempo --
        // cambia a saltos discretos, no en fade suave.
        float step_t = floor(t * flickerRate + fi * 3.7);
        float flickerHash = hash21(seed + step_t * 1.7);
        // Piso subido (0.15 -> 0.22): en D5=0 quedaban huecos largos con
        // NINGUN rayo prendido -- el re-roll es varias veces por
        // segundo asi que un hueco individual sigue siendo breve, pero
        // menos frecuente en total se lee mejor que "se rompio".
        float onChance = 0.22 + uD5 * 0.55;
        if (flickerHash < 1.0 - onChance) continue;

        // Buzz: parpadeo rapido de amplitud MIENTRAS el rayo esta
        // encendido -- inestabilidad de alto voltaje real, no un brillo
        // parejo. Fase propia por rayo (seed) para que no titilen todos
        // en sincronia.
        float buzz = 0.72 + 0.28 * sin(t * 70.0 + seed.x * 17.0 + seed.y * 9.0);

        float baseX = (hash21(seed) - 0.5) * 2.8;
        // Chaos: cuanto se inclina el rayo de arriba a abajo.
        float dirX = (hash21(seed + 5.0) - 0.5) * (0.25 + uChaos * 1.4);

        // Bass/High: el zigzag se sacude un poco mas con audio, ademas
        // del brillo de mas abajo -- ambos ya llegan suavizados.
        float zz = zigzagAmt * (1.0 + uBass * 0.5 + uHigh * 0.3);

        int segs = 6 + int(floor(hash21(seed + 9.0) * 4.99));
        vec2 db = boltDist(p, seed, 1.15, -1.15, segs, zz, baseX, dirX);
        float d = db.x;
        float w = lineW * boltTaper(db.y);

        // Ramas: se desprenden a mitad de camino del tronco, con su
        // propio angulo, menos segmentos y un ancho menor (mas fino que
        // el tronco, como una rama real) que tambien se afina hacia su
        // propia punta.
        for (int br = 0; br < 2; br++) {
            if (br >= nBranches) break;
            float fbr = float(br);
            vec2 bseed = seed + fbr * 31.0 + 100.0;
            float branchFrac = 0.30 + hash21(bseed + 20.0) * 0.35;
            float branchTopY = mix(1.15, -1.15, branchFrac);
            float branchBaseX = baseX + dirX * branchFrac;
            float branchEndDx = (hash21(bseed + 17.0) - 0.5) * 0.9;
            vec2 dbBranch = boltDist(p, bseed, branchTopY, branchTopY - 0.65,
                                     3, zz * 0.8, branchBaseX, branchEndDx);
            if (dbBranch.x < d) {
                d = dbBranch.x;
                w = lineW * 0.52 * boltTaper(dbBranch.y);
            }
        }

        vec3 layers = boltLayers(d, w, glowAmt) * buzz;
        col += coreCol * layers.x + midCol * layers.y + atmosCol * layers.z;
    }

    // Kick: un rayo extra, central y brillante, se dispara SIEMPRE en el
    // golpe -- ya llega con envolvente de golpe-y-caida (audio.py).
    if (uKick > 0.015) {
        vec2 seedK = vec2(63.0, 29.0);
        vec2 dbK = boltDist(p, seedK, 1.15, -1.15, 8, zigzagAmt, 0.0, 0.0);
        float wK = lineW * 0.9 * boltTaper(dbK.y);
        vec3 layersK = boltLayers(dbK.x, wK, glowAmt * 1.3);
        col += (vec3(1.0) * layersK.x + midCol * layersK.y + atmosCol * layersK.z) * uKick * 1.1;
    }

    // PIANO: un rayo extra, apuntando a la X que elige uKeypos, cae con
    // cada tecla -- reusa boltDist como el rayo del kick, pero con 4
    // ramas (el doble del maximo normal de 2) para que se lea como un
    // impacto mucho mas grande, mas un flash ambiental breve que ilumina
    // TODA la escena un instante, como un relampago de verdad iluminando
    // el cielo entero, no solo el trazo del rayo. uKeypulse decae solo,
    // uKeyvel escala el brillo.
    if (uKeypulse > 0.0015) {
        vec2 seedP = vec2(11.0, 91.0);
        float baseXP = (uKeypos - 0.5) * 2.6;
        vec2 dbP = boltDist(p, seedP, 1.15, -1.15, 8, zigzagAmt, baseXP, 0.0);
        float dP = dbP.x;
        float wP = lineW * 0.95 * boltTaper(dbP.y);
        for (int brP = 0; brP < 4; brP++) {
            float fbrP = float(brP);
            vec2 bseedP = seedP + fbrP * 31.0 + 100.0;
            float branchFracP = 0.25 + hash21(bseedP + 20.0) * 0.4;
            float branchTopYP = mix(1.15, -1.15, branchFracP);
            float branchBaseXP = baseXP + hash21(bseedP + 3.0) * 0.6 - 0.3;
            float branchEndDxP = (hash21(bseedP + 17.0) - 0.5) * 1.1;
            vec2 dbBranchP = boltDist(p, bseedP, branchTopYP, branchTopYP - 0.7,
                                      3, zigzagAmt * 0.8, branchBaseXP, branchEndDxP);
            if (dbBranchP.x < dP) {
                dP = dbBranchP.x;
                wP = lineW * 0.5 * boltTaper(dbBranchP.y);
            }
        }
        vec3 layersP = boltLayers(dP, wP, glowAmt * 1.2);
        col += (vec3(1.0) * layersP.x + midCol * layersP.y + atmosCol * layersP.z)
             * uKeypulse * (0.6 + uKeyvel * 1.2);
        col += vec3(1.0) * uKeypulse * (0.15 + uKeyvel * 0.20);
    }

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
