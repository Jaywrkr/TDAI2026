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
//   Bass     brillo de lo ya claro (audioLift) + un poco de movimiento del
//            desplazamiento (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro de fase (excepcion del contrato)
//
// @D1: contraste / brillo general de la red de luz
// @D2: cuantas iteraciones se acumulan (mas D2 = red mas compleja)
// @D3: finura de la red (pocas celdas anchas <-> red muy fina y apretada)
// @D4: nitidez de los filamentos (glow difuso <-> lineas de luz muy finas)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv) * (1.0 + uDensity * 2.5);

    float v = 0.0;
    vec2  q = p;
    float amp = 0.4 + uChaos * 0.6;
    float speed = 0.4 + uSpeed * 0.7;

    // Bajado el default (era 2+floor(D2*2.99), minimo 2 capas siempre) --
    // a pedido del usuario, salia "mucha cosa" de entrada. Ahora arranca
    // en 1 capa (D2=0, minimalista) y llega a 4 en D2=1.
    int layers = 1 + int(floor(uD2 * 3.99));

    // D3: finura de la red -- escala la frecuencia de los senos que forman
    // la trama de luz. Rango amplio: celdas anchas <-> red muy apretada.
    // Respira con los bajos (uBass ya suavizado, Fase 2) -- la red se ve
    // "latir" mas tupida/floja con la musica, no solo mas brillante.
    float netFreq = (0.8 + uD3 * 2.6) * (1.0 + uBass * 0.18);
    // D4: nitidez de los filamentos -- que tan afilados son los picos de
    // brillo. Bajo = resplandor difuso y ancho, alto = lineas muy finas.
    float sharpness = 3.0 + uD4 * 30.0;

    for (int i = 0; i < 4; i++) {
        if (i >= layers) break;

        float fi = float(i);
        q += amp * vec2(sin(q.y * 2.3 + t * speed + fi * 1.9 + uBass * 0.4),
                        cos(q.x * 2.1 + t * speed * 0.8 + fi * 2.7 + uBass * 0.3));

        float layerV = 1.0 / (1.0 + sharpness * abs(sin(q.x * netFreq) * sin(q.y * netFreq)));

        // Cada capa "baila" con su PROPIA frecuencia/fase de onda (fi
        // desfasa cada una) -- pedido explicito de que se note frecuencia
        // en cada linea, no un solo brillo subiendo/bajando parejo en
        // toda la pantalla junto.
        float layerWave = sin(q.x * 1.8 + q.y * 1.3 - t * (1.0 + uSpeed * 2.0) + fi * 2.6);
        v += layerV * (1.0 + layerWave * 0.45);
    }

    // uHigh: vibracion micro de fase -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    v += uHigh * 0.03 * sin(t * 16.0 + p.x * 4.0);

    // Rango bajado (era 0.4-1.4): se veia demasiado claro/lavado con
    // valores por defecto -- D1 sigue teniendo el mismo rol, solo que
    // el techo y el piso son mas oscuros.
    // Piso subido (0.22->0.34): se veia medio "barroso"/lavado en reposo.
    float contrast = 0.34 + uD1 * 0.58;
    v *= contrast;

    // Dispersion tipo prisma: el hue se desvia un poco segun el brillo
    // local -- barato (sin recalcular la red 3 veces por canal), pero da
    // el mismo fringing de arcoiris que un prisma real separando colores
    // por intensidad.
    float h = audioHue(uHue, uMid * 0.16);
    float hueDisp = fract(h + v * 0.12);
    vec3 col = hsv2rgb(vec3(hueDisp, 0.55, 1.0)) * v;

    // Tonemap: v puede crecer bastante en los picos, sin esto se clavan
    // en blanco plano.
    col = col / (1.0 + col);

    // PIANO: onda de choque circular cruza toda la red desde el centro
    // en cada tecla, iluminando lo que toca a su paso -- uKeypulse decae
    // solo (el radio del frente avanza mientras dura el pulso), uKeypos
    // tiñe la onda, uKeyvel escala su brillo.
    if (uKeypulse > 0.0015) {
        float waveR = (1.0 - uKeypulse) * 1.8;
        float dWave = abs(length(p) - waveR);
        float shock = exp(-dWave * dWave / 0.002) * uKeypulse * (0.6 + uKeyvel * 1.4);
        col += hsv2rgb(vec3(fract(uKeypos), 0.4, 1.0)) * shock;
    }

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.3);

    return vec4(col, 1.0);
}
