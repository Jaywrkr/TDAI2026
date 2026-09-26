// ===============================================================
// SCENE - PSYCHEDELIC MIRROR
// Encaje blanco de pliegues reflejados en cuatro direcciones.
// Referencia: https://www.youtube.com/watch?v=Mt2hwb5cngA&t=7s
// Aproximacion analitica: sin tubos, instancing ni feedback.
// uTime queda fijo en silencio; el kick solo ilumina el nucleo.
//
// @D1: alcance de los brazos
// @D2: anchura de los pliegues
// @D3: cantidad de filamentos
// @D4: densidad del velo
// @D5: brillo de los contornos
// @D6: intensidad del nucleo
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float r = length(p);
    if (r > 1.14) return vec4(0.0, 0.0, 0.0, 1.0);

    float theta = atan(p.y, p.x);
    float folded = abs(mod(theta + 0.7853982, 1.5707963) -
                       0.7853982);
    vec2 q = vec2(cos(folded), sin(folded)) * r;
    float t = uTime * (0.08 + uSpeed * 0.26);
    float reach = 0.62 + uD1 * 0.31;
    float threads = 80.0 + uD3 * 78.0 + uDensity * 19.0;
    float kick = max(uKick, uBeat * 0.60) * uAudioamt;
    float lace = 0.0;
    float body = 0.0;

    for (int layer = 0; layer < 3; layer++) {
        float id = float(layer);
        float along = clamp(q.x / reach, 0.0, 1.0);
        float envelope = pow(max(sin(along * 3.1415927), 0.0), 0.72);
        float width = 0.027 + (0.11 + uD2 * 0.14 + id * 0.018) *
                              envelope;
        float wave = (0.030 + id * 0.019) *
                     sin(q.x * (9.0 + id * 1.6) - t * (0.31 + id * 0.08) +
                         id * 2.1);
        wave += (0.024 + uChaos * 0.024) *
                sin(q.x * (19.0 + id * 2.4) + t * 0.20 + id * 1.7);
        float u = q.y - wave * envelope - id * 0.038;
        float silhouette = 1.0 - smoothstep(width - 0.018,
                                            width + 0.018, abs(u));
        silhouette *= smoothstep(0.025, 0.11, q.x) *
                      (1.0 - smoothstep(reach - 0.07,
                                        reach + 0.035, q.x));
        float linePhase = u * (threads + id * 24.0) +
                          q.x * (27.0 + uD3 * 24.0) + id * 2.0;
        float filament = pow(max(1.0 - abs(sin(linePhase)), 0.0), 8.0);
        float cross = pow(max(1.0 - abs(sin(q.x * 96.0 -
                                          u * 19.0 + id)), 0.0), 11.0);
        float rim = exp(-abs(abs(u) - width) /
                        (0.008 + uD5 * 0.011));
        lace += silhouette * (filament * 0.50 + cross * 0.17 +
                             rim * (0.18 + uD5 * 0.20));
        body += silhouette * (0.016 + uD4 * 0.042);
    }

    float grain = noise21(p * (48.0 + uDensity * 31.0) +
                          vec2(t * 0.035, -t * 0.025));
    float intensity = (lace + body) * (0.77 + grain * 0.46);
    float core = exp(-r * (13.0 - uD6 * 3.0)) *
                 (0.21 + uD6 * 0.31 + kick * 0.26);
    vec3 col = vec3(0.88, 0.90, 1.0) * intensity * 1.48 +
               vec3(1.0) * core;
    col = audioLift(col, uBass * 0.27 + uHigh * 0.13);
    return vec4(col, 1.0);
}
