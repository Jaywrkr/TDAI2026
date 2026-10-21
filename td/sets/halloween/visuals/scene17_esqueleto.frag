// ===============================================================
// HALLOWEEN 17 - ESQUELETO BAILANDO
// LAMINAS horneadas (plates/scene17, ver td/tools/bake_plates_esqueleto.py):
// una cripta con tres arcos, columnas y piso de losas, y un ATLAS de
// huesos en relieve (craneo, caja toracica, pelvis, femur, tibia y
// perone, humero, radio y cubito, manos y pies). El shader arma el
// esqueleto pieza por pieza y lo hace bailar bajo un foco cenital.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> se encienden las losas del piso y late el foco
//   medios -> la cadera se mueve
//   agudos -> brillo en los huesos
//   golpe  -> salta y abre los brazos (D4); con Chaos baile poseido y
//             destello de rayos X
// PIANO: cada tecla es un paso de baile segun la nota (la fuerza: mas
//   grande): graves patada a la izquierda, medios bajos brazos arriba,
//   medios altos cabeceo, agudos patada a la derecha; apretada mantiene el
//   paso; un acorde los combina.
// Speed marca el paso de baile aun en silencio.
// HISTORIA: cada ~49 s un solo enloquecido; cada acto cambia el estilo
// del baile.
// CLIMAX (~91 s, 24 s, en tres tiempos): el piso hace olas de luz; salen
//   dos esqueletos mas a los costados y hacen el solo los tres juntos; se
//   quedan bailando un rato y se van. Cada ~4.5 min con el solo (gran
//   climax).
//
// @D1: tamano
// @D2: energia del baile
// @D3: grosor de los huesos
// @D4: salto con el golpe
// @D5: color (hueso <-> neon verde)
// @D6: piso de baldosas
// ===============================================================

const vec4 CRYPT_R = vec4(-3.1, -1.2, 6.2, 2.4);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// atlas de huesos (igual que el horneado): rect y ancho/largo en el mundo
const vec4 BR[9] = vec4[9](vec4(0.50, 0.00, 0.12, 0.50), vec4(0.62, 0.00, 0.12, 0.50), vec4(0.74, 0.00, 0.12, 0.50),
                           vec4(0.86, 0.00, 0.12, 0.50), vec4(0.00, 0.00, 0.25, 0.25), vec4(0.25, 0.00, 0.25, 0.25),
                           vec4(0.00, 0.50, 0.50, 0.50), vec4(0.50, 0.50, 0.50, 0.50), vec4(0.00, 0.25, 0.50, 0.25));
const vec2 BS[9] = vec2[9](vec2(0.16, 0.42), vec2(0.16, 0.40), vec2(0.13, 0.28), vec2(0.13, 0.26), vec2(0.20, 0.20),
                           vec2(0.20, 0.20), vec2(0.26, 0.30), vec2(0.42, 0.55), vec2(0.36, 0.18));
#define B_FEMUR 0
#define B_TIBIA 1
#define B_HUMERUS 2
#define B_FOREARM 3
#define B_HAND 4
#define B_FOOT 5
#define B_SKULL 6
#define B_RIBS 7
#define B_PELVIS 8

vec2 e17Limb(vec2 o, float len, float ang) { return o + vec2(sin(ang), -cos(ang)) * len; }

