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
// Speed mueve nubes, niebla, camara y viento aun en silencio.
// HISTORIA: cada acto (~78 s) cambia encuadre, nubes y niebla; cada
// ~47 s una tormenta seca; cada ~2 min la luna se pone roja; cada ~71 s
// cruza una procesion de fuegos fatuos.
// LOCURA (Chaos): sacudida, rayo doble, niebla que hierve, mas almas.
//
// @D1: densidad de la niebla
// @D2: cantidad de lapidas
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
    float bloodMoon = hkEvent(6.0, 131.0, 22.0);
    float parade = hkEvent(7.0, 71.0, 14.0);
    float autoFlash = storm * step(0.82, noise21(vec2(uRTime * 7.0, 3.0)));
    float flash = max(hit * (0.25 + uD4 * 1.0) * (1.0 + loco * 0.6), autoFlash * 0.9);
    vec3 flashCol = vec3(0.78, 0.72, 1.0);

    float dh = (uD6 - 0.5) * 0.36;
    float horizon = -0.36 + dh;
    vec3 fogTint = mix(vec3(0.62, 0.56, 0.80), vec3(0.32, 0.95, 0.40), uD5);
    float moonGain = 0.45 + uD3 * 1.05;
    float light = 0.55 + 0.45 * moonGain;      // cuanto ilumina la luna la piedra

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
        col = mix(col, moonTint * mt.r * moonGain * 1.15, mt.a);
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
    col += vec3(0.75, 0.70, 0.85) * rays * (0.03 + uD3 * 0.42) * (1.0 - clouds * 0.5);

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

    // --- colinas, reja y lapidas (D2 pasa de pocas grandes a muchas) ---
    vec2 muv = plateUVGround(pT - vec2(0.0, dh), MID_Y);
    vec4 ma = plate1(muv), mb = plate2(muv);
    // fundido corto a mitad de perilla: casi siempre se ve una sola version
    // (un fundido largo dejaria todas las lapidas semitransparentes)
    float dMix = smoothstep(0.42, 0.58, uD2);
    vec3 mpre = mix(plateCol(ma.rgb) * ma.a, plateCol(mb.rgb) * mb.a, dMix);
    float mAlpha = mix(ma.a, mb.a, dMix);
    vec3 midLit = mpre * light * 1.9 + mpre * flashCol * flash * 2.4;
    col = col * (1.0 - mAlpha) + midLit;

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
    col = mix(col, fogTint * fogGlow, clamp(fogAmt, 0.0, 0.92));

    // --- fuegos fatuos ---
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

    // --- primer plano: lapidas cercanas, cruz celta, suelo y pasto ---
    vec4 nr = plate3(plateUV(pN, NEAR_Y));
    vec3 nc = plateCol(nr.rgb);
    float nearLight = light * 2.4 * (0.80 + 0.20 * towardMoon);
    col = mix(col, nc * nearLight + nc * flashCol * flash * 2.6, nr.a);
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
