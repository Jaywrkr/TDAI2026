// ===============================================================
// SCENE 24 - RADAR / SONAR
// Un brazo de barrido gira desde el centro con estela tipo fosforo (como
// un radar/sonar militar real), iluminando "contactos" (blips) dispersos
// por la pantalla a su paso.
// ===============================================================
//
// COMO FUNCIONA
// El brazo de barrido es simplemente el angulo actual (gira con el
// tiempo); la estela sale de medir cuanto angulo hay ENTRE el barrido y
// cada pixel, yendo hacia atras (en la direccion de la que el barrido ya
// paso), y aplicarle un exp() -- eso es exactamente como se ve la
// persistencia de fosforo de un radar real. Los "contactos" son puntos
// fijos (hash) que solo se iluminan de verdad cuando el brazo pasa cerca
// de su angulo.
//
// MUÑEQUITOS 8BIT: ademas de los contactos-punto, unos pocos "blips" son
// figuritas pixeladas de 8x6 celdas que bailan -- pedido explicito de
// "que no sea tan sencillo". Cada sprite es un bitmask fijo por fila (un
// entero 0-255 = que celdas de esa fila estan prendidas), con DOS frames
// que alternan en el tiempo (spriteRow()); drawSprite() convierte la
// posicion del pixel en una celda del grid y consulta ese bit -- todo
// binario, sin antialiasing entre celdas, a proposito (asi se ve
// pixelado de verdad, no una figura suavizada). Se mueven en un vaiven
// (sway) mas un salto vertical (bob), ambos atados a Speed, como si
// bailaran al ritmo del barrido.
//
// CONTROLES
//   Speed    velocidad de giro del brazo de barrido
//   Density  cuantos contactos hay en pantalla
//   Hue      color del radar (verde militar por defecto via offset)
//   Chaos    no usado directo (reservado)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     los contactos "laten" mas fuerte en el golpe
//   High     no usado directo (reservado)
//
// @D1: cuan angosta es la ventana de deteccion (contactos se prenden
//      solo justo cuando pasa el barrido <-> se prenden en un rango
//      angular mas amplio)
// @D2: largo de la estela de fosforo detras del brazo
// @D3: cuantos anillos de rango (circulos concentricos) se ven
// @D4: tamano de los contactos (tambien escala un poco el tamano de los
//      muñequitos 8bit, son parte de la misma familia "puntos en el radar")
// @D5: brillo de la estela de fosforo, incluso lejos del brazo
// @D6: brillo de los anillos de rango
// ===============================================================

// Bit 'col' (0 = izquierda) de una fila de 8 bits codificada como un
// numero 0..255 -- asi cada fila del sprite es UN float, no un array.
float spriteBit(float rowBits, float col)
{
    float shift = pow(2.0, 7.0 - col);
    return mod(floor(rowBits / shift), 2.0);
}

// Dos frames de un muñequito de 8 (ancho) x 6 (alto) celdas -- frame A:
// brazos bien abiertos, piernas juntas; frame B: brazos abajo, piernas
// bien abiertas. Alternar entre las dos da el "paso" de baile. 'frame'
// tiene que ser exactamente 0.0 o 1.0 (nunca algo entre medio: mix()
// entre dos bitmasks NO tiene sentido como imagen si se interpola).
float spriteRow(int row, float frame)
{
    float rowsA[6];
    rowsA[0] = 60.0;  rowsA[1] = 60.0;  rowsA[2] = 126.0;
    rowsA[3] = 255.0; rowsA[4] = 60.0;  rowsA[5] = 102.0;
    float rowsB[6];
    rowsB[0] = 60.0;  rowsB[1] = 60.0;  rowsB[2] = 60.0;
    rowsB[3] = 60.0;  rowsB[4] = 126.0; rowsB[5] = 195.0;
    return mix(rowsA[row], rowsB[row], frame);
}

