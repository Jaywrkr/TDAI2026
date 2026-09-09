// ===============================================================
// SCENE 48 - HEBRAS
// Cadenas organicas tipo bacteria -- una fila de cuentas redondeadas
// que se van sumando en un camino que se retuerce solo -- cruzandose
// por toda la pantalla, cada una con un borde negro marcado y una
// textura de grano fino adentro que titila. La forma de las cadenas
// es FIJA (solo las perillas la cambian); lo que se anima es el
// grano.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. CAMINO: cada cadena arranca en un punto y un angulo al azar
//    (hash por indice de cadena) y avanza en pasos fijos, girando un
//    poco en cada paso (tambien por hash, no por tiempo) -- una
//    caminata aleatoria pero SUAVE, no ruido. Se mide la distancia de
//    cada pixel al SEGMENTO mas cercano de esa polilinea (igual que
//    traceFigure en scene22), y se guarda tambien la posicion a lo
//    largo del camino ('u') del segmento mas cercano.
//
// 2. CUENTAS: el ancho de la cadena en cada punto no es constante --
//    oscila con sin(u * frecuencia) (D2/D3), asi la cadena se ve como
//    una fila de cuentas redondeadas pegadas, con un pellizco entre
//    cada una, en vez de un tubo liso.
//
// 3. BORDE + GRANO: un segundo umbral, mas ancho, pintado en negro
//    ANTES del relleno, da el borde marcado alrededor de cada cadena.
//    Adentro del relleno, un ruido cuantizado que titila con el
//    tiempo da la textura granulada.
//
// CONTROLES
//   Speed    velocidad del titileo del grano
//   Density  cuantas cadenas hay
//   Hue      hue base (rota el color de las cadenas y del fondo)
//   Chaos    cuanto gira cada cadena en cada paso (casi recta <-> bien
//            retorcida)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro del grano (excepcion del contrato)
//
// @D1: ancho base de las cadenas
// @D2: frecuencia de las cuentas a lo largo de la cadena
// @D3: cuanto varia el ancho entre cuenta y cuenta (tubo liso <-> bien
//      perlado)
// @D4: grosor del borde negro alrededor de cada cadena
// @D5: cantidad de grano dentro de las cadenas
// @D6: brillo/contraste del fondo
// ===============================================================

float segDist2(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a, ap = p - a;
    float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return length(ap - ab * h);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);

    vec3  bgCol = hsv2rgb(vec3(fract(h0 + 0.78), 0.28, mix(0.55, 0.85, uD6)));
    vec3  col = bgCol;

    int   nStrands = 3 + int(floor(uDensity * 5.99));
    float turnAmt = 0.15 + uChaos * 1.1;
    float stepLen = 0.14;

    float minD = 1e5;
    float bestU = 0.0;

    for (int s = 0; s < 9; s++) {
        if (s >= nStrands) break;
        float fs = float(s);
        vec2  seed = vec2(fs * 7.1 + 1.0, fs * 3.7 + 2.0);
        vec2  prev = (hash22(seed) - 0.5) * vec2(2.6, 2.1);
        float ang = hash21(seed + 9.0) * TAU;
        float u = 0.0;

        for (int i = 1; i <= 24; i++) {
            float fi = float(i);
            ang += (hash21(seed + fi * 3.3) - 0.5) * turnAmt;
            vec2 cur = prev + vec2(cos(ang), sin(ang)) * stepLen;
            float d = segDist2(p, prev, cur);
            if (d < minD) {
                minD = d;
                // Posicion continua a lo largo del camino (en unidades
                // de stepLen), no el indice del segmento -- con
                // bestU=u+fi/24.0 (como en un primer intento) 'u' saltaba
                // de a enteros por segmento y sin(bestU*frecuencia)
                // quedaba pseudo-aleatorio entre segmentos en vez de
                // formar un bulto que crece y decrece SUAVE a lo largo
                // de la cadena -- las cuentas casi no se notaban (bug
                // real, encontrado renderizando).
                float h = clamp(dot(p - prev, cur - prev) / max(dot(cur - prev, cur - prev), 1e-6), 0.0, 1.0);
                bestU = u + h;
            }
            prev = cur;
            u += 1.0;
        }
    }

    // D2/D3: las cuentas -- el ancho oscila a lo largo del camino en
    // vez de ser un tubo liso. Techo bajado bastante (16.0 -> 4.0): a
    // 24 pasos por cadena, una frecuencia alta metia varias
    // oscilaciones POR PASO -- se veia como una sierra dentada, no
    // como cuentas redondeadas (bug real, encontrado renderizando).
    float bumpFreq = mix(1.4, 4.0, uD2);
    float bumpAmt = uD3;
    float widthMod = mix(1.0, 0.55 + 0.55 * abs(sin(bestU * bumpFreq)), bumpAmt);
    float width = mix(0.05, 0.16, uD1) * widthMod;

    float aa = max(fwidth(minD), 1e-4) * 1.5;
    float outlineW = width + mix(0.01, 0.10, uD4);
    float outline = 1.0 - smoothstep(outlineW, outlineW + aa, minD);
    float fillCov = 1.0 - smoothstep(width, width + aa, minD);

    col = mix(col, vec3(0.02), outline);

    if (fillCov > 0.001) {
        // Grano cuantizado que titila con el tiempo.
        vec2  gq = floor(uv * 60.0);
        float flick = floor(t * (2.0 + uSpeed * 10.0));
        // uHigh: vibracion micro del grano -- unica excepcion del
        // contrato, amplitud pequena.
        float grain = hash21(gq + flick * 7.0 + uHigh * 3.0);
        float grainAmt = uD5 * 0.35;
        vec3  fillCol = hsv2rgb(vec3(fract(h0 + 0.52), 0.35, 0.92));
        fillCol *= (1.0 - grainAmt * 0.5 + grain * grainAmt);
        col = mix(col, fillCol, fillCov);
    }

    // PIANO: una cuenta invitada, brillante, aparece en la posicion
    // que elige uKeypos y se apaga sola (uKeypulse decae).
    if (uKeypulse > 0.0015) {
        vec2  guestPos = centered(vec2(mix(0.1, 0.9, uKeypos), 0.5));
        float dG2 = dot(p - guestPos, p - guestPos);
        float spark = exp(-dG2 * 12.0) * uKeypulse * (0.8 + uKeyvel * 0.8);
        col += hsv2rgb(vec3(fract(h0 + 0.5), 0.85, 1.0)) * spark * 1.4;
    }

    // Kick: flash breve.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
