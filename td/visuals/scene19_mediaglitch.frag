// ===============================================================
// SCENE 19 - MEDIA GLITCH
// Apunta a una CARPETA propia de imagenes/GIFs/videos (parametro
// "Mediafolder" de esta escena, en /project1/scenes/scene19) y va
// rotando solo entre todos los archivos que encuentre ahi, aplicandoles
// un efecto de glitch: pixelado + separacion cromatica + tearing de
// bloques, todo reactivo al audio. Reemplaza al viejo "void" (orbe
// minimalista).
// ===============================================================
//
// COMO FUNCIONA
//
// mediaTex(uv) (definida en el header automatico, solo para esta escena
// -- ver config.MEDIA_SCENES) lee el input 1 del GLSL TOP, que es un
// Movie File In TOP. Su parametro 'file' NO apunta a un archivo fijo:
// llama a control_script.currentMediaPath(19), que escanea Mediafolder
// y devuelve el archivo en la posicion Mediaindex (interno). Ese indice
// avanza SOLO, sin gastar ninguna perilla:
//   - por tiempo, cada tantos segundos (ritmo segun Speed -- perilla
//     alta = ciclo mas rapido), ver control_script._scheduleMediaAdvance
//   - por golpe de bombo, un avance extra en cada beat (ver
//     dats/media_logic.py) -- asi se siente reactivo a la musica sin
//     depender solo de ella
// Carpeta vacia/sin setear, o Movie File In TOP sin archivo cargado
// todavia -> sale negro. La escena sigue compilando y corriendo bien
// igual, simplemente no hay nada que mostrar hasta que se configure.
//
// El efecto en si:
// 1. PIXELADO: se cuantiza el uv antes de muestrear (D1 = tamano de
//    bloque), el look "8-bit" clasico.
// 2. SEPARACION CROMATICA: cada canal RGB se muestrea con un offset
//    horizontal propio (D2 = cuanto).
// 3. TEARING: bloques horizontales aleatorios (por fila cuantizada) se
//    desplazan en X a saltos, como una señal de video rota (D3 = cuanto).
// 4. Todo se banea contra un umbral de Chaos para que en Chaos=0 el
//    glitch case casi no se note (imagen casi limpia) y suba desde ahi.
//
// CONTROLES
//   Speed    velocidad a la que cambian los bloques de tearing
//   Density  tamano de la rejilla de tearing (mas Density = bandas mas
//            finas)
//   Hue      tinte adicional mezclado sobre la imagen (0 = colores
//            originales)
//   Chaos    cuanto del glitch total se deja pasar (0 = imagen casi
//            limpia, 1 = glitch a full)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue), se suma al de Hue
//   Kick     tearing y separacion cromatica se disparan mas fuerte un
//            instante -- ya llega con envolvente de golpe-y-caida
//            (audio.py)
//   High     vibracion micro del offset de tearing (excepcion del
//            contrato)
//
// @D1: tamano del pixelado (nitido/original <-> bloques bien grandes)
// @D2: cantidad de separacion cromatica (RGB split)
// @D3: cuanto se desplazan los bloques de tearing
// @D4: mezcla de tinte de Hue sobre la imagen (colores originales <->
//      completamente teñida)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;

    // Chaos: cuanto del glitch se deja pasar en total -- en 0, la imagen
    // queda casi limpia (todos los efectos de abajo casi no se notan).
    float glitchAmt = 0.05 + uChaos * 0.95;

    // 1. PIXELADO -- D1 controla el tamano de bloque. El tamano tambien
    // respira con los bajos (mismo patron que el perimetro de las
    // metaballs): mas bass = bloques mas grandes por un instante.
    float pixelSize = mix(1.0, 60.0, uD1 * glitchAmt) / (1.0 + uBass * 0.5);
    vec2 uvPix = floor(uv * pixelSize) / max(pixelSize, 1.0);

    // 3. TEARING -- bloques horizontales que se desplazan en X a saltos.
    // Density controla cuantas bandas hay, Speed que tan seguido cambian.
    float bands = 6.0 + uDensity * 40.0;
    float bandId = floor(uv.y * bands);
    float tearRate = 1.0 + uSpeed * 6.0;
    float stepT = floor(t * tearRate + bandId * 0.7);
    float tearHash = hash21(vec2(bandId, stepT));
    // Kick: tearing mas fuerte un instante, ademas del brillo de mas
    // abajo -- ya llega con envolvente de golpe-y-caida.
    float tearAmt = (0.02 + uD3 * 0.18) * glitchAmt * (1.0 + uKick * 2.0);
    float tearShift = (tearHash - 0.5) * tearAmt;
    // uHigh: vibracion micro del offset -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    tearShift += uHigh * 0.01 * sin(t * 20.0 + bandId);

    vec2 uvTear = uvPix + vec2(tearShift, 0.0);

    // 2. SEPARACION CROMATICA -- cada canal con su propio offset en X.
    float aberr = (0.002 + uD2 * 0.035) * glitchAmt * (1.0 + uKick * 1.0);
    vec3 media;
    media.r = mediaTex(uvTear + vec2(aberr, 0.0)).r;
    media.g = mediaTex(uvTear).g;
    media.b = mediaTex(uvTear - vec2(aberr, 0.0)).b;

    // D4 + Hue/Mid: tinte mezclado sobre la imagen original.
    float h = audioHue(uHue, uMid * 0.16);
    vec3 tint = hsv2rgb(vec3(h, 0.8, 1.0));
    float lum = dot(media, vec3(0.299, 0.587, 0.114));
    vec3 col = mix(media, tint * lum, uD4 * 0.85);

    // PIANO: corrupcion mucho mas fuerte con cada tecla -- pixelado AL
    // MAXIMO (bloques enormes, la imagen se vuelve irreconocible un
    // instante, no solo un poco mas gruesa) + tearing de bandas propio
    // (desplazamiento X grande, sincronizado a la tecla) + tinte de
    // color. uKeypos elige el tamano de bloque y la banda; uKeyvel
    // escala la mezcla de tinte. uKeypulse decae solo.
    if (uKeypulse > 0.0015) {
        float pixSizeP = mix(3.0, 90.0, 1.0 - uKeypos);
        float bandIdP = floor(uv.y * (6.0 + uKeypos * 40.0));
        float tearShiftP = (fract(bandIdP * 12.9898) - 0.5) * 0.35;
        vec2 uvPixP = floor((uv + vec2(tearShiftP, 0.0)) * pixSizeP) / pixSizeP;
        vec3 mediaP = mediaTex(uvPixP).rgb;
        vec3 tintP = hsv2rgb(vec3(fract(uKeypos + 0.5), 0.85, 1.0));
        vec3 corrupted = mix(mediaP, tintP * dot(mediaP, vec3(0.299, 0.587, 0.114)), 0.5 + uKeyvel * 0.4);
        col = mix(col, corrupted, uKeypulse);
    }

    // Kick: flash breve.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    // Grano de pelicula + vinieta -- ambos se intensifican en el kick,
    // como una señal rota que "tose" con el golpe.
    float grain = (hash21(uv * uResW + fract(uRTime) * 23.0) - 0.5) * (0.02 + uKick * 0.06);
    col += grain;
    col *= vignette(uv, 0.15 + uKick * 0.25);

    return vec4(col, 1.0);
}
