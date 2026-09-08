// ===============================================================
// SCENE 16 - MEDIA ECHO
// Tunel de eco/feedback sobre tu propia carpeta de imagenes: la MISMA
// imagen se muestrea varias veces, cada copia mas metida hacia el
// centro y girada un poco mas que la anterior, con el brillo decayendo
// por copia -- el mismo truco visual de un feedback loop analogico
// (camara apuntando a su propio monitor), calculado entero en una sola
// pasada, sin memoria entre frames.
// ===============================================================
//
// COMO FUNCIONA
//
// N copias de la MISMA imagen (mediaTex, la carpeta comun de
// config.MEDIA_SCENES -- comparte carpeta con scene19/34/35) se suman,
// cada una muestreada con un escalado y una rotacion ACUMULADOS: la
// copia i esta zoomeada zoomStep^i veces y girada i*rotStep, asi que a
// medida que i crece las copias se meten mas hacia el centro de la
// imagen y giran mas -- el mismo resultado visual que reinyectar el
// frame anterior zoomeado y girado una y otra vez, pero sin Feedback
// TOP ni estado real: es pura geometria de muestreo repetido dentro del
// mismo pixel shader.
//
// El espejado de 'muv' (abs(fract(muv*0.5)*2-1), la misma tecnica que
// scene34/caleidoscopio) evita la costura dura que deja la repeticion
// normal de una textura cuando el zoom saca una copia fuera de [0,1].
//
// CONTROLES
//   Speed    velocidad de giro del tunel entero
//   Density  cuantas copias (ecos) entran (tunel corto <-> profundo)
//   Hue      tinte que se mezcla sobre las copias (0 = colores
//            originales de la imagen)
//   Chaos    cuanto se desvia cada copia de la espiral perfecta --
//            jitter propio de rotacion/escala por copia, fijo (no
//            anima), para que el tunel se vea organico y no como una
//            espiral matematica exacta
//   Bass     brillo de lo ya claro (audioLift) + un empujon chico al
//            zoom de cada copia (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue), antes de construir el tinte
//            por copia
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro de cada copia (excepcion del contrato)
//
// @D1: profundidad del zoom por copia (tunel apenas insinuado <-> se
//      mete bien adentro de la imagen)
// @D2: rotacion por copia (todas alineadas <-> espiral marcada)
// @D3: decaimiento de brillo por copia (pocas visibles, se apagan
//      rapido <-> estela larga y persistente)
// @D4: mezcla del tinte de Hue sobre las copias (colores originales
//      <-> tenido por completo)
// @D5: deriva de color entre copias (todas el mismo tinte <-> cada
//      copia un tono distinto, estela arcoiris)
// @D6: cuanto resalta la copia central (la imagen real, sin zoom ni
//      giro) sobre el resto del tunel
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int n = 3 + int(floor(uDensity * 7.99));

    float zoomStep = mix(0.97, 0.55, uD1);
    float rotStep  = mix(0.0, 0.6, uD2);
    float decay    = mix(0.35, 0.85, uD3);
    float hueDrift = uD5 * 0.16;

    float hueBase = audioHue(uHue, uMid * 0.08);
    float baseSpin = t * (0.04 + uSpeed * 0.35);

    vec3 col = vec3(0.0);
    vec3 core = vec3(0.0);
    float totalW = 0.0;

    for (int i = 0; i < 10; i++) {
        if (i >= n) break;
        float fi = float(i);

        // Chaos: cada copia se desvia un poco de la espiral perfecta,
        // fijo por indice (no anima con el tiempo) -- asi el tunel se
        // ve organico, no como una espiral matematica exacta.
        float jitA = (hash21(vec2(fi, 7.3)) - 0.5) * uChaos * 0.6;
        float jitS = 1.0 + (hash21(vec2(fi, 3.1)) - 0.5) * uChaos * 0.15;

        // Bass: un empujon chico al zoom de cada copia, ademas del
        // brillo de mas abajo -- seguro porque uBass ya llega suavizado
        // (Fase 2), mismo patron que el warp de scene00/scene02.
        float scale = pow(zoomStep, fi) * jitS
                    * (1.0 + 0.03 * sin(t * 0.6 + fi * 1.7))
                    * (1.0 + uBass * 0.04);
        float angle = fi * rotStep + baseSpin + jitA;

        vec2 q = rot2(angle) * p * scale;
        vec2 muv = q * 0.5 + 0.5;
        // uHigh: vibracion micro por copia -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        muv += uHigh * 0.01 * vec2(sin(t * 9.0 + fi * 3.0), cos(t * 7.0 + fi * 2.0));
        muv = abs(fract(muv * 0.5) * 2.0 - 1.0);

        vec3 src = mediaTex(muv).rgb;
        if (i == 0) core = src;

        // D5: cada copia se aleja un poco mas del tinte base -- estela
        // monocroma en 0, arcoiris marcado en 1.
        vec3 tint = hsv2rgb(vec3(fract(hueBase + fi * hueDrift), 0.75, 1.0));
        vec3 tinted = mix(src, src * tint * 1.3, uD4);

        float w = pow(decay, fi);
        col += tinted * w;
        totalW += w;
    }
    col /= max(totalW, 0.001);

    // D6: la copia central (la imagen real, sin zoom ni giro) resalta
    // por encima del resto del tunel -- en 0 se funde con las demas
    // copias, en 1 se lee claramente por arriba.
    col += core * (uD6 * 0.9);

    // PIANO: un "golpe" de zoom -- una copia extra, mucho mas metida
    // hacia el centro que cualquier eco normal, se suma brillante con
    // cada tecla, como un pulso de feedback real disparandose. uKeypos
    // gira el punch a un angulo propio; uKeyvel escala que tan profundo
    // se mete; uKeypulse decae solo.
    if (uKeypulse > 0.0015) {
        float pAngle = uKeypos * TAU;
        float pScale = mix(1.0, 0.10, uKeypulse * (0.6 + uKeyvel * 0.7));
        vec2 pq = rot2(pAngle) * p * pScale;
        vec2 pmuv = pq * 0.5 + 0.5;
        pmuv = abs(fract(pmuv * 0.5) * 2.0 - 1.0);
        vec3 punch = mediaTex(pmuv).rgb;
        col += punch * uKeypulse * (0.7 + uKeyvel * 0.9);
    }

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria (salvo el empujon
    // chico de zoom de arriba, ya suavizado -- ver contrato de audio).
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
