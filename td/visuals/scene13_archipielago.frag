// ===============================================================
// SCENE 42 - ARCHIPIELAGO
// Un mapa organico flotando en un campo de estrellas: islas de
// contorno irregular (fbm doblado y recortado por un umbral), costa
// que brilla en verde/cian y titila, grietas tipo tierra seca
// (Worley: segunda distancia menos primera) recorriendo el interior.
// La FORMA del mapa es fija -- solo depende de las perillas, no del
// tiempo -- lo que titila y respira es el color: costa, grietas y
// estrellas.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. TIERRA: un fbm domain-warped (mismo truco de scene00/scene02)
//    recortado por un umbral (D1) da la silueta de islas -- costas
//    fractales, bahias, canales, todo gratis de doblar el espacio
//    antes de medir el ruido. NO depende de uTime: la silueta es
//    estable, como un mapa de verdad, y solo cambia si se mueve una
//    perilla.
//
// 2. COSTA: se mide cuanto se aleja el campo de tierra del umbral
//    (coastD) y se dibuja un resplandor centrado justo en el borde --
//    hacia adentro y hacia afuera de la costa por igual. Un titileo
//    por celda (fijo por posicion, animado en el tiempo) le da vida
//    sin mover la linea de costa en si.
//
// 3. GRIETAS: Worley de siempre (F2-F1, la distancia al segundo punto
//    mas cercano menos la del mas cercano) -- eso da lineas finas
//    exactamente en los bordes de las celdas de Voronoi, el mismo
//    truco que "tierra seca craquelada" en cualquier generador
//    procedural. Se recortan para que solo aparezcan DENTRO de la
//    tierra.
//
// 4. ESTRELLAS: grilla fija de puntos chicos, cada uno titila a su
//    propio ritmo (fase fija por celda). Solo se ven donde no hay
//    tierra.
//
// CONTROLES
//   Speed    velocidad del titileo de costa y estrellas
//   Density  escala del mapa (pocas islas grandes <-> muchas chicas)
//   Hue      hue base (tinta del interior y de la costa)
//   Chaos    turbulencia del contorno (costas suaves <-> bien
//            fractales, con canales y penínsulas)
//   Bass     brillo de lo ya claro (audioLift) + empuje de la
//            turbulencia del contorno -- el "liquido"/noise de la costa
//            tambien baila con el bajo, acotado (nunca se dispara)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, las grietas se iluminan como venas con
//            energia -- geometria de COLOR encima, no mueve nada
//   High     no usado directo (reservado) -- la escena es
//            deliberadamente ESTABLE, meter temblor aca rompe la
//            lectura de "mapa"
//
// @D1: cuanta tierra hay (islas chicas y sueltas <-> casi todo
//      continente)
// @D2: ancho del resplandor de costa
// @D3: tamano de las celdas de las grietas (pocas y grandes <-> muchas
//      y finas)
// @D4: grosor de las grietas
// @D5: densidad de estrellas de fondo
// @D6: brillo/textura del interior
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);

    // --- TIERRA (fija, solo depende de las perillas) ---
    float scale = mix(0.55, 1.8, uDensity);
    vec2  lp = p * scale;
    // Bass: el "liquido"/noise de la costa tambien baila con el bajo --
    // pedido explicito, empuje acotado (sigue el nivel en vivo, nunca
    // se dispara solo). La silueta se sigue derivando SOLO de las
    // perillas + este empuje, nunca de uTime -- sigue siendo un mapa
    // estable, no algo que se retuerce solo con el reloj.
    float turb = 0.4 + uChaos * 1.1 + uBass * 0.9;
    vec2  warp = vec2(fbm(lp * 0.8 + 11.0, 3), fbm(lp * 0.8 + 37.0, 3)) - 0.5;
    // Frecuencia de muestreo del ruido subida bastante (1.1 -> 3.2, con
    // dos octavos mas): a la escala anterior el ruido base quedaba tan
    // abierto que se veian los cuadros de su propia grilla hash en el
    // resplandor de costa, sobre todo ampliado (bug real, encontrado
    // renderizando).
    float land = fbm(lp * 3.2 + warp * turb, 7, 0.52);

    // Piso subido bastante (0.30->0.52, techo 0.62->0.74) Y DIRECCION
    // INVERTIDA respecto del primer intento: threshold mas ALTO exige
    // mas del campo para calificar como tierra, asi que da MENOS
    // superficie, no mas -- "D1 alto = mas tierra" necesita el mix al
    // reves (bug real, encontrado renderizando: con el mix original,
    // D1=0 daba threshold bajo = CASI TODO tierra, y D1=1 daba
    // threshold alto = casi nada, exactamente al reves de lo
    // documentado).
    float threshold = mix(0.74, 0.52, uD1);
    float landMask = smoothstep(threshold - 0.015, threshold + 0.015, land);

    // --- INTERIOR ---
    vec3 landCol = hsv2rgb(vec3(fract(h0 + 0.82), 0.22, 0.58)) * (0.8 + uD6 * 0.6);
    float grain = (fbm(lp * 9.0 + 5.0, 2) - 0.5) * 0.25;
    landCol *= (1.0 + grain);

    // Oceano real, no vacio: un azul muy oscuro de fondo (en vez de
    // negro puro) detras de las estrellas, como agua profunda bajo un
    // cielo nocturno.
    vec3 col = hsv2rgb(vec3(fract(h0 + 0.55), 0.5, 0.025)) * (1.0 - landMask);
    col += landCol * landMask;

    // --- COSTA (titila, no se mueve) ---
    float coastD = land - threshold;
    float glowW = mix(0.015, 0.10, uD2);
    float coastGlow = exp(-coastD * coastD / (glowW * glowW));
    // La fase tiene que variar SUAVE en el espacio, no por celda: un
    // hash(floor(...)) le da a cada celda una fase CONSTANTE distinta,
    // y esa discontinuidad entre celdas vecinas se veia como un
    // cuadriculado de brillos parejos encima de la nube de resplandor,
    // que de por si es perfectamente suave (bug real, encontrado
    // renderizando -- floor() para un hash esta bien para "una cosa por
    // celda", pero no para modular el brillo de un campo continuo).
    float shimmerPhase = land * 40.0;
    float shimmer = 0.55 + 0.45 * sin(t * (1.0 + uSpeed * 4.5) + shimmerPhase);
    vec3  coastCol = hsv2rgb(vec3(fract(h0 + 0.38), 0.72, 1.0));
    col += coastCol * coastGlow * shimmer;
    // Bloom ancho: la costa "sangra" un halo mucho mas difuso sobre el
    // oceano, como luz real reflejando en el agua cerca de la orilla.
    float coastGlowWide = exp(-coastD * coastD / (glowW * glowW * 12.0));
    col += coastCol * coastGlowWide * shimmer * 0.15;

    // --- GRIETAS (Worley F2-F1, solo dentro de la tierra) ---
    float crackFreq = mix(3.5, 15.0, uD3);
    vec2  cg = lp * crackFreq;
    vec2  cid = floor(cg);
    float f1 = 1e5, f2 = 1e5;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            vec2 id = cid + vec2(dx, dy);
            vec2 jitter = hash22(id) - 0.5;
            vec2 site = id + 0.5 + jitter * 0.9;
            float dd = length(cg - site);
            if (dd < f1) { f2 = f1; f1 = dd; }
            else if (dd < f2) { f2 = dd; }
        }
    }
    float crackVal = f2 - f1;
    // D4 ahora es un ANCHO EN PIXELES via edgeLine() (el mismo helper
    // del header que usan scene03/scene22), no un umbral fijo en
    // unidades de 'cg': con smoothstep(0,crackW,crackVal) a secas, sin
    // escalar por fwidth(), la linea quedaba de MENOS de un pixel de
    // ancho a la frecuencia tipica -- sin antialiasing ninguno, eso se
    // ve como ruido/bloques en vez de una linea fina y prolija (bug
    // real, encontrado renderizando: coastGlow, que SI es una funcion
    // ancha y suave, salia perfecto; esta, angosta y sin fwidth, no).
    float crackLine = edgeLine(crackVal, mix(1.0, 7.0, uD4)) * landMask;
    col = mix(col, vec3(0.02, 0.015, 0.03), crackLine * 0.85);
    // Kick: las grietas se iluminan como venas con energia -- color
    // encima, no mueve ni la tierra ni las grietas en si.
    col += hsv2rgb(vec3(fract(h0 + 0.5), 0.85, 1.0)) * crackLine * uKick * 1.3;

    // --- ESTRELLAS (grilla fija, cada una titila a su ritmo) ---
    float starGrid = mix(22.0, 85.0, uD5);
    vec2  sgc = uv * starGrid;
    vec2  sid = floor(sgc);
    vec2  sf = fract(sgc) - 0.5;
    float starHash = hash21(sid + 7.0);
    float hasStar = step(0.90, starHash);
    float twinkle = 0.5 + 0.5 * sin(t * (2.0 + uSpeed * 3.0) + starHash * 40.0);
    float starDist = length(sf);
    float starMask = (1.0 - smoothstep(0.0, 0.16, starDist)) * hasStar * twinkle;
    col += vec3(starMask) * (1.0 - landMask);

    // PIANO: una chispa brillante aparece en la posicion que elige
    // uKeypos y se apaga sola (uKeypulse decae) -- color encima, no
    // toca la tierra ni las grietas.
    if (uKeypulse > 0.0015) {
        vec2  guestPos = centered(vec2(mix(0.1, 0.9, uKeypos), 0.5));
        float dG2 = dot(p - guestPos, p - guestPos);
        float spark = exp(-dG2 * 8.0) * uKeypulse * (0.8 + uKeyvel * 0.8);
        col += hsv2rgb(vec3(fract(h0 + 0.5), 0.85, 1.0)) * spark * 1.6;
    }

    // Kick: flash breve, ademas de las venas de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.55);

    col *= vignette(uv, 0.4);

    return vec4(col, 1.0);
}
