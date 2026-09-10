// ===============================================================
// SCENE 07 - OSCILOSCOPIO / COMETA
// Una curva de Lissajous, pero en vez de trazarse entera y quieta cada
// frame, se dibuja como un cometa: un cabezal recorre la curva y deja
// una cola que se desvanece detras -- menos lazos superpuestos, mas
// aire, paleta cian en vez de verde fosforo clasico.
// ===============================================================
//
// COMO FUNCIONA
// El "cabezal" avanza con el tiempo (uHead = t*velocidad) sobre la
// parametrizacion x=sin(fa*u), y=sin(fb*u). La cola sale de mirar
// hacia ATRAS en u (uHead - i*du para i=1..largo) y unir cada punto con
// el anterior por un SEGMENTO (misma tecnica que antes, segDist22 -- si
// se midiera punto a punto la cola se veria como un collar de cuentas),
// con el brillo cayendo a medida que i crece. Es la misma idea que la
// persistencia de fosforo de scene00_pulso, aplicada a una curva 2D en
// vez de una onda 1D.
//
// El fondo YA NO es pantalla vacia: hay un campo de energia (fbm que
// fluye lento) y un campo de estrellas dispersas que titilan solas --
// asi la escena se lee como "un cometa cruzando un campo estelar", no
// como un trazo de osciloscopio aislado en el vacio.
//
// CONTROLES
//   Speed    velocidad con la que el cabezal recorre la curva
//   Density  no aplica (la resolucion de muestreo es fija, barata)
//   Hue      tinte mezclado sobre el cian base
//   Chaos    amplitud de la figura (chica y contenida <-> llena la
//            pantalla)
//   Bass     empuja +0/+1 lobulo en X + brillo de lo ya claro
//   Mid      empuja +0/+1 lobulo en Y + tinte adicional
//   Kick     destello breve en toda la traza
//   High     vibracion micro de fase del cabezal (excepcion del
//            contrato)
//
// @D1: grosor del nucleo de la cola
// @D2: cantidad de resplandor (glow) alrededor de la cola
// @D3: mezcla entre el cian base y el tinte de Hue
// @D4: cuantos lobulos base tiene la figura (mas simple <-> mas
//      intrincada)
// @D5: largo de la cola del cometa (corta <-> muy larga)
// @D6: brillo extra de la cabeza del cometa
// ===============================================================

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

    // Base FIJA + un ciclo lento y predecible + un empujon chico de
    // audio (+0/+1 lobulo) -- mismo criterio que antes: la geometria
    // ES el audio, pero como ajuste, no como driver principal saltando
    // de golpe.
    float fa = 2.0 + floor(uD4 * 3.0) + floor(sin(t * 0.09) * 1.5 + 1.5);
    float fb = 3.0 + floor(uD4 * 2.0) + floor(cos(t * 0.07) * 1.5 + 1.5);
    fa += floor(uBass * 1.99);
    fb += floor(uMid * 1.99);

    // PIANO: la figura salta a una forma mas loca (mas lobulos, elegidos
    // por uKeypos) y vuelve sola -- uKeypulse decae como uKick.
    fa += floor(uKeypos * 6.0) * uKeypulse;
    fb += floor(fract(uKeypos * 3.3) * 6.0) * uKeypulse * (0.5 + uKeyvel * 0.8);

    float amp = 0.45 + uChaos * 0.4;
    float playSpeed = 0.5 + uSpeed * 2.2;
    // uHigh: vibracion micro de fase del cabezal -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    float uHead = t * playSpeed + uHigh * 1.2;

    vec3 phosphor = vec3(0.15, 0.75, 1.0);   // cian, no verde clasico
    vec3 tint = hsv2rgb(vec3(uHue, 0.6, 1.0));
    vec3 baseCol = mix(phosphor, tint, uD3);

    // Campo de energia de fondo: un fbm que fluye lento y contenido, en
    // vez de la pantalla plana de antes -- da profundidad detras del
    // cometa sin competir con la traza.
    float bgField = fbm(p * 1.3 + vec2(t * 0.035, -t * 0.028), 4);
    vec3 col = baseCol * bgField * 0.11 * (1.0 - smoothstep(0.2, 1.4, length(p)));

    // Campo estelar: rejilla fina con puntos esporadicos (hash por
    // celda) que titilan solos -- barato, y le da al fondo la sensacion
    // de un espacio real por el que cruza el cometa.
    vec2  starGrid = p * 14.0;
    vec2  starCell = floor(starGrid);
    vec2  starF = fract(starGrid) - 0.5;
    float starHash = hash21(starCell);
    float starOn = step(0.93, starHash);
    float starTwinkle = 0.5 + 0.5 * sin(t * (1.5 + starHash * 3.0) + starHash * 30.0);
    float star = starOn * exp(-dot(starF, starF) * 60.0) * starTwinkle;
    col += vec3(0.8, 0.9, 1.0) * star * 0.6;

    col *= 1.0 - 0.06 * smoothstep(0.4, 0.6, abs(fract(uv.y * uResH * 0.5) * 2.0 - 1.0));

    // D5: largo de la cola. D1: grosor del nucleo. D2: glow.
    int   nTrail = 10 + int(floor(uD5 * 38.0));
    float du = 0.055;
    float lineW = 0.006 + uD1 * 0.014;
    float glowW = 0.002 + uD2 * 0.02;
    vec2  prev = amp * vec2(sin(fa * uHead), sin(fb * uHead));
    for (int i = 1; i <= 48; i++) {
        if (i > nTrail) break;
        float fi = float(i);
        float u = uHead - fi * du;
        vec2  cpt = amp * vec2(sin(fa * u), sin(fb * u));
        float d = segDist22(p, prev, cpt);
        float fade = pow(1.0 - fi / float(nTrail), 2.0);
        float core = (1.0 - smoothstep(0.0, lineW, d)) * fade;
        float glow = exp(-d * d / glowW) * fade;
        col += baseCol * (core * 1.6 + glow * 0.7);
        prev = cpt;
    }

    // D6: brillo extra de la cabeza del cometa.
    vec2  headPos = amp * vec2(sin(fa * uHead), sin(fb * uHead));
    float dHead = length(p - headPos);
    col += baseCol * exp(-dHead * dHead * 260.0) * (0.7 + uD6 * 1.5);

    col += col * uKick * 0.5;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.2);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
