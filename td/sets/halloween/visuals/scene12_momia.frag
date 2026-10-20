// ===============================================================
// HALLOWEEN 12 - MOMIA
// Camara funeraria egipcia (LAMINAS horneadas, plates/scene12, ver
// td/tools/bake_plates_tumba.py): muro de bloques con jeroglificos
// tallados, franjas pintadas, dos antorchas, piso de arena con vasijas
// canopicas y un escarabajo, y al centro el sarcofago dorado abierto.
// Adentro, parada, la momia de cuerpo entero: vendas que siguen la forma
// de la cabeza y el cuerpo, brazos cruzados, bordes deshilachados y ojos
// que brillan en las cuencas. Las antorchas ILUMINAN en vivo el relieve
// de la piedra, el oro y las vendas.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> se encienden los ojos
//   medios -> titilan las antorchas; la arena flota
//   agudos -> brilla el polvo en la luz
//   golpe  -> se aflojan las vendas (D4); con Chaos: rayos de los ojos y
//             tiras de venda que se sueltan y flamean
//   piano  -> mueve la mirada
// Speed hace titilar las antorchas, flotar el polvo y respirar la momia.
// HISTORIA: cada ~73 s las antorchas casi se apagan (solo quedan los
// ojos); cada ~41 s la momia gira la cabeza; cada ~59 s brillan los
// jeroglificos.
//
// @D1: cantidad de vendas
// @D2: separacion entre vendas (cuanto se ve de lo oscuro)
// @D3: brillo de los ojos
// @D4: cuanto se aflojan con el golpe
// @D5: color de los ojos (verde <-> ambar)
// @D6: polvo en la luz
// ===============================================================

