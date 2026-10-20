// ===============================================================
// HALLOWEEN 12 - MOMIA
// Cabeza de momia envuelta en vendas que siguen la curva del craneo,
// con sombra donde una capa monta sobre otra, bordes deshilachados,
// cuencas hundidas donde brillan los ojos, en una tumba de bloques de
// piedra iluminada por una antorcha que titila.
// Speed hace titilar la antorcha, flotar el polvo y respirar las vendas.
// El bajo enciende los ojos; el golpe afloja las vendas; el piano mueve
// la mirada. LOCURA (Chaos): rayos de luz salen de los ojos y tiras de
// venda se sueltan y flamean.
//
// @D1: cantidad de vendas
// @D2: separacion entre vendas (cuanto se ve de lo oscuro)
// @D3: brillo de los ojos
// @D4: cuanto se aflojan con el golpe
// @D5: color de los ojos (verde <-> ambar)
// @D6: polvo en la luz
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    // --- tumba: bloques de piedra y antorcha ---
    vec2 torch = vec2(-uAspect * 0.78, 0.30);
    // historia: cada ~73 s la antorcha casi se apaga (solo quedan los ojos)
    // y cada ~41 s la momia gira la cabeza hacia el publico
    float dimE = hkEvent(3.0, 73.0, 6.0);
    float turnE = hkEvent(4.0, 41.0, 5.0);
    float tflick = (0.85 + 0.15 * sin(t * 9.0) + 0.10 * noise21(vec2(t * 5.0, 3.0))) * (1.0 - dimE * 0.85);
    float tl = exp(-length(p - torch) * 1.0) * tflick;
    vec2 bq = vec2(p.x * 2.6 + 0.5 * mod(floor(p.y * 4.0), 2.0), p.y * 4.0);
    vec2 bf = fract(bq);
    float joint = smoothstep(0.0, 0.03, bf.x) * smoothstep(1.0, 0.97, bf.x) * smoothstep(0.0, 0.05, bf.y) * smoothstep(1.0, 0.95, bf.y);
    float grime = fbm(p * 6.0 + floor(bq) * 0.7, 3, 0.6);
    vec3 col = vec3(0.16, 0.12, 0.075) * (0.45 + 0.7 * grime) * joint * (0.18 + 1.6 * tl);
    // antorcha: llama y halo
    vec2 fq = p - torch;
    float fl = length(fq / vec2(0.05, 0.11 * (fq.y > 0.0 ? 1.3 : 0.7)));
    col += vec3(1.0, 0.55, 0.15) * (1.0 - smoothstep(0.5, 1.0, fl)) * tflick * 1.5;
    col += vec3(1.0, 0.85, 0.5) * (1.0 - smoothstep(0.0, 0.5, fl)) * tflick;
    col += vec3(1.0, 0.5, 0.15) * exp(-length(fq) * 5.0) * 0.25 * tflick;

    // --- cabeza ---
    vec2 c = vec2(0.10 - turnE * 0.06, -0.02);
    vec2 hp = (p - c) / vec2(0.58, 0.80);
    hp.x /= 1.0 - 0.10 * smoothstep(0.0, -0.9, hp.y);
    float head = length(hp) - 1.0;
    float headM = 1.0 - smoothstep(-0.008, 0.008, head);
    float vol = sqrt(max(1.0 - dot(hp, hp), 0.0));
    vec3 hn = normalize(vec3(hp, vol + 0.05));
    float lam = clamp(dot(hn, normalize(vec3(torch - p, 0.9))), 0.0, 1.0);

    // vendas que rodean la cabeza: la curva sigue al craneo
    float n = 10.0 + floor(uD1 * 10.0);
    float breathe = 0.012 * sin(t * 0.9);
    float v = (hp.y + 0.18 * hp.x * hp.x + breathe) * n * 0.5;
    float row = floor(v);
    float loosen = hit * (0.15 + uD4 * 0.6) * (hash21(vec2(row, 3.0)) - 0.5);
    v += loosen + (hash21(vec2(row, 1.0)) - 0.5) * 0.25 * hp.x;      // cada venda algo torcida
    row = floor(v);
    float f = fract(v);
    float sep = 0.05 + uD2 * 0.20;
    // perfil de cada venda: sube a la luz, cae en sombra bajo la de arriba
    float prof = smoothstep(sep, sep + 0.18, f) * (1.0 - 0.65 * smoothstep(0.55, 1.0, f));
    float fray = noise21(vec2(hp.x * 40.0, row * 3.7));
    float gapM = 1.0 - smoothstep(sep * 0.6, sep + 0.02 * fray, f);
    float weave = 0.82 + 0.18 * noise21(vec2(hp.x * 90.0 + row * 5.0, f * 6.0));
    float dirt = fbm(hp * vec2(4.0, 12.0) + row, 3);
    vec3 cloth = mix(vec3(0.40, 0.33, 0.22), vec3(0.88, 0.80, 0.64), dirt) * weave;
    // tres vendas en diagonal montadas encima
    float diag = 0.0;
    float diagEdge = 0.0;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 dq = rot2(0.55 + fi * 0.35) * (hp - vec2(-0.3 + fi * 0.3, -0.2 + fi * 0.15));
        float band = 1.0 - smoothstep(0.075, 0.085, abs(dq.y));
        diag = max(diag, band * step(abs(dq.x), 0.9));
        diagEdge = max(diagEdge, (1.0 - smoothstep(0.0, 0.02, abs(abs(dq.y) - 0.085))) * step(abs(dq.x), 0.9));
    }
    float lightK = (0.30 + 0.85 * lam * tflick) * (0.35 + 0.65 * vol);
    vec3 face = cloth * prof * lightK;
    face = mix(face, vec3(0.012, 0.008, 0.005), gapM * 0.92);
    face = mix(face, cloth * 1.05 * lightK, diag);
    // sombra bajo el borde de las vendas diagonales: se leen montadas encima
    face *= 1.0 - 0.7 * diagEdge * (1.0 - diag * 0.5);

    // cuencas hundidas y ojos
    vec2 look = vec2(mix(-0.05, 0.05, uKeypos) * uKeypulse + 0.02 * sin(t * 0.4) - turnE * 0.05, 0.0);
    vec2 sk = vec2(abs(hp.x - 0.05) - 0.34, hp.y - 0.14);
    float socket = length(sk / vec2(1.0, 0.55)) - 0.24;
    float socketM = 1.0 - smoothstep(-0.03, 0.03, socket);
    face = mix(face, face * 0.12, socketM);
    vec3 eyeC = mix(hsv2rgb(vec3(fract(0.30 + hue), 0.90, 1.0)),
                    hsv2rgb(vec3(fract(0.10 + hue), 0.95, 1.0)), uD5);
    vec2 ep = vec2(abs(p.x - c.x - look.x) - 0.20, p.y - c.y - 0.11);
    float eye = exp(-dot(ep / vec2(0.055, 0.030), ep / vec2(0.055, 0.030)));
    float eb = (0.9 + uD3 * 1.4) * (0.6 + bass * 0.9 + hit * 0.5) * (1.0 + dimE * 1.2);
    face += eyeC * eye * eb;
    face += eyeC * exp(-max(socket, 0.0) * 12.0) * socketM * eb * 0.10;
    col = mix(col, face, headM);
    col += vec3(1.0, 0.6, 0.3) * hkLine(head, 1.5) * lam * 0.30;
    col *= 1.0 - 0.5 * exp(-max(head, 0.0) * 14.0) * (1.0 - headM) * smoothstep(-0.2, 0.6, p.x - c.x);  // sombra en el muro

    // --- LOCURA: rayos de los ojos y tiras de venda que flamean ---
    float beam = hit * smoothstep(0.35, 0.9, loco);
    if (beam > 0.01) {
        for (int s2 = -1; s2 <= 1; s2 += 2) {
            vec2 bp = p - vec2(c.x + float(s2) * 0.20 + look.x, c.y + 0.11);
            float spread = 0.015 + abs(bp.x) * 0.12;
            float b = smoothstep(spread, 0.0, abs(bp.y)) * step(0.0, bp.x * float(s2));
            col += eyeC * b * beam * 1.3 * exp(-abs(bp.x) * 0.6);
        }
        for (int i = 0; i < 4; i++) {
            float fi = float(i);
            float y0 = c.y - 0.45 + fi * 0.26;
            float side = mod(fi, 2.0) * 2.0 - 1.0;
            float x0 = c.x + side * 0.52;
            float dx = (p.x - x0) * side;
            float wave = sin(dx * 9.0 - uRTime * 14.0 + fi) * 0.05 * dx;
            float strip = step(0.0, dx) * step(dx, 0.75 * beam) * (1.0 - smoothstep(0.025, 0.035, abs(p.y - y0 - wave - dx * 0.12)));
            col = mix(col, vec3(0.62, 0.54, 0.40) * (0.4 + 0.8 * tl + 0.3 * sin(dx * 30.0)), strip);
        }
    }
    // --- polvo en la luz de la antorcha ---
    float dust = hkParticles(p, t * 0.5 + hit * 0.3, 0.12 + uD6 * 0.35, vec2(0.3, 0.4), 0.035);
    col += vec3(1.0, 0.8, 0.55) * dust * (0.05 + 1.2 * tl) * 0.6;

    return vec4(hkFinish(col, uv, vec3(0.6, 0.45, 0.2)), 1.0);
}
