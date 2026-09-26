// ===============================================================
// SCENE - ECHOFORMS
// Marcos de eco y trazos electricos magenta/cian sobre negro.
// Referencia: https://www.youtube.com/watch?v=_ohGu_afctg
// Una sola pasada, sin feedback ni acumulacion de fotogramas.
// Todo desplazamiento usa uTime: quieto al pausar la musica.
//
// @D1: escala de los marcos
// @D2: grosor de contornos
// @D3: numero de trazos centrales
// @D4: distorsion de los ecos
// @D5: mezcla magenta/cian
// @D6: halo del centro
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    if (abs(p.x) > 1.85 || abs(p.y) > 1.10)
        return vec4(0.0, 0.0, 0.0, 1.0);

    float t = uTime * 0.32;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float bass = uBass * uAudioamt;
    float hue = audioHue(uHue, uMid * 0.010);
    vec3 cyan = hsv2rgb(vec3(fract(hue + 0.52), 0.86, 1.0));
    vec3 pink = hsv2rgb(vec3(fract(hue + 0.84), 0.81, 1.0));
    float stroke = 0.004 + uD2 * 0.009;
    float warp = 0.014 + uD4 * 0.047 + uChaos * 0.020;
    float sizeScale = 0.86 + uD1 * 0.32;
    vec3 col = vec3(0.0);

    for (int i = 0; i < 4; i++) {
        float id = float(i);
        float size = (0.22 + id * 0.19) * sizeScale;
        vec2 q = p + warp * vec2(
            sin(p.y * (8.0 + id * 2.1) + t * (0.46 + id * 0.09) + id),
            cos(p.x * (7.0 + id * 1.7) - t * (0.38 + id * 0.07) + id * 1.5));
        float box = max(abs(q.x), abs(q.y));
        float edge = exp(-abs(box - size) / stroke);
        float halo = exp(-abs(box - size) / (stroke * 5.0));
        vec3 ink = mix(pink, cyan, clamp(0.25 + id * 0.19 + uD5 * 0.18,
                                        0.0, 1.0));
        col += ink * (edge * (0.64 + id * 0.055) +
                      halo * (0.045 + uD6 * 0.065));
    }

    float web = 0.0;
    for (int j = 0; j < 5; j++) {
        float id = float(j);
        float amount = step(id, 1.0 + floor(uD3 * 4.0 + uDensity * 0.5));
        vec2 q = rot2(id * 0.61 + 0.18) * p;
        float bend = (0.13 + uD4 * 0.10) *
                     sin(q.x * (5.0 + id * 1.20) + t * (0.55 + id * 0.08) + id);
        bend += 0.058 * sin(q.x * (12.0 + id) - t * 0.27 + id * 2.2);
        float dist = abs(q.y - bend);
        float filament = exp(-dist / (stroke * (0.62 + id * 0.13)));
        float reach = 1.0 - smoothstep(0.48, 0.86, length(p));
        web += filament * reach * amount * (0.64 + id * 0.032);
    }

    float center = exp(-length(p) * (6.4 - uD6 * 1.5)) *
                   (0.19 + uD6 * 0.35 + kick * 0.24);
    col += mix(pink, cyan, 0.34 + uD5 * 0.26) * web;
    col += pink * center;
    col *= 0.88 + kick * 0.30 + bass * 0.07;
    col = audioLift(col, uHigh * 0.17);
    return vec4(col, 1.0);
}
