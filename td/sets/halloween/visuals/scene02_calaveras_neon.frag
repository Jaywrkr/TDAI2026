// ===============================================================
// HALLOWEEN 02 - CALLEJON DE NEON
// Un callejon de noche bajo la lluvia: pared de ladrillo mojado con
// canerias, caja electrica, cables y carteles rotos (LAMINAS horneadas,
// plates/scene02, ver td/tools/bake_plates_neon.py) y carteles de neon
// encendidos: una calavera grande en su panel, unos huesos cruzados, un
// murcielago y dos columnas de calaveritas que se encienden en cadena.
// Cada cartel ILUMINA en vivo el relieve del ladrillo (con brillo de
// mojado) y se refleja en los charcos del piso. Tubos de vidrio reales:
// nucleo casi blanco, color, halo y el vidrio gris cuando se apagan.
//
// BAILE (cada cartel escucha una parte distinta de la musica):
//   bajo   -> se encienden los ojos de la calavera grande
//   medios -> el murcielago aletea; el vapor de la rejilla sube
//   agudos -> los huesos zumban y parpadean; la lluvia brilla
//   golpe  -> la calavera muerde, las calaveritas avanzan la cadena,
//             ondas en los charcos; con Chaos: chispas en la caja
// PIANO: cada tecla enciende una calaverita de neon en la pared, en esa
//   posicion (arranca con el zumbido de un tubo que prende) y alumbra el
//   ladrillo mojado; la fuerza la hace mas grande; apretada queda prendida,
//   al soltarla se apaga parpadeando. Un acorde prende varias.
// Speed mueve la lluvia, el vapor y las cadenas aun en silencio.
// HISTORIA: cada acto cambia la paleta y la lluvia; cada ~41 s una ola
// de luz recorre los carteles; cada ~67 s la caja electrica chisporrotea
// y los carteles tiemblan.
// CLIMAX (~89 s, 16 s, en tres tiempos): los carteles fallan y se apagan
//   de a uno; apagon total, solo la lluvia y algun relampago; vuelven en
//   cadena con un fogonazo cada uno y chispas de la caja. Cada ~4.5 min
//   con la ola de luz al volver (gran climax).
//
// @D1: tamano de la calavera grande
// @D2: grosor del neon
// @D3: brillo de los ojos
// @D4: cuanto muerde
// @D5: mezcla de colores (naranja <-> tres colores)
// @D6: halo del neon y reflejos
// ===============================================================

const vec4 WALL_R = vec4(-3.1, -0.62, 6.2, 1.87);
const vec4 FLOOR_R = vec4(-3.1, -1.25, 6.2, 0.75);
const float BASE_Y = -0.55;                 // donde la pared toca el piso
const vec2 HERO_C = vec2(0.0, 0.17);
const vec2 CROSS_C = vec2(-1.55, 0.38);
const vec2 BAT_C = vec2(1.55, 0.42);

vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 alb(vec3 c) { return pow(c, vec3(2.2)); }

