// ===============================================================
// HALLOWEEN 19 - GLITCH DEMONIACO
// Una transmision maldita: el rostro de un demonio de frente (LAMINA
// horneada con relieve, plates/scene19, ver td/tools/bake_plates_demonio.py:
// cuernos con anillos, ceja fruncida, cuencas hondas, colmillos, venas)
// iluminado en vivo desde abajo por fuego, que respira y se rompe en
// bloques de glitch, con los canales de color separados, lineas de
// barrido y estatica. Alrededor, humo rojo y brasas.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> arden los ojos y el fuego de abajo crece
//   medios -> el rostro respira y la imagen ondula
//   agudos -> estatica y chispas
//   golpe  -> se rompe en bloques que se van cada uno para su lado (D2)
//             y se desdobla; con Chaos se invierte y aparecen copias
// Speed hace respirar el rostro y mover el ruido aun en silencio.
// HISTORIA: cada ~43 s el rostro se derrite; cada ~89 s posesion: se
// rompe entero sin golpe; cada acto cambia la textura de la senal.
//
// @D1: cantidad de lineas de barrido
// @D2: cuanto se rompe con el golpe
// @D3: separacion de color
// @D4: ojos
// @D5: color (rojo infierno <-> violeta)
// @D6: estatica
// ===============================================================

const vec4 FACE_R = vec4(-1.3, -1.1, 2.6, 2.35);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// rostro iluminado en la posicion q (coordenadas del rostro)
vec4 g19Face(vec2 q, vec3 fireC, vec3 rimC, float eyesK) {
    vec2 fu = rUV(q, FACE_R);
    vec4 c = plate0(fu);
    if (c.a <= 0.0) return vec4(0.0);
    vec4 nr = plate1(fu);
    vec2 nxy = nr.rg * 2.0 - 1.0;
    vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
    vec3 alb = plateCol(c.rgb);
    float under = max(dot(n, normalize(vec3(0.0, -0.8, 0.6))), 0.0);   // fuego desde abajo
    float rim = pow(max(dot(n, normalize(vec3(0.0, 0.9, 0.3))), 0.0), 3.0);
    float low = 0.25 + 0.9 * smoothstep(0.9, -0.9, q.y);             // el fuego esta abajo
    vec3 col = alb * (fireC * (0.08 + under * 2.4) * low + rimC * rim * 1.2 + vec3(0.015));
    col += fireC * pow(max(dot(n, normalize(vec3(0.0, -0.6, 0.8))), 0.0), 18.0) * 0.25;  // brillo humedo
    col += mix(fireC, vec3(1.0, 0.9, 0.6), 0.4) * nr.b * eyesK * 2.5;
    return vec4(col, c.a);
}

