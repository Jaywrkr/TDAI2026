// ===============================================================
// HALLOWEEN 16 - VELAS
// Matte painting con LAMINAS horneadas (plates/scene16, ver
// td/tools/bake_plates_velas.py): una capilla a oscuras con pared de
// piedra, un nicho de arco con ventanal gotico de vitral, y un altar
// con mantel, libros, una calavera, candelabros y doce velas de cera
// chorreada. Las llamas son en vivo y CADA una ilumina la piedra, la
// calavera y la cera (que se transluce cerca de la llama).
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> los halos crecen y la luz late en la pared
//   medios -> una corriente de aire inclina las llamas
//   agudos -> chispas que suben de las mechas
//   golpe  -> las llamas se estiran y saltan (D4), cada una a su tiempo;
//             con Chaos una rafaga las tumba y casi se apagan
// PIANO: cada tecla aviva la vela de esa posicion (grave a la izquierda):
//   la llama se estira, brilla mas y suelta chispas; si estaba apagada la
//   enciende; apretada sigue avivada; un acorde aviva varias.
// Speed hace titilar las llamas y subir el humo aun en silencio.
// Cada acto cambia cuantas velas estan prendidas.
// REPERTORIO (fase 33, motor hkSuceso del kit):
//   ESTADOS (~5 min): velas calmas, corriente (las llamas siempre
//     inclinadas) y humo (sube mas humo de todas).
//   SUCESOS (~55 s, 7): la luna entra por el vitral; se apagan todas de
//     golpe y vuelven de a una; la calavera enciende los ojos; una vela
//     llora cera; una sombra pasa detras del vitral; las llamas se ponen
//     verdes; una llama se despega y flota.
//   DETALLES (~30 s, 5): una vela se aviva, una llama chisporrotea, humo
//     de una que se apago, una polilla vuela alrededor de una llama, cae
//     una gota de cera.
//   CLIMAX (~4 min, 20 s, rotan 3 guiones en tres tiempos):
//     A la corriente: las llamas se inclinan y se apagan de a una; queda
//       el humo y la luna; se vuelven a encender desde el centro.
//     B la misa: las llamas crecen y laten juntas con el bajo, el vitral
//       se enciende de colores y la calavera mira.
//     C la ronda: las llamas se despegan, vuelan y giran en circulo frente
//       al vitral; despues vuelve cada una a su vela.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con la luna fuerte.
// @EST: velas calmas | corriente | humo
// @SUC: la luna | apagon | la calavera | llora cera | sombra en el vitral | llamas verdes | la llama flota
// @DET: se aviva | chisporrotea | humo de una apagada | polilla | gota de cera
// @CLX: A la corriente | B la misa | C la ronda
//
// @D1: cantidad de velas (la nueva se enciende de a poco)
// @D2: altura de las llamas
// @D3: halo de luz
// @D4: salto de las llamas con el golpe
// @D5: color de la llama (calida <-> verde fantasma)
// @D6: humo
// ===============================================================

const vec4 WALL_R = vec4(-3.1, -0.6, 6.2, 1.8);
const vec4 ALTAR_R = vec4(-3.1, -1.2, 6.2, 1.75);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

const float ALTAR_Y = -0.38;
// x, base, alto, radio: la misma lista que el horneado
const vec4 CANDLES[12] = vec4[12](
    vec4(-2.35, ALTAR_Y, 0.30, 0.045), vec4(-2.00, ALTAR_Y, 0.48, 0.055), vec4(-1.62, ALTAR_Y, 0.22, 0.050),
    vec4(-1.34, ALTAR_Y, 0.62, 0.060), vec4(-0.55, ALTAR_Y, 0.40, 0.050), vec4(0.55, ALTAR_Y, 0.36, 0.050),
    vec4(1.26, ALTAR_Y, 0.70, 0.062), vec4(1.55, ALTAR_Y, 0.26, 0.048), vec4(1.95, ALTAR_Y, 0.52, 0.055),
    vec4(2.35, ALTAR_Y, 0.32, 0.046), vec4(-0.98, 0.16, 0.20, 0.032), vec4(0.98, 0.16, 0.20, 0.032));
