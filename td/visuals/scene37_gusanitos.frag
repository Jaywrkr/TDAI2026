// ===============================================================
// SCENE - GUSANITOS
// Un puñado de gusanos simples (cuerpo segmentado, cabeza redondeada,
// cola que se afina) que reptan por la pantalla siguiendo una curva
// suave -- sin sistema de particulas, todo geometria cerrada barata
// (la misma tecnica de "distancia a una polilinea" que ya usa
// scene16_hebras), pensado para no pesarle nada a la GPU.
// ===============================================================
//
// COMO FUNCIONA
// La cabeza de cada gusano recorre una curva tipo Lissajous propia
// (frecuencias distintas por gusano, via hash) que sigue derivando con
// el tiempo, no un loop corto que se repite. El CUERPO son N puntos
// mas, evaluados en la MISMA curva pero un poco mas atras en el tiempo
// (delay creciente por segmento) -- asi el gusano entero repta
// siguiendo su propia cabeza, como una fila que se mueve, no un tubo
// estatico con textura encima.
//
// CONTROLES
//   Speed    velocidad a la que reptan los gusanos
//   Density  cuantos gusanos hay en pantalla
//   Hue      color base
//   Chaos    cuanto se retverce la curva de cada gusano
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todos los gusanos
//   High     vibracion micro de la posicion (excepcion del contrato)
//
// @D1: grosor del cuerpo
// @D2: largo del gusano (cuantos segmentos entran)
// @D3: cuanto se afina la cola respecto de la cabeza
// @D4: tamano/redondez de la cabeza
// @D5: velocidad de retorcimiento de la curva
// @D6: cantidad de resplandor (glow) alrededor del cuerpo
// ===============================================================

vec2 wormPath(float tau, vec2 seed, float twist)
{
    float a1 = 0.6 + hash21(seed) * 0.5;
    float a2 = 0.9 + hash21(seed + 1.0) * 0.7;
    float b1 = 0.5 + hash21(seed + 2.0) * 0.5;
    float b2 = 1.1 + hash21(seed + 3.0) * 0.6;
    vec2  c = vec2((hash21(seed + 4.0) - 0.5) * 1.6, (hash21(seed + 5.0) - 0.5) * 1.2);
    vec2  amp = vec2(0.85, 0.55);
    return c + vec2(
        sin(tau * a1) * amp.x + sin(tau * a2 * twist + 2.0) * amp.x * 0.35,
        cos(tau * b1 * 0.9) * amp.y + cos(tau * b2 * twist + 1.0) * amp.y * 0.35
    );
}

float segDistW(vec2 p, vec2 a, vec2 b)
{
    vec2 ab = b - a, ap = p - a;
    float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return length(ap - ab * h);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int   nWorms = 2 + int(floor(uDensity * 5.99));
    float speed = 0.2 + uSpeed * 0.9;
    float twist = 1.0 + uD5 * 1.6;
    int   nSeg = 8 + int(floor(uD2 * 14.99));
    float segDelay = 0.045;

    float h0 = audioHue(uHue, uMid * 0.10);
    vec3  col = vec3(0.02, 0.02, 0.03) * (1.0 - smoothstep(0.0, 1.4, length(p)));

    for (int w = 0; w < 8; w++) {
        if (w >= nWorms) break;
        float fw = float(w);
        vec2  seed = vec2(fw * 11.3 + 3.0, fw * 5.7 + 8.0);
        float tw = twist * (0.7 + hash21(seed + 6.0) * 0.8) * (1.0 + uChaos * 0.8);

        vec3  wormCol = hsv2rgb(vec3(fract(h0 + fw * 0.11), 0.65, 1.0));

        // PIANO: "susto". La tecla golpea el vidrio en la X que elige
        // uKeypos: cada gusano cerca del golpe da un respingo -- el cuerpo
        // entero salta alejandose del punto y se ilumina -- y vuelve solo
        // a su camino con uKeypulse. Los lejanos ni se enteran. Velocity
        // = golpe mas fuerte, salto mas largo y de mas alcance.
        vec2  pw = p;
        float scare = 0.0;
        if (uKeypulse > 0.0015) {
            vec2  gp = centered(vec2(mix(0.12, 0.88, uKeypos), 0.5));
            vec2  head0 = wormPath(t * speed, seed, tw);
            vec2  away = head0 - gp;
            float dA = length(away);
            scare = exp(-dA * dA / (0.45 + uKeyvel * 0.9)) * uKeypulse;
            pw -= away / (dA + 1e-3) * scare * (0.25 + uKeyvel * 0.35);
            wormCol = mix(wormCol, vec3(1.0), scare * 0.7);
        }

        vec2  prev = wormPath(t * speed, seed, tw);
        float minD = 1e5;
        float bestFrac = 0.0;
        for (int i = 1; i <= 22; i++) {
            if (i > nSeg) break;
            float fi = float(i);
            vec2  cur = wormPath(t * speed - fi * segDelay, seed, tw);
            float d = segDistW(pw, prev, cur);
            if (d < minD) { minD = d; bestFrac = fi / float(nSeg); }
            prev = cur;
        }

        // D3: la cola se afina respecto de la cabeza.
        float width = mix(0.028, 0.075, uD1) * mix(1.0, 0.25, bestFrac * uD3);
        // D4: cabeza mas grande y redonda -- se dibuja aparte, en el
        // punto tau=0 de la curva.
        vec2  headPos = wormPath(t * speed, seed, tw);
        float headR = mix(0.03, 0.09, uD4);
        float dHead = length(pw - headPos);

        float bodyCov = 1.0 - smoothstep(width, width + 0.01, minD);
        float headCov = 1.0 - smoothstep(headR, headR + 0.01, dHead);
        float cov = max(bodyCov, headCov);

        float glow = exp(-minD * minD / (0.002 + uD6 * 0.02)) * (0.2 + uD6 * 0.5);

        col = mix(col, wormCol, cov);
        col += wormCol * glow * (1.0 - cov);
    }

    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
