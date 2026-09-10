// ===============================================================
// SCENE 41 - KIOSKO
// Fondo de bandas arcoiris concentricas (el centro del arco vive bien
// afuera de la pantalla, asi que del lado mas cerca se ven curvas y del
// lado mas lejos casi rectas -- una sola formula para las dos cosas),
// tapizado de simbolos chicos tipo maquina de escribir, y una
// "pantallita" negra de kiosko con un puñado de esos mismos simbolos
// que va cambiando de contenido sola.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. BANDAS ARCOIRIS: se mide la distancia de cada pixel a un centro
//    fijo puesto MUY afuera de la pantalla (abajo a la izquierda). Esa
//    distancia, multiplicada por una frecuencia y con el tiempo
//    restado, decide en que banda de color cae cada pixel -- son
//    curvas de nivel de un solo campo de distancia, asi que del lado
//    de la pantalla mas cerca del centro se leen como arcos curvos, y
//    del lado mas lejos (donde la curvatura de un circulo tan grande
//    ya no se nota) se leen casi como rayas rectas. D2 controla que
//    tan lejos esta el centro -- mas lejos, mas parecido a rayas en
//    TODA la pantalla.
//
// 2. SIMBOLOS DE FONDO: una grilla fija (no anima con el tiempo, solo
//    con las perillas) donde cada celda decide por hash si muestra uno
//    de 6 simbolos chicos (anillo, diagonal, blob, exclamacion, coma,
//    arco -- SDFs simples, no tipografia real) en dorado o negro.
//
// 3. PANTALLA DE KIOSKO: un rectangulo negro fijo con su propia
//    sub-grilla de simbolos, pero esta si se reordena cada tanto (mismo
//    mecanismo de reseed por tiempo que scene38/39/40) -- es la parte
//    que cambia sola en el video de referencia, como un cartel digital.
//
// CONTROLES
//   Speed    velocidad a la que derivan las bandas arcoiris
//   Density  cuantas celdas tiene la grilla de simbolos de fondo
//   Hue      hue base de la paleta de bandas y simbolos
//   Chaos    cuanto rota/varia cada simbolo de fondo individualmente
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash, ademas de adelantar el reseed de la pantalla de
//            kiosko (el cartel "salta" de contenido con el golpe)
//   High     vibracion micro de la posicion de cada simbolo (excepcion
//            del contrato)
//
// @D1: ancho de las bandas arcoiris (anchas <-> finas)
// @D2: que tan lejos esta el centro del arco (arcos marcados <-> casi
//      todo recto)
// @D3: densidad de simbolos de fondo (casi vacio <-> tapizado)
// @D4: tamano de los simbolos
// @D5: velocidad con la que cambia el contenido de la pantalla de kiosko
// @D6: brillo/resplandor de la pantalla de kiosko
// ===============================================================

float sdSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
}

