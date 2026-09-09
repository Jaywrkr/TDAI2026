// ===============================================================
// SCENE 44 - ATLAS
// Un mapa de territorios de color (magenta, teal, naranja, azul) que
// fluye y cambia de forma sin cortes, tapizado de simbolos chicos tipo
// "arte ASCII" -- casi cada celda de una grilla fina tiene uno --
// mayormente color crema, salvo en las zonas oscuras tipo "noche"
// donde se apagan a casi negro.
// ===============================================================
//
// COMO FUNCIONA
//
// 1. TERRITORIOS: un fbm domain-warped (como scene00/scene02/scene42),
//    pero en vez de un umbral binario (tierra/oceano) se reparte en N
//    BANDAS -- floor(campo*N) -- cada banda es un color de territorio
//    distinto. La coordenada de muestreo INCLUYE el tiempo (no es un
//    reseed a saltos como scene38-41): el mapa entero fluye continuo,
//    los territorios cambian de forma sin cortes, como en el video de
//    referencia.
//
// 2. ZONAS OSCURAS: un segundo fbm, independiente, decide que partes
//    del mapa son "de noche" -- ahi el color de fondo se apaga a casi
//    negro y los simbolos de encima tambien.
//
// 3. SIMBOLOS: grilla FIJA en pantalla (no fluye con el mapa) de SDFs
//    chicas (anillo, diagonal, blob, exclamacion, coma, arco -- mismas
//    formas que scene41_kiosko, mismo espiritu de "simbolo generico"
//    en vez de tipografia real) con casi el 100% de las celdas
//    ocupadas -- el look denso de arte ASCII, no simbolos sueltos. La
//    mayoria sale color crema; una fraccion (D5) toma el color del
//    territorio de abajo, mimetizandose.
//
// CONTROLES
//   Speed    velocidad con la que fluye el mapa completo
//   Density  escala/zoom del mapa (territorios grandes <-> muchos y
//            chicos)
//   Hue      hue base de la paleta de territorios (rota junto a todo)
//   Chaos    turbulencia del contorno de los territorios
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, los simbolos crecen un instante
//            (bounded, decae solo -- mismo criterio que otros empujes
//            de esta familia de escenas)
//   High     vibracion micro de la rotacion de cada simbolo (excepcion
//            del contrato)
//
// @D1: cuantos territorios distintos hay (2 a 5)
// @D2: tamano de los simbolos (grandes y sueltos <-> chicos y
//      apretados como texto real)
// @D3: cuanta zona oscura tipo "noche" hay
// @D4: variedad de tipos de simbolo que aparecen mezclados
// @D5: cuanto se mimetizan los simbolos con el color del territorio
//      de abajo (siempre crema <-> mimetizados)
// @D6: brillo/contraste de la paleta de territorios
// ===============================================================

float sdSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
}

float glyphMask(int gtype, vec2 q, float s) {
    float d;
    if (gtype == 0) {
        d = abs(length(q) - s * 0.55) - s * 0.13;
    } else if (gtype == 1) {
        d = sdSeg(q, vec2(-s * 0.5, -s * 0.6), vec2(s * 0.5, s * 0.6)) - s * 0.09;
    } else if (gtype == 2) {
        d = length(q) - s * 0.42;
    } else if (gtype == 3) {
        float bar = sdSeg(q, vec2(0.0, s * 0.15), vec2(0.0, s * 0.65)) - s * 0.09;
        float dot_ = length(q - vec2(0.0, -s * 0.45)) - s * 0.13;
        d = min(bar, dot_);
    } else if (gtype == 4) {
        float head = length(q - vec2(0.0, s * 0.15)) - s * 0.16;
        float tail = sdSeg(q, vec2(0.0, s * 0.1), vec2(-s * 0.25, -s * 0.5)) - s * 0.08;
        d = min(head, tail);
    } else {
        d = abs(length(q) - s * 0.5) - s * 0.11;
    }
    float aa = clamp(fwidth(d), 1e-4, 0.01) * 1.5;
    float cov = 1.0 - smoothstep(0.0, aa, d);
    if (gtype == 5) {
        float aaX = clamp(fwidth(q.x), 1e-4, 0.01) * 1.5;
        cov *= smoothstep(0.0, aaX, -q.x);
    }
    return cov;
}