float hwRBox(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

// Calavera ~1 de alto centrada en 0. Devuelve (contorno, ojos).
vec2 hwSkull(vec2 p, float jaw) {
    float cranium = length((p - vec2(0.0, 0.14)) / vec2(1.0, 0.92)) - 0.40;
    float cheeks = hwRBox(p - vec2(0.0, -0.12), vec2(0.30, 0.14), 0.10);
    float upper = min(cranium, cheeks);
    vec2 jp = p - vec2(0.0, -0.33 - jaw);
    float lowerJaw = hwRBox(jp, vec2(0.20, 0.08), 0.06);
    float skull = min(upper, lowerJaw);
    vec2 ep = vec2(abs(p.x) - 0.16, p.y - 0.02);
    float eye = length(ep / vec2(1.0, 0.85)) - 0.105;
    vec2 np = p - vec2(0.0, -0.13);
    float nose = max(abs(np.x) * 1.4 + np.y * 0.7 - 0.05, -np.y - 0.06);
    float slotsU = abs(fract((p.x + 0.025) * 10.0) - 0.5) / 10.0 - 0.006;
    float rowU = abs(p.y + 0.235) - 0.035;
    float teethU = max(max(slotsU, rowU), abs(p.x) - 0.17);
    float rowL = abs(jp.y - 0.035) - 0.03;
    float teethL = max(max(slotsU, rowL), abs(p.x) - 0.15);
    float holes = min(min(eye, nose), min(teethU, teethL));
    return vec2(max(skull, -holes), eye);
}

// Calaverita simple (sin dientes: a ese tamano se verian serruchados)
float hwSkullS(vec2 p) {
    float cr = length((p - vec2(0.0, 0.10)) / vec2(1.0, 0.92)) - 0.40;
    float jw = hwRBox(p - vec2(0.0, -0.25), vec2(0.20, 0.12), 0.08);
    float sk = min(cr, jw);
    float eye = length(vec2(abs(p.x) - 0.16, p.y - 0.02)) - 0.11;
    return min(abs(sk), abs(eye));
}

// Hueso: barra con dos nudos en cada punta
float hwBone(vec2 p, float len, float r) {
    float bar = hkSeg(p, vec2(-len, 0.0), vec2(len, 0.0)) - r;
    for (int s = -1; s <= 1; s += 2) {
        vec2 e = vec2(float(s) * len, 0.0);
        bar = hkSmin(bar, length(p - e - vec2(0.0, r * 1.3)) - r * 1.7, r * 0.6);
        bar = hkSmin(bar, length(p - e + vec2(0.0, r * 1.3)) - r * 1.7, r * 0.6);
    }
    return bar;
}

// Murcielago de cartel: cuerpo y alas que aletean
float hwBatSign(vec2 p, float flap) {
    float ax = abs(p.x);
    float y = p.y - flap * 0.35 * ax + 0.20 * ax * ax;
    float scallop = 0.06 * abs(sin(ax * 9.0));
    float wing = max(max(y - 0.10 * (1.0 - ax * 0.6), -(y + 0.10 - scallop * (ax > 0.25 ? 1.0 : 0.0))), ax - 0.95);
    float body = length(p / vec2(0.16, 0.24)) - 1.0;
    body *= 0.16;
    float ears = max(abs(abs(p.x) - 0.07) * 2.0 + (p.y - 0.30), 0.18 - p.y);
    return min(min(wing, body), ears);
}

// Tubo de neon a distancia d de su eje. I = encendido 0..1.
vec3 hwTube(float d, vec3 c, float I, float w, float haloW) {
    float body = smoothstep(w, w * 0.55, d);
    float core = exp(-pow(d / (w * 0.42), 2.0));
    vec3 lit = (c * body * 1.15 + mix(c, vec3(1.0), 0.65) * core * 0.95) * I;
    vec3 glow = c * (exp(-d / haloW) * 0.30 + exp(-d / (haloW * 4.0)) * 0.07) * I;
    // vidrio apagado: gris con un brillo fino arriba
    vec3 off = (vec3(0.05, 0.05, 0.06) * body + vec3(0.12) * exp(-pow((d - w * 0.4) / (w * 0.2), 2.0))) * (1.0 - I);
    return lit + glow + off;
}

// climax: el cartel se apaga en el aviso (en el punto o, parpadeando) y
// vuelve en las secuelas (en el punto r). ph = fase del climax (0 = no hay)
float ng2Off(float ph, float o, float r) {
    if (ph <= 0.0) return 1.0;
    float a = o * 0.33, b = 0.70 + r * 0.20;
    float off = smoothstep(a, a + 0.02, ph) * (1.0 - smoothstep(b, b + 0.015, ph));
    float flick = step(0.45, noise21(vec2(ph * 260.0, o * 17.0))) * smoothstep(a - 0.10, a, ph) * (1.0 - smoothstep(a, a + 0.02, ph));
    return (1.0 - off) * (1.0 - flick * 0.85);
}
// fogonazo al volver
float ng2Back(float ph, float r) {
    if (ph <= 0.0) return 0.0;
    return exp(-pow((ph - 0.71 - r * 0.20) * 45.0, 2.0)) * 1.4;
}
// calaverita del piano k: posicion en la pared
vec2 ng2KeySkull(int k) { return vec2(hkKeyX(k) * 0.93, 0.66 + 0.10 * sin(keyPos(k) * 21.0)); }
float ng2KeyOn(int k) {
    float e = keyEnv(k, 0.05, 0.6);
    // arranque con zumbido: los primeros 0.35 s parpadea como un tubo que prende
    float a = keyAge(k);
    float start = mix(step(0.4, noise21(vec2(a * 40.0, float(k)))), 1.0, smoothstep(0.15, 0.35, a));
    // al soltar se apaga parpadeando
    float rel = keyHeld(k) > 0.5 ? 1.0 : step(0.3, noise21(vec2(uKclock * 35.0, float(k) * 3.0)));
    return e * start * mix(1.0, rel, 1.0 - e);
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 p = hkCam(p0);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.01 + hit * loco * 0.15);
    // paleta por acto: el cambio entre actos es un fundido (hkActVal ya
    // interpola), no un salto
    hue += hkActVal(1.0) * 4.0 * 0.18 * smoothstep(0.35, 0.65, hkActVal(2.0));

    // historia
    vec4 G = hkGrandClimax(4.0);
    vec4 C = hkClimaxOr(G, hkClimax(4.0, 89.0, 16.0));
    float waveE = max(hkEvent(3.0, 41.0, 6.0), G.z);
    float sparkE = max(hkEvent(5.0, 67.0, 4.0), C.z);
    float blackout = 0.0;
    float stormFlash = C.y * step(0.93, noise21(vec2(uRTime * 6.0, 9.0)));
    float rainAmt = mix(0.35, 1.0, hkActVal(6.0));
    float wavePos = mix(-uAspect - 0.5, uAspect + 0.5, fract(uRTime * 0.25));

    vec3 palO = hsv2rgb(vec3(fract(0.07 + hue), 0.95, 1.0));
    vec3 palV = hsv2rgb(vec3(fract(0.78 + hue), 0.80, 1.0));
    vec3 palG = hsv2rgb(vec3(fract(0.33 + hue), 0.85, 1.0));
    float mixC = 0.30 + uD5 * 0.70;
    vec3 cHero = palO;
    vec3 cCross = mix(palO, palV, mixC);
    vec3 cBat = mix(palO, palG, mixC);

    // encendido de cada cartel: zumbido, ola, apagon y chispazos
    float tremble = sparkE * step(0.5, noise21(vec2(uRTime * 25.0, 1.0)));
    float iHero = (0.92 + 0.08 * sin(t * 2.0) + hit * 0.25) * (1.0 - tremble * 0.7);
    float buzz = step(0.80 - high * 0.45 - loco * 0.3, hash21(vec2(floor(uRTime * (8.0 + high * 18.0)), 3.0)));
    float iCross = (0.95 - buzz * (0.75 + high * 0.2)) * (1.0 - tremble * 0.5);
    float iBat = (0.90 + 0.10 * sin(t * 3.0 + 1.0)) * (1.0 - tremble * 0.6);
    float bo = blackout;
    // climax: cada cartel falla en su momento (o) y vuelve en el suyo (r)
    float cph = C.w;
    iHero = iHero * ng2Off(cph, 0.62, 0.75) + ng2Back(cph, 0.75);
    iCross = iCross * ng2Off(cph, 0.22, 0.10) + ng2Back(cph, 0.10);
    iBat = iBat * ng2Off(cph, 0.42, 0.45) + ng2Back(cph, 0.45);
    iHero += waveE * 1.2 * exp(-pow((HERO_C.x - wavePos) * 2.0, 2.0));
    iCross += waveE * 1.2 * exp(-pow((CROSS_C.x - wavePos) * 2.0, 2.0));
    iBat += waveE * 1.2 * exp(-pow((BAT_C.x - wavePos) * 2.0, 2.0));
    // cadena de calaveritas: avanza con Speed y salta con el golpe
    float chase = uRTime * 2.2 + hit * 0.8;

    float w = 0.010 + uD2 * 0.012;               // radio del tubo (mundo)
    float haloW = 0.015 + uD6 * 0.045;

    // --- pared iluminada por los carteles ---
    vec2 wuv = rUV(p, WALL_R);
    vec3 wa = alb(plate0(wuv).rgb);
    vec4 wn = plate1(wuv);
    vec2 nxy = wn.rg * 2.0 - 1.0;
    vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
    float wet = wn.b;
    vec3 Lpos[5];
    vec3 Lcol[5];
    Lpos[0] = vec3(HERO_C, 0.30); Lcol[0] = cHero * iHero * (1.0 + bass * 0.4) * 1.2;
    Lpos[1] = vec3(CROSS_C, 0.25); Lcol[1] = cCross * iCross * 0.8;
    Lpos[2] = vec3(BAT_C, 0.25); Lcol[2] = cBat * iBat * 0.8;
    Lpos[3] = vec3(-2.35, 0.30, 0.25); Lcol[3] = mix(palV, palO, 0.5) * 0.45;
    Lpos[4] = vec3(2.35, 0.30, 0.25); Lcol[4] = mix(palG, palO, 0.5) * 0.45;
    float chainOn = 1.0;
    for (int k = 0; k < 4; k++) chainOn = min(chainOn, ng2Off(cph, 0.08 + float(k) * 0.12, 0.25 + float(k) * 0.12));
    Lcol[3] *= chainOn; Lcol[4] *= chainOn;
    vec3 diff = vec3(0.022, 0.026, 0.040) + vec3(0.30, 0.34, 0.45) * stormFlash;
    vec3 spec = vec3(0.0);
    // calaveritas del piano: tambien alumbran la pared
    for (int k = 0; k < N_KEYS; k++) {
        float on = ng2KeyOn(k);
        if (on < 0.01) continue;
        vec3 kc = hsv2rgb(vec3(fract(0.07 + hue + keyPos(k) * 0.7), 0.85, 1.0));
        vec3 v = vec3(ng2KeySkull(k), 0.25) - vec3(p, 0.0);
        float dd = dot(v, v);
        vec3 L = v * inversesqrt(dd);
        float att = 1.0 / (1.0 + dd * 2.6);
        vec3 lc = kc * on * (0.5 + keyVel(k) * 0.6);
        diff += lc * max(dot(n, L), 0.0) * att * 2.4;
        spec += lc * pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0) * att * (0.3 + wet * 2.2);
    }
    for (int i = 0; i < 5; i++) {
        vec3 v = Lpos[i] - vec3(p, 0.0);
        float dd = dot(v, v);
        vec3 L = v * inversesqrt(dd);
        float att = 1.0 / (1.0 + dd * 2.6);
        diff += Lcol[i] * max(dot(n, L), 0.0) * att * 2.4;
        spec += Lcol[i] * pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0) * att * (0.3 + wet * 2.2);
    }
    vec3 col = wa * diff + spec * (0.6 + uD6 * 0.6);

    // --- vapor de la rejilla (los medios lo empujan) ---
    vec2 vq = p - vec2(-0.95, -0.36);
    if (vq.y > 0.0 && vq.y < 1.2 && abs(vq.x) < 0.7) {
        float rise = vq.y / 1.2;
        vec2 su = vec2(vq.x * 0.35 + sin(vq.y * 2.0 - t * 0.8) * 0.05, vq.y * 0.25 - t * (0.03 + mid * 0.05));
        float sm = plate3Wrap(su).g;
        float cone = smoothstep(0.18 + rise * 0.45, 0.0, abs(vq.x - rise * 0.12)) * (1.0 - rise);
        vec3 lightHere = diff * 0.8 + vec3(0.03);
        col += lightHere * smoothstep(0.40, 0.80, sm) * cone * (0.8 + mid * 1.2);
    }

    // --- carteles ---
    // calavera grande
    float s = 0.70 + uD1 * 0.35;
    vec2 hq = (p - HERO_C) / s;
    float chew = (0.5 + 0.5 * sin(t * 3.2)) * (0.010 + uD4 * 0.045);
    float snap = hit * (0.03 + uD4 * 0.07);
    vec2 sk = hwSkull(hq, chew + snap);
    col += hwTube(abs(sk.x) * s, cHero, clamp(iHero, 0.0, 1.6), w, haloW);
    float eyeFill = 1.0 - smoothstep(-0.02, 0.0, sk.y);
    col += cHero * eyeFill * (0.10 + uD3 * 0.6) * (0.3 + bass * 1.3 + hit * 0.4) * clamp(iHero, 0.0, 1.0);
    // huesos cruzados
    vec2 cq = (p - CROSS_C) / 0.42;
    float bones = min(hwBone(rot2(0.75) * cq, 0.62, 0.075), hwBone(rot2(-0.75) * cq, 0.62, 0.075));
    col += hwTube(abs(bones) * 0.42, cCross, clamp(iCross, 0.0, 1.6), w * 0.9, haloW);
    // murcielago (aletea con los medios)
    vec2 bq = (p - BAT_C) / 0.55;
    float flap = sin(t * (2.5 + mid * 6.0)) * (0.3 + mid * 0.7);
    float batD = hwBatSign(bq, flap);
    col += hwTube(abs(batD) * 0.55, cBat, clamp(iBat, 0.0, 1.6), w * 0.9, haloW);
    // columnas de calaveritas en cadena
    if (abs(p.x) > 2.05) {
        float side = sign(p.x);
        for (int k = 0; k < 4; k++) {
            float fk = float(k);
            vec2 c = vec2(side * 2.35, -0.20 + fk * 0.33);
            vec2 d = p - c;
            if (dot(d, d) > 0.06) continue;
            float ph = mod(chase - fk - (side > 0.0 ? 2.0 : 0.0), 4.0);
            float on = 0.18 + 0.82 * exp(-ph * ph * 1.5) + waveE * exp(-pow((c.x - wavePos) * 2.0, 2.0));
            on = on * ng2Off(cph, 0.08 + fk * 0.12 + (side > 0.0 ? 0.04 : 0.0), 0.25 + fk * 0.12) + ng2Back(cph, 0.25 + fk * 0.12);
            vec3 cc = (k % 2 == 0) ? mix(palO, palV, mixC) : mix(palO, palG, mixC);
            col += hwTube(hwSkullS(d / 0.17) * 0.17, cc, on, w * 0.7, haloW * 0.8);
        }
    }

    // --- calaveritas de neon del piano ---
    for (int k = 0; k < N_KEYS; k++) {
        float on = ng2KeyOn(k);
        if (on < 0.01) continue;
        vec2 c = ng2KeySkull(k);
        float sz = 0.14 + keyVel(k) * 0.10;
        vec2 d = p - c;
        if (dot(d, d) > sz * sz * 4.0) continue;
        vec3 kc = hsv2rgb(vec3(fract(0.07 + hue + keyPos(k) * 0.7), 0.85, 1.0));
        col += hwTube(hwSkullS(d / sz) * sz, kc, on, w * 0.75, haloW * 0.9);
    }

    // --- chispas de la caja electrica (golpe con locura o evento) ---
    float sparkAmt = max(sparkE, hit * step(0.55, loco));
    if (sparkAmt > 0.01) {
        float sp = hkParticles((p - vec2(-2.05, 0.10)) * 1.4, uRTime * 1.5, 0.35 * sparkAmt, vec2(0.0, -1.0), 0.03);
        float near = exp(-length((p - vec2(-2.05, 0.20)) * vec2(1.4, 0.8)) * 3.0);
        col += vec3(1.0, 0.85, 0.5) * sp * near * 2.0;
        col += vec3(0.7, 0.8, 1.0) * near * sparkAmt * step(0.6, noise21(vec2(uRTime * 30.0, 4.0))) * 0.3;
    }

    // --- piso mojado: luz, reflejos de los carteles y charcos con ondas ---
    if (p.y < BASE_Y + 0.05) {
        vec4 fl = plate2(rUV(p, FLOOR_R));
        float depth = BASE_Y - p.y;
        float z = 1.0 / (depth + 0.10);
        float puddle = smoothstep(0.50, 0.58, plate3Wrap(vec2(p.x * z * 0.05, z * 0.07)).a);
        // ondas de gotas (mas con el golpe)
        vec2 rg = vec2(p.x * z * 1.6, z * 1.2);
        vec2 rid = floor(rg);
        vec2 rf = fract(rg) - 0.5;
        float rt = fract(uRTime * 0.9 + hash21(rid) * 7.0);
        float ring = exp(-pow((length(rf * vec2(1.0, 2.2)) - rt * 0.45) * 30.0, 2.0)) * (1.0 - rt) * step(0.55, hash21(rid + 3.0));
        float ripple = ring * (0.6 + hit * 1.2) * puddle;
        vec3 fcol = alb(fl.rgb);
        vec3 fd = vec3(0.01, 0.012, 0.02);
        vec3 refl = vec3(0.0);
        for (int i = 0; i < 5; i++) {
            vec2 lp = Lpos[i].xy;
            float h = lp.y - BASE_Y;
            float dx = p.x - lp.x;
            fd += Lcol[i] * exp(-dx * dx * 1.2) * exp(-depth * 1.8) * 0.35;
            // reflejo: franja vertical estirada debajo del cartel
            float my = BASE_Y - h * 0.55;
            float streak = exp(-pow(dx / (0.10 + depth * 0.25), 2.0)) * exp(-pow((p.y - my) / (0.10 + h * 0.25), 2.0));
            refl += Lcol[i] * streak;
        }
        // reflejo nitido de la parte baja de la calavera grande
        vec2 mp = vec2(p.x + (noise21(vec2(p.x * 8.0, p.y * 30.0 + uRTime * 2.0)) - 0.5) * (0.02 + ripple * 0.06), 2.0 * BASE_Y - p.y);
        vec2 sk2 = hwSkull((mp - HERO_C) / s, chew + snap);
        float mirror = exp(-abs(sk2.x) * s / (w * 2.5)) * clamp(iHero, 0.0, 1.0);
        refl += cHero * mirror * 0.8;
        float shine = mix(0.25, 1.0, puddle) * (0.5 + uD6 * 0.8);
        vec3 floorC = fcol * fd * 2.0 + refl * shine * 0.55 + vec3(0.6, 0.65, 0.8) * ripple * 0.15 * (0.3 + length(refl));
        col = mix(col, floorC, fl.a);
    }

    // --- lluvia: rayitas que brillan con la luz de los carteles ---
    float drop = 0.0;
    for (int k = 0; k < 2; k++) {
        float fk = float(k);
        float colX = floor((p.x + p.y * 0.06) * (70.0 + fk * 40.0));
        float spd = 9.0 + 5.0 * hash21(vec2(colX, fk));
        float yy = (p.y + t * spd * 0.12 + hash21(vec2(colX, 7.0 + fk)) * 10.0) * (11.0 + fk * 6.0);
        float rowId = floor(yy);
        float fy = fract(yy);
        float fx = fract((p.x + p.y * 0.06) * (70.0 + fk * 40.0));
        float on = step(1.0 - rainAmt * (0.10 + fk * 0.06), hash21(vec2(colX, rowId)));
        drop += on * exp(-pow((fx - 0.5) * 7.0, 2.0)) * smoothstep(0.0, 0.25, fy) * smoothstep(0.55, 0.3, fy) * (1.0 - fk * 0.4);
    }
    col += (diff * 3.0 + vec3(0.025)) * drop * (0.35 + high * 0.7);

    col = audioLift(col, high * 0.10);
    return vec4(hkFinish(col, uv, vec3(0.6, 0.2, 0.8)), 1.0);
}
