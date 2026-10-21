// ===============================================================
// HALLOWEEN 10 - PORTAL INFERNAL
// Una cripta de piedra (LAMINAS horneadas, plates/scene10, ver
// td/tools/bake_plates_cripta.py): muros de sillares con moho, dos
// columnas con cadenas, piso de losas con un circulo grabado, velas en
// semicirculo y calaveras. En el arco de piedra del fondo se abre un
// portal: anillo de fuego sobre un vortice, rodeado de runas. El fuego
// ILUMINA en vivo el relieve de la piedra, las columnas y el piso.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> suben las llamas del anillo y la luz en la cripta
//   medios -> el remolino del vortice; las velas se inclinan
//   agudos -> brasas que salen del portal
//   golpe  -> late el anillo, se enciende una tanda de runas; con Chaos
//             se abren ojos de demonio dentro del vortice
// PIANO: cada tecla escupe un chorro de fuego desde el anillo, hacia el
//   lado de la nota (grave a la izquierda); la fuerza lo hace mas largo y
//   la cripta se ilumina; apretada, el chorro sigue saliendo; al soltarla
//   se despega como una bola de fuego que sale volando.
// Speed hace girar el vortice y subir las llamas aun en silencio.
// HISTORIA: cada ~61 s se encienden las runas del circulo del piso; cada
// acto gira para otro lado y cambia de fuego.
// CLIMAX (~73 s, 20 s, en tres tiempos): las runas se encienden de a una;
//   el portal se abre en espiral y salen brazos y llamas; se cierra con
//   una onda de fuego que recorre la cripta. Cada ~4.5 min con el circulo
//   del piso y los ojos del demonio (gran climax).
//
// @D1: tamano del portal
// @D2: altura de las llamas
// @D3: velocidad del remolino
// @D4: runas encendidas
// @D5: color del fuego (naranja <-> verde brujo)
// @D6: humo alrededor
// ===============================================================

