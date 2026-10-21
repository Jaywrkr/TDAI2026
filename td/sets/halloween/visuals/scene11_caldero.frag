// ===============================================================
// HALLOWEEN 11 - CALDERO DE BRUJA
// La cabana de la bruja (LAMINAS horneadas, plates/scene11, ver
// td/tools/bake_plates_caldero.py): muro de piedra, chimenea, vigas con
// ramos de hierbas, estantes con frascos y botellas, un libro de
// hechizos y una calavera. Al centro, el caldero de hierro martillado
// sobre lena con brasas. La pocion verde y las brasas ILUMINAN en vivo
// el relieve de la piedra, el hierro y los frascos (el vidrio brilla).
// Encima: liquido que burbujea, vapor que se enrosca y chispas.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> el liquido se enciende y tine la cabana
//   medios -> el vapor se enrosca; las hierbas se mecen
//   agudos -> chispas; titilan los frascos
//   golpe  -> revientan burbujas grandes y se avivan las brasas; con
//             Chaos la pocion erupciona en un geiser
// PIANO: cada tecla infla una burbuja grande en la superficie, en esa
//   posicion; mientras la tecla siga apretada crece; al soltarla revienta y
//   salta un chorro de pocion (la fuerza: mas alto).
// Speed hace subir el vapor y las burbujas aun en silencio.
// HISTORIA: cada ~47 s aparece una cara en el vapor; cada acto cambia el
// color de la pocion.
// CLIMAX (~64 s, 18 s, en tres tiempos): el hervor crece y la cara aparece
//   en el vapor y grita; la pocion erupciona y llueve verde sobre la
//   cabana; despues el piso queda brillando. Cada ~4.5 min con dos caras
//   (gran climax).
//
// @D1: cantidad de burbujas (aparecen de a una)
// @D2: altura del vapor
// @D3: brillo del liquido
// @D4: brasas bajo el caldero
// @D5: color de la pocion (verde <-> violeta)
// @D6: chispas
// ===============================================================

