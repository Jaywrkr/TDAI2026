// ===============================================================
// HALLOWEEN 00 - CEMENTERIO EN LA NIEBLA
// Matte painting 2.5D: lo quieto viene de LAMINAS horneadas con todo el
// detalle (plates/scene00, ver td/tools/bake_plates_cementerio.py):
// sierra de pinos con capilla, colinas, reja, lapidas de piedra con
// volumen, grietas, musgo e inscripciones, cruz celta, suelo con hojas y
// la luna con crateres. En vivo el shader solo las lee (barato) y pone
// encima todo lo que se mueve: cielo, estrellas, nubes, rayos de luna,
// relampagos, niebla, fuegos fatuos, almas, viento en el arbol y el
// parallax de la camara (cada capa se mueve distinto).
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la niebla se hincha y se enciende; late la vela de la capilla
//   medios -> el viento mueve las ramas; los fuegos fatuos suben y bajan
//   agudos -> titilan las estrellas; chispean los fuegos fatuos
//   golpe  -> relampago (D4) que ilumina la piedra y almas que suben
// PIANO: cada tecla saca un alma de la tumba en esa posicion (grave a la
//   izquierda); la fuerza la hace mas grande y brillante; mientras la
//   tecla siga apretada el alma sigue subiendo y flota; un acorde saca
//   varias a la vez.
// Speed mueve nubes, niebla, camara y viento aun en silencio.
// HISTORIA: cada acto (~78 s) cambia encuadre, nubes y niebla; cada
// ~47 s una tormenta seca; cada ~71 s cruza una procesion de fuegos fatuos.
// CLIMAX (~2 min, 26 s, en tres tiempos): las nubes tapan la luna y la
//   luz baja; la luna sale roja, la tierra tiembla y las almas suben de
//   todas las tumbas; despues la niebla queda rojiza un rato. Cada ~4.5
//   min llega junto con la procesion de fuegos fatuos (gran climax).
// LOCURA (Chaos): sacudida, rayo doble, niebla que hierve, mas almas.
//
// @D1: densidad de la niebla
// @D2: cantidad de lapidas (aparecen de a una, subiendo de la tierra)
// @D3: brillo de la luna y sus rayos
// @D4: relampagos con el golpe
// @D5: niebla verde toxica y fuegos fatuos
// @D6: altura del horizonte
// ===============================================================

// Encuadre de las laminas (igual que bake_plates_cementerio.py)
const float PX0 = -3.4, PXW = 6.8;
const vec2 FAR_Y = vec2(-0.24, 0.56);    // y0, alto
const vec2 MID_Y = vec2(-0.76, 1.35);
const vec2 NEAR_Y = vec2(-1.30, 1.70);

