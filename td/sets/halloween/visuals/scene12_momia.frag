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
// PIANO: cada tecla suelta una venda que flamea al costado de la momia, a
//   la altura de la nota (grave abajo); la fuerza la hace mas larga;
//   apretada sigue flameando, al soltarla cae. La momia mira hacia la tecla.
// Speed hace titilar las antorchas, flotar el polvo y respirar la momia.
// REPERTORIO (fase 33, motor hkSuceso del kit):
//   ESTADOS (~5 min): antorchas, penumbra (antorchas bajas, manda la luz
//     del techo) y arena en el aire.
//   SUCESOS (~55 s, 7): la momia gira la cabeza; brillan los jeroglificos;
//     escarabajos cruzan el piso; una venda se suelta y cae; la momia
//     levanta un brazo; cae arena del techo; una vasija suelta humo verde.
//   DETALLES (~30 s, 5): una antorcha chisporrotea, los ojos parpadean, un
//     jeroglifico suelto brilla, un escarabajo en la pared, polvo en la luz.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A los rayos: las antorchas se apagan; en la oscuridad brillan los
//       jeroglificos, la momia gira la cabeza y sus ojos lanzan rayos; las
//       antorchas vuelven con una llamarada.
//     B el despertar: la momia da un paso hacia la camara, se le aflojan
//       las vendas y las antorchas se inclinan; despues vuelve a su lugar.
//     C los escarabajos: un enjambre sale del sarcofago y cubre el piso y
//       las paredes; despues se mete otra vez.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con todas las
//     vendas sueltas.
// @EST: antorchas | penumbra | arena en el aire
// @SUC: gira la cabeza | jeroglificos | escarabajos | venda que cae | levanta un brazo | arena del techo | humo de la vasija
// @DET: chisporrotea | parpadea | jeroglifico suelto | escarabajo en la pared | polvo en la luz
// @CLX: A los rayos | B el despertar | C los escarabajos
//
// @D1: cantidad de vendas (se aprietan o aflojan sin saltos)
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

