// SCENE - DESPLAZAMIENTO CROMATICO
// Imagen de Media deformada con canales RGB separados.
// La ruta fija del TOE original se reemplaza por la carpeta Media comun.
// @D1: escala del desplazamiento
// @D2: separacion RGB
// @D3: cantidad de pliegues
// @D4: contraste cromatico
// @D5: mezcla del color Hue
// @D6: brillo final
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * mix(0.08, 0.65, uSpeed);
    float kick = max(uKick, uBeat * 0.7) * uAudioamt;
    vec2 field = vec2(noise21(p * (1.5 + uD3 * 4.0) + vec2(t, 4.2)),
                      noise21(p * (1.5 + uD3 * 4.0) + vec2(6.1, -t)))-0.5;
    vec2 displaced = clamp(uv + field * (0.015 + uD1 * 0.12 + kick * 0.04), 0.0, 1.0);
    vec2 split = field * (0.002 + uD2 * 0.027);
    vec3 src = vec3(mediaTex(clamp(displaced + split, 0.0, 1.0)).r,
                    mediaTex(displaced).g,
                    mediaTex(clamp(displaced - split, 0.0, 1.0)).b);
    float available = smoothstep(0.002, 0.02, dot(src, vec3(0.333)));
    float wave = sin(p.x * 7.0 + field.x * 14.0 + t) * sin(p.y * 9.0 + field.y * 11.0);
    vec3 fallback = hsv2rgb(vec3(fract(uHue + field.x * 0.3 + wave * 0.12), 0.8, 0.3 + 0.4 * wave));
    src = mix(fallback, src, available);
    src = mix(src, hsv2rgb(vec3(audioHue(uHue, uMid * 0.08), 0.8, dot(src, vec3(0.333)))), uD5);
    src = pow(max(src, vec3(0.0)), vec3(mix(1.6, 0.75, uD4))) * (0.4 + uD6);
    return vec4(audioLift(src, uBass * 0.7 + kick * 0.2 + uHigh * 0.12), 1.0);
}
