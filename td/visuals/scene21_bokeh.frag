// ===============================================================
// SCENE 21 - LUCIERNAGAS / BOKEH
// Circulos grandes y difusos (fuera de foco a proposito), look de foto
// nocturna a apertura abierta -- la contraparte "suave" del enjambre de
// particulas nitidas de scene16.
// ===============================================================
//
// COMO FUNCIONA
// Cada "luciernaga" es un punto que deriva muy lento en un Lissajous
// chico (closed-form, sin estado), dibujado con un exp() MUY ancho (eso
// es el desenfoque de bokeh real: un circulo de confusion grande, no un
// punto nitido). Un anillo tenue justo en el borde de cada circulo da el
// fringing cromatico que se ve en el bokeh de una lente barata.
//
// CONTROLES
//   Speed    velocidad de deriva de las luciernagas
//   Density  cuantas hay
//   Hue      paleta base
//   Chaos    dispersion del enjambre (agrupado <-> repartido)
//   Bass     brillo de lo ya claro (audioLift) + algunas luciernagas
//            "respiran" mas calido con el golpe (ya suavizado)
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todo el enjambre
//   High     vibracion micro de posicion (excepcion del contrato)
//
// @D1: tamano del circulo de confusion (bokeh chico <-> muy grande y
//      difuso)
// @D2: cantidad de fringing cromatico en el borde
// @D3: velocidad del parpadeo/pulso individual de cada luciernaga
// @D4: cuantas luciernagas "respiran" mas calido con los graves
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    vec3  col = vec3(0.0);

    int n = 10 + int(floor(uDensity * 26.0));
    float h = audioHue(uHue, uMid * 0.1);

    for (int i = 0; i < 36; i++) {
        if (i >= n) break;
        float fi = float(i);
        vec2 seed = vec2(fi * 9.1, fi * 4.7);

        float spread = 0.25 + uChaos * 0.55;
        vec2 pos = (hash22(seed) - 0.5) * 2.0 * spread;
        pos += 0.15 * vec2(sin(t * (0.04 + uSpeed * 0.1 + hash21(seed) * 0.08) + fi),
                          cos(t * (0.03 + uSpeed * 0.08 + hash21(seed + 1.0) * 0.08) + fi * 1.3));
        // uHigh: vibracion micro -- excepcion del contrato.
        pos += uHigh * 0.006 * vec2(sin(t * 10.0 + fi), cos(t * 9.0 + fi));

        float size = mix(0.025, 0.09, hash21(seed + 2.0)) * (0.5 + uD1 * 1.4);
        float pulse = 0.55 + 0.45 * sin(t * (0.3 + uD3 * 1.5) + hash21(seed + 3.0) * TAU);

        // D4: cuantas respiran mas calido con los graves.
        float warmPick = step(1.0 - uD4, hash21(seed + 5.0));
        float bassBoost = 1.0 + uBass * 0.7 * warmPick;

        float d = length(p - pos);
        float bokeh = exp(-d * d / (size * size)) * pulse * bassBoost;
        vec3 fireflyCol = hsv2rgb(vec3(fract(h + hash21(seed + 6.0) * 0.18), 0.55, 1.0));
        col += fireflyCol * bokeh * 0.85;

        // Fringing cromatico: anillo tenue en el borde del circulo -- D2.
        float ring = exp(-abs(d - size * 0.9) * abs(d - size * 0.9) / (size * size * 0.12));
        col += vec3(1.0, 0.55, 0.75) * ring * pulse * uD2 * 0.5;
    }

    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.4);
    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
