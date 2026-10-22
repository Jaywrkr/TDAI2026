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
// Cada acto la tormenta es mas o menos intensa; la ventana de la granja
// se apaga y se prende.
// REPERTORIO (fase 32, motor hkSuceso del kit). Todos los rayos sueltos
// pasan por el mismo sorteo por casillero (limite de destellos):
//   ESTADOS (~5 min): tormenta, aguacero (lluvia cerrada, menos rayos) y
//     relampagos lejanos (casi sin lluvia, rayos raros).
//   SUCESOS (~55 s, 7): el pico (rayos seguidos); al espantapajaros se le
//     encienden los ojos; cruza una bandada de cuervos; un rayo globular
//     flota por el campo; alguien con un farol camina junto a la cerca;
//     una rafaga de hojas; los relampagos corren por adentro de las nubes.
//   DETALLES (~30 s, 5): un resplandor lejano en las nubes, la ventana de
//     la granja parpadea, un cuervo en la cerca, chispas en el alambrado,
//     gotas gruesas en los charcos.
//   CLIMAX (~4 min, 22 s, rotan 3 guiones en tres tiempos):
//     A el arbol: la lluvia arrecia, los rayos se acercan, uno cae en el
//       arbol, que queda ardiendo, y la granja se apaga.
//     B fuego de San Telmo: la tormenta se calma, el arbol, la cerca y el
//       espantapajaros se cubren de un brillo azul que repta; termina con
//       un solo rayo.
//     C el tornado: baja un embudo de las nubes, toca el campo y levanta
//       remolinos de hojas; la lluvia se acuesta; despues sube y se deshace.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con el pico.
// @EST: tormenta | aguacero | relampagos lejanos
// @SUC: el pico | ojos del espantapajaros | cuervos | rayo globular | el farol | rafaga de hojas | relampagos en las nubes
// @DET: resplandor lejano | la ventana parpadea | cuervo en la cerca | chispas en el alambrado | gotas gruesas
// @CLX: A el arbol | B fuego de San Telmo | C el tornado
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

