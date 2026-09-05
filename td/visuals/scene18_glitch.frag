// ===============================================================
// SCENE 18 - GLITCH
// Señal digital corrompida: un patron base de bloques de color se le
// aplica tearing (bandas que se desplazan a saltos), separacion
// cromatica y bursts de estatica/inversion -- reemplaza al viejo
// "tunel". Distinta de scene19 (que glitchea una imagen/GIF propia):
// esta genera su propio contenido, todo procedural.
// ===============================================================
//
// COMO FUNCIONA
//
// basePattern(uv) es el "contenido" que se glitchea: una rejilla de
// bloques de color con hue/brillo por hash de celda, moviendose lento.
// Se llama TRES VECES con un offset horizontal levemente distinto por
// canal (R/G/B) -- eso es la separacion cromatica, mismo patron que
// scene09/10/19.
//
// TEARING: la pantalla se divide en bandas horizontales; cada banda
// tiene su propio desplazamiento en X, sacado de un hash contra el
// tiempo CUANTIZADO -- cambia a saltos discretos, como un cable de video
// suelto, no una onda continua. Chaos decide que fraccion de bandas
// estan "rotas" en un instante dado.
//
// BURST: cada tanto (hash contra el tiempo cuantizado a un paso mas
// lento) TODA la pantalla se invierte o se llena de estatica por un
// instante -- D4 controla que tan seguido pasa.
//
// CONTROLES
//   Speed    velocidad de deriva del patron base + rapidez del tearing
//   Density  finura del patron base (bloques chicos <-> grandes)
//   Hue      paleta del patron base
//   Chaos    fraccion de bandas "rotas" por el tearing en un instante
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     separacion cromatica y tearing se disparan mas fuerte un
//            instante -- ya llega con envolvente de golpe-y-caida
//            (audio.py)
//   High     vibracion micro del offset de tearing (excepcion del
//            contrato)
//
// @D1: cuanto se desplazan las bandas rotas (tearing sutil <-> muy
//      agresivo)
// @D2: cantidad de separacion cromatica (RGB split)
// @D3: cuantas bandas horizontales hay (pocas y anchas <-> muchas y
//      finas)
// @D4: frecuencia de los bursts de estatica/inversion total
// ===============================================================

vec3 basePattern(vec2 uv, float t)
{
    float cols = 6.0 + uDensity * 26.0;
    float colId = floor(uv.x * cols);
    float rowId = floor(uv.y * 14.0);
    float cellHash = hash21(vec2(colId, rowId) + floor(t * (0.3 + uSpeed * 0.6)));
    float hue = fract(uHue + cellHash * 0.6);
    float val = 0.35 + 0.5 * hash21(vec2(colId, rowId) + 7.0);
    return hsv2rgb(vec3(hue, 0.75, val));
}

vec4 render(vec2 uv)
{
    float t = uTime;

    // D3: cuantas bandas de tearing hay.
    float bands = 5.0 + uD3 * 45.0;
    float bandId = floor(uv.y * bands);

    float tearRate = 1.5 + uSpeed * 6.0;
    float stepT = floor(t * tearRate + bandId * 0.5);

    // Chaos: fraccion de bandas rotas en este instante.
    float isTornHash = hash21(vec2(bandId, stepT) + 50.0);
    float isTorn = step(1.0 - uChaos * 0.85, isTornHash);

    float tearHash = hash21(vec2(bandId, stepT));
    // D1: cuanto se desplazan. Kick: mas fuerte un instante, ademas del
    // brillo de mas abajo -- ya llega con envolvente de golpe-y-caida.
    float tearAmt = (0.01 + uD1 * 0.22) * (1.0 + uKick * 2.5);
    float xShift = (tearHash - 0.5) * tearAmt * isTorn;
    // uHigh: vibracion micro del offset -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    xShift += uHigh * 0.008 * sin(t * 20.0 + bandId);

    vec2 uvT = uv + vec2(xShift, 0.0);

    // D2: separacion cromatica -- cada canal muestrea el patron con su
    // propio offset horizontal.
    float aberr = (0.003 + uD2 * 0.045) * (1.0 + uKick * 1.5);
    vec3 col;
    col.r = basePattern(uvT + vec2(aberr, 0.0), t).r;
    col.g = basePattern(uvT, t).g;
    col.b = basePattern(uvT - vec2(aberr, 0.0), t).b;

    // BURST: cada tanto, toda la pantalla se invierte o se llena de
    // estatica -- D4 controla que tan seguido.
    float burstRate = 0.3 + uD4 * 3.5;
    float burstStep = floor(t * burstRate);
    float burstHash = hash21(vec2(burstStep, 91.0));
    float burstOn = step(0.88 - uD4 * 0.35, burstHash);
    float burstPhase = fract(t * burstRate);
    float burstEnv = smoothstep(0.0, 0.08, burstPhase) * smoothstep(0.35, 0.08, burstPhase);

    float staticN = hash21(uv * uResW * 0.5 + floor(t * 30.0));
    vec3 staticCol = vec3(staticN);
    vec3 invCol = vec3(1.0) - col;
    float burstMix = step(0.5, hash21(vec2(burstStep, 5.0)));
    col = mix(col, mix(invCol, staticCol, burstMix), burstOn * burstEnv);

    // Kick: flash breve.
    col += col * uKick * 0.35;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
