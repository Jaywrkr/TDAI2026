// ===============================================================
// SCENE - COSTAS HORIZONTALES
// Varias lineas horizontales onduladas, como el perfil de una costa
// visto de lejos, apiladas una sobre otra -- ninguna es recta ni fija,
// cada una ondula con su propia frecuencia y fase. Brillan mas fuerte
// con el bajo, y el angulo/ola de cada linea se mueve con los medios y
// los agudos.
// ===============================================================
//
// COMO FUNCIONA
// Cada linea i tiene una altura base (repartida pareja en la pantalla)
// y una forma que sale de sumar dos senos a distinta frecuencia -- una
// silueta de costa simple, no ruido. La fase de esa ola avanza con el
// tiempo (Speed) y se le suma un empuje chico de Mid/High, asi el
// movimiento tambien responde a la musica, no solo a un reloj.
//
// CONTROLES
//   Speed    velocidad de la ola de cada costa
//   Density  cuantas lineas de costa hay
//   Hue      color base
//   Chaos    cuanto se deforma la ola (suave <-> bien accidentada)
//   Bass     brillo de lo ya claro (audioLift) + las costas brillan
//            mas fuerte de verdad, no solo con audioLift
//   Mid      empuja el angulo/fase de la ola (geometria real, acotada)
//   Kick     destello breve en todas las costas
//   High     empuja la frecuencia de la ola (geometria real, acotada)
//
// @D1: grosor de cada linea
// @D2: amplitud de la ola (casi recta <-> bien ondulada)
// @D3: frecuencia base de la ola
// @D4: separacion entre lineas (juntas <-> bien repartidas)
// @D5: cantidad de resplandor (glow) debajo de cada linea
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float nLines = 5.0 + floor(uDensity * 10.99);
    float spread = mix(0.35, 1.5, uD4);

    float h = audioHue(uHue, uMid * 0.06);
    vec3  col = vec3(0.0);

    float lineW = 0.006 + uD1 * 0.02;
    float amp = 0.04 + uD2 * 0.22;
    float freqBase = 1.0 + uD3 * 3.5;
    // Mid/High empujan geometria real (angulo/frecuencia de la ola),
    // acotado -- ya llegan suavizados desde audio.py, no tiemblan.
    float angPush = uMid * 0.6;
    float freqPush = 1.0 + uHigh * 0.8;

    for (int i = 0; i < 16; i++) {
        if (i >= int(nLines)) break;
        float fi = float(i);
        vec2  seed = vec2(fi * 5.3 + 2.0, fi * 2.1 + 7.0);
        float rowY = mix(-0.85, 0.85, (fi + 0.5) / nLines) * spread;

        float freq = (freqBase + hash21(seed) * 1.5) * freqPush;
        float speed = 0.15 + uSpeed * 0.9;
        float phase = t * speed * (0.5 + hash21(seed + 1.0)) + hash21(seed + 2.0) * TAU + angPush;

        float wobble = sin(p.x * freq + phase) * 0.6
                     + sin(p.x * freq * 1.9 - phase * 0.7) * 0.4;
        float y = rowY + wobble * amp * (0.4 + uChaos * 1.2);

        float d = p.y - y;
        float core = edgeLine(d, lineW);
        float glow = exp(-d * d / (0.001 + uD5 * 0.02));

        vec3  lineCol = hsv2rgb(vec3(fract(h + fi * 0.05), 0.6, 1.0));
        // Bass: brillo real de la linea, ademas del audioLift general.
        float shine = 1.0 + uBass * 1.2;
        col += lineCol * (core + glow * 0.5) * shine;
    }

    col *= 0.5 + uD6 * 0.8;

    // PIANO: una costa invitada, brillante, cruza toda la pantalla a
    // la altura que elige uKeypos.
    if (uKeypulse > 0.0015) {
        float gy = mix(-0.85, 0.85, uKeypos) * spread;
        float d = p.y - gy;
        float glow = exp(-d * d / 0.002);
        col += vec3(1.0) * glow * uKeypulse * (0.6 + uKeyvel * 1.0);
    }

    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
