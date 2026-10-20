// ===============================================================
// HALLOWEEN 09 - TORMENTA GOTICA
// Nubes violetas pesadas, lluvia en diagonal y relampagos ramificados
// que caen con el golpe. Un arbol muerto en silueta.
// Speed mueve nubes y lluvia. El golpe dispara el rayo (cada golpe en
// otro lugar) y enciende las nubes desde adentro; los agudos hacen
// brillar la lluvia.
//
// @D1: cantidad de lluvia
// @D2: ramificacion del rayo
// @D3: rayos tambien sin golpe (tormenta constante)
// @D4: brillo del relampago
// @D5: color (violeta <-> azul electrico)
// @D6: arbol muerto (de tenue a nitido)
// ===============================================================

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

float hwBranchy(vec2 p, float x0, float top, float bot, float seed, float branches) {
    float d = hwBolt(p, x0, top, bot, seed);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        if (fi >= branches) break;
        float by = mix(top, bot, 0.25 + 0.15 * fi);
        float bx = x0 + (noise21(vec2(by * 6.0, seed)) - 0.5) * 0.30 * (0.25 + 0.15 * fi);
        float dir = (fract(seed * 7.0 + fi * 0.37) > 0.5) ? 1.0 : -1.0;
        vec2 q = p - vec2(bx, by);
        q = rot2(dir * 0.55) * q;
        d = min(d, hwBolt(q + vec2(0.0, by), 0.0, by, by - 0.35 - 0.1 * fi, seed + fi * 9.0) + 0.0015);
    }
    return d;
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float rt = uRTime;
    float hit = hkHit();
    float loco = hkLoco();
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    // el rayo cambia de lugar en cada golpe: usa el reloj real
    float slot = floor(rt * 1.7);
    // historia: cada acto la tormenta es mas o menos intensa; cada ~57 s
    // llega el pico: rayos seguidos sin necesidad de golpe
    float peak = hkEvent(3.0, 57.0, 10.0);
    float ambient = max(uD3, peak) * step(0.86 - peak * 0.2 - hkActVal(4.0) * 0.08, hash21(vec2(floor(rt * 3.0), 5.0)));
    float strike = clamp(hit + ambient, 0.0, 1.0);
    vec3 boltC = mix(hsv2rgb(vec3(fract(0.77 + hue), 0.45, 1.0)),
                     hsv2rgb(vec3(fract(0.60 + hue), 0.55, 1.0)), uD5);

    // nubes
    float cl = fbm(vec2(p.x * 1.1 - t * 0.04, p.y * 1.8 + t * 0.01), 4, 0.55);
    float cl2 = noise21(vec2(p.x * 2.3 + t * 0.03, p.y * 3.0) + 9.0) * 0.6 + noise21(vec2(p.x * 5.0, p.y * 6.0) - t * 0.05) * 0.4;
    vec3 cloudDark = hsv2rgb(vec3(fract(0.74 + hue), 0.60, 0.10));
    vec3 cloudLit = hsv2rgb(vec3(fract(0.76 + hue), 0.45, 0.55));
    float shape = smoothstep(0.35, 0.80, cl) * smoothstep(-0.6, 0.4, p.y);
    vec3 col = mix(vec3(0.01, 0.008, 0.02), mix(cloudDark, cloudLit, cl2), shape);

    float bx = (hash21(vec2(slot, 1.0)) - 0.5) * uAspect * 1.5;
    // las nubes se iluminan desde adentro alrededor del rayo
    float inside = exp(-abs(p.x - bx) * 2.2) * shape;
    col += boltC * inside * strike * (0.6 + uD4 * 1.2) * (0.5 + cl2);
    col += boltC * 0.10 * strike * (0.5 + uD4);      // destello general

    // rayo
    float d = hwBranchy(p, bx, 0.75, -1.05, hash21(vec2(slot, 3.0)) * 50.0, floor(1.0 + uD2 * 3.0));
    float px = 2.0 / uResH;
    // locura: hasta dos rayos mas en otros lugares
    if (loco > 0.35) d = min(d, hwBranchy(p, bx + 0.7 * uAspect * (hash21(vec2(slot, 8.0)) - 0.5) * 2.0, 0.75, -1.05, slot * 13.0 + 1.0, 2.0));
    if (loco > 0.70) d = min(d, hwBranchy(p, -bx * 0.8, 0.75, -1.05, slot * 29.0 + 4.0, 3.0));
    float core = 1.0 - smoothstep(px * 0.8, px * 2.2, d);
    float glow = exp(-d * 60.0) * 0.6 + exp(-d * 12.0) * 0.25;
    col += (vec3(1.0) * core + boltC * glow) * strike * (0.8 + uD4 * 1.2);

    // lluvia diagonal
    vec2 rp = p * vec2(1.0, 1.0);
    rp.x += rp.y * 0.25;
    float rain = 0.0;
    float rainBoost = 1.0 + loco * hit * 1.5;
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 g = vec2(rp.x * (60.0 + fi * 40.0), rp.y * 2.0 + t * (2.2 + fi));
        vec2 id = floor(g);
        float h = hash21(id + fi * 7.0);
        float streak = smoothstep(0.0, 0.4, fract(g.y + h)) * (1.0 - smoothstep(0.4, 0.5, fract(g.y + h)));
        float lane = 1.0 - smoothstep(0.02, 0.10, abs(fract(g.x) - 0.5));
        rain += streak * lane * step(1.0 - (0.25 + uD1 * 0.55) * rainBoost, h) * (0.5 - fi * 0.2);
    }
    col += vec3(0.55, 0.6, 0.8) * rain * (0.18 + high * 0.6 + strike * 0.5);

    // suelo mojado: refleja el destello y las salpicaduras de lluvia
    float groundY = -0.80;
    if (p.y < groundY) {
        float splash = step(0.93 - uD1 * 0.05, hash21(floor(vec2(p.x * 90.0, floor(uRTime * 9.0)))));
        vec3 gc = vec3(0.01, 0.01, 0.02) + boltC * strike * 0.25 * exp(-abs(p.x - bx) * 1.5);
        gc += vec3(0.6, 0.6, 0.8) * splash * (1.0 - smoothstep(0.0, 0.03, groundY - p.y)) * 0.4;
        col = mix(col, gc, 0.85);
    }
    // arbol muerto en silueta (abajo a la derecha)
    vec2 tq = p - vec2(uAspect * 0.62, -1.0);
    float trunk = abs(tq.x + 0.05 * sin(tq.y * 4.0)) - (0.05 - tq.y * 0.025);
    trunk = max(trunk, tq.y - 0.85);
    float branchD = 1e3;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 bq = tq - vec2(0.0, 0.35 + fi * 0.12);
        float side = mod(fi, 2.0) * 2.0 - 1.0;
        bq = rot2(side * (0.9 - fi * 0.08)) * bq;
        float len = 0.35 - fi * 0.04;
        float br = max(abs(bq.x + 0.03 * sin(bq.y * 12.0)) - 0.012 * (1.0 - bq.y / len), max(-bq.y, bq.y - len));
        branchD = min(branchD, br);
    }
    float tree = min(trunk, branchD);
    float treeOn = 0.5 + 0.5 * uD6;
    float treeM = (1.0 - smoothstep(-0.002, 0.002, tree)) * treeOn;
    col = mix(col, vec3(0.004, 0.003, 0.008), treeM);
    col += boltC * edgeLine(tree, 1.3) * strike * treeOn * 0.8;

    return vec4(hkFinish(col, uv, vec3(0.3, 0.3, 0.8)), 1.0);
}
