// ===============================================================
// HALLOWEEN 24 - LA IMAGEN QUE SANGRA (usa la carpeta Media)
// Una pared de revoque sucio bajo una lampara de jaula. La imagen de la
// carpeta Media llega en pedazos de papel rasgado desde todos los
// costados, se pega en la pared como un afiche y empieza a sangrar: las
// partes oscuras de la imagen se manchan de rojo, chorrean hilos hasta
// el piso y se junta un charco. Al final de cada vuelta los pedazos se
// despegan y caen, y la imagen vuelve a llegar. Es el unico color de la
// escena: todo lo demas es gris.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la sangre baja mas rapido y la lampara late
//   medios -> los pedazos se mueven un poco en la pared (corriente)
//   agudos -> brillo humedo en la sangre
//   golpe  -> salpicadura sobre la imagen; con Chaos los pedazos saltan
//             de la pared y vuelven
// PIANO: cada tecla hace brotar un chorro de sangre de la imagen en esa
//   posicion (grave a la izquierda) que baja hasta el piso; la fuerza: mas
//   grueso y rapido; apretada sigue manando; al soltarla el chorro cae.
// Speed marca el ritmo de cada vuelta (llegar, sangrar, caer).
// REPERTORIO (fase 34, motor hkSuceso del kit, version liviana):
//   ESTADOS (~5 min): lampara, penumbra (la lampara baja) y la sangre sube
//     (mas sangre y charco).
//   SUCESOS (~55 s, 5): la pared entera llora sangre; la lampara se apaga
//     y vuelve; aparece una mano ensangrentada en la pared; algunos pedazos
//     se despegan y cuelgan; el charco crece.
//   DETALLES (~30 s, 4): una gota gruesa, una salpicadura chica, una
//     polilla en la lampara, el revoque se descascara.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A la imagen sangra: la lampara titila, la imagen llora a chorros y
//       se apaga la lampara; queda el brillo de la sangre.
//     B la ronda: la imagen da una vuelta entera abriendose en pedazos
//       con huecos; al terminar se vuelve a armar.
//     C el ojo: los pedazos se abren como una puerta y detras, en la
//       pared, hay un ojo enorme que mira.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con la pared
//     llorando.
// @EST: lampara | penumbra | la sangre sube
// @SUC: la pared llora | se apaga | la mano | se despegan | el charco
// @DET: una gota | salpicadura | polilla | revoque
// @CLX: A la imagen sangra | B la ronda | C el ojo
//
// @D1: cantidad de cortes (los pedazos sin cortar quedan pegados como una hoja)
// @D2: sangre
// @D3: salpicaduras
// @D4: desgarro (cuanto se separan y tuercen los pedazos)
// @D5: tono de la imagen (gris <-> sepia)
// @D6: charco y goteo al piso
// ===============================================================

