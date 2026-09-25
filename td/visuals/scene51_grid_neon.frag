// ===============================================================
// GRID NEON
// Cuadricula con perspectiva (piso infinito estilo synthwave) mas un
// horizonte con resplandor -- tecnica clasica de demoscene/retrowave,
// dominio publico, reescrita para este rig. No es un port de ningun
// shader puntual de Shadertoy.
// ===============================================================
//
// CONTROLES
//   Speed    velocidad con la que la grilla avanza hacia la camara
//   Density  cuantas lineas entran en la grilla (tamano de celda)
//   Hue      paleta completa del neon
//   Chaos    ondulacion del piso (deja de ser perfectamente plano)
//   Bass     brillo general (audioLift)
//   Mid      tinte que se mueve con la musica (audioHue)
//   Kick     destello breve
//
// @D1: grosor de las lineas de neon
// @D2: altura del horizonte
// @D3: intensidad del resplandor del sol/horizonte
// @D4: cuanto ondula el piso (junto con Chaos)
// @D5: niebla del piso lejano (limpio <-> se hunde en la bruma)
// @D6: brillo del nucleo de cada linea
// ===============================================================

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);
    float horizon = mix(-0.3, 0.35, uD2);
    vec3 col = vec3(0.0);

    // Cielo: degrade simple + sol/horizonte con resplandor exponencial.
    float skyMask = smoothstep(horizon + 0.02, horizon + 0.6, p.y);
    vec3 skyTop = hsv2rgb(vec3(fract(uHue + 0.62), 0.65, 0.35));
    vec3 skyBot = hsv2rgb(vec3(fract(uHue + 0.85), 0.55, 0.75));
    col += mix(skyBot, skyTop, clamp((p.y - horizon) / 0.6, 0.0, 1.0)) * skyMask;
    float sunGlow = exp(-abs(p.y - horizon) * mix(2.0, 8.0, 1.0 - uD3)) * mix(0.3, 1.2, uD3);
    col += hsv2rgb(vec3(fract(uHue), 0.5, 1.0)) * sunGlow;

    // Piso: proyeccion en perspectiva de un plano infinito. z avanza con
    // el tiempo (Speed), nunca con audio -- geometria estable.
    if (p.y < horizon) {
        float cam = 1.1;
        float gy = cam / (horizon - p.y);
        float gx = p.x * gy;
        float z = gy + uTime * (0.8 + uSpeed * 2.2);

        // Ondulacion barata del piso: un seno de baja frecuencia sobre z,
        // SOLO afecta el brillo de la linea (via el offset de fase), no
        // la posicion de la camara ni la cantidad de lineas.
        float wob = uChaos * mix(0.0, 0.6, uD4) * sin(z * 0.35);

        float cell = mix(0.5, 1.6, 1.0 - uDensity);
        float lx = edgeLine(abs(fract(gx / cell + wob * 0.1) - 0.5) * cell - cell * 0.5 + 0.5, mix(1.0, 3.0, uD1)) ;
        float lz = edgeLine(abs(fract(z / cell) - 0.5) * cell - cell * 0.5 + 0.5, mix(1.0, 3.0, uD1));
        float lines = max(lx, lz);

        float fade = clamp(1.0 - (horizon - p.y) * 1.3, 0.0, 1.0);
        vec3 neon = hsv2rgb(vec3(fract(uHue + 0.08), 0.85, 1.0));
        col += neon * lines * (0.4 + fade * 0.6) * mix(0.5, 1.8, uD6);
        col *= 1.0 - mix(0.05, 0.55, uD5) * (1.0 - fade); // el piso lejano se hunde en la niebla
    }

    // AUDIO -- bajos = brillo, medios = tinte, agudos = destello micro
    // (el nucleo de cada linea, sin tocar su ancho).
    col = audioLift(col, uBass * 0.75);
    float h2 = audioHue(uHue, uMid * 0.05);
    col = mix(col, hsv2rgb(vec3(fract(h2 + 0.08), 0.85, 1.0)) * (col.r + col.g + col.b) * 0.33, 0.35);
    col += col * uHigh * 0.15;
    col += col * uKick * 0.4;

    col = col / (1.0 + col);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;
    return vec4(max(col, 0.0), 1.0);
}
