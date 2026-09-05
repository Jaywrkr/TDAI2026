// ===============================================================
// SCENE 28 - MEDUSAS / BIOLUMINISCENCIA
// Medusas translucidas con campana pulsante y tentaculos ondulantes,
// glow azul/violeta tipo criatura de aguas profundas -- la contraparte
// organica-figurativa del set (nada mas se parece a un ser vivo
// reconocible).
// ===============================================================
//
// COMO FUNCIONA
// Cada medusa tiene una "campana" (domo achatado, smoothstep sobre una
// distancia con Y comprimida) cuyo radio PULSA con el tiempo y los
// graves -- la propulsion real de una medusa. Los tentaculos son varias
// lineas que cuelgan del borde inferior de la campana, cada una
// ondulando con su propia fase (seno evaluado en la posicion vertical,
// como una cuerda colgando en una corriente).
//
// CONTROLES
//   Speed    velocidad de la pulsacion de la campana
//   Density  cuantas medusas hay
//   Hue      color base (azul/violeta por defecto via offset)
//   Chaos    cuanto ondulan los tentaculos
//   Bass     la campana pulsa mas fuerte (geometria real) + brillo
//   Mid      tinte adicional (audioHue)
//   Kick     destello breve en toda la medusa
//   High     no usado directo (reservado)
//
// @D1: brillo/opacidad de la campana
// @D2: cuantos tentaculos cuelgan de cada medusa
// @D3: amplitud de la ondulacion de los tentaculos
// @D4: largo de los tentaculos
// ===============================================================

float bellShape(vec2 p, float pulse)
{
    vec2 pp = p;
    pp.y *= 1.5;
    float r = length(pp);
    return smoothstep(pulse, pulse - 0.12, r) * smoothstep(-pulse * 1.3, -pulse * 0.2, p.y);
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    vec3  col = vec3(0.0);

    int n = 1 + int(floor(uDensity * 3.99));
    float h = audioHue(fract(uHue + 0.6), uMid * 0.1);

    for (int i = 0; i < 4; i++) {
        if (i >= n) break;
        float fi = float(i);
        vec2 seed = vec2(fi * 13.0, fi * 5.0);
        vec2 basePos = vec2((hash21(seed) - 0.5) * 1.3, (hash21(seed + 1.0) - 0.3) * 0.5);
        basePos += 0.08 * vec2(sin(t * 0.08 + fi * 2.0), cos(t * 0.06 + fi * 1.7));

        float pulse = 0.16 + 0.05 * sin(t * (0.7 + uSpeed * 1.2) + fi * 2.0) + uBass * 0.07;
        vec2 pl = p - basePos;

        float bell = bellShape(pl, pulse) * (0.4 + uD1 * 0.9);
        vec3 jellyCol = hsv2rgb(vec3(fract(h + fi * 0.06), 0.6, 1.0));
        col += jellyCol * bell;

        float rim = abs(bellShape(pl, pulse + 0.015) - bellShape(pl, pulse));
        col += vec3(0.85, 0.95, 1.0) * rim * 6.0;

        // Tentaculos: lineas onduladas colgando del borde de la campana.
        int nTent = 3 + int(floor(uD2 * 6.0));
        float tentLen = 0.3 + uD4 * 0.9;
        for (int k = 0; k < 9; k++) {
            if (k >= nTent) break;
            float fk = float(k);
            float tx0 = (fk / max(float(nTent - 1), 1.0) - 0.5) * pulse * 1.5;
            float below = max(0.0, -pl.y - pulse * 0.5);
            float tentWave = sin(t * (1.2 + uSpeed * 0.6) + fk * 1.9 - below * 5.0)
                            * (0.06 + uChaos * 0.12) * (0.3 + uD3 * 1.0);
            float tentX = tx0 + tentWave * below;
            float dTent = abs(pl.x - tentX);
            // Banda vertical acotada ARRIBA y ABAJO -- sin el limite de
            // arriba, el tentaculo se veia como una linea que sigue para
            // siempre hacia arriba, atravesando la campana en vez de
            // colgar solo debajo de ella.
            float tentStart = smoothstep(-tentLen - 0.05, -tentLen + 0.05, pl.y);
            float tentEnd = smoothstep(-pulse * 0.35, -pulse * 0.55, pl.y);
            float tentMaskY = tentStart * tentEnd;
            float tent = smoothstep(0.012, 0.0, dTent) * tentMaskY;
            col += jellyCol * tent * 0.65;
        }
    }

    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.4);
    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
