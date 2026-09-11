// ===============================================================
// SCENE 08 - RADAR / LUCIERNAGAS
// Un brazo de barrido gira desde el centro con estela tipo fosforo,
// iluminando "contactos" a su paso -- pero los contactos ahora son
// luces suaves que laten solas, como luciernagas, no puntos duros ni
// muñequitos pixelados. Paleta cian/azul en vez de magenta.
// ===============================================================
//
// COMO FUNCIONA
// El brazo de barrido es el angulo actual (gira con el tiempo); la
// estela sale de medir cuanto angulo hay ENTRE el barrido y cada pixel,
// yendo hacia atras, y aplicarle un exp() -- la persistencia de fosforo
// de un radar real. Los "contactos" ya NO son puntos fijos: cada uno
// deriva lento por su propia orbita/paseo (una suma de senos a fases y
// velocidades distintas por luciernaga, via hash), como un enjambre real
// que nunca esta quieto, y ademas titilan SOLOS todo el tiempo y se
// iluminan bastante mas fuerte justo cuando el brazo pasa cerca -- la
// deteccion es un PLUS sobre una vida propia, no lo unico que los
// enciende.
//
// CONTROLES
//   Speed    velocidad de giro del brazo de barrido
//   Density  cuantas luciernagas hay en pantalla
//   Hue      color del radar (cian por defecto via offset)
//   Chaos    dispersion del enjambre de luciernagas
//   Bass     brillo de lo ya claro (audioLift) + deforma el anillo de
//            rango en una onda real (pedido explicito: que se note la
//            musica en las lineas del anillo, no solo el brillo)
//   Mid      tinte adicional (audioHue) + su propio armonico de onda
//            en el anillo de rango
//   Kick     las luciernagas laten mas fuerte en el golpe
//   High     vibracion micro de posicion + tercer armonico de onda
//            en el anillo (excepcion del contrato para la posicion)
//
// @D1: cuan angosta es la ventana de deteccion del barrido (contactos
//      se prenden fuerte solo justo cuando pasa <-> en un rango amplio)
// @D2: largo de la estela de fosforo detras del brazo
// @D3: cuantos anillos de rango (ya no siempre circulos -- ver mas
//      abajo) se ven
// @D4: tamano de las luciernagas
// @D5: brillo de la estela de fosforo, incluso lejos del brazo
// @D6: brillo de los anillos de rango
// ===============================================================

// Distancia efectiva de un poligono regular de N lados, tal que a N muy
// grande se comporta como length(p) (circulo) -- pedido explicito de
// que "lo del medio" no sea siempre un circulo. Se usa esta distancia
// en vez de r para los anillos de rango: mismo patron concentrico, pero
// con facetas rectas cuando N es chico.
float polyDist(vec2 pp, float sides)
{
    float a = atan(pp.y, pp.x);
    float seg = TAU / sides;
    float a2 = mod(a + seg * 0.5, seg) - seg * 0.5;
    return length(pp) * cos(a2) / cos(seg * 0.5);
}

