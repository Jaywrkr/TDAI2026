// ===============================================================
// HALLOWEEN 13 - CALABAZAS EN HILERA
// Una fila de calabazas talladas sobre un muro de piedra, cada una con
// su cara. Laten con la musica como un ecualizador: la luz de cada una
// sigue una banda distinta (graves a la izquierda, agudos a la derecha).
// Speed mueve las llamas y la niebla del piso. El golpe hace que todas
// destellen en ola, de un lado al otro.
//
// @D1: cantidad de calabazas
// @D2: cuanto laten con el audio
// @D3: ola del golpe (lenta <-> instantanea)
// @D4: tamano
// @D5: color (naranja <-> violeta embrujado)
// @D6: niebla del piso
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.006);

    vec3 orange = mix(hsv2rgb(vec3(fract(0.07 + hue), 0.95, 1.0)),
                      hsv2rgb(vec3(fract(0.80 + hue), 0.75, 1.0)), uD5);
    vec3 skinC = mix(hsv2rgb(vec3(fract(0.06 + hue), 0.95, 0.75)),
                     hsv2rgb(vec3(fract(0.76 + hue), 0.70, 0.55)), uD5);

    // cielo y muro
    vec3 col = mix(vec3(0.04, 0.02, 0.06), vec3(0.005, 0.003, 0.012), smoothstep(-0.2, 1.0, p.y));
    float wallTop = -0.32;
    if (p.y < wallTop) {
        vec2 b = vec2(p.x * 5.0 + 0.5 * mod(floor(p.y * 9.0), 2.0), p.y * 9.0);
        vec2 bf = fract(b);
        float mortar = smoothstep(0.0, 0.06, bf.x) * smoothstep(1.0, 0.94, bf.x) *
                       smoothstep(0.0, 0.10, bf.y) * smoothstep(1.0, 0.90, bf.y);
        float stone = 0.6 + 0.4 * noise21(floor(b) * 3.1);
        col = vec3(0.07, 0.06, 0.07) * stone * mortar + vec3(0.01);
    }

    // historia: cada ~47 s persecucion de luz (se encienden de a una);
    // cada ~83 s todas giran a rojo; cada acto cambia cuantas hay
    float chase = hkEvent(3.0, 47.0, 8.0);
    float redE = hkEvent(4.0, 83.0, 7.0);
    float n = 4.0 + floor(uD1 * 4.0 + hkActVal(5.0) * 1.5);
    float span = uAspect * 1.7;
    float cw = span / n;
    float idx = floor((p.x + span * 0.5) / cw);
    idx = clamp(idx, 0.0, n - 1.0);
    float glowAll = 0.0;
    for (int k = -1; k <= 1; k++) {
        float i = idx + float(k);
        if (i < 0.0 || i > n - 1.0) continue;
        float u = (i + 0.5) / n;                 // 0 izquierda, 1 derecha
        float band = u < 0.34 ? bass : (u < 0.67 ? mid : high);
        // ola del golpe: llega a cada calabaza con retraso segun su lugar
        float wave = hit * smoothstep(0.0, 1.0, 1.0 - abs(u - fract(uRTime * (0.6 + uD3 * 3.0))) * (2.0 - uD3 * 1.5));
        float chaseOn = exp(-pow((u - fract(uRTime * 0.6)) * 6.0, 2.0));
        float lit = (0.75 + band * (0.4 + uD2 * 1.4) + wave * 0.8) * mix(1.0, 0.25 + chaseOn * 2.0, chase);
        float s = cw * (0.36 + uD4 * 0.12) * (0.9 + 0.2 * hash21(vec2(i, 3.0)));
        // locura: las calabazas saltan con el golpe, cada una a su tiempo
        float hop = hit * loco * (0.15 + 0.35 * hash21(vec2(i, floor(uRTime * 2.0)))) * s;
        vec2 c = vec2(-span * 0.5 + (i + 0.5) * cw, wallTop + s * 0.82 + hop);
        vec2 q = (p - c) / s;
        // cuerpo de gajos
        float body = 1e3, shade = 0.0;
        for (int g = -1; g <= 1; g++) {
            vec2 d = (q - vec2(float(g) * 0.42, 0.0)) / vec2(0.62 - abs(float(g)) * 0.08, 0.82);
            float e = length(d) - 1.0;
            if (e < body) { body = e; shade = 1.0 - clamp(length(d), 0.0, 1.0); }
        }
        float m = 1.0 - smoothstep(-0.02, 0.02, body);
        float hsh = hash21(vec2(i, 9.0));
        // cara: ojos triangulares y boca (varia por calabaza)
        vec2 e = vec2(abs(q.x) - 0.32, q.y - 0.18);
        float eyes = max(abs(e.x) * 1.7 + e.y * (hsh > 0.5 ? 1.0 : -1.0) - 0.16, abs(e.y) - 0.14);
        float my = q.y + 0.30 - (0.25 + hsh * 0.25) * q.x * q.x;
        float mouth = max(abs(my) - 0.09, abs(q.x) - 0.55);
        float teeth = step(0.5, fract(q.x * 3.0 + hsh)) * step(my, -0.02);
        mouth = max(mouth, -(teeth - 0.5));
        float holeD = min(eyes, mouth);
        float hole = (1.0 - smoothstep(-0.02, 0.02, holeD)) * m;
        float flick = 0.85 + 0.15 * sin(t * (7.0 + hsh * 4.0) + i);
        vec3 skin = skinC * (0.25 + 0.75 * pow(shade, 0.6)) * (0.55 + 0.25 * lit);
        skin += orange * exp(-max(holeD, 0.0) * 8.0) * 0.25 * lit;
        vec3 inside = mix(orange, vec3(1.0, 0.95, 0.65), 0.35) * lit * flick * 1.3;
        // con locura la llama se vuelve roja infernal
        inside = mix(inside, vec3(1.0, 0.08, 0.02) * lit * 1.4, max(hit * smoothstep(0.5, 1.0, loco), redE));
        // brillo especular arriba a la izquierda de cada gajo
        skin += vec3(1.0, 0.8, 0.5) * pow(shade, 6.0) * smoothstep(0.0, 0.4, q.y + q.x * -0.5) * 0.25;
        vec3 pc = mix(skin, inside, hole);
        col = mix(col, pc, m);
        // tallo
        vec2 sq = q - vec2(0.05, 0.86);
        float stem = max(abs(sq.x) - 0.07, abs(sq.y) - 0.12);
        col = mix(col, vec3(0.06, 0.08, 0.02), (1.0 - smoothstep(-0.02, 0.02, stem)) * (1.0 - m));
        glowAll += exp(-length(q - vec2(0.0, -0.2)) * 1.2) * lit;
    }
    col += orange * glowAll * 0.08 * (1.0 - step(wallTop, p.y) * 0.3);

    // niebla del piso sobre el muro
    float fog = fbm(vec2(p.x * 1.5 - t * 0.06, p.y * 4.0), 3, 0.5);
    float fogBand = exp(-pow((p.y - wallTop + 0.05) / 0.18, 2.0));
    col = mix(col, vec3(0.45, 0.40, 0.55) * (0.4 + bass * 0.4), smoothstep(0.4, 0.85, fog) * fogBand * (0.25 + uD6 * 0.7));

    return vec4(hkFinish(col, uv, vec3(0.8, 0.35, 0.1)), 1.0);
}
