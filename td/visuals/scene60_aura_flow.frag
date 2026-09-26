// ===============================================================
// SCENE - AURA FLOW
// Columna ambar que se abre en raices de luz naranja y violeta.
// Referencia: https://www.youtube.com/watch?v=qBBll7HmCqc
// Captura del usuario: silueta central, extension lateral y negros.
//
// El tutorial usa Point Generator (Torus) -> Noise -> Trail -> Twist,
// color por atributo, PBR y varios pases de blur/bloom. Aca los rastros
// siguen lineas de flujo analiticas sobre un toro estilizado. Una sola
// pasada GLSL, mas el bloom compartido del rig; ningun SOP de 5000
// puntos ni feedback de alta resolucion por escena.
//
// @D1: grosor de la columna central
// @D2: alcance lateral de las raices
// @D3: cantidad de filamentos
// @D4: turbulencia de los rastros
// @D5: presencia del violeta frente al ambar
// @D6: brillo de los filamentos y puntos
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * (0.18 + uSpeed * 0.33);
    float kick = max(uKick, uBeat * 0.65) * uAudioamt;

    // La columna nace estrecha arriba; al llegar al plano inferior los
    // rastros se separan hacia izquierda y derecha, sin escalar el cuadro.
    float descent = clamp((0.22 - p.y) / 0.94, 0.0, 1.0);
    float fan = descent * descent * (3.0 - 2.0 * descent);
    float trunk = mix(0.045, 0.14, uD1);
    float reach = trunk + fan * (0.77 + uD2 * 0.83);
    float mask = exp(-pow(abs(p.x) / max(reach, 0.01), 1.45) * 1.2);
    mask *= smoothstep(-1.0, -0.60, p.y);

    // Ruido de posicion + torsion: desplaza cada hilo localmente, sin
    // una respiracion de zoom comun. Speed deja el tiempo inmovil en
    // silencio porque el reloj del rig se detiene.
    vec2 q = vec2(p.x * 2.3, p.y * 2.0);
    float n1 = fbm(q + vec2(t * 0.14, -t * 0.12), 3);
    float n2 = fbm(rot2(0.7) * q * 1.7 + vec2(-t * 0.10, t * 0.08), 3);
    float twist = (n1 - 0.5) * (0.035 + uD4 * 0.16) +
                  (n2 - 0.5) * (0.020 + uChaos * 0.10);
    float coord = (p.x + twist + (n1 - 0.5) * fan * 0.18 +
                  kick * 0.035 * sin(p.y * 9.0)) /
                  max(reach, 0.01);
    float density = 25.0 + uDensity * 36.0 + uD3 * 35.0;

    // Dos familias de trazos que divergen desde el mismo tallo.
    float a = sin(coord * density + p.y * 6.0 + n1 * 27.0 + n2 * 9.0);
    float b = sin(coord * density * 1.73 - p.y * 13.0 + n2 * 31.0);
    float primary = edgeLine(a, 1.15);
    float secondary = edgeLine(b, 0.78);
    float gaps = smoothstep(0.19, 0.60,
                  noise21(vec2(coord * 3.0, p.y * 9.0) + vec2(t * 0.25, 4.0)));
    float threads = (primary * 0.95 + secondary * 0.48) *
                    mix(0.42, 1.0, gaps) * mask;

    // En la base aparecen lazos horizontales: rastro del toro y del
    // Trail SOP. Su irregularidad viene del mismo campo de ruido.
    float lower = (1.0 - smoothstep(-0.35, 0.20, p.y)) *
                  smoothstep(-0.94, -0.63, p.y);
    float sweep = sin(p.y * (27.0 + uD3 * 22.0) +
                      abs(p.x) * 5.0 + n1 * 34.0 + n2 * 17.0 - t * 0.23);
    float roots = edgeLine(sweep, 1.05) * lower *
                  exp(-abs(p.x) * mix(0.75, 0.30, uD2)) *
                  mix(0.3, 1.0, gaps);

    // Dos capas de puntos muy finos, como el segundo Geometry del video.
    vec2 grid = floor(p * vec2(130.0, 90.0));
    vec2 jitter = hash22(grid + 37.1);
    vec2 point = (grid + jitter) / vec2(130.0, 90.0);
    float dotMark = 1.0 - smoothstep(0.002, 0.007,
                    length((p - point) * vec2(1.0, 1.35)));
    float dots = dotMark * step(0.89, hash21(grid + 11.4)) *
                 (0.55 * mask + 0.45 * lower);

    float goldH = audioHue(fract(uHue + 0.105), uMid * 0.025);
    float purpleH = audioHue(fract(uHue + 0.76), uMid * 0.025);
    float purpleShare = smoothstep(-0.30, 0.42,
                        p.x + (n2 - 0.5) * 1.25 +
                        0.18 * sin(coord * 3.0)) * (0.32 + uD5 * 0.94);
    vec3 gold = hsv2rgb(vec3(goldH, 0.80, 1.0));
    vec3 violet = hsv2rgb(vec3(purpleH, 0.70, 1.0));
    vec3 hue = mix(gold, violet, purpleShare);
    float spine = exp(-abs(p.x + twist) * (10.0 - uD1 * 4.0)) *
                  smoothstep(-0.38, 0.15, p.y);
    float light = threads * 0.95 + roots * 0.80 + dots * 0.48 +
                  spine * (0.09 + uD6 * 0.11) * mask;
    float glow = (threads * 0.22 + roots * 0.12) * (0.3 + uD6 * 0.7);
    float hot = smoothstep(0.45, 0.74,
                fbm(q * 1.25 + vec2(t * 0.08, -t * 0.06), 3));
    vec3 col = hue * light * (0.85 + uD6 * 1.55) *
               (0.62 + hot * 1.75) +
               mix(gold, vec3(1.0, 0.91, 0.73), 0.54) * glow;
    col = audioLift(col, uBass * 0.62 + kick * 0.20 + uHigh * 0.10);
    return vec4(col, 1.0);
}