// Que figura toca ahora: circulo, triangulo, cuadrado, pentagono,
// hexagono -- se van turnando solas cada tanto (nunca con el audio, es
// geometria de tiempo puro, como el resto del set).
float sidesForIndex(float k)
{
    if (k < 0.5) return 60.0;
    if (k < 1.5) return 3.0;
    if (k < 2.5) return 4.0;
    if (k < 3.5) return 5.0;
    return 6.0;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);

    float sweepAng = mod(t * (0.2 + uSpeed * 0.9), TAU);

    // PIANO: el brazo SALTA de golpe hacia el angulo que elige uKeypos
    // -- geometria real del barrido, vuelve solo a su giro normal a
    // medida que uKeypulse decae.
    if (uKeypulse > 0.0015) {
        sweepAng = mod(mix(sweepAng, uKeypos * TAU, uKeypulse), TAU);
    }

    float behind = mod(sweepAng - ang, TAU);
    float trailLen = 0.3 + uD2 * 2.2;
    float trail = exp(-behind / trailLen);
    trail *= smoothstep(0.0, 0.08, behind) * 0.85 + 0.15;
    trail += exp(-behind * behind / 0.001) * 0.9;

    float h = audioHue(fract(uHue + 0.52), uMid * 0.1);
    vec3  radarCol = hsv2rgb(vec3(h, 0.65, 1.0));

    // Pantalla de radar real, no vacio: fosforo apagado de fondo.
    vec3  col = radarCol * 0.045 * (1.0 - smoothstep(0.0, 1.3, r));
    col += radarCol * trail * (0.2 + uD5 * 0.6);

    // Anillos de rango: ya no son siempre circulos -- turnan solos
    // entre circulo/triangulo/cuadrado/pentagono/hexagono cada
    // shapePeriod segundos, con un morph suave entre una figura y la
    // siguiente (nunca ligado al audio, es geometria de tiempo puro).
    float shapePeriod = 14.0;
    float shapeCyc = t / shapePeriod;
    float shapeIdx = floor(shapeCyc);
    float shapeFrac = fract(shapeCyc);
    float morphT = smoothstep(0.0, 0.2, shapeFrac) * (1.0 - smoothstep(0.8, 1.0, shapeFrac));
    float sidesA = sidesForIndex(mod(shapeIdx, 5.0));
    float sidesB = sidesForIndex(mod(shapeIdx + 1.0, 5.0));
    float rShapeA = polyDist(p, sidesA);
    float rShapeB = polyDist(p, sidesB);
    float rShape = mix(rShapeA, rShapeB, morphT);

    // Onda real de audio sobre el anillo -- tres armonicos, uno por
    // banda, asi las lineas del anillo se leen como una onda de musica
    // de verdad y no solo laten de brillo. Bounded por cada nivel de
    // audio (ya suavizado), vuelve sola a la forma limpia sin musica.
    float wave = uBass * 0.05 * sin(ang * 3.0 + t * 4.0)
               + uMid  * 0.03 * sin(ang * 7.0 - t * 3.0)
               + uHigh * 0.02 * sin(ang * 13.0 + t * 6.0);
    rShape += wave;

    float ringFreq = 2.0 + uD3 * 7.0;
    float ring = exp(-pow(fract(rShape * ringFreq) - 0.5, 2.0) * 400.0) * (0.05 + uD6 * 0.3);
    col += radarCol * ring;

    // Luciernagas: titilan solas, se prenden mas fuerte con el barrido.
    int   nFireflies = 6 + int(floor(uDensity * 20.0));
    float spread = 0.35 + uChaos * 0.5;
    for (int i = 0; i < 26; i++) {
        if (i >= nFireflies) break;
        float fi = float(i);
        vec2  seed = vec2(fi * 7.7, fi * 3.3);
        float fAng = hash21(seed) * TAU;
        float fR = spread * (0.2 + hash21(seed + 1.0) * 0.9);
        vec2  fPos = fR * vec2(cos(fAng), sin(fAng));
        // Deriva propia: cada luciernaga pasea lento (frecuencia y fase
        // por hash, distinta por bicho) en vez de quedarse fija en su
        // punto de nacimiento -- un enjambre real nunca esta quieto.
        // Amplitud contenida para no salirse de su zona del enjambre.
        vec2  driftFreq = vec2(0.05, 0.04) + hash21(seed + 5.0) * 0.08;
        vec2  driftPhase = vec2(hash21(seed + 6.0), hash21(seed + 7.0)) * TAU;
        fPos += 0.14 * vec2(sin(t * driftFreq.x + driftPhase.x + fi * 1.7),
                             cos(t * driftFreq.y + driftPhase.y + fi * 2.1));
        // uHigh: vibracion micro de posicion -- unica excepcion del
        // contrato, amplitud pequena.
        fPos += uHigh * 0.008 * vec2(sin(t * 9.0 + fi), cos(t * 7.0 + fi));

        float lifeOwn = 0.4 + 0.5 * sin(t * (0.4 + hash21(seed + 3.0) * 1.1) + fi * 3.0);

        float angDiff = mod(sweepAng - fAng + PI, TAU) - PI;
        float detectW = 0.04 + (1.0 - uD1) * 0.55;
        float detected = exp(-angDiff * angDiff / (detectW * detectW));

        float size = mix(0.02, 0.05, uD4);
        float d2 = dot(p - fPos, p - fPos);
        float glow = exp(-d2 / (size * size)) * (0.25 + lifeOwn * 0.35 + detected * 0.9);
        col += radarCol * glow * (1.0 + uKick * 1.0);
    }

    // PIANO: "nuevo contacto" -- una luciernaga nueva y grande aparece
    // en el angulo que elige uKeypos, con un anillo de alerta que se
    // expande. uKeypulse decae solo, uKeyvel escala que tan lejos esta.
    if (uKeypulse > 0.0015) {
        float newAng = uKeypos * TAU;
        float newR = 0.2 + uKeyvel * 0.6;
        vec2  newPos = newR * vec2(cos(newAng), sin(newAng));
        float dNew2 = dot(p - newPos, p - newPos);
        float newGlow = exp(-dNew2 * 40.0) * uKeypulse;
        float alertR = (1.0 - uKeypulse) * 0.25;
        float dNew = sqrt(dNew2);
        float alertRing = exp(-(dNew - alertR) * (dNew - alertR) / 0.0008) * uKeypulse;
        col += vec3(1.0, 0.5, 0.35) * (newGlow + alertRing);
    }

    col += col * uKick * 0.3;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
