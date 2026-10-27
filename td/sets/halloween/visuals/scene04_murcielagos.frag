// ===============================================================
// HALLOWEEN 04 - MURCIELAGOS Y CASTILLO
// Un castillo gotico sobre un acantilado de roca, con la luna enorme
// detras, montanas lejanas, niebla en el valle y un arbol muerto en
// primer plano (LAMINAS horneadas, plates/scene04, ver
// td/tools/bake_plates_castillo.py). Bandadas de murcielagos en tres
// profundidades cruzan la luna; las ventanas se encienden en vivo, cada
// una con su vela, y en lo alto de la torre mayor late la ventana roja
// del vampiro.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> halo de la luna y la ventana roja del vampiro
//   medios -> la bandada ondula; el arbol se mece
//   agudos -> titilan las estrellas; los murcielagos lejanos aletean
//   golpe  -> la bandada se dispersa (D4) y parpadean las ventanas;
//             con Chaos: relampago y murcielagos que vienen a la camara
// PIANO: cada tecla suelta una bandadita desde el castillo en esa posicion
//   (la fuerza: mas grandes y rapidos); apretada, dan vueltas alrededor
//   del punto; al soltarla salen volando hacia la camara.
// Speed mueve la bandada, las nubes y la niebla aun en silencio.
// Cada acto cambia el color de la luna.
// REPERTORIO (fase 31, motor hkSuceso del kit):
//   ESTADOS (~5 min): noche clara, tormenta (un relampago cada tanto, a lo
//     sumo uno cada 5 s) y niebla en el valle (sube hasta el acantilado).
//   SUCESOS (~55 s, 7): cruza una bandada enorme; un murcielago gigante
//     cruza la luna; alguien recorre el castillo con una vela (las
//     ventanas se prenden a su paso); el vampiro camina por el puente
//     contra la luna; un rayo cae en el pararrayos de la torre; de la
//     ventana roja sale volando el vampiro hacia la camara; la niebla
//     trepa por el acantilado.
//   DETALLES (~30 s, 5): estrella fugaz, una ventana se apaga, un
//     murcielago pasa muy cerca de la camara, una nube tapa la luna, chispa
//     en el pararrayos.
//   CLIMAX (~4 min, 22 s, rotan 3 guiones en tres tiempos):
//     A el remolino: los murcielagos se juntan frente a la luna, la luna
//       se tine de sangre y el remolino revienta hacia la camara.
//     B el baile: el castillo se enciende entero por dentro, las ventanas
//       cambian de color con la musica y dos haces barren el cielo.
//     C el rayo: tres rayos caen en la torre y las ventanas se prenden
//       fuego desde arriba; humo y la luna roja; despues se apaga.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con tormenta.
// @EST: noche clara | tormenta | niebla en el valle
// @SUC: bandada enorme | murcielago gigante | la vela recorre el castillo | el vampiro en el puente | rayo en el pararrayos | sale el vampiro | la niebla trepa
// @DET: estrella fugaz | ventana que se apaga | murcielago cerca | nube en la luna | chispa en el pararrayos
// @CLX: A el remolino | B el baile | C el rayo
//
// @D1: cantidad de murcielagos (llegan de a uno, desde lejos)
// @D2: tamano de la luna
// @D3: velocidad del aleteo
// @D4: cuanto se dispersan con el golpe
// @D5: color de la luna (palida <-> sangre)
// @D6: luz de las ventanas
// ===============================================================

