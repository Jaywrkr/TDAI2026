// ===============================================================
// SCENE 06 - WEB
// Enjambre de lineas rectas que convergen hacia un puñado de nodos
// centrales, como un grafo de fuerzas dirigidas ("hairball"). Reemplaza
// a "marble" para este slot.
// ===============================================================
//
// COMO FUNCIONA
//
// No hay datos de grafo real: cada "arista" es un segmento (con un leve
// doblez en el medio, controlado por Chaos) que sale de uno de 3
// sub-nodos cercanos entre si -- eso da el aspecto de "hairball" de un
// grafo de fuerzas en vez de un simple estallido de rayos desde un unico
// punto perfecto. La distancia de cada pixel al segmento (formula
// estandar punto-segmento) alimenta edgeLine() para el trazo nitido mas
// un exp() ancho para el halo -- se SUMAN todas las lineas (no max), asi
// que donde se acumulan cerca de los nodos se ve casi blanco solido, y
// hacia afuera se leen hebras sueltas. Encima, un puñado de particulas
// sueltas dispersas cerca del enjambre.
//
// CONTROLES
//   Speed    velocidad de deriva del cluster de nodos
//   Density  cuantas lineas tiene el enjambre
//   Hue      color del resplandor cerca de los nodos (el resto queda
//            casi blanco/gris a proposito -- no es un visual arcoiris)
//   Chaos    cuanto se doblan las lineas (dejan de ser rectas)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     flash breve
//   High     vibracion micro de los nodos (excepcion del contrato)
//
// @D1: grosor de las lineas
// @D2: dispersion del cluster -- poco D2 = converge casi a un punto, mas
//      D2 = nodos e hilos mas repartidos por la pantalla
// ===============================================================

float segDist(vec2 p, vec2 a, vec2 b)
{
    vec2 ab = b - a;
    vec2 ap = p - a;
    float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return length(ap - ab * h);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    vec2 hub = 0.10 * vec2(sin(t * 0.05), cos(t * 0.04));
    // uHigh: vibracion micro de los nodos -- unica excepcion del
    // contrato, amplitud pequena, ya suavizado.
    hub += uHigh * 0.01 * vec2(sin(t * 9.0), cos(t * 8.0));

    float spread = 0.06 + uD2 * 0.55;
    float lineW = 0.9 + uD1 * 3.0;

    int   n = 10 + int(floor(uDensity * 29.99));
    float field = 0.0;

    for (int i = 0; i < 40; i++) {
        if (i >= n) break;

        float fi = float(i);
        vec2 seed = vec2(fi, fi * 5.3);

        // 3 sub-nodos cercanos entre si, no un unico punto -- asi el
        // enjambre no se lee como un sol de rayos perfecto.
        float sub = mod(fi, 3.0);
        vec2 subOff = (hash22(vec2(sub, 1.0)) - 0.5) * spread * 0.6;
        vec2 origin = hub + subOff;

        float ang = hash21(seed) * TAU;
        float len = 0.35 + hash21(seed + 1.0) * 1.35;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec2 end = origin + dir * len;

        // Doblez en el medio: Chaos aleja el punto medio de la recta.
        vec2 mid = (origin + end) * 0.5;
        vec2 perp = vec2(-dir.y, dir.x);
        mid += perp * (hash21(seed + 2.0) - 0.5) * uChaos * 0.6;

        float d = min(segDist(p, origin, mid), segDist(p, mid, end));
        field += edgeLine(d, lineW) + exp(-d * d / 0.006) * 0.25;
    }

    // Particulas sueltas dispersas cerca del enjambre.
    float dots = 0.0;
    for (int i = 0; i < 20; i++) {
        float fi = float(i);
        vec2 seed = vec2(fi * 2.1, fi * 7.7);
        vec2 dpos = hub + (hash22(seed) - 0.5) * (spread * 2.5 + 0.05);
        float dd = length(p - dpos);
        float size = 0.008 + hash21(seed + 3.0) * 0.012;
        dots += exp(-dd * dd / (size * size));
    }

    float hubDist = length(p - hub);
    float accent = exp(-hubDist * hubDist / 0.05);
    vec3 white = vec3(0.85);
    vec3 accentCol = hsv2rgb(vec3(audioHue(uHue, uMid * 0.05), 0.75, 1.0));
    vec3 lineCol = mix(white, accentCol, accent * 0.75);

    vec3 col = lineCol * field + vec3(1.0) * dots * 0.8;

    // Kick: flash breve.
    col += col * uKick * 0.5;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