const float FLOOR = -0.86;
mat2 b24rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float has = hkMediaHas();
    // --- calendario (fase 34) ---
    hkSetClimax(61.0, 18.0, 22.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(61.0, 5, 9.0);
    int sv = int(S.z);
    float se = S.x, sph = S.y, ss = S.w;
    vec4 D = hkDetalle(61.0, 4, 3.0);
    int dv = int(D.z);
    vec4 EST = hkEstado(61.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(61.0, 3));
    float flickC = cA * C.x * (1.0 - C.y) * (1.0 - C.z);
    float cryE = max(sv == 0 ? se : 0.0, max(cA * C.y, G.y));
    float darkE = cA * C.z * (1.0 - smoothstep(0.92, 1.0, C.w));
    // suceso: la lampara se apaga un rato y vuelve
    darkE = max(darkE, sv == 1 ? se * smoothstep(0.25, 0.30, sph) * (1.0 - smoothstep(0.70, 0.75, sph)) : 0.0);
    float ronda = cB * smoothstep(0.08, 0.40, C.w) * (1.0 - smoothstep(0.72, 0.92, C.w));
    float eyeK = cC * smoothstep(0.08, 0.40, C.w) * (1.0 - smoothstep(0.75, 0.94, C.w));
    float dropAgain = sv == 3 ? se * sin(clamp(sph * 1.15, 0.0, 1.0) * PI) : 0.0;

    // vuelta: llegan (0..0.18), sangran, se despegan (0.92..1)
    float cyc = t / 32.0;
    float cid = floor(cyc);
    float ph = fract(cyc);
    // en B, C y "se despegan" la imagen tiene que estar: si toca el hueco
    // entre vueltas, los pedazos llegan antes y se quedan hasta el final
    float hold = max((cB + cC) * smoothstep(0.0, 0.08, C.w) * (1.0 - smoothstep(0.92, 1.0, C.w)), sv == 3 ? se : 0.0);
    float bleed = smoothstep(0.15, 0.85, ph) * (0.3 + uD2 * 0.9) + cryE * 0.4 + cA * C.x * 0.35 + EST.z * 0.3;

    // lampara de jaula
    vec2 lp = vec2(0.0, 0.92);
    float lamp = (0.75 + bass * 0.4) * (1.0 - darkE * 0.95) * (0.92 + 0.08 * noise21(vec2(t * 7.0, 1.0)))
               * (1.0 - flickC * 0.8 * step(0.5, noise21(vec2(floor(uRTime * 4.0), 5.0)))) * (1.0 - EST.y * 0.5);   // titila a lo sumo 2 veces/s
    vec2 ld = p - lp;
    float cone = smoothstep(1.25, 0.2, abs(ld.x) / max(-ld.y + 0.25, 0.05));
    float L = 0.09 + lamp * (0.25 / (0.25 + dot(ld, ld) * 0.6)) * (0.35 + 0.65 * cone);

    // --- pared de revoque ---
    float n1 = fbm(p * 3.0, 5, 0.55);
    float n2 = fbm(p * 12.0 + 4.0, 3, 0.5);
    vec3 wall = vec3(0.30, 0.29, 0.27) * (0.55 + 0.6 * n1) * (0.85 + 0.3 * n2);
    wall = mix(wall, vec3(0.12, 0.11, 0.09), smoothstep(0.55, 0.75, fbm(p * vec2(1.5, 0.6) + 8.0, 4, 0.55)) * 0.6);   // humedad
    float crackW = hkLine(fbm(p * vec2(1.2, 2.5) + 2.0, 4, 0.55) - 0.5, 1.0) * step(0.55, n1);
    wall *= 1.0 - crackW * 0.5;
    // marcas a los costados: rayas contadas, clavos, restos de afiches
    vec2 tm = p - vec2(-uAspect + 0.45, -0.25);
    float tally = 0.0;
    for (int k = 0; k < 5; k++) tally = max(tally, hkLine(hkSeg(tm, vec2(float(k) * 0.035, 0.0), vec2(float(k) * 0.035 + 0.01, 0.16)), 1.2));
    tally = max(tally, hkLine(hkSeg(tm, vec2(-0.02, 0.03), vec2(0.17, 0.12)), 1.2));
    wall = mix(wall, vec3(0.08), tally * 0.8);
    for (int k = 0; k < 4; k++) {
        float fk = float(k);
        vec2 sp = vec2((fk < 2.0 ? -1.0 : 1.0) * (uAspect - 0.25 - 0.2 * mod(fk, 2.0)), 0.55 - fk * 0.45);
        vec2 sq = b24rot(fk * 0.9) * (p - sp);
        float scrap = hkBox(sq, vec2(0.16, 0.20)) + fbm(sq * 12.0 + fk, 3, 0.5) * 0.08 - 0.03;
        if (scrap < 0.0) wall = mix(vec3(0.42, 0.40, 0.36) * (0.6 + 0.4 * noise21(sq * 30.0)), vec3(0.20, 0.19, 0.17), smoothstep(-0.03, 0.0, scrap)) * (0.6 + 0.4 * n1);
        wall = mix(wall, vec3(0.03), 1.0 - smoothstep(0.006, 0.010, length(p - sp - vec2(0.0, 0.18))));   // clavo
    }
    // detalle: el revoque se descascara
    if (dv == 3) {
        vec2 fq = p - vec2((D.w - 0.5) * 3.6, 0.6 - D.w * 0.8);
        float flake = hkBox(fq, vec2(0.07, 0.05) * D.x) + (noise21(fq * 50.0) - 0.5) * 0.02;
        wall = mix(wall, vec3(0.10, 0.08, 0.06), (1.0 - smoothstep(0.0, 0.005, flake)));
    }
    // C: el ojo enorme en la pared, detras de la imagen
    if (eyeK > 0.0) {
        vec2 eq = (p - vec2(0.0, 0.05)) / vec2(0.62, 0.42);
        float open = smoothstep(0.15, 0.6, eyeK);
        float lid = length(vec2(eq.x, eq.y / max(open * 0.75, 0.02))) - 1.0;
        float look = sin(uRTime * 0.7) * 0.35;
        float iris = length(eq - vec2(look, 0.0)) - 0.45;
        vec3 ew = vec3(0.75, 0.68, 0.60) * (0.7 + 0.3 * noise21(eq * 12.0));
        ew = mix(ew, vec3(0.6, 0.05, 0.04), smoothstep(0.75, 1.0, length(eq)) * 0.6);          // venitas al borde
        ew = mix(ew, vec3(0.25, 0.12, 0.05) * (0.6 + 0.6 * noise21(eq * 25.0)), 1.0 - smoothstep(-0.02, 0.02, iris));
        ew = mix(ew, vec3(0.01), 1.0 - smoothstep(-0.02, 0.02, length(eq - vec2(look, 0.0)) - 0.18 - bass * 0.05));
        wall = mix(wall, ew, (1.0 - smoothstep(-0.03, 0.03, lid)) * eyeK);
        wall *= 1.0 - (1.0 - smoothstep(0.0, 0.05, abs(lid))) * 0.7 * eyeK;
    }
    vec3 col = wall * L * 2.2;
    // piso
    if (p.y < FLOOR) {
        float wet = fbm(p * vec2(3.0, 10.0), 4, 0.5);
        col = vec3(0.12, 0.115, 0.11) * (0.5 + 0.6 * wet) * L * 2.0;
    }

    // --- la imagen en pedazos de papel ---
    float ia = clamp(hkMediaAspect(), 0.7, 1.7);
    vec2 HS = vec2(0.70 * ia, 0.70);
    vec2 IC = vec2(0.0, 0.05);
    // grilla FIJA (antes D1 cambiaba la grilla y la imagen se recortaba de
    // nuevo de golpe): D1 decide cuantos pedazos se separan
    float cols = floor(4.0 * ia + 0.5);
    const float rows = 4.0;
    vec2 cell = 2.0 * HS / vec2(cols, rows);
    // B y C mueven toda la grilla (la busqueda es de 3x3 celdas, por eso se
    // transforma el punto y no cada pedazo):
    //   B gira una vuelta entera y se abre en ronda (los pedazos quedan con
    //     su tamano y aparecen huecos);
    //   C abre las dos mitades como una puerta.
    float rs = 1.0 + ronda * 0.6;
    float ra = cB * 6.2832 * smoothstep(0.08, 0.92, C.w);
    vec2 pg = IC + b24rot(-ra) * (p - IC) / rs;
    float side = sign(p.x - IC.x + 1e-4);
    pg.x -= side * eyeK * 1.25;
    vec2 gl = (pg - IC + HS) / cell;
    vec2 g0 = floor(gl);
    float paperA = 0.0;
    vec3 paperC = vec3(0.0);
    vec2 mImg = vec2(-1.0);
    float pieceEdge = 0.0;
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
        vec2 id = g0 + vec2(x, y);
        if (id.x < 0.0 || id.y < 0.0 || id.x >= cols || id.y >= rows) continue;
        vec2 h = hash22(id + cid * 3.7);
        // separado o pegado al resto (D1): el pegado no se corre ni gira y
        // llega junto con la hoja
        float torn = smoothstep(0.0, 0.08, mix(-0.05, 1.05, uD1) - hash21(id + 13.0));
        h = mix(vec2(0.5), h, torn);
        // llega desde el borde mas cercano de la pantalla, cada uno a su tiempo
        vec2 cc = (id + 0.5) / vec2(cols, rows) - 0.5;
        vec2 from = abs(cc.x) * 1.0 > abs(cc.y) * ia ? vec2(sign(cc.x + 1e-3) * (uAspect + 1.2), 0.0) : vec2(0.0, sign(cc.y + 1e-3) * 2.2);
        float arrive = smoothstep(0.02 + h.x * 0.10, 0.08 + h.x * 0.10, ph);
        float fall = smoothstep(0.92 + h.y * 0.05, 0.99, ph) * (1.0 - hold);
        arrive = max(arrive, smoothstep(h.x * 0.4, h.x * 0.4 + 0.5, hold));
        float sag = dropAgain * step(0.45, h.y);                               // suceso: se despegan y cuelgan
        float jump = hit * loco * step(0.6, h.x) * 0.15;
        vec2 off = from * (1.0 - arrive) + vec2(0.0, -2.5) * fall * fall + (h - 0.5) * cell * uD4 * 0.12;
        off += vec2(sin(t * 0.8 + h.x * 6.0), cos(t * 0.7 + h.y * 6.0)) * 0.004 * (0.3 + mid * 2.0) + vec2(0.0, jump);
        float rot = (h.y - 0.5) * (0.04 + uD4 * 0.18) * (1.0 + (1.0 - arrive) * 3.0) + fall * (h.x - 0.5) * 2.0 + sag * (h.x - 0.5) * 1.2;
        off.y -= sag * cell.y * 0.7;
        // la hoja sin cortar llega toda junta desde abajo
        off = mix(vec2(0.0, -2.2) * (1.0 - arrive) + vec2(0.0, -2.5) * fall * fall, off, torn);
        vec2 ctr = IC - HS + (id + 0.5) * cell + off;
        rot += ronda * (h.x - 0.5) * 0.8;
        if (eyeK > 0.0 && sign(cc.x + 1e-3) != side) continue;   // C: cada mitad en su lado
        vec2 lq = b24rot(-rot) * (pg - ctr);
        // borde rasgado (fibras blancas del papel)
        float d0 = hkBox(lq, cell * 0.5 / rs * (1.0 + 0.08 * uD4 * torn + 0.02 * (1.0 - torn)));
        if (d0 > 0.03) continue;
        float rag = (fbm(lq * 18.0 + id * 7.0, 3, 0.5) - 0.5) * 0.035 + (noise21(lq * 90.0 + id) - 0.5) * 0.006;
        float d = d0 + rag;
        if (d < 0.0) {
            vec2 m = ((lq + (id + 0.5) * cell - HS) / (2.0 * HS)) + 0.5;
            float fiber = smoothstep(-0.018, 0.0, d) * torn;
            vec3 im = hkMediaGet(hkMediaCover(m, ia), 0.4, has);
            im = hkTone(im, 0.0, mix(vec3(0.92), vec3(1.0, 0.84, 0.62), uD5), 1.2);
            vec3 pc = mix(im, vec3(0.55, 0.53, 0.49) * (0.7 + 0.3 * noise21(lq * 200.0)), fiber);
            pc *= 0.85 + 0.25 * noise21(lq * 8.0 + id);                       // arrugas del papel
            paperC = pc;
            paperA = 1.0;
            mImg = m;
            pieceEdge = fiber;
        }
    }
    float imgDark = 0.0;
    if (paperA > 0.0) {
        float lum = dot(paperC, vec3(0.33));
        imgDark = smoothstep(0.25, 0.02, lum) * (1.0 - pieceEdge);
        // sangre que se mete en lo oscuro de la imagen
        float blot = fbm(mImg * 5.0 + cid, 3, 0.5);
        float seep = smoothstep(0.70, 0.95, bleed * 0.55 + blot * 0.75) * imgDark;
        paperC = mix(paperC, vec3(0.13, 0.006, 0.008) * (0.6 + 0.4 * noise21(mImg * 40.0)), seep * 0.8);
        col = mix(col * 0.5, paperC * L * 2.4, paperA);                    // sombra del papel
    }

    // --- hilos de sangre ---
    float dripA = 0.0;
    {
        float cw = 0.028;
        float cx = floor(p.x / cw);
        float hx = hash21(vec2(cx, cid + 2.0));
        float x0 = (cx + 0.3 + hx * 0.4) * cw;
        // nacen en lo oscuro de la imagen (o arriba de todo cuando la pared llora)
        float ys = IC.y + HS.y * (0.9 - 1.6 * hash21(vec2(cx, 7.0 + cid)));
        vec2 ms = vec2((x0 - IC.x + HS.x) / (2.0 * HS.x), (ys - IC.y + HS.y) / (2.0 * HS.y));
        float srcDark = 0.0;
        if (abs(x0 - IC.x) < HS.x) {
            vec3 sim = hkMediaGet(hkMediaCover(ms, ia), 2.0, has);
            srcDark = smoothstep(0.05, 0.005, dot(sim, vec3(0.33)));
        }
        float cryS = max(cryE, EST.z * 0.4) * step(0.72, hx);
        if (cryS > 0.0) ys = 1.05;
        float on = max(step(0.25, hx) * srcDark, cryS);
        float speed = (0.4 + hx * 0.6) * (0.6 + bass * 0.8);
        float len = clamp(bleed * speed * 1.6 + cryS * cryE * 1.5, 0.0, ys - FLOOR + 0.05);
        float w = cw * (0.10 + 0.12 * hx) * (1.0 - 0.5 * smoothstep(ys - len, ys, p.y));
        float dx = abs(p.x - x0 - sin(p.y * 13.0 + hx * 6.0) * 0.004);
        float body = (1.0 - smoothstep(w, w + 0.004, dx)) * step(p.y, ys) * step(ys - len, p.y);
        float headY = ys - len;
        float head = 1.0 - smoothstep(w * 1.7, w * 1.7 + 0.004, length(vec2(dx, (p.y - headY) * 0.8)));
        dripA = max(body, head) * on * smoothstep(0.0, 0.03, len);
    }
    // salpicaduras del golpe
    float splat = 0.0;
    if (uD3 > 0.02) {
        vec2 sc = IC + (hash22(vec2(floor(uRTime * 2.0), 3.0)) - 0.5) * HS * 1.4;
        vec2 sq = p - sc;
        float r = length(sq);
        float a = atan(sq.y, sq.x);
        float rays = smoothstep(0.6, 1.0, noise21(vec2(a * 6.0, floor(uRTime * 2.0))));
        float blob = 1.0 - smoothstep(0.05, 0.07, r + (noise21(vec2(a * 3.0, 1.0)) - 0.5) * 0.04);
        vec2 dg = sq * 22.0;
        float dots = (1.0 - smoothstep(0.15, 0.3, length(fract(dg) - 0.5 - (hash22(floor(dg)) - 0.5) * 0.5)))
                   * step(0.7, hash21(floor(dg) + floor(uRTime * 2.0))) * smoothstep(0.45, 0.1, r);
        splat = max(blob, max(rays * smoothstep(0.35, 0.05, r) * step(0.07, r) * 0.0, dots)) * hit * uD3;
        float streak = smoothstep(0.02, 0.0, abs(sin(a * 9.0 + floor(uRTime * 2.0)) * r * 0.25)) * smoothstep(0.30, 0.06, r) * rays;
        splat = max(splat, streak * hit * uD3);
    }
    // --- PIANO: chorros que brotan de la imagen ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.02, 2.5);
        if (e < 0.01) continue;
        float vel = keyVel(k), age = keyAge(k), rel = keyRelAge(k);
        float x0 = IC.x + mix(-HS.x, HS.x, mix(0.1, 0.9, keyPos(k)));
        float ys = IC.y + HS.y * (0.5 - 0.6 * fract(keyPos(k) * 7.7));
        float fallK = rel * rel * 1.8;
        float top = ys - fallK;
        float len = min(age * (0.5 + vel * 0.8), ys - FLOOR + 0.03);
        float w = 0.010 + vel * 0.014;
        float dx = abs(p.x - x0 - sin(p.y * 11.0 + float(k)) * 0.005);
        float body = (1.0 - smoothstep(w, w + 0.004, dx)) * step(p.y, top) * step(ys - len - fallK, p.y);
        float head = 1.0 - smoothstep(w * 1.6, w * 1.6 + 0.004, length(vec2(dx, (p.y - (ys - len - fallK)) * 0.8)));
        float burst = (1.0 - smoothstep(0.03, 0.05 + vel * 0.04, length(p - vec2(x0, ys)))) * exp(-age * 2.0);
        dripA = max(dripA, max(max(body, head), burst) * e);
    }
    // suceso: una mano ensangrentada aparece en la pared; detalles
    if (sv == 2 && se > 0.0) {
        vec2 hq = (p - vec2((ss > 0.5 ? 1.0 : -1.0) * (HS.x + 0.35), 0.10)) / 0.13;
        float palm = length(hq * vec2(1.0, 1.1)) - 0.8;
        for (int i = 0; i < 4; i++) palm = min(palm, hkSeg(hq, vec2(-0.55 + float(i) * 0.37, 0.5), vec2(-0.65 + float(i) * 0.42, 1.65)) - 0.2);
        palm = min(palm, hkSeg(hq, vec2(0.7, -0.1), vec2(1.3, 0.5)) - 0.2);
        palm += (noise21(hq * 9.0) - 0.5) * 0.25;
        splat = max(splat, (1.0 - smoothstep(-0.05, 0.05, palm)) * se * smoothstep(0.1, 0.2, sph));
    }
    if (dv == 1) {
        vec2 sq = p - IC - (vec2(D.w, fract(D.w * 7.0)) - 0.5) * HS * 1.6;
        float r = length(sq) + (noise21(vec2(atan(sq.y, sq.x) * 3.0, D.w * 9.0)) - 0.5) * 0.02;
        splat = max(splat, (1.0 - smoothstep(0.025, 0.035, r)) * D.x);
    }
    if (dv == 0) {
        float gx = (D.w - 0.5) * HS.x * 1.6;
        vec2 gq = (p - vec2(gx, mix(IC.y + 0.2, FLOOR, D.y * D.y))) / vec2(1.0, 1.4);
        splat = max(splat, (1.0 - smoothstep(0.018, 0.024, length(gq))) * D.x);
    }
    // EASTER EGG "JAY INFINITO" (fase 38): en la pared, a la derecha de la
    // imagen, la sangre corre dibujando un infinito y despues chorrea
    vec2 EG = hkEgg(24.0);
    if (EG.x > 0.0) {
        vec2 ic = vec2(IC.x + HS.x + 0.55, IC.y + 0.25);
        vec2 iq = p - ic;
        if (abs(iq.x) < 0.6 && iq.y > -1.2 && iq.y < 0.35) {
            float ia = 0.36;
            // el trazo avanza por el recorrido del infinito
            float tEnd = smoothstep(0.05, 0.5, EG.y) * 6.2832;
            float dmin = 1e3;
            vec2 prev = hkInfPath(-1.5708, ia);
            for (int i = 1; i <= 36; i++) {
                vec2 cur = hkInfPath(-1.5708 + tEnd * float(i) / 36.0, ia);
                dmin = min(dmin, hkSeg(iq, prev, cur));
                prev = cur;
            }
            float st = 1.0 - smoothstep(0.016, 0.024, dmin + (noise21(iq * 40.0) - 0.5) * 0.008);
            // chorreado debajo de cada lazo
            for (int k = 0; k < 3; k++) {
                float fx = (float(k) - 1.0) * 0.26 + 0.05 * sin(float(k) * 5.0);
                float run = smoothstep(0.45, 1.0, EG.y) * (0.25 + 0.15 * fract(float(k) * 0.61));
                float y0 = -0.06, y1 = y0 - run;
                float dd = max(abs(iq.x - fx) - 0.008, max(iq.y - y0, y1 - iq.y));
                dd = min(dd, length((iq - vec2(fx, y1)) / vec2(1.0, 1.3)) - 0.015);
                st = max(st, (1.0 - smoothstep(0.0, 0.004, dd)) * step(0.01, run));
            }
            splat = max(splat, st * EG.x);
        }
    }
    float blood = clamp(max(dripA, splat), 0.0, 1.0);
    vec3 bloodC = vec3(0.28, 0.012, 0.015) * (0.6 + 0.4 * L * 3.0);
    bloodC += vec3(0.9, 0.5, 0.5) * pow(max(0.0, 1.0 - abs(fract(p.x / 0.028) - 0.4) * 4.0), 6.0) * (0.15 + high * 0.4) * lamp * dripA;   // brillo humedo
    // con la lampara apagada la sangre brilla sola
    col = mix(col, bloodC + vec3(0.45, 0.0, 0.01) * darkE * 0.7, blood);

    // --- charco en el piso ---
    if (uD6 > 0.02 && p.y < FLOOR + 0.01) {
        float pool = fbm(vec2(p.x * 1.5, 0.0) + cid, 3, 0.5) * 1.6 - 1.2 + bleed * uD6 * 1.3 + (sv == 4 ? se * smoothstep(0.0, 0.8, sph) * 1.2 : 0.0) + EST.z * 0.3;
        float pd = length(vec2((p.x - IC.x) / (HS.x * 1.3), (p.y - FLOOR + 0.07) / 0.09)) - (0.6 + pool * 0.5) - (noise21(vec2(p.x * 6.0, cid)) - 0.5) * 0.25;
        float wetA = 1.0 - smoothstep(0.0, 0.05, pd);
        vec2 rq = vec2(p.x, 2.0 * FLOOR - p.y);
        vec3 refl = vec3(0.35, 0.02, 0.02) * L * 1.5 + vec3(0.5, 0.3, 0.3) * lamp * 0.08 * exp(-abs(p.x) * 2.0);
        refl += paperA * 0.0;
        col = mix(col, refl * (0.6 + 0.4 * noise21(rq * vec2(4.0, 30.0) + t * 0.2)), wetA);
        // gotas que caen al charco
        float fallX = floor(p.x / 0.15);
        float fph = fract(t * 0.7 + hash21(vec2(fallX, 9.0)));
        float ring = hkLine((length((p - vec2((fallX + 0.5) * 0.15, FLOOR - 0.06)) * vec2(1.0, 3.5)) - fph * 0.12), 1.0) * (1.0 - fph) * wetA * step(0.6, hash21(vec2(fallX, 4.0)));
        col += vec3(0.4, 0.06, 0.06) * ring * 0.5;
    }

    // la lampara: jaula de alambre y bombita
    {
        vec2 q = p - lp;
        float bulbD = length(q * vec2(1.0, 0.8)) - 0.05;
        float cage = hkLine(abs(fract(atan(q.x, q.y + 0.02) * 1.6) - 0.5) * length(q) - 0.0, 0.8) * step(length(q * vec2(1.0, 0.8)), 0.075) * step(-0.06, q.y);
        float shade = max(hkRBox(q - vec2(0.0, 0.06), vec2(0.07, 0.02), 0.01), -1.0);
        col = mix(col, vec3(0.05), (1.0 - smoothstep(0.0, 0.004, shade)) + cage * 0.7);
        if (dv == 2) {                                       // una polilla da vueltas
            vec2 mq = (q - vec2(cos(uRTime * 3.0), sin(uRTime * 3.0) * 0.5) * 0.14) / 0.03;
            col = mix(col, vec3(0.05), (1.0 - smoothstep(0.6, 1.0, length(vec2(abs(mq.x) - 0.6 * (0.5 + 0.5 * sin(uRTime * 40.0)), mq.y)))) * D.x);
        }
        col += vec3(1.0, 0.93, 0.8) * lamp * (1.0 - smoothstep(0.0, 0.01, bulbD)) * 1.4;
        col += vec3(1.0, 0.9, 0.75) * lamp * exp(-length(q) * 7.0) * 0.12;
        col = mix(col, vec3(0.02), (1.0 - smoothstep(0.0, 0.003, abs(p.x) - 0.004)) * step(lp.y + 0.07, p.y));
    }
    // LUZ DE TECLA (fase 37): columna roja en la pared
    col = hkKeyLit(col, p, 0.05, vec2(0.18, 0.8), vec3(1.0, 0.15, 0.1), vec3(1.0, 0.3, 0.15), 0.03, 1.2);
    return vec4(hkFinish(col, uv, vec3(0.3, 0.06, 0.06)), 1.0);
}
