// ===============================================================
// SCENE - ANILLOS DE NEON
// Anillos concentricos que laten y se expanden desde el centro, como
// ondas en el agua pero de neon -- nuevos anillos nacen solos con el
// tiempo, y el golpe de graves dispara uno extra, bien brillante.
// ===============================================================
//
// COMO FUNCIONA
// r es el radio de cada pixel. Se le resta un "reloj" que avanza con
// el tiempo (Speed) y se aplica fract() -- eso da anillos que se
// expanden para siempre sin llevar la cuenta de cuantos ya nacieron.
// Kick dispara un anillo EXTRA e independiente, que nace en r=0 y se
// expande una sola vez con la propia envolvente de uKick.
//
// CONTROLES
//   Speed    velocidad a la que se expanden los anillos
//   Density  cuantos anillos entran a la vez (separados <-> muy juntos)
//   Hue      color base
//   Chaos    cuanto se deforma el circulo (perfecto <-> ondulado)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     dispara un anillo de choque extra desde el centro
//   High     vibracion micro del radio (excepcion del contrato)
//
// @D1: grosor de los anillos
// @D2: cantidad de resplandor (glow) alrededor de cada anillo
// @D3: brillo del nucleo central
// @D4: cuanto se desvanecen los anillos al alejarse del centro
// @D5: amplitud de la ondulacion (junto con Chaos)
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);

    float wobble = sin(ang * 5.0 + t * 0.3) * uChaos * uD5 * 0.08;
    float rr = r + wobble;
    rr += uHigh * 0.006 * sin(t * 12.0 + ang * 8.0);

    float speed = 0.06 + uSpeed * 0.5;
    float freq = mix(3.0, 14.0, uDensity);
    float ringPhase = fract(rr * freq - t * speed * freq);
    float ringD = abs(ringPhase - 0.5) * 2.0 - 1.0;

    float lineW = 0.05 + uD1 * 0.35;
    float core = 1.0 - smoothstep(0.0, lineW, abs(ringD));
    float glowW = 0.05 + uD2 * 0.5;
    float glow = exp(-ringD * ringD / (glowW * glowW));

    float fade = 1.0 - smoothstep(0.2, 1.3, r * (0.4 + uD4 * 1.2));

    float h = audioHue(uHue, uMid * 0.10);
    vec3  ringCol = hsv2rgb(vec3(h, 0.6, 1.0));
    vec3  col = ringCol * (core * 1.3 + glow * 0.6) * fade;

    vec3  coreCol = hsv2rgb(vec3(fract(h + 0.5), 0.5, 1.0));
    col += coreCol * exp(-r * r * 6.0) * (0.3 + uD3 * 0.9);

    col *= 0.5 + uD6 * 0.8;

    // Kick: anillo de choque extra, nace en el centro y se expande una
    // sola vez -- usa la propia envolvente de uKick (empuje acotado,
    // la excepcion documentada del contrato).
    float shockR = (1.0 - uKick) * 1.3;
    float shockD = abs(r - shockR);
    float shock = exp(-shockD * shockD / 0.001) * uKick;
    col += vec3(1.0) * shock;

    // PIANO: un anillo de acento, en el color que elige uKeypos, nace
    // y se expande solo con cada tecla.
    if (uKeypulse > 0.0015) {
        float guestR = (1.0 - uKeypulse) * 1.1;
        float dG = abs(r - guestR);
        float guestRing = exp(-dG * dG / 0.0015) * uKeypulse * (0.6 + uKeyvel * 0.8);
        col += hsv2rgb(vec3(fract(uKeypos), 0.6, 1.0)) * guestRing;
    }

    col = audioLift(col, uBass * 0.6);
    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
