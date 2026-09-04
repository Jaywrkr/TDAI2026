// ===============================================================
// SCENE 08 - MOIRE
// Dos familias de lineas paralelas rotando, entramado con nodos de color.
// ===============================================================
//
// COMO FUNCIONA
//
// Dos rejillas de lineas paralelas (no una rejilla 2D como scene06, solo
// franjas en un angulo) se superponen con angulos distintos, cada una de
// su color. Donde coinciden aparece un nodo brillante -- el entramado
// tejido que resulta de animar el angulo relativo es el efecto.
//
// OJO -- esto NO es el moire fotografico clasico (las bandas anchas de
// interferencia que salen de fotografiar una tela a rayas). Ese efecto es
// en el fondo un artefacto de ALIASING, y edgeLine() esta hecho
// especificamente para EVITAR aliasing (ancho de linea constante via
// fwidth). Con lineas bien antialiaseadas, lo que se ve es un entramado
// limpio con nodos de interseccion, no el batido optico -- verificado
// renderizando en CPU antes de asumir que se veia como el nombre promete.
//
// Cada familia usa el mismo patron que scene06 (sawtooth de una
// coordenada -> edgeLine para ancho constante en pixeles). El
// zero-crossing de edgeLine cae lejos del salto del sawtooth (ver
// scene07 para el detalle de por que eso es seguro), asi que no hay
// riesgo de artefacto en el borde.
//
// Nada de ruido ni fbm: es geometria pura, de las escenas mas baratas
// del set.
//
// CONTROLES
//   Speed    velocidad de rotacion de la segunda familia sobre la primera
//   Density  frecuencia de las lineas (mas Density = patron mas fino)
//   Hue      paleta: color de cada familia + el brillo de los nodos
//   Chaos    separacion angular entre las dos familias -- 0 casi las
//            alinea (celdas del entramado grandes y alargadas), mas
//            separacion = celdas mas chicas y cuadradas
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro del angulo (excepcion del contrato)
//
// @D1: grosor de las lineas
// @D2: separacion angular extra, encima de Chaos
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    p = rot2(t * 0.03) * p;

    float freq = 6.0 + uDensity * 30.0;
    float sep = 0.04 + uChaos * 0.5 + uD2 * 0.35;

    // uHigh: vibracion micro del angulo de la segunda familia -- unica
    // excepcion del contrato de audio, amplitud pequena, ya suavizado.
    float a1 = 0.0;
    float a2 = sep + t * (0.02 + uSpeed * 0.08) + uHigh * 0.01 * sin(t * 10.0);

    vec2 dir1 = vec2(cos(a1), sin(a1));
    vec2 dir2 = vec2(cos(a2), sin(a2));

    float c1 = dot(p, dir1) * freq;
    float c2 = dot(p, dir2) * freq;

    float lineW = 0.6 + uD1 * 2.2;
    float l1 = edgeLine(fract(c1) - 0.5, lineW);
    float l2 = edgeLine(fract(c2) - 0.5, lineW);

    float h1 = audioHue(uHue, uMid * 0.05);
    float h2 = audioHue(fract(uHue + 0.5), uMid * 0.05);
    vec3 col1 = hsv2rgb(vec3(h1, 0.80, 1.0));
    vec3 col2 = hsv2rgb(vec3(h2, 0.80, 1.0));

    vec3 col = col1 * l1 + col2 * l2;

    // Brillo extra donde ambas familias coinciden -- marca cada nodo de
    // interseccion del entramado.
    col += vec3(1.0) * l1 * l2 * 0.5;

    // Kick: flash breve.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.6);

    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