// orden en que se prenden al subir D1 (del centro hacia afuera)
const int ORDER[12] = int[12](10, 11, 4, 5, 3, 6, 1, 8, 2, 7, 0, 9);

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    // --- calendario (fase 33) ---
    hkSetClimax(30.0, 20.0, 24.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(30.0, 7, 10.0);
    int sv = int(S.z);
    float se = S.x, sph = S.y, ss = S.w;
    vec4 D = hkDetalle(30.0, 5, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(30.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(30.0, 3));
    float cph = cA * C.w;
    float gustK = cA * C.x * (1.0 - C.y) * (1.0 - C.z) + EST.y * 0.35;   // aviso: la corriente las inclina
    float moonE = max((sv == 0 || sv == 4) ? se * (sv == 4 ? 0.7 : 1.0) : 0.0, max(cA * C.y, G.x * 1.2));   // la sombra se ve contra la luna
    float misa = cB * smoothstep(0.05, 0.30, C.w) * (1.0 - smoothstep(0.80, 0.95, C.w));
    float ring = cC * smoothstep(0.08, 0.35, C.w) * (1.0 - smoothstep(0.72, 0.92, C.w));
    vec3 flameC = mix(vec3(1.0, 0.55, 0.20), vec3(0.35, 1.0, 0.55), clamp(uD5 + (sv == 5 ? se : 0.0), 0.0, 1.0));
    float nLit = min(3.0 + uD1 * 9.0 + hkActVal(4.0) * 1.5, 12.0);

    // estado de cada llama: prendida (0..1), punta, tamano
    float on[12];
    vec2 tip[12];
    float fsz[12];
    float boost[12];
    for (int k = 0; k < 12; k++) {
        int i = ORDER[k];
        vec4 c = CANDLES[i];
        float fi = float(i);
        float lit = revealAt(nLit, float(k));
        // piano: la vela mas cercana a la tecla se aviva (y se enciende)
        float kb = 0.0;
        for (int kk = 0; kk < N_KEYS; kk++) {
            if (abs(hkKeyX(kk) * 1.0 - c.x) < 0.22) kb = max(kb, keyEnv(kk, 0.04, 0.7) * (0.5 + keyVel(kk) * 0.7));
        }
        boost[i] = kb;
        lit = max(lit, kb);
        // climax: se apagan de izquierda a derecha en el pico y se vuelven a
        // encender desde el centro en las secuelas
        float pos = (c.x + 2.6) / 5.2;
        float back = abs(c.x) / 2.6;
        float out_ = cph > 0.0 ? smoothstep(0.32 + pos * 0.26, 0.36 + pos * 0.26, cph) * (1.0 - smoothstep(0.71 + back * 0.20, 0.75 + back * 0.20, cph)) : 0.0;
        out_ = max(out_, hit * loco * step(0.75, loco) * step(0.5, hash21(vec2(fi, floor(uRTime * 2.0)))) * 0.9);
        // suceso: apagon de golpe y vuelven de a una (en orden al azar)
        if (sv == 1) out_ = max(out_, se * smoothstep(0.10, 0.13, sph) * (1.0 - smoothstep(0.40 + hash21(vec2(fi, 13.0)) * 0.45, 0.45 + hash21(vec2(fi, 13.0)) * 0.45, sph)));
        // detalle: una se apaga y humea
        if (dv == 2 && i == int(D.w * 11.99)) out_ = max(out_, D.x);
        if (dv == 0 && i == int(D.w * 11.99)) kb = max(kb, D.x * 0.8);
        if (dv == 1 && i == int(D.w * 11.99)) out_ = max(out_, D.x * 0.5 * step(0.6, noise21(vec2(uRTime * 12.0, fi))));
        on[i] = lit * (1.0 - out_);
        float jump = smoothstep(0.0, 0.3, hit - fract(fi * 0.37) * 0.3) * uD4;
        boost[i] = kb;
        fsz[i] = (0.065 + uD2 * 0.07) * (1.0 + jump * 0.8 + bass * 0.15 + kb * 0.9 + misa * (0.9 + bass * 0.8)) * (0.85 + 0.15 * noise21(vec2(t * 7.0, fi)));
        tip[i] = vec2(c.x, c.y + c.z + 0.02);
        // suceso: una llama se despega y flota
        if (sv == 6 && i == int(ss * 11.99)) tip[i] += vec2(0.12 * sin(sph * 9.0), 0.55 * sin(sph * PI)) * se;
        // C: las llamas vuelan y giran en circulo frente al vitral
        float ang = fi / 12.0 * TAU + uRTime * 0.9;
        tip[i] = mix(tip[i], vec2(0.0, 0.42) + vec2(cos(ang), sin(ang) * 0.8) * 0.45, ring * smoothstep(0.0, 0.5, ring * 1.6 - hash21(vec2(fi, 7.0)) * 0.6));
    }

    // --- superficie: pared o altar ---
    vec4 aa = plate2(rUV(p, ALTAR_R));
    vec3 alb, n;
    float wax = 0.0, glass = 0.0;
    vec4 wa = plate0(rUV(p, WALL_R));
    vec4 wn = plate1(rUV(p, WALL_R));
    alb = plateCol(wa.rgb);
    vec2 nxy = wn.rg * 2.0 - 1.0;
    glass = wn.b;
    if (aa.a > 0.5) {
        vec4 an = plate3(rUV(p, ALTAR_R));
        alb = plateCol(aa.rgb);
        nxy = an.rg * 2.0 - 1.0;
        wax = an.b;
        glass = 0.0;
    }
    n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));

    // --- luz de cada llama ---
    vec3 L = vec3(0.006, 0.006, 0.009);
    float sss = 0.0;
    for (int i = 0; i < 12; i++) {
        if (on[i] < 0.01) continue;
        vec3 v = vec3(tip[i] - p, 0.30);
        float d2 = dot(v, v);
        float fl = (0.8 + 0.2 * noise21(vec2(t * 9.0, float(i) * 3.0))) * on[i] * (1.0 + boost[i] * 0.8);
        float lam = max(dot(n, v * inversesqrt(d2)), 0.0);
        L += flameC * fl * (0.6 + bass * 0.4) * (0.4 + 0.6 * lam) * 0.06 / (0.02 + d2 * 1.6);
        if (wax > 0.5) {
            vec2 dd = p - tip[i];
            sss += exp(-length(dd * vec2(1.0, 0.6)) * 14.0) * fl;
        }
    }
    // la luna entra por el vitral
    vec3 moonC = vec3(0.45, 0.55, 0.85);
    vec3 col = alb * L * 7.0 * (1.0 - glass * 0.75);
    // suceso: una sombra pasa detras del vitral
    float shadowG = sv == 4 ? se * smoothstep(0.12, 0.0, abs(p.x - mix(-0.6, 0.6, ss > 0.5 ? sph : 1.0 - sph)) - 0.10 + 0.08 * smoothstep(0.75, 0.55, p.y)) * smoothstep(-0.3, 0.1, p.y) : 0.0;
    col += alb * glass * (0.02 + moonE * 0.30) * vec3(1.6, 1.3, 1.5) * (1.0 - shadowG);
    // B: el vitral se enciende de colores
    col += alb * glass * misa * (0.25 + bass * 0.3) * vec3(1.8, 1.1, 1.6);
    col += plateCol(wa.rgb) * glass * flameC * 0.02 * float(aa.a < 0.5);
    col += vec3(1.0, 0.72, 0.45) * sss * 0.55 * flameC * 1.2;            // cera transluciendo
    // la calavera enciende los ojos (suceso y B)
    float skullK = max(sv == 2 ? se * smoothstep(0.1, 0.3, sph) : 0.0, misa);
    if (skullK > 0.0) {
        vec2 eq = vec2(abs(p.x + 0.005) - 0.045, p.y + 0.20);
        col += mix(flameC, vec3(1.0, 0.2, 0.1), 0.6) * (exp(-dot(eq, eq) * 6000.0) * 1.8 + exp(-dot(eq, eq) * 400.0) * 0.12) * skullK;
    }
    // suceso: una vela llora cera; detalle: cae una gota
    if (sv == 3 || dv == 4) {
        int wi = sv == 3 ? int(ss * 9.99) : int(D.w * 9.99);
        vec4 c = CANDLES[wi];
        float k = sv == 3 ? se * smoothstep(0.05, 0.8, sph) : D.x * D.y;
        float x0 = c.x + c.w * 0.55;
        float top = c.y + c.z;
        float len = sv == 3 ? k * c.z * 0.95 : 0.0;
        float tear = max(abs(p.x - x0 - 0.004 * sin(p.y * 40.0)) - 0.007, max(p.y - top, top - len - p.y));
        tear = min(tear, length((p - vec2(x0, top - (sv == 3 ? len : k * (c.z + 0.1)))) / vec2(1.0, 1.3)) - 0.010);
        col = mix(col, vec3(1.0, 0.85, 0.6) * (0.35 + sss * 0.6) * flameC * 1.4, (1.0 - smoothstep(-0.002, 0.002, tear)) * (sv == 3 ? se : D.x));
    }
    // haz de luna sobre el altar
    if (moonE > 0.01) {
        float beam = smoothstep(0.42, 0.25, abs(p.x + (p.y - 0.4) * 0.35)) * smoothstep(0.9, -0.4, p.y);
        col += moonC * beam * moonE * 0.08 * (0.6 + 0.4 * fbm(p * 3.0 + vec2(0.0, t * 0.1), 3, 0.5));
    }

    // --- llamas, halos, humo y chispas ---
    for (int i = 0; i < 12; i++) {
        vec2 tp = tip[i];
        vec2 dq = p - tp;
        if (abs(dq.x) > 0.6 || dq.y < -0.25 || dq.y > 1.2) continue;
        float fi = float(i);
        float s = fsz[i];
        // humo que sube (mas cuando la llama se apago)
        float smokeA = max(uD6, EST.z * 0.9 + (dv == 2 ? D.x : 0.0));
        if (smokeA > 0.02 && dq.y > 0.0 && abs(dq.x) < 0.05 + dq.y * 0.3) {
            float sm = fbm(vec2(dq.x * 6.0 + sin(dq.y * 4.0 - t * 1.2 + fi) * 0.6, dq.y * 2.0 - t * 0.5), 3, 0.5);
            float plume = exp(-pow(dq.x / (0.02 + dq.y * 0.12), 2.0)) * smoothstep(1.1, 0.1, dq.y);
            col += vec3(0.20, 0.19, 0.18) * smoothstep(0.45, 0.8, sm) * plume * smokeA * (0.10 + (1.0 - on[i]) * 0.5) * (L.r * 6.0 + 0.2);
        }
        if (on[i] < 0.01) continue;
        // halo
        float r = length(dq - vec2(0.0, s * 0.6));
        col += flameC * exp(-r / (0.05 + uD3 * 0.18 + bass * 0.05)) * (0.12 + uD3 * 0.25) * on[i];
        // llama: gota que se inclina con la corriente y titila
        float lean = (0.15 + mid * 0.6) * sin(t * 1.3 + fi) + hit * loco * 0.8 * sin(uRTime * 9.0)
                   + gustK * (1.5 + 0.6 * sin(uRTime * 11.0 + fi));
        vec2 q = dq / s;
        q.x -= lean * max(q.y, 0.0) * 0.35;
        q.x += (noise21(vec2(q.y * 3.0 - t * 6.0, fi)) - 0.5) * 0.35 * max(q.y, 0.0);
        float shape = length(vec2(q.x * (1.0 + max(q.y, 0.0) * 0.45), (q.y - 0.55) * 0.55)) - 0.42;
        float core = length(vec2(q.x * 1.8, (q.y - 0.30) * 0.9)) - 0.20;
        float fA = 1.0 - smoothstep(-0.05, 0.08, shape);
        vec3 fc = mix(flameC * 1.6, vec3(1.0, 0.95, 0.80) * 2.2, 1.0 - smoothstep(-0.05, 0.08, core));
        fc = mix(vec3(0.25, 0.35, 1.0) * 0.8, fc, smoothstep(-0.10, 0.10, q.y));    // base azul
        col = mix(col, fc, fA * on[i]);
        // estilo: destello en cruz en cada llama
        if (uStyle > 0.001) col += hkStyleMap(0.97) * hkSparkle(dq - vec2(0.0, s * 0.45), s * 4.0) * 0.25 * uStyle * on[i];
        // chispas
        float sp = hkParticles(dq * 3.0, t * 0.8, 0.05 + high * 0.15 + boost[i] * 0.3, vec2(0.0, 1.0), 0.03);
        col += flameC * sp * smoothstep(0.8, 0.0, dq.y) * step(0.0, dq.y) * exp(-abs(dq.x) * 8.0) * (0.2 + high + boost[i] * 2.0) * on[i];
    }

    // detalle: una polilla vuela alrededor de una llama
    if (dv == 3) {
        int mi = int(D.w * 11.99);
        vec2 mp = tip[mi] + vec2(cos(uRTime * 4.0), sin(uRTime * 4.0) * 0.6) * 0.09 + vec2(0.0, 0.05);
        vec2 mq = (p - mp) / 0.018;
        float wing = length(vec2(abs(mq.x) - 0.6 * (0.5 + 0.5 * sin(uRTime * 40.0)), mq.y)) - 0.6;
        col = mix(col, vec3(0.04, 0.03, 0.02) + flameC * 0.15, (1.0 - smoothstep(-0.1, 0.1, wing)) * D.x * on[mi]);
    }
    return vec4(hkFinish(col, uv, vec3(0.45, 0.28, 0.12)), 1.0);
}
