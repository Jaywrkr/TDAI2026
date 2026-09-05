// ===============================================================
// SCENE 14 - ORBIT
// Pocas orbitas circulares de trazo fino, con un nodo viajando en cada una.
// ===============================================================
//
// COMO FUNCIONA
//
// Cada orbita es un circulo tenue (edgeLine sobre |r - radio|, como en
// scene10 pero una sola linea, no un sawtooth repetido) mas un punto
// brillante que viaja sobre ese circulo a su propia velocidad. El circulo
// en si queda muy tenue -- es guia visual, no protagonista; el nodo que
// viaja es lo que se lee primero.
//
// Bucle de conteo fijo (max 6) con corte temprano segun Density.
//
// CONTROLES
//   Speed    velocidad de traslacion de los nodos
//   Density  cuantas orbitas hay (2 a 6)
//   Hue      paleta: cada orbita un matiz distinto, derivados de Hue
//   Chaos    cuanto respira el radio de cada orbita (deja de ser un
//            circulo perfecto y quieto)
//   Bass     brillo de lo ya claro (audioLift) + un poco de movimiento del
//            radio (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro del angulo (excepcion del contrato)
//
// @D1: visibilidad del trazo de la orbita (circulo guia)
// @D2: tamano del nodo
// @D3: separacion entre orbitas (juntas y anidadas <-> muy separadas,
//      llenan toda la pantalla)
// @D4: longitud/prominencia de la estela detras del nodo
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);

    int   n = 2 + int(floor(uDensity * 4.99));
    // Pisos subidos (trackAlpha 0.06->0.16, dotSize 0.010->0.016): en
    // D1=D2=0 la orbita-guia y el nodo quedaban casi invisibles -- solo
    // se veia el sol, no el "sistema solar" completo en reposo.
    float trackAlpha = 0.16 + uD1 * 0.30;
    float dotSize = 0.016 + uD2 * 0.026;

    float h = audioHue(uHue, uMid * 0.16);
    vec3 col = vec3(0.0);

    // Inclinacion de perspectiva falsa: los circulos pasan a elipses,
    // aplastadas en Y -- simula ver las orbitas en 3D desde un angulo,
    // como un sistema solar visto de costado, en vez de circulos
    // perfectos de frente. Base FIJA (0.62, no 1.0) para que el tilt se
    // note SIEMPRE por defecto -- pedido explicito ("que se note que hay
    // un tilt") -- Mid todavia lo acentua un poco mas encima.
    float squish = 0.62 - uMid * 0.22;

    // "Sol" en el centro: nucleo calido y brillante, para reforzar el
    // look de sistema solar (las orbitas alrededor de una estrella, no
    // solo lineas sueltas). Respira un poco con los bajos.
    col += vec3(1.0, 0.82, 0.45) * exp(-r * r / (0.0035 + uBass * 0.002)) * 1.3;

    // PIANO: el cometa (definido mas abajo) perturba de verdad las
    // orbitas que cruza -- se calcula aca ARRIBA del loop para poder
    // empujar 'radius' de cada orbita mientras dura el pulso, como una
    // perturbacion gravitacional real, no solo un objeto extra encima.
    float cometAng = uKeypos * TAU;
    vec2  cometDir = vec2(cos(cometAng), sin(cometAng));
    float cometT = (1.0 - uKeypulse) * 2.0 - 1.0;
    float cometRadius = abs(cometT);
    float cometPerturb = uKeypulse * (0.06 + uKeyvel * 0.12);

    for (int i = 0; i < 6; i++) {
        if (i >= n) break;

        // D3: separacion entre orbitas. El radio TAMBIEN respira con los
        // bajos (perimetro bailando, igual que las metaballs) ademas del
        // pequeno temblor de fase que ya tenia.
        float fi = float(i);
        float radius = (0.10 + fi * (0.05 + uD3 * 0.18)) * (1.0 + uBass * 0.14)
                     + uChaos * 0.02 * sin(t * 0.3 + fi * 1.3)
                     + uBass * 0.015 * sin(t * 1.2 + fi * 1.7);
        // PIANO: la orbita se sacude si el cometa la esta cruzando ahora.
        float toComet = radius - cometRadius;
        radius += cometPerturb * exp(-toComet * toComet * 60.0);

        vec3 orbitCol = hsv2rgb(vec3(fract(h + fi * 0.09), 0.65, 1.0));

        // Trazo tenue del circulo -- guia, no protagonista. Distancia
        // elipticamente aplastada para que coincida con la inclinacion.
        float rEllipse = length(vec2(p.x, p.y / squish));
        float track = edgeLine(rEllipse - radius, 1.0);
        col += orbitCol * track * trackAlpha;

        // Nodo viajando sobre la orbita.
        float speed = 0.12 + fi * 0.04 + uSpeed * 0.35;
        float ang = t * speed + fi * 2.4;

        // uHigh: vibracion micro del angulo -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        ang += uHigh * 0.02 * sin(t * 11.0 + fi);

        vec2 dotPos = radius * vec2(cos(ang), sin(ang) * squish);
        float d = length(p - dotPos);
        float dot = smoothstep(dotSize, dotSize * 0.25, d);

        col += orbitCol * dot * (1.0 + uKick * 1.5);

        // Estela tipo cometa detras del nodo: varios puntos que se van
        // apagando hacia atras. D4 controla CUANTOS puntos entran (largo
        // de la cola) Y su brillo -- en 0 casi no hay estela, en 1 una
        // cola larga y notoria. Bucle de conteo fijo, corto (max 6).
        int trailN = 1 + int(floor(uD4 * 5.99));
        for (int k = 1; k <= 6; k++) {
            if (k > trailN) break;
            float fk = float(k);
            float trailAng = ang - fk * (0.05 + uD4 * 0.10);
            vec2 trailPos = radius * vec2(cos(trailAng), sin(trailAng) * squish);
            float dTrail = length(p - trailPos);
            float trailFade = 1.0 - fk / float(trailN + 1);
            col += orbitCol * smoothstep(dotSize * 1.3, dotSize * 0.3, dTrail)
                 * trailFade * (0.15 + uD4 * 0.75);
        }
    }

    // PIANO: el cometa en si (angulo/posicion ya calculados arriba, antes
    // del loop, para poder perturbar las orbitas) -- cruza todo el
    // sistema en diagonal con cada tecla, con una cola corta detras.
    if (uKeypulse > 0.0015) {
        vec2 cometPos = cometDir * cometT;
        float dComet = length(p - cometPos);
        float comet = exp(-dComet * dComet / 0.0012) * uKeypulse * (0.6 + uKeyvel * 1.2);
        vec2 tailPos = cometDir * (cometT - 0.15);
        float dTail = length(p - tailPos);
        comet += exp(-dTail * dTail / 0.004) * uKeypulse * 0.5;
        col += vec3(1.0) * comet;
    }

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.45);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
