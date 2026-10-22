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
// Cada acto cambia el estilo del baile.
// REPERTORIO (fase 33, motor hkSuceso del kit):
//   ESTADOS (~5 min): foco, luz negra (los huesos brillan neon y el piso
//     se enciende) y antorchas (el foco baja, mandan las antorchas).
//   SUCESOS (~55 s, 7): un solo enloquecido; pierde la cabeza (salta y
//     vuelve); se desarma un poco y se rearma; brazos arriba; el foco se
//     pone rojo; moonwalk de un lado al otro; lluvia de huesos.
//   DETALLES (~30 s, 5): guina un ojo, un saltito, brillo en el craneo,
//     cae polvo, una antorcha chisporrotea.
//   CLIMAX (~4 min, 24 s, rotan 3 guiones en tres tiempos):
//     A el trio: el piso hace olas de luz, salen dos esqueletos mas y
//       hacen el solo los tres juntos; despues se van.
//     B el gigante: el esqueleto crece hasta llenar la cripta y baila
//       lento, con el foco encima; despues vuelve a su tamano.
//     C el desarme: los huesos salen volando y giran en el aire alrededor
//       del craneo; al final se rearman de golpe.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con el solo.
// @EST: foco | luz negra | antorchas
// @SUC: el solo | pierde la cabeza | se desarma | brazos arriba | foco rojo | moonwalk | lluvia de huesos
// @DET: guina | saltito | brillo en el craneo | cae polvo | chisporrotea
// @CLX: A el trio | B el gigante | C el desarme
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

// desarme (suceso y climax C): cada pieza se aleja de la cadera y gira
float gExplode = 0.0, gSpin = 0.0;
vec2 gHip = vec2(0.0);

