// ===============================================================
// HALLOWEEN 02 - CALAVERAS DE NEON
// Tres capas de calaveras de neon a distintas profundidades que se
// deslizan despacio. Naranja, violeta y verde, como tubos de neon.
// Speed mueve las capas. Cada calavera mastica a su ritmo; el golpe
// abre de golpe las mandibulas (cada una distinto) y el bajo enciende
// las cuencas de los ojos desde adentro. Historia: cada acto cambia la
// paleta; cada ~41 s una ola de luz cruza el muro; cada ~89 s apagon.
//
// @D1: tamano de las calaveras
// @D2: grosor del neon
// @D3: brillo de los ojos
// @D4: cuanto mastican
// @D5: mezcla de colores (naranja <-> tres colores)
// @D6: halo del neon
// ===============================================================

float hwRBox(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

// Calavera ~1 de alto centrada en 0. 'jaw' baja la mandibula.
// Devuelve (contorno, ojos) como distancias.
vec2 hwSkull(vec2 p, float jaw) {
    float cranium = length((p - vec2(0.0, 0.14)) / vec2(1.0, 0.92)) - 0.40;
    float cheeks = hwRBox(p - vec2(0.0, -0.12), vec2(0.30, 0.14), 0.10);
    float upper = min(cranium, cheeks);
    vec2 jp = p - vec2(0.0, -0.33 - jaw);
    float lowerJaw = hwRBox(jp, vec2(0.20, 0.08), 0.06);
    float skull = min(upper, lowerJaw);
    // cuencas
    vec2 ep = vec2(abs(p.x) - 0.16, p.y - 0.02);
    float eye = length(ep / vec2(1.0, 0.85)) - 0.105;
    // nariz (triangulo invertido)
    vec2 np = p - vec2(0.0, -0.13);
    float nose = max(abs(np.x) * 1.4 + np.y * 0.7 - 0.05, -np.y - 0.06);
    // dientes: ranuras verticales en la fila de arriba y en la mandibula
    float slotsU = abs(fract((p.x + 0.025) * 10.0) - 0.5) / 10.0 - 0.006;
    float rowU = abs(p.y + 0.235) - 0.035;
    float teethU = max(max(slotsU, rowU), abs(p.x) - 0.17);
    float rowL = abs(jp.y - 0.035) - 0.03;
    float teethL = max(max(slotsU, rowL), abs(p.x) - 0.15);
    float holes = min(min(eye, nose), min(teethU, teethL));
    return vec2(max(skull, -holes), eye);
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.01 + hit * loco * 0.15);

    // muro de ladrillo humedo detras, iluminado por el neon
    vec2 bq = vec2(p.x * 7.0 + 0.5 * mod(floor(p.y * 14.0), 2.0), p.y * 14.0);
    vec2 bf = fract(bq);
    float mortar = smoothstep(0.0, 0.05, bf.x) * smoothstep(1.0, 0.95, bf.x) * smoothstep(0.0, 0.08, bf.y) * smoothstep(1.0, 0.92, bf.y);
    float brick = (0.55 + 0.45 * hash21(floor(bq) * 1.7)) * (0.75 + 0.25 * noise21(p * 20.0));
    float wet = smoothstep(0.55, 0.9, noise21(vec2(p.x * 3.0, p.y * 0.8)));
    vec3 wall = vec3(0.030, 0.018, 0.022) * brick * mortar * (1.0 + wet * 0.8);
    vec3 col = vec3(0.004, 0.002, 0.008) + wall;
    vec3 palette[3];
    // historia: cada acto reparte otra paleta; ola de neon y apagon
    hue += floor(hkActVal(1.0) * 4.0) * 0.18 * step(0.5, hkActVal(2.0));
    float waveE = hkEvent(3.0, 41.0, 6.0);
    float blackout = hkEvent(4.0, 89.0, 5.0);
    palette[0] = hsv2rgb(vec3(fract(0.07 + hue), 0.95, 1.0));   // naranja
    palette[1] = hsv2rgb(vec3(fract(0.78 + hue), 0.80, 1.0));   // violeta
    palette[2] = hsv2rgb(vec3(fract(0.33 + hue), 0.85, 1.0));   // verde

    for (int L = 0; L < 3; L++) {
        float fl = float(L);
        float depth = 1.0 + fl * 0.8;                 // 1 = adelante
        float cell = (0.62 + uD1 * 0.45) / depth;
        vec2 drift = vec2(t * (0.05 + fl * 0.02) * (L == 1 ? -1.0 : 1.0),
                          t * 0.015 * (fl - 1.0));
        vec2 g = (p + drift + fl * vec2(0.37, 0.21)) / cell;
        // filas alternas desplazadas, como un muro de nichos
        g.x += 0.5 * mod(floor(g.y), 2.0);
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float h = hash21(id + fl * 17.0);
        if (h < 0.22 + fl * 0.18) continue;
        float phase = h * 31.0;
        float chew = (0.5 + 0.5 * sin(t * (3.5 + h * 3.0) + phase)) * (0.012 + uD4 * 0.05);
        float snap = hit * (0.03 + 0.07 * hash21(id + 3.3)) * (0.5 + uD4);
        vec2 sk = hwSkull(f * 1.25, chew + snap);
        float px = 1.25 / cell / uResH * 2.0;      // tamano de un pixel aqui
        float lineW = (1.4 + uD2 * 2.6) * px;
        float tube = 1.0 - smoothstep(lineW * 0.5, lineW * 0.5 + px, abs(sk.x));
        float halo = exp(-abs(sk.x) / (px * (6.0 + uD6 * 16.0)));
        // el halo se apaga antes del borde de la celda (si no, se ven cuadros)
        halo *= smoothstep(0.50, 0.12, length(f));
        int ci = int(mod(floor(h * 7.0), 3.0));
        vec3 c = palette[0];
        float mixC = 0.30 + uD5 * 0.70;
        if (ci == 1) c = mix(palette[0], palette[1], mixC);
        if (ci == 2) c = mix(palette[0], palette[2], mixC);
        float fade = 1.0 / (1.0 + fl * 1.15);
        float pulse = 0.85 + 0.15 * sin(t * 2.0 + phase) + hit * 0.35;
        // ola: una franja de luz recorre el muro de izquierda a derecha
        pulse += waveE * 1.4 * exp(-pow((p.x - mix(-uAspect - 0.5, uAspect + 0.5, fract(uRTime * 0.25))) * 3.0, 2.0));
        // apagon: se apagan todos y vuelven de a uno, parpadeando
        pulse *= 1.0 - blackout * step(hash21(id + floor(uRTime * 8.0)), 0.85 - (1.0 - blackout) * 0.8);
        // tubos con zumbido: algunos parpadean como neon gastado; con la
        // locura parpadean todos y se apagan de golpe
        float buzz = step(0.92 - loco * 0.5, hash21(id + floor(uRTime * (6.0 + loco * 20.0)) * 0.13));
        pulse *= 1.0 - buzz * (0.6 + loco * 0.4) * step(0.8 - loco * 0.6, h);
        vec3 neon = c * (tube * 1.25 + halo * (0.28 + uD6 * 0.35)) * pulse;
        // ojos encendidos desde adentro
        float eyeFill = 1.0 - smoothstep(-0.02, 0.0, sk.y);
        neon += c * eyeFill * (0.15 + uD3 * 0.6) * (0.35 + bass * 1.1 + hit * 0.5);
        col += neon * fade * 0.62;
    }
    // el neon tiñe el ladrillo que tiene cerca (mas en lo mojado)
    col += col * wall * 6.0 * (0.5 + wet);

    col = audioLift(col, uHigh * 0.12);
    return vec4(hkFinish(col, uv, vec3(0.6, 0.2, 0.8)), 1.0);
}
