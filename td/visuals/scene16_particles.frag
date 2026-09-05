// ===============================================================
// SCENE 16 - PARTICLES
// Reemplazada por completo (pedido explicito: "reemplaza por algo con
// noise bien lineal"): la version anterior era un enjambre de particulas
// en Lissajous+fbm (nubes orbitando). Esta es un campo de flujo -- cada
// particula es un STREAK corto que sigue la direccion de un campo de
// ruido, como limaduras de hierro alineandose a un campo magnetico. El
// resultado son lineas de flujo bien definidas, no nubes difusas.
// ===============================================================
//
// COMO FUNCIONA
//
// Un GLSL TOP no tiene memoria entre frames, asi que no hay integracion
// real acumulada -- en cambio, cada streak se "marcha" desde un punto de
// partida (hash por particula) dando K pasos fijos hacia adelante, donde
// cada paso avanza en la direccion que da flowAngle() en ESE punto (un
// angulo sacado de un fbm). Es un mini-integrador de Euler desenrollado en
// un bucle de conteo fijo, recalculado entero cada frame -- barato, y el
// campo mismo deriva lento con el tiempo asi el dibujo no queda clavado.
//
// CONTROLES
//   Speed    (no usado directo en el paso -- el campo deriva a tasa fija;
//            Speed queda libre para futuros ajustes de velocidad de deriva)
//   Density  cuantos streaks hay
//   Hue      paleta base
//   Chaos    intensidad de la turbulencia del campo (cuanto se curva la
//            direccion de flujo)
//   Bass     brillo de lo ya claro (audioLift) + tamano de las
//            particulas respira con los graves (ya suavizado)
//   Mid      corrimiento de tono a lo largo de cada streak
//   Kick     destello breve en todo el campo -- ya llega con envolvente
//            de golpe-y-caida (audio.py)
//   High     vibracion micro de posicion (excepcion del contrato)
//
// @D1: tamano (grosor) de cada punto del streak
// @D2: largo del streak (cuantos pasos de flujo se dibujan)
// @D3: intensidad de la turbulencia del campo de ruido
// @D4: dispersion del campo (agrupado al centro <-> repartido por toda
//      la pantalla)
// ===============================================================

float flowAngle(vec2 pos, float t, float turbAmt)
{
    return (fbm(pos * (0.6 + turbAmt) + t * 0.06, 3) - 0.5) * TAU * 3.0;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Acotado a proposito (max 24 streaks x 10 pasos = 240 evaluaciones de
    // fbm por pixel en el peor caso, similar orden de costo que el enjambre
    // anterior).
    int   n = 6 + int(floor(uDensity * 18.99));
    // Pisos subidos (size 0.006->0.012, steps base 3->5): en D1=D2=0 los
    // streaks quedaban tan chicos y cortos que el campo de flujo casi no
    // se veia, solo un puntito.
    float size = 0.012 + uD1 * 0.014;
    int   steps = 5 + int(floor(uD2 * 8.99));
    float turbAmt = 0.10 + uD3 * 0.9;
    // El "perimetro" del campo (cuanto se dispersa) respira con los
    // bajos -- uBass ya suavizado (Fase 2), mismo patron que las
    // metaballs.
    float spread = (0.25 + uD4 * 0.65) * (1.0 + uBass * 0.25);

    float h = audioHue(uHue, uMid * 0.16);
    vec3 col = vec3(0.0);

    // Bass: tamano respira con los graves, ademas del brillo de mas
    // abajo -- seguro porque uBass ya llega suavizado (Fase 2).
    float sizeNow = size * (1.0 + uBass * 0.4);
    float stepLen = 0.028;

    for (int i = 0; i < 24; i++) {
        if (i >= n) break;
        float fi = float(i);
        vec2 seed = vec2(fi * 12.9, fi * 7.3);

        // Punto de partida del streak, repartido por el campo (D4) y
        // desplazandose lento (para que no quede siempre clavado igual).
        vec2 pos = spread * (hash22(seed) * 2.0 - 1.0);
        pos += 0.06 * vec2(sin(t * 0.05 + hash21(seed) * 6.0),
                          cos(t * 0.04 + hash21(seed + 1.0) * 6.0));

        for (int k = 0; k < 10; k++) {
            if (k >= steps) break;
            float fk = float(k);
            float trailFade = 1.0 - fk / float(steps + 1);

            float d = length(p - pos);
            // uHigh: vibracion micro de posicion -- unica excepcion del
            // contrato, amplitud pequena, ya suavizado.
            float dot = exp(-d * d / (sizeNow * sizeNow)) * trailFade;
            // El tono se corre a lo largo del streak -- velocidad segun
            // Mid, look mas energetico.
            vec3 streakCol = hsv2rgb(vec3(fract(h + hash21(seed + 4.0) * 0.12
                                              + fk * (0.02 + uMid * 0.05)), 0.7, 1.0));
            col += streakCol * dot;

            // Avanza un paso mas siguiendo el campo de flujo -- ESTO es
            // lo que da el "noise lineal": la direccion en cada punto
            // sale de un angulo de ruido, no de un Lissajous cerrado.
            float ang = flowAngle(pos, t, turbAmt);
            pos += stepLen * vec2(cos(ang), sin(ang))
                 + uHigh * 0.004 * vec2(sin(t * 10.0 + fi), cos(t * 9.0 + fi));
        }
    }

    // PIANO: una explosion dispersa MUCHOS fragmentos (24, el doble y
    // medio del original) desde el punto que elige uKeypos, viajando con
    // velocidad real (mas rapido que cualquier streak normal) -- se lee
    // como una interrupcion real del flujo, no un puntito de mas.
    // uKeypulse decae solo (los fragmentos se alejan mientras dura el
    // pulso), uKeyvel escala cuanto viajan y su tamano.
    if (uKeypulse > 0.0015) {
        vec2 burstCenter = vec2((uKeypos - 0.5) * 2.2, cos(uKeypos * 8.0) * 0.6);
        float burstDist = (1.0 - uKeypulse) * (0.6 + uKeyvel * 1.1);
        float burstSize = 0.0006 + uKeyvel * 0.0010;
        for (int b = 0; b < 24; b++) {
            float fb = float(b);
            float burstAng = fb * (TAU / 24.0) + uKeypos * 3.0;
            float burstR = burstDist * (0.6 + 0.4 * hash21(vec2(fb, 3.0)));
            vec2 fragPos = burstCenter + vec2(cos(burstAng), sin(burstAng)) * burstR;
            float dFrag = length(p - fragPos);
            float frag = exp(-dFrag * dFrag / burstSize) * uKeypulse;
            col += hsv2rgb(vec3(fract(h + fb * 0.04), 0.7, 1.0)) * frag;
        }
    }

    // Kick: destello breve en todo el campo.
    col += col * uKick * 0.6;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.5);

    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
