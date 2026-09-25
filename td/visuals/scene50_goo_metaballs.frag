// ===============================================================
// GOO METABALLS
// Un puñado de circulos con smooth-min (la tecnica clasica de metaballs,
// dominio publico) que se funden entre si como gotas de liquido. Costo
// minimo: unas pocas evaluaciones de distancia por pixel, cero loops de
// ruido. Tecnica generica, no un port de ningun shader puntual.
// ===============================================================
//
// CONTROLES
//   Speed    velocidad con la que orbitan las gotas
//   Density  cuantas gotas hay en pantalla
//   Hue      paleta completa del liquido
//   Chaos    cuanto se desvia cada gota de su orbita circular (organico)
//   Bass     brillo del liquido (audioLift)
//   Mid      tinte que se mueve con la musica (audioHue)
//   Kick     destello breve en el borde
//
// @D1: tamano de cada gota
// @D2: que tan suave es la fusion entre gotas (blobby <-> separadas)
// @D3: velocidad de la deformacion organica (Chaos)
// @D4: grosor del borde brillante
// @D5: dispersion de las gotas (juntas al centro <-> separadas)
// @D6: brillo del centro de cada gota
// ===============================================================

float sminGoo(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);

    int n = int(mix(3.0, 8.0, uDensity) + 0.5);
    float rad = mix(0.28, 0.55, uD1);
    float k = mix(0.05, 0.6, uD2);       // suavidad de la fusion
    float wob = uChaos * mix(0.15, 0.6, uD3);

    float d = 1e5;
    for (int i = 0; i < 8; i++) {
        if (i >= n) break;
        float fi = float(i);
        float ang = fi * (TAU / 8.0) + uTime * (0.25 + uSpeed * 0.6) * (0.6 + 0.08 * fi);
        float orbit = mix(0.30, 0.80, uD5) + 0.12 * sin(fi * 1.7);
        vec2 c = orbit * vec2(cos(ang), sin(ang));
        // Deformacion organica: cada gota respira a su propio ritmo,
        // SOLO afecta su radio local (nunca la posicion ni el conteo).
        float breathe = 1.0 + wob * sin(uTime * (0.8 + fi * 0.3) + fi * 2.1);
        float di = length(p - c) - rad * breathe * (0.7 + 0.3 / float(n) * 3.0);
        d = sminGoo(d, di, k);
    }

    float inside = smoothstep(0.02, -0.02, d);
    float rim = 1.0 - smoothstep(0.0, mix(0.02, 0.12, uD4), abs(d));

    vec3 base = hsv2rgb(vec3(fract(uHue), 0.7, 0.9));
    vec3 col = base * inside * (0.35 + mix(0.3, 1.4, uD6) * smoothstep(0.3, -0.3, d));
    col += base * rim * 1.4;

    // AUDIO -- bajos = brillo, medios = tinte, agudos = destello micro en
    // el borde (unos pocos px, no cambia la forma).
    col = audioLift(col, uBass * 0.8);
    float h2 = audioHue(uHue, uMid * 0.05);
    col = mix(col, hsv2rgb(vec3(fract(h2), 0.7, 0.9)) * (inside * 0.6 + rim), 0.45);
    col += base * rim * uHigh * 0.5;
    col += col * uKick * 0.4;

    col = col / (1.0 + col);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;
    return vec4(max(col, 0.0), 1.0);
}