vec2 plateUV(vec2 p, vec2 yr) { return vec2((p.x - PX0) / PXW, (p.y - yr.x) / yr.y); }
// debajo de la lamina sigue el suelo opaco de su primera fila
vec2 plateUVGround(vec2 p, vec2 yr) { vec2 u = plateUV(p, yr); u.y = max(u.y, 0.001); return u; }
// las laminas guardan color lineal x2 con gamma 2.2
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// LAPIDAS 3D: las laminas 7_lapidas_normal y 8_cerca_normal guardan el
// relieve horneado por trazado de rayos (normal en RG, x derecha, y
// arriba, z hacia el publico). La luz se calcula aca, en vivo: la luna
// desde arriba a la derecha, un contraluz que enciende los cantos, un
// brillo humedo y el relampago desde el lado donde cae el rayo.
const vec3 MOONC = vec3(0.80, 0.74, 0.86);
vec3 stoneLight(vec3 alb, vec2 nrg, float ao, float moonK, vec3 flashDir, float flashK, vec3 flashCol) {
    vec3 n = vec3(nrg * 2.0 - 1.0, 0.0);
    n.z = sqrt(max(1.0 - dot(n.xy, n.xy), 0.0));
    const vec3 L = vec3(0.5287, 0.5287, 0.6639);
    float dif = max(dot(n, L), 0.0);
    float rim = pow(1.0 - n.z, 1.5) * max(dot(normalize(n.xy + 1e-4), vec2(0.85, 0.53)), 0.0);
    float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 40.0);
    float fd = max(dot(n, flashDir), 0.0);
    // lado en sombra mas oscuro que antes y la cara de la luna mas fuerte:
    // asi se lee el volumen (antes la luz venia horneada y pareja)
    return alb * ao * ((0.10 + 1.30 * dif * MOONC + rim * 1.4 * MOONC) * moonK + flashCol * flashK * (0.45 + 2.8 * fd * fd))
         + MOONC * spec * 0.06 * moonK * ao;
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

    // camara que se desliza: cada capa la sigue en otra proporcion
    vec2 dolly = vec2(sin(uRTime * 0.035) * 0.16 + sin(uRTime * 0.013 + 1.0) * 0.07, 0.0);
    vec2 camD = pc - p0;
    vec2 pS = p0 + camD * 0.5 + dolly * 0.10;   // cielo y luna
    vec2 pF = pc + dolly * 0.30;                // sierra lejana
    vec2 pT = pc + dolly * 1.00;                // cementerio
    vec2 pN = pc + dolly * 1.40;                // primer plano

    // historia
    float cover = hkActVal(1.0);
    float fogAct = mix(0.7, 1.35, hkActVal(2.0));
    float storm = hkEvent(5.0, 47.0, 9.0);
    vec4 G = hkGrandClimax(6.0);
    vec4 C = hkClimaxOr(G, hkClimax(6.0, 131.0, 26.0));     // aviso, pico, secuelas, fase
    float bloodMoon = max(C.y, C.z * 0.75);
    float parade = max(hkEvent(7.0, 71.0, 14.0), G.y + G.z * 0.6);
    // aviso: las nubes cierran la luna; en el pico se abren
    cover = clamp(cover + C.x * (1.0 - C.y) * (1.0 - C.z) * 0.9 - (C.y + C.z * 0.6) * 0.35, 0.0, 1.3);
    float autoFlash = storm * step(0.82, noise21(vec2(uRTime * 7.0, 3.0)));
    float flash = max(hit * (0.25 + uD4 * 1.0) * (1.0 + loco * 0.6), autoFlash * 0.9);
    vec3 flashCol = vec3(0.78, 0.72, 1.0);

    float dh = (uD6 - 0.5) * 0.36;
    float horizon = -0.36 + dh;
    vec3 fogTint = mix(vec3(0.62, 0.56, 0.80), vec3(0.32, 0.95, 0.40), uD5);
    fogTint = mix(fogTint, hkStyleMap(0.70), uStyle * 0.6);
    float moonGain = (0.45 + uD3 * 1.05) * (1.0 - C.x * (1.0 - C.y) * (1.0 - C.z) * 0.45 + C.y * 0.25);
    float light = 0.55 + 0.45 * moonGain;      // cuanto ilumina la luna la piedra
    // el climax tine la luz de la piedra y la niebla de rojo
    vec3 bloodLight = mix(vec3(1.0), vec3(1.35, 0.55, 0.45), bloodMoon * 0.7);
    fogTint = mix(fogTint, vec3(0.85, 0.16, 0.18), C.y * 0.55 + C.z * 0.70);

    // --- cielo: gradiente, bruma y estrellas que titilan con los agudos ---
    vec3 skyLow = hsv2rgb(vec3(fract(0.77 + hue), 0.62, 0.34));
    vec3 skyHigh = hsv2rgb(vec3(fract(0.70 + hue), 0.85, 0.035));
    vec3 col = mix(skyLow, skyHigh, smoothstep(-0.45, 1.0, pS.y));
    vec2 sg = floor(pS * 110.0);
    float sh = hash21(sg);
    float tw = 0.55 + 0.45 * sin(t * (1.5 + sh * 5.0) * (1.0 + high * 2.5) + sh * 60.0);
    col += vec3(0.78, 0.78, 1.0) * step(0.9935, sh) * tw * (0.55 + high * 0.9) * smoothstep(0.0, 0.8, pS.y);

    // --- luna (lamina con crateres) con halo y corona ---
    vec2 mc = vec2(uAspect * 0.42, 0.46);
    float moonR = 0.23;
    vec2 mp = pS - mc;
    float mr = length(mp);
    vec3 haloC = mix(vec3(0.95, 0.65, 0.45), vec3(1.0, 0.25, 0.12), bloodMoon);
    col += haloC * exp(-max(mr - moonR, 0.0) * 4.5) * 0.32 * moonGain * (1.0 + bass * 0.25);
    col += vec3(0.8, 0.7, 0.9) * exp(-max(mr - moonR, 0.0) * 1.2) * 0.06 * moonGain;
    col += haloC * exp(-pow((mr - moonR * 1.9) * 18.0, 2.0)) * 0.05 * moonGain;
    if (mr < moonR * 1.02) {
        vec4 mt = plate5(mp / (moonR * 2.0) + 0.5);
        vec3 moonTint = mix(vec3(1.0, 0.92, 0.76), vec3(1.0, 0.32, 0.18), bloodMoon);
        vec2 sq = mp / moonR;
        float sphere = 0.55 + 0.45 * clamp(dot(normalize(vec3(sq, sqrt(max(1.0 - dot(sq, sq), 0.0)))), normalize(vec3(-0.4, 0.5, 0.75))), 0.0, 1.0);
        float mval = mix(mt.r, sphere * (0.85 + 0.15 * mt.r), uStyle * 0.85);
        col = mix(col, moonTint * mval * moonGain * 1.15, mt.a);
    }
    // ESTILO: la luna como esfera de aerografo, con brillo blando y
    // destellos en cruz
    float sty = uStyle;
    if (sty > 0.001) {
        col += hkStyleMap(0.82) * exp(-max(mr - moonR * 0.7, 0.0) * 9.0) * 0.25 * sty * moonGain;
        col = mix(col, col * 0.55, sty * smoothstep(moonR * 1.05, moonR * 2.2, mr) * (1.0 - smoothstep(moonR * 2.2, moonR * 5.0, mr)));   // halo mas angosto
        vec2 gl = mp - vec2(-0.07, 0.08);
        col += vec3(1.0, 0.95, 0.88) * hkSparkle(gl, 0.30) * 0.45 * sty * (0.8 + high * 0.6);
        for (int k = 0; k < 3; k++) {
            float fk = float(k);
            vec2 sp = mc + vec2(0.12 + fk * 0.05, -0.15 + fk * 0.07) * vec2(1.0 - fk * 0.6, 1.0);
            col += vec3(1.0, 0.9, 0.8) * exp(-dot(pS - sp, pS - sp) * 9000.0) * sty * (0.5 + 0.5 * sin(t * 3.0 + fk * 2.0));
        }
    }

    // --- nubes (textura que se repite) con borde iluminado ---
    vec2 cu = vec2(pS.x * 0.14 + t * 0.006, pS.y * 0.62 - t * 0.0015);
    float cl = mix(plate4Wrap(cu).r, plate4Wrap(cu * 1.7 + vec2(0.37, 0.11) - vec2(t * 0.004, 0.0)).r, 0.35);
    float clouds = smoothstep(0.52 - cover * 0.16, 0.74 - cover * 0.10, cl) * smoothstep(-0.25, 0.35, pS.y);
    float rim = smoothstep(0.46, 0.55, cl) - smoothstep(0.55, 0.70, cl);
    vec3 cloudCol = mix(vec3(0.03, 0.015, 0.05), vec3(0.45, 0.36, 0.50), exp(-mr * 1.8));
    col = mix(col, cloudCol, clouds * 0.88);
    col += vec3(0.9, 0.75, 0.6) * rim * exp(-mr * 2.2) * 0.35 * moonGain;

    // --- relampago con rayo visible ---
    float slot = floor(uRTime * 1.3);
    float bx = (hash21(vec2(slot, 4.0)) - 0.5) * uAspect * 1.4;
    float bd = hkBolt(pS, bx, 1.05, horizon + 0.25, slot * 7.0, 0.35);
    if (loco > 0.5) bd = min(bd, hkBolt(pS, bx + 0.6, 1.05, horizon + 0.30, slot * 3.0 + 2.0, 0.30));
    float bolt = exp(-bd * 180.0) + exp(-bd * 25.0) * 0.30;
    col += flashCol * flash * (0.12 + clouds * 0.75) * smoothstep(-0.5, 0.6, pS.y);
    col += flashCol * bolt * max(hit * step(0.35, uD4 + loco * 0.5), autoFlash) * 1.6;

    // --- rayos de luz de la luna ---
    float rays = pS.y > horizon - 0.2 ? hkRays(pS, mc, t, 18.0) : 0.0;
    col += vec3(0.75, 0.70, 0.85) * rays * (0.03 + uD3 * 0.42) * (1.0 - clouds * 0.5) * (1.0 - sty * 0.85);

    // --- sierras lejanas (R luz, G cual sierra, B ventanas, A cobertura) ---
    vec4 far = plate0(plateUVGround(pF - vec2(0.0, dh), FAR_Y));
    vec3 ridge2C = mix(skyLow * 0.75, col, 0.35);
    vec3 ridge1C = mix(skyLow * 0.50, fogTint * 0.22, 0.35);
    vec3 farC = mix(ridge2C, ridge1C, far.g) * (0.75 + 0.5 * far.r);
    farC += flashCol * flash * 0.10 * far.g;
    col = mix(col, farC, far.a);
    float candle = 0.65 + 0.35 * noise21(vec2(uRTime * 5.0, 1.7));
    vec3 warm = vec3(1.0, 0.62, 0.25);
    col = mix(col, warm * candle * (0.9 + bass * 1.2), far.b);
    // niebla entre las sierras
    col = mix(col, fogTint * 0.30, exp(-pow((pF.y - horizon - 0.28) / 0.07, 2.0)) * 0.40);

    // ESTILO: resplandor naranja-crema detras de las tumbas (como la luz
    // que sale de abajo en un afiche de aerografo)
    if (sty > 0.001) {
        float gy = pT.y - horizon;
        vec3 glowC = mix(hkStyleMap(0.60), hkStyleMap(0.92), exp(-abs(gy) * 6.0)) * 1.1;
        float g = exp(-pow((gy + 0.05) / (0.48 + bass * 0.08), 2.0)) * (0.35 + 0.65 * exp(-pow(pT.x / (uAspect * 0.7), 2.0)));
        col = mix(col, col * 0.4, sty * 0.5);
        col += glowC * g * sty * (0.95 + bass * 0.45 + flash * 0.3);
        col += hkStyleMap(0.40) * exp(-pow((gy - 0.45) / 0.35, 2.0)) * sty * 0.25 * smoothstep(0.2, 1.0, abs(pT.x) / uAspect);
    }
    // --- colinas, reja y suelo ---
    vec2 muv = plateUVGround(pT - vec2(0.0, dh), MID_Y);
    vec4 mbase = plate1(muv);
    vec3 mpre = plateCol(mbase.rgb) * mbase.a;
    vec3 midLit = (mpre * light * 1.9 * mix(1.0, 0.30, sty) + mpre * flashCol * flash * 2.4) * bloodLight;
    col = col * (1.0 - mbase.a) + midLit;
    // --- lapidas: D2 las suma DE A UNA (cada una con su punto de la perilla,
    // lamina 7_lapidas_orden) y la nueva sube de la tierra; en el pico del
    // climax la tierra tiembla ---
    float tombN = mix(0.20, 1.06, uD2);
    vec2 tq0 = pT - vec2(C.y * 0.006 * sin(uRTime * 43.0), dh);
    float ordHere = plate6(plateUV(tq0, MID_Y)).b;
    float riseK = 1.0 - smoothstep(ordHere - 0.05, ordHere + 0.05, tombN);
    vec2 tqR = tq0 - vec2(0.0, riseK * 0.12);
    vec4 tomb = plate2(plateUV(tqR, MID_Y));
    vec4 tombNrm = plate6(plateUV(tqR, MID_Y));
    float ordT = tombNrm.b;
    float tombA = tomb.a * smoothstep(ordT - 0.05, ordT + 0.05, tombN);
    // lo que sube no puede asomar por debajo del suelo
    float gMid = -0.36 + 0.05 * sin(tq0.x * 1.7 + 1.3) + 0.03 * sin(tq0.x * 4.1);
    tombA *= mix(1.0, smoothstep(gMid - 0.03, gMid - 0.005, tq0.y), step(0.001, riseK));
    vec3 tpre = plateCol(tomb.rgb);
    // el relampago pega desde el lado donde cae el rayo
    vec3 flashDir = normalize(vec3(clamp((bx - pT.x) * 0.7, -1.2, 1.2), 0.9, 0.45));
    vec3 tombLit = stoneLight(tpre, tombNrm.rg, 1.0, light * 1.9 * mix(1.0, 0.30, sty), flashDir, flash * 0.95, flashCol) * bloodLight;
    col = mix(col, tombLit, tombA);

    // --- arbol muerto: las ramas se mecen con el viento y los medios ---
    vec2 tq = pT - vec2(-uAspect * 0.70, horizon);
    float trunk = abs(tq.x + 0.03 * sin(tq.y * 5.0)) - (0.035 - tq.y * 0.02);
    trunk = max(trunk, max(-tq.y, tq.y - 0.75));
    float tree = trunk;
    float wind = (0.03 + mid * 0.16) * sin(t * 1.1) + 0.02 * sin(t * 2.7);
    if (abs(tq.x) < 0.6 && tq.y > -0.05 && tq.y < 0.85) {
        for (int i = 0; i < 5; i++) {
            float fi = float(i);
            float side = mod(fi, 2.0) * 2.0 - 1.0;
            float sway = wind * (0.6 + fi * 0.25) * (1.0 + 0.3 * sin(t * 1.9 + fi * 2.1));
            vec2 bq = rot2(side * (0.85 - fi * 0.10) + sway) * (tq - vec2(0.0, 0.30 + fi * 0.10));
            float len = 0.34 - fi * 0.04;
            float br = max(abs(bq.x + 0.025 * sin(bq.y * 14.0)) - 0.010 * (1.0 - bq.y / len), max(-bq.y, bq.y - len));
            vec2 rq = rot2(-side * 0.7 + sway * 1.5) * (bq - vec2(0.0, len * 0.65));
            br = min(br, max(abs(rq.x) - 0.004, max(-rq.y, rq.y - len * 0.35)));
            tree = min(tree, br);
        }
    }
    float treeM = 1.0 - smoothstep(-0.002, 0.002, tree);
    vec3 bark = vec3(0.020, 0.016, 0.018) * (0.7 + 0.6 * noise21(tq * vec2(30.0, 8.0)));
    col = mix(col, bark + flashCol * flash * 0.04, treeM);
    col += haloC * 0.25 * moonGain * hkLine(tree, 1.0) * step(0.0, tq.x + 0.02) * (1.0 - treeM * 0.5);

    // --- PIANO: un alma por tecla, sale de la tumba en esa posicion ---
    vec3 soulC = mix(vec3(0.70, 0.85, 1.0), vec3(1.0, 0.55, 0.50), bloodMoon * 0.6);
    if (pT.y > horizon - 0.15 && pT.y < horizon + 1.25) {
        for (int k = 0; k < N_KEYS; k++) {
            float env = keyEnv(k, 0.12, 1.8);
            if (env < 0.005) continue;
            float vel = keyVel(k);
            float age = keyAge(k);
            float kx = hkKeyX(k);
            float sy = pT.y - horizon;
            // sube mientras dura; apretada, sigue subiendo hasta flotar arriba
            float top = 0.10 + min(age * (0.30 + vel * 0.45), 0.85 + vel * 0.25);
            float wob = (noise21(vec2(sy * 4.0 - uKclock * 1.6, float(k) * 7.0 + keyPos(k) * 31.0)) - 0.5) * (0.04 + sy * 0.20);
            float wdt = (0.018 + sy * 0.07) * (0.7 + vel * 0.9);
            float d = (pT.x - kx - wob) / wdt;
            float a = exp(-d * d) * smoothstep(-0.02, 0.06, sy) * (1.0 - smoothstep(top - 0.30, top, sy));
            a *= 0.6 + 0.4 * noise21(vec2(pT.x * 16.0, sy * 8.0 - uKclock * 2.5 + float(k)));
            vec2 head = vec2(kx + wob, horizon + top - 0.10);
            float hd = dot(pT - head, pT - head);
            col += soulC * (a * 0.55 + exp(-hd * 260.0) * 0.55 + exp(-hd * 2600.0) * 0.6) * env * (0.45 + vel * 0.9);
            // la tumba de donde sale brilla un momento
            vec2 g = (pT - vec2(kx, horizon + 0.02)) * vec2(1.0, 3.0);
            col += soulC * exp(-dot(g, g) * 22.0) * env * 0.35 * exp(-age * 1.2);
        }
    }

    // --- CLIMAX: en el pico suben almas de todas las tumbas ---
    float climaxSouls = C.y + C.z * 0.35;
    if (climaxSouls > 0.01 && pT.y > horizon - 0.1 && pT.y < horizon + 1.1) {
        for (int s = 0; s < 7; s++) {
            float fs = float(s);
            float sx = (hash21(vec2(fs, 61.0)) - 0.5) * 2.0 * uAspect * 0.95;
            float ph = fract(C.w * (1.6 + hash21(vec2(fs, 62.0))) + hash21(vec2(fs, 63.0)));
            float sy = pT.y - horizon - ph * 0.25;
            float wob = (noise21(vec2(sy * 5.0 - uRTime * 1.5, fs * 9.0)) - 0.5) * (0.05 + max(sy, 0.0) * 0.18);
            float d = (pT.x - sx - wob) / (0.014 + max(sy, 0.0) * 0.06);
            float a = exp(-d * d) * smoothstep(-0.25, -0.15, sy) * (1.0 - smoothstep(0.2, 0.75, sy));
            col += soulC * a * climaxSouls * 0.45;
        }
    }

    // --- almas que suben de las tumbas con el golpe ---
    float soulAmt = hit * (0.55 + loco * 0.8);
    float soulSlot = floor(uRTime * 1.3);
    if (soulAmt > 0.04 && pT.y > horizon - 0.1 && pT.y < horizon + 0.85) {
        for (int s = 0; s < 3; s++) {
            float fs = float(s);
            if (fs > 1.0 + loco * 2.0) break;
            float sx = (hash21(vec2(soulSlot, fs + 3.0)) - 0.5) * 2.0 * uAspect * 0.9;
            float sy = pT.y - horizon;
            float wob = (noise21(vec2(sy * 5.0 - uRTime * 1.8, fs * 9.0 + soulSlot)) - 0.5) * (0.05 + sy * 0.18);
            float wdt = 0.012 + sy * 0.06;
            float d = (pT.x - sx - wob) / wdt;
            float a = exp(-d * d) * smoothstep(0.0, 0.06, sy) * (1.0 - smoothstep(0.25, 0.85, sy));
            a *= 0.6 + 0.4 * noise21(vec2(pT.x * 18.0, sy * 9.0 - uRTime * 3.0));
            col += vec3(0.70, 0.85, 1.0) * a * soulAmt * 0.55;
        }
    }

    // --- niebla: dos texturas que se desplazan y se deforman (barato) ---
    float fogAmt = 0.0;
    float boil = 1.0 + loco * hit * 1.5;
    vec2 warp = vec2(noise21(pT * 0.9 + vec2(0.0, t * 0.05)), noise21(pT * 0.9 + vec2(5.2, 1.3) - t * 0.04)) - 0.5;
    if (pT.y < horizon + 0.42) {
        for (int i = 0; i < 2; i++) {
            float fi = float(i);
            vec2 fu = vec2(pT.x * (0.11 + fi * 0.05) - t * (0.0065 + fi * 0.0075) * boil,
                           pT.y * (0.60 + fi * 0.25) + fi * 0.37);
            fu += warp * (0.05 + fi * 0.03);
            fu.y += sin(pT.x * 2.0 + t * 0.4 + fi) * bass * 0.04;
            vec4 nz = plate4Wrap(fu);
            float n = i == 0 ? nz.g : nz.b;
            float band = exp(-pow((pT.y - horizon - 0.05 - fi * 0.07) / (0.17 + fi * 0.06 + uD1 * 0.10), 2.0));
            band *= 1.0 - smoothstep(horizon + 0.22, horizon + 0.42, pT.y);
            fogAmt += smoothstep(0.34, 0.80, n) * band * (0.75 - fi * 0.10);
        }
    }
    fogAmt *= (0.95 + uD1 * 0.85 + bass * 0.55) * fogAct;
    float towardMoon = exp(-abs(pT.x - mc.x) * 1.1);
    float fogGlow = (0.40 + towardMoon * 0.35 * moonGain) + bass * 0.75 + flash * 0.8;
    fogAmt = mix(fogAmt, smoothstep(0.0, 1.4, fogAmt) * 0.8, sty);   // aerografo: niebla como velo, sin manchas
    col = mix(col, fogTint * fogGlow, clamp(fogAmt, 0.0, 0.92));

    // --- fuegos fatuos ---
    vec3 wispC = mix(vec3(0.55, 0.85, 1.0), vec3(0.45, 1.0, 0.55), uD5);
    // D5 suma fuegos fatuos de a uno: el nuevo se enciende de a poco
    float nW = 2.0 + uD5 * 4.0 + parade * 4.0;
    for (int i = 0; i < 10; i++) {
        float fi = float(i);
        if (fi >= nW) break;
        float wOn = revealAt(nW, fi);
        float h1 = hash21(vec2(fi, 11.0)), h2 = hash21(vec2(fi, 23.0));
        float spd = 0.010 + h2 * 0.012 + parade * 0.03;
        float wx = mix(-uAspect - 0.3, uAspect + 0.3, fract(h1 + t * spd));
        float band = (mod(fi, 2.0) < 0.5) ? mid : high;
        float wy = horizon + 0.03 + h2 * 0.16 + 0.025 * sin(t * (0.7 + h1) + fi * 2.0) + band * 0.05 * sin(t * 5.0 + fi);
        vec2 wd = pT - vec2(wx, wy);
        float r2 = dot(wd, wd);
        if (r2 > 0.04) continue;
        float flick = 0.7 + 0.3 * sin(uRTime * (9.0 + h1 * 7.0) + fi) * (0.4 + high);
        col += wispC * (exp(-r2 * 900.0) * 0.9 + exp(-r2 * 90.0) * 0.18) * flick * (0.6 + band * 0.9) * wOn;
        col += vec3(1.0) * exp(-r2 * 9000.0) * 0.6 * flick * wOn;
    }

    // --- primer plano: lapidas cercanas, cruz celta, suelo y pasto ---
    vec4 nr = plate3(plateUV(pN, NEAR_Y));
    vec4 nn = plate7(plateUV(pN, NEAR_Y));
    vec3 nc = plateCol(nr.rgb);
    float nearLight = light * 2.4 * (0.80 + 0.20 * towardMoon);
    vec3 nearPre = (nc * nearLight * mix(1.0, 0.22, sty) + nc * flashCol * flash * 2.6) * bloodLight;   // suelo y pasto: luz horneada
    vec3 flashDirN = normalize(vec3(clamp((bx - pN.x) * 0.7, -1.2, 1.2), 0.9, 0.45));
    vec3 nearStone = stoneLight(nc, nn.rg, nn.b, nearLight * mix(1.0, 0.22, sty), flashDirN, flash * 1.0, flashCol) * bloodLight;
    col = mix(col, mix(nearPre, nearStone, nn.a), nr.a);
    // borde de la silueta encendido por el resplandor de atras (halo naranja)
    if (sty > 0.001) col += hkStyleMap(0.60) * nr.a * (1.0 - nr.a) * 1.5 * sty * 0.6;
    // la niebla baja cubre el pie de las lapidas cercanas y el suelo
    vec2 nu = vec2(pN.x * 0.07 - t * 0.010, pN.y * 0.35 + 0.5) + warp * 0.06;
    vec4 nz2 = plate4Wrap(nu);
    float nearFog = smoothstep(0.38, 0.75, nz2.g) * exp(-pow((pN.y + 0.70) / (0.12 + uD1 * 0.06), 2.0));
    nearFog += smoothstep(0.45, 0.80, nz2.a) * smoothstep(-0.55, -1.05, pN.y) * (0.25 + uD1 * 0.3);
    col = mix(col, fogTint * fogGlow * 0.7, clamp(nearFog * (0.6 + bass * 0.4) * fogAct, 0.0, 0.8));

    // --- grading: sombras frias, luces calidas ---
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col += vec3(0.004, 0.010, 0.016) * (1.0 - smoothstep(0.0, 0.25, lum));
    col *= mix(vec3(1.0), vec3(1.05, 1.0, 0.93), smoothstep(0.35, 1.0, lum));

    col = audioLift(col, high * 0.10);
    return vec4(hkFinish(col, uv, vec3(0.5, 0.3, 0.8)), 1.0);
}
