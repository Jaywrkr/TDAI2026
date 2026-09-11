// ===============================================================
// SCENE 35 - TRAMA / HALFTONE
// Reconstruye una imagen de la carpeta comun de media como una rejilla
// de puntos, igual que una impresion de diario o una serigrafia.
// Segunda de las dos escenas nuevas que comparten esa carpeta.
// ===============================================================
//
// COMO FUNCIONA
//
// La pantalla se divide en celdas y en cada una se dibuja UN punto cuyo
// tamano sale de la LUMINANCIA de la imagen en el centro de esa celda:
// zona clara -> punto grande, zona oscura -> punto chico o nada. Eso es
// literalmente como funciona un semitono impreso.
//
// Dos detalles que son los que separan esto de "una imagen pixelada":
//
// 1. La rejilla esta ROTADA respecto a la imagen. En impresion real cada
//    tinta se trama a un angulo distinto justamente para que las rejillas
//    no se superpongan y generen moire. Aca ademas el angulo es una
//    perilla, y girarlo en vivo se ve muy bien.
//
// 2. Se muestrea en el CENTRO de la celda, no en la posicion del pixel.
//    Si se muestreara por pixel, cada punto tendria un degradado adentro
//    y se perderia la sensacion de tinta solida, que es todo el efecto.
//
// POR QUE SIRVE EN VIVO: es el contraste grafico del set. Donde el
// caleidoscopio (34) hace algo organico e hipnotico con la misma imagen,
// esto la vuelve dura, impresa y de alto contraste.
//
// CONTROLES
//   Speed    velocidad de giro del angulo de trama
//   Density  finura de la rejilla (puntos grandes <-> trama muy fina)
//   Hue      color de la tinta
//   Chaos    desorden de la rejilla (cada punto se corre un poco)
//   Bass     brillo de lo ya claro (audioLift) + los puntos engordan
//   Mid      tinte adicional (audioHue)
//   Kick     los puntos saltan de tamano y vuelven solos
//   High     vibracion micro de la posicion del punto (excepcion)
//
// @D1: tamano de los puntos (trama abierta <-> casi solida)
// @D2: angulo base de la trama
// @D3: cuanto conserva el COLOR de la imagen (0 = tinta plana de Hue,
//      1 = cada punto con el color original de esa zona)
// @D4: forma del punto (redondo <-> cuadrado)
// @D5: gamma del tamano de punto segun luminancia (lineal <-> contraste
//      mas duro entre claros y oscuros)
// @D6: ganancia de tinta general
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // --- REJILLA ROTADA ---
    // D2 fija el angulo base y Speed lo hace girar. El giro es lo que
    // convierte una imagen fija en algo vivo sin tocar la imagen.
    float ang = uD2 * PI + t * (0.02 + uSpeed * 0.22);
    mat2 rot = rot2(ang);
    mat2 unrot = rot2(-ang);

    float freq = 14.0 + uDensity * 70.0;
    vec2 g = rot * p * freq;
    vec2 cellId = floor(g);
    vec2 cellF = fract(g) - 0.5;

    // Chaos: cada celda se corre un poco de su lugar en la rejilla. Con
    // Chaos en 0 es una trama de imprenta perfecta; subiendo se vuelve
    // una trama sucia, tipo fotocopia mal hecha.
    vec2 jitter = (hash22(cellId) - 0.5) * uChaos * 0.55;
    cellF -= jitter;

    // uHigh: vibracion micro -- excepcion del contrato, amplitud chica.
    cellF += uHigh * 0.04 * vec2(sin(t * 11.0 + cellId.x),
                                 cos(t * 9.0 + cellId.y));

    // --- MUESTREO EN EL CENTRO DE LA CELDA ---
    // Se vuelve del espacio rotado de la rejilla al espacio de la imagen.
    // Muestrear aca (y no en la posicion del pixel) es lo que hace que
    // cada punto sea de UN color solido, como una gota de tinta.
    vec2 cellCenter = unrot * ((cellId + 0.5) / freq);
    vec2 muv = clamp(cellCenter * 0.5 + 0.5, 0.0, 1.0);
    // Espejo en cruz (4 cuadrantes reflejados desde el centro) -- el
    // efecto "mirror" clasico de VJ, pedido explicito. Se aplica ANTES
    // de tramar, asi la trama entera hereda la simetria en vez de verse
    // como dos imagenes distintas con puntos encima.
    muv = 0.5 - abs(muv - 0.5);
    vec3 src = mediaTex(muv).rgb;
    float lum = dot(src, vec3(0.299, 0.587, 0.114));

    // --- TAMANO DEL PUNTO ---
    // sqrt(lum): en impresion lo que representa el tono es el AREA de la
    // tinta, y el area va con el cuadrado del radio -- sin la raiz, los
    // medios tonos salen demasiado oscuros.
    //
    // El piso de 0.52 (no 0.30) es lo que hace que la escena TENGA
    // PRESENCIA con la perilla en 0, que es como arranca: con 0.30 un
    // medio tono daba radio ~0.21 y la pantalla entera quedaba tres
    // veces mas oscura que scene19 con la misma imagen (medido). En 0.52
    // un blanco puro da radio ~0.52, o sea puntos que ya se tocan --
    // exactamente el 100% de cobertura de una trama impresa.
    float grow = (0.52 + uD1 * 0.42) * (1.0 + uBass * 0.45 + uKick * 0.45);
    float lumGamma = 1.0 - uD5 * 0.6;
    float radius = sqrt(pow(clamp(lum, 0.0, 1.0), lumGamma)) * grow;

    // PIANO: cada tecla gira la trama de golpe a un angulo propio --
    // geometria real (la rejilla entera se reorienta) y vuelve sola.
    // Es el gesto clasico de imprenta: cambiar el angulo de pantalla.
    if (uKeypulse > 0.0015) {
        float kAng = (uKeypos - 0.5) * PI * uKeypulse * (0.6 + uKeyvel * 0.8);
        vec2 kg = rot2(kAng) * rot * p * freq;
        cellF = mix(cellF, fract(kg) - 0.5, uKeypulse);
        radius *= 1.0 + uKeypulse * (0.25 + uKeyvel * 0.45);
    }

    // D4: forma. La distancia euclidea da un punto redondo; la de
    // Chebyshev (el max) da un cuadrado. Interpolar entre las dos pasa
    // por todas las formas intermedias.
    float dRound = length(cellF);
    float dSquare = max(abs(cellF.x), abs(cellF.y));
    float d = mix(dRound, dSquare, uD4);

    // El borde del punto se suaviza con fwidth: asi el punto queda
    // antialiaseado a cualquier densidad de rejilla, incluso cuando una
    // celda mide menos de un pixel.
    float aa = max(fwidth(d), 1e-5) * 1.2;
    float ink = 1.0 - smoothstep(radius - aa, radius + aa, d);

    // --- COLOR ---
    // D3: de tinta plana (un solo color, look serigrafia) a que cada
    // punto conserve el color original de esa zona de la imagen.
    float h = audioHue(uHue, uMid * 0.16);
    vec3 inkCol = mix(hsv2rgb(vec3(h, 0.80, 1.0)), src / max(lum, 0.08), uD3) * (0.7 + uD6 * 0.8);
    vec3 col = inkCol * ink;

    // Multiplicador subido de nuevo (0.6 -> 1.1 -> 2.4): la primera
    // subida seguia sin notarse -- pedido explicito de mas reaccion al
    // bajo para el bloom/brillo en las escenas de imagen.
    col = audioLift(col, uBass * 2.4);
    col += col * uKick * 0.35;

    // Grading tipo prensa real: un tinte frio muy sutil hacia los bordes
    // y calido hacia el centro -- mismo toque que scene34_kaleido, para
    // que las dos escenas de imagen se lean como una familia trabajada.
    col = mix(col * vec3(0.96, 1.0, 1.06), col * vec3(1.05, 1.0, 0.94), 1.0 - smoothstep(0.0, 1.1, length(p)));

    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