// pinta una pieza del atlas entre las articulaciones a (v=0) y b (v=1)
void e17Bone(vec2 p, vec2 a, vec2 b, int id, float thick, float mirror,
             inout vec4 hitC, inout vec2 hitN) {
    vec2 ab = b - a;
    float len = length(ab);
    vec2 dir = ab / max(len, 1e-4);
    vec2 q = p - a;
    float v = dot(q, dir) / len;
    if (v < -0.05 || v > 1.05) return;
    float sc = len / BS[id].y;
    float u = 0.5 + dot(q, vec2(-dir.y, dir.x)) / (BS[id].x * sc * thick);
    if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) return;
    if (mirror > 0.5) u = 1.0 - u;
    vec2 tuv = BR[id].xy + vec2(u, v) * BR[id].zw;
    vec4 c = plate2(tuv);
    if (c.a < 0.02) return;
    vec2 nxy = plate3(tuv).rg * 2.0 - 1.0;
    if (mirror > 0.5) nxy.x = -nxy.x;
    // normal del atlas -> mundo (gira con la pieza)
    vec2 nw = nxy.x * vec2(-dir.y, dir.x) + nxy.y * dir;
    hitC = vec4(mix(hitC.rgb, c.rgb, c.a), max(hitC.a, c.a));
    hitN = mix(hitN, nw, c.a);
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    vec4 G = hkGrandClimax(4.0);
    vec4 C = hkClimaxOr(G, hkClimax(4.0, 91.0, 24.0));
    float cph = C.w;
    float soloE = max(hkEvent(3.0, 49.0, 7.0), max(C.y, G.y));
    float floorWave = max(C.x, C.z * 0.6);
    // los dos de los costados: entran al llegar el pico y se van al final
    float sideOn = smoothstep(0.30, 0.42, cph) * (1.0 - smoothstep(0.88, 0.98, cph));
    // pasos del piano (cada zona del teclado, un paso)
    float kickL = 0.0, kickR = 0.0, armsK = 0.0, headK = 0.0, hopK = 0.0;
    for (int k = 0; k < N_KEYS; k++) {
        float ke = keyEnv(k, 0.08, 0.4) * (0.5 + keyVel(k) * 0.7);
        float kp = keyPos(k);
        kickL = max(kickL, ke * (1.0 - step(0.25, kp)));
        armsK = max(armsK, ke * step(0.25, kp) * (1.0 - step(0.5, kp)));
        headK = max(headK, ke * step(0.5, kp) * (1.0 - step(0.75, kp)));
        kickR = max(kickR, ke * step(0.75, kp));
        hopK = max(hopK, ke * exp(-keyAge(k) * 4.0));
    }
    float floorY = -0.62;
    vec3 spotC = vec3(0.85, 0.82, 0.75);
    vec3 neonC = vec3(0.35, 1.0, 0.45);

    // --- rig del baile ---
    float s = 0.50 + uD1 * 0.22;
    float e = (0.4 + uD2 * 0.9) * (1.0 + hit * loco * 1.6 + soloE * 0.9) * mix(0.8, 1.25, hkActVal(5.0));
    float beat = sin(t * 3.0);
    float jump = hit * (0.04 + uD4 * 0.14);
    vec2 hip = vec2(0.10 * sin(t * 1.5) * e + mid * 0.05 * sin(t * 6.0), floorY + 0.92 * s + 0.04 * abs(beat) * e + jump);
    float lean = 0.10 * sin(t * 1.5) * e;
    vec2 up = vec2(sin(lean), cos(lean));
    vec2 neck = hip + up * 0.55 * s;
    float thick = 0.85 + uD3 * 0.4;

    // --- cripta ---
    vec2 cu = rUV(p, CRYPT_R);
    vec4 ca = plate0(cu);
    vec2 cn = plate1(cu).rg * 2.0 - 1.0;
    vec3 n = normalize(vec3(cn, sqrt(max(1.0 - dot(cn, cn), 0.05))));
    vec2 spot = vec2(hip.x * 0.6, 1.5);
    vec3 ld = normalize(vec3(spot - p, 0.8));
    float coneW = 0.35 + (1.0 - (p.y - floorY) / 2.1) * 0.55;
    float cone = smoothstep(coneW, coneW * 0.45, abs(p.x - hip.x * 0.6));
    float pool = exp(-pow((p.x - hip.x) / 0.7, 2.0)) * smoothstep(floorY + 0.02, floorY - 0.2, p.y);
    float lightL = (0.04 + cone * 0.55 * (0.85 + bass * 0.3)) * (0.4 + 0.6 * max(dot(n, ld), 0.0)) + pool * 0.6;
    // antorchas en las columnas (luz calida a los costados)
    vec3 torchC = vec3(1.0, 0.55, 0.22);
    vec3 torch = vec3(0.0);
    for (int k = 0; k < 4; k++) {
        float tx = (float(k) - 1.5) * 1.85;
        vec2 tp = vec2(tx, 0.28);
        float fl = 0.8 + 0.2 * noise21(vec2(t * 7.0, float(k) * 3.0));
        torch += torchC * fl * 0.035 / (0.03 + dot(p - tp, p - tp) * 1.2);
    }
    vec3 col = plateCol(ca.rgb) * (spotC * lightL * 2.2 + torch + vec3(0.02, 0.015, 0.03));
    for (int k = 0; k < 4; k++) {
        float tx = (float(k) - 1.5) * 1.85;
        vec2 tq = p - vec2(tx, 0.22);
        float holder = min(hkRBox(tq, vec2(0.025, 0.06), 0.01), hkRBox(tq - vec2(0.0, 0.06), vec2(0.045, 0.015), 0.006));
        col = mix(col, vec3(0.03, 0.025, 0.02), 1.0 - smoothstep(0.0, 0.004, holder));
        vec2 fq = (tq - vec2(0.0, 0.12)) / vec2(0.035, 0.07);
        fq.x += (noise21(vec2(fq.y * 2.0 - t * 5.0, float(k))) - 0.5) * 0.6 * max(fq.y + 0.5, 0.0);
        float fl = 1.0 - smoothstep(0.5, 1.0, length(fq * vec2(1.0, 0.7)) + max(fq.y, 0.0) * 0.3);
        col += mix(torchC, vec3(1.0, 0.9, 0.6), fl) * fl * 1.2;
        col += torchC * exp(-length(tq - vec2(0.0, 0.12)) * 10.0) * 0.12;
    }
    // losas que se encienden (D6): la junta brilla con el bajo
    if (p.y < floorY && uD6 > 0.02) {
        float z = 1.0 / max(floorY - p.y + 0.06, 0.02);
        vec2 tq = vec2(p.x * z * 0.30, z * 0.55);
        vec2 tid = floor(tq);
        float lit = step(0.6 - bass * 0.4, hash21(tid + floor(uRTime * 2.0)));
        lit = max(lit, floorWave * step(0.5, sin(tid.x * 0.6 + tid.y * 0.9 - uRTime * 6.0)));
        vec3 tc = mix(vec3(0.55, 0.25, 0.9), neonC, uD5);
        col += tc * lit * uD6 * (0.10 + bass * 0.25) * smoothstep(-1.25, floorY, p.y) * (0.4 + 0.6 * plateCol(ca.rgb).r * 8.0);
    }
    // polvo en el cono del foco
    float dust = hkParticles(p * 0.9, t * 0.3, 0.12, vec2(0.05, -0.2), 0.04);
    col += spotC * (cone * 0.035 * (0.7 + 0.3 * noise21(p * 3.0 + t * 0.1)) + dust * cone * 0.05 * (0.4 + high));
    // sombra en el piso
    col *= 1.0 - 0.65 * exp(-pow((p.x - hip.x) / (0.38 * s), 2.0)) * exp(-pow((p.y - floorY + 0.03) / 0.035, 2.0));

    // --- esqueletos, pieza por pieza (de atras hacia adelante); el 0 es el
    // del centro, el 1 y el 2 salen a los costados en el climax ---
    vec2 hip0 = hip;
    float s0 = s;
    float t0 = t;
    for (int inst = 0; inst < 3; inst++) {
    float app = inst == 0 ? 1.0 : sideOn;
    if (app < 0.01) continue;
    float sideX = inst == 0 ? 0.0 : (inst == 1 ? -1.0 : 1.0);
    s = s0 * (inst == 0 ? 1.0 : 0.86);
    t = t0 + float(inst) * 0.37;
    // entran desde afuera del cuadro hacia su lugar
    hip = vec2(hip0.x * (inst == 0 ? 1.0 : 0.6) + sideX * mix(uAspect + 0.6, 1.25, app), floorY + 0.92 * s + 0.04 * abs(sin(t * 3.0)) * e + jump + hopK * 0.06 * float(inst == 0));
    lean = 0.10 * sin(t * 1.5) * e;
    up = vec2(sin(lean), cos(lean));
    neck = hip + up * 0.55 * s;
    beat = sin(t * 3.0);
    vec4 bc = vec4(0.0);
    vec2 bn = vec2(0.0);
    float armUp = hit * (0.8 + uD4 * 0.8) + armsK * 1.5;
    if (abs(p.x - hip.x) < 1.2 * s && p.y < hip.y + 1.0 * s && p.y > floorY - 0.1) {
        for (int k = 0; k < 2; k++) {
            float sd = k == 0 ? -1.0 : 1.0;
            // piernas
            vec2 hp = hip + vec2(sd * 0.10 * s, -0.03 * s);
            float l1 = sd * 0.10 + 0.45 * e * sin(t * 3.0 + (sd > 0.0 ? 0.0 : PI)) * 0.6;
            // patadas del piano (el de la izquierda con graves, el otro con agudos)
            l1 += sd < 0.0 ? -kickL * 1.3 : kickR * 1.3;
            vec2 kn = e17Limb(hp, 0.42 * s, l1);
            vec2 an = e17Limb(kn, 0.40 * s, l1 - abs(l1) * 0.8 * sd + 0.05 * sd);
            an.y = max(an.y, floorY + 0.05 * s);
            vec2 toe = an + vec2(sd * 0.09 * s, -0.06 * s);
            e17Bone(p, kn, hp, B_FEMUR, thick, step(0.0, sd), bc, bn);
            e17Bone(p, an, kn, B_TIBIA, thick, step(0.0, sd), bc, bn);
            e17Bone(p, an, toe, B_FOOT, thick, step(0.0, sd), bc, bn);
        }
        // pelvis y caja toracica
        e17Bone(p, hip - up * 0.10 * s, hip + up * 0.10 * s, B_PELVIS, 1.0, 0.0, bc, bn);
        e17Bone(p, hip + up * 0.04 * s, neck + up * 0.04 * s, B_RIBS, 1.0, 0.0, bc, bn);
        for (int k = 0; k < 2; k++) {
            float sd = k == 0 ? -1.0 : 1.0;
            // brazos: se abren con el golpe
            vec2 sh = neck + vec2(sd * 0.20 * s, -0.04 * s);
            float a1 = sd * (0.5 + 0.5 * e * sin(t * 3.0 + sd) + armUp);
            vec2 el = e17Limb(sh, 0.28 * s, a1);
            float a2 = a1 + sd * (0.6 + 0.6 * e * sin(t * 3.0 + 1.2 + sd));
            vec2 wr = e17Limb(el, 0.26 * s, a2);
            vec2 tip = e17Limb(wr, 0.18 * s, a2 + sd * 0.2);
            e17Bone(p, el, sh, B_HUMERUS, thick, step(0.0, sd), bc, bn);
            e17Bone(p, wr, el, B_FOREARM, thick, step(0.0, sd), bc, bn);
            e17Bone(p, wr, tip, B_HAND, thick, step(0.0, sd), bc, bn);
        }
        // craneo (cabecea con el beat)
        float nod = lean * 1.5 + 0.12 * beat * e + headK * 0.45 * sin(uKclock * 9.0);
        vec2 hup = vec2(sin(nod), cos(nod));
        e17Bone(p, neck + hup * 0.02 * s, neck + hup * 0.32 * s, B_SKULL, 1.0, 0.0, bc, bn);
    }
    if (bc.a > 0.0) {
        vec3 nb = normalize(vec3(bn, sqrt(max(1.0 - dot(bn, bn), 0.05))));
        vec3 alb = plateCol(bc.rgb);
        float lam = max(dot(nb, normalize(vec3(spot - p, 0.9))), 0.0);
        float rim = pow(1.0 - nb.z, 2.0);
        vec3 bone = alb * spotC * (0.06 + lam * 0.85 * (0.45 + cone)) * 1.5 + alb * torch * 0.8;
        bone += spotC * pow(max(dot(nb, normalize(vec3(spot - p, 0.9) + vec3(0.0, 0.0, 1.0))), 0.0), 20.0) * (0.08 + high * 0.2);
        // neon / rayos X
        vec3 neon = neonC * (0.15 + rim * 1.6) + neonC * alb * 1.5;
        float xray = hit * step(0.6, loco) * step(0.6, noise21(vec2(floor(uRTime * 14.0), 5.0)));
        bone = mix(bone, neon, clamp(uD5 + xray, 0.0, 1.0));
        col = mix(col, bone, bc.a * app);
        col += neonC * rim * bc.a * uD5 * 0.3;
    }
    // ojos que arden en las cuencas
    float nodE = lean * 1.5 + 0.12 * beat * e + headK * 0.45 * sin(uKclock * 9.0);
    vec2 headC = neck + vec2(sin(nodE), cos(nodE)) * 0.19 * s;
    for (int k = 0; k < 2; k++) {
        float sd = k == 0 ? -1.0 : 1.0;
        vec2 ec = headC + vec2(sd * 0.052 * s, 0.0);
        col += mix(vec3(1.0, 0.25, 0.08), neonC, uD5) * exp(-dot(p - ec, p - ec) / (0.0004 * s * s)) * (0.5 + bass * 1.2);
    }
    }
    s = s0; t = t0; hip = hip0;
    return vec4(hkFinish(col, uv, vec3(0.3, 0.3, 0.4)), 1.0);
}
