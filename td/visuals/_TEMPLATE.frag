// ===============================================================
// PLANTILLA DE VISUAL - TD-VJ
// Copia este archivo a: visuals/sceneNN_nombre.frag  (NN = 00..19)
// ===============================================================
//
// REGLAS
//   1. Define UNA sola funcion:  vec4 render(vec2 uv)
//   2. NO escribas main(). El footer automatico lo pone.
//   3. NO multipliques por uBright: el master fade lo aplica el core.
//   4. uv va de 0..1. Usa centered(uv) para coordenadas con aspecto correcto.
//
// UNIFORMS (los inyecta el header, no los declares)
//   uSpeed uDensity uHue uChaos    knobs 1-4, todos 0..1
//   uBright                        master fade (solo informativo)
//   uLevel uBass uMid uHigh        audio, 0..1
//   uKick                          transitorio de graves, 0..1
//   uBeat                          envolvente que decae tras cada golpe, 0..1
//   uTime                          segundos YA escalados por Speed  <- usa este
//   uRTime                         segundos reales (independientes de Speed)
//   uResW uResH uAspect uScene
//
// HELPERS
//   rot2(a) hash21(p) hash22(p) noise21(p) fbm(p,oct[,rough])
//   ridge(n,sharp) hsv2rgb(hsv) centered(uv) vignette(uv,amt)
//
// PRESUPUESTO: apunta a <2 ms de GPU a 1280x720. Cada fbm de 4 octavas
// cuesta; si bajas fps, baja las octavas antes que la resolucion.
// ===============================================================

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);
    float t = uTime;

    // Campo de ruido base, modulado por los knobs.
    float n = fbm(p * (1.0 + uDensity * 4.0) + t * 0.15,
                  4,
                  0.35 + uChaos * 0.45);

    // Reaccion al audio.
    float energy = 0.25 + uLevel * 0.5 + uKick * 0.6;

    // Cada escena sin visual propio sale de un color distinto. Asi, mientras
    // pruebas, VES que el cambio de escena ocurrio de verdad.
    float h = fract(uHue + float(uScene) * 0.137);

    vec3 col = hsv2rgb(vec3(fract(h + n * 0.25), 0.75, n * energy));

    col *= vignette(uv, 0.6);
    return vec4(col, 1.0);
}