// 1.0 si 'p' cae sobre una celda prendida del sprite centrado en 'pos',
// 0.0 si no -- binario a proposito, sin smoothstep entre celdas, para
// que se vea pixelado de verdad.
float drawSprite(vec2 p, vec2 pos, float cellSize, float frame)
{
    vec2 local = (p - pos) / cellSize;
    if (abs(local.x) >= 4.0 || abs(local.y) >= 3.0) return 0.0;
    float col = floor(local.x + 4.0);
    int   row = int(floor(3.0 - local.y));
    return spriteBit(spriteRow(row, frame), col);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);

    float sweepAng = mod(t * (0.25 + uSpeed * 1.1), TAU);

    // PIANO: el brazo SALTA de golpe hacia el angulo que elige uKeypos
    // -- geometria real del barrido (no un blip nuevo aparte), como si
    // el radar detectara algo y girara hacia alla de inmediato. Vuelve
    // solo a su giro normal a medida que uKeypulse decae.
    if (uKeypulse > 0.0015) {
        sweepAng = mod(mix(sweepAng, uKeypos * TAU, uKeypulse), TAU);
    }

    // Angulo hacia ATRAS del barrido (lo que ya paso) -- crece de 0 en el
    // brazo mismo hasta TAU justo antes de que vuelva a pasar.
    float behind = mod(sweepAng - ang, TAU);
    float trailLen = 0.25 + uD2 * 2.2;
    // El barrido tenia el borde de ataque DURO (un corte recto), que es
    // lo unico que delataba que era una cuna dibujada y no fosforo
    // encendiendose. El brazo real tiene un frente brillante y angosto
    // que se desvanece hacia atras.
    float trail = exp(-behind / trailLen);
    trail *= smoothstep(0.0, 0.05, behind) * 0.85 + 0.15;
    trail += exp(-behind * behind / 0.0006) * 0.9;   // frente del brazo

    float h = audioHue(fract(uHue + 0.33), uMid * 0.1);
    vec3 radarCol = hsv2rgb(vec3(h, 0.75, 1.0));

    // Pantalla de radar real: un verde de fosforo apagado de fondo (nunca
    // negro puro) mas una vinieta de tubo mas marcada -- lo que separa
    // "un brazo verde sobre negro" de "una consola encendida".
    vec3 col = radarCol * 0.045 * (1.0 - smoothstep(0.0, 1.3, r));
    col += radarCol * trail * (0.25 + uD5 * 0.7);

    // Anillos de rango.
    float ringFreq = 2.0 + uD3 * 7.0;
    // Brillo subido (0.12->0.18): anillos de rango un poco mas visibles.
    float ring = edgeLine(fract(r * ringFreq) - 0.5, 1.0) * (0.06 + uD6 * 0.4);
    col += radarCol * ring;

    // Contactos: puntos fijos que se prenden cuando el barrido pasa cerca.
    int nBlips = 6 + int(floor(uDensity * 16.0));
    for (int i = 0; i < 24; i++) {
        if (i >= nBlips) break;
        float fi = float(i);
        vec2 seed = vec2(fi * 7.7, fi * 3.3);
        float blipAng = hash21(seed) * TAU;
        float blipR = 0.15 + hash21(seed + 1.0) * 0.72;
        vec2 blipPos = blipR * vec2(cos(blipAng), sin(blipAng));

        float angDiff = mod(sweepAng - blipAng + PI, TAU) - PI;
        float detectW = 0.03 + (1.0 - uD1) * 0.5;
        float lit = exp(-angDiff * angDiff / (detectW * detectW));

        // Piso subido (0.012->0.018): contactos un poco mas visibles.
        float dotSize = 0.018 + uD4 * 0.018;
        float d = length(p - blipPos);
        float dot = smoothstep(dotSize, 0.0, d) * (lit * 0.9 + 0.1);
        col += vec3(1.0, 0.9, 0.55) * dot * (1.0 + uKick * 1.3);
    }

    // MUÑEQUITOS 8BIT bailando -- "que no sea tan sencillo". Reparte
    // unos pocos por la pantalla (atado a Density, igual que los
    // contactos), cada uno con su propio vaiven (sway) y salto (bob)
    // atados a Speed, y su propio desfasaje de baile (fs*1.7) para que
    // no bailen todos exactamente en sincronia.
    int nDancers = 3 + int(floor(uDensity * 3.99));
    float danceRate = 2.2 + uSpeed * 3.0;
    float cellSize = 0.026 + uD4 * 0.012;
    for (int s = 0; s < 6; s++) {
        if (s >= nDancers) break;
        float fs = float(s);
        vec2 sSeed = vec2(fs * 13.7 + 5.0, fs * 8.3 + 2.0);
        vec2 basePos = vec2((hash21(sSeed) - 0.5) * 1.5, (hash21(sSeed + 1.0) - 0.5) * 1.0);
        float sway = sin(t * danceRate * 0.5 + fs * 3.3) * 0.10;
        float bob = abs(sin(t * danceRate + fs * 2.1)) * 0.05;
        vec2 spritePos = basePos + vec2(sway, bob);
        float frame = mod(floor(t * danceRate + fs * 1.7), 2.0);
        float sPix = drawSprite(p, spritePos, cellSize, frame);
        col += radarCol * sPix * 1.3 * (0.7 + uKick * 0.6);
    }

    // PIANO: "nuevo contacto" -- un blip nuevo aparece en el angulo que
    // elige uKeypos, con un anillo de alerta que se expande y avisa.
    // uKeypulse decae solo, uKeyvel escala que tan lejos esta el blip.
    if (uKeypulse > 0.0015) {
        float newBlipAng = uKeypos * TAU;
        float newBlipR = 0.2 + uKeyvel * 0.6;
        vec2 newBlipPos = newBlipR * vec2(cos(newBlipAng), sin(newBlipAng));
        float dNew = length(p - newBlipPos);
        float newDot = smoothstep(0.02, 0.0, dNew) * uKeypulse;
        float alertR = (1.0 - uKeypulse) * 0.25;
        float alertRing = exp(-(dNew - alertR) * (dNew - alertR) / 0.0008) * uKeypulse;
        col += vec3(1.0, 0.3, 0.25) * (newDot + alertRing);
    }

    col += col * uKick * 0.3;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
