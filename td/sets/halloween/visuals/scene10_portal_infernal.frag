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
// Speed hace girar el vortice y subir las llamas aun en silencio.
// HISTORIA: cada ~73 s el portal se abre de par en par; cada ~61 s se
// encienden las runas del circulo del piso; cada acto gira para otro
// lado y cambia de fuego.
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

    float openE = hkEvent(3.0, 73.0, 10.0);
    float floorRunes = hkEvent(5.0, 61.0, 8.0);
    float R = (0.36 + uD1 * 0.22) * (1.0 + openE * 0.25);
    R = min(R, 0.70);
    float heat = exp(-abs(length(p) - R) * 6.0);
    p += (vec2(noise21(p * 9.0 + vec2(0.0, t * 3.0)), noise21(p * 9.0 + vec2(5.0, t * 3.0))) - 0.5) * 0.025 * heat * (1.0 + loco);
    float r = length(p);
    float a = atan(p.y, p.x);

    vec3 fireA = mix(vec3(1.0, 0.35, 0.05), vec3(0.35, 1.0, 0.15), uD5);
    vec3 fireB = mix(vec3(1.0, 0.85, 0.40), vec3(0.85, 1.0, 0.55), uD5);
    fireA = hsv2rgb(vec3(fract(hue + (uD5 > 0.5 ? 0.30 : 0.04)), 0.95, 1.0)) * 0.5 + fireA * 0.5;
    float fireI = (0.75 + 0.25 * sin(t * 7.0) * sin(t * 3.1) + bass * 0.7 + hit * 0.5) * (1.0 + openE * 0.6);

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
        float eyesOn = max(hit * smoothstep(0.35, 0.9, loco), openE * step(0.5, fract(uRTime * 0.2)));
        if (eyesOn > 0.01) {
            vec2 eq = vec2(abs(p.x) - R * 0.32, p.y - R * 0.05);
            float almond = max(length(eq / R - vec2(0.0, -0.10)), length(eq / R - vec2(0.0, 0.10))) - 0.16;
            float eye = 1.0 - smoothstep(-0.01, 0.01, almond / max(eyesOn, 0.2));
            float slitE = 1.0 - smoothstep(0.012, 0.02, abs(eq.x) / R);
            pc = mix(pc, mix(fireB * 1.6, vec3(0.0), slitE), eye * insideM);
        }
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
        float on = step(1.0 - (0.20 + uD4 * 0.70), hash21(vec2(slotI, wave)));
        on = max(on, hit * step(0.5, hash21(vec2(slotI, wave + 7.0))));
        pc += fireB * (rune + exp(-rd * 160.0) * 0.5) * mix(0.10, 1.3, on) * step(abs(r - Rr), 0.05);
        pc += fireA * (1.0 - smoothstep(px * 0.5, px * 1.5, abs(r - Rr - 0.05))) * 0.6;
        pc += fireA * (1.0 - smoothstep(px * 0.5, px * 1.5, abs(r - Rr + 0.05))) * 0.6;
        col = mix(col, pc, hole);
        // el fuego se derrama sobre la piedra del arco
        col += fireA * exp(-max(r - R, 0.0) * 6.0) * 0.10 * fireI * (1.0 - hole);
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
