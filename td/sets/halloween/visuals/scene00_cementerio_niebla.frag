// ===============================================================
// HALLOWEEN 00 - CEMENTERIO EN LA NIEBLA
// Luna llena detras de nubes, lapidas en silueta con borde de luz y
// niebla baja que se arrastra entre ellas.
// Speed mueve nubes y niebla. El bajo espesa y enciende la niebla del
// suelo; el golpe dispara un relampago que ilumina el cielo y recorta
// las lapidas. Los medios agitan la niebla alta.
//
// @D1: densidad de la niebla
// @D2: cantidad de lapidas
// @D3: brillo de la luna
// @D4: relampagos con el golpe
// @D5: niebla verde toxica
// @D6: altura del horizonte
// ===============================================================

float hwBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Lapida de punta redonda (o cruz si 'cross' > 0.5), base en y = 0.
float hwTomb(vec2 p, float w, float h, float cross) {
    float body = hwBox(p - vec2(0.0, h * 0.42), vec2(w, h * 0.42));
    float top = length(p - vec2(0.0, h * 0.84)) - w;
    float stone = min(body, top);
    float post = hwBox(p - vec2(0.0, h * 0.50), vec2(w * 0.26, h * 0.50));
    float arm = hwBox(p - vec2(0.0, h * 0.72), vec2(w * 0.85, w * 0.24));
    float crossShape = min(post, arm);
    return mix(stone, crossShape, step(0.5, cross));
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float hit = clamp(max(uKick, uBeat * 0.7), 0.0, 1.0) * uAudioamt;
    float flash = hit * (0.25 + uD4 * 0.95);
    float hue = audioHue(uHue, mid * 0.01);

    // --- cielo ---
    vec3 skyLow = hsv2rgb(vec3(fract(0.76 + hue), 0.70, 0.30));
    vec3 skyHigh = hsv2rgb(vec3(fract(0.72 + hue), 0.80, 0.05));
    vec3 col = mix(skyLow, skyHigh, smoothstep(-0.4, 1.0, p.y));

    // --- luna ---
    vec2 mp = p - vec2(uAspect * 0.42, 0.44);
    float mr = length(mp);
    float moonR = 0.24;
    float crater = fbm(mp * 7.0 + 3.1, 3);
    vec3 moonCol = vec3(1.0, 0.86, 0.62) * (0.80 + 0.30 * crater);
    float moonDisk = 1.0 - smoothstep(moonR - 0.004, moonR + 0.004, mr);
    float moonGain = 0.70 + uD3 * 0.45;
    col += vec3(0.85, 0.55, 0.35) * exp(-max(mr - moonR, 0.0) * 5.0) * 0.30 * moonGain;
    col = mix(col, moonCol * moonGain, moonDisk);

    // --- nubes que cruzan la luna ---
    float cl = fbm(vec2(p.x * 1.2 + t * 0.045, p.y * 2.6 - t * 0.01), 4, 0.55);
    float clouds = smoothstep(0.50, 0.78, cl) * smoothstep(-0.2, 0.35, p.y);
    vec3 cloudCol = mix(vec3(0.05, 0.02, 0.08), vec3(0.55, 0.40, 0.55),
                        exp(-mr * 1.6) * 0.8);
    col = mix(col, cloudCol, clouds * 0.85);

    // --- relampago: el cielo entero destella detras de las nubes ---
    vec3 flashCol = vec3(0.75, 0.70, 1.0);
    col += flashCol * flash * (0.35 + clouds * 0.9) * smoothstep(-0.5, 0.6, p.y);

    // --- suelo y lapidas ---
    float horizon = -0.38 + (uD6 - 0.5) * 0.36;
    float hills = horizon + 0.05 * sin(p.x * 1.7 + 1.3) + 0.03 * sin(p.x * 4.1);
    float ground = 1.0 - smoothstep(hills - 0.004, hills + 0.004, p.y);

    float cellW = 0.40 / (0.55 + uD2 * 1.1 + uDensity * 0.4);
    float cx = floor(p.x / cellW);
    float tombD = 1e3;
    for (int k = -1; k <= 1; k++) {
        float id = cx + float(k);
        float h0 = hash21(vec2(id, 4.7));
        if (h0 < 0.30) continue;
        float w = cellW * (0.16 + 0.12 * hash21(vec2(id, 1.3)));
        float h = cellW * (0.55 + 0.75 * hash21(vec2(id, 9.1)));
        float base = horizon + 0.05 * sin((id + 0.5) * cellW * 1.7 + 1.3)
                   + 0.03 * sin((id + 0.5) * cellW * 4.1) - 0.01;
        vec2 q = p - vec2((id + 0.5 + (hash21(vec2(id, 2.2)) - 0.5) * 0.4) * cellW, base);
        float tilt = (hash21(vec2(id, 7.7)) - 0.5) * 0.35;
        q = rot2(tilt) * q;
        float d = hwTomb(q, w, h, step(0.78, hash21(vec2(id, 5.5))));
        tombD = min(tombD, d);
    }
    // Borde de luz del lado de la luna. Las derivadas se toman FUERA del
    // bucle: dentro, el 'continue' las vuelve basura (lineas verticales).
    vec2 gn = vec2(dFdx(tombD), dFdy(tombD));
    float side = clamp(dot(normalize(gn + 1e-6), normalize(vec2(0.75, 0.66))), 0.0, 1.0);
    float rimLight = edgeLine(tombD, 1.6) * (0.25 + 0.75 * side)
                   * step(hills - 0.01, p.y);
    float tomb = 1.0 - smoothstep(-0.002, 0.002, tombD);
    float solid = max(ground, tomb);
    vec3 stoneCol = vec3(0.012, 0.010, 0.018);
    col = mix(col, stoneCol, solid);
    vec3 rimCol = mix(vec3(0.95, 0.70, 0.45), flashCol, clamp(flash, 0.0, 1.0));
    col += rimCol * rimLight * (0.35 + uD3 * 0.35 + flash * 1.4);

    // --- niebla baja: tres capas que se arrastran ---
    vec3 fogTint = mix(vec3(0.62, 0.55, 0.78), vec3(0.35, 0.95, 0.40), uD5);
    float fogAmt = 0.0;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float sp = 0.05 + fi * 0.035;
        vec2 fq = vec2(p.x * (1.2 + fi * 0.6) - t * sp * (fi + 1.0),
                       p.y * (3.0 + fi) + fi * 7.0);
        fq.y += sin(p.x * 2.0 + t * 0.4 + fi) * mid * 0.25;
        float n = fbm(fq, 4, 0.5);
        float band = exp(-pow((p.y - horizon - 0.05 - fi * 0.07) / (0.16 + fi * 0.06 + uD1 * 0.10), 2.0));
        fogAmt += smoothstep(0.35, 0.85, n) * band * (0.55 - fi * 0.12);
    }
    fogAmt *= 0.95 + uD1 * 0.85 + bass * 0.55;
    float fogGlow = 0.42 + bass * 0.75 + flash * 0.6;
    col = mix(col, fogTint * fogGlow, clamp(fogAmt, 0.0, 0.92));

    col *= vignette(uv, 0.45);
    col = audioLift(col, uHigh * 0.10);
    return vec4(col, 1.0);
}
