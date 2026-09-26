// SCENE - BALDOSAS REORDENADAS
// La imagen se corta y reorganiza en recortes independientes.
// Usa la carpeta Media; si esta vacia dibuja un patron procedural.
// @D1: tamano de las baldosas
// @D2: distancia del recorte
// @D3: ritmo de reordenamiento
// @D4: mezcla del color Hue
// @D5: profundidad de las juntas
// @D6: luminosidad de la imagen
vec4 render(vec2 uv) {
    float count = floor(mix(5.0, 19.0, uDensity) * mix(1.5, 0.65, uD1));
    vec2 g = uv * vec2(uAspect, 1.0) * count;
    vec2 cell = floor(g), q = fract(g);
    float t = floor(uTime * mix(0.2, 2.0, uSpeed) * (0.4 + uD3 * 1.6));
    float kick = max(uKick, uBeat) * uAudioamt;
    vec2 offset = floor(hash22(cell + floor(t * 0.5) + vec2(11.0, 23.0)) * (1.0 + 7.0 * uD2));
    offset += vec2(floor(kick * 2.0));
    vec2 srcCell = mod(cell + offset, vec2(uAspect, 1.0) * count);
    vec2 srcUV = (srcCell + q) / (vec2(uAspect, 1.0) * count);
    vec3 src = mediaTex(clamp(srcUV, 0.0, 1.0)).rgb;
    float available = smoothstep(0.002, 0.02, dot(src, vec3(0.333)));
    vec3 fallback = hsv2rgb(vec3(fract(uHue + srcUV.x * 0.35 + srcUV.y * 0.2),
                                 0.6, 0.2 + 0.6 * sin(srcUV.x * 15.0 + srcUV.y * 9.0) * sin(srcUV.y * 21.0)));
    src = mix(fallback, src, available);
    float seam = smoothstep(0.0, 0.025 + uD5 * 0.07, min(min(q.x, q.y), min(1.0-q.x, 1.0-q.y)));
    float tintLum = dot(src, vec3(0.299, 0.587, 0.114));
    src = mix(src, hsv2rgb(vec3(audioHue(uHue, uMid * 0.09), 0.7, tintLum)), uD4);
    src *= seam * (0.4 + uD6) * (0.8 + 0.2 * hash21(cell));
    return vec4(audioLift(src, uBass * 0.6 + kick * 0.25 + uHigh * 0.1), 1.0);
}
