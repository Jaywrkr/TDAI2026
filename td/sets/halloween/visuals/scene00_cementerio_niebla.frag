// ===============================================================
// HALLOWEEN 00 - CEMENTERIO EN LA NIEBLA
// Luna llena con mares y halo, rayos de luz que atraviesan la niebla,
// colinas en capas, un arbol muerto, lapidas y cruces de piedra con
// textura e iluminadas por la luna, y niebla volumetrica a ras del suelo.
// Speed mueve nubes, niebla y rayos de luz. El bajo espesa y enciende la
// niebla; el golpe dispara un relampago con rayo visible que recorta
// todo. LOCURA (Chaos): sacudida, rayos dobles, niebla que hierve.
//
// @D1: densidad de la niebla
// @D2: cantidad de lapidas
// @D3: brillo de la luna y sus rayos
// @D4: relampagos con el golpe
// @D5: niebla verde toxica
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

vec4 render(vec2 uv) {
    vec2 p = hkPunch(hkShake(centered(uv)));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float flash = hit * (0.25 + uD4 * 1.0) * (1.0 + loco * 0.6);
    float hue = audioHue(uHue, mid * 0.01);

    // --- cielo con gradiente y estrellas ---
    vec3 skyLow = hsv2rgb(vec3(fract(0.77 + hue), 0.65, 0.34));
    vec3 skyHigh = hsv2rgb(vec3(fract(0.70 + hue), 0.85, 0.035));
    vec3 col = mix(skyLow, skyHigh, smoothstep(-0.45, 1.0, p.y));
    vec2 sg = floor(p * 110.0);
    col += vec3(0.75, 0.75, 1.0) * step(0.994, hash21(sg)) * smoothstep(0.0, 0.8, p.y) * 0.6;

    // --- luna con mares, limbo oscuro y halo ---
    vec2 mc = vec2(uAspect * 0.42, 0.46);
    vec2 mp = p - mc;
    float mr = length(mp);
    float moonR = 0.23;
    float moonGain = 0.75 + uD3 * 0.55;
    float disk = 1.0 - smoothstep(moonR - 0.003, moonR + 0.003, mr);
    vec3 moonTex = vec3(1.0, 0.90, 0.70);
    if (mr < moonR + 0.01) {
        float maria = fbm(mp * 5.5 + 3.1, 4, 0.55);
        float craters = ridge(noise21(mp * 22.0), 3.0);
        float limb = sqrt(max(1.0 - pow(mr / moonR, 2.0), 0.0));
        moonTex *= (0.55 + 0.45 * limb) * (0.78 + 0.30 * maria - 0.10 * smoothstep(0.5, 0.75, maria)) * (0.92 + 0.08 * craters);
    }
    col += vec3(0.95, 0.65, 0.45) * exp(-max(mr - moonR, 0.0) * 4.5) * 0.32 * moonGain;
    col += vec3(0.8, 0.7, 0.9) * exp(-max(mr - moonR, 0.0) * 1.2) * 0.06 * moonGain;
    col = mix(col, moonTex * moonGain, disk);

    // --- nubes con borde iluminado por la luna ---
    float cl = fbm(vec2(p.x * 1.1 + t * 0.045, p.y * 2.5 - t * 0.01), 5, 0.55);
    float clouds = smoothstep(0.50, 0.80, cl) * smoothstep(-0.25, 0.35, p.y);
    float rim = smoothstep(0.50, 0.62, cl) - smoothstep(0.62, 0.80, cl);
    vec3 cloudCol = mix(vec3(0.03, 0.015, 0.05), vec3(0.45, 0.36, 0.50), exp(-mr * 1.8));
    col = mix(col, cloudCol, clouds * 0.88);
    col += vec3(0.9, 0.75, 0.6) * rim * exp(-mr * 2.2) * 0.35 * moonGain;

    // --- relampago con rayo visible ---
    float slot = floor(uRTime * 1.3);
    float bx = (hash21(vec2(slot, 4.0)) - 0.5) * uAspect * 1.4;
    vec3 flashCol = vec3(0.78, 0.72, 1.0);
    float bd = hkBolt(p, bx, 1.05, -0.2, slot * 7.0, 0.35);
    if (loco > 0.5) bd = min(bd, hkBolt(p, bx + 0.6, 1.05, 0.0, slot * 3.0 + 2.0, 0.30));
    float bolt = exp(-bd * 180.0) + exp(-bd * 25.0) * 0.30;
    col += flashCol * flash * (0.12 + clouds * 0.75) * smoothstep(-0.5, 0.6, p.y);
    col += flashCol * bolt * hit * step(0.35, uD4 + loco * 0.5) * 1.6;

    // --- rayos de luz de la luna atravesando la niebla ---
    float rays = hkRays(p, mc, t, 18.0);
    col += vec3(0.75, 0.70, 0.85) * rays * (0.10 + uD3 * 0.25) * (1.0 - clouds * 0.5);

    // --- colinas lejanas en capas ---
    float horizon = -0.36 + (uD6 - 0.5) * 0.36;
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        float hy = horizon + 0.20 - fi * 0.10 + 0.06 * sin(p.x * (1.2 + fi) + fi * 4.0) + 0.04 * noise21(vec2(p.x * 3.0, fi));
        float m = 1.0 - smoothstep(hy - 0.004, hy + 0.004, p.y);
        vec3 hc = mix(skyLow * 0.35, skyLow * 0.12, fi);
        col = mix(col, hc, m);
    }

    // --- arbol muerto a la izquierda ---
    vec2 tq = p - vec2(-uAspect * 0.70, horizon);
    float trunk = abs(tq.x + 0.03 * sin(tq.y * 5.0)) - (0.035 - tq.y * 0.02);
    trunk = max(trunk, max(-tq.y, tq.y - 0.75));
    float tree = trunk;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float side = mod(fi, 2.0) * 2.0 - 1.0;
        vec2 bq = rot2(side * (0.85 - fi * 0.10)) * (tq - vec2(0.0, 0.30 + fi * 0.10));
        float len = 0.34 - fi * 0.04;
        tree = min(tree, max(abs(bq.x + 0.025 * sin(bq.y * 14.0)) - 0.010 * (1.0 - bq.y / len), max(-bq.y, bq.y - len)));
    }

    // --- suelo y lapidas ---
    float hills = horizon + 0.05 * sin(p.x * 1.7 + 1.3) + 0.03 * sin(p.x * 4.1);
    float groundD = p.y - hills;
    float cellW = 0.40 / (0.55 + uD2 * 1.1 + uDensity * 0.4);
    float cx = floor(p.x / cellW);
    float tombD = 1e3;
    for (int k = -1; k <= 1; k++) {
        float id = cx + float(k);
        if (hash21(vec2(id, 4.7)) < 0.30) continue;
        float w = cellW * (0.16 + 0.12 * hash21(vec2(id, 1.3)));
        float h = cellW * (0.55 + 0.75 * hash21(vec2(id, 9.1)));
        float base = horizon + 0.05 * sin((id + 0.5) * cellW * 1.7 + 1.3) + 0.03 * sin((id + 0.5) * cellW * 4.1) - 0.01;
        vec2 q = p - vec2((id + 0.5 + (hash21(vec2(id, 2.2)) - 0.5) * 0.4) * cellW, base);
        q = rot2((hash21(vec2(id, 7.7)) - 0.5) * 0.35) * q;
        tombD = min(tombD, hwTomb(q, w, h, step(0.78, hash21(vec2(id, 5.5)))));
    }
    float solidD = min(min(tombD, tree), groundD);
    float solid = 1.0 - smoothstep(-0.002, 0.002, solidD);
    // piedra con textura e iluminacion desde la luna
    vec2 gn = vec2(dFdx(tombD), dFdy(tombD));
    float side = clamp(dot(normalize(gn + 1e-6), normalize(mc - p)), 0.0, 1.0);
    float stoneTex = 0.5, moss = 0.0;
    if (tombD < 0.01) {
        stoneTex = fbm(p * vec2(18.0, 30.0), 4, 0.6);
        moss = smoothstep(0.55, 0.75, fbm(p * 9.0 + 2.0, 3));
    }
    vec3 stoneC = mix(vec3(0.05, 0.048, 0.06), vec3(0.03, 0.05, 0.03), moss) * (0.6 + 0.8 * stoneTex);
    float inTomb = 1.0 - smoothstep(-0.002, 0.002, tombD);
    vec3 solidC = mix(vec3(0.010, 0.008, 0.014), stoneC * (0.5 + 0.6 * moonGain), inTomb * 0.85);
    col = mix(col, solidC, solid);
    vec3 rimCol = mix(vec3(0.95, 0.72, 0.48), flashCol, clamp(flash, 0.0, 1.0));
    float rimL = edgeLine(tombD, 1.6) * (0.25 + 0.75 * side) * step(hills - 0.01, p.y);
    col += rimCol * rimL * (0.35 + uD3 * 0.35 + flash * 1.6);
    col += flashCol * inTomb * flash * 0.25 * (0.4 + stoneTex);
    // pasto en el borde del suelo
    float grass = step(0.0, groundD) * (1.0 - smoothstep(0.0, 0.03 * noise21(vec2(p.x * 120.0, 1.0)), groundD));
    col = mix(col, vec3(0.008), grass * 0.9);

    // --- niebla volumetrica a ras del suelo ---
    vec3 fogTint = mix(vec3(0.62, 0.56, 0.80), vec3(0.32, 0.95, 0.40), uD5);
    float fogAmt = 0.0;
    float boil = 1.0 + loco * hit * 1.5;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 fq = vec2(p.x * (1.1 + fi * 0.5) - t * (0.05 + fi * 0.035) * (fi + 1.0),
                       p.y * (3.0 + fi) + fi * 7.0);
        fq.y += sin(p.x * 2.0 + t * 0.4 + fi) * mid * 0.25;
        // solo la capa de adelante usa la niebla deformada (la mas cara)
        float n = (i == 0) ? hkFog(fq * 0.8, t * boil) : fbm(fq + vec2(t * 0.02 * boil, 0.0), 4, 0.55);
        float band = exp(-pow((p.y - horizon - 0.05 - fi * 0.07) / (0.17 + fi * 0.06 + uD1 * 0.10), 2.0));
        fogAmt += smoothstep(0.35, 0.85, n) * band * (0.60 - fi * 0.13);
    }
    fogAmt *= 0.95 + uD1 * 0.85 + bass * 0.55;
    float towardMoon = exp(-abs(p.x - mc.x) * 1.1);
    float fogGlow = (0.40 + towardMoon * 0.35 * moonGain) + bass * 0.75 + flash * 0.8;
    col = mix(col, fogTint * fogGlow, clamp(fogAmt, 0.0, 0.92));

    col = audioLift(col, uHigh * 0.10);
    return vec4(hkFinish(col, uv, vec3(0.5, 0.3, 0.8)), 1.0);
}
