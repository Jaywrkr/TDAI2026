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
//   5. El audio SOLO toca brillo y color, NUNCA geometria (posicion, ancho
//      de linea, radio, cobertura). Usa audioLift/audioHue -- ver abajo y
//      docs/03_VISUAL_SPEC.md, seccion "Contrato de audio".
//
// UNIFORMS (los inyecta el header, no los declares)
//   uSpeed uDensity uHue uChaos    knobs 1-4, todos 0..1
//   uBright                        master fade (solo informativo)
//   uLevel uBass uMid uHigh        audio, 0..1 -- SOLO brillo/color, ver regla 5
//   uKick                          transitorio de graves, 0..1
//   uBeat                          envolvente que decae tras cada golpe, 0..1
//   uKeypulse uKeypos uKeyvel      piano: pulso/tono/fuerza de la ultima tecla
//                                  (el anillo base ya sale gratis del footer)
//   uD1..uD6                       perillas de Detail -- documenta con
//                                  @D1..@D6, ver abajo y docs/03_VISUAL_SPEC.md
//   uTime                          segundos YA escalados por Speed  <- usa este
//   uRTime                         segundos reales (independientes de Speed)
//   uResW uResH uAspect uScene
//
// HELPERS
//   rot2(a) hash21(p) hash22(p) noise21(p) fbm(p,oct[,rough])
//   ridge(n,sharp) hsv2rgb(hsv) centered(uv) vignette(uv,amt)
//   audioLift(col,amount)   bajos/nivel -> brillo, ver regla 5
//   audioHue(hue,amount)    medios -> tinte, ver regla 5
//
// PRESUPUESTO: apunta a <2 ms de GPU a 1280x720. Cada fbm de 4 octavas
// cuesta; si bajas fps, baja las octavas antes que la resolucion.
//
// DETALLE -- ejemplo funcional. Borra estas dos lineas (@D1/@D2) y su uso
// en render() si tu visual no necesita perillas Detail.
// @D1: densidad extra de ruido (encima de Density)
// @D2: fuerza del vignette
// ===============================================================

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);
    float t = uTime;

    // Campo de ruido base, modulado por los knobs. uD1 suma densidad extra
    // encima de la del knob Density -- asi se ve como una perilla Detail
    // hace algo relacionado pero mas fino que el knob principal.
    float n = fbm(p * (1.0 + uDensity * 4.0 + uD1 * 3.0) + t * 0.15,
                  4,
                  0.35 + uChaos * 0.45);

    // Cada escena sin visual propio sale de un color distinto. Asi, mientras
    // pruebas, VES que el cambio de escena ocurrio de verdad.
    float h = audioHue(fract(uHue + float(uScene) * 0.137), uMid * 0.05);

    vec3 col = hsv2rgb(vec3(fract(h + n * 0.25), 0.75, n * (0.35 + uKick * 0.5)));

    // Bajos: brillo de lo que ya esta claro. Nunca geometria (regla 5).
    col = audioLift(col, uBass * 0.7);

    // uD2: fuerza del vignette. 0 = casi sin vignette, 1 = bien marcado.
    col *= vignette(uv, 0.35 + uD2 * 0.45);
    return vec4(col, 1.0);
}
