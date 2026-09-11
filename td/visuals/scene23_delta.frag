// ===============================================================
// SCENE 46 - DELTA
// Un plasma de calor (fbm domain-warped, azul->verde->amarillo->
// naranja) que fluye sin cortes, con una linea de escaneo solida que
// baja por la pantalla cambiando de color en cada pasada, y bloques
// de "glitch" -- rectangulos solidos y manchas de ruido multicolor --
// que aparecen y desaparecen a saltos, como datos corruptos encima de
// la imagen de fondo.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. PLASMA: mismo domain-warp de scene00/scene02/scene42/scene44,
//    con el tiempo METIDO en la coordenada de muestreo -- fluye
//    continuo, sin cortes. El campo resultante (0..1) se mapea a un
//    degradado de hue (azul->naranja), no a una paleta discreta.
//
// 2. ESCANEO: una franja horizontal solida que baja con
//    fract(t*velocidad) -- al completar una vuelta (el modulo hace
//    "wrap"), el CONTADOR de vueltas entra en el hash de color, asi
//    cambia de color en cada pasada, no de golpe en cualquier punto.
//
// 3. GLITCH: dos capas de grilla independientes (una gruesa para
//    bloques grandes, una fina para manchas chicas), cada una con su
//    propio reseed periodico por tiempo (mismo mecanismo que
//    scene38-41) -- algunas celdas de cada capa se "encienden" como
//    rectangulo solido de un color al azar; en la capa fina, una
//    fraccion de las celdas encendidas se dibuja como mancha de RUIDO
//    multicolor por pixel en vez de un rectangulo solido, para el
//    look de "dato corrupto".
//
// CONTROLES
//   Speed    velocidad con la que fluye el plasma de fondo
//   Density  resolucion de la grilla de bloques (chicos y muchos <->
//            grandes y pocos)
//   Hue      hue base (rota el plasma y los bloques juntos)
//   Chaos    turbulencia del plasma de fondo
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, adelanta el reseed de los bloques --
//            todos parpadean de golpe con el golpe de graves
//   High     vibracion micro de la posicion de la linea de escaneo
//            (excepcion del contrato)
//
// @D1: probabilidad de bloques grandes (capa gruesa)
// @D2: probabilidad de bloques/manchas chicas (capa fina)
// @D3: ancho de la linea de escaneo
// @D4: velocidad de la linea de escaneo
// @D5: velocidad del parpadeo de los bloques (quedan quietos un rato
//      <-> cambian todo el tiempo)
// @D6: contraste del plasma de fondo
// ===============================================================

