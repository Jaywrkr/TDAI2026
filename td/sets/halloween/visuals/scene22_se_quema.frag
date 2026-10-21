// ===============================================================
// HALLOWEEN 22 - LA IMAGEN QUE SE QUEMA (usa la carpeta Media)
// Una mesa de madera oscura de noche. Encima, la imagen de la carpeta
// Media impresa como foto vieja con borde blanco, casi sin color. Desde
// un borde la agarra el fuego: la foto se tuesta, una linea de brasa
// avanza, deja papel carbonizado que se deshace en ceniza y abre
// agujeros hasta que no queda nada. Entonces cae otra copia y vuelve a
// empezar (desde otro lado). Alrededor: restos de fotos quemadas, una
// caja de fosforos, una vela y cenizas que vuelan.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la brasa se aviva y la luz del fuego crece en la mesa
//   medios -> el humo sube mas y se enrosca
//   agudos -> chispas sueltas
//   golpe  -> llamarada: la brasa salta adelante; con Chaos se prenden
//             focos nuevos en el medio de la foto
// PIANO: cada tecla levanta una llamarada sobre la foto a la altura de la
//   nota (grave a la izquierda) con un chorro de chispas; la fuerza la hace
//   mas alta; apretada sigue ardiendo.
// Speed marca que tan rapido avanza el fuego (y el humo) aun en silencio.
// HISTORIA: cada vuelta (~22 s del reloj de Speed) el fuego empieza de un
// lado distinto; cada ~61 s una rafaga de viento tira las cenizas al costado.
// CLIMAX (~83 s, 16 s, en tres tiempos): el calor crece, sube el humo y
//   saltan brasas; el fuego se vuelve un incendio con llamaradas enormes
//   que iluminan toda la mesa; una rafaga se lleva las cenizas al costado.
//   Cada ~4.5 min mas largo (gran climax).
//
// @D1: velocidad del fuego (dentro de cada vuelta; el frente se desliza sin saltar)
// @D2: brasa (fuerza de la linea de fuego)
// @D3: humo
// @D4: cenizas y chispas
// @D5: tono de la foto (gris <-> sepia)
// @D6: vela y fosforos (luz alrededor)
// ===============================================================

