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
    float ring = edgeLine(fract(r * ringFreq) - 0.5, 1.0) * 0.12;
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

        float dotSize = 0.012 + uD4 * 0.022;
        float d = length(p - blipPos);
        float dot = smoothstep(dotSize, 0.0, d) * (lit * 0.9 + 0.1);
        col += vec3(1.0, 0.9, 0.55) * dot * (1.0 + uKick * 1.3);
    }

    col += col * uKick * 0.3;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
