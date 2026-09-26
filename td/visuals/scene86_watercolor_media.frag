// ===============================================================
// SCENE 86 - WATERCOLOR MEDIA
// Referencia: https://www.youtube.com/watch?v=9ynL-JckDkY
// Usa la imagen/video de la carpeta Media como input 1.
// Acuarela aproximada en una pasada: lavado, bordes y grano de papel.
// Solo uTime mueve el pigmento; sin musica queda inmovil.
//
// @D1: amplitud del lavado suave
// @D2: ondulacion del borde de pintura
// @D3: fuerza del contorno de tinta
// @D4: simplificacion de colores
// @D5: mezcla de color Hue
// @D6: textura de pigmento y papel
// ===============================================================

vec4 render(vec2 uv) {
    vec2 pixel = vec2(1.0 / max(uResW, 1.0), 1.0 / max(uResH, 1.0));
    float t = uTime * (0.025 + uSpeed * 0.11);
    float kick = max(uKick, uBeat * 0.6) * uAudioamt;
    float low = noise21(uv * 4.6 + vec2(t * 0.12, -t * 0.09));
    float medium = noise21(uv * 24.0 + vec2(-t * 0.25, t * 0.20));
    vec2 warp = (vec2(low, medium) - 0.5) *
                (0.002 + uD2 * 0.014 + uChaos * 0.003);
    vec2 q = clamp(uv + warp, pixel, 1.0 - pixel);
    vec3 center = mediaTex(q).rgb;

    // Cinco lecturas de la misma fuente; evita feedback y grandes cadenas TOP.
    vec2 reach = pixel * (2.0 + uD1 * 7.0 + uDensity * 2.0);
    vec3 left = mediaTex(clamp(q - vec2(reach.x, 0.0), 0.0, 1.0)).rgb;
    vec3 right = mediaTex(clamp(q + vec2(reach.x, 0.0), 0.0, 1.0)).rgb;
    vec3 down = mediaTex(clamp(q - vec2(0.0, reach.y), 0.0, 1.0)).rgb;
    vec3 up = mediaTex(clamp(q + vec2(0.0, reach.y), 0.0, 1.0)).rgb;
    vec3 wash = (center * 2.0 + left + right + down + up) / 6.0;

    // Pocas masas de color, pero con transiciones suaves para no posterizar.
    float levels = 9.0 - uD4 * 5.0;
    vec3 bands = floor(wash * levels + 0.5) / levels;
    vec3 color = mix(wash, bands, uD4 * 0.60);
    float edge = length(left - right) + length(down - up);
    edge = smoothstep(0.06, 0.54, edge) * (0.10 + uD3 * 0.38);
    float paper = noise21(uv * vec2(uResW, uResH) * 0.20);
    float pigment = noise21(uv * 73.0 + vec2(12.3, 8.7));
    float textureAmt = (paper - 0.5) * 0.10 + (pigment - 0.5) * 0.12;
    color *= 1.0 + textureAmt * uD6 * 2.0;
    color *= 1.0 - edge;

    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 tint = hsv2rgb(vec3(audioHue(uHue, uMid * 0.012), 0.52, luminance));
    color = mix(color, tint, uD5 * 0.42);
    color *= 0.88 + kick * 0.12;
    color = audioLift(color, uBass * 0.16 + uHigh * 0.09);
    return vec4(clamp(color, 0.0, 1.0), 1.0);
}
