// ===============================================================
// SCENE 22 - OSCILOSCOPIO / LISSAJOUS
// Tres curvas de Lissajous anidadas, como un cluster de trazas de
// osciloscopio a distinta profundidad -- ya no una sola figura.
// ===============================================================
//
// COMO FUNCIONA
// Una curva de Lissajous x=sin(fa*u), y=sin(fb*u) se dibuja marchando un
// parametro u en un bucle de conteo fijo (sin fbm, solo trig -- barato) y
// quedandose con la distancia MINIMA de cada pixel a algun punto de la
// curva. Se dibujan TRES capas (traceFigure()): la principal a full
// resolucion, y dos "ecos" mas chicos, mas tenues y con fa/fb levemente
// distintos, como si hubiera varias trazas superpuestas a distinta
// distancia -- pedido explicito ("que no solo haya uno, meter mas a
// diferentes distancias").
//
// FORMA MENOS ATADA AL AUDIO CRUDO: antes fa/fb salian CASI ENTERO de
// floor(uBass*4.99) / floor(uMid*4.99) -- con el envelope de graves/
// medios moviendose todo el tiempo, la forma cambiaba de golpe muy
// seguido y la figura se leia como "algo moviendose demasiado", no como
// una curva reconocible (pedido explicito: "menos reactivo, sobre todo
// el movimiento"). Ahora fa/fb parten de una base fija (D4 + un ciclo
// lento y PREDECIBLE en el tiempo) y el audio solo empuja +0 o +1 lobulo
// encima, un ajuste chico en vez del driver principal.
//
// CONTROLES
//   Speed    velocidad de rotacion de fase de la figura
//   Density  no aplica (la resolucion de muestreo es fija, barata)
//   Hue      tinte mezclado sobre el verde fosforo clasico
//   Chaos    amplitud de la figura (chica y contenida <-> llena la
//            pantalla)
//   Bass     empuja +0/+1 lobulo en X (mucho mas suave que antes) +
//            brillo de lo ya claro
//   Mid      empuja +0/+1 lobulo en Y (mucho mas suave que antes) +
//            tinte adicional
//   Kick     destello breve en toda la traza
//   High     rotacion de fase de la figura (excepcion del contrato)
//
// @D1: grosor del trazo nitido
// @D2: cantidad de resplandor (glow) tipo fosforo alrededor del trazo
// @D3: mezcla entre el verde fosforo clasico y el tinte de Hue
// @D4: cuantos lobulos base tiene la figura (mas simple <-> mas
//      intrincada) -- ya no depende casi entero del audio
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

// TRAZA CONTINUA de una figura de Lissajous. Antes esto medía la
// distancia a cada PUNTO muestreado (length(p - c)) y la figura salia
// como un collar de cuentas separadas, no como la traza de un
// osciloscopio: con fa/fb altos la curva avanza mucho entre muestra y
// muestra, y entre dos puntos no habia nada. Midiendo contra el
// SEGMENTO que une cada muestra con la anterior, la traza es continua a
// cualquier cantidad de lobulos. 'nSteps' acota el costo por capa (la
// capa principal usa mas pasos que los ecos, que son mas chicos y no
// necesitan tanta resolucion).
vec2 traceFigure(vec2 p, float fa, float fb, float amp, float phase, int nSteps)
{
    float minD = 1e5;
    vec2 prev = amp * vec2(sin(phase), 0.0);   // u = 0
    for (int i = 1; i <= 96; i++) {
        if (i > nSteps) break;
        float u = float(i) / float(nSteps) * TAU;
        vec2 c = amp * vec2(sin(fa * u + phase), sin(fb * u));
        minD = min(minD, segDist22(p, prev, c));
        prev = c;
    }
    float lineW = 0.010 + uD1 * 0.018;
    float core = 1.0 - smoothstep(0.0, lineW, minD);
    float glowW = 0.001 + uD2 * 0.012;
    float glow = exp(-minD * minD / glowW);
    return vec2(core, glow);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Base FIJA + un ciclo lento y predecible en el tiempo -- ya no
    // depende casi entero del audio crudo. Bass/Mid siguen tocando la
    // forma (es la identidad de la escena: "la geometria ES el audio"),
    // pero ahora como un empujon CHICO (+0 o +1 lobulo) encima de una
    // evolucion que ya se lee sola, en vez de ser el driver principal
    // saltando de golpe con cada fluctuacion de graves/medios.
    float fa = 2.0 + floor(uD4 * 3.0) + floor(sin(t * 0.09) * 1.5 + 1.5);
    float fb = 3.0 + floor(uD4 * 2.0) + floor(cos(t * 0.07) * 1.5 + 1.5);
    fa += floor(uBass * 1.99);
    fb += floor(uMid * 1.99);

    // PIANO: la figura salta a una forma mas loca (mas lobulos, elegidos
    // por uKeypos) y vuelve sola -- uKeypulse decae como uKick, asi que
    // esto es geometria real que se revierte, no un color encima.
    fa += floor(uKeypos * 6.0) * uKeypulse;
    fb += floor(fract(uKeypos * 3.3) * 6.0) * uKeypulse * (0.5 + uKeyvel * 0.8);
    float phase = t * (0.15 + uSpeed * 0.4) + uHigh * 1.5;
    float breathe = 1.0 + sin(t * 0.5) * uD5 * 0.25;
    float amp = (0.45 + uChaos * 0.4) * breathe;

    vec3 phosphor = vec3(0.25, 1.0, 0.35);
    vec3 tint = hsv2rgb(vec3(uHue, 0.6, 1.0));
    vec3 baseCol = mix(phosphor, tint, uD3);

    // TRES capas a distinta "profundidad": la principal, mas dos ecos
    // mas chicos y tenues con fa/fb apenas distintos y su propia fase --
    // pedido explicito de que no haya una sola figura. Los ecos usan
    // menos pasos de muestreo (son mas chicos, no necesitan tanta
    // resolucion) para no triplicar el costo de la capa principal.
    vec3 col = vec3(0.0);
    for (int layer = 0; layer < 3; layer++) {
        float fl = float(layer);
        float depthFade = 1.0 - fl * 0.38;
        float ampL = amp * (1.0 - fl * 0.24);
        float faL = fa + fl;
        float fbL = fb + (2.0 - fl);
        float phaseL = phase + fl * 0.9;
        int steps = (layer == 0) ? 96 : 48;

        vec2 cg = traceFigure(p, faL, fbL, ampL, phaseL, steps);
        col += baseCol * (cg.x * 1.6 + cg.y * 0.7) * depthFade;
    }
    col += baseCol * exp(-dot(p, p) * 30.0) * uD6 * 1.2;
    col += col * uKick * 0.6;

    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
