// ===============================================================
// SCENE 03 - METABALL
// 3 a 7 gotas grandes que se funden y separan. Contorno fino sobre
// negro absoluto -- nada de relleno, solo el borde donde se tocan.
// ===============================================================
//
// COMO FUNCIONA
//
// Tecnica clasica de metaballs: cada gota aporta un campo que decae con
// el cuadrado de la distancia (radio^2 / d^2). Los campos de todas las
// gotas se SUMAN en cada pixel. Donde la suma cruza un umbral, ahi esta
// el "borde" visible -- y porque los campos se suman, dos gotas cercanas
// hacen que el umbral se alcance ANTES entre ellas que en su contorno
// individual, y el borde se dobla para unirlas en una sola forma. Eso es
// la fusion, sin ningun caso especial en el codigo: sale sola de sumar.
//
// edgeLine() sobre (campo - umbral) da el contorno de ancho constante.
// edgeLine funciona aca igual de bien que sobre un sawtooth: usa fwidth(),
// que es invariante a la escala de lo que le pases.
//
// CONTROLES
//   Speed    velocidad de traslacion de las gotas
//   Density  que tan lejos del centro orbitan (spread por la pantalla)
//   Hue      color del contorno
//   Chaos    cuanto se desvian las gotas de su orbita (mas caotico el
//            movimiento)
//   Bass     brillo de lo ya claro (audioLift) + el PERIMETRO de cada
//            gota respira con los graves, ademas del movimiento de
//            orbita (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro de la posicion (excepcion del contrato)
//
// @D1: grosor del contorno
// @D2: umbral de fusion -- mas D2 = gotas mas chicas y separadas, menos
//      D2 = se funden mas facil
// @D3: cantidad de gotas (2 a 14) -- de pocas y grandes a un enjambre que
//      se funde por todos lados
// @D4: tamano de las gotas (gotitas finas <-> masas grandes que dominan
//      la pantalla)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int   n = 2 + int(floor(uD3 * 12.99));
    float field = 0.0;

    // PIANO: bola invitada -- se define ANTES del loop porque ademas de
    // fundirse ella misma con el campo (mas abajo), empuja (repele) a
    // las bolas ya existentes mientras dura el golpe: un impacto fisico
    // real, no solo una bola de mas encima. uKeypos elige el angulo,
    // uKeyvel la fuerza del empujon, uKeypulse decae solo.
    float guestAng = uKeypos * TAU;
    vec2  guestPos = vec2(cos(guestAng), sin(guestAng)) * 0.35;
    float guestPush = uKeypulse * (0.15 + uKeyvel * 0.35);

    for (int i = 0; i < 14; i++) {
        if (i >= n) break;

        float fi = float(i);
        vec2  seed = vec2(fi, fi * 3.7);

        // Density empuja el radio de orbita: mas Density = gotas repartidas
        // en mas lugares de la pantalla, no amontonadas cerca del centro.
        float orbitR = (0.15 + uDensity * 0.55) + hash21(seed) * 0.35;
        float speed = 0.08 + hash21(seed + 1.0) * 0.18 + uSpeed * 0.25;
        float phase = hash21(seed + 2.0) * 6.28;

        vec2 pos = orbitR * vec2(cos(t * speed + phase),
                                 sin(t * speed * 0.75 + phase * 1.3));

        // Chaos: las gotas se desvian de su orbita circular.
        pos += uChaos * 0.18 * vec2(sin(t * 0.35 + fi * 1.7),
                                    cos(t * 0.28 + fi * 2.1));

        // uHigh: vibracion micro de posicion -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        pos += uHigh * 0.006 * vec2(sin(t * 10.0 + fi), cos(t * 9.0 + fi));

        // Bass: un poco de movimiento de orbita ademas del brillo de mas
        // abajo -- seguro porque uBass ya llega suavizado (Fase 2).
        pos += uBass * 0.05 * vec2(sin(t * 1.4 + fi * 2.3), cos(t * 1.1 + fi * 1.9));

        // D4: tamano de las gotas -- rango amplio, de gotitas finas a
        // masas grandes que casi llenan la pantalla.
        // Bass: el PERIMETRO de cada gota respira con los graves --
        // pedido explicito del usuario ("las bolas deben bailar con los
        // bajos su perimetro"). Seguro: uBass ya llega suavizado desde
        // audio.py (Fase 2), asi que el radio crece/encoge suave, no
        // tiembla. Fase distinta por bola (fi) para que no "respiren"
        // todas exactamente igual, se ve mas organico.
        float bassPulse = 1.0 + uBass * (0.35 + 0.25 * sin(fi * 2.3));
        // Piso subido (0.05->0.13): a D4=0 las gotas quedaban tan chicas
        // que el radio de fusion (ver 'threshold' mas abajo) casi nunca
        // se alcanzaba salvo que las gotas quedaran practicamente
        // pegadas -- la fusion, que es la razon de ser de la escena, no
        // se llegaba a ver en reposo.
        // PIANO: empujon real de posicion -- las bolas cercanas a la
        // invitada se apartan mientras dura el golpe, como un choque
        // fisico de verdad (no solo una bola de mas sumada al campo).
        vec2 toGuest = pos - guestPos;
        float dGuest2ball = dot(toGuest, toGuest);
        pos += toGuest / sqrt(dGuest2ball + 0.01) * guestPush * exp(-dGuest2ball * 8.0);

        float ballSize = ((0.13 + uD4 * 0.24) + hash21(seed + 3.0) * 0.10) * bassPulse;
        float d2 = dot(p - pos, p - pos);
        field += ballSize * ballSize / (d2 + 0.0025);
    }

    // PIANO: la bola invitada misma -- temporalmente MAS GRANDE que
    // cualquier bola normal (rango de ballSize arriba llega a ~0.37
    // maximo; esta llega a 0.57), se funde de verdad con las demas
    // (se suma al mismo campo, antes del umbral). uKeypos elige el
    // angulo donde aparece, uKeypulse decae solo, uKeyvel escala tamano.
    if (uKeypulse > 0.0015) {
        float guestSize = (0.22 + uKeyvel * 0.35) * uKeypulse;
        float dGuest2 = dot(p - guestPos, p - guestPos);
        field += guestSize * guestSize / (dGuest2 + 0.0025);
    }

    float threshold = 2.5 + uD2 * 9.0;
    float contourW = 0.8 + uD1 * 3.0;
    float edge = edgeLine(field - threshold, contourW);

    float h = audioHue(uHue, uMid * 0.16);
    vec3 col = hsv2rgb(vec3(h, 0.80, 1.0)) * edge;

    // Un halo tenue justo por dentro del contorno, para que la forma se
    // lea con un poco de volumen sin llegar a ser un relleno solido.
    float inside = smoothstep(threshold - 0.5, threshold + 1.5, field);
    col += hsv2rgb(vec3(h, 0.80, 1.0)) * inside * 0.06;

    // Rim light: una banda angosta justo por dentro del contorno, tipo
    // gota de mercurio -- se enciende fuerte en el kick, como si la luz
    // rebotara en la superficie con el golpe.
    float rim = smoothstep(threshold - 0.4, threshold, field)
             * smoothstep(threshold + 2.2, threshold + 0.6, field);
    col += vec3(1.0) * rim * (0.12 + uKick * 0.9);

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
