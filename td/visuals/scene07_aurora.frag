// ===============================================================
// SCENE 07 - AURORA
// Cortinas de luz que ondulan y derivan, con glow -- como una aurora
// boreal. Reemplaza a la vieja "spectrum" (bandas rectas de barrido de
// hue completo, demasiado grafica): misma familia organica que flow.
// ===============================================================
//
// COMO FUNCIONA
//
// Misma estructura de base que scene05_flow (N curvas independientes,
// cada una doblada por un fbm evaluado en su posicion), pero DOS
// diferencias clave: las curvas son VERTICALES en vez de horizontales, y
// en vez de edgeLine() (borde nitido de ancho constante) se usa una
// gaussiana (exp(-d*d/w*w)) -- eso da un resplandor ancho y difuso, sin
// ningun borde duro, que es la diferencia entre "linea" y "cortina de
// luz". Cada cortina ademas respira en brillo con un seno lento a lo
// largo de Y, para que no se lea como un tubo de neon parejo.
//
// Los hues de las cortinas son offsets CHICOS sobre Hue (no un barrido
// completo como el viejo spectrum) -- multicolor pero contenido.
//
// CONTROLES
//   Speed    velocidad de la ondulacion vertical de cada cortina
//   Density  cuantas cortinas hay (2 a 5)
//   Hue      hue base; las demas cortinas son offsets chicos sobre este
//   Chaos    cuanto se dobla cada cortina (turbulencia horizontal)
//   Bass     brillo de lo ya claro (audioLift) + el ANGULO de las
//            cortinas se inclina con los graves (shear), ademas del
//            doblez (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro del doblez (excepcion del contrato)
//
// @D1: ancho/intensidad del resplandor (ancho y tenue <-> angosto e
//      intenso)
// @D2: separacion entre cortinas
// @D3: frecuencia de la respiracion de brillo a lo largo de cada cortina
//      (ondas grandes y lentas <-> muchas y rapidas)
// @D4: dispersion de color entre cortinas (casi monocromo <-> arcoiris)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float count = 2.0 + floor(uDensity * 3.99);
    float spacing = (0.5 + uD2 * 1.0) * 2.4 / (count + 1.0);
    // Rango bajado (era 0.09-0.33): a pedido del usuario, cortinas mucho
    // mas finas por defecto -- D1 sigue yendo de fino a ancho, solo que
    // todo el rango es mas contenido.
    float glowW = 0.035 + (1.0 - uD1) * 0.13;

    vec3 col = vec3(0.0);
    float h0 = audioHue(uHue, uMid * 0.16);

    // Bass: el ANGULO de las cortinas se inclina con los graves (shear
    // horizontal proporcional a Y) -- pedido explicito del usuario. Es
    // geometria, pero uBass ya llega bien suavizado (Fase 2) y el shear
    // es continuo/acotado, no un salto -- se ve como que la aurora entera
    // se "peina" hacia un lado con el bajo, no como temblor.
    float bassShear = uBass * 0.45;

    // Bucle de conteo fijo con corte temprano: nunca mas de 6 cortinas.
    for (int i = 0; i < 6; i++) {
        if (i >= int(count)) break;

        float fi = float(i);
        float baseX = -1.2 + spacing * (fi + 1.0);

        vec2 samp = vec2(baseX * 1.4 + fi * 3.7, p.y * 0.5)
                     + vec2(0.0, t * (0.03 + uSpeed * 0.10));
        float bend = (fbm(samp, 4) - 0.5) * (0.6 + uChaos * 1.6);

        // uHigh: vibracion micro del doblez -- unica excepcion del
        // contrato, amplitud pequena, ya suavizado.
        bend += uHigh * 0.01 * sin(t * 9.0 + fi);
        // Bass: un poco de movimiento del doblez ademas del brillo de mas
        // abajo -- seguro porque uBass ya llega suavizado (Fase 2).
        bend += uBass * 0.05 * sin(t * 1.3 + fi * 1.9);

        float dx = (p.x - p.y * bassShear) - (baseX + bend);
        float curtain = exp(-dx * dx / (glowW * glowW));

        // Respiracion suave de brillo a lo largo de la cortina -- sin
        // esto se ve como un tubo de neon parejo, con esto se lee como
        // luz viva. D3: frecuencia -- ondas grandes y lentas <-> muchas
        // y rapidas.
        float breatheFreq = 0.5 + uD3 * 4.0;
        curtain *= 0.7 + 0.3 * sin(p.y * breatheFreq - t * (0.2 + uSpeed * 0.4) + fi * 2.1);

        // D4: dispersion de color -- en 0 todas las cortinas casi
        // comparten hue, en 1 se reparten por toda la rueda de color.
        float hueI = audioHue(fract(h0 + fi * (0.03 + uD4 * 0.20)), uMid * 0.16);
        vec3 curtainCol = hsv2rgb(vec3(hueI, 0.62, 1.0));
        col += curtainCol * curtain;
    }

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.65);

    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
