// ===============================================================
// SCENE - ABSTRACT FLUID
// Pliegues oscuros con contornos finos blancos y azules.
// Referencia: https://www.youtube.com/watch?v=e7K_UX7KUzw
// Campo analitico en una pasada: sin feedback ni simulacion acumulada.
// Solo uTime mueve el campo; en silencio queda inmovil.
//
// @D1: amplitud de los pliegues
// @D2: grosor de las lineas finas
// @D3: densidad de contornos
// @D4: ancho del borde principal
// @D5: cantidad de color azul
// @D6: intensidad del halo
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.27;
    float kick = max(uKick, uBeat * 0.55) * uAudioamt;
    float warp = 0.17 + uD1 * 0.25 + uChaos * 0.08;
    vec2 q = p;
    q.x += warp * sin(p.y * 2.7 + t * 0.61) +
           warp * 0.42 * sin(p.y * 6.1 - t * 0.29);
    q.y += warp * sin(p.x * 2.3 - t * 0.53 + 1.1) +
           warp * 0.36 * sin(p.x * 5.4 + t * 0.23);

    float field = sin(q.x * 3.25 + 0.84 * sin(q.y * 2.45 + t * 0.21)) +
                  0.72 * cos(q.y * 3.10 - 0.67 * sin(q.x * 2.10 - t * 0.18));
    float dist = abs(abs(field) - 0.52);
    float borderWidth = 0.026 + uD4 * 0.042;
    float border = exp(-dist / borderWidth);
    float shoulder = exp(-dist / (0.25 + uD6 * 0.18));
    float frequency = 55.0 + uD3 * 80.0 + uDensity * 30.0;
    float phase = field * frequency + 0.26 * sin(q.x * 13.0 + q.y * 8.0);
    float fine = pow(max(1.0 - abs(sin(phase)), 0.0),
                     12.0 - uD2 * 7.0);
    fine *= shoulder;
    float fleck = noise21(q * 45.0 + vec2(7.4, -2.1));
    fine *= 0.76 + fleck * 0.40;

    float hue = audioHue(uHue, uMid * 0.008);
    vec3 blue = hsv2rgb(vec3(fract(hue + 0.54), 0.69, 1.0));
    vec3 white = vec3(0.86, 0.93, 1.0);
    vec3 ink = mix(white, blue, uD5 * 0.78);
    float light = border * (0.44 + kick * 0.13) +
                  fine * (0.48 + uD2 * 0.09) +
                  shoulder * (0.035 + uD6 * 0.063);
    vec3 col = ink * light;
    col = audioLift(col, uBass * 0.20 + uHigh * 0.12);
    return vec4(col, 1.0);
}
