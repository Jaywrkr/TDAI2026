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
// Cada acto gira para otro lado y cambia de fuego.
// REPERTORIO (fase 32, motor hkSuceso del kit):
//   ESTADOS (~5 min): fuego, fuego brujo (verde) y humo (la cripta se
//     llena de humo y el fuego se apaga un poco).
//   SUCESOS (~55 s, 7): se encienden las runas del circulo del piso; una
//     cara se forma en el vortice; un brazo sale y tantea; el portal escupe
//     una bola de fuego hacia la camara; el portal aspira (las velas se
//     inclinan hacia el); salen murcielagos del portal; tiembla la cripta y
//     cae polvo del techo.
//   DETALLES (~30 s, 5): una runa brilla fuerte, chispas en el anillo, un
//     ojo se abre en el fondo, humo que sale del portal, una vela se apaga.
//   CLIMAX (~4 min, 20 s, rotan 3 guiones en tres tiempos):
//     A los brazos: las runas se encienden de a una, el portal se abre y
//       salen brazos y llamas; se cierra con una onda de fuego.
//     B el demonio: una cabeza enorme con cuernos sube desde el fondo del
//       vortice, mira a los lados con ojos de fuego y vuelve a hundirse.
//     C lluvia de fuego: el portal tira una columna hacia arriba y cae
//       fuego del techo por toda la cripta; el circulo del piso arde.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con el circulo del
//     piso y los ojos del demonio.
// @EST: fuego | fuego brujo | humo
// @SUC: runas del piso | la cara | el brazo | bola de fuego | el portal aspira | murcielagos | temblor
// @DET: una runa brilla | chispas en el anillo | un ojo en el fondo | humo que sale | una vela se apaga
// @CLX: A los brazos | B el demonio | C lluvia de fuego
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

// Murcielago de ~1 de envergadura, flap -1..1.
float hwBat(vec2 p, float flap) {
    float ax = abs(p.x);
    float body = (length(p / vec2(0.07, 0.13)) - 1.0) * 0.07;
    float y = p.y - flap * 0.35 * ax;
    float top = 0.07 + 0.10 * sin(ax * 4.2) - 0.22 * ax * ax;
    float bottom = top - (0.20 * (1.0 - ax / 0.52) + 0.05) + 0.05 * abs(sin(ax * PI * 3.0 / 0.52));
    return min(body, max(max(y - top, bottom - y), max(ax - 0.52, 0.04 - ax)));
}

