// ===============================================================
// SCENE 97 - AUDIO WIRE ROOM
// Referencia: https://www.youtube.com/watch?v=yWvpRXY0Kyc
// Cubos de alambre amarillo y azul con haces de profundidad.
// Una pasada GLSL: sin render 3D, CHOPs extras ni feedback.
// uTime se congela en silencio; el audio no causa zoom global.
//
// @D1: grosor de las aristas
// @D2: profundidad de los cubos
// @D3: respuesta del giro al kick
// @D4: cantidad de haces de la sala
// @D5: mezcla entre amarillo y azul
// @D6: anchura del halo
// ===============================================================

vec2 wireProject(vec3 v, float angle, float depth) {
    float c = cos(angle), s = sin(angle);
    vec3 q = vec3(v.x * c - v.z * s, v.y,
                  v.x * s + v.z * c);
    q.yz = rot2(0.14) * q.yz;
    float perspective = 2.9 / (3.8 - q.z * depth);
    return q.xy * perspective;
}

float wireSegment(vec2 p, vec2 a, vec2 b, float width) {
    vec2 ab = b - a;
    float h = clamp(dot(p - a, ab) /
                    max(dot(ab, ab), 0.00001), 0.0, 1.0);
    return length(p - a - h * ab) / width;
}

vec2 wireCube(vec2 p, float angle, float size,
              float depth, float width, float haloWidth) {
    vec2 vertices[8];
    for (int i = 0; i < 8; i++) {
        float x = mod(float(i), 2.0) * 2.0 - 1.0;
        float y = mod(floor(float(i) * 0.5), 2.0) * 2.0 - 1.0;
        float z = floor(float(i) * 0.25) * 2.0 - 1.0;
        vertices[i] = wireProject(vec3(x, y, z) * size,
                                  angle, depth);
    }
    float core = 0.0, halo = 0.0;
    for (int i = 0; i < 12; i++) {
        int axis = i / 4;
        int side = i - axis * 4;
        int b0 = side - (side / 2) * 2;
        int b1 = side / 2;
        int start = axis == 0 ? b0 * 2 + b1 * 4 :
                    (axis == 1 ? b0 + b1 * 4 :
                                 b0 + b1 * 2);
        int finish = start + (axis == 0 ? 1 :
                              (axis == 1 ? 2 : 4));
        float d = wireSegment(p, vertices[start],
                              vertices[finish], width);
        core += exp(-d * d);
        float broad = d / haloWidth;
        halo += exp(-broad * broad);
    }
    return vec2(min(core, 2.2), min(halo, 3.0));
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.29;
    float kick = max(uKick, uBeat * 0.60) * uAudioamt;
    float angle = -0.27 + t * 0.14 +
                  kick * uD3 * 0.32 + uMid * uAudioamt * 0.07;
    float width = 0.004 + uD1 * 0.006;
    float haloWidth = 3.0 + uD6 * 4.0;
    float depth = 0.68 + uD2 * 0.60;

    vec2 goldWire = wireCube(p, angle, 0.58, depth,
                             width, haloWidth);
    vec2 blueWire = wireCube(p, -angle * 0.70 + 0.24, 0.94,
                             depth * 0.76, width * 0.82, haloWidth);

    float rays = 0.0, rayHalo = 0.0;
    for (int i = 0; i < 8; i++) {
        if (i >= 2 + int(floor(uD4 * 6.0))) break;
        float sx = mod(float(i), 2.0) * 2.0 - 1.0;
        float sy = mod(floor(float(i) * 0.5), 2.0) * 2.0 - 1.0;
        float layer = i < 4 ? 0.55 : 0.82;
        vec2 start = wireProject(vec3(sx, sy, -0.85) * layer,
                                  angle, depth);
        vec2 end = start * vec2(4.0, 2.7) +
                   vec2(sx * 0.16, sy * 0.12);
        float d = wireSegment(p, start, end, width * 0.76);
        rays += exp(-d * d);
        rayHalo += exp(-pow(d / haloWidth, 2.0));
    }
    float goldHue = audioHue(uHue + 0.14, uMid * 0.008);
    vec3 gold = hsv2rgb(vec3(goldHue, 0.93, 1.0));
    vec3 blue = hsv2rgb(vec3(fract(goldHue + 0.48), 0.90, 1.0));
    vec3 col = gold * (goldWire.x * (1.20 + kick * 0.52) +
                       goldWire.y * 0.12 * uD6 +
                       rays * 0.72 + rayHalo * 0.045 * uD6);
    col += blue * (blueWire.x * (0.38 + uD5 * 0.70) +
                   blueWire.y * 0.10 * uD6);
    float key = exp(-pow((uv.x - uKeypos) / 0.08, 2.0)) * uKeypulse;
    col += gold * (goldWire.x + rays) * key * 0.22;
    col = audioLift(col, uBass * 0.16 + uHigh * 0.10);
    return vec4(col, 1.0);
}
