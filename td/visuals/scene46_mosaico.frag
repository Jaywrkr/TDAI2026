// ===============================================================
// SCENE - MOSAICO
// La imagen de la carpeta comun partida en una grilla de baldosas --
// cada baldosa muestra su propio recorte de la imagen, y gira/se
// voltea de a una sola, a saltos, en vez de mover todo el mosaico
// junto -- como una pared de paneles que van cambiando.
// ===============================================================
//
// COMO FUNCIONA
// La pantalla se parte en una grilla (Density). Cada celda tiene su
// propio "reseed" (un contador que avanza a saltos, con fase propia
// por celda) que decide su rotacion actual (0/90/180/270) y si esta
// espejada -- igual que barajar una sola baldosa del mosaico por vez,
// nunca todas juntas.
//
// CONTROLES
//   Speed    velocidad a la que las baldosas van cambiando de a una
//   Density  cuantas baldosas tiene el mosaico
//   Hue      tinte que se mezcla sobre el mosaico (0 = colores
//            originales)
//   Chaos    cuanta variacion de brillo hay entre baldosas
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     ademas del flash, adelanta el barajado
//   High     vibracion micro de cada baldosa (excepcion del contrato)
//
// @D1: grosor de la junta entre baldosas
// @D2: cuanto se ve oscurecida la junta (apenas <-> bien marcada)
// @D3: cuanto zoom tiene cada baldosa sobre la imagen
// @D4: mezcla de tinte de Hue sobre el mosaico
// @D5: probabilidad de que una baldosa este espejada
// @D6: ganancia general antes del brillo de audio
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;

    float cols = 3.0 + floor(uDensity * 7.99);
    vec2  uvAsp = vec2(uv.x * uAspect, uv.y);
    vec2  g = uvAsp * cols;
    vec2  gi = floor(g);
    vec2  gf = fract(g);

    // Reseed por celda: cada baldosa avanza a SU propio ritmo (fase
    // fija por celda), asi barajan de a una en vez de todas juntas.
    float rate = mix(0.15, 2.0, uSpeed);
    float ownPhase = hash21(gi + 9.0) * 30.0;
    float shuffleStep = floor(t * rate + ownPhase + uKick * 6.0);

    int   rot = int(mod(hash21(gi + shuffleStep * 3.1 + 1.0) * 4.0, 4.0));
    float mirrorX = step(hash21(gi + shuffleStep * 5.3 + 2.0), mix(0.0, 0.5, uD5));

    vec2  tuv = gf;
    if (mirrorX > 0.5) tuv.x = 1.0 - tuv.x;
    if (rot == 1) tuv = vec2(tuv.y, 1.0 - tuv.x);
    else if (rot == 2) tuv = vec2(1.0 - tuv.x, 1.0 - tuv.y);
    else if (rot == 3) tuv = vec2(1.0 - tuv.y, tuv.x);

    // D3: zoom -- cada baldosa muestra un recorte de la imagen, no
    // siempre la imagen entera.
    float zoom = mix(1.0, 3.5, uD3);
    vec2  zoomOff = hash22(gi + 20.0) * (1.0 - 1.0 / max(zoom, 1.0));
    vec2  muv = clamp(tuv / zoom + zoomOff, 0.0, 1.0);

    vec3  src = mediaTex(muv).rgb;

    // Chaos: variacion de brillo entre baldosas, fija por celda.
    float brightJitter = mix(1.0, 0.4 + hash21(gi + 30.0) * 1.2, uChaos);
    src *= brightJitter;

    float h = audioHue(uHue, uMid * 0.10);
    vec3  tint = hsv2rgb(vec3(h, 0.7, 1.0));
    float lum = dot(src, vec3(0.299, 0.587, 0.114));
    vec3  col = mix(src, tint * lum, uD4);

    // Junta entre baldosas.
    vec2  edgeDist = min(gf, 1.0 - gf);
    float lineD = min(edgeDist.x, edgeDist.y);
    float jointW = mix(0.002, 0.03, uD1);
    float joint = 1.0 - smoothstep(0.0, jointW, lineD);
    col *= mix(1.0, 1.0 - uD2 * 0.85, joint);

    // uHigh: vibracion micro de brillo por baldosa -- unica excepcion
    // del contrato, amplitud pequena.
    col *= 1.0 + uHigh * 0.03 * sin(t * 10.0 + hash21(gi) * TAU);

    col *= 0.6 + uD6 * 0.7;

    // PIANO: la columna de baldosas mas cercana a uKeypos destella
    // blanco.
    if (uKeypulse > 0.0015) {
        float targetCol = floor(mix(0.5, uAspect * cols - 0.5, uKeypos));
        float onGuest = 1.0 - smoothstep(0.0, 0.6, abs(gi.x - targetCol));
        col += vec3(1.0) * onGuest * uKeypulse * (0.5 + uKeyvel * 0.6);
    }

    col += col * uKick * 0.3;
    col = audioLift(col, uBass * 2.2);
    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
