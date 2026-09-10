// ===============================================================
// SCENE 09 - TELARANA / RED VIVA
// Una red de radios + anillos concentricos que respira sola, como un
// pulso cardiaco -- late todo el tiempo, no solo con el kick -- y cuyos
// radios ondulan un poco en vez de ser rectas perfectas, para que se
// lea como algo vivo (una tela de araña real nunca es geometria
// perfecta) y no como un dartboard.
// ===============================================================
//
// COMO FUNCIONA
// Los radios salen de partir el angulo en cunas iguales y medir la
// distancia (aproximada) al radio mas cercano, con una ondulacion
// organica sumada (un seno en funcion del radio y el angulo) que hace
// que cada hilo serpentee apenas. Los anillos salen del mismo sawtooth
// radial de siempre. El "pulso" tiene DOS capas: una respiracion lenta
// y constante (la red esta viva aunque no haya musica) y la vibracion
// de golpe que da uKick encima (mucho mas fuerte, decae sola).
//
// CONTROLES
//   Speed    no usado directo (los radios/anillos son estaticos)
//   Density  cuantos radios tiene la red
//   Hue      color de la red
//   Chaos    no usado directo (reservado)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     la red vibra -- los anillos se desplazan con una onda que
//            SOLO aparece con el golpe (ya llega con envolvente)
//   High     no usado directo (reservado)
//
// @D1: grosor de los radios
// @D2: grosor de los anillos
// @D3: cuantos anillos concentricos entran (pocos y anchos <-> muchos y
//      finos)
// @D4: cantidad de glow en los nodos de interseccion
// @D5: frecuencia de radios de anclaje gruesos (pocos <-> casi todos)
// @D6: frecuencia de anillos de anclaje gruesos (pocos <-> casi todos)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);

    float spokes = 6.0 + floor(uDensity * 12.0);
    float spokeAng = TAU / spokes;
    float aMod = mod(ang, spokeAng);
    // Ondulacion organica: cada radio serpentea un poco a lo largo de
    // su propio largo -- una tela de arana real nunca es geometria
    // perfecta. Respiracion CONSTANTE, no atada al kick.
    float breathe = sin(t * 0.6 + ang * 3.0) * 0.02;
    float spokeDist = min(aMod, spokeAng - aMod) * max(r, 0.05) + breathe * r;
    // JERARQUIA: una telarana real tiene unos pocos hilos de ANCLAJE
    // gruesos y el resto finos. Con todos iguales -- que era el caso --
    // el dibujo se leia como una diana de dardos, perfecto y mecanico.
    // El hash es por indice de radio, asi que cada radio mantiene su
    // grosor mientras la red gira, en vez de titilar.
    float spokeIdx = floor(ang / spokeAng);
    float anchorChance = 0.85 - uD5 * 0.55;
    float spokeW = (1.2 + uD1 * 2.5) * (0.6 + step(anchorChance, hash21(vec2(spokeIdx, 3.0))) * 1.5);
    float spokeLine = edgeLine(spokeDist, spokeW);

    float ringFreq = 2.0 + uD3 * 6.0;
    // Respiracion constante: un pulso lento y siempre presente, como un
    // latido -- la red esta viva aunque no haya musica. Amplitud chica
    // a proposito, nunca compite con el pulso real del kick.
    float pluck = sin(r * 10.0 - t * 1.1) * 0.025;
    // Kick: la red vibra fuerte -- amplitud directamente del envolvente
    // de golpe, encima de la respiracion de arriba.
    pluck += sin(r * 14.0 - t * 3.0) * uKick * 0.18;
    // PIANO: el anillo concentrico mas cercano tambien vibra con cada
    // tecla -- mismo mecanismo que el kick (desplaza el radio real de
    // los anillos), asi la tecla se siente en toda la red, no solo en
    // un radio. uKeypulse decae solo; uKeyvel escala la fuerza.
    pluck += sin(r * 14.0 - t * 3.0) * uKeypulse * (0.10 + uKeyvel * 0.14);
    float ringSDF = fract(r * ringFreq + pluck) - 0.5;
    // Los anillos tambien: uno de cada tantos mas grueso.
    float ringIdx = floor(r * ringFreq + pluck);
    float ringAnchorChance = 0.88 - uD6 * 0.55;
    float ringW = (1.2 + uD2 * 2.5) * (0.65 + step(ringAnchorChance, hash21(vec2(ringIdx, 11.0))) * 1.3);
    float ringLine = edgeLine(ringSDF, ringW);

    float web = max(spokeLine, ringLine);
    // Offset +0.5: default cian (Hue arranca en 0) en vez de rojo,
    // coherente con la paleta fria del resto del set.
    float h = audioHue(fract(uHue + 0.5), uMid * 0.1);

    // Atmosfera de fondo: la red cuelga en un aire tenuemente iluminado,
    // no en el vacio -- amplitud chica, nunca compite con los hilos.
    vec3 col = hsv2rgb(vec3(fract(h + 0.5), 0.4, 0.3)) * (1.0 - smoothstep(0.0, 1.2, r)) * 0.04;
    col += hsv2rgb(vec3(h, 0.6, 1.0)) * web;
    // Bloom ancho: el mismo trazo, con un halo bastante mas difuso, para
    // que la red brille en el aire y no solo tenga un trazo con blur fijo.
    col += hsv2rgb(vec3(h, 0.5, 1.0)) * exp(-spokeDist * spokeDist * 1.2) * 0.10;

    // Glow en los nodos (donde radio y anillo casi se cruzan).
    float node = exp(-(spokeDist * spokeDist) * 8.0) * exp(-(ringSDF * ringSDF) * 30.0);
    col += hsv2rgb(vec3(fract(h + 0.5), 0.5, 1.0)) * node * uD4 * 2.0;

    // PIANO: pulsada directa de UN radio especifico -- uKeypos elige
    // cual (de los "spokes" que ya existen) -- Y se PROPAGA a los 2
    // spokes vecinos (amplitud menor), como una telarana real vibrando
    // en cadena, no un solo hilo aislado. uKeypulse decae solo (el
    // radio pulsado brilla y vibra mas fuerte que el resto mientras dura
    // el pulso), uKeyvel escala la vibracion.
    if (uKeypulse > 0.0015) {
        float pickedSpoke = floor(uKeypos * spokes);
        for (int so = -1; so <= 1; so++) {
            float neighborAmt = (so == 0) ? 1.0 : 0.45;
            float pickedAng = (pickedSpoke + float(so) + 0.5) * spokeAng;
            vec2 spokeDir = vec2(cos(pickedAng), sin(pickedAng));
            vec2 spokeN = vec2(-spokeDir.y, spokeDir.x);
            float alongSpoke = dot(p, spokeDir);
            float perpSpoke = dot(p, spokeN);
            float pluckWave = sin(alongSpoke * 10.0 - t * 6.0) * uKeypulse * (0.03 + uKeyvel * 0.05) * neighborAmt;
            float dPluckSpoke = abs(perpSpoke - pluckWave);
            float pluckLine = edgeLine(dPluckSpoke, 3.0) * step(0.0, alongSpoke) * step(alongSpoke, 1.2);
            col += vec3(1.0) * pluckLine * uKeypulse * neighborAmt;
        }
    }

    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