vec4 render(vec2 uv) {
    // --- calendario (fase 32) ---
    hkSetClimax(3.0, 20.0, 24.0);
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
    // suceso: tiembla la cripta (un temblor suave, no un salto)
    float quake = sv == 6 ? se * sin(sp * PI) : 0.0;
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    p0 += vec2(noise21(vec2(uRTime * 9.0, 1.0)) - 0.5, noise21(vec2(uRTime * 9.0, 7.0)) - 0.5) * 0.025 * quake;
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

    float cph = cA * C.w;
    float openE = cA * C.y;
    // C: lluvia de fuego; el circulo del piso arde
    float rainF = cC * smoothstep(0.15, 0.35, C.w) * (1.0 - smoothstep(0.78, 0.95, C.w));
    float floorRunes = max(sv == 0 ? se : 0.0, max(G.x, max(cA * C.x * 0.6, rainF)));
    // B: la cabeza del demonio sube, mira y se hunde
    float rise = cB * smoothstep(0.10, 0.45, C.w) * (1.0 - smoothstep(0.70, 0.92, C.w));
    float R = (0.36 + uD1 * 0.22) * (1.0 + openE * 0.30 + rise * 0.15) * (1.0 - cA * C.z * 0.35);
    R = min(R, 0.70);
    // onda de fuego que sale al cerrarse
    float waveR = mix(R, 3.2, clamp((cph - 0.70) / 0.25, 0.0, 1.0));
    float waveA = cA * smoothstep(0.69, 0.72, cph) * (1.0 - smoothstep(0.90, 0.97, cph));
    // piano: chorros de fuego (tambien iluminan la cripta)
    float keyFire = 0.0;
    for (int k = 0; k < N_KEYS; k++) keyFire += keyEnv(k, 0.05, 0.8) * (0.4 + keyVel(k) * 0.6);
    float heat = exp(-abs(length(p) - R) * 6.0);
    p += (vec2(noise21(p * 9.0 + vec2(0.0, t * 3.0)), noise21(p * 9.0 + vec2(5.0, t * 3.0))) - 0.5) * 0.025 * heat * (1.0 + loco);
    float r = length(p);
    float a = atan(p.y, p.x);

    float d5 = clamp(uD5 + EST.y * 0.7, 0.0, 1.0);           // fuego brujo (estado)
    vec3 fireA = mix(vec3(1.0, 0.35, 0.05), vec3(0.35, 1.0, 0.15), d5);
    vec3 fireB = mix(vec3(1.0, 0.85, 0.40), vec3(0.85, 1.0, 0.55), d5);
    // (antes saltaba de golpe en D5 = 0.5; ahora es un fundido)
    fireA = hsv2rgb(vec3(fract(hue + mix(0.04, 0.30, smoothstep(0.35, 0.65, d5))), 0.95, 1.0)) * 0.5 + fireA * 0.5;
    float fireI = (0.75 + 0.25 * sin(t * 7.0) * sin(t * 3.1) + bass * 0.7 + hit * 0.5) * (1.0 + openE * 0.6)
                + keyFire * 0.45 + waveA * 1.2;
    fireI *= 1.0 - EST.z * 0.25;
    fireI += rainF * 0.5;

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
        if (dv == 4 && i == int(D.w * 6.99)) fl *= 1.0 - D.x;   // detalle: una vela se apaga
        float suck = sv == 4 ? se : 0.0;                           // suceso: el portal aspira
        fl *= 1.0 - suck * 0.4;
        vec2 dq = pw - tip;
        cand += fl / (1.0 + dot(dq, dq) * 3.0);
        dq.x -= (0.2 + mid * 0.8) * sin(t * 1.3 + fi) * max(dq.y, 0.0) * 0.6;
        dq.x -= suck * sign(PC.x - tip.x) * max(dq.y, 0.0) * 2.2;
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
        pc += fireA * 0.05 * smoke * (0.4 + uD6 * 1.6 + EST.z * 1.2) * smoothstep(2.0, 0.4, r);
        float swirlA = a + (2.5 / (r + 0.15)) * 0.35 + t * (0.4 + uD3 * 1.2) * (hkActVal(4.0) > 0.5 ? 1.0 : -1.0) + mid * 0.6 * sin(r * 6.0)
                     + (sv == 4 ? se * uRTime * 2.0 : 0.0);
        float spiral = 0.5 + 0.5 * sin(swirlA * 3.0 + r * 10.0);
        float insideM = 1.0 - smoothstep(R - 0.02, R + 0.01, r);
        vec3 vortex = mix(vec3(0.0), fireA * 0.18, pow(spiral, 3.0) * smoothstep(0.0, R, r));
        pc = mix(pc, vortex, insideM);
        // suceso: una cara se forma en el vortice (y con Chaos o el gran climax)
        float faceK = max(sv == 1 ? se * smoothstep(0.1, 0.4, sp) : 0.0, max(hit * smoothstep(0.35, 0.9, loco), G.y));
        if (faceK > 0.0) {
            vec2 fq = p / R;
            vec2 eq = vec2(abs(fq.x) - 0.36, fq.y - 0.14);
            eq = rot2(sign(fq.x) * 0.35) * eq;
            float eye = 1.0 - smoothstep(0.8, 1.0, length(eq / vec2(0.16, 0.06)));
            float mth = abs(fq.y + 0.32 + 0.18 * fq.x * fq.x) - 0.035 - 0.03 * step(0.5, fract(fq.x * 7.0));
            float mouth = (1.0 - smoothstep(0.0, 0.02, mth)) * step(abs(fq.x), 0.45);
            pc += fireB * (eye * 2.0 + mouth * 1.2) * faceK * insideM;
            pc += fireA * exp(-length(eq / vec2(0.3, 0.15)) * 2.0) * 0.4 * faceK * insideM;
        }
        // detalle: un ojo se abre en el fondo
        if (dv == 2) {
            vec2 oq = (p - vec2((D.w - 0.5) * R, (fract(D.w * 5.0) - 0.5) * R * 0.8)) / (R * 0.10);
            float open = D.x * sin(D.y * PI);
            float lid = length(oq / vec2(1.0, max(open, 0.02)));
            pc += fireB * (1.0 - smoothstep(0.7, 1.0, lid)) * (0.6 + 0.6 * smoothstep(0.5, 0.0, abs(oq.x))) * insideM * 1.5;
        }
        // B: la cabeza del demonio sube desde el fondo
        if (rise > 0.0) {
            vec2 hq = (p - vec2(0.12 * sin(uRTime * 0.6) * rise, mix(-1.7, -0.15, rise) * R)) / R;
            float head = length(hq / vec2(0.62, 0.78)) - 1.0;
            float jaw = length((hq - vec2(0.0, -0.55)) / vec2(0.45, 0.45)) - 1.0;
            float hd = min(head, jaw) * 0.6;
            for (int s = -1; s <= 1; s += 2) {
                vec2 hb = vec2(float(s) * 0.45, 0.55);
                vec2 ht = vec2(float(s) * 0.95, 1.25);
                vec2 hm = vec2(float(s) * 0.90, 0.75);
                float horn = min(hkSeg(hq, hb, hm) - 0.11, hkSeg(hq, hm, ht) - 0.05);
                hd = hkSmin(hd, horn, 0.05);
            }
            float hm2 = 1.0 - smoothstep(-0.02, 0.02, hd);
            vec3 skin = vec3(0.16, 0.03, 0.02) * (0.6 + 0.5 * noise21(hq * 18.0)) + fireA * 0.15 * smoothstep(-0.2, 0.0, hd);
            pc = mix(pc, skin, hm2 * insideM);
            pc += fireA * (1.0 - smoothstep(0.0, 0.04, abs(hd))) * 0.5 * rise * insideM;
            float look = sin(uRTime * 0.8) * 0.12;
            vec2 eq = vec2(abs(hq.x - look) - 0.24, hq.y - 0.12);
            eq = rot2(sign(hq.x - look) * 0.3) * eq;
            pc += fireB * (1.0 - smoothstep(0.7, 1.0, length(eq / vec2(0.13, 0.05)))) * 2.5 * rise * insideM * (0.8 + bass * 0.5);
            pc += fireA * exp(-length(eq / vec2(0.25, 0.12)) * 2.0) * 0.4 * rise * insideM;
        }
        vec2 spE = vec2(a / TAU * 12.0 + 0.6 / (r + 0.1) + t * 0.5, log(r + 0.05) * 3.0 + t * 1.5);
        vec2 sid = floor(spE);
        vec2 sf = fract(spE) - 0.5;
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
        // detalle: chispas en el anillo
        if (dv == 1) pc += fireB * exp(-abs(ringD) * 40.0) * step(0.93, hash21(vec2(floor(a * 30.0), floor(rt * 8.0)))) * D.x * 2.0;
        // climax: tres brazos que salen del vortice, por encima del anillo (hombro, codo, mano con garras)
        // y un brazo solo que sale y tantea (suceso)
        float armOut = openE > 0.01 ? smoothstep(0.36, 0.56, cph) * (1.0 - C.z) : 0.0;
        float armSuc = sv == 2 ? se * smoothstep(0.10, 0.45, sp) * (1.0 - smoothstep(0.70, 0.92, sp)) : 0.0;
        if (armOut > 0.01 || armSuc > 0.01) {
            float out_ = max(armOut, armSuc);
            for (int j = 0; j < 3; j++) {
                if (armOut <= 0.01 && j != int(ss * 2.99)) continue;
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
        float runeHi = dv == 0 && abs(slotI - floor(D.w * 14.0)) < 0.5 ? D.x : 0.0;   // detalle: una runa brilla
        on += runeHi * 1.5;
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
    // --- suceso: el portal escupe una bola de fuego hacia la camara ---
    if (sv == 3 && se > 0.0) {
        float fly = smoothstep(0.15, 0.95, sp);
        vec2 fc = PC + vec2((ss - 0.5) * 1.4, -0.25) * fly * fly;
        float fr0 = mix(0.05, 0.85, fly * fly);
        vec2 fq = (pw - fc) / fr0;
        float fbn = fbm(fq * 2.5 + vec2(0.0, -uRTime * 2.0), 3, 0.6);
        float ball = smoothstep(1.0, 0.3, length(fq) + (fbn - 0.5) * 0.5);
        col += mix(fireA, fireB, ball) * ball * 1.3 * se * (1.0 - smoothstep(0.85, 1.0, sp));
    }
    // --- suceso: salen murcielagos del portal ---
    if (sv == 5 && se > 0.0) {
        for (int i = 0; i < 10; i++) {
            float fi = float(i);
            vec2 h = hash22(vec2(fi, 21.0));
            float k = clamp((sp - h.x * 0.4) / 0.6, 0.0, 1.0);
            if (k <= 0.0 || k >= 1.0) continue;
            float ang = h.y * TAU;
            vec2 c = PC + vec2(cos(ang) * 1.6, sin(ang) * 0.9 + 0.3) * k * 1.4;
            float sc = mix(0.05, 0.42, k * k);
            vec2 q = (pw - c) / sc;
            if (dot(q, q) > 0.6) continue;
            col = mix(col, vec3(0.006), (1.0 - smoothstep(-0.02, 0.02, hwBat(q, sin(uRTime * 14.0 + fi * 2.0)))) * se);
        }
    }
    // --- C: columna hacia arriba y lluvia de fuego por toda la cripta ---
    if (rainF > 0.0) {
        col += mix(fireA, fireB, 0.4) * exp(-abs(pw.x - PC.x) * 9.0) * smoothstep(PC.y, PC.y + 0.4, pw.y) * rainF * 0.9;
        for (int i = 0; i < 2; i++) {
            float fi = float(i);
            vec2 g = vec2(pw.x * (9.0 + fi * 5.0), pw.y * 0.8 + rt * (1.3 + fi * 0.5) + fi * 0.3);
            vec2 id = floor(g);
            float h = hash21(id + fi * 13.0);
            float y = fract(g.y);
            float ln = 0.12 + 0.2 * hash21(id + 5.0);
            float streak = smoothstep(0.0, ln, y) * (1.0 - smoothstep(ln, ln + 0.05, y));
            float lane = 1.0 - smoothstep(0.02, 0.06 + 0.06 * h, abs(fract(g.x) - 0.5 + (h - 0.5) * 0.5));
            col += mix(fireA, fireB, y * 3.0) * streak * lane * step(0.55, h) * rainF * (0.9 - fi * 0.3) * step(FLOOR_Y - 0.3, pw.y);
        }
    }
    // --- suceso: polvo que cae del techo con el temblor ---
    if (quake > 0.0) col += vec3(0.25, 0.2, 0.15) * hkParticles(pw * 1.5, rt * 0.4, 0.15 * quake, vec2(0.0, -1.0), 0.02) * quake * fireI;
    // --- detalle: humo que sale del portal ---
    if (dv == 3) {
        float sm = fbm(vec2(pw.x * 2.0, pw.y * 1.5 - rt * 0.4) + 7.0, 3, 0.55);
        col = mix(col, vec3(0.05, 0.035, 0.03) + fireA * 0.08, smoothstep(0.35, 0.65, sm) * exp(-length((pw - PC - vec2(0.0, 0.3 + D.y * 0.6)) * vec2(1.2, 0.9)) * 1.5) * D.x);
    }
    // humo (estado): velo sobre toda la cripta
    if (EST.z > 0.0) col = mix(col, vec3(0.04, 0.03, 0.03) + fireA * 0.03 * fireI, EST.z * 0.35 * smoothstep(0.35, 0.7, fbm(pw * 0.8 + vec2(rt * 0.03, 0.0), 3, 0.55)));
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
