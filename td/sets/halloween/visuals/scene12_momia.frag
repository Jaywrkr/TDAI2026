// ===============================================================
// HALLOWEEN 12 - MOMIA
// Cara de momia envuelta en vendas cruzadas, con dos ojos que brillan
// entre las rendijas y polvo que flota en un sarcofago oscuro.
// Speed mueve el polvo y deja respirar las vendas. El bajo enciende los
// ojos; el golpe hace que las vendas se aflojen (cada una a su modo) y
// sube el polvo; el piano mueve la mirada.
//
// @D1: cantidad de vendas
// @D2: separacion entre vendas (cuanto se ve de los ojos)
// @D3: brillo de los ojos
// @D4: cuanto se aflojan con el golpe
// @D5: color de los ojos (verde <-> ambar)
// @D6: polvo
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = clamp(max(uKick, uBeat * 0.7), 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    vec3 col = mix(vec3(0.02, 0.015, 0.01), vec3(0.07, 0.05, 0.03),
                   smoothstep(1.3, 0.0, length(p)));

    // cabeza: ovalo
    vec2 hp = (p - vec2(0.0, 0.0)) / vec2(0.62, 0.86);
    float head = length(hp) - 1.0;
    float headM = 1.0 - smoothstep(-0.01, 0.01, head);
    // sombreado de volumen
    float vol = sqrt(max(1.0 - dot(hp, hp), 0.0));

    // vendas: bandas inclinadas que se cruzan
    float n = 9.0 + floor(uD1 * 9.0);
    vec3 cloth = vec3(0.0);
    float gap = 0.0;
    float breathe = 0.01 * sin(t * 0.9);
    for (int k = 0; k < 2; k++) {
        float fk = float(k);
        float ang = fk == 0.0 ? 0.22 : -0.30;
        vec2 q = rot2(ang) * p;
        float row = floor(q.y * n * 0.5 + 0.5);
        float loosen = hit * (0.01 + uD4 * 0.05) * (hash21(vec2(row, fk)) - 0.5);
        float y = q.y * n * 0.5 + breathe * n + loosen * n + fk * 0.37;
        float f = fract(y);
        // cada venda es un cilindro: clara al centro, oscura en los bordes
        float roll = pow(sin(f * PI), 0.7);
        float weave = 0.80 + 0.20 * noise21(vec2(q.x * 70.0, row * 7.0));
        float dirt = fbm(q * vec2(6.0, 16.0) + row, 3);
        vec3 c = mix(vec3(0.42, 0.36, 0.26), vec3(0.86, 0.80, 0.66), dirt) * weave * (0.25 + 0.75 * roll);
        // la venda de arriba tapa a la de abajo: sombra en el cruce
        c *= 1.0 - fk * 0.25 * smoothstep(0.3, 0.0, f);
        float sep = 0.06 + uD2 * 0.22;
        float hole = (1.0 - smoothstep(0.0, sep, f)) * step(abs(q.x), 0.46);
        gap = max(gap, hole * (1.0 - fk * 0.5));
        cloth = max(cloth, c);
    }
    vec3 face = cloth * (0.35 + 0.65 * vol);
    // rendija a la altura de los ojos: ahi las vendas siempre se separan
    float slit = exp(-pow((p.y - 0.12) / (0.05 + uD2 * 0.05), 2.0)) * step(abs(p.x), 0.40);
    gap = max(gap, slit);
    // las rendijas dejan ver la oscuridad de adentro
    face = mix(face, vec3(0.01, 0.008, 0.005), clamp(gap, 0.0, 1.0) * 0.85);

    // ojos que brillan entre las vendas
    vec3 eyeC = mix(hsv2rgb(vec3(fract(0.30 + hue), 0.90, 1.0)),
                    hsv2rgb(vec3(fract(0.10 + hue), 0.95, 1.0)), uD5);
    vec2 look = vec2(mix(-0.05, 0.05, uKeypos) * uKeypulse + 0.02 * sin(t * 0.4), 0.0);
    vec2 ep = vec2(abs(p.x - look.x) - 0.20, p.y - 0.12);
    float eye = exp(-dot(ep / vec2(0.07, 0.035), ep / vec2(0.07, 0.035)));
    float eb = (0.8 + uD3 * 1.4) * (0.6 + bass * 0.9 + hit * 0.5);
    face += eyeC * eye * eb * (0.35 + gap * 0.9);
    face += eyeC * exp(-length(ep) * 9.0) * eb * 0.15;
    col = mix(col, face, headM);
    // contorno de luz
    col += vec3(0.6, 0.5, 0.35) * edgeLine(head, 2.0) * 0.25;

    // polvo flotando
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 g = p * (10.0 + fi * 8.0) + vec2(t * 0.2 * (fi + 1.0), t * 0.35 + hit * 0.4);
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5 - (hash22(id + fi) - 0.5) * 0.7;
        float alive = step(0.82 - uD6 * 0.35, hash21(id + fi * 5.0));
        col += vec3(0.9, 0.8, 0.6) * exp(-dot(f, f) * 160.0) * alive * 0.35;
    }
    col *= vignette(uv, 0.45);
    return vec4(col, 1.0);
}
