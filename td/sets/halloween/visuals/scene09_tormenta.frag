// ===============================================================
// HALLOWEEN 09 - TORMENTA GOTICA
// Un paramo de noche bajo una tormenta (LAMINAS horneadas,
// plates/scene09, ver td/tools/bake_plates_tormenta.py): colinas, una
// granja lejana con la ventana encendida, un campo de pasto alto con una
// cerca torcida, un espantapajaros y un arbol muerto adelante. Arriba,
// nubarrones con relieve que se desplazan y se iluminan desde adentro
// con cada rayo; relampagos ramificados que caen al campo; lluvia en dos
// capas y charcos que reflejan el destello.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> retumba: las nubes se encienden desde adentro
//   medios -> el viento inclina la lluvia y mece el pasto y el arbol
//   agudos -> brilla la lluvia
//   golpe  -> cae el rayo (cada golpe en otro lugar) y recorta el
//             paisaje; con Chaos: dos y tres rayos
// PIANO: cada tecla hace caer un rayo en esa posicion (la fuerza: mas
//   brillante y mas ramas) que ilumina nubes y campo; apretada, el rayo
//   sigue chisporroteando; un acorde tira varios a la vez.
// Speed mueve nubes y lluvia aun en silencio.
// HISTORIA: cada acto la tormenta es mas o menos intensa; cada ~57 s
// llega el pico (rayos seguidos sin golpe); la ventana de la granja se
// apaga y se prende.
// CLIMAX (~73 s, 22 s, en tres tiempos): la lluvia arrecia y los rayos
//   caen cada vez mas cerca; uno cae en el arbol; el arbol queda ardiendo
//   y la ventana de la granja se apaga. Cada ~4.5 min con el pico de la
//   tormenta (gran climax).
//
// @D1: cantidad de lluvia
// @D2: ramificacion del rayo
// @D3: rayos tambien sin golpe (tormenta constante)
// @D4: brillo del relampago
// @D5: color (violeta <-> azul electrico)
// @D6: arbol muerto (de tenue a nitido)
// ===============================================================

const vec4 LAND_R = vec4(-3.1, -1.2, 6.2, 1.30);
const vec4 TREE_R = vec4(-3.1, -1.2, 6.2, 2.40);
const vec4 TREL_R = vec4(-2.75, -0.80, 2.40, 2.00);   // relieve del arbol (recuadro del arbol)
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// Rayo vertical quebrado desde 'top' hasta 'bot' en x0. Devuelve
// distancia aproximada al rayo.
float hwBolt(vec2 p, float x0, float top, float bot, float seed) {
    if (p.y > top || p.y < bot) return 1e3;
    float y = p.y;
    float k = (top - y) / (top - bot);
    // zigzag: suma de ruidos de distinta escala
    float x = x0 + (noise21(vec2(y * 6.0, seed)) - 0.5) * 0.30 * k
                 + (noise21(vec2(y * 22.0, seed + 3.0)) - 0.5) * 0.07;
    return abs(p.x - x);
}

