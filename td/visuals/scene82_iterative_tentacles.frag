// ===============================================================
// SCENE - ITERATIVE TENTACLES
// Ramas finas y puntos blancos nacen de un nucleo brillante.
// Referencia: https://www.youtube.com/watch?v=k8SnB1mZpII
// Version polar analitica de una pasada, sin POPs ni feedback.
// uTime se congela en silencio; no hay zoom autonomo.
//
// @D1: longitud de tentaculos
// @D2: grosor de ramas
// @D3: cantidad de ramas
// @D4: curvatura de trayectorias
// @D5: brillo de puntas
// @D6: intensidad del nucleo
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float r = length(p);
    if (r > 1.15) return vec4(0.0, 0.0, 0.0, 1.0);

    float theta = atan(p.y, p.x);
    float t = uTime * 0.32;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float count = 38.0 + floor(uD3 * 28.0 + uDensity * 20.0);
    float lengthScale = 0.57 + uD1 * 0.39;
    float curve = 0.08 + uD4 * 0.17 + uChaos * 0.08;
    float width = 0.016 + uD2 * 0.040;
    float lines = 0.0;
    float tips = 0.0;

    for (int layer = 0; layer < 3; layer++) {
        float lid = float(layer);
        float sectors = count * (0.57 + lid * 0.23);
        float a = (theta + PI) * sectors / TAU + lid * 0.31;
        float id = floor(a);
        float seed = hash21(vec2(id, lid * 17.0));
        float tipR = lengthScale * (0.45 + seed * 0.55);
        float phase = id * 1.63 + lid * 2.13;
        float bend = curve * sin(r * (10.0 + lid * 2.8) +
                                 phase + t * (0.42 + lid * 0.13));
        bend += curve * 0.42 * sin(r * 24.0 - t * 0.23 + phase * 1.71);
        float offset = fract(a - bend + 0.5) - 0.5;
        float filament = exp(-abs(offset) / width);
        float reach = smoothstep(0.025, 0.12, r) *
                      (1.0 - smoothstep(tipR - 0.09, tipR + 0.012, r));
        float flicker = 0.55 + 0.45 * sin(r * 37.0 + phase);
        lines += filament * reach * (0.31 + flicker * 0.29) / (1.0 + lid * 0.34);

        float tipBend = curve * sin(tipR * (10.0 + lid * 2.8) +
                                    phase + t * (0.42 + lid * 0.13));
        tipBend += curve * 0.42 * sin(tipR * 24.0 - t * 0.23 + phase * 1.71);
        float tipOffset = fract(a - tipBend + 0.5) - 0.5;
        float arcDist = tipOffset * tipR * TAU / sectors;
        float dotDist = length(vec2(r - tipR, arcDist));
        tips += exp(-dotDist / (0.004 + uD5 * 0.006)) *
                (0.40 + uD5 * 0.58);
    }

    float core = exp(-r * (15.0 - uD6 * 4.0)) *
                 (0.56 + uD6 * 0.67 + kick * 0.38);
    float corePoint = exp(-r * 85.0) * (0.58 + uD6 * 0.35);
    float hue = audioHue(uHue, uMid * 0.012);
    vec3 tint = hsv2rgb(vec3(hue, 0.10, 1.0));
    vec3 col = tint * (lines + tips + core) + vec3(1.0) * corePoint;
    col = audioLift(col, uBass * 0.25 + uHigh * 0.12);
    return vec4(col, 1.0);
}
