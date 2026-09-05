// ===============================================================
// SCENE 12 - CONTOUR
// Curvas de nivel topograficas de un campo de ruido lento.
// ===============================================================
//
// COMO FUNCIONA
//
// Un solo campo de altura h = fbm(...) se evalua UNA vez por pixel.
// Density decide cuantas curvas de nivel se dibujan (entre 3 y 10,
// bucle de conteo fijo con corte temprano); cada curva es simplemente
// edgeLine(h - umbral_i, ancho) para un umbral distinto, reusando el
// mismo campo h -- no hay que recalcular ruido por curva, solo comparar
// contra un numero distinto. Por eso sale barato aunque haya varias
// curvas.
//
// Mas alto (mas cerca de la cima del "terreno") se ve un poco mas
// brillante, como en un mapa topografico real -- ayuda a leer la forma
// del terreno en vez de ver solo lineas sueltas.
//
// CONTROLES
//   Speed    el terreno se desplaza lento
//   Density  cuantas curvas de nivel hay (3 a 10)
//   Hue      color de las curvas
//   Chaos    rugosidad del terreno (domain warp + octavas efectivas)
//   Bass     brillo de lo ya claro (audioLift) + un poco de movimiento del
//            terreno (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro de las curvas (excepcion del contrato)
//
// @D1: grosor de las curvas
// @D2: escala del terreno (mas D2 = terreno mas fino y detallado)
// @D3: contraste del gradiente de brillo (parejo <-> valles oscuros muy
//      marcados contra picos brillantes)
// @D4: relleno tenue entre curvas de nivel (solo lineas <-> mapa relleno)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float scale = 0.5 + uD2 * 1.5;
    vec2 warpP = p * scale + vec2(t * (0.01 + uSpeed * 0.06), t * (0.008 + uSpeed * 0.04));

    // uChaos anade un domain warp que rompe la simetria del ruido base --
    // sin esto el terreno se ve demasiado regular. Bass suma un poco de
    // movimiento ademas del brillo de mas abajo -- seguro porque uBass ya
    // llega suavizado (Fase 2).
    vec2 warp = vec2(fbm(warpP + 4.0, 3), fbm(warpP - 2.0, 3)) - 0.5;
    warpP += warp * (0.15 + uChaos * 0.6 + uBass * 0.08);

    float h = fbm(warpP, 4, 0.5);

    // uHigh: vibracion micro del campo de altura -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    h += uHigh * 0.015 * sin(t * 10.0 + p.x * 6.0 + p.y * 6.0);

    float lineW = 0.6 + uD1 * 2.2;
    float levels = 3.0 + floor(uDensity * 7.0);

    // El "terreno" respira con los bajos -- escala el campo de altura
    // entero, asi el espaciado entre curvas se comprime/expande con la
    // musica (uBass ya suavizado, Fase 2), en vez de quedar fijo.
    float hBreath = h * (1.0 + uBass * 0.15);

    float hCol = audioHue(uHue, uMid * 0.16);
    vec3 col = vec3(0.0);

    // D4: relleno tenue segun la altura del terreno, debajo de las
    // lineas -- en 0 solo se ven las curvas sobre negro, en 1 se lee
    // como un mapa topografico relleno.
    col += hsv2rgb(vec3(hCol, 0.5, clamp(hBreath, 0.0, 1.0))) * uD4 * 0.35;

    // Bucle de conteo fijo con corte temprano: nunca mas de 10 curvas.
    for (int i = 0; i < 10; i++) {
        if (i >= int(levels)) break;

        float threshold = (float(i) + 0.5) / levels;
        float line = edgeLine(hBreath - threshold, lineW);

        // Mas alto = un poco mas brillante, como en un mapa real. D3:
        // contraste -- en 0, TODAS las curvas quedan igual de medias; en
        // 1 se alternan MUY oscuras / MUY claras entre niveles vecinos
        // (efecto de bandas, como una carta batimetrica de alto contraste).
        //
        // OJO: un degradado CONTINUO por indice (0.1 a 1.0 segun altura)
        // siempre cruza el valor "parejo" en algun indice exacto -- si las
        // curvas visibles en pantalla caen justo ahi, D3 parece no hacer
        // nada. Alternar entre vecinos (par/impar) en vez de un degradado
        // evita esto de raiz: el valor parejo (0.5) queda siempre A MITAD
        // de camino entre los dos extremos alternados (0.08 y 0.92), asi
        // que CUALQUIER indice cambia sustancialmente, no solo algunos.
        float bright = mix(0.5, mix(0.08, 0.92, mod(float(i), 2.0)), uD3);
        col += hsv2rgb(vec3(hCol, 0.65, bright)) * line;
    }

    // Oclusion ambiental: donde el terreno es mas escarpado (muchas
    // curvas de nivel apretadas en pocos pixeles) se oscurece un poco,
    // dando relieve real en vez de lineas planas. Se acentua en el
    // kick, como si la sombra "pesara" mas con el golpe.
    float bandDensity = levels * length(vec2(dFdx(hBreath), dFdy(hBreath)));
    float ao = smoothstep(0.4, 3.0, bandDensity) * (0.25 + uKick * 0.5);
    col *= 1.0 - ao * 0.45;

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.45);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
