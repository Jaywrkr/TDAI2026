// ===============================================================
// HALLOWEEN 00 - CEMENTERIO EN LA NIEBLA
// Plano de cine en capas con profundidad real (parallax): cielo con
// estrellas, luna con corona, nubes con borde de luz, una sierra lejana
// de pinos con una capilla de ventana encendida, colinas, una reja de
// hierro, el cementerio con lapidas, cruces y un arbol muerto, fuegos
// fatuos flotando en la niebla y, delante de todo, una cruz celta y
// pasto en silueta. La camara se desliza despacio y cada capa se mueve
// distinto (lo lejano casi nada, lo cercano mucho).
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la niebla se hincha y se enciende; late la ventana
//   medios -> el viento mueve las ramas; los fuegos fatuos suben y bajan
//   agudos -> titilan las estrellas; chispean los fuegos fatuos
//   golpe  -> relampago (D4) y almas que suben de las tumbas
// Speed mueve nubes, niebla, camara y viento aun en silencio.
// HISTORIA: cada acto (~78 s) cambia encuadre, nubes y niebla; cada
// ~47 s una tormenta seca con relampagos solos; cada ~2 min la luna se
// pone roja; cada ~71 s cruza una procesion de fuegos fatuos.
// LOCURA (Chaos): sacudida, rayo doble, niebla que hierve, mas almas.
//
// @D1: densidad de la niebla
// @D2: cantidad de lapidas
// @D3: brillo de la luna y sus rayos
// @D4: relampagos con el golpe
// @D5: niebla verde toxica y fuegos fatuos
// @D6: altura del horizonte
// ===============================================================

float hwTomb(vec2 p, float w, float h, float cross) {
    float body = hkBox(p - vec2(0.0, h * 0.42), vec2(w, h * 0.42));
    float top = length(p - vec2(0.0, h * 0.84)) - w;
    float stone = min(body, top);
    float post = hkBox(p - vec2(0.0, h * 0.50), vec2(w * 0.26, h * 0.50));
    float arm = hkBox(p - vec2(0.0, h * 0.72), vec2(w * 0.85, w * 0.24));
    return mix(stone, min(post, arm), step(0.5, cross));
}

