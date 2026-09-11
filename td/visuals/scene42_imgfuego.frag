// ===============================================================
// SCENE - IMAGENES BAILANDO (FUEGO)
// Varias copias de la imagen de la carpeta comun, repartidas en
// distintos lugares del cuadro (posiciones fijas por perilla, no por
// tiempo), cada una con un efecto de "fuego" -- un domain-warp que
// sube y tiembla, como si la imagen estuviera ardiendo despacio -- y
// bailando de a poco en su lugar.
// ===============================================================
//
// COMO FUNCIONA
// N copias (Density) se ubican en una grilla jitterada (posicion fija
// por indice, no anima) y cada una se dibuja como un recorte cuadrado
// de la MISMA imagen. Encima de cada copia se aplica un warp que sube
// con el tiempo (fbm evaluado en Y-t, como una llama subiendo) y una
// deriva lateral suave -- eso es "bailando", no solo parpadeando.
//
// CONTROLES
//   Speed    velocidad a la que sube el efecto de fuego
//   Density  cuantas copias de la imagen hay
//   Hue      tinte que se mezcla sobre las copias (0 = colores
//            originales)
//   Chaos    cuanto se dispersan las copias por la pantalla
//   Bass     brillo de lo ya claro (audioLift) + el fuego se agita mas
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todas las copias
//   High     vibracion micro adicional (excepcion del contrato)
//
// @D1: tamano de cada copia
// @D2: fuerza del efecto de fuego (quieta <-> temblando fuerte)
// @D3: velocidad de la deriva lateral ("baile") de cada copia
// @D4: mezcla de tinte de Hue sobre las copias
// @D5: cantidad de resplandor (glow) alrededor de cada copia
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int   nCopies = 3 + int(floor(uDensity * 8.99));
    float spread = mix(0.25, 1.0, uChaos);
    float size = mix(0.16, 0.5, uD1);

    float h = audioHue(uHue, uMid * 0.10);
    // Fondo tenue -- no vacio absoluto.
    vec3  col = hsv2rgb(vec3(fract(h + 0.6), 0.35, 0.03));

    for (int i = 0; i < 12; i++) {
        if (i >= nCopies) break;
        float fi = float(i);
        vec2  seed = vec2(fi * 7.9 + 2.0, fi * 4.1 + 5.0);
        vec2  center = (hash22(seed) - 0.5) * vec2(uAspect, 1.0) * 2.0 * spread;

        // D3: deriva lateral suave -- el "baile" de cada copia,
        // distinta velocidad y fase por copia.
        float danceSpeed = 0.2 + uD3 * 1.2;
        vec2  dance = vec2(sin(t * danceSpeed + hash21(seed + 3.0) * TAU),
                            cos(t * danceSpeed * 0.8 + hash21(seed + 4.0) * TAU)) * 0.04;
        vec2  local = p - center - dance;

        float half_ = size * 0.5;
        if (abs(local.x) > half_ || abs(local.y) > half_) continue;

        vec2  cuv = local / size + 0.5;

        // Fuego: el warp sube con el tiempo (fbm en Y-t, como una
        // llama) y tiembla lateral -- Bass agita mas fuerte, acotado.
        float fireSpeed = 0.3 + uSpeed * 1.4;
        float fireAmt = (0.02 + uD2 * 0.10) * (1.0 + uBass * 0.7);
        vec2  fireSamp = cuv * 4.0 + vec2(hash21(seed + 6.0) * 20.0, -t * fireSpeed * 2.0);
        vec2  fireWarp = vec2(fbm(fireSamp, 3) - 0.5, fbm(fireSamp + 9.0, 3) - 0.5);
        fireWarp += uHigh * 0.01 * vec2(sin(t * 12.0 + fi), cos(t * 10.0 + fi));
        vec2  muv = clamp(cuv + fireWarp * fireAmt, 0.0, 1.0);

        vec3  src = mediaTex(muv).rgb;
        vec3  tint = hsv2rgb(vec3(h, 0.7, 1.0));
        float lum = dot(src, vec3(0.299, 0.587, 0.114));
        vec3  tinted = mix(src, tint * lum, uD4);

        col += tinted;
        // D5: resplandor alrededor del recorte, para que no se lea
        // como un cuadrado duro suelto en el vacio.
        float edgeD = max(abs(local.x), abs(local.y)) - half_;
        col += tint * exp(-edgeD * edgeD * 300.0) * (0.15 + uD5 * 0.5);
    }

    col *= 0.6 + uD6 * 0.7;

    // PIANO: una copia extra, grande y brillante, aparece en la
    // posicion que elige uKeypos.
    if (uKeypulse > 0.0015) {
        vec2  gp = centered(vec2(mix(0.15, 0.85, uKeypos), 0.5));
        vec2  local = p - gp;
        // Mas grande (1.3 -> 2.0) y con un borde brillante -- la copia
        // chica se perdia entre las demas, pedido explicito de que se
        // note mas al tocar.
        float gSize = size * 2.0;
        if (abs(local.x) < gSize * 0.5 && abs(local.y) < gSize * 0.5) {
            vec2  guv = local / gSize + 0.5;
            vec3  gsrc = mediaTex(guv).rgb;
            col = mix(col, gsrc * (1.3 + uKeyvel * 0.9), uKeypulse);
        }
        float edgeGD = max(abs(local.x), abs(local.y)) - gSize * 0.5;
        col += vec3(1.0) * exp(-edgeGD * edgeGD * 250.0) * uKeypulse * (0.5 + uKeyvel * 0.6);
    }

    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 2.0);
    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
