// ===============================================================
// SCENE - PERSIANAS
// La imagen de la carpeta comun vista a traves de unas persianas
// venecianas -- franjas horizontales que se abren y se cierran,
// dejando ver mas o menos imagen segun el angulo, con las franjas
// respirando solas y reaccionando al bajo.
// ===============================================================
//
// COMO FUNCIONA
// La pantalla se parte en franjas horizontales (Density). Cada franja
// es una "lama" que se inclina: el angulo de apertura decide cuanta
// franja se ve clara (imagen) contra cuanta se ve el canto oscuro de
// la lama de arriba -- el mismo efecto optico de una persiana real
// vista de frente.
//
// CONTROLES
//   Speed    velocidad a la que respiran las lamas (se abren/cierran)
//   Density  cuantas lamas tiene la persiana
//   Hue      tinte que se mezcla sobre la imagen (0 = colores
//            originales)
//   Chaos    cuanto varia la apertura entre lamas vecinas
//   Bass     brillo de lo ya claro (audioLift) + las lamas se abren
//            un poco mas
//   Mid      tinte adicional (audioHue)
//   Kick     las lamas se abren de golpe un instante
//   High     vibracion micro del angulo de cada lama (excepcion)
//
// @D1: apertura base de las lamas (casi cerradas <-> bien abiertas)
// @D2: grosor del canto oscuro de cada lama
// @D3: velocidad de deriva vertical de la imagen detras
// @D4: mezcla de tinte de Hue sobre la imagen
// @D5: brillo del canto de cada lama (mate <-> con brillo metalico)
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;

    float nSlats = 8.0 + floor(uDensity * 30.99);
    float slatY = uv.y * nSlats;
    float slatId = floor(slatY);
    float slatF = fract(slatY);

    // Apertura: respira sola con el tiempo, Chaos la varia por lama,
    // Bass/Kick la abren un poco mas encima.
    float breathe = sin(t * (0.2 + uSpeed * 0.8) + hash21(vec2(slatId, 1.0)) * TAU);
    float jitter = mix(1.0, 0.4 + hash21(vec2(slatId, 2.0)) * 1.2, uChaos);
    float openBase = mix(0.08, 0.95, uD1);
    float open = clamp(openBase * jitter + breathe * 0.06
                       + uBass * 0.12 + uKick * 0.35, 0.02, 0.98);
    open += uHigh * 0.01 * sin(t * 12.0 + slatId);

    float visible = step(1.0 - open, slatF);

    // Deriva vertical de la imagen detras de las lamas -- D3.
    float drift = t * (0.02 + uD3 * 0.15);
    vec2  muv = vec2(uv.x, fract(uv.y + drift));
    vec3  src = mediaTex(muv).rgb;

    float h = audioHue(uHue, uMid * 0.10);
    vec3  tint = hsv2rgb(vec3(h, 0.7, 1.0));
    float lum = dot(src, vec3(0.299, 0.587, 0.114));
    vec3  imgCol = mix(src, tint * lum, uD4);

    // Canto de la lama: oscuro, con un brillo metalico apenas (D5).
    float edgeW = mix(0.02, 0.16, uD2);
    float onEdge = 1.0 - smoothstep(0.0, edgeW, abs(slatF - (1.0 - open)));
    vec3  edgeCol = vec3(0.05, 0.05, 0.06) + vec3(0.5, 0.55, 0.6) * (0.1 + uD5 * 0.4) * onEdge;

    vec3  col = mix(edgeCol, imgCol, visible);

    col *= 0.6 + uD6 * 0.7;

    // PIANO: una lama especifica (elegida por uKeypos) se abre del
    // todo un instante.
    if (uKeypulse > 0.0015) {
        float targetSlat = floor(mix(0.0, nSlats - 1.0, uKeypos));
        // Rango mas ancho (0.8 -> 1.8 lamas vecinas) y mezcla mas
        // fuerte -- una sola lama entre 8-39 casi no se notaba, pedido
        // explicito de que se note mas al tocar.
        float onSlat = 1.0 - smoothstep(0.0, 1.8, abs(slatId - targetSlat));
        col = mix(col, imgCol * 1.6, onSlat * uKeypulse * (0.8 + uKeyvel * 0.8));
        col += vec3(1.0) * onSlat * uKeypulse * (0.3 + uKeyvel * 0.4);
    }

    col += col * uKick * 0.2;
    col = audioLift(col, uBass * 2.0);
    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