vec3 glitchColor(float h) {
    int idx = int(mod(h * 6.0, 6.0));
    if (idx == 0) return vec3(0.10, 0.85, 0.75);   // teal
    if (idx == 1) return vec3(0.95, 0.35, 0.65);   // rosa
    if (idx == 2) return vec3(0.20, 0.40, 0.95);   // azul
    if (idx == 3) return vec3(0.45, 0.90, 0.25);   // verde
    if (idx == 4) return vec3(0.95, 0.85, 0.20);   // amarillo
    return vec3(0.95, 0.45, 0.15);                   // naranja
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);

    // --- PLASMA (fluye continuo con el tiempo) ---
    float flowSpeed = 0.02 + uSpeed * 0.15;
    vec2  warp = vec2(fbm(p * 0.6 + t * flowSpeed + 11.0, 4),
                       fbm(p * 0.6 - t * flowSpeed + 37.0, 4)) - 0.5;
    float turb = 0.5 + uChaos * 1.2;
    vec2  wp = p + warp * turb;
    float field = fbm(wp * 0.8 + t * flowSpeed * 0.5, 6, 0.5);

    float hue = fract(mix(0.62, 0.02, field) + h0);
    float val = mix(0.35, 0.9, field) * (0.7 + uD6 * 0.5);
    vec3  col = hsv2rgb(vec3(hue, 0.72, val));

    // --- LINEA DE ESCANEO ---
    float scanRate = mix(0.06, 0.6, uD4);
    float scanCycle = t * scanRate;
    float scanY = fract(scanCycle);
    float scanGen = floor(scanCycle);
    float scanWidth = mix(0.02, 0.14, uD3);
    // uHigh: vibracion micro de la posicion -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    float scanYJit = scanY + uHigh * 0.006 * sin(t * 14.0);
    float distScan = abs(uv.y - scanYJit);
    float scanMask = 1.0 - smoothstep(scanWidth * 0.5, scanWidth * 0.5 + 0.01, distScan);
    vec3  scanCol = glitchColor(fract(hash21(vec2(scanGen, 3.0)) + h0));
    col = mix(col, scanCol, scanMask);

    // --- GLITCH: dos capas de grilla, reseed periodico independiente ---
    // Kick: adelanta el reseed -- los bloques parpadean de golpe con
    // el golpe de graves.
    float blockRate = mix(0.4, 5.0, uD5) + uKick * 30.0;
    float blockGs = floor(t * blockRate);

    vec2  uvAsp = vec2(uv.x * uAspect, uv.y);

    // Capa gruesa: pocas celdas, bloques grandes.
    float coarseCols = 3.0 + floor(uDensity * 4.0);
    vec2  cg = uvAsp * coarseCols;
    vec2  cid = floor(cg);
    // Techo bajado (0.5->0.18): con el rango anterior el default ya
    // tapaba casi toda la pantalla de bloques -- el video de
    // referencia muestra el plasma de fondo dominante con solo unos
    // pocos bloques sueltos encima (bug real, encontrado renderizando).
    float coarseOn = step(hash21(cid + blockGs * 11.0 + 1.0), uD1 * 0.18);
    if (coarseOn > 0.5) {
        vec3 bcol = glitchColor(fract(hash21(cid + blockGs * 11.0 + 2.0) + h0));
        col = bcol;
    }

    // Capa fina: muchas celdas, bloques o manchas de ruido chicas.
    float fineCols = coarseCols * (2.0 + floor(uDensity * 4.0));
    vec2  fg = uvAsp * fineCols;
    vec2  fid = floor(fg);
    // Mismo motivo que la capa gruesa: techo bajado (0.5->0.12), la
    // grilla es mas fina asi que cualquier probabilidad se ve
    // amplificada por la cantidad de celdas.
    float fineOn = step(hash21(fid + blockGs * 17.0 + 3.0), uD2 * 0.12);
    if (fineOn > 0.5) {
        float isNoise = step(0.5, hash21(fid + blockGs * 17.0 + 4.0));
        if (isNoise > 0.5) {
            // Mancha de ruido multicolor por sub-bloque (mas fino que
            // la celda pero sin llegar a grano por pixel) -- el look
            // de dato corrupto, no un bloque solido plano.
            vec2  speckG = uvAsp * fineCols * 4.0;
            float pixHash = hash21(floor(speckG) + blockGs * 5.0 + 9.0);
            col = glitchColor(fract(pixHash + h0));
        } else {
            col = glitchColor(fract(hash21(fid + blockGs * 17.0 + 5.0) + h0));
        }
    }

    // PIANO: un bloque grande y brillante aparece en la posicion que
    // elige uKeypos y se apaga solo (uKeypulse decae) -- color
    // encima, no reordena los bloques existentes.
    if (uKeypulse > 0.0015) {
        vec2  guestPos = centered(vec2(mix(0.12, 0.88, uKeypos), 0.5));
        float dG2 = dot(p - guestPos, p - guestPos);
        float guestMask = step(dG2, 0.05) * uKeypulse;
        col = mix(col, hsv2rgb(vec3(fract(h0 + 0.5), 0.85, 1.0)), guestMask);
    }

    // Kick: flash breve, ademas del adelanto de reseed de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
