// ===============================================================
// SCENE 43 - PRISMA
// Una mancha organica negra en el centro (con un puntillado apenas
// visible adentro), rodeada de un anillo de ruido pixelado arcoiris --
// como una dispersion de luz en bloques -- que se apaga hacia afuera
// en un ruido pixelado blanco/gris tipo estatica de TV vieja. El
// CONTORNO de la mancha es organico y fijo (solo las perillas lo
// cambian); lo que titila todo el tiempo es el grano de las dos zonas
// de ruido.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. MANCHA: mismo domain-warp que scene00/scene02/scene42 aplicado a
//    una distancia radial -- un circulo perfecto doblado por fbm da un
//    contorno organico, no geometrico. 'd' (radio doblado menos el
//    radio del blob) es negativo adentro, positivo afuera, y las TRES
//    zonas de abajo se definen todas sobre este mismo campo, con
//    transiciones suavizadas por fwidth (para que no queden bordes con
//    dientes de sierra en la frontera de cada zona).
//
// 2. RUIDO PIXELADO: el color de las dos zonas de afuera se
//    muestrea en una coordenada CUANTIZADA (bloques, no por pixel) y
//    con un hash que incluye un contador de tiempo a saltos (no
//    continuo) -- eso da el titileo tipo estatica/glitch, cambiando de
//    golpe cada fraccion de segundo en vez de animar suave.
//
// 3. TRES ZONAS sobre 'd': interior (negro + puntillado), banda
//    arcoiris (hue al azar por bloque, D2 controla el ancho), exterior
//    (gris/blanco con dither, D6 lo tiñe).
//
// CONTROLES
//   Speed    no anima geometria -- SI acelera el titileo del ruido
//            (ver D4, que fija la base; Speed se suma)
//   Density  resolucion del pixelado (bloques grandes <-> finos)
//   Hue      hue que se mezcla en la banda arcoiris y tine el exterior
//   Chaos    turbulencia del contorno de la mancha (redondo y liso
//            <-> bien organico e irregular)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, ensancha la banda arcoiris un instante
//            (bounded, decae solo -- mismo criterio que el "kickPush"
//            de scene13)
//   High     no usado directo (reservado) -- el titileo ya tiene su
//            propia velocidad (D4/Speed); sumarle vibracion aca se
//            superpondria con el mismo efecto
//
// @D1: tamano de la mancha (chica <-> ocupa casi toda la pantalla)
// @D2: ancho de la banda arcoiris
// @D3: contraste del dither (degradado de ruido suave <-> bien binario)
// @D4: velocidad base del titileo tipo estatica
// @D5: densidad del puntillado dentro de la mancha
// @D6: cuanto se tine de Hue el exterior blanco/gris
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);

    // --- MANCHA (organica, fija salvo por las perillas) ---
    vec2  warp = vec2(fbm(p * 0.6 + 11.0, 3), fbm(p * 0.6 + 37.0, 3)) - 0.5;
    float turb = 0.3 + uChaos * 1.1;
    vec2  wp = p + warp * turb;
    float rad = length(wp);
    float blobRadius = mix(0.35, 1.7, uD1);
    float d = rad - blobRadius;

    // D2: ancho de banda. Kick: ademas del flash de mas abajo, la
    // ensancha un instante -- geometria acotada que decae sola con
    // uKick, mismo criterio que el empuje de radio de scene13.
    float halfBand = mix(0.06, 0.42, uD2) * (1.0 + uKick * 0.35);
    float aa = max(fwidth(d), 1e-4) * 1.5;

    // --- RUIDO PIXELADO (bloques cuantizados + titileo a saltos) ---
    float pxCount = mix(18.0, 140.0, uDensity);
    vec2  pxUV = floor(uv * pxCount) / pxCount;
    float flickerRate = mix(1.5, 26.0, uD4) + uSpeed * 20.0;
    float frameSeed = floor(t * flickerRate);

    float contrastExp = mix(1.0, 4.0, uD3);
    float bandHash = pow(hash21(pxUV * 371.0 + frameSeed * 97.0), contrastExp);
    float whiteHash = pow(hash21(pxUV * 511.0 + frameSeed * 53.0 + 7.0), contrastExp);

    // --- LAS TRES ZONAS ---
    // Interior: negro con puntillado chico.
    float dotGrid = mix(8.0, 42.0, uD5);
    vec2  dq = floor(uv * dotGrid);
    float hasDot = step(0.93, hash21(dq + 3.0));
    vec3  interiorCol = vec3(0.02) + vec3(hasDot) * 0.22;

    // Banda: hue al azar por bloque, tenido por Hue/Mid.
    vec3  bandCol = hsv2rgb(vec3(fract(bandHash + h0), 1.0, 1.0));

    // Exterior: gris/blanco con dither, teñido por D6.
    vec3  whiteCol = mix(vec3(0.45), vec3(1.0), whiteHash);
    vec3  tintCol = hsv2rgb(vec3(h0, 0.55, 1.0));
    vec3  exteriorCol = mix(whiteCol, whiteCol * tintCol, uD6);

    float innerT = smoothstep(-halfBand - aa, -halfBand + aa, d);
    float outerT = smoothstep(halfBand - aa, halfBand + aa, d);
    vec3  col = mix(interiorCol, bandCol, innerT);
    col = mix(col, exteriorCol, outerT);

    // PIANO: una chispa dentro de la banda arcoiris, en el angulo que
    // elige uKeypos -- color encima, no toca el contorno de la mancha.
    if (uKeypulse > 0.0015) {
        float ang = uKeypos * TAU;
        vec2  guestPos = (blobRadius) * vec2(cos(ang), sin(ang));
        float dG2 = dot(p - guestPos, p - guestPos);
        float spark = exp(-dG2 * 10.0) * uKeypulse * (0.8 + uKeyvel * 0.8);
        col += vec3(1.0) * spark * 1.4;
    }

    // Kick: flash breve, ademas del ensanche de banda de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