const vec4 PL_R = vec4(-3.1, -1.2, 6.2, 2.4);
const float FLOOR_Y = -0.80;
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 alb(vec3 c) { return pow(c, vec3(2.2)); }

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.008);

    float dimE = hkEvent(3.0, 73.0, 6.0);
    float turnE = hkEvent(4.0, 41.0, 5.0);
    float glyphE = hkEvent(5.0, 59.0, 7.0);
    vec2 T0 = vec2(-2.35, 0.36), T1 = vec2(2.40, 0.36);
    float f0 = (0.85 + 0.15 * sin(t * 9.0) + (0.10 + mid * 0.25) * (noise21(vec2(t * 5.0, 3.0)) - 0.5)) * (1.0 - dimE * 0.85);
    float f1 = (0.85 + 0.15 * sin(t * 8.1 + 2.0) + (0.10 + mid * 0.25) * (noise21(vec2(t * 5.0, 7.0)) - 0.5)) * (1.0 - dimE * 0.85);
    vec3 fireC = vec3(1.0, 0.60, 0.25);

    // --- tumba iluminada por las antorchas ---
    vec2 pu = rUV(p);
    vec3 wa = alb(plate0(pu).rgb);
    vec4 wn = plate1(pu);
    vec2 nxy = wn.rg * 2.0 - 1.0;
    vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
    if (wn.b > 0.75) n = normalize(vec3(nxy * 0.6, 0.0) + vec3(0.0, 0.85, 0.5));
    vec3 P3 = vec3(p, 0.0);
    vec3 lit = vec3(0.020, 0.018, 0.022);
    vec3 spec = vec3(0.0);
    for (int i = 0; i < 2; i++) {
        vec3 Lp = vec3(i == 0 ? T0 : T1, 0.30);
        vec3 v = Lp - P3; float dd = dot(v, v); vec3 L = v * inversesqrt(dd);
        float k = (i == 0 ? f0 : f1) / (1.0 + dd * 0.22);
        lit += fireC * max(dot(n, L), 0.0) * k * 1.4;
        spec += fireC * pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 20.0) * k * 0.25;
    }
    // luz cenital tenue que baja por una grieta del techo sobre el sarcofago
    float shaft = exp(-pow((p.x - 0.10 + (p.y - 1.0) * 0.15) / 0.55, 2.0));
    lit += vec3(0.40, 0.42, 0.55) * shaft * 0.35 * (1.0 - dimE * 0.7);
    vec3 col = wa * lit + spec * smoothstep(0.35, 0.6, wa.r);    // el oro brilla
    // jeroglificos que se encienden (evento): donde la talla es honda
    float carve = wn.b < 0.75 ? smoothstep(0.1, 0.45, wn.b) : 0.0;
    col += vec3(0.30, 0.85, 1.0) * carve * glyphE * 0.6 * (0.6 + 0.4 * sin(uRTime * 4.0 + p.y * 6.0));
    // llamas de las antorchas
    for (int i = 0; i < 2; i++) {
        vec2 fq = p - (i == 0 ? T0 : T1);
        float ff = i == 0 ? f0 : f1;
        fq.x += 0.02 * sin(t * 6.0 + fq.y * 20.0 + float(i)) * fq.y * 10.0;
        float fl = length(fq / vec2(0.045, 0.10 * (fq.y > 0.0 ? 1.3 : 0.6)));
        col += vec3(1.0, 0.55, 0.15) * (1.0 - smoothstep(0.5, 1.0, fl)) * ff * 1.5;
        col += vec3(1.0, 0.85, 0.5) * (1.0 - smoothstep(0.0, 0.5, fl)) * ff;
        col += vec3(1.0, 0.5, 0.15) * exp(-length(fq) * 5.0) * 0.25 * ff;
    }

    // --- la momia de cuerpo entero ---
    vec2 c = vec2(0.10 - turnE * 0.03, 0.42);
    vec2 hq = (p - c) / vec2(0.25, 0.31);
    float headD = (length(hq) - 1.0) * 0.25;
    float yb = p.y - 0.10;                                   // hombros en 0.10
    float wb = 0.36 - 0.10 * smoothstep(-0.2, -0.85, p.y) - 0.10 * smoothstep(0.0, 0.10, yb);
    float bodyD = max(abs(p.x - 0.10) - wb, max(yb, FLOOR_Y + 0.02 - p.y));
    bodyD = max(bodyD, length((p - vec2(0.10, -0.05)) / vec2(1.0, 1.0)) - 2.0);
    float mD = hkSmin(headD, bodyD, 0.08);
    float mM = 1.0 - smoothstep(-0.006, 0.006, mD);
    if (mM > 0.0) {
        // coordenadas para las vendas: en la cabeza siguen el craneo
        bool inHead = p.y > 0.18;
        vec2 bp = inHead ? hq : vec2((p.x - 0.10) / max(wb, 0.05), (p.y - 0.10) / 0.31);
        float vol = inHead ? sqrt(max(1.0 - dot(hq, hq), 0.0)) : sqrt(max(1.0 - bp.x * bp.x, 0.0));
        vec3 hn = normalize(vec3(bp.x, inHead ? bp.y : 0.0, vol + 0.05));
        float breathe = 0.012 * sin(t * 0.9) * (inHead ? 0.5 : 1.0);
        float nB = 10.0 + floor(uD1 * 10.0);
        float v = (bp.y + 0.18 * bp.x * bp.x + breathe) * nB * 0.5;
        float row = floor(v);
        float loosen = hit * (0.15 + uD4 * 0.6) * (hash21(vec2(row, 3.0)) - 0.5);
        v += loosen + (hash21(vec2(row, 1.0)) - 0.5) * 0.25 * bp.x;
        row = floor(v);
        float f = fract(v);
        float sep = 0.05 + uD2 * 0.20;
        float prof = smoothstep(sep, sep + 0.18, f) * (1.0 - 0.65 * smoothstep(0.55, 1.0, f));
        float fray = noise21(vec2(bp.x * 40.0, row * 3.7));
        float gapM = 1.0 - smoothstep(sep * 0.6, sep + 0.02 * fray, f);
        float weave = 0.82 + 0.18 * noise21(vec2(bp.x * 90.0 + row * 5.0, f * 6.0));
        float dirt = plate2Wrap(bp * vec2(0.20, 0.5) + row * 0.13).a;
        vec3 cloth = mix(vec3(0.40, 0.33, 0.22), vec3(0.88, 0.80, 0.64), smoothstep(0.3, 0.7, dirt)) * weave;
        // brazos cruzados sobre el pecho y vendas en diagonal
        float diag = 0.0, diagEdge = 0.0;
        for (int i = 0; i < 3; i++) {
            float fi = float(i);
            vec2 org = inHead ? vec2(-0.3 + fi * 0.3, -0.2 + fi * 0.15) : vec2(0.0, -0.55 - fi * 0.5);
            vec2 dq = rot2((inHead ? 0.55 : 0.6) + fi * 0.35 * (inHead ? 1.0 : -2.0)) * (bp - org);
            float bw = inHead ? 0.08 : 0.18;
            float band = 1.0 - smoothstep(bw - 0.01, bw, abs(dq.y));
            diag = max(diag, band * step(abs(dq.x), 0.9));
            diagEdge = max(diagEdge, (1.0 - smoothstep(0.0, 0.03, abs(abs(dq.y) - bw))) * step(abs(dq.x), 0.9));
        }
        vec3 L0 = normalize(vec3(T0 - p, 0.8)), L1 = normalize(vec3(T1 - p, 0.8));
        float lam = max(dot(hn, L0), 0.0) * f0 / (1.0 + dot(T0 - p, T0 - p) * 0.22) + max(dot(hn, L1), 0.0) * f1 / (1.0 + dot(T1 - p, T1 - p) * 0.22);
        float lightK = (0.10 + 1.1 * lam + 0.35 * shaft * (1.0 - dimE * 0.7) * (0.5 + 0.5 * hn.y)) * (0.35 + 0.65 * vol);
        vec3 face = cloth * prof * lightK * fireC;
        face = mix(face, vec3(0.012, 0.008, 0.005), gapM * 0.92);
        face = mix(face, cloth * 1.05 * lightK * fireC, diag);
        face *= 1.0 - 0.7 * diagEdge * (1.0 - diag * 0.5);
        // cuencas y ojos
        vec2 look = vec2(mix(-0.05, 0.05, uKeypos) * uKeypulse + 0.02 * sin(t * 0.4) - turnE * 0.05, 0.0);
        vec2 sk = vec2(abs(hq.x - 0.05) - 0.34, hq.y - 0.14);
        float socket = length(sk / vec2(1.0, 0.55)) - 0.24;
        float socketM = (1.0 - smoothstep(-0.03, 0.03, socket)) * float(inHead);
        face = mix(face, face * 0.12, socketM);
        col = mix(col, face, mM);
    }
    vec3 eyeC = mix(hsv2rgb(vec3(fract(0.30 + hue), 0.90, 1.0)),
                    hsv2rgb(vec3(fract(0.10 + hue), 0.95, 1.0)), uD5);
    vec2 look2 = vec2(mix(-0.05, 0.05, uKeypos) * uKeypulse + 0.02 * sin(t * 0.4) - turnE * 0.05, 0.0) * 0.43;
    vec2 ep = vec2(abs(p.x - c.x - look2.x) - 0.086, p.y - c.y - 0.045);
    float eye = exp(-dot(ep / vec2(0.024, 0.013), ep / vec2(0.024, 0.013)));
    float eb = (0.9 + uD3 * 1.4) * (0.6 + bass * 0.9 + hit * 0.5) * (1.0 + dimE * 1.2);
    col += eyeC * eye * eb;
    col += eyeC * exp(-length(ep) * 25.0) * eb * 0.06;

    // --- LOCURA: rayos de los ojos y tiras de venda que flamean ---
    float beam = hit * smoothstep(0.35, 0.9, loco);
    if (beam > 0.01) {
        for (int s2 = -1; s2 <= 1; s2 += 2) {
            vec2 bp2 = p - vec2(c.x + float(s2) * 0.086 + look2.x, c.y + 0.045);
            float spread = 0.008 + abs(bp2.x) * 0.10;
            float b = smoothstep(spread, 0.0, abs(bp2.y)) * step(0.0, bp2.x * float(s2));
            col += eyeC * b * beam * 1.3 * exp(-abs(bp2.x) * 0.6);
        }
        for (int i = 0; i < 4; i++) {
            float fi = float(i);
            float y0 = -0.55 + fi * 0.22;
            float side = mod(fi, 2.0) * 2.0 - 1.0;
            float x0 = 0.10 + side * 0.32;
            float dx = (p.x - x0) * side;
            float wave = sin(dx * 9.0 - uRTime * 14.0 + fi) * 0.05 * dx;
            float strip = step(0.0, dx) * step(dx, 0.75 * beam) * (1.0 - smoothstep(0.02, 0.03, abs(p.y - y0 - wave - dx * 0.12)));
            col = mix(col, vec3(0.42, 0.35, 0.24) * (0.25 + 0.35 * (f0 + f1) * 0.5 + 0.15 * sin(dx * 30.0)), strip * 0.9);
        }
    }
    // --- polvo y arena flotando en la luz ---
    float dust = hkParticles(p, t * 0.5 + hit * 0.3, 0.10 + uD6 * 0.30 + high * 0.10, vec2(0.3, 0.4 + mid * 0.4), 0.03);
    float tl = exp(-length(p - T0) * 0.9) * f0 + exp(-length(p - T1) * 0.9) * f1;
    col += vec3(1.0, 0.8, 0.55) * dust * (0.05 + 1.2 * tl) * (0.5 + high * 0.8);

    return vec4(hkFinish(col, uv, vec3(0.6, 0.45, 0.2)), 1.0);
}