mat2 q22rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float has = hkMediaHas();
    vec4 G = hkGrandClimax(40.0);
    vec4 C = hkClimaxOr(G, hkClimax(40.0, 83.0, 16.0));
    float wind = max(hkEvent(40.0, 61.0, 6.0), C.z);
    float blaze = C.x * 0.6 * (1.0 - C.z) + C.y;                // calor del climax

    // ciclo de quemado (reloj de Speed). La vuelta dura SIEMPRE lo mismo:
    // si D1 cambiara la duracion, la fase saltaria (y hasta la foto). D1
    // decide que tan rapido avanza el frente dentro de la vuelta.
    float period = 22.0;
    float cyc = t / period;
    float cid = floor(cyc);
    float ph = fract(cyc);
    float b = ph * mix(1.20, 2.00, uD1) - 0.12 + hit * 0.03;   // frente del fuego
    float drop = smoothstep(0.0, 0.05, ph);              // la copia nueva cae

    // la foto sobre la mesa
    float ia = clamp(hkMediaAspect(), 0.7, 1.6);
    vec2 hsz = vec2(0.70 * ia, 0.70);
    float tilt = (hash21(vec2(cid, 1.0)) - 0.5) * 0.12;
    vec2 off = vec2((hash21(vec2(cid, 2.0)) - 0.5) * 0.25, (1.0 - drop) * 0.25);
    vec2 q = q22rot(tilt) * (p - off);
    vec2 m = q / (2.0 * hsz) + 0.5;                      // 0..1 en la foto
    float pd = hkBox(q, hsz);
    // origen del fuego: un borde distinto por vuelta
    float side = floor(hash21(vec2(cid, 3.0)) * 4.0);
    vec2 org = side < 1.0 ? vec2(hash21(vec2(cid, 4.0)), -0.05) : side < 2.0 ? vec2(1.05, hash21(vec2(cid, 4.0)))
             : side < 3.0 ? vec2(hash21(vec2(cid, 4.0)), 1.05) : vec2(-0.05, hash21(vec2(cid, 4.0)));
    vec2 dm = (m - org) * vec2(ia, 1.0);
    float f = length(dm) / (1.25 * max(ia, 1.0)) + (fbm(m * vec2(2.2 * ia, 2.2) + cid * 3.1, 3, 0.5) - 0.5) * 0.32
            + (noise21(m * vec2(14.0 * ia, 14.0) + cid) - 0.5) * 0.035;
    // focos con locura: el golpe prende puntos en el medio
    if (loco > 0.3) {
        vec2 sp = hash22(vec2(cid, floor(uRTime * 1.5)));
        f = min(f, length((m - sp) * vec2(ia, 1.0)) * 2.2 + 0.5 - hit * loco * 0.6);
    }
    float burnt = b - f;                                  // >0 ya quemado

    // --- mesa ---
    vec2 wq = p * vec2(1.0, 6.0);
    float plank = floor(wq.y + 0.3 * sin(p.x * 0.7));
    float grain = fbm(vec2(p.x * 2.0, p.y * 30.0 + plank * 7.0), 4, 0.55);
    vec3 wood = vec3(0.13, 0.090, 0.062) * (0.45 + 0.8 * grain) * (0.8 + 0.4 * hash21(vec2(plank, 1.0)));
    wood *= 1.0 - 0.6 * smoothstep(0.03, 0.0, abs(fract(wq.y + 0.3 * sin(p.x * 0.7)) - 0.5) - 0.47);
    wood = mix(wood, vec3(0.02), smoothstep(0.62, 0.8, fbm(p * 1.5 + 5.0, 4, 0.5)) * 0.6);   // manchas y quemaduras viejas

    // luz: el fuego (en el frente) + la vela
    vec2 frontP = q22rot(-tilt) * (((org + normalize(vec2(0.5) - org) * clamp(b, 0.0, 1.2) * 0.9) - 0.5) * 2.0 * hsz) + off;
    float fireAmt = smoothstep(-0.05, 0.05, b) * (1.0 - smoothstep(1.0, 1.2, b));
    vec3 fireC = vec3(1.0, 0.45, 0.12);
    vec3 L = vec3(0.045, 0.042, 0.040);
    L += fireC * fireAmt * (0.5 + bass * 0.6 + blaze * 1.2) * (0.4 + uD2) * 0.16 / (0.12 + dot(p - frontP, p - frontP) * 1.5 / (1.0 + blaze));
    // piano: cada llamarada tambien ilumina la mesa
    float keyFire = 0.0;
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.04, 0.6);
        if (e < 0.01) continue;
        vec2 kp = vec2(hkKeyX(k) * 0.55, -0.15);
        L += fireC * e * (0.4 + keyVel(k) * 0.6) * 0.10 / (0.10 + dot(p - kp, p - kp) * 2.0);
        keyFire += e;
    }
    vec2 cp = vec2(-uAspect + 0.55, 0.02);
    L += vec3(1.0, 0.70, 0.42) * uD6 * 0.07 / (0.05 + dot(p - cp, p - cp) * 1.2) * (0.85 + 0.15 * noise21(vec2(t * 5.0, 2.0)));
    vec3 col = wood * L * 7.0;

    // --- restos de fotos quemadas alrededor ---
    for (int k = 0; k < 4; k++) {
        float fk = float(k);
        vec2 sc = vec2((fk < 2.0 ? -1.0 : 1.0) * (uAspect - 0.55 - 0.15 * mod(fk, 2.0)), (mod(fk, 2.0) < 0.5 ? 0.55 : -0.62));
        vec2 sq = q22rot(fk * 1.7 + 0.4) * (p - sc);
        float sd = hkBox(sq, vec2(0.30, 0.22));
        float ragged = fbm(sq * 9.0 + fk * 5.0, 3, 0.5);
        float keep = sd + ragged * 0.12 - 0.04 + length(sq - vec2(0.3, 0.22)) * -0.08;
        if (keep < 0.0) {
            float ce = smoothstep(-0.10, 0.0, keep);
            vec3 paper = vec3(0.30, 0.28, 0.25) * (0.7 + 0.3 * noise21(sq * 20.0));
            vec2 mu = hkMediaCover(sq / vec2(0.60, 0.44) + 0.5, 0.60 / 0.44);
            paper = mix(paper, hkTone(hkMediaGet(mu, 2.0, has), 0.0, vec3(0.9, 0.8, 0.65), 1.2) * 0.8, smoothstep(-0.04, -0.07, sd));
            paper = mix(paper, vec3(0.04, 0.03, 0.025), ce);
            col = paper * L * 6.0;
        }
    }

    // --- fosforos y caja ---
    if (uD6 > 0.02) {
        vec2 bq = q22rot(-0.3) * (p - vec2(uAspect - 0.75, -0.08));
        float box = hkRBox(bq, vec2(0.16, 0.09), 0.01);
        float label = hkRBox(bq, vec2(0.11, 0.05), 0.005);
        if (box < 0.0) col = mix(vec3(0.11, 0.10, 0.08), vec3(0.18, 0.04, 0.03), step(label, 0.0)) * (0.5 + 0.5 * noise21(bq * 30.0)) * L * 6.0;
        for (int k = 0; k < 3; k++) {
            float fk = float(k);
            vec2 a = vec2(uAspect - 0.98 + fk * 0.06, -0.32 - fk * 0.05), d = vec2(0.28, 0.06 + fk * 0.03);
            float stick = hkSeg(p, a, a + d) - 0.008;
            float head = length(p - a - d) - 0.016;
            col = mix(col, vec3(0.20, 0.17, 0.12) * L * 6.0, 1.0 - smoothstep(0.0, 0.003, stick));
            col = mix(col, vec3(0.05, 0.04, 0.035) * L * 6.0, 1.0 - smoothstep(0.0, 0.003, head));
        }
        vec4 cd = hkCandle(p, vec2(cp.x, -0.16), 0.03, 0.12, t, 3.0);
        col = mix(col, cd.rgb, cd.a * smoothstep(0.0, 0.1, uD6));
    }

    // sombra de la foto en la mesa
    col *= mix(1.0, 0.5, (1.0 - smoothstep(0.0, 0.06, hkBox(q - vec2(0.03, -0.04), hsz))) * step(burnt, 0.25) * drop);

    // --- la foto ---
    float border = 0.045;
    if (pd < 0.0 && burnt < 0.45) {
        vec3 paper = vec3(0.62, 0.60, 0.55) * (0.85 + 0.15 * noise21(q * 40.0));
        float inImg = step(hkBox(q, hsz - border), 0.0);
        // calor: la imagen se ondula cerca del frente
        vec2 hm = m + (vec2(noise21(m * 20.0 + t), noise21(m * 20.0 - t)) - 0.5) * 0.012 * smoothstep(0.15, 0.0, abs(burnt));
        vec2 mi = (hm - 0.5) * (2.0 * hsz) / (2.0 * hsz - 2.0 * border) + 0.5;
        vec3 im = hkMediaGet(hkMediaCover(mi, ia), 0.3, has);
        im = hkTone(im, 0.05, mix(vec3(0.95), vec3(1.0, 0.82, 0.58), uD5), 1.15) * 0.9;
        vec3 photo = mix(paper, im, inImg);
        photo *= 0.92 + 0.12 * noise21(m * 6.0);
        // tostado antes del fuego, carbon despues
        float scorch = smoothstep(-0.10, 0.0, burnt);
        photo = mix(photo, photo * vec3(0.45, 0.30, 0.18), scorch);
        float charZ = smoothstep(0.0, 0.015, burnt);
        vec3 charC = vec3(0.025, 0.022, 0.02) * (0.6 + 0.8 * noise21(q * 60.0));
        charC += vec3(0.25, 0.24, 0.22) * smoothstep(0.6, 0.85, noise21(q * 35.0 + cid)) * 0.6 * smoothstep(0.05, 0.25, burnt);   // ceniza gris
        charC *= 1.0 + 4.0 * smoothstep(0.08, 0.0, burnt) * fireAmt;                          // carbon todavia caliente
        photo = mix(photo, charC, charZ);
        // brasa: linea que avanza, con brasitas sueltas detras
        float ember = exp(-abs(burnt - 0.012) / (0.016 + uD2 * 0.018));
        float sparks = smoothstep(0.82, 0.95, noise21(q * 50.0 + t * 0.6)) * smoothstep(0.0, 0.03, burnt) * smoothstep(0.22, 0.05, burnt);
        float heat = (ember + sparks * 0.6) * (0.6 + bass * 0.7 + hit * 0.8) * (0.4 + uD2 * 0.9);
        vec3 emberC = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.85, 0.45), clamp(ember * ember, 0.0, 1.0));
        vec3 lit = photo * L * 6.0 + photo * 0.10 * (1.0 - charZ);
        lit += photo * fireC * exp(-max(-burnt, 0.0) * 9.0) * fireAmt * (0.4 + bass * 0.5) * 0.6 * (1.0 - charZ);   // el fuego ilumina el papel
        lit += emberC * heat * 2.2;
        float hole = fbm(q * 7.0 + cid * 2.0, 3, 0.5);
        float a = drop * (1.0 - smoothstep(0.22 + hole * 0.15, 0.30 + hole * 0.15, burnt));    // el carbon se deshace
        col = mix(col, lit, a);
    }
    // llamitas sobre la linea de fuego
    if (abs(burnt) < 0.25 && pd < 0.04 && fireAmt > 0.0) {
        vec2 up = q22rot(-tilt) * vec2(0.0, 1.0);
        float fl = noise21(vec2(q.x * 14.0, q.y * 6.0 - t * 4.0));
        float tongue = smoothstep(0.55 - blaze * 0.25, 0.85, fl) * exp(-max(burnt, 0.0) * 30.0 / (1.0 + blaze * 2.5)) * smoothstep(-0.06 - blaze * 0.1, 0.0, burnt);
        col += vec3(1.0, 0.5, 0.15) * tongue * (0.5 + bass + blaze) * (0.3 + uD2) * 1.2;
    }
    // --- PIANO: llamaradas a la altura de la nota ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.04, 0.6);
        if (e < 0.01) continue;
        float vel = keyVel(k);
        vec2 base = vec2(hkKeyX(k) * 0.55, -0.30 + 0.25 * fract(keyPos(k) * 5.3));
        vec2 fq = p - base;
        float hgt = (0.35 + vel * 0.55) * (0.6 + 0.4 * smoothstep(0.0, 0.4, keyAge(k)));
        float w = 0.10 + vel * 0.06;
        float fn = noise21(vec2(fq.x * 10.0, fq.y * 5.0 - uKclock * 7.0 + float(k) * 4.0));
        float tongue = smoothstep(w * (1.0 - fq.y / hgt), 0.0, abs(fq.x + (fn - 0.5) * 0.12 * fq.y)) * step(-0.03, fq.y) * smoothstep(hgt, hgt * 0.3, fq.y);
        col += mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.85, 0.45), smoothstep(0.4, 1.0, tongue * fn * 1.4)) * tongue * (0.5 + fn) * 1.1 * e;
        float sp = hkParticles(fq * 2.5, uKclock * 1.2, 0.20, vec2(0.0, 1.0), 0.04);
        col += vec3(1.0, 0.6, 0.2) * sp * exp(-abs(fq.x) * 6.0) * smoothstep(-0.05, 0.6, fq.y) * e * 1.5;
    }

    // --- humo ---
    {
        float sm = fbm(vec2(p.x * 1.6 + sin(p.y * 2.0 + t * 0.3) * 0.4 - wind * p.y, p.y * 1.2 - t * (0.25 + mid * 0.4)), 4, 0.55);
        float col2 = exp(-pow((p.x - frontP.x - (p.y - frontP.y) * (0.2 + wind)) * 1.5, 2.0)) * smoothstep(frontP.y - 0.2, frontP.y + 0.3, p.y);
        float smoke = smoothstep(0.45, 0.8, sm) * col2 * fireAmt * clamp(uD3 + blaze * 0.6, 0.0, 1.2);
        col = mix(col, vec3(0.16, 0.155, 0.15) * (0.3 + L * 3.0), smoke * 0.55);
    }
    // --- cenizas y chispas que vuelan ---
    vec2 dir = normalize(vec2(0.25 + wind * 2.5, 1.0));
    float ash = hkParticles(p - frontP * 0.3, t * 0.6, 0.05 + uD4 * 0.25 + blaze * 0.2, dir, 0.035);
    col += vec3(1.0, 0.45, 0.12) * ash * (0.15 + high * 0.6 + uD4 * 0.3 + blaze) * fireAmt * smoothstep(-0.8, 0.2, p.y - frontP.y);
    // incendio: resplandor sobre toda la mesa
    col += vec3(1.0, 0.40, 0.10) * C.y * 0.08 * (0.7 + 0.3 * noise21(vec2(uRTime * 6.0, 1.0))) * smoothstep(1.0, -0.8, p.y);
    float flake = hkParticles(p * 1.3 + 3.0, t * 0.3, 0.06 + uD4 * 0.15, dir, 0.05);
    col = mix(col, vec3(0.20, 0.19, 0.18) * (0.2 + L * 3.0), clamp(flake, 0.0, 1.0) * 0.5 * uD4);

    return vec4(hkFinish(col, uv, vec3(0.35, 0.25, 0.18)), 1.0);
}