// Escarabajo de ~1 de largo mirando a +x
float hwScarab(vec2 q, float t) {
    float body = length(q / vec2(0.50, 0.32)) - 1.0;
    float head = length((q - vec2(0.52, 0.0)) / vec2(0.16, 0.18)) - 1.0;
    float legs = 1e3;
    for (int i = -1; i <= 1; i++) {
        float x = float(i) * 0.22 + 0.04 * sin(t * 20.0 + float(i) * 2.0);
        legs = min(legs, min(hkSeg(q, vec2(x, 0.2), vec2(x - 0.12, 0.48)), hkSeg(q, vec2(x, -0.2), vec2(x - 0.12, -0.48))) - 0.035);
    }
    return min(min(body * 0.3, head * 0.16), legs);
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.008);

    // --- calendario (fase 33) ---
    hkSetClimax(3.0, 18.0, 22.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(3.0, 7, 9.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(3.0, 5, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(3.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(3.0, 3));
    float cph = cA * C.w;
    // aviso: parpadean y se apagan; pico: oscuro; secuelas: llamarada
    float dying = cA * C.x * (1.0 - C.z);
    float dimE = clamp(dying * (0.75 + 0.25 * step(0.5, noise21(vec2(uRTime * 14.0, 2.0)))) , 0.0, 1.0);
    float relight = cA * C.z * (1.0 - smoothstep(0.85, 1.0, cph));
    float turnE = max(sv == 0 ? se : 0.0, smoothstep(0.38, 0.48, cph) * (1.0 - smoothstep(0.56, 0.62, cph)));
    float glyphE = max(sv == 1 ? se : 0.0, cA * C.y);
    // B: da un paso hacia la camara; C: el enjambre
    float stepK = cB * smoothstep(0.10, 0.45, C.w) * (1.0 - smoothstep(0.72, 0.95, C.w));
    float swarm = cC * smoothstep(0.08, 0.45, C.w) * (1.0 - smoothstep(0.70, 0.95, C.w));
    // la mirada sigue a la ultima tecla
    float keyLook = 0.0;
    for (int k = 0; k < N_KEYS; k++) keyLook = max(keyLook, keyEnv(k, 0.15, 1.2));
    float lookX = mix(-0.05, 0.05, uKeypos) * max(uKeypulse, keyLook);
    vec2 T0 = vec2(-2.35, 0.36), T1 = vec2(2.40, 0.36);
    float tdim = (1.0 - dimE * 0.92) * (1.0 + relight * 0.9) * (1.0 - EST.y * 0.5);
    float f0 = (0.85 + 0.15 * sin(t * 9.0) + (0.10 + mid * 0.25) * (noise21(vec2(t * 5.0, 3.0)) - 0.5)) * tdim;
    float f1 = (0.85 + 0.15 * sin(t * 8.1 + 2.0) + (0.10 + mid * 0.25) * (noise21(vec2(t * 5.0, 7.0)) - 0.5)) * tdim;
    // detalle: una antorcha chisporrotea
    if (dv == 0) { float cr = 1.0 + D.x * 0.5 * (noise21(vec2(uRTime * 9.0, 4.0)) - 0.3); if (D.w > 0.5) f0 *= cr; else f1 *= cr; }
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
    lit += vec3(0.40, 0.42, 0.55) * shaft * 0.35 * (1.0 - dimE * 0.7) * (1.0 + EST.y * 0.8);
    vec3 col = wa * lit + spec * smoothstep(0.35, 0.6, wa.r);    // el oro brilla
    // jeroglificos que se encienden (evento): donde la talla es honda
    float carve = wn.b < 0.75 ? smoothstep(0.1, 0.45, wn.b) : 0.0;
    col += vec3(0.30, 0.85, 1.0) * carve * glyphE * 0.6 * (0.6 + 0.4 * sin(uRTime * 4.0 + p.y * 6.0));
    // detalle: un jeroglifico suelto brilla
    if (dv == 2) col += vec3(0.30, 0.85, 1.0) * carve * D.x * 0.9 * exp(-dot(p - vec2((D.w - 0.5) * 4.2, (fract(D.w * 7.0) - 0.5) * 1.2), p - vec2((D.w - 0.5) * 4.2, (fract(D.w * 7.0) - 0.5) * 1.2)) * 40.0);
    // llamas de las antorchas
    for (int i = 0; i < 2; i++) {
        vec2 fq = p - (i == 0 ? T0 : T1);
        float ff = i == 0 ? f0 : f1;
        fq.x += 0.02 * sin(t * 6.0 + fq.y * 20.0 + float(i)) * fq.y * 10.0;
        fq.x += stepK * (i == 0 ? -1.0 : 1.0) * max(fq.y, 0.0) * 0.8;     // B: se inclinan hacia la momia
        float fl = length(fq / vec2(0.045, 0.10 * (fq.y > 0.0 ? 1.3 : 0.6)));
        col += vec3(1.0, 0.55, 0.15) * (1.0 - smoothstep(0.5, 1.0, fl)) * ff * 1.5;
        col += vec3(1.0, 0.85, 0.5) * (1.0 - smoothstep(0.0, 0.5, fl)) * ff;
        col += vec3(1.0, 0.5, 0.15) * exp(-length(fq) * 5.0) * 0.25 * ff;
    }

    // --- la momia de cuerpo entero ---
    // B: da un paso hacia la camara (crece desde los pies)
    vec2 pm = vec2(0.10, 0.25) + (p - vec2(0.10, 0.25)) / (1.0 + stepK * 0.22);
    vec2 c = vec2(0.10 - turnE * 0.03, 0.42);
    vec2 hq = (pm - c) / vec2(0.25, 0.31);
    float headD = (length(hq) - 1.0) * 0.25;
    float yb = pm.y - 0.10;                                   // hombros en 0.10
    float wb = 0.36 - 0.10 * smoothstep(-0.2, -0.85, pm.y) - 0.10 * smoothstep(0.0, 0.10, yb);
    float bodyD = max(abs(pm.x - 0.10) - wb, max(yb, FLOOR_Y + 0.02 - pm.y));
    bodyD = max(bodyD, length((pm - vec2(0.10, -0.05)) / vec2(1.0, 1.0)) - 2.0);
    float mD = hkSmin(headD, bodyD, 0.08);
    float mM = 1.0 - smoothstep(-0.006, 0.006, mD);
    if (mM > 0.0) {
        // coordenadas para las vendas: en la cabeza siguen el craneo
        bool inHead = pm.y > 0.18;
        vec2 bp = inHead ? hq : vec2((pm.x - 0.10) / max(wb, 0.05), (pm.y - 0.10) / 0.31);
        float vol = inHead ? sqrt(max(1.0 - dot(hq, hq), 0.0)) : sqrt(max(1.0 - bp.x * bp.x, 0.0));
        vec3 hn = normalize(vec3(bp.x, inHead ? bp.y : 0.0, vol + 0.05));
        float breathe = 0.012 * sin(t * 0.9) * (inHead ? 0.5 : 1.0);
        float nB = 10.0 + uD1 * 10.0;     // continuo: las vendas se aprietan sin saltar
        float v = (bp.y + 0.18 * bp.x * bp.x + breathe) * nB * 0.5;
        float row = floor(v);
        float loosen = (hit * (0.15 + uD4 * 0.6) + stepK * 0.5) * (hash21(vec2(row, 3.0)) - 0.5);
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
        // cada venda es un tubo (fase 24): el canto de arriba mira hacia
        // arriba y el de abajo hacia abajo; las antorchas marcan cada vuelta
        float bu = clamp((f - sep) / max(1.0 - sep, 0.05), 0.0, 1.0);
        float bandN = (bu - 0.5) * 2.0 * (1.0 - gapM);
        hn = normalize(hn + vec3(0.15 * (fray - 0.5), bandN * 1.6, 0.0) * (1.0 - diag * 0.7));
        float bandAO = 0.55 + 0.45 * sin(bu * 3.14159);              // los cantos del tubo, mas oscuros
        vec3 L0 = normalize(vec3(T0 - pm, 0.8)), L1 = normalize(vec3(T1 - pm, 0.8));
        float lam = max(dot(hn, L0), 0.0) * f0 / (1.0 + dot(T0 - pm, T0 - pm) * 0.22) + max(dot(hn, L1), 0.0) * f1 / (1.0 + dot(T1 - pm, T1 - pm) * 0.22);
        float lightK = (0.10 + 1.1 * lam + 0.35 * shaft * (1.0 - dimE * 0.7) * (0.5 + 0.5 * hn.y)) * (0.35 + 0.65 * vol);
        vec3 face = cloth * prof * lightK * fireC * bandAO;
        face = mix(face, vec3(0.012, 0.008, 0.005), gapM * 0.92);
        face = mix(face, cloth * 1.05 * lightK * fireC, diag);
        face *= 1.0 - 0.7 * diagEdge * (1.0 - diag * 0.5);
        // cuencas y ojos
        vec2 look = vec2(lookX + 0.02 * sin(t * 0.4) - turnE * 0.05, 0.0);
        vec2 sk = vec2(abs(hq.x - 0.05) - 0.34, hq.y - 0.14);
        float socket = length(sk / vec2(1.0, 0.55)) - 0.24;
        float socketM = (1.0 - smoothstep(-0.03, 0.03, socket)) * float(inHead);
        face = mix(face, face * 0.12, socketM);
        col = mix(col, face, mM);
    }
    vec3 eyeC = mix(hsv2rgb(vec3(fract(0.30 + hue), 0.90, 1.0)),
                    hsv2rgb(vec3(fract(0.10 + hue), 0.95, 1.0)), uD5);
    vec2 look2 = vec2(lookX + 0.02 * sin(t * 0.4) - turnE * 0.05, 0.0) * 0.43;
    vec2 ep = vec2(abs(pm.x - c.x - look2.x) - 0.086, pm.y - c.y - 0.045);
    float eye = exp(-dot(ep / vec2(0.024, 0.013), ep / vec2(0.024, 0.013)));
    float eb = (0.9 + uD3 * 1.4) * (0.6 + bass * 0.9 + hit * 0.5) * (1.0 + dimE * 1.2 + cA * C.y * 1.5 + stepK * 1.5);
    if (dv == 1) eb *= 1.0 - D.x * step(0.45, D.y) * (1.0 - step(0.55, D.y));   // detalle: parpadea
    col += eyeC * eye * eb;
    col += eyeC * exp(-length(ep) * 25.0) * eb * 0.06;

    // --- LOCURA: rayos de los ojos y tiras de venda que flamean ---
    float beam = max(hit * smoothstep(0.35, 0.9, loco), cA * smoothstep(0.48, 0.55, cph) * (1.0 - smoothstep(0.64, 0.70, cph)));
    float strips = max(beam, G.y);
    if (strips > 0.01) {
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
            float strip = step(0.0, dx) * step(dx, 0.75 * strips) * (1.0 - smoothstep(0.02, 0.03, abs(p.y - y0 - wave - dx * 0.12)));
            col = mix(col, vec3(0.42, 0.35, 0.24) * (0.25 + 0.35 * (f0 + f1) * 0.5 + 0.15 * sin(dx * 30.0)), strip * 0.9);
        }
    }
    // --- PIANO: vendas sueltas que flamean a la altura de la nota ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.15, 1.0);
        if (e < 0.01) continue;
        float vel = keyVel(k), rel = keyRelAge(k);
        float y0 = mix(-0.60, 0.25, keyPos(k));
        float side = fract(keyPos(k) * 7.0 + float(k) * 0.5) > 0.5 ? 1.0 : -1.0;
        float x0 = 0.10 + side * 0.30;
        float dx = (p.x - x0) * side;
        float len = (0.35 + vel * 0.55) * smoothstep(0.0, 0.5, keyAge(k));
        float fall = rel * rel * 0.8;
        float wave = sin(dx * 9.0 - uKclock * 12.0 + float(k)) * 0.05 * dx;
        float strip = step(0.0, dx) * step(dx, len) * (1.0 - smoothstep(0.018, 0.028, abs(p.y - y0 - wave - dx * 0.10 + fall * dx * 2.0)));
        col = mix(col, vec3(0.42, 0.35, 0.24) * (0.25 + 0.35 * (f0 + f1) * 0.5 + 0.15 * sin(dx * 30.0)), strip * 0.9 * e);
    }
    // --- suceso: una venda se suelta y cae al piso ---
    if (sv == 3 && se > 0.0) {
        float side = ss > 0.5 ? 1.0 : -1.0;
        float y0 = mix(-0.35, 0.05, fract(ss * 5.0));
        float x0 = 0.10 + side * 0.30;
        float dx = (p.x - x0) * side;
        float out_ = smoothstep(0.05, 0.4, sp);
        float drop = smoothstep(0.4, 0.9, sp);
        float wave = sin(dx * 9.0 - uRTime * 6.0) * 0.04 * dx * (1.0 - drop);
        float yy = y0 - dx * 0.10 - drop * dx * dx * 2.5 + wave;
        yy = max(yy, FLOOR_Y + 0.01);
        float strip = step(0.0, dx) * step(dx, 0.75 * out_) * (1.0 - smoothstep(0.018, 0.028, abs(p.y - yy)));
        col = mix(col, vec3(0.42, 0.35, 0.24) * (0.25 + 0.35 * (f0 + f1) * 0.5), strip * 0.9 * se);
    }
    // --- EASTER EGG "JAY INFINITO" (fase 38): una venda se desenrolla del
    // hombro y queda colgando en el aire con forma de J ---
    vec2 EG = hkEgg(12.0);
    if (EG.x > 0.0) {
        vec2 jc = vec2(0.78, -0.18);
        vec2 jq = (p - jc) / 0.55;
        if (abs(jq.x) < 0.9 && abs(jq.y) < 0.9) {
            jq.x += 0.03 * sin(jq.y * 8.0 - uRTime * 3.0);           // flamea un poco
            float dj = hkText(jq, int[16](74, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 1) * 0.55;
            float unroll = smoothstep(0.0, 0.5, EG.y) * 1.3 - 0.15;      // baja de arriba hacia abajo
            float shown;
            shown = step(1.0 - unroll * 1.25, jq.y + 0.5);
            float link = hkSeg(p, vec2(0.36, 0.12), vec2(jc.x - 0.10, jc.y + 0.275)) + 0.004 * sin(p.x * 40.0);
            float strip = max((1.0 - smoothstep(0.022, 0.032, dj)) * shown,
                              (1.0 - smoothstep(0.020, 0.030, link)) * smoothstep(0.0, 0.15, EG.y));
            float weave = 0.75 + 0.25 * sin((jq.x + jq.y) * 90.0);
            col = mix(col, vec3(0.42, 0.35, 0.24) * (0.55 + 0.6 * (f0 + f1) * 0.5) * weave, strip * 0.95 * EG.x);
        }
    }
    // --- suceso: la momia levanta un brazo ---
    if (sv == 4 && se > 0.0) {
        float up = sin(clamp(sp * 1.1, 0.0, 1.0) * PI);
        float side = ss > 0.5 ? 1.0 : -1.0;
        vec2 sh = vec2(0.10 + side * 0.30, 0.02);
        vec2 hand = sh + vec2(side * mix(0.05, 0.45, up), mix(-0.45, 0.05, up));
        float arm = hkSeg(p, sh, hand) - 0.075;
        vec2 ad = normalize(hand - sh);
        float along = dot(p - sh, ad);
        float bands = 0.75 + 0.25 * sin(along * 90.0);
        vec3 armC = vec3(0.55, 0.46, 0.31) * bands * (0.2 + 0.5 * (f0 + f1) * 0.5 + 0.2 * shaft);
        col = mix(col, armC, (1.0 - smoothstep(-0.004, 0.004, arm)) * se);
    }
    // --- suceso: humo verde sale de una vasija ---
    if (sv == 6 && se > 0.0) {
        vec2 jv = vec2(ss > 0.5 ? 1.25 : -1.35, -0.80);
        vec2 sq = p - jv;
        float sm = plate2Wrap(vec2(sq.x * 0.6 + sin(sq.y * 3.0 - uRTime) * 0.08, sq.y * 0.3 - uRTime * 0.08)).a;
        float plume = exp(-pow(sq.x / (0.06 + max(sq.y, 0.0) * 0.35), 2.0)) * step(0.0, sq.y) * exp(-sq.y * 1.2);
        col += vec3(0.25, 0.9, 0.35) * smoothstep(0.35, 0.75, sm) * plume * se * smoothstep(0.1, 0.4, sp) * 0.6;
    }
    // --- suceso: cae arena del techo; estado: arena en el aire ---
    if (sv == 5 && se > 0.0) {
        for (int i = 0; i < 3; i++) {
            float fi = float(i);
            float x0 = (hash21(vec2(fi, floor(ss * 10.0))) - 0.5) * 4.0;
            float w = 0.012 + 0.01 * fi;
            float fall = noise21(vec2(p.y * 20.0 + uRTime * 15.0, fi));
            float str = exp(-pow((p.x - x0) / w, 2.0)) * smoothstep(1.05, 0.9, p.y) * step(FLOOR_Y, p.y) * (0.5 + 0.5 * fall);
            col += vec3(0.9, 0.7, 0.45) * str * se * (0.15 + 0.5 * (f0 + f1) * 0.5);
            col += vec3(0.9, 0.7, 0.45) * exp(-pow((p.x - x0) / 0.12, 2.0) - pow((p.y - FLOOR_Y) / 0.04, 2.0)) * se * smoothstep(0.2, 0.8, sp) * 0.25;
        }
    }
    if (EST.z > 0.0) {
        float sand = plate2Wrap(vec2(p.x * 0.15 - uRTime * 0.04, p.y * 0.4)).a;
        col = mix(col, vec3(0.30, 0.22, 0.12) * (0.4 + 0.6 * (f0 + f1) * 0.5), EST.z * 0.30 * smoothstep(0.3, 0.8, sand));
    }
    // --- escarabajos: suceso (pocos por el piso), detalle (uno en la pared), C (enjambre) ---
    float bugs = max(sv == 2 ? se * 0.25 : 0.0, swarm);
    if (bugs > 0.0) {
        float cellS = 0.20;
        float row = floor(p.y / cellS);
        float dir = mod(row, 2.0) > 0.5 ? 1.0 : -1.0;
        // en el C salen del sarcofago: el frente avanza desde el centro
        float reach = cC > 0.0 ? swarm * 3.0 : 9.0;
        vec2 g = vec2(p.x + dir * uRTime * 0.12, p.y) / cellS;
        vec2 id = floor(g);
        vec2 h = hash22(id + 3.0);
        float onF = step(1.0 - bugs, h.x) * step(length((p - vec2(0.10, -0.3)) * vec2(0.7, 1.0)), reach);
        if (sv == 2 && cC <= 0.0) onF *= step(p.y, FLOOR_Y + 0.08);
        if (onF > 0.0) {
            vec2 q = (fract(g) - 0.5 - (h - 0.5) * 0.3) * cellS / 0.075;
            q.x *= dir;
            float sd = hwScarab(q, uRTime + h.y * 9.0);
            float bm = 1.0 - smoothstep(-0.03, 0.03, sd);
            vec3 shell = vec3(0.03, 0.05, 0.03) + vec3(0.25, 0.4, 0.2) * smoothstep(0.2, -0.4, q.y) * (0.2 + (f0 + f1) * 0.3);
            col = mix(col, shell, bm);
        }
    }
    if (dv == 3) {
        vec2 bc = vec2(mix(-2.0, -0.6, D.w) + (D.w > 0.5 ? 2.6 : 0.0), mix(-0.4, 0.6, D.y));
        vec2 q = rot2(-1.57) * (p - bc) / 0.07;
        float bm = 1.0 - smoothstep(-0.03, 0.03, hwScarab(q, uRTime));
        col = mix(col, vec3(0.03, 0.05, 0.03) + vec3(0.2, 0.3, 0.15) * (f0 + f1) * 0.2, bm * D.x);
    }
    // --- polvo y arena flotando en la luz ---
    float dust = hkParticles(p, t * 0.5 + hit * 0.3, 0.10 + uD6 * 0.30 + high * 0.10 + relight * 0.3 + EST.z * 0.25 + (dv == 4 ? D.x * 0.4 : 0.0), vec2(0.3 + EST.z * 0.8, 0.4 + mid * 0.4), 0.03);
    float tl = exp(-length(p - T0) * 0.9) * f0 + exp(-length(p - T1) * 0.9) * f1;
    col += vec3(1.0, 0.8, 0.55) * dust * (0.05 + 1.2 * tl) * (0.5 + high * 0.8);

    // LUZ DE TECLA (fase 37): una antorcha se aviva
    col = hkKeyLit(col, p, -0.1, vec2(0.3, 0.6), vec3(1.0, 0.7, 0.3), vec3(1.0, 0.9, 0.5), 0.05, 1.2);
    return vec4(hkFinish(col, uv, vec3(0.6, 0.45, 0.2)), 1.0);
}
