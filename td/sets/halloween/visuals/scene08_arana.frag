// ===============================================================
// HALLOWEEN 08 - ARANA EN SU TELA
// Plano macro en un desvan de noche: fondo desenfocado con vigas, el
// ventanal con luna y circulos de luz (LAMINAS horneadas,
// plates/scene08, ver td/tools/bake_plates_arana.py), y nitida la tela
// de una arana de jardin atada a la viga y al poste: radios, espiral,
// hilos que brillan a contraluz con un leve tornasol y gotas de rocio
// que refractan el fondo. La arana (abdomen con dibujo, patas con
// bandas) baja y sube por su hilo.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> el brillo de contraluz de los hilos late
//   medios -> la brisa mece la tela
//   agudos -> destella el rocio; brilla el polvo en el aire
//   golpe  -> la tela vibra (cada vuelta con su fase, D4) y la arana se
//             encoge; con Chaos bajan aranitas por sus hilos
// PIANO: cada tecla baja una aranita colgada de su hilo en esa posicion
//   (la fuerza: mas grande y mas abajo); apretada, se queda colgando y se
//   balancea; al soltarla sube rapido por el hilo.
// Speed mueve la arana, la brisa y el polvo aun en silencio.
// Cada acto cambia la luz de la luna.
// REPERTORIO (fase 32, motor hkSuceso del kit):
//   ESTADOS (~5 min): noche quieta, humedad (rocio en toda la tela) y
//     viento (la tela se mece siempre).
//   SUCESOS (~55 s, 7): la arana camina hasta el centro; una rafaga sacude
//     todo; una polilla cae en la tela, forcejea y la arana va por ella; la
//     arana teje una vuelta nueva que brilla; una polilla grande aletea en
//     la luz del fondo; bajan aranitas por sus hilos; una gota corre por un
//     radio y cae.
//   DETALLES (~30 s, 5): una gota destella, un hilo suelto se mece, pasa un
//     mosquito, la arana estira las patas, polvo en la luz.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A la bajada: la tela vibra y bajan aranitas; la arana grande baja
//       hasta la camara y tapa media pantalla; despues sube.
//     B la invasion: decenas de aranitas trepan desde los bordes, cruzan
//       la tela hasta el centro y despues se dispersan.
//     C la tela gigante: una telarana se teje delante de la camara, radio
//       por radio, y la arana enorme la cruza por encima; despues se rompe.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con rafaga.
// @EST: noche quieta | humedad | viento
// @SUC: camina al centro | rafaga | la presa | teje una vuelta | polilla en la luz | bajan aranitas | gota que corre
// @DET: destello | hilo suelto | mosquito | estira las patas | polvo en la luz
// @CLX: A la bajada | B la invasion | C la tela gigante
//
// @D1: cantidad de radios (cada uno aparece por su cuenta)
// @D2: cantidad de anillos (cada uno aparece por su cuenta)
// @D3: tamano de la arana
// @D4: vibracion con el golpe
// @D5: rocio
// @D6: color (plata <-> violeta)
// ===============================================================

const vec4 PL_R = vec4(-3.1, -1.2, 6.2, 2.4);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

float hwSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// Arana de jardin ~1 de largo, cabeza hacia +y. Devuelve (distancia,
// zona: 0 pata, 1 cefalotorax, 2 abdomen) y la coordenada del abdomen.
vec2 hwSpider(vec2 p, float t, float curl, out vec2 abq) {
    vec2 ab = (p - vec2(0.0, -0.22)) / vec2(0.30, 0.36);
    abq = ab;
    float abd = (length(ab) - 1.0) * 0.30;
    float cep = length((p - vec2(0.0, 0.16)) / vec2(0.15, 0.17)) - 1.0;
    cep *= 0.15;
    float d = min(abd, cep);
    float zone = abd < cep ? 2.0 : 1.0;
    float legs = 1e3;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float sway = 0.10 * sin(t * 3.0 + fi * 1.7);
        for (int s = -1; s <= 1; s += 2) {
            float sx = float(s);
            vec2 hip = vec2(sx * 0.10, 0.22 - fi * 0.05);
            float ang = (fi < 2.0 ? 0.5 - fi * 0.35 : -0.2 - (fi - 2.0) * 0.45) + sway * sx;
            vec2 dir = vec2(sx * cos(ang), sin(ang));
            vec2 knee = hip + dir * (0.32 - curl * 0.12) + vec2(0.0, 0.10);
            vec2 dir2 = vec2(sx * cos(ang - 0.9 * (fi < 2.0 ? -1.0 : 1.0) * 0.6), sin(ang) - 0.6);
            vec2 foot = knee + normalize(dir2) * (0.40 - curl * 0.18);
            vec2 tip = foot + normalize(dir2 + vec2(0.0, -0.3)) * 0.12 * (1.0 - curl);
            legs = min(legs, hwSeg(p, hip, knee) - 0.026);
            legs = min(legs, hwSeg(p, knee, foot) - 0.020);
            legs = min(legs, hwSeg(p, foot, tip) - 0.013);
        }
    }
    if (legs < d) zone = 0.0;
    d = min(d, legs);
    return vec2(d, zone);
}