vec4 render(vec2 uv) {
    float t = uTime;
    float rt = uRTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    float meltE = hkEvent(19.0, 43.0, 8.0);
    float meltPh = hkEventPhase(19.0, 43.0, 8.0);
    float possE = hkEvent(20.0, 89.0, 6.0);
    vec3 fireC = mix(vec3(1.0, 0.25, 0.06), vec3(0.65, 0.15, 1.0), uD5);
    vec3 rimC = mix(vec3(0.45, 0.20, 0.55), vec3(1.0, 0.2, 0.3), uD5);
    float brk = clamp(hit * (0.2 + uD2) + possE + hit * loco * 0.5, 0.0, 1.5);

    // --- glitch de pantalla: bloques, filas que se rasgan ---
    vec2 g = uv;
    vec2 bid = floor(uv * vec2(14.0, 8.0) + hkActVal(6.0) * 3.0);
    vec2 bh = hash22(bid + floor(rt * (6.0 + possE * 10.0)));
    float on = step(1.0 - brk * 0.40, bh.x);
    g += (bh - 0.5) * vec2(0.20, 0.06) * on * brk;
    float row = floor(uv.y * (60.0 + uD1 * 120.0));
    float tear = step(0.985 - brk * 0.1, hash21(vec2(row, floor(rt * 20.0))));
    g.x += (hash21(vec2(row, 3.0)) - 0.5) * 0.15 * tear;
    g.x += sin(uv.y * 30.0 + t * 2.0) * 0.002 * (0.3 + mid * 2.0);
    vec2 p = hkCam(hkPunch(hkShake(centered(g))));

    // --- fondo: humo rojo, brasas ---
    float sm = fbm(vec2(p.x * 1.2, p.y * 1.5 - t * 0.12), 4, 0.55);
    vec3 col = fireC * 0.06 * smoothstep(0.35, 0.85, sm) * (0.4 + 0.6 * smoothstep(1.0, -1.0, p.y));
    col += fireC * exp(-pow((p.y + 1.1) / 0.45, 2.0)) * (0.25 + bass * 0.4);
    float emb = hkParticles(p * 0.8, t * 0.5, 0.08 + high * 0.1, vec2(0.1, 1.0), 0.035);
    col += mix(fireC, vec3(1.0, 0.8, 0.4), 0.5) * emb * 0.4;

    // --- rostro (respira; se derrite en el evento) ---
    float breath = 1.0 + 0.025 * sin(t * 0.9) + mid * 0.02;
    vec2 q = p / (0.80 * breath) + vec2(0.0, 0.06);
    if (meltE > 0.01) {
        float cx = floor(q.x * 40.0);
        float drip = meltE * meltPh * (0.15 + 0.5 * hash21(vec2(cx, 9.0))) * smoothstep(-1.0, 0.8, q.y);
        q.y += drip;
        q.x += sin(q.y * 6.0 + t) * 0.02 * meltE;
    }
    float eyesK = (0.25 + uD4 * 0.9) * (0.6 + bass * 1.0 + hit * 0.4);
    float split = (0.004 + uD3 * 0.03) * (1.0 + brk * 2.0 + bass * 0.5);
    vec4 fc = g19Face(q, fireC, rimC, eyesK);
    vec3 face = fc.rgb;
    if (split > 0.006) {
        vec4 fr = g19Face(q + vec2(split, 0.0), fireC, rimC, eyesK);
        vec4 fb = g19Face(q - vec2(split, split * 0.3), fireC, rimC, eyesK);
        face = vec3(fr.r, fc.g, fb.b);
        fc.a = max(fc.a, max(fr.a, fb.a) * 0.8);
    }
    col = mix(col, face, clamp(fc.a, 0.0, 1.0));
    // copias fantasma a los costados con la locura / posesion
    float ghostK = clamp(hit * loco * step(0.5, loco) + possE, 0.0, 1.0);
    if (ghostK > 0.01) {
        for (int k = 0; k < 2; k++) {
            float sd = k == 0 ? -1.0 : 1.0;
            vec4 gc = g19Face((p - vec2(sd * 1.55, 0.05 * sin(rt * 7.0 + sd))) / 0.80, fireC, rimC, eyesK);
            col = mix(col, gc.rgb * 0.55, gc.a * ghostK * 0.8);
        }
    }

    // --- lineas de barrido, estatica, inversion ---
    float lines = 0.5 + 0.5 * sin(uv.y * uResH * (0.35 + uD1 * 0.6));
    col *= 1.0 - 0.25 * lines * (0.3 + uD1 * 0.7);
    float st = hash21(uv * vec2(uResW, uResH) * 0.5 + fract(rt * 31.0) * 97.0);
    col = mix(col, vec3(st) * 0.5, (0.03 + uD6 * 0.20 + high * 0.08 + brk * 0.06) * step(0.5, st + 0.3));
    float bar = smoothstep(0.02, 0.0, abs(fract(uv.y - rt * 0.07) - 0.5) - 0.06);
    col += vec3(0.04) * bar * (0.5 + uD6);
    float inv = hit * step(0.75, loco) * step(0.6, noise21(vec2(floor(rt * 14.0), 5.0)));
    col = mix(col, (vec3(1.0) - col) * fireC, inv * 0.7);
    // bloques corridos: un poco de color crudo en los bordes del bloque

    return vec4(hkFinish(col, uv, vec3(0.5, 0.05, 0.05)), 1.0);
}
