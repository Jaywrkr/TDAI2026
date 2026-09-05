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
//   Bass     brillo de lo ya claro (audioLift) + un poco de movimiento del
//            radio (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     onda expansiva -- ya llega con envolvente de golpe-y-caida
//            (audio.py)
//   High     vibracion micro del radio (excepcion del contrato)
//
// @D1: cantidad de aberracion cromatica
// @D2: grosor de los anillos
// @D3: cuantos "petalos" tiene la distorsion angular (circulos casi
//      perfectos <-> flor con muchos petalos)
// @D4: prominencia del nucleo central brillante
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
    // D3: cuantos petalos -- pocos y suaves (casi circular) <-> muchos,
    // como una flor.
    float ang = atan(p.y, p.x);
    float petals = 2.0 + uD3 * 10.0;
    float radDist = 1.0 + sin(ang * petals + t * 0.3) * uChaos * 0.15;
    float r = length(p) * radDist;

    // uHigh: vibracion micro del radio -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado desde el core.
    r += uHigh * 0.01 * sin(t * 15.0 + ang * 8.0);
    // Bass: un poco de movimiento del radio ademas del brillo de mas
    // abajo -- seguro porque uBass ya llega suavizado (Fase 2).
    r += uBass * 0.02 * sin(t * 1.8 + ang * 3.0);
    // El radio TAMBIEN respira de verdad con los bajos -- pedido
    // explicito del usuario (perimetro bailando, igual que las
    // metaballs): escala 'r' entero, asi los anillos se expanden y
    // contraen de forma notoria, no solo un temblor sutil.
    r *= 1.0 + uBass * 0.10;

    // Simplificada de nuevo a pedido del usuario: aun menos anillos por
    // defecto (freq base bajada) y mas gruesos -- el maximo de Density
    // sigue pudiendo llenar la pantalla si se quiere.
    float freq = 0.8 + uDensity * 2.6;
    float travel = t * (0.15 + uSpeed * 0.5);

    // Kick: una onda expansiva extra, mas rapida, que se superpone.
    float kickWave = uKick * 6.0;

    float aberr = 0.0010 + uD1 * 0.012;
    float ringW = 2.2 + uD2 * 3.0;

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

    // Nucleo central -- D4 controla que tan prominente es, de un tinte
    // apenas perceptible a un resplandor central notorio.
    col += tint * (0.02 + uD4 * 0.35) * exp(-r * 3.0);

    // Lens flare: un par de anillos fantasma chicos, desplazados del
    // centro sobre el eje opuesto al angulo actual -- destellan fuerte
    // en el kick, como el reflejo de una lente real.
    vec2 flarePos = -p * 0.4;
    float dFlare1 = length(p - flarePos);
    float dFlare2 = length(p - flarePos * 1.8);
    float flare = (exp(-dFlare1 * dFlare1 / 0.004) + exp(-dFlare2 * dFlare2 / 0.008) * 0.6)
                * uKick * 1.5;
    col += tint * flare;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
