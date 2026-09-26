// ===============================================================
// SCENE - NOISE LINES
// Filamentos blancos que serpentean sobre fondo negro.
// Referencia: https://www.youtube.com/watch?v=PIoq2BFtMAc&t=100s
// @D1: numero de filamentos
// @D2: amplitud de las curvas
// @D3: rugosidad fina
// @D4: grosor de linea
// @D5: separacion vertical
// @D6: halo blanco
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.44;
    float count = 3.0 + floor(uD1 * 4.0 + 0.5);
    float spread = 0.19 + uD5 * 0.13;
    float amp = 0.09 + uD2 * 0.21 + uChaos * 0.035;
    float width = 0.0028 + uD4 * 0.007;
    float kick = max(uKick, uBeat * 0.5) * uAudioamt;
    vec3 col = vec3(0.0);
    for (int i = 0; i < 7; i++) {
        if (float(i) >= count) break;
        float id = float(i);
        float base = (id - (count - 1.0) * 0.5) * spread;
        float flow = sin(p.x * (2.2 + uDensity * 0.7) +
                         id * 1.71 + t * 0.34);
        float longWave = sin(p.x * 4.9 - id * 2.23 - t * 0.27);
        float grain = noise21(vec2(p.x * (4.0 + uDensity * 3.0) +
                                   t * 0.22, id * 4.7));
        float y = base + amp * (flow * 0.66 + longWave * 0.34) +
                  (grain - 0.5) * uD3 * 0.095;
        float d = abs(p.y - y);
        float core = exp(-d / width);
        float halo = exp(-d / (0.019 + uD6 * 0.035));
        col += vec3(1.0, 0.97, 1.0) * core *
               (0.75 + kick * 0.28) +
               vec3(0.40, 0.53, 0.68) * halo *
               (0.06 + uD6 * 0.12);
    }
    col = audioLift(col, uBass * 0.18 + uHigh * 0.17);
    return vec4(col, 1.0);
}