float glyphMask(int gtype, vec2 q, float s) {
    float d;
    if (gtype == 0) {          // anillo
        d = abs(length(q) - s * 0.55) - s * 0.13;
    } else if (gtype == 1) {   // diagonal
        d = sdSeg(q, vec2(-s * 0.5, -s * 0.6), vec2(s * 0.5, s * 0.6)) - s * 0.09;
    } else if (gtype == 2) {   // blob
        d = length(q) - s * 0.42;
    } else if (gtype == 3) {   // exclamacion
        float bar = sdSeg(q, vec2(0.0, s * 0.15), vec2(0.0, s * 0.65)) - s * 0.09;
        float dot_ = length(q - vec2(0.0, -s * 0.45)) - s * 0.13;
        d = min(bar, dot_);
    } else if (gtype == 4) {   // coma
        float head = length(q - vec2(0.0, s * 0.15)) - s * 0.16;
        float tail = sdSeg(q, vec2(0.0, s * 0.1), vec2(-s * 0.25, -s * 0.5)) - s * 0.08;
        d = min(head, tail);
    } else {                    // arco / parentesis
        d = abs(length(q) - s * 0.5) - s * 0.11;
    }
    // Acotado (no solo max(...,1e-4)): 'q' viene de sf = fract(sg)-0.5,
    // que SALTA de +0.5 a -0.5 en cada borde de celda -- ahi fwidth(d)
    // ve una derivada enorme aunque a los dos lados del borde el pixel
    // este lejos de cualquier simbolo, y sin tope esa derivada gigante
    // hacia que 1-smoothstep(0,aa,d) diera un valor parcial ahi mismo:
    // una linea fina y fantasma calcando la grilla entera (bug real,
    // encontrado renderizando -- mismo patron que el fondo blanco de
    // scene36_filamentos).
    float aa = clamp(fwidth(d), 1e-4, 0.01) * 1.5;
    float cov = 1.0 - smoothstep(0.0, aa, d);

    if (gtype == 5) {
        // Mitad del anillo, no el anillo entero -- el corte se suaviza
        // con SU PROPIO fwidth (el de q.x), no el de 'd': mezclar el
        // corte adentro de 'd' (como antes, un ternario que salta de la
        // distancia del anillo a un valor fijo de 1.0) le daba a fwidth(d)
        // una derivada enorme justo en el borde del corte, y esa
        // "costura" se veia como una linea recta de mas encima del
        // arco (bug real, encontrado renderizando).
        float aaX = clamp(fwidth(q.x), 1e-4, 0.01) * 1.5;
        cov *= smoothstep(0.0, aaX, -q.x);
    }
    return cov;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);

    // --- BANDAS ARCOIRIS ---
    // D2: distancia del centro del arco -- lejos, casi todo recto.
    float centerDist = mix(1.1, 6.5, uD2);
    vec2  arcCenter = vec2(-centerDist * 0.8, -centerDist * 1.1);
    float r = length(p - arcCenter);
    float bandFreq = mix(3.0, 15.0, uD1);
    float drift = t * (0.05 + uSpeed * 0.55);
    float bandPhase = r * bandFreq - drift;
    int   bandIdx = int(mod(floor(bandPhase), 5.0));
    float bandHues[5];
    bandHues[0] = 0.02; bandHues[1] = 0.62; bandHues[2] = 0.33;
    bandHues[3] = 0.14; bandHues[4] = 0.90;
    vec3  col = hsv2rgb(vec3(fract(audioHue(bandHues[bandIdx], 0.0) + h0), 0.82, 0.92));

    // --- SIMBOLOS DE FONDO (fijos, solo dependen de las perillas) ---
    float symCols = 7.0 + uDensity * 9.0;
    vec2  uvAsp = vec2(uv.x * uAspect, uv.y);
    vec2  sg = uvAsp * symCols;
    vec2  sid = floor(sg);
    vec2  sf = fract(sg) - 0.5;

    float showProb = mix(0.15, 0.65, uD3);
    float hasSym = step(hash21(sid + 500.0), showProb);
    if (hasSym > 0.5) {
        float rotJ = (hash21(sid + 11.0) - 0.5) * uChaos * 1.3;
        float sizeJ = mix(0.7, 1.3, hash21(sid + 22.0));
        vec2  q = rot2(rotJ) * sf;
        // uHigh: vibracion micro de posicion -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        q += uHigh * 0.012 * vec2(sin(t * 11.0 + sid.x), cos(t * 9.0 + sid.y));

        int   gtype = int(floor(hash21(sid + 33.0) * 6.0));
        float s = 0.34 * sizeJ * (0.55 + uD4 * 0.85);
        float m = glyphMask(gtype, q, s);

        float isBlack = step(0.78, hash21(sid + 44.0));
        vec3  goldCol = hsv2rgb(vec3(fract(0.11 + h0 * 0.4), 0.78, 1.0));
        vec3  symCol = mix(goldCol, vec3(0.03), isBlack);
        col = mix(col, symCol, m);
    }

    // --- PANTALLA DE KIOSKO (rectangulo fijo, contenido que reordena) ---
    vec2 boxLo = vec2(0.26, 0.66), boxHi = vec2(0.56, 0.90);
    // Resplandor de bisel: la pantalla real derrama luz sobre el marco
    // que la rodea, no corta seco al borde de la caja.
    vec2  boxC = (boxLo + boxHi) * 0.5, boxHalf = (boxHi - boxLo) * 0.5;
    vec2  boxD = max(abs(uv - boxC) - boxHalf, 0.0);
    float bezelGlow = exp(-dot(boxD, boxD) * 900.0) * (0.5 + uD6 * 0.6);
    col += hsv2rgb(vec3(fract(0.11 + h0 * 0.4), 0.7, 1.0)) * bezelGlow;
    if (uv.x > boxLo.x && uv.x < boxHi.x && uv.y > boxLo.y && uv.y < boxHi.y) {
        col = vec3(0.015);
        vec2 boxUV = (uv - boxLo) / (boxHi - boxLo);

        // D5: velocidad del reseed. Kick: ademas del flash de mas abajo,
        // adelanta el reseed -- el cartel "salta" de contenido con el
        // golpe de graves.
        float screenGs = floor(t * mix(0.4, 4.5, uD5) + uKick * 23.0);

        vec2 bg2 = boxUV * vec2(4.0, 2.0);
        vec2 bid = floor(bg2);
        vec2 bf = fract(bg2) - 0.5;

        float bshow = step(hash21(bid + screenGs * 7.0 + 1.0), 0.72);
        int   btype = int(floor(hash21(bid + screenGs * 7.0 + 2.0) * 6.0));
        float bm = glyphMask(btype, bf, 0.30);

        vec3 glowCol = hsv2rgb(vec3(fract(0.11 + h0 * 0.4), 0.75, 1.0)) * (0.65 + uD6 * 1.1);
        col += glowCol * bm * bshow;
    }

    // PIANO: un simbolo invitado, grande y brillante, aparece en la
    // posicion que elige uKeypos y se apaga solo (uKeypulse decae) --
    // mismo tratamiento de "blob invitado" que otras escenas.
    if (uKeypulse > 0.0015) {
        vec2  guestPos = centered(vec2(mix(0.1, 0.9, uKeypos), 0.5));
        vec2  qg = p - guestPos;
        int   gtype = int(floor(uKeypos * 6.0));
        float mg = glyphMask(gtype, qg, 0.22 + uKeyvel * 0.14);
        col += hsv2rgb(vec3(fract(h0 + 0.5), 0.8, 1.0)) * mg * uKeypulse * 1.4;
    }

    // Kick: flash breve, ademas del adelanto de reseed de la pantalla.
    col += col * uKick * 0.35;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.55);

    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