// 'branches' es continuo: la rama nueva crece de a poco (D2 sin saltos)
float hwBranchy(vec2 p, float x0, float top, float bot, float seed, float branches) {
    float d = hwBolt(p, x0, top, bot, seed);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float on = revealAt(branches, fi);
        if (on < 0.01) break;
        float by = mix(top, bot, 0.25 + 0.15 * fi);
        float bx = x0 + (noise21(vec2(by * 6.0, seed)) - 0.5) * 0.30 * (0.25 + 0.15 * fi);
        float dir = (fract(seed * 7.0 + fi * 0.37) > 0.5) ? 1.0 : -1.0;
        vec2 q = p - vec2(bx, by);
        q = rot2(dir * 0.55) * q;
        float len = (0.35 + 0.1 * fi) * on;
        d = min(d, hwBolt(q + vec2(0.0, by), 0.0, by, by - len, seed + fi * 9.0) + 0.0015);
    }
    return d;
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 p = hkCam(p0);
    float t = uTime;
    float rt = uRTime;
    float hit = hkHit();
    float loco = hkLoco();
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, mid * 0.008);

    float slot = floor(rt * 1.7);
    vec4 G = hkGrandClimax(5.0);
    vec4 C = hkClimaxOr(G, hkClimax(5.0, 73.0, 22.0));
    float peak = max(hkEvent(3.0, 57.0, 10.0), max(C.x * 0.7 * (1.0 - C.z), G.x));
    // el rayo cae en el arbol al llegar el pico
    float treeHit = step(0.36, C.w) * step(C.w, 0.52);
    // limite de destellos (test_destellos.py, maximo 3 por segundo): el rayo
    // suelto se sortea al ritmo de la posicion del rayo (1.7 por segundo) y
    // mientras dura tapa al del bombo; el temblor del destello es chico
    // (8 %) para que no cuente como destello aparte.
    float ambient = max(uD3, peak) * step(0.86 - peak * 0.2 - hkActVal(4.0) * 0.08, hash21(vec2(slot, 5.0)));
    float strike = clamp(max(hit, ambient), 0.0, 1.0);
    float flick = strike * (0.92 + 0.08 * step(0.5, hash21(vec2(floor(rt * 22.0), 2.0))));
    // piano: rayos propios, uno por tecla (luz que dejan en nubes y campo)
    float keyFlick = 0.0;
    float keyNear = 0.0;
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.01, 0.35);
        float crackle = keyHeld(k) > 0.5 ? 0.7 + 0.3 * step(0.5, hash21(vec2(floor(uKclock * 18.0), float(k)))) : 1.0;
        float kf = e * crackle * (0.5 + keyVel(k) * 0.8) * (keyHeld(k) > 0.5 ? 1.0 : exp(-keyRelAge(k) * 4.0));
        keyFlick = max(keyFlick, kf);
        keyNear += kf * exp(-abs(p.x - hkKeyX(k)) * 0.9);
    }
    keyNear = 1.2 * keyNear / (1.0 + keyNear);    // varios rayos no queman la imagen
    vec3 boltC = mix(hsv2rgb(vec3(fract(0.77 + hue), 0.45, 1.0)),
                     hsv2rgb(vec3(fract(0.60 + hue), 0.55, 1.0)), uD5);
    float bx = (hash21(vec2(slot, 1.0)) - 0.5) * uAspect * 1.5;
    vec2 treeTop = vec2(-1.55, 0.55);
    // aviso: los rayos se acercan al arbol (de la derecha hacia el arbol)
    if (C.w > 0.0 && C.w < 0.36) bx = mix(bx, mix(uAspect * 0.8, treeTop.x + 0.3, C.w / 0.36), 0.75);
    if (treeHit > 0.5) bx = treeTop.x;


    // --- cielo y nubarrones con relieve (textura de ruido que se mueve) ---
    vec3 col = mix(vec3(0.02, 0.018, 0.04), vec3(0.005, 0.004, 0.012), smoothstep(-0.3, 1.2, p.y));
    vec2 cu = vec2(p.x * 0.11 - t * 0.006, p.y * 0.40 + 0.1);
    vec2 cw = vec2(plate2Wrap(cu * 0.5 + 0.3).g, plate2Wrap(cu * 0.5 + 0.7).b) - 0.5;
    vec4 n1 = plate2Wrap(cu + cw * 0.12);
    vec4 n2 = plate2Wrap(cu + cw * 0.12 + vec2(0.004, 0.012));
    float cl = n1.r * 0.7 + n1.a * 0.3;
    float cl2 = n2.r * 0.7 + n2.a * 0.3;
    float shape = smoothstep(0.38, 0.70, cl) * smoothstep(-0.55, 0.15, p.y);
    float relief = clamp(0.5 + (cl - cl2) * 9.0, 0.0, 1.0);    // luz desde arriba
    vec3 cloudDark = hsv2rgb(vec3(fract(0.74 + hue), 0.55, 0.06));
    vec3 cloudLit = hsv2rgb(vec3(fract(0.76 + hue), 0.40, 0.32));
    col = mix(col, mix(cloudDark, cloudLit, relief * 0.8 + n1.a * 0.2), shape);
    // brillo interno: el rayo y el bajo encienden las nubes desde adentro
    float inside = exp(-abs(p.x - bx) * 1.8) * shape * (0.4 + 0.6 * cl);
    col += boltC * inside * flick * (0.6 + uD4 * 1.2);
    col += boltC * shape * (0.4 + 0.6 * cl) * keyNear * (0.35 + uD4 * 0.6);
    col += boltC * shape * bass * 0.10 * (0.5 + 0.5 * n1.g) * exp(-abs(p.x - sin(rt * 0.3) * 1.5) * 0.8);
    col += boltC * 0.08 * flick * (0.5 + uD4);

    // --- rayo ---
    float d = hwBranchy(p, bx, 1.35, treeHit > 0.5 ? treeTop.y : -0.62, hash21(vec2(slot, 3.0)) * 50.0, floor(1.0 + uD2 * 3.0));
    float px = 2.0 / uResH;
    if (loco > 0.35) d = min(d, hwBranchy(p, bx + 0.7 * uAspect * (hash21(vec2(slot, 8.0)) - 0.5) * 2.0, 1.35, -0.62, slot * 13.0 + 1.0, 2.0));
    if (loco > 0.70) d = min(d, hwBranchy(p, -bx * 0.8, 1.35, -0.62, slot * 29.0 + 4.0, 3.0));
    float core = 1.0 - smoothstep(px * 0.8, px * 2.2, d);
    float glow = exp(-d * 60.0) * 0.6 + exp(-d * 12.0) * 0.25;
    col += (vec3(1.0) * core + boltC * glow) * flick * (0.8 + uD4 * 1.2);
    // rayos del piano
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.01, 0.35);
        if (e < 0.01) continue;
        float kf = e * (0.5 + keyVel(k) * 0.8) * (keyHeld(k) > 0.5 ? 1.0 : exp(-keyRelAge(k) * 4.0));
        float seed = keyPos(k) * 97.0 + floor(uKclock * (keyHeld(k) > 0.5 ? 10.0 : 0.0));
        float dk = hwBranchy(p, hkKeyX(k), 1.35, -0.62, seed, 1.0 + keyVel(k) * 2.5);
        float ck = 1.0 - smoothstep(px * 0.8, px * 2.2, dk);
        col += (vec3(1.0) * ck + boltC * (exp(-dk * 60.0) * 0.6 + exp(-dk * 12.0) * 0.25)) * kf * (0.8 + uD4 * 1.2);
    }

    // --- paisaje: oscuro, el relampago lo recorta ---
    vec4 ld = plate0(rUV(p + vec2(0.0, 0.0), LAND_R));
    vec3 la = plateCol(ld.rgb);
    float near = exp(-abs(p.x - bx) * 0.6);
    vec3 lc = la * (0.45 + vec3(0.15, 0.15, 0.25) + boltC * flick * (1.5 + uD4 * 2.0) * (0.4 + 0.6 * near)
                  + boltC * keyNear * (0.7 + uD4 * 1.0));
    // la ventana de la granja: se apaga y se prende
    vec2 wq = p - vec2(1.55, -0.42 + 0.0);
    float ls = rt / 9.0;
    float lamp = mix(step(0.25, hash21(vec2(floor(ls) - 1.0, 4.0))), step(0.25, hash21(vec2(floor(ls), 4.0))), smoothstep(0.0, 0.08, fract(ls)));
    lamp *= 1.0 - C.z;      // en las secuelas del climax la granja se apaga
    lc += vec3(1.0, 0.65, 0.25) * exp(-dot(wq * vec2(1.0, 1.6), wq * vec2(1.0, 1.6)) * 4000.0) * 1.5 * lamp;
    col = mix(col, lc, ld.a);

    // --- charcos en el campo que reflejan el destello ---
    if (p.y < -0.70) {
        float z = 1.0 / (-0.55 - p.y + 0.08);
        float pud = smoothstep(0.55, 0.62, plate2Wrap(vec2(p.x * z * 0.05, z * 0.06)).a);
        vec2 rg = vec2(p.x * z * 1.6, z * 1.3);
        vec2 rid = floor(rg);
        float rr = fract(rt * 1.4 + hash21(rid) * 7.0);
        float ring = exp(-pow((length((fract(rg) - 0.5) * vec2(1.0, 2.2)) - rr * 0.45) * 28.0, 2.0)) * (1.0 - rr) * step(0.5, hash21(rid + 3.0));
        vec3 pc = vec3(0.02, 0.02, 0.035) + boltC * flick * 0.35 * near + vec3(0.4, 0.45, 0.6) * ring * 0.3;
        col = mix(col, pc, pud * 0.85);
    }

    // --- arbol muerto (D6), se mece con los medios; arde si le cae el rayo ---
    vec2 tu = rUV(p, TREE_R);
    tu.x += (0.0015 + mid * 0.004) * sin(t * 1.2 + p.y * 2.0) * smoothstep(-0.6, 0.6, p.y);
    vec4 tr = plate1(tu);
    float treeOn = 0.35 + 0.65 * uD6;
    // relieve horneado: tubos con corteza; el rayo entra por el lado donde cae
    vec4 tn = plate3(rUV(TREE_R.xy + tu * TREE_R.zw, TREL_R));
    vec3 trN = vec3(tn.rg * 2.0 - 1.0, 0.0);
    trN.z = sqrt(max(1.0 - dot(trN.xy, trN.xy), 0.0));
    vec3 Lb = normalize(vec3(clamp((bx - p.x) * 0.6, -1.2, 1.2), 0.8, 0.5));
    float skyRel = clamp(1.0 + 0.9 * (trN.y * 0.7 - trN.x * 0.3), 0.4, 1.6);
    vec3 tc = plateCol(tr.rgb) * tn.b * (0.4 * skyRel + boltC * flick * 2.5 * exp(-abs(p.x - bx) * 0.8) * (0.15 + 2.8 * max(dot(trN, Lb), 0.0)));
    // arde desde que le cae el rayo hasta el final del climax
    float burn = smoothstep(0.38, 0.46, C.w) * (1.0 - smoothstep(0.92, 1.0, C.w));
    if (burn > 0.0 && tr.a > 0.0) {
        float fl = plate2Wrap(vec2(p.x * 0.4, p.y * 0.3 - rt * 0.15)).g;
        tc += vec3(1.0, 0.45, 0.10) * smoothstep(0.45, 0.75, fl) * burn * 1.8 * smoothstep(-0.5, 0.4, p.y);
    }
    col = mix(col, tc, tr.a * treeOn);
    if (burn > 0.0) {
        float emb = hkParticles(p - vec2(-1.55, 0.2), rt, 0.25 * burn, vec2(0.2, 1.0), 0.03);
        col += vec3(1.0, 0.5, 0.15) * emb * burn * exp(-length((p - vec2(-1.55, 0.3)) * vec2(1.2, 0.7)) * 1.5);
        col += vec3(1.0, 0.45, 0.12) * burn * 0.10 * exp(-length(p - vec2(-1.55, 0.0)) * 1.8);
    }

    // --- lluvia diagonal (los medios la inclinan) ---
    vec2 rp = p;
    rp.x += rp.y * (0.20 + mid * 0.25);
    float rain = 0.0;
    float rainBoost = 1.0 + loco * hit * 1.5 + C.x * (1.0 - C.z) * 0.9;
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 g = vec2(rp.x * (60.0 + fi * 40.0), rp.y * 2.0 + t * (2.2 + fi));
        vec2 id = floor(g);
        float h = hash21(id + fi * 7.0);
        float streak = smoothstep(0.0, 0.4, fract(g.y + h)) * (1.0 - smoothstep(0.4, 0.5, fract(g.y + h)));
        float lane = 1.0 - smoothstep(0.02, 0.10, abs(fract(g.x) - 0.5));
        rain += streak * lane * step(1.0 - (0.25 + uD1 * 0.55) * rainBoost, h) * (0.5 - fi * 0.2);
    }
    col += vec3(0.55, 0.6, 0.8) * rain * (0.14 + high * 0.6 + flick * 0.6);

    return vec4(hkFinish(col, uv, vec3(0.3, 0.3, 0.8)), 1.0);
}
