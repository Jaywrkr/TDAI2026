// ===============================================================
// SCENE 91 - IMAGE WIRE EXTRUSION
// Referencia: https://www.youtube.com/watch?v=98xNOgU1zeI
// Contornos de la imagen/video Media con una copia desplazada.
// Una pasada GLSL, sin SOP ni geometria 3D real.
// Solo uTime mueve la profundidad; sin audio queda inmovil.
//
// @D1: sensibilidad de los bordes
// @D2: profundidad de la extrusion
// @D3: direccion del desplazamiento
// @D4: brillo de los trazos
// @D5: tinte blanco hacia cian
// @D6: visibilidad de las caras laterales
// ===============================================================

float wireEdge(vec2 uv, vec2 stepSize) {
    vec3 left = mediaTex(clamp(uv - vec2(stepSize.x, 0.0), 0.0, 1.0)).rgb;
    vec3 right = mediaTex(clamp(uv + vec2(stepSize.x, 0.0), 0.0, 1.0)).rgb;
    vec3 down = mediaTex(clamp(uv - vec2(0.0, stepSize.y), 0.0, 1.0)).rgb;
    vec3 up = mediaTex(clamp(uv + vec2(0.0, stepSize.y), 0.0, 1.0)).rgb;
    return length(right - left) + length(up - down);
}

vec4 render(vec2 uv) {
    float t = uTime * 0.29;
    float kick = max(uKick, uBeat * 0.65) * uAudioamt;
    vec2 pixel = vec2(1.0 / max(uResW, 1.0), 1.0 / max(uResH, 1.0));
    vec2 stepSize = pixel * (0.8 + uDensity * 1.7);
    float angle = -0.75 + uD3 * 2.0;
    vec2 direction = vec2(cos(angle), sin(angle));
    float depth = 0.015 + uD2 * 0.088 + kick * 0.018;
    vec2 offset = direction * depth +
                  vec2(sin(t * 0.69), cos(t * 0.51)) * 0.006;
    vec2 backUV = clamp(uv - offset, pixel, 1.0 - pixel);

    float front = wireEdge(uv, stepSize);
    float back = wireEdge(backUV, stepSize);
    float threshold = 0.08 + (1.0 - uD1) * 0.30;
    front = smoothstep(threshold, threshold + 0.42, front);
    back = smoothstep(threshold, threshold + 0.42, back);
    float luminance = dot(mediaTex(uv).rgb, vec3(0.299, 0.587, 0.114));
    float backLuminance = dot(mediaTex(backUV).rgb,
                              vec3(0.299, 0.587, 0.114));
    float side = abs(luminance - backLuminance);
    side = smoothstep(0.08, 0.58, side) * uD6;

    float hue = audioHue(uHue + 0.53, uMid * 0.008);
    vec3 white = vec3(0.86, 0.90, 0.94);
    vec3 cyan = hsv2rgb(vec3(hue, 0.58, 1.0));
    vec3 ink = mix(white, cyan, uD5 * 0.78);
    vec3 col = ink * (front * (0.72 + uD4 * 0.46) +
                      back * (0.24 + uD4 * 0.20) +
                      side * 0.24);
    float key = exp(-pow((uv.x - uKeypos) / 0.07, 2.0)) * uKeypulse;
    col += ink * (front + back) * key * 0.55;
    col = audioLift(col, uBass * 0.16 + uHigh * 0.10);
    return vec4(clamp(col, 0.0, 1.0), 1.0);
}