float territoryHue(int i) {
    if (i == 0) return 0.85;   // magenta
    if (i == 1) return 0.45;   // teal
    if (i == 2) return 0.02;   // naranja
    if (i == 3) return 0.62;   // azul
    return 0.20;                 // oliva
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float h0 = audioHue(uHue, uMid * 0.10);
    float sat = mix(0.55, 0.95, uD6);

    // --- TERRITORIOS: fbm domain-warped que FLUYE con el tiempo ---
    float flowSpeed = 0.015 + uSpeed * 0.10;
    vec2  flowP = p * mix(0.6, 1.8, uDensity);
    vec2  warp = vec2(fbm(flowP * 0.5 + t * flowSpeed + 11.0, 4),
                       fbm(flowP * 0.5 - t * flowSpeed + 37.0, 4)) - 0.5;
    float turb = 0.5 + uChaos * 1.2;
    vec2  wp = flowP + warp * turb;
    float field = fbm(wp * 0.9 + t * flowSpeed * 0.6, 6, 0.5);

    int   nRegions = 2 + int(floor(uD1 * 3.99));
    int   regionIdx = int(clamp(field * float(nRegions), 0.0, float(nRegions) - 0.001));
    vec3  baseCol = hsv2rgb(vec3(fract(audioHue(territoryHue(regionIdx), 0.0) + h0), sat, mix(0.55, 0.95, uD6)));

    // --- ZONAS OSCURAS: segundo fbm independiente ---
    float darkField = fbm(wp * 1.3 + 50.0 + t * flowSpeed * 0.4, 4);
    float darkThresh = mix(0.85, 0.42, uD3);
    float isDark = smoothstep(darkThresh - 0.05, darkThresh + 0.05, darkField);
    baseCol = mix(baseCol, vec3(0.04, 0.04, 0.07), isDark * 0.88);

    // --- SIMBOLOS: grilla fija en pantalla, casi 100% llena ---
    // D2: tamano/densidad -- grilla mas fina = simbolos mas chicos y
    // apretados, look de texto real.
    float glyphFreq = mix(14.0, 46.0, uD2);
    vec2  uvAsp = vec2(uv.x * uAspect, uv.y);
    vec2  gg = uvAsp * glyphFreq;
    vec2  gid = floor(gg);
    vec2  gf = fract(gg) - 0.5;

    int   nTypes = 2 + int(floor(uD4 * 4.99));
    int   gtype = int(mod(hash21(gid + 7.0) * float(nTypes), float(nTypes)));
    float sizeJ = mix(0.75, 1.15, hash21(gid + 9.0));
    float rotJ = (hash21(gid + 13.0) - 0.5) * 0.6;
    // uHigh: vibracion micro de la rotacion -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    rotJ += uHigh * 0.05 * sin(t * 10.0 + gid.x);
    vec2  q = rot2(rotJ) * gf;
    // Kick: los simbolos crecen un instante, ademas del flash de mas
    // abajo -- bounded, decae solo con uKick.
    float s = 0.42 * sizeJ * (1.0 + uKick * 0.25);
    float m = glyphMask(gtype, q, s);

    float takeRegionColor = step(1.0 - uD5 * 0.85, hash21(gid + 21.0));
    vec3  creamCol = vec3(0.92, 0.87, 0.55);
    vec3  glyphCol = mix(creamCol, baseCol * 1.35, takeRegionColor);
    glyphCol = mix(glyphCol, vec3(0.02), isDark);

    vec3 col = mix(baseCol, glyphCol, m);

    // PIANO: un simbolo invitado, grande y brillante, aparece en la
    // posicion que elige uKeypos y se apaga solo (uKeypulse decae).
    if (uKeypulse > 0.0015) {
        vec2  guestPos = centered(vec2(mix(0.1, 0.9, uKeypos), 0.5));
        vec2  qg = p - guestPos;
        int   guestType = int(mod(uKeypos * 6.0, 6.0));
        float mg = glyphMask(guestType, qg, 0.22 + uKeyvel * 0.14);
        col += hsv2rgb(vec3(fract(h0 + 0.5), 0.8, 1.0)) * mg * uKeypulse * 1.4;
    }

    // Kick: flash breve, ademas del crecimiento de simbolos de arriba.
    col += col * uKick * 0.3;

    // Bajos: brillo de lo ya claro.
    col = audioLift(col, uBass * 0.5);

    col *= vignette(uv, 0.2);

    return vec4(col, 1.0);
}
