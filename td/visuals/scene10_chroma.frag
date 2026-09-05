// ===============================================================
// SCENE 10 - CHROMA
// Aberracion cromatica radial sobre anillos concentricos.
// ===============================================================
//
// COMO FUNCIONA
//
// Anillos concentricos via edgeLine sobre un sawtooth radial
// (fract(radio * freq) -- mismo patron seguro que scene06/scene08: el
// zero-crossing de edgeLine queda lejos del salto del sawtooth).
//
// La aberracion cromatica sale de evaluar los anillos con un radio
// LIGERAMENTE distinto por canal: el rojo un poco mas afuera, el azul un
// poco mas adentro. Es el mismo prisma que ves en una lente barata --
// cada color de luz se refracta distinto y los bordes quedan con flecos.
//
// CONTROLES
//   Speed    los anillos viajan hacia afuera (o adentro con Speed<->tiempo)
//   Density  cuantos anillos caben (frecuencia radial)
//   Hue      color base
//   Chaos    distorsion angular de los anillos (dejan de ser circulos
//            perfectos)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     onda expansiva: un anillo extra se dispara hacia afuera
//   High     vibracion micro del radio (excepcion del contrato)
//
// @D1: cantidad de aberracion cromatica
// @D2: grosor de los anillos
//
// SIMPLIFICADA: menos anillos por defecto (mas grandes y separados),
// mas gruesos, y con menos fleco cromatico en reposo -- se veia
// demasiado ocupada con muchos anillos finos a la vez.
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Distorsion angular: los anillos dejan de ser circulos perfectos.
    float ang = atan(p.y, p.x);
    float radDist = 1.0 + sin(ang * 5.0 + t * 0.3) * uChaos * 0.15;
    float r = length(p) * radDist;

    // uHigh: vibracion micro del radio -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado desde el core.
    r += uHigh * 0.01 * sin(t * 15.0 + ang * 8.0);

    // Aun mas simplificada: menos anillos todavia (2 a 5), mas gruesos, y
    // menos fringing por defecto.
    float freq = 1.2 + uDensity * 3.2;
    float travel = t * (0.15 + uSpeed * 0.5);

    // Kick: una onda expansiva extra, mas rapida, que se superpone.
    float kickWave = uKick * 6.0;

    float aberr = 0.0015 + uD1 * 0.014;
    float ringW = 1.8 + uD2 * 3.0;

    // Cada canal evalua el patron de anillos con un radio propio.
    float rR = r + aberr;
    float rG = r;
    float rB = r - aberr;

    float cR = edgeLine(fract(rR * freq - travel + kickWave) - 0.5, ringW);
    float cG = edgeLine(fract(rG * freq - travel + kickWave) - 0.5, ringW);
    float cB = edgeLine(fract(rB * freq - travel + kickWave) - 0.5, ringW);

    float h = audioHue(uHue, uMid * 0.16);
    vec3 tint = hsv2rgb(vec3(h, 0.15, 1.0));

    // El color de cada canal es su propia intensidad de anillo, teñido
    // levemente por Hue -- asi se ve la separacion prismatica en vez de
    // un solo color plano.
    vec3 col = vec3(cR, cG, cB) * tint;

    // Nucleo central tenue, para que no quede un agujero negro en el medio.
    col += tint * 0.06 * exp(-r * 3.0);

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
