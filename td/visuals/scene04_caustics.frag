// ===============================================================
// SCENE 04 - CAUSTICS
// Red de luz ondulando, como el fondo de una piscina al sol.
// ===============================================================
//
// COMO FUNCIONA
//
// Tecnica clasica y barata: se avanza un punto en varias iteraciones,
// desplazandolo cada vez con un seno cruzado (x mueve segun y, y mueve
// segun x), y en cada iteracion se suma el brillo de
// 1 / (1 + K * |sin(x)*sin(y)|) -- eso da picos de brillo finos donde los
// senos casi se anulan, que es exactamente el tipo de red de luz fina
// que se ve en el fondo de una piscina. Nada de fbm: es la tecnica mas
// barata de todo el set, puro seno y coseno.
//
// CONTROLES
//   Speed    velocidad de la ondulacion
//   Density  escala del patron (mas Density = red mas fina)
//   Hue      color de la luz
//   Chaos    intensidad del desplazamiento entre iteraciones -- mas
//            Chaos = patron mas retorcido
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro de fase (excepcion del contrato)
//
// @D1: contraste / brillo general de la red de luz
// @D2: cuantas iteraciones se acumulan (mas D2 = red mas compleja)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv) * (1.0 + uDensity * 2.5);

    float v = 0.0;
    vec2  q = p;
    float amp = 0.4 + uChaos * 0.6;
    float speed = 0.4 + uSpeed * 0.7;

    int layers = 2 + int(floor(uD2 * 2.99));

    for (int i = 0; i < 4; i++) {
        if (i >= layers) break;

        float fi = float(i);
        q += amp * vec2(sin(q.y * 2.3 + t * speed + fi * 1.9),
                        cos(q.x * 2.1 + t * speed * 0.8 + fi * 2.7));

        v += 1.0 / (1.0 + 9.0 * abs(sin(q.x * 1.6) * sin(q.y * 1.6)));
    }

    // uHigh: vibracion micro de fase -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    v += uHigh * 0.03 * sin(t * 16.0 + p.x * 4.0);

    // Rango bajado (era 0.4-1.4): se veia demasiado claro/lavado con
    // valores por defecto -- D1 sigue teniendo el mismo rol, solo que
    // el techo y el piso son mas oscuros.
    float contrast = 0.22 + uD1 * 0.70;
    v *= contrast;

    float h = audioHue(uHue, uMid * 0.05);
    vec3 col = hsv2rgb(vec3(h, 0.55, 1.0)) * v;

    // Tonemap: v puede crecer bastante en los picos, sin esto se clavan
    // en blanco plano.
    col = col / (1.0 + col);

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.3);

    return vec4(col, 1.0);
}
