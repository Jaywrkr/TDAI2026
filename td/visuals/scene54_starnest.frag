// ===============================================================
// SCENE - STAR NEST
// Viaje a traves de una nebulosa fractal de estrellas: volumen en capas
// donde cada paso pliega el espacio con la "formula magica" de Kali.
// ===============================================================
// ---------------------------------------------------------------
// Star Nest by Pablo Roman Andrioli ("Kali") -- MIT License
// https://www.shadertoy.com/view/XlfGRj
// Texto de la licencia: td/visuals/LICENSE_STARNEST.md (tiene que
// acompanar cualquier copia de este archivo).
// Visto en la coleccion jpupper/touchdesignershadercollection (STARNEST);
// el codigo de aca sale del original de Kali, no de ese .toe.
// ---------------------------------------------------------------
//
// ADAPTACION AL RIG
// - El original hace 20 capas x 17 iteraciones = 340 pasos por pixel, caro
//   para una GPU integrada. Aca: 14 iteraciones y 8..16 capas segun Density
//   (default ~12 = 168 pasos, la mitad). Las capas lejanas son las que
//   menos se ven -- la diferencia es chica, el ahorro no.
// - El mouse del original (rotacion de camara) pasa a un giro lento y fijo.
// - Audio SOLO en brillo/color (contrato del rig): el volumen no cambia.
//
// CONTROLES
//   Speed    velocidad del viaje
//   Density  cuantas capas de volumen (mas = mas profundidad, mas costo)
//   Hue      gira la paleta completa
//   Chaos    cuanto se deforma la formula (estructura mas rota)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte que se mueve con la musica
//   High     destella las estrellas mas brillantes
//   Kick     destello breve
//
// @D1: zoom (campo de vision)
// @D2: tamano del mosaico del espacio (estructura grande <-> apretada)
// @D3: materia oscura (huecos negros entre las nubes)
// @D4: cuanto se apaga la distancia (profundidad)
// @D5: saturacion del color
// @D6: brillo de las nubes de color
// ===============================================================

#define SN_ITER 14

vec3 snHueRot(vec3 c, float a) {
    const mat3 toY = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
    const mat3 toR = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
    vec3 yiq = toY * c;
    float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);
    return max(toR * vec3(yiq.x, ch * cos(h), ch * sin(h)), vec3(0.0));
}

vec4 render(vec2 uv)
{
    float zoom       = mix(0.45, 1.25, uD1);
    float tile       = mix(0.70, 0.95, uD2);
    float darkmatter = mix(0.0, 0.6, uD3);
    float distfading = mix(0.62, 0.80, uD4);
    float saturation = mix(0.5, 1.2, uD5);   // 0.5 = 0.85, el valor original
    float brightness = mix(0.0008, 0.0030, uD6);
    float formuparam = 0.53 + (uChaos - 0.3) * 0.05;
    int volsteps = int(mix(8.0, 16.0, uDensity) + 0.5);
    const float stepsize = 0.1;

    vec2 p2 = uv - 0.5;
    p2.y *= uResH / max(uResW, 1.0);
    vec3 dir = vec3(p2 * zoom, 1.0);
    float time = uTime * 0.02 + 0.25;

    float a1 = 0.5 + 0.08 * sin(uTime * 0.05);
    float a2 = 0.8 + 0.06 * cos(uTime * 0.04);
    mat2 r1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
    mat2 r2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
    dir.xz *= r1;
    dir.xy *= r2;
    vec3 from = vec3(1.0, 0.5, 0.5) + vec3(time * 2.0, time, -2.0);
    from.xz *= r1;
    from.xy *= r2;

    float s = 0.1, fade = 1.0;
    vec3 v = vec3(0.0);
    for (int r = 0; r < 16; r++) {
        if (r >= volsteps) break;
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.0)));
        float pa, a = pa = 0.0;
        for (int i = 0; i < SN_ITER; i++) {
            p = abs(p) / dot(p, p) - formuparam;
            a += abs(length(p) - pa);
            pa = length(p);
        }
        float dm = max(0.0, darkmatter - a * a * 0.001);
        a *= a * a;
        if (r > 6) fade *= 1.0 - dm;
        v += fade;
        v += vec3(s, s * s, s * s * s * s) * a * brightness * fade;
        fade *= distfading;
        s += stepsize;
    }
    v = mix(vec3(length(v)), v, saturation);
    // Con menos capas que el original el total queda mas bajo: se compensa
    // para que la imagen tenga el mismo brillo con cualquier Density.
    vec3 col = v * 0.01 * (20.0 / float(volsteps));

    col = snHueRot(col, (uHue + uMid * 0.12) * TAU);

    // uHigh: destellan las estrellas mas brillantes (solo brillo).
    float star = smoothstep(0.55, 1.1, dot(col, vec3(0.299, 0.587, 0.114)));
    col += col * star * uHigh * 0.9;
    col += col * uKick * 0.4;
    col = audioLift(col, uBass * 0.7);

    col = col / (1.0 + col * 0.6);
    return vec4(max(col, 0.0), 1.0);
}
