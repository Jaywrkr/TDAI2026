// ===============================================================
// SCENE 22 - OSCILOSCOPIO / LISSAJOUS
// Curva vectorial tipo sintetizador analogico -- las proporciones
// bass:mid SON literalmente los parametros de la curva. La geometria ES
// el audio, no una modulacion encima de una forma fija.
// ===============================================================
//
// COMO FUNCIONA
// Una curva de Lissajous x=sin(fa*u), y=sin(fb*u) se dibuja marchando un
// parametro u en un bucle de conteo fijo (sin fbm, solo trig -- barato) y
// quedandose con la distancia MINIMA de cada pixel a algun punto de la
// curva. fa y fb (cuantos "lobulos" tiene la figura en cada eje) salen
// directo de Bass y Mid -- la FORMA cambia con la musica, no solo brilla
// mas fuerte. Fase adicional en High para que la figura tambien rote
// un poco (excepcion del contrato, ya suavizado).
//
// CONTROLES
//   Speed    velocidad de rotacion de fase de la figura
//   Density  no aplica (la resolucion de muestreo es fija, barata)
//   Hue      tinte mezclado sobre el verde fosforo clasico
//   Chaos    amplitud de la figura (chica y contenida <-> llena la
//            pantalla)
//   Bass     CAMBIA LA FORMA (fa, lobulos en X) + brillo de lo ya claro
//   Mid      CAMBIA LA FORMA (fb, lobulos en Y) + tinte adicional
//   Kick     destello breve en toda la traza
//   High     rotacion de fase de la figura (excepcion del contrato)
//
// @D1: grosor del trazo nitido
// @D2: cantidad de resplandor (glow) tipo fosforo alrededor del trazo
// @D3: mezcla entre el verde fosforo clasico y el tinte de Hue
// @D4: cuantos lobulos extra se suman a fa/fb (figura mas simple <->
//      mucho mas intrincada)
// @D5: respiracion de la amplitud (fija <-> late lento entre chica y
//      grande)
// @D6: glow extra en el centro de la figura
// ===============================================================

// Distancia de un punto al SEGMENTO a-b (formula estandar). Sin esto la
// traza se dibujaba como un collar de cuentas: ver el comentario en el
// bucle de abajo.
float segDist22(vec2 pp, vec2 a, vec2 b)
{
    vec2 ab = b - a;
    vec2 ap = pp - a;
    float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return length(ap - ab * h);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Bass/Mid deciden la FORMA -- geometria real, no solo brillo.
    float fa = 1.0 + floor(uBass * 4.99) + floor(uD4 * 3.0);
    float fb = 1.0 + floor(uMid * 4.99) + floor(uD4 * 2.0);

    // PIANO: la figura salta a una forma mas loca (mas lobulos, elegidos
    // por uKeypos) y vuelve sola -- uKeypulse decae como uKick, asi que
    // esto es geometria real que se revierte, no un color encima.
    fa += floor(uKeypos * 6.0) * uKeypulse;
    fb += floor(fract(uKeypos * 3.3) * 6.0) * uKeypulse * (0.5 + uKeyvel * 0.8);
    float phase = t * (0.15 + uSpeed * 0.4) + uHigh * 1.5;
    float breathe = 1.0 + sin(t * 0.5) * uD5 * 0.25;
    float amp = (0.45 + uChaos * 0.4) * breathe;

    // TRAZA CONTINUA. Antes esto medía la distancia a cada PUNTO
    // muestreado (length(p - c)) y la figura salia como un collar de
    // cuentas separadas, no como la traza de un osciloscopio: con
    // fa/fb altos (que es justo lo que hace uBass/uMid) la curva avanza
    // mucho entre muestra y muestra, y entre dos puntos no habia nada.
    // Midiendo contra el SEGMENTO que une cada muestra con la anterior,
    // la traza es continua a cualquier cantidad de lobulos, con el mismo
    // costo de bucle.
    float minD = 1e5;
    const int N = 96;
    vec2 prev = amp * vec2(sin(phase), 0.0);   // u = 0
    for (int i = 1; i <= N; i++) {
        float u = float(i) / float(N) * TAU;
        vec2 c = amp * vec2(sin(fa * u + phase), sin(fb * u));
        minD = min(minD, segDist22(p, prev, c));
        prev = c;
    }

    // Piso subido (0.006->0.010): traza un poco mas presente en reposo.
    float lineW = 0.010 + uD1 * 0.018;
    float core = 1.0 - smoothstep(0.0, lineW, minD);
    float glowW = 0.001 + uD2 * 0.012;
    float glow = exp(-minD * minD / glowW);

    vec3 phosphor = vec3(0.25, 1.0, 0.35);
    vec3 tint = hsv2rgb(vec3(uHue, 0.6, 1.0));
    vec3 baseCol = mix(phosphor, tint, uD3);

    vec3 col = baseCol * (core * 1.6 + glow * 0.7);
    col += baseCol * exp(-dot(p, p) * 30.0) * uD6 * 1.2;
    col += col * uKick * 0.6;

    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
