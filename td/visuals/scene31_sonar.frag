// ===============================================================
// SCENE 47 - SONAR
// Un mapa de islas magenta con bordes en bloques (mismo domain-warp
// que scene42_archipielago, cuantizado antes de medir para el look
// pixelado), tapizadas por una grilla fina tipo pantalla de sonar, y
// una franja de "pings" amarillos/azules titilando justo sobre la
// costa -- como si el sonar estuviera barriendo el borde de la tierra.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. TIERRA: identico mecanismo a scene42_archipielago (domain-warp +
//    umbral), silueta FIJA (solo las perillas la cambian, no el
//    tiempo). D1 alto = mas tierra (la direccion correcta -- aprendida
//    corrigiendo un bug real en esa escena).
//
// 2. GRILLA: lineas finas de siempre (edgeLine sobre una coordenada en
//    bloques), pero mucho mas tenues sobre el oceano que sobre la
//    tierra -- se lee como la pantalla de un sonar iluminando lo que
//    encuentra, no una grilla pareja sobre todo.
//
// 3. PINGS: coastD = campo - umbral mide que tan lejos esta cada pixel
//    del borde exacto de la costa; abs(coastD) chico = franja costera.
//    Ahi se sortea una grilla fina de puntos (color amarillo o azul
//    por hash), cada uno titilando a su propio ritmo -- la
//    probabilidad de que un punto exista esta pesada por lo cerca que
//    esta de la costa, asi se concentran ahi y no aparecen sueltos en
//    medio del oceano o del interior solido.
//
// CONTROLES
//   Speed    velocidad del titileo de los pings
//   Density  escala del mapa (islas grandes <-> muchas y chicas)
//   Hue      hue base (magenta por defecto, rota junto con todo)
//   Chaos    turbulencia del contorno de las islas
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, un puñado de pings extra aparecen de
//            golpe en toda la franja costera
//   High     vibracion micro de la posicion de cada ping (excepcion
//            del contrato)
//
// @D1: cuanta tierra hay (islas chicas y sueltas <-> casi todo
//      continente)
// @D2: frecuencia/grosor de la grilla
// @D3: densidad de pings en la franja costera
// @D4: ancho de la franja costera donde aparecen los pings
// @D5: cuanta zona de "cueva" oscura hay dentro de la tierra
// @D6: brillo/contraste general
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);

    // --- TIERRA (identico a scene42, direccion de D1 correcta) ---
    float scale = mix(0.55, 1.8, uDensity);
    vec2  lp = p * scale;
    float turb = 0.4 + uChaos * 1.1;
    vec2  warp = vec2(fbm(lp * 0.8 + 11.0, 3), fbm(lp * 0.8 + 37.0, 3)) - 0.5;
    float land = fbm(lp * 3.2 + warp * turb, 7, 0.52);
    // Rango corrido bien mas abajo que scene42 (0.74-0.52 -> 0.62-0.42):
    // el video de referencia muestra tierra dominante con canales
    // negros, no islas sueltas -- el default (D1=0.5) tiene que
    // arrancar ya cerca de esa cobertura (bug real, encontrado
    // renderizando: con el rango de scene42 el default salia
    // demasiado disperso para esta escena).
    float threshold = mix(0.62, 0.42, uD1);
    float landMask = smoothstep(threshold - 0.015, threshold + 0.015, land);

    vec3  landCol = hsv2rgb(vec3(fract(h0 + 0.85), 0.62, mix(0.45, 0.85, uD6)));

    // Zonas de "cueva" oscura dentro de la tierra.
    float caveField = fbm(lp * 2.4 + 60.0, 4);
    float caveThresh = mix(0.85, 0.45, uD5);
    float isCave = smoothstep(caveThresh - 0.05, caveThresh + 0.05, caveField) * landMask;
    landCol = mix(landCol, vec3(0.02), isCave * 0.92);

    vec3 col = landCol * landMask;

    // --- GRILLA: tenue sobre el oceano, marcada sobre la tierra ---
    float gridFreq = mix(10.0, 55.0, uD2);
    vec2  gg = lp * gridFreq;
    vec2  gf = fract(gg) - 0.5;
    vec2  edgeDist = 0.5 - abs(gf);
    float gridLine = edgeLine(min(edgeDist.x, edgeDist.y) - 0.0, mix(1.0, 3.0, uD2));
    float gridAmt = mix(0.05, 0.35, landMask);
    col += landCol * gridLine * gridAmt * (1.0 - isCave);

    // --- PINGS EN LA FRANJA COSTERA ---
    float coastD = land - threshold;
    float bandW = mix(0.02, 0.16, uD4);
    float coastBand = 1.0 - smoothstep(bandW * 0.6, bandW, abs(coastD));

    float pingFreq = 34.0;
    vec2  pg = lp * pingFreq;
    vec2  pid = floor(pg);
    vec2  pf = fract(pg) - 0.5;

    // Kick: un puñado de pings extra aparecen de golpe -- decae solo
    // porque uKick ya trae su propia envolvente.
    float pingProb = mix(0.0, 0.9, uD3 * coastBand) + uKick * 0.5 * coastBand;
    float hasPing = step(hash21(pid + 40.0), pingProb);

    vec2  pq = pf;
    // uHigh: vibracion micro de la posicion -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    pq += uHigh * 0.03 * vec2(sin(t * 10.0 + pid.x), cos(t * 9.0 + pid.y));
    float dPing = length(pq) - 0.16;
    float aaPing = clamp(fwidth(dPing), 1e-4, 0.02) * 1.5;
    float pingShape = (1.0 - smoothstep(0.0, aaPing, dPing)) * hasPing;

    float pingPhase = hash21(pid + 45.0) * TAU;
    float pingTwinkle = 0.4 + 0.6 * max(sin(t * (1.0 + uSpeed * 5.0) + pingPhase), 0.0);
    float isYellow = step(0.5, hash21(pid + 50.0));
    vec3  pingCol = mix(hsv2rgb(vec3(fract(0.60 + h0), 0.75, 1.0)),
                         hsv2rgb(vec3(fract(0.14 + h0), 0.80, 1.0)), isYellow);

    col += pingCol * pingShape * pingTwinkle;

    // PIANO: un anillo de pings extra destella alrededor de la
    // posicion que elige uKeypos -- color encima, no toca la tierra.
    if (uKeypulse > 0.0015) {
        vec2  guestPos = centered(vec2(mix(0.1, 0.9, uKeypos), 0.5));
        float dG = length(p - guestPos);
        float ring = exp(-pow(dG - 0.15, 2.0) * 60.0) * uKeypulse * (0.7 + uKeyvel * 0.8);
        col += hsv2rgb(vec3(fract(h0 + 0.14), 0.8, 1.0)) * ring * 1.4;
    }

    // Kick: flash breve, ademas de los pings extra de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.55);

    col *= vignette(uv, 0.35);

    return vec4(col, 1.0);
}