const vec4 PL_R = vec4(-3.1, -1.2, 6.2, 2.4);
const vec2 PC = vec2(0.0, 0.16);
const float FLOOR_Y = -0.62;
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// Runa procedural: trazos en una grilla de 3x3 elegidos por hash.
float hwRune(vec2 q, float seed) {
    float d = 1e3;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 a = floor(hash22(vec2(seed, fi)) * 3.0) - 1.0;
        vec2 b = floor(hash22(vec2(seed + 4.1, fi + 2.0)) * 3.0) - 1.0;
        if (a == b) b = -a;
        a *= 0.42; b *= 0.42;
        vec2 pa = q - a, ba = b - a;
        float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
        d = min(d, length(pa - ba * h));
    }
    return d;
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 pw = hkCam(p0);                      // mundo (cripta)
    vec2 p = pw - PC;                         // portal centrado
    float t = uTime;
    float rt = uRTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.008);

    vec4 G = hkGrandClimax(3.0);
    vec4 C = hkClimaxOr(G, hkClimax(3.0, 73.0, 20.0));
    float cph = C.w;
    float openE = C.y;
    float floorRunes = max(hkEvent(5.0, 61.0, 8.0), max(G.x, C.x * 0.6));
    float R = (0.36 + uD1 * 0.22) * (1.0 + openE * 0.30) * (1.0 - C.z * 0.35);
    R = min(R, 0.70);
    // onda de fuego que sale al cerrarse
    float waveR = mix(R, 3.2, clamp((cph - 0.70) / 0.25, 0.0, 1.0));
    float waveA = smoothstep(0.69, 0.72, cph) * (1.0 - smoothstep(0.90, 0.97, cph));
    // piano: chorros de fuego (tambien iluminan la cripta)
    float keyFire = 0.0;
    for (int k = 0; k < N_KEYS; k++) keyFire += keyEnv(k, 0.05, 0.8) * (0.4 + keyVel(k) * 0.6);
    float heat = exp(-abs(length(p) - R) * 6.0);
    p += (vec2(noise21(p * 9.0 + vec2(0.0, t * 3.0)), noise21(p * 9.0 + vec2(5.0, t * 3.0))) - 0.5) * 0.025 * heat * (1.0 + loco);
    float r = length(p);
    float a = atan(p.y, p.x);

    vec3 fireA = mix(vec3(1.0, 0.35, 0.05), vec3(0.35, 1.0, 0.15), uD5);
    vec3 fireB = mix(vec3(1.0, 0.85, 0.40), vec3(0.85, 1.0, 0.55), uD5);
    // (antes saltaba de golpe en D5 = 0.5; ahora es un fundido)
    fireA = hsv2rgb(vec3(fract(hue + mix(0.04, 0.30, smoothstep(0.35, 0.65, uD5))), 0.95, 1.0)) * 0.5 + fireA * 0.5;
    float fireI = (0.75 + 0.25 * sin(t * 7.0) * sin(t * 3.1) + bass * 0.7 + hit * 0.5) * (1.0 + openE * 0.6)
                + keyFire * 0.45 + waveA * 1.2;

    // --- cripta iluminada por el portal y las velas ---
    vec2 pu = rUV(pw);
    vec4 ca = plate0(pu);
    vec4 cn = plate1(pu);
    vec2 nxy = cn.rg * 2.0 - 1.0;
    vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
    if (cn.b > 0.5) n = normalize(vec3(nxy * 0.6, 0.0) + vec3(0.0, 0.85, 0.5));   // piso
    vec3 P3 = vec3(pw, 0.0);
    vec3 Lp = vec3(PC, 0.35);
    vec3 v = Lp - P3; float dd = dot(v, v); vec3 L = v * inversesqrt(dd);
    float att = 1.0 / (1.0 + dd * 0.45);
    vec3 lit = vec3(0.02, 0.018, 0.025) + fireA * max(dot(n, L), 0.0) * att * 1.6 * fireI;
    lit += fireB * pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 18.0) * att * 0.3 * fireI;
    // velas del semicirculo
    float cand = 0.0;
    vec3 flames = vec3(0.0);
    for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float ang = mix(-2.6, -0.54, fi / 6.0);
        float hgt = 0.16 + 0.22 * hash21(vec2(fi, 2.0));
        vec2 tip = vec2(cos(ang) * 1.55, FLOOR_Y - 0.25 + sin(ang) * 0.22 + hgt + 0.03);
        float fl = 0.8 + 0.2 * sin(t * (8.0 + fi) + fi * 2.0) + 0.15 * (noise21(vec2(rt * 5.0, fi)) - 0.5);
        vec2 dq = pw - tip;
        cand += fl / (1.0 + dot(dq, dq) * 3.0);
        dq.x -= (0.2 + mid * 0.8) * sin(t * 1.3 + fi) * max(dq.y, 0.0) * 0.6;
        float core = exp(-dot(dq * vec2(70.0, 32.0), dq * vec2(70.0, 32.0)));
        flames += vec3(1.0, 0.65, 0.25) * (core * 1.6 + exp(-dot(dq, dq) * 300.0) * 0.12) * fl;
    }
    lit += vec3(1.0, 0.62, 0.30) * cand * 0.30 + vec3(0.025, 0.02, 0.03);
    vec3 col = plateCol(ca.rgb) * lit * 2.0;
    // runas del circulo del piso (evento)
    if (cn.b > 0.5 && floorRunes > 0.0) {
        float z = 1.0 / ((FLOOR_Y - pw.y) + 0.10);
        vec2 cq = vec2(pw.x * z * 0.40, (z - 1.0 / (0.42 + 0.10)) * 0.28) * vec2(1.0, 3.2);
        float rr = length(cq);
        float ring = min(abs(rr - 0.55) - 0.012, abs(rr - 0.45) - 0.008);
        col += fireB * (1.0 - smoothstep(0.0, 0.01, ring)) * floorRunes * 1.4;
        col += fireA * exp(-abs(rr - 0.5) * 18.0) * floorRunes * 0.15;
    }

    // --- portal (donde el arco deja ver) ---
    float hole = 1.0 - ca.a;
    if (hole > 0.0 || r < R * 2.2) {
        vec3 pc = vec3(0.012, 0.004, 0.006);
        float smoke = r < 2.0 ? fbm(vec2(a * 2.0, r * 3.0 - t * 0.2) + 4.0, 3, 0.55) : 0.0;
        pc += fireA * 0.05 * smoke * (0.4 + uD6 * 1.6) * smoothstep(2.0, 0.4, r);
        float swirlA = a + (2.5 / (r + 0.15)) * 0.35 + t * (0.4 + uD3 * 1.2) * (hkActVal(4.0) > 0.5 ? 1.0 : -1.0) + mid * 0.6 * sin(r * 6.0);
        float spiral = 0.5 + 0.5 * sin(swirlA * 3.0 + r * 10.0);
        float insideM = 1.0 - smoothstep(R - 0.02, R + 0.01, r);
        vec3 vortex = mix(vec3(0.0), fireA * 0.18, pow(spiral, 3.0) * smoothstep(0.0, R, r));
        pc = mix(pc, vortex, insideM);
        vec2 sp = vec2(a / TAU * 12.0 + 0.6 / (r + 0.1) + t * 0.5, log(r + 0.05) * 3.0 + t * 1.5);
        vec2 sid = floor(sp);
        vec2 sf = fract(sp) - 0.5;
        float em = exp(-dot(sf, sf) * 60.0) * step(0.80, hash21(sid)) * smoothstep(R * 1.9, R * 0.9, r) * smoothstep(0.1, R * 0.6, r);
        pc += fireB * em * (0.8 + hit);
        float eyesOn = max(hit * smoothstep(0.35, 0.9, loco), G.y);
        // anillo de fuego
        float ringD = r - R;
        float flameH = 0.08 + uD2 * 0.16 + bass * 0.08;
        float fn = abs(ringD) < 0.45 ? fbm(vec2(a * 6.0 + sin(a * 2.0), ringD * 8.0 - t * 2.4), 3, 0.6) : 0.0;
        float fn2 = noise21(vec2(a * 18.0, ringD * 20.0 - t * 4.0));
        float flame = smoothstep(flameH * (0.4 + fn), 0.0, ringD) * smoothstep(-0.05, 0.0, ringD);
        flame *= 0.7 + 0.5 * fn2;
        vec3 fire = mix(fireA, fireB, smoothstep(0.3, 1.0, flame)) * flame * 1.5 * (1.0 + hit * 0.8);
        pc += fire;
        pc += fireB * exp(-abs(ringD) * 70.0) * (0.8 + hit * 1.2);
        // climax: tres brazos que salen del vortice, por encima del anillo (hombro, codo, mano con garras)
        if (openE > 0.01) {
            float out_ = smoothstep(0.36, 0.56, cph) * (1.0 - C.z);
            for (int j = 0; j < 3; j++) {
                float fj = float(j);
                float aa = 0.9 + fj * 2.2 + sin(uRTime * 0.7 + fj * 2.0) * 0.25;
                vec2 dir = vec2(cos(aa), sin(aa));
                vec2 side = vec2(-dir.y, dir.x);
                float bend = (fj == 1.0 ? -1.0 : 1.0) * (0.10 + 0.04 * sin(uRTime * 2.0 + fj));
                vec2 sh = dir * R * 0.40;
                vec2 el = dir * R * mix(0.45, 0.78, out_) + side * bend * R;
                vec2 hd = dir * R * mix(0.50, 1.30, out_) + side * bend * R * 0.4;
                float k = R / 0.5;
                float arm = min(hkSeg(p, sh, el) - 0.075 * k, hkSeg(p, el, hd) - 0.050 * k);
                arm = hkSmin(arm, length(p - el) - 0.065 * k, 0.03 * k);
                vec2 fd0 = normalize(hd - el);
                for (int f = -1; f <= 1; f++) {
                    vec2 fd = rot2(float(f) * 0.42 + sin(uRTime * 4.0 + fj + float(f)) * 0.15) * fd0;
                    vec2 tip = hd + fd * R * 0.20;
                    arm = hkSmin(arm, hkSeg(p, hd, tip) - 0.017 * k, 0.015 * k);
                }
                // el brazo nace de la oscuridad del fondo del vortice
                float am = (1.0 - smoothstep(-0.006, 0.006, arm)) * out_ * smoothstep(R * 0.38, R * 0.58, length(p));
                // piel de demonio iluminada por el fuego del anillo (mas luz hacia afuera)
                float lit = 0.35 + 0.65 * smoothstep(0.0, R, length(p));
                vec3 skin = vec3(0.30, 0.07, 0.04) * (0.6 + 0.5 * noise21(p * 40.0)) * lit + fireA * 0.22 * lit;
                pc = mix(pc, skin, am);
                pc += fireA * (1.0 - smoothstep(0.0, 0.03, abs(arm))) * 0.30 * out_;
            }
        }
        // runas
        float Rr = R + 0.11 + uD2 * 0.06;
        float nR = 14.0;
        float ang = a / TAU * nR;
        float slotI = floor(ang + 0.5);
        float local = (ang - slotI) * TAU / nR * Rr;
        vec2 rq = vec2(local, r - Rr) / 0.035;
        float rd = hwRune(rq, slotI + 3.0) * 0.035;
        float px = 2.0 / uResH;
        float rune = 1.0 - smoothstep(px * 0.6, px * 1.8, rd);
        float wave = floor(rt * 1.3);
        // cada tanda prende/apaga con fundido; D4 suma runas sin saltos
        float th = 1.0 - (0.20 + uD4 * 0.70);
        float on = mix(smoothstep(th - 0.04, th + 0.04, hash21(vec2(slotI, wave - 1.0))),
                       smoothstep(th - 0.04, th + 0.04, hash21(vec2(slotI, wave))), smoothstep(0.0, 0.25, fract(rt * 1.3)));
        on = max(on, hit * step(0.5, hash21(vec2(slotI, wave + 7.0))));
        // climax: se encienden de a una durante el aviso
        on = max(on, smoothstep(hash21(vec2(slotI, 41.0)) * 0.33, hash21(vec2(slotI, 41.0)) * 0.33 + 0.02, cph) * step(0.0001, cph) * (1.0 - C.z));
        pc += fireB * (rune + exp(-rd * 160.0) * 0.5) * mix(0.10, 1.3, on) * step(abs(r - Rr), 0.05);
        pc += fireA * (1.0 - smoothstep(px * 0.5, px * 1.5, abs(r - Rr - 0.05))) * 0.6;
        pc += fireA * (1.0 - smoothstep(px * 0.5, px * 1.5, abs(r - Rr + 0.05))) * 0.6;
        col = mix(col, pc, hole);
        // el fuego se derrama sobre la piedra del arco
        col += fireA * exp(-max(r - R, 0.0) * 6.0) * 0.10 * fireI * (1.0 - hole);
    }
    // --- PIANO: chorros de fuego desde el anillo ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.05, 0.8);
        if (e < 0.01) continue;
        float vel = keyVel(k), age = keyAge(k), rel = keyRelAge(k);
        float th = mix(PI * 0.97, PI * 0.03, keyPos(k)) - 0.25;     // grave a la izquierda
        vec2 dir = vec2(cos(th), sin(th));
        vec2 side = vec2(-dir.y, dir.x);
        float along = dot(p, dir), across = dot(p, side);
        // apretada: chorro que crece desde el anillo; suelta: se despega y vuela
        float start = R + rel * 2.2;
        float len = min(age * 2.0, 0.35 + vel * 0.55) * (1.0 - smoothstep(0.0, 0.5, rel) * 0.6);
        float u = (along - start) / max(len, 1e-3);
        if (u < -0.1 || u > 1.2) continue;
        float w = (0.05 + vel * 0.05) * (0.5 + 0.8 * u) * (1.0 + rel);
        float n = fbm(vec2(across * 12.0, along * 6.0 - uKclock * 6.0) + float(k) * 3.0, 3, 0.6);
        float jet = smoothstep(w, 0.0, abs(across) - (n - 0.5) * w) * smoothstep(-0.1, 0.05, u) * (1.0 - smoothstep(0.7, 1.15, u));
        col += mix(fireA, fireB, smoothstep(0.4, 1.0, jet * n * 1.6)) * jet * (0.6 + n) * 1.4 * e;
    }
    // --- CLIMAX: onda de fuego al cerrarse ---
    if (waveA > 0.0) {
        float wd = length((pw - PC) * vec2(1.0, 1.4)) - waveR;
        float wn = noise21(vec2(atan(pw.y - PC.y, pw.x - PC.x) * 8.0, uRTime * 3.0));
        col += mix(fireA, fireB, 0.5) * exp(-abs(wd + (wn - 0.5) * 0.08) * 22.0) * waveA * 1.6;
        col += fireA * smoothstep(0.0, -0.6, wd) * waveA * 0.10;
    }
    // brasas que escapan del portal (agudos)
    float emb = hkParticles(pw - PC, t * 0.6, 0.05 + high * 0.15, vec2(0.0, 1.0), 0.025);
    col += fireB * emb * (0.5 + high * 1.5) * smoothstep(1.6, 0.4, length(pw - PC));

    // --- frente: velas, calaveras y cadenas ---
    vec4 fr = plate2(pu);
    vec3 fa = pow(fr.rgb, vec3(2.2));
    vec3 fl3 = fa * (vec3(0.03) + fireA * 0.35 * fireI * exp(-length(pw - PC) * 0.6) + vec3(1.0, 0.65, 0.3) * cand * 0.25);
    col = mix(col, fl3, fr.a);
    col += flames;

    col = audioLift(col, high * 0.06);
    return vec4(hkFinish(col, uv, vec3(0.7, 0.1, 0.05)), 1.0);
}
