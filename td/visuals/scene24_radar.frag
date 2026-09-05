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
// @D4: tamano de los contactos
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);

    float sweepAng = mod(t * (0.25 + uSpeed * 1.1), TAU);
    // Angulo hacia ATRAS del barrido (lo que ya paso) -- crece de 0 en el
    // brazo mismo hasta TAU justo antes de que vuelva a pasar.
    float behind = mod(sweepAng - ang, TAU);
    float trailLen = 0.25 + uD2 * 2.2;
    float trail = exp(-behind / trailLen);

    float h = audioHue(fract(uHue + 0.33), uMid * 0.1);
    vec3 radarCol = hsv2rgb(vec3(h, 0.75, 1.0));
    vec3 col = radarCol * trail * 0.55;

    // Anillos de rango.
    float ringFreq = 2.0 + uD3 * 7.0;
    // Brillo subido (0.12->0.18): anillos de rango un poco mas visibles.
    float ring = edgeLine(fract(r * ringFreq) - 0.5, 1.0) * 0.18;
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
