// ===============================================================
// SCENE 30 - TUBOS DE NEON
// Tubos de neon rectos que se entrecruzan, tipo cartel de luces --
// reemplaza al prisma de dispersion. Todo geometria LINEAL: sin curvas,
// sin ruido deformando el trazo -- solo lineas rectas cruzandose entre
// si, como caños de neon real.
// ===============================================================
//
// COMO FUNCIONA
//
// Cada tubo es una linea RECTA (en la practica, recortada por la
// pantalla) definida por (angulo, offset perpendicular al origen) -- la
// parametrizacion clasica de Hesse: dist(p) = dot(p, normal) - offset,
// con normal = (cos(angulo), sin(angulo)). Donde esa distancia cruza
// cero esta la linea misma; edgeLine() le da ancho constante en pixeles
// a partir de ahi, igual que en scene05/scene11.
//
// El angulo de cada tubo sale de UNA de 4 direcciones base (0, 45, 90,
// 135 grados, cicladas por indice) mas jitter de Chaos -- asi el cruce
// ya se ve desde Chaos=0 (una reticula prolija tipo cartel de neon
// real), y Chaos lo vuelve mas organico/desordenado en vez de pasar de
// "nada cruzado" a "algo cruzado".
//
// CONTROLES
//   Speed    velocidad a la que los tubos se deslizan perpendicular a
//             si mismos (el cruce entero se anima, sin curvar nada)
//   Density  cuantos tubos hay en pantalla (4 a 12)
//   Hue      color base de los tubos
//   Chaos    jitter de angulo sobre las 4 direcciones base (reticula
//            prolija <-> cruce desordenado)
//   Bass     brillo de lo ya claro (audioLift) + un empujon chico al
//            deslizamiento (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   High     vibracion micro de cada tubo (excepcion del contrato)
//
// @D1: grosor del nucleo de cada tubo
// @D2: cantidad de resplandor (glow) alrededor de cada tubo
// @D3: largo visible de cada tubo -- lineas de borde a borde <->
//      segmentos cortos que se apagan en las puntas
// @D4: separacion entre tubos (juntos y apretados <-> bien repartidos)
// @D5: brillo extra donde dos tubos se cruzan, como un destello real de
//      neon en la interseccion
// @D6: cuantos colores distintos hay entre los tubos (todos el mismo
//      <-> varios tonos agrupados, como un cartel real de neon
//      multicolor)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int n = 4 + int(floor(uDensity * 8.99));   // 4 a 12 tubos

    float coreW = 1.4 + uD1 * 2.6;
    float glowAmt = 0.30 + uD2 * 1.0;
    float lenWindow = uD3;                     // 0 = borde a borde, 1 = corto
    float spread = 0.5 + uD4 * 1.3;
    float crossAmt = uD5;
    float colorSpread = uD6;

    float h = audioHue(uHue, uMid * 0.16);
    vec3 col = vec3(0.0);

    // Se guarda la distancia con signo de cada tubo -- hace falta para
    // el destello de cruce (D5) en un segundo paso, sin recalcularla.
    float dists[12];

    for (int i = 0; i < 12; i++) {
        if (i >= n) break;
        float fi = float(i);
        vec2 seed = vec2(fi * 9.1 + 3.0, fi * 5.3 + 7.0);

        // 4 direcciones base cicladas + jitter de Chaos -- el cruce se
        // ve desde Chaos=0 (reticula prolija), Chaos lo desordena.
        float baseAng = mod(fi, 4.0) * (PI * 0.25);
        float angJit = (hash21(seed) - 0.5) * uChaos * 1.4;
        float ang = baseAng + angJit;
        vec2 nrm = vec2(cos(ang), sin(ang));
        vec2 dir = vec2(-nrm.y, nrm.x);

        // Offset perpendicular: repartido por indice + Density/D4, mas
        // el deslizamiento animado (Speed). 'band' envuelve el
        // deslizamiento en loop bien afuera de la pantalla (radio
        // maximo ~2.04 en 16:9) para que el wrap nunca se note como un
        // salto -- sin esto, un deslizamiento sin limite (uTime integra
        // toda la sesion, nunca resetea) eventualmente pierde precision
        // igual que le pasaba a scene02.
        float baseOff = (hash21(seed + 1.0) - 0.5) * 2.4 * spread;
        float slideSpeed = 0.05 + uSpeed * 0.35;
        float slideDir = hash21(seed + 2.0) > 0.5 ? 1.0 : -1.0;
        float band = 2.2 + spread * 1.6;
        float off = baseOff + t * slideSpeed * slideDir
                  + uBass * 0.03 * sin(t * 1.3 + fi * 2.1);
        off = mod(off + band, band * 2.0) - band;

        float dist = dot(p, nrm) - off;
        // uHigh: vibracion micro -- unica excepcion del contrato,
        // amplitud pequena, ya suavizado.
        dist += uHigh * 0.008 * sin(t * 12.0 + fi * 3.0);
        dists[i] = dist;

        float along = dot(p, dir);

        float core = edgeLine(dist, coreW);
        float glow = exp(-dist * dist / (0.004 + glowAmt * 0.05)) * glowAmt;

        // D3: largo visible -- ventana suave a lo largo de la propia
        // linea, con fase distinta por tubo (hash) para que no todos
        // corten justo en el mismo punto.
        float halfLen = mix(3.0, 0.35, lenWindow);
        float lenCenter = (hash21(seed + 4.0) - 0.5) * 1.2 * lenWindow;
        float endFade = smoothstep(halfLen, halfLen - 0.5, abs(along - lenCenter));

        // D6: color por tubo, agrupado en pocos tonos (no un color por
        // tubo) para que se lea como "un cartel con unos pocos colores",
        // no arcoiris.
        float colorGroup = floor(hash21(seed + 6.0) * 3.0 + 0.001);
        vec3 tubeCol = hsv2rgb(vec3(fract(h + colorGroup * 0.33 * colorSpread), 0.85, 1.0));

        col += tubeCol * (core + glow * 0.7) * endFade;
    }

    // D5: destello donde dos tubos se cruzan DE VERDAD (los dos 'dist'
    // chicos a la vez cerca del mismo punto) -- un cartel de neon real
    // brilla mas fuerte justo en el cruce, no solo por la suma de dos
    // halos superpuestos.
    if (crossAmt > 0.001) {
        for (int i = 0; i < 12; i++) {
            if (i >= n) break;
            for (int j = i + 1; j < 12; j++) {
                if (j >= n) break;
                float closeI = exp(-dists[i] * dists[i] / 0.003);
                float closeJ = exp(-dists[j] * dists[j] / 0.003);
                col += vec3(1.0) * (closeI * closeJ) * crossAmt * 1.4;
            }
        }
    }

    // PIANO: un tubo extra, brillante, cruza la pantalla entera con un
    // angulo elegido por uKeypos -- uKeypulse decae solo, uKeyvel
    // escala el brillo.
    if (uKeypulse > 0.0015) {
        float kAng = uKeypos * PI;
        vec2 kNrm = vec2(cos(kAng), sin(kAng));
        float kDist = dot(p, kNrm);
        float kCore = edgeLine(kDist, coreW * 1.3);
        float kGlow = exp(-kDist * kDist / 0.01);
        col += vec3(1.0) * (kCore + kGlow * 0.6) * uKeypulse * (0.6 + uKeyvel * 1.2);
    }

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria (salvo el empujon
    // chico al deslizamiento de arriba, ya suavizado).
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