// Cruz celta de primer plano: poste, brazos, anillo y base escalonada.
float hwCeltic(vec2 p) {
    float post = hkBox(p - vec2(0.0, 0.40), vec2(0.045, 0.40));
    float arm = hkBox(p - vec2(0.0, 0.58), vec2(0.20, 0.042));
    float ring = abs(length(p - vec2(0.0, 0.58)) - 0.12) - 0.018;
    ring = max(ring, -hkBox(p - vec2(0.0, 0.58), vec2(0.030, 0.030)));
    float base = hkBox(p - vec2(0.0, 0.03), vec2(0.13, 0.05));
    float base2 = hkBox(p - vec2(0.0, 0.10), vec2(0.085, 0.03));
    return min(min(min(post, arm), ring), min(base, base2));
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
    vec2 dolly = vec2(sin(uRTime * 0.035) * 0.20 + sin(uRTime * 0.013 + 1.0) * 0.10, 0.0);
    vec2 camD = pc - p0;
    #define LAYER(k) (p0 + (camD + dolly) * (k))
    vec2 pS = LAYER(0.12);   // cielo y luna
    vec2 pF = LAYER(0.30);   // sierra lejana
    vec2 pH = LAYER(0.55);   // colinas
    vec2 pR = LAYER(0.78);   // reja
    vec2 pT = LAYER(1.00);   // cementerio
    vec2 pN = LAYER(1.85);   // primer plano

    // historia
    float cover = hkActVal(1.0);
    float fogAct = mix(0.7, 1.35, hkActVal(2.0));
    float storm = hkEvent(5.0, 47.0, 9.0);
    float bloodMoon = hkEvent(6.0, 131.0, 22.0);
    float parade = hkEvent(7.0, 71.0, 14.0);
    float autoFlash = storm * step(0.82, noise21(vec2(uRTime * 7.0, 3.0)));
    float flash = max(hit * (0.25 + uD4 * 1.0) * (1.0 + loco * 0.6), autoFlash * 0.9);
    vec3 flashCol = vec3(0.78, 0.72, 1.0);

    float horizon = -0.36 + (uD6 - 0.5) * 0.36;
    vec3 fogTint = mix(vec3(0.62, 0.56, 0.80), vec3(0.32, 0.95, 0.40), uD5);

    // --- cielo: gradiente, banda de bruma y estrellas que titilan ---
    vec3 skyLow = hsv2rgb(vec3(fract(0.77 + hue), 0.62, 0.34));
    vec3 skyHigh = hsv2rgb(vec3(fract(0.70 + hue), 0.85, 0.035));
    vec3 col = mix(skyLow, skyHigh, smoothstep(-0.45, 1.0, pS.y));
    col += skyLow * 0.10 * noise21(pS * vec2(0.9, 2.2) + 4.0) * smoothstep(1.0, 0.0, abs(pS.y - 0.35 + pS.x * 0.12));
    vec2 sg = floor(pS * 110.0);
    float sh = hash21(sg);
    float tw = 0.55 + 0.45 * sin(t * (1.5 + sh * 5.0) * (1.0 + high * 2.5) + sh * 60.0);
    col += vec3(0.78, 0.78, 1.0) * step(0.9935, sh) * tw * (0.55 + high * 0.9) * smoothstep(0.0, 0.8, pS.y);

    // --- luna con mares, limbo, halo y corona ---
    vec2 mc = vec2(uAspect * 0.42, 0.46);
    vec2 mp = pS - mc;
    float mr = length(mp);
    float moonR = 0.23;
    float moonGain = 0.45 + uD3 * 1.05;
    float disk = 1.0 - smoothstep(moonR - 0.003, moonR + 0.003, mr);
    vec3 moonTex = mix(vec3(1.0, 0.90, 0.70), vec3(1.0, 0.30, 0.18), bloodMoon);
    if (mr < moonR + 0.01) {
        float maria = fbm(mp * 5.5 + 3.1, 4, 0.55);
        float craters = ridge(noise21(mp * 22.0), 3.0);
        float limb = sqrt(max(1.0 - pow(mr / moonR, 2.0), 0.0));
        moonTex *= (0.55 + 0.45 * limb) * (0.78 + 0.30 * maria - 0.10 * smoothstep(0.5, 0.75, maria)) * (0.92 + 0.08 * craters);
    }
    vec3 haloC = mix(vec3(0.95, 0.65, 0.45), vec3(1.0, 0.25, 0.12), bloodMoon);
    col += haloC * exp(-max(mr - moonR, 0.0) * 4.5) * 0.32 * moonGain * (1.0 + bass * 0.25);
    col += vec3(0.8, 0.7, 0.9) * exp(-max(mr - moonR, 0.0) * 1.2) * 0.06 * moonGain;
    col += haloC * exp(-pow((mr - moonR * 1.9) * 18.0, 2.0)) * 0.05 * moonGain;   // corona
    col = mix(col, moonTex * moonGain, disk);

    // --- nubes con borde iluminado por la luna ---
    float cl = fbm(vec2(pS.x * 1.1 + t * 0.045, pS.y * 2.5 - t * 0.01), 4, 0.55);
    float clouds = smoothstep(0.58 - cover * 0.18, 0.84 - cover * 0.12, cl) * smoothstep(-0.25, 0.35, pS.y);
    float rim = smoothstep(0.50, 0.62, cl) - smoothstep(0.62, 0.80, cl);
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
    col += vec3(0.75, 0.70, 0.85) * rays * (0.03 + uD3 * 0.42) * (1.0 - clouds * 0.5);

    // --- sierra muy lejana (casi del color del cielo) ---
    float ridge2 = horizon + 0.40 + 0.06 * sin(pS.x * 0.6 + 2.0) + 0.05 * noise21(vec2(pS.x * 1.3, 8.0));
    col = mix(col, mix(skyLow * 0.75, col, 0.35), 1.0 - smoothstep(ridge2 - 0.004, ridge2 + 0.004, pS.y));

    // --- sierra lejana de pinos con capilla (perspectiva aerea: clara) ---
    float ridgeY = horizon + 0.30 + 0.07 * sin(pF.x * 0.9 + 1.0) + 0.04 * noise21(vec2(pF.x * 2.0, 3.0));
    float cellT = pF.x * 24.0;
    float fT = fract(cellT) - 0.5;
    float idT = floor(cellT);
    float hT = (0.045 + 0.07 * hash21(vec2(idT, 1.0))) * step(0.22, hash21(vec2(idT, 2.0)));
    float yy = (pF.y - ridgeY) / max(hT, 1e-3);
    // pino por pisos: angosto, con ramas escalonadas
    float halfW = 0.42 * (1.0 - yy) * (0.70 + 0.30 * fract(yy * 4.0 + hash21(vec2(idT, 3.0))));
    float pineD = (abs(fT + (hash21(vec2(idT, 4.0)) - 0.5) * 0.3) - halfW) / 24.0;
    pineD = max(pineD, max(-yy, yy - 1.0) * hT);
    float farTop = ridgeY;
    vec2 cq = pF - vec2(-uAspect * 0.36, ridgeY - 0.01);
    float chapel = hkBox(cq - vec2(0.0, 0.05), vec2(0.075, 0.05));
    chapel = min(chapel, max(abs(cq.x) * 1.1 + (cq.y - 0.10) - 0.08, 0.10 - cq.y));
    chapel = min(chapel, hkBox(cq - vec2(-0.05, 0.13), vec2(0.016, 0.07)));
    chapel = min(chapel, max(abs(cq.x + 0.05) * 3.0 + (cq.y - 0.20) - 0.07, 0.20 - cq.y));
    float farD = min(min(pF.y - farTop, pineD), chapel);
    float farM = 1.0 - smoothstep(-0.003, 0.003, farD);
    vec3 farC = mix(skyLow * 0.55, fogTint * 0.22, 0.35);
    col = mix(col, farC, farM);
    // ventana de la capilla: vela que parpadea y late con el bajo
    float win = hkBox(cq - vec2(0.022, 0.045), vec2(0.010, 0.018));
    float candle = 0.65 + 0.35 * noise21(vec2(uRTime * 5.0, 1.7));
    vec3 warm = vec3(1.0, 0.62, 0.25);
    col = mix(col, warm * candle * (0.9 + bass * 1.2), 1.0 - smoothstep(-0.002, 0.002, win));
    col += warm * exp(-length(cq - vec2(0.022, 0.045)) * 28.0) * 0.35 * candle * (0.6 + bass);
    // niebla lejana entre la sierra y las colinas
    col = mix(col, fogTint * 0.30, exp(-pow((pF.y - ridgeY + 0.02) / 0.06, 2.0)) * 0.45);

    // --- colinas en capas ---
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        float hy = horizon + 0.20 - fi * 0.10 + 0.06 * sin(pH.x * (1.2 + fi) + fi * 4.0) + 0.04 * noise21(vec2(pH.x * 3.0, fi));
        float m = 1.0 - smoothstep(hy - 0.004, hy + 0.004, pH.y);
        vec3 hc = mix(skyLow * 0.35, skyLow * 0.12, fi);
        col = mix(col, hc, m);
        col += haloC * 0.10 * moonGain * exp(-abs(pH.y - hy) * 120.0) * exp(-abs(pH.x - mc.x) * 0.8);
    }

    // --- reja de hierro a tramos ---
    float fBase = horizon + 0.035 + 0.025 * sin(pR.x * 1.7 + 1.3);
    if (pR.y > fBase - 0.01 && pR.y < fBase + 0.15) {
        float seg = step(0.35, hash21(vec2(floor(pR.x / 1.4), 8.0)));
        float fx = (fract(pR.x / 0.045) - 0.5) * 0.045;
        float tip = fBase + 0.115 + 0.006 * sin(floor(pR.x / 0.045) * 2.3) - abs(fx) * 3.0;
        float bar = max(abs(fx) - 0.0032, max(fBase - pR.y, pR.y - tip));
        float rail = min(abs(pR.y - fBase - 0.088) - 0.0035, abs(pR.y - fBase - 0.025) - 0.0035);
        float fence = min(bar, rail);
        float fm = (1.0 - smoothstep(-0.0015, 0.0015, fence)) * seg;
        col = mix(col, skyLow * 0.10, fm);
        col += haloC * 0.25 * moonGain * fm * smoothstep(0.0, 0.004, fx + 0.0032) * step(fx, 0.0);
    }

    // --- arbol muerto: las ramas se mecen con el viento y los medios ---
    vec2 tq = pT - vec2(-uAspect * 0.70, horizon);
    float trunk = abs(tq.x + 0.03 * sin(tq.y * 5.0)) - (0.035 - tq.y * 0.02);
    trunk = max(trunk, max(-tq.y, tq.y - 0.75));
    float tree = trunk;
    float wind = (0.03 + mid * 0.16) * sin(t * 1.1) + 0.02 * sin(t * 2.7);
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float side = mod(fi, 2.0) * 2.0 - 1.0;
        float sway = wind * (0.6 + fi * 0.25) * (1.0 + 0.3 * sin(t * 1.9 + fi * 2.1));
        vec2 bq = rot2(side * (0.85 - fi * 0.10) + sway) * (tq - vec2(0.0, 0.30 + fi * 0.10));
        float len = 0.34 - fi * 0.04;
        float br = max(abs(bq.x + 0.025 * sin(bq.y * 14.0)) - 0.010 * (1.0 - bq.y / len), max(-bq.y, bq.y - len));
        // ramitas al final de cada rama
        vec2 rq = rot2(-side * 0.7 + sway * 1.5) * (bq - vec2(0.0, len * 0.65));
        br = min(br, max(abs(rq.x) - 0.004, max(-rq.y, rq.y - len * 0.35)));
        tree = min(tree, br);
    }

    // --- suelo y lapidas ---
    float hills = horizon + 0.05 * sin(pT.x * 1.7 + 1.3) + 0.03 * sin(pT.x * 4.1);
    float groundD = pT.y - hills;
    float cellW = 0.40 / (0.55 + uD2 * 1.1 + uDensity * 0.4);
    float cx = floor(pT.x / cellW);
    float tombD = 1e3;
    float soulX = 1e3, soulBase = 0.0;
    bool tombZone = pT.y < horizon + cellW * 1.45;
    float soulSlot = floor(uRTime * 1.3);
    for (int k = -1; k <= 1; k++) {
        if (!tombZone) break;
        float id = cx + float(k);
        if (hash21(vec2(id, 4.7)) < 0.30) continue;
        float w = cellW * (0.16 + 0.12 * hash21(vec2(id, 1.3)));
        float h = cellW * (0.55 + 0.75 * hash21(vec2(id, 9.1)));
        float base = horizon + 0.05 * sin((id + 0.5) * cellW * 1.7 + 1.3) + 0.03 * sin((id + 0.5) * cellW * 4.1) - 0.01;
        vec2 q = pT - vec2((id + 0.5 + (hash21(vec2(id, 2.2)) - 0.5) * 0.4) * cellW, base);
        q = rot2((hash21(vec2(id, 7.7)) - 0.5) * 0.35) * q;
        tombD = min(tombD, hwTomb(q, w, h, step(0.78, hash21(vec2(id, 5.5)))));
    }
    // fuera de la zona: distancia aproximada y continua (si queda en 1e3,
    // fwidth salta en el borde de la zona y dibuja una linea en el cielo)
    if (!tombZone) tombD = pT.y - horizon - cellW * 1.3;
    float solidD = min(min(tombD, tree), groundD);
    float solid = 1.0 - smoothstep(-0.002, 0.002, solidD);
    vec2 gn = vec2(dFdx(tombD), dFdy(tombD));
    float side = clamp(dot(normalize(gn + 1e-6), normalize(mc - pT)), 0.0, 1.0);
    float stoneTex = 0.5, moss = 0.0;
    if (tombD < 0.01) {
        stoneTex = fbm(pT * vec2(18.0, 30.0), 3, 0.6);
        moss = smoothstep(0.55, 0.75, fbm(pT * 9.0 + 2.0, 3));
    }
    vec3 stoneC = mix(vec3(0.05, 0.048, 0.06), vec3(0.03, 0.05, 0.03), moss) * (0.6 + 0.8 * stoneTex);
    float inTomb = 1.0 - smoothstep(-0.002, 0.002, tombD);
    // suelo con textura de tierra y musgo que se aclara hacia la luna
    float soil = noise21(pT * vec2(9.0, 26.0));
    vec3 groundC = vec3(0.012, 0.010, 0.016) * (0.7 + 0.6 * soil) + haloC * 0.02 * moonGain * exp(-abs(pT.x - mc.x) * 0.9) * smoothstep(hills - 0.25, hills, pT.y);
    vec3 solidC = mix(groundC, stoneC * (0.5 + 0.6 * moonGain), inTomb * 0.85);
    col = mix(col, solidC, solid);
    vec3 rimCol = mix(vec3(0.95, 0.72, 0.48), flashCol, clamp(flash, 0.0, 1.0));
    float rimL = edgeLine(tombD, 1.6) * (0.25 + 0.75 * side) * step(hills - 0.01, pT.y);
    col += rimCol * rimL * (0.35 + uD3 * 0.35 + flash * 1.6);
    col += flashCol * inTomb * flash * 0.25 * (0.4 + stoneTex);
    float grass = step(0.0, groundD) * (1.0 - smoothstep(0.0, 0.03 * noise21(vec2(pT.x * 120.0, 1.0)), groundD));
    col = mix(col, vec3(0.008), grass * 0.9);

    // --- almas que suben de las tumbas con el golpe ---
    float soulAmt = hit * (0.55 + loco * 0.8);
    if (soulAmt > 0.04 && pT.y > horizon - 0.1 && pT.y < horizon + 0.85) {
        for (int s = 0; s < 3; s++) {
            float fs = float(s);
            if (fs > 1.0 + loco * 2.0) break;
            float sx = (floor((hash21(vec2(soulSlot, fs + 3.0)) - 0.5) * 2.0 * uAspect / cellW) + 0.5) * cellW;
            float sy = pT.y - horizon;
            float wob = (noise21(vec2(sy * 5.0 - uRTime * 1.8, fs * 9.0 + soulSlot)) - 0.5) * (0.05 + sy * 0.18);
            float wdt = 0.012 + sy * 0.06;
            float d = (pT.x - sx - wob) / wdt;
            float a = exp(-d * d) * smoothstep(0.0, 0.06, sy) * (1.0 - smoothstep(0.25, 0.85, sy));
            a *= 0.6 + 0.4 * noise21(vec2(pT.x * 18.0, sy * 9.0 - uRTime * 3.0));
            col += vec3(0.70, 0.85, 1.0) * a * soulAmt * 0.55;
        }
    }

    // --- niebla volumetrica a ras del suelo ---
    float fogAmt = 0.0;
    float boil = 1.0 + loco * hit * 1.5;
    bool fogZone = pT.y < horizon + 0.42;
    for (int i = 0; i < 2; i++) {
        if (!fogZone) break;
        float fi = float(i);
        vec2 fq = vec2(pT.x * (1.1 + fi * 0.5) - t * (0.05 + fi * 0.035) * (fi + 1.0),
                       pT.y * (3.0 + fi) + fi * 7.0);
        fq.y += sin(pT.x * 2.0 + t * 0.4 + fi) * bass * 0.18;
        float n = (i == 0) ? hkFog(fq * 0.8, t * boil) : fbm(fq + vec2(t * 0.02 * boil, 0.0), 4, 0.55);
        float band = exp(-pow((pT.y - horizon - 0.05 - fi * 0.07) / (0.17 + fi * 0.06 + uD1 * 0.10), 2.0));
        band *= 1.0 - smoothstep(horizon + 0.22, horizon + 0.42, pT.y);   // sin borde duro arriba
        fogAmt += smoothstep(0.35, 0.85, n) * band * (0.70 - fi * 0.10);
    }
    fogAmt *= (0.95 + uD1 * 0.85 + bass * 0.55) * fogAct;
    float towardMoon = exp(-abs(pT.x - mc.x) * 1.1);
    float fogGlow = (0.40 + towardMoon * 0.35 * moonGain) + bass * 0.75 + flash * 0.8;
    col = mix(col, fogTint * fogGlow, clamp(fogAmt, 0.0, 0.92));

    // --- fuegos fatuos: flotan en la niebla; medios los mecen, agudos
    //     los hacen chispear; la procesion cruza cada ~71 s ---
    vec3 wispC = mix(vec3(0.55, 0.85, 1.0), vec3(0.45, 1.0, 0.55), uD5);
    float nW = 2.0 + floor(uD5 * 4.0 + parade * 4.0);
    for (int i = 0; i < 10; i++) {
        float fi = float(i);
        if (fi >= nW) break;
        float h1 = hash21(vec2(fi, 11.0)), h2 = hash21(vec2(fi, 23.0));
        float spd = 0.010 + h2 * 0.012 + parade * 0.03;
        float wx = mix(-uAspect - 0.3, uAspect + 0.3, fract(h1 + t * spd));
        float band = (mod(fi, 2.0) < 0.5) ? mid : high;
        float wy = horizon + 0.03 + h2 * 0.16 + 0.025 * sin(t * (0.7 + h1) + fi * 2.0) + band * 0.05 * sin(t * 5.0 + fi);
        vec2 wd = pT - vec2(wx, wy);
        float r2 = dot(wd, wd);
        if (r2 > 0.04) continue;
        float flick = 0.7 + 0.3 * sin(uRTime * (9.0 + h1 * 7.0) + fi) * (0.4 + high);
        col += wispC * (exp(-r2 * 900.0) * 0.9 + exp(-r2 * 90.0) * 0.18) * flick * (0.6 + band * 0.9);
        col += vec3(1.0) * exp(-r2 * 9000.0) * 0.6 * flick;
    }

    // --- fila de lapidas cercanas (mas grandes y oscuras, otra capa) ---
    vec2 pM = LAYER(1.35);
    float cellN = cellW * 2.3;
    float rowY = horizon - 0.32;
    float nearD = 1e3;
    if (pM.y < rowY + cellN * 1.5 && pM.y > rowY - 0.08) {
        float cn = floor(pM.x / cellN);
        for (int k = -1; k <= 1; k++) {
            float id = cn + float(k);
            if (hash21(vec2(id, 14.7)) < 0.45) continue;
            float w = cellN * (0.16 + 0.10 * hash21(vec2(id, 11.3)));
            float h = cellN * (0.55 + 0.60 * hash21(vec2(id, 19.1)));
            vec2 q = pM - vec2((id + 0.5 + (hash21(vec2(id, 12.2)) - 0.5) * 0.4) * cellN, rowY + 0.03 * sin(id * 1.7) - 0.01);
            q = rot2((hash21(vec2(id, 17.7)) - 0.5) * 0.30) * q;
            nearD = min(nearD, hwTomb(q, w, h, step(0.70, hash21(vec2(id, 15.5)))));
        }
    } else {
        nearD = abs(pM.y - rowY) + 0.05;
    }
    float nearM = 1.0 - smoothstep(-0.002, 0.002, nearD);
    // piedra cercana: textura, luz de luna desde arriba y moho abajo
    float nearTex = noise21(pM * vec2(14.0, 24.0)) * 0.6 + noise21(pM * vec2(45.0, 70.0)) * 0.4;
    float vert = smoothstep(rowY, rowY + cellN * 1.1, pM.y);
    vec3 nearC = mix(vec3(0.014, 0.020, 0.014), vec3(0.040, 0.036, 0.048), vert) * (0.45 + 1.0 * nearTex) * (0.6 + 0.5 * moonGain);
    nearC += flashCol * flash * 0.18 * nearTex;
    col = mix(col, nearC, nearM);
    float nearRim = hkLine(nearD, 1.3) * smoothstep(rowY - 0.02, rowY + 0.02, pM.y);
    col += rimCol * nearRim * (0.18 + uD3 * 0.30 + flash * 1.3);
    // la niebla baja cubre el pie de las lapidas cercanas
    col = mix(col, fogTint * fogGlow * 0.75, clamp(fogAmt, 0.0, 0.9) * exp(-pow((pM.y - rowY) / 0.10, 2.0)) * 0.85);

    // --- bruma de primer plano ---
    if (pN.y < -0.35) {
        float fm = noise21(vec2(pN.x * 1.3 - t * 0.09, pN.y * 3.2)) * noise21(vec2(pN.x * 2.9 + t * 0.05, pN.y * 5.0 + 3.0));
        col += fogTint * smoothstep(0.15, 0.45, fm) * smoothstep(-0.35, -0.75, pN.y) * (0.10 + uD1 * 0.12 + bass * 0.10) * fogAct;
    }

    // --- primer plano: cruz celta y pasto en silueta ---
    vec2 kq = (pN - vec2(uAspect * 0.86, -1.02)) / 1.05;
    kq = rot2(0.06) * kq;
    float celt = hwCeltic(kq) * 1.05;
    float blades = pN.y - (-0.90 + 0.05 * noise21(vec2(pN.x * 9.0, 0.0)) + 0.06 * pow(noise21(vec2(pN.x * 55.0 + sin(t * 1.3 + pN.x * 3.0) * (0.3 + mid), 2.0)), 2.0));
    float fgD = min(celt, blades);
    float fg = 1.0 - smoothstep(-0.002, 0.002, fgD);
    col = mix(col, vec3(0.004, 0.003, 0.006), fg);
    // borde de luna y relampago en la cruz (la luna queda a su izquierda)
    float kr = hkLine(celt, 1.4) * smoothstep(0.03, -0.03, kq.x + 0.0) * step(0.0, kq.y);
    col += rimCol * kr * (0.25 + uD3 * 0.3 + flash * 1.4);

    // --- grading: sombras frias, luces calidas ---
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col += vec3(0.004, 0.010, 0.016) * (1.0 - smoothstep(0.0, 0.25, lum));
    col *= mix(vec3(1.0), vec3(1.05, 1.0, 0.93), smoothstep(0.35, 1.0, lum));

    col = audioLift(col, high * 0.10);
    return vec4(hkFinish(col, uv, vec3(0.5, 0.3, 0.8)), 1.0);
}