// pinta una pieza del atlas entre las articulaciones a (v=0) y b (v=1)
void e17Bone(vec2 p, vec2 a, vec2 b, int id, float thick, float mirror,
             inout vec4 hitC, inout vec2 hitN) {
    if (gExplode > 0.0) {
        vec2 m = (a + b) * 0.5;
        vec2 off = (m - gHip) * gExplode * 1.4 + vec2(0.0, gExplode * 0.25) + vec2(sin(float(id) * 2.3 + m.x * 9.0), cos(float(id) * 1.7 + m.y * 7.0)) * gExplode * 0.12;
        mat2 r = mat2(cos(gSpin * (float(id) - 4.0) * 0.6), sin(gSpin * (float(id) - 4.0) * 0.6), -sin(gSpin * (float(id) - 4.0) * 0.6), cos(gSpin * (float(id) - 4.0) * 0.6));
        a = m + off + r * (a - m);
        b = m + off + r * (b - m);
    }
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

    // --- calendario (fase 33) ---
    hkSetClimax(4.0, 24.0, 28.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(4.0, 7, 9.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(4.0, 5, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(4.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(4.0, 3));
    float cph = cA * C.w;
    float soloE = max(sv == 0 ? se : 0.0, max(cA * C.y, G.y));
    float floorWave = max(cA * max(C.x, C.z * 0.6), cC * C.y * 0.8);
    float giant = cB * smoothstep(0.05, 0.40, C.w) * (1.0 - smoothstep(0.78, 0.95, C.w));
    gExplode = max(sv == 2 ? se * sin(sp * PI) * 0.35 : 0.0, cC * smoothstep(0.10, 0.40, C.w) * (1.0 - smoothstep(0.84, 0.88, C.w)));
    gSpin = uRTime * 1.5 * step(0.2, gExplode);
    float headOff = sv == 1 ? se * sin(clamp(sp * 1.2, 0.0, 1.0) * PI) : 0.0;
    float uv5 = clamp(uD5 + EST.y * 0.8, 0.0, 1.0);              // luz negra
    float d6 = clamp(uD6 + EST.y * 0.6, 0.0, 1.0);
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
    vec3 spotC = mix(vec3(0.85, 0.82, 0.75), vec3(1.0, 0.12, 0.08), sv == 4 ? se : 0.0) * (1.0 - EST.z * 0.55) * (1.0 + giant * 0.2);
    vec3 neonC = vec3(0.35, 1.0, 0.45);

    // --- rig del baile ---
    float s = (0.50 + uD1 * 0.22) * (1.0 + giant * 0.36);
    float e = (0.4 + uD2 * 0.9) * (1.0 + hit * loco * 1.6 + soloE * 0.9) * mix(0.8, 1.25, hkActVal(5.0));
    float beat = sin(t * 3.0);
    e *= 1.0 - giant * 0.45;                                     // el gigante baila lento
    float jump = hit * (0.04 + uD4 * 0.14) + (dv == 1 ? D.x * sin(D.y * PI) * 0.08 : 0.0);
    float slide = sv == 5 ? se * sin(sp * TAU) * 1.1 : 0.0;          // moonwalk
    vec2 hip = vec2(0.10 * sin(t * 1.5) * e + mid * 0.05 * sin(t * 6.0) + slide, floorY + 0.92 * s + 0.04 * abs(beat) * e + jump);
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
        if (dv == 4 && k == int(D.w * 3.99)) fl *= 1.0 + D.x * 0.6 * (noise21(vec2(t * 15.0, 1.0)) - 0.3);
        torch += torchC * fl * 0.035 * (1.0 + EST.z * 1.2) / (0.03 + dot(p - tp, p - tp) * 1.2);
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
    if (p.y < floorY && d6 > 0.02) {
        float z = 1.0 / max(floorY - p.y + 0.06, 0.02);
        vec2 tq = vec2(p.x * z * 0.30, z * 0.55);
        vec2 tid = floor(tq);
        float lit = step(0.6 - bass * 0.4, hash21(tid + floor(uRTime * 2.0)));
        lit = max(lit, floorWave * step(0.5, sin(tid.x * 0.6 + tid.y * 0.9 - uRTime * 6.0)));
        vec3 tc = mix(vec3(0.55, 0.25, 0.9), neonC, uv5);
        col += tc * lit * d6 * (0.10 + bass * 0.25) * smoothstep(-1.25, floorY, p.y) * (0.4 + 0.6 * plateCol(ca.rgb).r * 8.0);
    }
    // polvo en el cono del foco
    float dust = hkParticles(p * 0.9, t * 0.3, 0.12 + (dv == 3 ? D.x * 0.3 : 0.0), vec2(0.05, -0.2 - (dv == 3 ? D.x * 0.5 : 0.0)), 0.04);
    col += spotC * (cone * 0.035 * (0.7 + 0.3 * noise21(p * 3.0 + t * 0.1)) + dust * cone * 0.05 * (0.4 + high));
    // sombra en el piso
    col *= 1.0 - 0.65 * exp(-pow((p.x - hip.x) / (0.38 * s), 2.0)) * exp(-pow((p.y - floorY + 0.03) / 0.035, 2.0));

    // --- esqueletos, pieza por pieza (de atras hacia adelante); el 0 es el
    // del centro, el 1 y el 2 salen a los costados en el climax ---
    // EASTER EGG "JAY INFINITO" (fase 38): el esqueleto del centro mueve la
    // cadera dibujando un infinito y deja una estela de luz
    vec2 EG = hkEgg(17.0);
    float egA = 0.34 * s;
    vec2 egOff = EG.x > 0.0 ? hkInfPath(uRTime * 3.2, egA) * EG.x : vec2(0.0);
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
    if (inst == 0) hip += egOff;
    gHip = hip;
    lean = 0.10 * sin(t * 1.5) * e;
    up = vec2(sin(lean), cos(lean));
    neck = hip + up * 0.55 * s;
    beat = sin(t * 3.0);
    vec4 bc = vec4(0.0);
    vec2 bn = vec2(0.0);
    float armUp = hit * (0.8 + uD4 * 0.8) + armsK * 1.5 + (sv == 3 ? se * 1.6 : 0.0);
    float reach = 1.0 + gExplode * 2.2;
    if (abs(p.x - hip.x) < 1.2 * s * reach && p.y < hip.y + 1.0 * s * reach + headOff * 0.8 && p.y > floorY - 0.1) {
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
        vec2 hpop = vec2(0.10 * sin(headOff * 6.0), headOff * 0.55) * s;   // pierde la cabeza
        e17Bone(p, neck + hup * 0.02 * s + hpop, neck + hup * 0.32 * s + hpop, B_SKULL, 1.0, 0.0, bc, bn);
    }
    if (bc.a > 0.0) {
        vec3 nb = normalize(vec3(bn, sqrt(max(1.0 - dot(bn, bn), 0.05))));
        vec3 alb = plateCol(bc.rgb);
        float lam = max(dot(nb, normalize(vec3(spot - p, 0.9))), 0.0);
        float rim = pow(1.0 - nb.z, 2.0);
        vec3 bone = alb * spotC * (0.06 + lam * 0.85 * (0.45 + cone)) * 1.5 + alb * torch * 0.8;
        // las baldosas encendidas lo iluminan desde abajo (fase 24)
        vec3 tileC = mix(vec3(0.55, 0.25, 0.9), neonC, uD5);
        float under = max(-nb.y * 0.8 + 0.2, 0.0) * exp(-max(p.y - floorY, 0.0) * 2.2);
        bone += alb * tileC * under * d6 * (0.25 + bass * 0.9 + floorWave * 0.6);
        bone += spotC * pow(max(dot(nb, normalize(vec3(spot - p, 0.9) + vec3(0.0, 0.0, 1.0))), 0.0), 20.0) * (0.08 + high * 0.2);
        // neon / rayos X
        vec3 neon = neonC * (0.15 + rim * 1.6) + neonC * alb * 1.5;
        float xray = hit * step(0.6, loco) * step(0.6, noise21(vec2(floor(uRTime * 14.0), 5.0)));
        bone = mix(bone, neon, clamp(uv5 + xray, 0.0, 1.0));
        col = mix(col, bone, bc.a * app);
        col += neonC * rim * bc.a * uv5 * 0.3;
    }
    // ojos que arden en las cuencas
    float nodE = lean * 1.5 + 0.12 * beat * e + headK * 0.45 * sin(uKclock * 9.0);
    vec2 headC = neck + vec2(sin(nodE), cos(nodE)) * 0.19 * s + vec2(0.10 * sin(headOff * 6.0), headOff * 0.55) * s;
    if (gExplode <= 0.05) for (int k = 0; k < 2; k++) {
        float sd = k == 0 ? -1.0 : 1.0;
        vec2 ec = headC + vec2(sd * 0.052 * s, 0.0);
        float wink = (dv == 0 && k == 0 && inst == 0) ? 1.0 - D.x * step(0.35, D.y) * (1.0 - step(0.65, D.y)) : 1.0;
        col += mix(vec3(1.0, 0.25, 0.08), neonC, uv5) * exp(-dot(p - ec, p - ec) / (0.0004 * s * s)) * (0.5 + bass * 1.2) * wink;
    }
    // detalle: brillo en el craneo
    if (dv == 2 && inst == 0) col += spotC * exp(-dot(p - headC - vec2(-0.05, 0.08) * s, p - headC - vec2(-0.05, 0.08) * s) / (0.0006 * s * s)) * D.x * sin(D.y * PI) * 1.2;
    }
    s = s0; t = t0; hip = hip0;
    if (EG.x > 0.0) {
        float id = hkInfD(p - vec2(hip0.x, hip0.y), egA);
        col += spotC * (exp(-id / 0.006) * 0.9 + exp(-id / 0.04) * 0.15) * EG.x * smoothstep(0.1, 0.35, EG.y);
    }
    // --- suceso: lluvia de huesos ---
    if (sv == 6 && se > 0.0) {
        for (int i = 0; i < 2; i++) {
            float fi = float(i);
            vec2 g = vec2(p.x * 3.0, p.y * 1.0 + uRTime * (0.9 + fi * 0.3) + fi * 0.4);
            vec2 id = floor(g);
            float h = hash21(id + fi * 7.0);
            if (h > 0.55) {
                vec2 q = (fract(g) - 0.5) / vec2(3.0, 1.0);
                q = rot2(uRTime * (2.0 + h * 3.0) + h * 6.0) * q;
                float bone = min(hkSeg(q, vec2(-0.05, 0.0), vec2(0.05, 0.0)) - 0.010,
                                 min(length(q - vec2(-0.055, 0.0)) - 0.017, length(q - vec2(0.055, 0.0)) - 0.017));
                col = mix(col, vec3(0.75, 0.72, 0.62) * (0.2 + 0.8 * cone) + torch * 0.3, (1.0 - smoothstep(-0.002, 0.002, bone)) * se * step(floorY, p.y));
            }
        }
    }
    // LUZ DE TECLA (fase 37): un foco por tecla
    col = hkKeyLit(col, p, 0.0, vec2(0.22, 1.0), vec3(0.8, 0.85, 1.0), vec3(1.0, 0.4, 0.9), 0.04, 1.0);
    return vec4(hkFinish(col, uv, vec3(0.3, 0.3, 0.4)), 1.0);
}