const vec4 PL_R = vec4(-3.1, -1.2, 6.2, 2.4);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv)))) * 1.15;   // un poco mas abierto: entra la lena
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    vec4 G = hkGrandClimax(3.0);
    vec4 C = hkClimaxOr(G, hkClimax(3.0, 64.0, 18.0));
    float cph = C.w;
    // (el cambio de color por acto ahora es un fundido)
    vec3 potion = mix(hsv2rgb(vec3(fract(0.32 + hue), 0.95, 1.0)),
                      hsv2rgb(vec3(fract(0.78 + hue), 0.80, 1.0)), clamp(uD5 + smoothstep(0.75, 0.95, hkActVal(4.0)) * 0.8, 0.0, 1.0));
    vec3 ember = vec3(1.0, 0.40, 0.08);

    // --- cabana y caldero iluminados por la pocion y las brasas ---
    vec2 pu = rUV(p);
    vec2 cp = p - vec2(0.0, -0.42);
    vec2 mp = (cp - vec2(0.0, 0.20)) / vec2(0.58, 0.10);
    float mouth = length(mp) - 1.0;
    float lb = 0.55 + uD3 * 0.45 + bass * 0.45 + C.x * 0.20 * (1.0 - C.z) + C.y * 0.20;
    float coalI = (0.6 + uD4 * 1.4 + hit * 0.8) * (0.8 + 0.2 * noise21(vec2(t * 3.0, 1.0)));
    // hierbas que se mecen
    vec2 hu = pu;
    hu.x += (0.0008 + mid * 0.003) * sin(t * 1.4 + p.x * 3.0) * smoothstep(0.95, 0.60, p.y) * step(0.55, p.y);
    vec4 hc = plate0(hu);
    vec4 hn = plate1(hu);
    vec4 kc = plate2(pu);
    vec4 kn = plate3(pu);
    vec4 cn = mix(hn, kn, kc.a);
    vec3 alb = plateCol(mix(hc.rgb, kc.rgb, kc.a));
    vec2 nxy = cn.rg * 2.0 - 1.0;
    vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
    if (p.y < -0.95) n = normalize(vec3(nxy * 0.6, 0.0) + vec3(0.0, 0.85, 0.5));
    vec3 P3 = vec3(p, 0.0);
    vec3 Lpot = vec3(0.0, -0.10, 0.45);
    vec3 Lcoal = vec3(0.0, -0.98, 0.35);
    vec3 v1 = Lpot - P3; float d1 = dot(v1, v1); vec3 L1 = v1 * inversesqrt(d1);
    vec3 v2 = Lcoal - P3; float d2 = dot(v2, v2); vec3 L2 = v2 * inversesqrt(d2);
    vec3 lit = vec3(0.06, 0.055, 0.07);
    lit += potion * max(dot(n, L1), 0.0) / (1.0 + d1 * 0.7) * lb * 1.4;
    lit += ember * max(dot(n, L2), 0.0) / (1.0 + d2 * 1.6) * coalI * 1.2;
    float sp = pow(max(dot(reflect(-L1, n), vec3(0.0, 0.0, 1.0)), 0.0), 24.0) / (1.0 + d1 * 0.7);
    vec3 col = alb * lit * 2.2 + potion * sp * 0.25 * kc.a;
    // vidrio de los frascos: brilla y titila con los agudos
    float glass = hn.b * (1.0 - kc.a);
    col += alb * glass * (potion * 0.6 * lb / (1.0 + d1 * 0.5) + vec3(0.04)) * (1.0 + high * 1.5 * hash21(floor(p * 9.0) + floor(uRTime * 6.0)));
    // brasas encendidas (canal B del caldero)
    float coal = kn.b * kc.a;
    col += ember * coal * coalI * (0.8 + 0.4 * noise21(p * 30.0 + t));
    col += ember * 0.10 * exp(-abs(p.y + 0.97) * 4.0) * coalI * smoothstep(0.9, 0.0, abs(p.x));
    float potM = kc.a;

    // superficie del liquido dentro de la boca
    float liquidM = 1.0 - smoothstep(-0.05, 0.0, mouth + 0.10);
    vec3 liquid = vec3(0.0);
    if (liquidM > 0.0) {
    float surf = fbm(mp * vec2(3.0, 1.5) + vec2(t * 0.4, 0.0), 3, 0.5);
    liquid = potion * (0.35 + 0.65 * surf) * lb;
    // burbujas en la superficie
    float nb = min(6.0 + uD1 * 8.0 + C.x * 8.0, 14.0);
    for (int i = 0; i < 14; i++) {
        float fi = float(i);
        float bOn = revealAt(nb, fi);
        if (bOn < 0.01) break;
        float h1 = fract(sin(fi * 12.989) * 43758.5);
        float h2 = fract(sin(fi * 78.233) * 12345.6);
        float life = fract(t * (0.25 + h2 * 0.35) + h1);
        vec2 bc = vec2(h1 * 1.6 - 0.8, h2 * 1.2 - 0.6);
        float big = 1.0 + hit * step(0.6, h2) * 1.4;
        float rad = 0.10 + 0.25 * life * big;
        float ring = abs(length((mp - bc) * vec2(1.0, 1.6)) - rad);
        float bub = (1.0 - smoothstep(0.0, 0.05, ring)) * (1.0 - life);
        liquid += (potion * bub * 0.8 + vec3(0.8) * bub * 0.25) * bOn;
    }
    // piano: una burbuja grande por tecla (crece apretada, revienta al soltar)
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.1, 0.25);
        if (e < 0.01) continue;
        vec2 bc = vec2(mix(-0.75, 0.75, keyPos(k)), 0.15 * sin(keyPos(k) * 17.0));
        float rad = (0.15 + keyVel(k) * 0.20) * (0.4 + 0.6 * smoothstep(0.0, 1.2, keyAge(k)));
        float dd = length((mp - bc) * vec2(1.0, 1.6));
        float dome = 1.0 - smoothstep(rad - 0.03, rad, dd);
        float rim = exp(-pow((dd - rad * 0.92) / 0.03, 2.0));
        // burbuja: piel oscura y brillante sobre el liquido, con reflejo
        liquid = mix(liquid, potion * (0.10 + 0.35 * dd / max(rad, 1e-3)) * lb, dome * e);
        vec2 hl = mp - bc - vec2(-0.35, 0.30) * rad;
        liquid += (potion * 0.8 + vec3(0.5)) * rim * 0.6 * e + vec3(1.0) * exp(-dot(hl, hl) * 300.0) * e * dome;
    }
    }
    col = mix(col, liquid, liquidM);
    col += potion * exp(-max(mouth + 0.1, 0.0) * 6.0) * 0.12 * lb * (1.0 - potM);
    // cara en el vapor (evento)
    float faceE = max(hkEvent(5.0, 47.0, 6.0), smoothstep(0.15, 0.30, cph) * (1.0 - smoothstep(0.55, 0.66, cph)));
    // la cara grita al llegar la erupcion
    float scream = smoothstep(0.26, 0.40, cph) * (1.0 - smoothstep(0.55, 0.66, cph));

    // vapor que sube y se enrosca
    vec2 vp = p - vec2(0.0, -0.22);
    float rise = clamp(vp.y / (0.6 + uD2 * 0.9 + C.x * 0.4), 0.0, 1.0);
    vec2 sq = vec2(vp.x * (1.6 - rise * 0.6) + 0.25 * sin(vp.y * 3.0 - t * 1.2), vp.y * 1.4 - t * 0.5);
    float colMask = smoothstep(0.65 + rise * 0.5, 0.0, abs(vp.x)) * smoothstep(0.0, 0.05, vp.y) * (1.0 - rise);
    float steam = colMask > 0.0 ? plate4Wrap(sq * vec2(0.12, 0.10) + 0.3).g : 0.0;
    float sAmt = smoothstep(0.40, 0.75, steam) * colMask;
    if (faceE > 0.01) {
        vec2 fq = (vp - vec2(0.0, 0.55)) / 0.30;
        float head = length(fq / vec2(0.8, 1.0)) - 1.0;
        float eyes = length(vec2(abs(fq.x) - 0.32, fq.y - 0.15)) - 0.16;
        float mouthF = length((fq - vec2(0.0, -0.40 - scream * 0.15)) / vec2(0.5 - scream * 0.15, 0.25 + scream * 0.45)) - 1.0;
        float face = smoothstep(0.2, -0.3, head) * (1.0 - smoothstep(-0.05, 0.05, -max(-eyes, -mouthF * 0.2)));
        sAmt = max(sAmt, face * faceE * 1.1 * (0.6 + 0.4 * steam));
        sAmt *= 1.0 - faceE * smoothstep(0.05, -0.05, min(eyes, mouthF * 0.2)) * step(head, 0.0);
    }
    col += potion * sAmt * (0.75 + bass * 0.6 + uD3 * 0.4);

    // LOCURA: la pocion erupciona en un geiser con el golpe
    // historia: cada ~64 s la pocion erupciona sola; cada acto otro color
    float geyser = max(hit * smoothstep(0.3, 0.9, loco), C.y);
    if (geyser > 0.01) {
        vec2 gq = p - vec2(0.0, -0.22);
        float hgt = geyser * 1.3;
        float w = 0.10 + 0.10 * gq.y + 0.04 * sin(gq.y * 12.0 - uRTime * 20.0);
        float gn = fbm(vec2(gq.x * 8.0, gq.y * 3.0 - uRTime * 6.0), 3);
        float col1 = smoothstep(w, w * 0.3, abs(gq.x)) * smoothstep(0.0, 0.05, gq.y) * smoothstep(hgt, hgt * 0.6, gq.y);
        col += potion * 0.9 * col1 * (0.5 + gn);
        col += potion * exp(-abs(gq.x) * 5.0) * smoothstep(hgt + 0.3, 0.0, gq.y) * geyser * 0.25;
    }
    // piano: al soltar la tecla la burbuja revienta y salta un chorro
    for (int k = 0; k < N_KEYS; k++) {
        float rel = keyRelAge(k);
        if (rel <= 0.0 || rel > 1.4) continue;
        float vel = keyVel(k);
        float x0 = mix(-0.75, 0.75, keyPos(k)) * 0.58;
        vec2 gq = p - vec2(x0, -0.22);
        float up = rel < 0.5 ? rel / 0.5 : 1.0;
        float hgt = (0.35 + vel * 0.65) * up * (1.0 - smoothstep(0.6, 1.4, rel));
        float w = 0.04 + 0.05 * gq.y;
        float jet = smoothstep(w, w * 0.2, abs(gq.x)) * smoothstep(0.0, 0.03, gq.y) * smoothstep(hgt, hgt * 0.5, gq.y);
        col += (potion * 1.1 + vec3(0.15)) * jet * (0.6 + 0.6 * noise21(vec2(gq.x * 30.0, gq.y * 10.0 - uKclock * 8.0)));
        // gotas que caen
        float drops = hkParticles((p - vec2(x0, 0.0)) * 3.0, uKclock * 1.5, 0.25, vec2(0.0, -1.0), 0.05)
                    * exp(-abs(p.x - x0) * 6.0) * smoothstep(0.3, 0.8, rel) * (1.0 - smoothstep(0.9, 1.4, rel));
        col += potion * drops * 1.2;
    }
    // climax: lluvia verde sobre toda la cabana y el piso brillando despues
    if (cph > 0.0) {
        float rain = hkParticles(p * 1.2, uRTime * 1.2, 0.30 * (C.y + C.z * 0.5), vec2(0.15, -1.0), 0.03);
        col += mix(potion, vec3(1.0), 0.3) * rain * smoothstep(0.42, 0.55, cph) * (1.0 - smoothstep(0.80, 0.95, cph)) * 1.4;
        if (p.y < -0.90) {
            float pud = smoothstep(0.45, 0.70, noise21(vec2(p.x * 3.0, p.y * 9.0)));
            col += potion * pud * (C.z * 0.35 + C.y * 0.15) * (0.7 + 0.3 * sin(uRTime * 2.0 + p.x * 4.0));
        }
    }
    // chispas verdes que saltan
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 g = vec2(p.x * (14.0 + fi * 8.0), p.y * 4.0 - t * (1.2 + fi * 0.5));
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5 - (hash22(id + fi) - 0.5) * 0.6;
        float alive = step(0.80 - uD6 * 0.30 - hit * 0.2 - high * 0.15, hash21(id + 3.0 + fi));
        float sp = exp(-dot(f, f) * 200.0) * alive * colMask;
        col += mix(potion, vec3(1.0), 0.4) * sp * 1.2;
    }

    return vec4(hkFinish(col, uv, vec3(0.2, 0.6, 0.2)), 1.0);
}