const vec4 FAR_R = vec4(-3.1, -1.0, 6.2, 1.30);
const vec4 CAS_R = vec4(-2.2, -1.1, 3.2, 2.00);
const vec4 NEAR_R = vec4(-3.1, -1.2, 6.2, 2.40);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// Murcielago de ~1 de envergadura. flap -1..1.
float hwBat(vec2 p, float flap) {
    float ax = abs(p.x);
    float body = length(p / vec2(0.07, 0.13)) - 1.0;
    body *= 0.07;
    vec2 ep = vec2(ax - 0.035, p.y - 0.13);
    float ear = max(abs(ep.x) * 2.2 + ep.y - 0.06, -ep.y);
    body = min(body, ear);
    float y = p.y - flap * 0.35 * ax;
    float top = 0.07 + 0.10 * sin(ax * 4.2) - 0.22 * ax * ax;
    float span = 0.52;
    float thick = 0.20 * (1.0 - ax / span) + 0.05;
    float scallop = 0.05 * abs(sin(ax * PI * 3.0 / span));
    float bottom = top - thick + scallop;
    float wing = max(max(y - top, bottom - y), max(ax - span, 0.04 - ax));
    return min(body, wing);
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 pc = hkCam(p0);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.01);

    vec2 dolly = vec2(sin(uRTime * 0.03) * 0.12 + sin(uRTime * 0.011 + 3.0) * 0.06, 0.0);
    vec2 pS = p0 + (pc - p0) * 0.5 + dolly * 0.05;
    vec2 pF = pc + dolly * 0.25, pC = pc + dolly * 0.55, pN = pc + dolly * 1.2;

    // --- calendario (fase 31) ---
    hkSetClimax(4.0, 22.0, 26.0);
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
    // lugares del castillo (en el espacio pC)
    const vec2 ROD = vec2(0.60, 0.80);        // punta de la torre de la derecha (pararrayos)
    const vec2 STRIKE = vec2(-0.57, 0.82);    // torre del medio, donde caen los rayos del C
    const vec2 VWIN = vec2(-1.00, 0.55);      // ventana roja del vampiro
    // B: el castillo de fiesta
    float ball = cB * smoothstep(0.08, 0.30, C.w) * (1.0 - smoothstep(0.80, 0.96, C.w));
    // C: tres rayos en la torre y fuego que baja por las ventanas
    float strikeK = 0.0;
    for (int k = 0; k < 3; k++) {
        float d = C.w - (0.30 + float(k) * 0.11);
        strikeK = max(strikeK, cC * smoothstep(0.0, 0.003, d) * (1.0 - smoothstep(0.003, 0.03, d)));
    }
    float fireOn = cC * smoothstep(0.30, 0.34, C.w) * (1.0 - smoothstep(0.84, 0.98, C.w));
    float fireR = smoothstep(0.30, 0.72, C.w) * 2.6;
    // suceso: rayo en el pararrayos (dos golpes seguidos)
    float rodK = 0.0;
    if (sv == 4) for (int k = 0; k < 2; k++) {
        float d = sp - (0.30 + float(k) * 0.035);
        rodK = max(rodK, se * smoothstep(0.0, 0.004, d) * (1.0 - smoothstep(0.004, 0.04, d)) * (1.0 - float(k) * 0.35));
    }
    // tormenta: a lo sumo un relampago cada 5 s
    float fslot = floor(uRTime / 5.0);
    float fk = uRTime - fslot * 5.0 - 3.5 * hash21(vec2(fslot, 9.0));
    float stormK = EST.y * step(0.45, hash21(vec2(fslot, 5.0))) * smoothstep(0.0, 0.05, fk) * (1.0 - smoothstep(0.10, 0.55, fk));

    // --- cielo y estrellas (los agudos las hacen titilar) ---
    vec3 col = mix(hsv2rgb(vec3(fract(0.70 + hue), 0.75, 0.20)),
                   hsv2rgb(vec3(fract(0.66 + hue), 0.85, 0.02)),
                   smoothstep(-0.6, 1.0, pS.y));
    vec2 sg = floor(pS * 90.0);
    float sh = hash21(sg);
    float tw = 0.5 + 0.5 * sin(t * (2.0 + sh * 4.0) * (1.0 + high * 2.0) + sh * 30.0);
    col += vec3(0.8, 0.8, 1.0) * step(0.993, sh) * tw * (0.6 + high * 0.8) * smoothstep(-0.2, 0.6, pS.y);

    // --- luna (lamina con crateres) ---
    vec2 mc = vec2(0.35, 0.28);
    float moonR = hkDR(0.25, 0.57, 0.95, uD2);
    vec2 mp = pS - mc;
    float mr = length(mp);
    vec3 pale = vec3(1.0, 0.93, 0.78);
    vec3 blood = hsv2rgb(vec3(fract(0.015 + hue), 0.85, 1.0));
    float bloodE = cA * max(C.y, C.z * 0.8) + fireOn * 0.6;
    vec3 moonC = mix(pale, blood, clamp(uD5 + hkActVal(5.0) * 0.25 + bloodE, 0.0, 1.0));
    col += moonC * exp(-max(mr - moonR, 0.0) * 4.0) * (0.22 + bass * 0.45);
    col += moonC * exp(-pow((mr - moonR * 1.6) * 12.0, 2.0)) * 0.04;
    float disk = 0.0;
    if (mr < moonR * 1.02) {
        vec4 mt = plate5(mp / (moonR * 2.0) + 0.5);
        disk = mt.a;
        col = mix(col, moonC * mt.r * 1.1, mt.a);
    }
    col += moonC * hkRays(pS, mc, t, 14.0) * 0.16 * (1.0 - disk) * hkStyleRays();
    col = hkStyleMoon(col, pS, mc, moonR);
    // EASTER EGG "JAY INFINITO" (fase 38): una fila de murcielagos vuela
    // frente a la luna dibujando un infinito
    vec2 EG = hkEgg(4.0);
    if (EG.x > 0.0) {
        float a = moonR * 1.05 * hkEggS;                     // fase 39: mas chico
        vec2 bp = pS - mc - vec2(0.0, 0.12);
        if (abs(bp.x) < a * 1.25 && abs(bp.y) < a * 0.6) {
            float bd = 1e3;
            for (int i = 0; i < 30; i++) {
                float ph = float(i) / 30.0 * 6.2832 + uRTime * 0.5;
                vec2 q = (bp - hkInfPath(ph, a)) / (0.065 * hkEggS);
                if (dot(q, q) > 2.0) continue;
                bd = min(bd, hwBat(q, sin(uRTime * 14.0 + float(i) * 1.7)) * 0.065 * hkEggS);
            }
            float bm = (1.0 - smoothstep(0.0, 0.003, bd)) * smoothstep(0.0, 0.3, EG.x) * smoothstep(0.0, 0.25, EG.y);
            col = mix(col, vec3(0.015, 0.01, 0.02), bm);
        }
    }
    // detalle: estrella fugaz
    if (dv == 0) {
        vec2 s0 = vec2((D.w - 0.5) * 3.2, 0.95);
        vec2 sd = normalize(vec2(ss > 0.5 ? 0.8 : -0.8, -0.35));
        vec2 rel = pS - (s0 + sd * D.y * 1.3);
        float along = dot(rel, sd), perp = abs(rel.x * sd.y - rel.y * sd.x);
        col += vec3(0.9, 0.9, 1.0) * exp(-perp * 500.0) * smoothstep(-0.30, 0.0, along) * step(along, 0.0)
             * (1.0 + along * 3.0) * D.x * 1.5;
    }
    // relampago: el del golpe con Chaos, la tormenta y el gran climax caen al azar;
    // el del pararrayos y los del C caen donde corresponde
    float zap = max(hit * smoothstep(0.4, 0.9, loco), max((G.y + G.z) * step(0.85, noise21(vec2(uRTime * 6.0, 1.0))), stormK));
    float zapT = max(rodK, strikeK);
    float bslot = floor(uRTime * 1.5);
    float bx = (hash21(vec2(bslot, 2.0)) - 0.5) * uAspect * 1.6;
    float bd = hkBolt(pS, bx, 1.05, -0.35, bslot * 5.0, 0.4);
    col += vec3(0.8, 0.75, 1.0) * (exp(-bd * 160.0) + exp(-bd * 20.0) * 0.3) * zap * 1.5;
    vec2 tgt = cC > 0.0 ? STRIKE : ROD;
    float bdT = hkBolt(pC, tgt.x, 1.08, tgt.y, floor(C.w * 9.0) + floor(sp * 30.0) + 3.0, 0.22);
    col += vec3(0.85, 0.8, 1.0) * (exp(-bdT * 180.0) + exp(-bdT * 22.0) * 0.35) * zapT * 1.6;
    if (zapT > zap) bx = tgt.x;
    zap = max(zap, zapT);
    col += vec3(0.5, 0.45, 0.8) * zap * 0.15;
    // nubes que cruzan la luna, con borde iluminado
    float cl = plate4Wrap(vec2(pS.x * 0.12 - t * 0.005, pS.y * 0.45 + 0.2)).r;
    float cm = smoothstep(0.55, 0.78, cl);
    float crim = smoothstep(0.50, 0.58, cl) - smoothstep(0.58, 0.72, cl);
    col = mix(col, col * 0.30 + vec3(0.01, 0.01, 0.02), cm * 0.85 * smoothstep(-0.3, 0.2, pS.y));
    col += moonC * crim * exp(-max(mr - moonR * 0.8, 0.0) * 2.5) * 0.35;
    // detalle: una nube oscura tapa la luna
    if (dv == 3) {
        vec2 cq = (pS - vec2(mc.x + (D.y - 0.5) * 2.6 * (ss > 0.5 ? 1.0 : -1.0), mc.y + (D.w - 0.5) * 0.4)) / vec2(0.75, 0.16);
        float cloud = smoothstep(1.0, 0.3, length(cq) + 0.25 * noise21(pS * 6.0));
        col = mix(col, col * 0.18 + vec3(0.01, 0.01, 0.02), cloud * D.x * 0.9);
        col += moonC * smoothstep(0.85, 0.7, length(cq)) * (1.0 - cloud) * D.x * 0.10;
    }
    // B: dos haces barren el cielo desde las torres
    if (ball > 0.0) {
        for (int i = 0; i < 2; i++) {
            float fi = float(i);
            vec2 src = i == 0 ? vec2(-1.02, 0.90) : ROD;
            float a = sin(uRTime * (0.55 + fi * 0.2) + fi * 2.0) * 0.55 + (fi - 0.5) * 1.6;
            vec2 dir = vec2(sin(a), cos(a));
            vec2 rel = pC - src;
            float along = dot(rel, dir), perp = abs(rel.x * dir.y - rel.y * dir.x);
            float beam = along > 0.0 ? exp(-perp / (along * 0.10 + 0.008)) * exp(-along * 0.45) : 0.0;
            col += hsv2rgb(vec3(fract(0.10 + fi * 0.5 + floor(uRTime * 0.5) * 0.13), 0.55, 1.0)) * beam * ball * (0.60 + bass * 0.50);
        }
    }

    // --- montanas lejanas ---
    vec4 far = plate0(rUV(pF, FAR_R));
    vec3 farC = mix(col * 0.55, moonC * 0.06 + vec3(0.02, 0.02, 0.04), 0.5) * (0.5 + 0.8 * far.r);
    col = mix(col, farC, far.a);

    col = hkStyleBacklight(col, pF, -0.30, 0.45);   // estilo: resplandor detras del castillo
    // --- castillo y ventanas ---
    vec2 cu = rUV(pC, CAS_R);
    vec4 cas = plate1(cu);
    if (cas.a > 0.0) {
        // relieve horneado (RG normal, B id de ventana): la luna marca torres y
        // roca, y el relampago entra por el lado donde cae
        vec4 cr = plate2(cu);
        vec3 cn = vec3(cr.rg * 2.0 - 1.0, 0.0);
        cn.z = sqrt(max(1.0 - dot(cn.xy, cn.xy), 0.0));
        vec3 alb = plateCol(cas.rgb);
        vec3 Lm = normalize(vec3(mc.x - pC.x, 0.9, 0.7));
        float moonRel = max(1.0 + 1.1 * (dot(cn, Lm) - Lm.z), 0.25);
        vec3 Lb = normalize(vec3(clamp((bx - pC.x) * 0.6, -1.2, 1.2), 0.8, 0.5));
        vec3 cc = alb * (0.9 + 0.6 * dot(moonC, vec3(0.33))) * 1.3 * moonRel * hkStyleSil();
        cc += alb * vec3(0.8, 0.75, 1.0) * zap * (0.8 + 6.0 * max(dot(cn, Lb), 0.0));
        // B: la piedra toma la luz de la fiesta; C: la del incendio
        cc += alb * vec3(1.0, 0.7, 0.45) * ball * (0.45 + bass * 0.35);
        cc += alb * vec3(1.0, 0.35, 0.08) * fireOn * smoothstep(0.0, 0.5, fireR - length(pC - STRIKE)) * (1.2 + 0.4 * noise21(vec2(t * 5.0, pC.x * 3.0)));
        col = mix(col, cc, cas.a);
        float wid = cr.b;
        if (wid > 0.01) {
            float idq = floor(wid * 24.0 + 0.5);
            float candle = 0.75 + 0.25 * sin(t * (7.0 + idq) + idq * 3.0) + 0.15 * noise21(vec2(t * 3.0, idq));
            // cada tanto una ventana se prende o se apaga, con fundido
            float ws = uRTime * 0.08 + idq * 0.3;
            float on = mix(step(0.25, hash21(vec2(idq, floor(ws) - 1.0))), step(0.25, hash21(vec2(idq, floor(ws)))),
                           smoothstep(0.0, 0.12, fract(ws)));
            // el golpe hace parpadear algunas
            on *= 1.0 - hit * step(0.55, hash21(vec2(idq, floor(uRTime * 6.0))));
            // detalle: una ventana se apaga
            if (dv == 1 && abs(idq - (1.0 + floor(D.w * 7.0) * 3.0)) < 0.5) on *= 1.0 - D.x;
            // suceso: alguien recorre el castillo con una vela
            float walk = sv == 2 ? se * exp(-pow((pC.x - mix(-2.0, 0.75, ss > 0.5 ? sp : 1.0 - sp)) / 0.09, 2.0)) : 0.0;
            on = max(on, max(walk, ball));
            vec3 wc = vec3(1.0, 0.62, 0.25) * candle * on * (hkDR(0.0, 1.5, 3.5, uD6) + walk * 1.2);
            // B: de fiesta, cada ventana con su color, que cambia con la musica
            vec3 party = hsv2rgb(vec3(fract(idq * 0.23 + floor(uRTime * 0.5 + idq * 0.07) * 0.31), 0.85, 1.0));
            wc = mix(wc, party * (1.8 + bass * 1.0), ball * 0.9);
            // C: el fuego baja desde la torre del rayo
            float burn = fireOn * smoothstep(0.0, 0.25, fireR - length(pC - STRIKE));
            vec3 fire = mix(vec3(1.0, 0.12, 0.02), vec3(1.0, 0.55, 0.10), noise21(vec2(t * 6.0, idq * 3.0))) * (2.2 + bass);
            wc = mix(wc, fire, burn);
            // ventana roja del vampiro en lo alto de la torre mayor
            if (abs(idq - 9.0) < 0.5) {
                float vfl = sv == 5 ? se * (1.0 - smoothstep(0.25, 0.45, sp)) : 0.0;
                wc = vec3(1.0, 0.08, 0.05) * (0.8 + bass * 2.0 + hit + vfl * 3.0);
            }
            col = mix(col, wc, smoothstep(0.0, 0.02, wid));
        }
    }
    // halo de las ventanas y niebla del valle
    col += vec3(1.0, 0.6, 0.25) * 0.05 * (hkDR(0.0, 0.9, 2.2, uD6) + ball * 2.5) * exp(-abs(pC.y + 0.1) * 3.0) * smoothstep(1.4, 0.2, abs(pC.x + 0.6));
    // C: resplandor del incendio y humo que sube
    if (fireOn > 0.0) {
        col += vec3(1.0, 0.35, 0.06) * fireOn * smoothstep(0.0, 0.8, fireR) * 0.40 * (0.8 + bass * 0.6)
             * exp(-abs(pC.y - 0.2) * 1.5) * smoothstep(1.6, 0.3, abs(pC.x + 0.6));
        float smk = plate4Wrap(vec2(pC.x * 0.5 + sin(pC.y * 2.0 + t * 0.3) * 0.05, pC.y * 0.3 - t * 0.05)).r;
        float plume = exp(-pow((pC.x - STRIKE.x - (pC.y - STRIKE.y) * 0.35) / (0.12 + (pC.y - STRIKE.y) * 0.25), 2.0)) * step(STRIKE.y - 0.05, pC.y);
        col = mix(col, vec3(0.05, 0.035, 0.03), smoothstep(0.35, 0.75, smk) * plume * fireOn * smoothstep(0.3, 1.2, fireR) * 0.95);
    }
    // la niebla del valle (con el estado niebla y el suceso, trepa por el acantilado)
    float climb = EST.z * 0.22 + (sv == 6 ? se * smoothstep(0.0, 0.6, sp) * 0.60 : 0.0);
    float fz = plate4Wrap(vec2(pF.x * 0.10 - t * 0.006, pF.y * 0.4)).g;
    float vfog = smoothstep(0.38 - climb * 0.3, 0.78, fz) * exp(-pow((pF.y + 0.78 - climb) / (0.20 + climb * 0.5), 2.0));
    col = mix(col, moonC * 0.10 + vec3(0.03, 0.03, 0.06), min(vfog * (0.6 + climb * 0.8), 0.9));

    // --- suceso: el vampiro camina por el puente contra la luna ---
    if (sv == 3 && se > 0.0) {
        float vx = mix(0.10, 0.50, ss > 0.5 ? sp : 1.0 - sp);
        vec2 vq = pC - vec2(vx, -0.30);
        float cape = 1.0 + hit * 0.5 + 0.1 * sin(t * 3.0);
        float hgt = 0.16;
        // capa: trapecio que se abre abajo
        float yk = clamp(vq.y / hgt, 0.0, 1.0);
        float body = max(abs(vq.x) - mix(0.045 * cape, 0.018, yk), max(-vq.y, vq.y - hgt));
        // cuello alto de la capa
        body = min(body, max(abs(vq.x) - 0.030, abs(vq.y - hgt + 0.005) - 0.018 + abs(vq.x) * 0.6));
        float head = length(vq - vec2(0.0, hgt + 0.020)) - 0.018;
        float vs = min(body, head);
        col = mix(col, vec3(0.0), (1.0 - smoothstep(-0.002, 0.002, vs)) * se);
        col += moonC * (1.0 - smoothstep(0.0, 0.004, abs(vs))) * disk * se * 0.4;
    }

    // --- bandadas en tres profundidades ---
    float swarmE = sv == 0 ? se : 0.0;
    float presence = clamp(hkDR(0.0, 0.525, 0.95, uD1) + uDensity * 0.10 + swarmE * 0.45, 0.0, 0.95);
    float bats = 1e3;
    float batRim = 0.0;
    for (int L = 0; L < 3; L++) {
        float fl = float(L);
        float depth = 1.25 - fl * 0.35;
        float cs = 0.62 * depth;
        vec2 q0 = pS + vec2(t * (0.10 + 0.05 * fl) * depth, 0.0);
        // la bandada ondula con los medios
        q0.y += sin(q0.x * 1.3 + t * 0.6) * (0.04 + mid * 0.12) * depth;
        vec2 cid = floor(q0 / cs);
        if (cid.y * cs < -0.75 || cid.y * cs > 1.1) continue;
        vec2 h = hash22(cid + fl * 13.0);
        // D1 suma murcielagos de a uno: el nuevo llega de lejos (crece)
        float appear = smoothstep(0.0, 0.08, presence - hash21(cid + fl * 7.0 + 0.5));
        // easter egg: la bandada deja libre la luna para que se lea el infinito
        appear *= 1.0 - EG.x * 0.95 * (1.0 - smoothstep(moonR * 1.2, moonR * 1.8, length((cid + 0.5) * cs - vec2(t * (0.10 + 0.05 * fl) * depth, 0.0) - mc)));
        if (appear < 0.01) continue;
        vec2 center = (cid + 0.5 + (h - 0.5) * 0.35) * cs;
        center.y += 0.06 * sin(t * (0.8 + h.x) + h.y * 9.0);
        vec2 world = center - vec2(t * (0.10 + 0.05 * fl) * depth, 0.0);
        vec2 away = normalize(world - mc + 1e-4);
        center += (away + (h - 0.5)) * hit * hkDR(0.0, 0.08, 0.25, uD4) * depth;
        float scale = 0.17 * depth * (1.0 + hit * loco * 0.6 * h.x + swarmE * 0.25) * mix(0.15, 1.0, appear);
        vec2 bq = (q0 - center) / scale;
        if (dot(bq, bq) > 0.6) { bats = min(bats, (length(bq) - 0.55) * scale); continue; }
        float fspd = (9.0 + uD3 * 12.0) * (0.8 + h.y * 0.4) * (1.0 + high * 0.5 * fl);
        float flap = sin(t * fspd + h.x * 20.0);
        bq = rot2((h.x - 0.5) * 0.5) * bq;
        float bd2 = hwBat(bq, flap) * scale;
        bats = min(bats, bd2);
    }
    // --- PIANO: bandaditas que salen del castillo ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.05, 2.5);
        if (e < 0.01) continue;
        float vel = keyVel(k), age = keyAge(k), rel = keyRelAge(k);
        vec2 org = vec2(hkKeyX(k) * 0.8, -0.15 + 0.25 * fract(keyPos(k) * 5.7));
        for (int b = 0; b < 5; b++) {
            float fb = float(b);
            float a = fb * 1.2566 + keyPos(k) * 20.0;
            vec2 dir = vec2(cos(a), sin(a) * 0.6 + 0.35);
            // salen en abanico, dan vueltas mientras la tecla siga apretada,
            // y al soltarla vuelan hacia la camara (crecen y se abren)
            vec2 c = org + dir * min(age, 0.5) * (0.5 + vel * 0.4)
                   + vec2(cos(a + age * 2.6), sin(a + age * 2.6) * 0.5) * 0.10 * (1.0 - smoothstep(0.0, 0.3, rel))
                   + dir * rel * (1.0 + vel) * 1.4;
            float sc = 0.10 * (0.8 + vel * 0.6) * (1.0 + rel * 2.5) * smoothstep(0.0, 0.15, age);
            vec2 bq = (pS - c) / max(sc, 1e-3);
            if (dot(bq, bq) > 0.6) continue;
            bq = rot2(atan(dir.y, dir.x) * 0.3) * bq;
            bats = min(bats, hwBat(bq, sin(uKclock * (14.0 + vel * 8.0) + fb * 2.0)) * sc);
        }
    }
    // --- CLIMAX: remolino frente a la luna que revienta hacia la camara ---
    if (cA > 0.0) {
        float gather = smoothstep(0.0, 0.40, C.w);                 // se juntan
        float burst = clamp((C.w - 0.66) / 0.30, 0.0, 1.0);       // revientan
        for (int b = 0; b < 26; b++) {
            float fb = float(b);
            float a = fb * 2.39996 + uRTime * (1.6 + 0.8 * hash21(vec2(fb, 3.0))) * (1.0 - burst);
            float rad = mix(1.6 + hash21(vec2(fb, 4.0)), moonR * (0.75 + 0.45 * hash21(vec2(fb, 5.0))), gather);
            rad += burst * burst * (2.5 + hash21(vec2(fb, 6.0)) * 2.0);
            vec2 c = mc + vec2(cos(a), sin(a) * 0.62) * rad;
            float sc = 0.105 * (1.0 + burst * burst * 6.0) * (0.7 + 0.6 * hash21(vec2(fb, 7.0))) * gather;
            if (sc < 0.002) continue;
            vec2 bq = (pS - c) / sc;
            if (dot(bq, bq) > 0.6) continue;
            bq = rot2(a + 1.57) * bq * vec2(1.0, sign(cos(a)) + 0.001);
            bats = min(bats, hwBat(bq, sin(uRTime * 16.0 + fb * 3.0)) * sc);
        }
    }
    // --- suceso: un murcielago gigante cruza la luna ---
    if (sv == 1 && se > 0.0) {
        vec2 c = mc + vec2(mix(-1.7, 1.7, ss > 0.5 ? sp : 1.0 - sp), 0.08 * sin(sp * 7.0) - 0.05);
        float sc = 0.36;
        vec2 bq = (pS - c) / sc;
        if (dot(bq, bq) < 0.6) {
            if (ss <= 0.5) bq.x = -bq.x;
            bats = min(bats, hwBat(rot2(0.1 * sin(uRTime * 2.0)) * bq, sin(uRTime * 4.5)) * sc);
        }
    }
    // --- suceso: de la ventana roja sale volando el vampiro hacia la camara ---
    if (sv == 5 && se > 0.0) {
        float fly = smoothstep(0.35, 1.0, sp);
        vec2 wS = VWIN - dolly * 0.50;                      // la ventana en el espacio del cielo
        vec2 c = mix(wS, vec2(-0.2, -0.1), fly * fly) + vec2(0.1 * sin(sp * 11.0), 0.0) * fly;
        float sc = mix(0.035, 1.4, fly * fly * fly) * smoothstep(0.30, 0.38, sp);
        if (sc > 0.002) {
            vec2 bq = (pS - c) / sc;
            if (dot(bq, bq) < 0.6) bats = min(bats, hwBat(bq, sin(uRTime * 11.0)) * sc);
        }
    }
    // --- detalle: un murcielago pasa muy cerca de la camara ---
    if (dv == 2) {
        vec2 c = vec2(mix(-uAspect - 0.8, uAspect + 0.8, ss > 0.5 ? D.y : 1.0 - D.y), 0.15 + 0.5 * D.w + 0.12 * sin(D.y * 8.0));
        float sc = 0.55 + 0.2 * D.w;
        vec2 bq = (pS - c) / sc;
        if (dot(bq, bq) < 0.6) bats = min(bats, hwBat(bq, sin(uRTime * 13.0)) * sc);
    }
    float batMask = 1.0 - smoothstep(-0.0015, 0.0015, bats);
    col = mix(col, vec3(0.0), batMask);
    col += moonC * (1.0 - smoothstep(0.0, 2.4 / uResH, abs(bats))) * (disk * 0.6 + zap * 0.8);

    // chispas en el pararrayos (detalle, y despues del rayo)
    float spark = (dv == 4 ? D.x : 0.0) + (sv == 4 ? se * smoothstep(0.30, 0.34, sp) * (1.0 - smoothstep(0.5, 0.9, sp)) : 0.0);
    if (spark > 0.0) {
        vec2 rq = pC - ROD;
        float fl = 0.6 + 0.4 * noise21(vec2(t * 18.0, 2.0));
        col += vec3(0.7, 0.8, 1.0) * exp(-dot(rq, rq) * 900.0) * spark * fl * 1.8;
        col += vec3(0.5, 0.6, 1.0) * exp(-length(rq) * 14.0) * spark * fl * 0.12;
        for (int k = 0; k < 4; k++) {
            float a = hash21(vec2(float(k), floor(t * 9.0))) * 6.2832;
            vec2 arc = rq - vec2(cos(a), sin(a)) * 0.035 * fract(t * 9.0);
            col += vec3(0.8, 0.9, 1.0) * exp(-dot(arc, arc) * 40000.0) * spark;
        }
    }

    // --- primer plano: rocas, pasto y el arbol que se mece ---
    vec2 nu = rUV(pN, NEAR_R);
    float sway = (0.002 + mid * 0.006) * sin(t * 1.1 + pN.y * 2.0) * smoothstep(-0.4, 0.8, pN.y);
    nu.x += sway;
    vec4 nr = plate3(nu);
    vec3 nc = plateCol(nr.rgb) * 2.4 + moonC * 0.012 * smoothstep(-1.2, -0.7, pN.y) + plateCol(nr.rgb) * vec3(0.8, 0.75, 1.0) * zap * 3.0;
    col = mix(col, nc, nr.a);

    col = audioLift(col, high * 0.08);
    // LUZ DE TECLA (fase 37): la bandada brilla contra el cielo
    col = hkKeyLit(col, p0, 0.05, vec2(0.28, 0.6), vec3(0.75, 0.55, 1.0), vec3(1.0, 0.8, 0.55), 0.05, 1.5);
    return vec4(hkFinish(col, uv, vec3(0.35, 0.3, 0.8)), 1.0);
}
