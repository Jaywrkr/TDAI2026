// ===============================================================
// SCENE 00 - PULSO (EKG)
// Reemplaza al codigo de barras: una linea de electrocardiograma que
// se desplaza sola, con un pico (P-QRS-T) que se repite a un ritmo
// constante, con ecos de fosforo detras -- organica, con glow, paleta
// fria, siguiendo el mismo criterio que las escenas ya "perfectas" del
// set (veins, ripple, flow...).
// ===============================================================
//
// COMO FUNCIONA
// La linea es una forma de onda fija (tres rampas: onda P chica, pico
// QRS alto, onda T invertida) evaluada en una coordenada X que se
// desplaza con el tiempo -- no hay puntos, es una funcion continua de
// X dibujada con un exp() de distancia vertical (mismo truco que
// scene20_filamentos). Varias copias mas tenues y demoradas detras dan
// la persistencia de fosforo de un monitor real.
//
// CONTROLES
//   Speed    velocidad de desplazamiento de la linea
//   Density  cuantos latidos entran en pantalla (ritmo cardiaco)
//   Hue      color base de la linea
//   Chaos    irregularidad del ritmo (parejo <-> arritmia visible)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     el pico del latido se dispara mas alto un instante
//   High     vibracion micro de la linea (excepcion del contrato)
//
// @D1: altura del pico principal (QRS)
// @D2: grosor del nucleo de la linea
// @D3: cantidad de resplandor (glow) alrededor de la linea
// @D4: cuantos ecos de fosforo quedan detras (persistencia)
// @D5: ancho de las ondas secundarias (P y T)
// @D6: ganancia general antes del brillo de audio
// ===============================================================

float ekgWave(float x, float peakH, float secW) {
    float cyc = fract(x);
    float w = 0.0;
    float pEnd = 0.44 + secW * 0.03;
    w += smoothstep(0.38, 0.41, cyc) * smoothstep(pEnd, 0.41, cyc) * 0.12;
    w += smoothstep(0.48, 0.50, cyc) * smoothstep(0.56, 0.50, cyc) * peakH;
    float tEnd = 0.62 + secW * 0.06;
    w -= smoothstep(0.58, 0.60, cyc) * smoothstep(tEnd, 0.60, cyc) * 0.22;
    return w;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    // Offset +0.5: default cian (Hue arranca en 0) en vez de rojo,
    // coherente con la paleta fria del resto del set.
    float h = audioHue(fract(uHue + 0.5), uMid * 0.12);

    float rate = mix(0.6, 2.4, uDensity);
    float scroll = t * (0.3 + uSpeed * 1.2);

    // D1: altura del pico, con un empujon de Kick -- bounded, decae
    // solo porque uKick ya trae su propia envolvente.
    float peakH = (0.7 + uD1 * 0.9) * (1.0 + uKick * 0.6);
    float secW = 0.3 + uD5 * 1.4;

    vec3 col = vec3(0.0);
    // D4: cantidad de ecos de fosforo detras de la linea principal.
    int nEchoes = 1 + int(floor(uD4 * 4.99));
    for (int i = 0; i < 5; i++) {
        if (i >= nEchoes) break;
        float fi = float(i);
        float lag = fi * 0.35;
        float x = (p.x + scroll - lag) * rate * 0.5;
        // Chaos: irregularidad del ritmo -- jitter de fase por ciclo.
        float cycIdx = floor(x);
        float jitter = (hash21(vec2(cycIdx, fi)) - 0.5) * uChaos * 0.35;
        float wy = ekgWave(x + jitter, peakH, secW) * 0.55;
        // uHigh: vibracion micro -- unica excepcion del contrato,
        // amplitud pequena, ya suavizado.
        wy += uHigh * 0.01 * sin(t * 14.0 + fi);
        float d = abs(p.y - wy);
        float core = exp(-d * d / (0.0004 + uD2 * 0.0016));
        float glow = exp(-d * d / (0.004 + uD3 * 0.05)) * (0.3 + uD3 * 0.7);
        float fade = 1.0 / (1.0 + fi * 1.6);
        col += hsv2rgb(vec3(fract(h), 0.55, 1.0)) * (core + glow * 0.6) * fade;
    }

    // PIANO: un latido invitado aparece en la posicion X que elige
    // uKeypos, con su propio pico agudo, y se apaga solo con
    // uKeypulse. uKeyvel escala el brillo.
    if (uKeypulse > 0.0015) {
        float gx = (uKeypos - 0.5) * 3.2;
        float d = abs(p.x - gx);
        float spike = exp(-d * d * 30.0) * uKeypulse * (0.6 + uKeyvel * 1.0);
        col += hsv2rgb(vec3(fract(h + 0.5), 0.6, 1.0)) * spike;
    }

    // Kick: flash breve, ademas del pico mas alto de arriba.
    col += col * uKick * 0.25;

    // D6: ganancia general, antes del brillo de audio.
    col *= 0.6 + uD6 * 0.8;

    col = audioLift(col, uBass * 0.6);
    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
