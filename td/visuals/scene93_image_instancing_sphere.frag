// ===============================================================
// SCENE 93 - IMAGE INSTANCING SPHERE
// Referencia: https://www.youtube.com/watch?v=O4uVBJKQzWk
// Imagen Media repetida en piezas sobre una esfera aparente.
// Una pasada GLSL; sin COMP instancing ni multiples videos simultaneos.
// Solo uTime rota la esfera: sin audio queda inmovil.
//
// @D1: cantidad de piezas
// @D2: separacion entre piezas
// @D3: variacion del recorte de imagen
// @D4: velocidad de giro relativa
// @D5: tinte azul de las piezas
// @D6: reflejo especular
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float radius = 0.82;
    vec2 xy = p / radius;
    float rr = dot(xy, xy);
    if (rr > 1.0) return vec4(0.0, 0.0, 0.0, 1.0);
    float z = sqrt(max(1.0 - rr, 0.0));
    vec3 normal = vec3(xy, z);
    float t = uTime * (0.018 + uSpeed * 0.075) *
              (0.35 + uD4 * 1.45);
    float longitude = atan(normal.x, normal.z) + t;
    float latitude = asin(clamp(normal.y, -1.0, 1.0));
    float columns = floor(17.0 + uDensity * 15.0 + uD1 * 12.0);
    float rows = floor(9.0 + uDensity * 9.0 + uD1 * 6.0);
    vec2 grid = vec2(longitude / TAU + 0.5,
                      latitude / PI + 0.5) * vec2(columns, rows);
    vec2 cell = floor(grid);
    vec2 local = fract(grid);
    float gap = 0.025 + uD2 * 0.13;
    float edgeDist = min(min(local.x, 1.0 - local.x),
                         min(local.y, 1.0 - local.y));
    float tile = smoothstep(gap, gap + 0.035, edgeDist);
    vec2 crop = (hash22(cell + 12.4) - 0.5) * uD3 * 0.38;
    vec2 sourceUV = clamp(local + crop, 0.0, 1.0);
    vec3 source = mediaTex(sourceUV).rgb;

    vec3 light = normalize(vec3(-0.40, 0.52, 0.76));
    float diffuse = max(dot(normal, light), 0.0);
    float shade = 0.24 + 0.72 * diffuse;
    float bevel = smoothstep(gap, gap + 0.13, edgeDist);
    shade *= 0.72 + bevel * 0.30;
    float specular = pow(max(dot(reflect(-light, normal),
                                 vec3(0.0, 0.0, 1.0)), 0.0), 23.0);
    float rim = pow(1.0 - z, 3.0);
    vec3 tint = hsv2rgb(vec3(audioHue(uHue + 0.57, uMid * 0.007),
                             0.60, 1.0));
    vec3 color = mix(source, source * tint, uD5 * 0.65);
    float kick = max(uKick, uBeat * 0.65) * uAudioamt;
    float chosen = step(0.55, hash21(cell + 49.2));
    color *= shade * (0.91 + kick * chosen * 0.32);
    color += vec3(0.56, 0.74, 0.89) *
             (specular * uD6 * 0.32 + rim * uD6 * 0.07);
    color *= tile;
    float key = exp(-pow((uv.x - uKeypos) / 0.055, 2.0)) * uKeypulse;
    color += color * key * 0.50;
    color = audioLift(color, uBass * 0.10 + uHigh * 0.08);
    return vec4(color, 1.0);
}
