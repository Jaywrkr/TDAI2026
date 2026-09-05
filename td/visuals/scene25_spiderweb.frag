// ===============================================================
// SCENE 25 - TELARANA / RED EN TENSION
// Una red de radios + anillos concentricos (como una telarana o una red
// bajo tension) que "vibra" hacia afuera con cada golpe de bombo, como
// una cuerda real pulsada.
// ===============================================================
//
// COMO FUNCIONA
// Los radios salen de partir el angulo en cunas iguales y medir la
// distancia (aproximada) al radio mas cercano. Los anillos salen del
// mismo sawtooth radial que scene10 (fract(r*freq)). El "pulso" es una
// onda que viaja en el radio (sin(r*k - t)), pero su AMPLITUD la da
// uKick directamente -- como uKick ya llega con envolvente de golpe y
// caida (audio.py), la red vibra fuerte en el golpe y se aquieta sola,
// sin necesitar temporizador propio.
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
    float spokeDist = min(aMod, spokeAng - aMod) * max(r, 0.05);
    float spokeLine = edgeLine(spokeDist, 1.2 + uD1 * 2.5);

    float ringFreq = 2.0 + uD3 * 6.0;
    // Kick: la red vibra -- amplitud directamente del envolvente de golpe.
    float pluck = sin(r * 14.0 - t * 3.0) * uKick * 0.18;
    float ringSDF = fract(r * ringFreq + pluck) - 0.5;
    float ringLine = edgeLine(ringSDF, 1.2 + uD2 * 2.5);

    float web = max(spokeLine, ringLine);
    float h = audioHue(uHue, uMid * 0.1);
    vec3 col = hsv2rgb(vec3(h, 0.6, 1.0)) * web;

    // Glow en los nodos (donde radio y anillo casi se cruzan).
    float node = exp(-(spokeDist * spokeDist) * 8.0) * exp(-(ringSDF * ringSDF) * 30.0);
    col += hsv2rgb(vec3(fract(h + 0.5), 0.5, 1.0)) * node * uD4 * 2.0;

    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
