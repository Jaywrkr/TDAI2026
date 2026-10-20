// ===============================================================
// HALLOWEEN 16 - VELAS
// Hileras de velas a distintas alturas en la oscuridad, con cera que
// chorrea y llamas que titilan, cada una con su halo calido.
// Speed hace titilar las llamas. El bajo agranda los halos; el golpe
// hace que las llamas se estiren y den un salto (cada una con su fase);
// un soplo de aire las inclina con los medios.
//
// @D1: cantidad de velas
// @D2: altura de las llamas
// @D3: halo de luz
// @D4: salto de las llamas con el golpe
// @D5: color de la llama (calida <-> verde fantasma)
// @D6: humo
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = hkPunch(hkShake(centered(uv)));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.006);

    vec3 flameC = mix(vec3(1.0, 0.62, 0.20), hsv2rgb(vec3(fract(0.36 + hue), 0.75, 1.0)), uD5);
    vec3 coreC = mix(vec3(1.0, 0.95, 0.80), vec3(0.85, 1.0, 0.90), uD5);
    vec3 col = vec3(0.012, 0.008, 0.006);
    float halo = 0.0;

    // tres filas (atras, medio, adelante)
    for (int r = 0; r < 3; r++) {
        float fr = float(r);
        float depth = 0.55 + fr * 0.25;
        float n = (4.0 + floor(uD1 * 5.0)) + (2.0 - fr) * 2.0;
        float cw = 2.0 * uAspect / n;
        float shift = fr * 0.37 * cw;
        float cx = floor((p.x + uAspect + shift) / cw);
        for (int k = -1; k <= 1; k++) {
            float id = cx + float(k);
            float h1 = hash21(vec2(id, fr + 1.0));
            float h2 = hash21(vec2(id, fr + 7.0));
            if (h1 < 0.15) continue;
            float x = (id + 0.5) * cw - uAspect - shift + (h2 - 0.5) * cw * 0.3;
            float w = 0.045 * depth * (0.8 + 0.4 * h2);
            float base = -0.95 + fr * 0.10;
            float top = base + (0.25 + 0.55 * h1) * depth;
            // cuerpo de la vela con cera chorreada
            vec2 q = p - vec2(x, 0.0);
            float drip = 0.0;
            bool near = abs(q.x) < w * 2.0;
            for (int j = 0; j < 3; j++) {
                if (!near) break;
                float fj = float(j);
                float dx = (hash21(vec2(id, fj + fr * 3.0)) - 0.5) * 1.6 * w;
                float dl = 0.05 + 0.15 * hash21(vec2(id + 3.0, fj));
                drip = max(drip, (1.0 - smoothstep(0.012 * depth, 0.020 * depth, abs(q.x - dx))) *
                                 step(top - dl, p.y) * step(p.y, top));
            }
            float body = step(abs(q.x), w) * step(base, p.y) * step(p.y, top);
            float lip = (1.0 - smoothstep(0.0, 0.012, abs(p.y - top))) * step(abs(q.x), w * 1.15);
            float wax = clamp(body + drip * 0.9 + lip, 0.0, 1.0);
            float shade = 0.55 + 0.45 * cos(q.x / w * 1.4);
            vec3 waxC = vec3(0.80, 0.72, 0.60) * shade * (0.18 + 0.25 * depth);
            // la llama ilumina la vela desde arriba y la cera deja pasar la luz
            float nearTop = exp(-(top - p.y) * 7.0);
            waxC += flameC * (0.55 * nearTop + 0.48 * nearTop * nearTop) * (0.8 + 0.4 * depth);
            if (wax > 0.0) waxC *= 0.85 + 0.15 * noise21(vec2(q.x * 200.0, p.y * 30.0));
            col = mix(col, waxC, wax);

            // llama
            float flick = 0.85 + 0.15 * sin(t * (9.0 + h2 * 6.0) + id) + 0.1 * noise21(vec2(t * 4.0, id));
            float jump = hit * (0.2 + uD4 * 0.8) * step(0.3, fract(h1 * 9.0 + floor(uRTime * 2.0) * 0.3));
            float fh = (0.085 + uD2 * 0.07) * depth * flick * (1.0 + jump * 0.8);
            // locura: una rafaga de viento tumba todas las llamas de golpe
            float gust = hit * loco * (0.8 + 0.4 * h2) * (mod(floor(uRTime * 1.5), 2.0) * 2.0 - 1.0);
            float lean = (mid * 0.6 + 0.15 * sin(t * 0.6 + id)) * 0.02 + gust * 0.05;
            vec2 fq = p - vec2(x + lean * (p.y - top) * 20.0, top + 0.012 + fh * 0.55);
            float fl = length(fq / vec2(fh * 0.32, fh * 0.75 * (fq.y > 0.0 ? 1.4 : 0.8)));
            float flame = 1.0 - smoothstep(0.6, 1.0, fl);
            float core = 1.0 - smoothstep(0.0, 0.55, fl);
            // llama real: base azul, zona oscura junto a la mecha, punta naranja
            float baseBlue = (1.0 - smoothstep(0.0, 0.5, length((fq + vec2(0.0, fh * 0.45)) / vec2(fh * 0.30, fh * 0.20)))) * flame;
            float tipT = smoothstep(-0.2, 0.9, fq.y / max(fh, 1e-3));
            vec3 fc = mix(flameC, vec3(1.0, 0.45, 0.10), tipT * 0.6);
            fc = mix(fc, vec3(0.35, 1.0, 0.45), hit * smoothstep(0.6, 1.0, loco));
            col += fc * flame * 1.2 * (0.8 + 0.2 * depth);
            col += coreC * core * 0.9 * (1.0 - baseBlue * 0.6);
            col += vec3(0.15, 0.30, 1.0) * baseBlue * 0.6;
            // brillo de la cera derretida en el borde
            col += flameC * 0.5 * lip * exp(-abs(q.x) / w * 1.5);
            halo += exp(-length(p - vec2(x, top + fh * 0.5)) / (0.08 + uD3 * 0.10 + bass * 0.05) ) * depth * flick;
        }
    }
    col += flameC * halo * (0.20 + uD3 * 0.20 + bass * 0.12);
    // reflejo calido en una mesa barnizada
    if (p.y < -0.95) col += flameC * halo * 0.05;
    // humo tenue que sube
    float smoke = uD6 > 0.001 ? fbm(vec2(p.x * 3.0, p.y * 2.0 - t * 0.3), 4, 0.55) : 0.0;
    col += vec3(0.20, 0.18, 0.16) * smoothstep(0.55, 0.85, smoke) * uD6 * 0.35 * smoothstep(-0.7, 0.6, p.y);

    return vec4(hkFinish(col, uv, vec3(0.8, 0.5, 0.2)), 1.0);
}