// Cuervo de ~1 de envergadura, flap -1..1
float hwCrow(vec2 p, float flap) {
    float ax = abs(p.x);
    float body = length((p - vec2(0.0, -0.02)) / vec2(0.20, 0.07)) - 1.0;
    float head = length(p - vec2(0.22, 0.01)) - 0.05;
    vec2 elbow = vec2(0.22, 0.10 * flap + 0.04);
    vec2 tip = vec2(0.50, 0.28 * flap - 0.02);
    float wing = min(hkSeg(vec2(ax, p.y), vec2(0.0, 0.0), elbow) - 0.045, hkSeg(vec2(ax, p.y), elbow, tip) - 0.025);
    float tail = hkSeg(p, vec2(-0.15, -0.02), vec2(-0.30, -0.05)) - 0.035;
    return min(min(body * 0.07, head), min(wing, tail));
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
    // --- calendario (fase 32) ---
    hkSetClimax(5.0, 22.0, 26.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(5.0, 7, 10.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(5.0, 5, 3.5);
    int dv = int(D.z);
    vec4 EST = hkEstado(5.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(5.0, 3));
    float peak = max(sv == 0 ? se : 0.0, max(cA * C.x * 0.7 * (1.0 - C.z), G.x));
    // B: calma tensa (casi sin rayos) y un rayo al final; C: el tornado
    float elmo = cB * smoothstep(0.08, 0.30, C.w) * (1.0 - smoothstep(0.80, 0.92, C.w));
    float funnel = cC * smoothstep(0.10, 0.40, C.w) * (1.0 - smoothstep(0.78, 0.96, C.w));
    // el rayo cae en el arbol al llegar el pico
    float treeHit = cA * step(0.36, C.w) * step(C.w, 0.52);
    // limite de destellos (test_destellos.py, maximo 3 por segundo): el rayo
    // suelto se sortea al ritmo de la posicion del rayo (1.7 por segundo) y
    // mientras dura tapa al del bombo; el temblor del destello es chico
    // (8 %) para que no cuente como destello aparte.
    float ambient = max(uD3, peak) * step(0.86 - peak * 0.2 - hkActVal(4.0) * 0.08 + EST.y * 0.06 + EST.z * 0.08, hash21(vec2(slot, 5.0)));
    ambient *= 1.0 - elmo;
    // B termina con un solo rayo (un casillero)
    ambient = max(ambient, cB * step(0.86, C.w) * step(C.w, 0.86 + 0.6 / (1.7 * 22.0)));
    float strike = clamp(max(hit * (1.0 - elmo), ambient), 0.0, 1.0);
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
    if (cA > 0.0 && C.w < 0.36) bx = mix(bx, mix(uAspect * 0.8, treeTop.x + 0.3, C.w / 0.36), 0.75);
    if (treeHit > 0.5) bx = treeTop.x;
    // B: el rayo del final cae en el espantapajaros
    if (cB > 0.0) bx = 0.48;
    // suceso: los relampagos corren por adentro de las nubes (horizontales)
    float crawl = sv == 6 ? se : 0.0;


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
    // detalle: un resplandor lejano (chico y suave: no es destello)
    if (dv == 0) col += boltC * shape * D.x * 0.06 * exp(-length((p - vec2((D.w - 0.5) * 4.0, 0.55)) * vec2(0.8, 1.6)) * 2.5)
                      * (0.6 + 0.4 * noise21(vec2(rt * 3.0, 1.0)));
    // relampagos lejanos (estado): las nubes se encienden de a poco, sin rayo
    col += boltC * shape * EST.z * 0.05 * smoothstep(0.6, 1.0, noise21(vec2(rt * 0.7, 9.0))) * exp(-abs(p.x - (noise21(vec2(rt * 0.1, 3.0)) - 0.5) * 4.0) * 1.2);
    // C: el embudo del tornado baja de las nubes
    if (funnel > 0.0) {
        float fx = 0.9 + 0.25 * sin(rt * 0.4) + 0.08 * sin(p.y * 3.0 - rt * 1.5);
        float reach = mix(0.9, -0.36, smoothstep(0.0, 1.0, funnel));
        float hgt = clamp((p.y - reach) / (1.2 - reach), 0.0, 1.0);
        float wdt = mix(0.04, 0.55, pow(hgt, 1.6)) + 0.02;
        float fd = abs(p.x - fx) / wdt;
        float body = (1.0 - smoothstep(0.75, 1.0, fd)) * step(reach, p.y);
        float swirl = 0.5 + 0.5 * sin((p.x - fx) / wdt * 5.0 + p.y * 9.0 - rt * 7.0);
        vec3 fc = mix(cloudDark * 0.4, cloudLit * 1.6, swirl * 0.6 * smoothstep(1.0, 0.3, fd) + 0.25 * (1.0 - fd)) + boltC * flick * 0.25 + boltC * bass * 0.05;
        col = mix(col, fc, body * funnel * 0.92);
        // polvo donde toca
        col = mix(col, cloudDark * 1.5, funnel * smoothstep(0.85, 1.0, funnel) * exp(-pow((p.x - fx) / 0.45, 2.0) - pow((p.y + 0.32) / 0.12, 2.0)) * 0.8);
    }

    // --- rayo ---
    float d = hwBranchy(p, bx, 1.35, treeHit > 0.5 ? treeTop.y : (cB > 0.0 ? -0.12 : -0.62), hash21(vec2(slot, 3.0)) * 50.0, floor(1.0 + uD2 * 3.0));
    // rayos horizontales entre las nubes (mismo sorteo, mismo destello)
    if (crawl > 0.0) {
        vec2 hq = vec2(p.y - 0.62 - 0.12 * sin(p.x * 1.3 + slot), p.x);
        float hd = hwBranchy(vec2(hq.x, hq.y), 0.0, bx + 1.8, bx - 1.8, slot * 7.0 + 2.0, 2.0);
        d = mix(d, min(d * 3.0 + 0.02, hd), crawl);
    }
    float px = 2.0 / uResH;
    if (loco > 0.35) d = min(d, hwBranchy(p, bx + 0.7 * uAspect * (hash21(vec2(slot, 8.0)) - 0.5) * 2.0, 1.35, -0.62, slot * 13.0 + 1.0, 2.0));
    if (loco > 0.70) d = min(d, hwBranchy(p, -bx * 0.8, 1.35, -0.62, slot * 29.0 + 4.0, 3.0));
    float core = 1.0 - smoothstep(px * 0.8, px * 2.2, d);
    float glow = exp(-d * 60.0) * 0.6 + exp(-d * 12.0) * 0.25;
    col += (vec3(1.0) * core + boltC * glow) * flick * (0.8 + uD4 * 1.2);
    // EASTER EGG "JAY INFINITO" (fase 38): entre las nubes queda un rayo
    // quieto con forma de J (crepita, pero sin destellar)
    vec2 EG = hkEgg(9.0);
    if (EG.x > 0.0) {
        vec2 jc = vec2(-0.95, 0.68), jq = (p - jc) / 0.42;
        if (abs(jq.x) < 1.0 && abs(jq.y) < 1.0) {
            jq.x += (noise21(vec2(jq.y * 9.0, 4.0)) - 0.5) * 0.10 + (noise21(vec2(jq.y * 31.0, 8.0)) - 0.5) * 0.03;
            jq.y += (noise21(vec2(jq.x * 9.0, 6.0)) - 0.5) * 0.08;
            float dj = hkText(jq, int[16](74, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 1) * 0.42;
            float crack = 0.85 + 0.15 * step(0.5, hash21(vec2(floor(rt * 2.0), 31.0)));
            float cj = 1.0 - smoothstep(px * 0.8, px * 2.4, dj);
            col += (vec3(1.0) * cj + boltC * (exp(-dj * 60.0) * 0.6 + exp(-dj * 12.0) * 0.2)) * EG.x * crack;
        }
    }
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
    lamp *= 1.0 - cA * C.z;      // en las secuelas del climax A la granja se apaga
    if (dv == 1) lamp *= 1.0 - D.x * step(0.5, noise21(vec2(rt * 3.0, 4.0)));
    lc += vec3(1.0, 0.65, 0.25) * exp(-dot(wq * vec2(1.0, 1.6), wq * vec2(1.0, 1.6)) * 4000.0) * 1.5 * lamp;
    col = mix(col, lc, ld.a);
    // B: fuego de San Telmo en la cerca y el espantapajaros
    if (elmo > 0.0) {
        float crawlE = 0.5 + 0.5 * sin(p.x * 23.0 - rt * 3.0) * noise21(vec2(p.x * 9.0, rt * 0.8));
        float fence = exp(-pow((p.y + 0.30) / 0.05, 2.0)) * smoothstep(0.3, -0.3, p.x - 0.1) * ld.a;
        float scare = exp(-length((p - vec2(0.48, -0.22)) * vec2(3.5, 2.2)) * 3.0);
        col += vec3(0.35, 0.55, 1.0) * (fence * 0.9 + scare * 1.4) * (0.4 + crawlE) * elmo * (0.8 + bass * 0.5);
    }
    // suceso: al espantapajaros se le encienden los ojos (y en B tambien)
    float eyesK = max(sv == 1 ? se * smoothstep(0.1, 0.3, sp) : 0.0, elmo);
    if (eyesK > 0.0) {
        vec2 eq = vec2(abs(p.x - 0.485) - 0.018, p.y + 0.150);
        vec3 ec = mix(vec3(1.0, 0.35, 0.05), vec3(0.5, 0.8, 1.0), elmo);
        col += ec * (exp(-dot(eq, eq) * 25000.0) * 3.0 + exp(-dot(eq, eq) * 1500.0) * 0.30) * eyesK;
    }
    // suceso: alguien con un farol camina junto a la cerca
    if (sv == 4 && se > 0.0) {
        vec2 lp = vec2(mix(1.3, -0.9, ss > 0.5 ? sp : 1.0 - sp), -0.36 + 0.008 * sin(sp * 60.0));
        float ll = exp(-dot(p - lp, p - lp) * 9000.0) * 2.0 + exp(-length((p - lp) * vec2(1.0, 2.2)) * 9.0) * 0.18;
        col += vec3(1.0, 0.65, 0.25) * ll * se;
        // la silueta al lado del farol
        vec2 fq = (p - lp - vec2(0.035, 0.03)) / 0.06;
        float fig = min(length(fq - vec2(0.0, 0.75)) - 0.22, length(max(abs(fq) - vec2(0.18, 0.55), 0.0)) - 0.1);
        col = mix(col, vec3(0.01), (1.0 - smoothstep(-0.05, 0.05, fig)) * se * 0.9);
    }
    // detalle: chispas en el alambrado
    if (dv == 3) {
        vec2 sq = p - vec2(-0.6 + D.w * 1.0, -0.31);
        col += vec3(0.7, 0.8, 1.0) * exp(-dot(sq, sq) * 20000.0) * D.x * (0.5 + 0.5 * noise21(vec2(rt * 14.0, 2.0))) * 1.6;
    }
    // detalle: un cuervo en la cerca
    if (dv == 2) {
        vec2 cq = (p - vec2(-1.05 + D.w * 1.4, -0.265)) / 0.07;
        float cr = min(length(cq / vec2(0.9, 0.45)) - 0.5, length(cq - vec2(0.42, 0.22)) - 0.2);
        cr = min(cr, hkSeg(cq, vec2(-0.4, -0.05), vec2(-0.85, -0.3)) - 0.08);
        col = mix(col, vec3(0.005), (1.0 - smoothstep(-0.05, 0.05, cr)) * D.x);
    }

    // --- charcos en el campo que reflejan el destello ---
    if (p.y < -0.70) {
        float z = 1.0 / (-0.55 - p.y + 0.08);
        float pud = smoothstep(0.55, 0.62, plate2Wrap(vec2(p.x * z * 0.05, z * 0.06)).a);
        vec2 rg = vec2(p.x * z * 1.6, z * 1.3);
        vec2 rid = floor(rg);
        float rr = fract(rt * (1.4 + (dv == 4 ? D.x * 1.2 : 0.0)) + hash21(rid) * 7.0);
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
    float burn = cA * smoothstep(0.38, 0.46, C.w) * (1.0 - smoothstep(0.92, 1.0, C.w));
    if (burn > 0.0 && tr.a > 0.0) {
        float fl = plate2Wrap(vec2(p.x * 0.4, p.y * 0.3 - rt * 0.15)).g;
        tc += vec3(1.0, 0.45, 0.10) * smoothstep(0.45, 0.75, fl) * burn * 1.8 * smoothstep(-0.5, 0.4, p.y);
    }
    // B: el brillo azul repta por las ramas
    tc += vec3(0.35, 0.55, 1.0) * 2.5 * elmo * tn.b * smoothstep(0.45, 0.80, plate2Wrap(vec2(p.x * 0.6, p.y * 0.6 - rt * 0.08)).g) * smoothstep(-0.2, 0.6, p.y) * (0.7 + bass * 0.5);
    col = mix(col, tc, tr.a * treeOn);
    if (burn > 0.0) {
        float emb = hkParticles(p - vec2(-1.55, 0.2), rt, 0.25 * burn, vec2(0.2, 1.0), 0.03);
        col += vec3(1.0, 0.5, 0.15) * emb * burn * exp(-length((p - vec2(-1.55, 0.3)) * vec2(1.2, 0.7)) * 1.5);
        col += vec3(1.0, 0.45, 0.12) * burn * 0.10 * exp(-length(p - vec2(-1.55, 0.0)) * 1.8);
    }

    // --- lluvia diagonal (los medios la inclinan) ---
    vec2 rp = p;
    rp.x += rp.y * (0.20 + mid * 0.25 + EST.y * 0.15 + funnel * 0.6);
    float rain = 0.0;
    float rainBoost = (1.0 + loco * hit * 1.5 + cA * C.x * (1.0 - C.z) * 0.9 + EST.y * 0.7) * (1.0 - EST.z * 0.75) * (1.0 - elmo * 0.6);
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

    // --- suceso: cruza una bandada de cuervos ---
    if (sv == 2 && se > 0.0) {
        for (int i = 0; i < 9; i++) {
            float fi = float(i);
            vec2 h = hash22(vec2(fi, 4.0));
            vec2 c = vec2(mix(-3.2, 3.2, fract(sp * 0.9 + h.x * 0.25)), 0.25 + h.y * 0.55 + 0.04 * sin(sp * 20.0 + fi));
            if (ss > 0.5) c.x = -c.x;
            float sc = 0.13 + 0.08 * h.y;
            vec2 q = (p - c) / sc;
            if (dot(q, q) > 0.5) continue;
            if (ss > 0.5) q.x = -q.x;
            col = mix(col, vec3(0.004), (1.0 - smoothstep(-0.03, 0.03, hwCrow(q, sin(rt * 9.0 + fi * 2.0)))) * se);
        }
    }
    // --- suceso: rayo globular que flota por el campo ---
    if (sv == 3 && se > 0.0) {
        vec2 bp = vec2(mix(-1.2, 1.6, ss > 0.5 ? sp : 1.0 - sp), -0.40 + 0.08 * sin(sp * 11.0));
        float bd = length(p - bp);
        float fl = 0.85 + 0.15 * noise21(vec2(rt * 8.0, 3.0));
        col += vec3(0.75, 0.85, 1.0) * (exp(-bd * bd * 5000.0) * 1.6 + exp(-bd * 9.0) * 0.18) * se * fl;
    }
    // --- suceso: rafaga de hojas; C: remolinos de hojas alrededor del tornado ---
    float leaves = max(sv == 5 ? se : 0.0, funnel);
    if (leaves > 0.0) {
        for (int i = 0; i < 14; i++) {
            float fi = float(i);
            vec2 h = hash22(vec2(fi, 12.0));
            vec2 lp;
            if (funnel > 0.0) {
                float a = rt * (2.0 + h.x) + fi;
                lp = vec2(0.9 + cos(a) * (0.2 + h.y * 0.5), -0.35 + fract(rt * 0.15 + h.x) * 1.1);
            } else {
                lp = vec2(mix(-3.0, 3.0, fract(sp * 1.2 + h.x * 0.4)), -0.6 + h.y * 1.0 + 0.15 * sin(sp * 14.0 + fi));
                if (ss > 0.5) lp.x = -lp.x;
            }
            vec2 q = rot2(rt * (3.0 + h.x * 4.0) + fi) * (p - lp);
            float lf = length(q * vec2(1.0, 2.6)) - 0.018;
            col = mix(col, vec3(0.06, 0.04, 0.02) + boltC * flick * 0.2, (1.0 - smoothstep(-0.003, 0.003, lf)) * leaves);
        }
    }

    return vec4(hkFinish(col, uv, vec3(0.3, 0.3, 0.8)), 1.0);
}