// Polilla de ~1 de ancho (alas abiertas), flap 0..1.
float hwMoth(vec2 p, float flap) {
    vec2 q = vec2(abs(p.x), p.y);
    float w = mix(1.0, 0.25, flap);
    float up = length((rot2(-0.35) * (q - vec2(0.24 * w, 0.10))) / vec2(0.26 * w, 0.17)) - 1.0;
    float lo = length((rot2(0.5) * (q - vec2(0.17 * w, -0.12))) / vec2(0.17 * w, 0.12)) - 1.0;
    float body = length(p / vec2(0.05, 0.22)) - 1.0;
    return min(min(up * 0.12, lo * 0.09), body * 0.05);
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 p = hkCam(p0);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.006);
    // --- calendario (fase 32) ---
    hkSetClimax(3.0, 18.0, 22.0);
    vec4 GC = hkGrandV();
    vec4 CL = hkClimaxOr(GC, hkClimaxV());
    float grand = GC.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (CL.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (CL.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (CL.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(3.0, 7, 12.0);
    int sv = int(S.z);
    float se = S.x, sph = S.y, ss = S.w;
    vec4 D = hkDetalle(3.0, 5, 3.5);
    int dv = int(D.z);
    vec4 EST = hkEstado(3.0, 3);
    hkTimeline(S, D, CL, cv, grand, hkEstadoIdx(3.0, 3));
    float gust = max(sv == 1 ? se * smoothstep(0.2, 0.35, sph) * (1.0 - smoothstep(0.55, 0.8, sph)) : 0.0, GC.x * (1.0 - GC.y) * 0.8);
    float walk = sv == 0 ? se : 0.0;
    // la arana grande baja hasta la camara en el pico
    float approach = cA * smoothstep(0.30, 0.55, CL.w) * (1.0 - smoothstep(0.66, 0.85, CL.w));
    float babies = max(max(cA * CL.x * (1.0 - CL.z * 0.5), hit * loco), sv == 5 ? se : 0.0);
    // la presa: llega volando, queda pegada en la tela y la arana va por ella
    vec2 preyP = vec2(-0.25, 0.08) + vec2(cos(ss * 6.28), sin(ss * 6.28)) * (0.35 + 0.3 * fract(ss * 7.0));
    float prey = sv == 2 ? se : 0.0;
    float preyIn = smoothstep(0.05, 0.25, sph);
    vec3 moonC = mix(vec3(0.60, 0.70, 1.0), vec3(0.85, 0.80, 1.0), hkActVal(5.0));
    vec3 silk = mix(vec3(0.90, 0.92, 1.0), hsv2rgb(vec3(fract(0.78 + hue), 0.45, 1.0)), uD6);

    // --- fondo desenfocado ---
    vec3 col = plateCol(plate0(rUV(p0 + (p - p0) * 0.4)).rgb) * 1.15;
    // polvo flotando, fuera de foco
    float dust = hkParticles(p * 0.9, t * 0.12, 0.04 + high * 0.06, vec2(0.2, 0.1), 0.05);
    col += moonC * dust * (0.08 + high * 0.25);

    // --- tela ---
    vec2 C = vec2(-0.25, 0.08);
    float breeze = (0.015 + mid * 0.04 + gust * 0.10 + EST.z * 0.035) * sin(t * (0.9 + EST.z * 0.6)) + gust * 0.04 * sin(uRTime * 9.0);
    vec2 wp = p - C - vec2(breeze, breeze * 0.4) * smoothstep(0.0, 1.0, length(p - C));
    float r = length(wp);
    float a = atan(wp.y, wp.x);
    // radios en lugares FIJOS (30): D1 decide cuales estan, cada uno con su
    // punto de la perilla -- antes cambiaba la cantidad y la tela entera saltaba
    const float nSp = 30.0;
    float sector = TAU / nSp;
    float ai = floor(a / sector);
    float al = a - (ai + 0.5) * sector;
    float px = 1.4 / uResH * 2.0;            // ~1.4 px
    float webR = 1.05;
    float web = 0.0;
    float dew = 0.0;
    vec2 dewQ = vec2(0.0);
    if (r < webR + 0.02) {
        // radios
        float spoke = abs(sin(al)) * r;
        float spokeOn = smoothstep(0.0, 0.06, mix(0.45, 1.02, uD1) - hash21(vec2(ai, 51.0)) * 0.98);
        web = max(web, (1.0 - smoothstep(0.0, px, spoke)) * smoothstep(0.03, 0.06, r) * spokeOn);
        // espiral: tramos rectos entre radios (r del poligono)
        float rp = r * cos(al) / cos(0.0);
        const float nRing = 32.0;
        float spacing = (webR - 0.10) / nRing;
        float k = (rp - 0.10) / spacing + (hash21(vec2(ai, 3.0)) - 0.5) * 0.35;
        float ring = floor(k);
        // vibracion del golpe: cada vuelta con su fase
        float vib = (hit * (0.15 + uD4 * 0.6) + cA * CL.x * 0.5 * (1.0 - CL.z)) * sin(ring * 1.7 + uRTime * 30.0) * 0.25;
        // la presa forcejea: tiembla la tela a su alrededor
        vib += prey * preyIn * (1.0 - smoothstep(0.7, 0.9, sph)) * exp(-length(p - preyP) * 5.0) * sin(ring * 2.3 + uRTime * 24.0) * 0.3;
        float fk = fract(k + vib);
        float rd = abs(fk - 0.5) * spacing;
        float ringOn = smoothstep(0.0, 0.06, mix(0.40, 1.02, uD2) - hash21(vec2(ring, 52.0)) * 0.98);
        float onR = step(0.10, rp) * step(rp, webR) * step(ring, nRing - 1.0) * step(0.05, hash21(vec2(ring, ai + 17.0))) * ringOn;
        web = max(web, (1.0 - smoothstep(0.0, px, rd)) * onR);
        // gotas de rocio sobre la espiral
        float along = al * r / spacing * 1.2;
        float cid = floor(along);
        float hsd = hash21(vec2(ring * 13.0 + ai, cid));
        float has = step(1.0 - clamp(uD5 + EST.y * 0.5, 0.0, 1.0) * 0.6, hsd) * onR;
        vec2 dq = vec2((fract(along) - 0.5) * spacing / 1.2, (fk - 0.5) * spacing);
        float dr = spacing * (0.16 + 0.16 * hash21(vec2(cid, ring)));
        float dd = length(dq) - dr;
        if (has > 0.5 && dd < 0.0) { dew = 1.0; dewQ = dq / dr; }
        // hilos del marco hacia la viga y el poste
    }
    float frameT = 1e3;
    frameT = min(frameT, hwSeg(wp, vec2(0.0, webR), vec2(0.25, 0.78)));
    frameT = min(frameT, hwSeg(wp, vec2(-webR * 0.8, webR * 0.6), vec2(-2.10, 0.70)));
    frameT = min(frameT, hwSeg(wp, vec2(-webR, 0.0), vec2(-2.10, -0.20)));
    frameT = min(frameT, hwSeg(wp, vec2(webR * 0.7, webR * 0.7), vec2(1.30, 0.78)));
    frameT = min(frameT, hwSeg(wp, vec2(webR * 0.6, -webR * 0.8), vec2(1.6, -1.3)));
    web = max(web, 1.0 - smoothstep(0.0, px, frameT));
    // contraluz: los hilos brillan mas del lado de la luna, con tornasol
    float back = 0.55 + 0.45 * smoothstep(-1.0, 1.0, wp.x + wp.y) + bass * 0.4;
    vec3 irid = 0.5 + 0.5 * cos(TAU * (a * 0.3 + r * 2.0 + vec3(0.0, 0.33, 0.67)));
    col += silk * web * back * 0.32 * (0.6 + 0.4 * smoothstep(webR, 0.2, r)) + irid * web * 0.05;
    // EASTER EGG "JAY INFINITO" (fase 38): en el centro de la tela se teje
    // un infinito de hilo (primero un lazo, despues el otro) con rocio
    vec2 EG = hkEgg(8.0);
    if (EG.x > 0.0 && r < 0.6) {
        float ia = 0.42;
        float side = wp.x < 0.0 ? 0.0 : 1.0;
        vec2 lc = wp - vec2((side * 2.0 - 1.0) * ia * 0.62, 0.0);
        float ang = fract((atan(lc.y, -lc.x * (side * 2.0 - 1.0)) + PI) / TAU);
        float u = smoothstep(0.0, 0.7, EG.y) * 2.0 - side;          // cuanto del lazo ya esta tejido
        float woven = step(ang, u);
        float th = hkInfD(wp, ia);
        float thread = (1.0 - smoothstep(px * 0.6, px * 1.8, th)) * woven * EG.x;
        col += silk * thread * (0.9 + bass * 0.5);
        // gotitas de rocio sobre el hilo
        float dewI = step(0.82, hash21(floor(wp * 60.0))) * (1.0 - smoothstep(0.0, px * 2.5, th)) * woven;
        col += vec3(0.9, 0.95, 1.0) * dewI * EG.x * 1.2;
    }
    // suceso: la arana teje una vuelta nueva (brilla mientras se traza)
    if (sv == 3 && se > 0.0) {
        float rr0 = mix(0.25, 0.95, ss);
        float sweep = fract((a + PI) / TAU - sph * 1.6);
        float trace = smoothstep(0.0, 0.03, sph * 1.6 - (a + PI) / TAU) ;
        float ringG = (1.0 - smoothstep(0.0, px * 1.5, abs(r - rr0))) * trace;
        col += silk * ringG * se * 0.9 + silk * exp(-abs(r - rr0) * 60.0) * trace * se * 0.08;
    }
    // rocio: lente que refracta el fondo invertido, borde oscuro y destello
    if (dew > 0.5) {
        float rr = length(dewQ);
        vec3 refr = plateCol(plate0(rUV(p - dewQ * 0.35)).rgb) * 4.0 + moonC * 0.05;
        vec3 dc = mix(refr, refr * 0.25, smoothstep(0.75, 1.0, rr));
        float spark = exp(-dot(dewQ - vec2(0.35, 0.35), dewQ - vec2(0.35, 0.35)) * 25.0);
        float tw = 0.6 + 0.4 * sin(uRTime * (6.0 + hash21(dewQ) * 6.0) + rr * 30.0);
        dc += vec3(1.0) * spark * (0.8 + high * 2.5 * tw + (dv == 0 ? D.x * 3.0 * step(0.6, hash21(floor(p * 3.0) + D.w)) : 0.0));
        col = mix(col, dc, smoothstep(1.0, 0.85, rr));
    }

    // --- arana en su hilo ---
    float sz = (0.28 + uD3 * 0.22) * mix(1.0, 4.2, approach * approach);
    float hang = 0.25 + 0.30 * sin(t * 0.28) + 0.10 * sin(t * 0.71);
    vec2 sp = vec2(1.15, hang);
    // historia: camina hasta el centro de la tela y vuelve
    float wph = sph;
    vec2 centerPos = C + vec2(0.0, -0.05);
    sp = mix(sp, centerPos, walk * smoothstep(0.0, 0.4, wph) * (1.0 - smoothstep(0.6, 1.0, wph)));
    // la presa: va por ella en la segunda mitad
    sp = mix(sp, preyP + vec2(0.0, 0.10), prey * smoothstep(0.40, 0.65, sph) * (1.0 - smoothstep(0.85, 1.0, sph)));
    // B: se esconde en su rincon mientras pasan las aranitas
    sp = mix(sp, vec2(1.5, 0.75), cB * smoothstep(0.05, 0.2, CL.w) * (1.0 - smoothstep(0.85, 0.98, CL.w)));
    // climax: baja hacia la camara (crece y queda en el centro, arriba)
    sp = mix(sp, vec2(0.05, 0.55), approach);
    float curl = hit * (0.5 + uD4 * 0.5) - (dv == 3 ? D.x * 0.6 * sin(D.y * PI) : 0.0);
    // hilo de seda
    float drag = abs(p.x - sp.x) - px * 0.5;
    drag = max(drag, max(sp.y - p.y, p.y - 0.86));
    col += silk * (1.0 - smoothstep(0.0, px, drag)) * 0.35 * (1.0 - walk) * (1.0 - prey * smoothstep(0.40, 0.65, sph));
    // la presa: una polilla que llega volando y queda pegada
    if (prey > 0.0) {
        vec2 mp = mix(preyP + vec2(2.2, 0.6), preyP, preyIn);
        float stuck = step(0.25, sph);
        float fl = stuck > 0.5 ? 0.5 + 0.5 * sin(uRTime * 22.0) * (1.0 - smoothstep(0.65, 0.8, sph)) : 0.5 + 0.5 * sin(uRTime * 30.0);
        float md = hwMoth(rot2(0.4) * (p - mp) / 0.15, fl) * 0.15;
        float mm = (1.0 - smoothstep(-0.002, 0.002, md)) * prey * (1.0 - smoothstep(0.88, 1.0, sph));
        col = mix(col, vec3(0.60, 0.54, 0.44) * (0.5 + 0.6 * moonC) * (0.7 + 0.3 * noise21((p - mp) * 90.0)), mm);
        col += moonC * (1.0 - smoothstep(0.0, 0.006, abs(md))) * 0.25 * prey;
    }
    vec2 sq = (p - sp) / sz;
    sq = rot2(PI) * sq;                   // cuelga cabeza abajo
    if (dot(sq, sq) < 2.0) {
        vec2 abq;
        vec2 sd = hwSpider(sq, t, curl, abq);
        float m = 1.0 - smoothstep(-0.01, 0.01, sd.x);
        vec3 sc;
        if (sd.y > 1.5) {
            // abdomen: folio oscuro ondulado, puntos claros en cruz, brillo
            float fol = smoothstep(0.30, 0.26, abs(abq.x) - 0.25 * sin(abq.y * 6.0) * 0.3 - 0.15 * (1.0 - abq.y));
            vec3 base = mix(vec3(0.30, 0.20, 0.10), vec3(0.10, 0.06, 0.035), fol);
            float spots = smoothstep(0.10, 0.06, length(vec2(abq.x, fract(abq.y * 2.5) - 0.5) * vec2(1.0, 1.8))) * step(abs(abq.x), 0.1);
            spots = max(spots, smoothstep(0.08, 0.05, length(abq - vec2(0.0, 0.2) - vec2(0.18 * sign(abq.x), 0.0))));
            base = mix(base, vec3(0.75, 0.72, 0.62), spots * 0.8);
            vec3 n = normalize(vec3(abq * 0.9, sqrt(max(1.0 - dot(abq, abq), 0.0)) + 0.1));
            float dif = max(dot(n, normalize(vec3(0.5, 0.5, 0.7))), 0.0);
            float spec = pow(max(dot(reflect(-normalize(vec3(0.5, 0.5, 0.7)), n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
            sc = base * (0.25 + 0.9 * dif) * moonC * 1.2 + vec3(0.6, 0.65, 0.8) * spec * 0.5;
        } else if (sd.y > 0.5) {
            sc = vec3(0.14, 0.09, 0.05) * 1.1 * moonC;
            vec2 eq = sq - vec2(0.0, 0.25);
            sc += vec3(0.7) * smoothstep(0.02, 0.0, length(vec2(abs(eq.x) - 0.04, eq.y)) - 0.012);
        } else {
            // patas con bandas claras y oscuras
            float band = step(0.5, fract(length(sq) * 9.0));
            sc = mix(vec3(0.08, 0.05, 0.03), vec3(0.32, 0.24, 0.14), band) * moonC;
        }
        // pelitos en el borde, a contraluz
        float fuzz = (1.0 - smoothstep(0.0, 0.035, abs(sd.x))) * (0.5 + 0.5 * noise21(sq * 60.0));
        col = mix(col, sc, m);
        col += moonC * fuzz * 0.12 * (1.0 - m * 0.5);
    }

    // --- PIANO: aranitas que bajan colgadas en la posicion de la tecla ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.05, 0.9);
        if (e < 0.01) continue;
        float vel = keyVel(k), age = keyAge(k), rel = keyRelAge(k);
        float bx = hkKeyX(k) * 0.92;
        float drop = min(age * (0.8 + vel), 0.55 + vel * 0.6);
        float by = 0.86 - drop + rel * rel * 6.0 + keyHeld(k) * 0.03 * sin(uKclock * 3.0 + float(k));
        bx += keyHeld(k) * 0.04 * sin(uKclock * 1.6 + float(k) * 2.0) * smoothstep(0.3, 1.0, age);
        float th = max(abs(p.x - bx) - px * 0.4, max(by - p.y, p.y - 0.86));
        col += silk * (1.0 - smoothstep(0.0, px, th)) * 0.30 * e;
        float bs = 0.10 + vel * 0.07;
        vec2 bq = rot2(PI) * (p - vec2(bx, by)) / bs;
        if (dot(bq, bq) > 2.0) continue;
        vec2 aq;
        vec2 bd = hwSpider(bq, uKclock * 2.0 + float(k), 0.0, aq);
        float bm = 1.0 - smoothstep(-0.02, 0.02, bd.x);
        col = mix(col, vec3(0.03, 0.022, 0.015), bm * e);
        col += moonC * (1.0 - smoothstep(0.0, 0.05, abs(bd.x))) * 0.15 * e * (1.0 - bm);
    }

    // --- B: la invasion, aranitas que cruzan la tela hasta el centro ---
    if (cB > 0.0) {
        float go = smoothstep(0.05, 0.55, CL.w), back2 = smoothstep(0.75, 0.97, CL.w);
        for (int i = 0; i < 22; i++) {
            float fi = float(i);
            float ang = fi * 2.39996 + 0.3;
            float r0 = 2.6 + hash21(vec2(fi, 2.0)) * 0.6;
            float rr = mix(r0, 0.12 + 0.35 * hash21(vec2(fi, 5.0)), go * smoothstep(0.0, 0.25, go - hash21(vec2(fi, 8.0)) * 0.5));
            rr = mix(rr, r0 + 0.5, back2);
            vec2 bc = C + vec2(cos(ang), sin(ang) * 0.75) * rr;
            vec2 bq = (p - bc) / 0.12;
            if (dot(bq, bq) > 2.0) continue;
            bq = rot2(-ang - PI * 0.5 + (back2 > 0.5 ? PI : 0.0)) * bq;
            vec2 aq;
            vec2 bd = hwSpider(bq, uRTime * 9.0 + fi, 0.0, aq);
            col = mix(col, vec3(0.10, 0.07, 0.04) * moonC, 1.0 - smoothstep(-0.02, 0.02, bd.x));
            col += silk * (1.0 - smoothstep(0.0, 0.05, abs(bd.x))) * 0.30;
        }
    }
    // --- suceso: una gota corre por un radio y cae ---
    if (sv == 6 && se > 0.0) {
        float ang = (ss - 0.5) * 1.6 - 1.57;
        vec2 dir = vec2(cos(ang), sin(ang));
        float run = smoothstep(0.05, 0.6, sph);
        vec2 dp = C + dir * mix(0.15, 1.0, run);
        if (sph > 0.6) dp = C + dir * 1.0 + vec2(0.0, -(sph - 0.6) * (sph - 0.6) * 12.0);
        float dd = length((p - dp) / vec2(1.0, 1.25)) - 0.014;
        col = mix(col, plateCol(plate0(rUV(p * 0.6)).rgb) * 3.5, (1.0 - smoothstep(-0.002, 0.002, dd)) * se);
        col += vec3(1.0) * exp(-dot(p - dp - vec2(0.004, 0.006), p - dp - vec2(0.004, 0.006)) * 60000.0) * se;
        col += silk * exp(-abs(dot(p - C, vec2(-dir.y, dir.x))) * 900.0) * step(0.0, dot(p - C, dir)) * step(dot(p - C, dir), length(dp - C)) * se * 0.25 * step(sph, 0.6);
    }
    // --- suceso: una polilla grande aletea en la luz del fondo (fuera de foco) ---
    if (sv == 4 && se > 0.0) {
        vec2 mp = vec2(1.45 + 0.35 * sin(sph * 9.0), 0.25 + 0.25 * sin(sph * 13.0 + 1.0));
        float md = hwMoth((p - mp) / 0.55, 0.5 + 0.5 * sin(uRTime * 14.0)) * 0.55;
        col = mix(col, col * 0.12, (1.0 - smoothstep(-0.05, 0.05, md)) * se);
    }
    // --- detalles: un mosquito; un hilo suelto que se mece ---
    if (dv == 2) {
        vec2 mq = vec2(mix(-2.6, 2.6, D.y), 0.2 + 0.4 * D.w + 0.08 * sin(D.y * 40.0));
        col += moonC * exp(-dot(p - mq, p - mq) * 40000.0) * D.x * 1.2;
    }
    if (dv == 1) {
        vec2 top = vec2(-1.6 + D.w * 3.0, 0.86);
        float sw = 0.12 * sin(uRTime * 2.0) * D.x;
        float yk = clamp((top.y - p.y) / 0.9, 0.0, 1.0);
        float th = max(abs(p.x - top.x - sw * yk * yk) - px * 0.4, max(p.y - top.y, top.y - 0.9 - p.y));
        col += silk * (1.0 - smoothstep(0.0, px, th)) * 0.35 * D.x;
    }
    if (dv == 4) col += moonC * hkParticles(p * 1.4, t * 0.3, 0.12, vec2(0.1, 0.2), 0.04) * D.x * 0.6 * smoothstep(0.6, 1.6, p.x);

    // --- locura y climax: aranitas que bajan por sus hilos ---
    if (babies > 0.05) {
        for (int i = 0; i < 6; i++) {
            float fi = float(i);
            float bx = -1.8 + fi * 0.75 + 0.2 * hash21(vec2(fi, 3.0));
            float by = 0.86 - fract(uRTime * 0.3 + hash21(vec2(fi, 4.0))) * 1.6;
            float th = max(abs(p.x - bx) - px * 0.4, max(by - p.y, p.y - 0.86));
            col += silk * (1.0 - smoothstep(0.0, px, th)) * 0.2 * babies;
            vec2 bq = rot2(PI) * (p - vec2(bx, by)) / 0.06;
            if (dot(bq, bq) > 2.0) continue;
            vec2 aq;
            vec2 bd = hwSpider(bq, t * 2.0 + fi, 0.0, aq);
            col = mix(col, vec3(0.03), (1.0 - smoothstep(-0.02, 0.02, bd.x)) * babies);
        }
    }

    // --- vigas y telaranas viejas (adelante, nitidas) ---
    vec4 bm = plate1(rUV(p));
    col = mix(col, plateCol(bm.rgb) * 1.5 * (0.8 + 0.3 * moonC), bm.a);

    // --- C: una telarana gigante se teje delante de la camara ---
    if (cC > 0.0) {
        float weave = smoothstep(0.05, 0.45, CL.w);
        float tear = smoothstep(0.78, 0.92, CL.w);
        vec2 fq = p0 - vec2(0.15, 0.05) + vec2(tear * tear * 0.0, -tear * tear * 2.5);
        float fr = length(fq), fa = atan(fq.y, fq.x);
        float sec = TAU / 14.0;
        float fai = floor(fa / sec);
        float fal = fa - (fai + 0.5) * sec;
        float on = step(hash21(vec2(fai, 61.0)) * 0.6 + (fai + 7.0) / 14.0 * 0.4, weave);
        float lw = 0.006 + 0.004 * fr;
        float spk = (1.0 - smoothstep(0.0, lw, abs(sin(fal)) * fr)) * on;
        float rp = fr * cos(fal);
        float sp2 = 0.20;
        float ringK = floor(rp / sp2);
        float ringOn = step(ringK / 14.0, weave - 0.3) * step(0.3, rp);
        float rg = (1.0 - smoothstep(0.0, lw, abs(fract(rp / sp2) - 0.5) * sp2)) * ringOn;
        float fw = max(spk, rg) * (1.0 - tear);
        vec3 fwc = silk * (0.30 + bass * 0.3) * (0.7 + 0.3 * sin(fr * 6.0 - uRTime));
        col = mix(col, col * 0.6 + fwc, fw * 0.85);
        // la arana enorme la cruza por encima
        float cross = clamp((CL.w - 0.45) / 0.30, 0.0, 1.0);
        if (cross > 0.0 && cross < 1.0) {
            vec2 gq = rot2(-1.2) * (p0 - vec2(mix(-3.4, 3.4, cross), mix(0.6, -0.4, cross))) / 1.6;
            if (dot(gq, gq) < 2.0) {
                vec2 aq;
                vec2 gd = hwSpider(gq, uRTime * 4.0, 0.0, aq);
                col = mix(col, vec3(0.012, 0.009, 0.006), 1.0 - smoothstep(-0.01, 0.01, gd.x));
                col += moonC * (1.0 - smoothstep(0.0, 0.03, abs(gd.x))) * 0.10;
            }
        }
    }

    col = audioLift(col, high * 0.08);
    // LUZ DE TECLA (fase 37): la tela se ilumina donde baja la arana
    col = hkKeyLit(col, p, 0.45, vec2(0.22, 0.55), vec3(0.7, 0.8, 1.0), vec3(0.85, 1.0, 0.85), 0.05, 0.9);
    return vec4(hkFinish(col, uv, vec3(0.5, 0.5, 0.8)), 1.0);
}
