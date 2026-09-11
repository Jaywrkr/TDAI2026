// ===============================================================
// SCENE - LASERES
// Un abanico de haces de laser finos que barren el cielo desde uno o
// varios puntos, como las luces de un techo de club -- cada haz gira
// a su propia velocidad, se cruza con los demas, y brilla mas fuerte
// justo donde dos haces se tocan.
// ===============================================================
//
// COMO FUNCIONA
// Cada haz es una linea recta (parametrizacion de Hesse: distancia con
// signo al haz, igual que scene07_neontubes) cuyo angulo gira con el
// tiempo a una velocidad propia (hash por haz). El resplandor ancho de
// cada haz hace de "humo" -- no hay una capa de niebla aparte, para
// mantenerlo barato.
//
// CONTROLES
//   Speed    velocidad de giro de los haces
//   Density  cuantos haces hay
//   Hue      color base de los laseres
//   Chaos    cuanto se dispersan los origenes de los haces
//   Bass     brillo de lo ya claro (audioLift) + resplandor extra
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en todos los haces
//   High     vibracion micro del angulo (excepcion del contrato)
//
// @D1: grosor del nucleo de cada haz
// @D2: cantidad de resplandor (glow/humo) alrededor de cada haz
// @D3: cuantos origenes distintos tienen los haces (1 <-> varios)
// @D4: dispersion de velocidad de giro entre haces
// @D5: brillo donde dos haces se cruzan
// @D6: cuantos colores distintos hay entre los haces
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    int   nBeams = 3 + int(floor(uDensity * 8.99));
    int   nOrigins = 1 + int(floor(uD3 * 3.99));

    float h = audioHue(uHue, uMid * 0.10);
    vec3  col = vec3(0.0);

    float dists[12];

    for (int i = 0; i < 12; i++) {
        if (i >= nBeams) break;
        float fi = float(i);
        vec2  seed = vec2(fi * 6.1 + 2.0, fi * 3.3 + 9.0);

        int   originIdx = int(mod(fi, float(nOrigins)));
        vec2  originSeed = vec2(float(originIdx) * 5.5 + 1.0, float(originIdx) * 2.3 + 4.0);
        vec2  origin = (hash22(originSeed) - 0.5) * vec2(uAspect, 1.0) * 1.6 * uChaos;

        float spinSpeed = (0.15 + hash21(seed + 1.0) * (0.5 + uD4 * 1.5)) * (0.3 + uSpeed * 1.4);
        float spinDir = hash21(seed + 2.0) > 0.5 ? 1.0 : -1.0;
        float ang = hash21(seed) * TAU + t * spinSpeed * spinDir;
        ang += uHigh * 0.01 * sin(t * 10.0 + fi);

        vec2  nrm = vec2(cos(ang), sin(ang));
        vec2  rel = p - origin;
        float dist = dot(rel, vec2(-nrm.y, nrm.x));
        dists[i] = dist;

        float along = dot(rel, nrm);
        float coreW = 0.003 + uD1 * 0.01;
        float core = edgeLine(dist, coreW) * step(0.0, along);
        float glowW = 0.002 + uD2 * 0.05;
        float glow = exp(-dist * dist / glowW) * step(0.0, along) * (0.5 + uBass * 0.6);

        int   colorGroup = int(mod(hash21(seed + 7.0) * 4.0, 4.0));
        vec3  beamCol = hsv2rgb(vec3(fract(h + float(colorGroup) * 0.22 * uD6), 0.55, 1.0));

        col += beamCol * (core * 1.4 + glow * 0.6);
    }

    // D5: brillo donde dos haces se cruzan de verdad.
    if (uD5 > 0.001) {
        for (int i = 0; i < 12; i++) {
            if (i >= nBeams) break;
            for (int j = i + 1; j < 12; j++) {
                if (j >= nBeams) break;
                float ci = exp(-dists[i] * dists[i] / 0.0015);
                float cj = exp(-dists[j] * dists[j] / 0.0015);
                col += vec3(1.0) * (ci * cj) * uD5 * 1.6;
            }
        }
    }

    // PIANO: un haz extra, brillante, aparece con un angulo elegido
    // por uKeypos.
    if (uKeypulse > 0.0015) {
        float kAng = uKeypos * TAU;
        vec2  nrm = vec2(cos(kAng), sin(kAng));
        float dist = dot(p, nrm);
        float core = edgeLine(dist, 0.012);
        float glow = exp(-dist * dist / 0.006);
        col += vec3(1.0) * (core + glow * 0.6) * uKeypulse * (0.6 + uKeyvel * 1.0);
    }

    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.3);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
