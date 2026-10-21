// ===============================================================
// HALLOWEEN 23 - PELICULA DE 1920 (usa la carpeta Media)
// Un cine viejo a oscuras. En la pantalla, la imagen de la carpeta Media
// pasa como pelicula muda: blanco y negro (o sepia), grano grueso,
// rayas, polvo, pelos en la ventanilla, parpadeo y el cuadro que baila.
// Alrededor: el arco del escenario, cortinas de terciopelo, el haz del
// proyector con polvo y las cabezas del publico recortadas abajo.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> parpadeo del proyector y luz del haz
//   medios -> el cuadro se mece (gate weave)
//   agudos -> polvo y chispas en la pelicula
//   golpe  -> salta el cuadro (se ve la linea entre fotogramas); con
//             Chaos la pelicula se traba y se derrite en el proyector
// PIANO: cada tecla raya la pelicula con un rayon blanco en la posicion
//   de la nota (grave a la izquierda) y el cuadro salta; la fuerza: mas
//   grueso; apretada, el rayon sigue y tiembla.
// Speed mueve el grano, las rayas y el polvo aun en silencio.
// HISTORIA: cada ~41 s el iris se cierra y se abre; cada ~57 s un cartel
// de titulo con marco; alguien del publico se da vuelta.
// CLIMAX (~73 s, 18 s, en tres tiempos): el proyector salta y parpadea
//   cada vez mas y el iris se cierra; se abre y la cinta se quema con una
//   burbuja hasta quedar en blanco; vuelve con un cartel de titulo y
//   alguien del publico se da vuelta. Cada ~4.5 min mas largo (gran climax).
//
// @D1: rayas y polvo
// @D2: parpadeo
// @D3: saltos de cuadro
// @D4: iris / vineta
// @D5: tono (plata <-> sepia)
// @D6: sala (cortinas, publico, haz)
// ===============================================================

const vec2 SC = vec2(0.0, 0.16);     // centro de la pantalla
const float SH = 0.68;               // media altura (4:3)

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float has = hkMediaHas();

    vec4 G = hkGrandClimax(51.0);
    vec4 C = hkClimaxOr(G, hkClimax(51.0, 73.0, 18.0));
    float cph = C.w;
    float shake = C.x * (1.0 - C.y) * (1.0 - C.z);                         // aviso: saltos
    float irisE = hkEvent(50.0, 41.0, 5.0);
    float irisPh = hkEventPhase(50.0, 41.0, 5.0);
    // el iris del climax: se cierra al final del aviso y se abre al llegar el pico
    float irisC = smoothstep(0.18, 0.33, cph) * (1.0 - smoothstep(0.36, 0.44, cph));
    // la cinta se quema durante el pico y queda en blanco hasta el cartel
    float burnE = smoothstep(0.44, 0.46, cph) * (1.0 - smoothstep(0.78, 0.82, cph));
    float burnPh = clamp((cph - 0.45) / 0.22, 0.0, 1.0);
    float cardE = max(hkEvent(52.0, 57.0, 6.0), smoothstep(0.80, 0.85, cph) * (1.0 - smoothstep(0.95, 1.0, cph)));
    float turnE = max(hkEvent(53.0, 67.0, 9.0), C.z);
    // piano: saltos de cuadro
    float keyJump = 0.0;
    for (int k = 0; k < N_KEYS; k++) keyJump = max(keyJump, keyEnv(k, 0.01, 0.3) * exp(-keyAge(k) * 5.0) * (0.5 + keyVel(k)));

    float fps = floor(t * 18.0);                    // la pelicula corre a 18 cuadros
    float flick = 1.0 - (0.06 + uD2 * 0.22 + shake * 0.30) * (0.5 + 0.5 * hash21(vec2(fps, 1.0))) - bass * uD2 * 0.15;
    vec2 SW = vec2(SH * 4.0 / 3.0, SH);

    // --- sala ---
    vec3 col = vec3(0.006, 0.005, 0.005);
    // haz del proyector (desde arriba atras del publico)
    vec2 pj = vec2(0.0, -1.25);
    vec2 dv = p - pj;
    float beamA = abs(atan(dv.x, dv.y));
    float beam = smoothstep(0.42, 0.30, beamA) * smoothstep(-1.2, 0.2, p.y) * step(p.y, SC.y + SH);
    float dustB = hkParticles(p * 1.2, t * 0.2, 0.15 + uD1 * 0.2, vec2(0.1, 0.25), 0.04);
    float smokeB = fbm(p * vec2(2.0, 1.0) + vec2(t * 0.05, -t * 0.03), 3, 0.5);
    col += vec3(0.55, 0.55, 0.52) * beam * (0.025 + smokeB * 0.05 + dustB * 0.10) * flick * (0.4 + uD6 * 0.6) * (0.7 + bass * 0.5);
    // luz rebotada de la pantalla en la sala
    float scrLight = 0.16 * flick * (1.0 - burnE * 0.5) + burnE * smoothstep(0.6, 1.0, burnPh) * 0.12;
    float bounce = exp(-length((p - SC) * vec2(0.40, 0.7)) * 1.1) * scrLight;

    // arco del escenario y cortinas
    if (abs(p.x) > SW.x + 0.10) {
        float cx = abs(p.x) - SW.x - 0.10;
        float fold = 0.5 + 0.5 * sin(cx * 30.0 + sin(p.y * 1.5) * 1.2 + noise21(vec2(p.y * 3.0, 1.0)) * 1.5);
        vec3 vel = vec3(0.12, 0.045, 0.048) * (0.25 + 0.75 * fold) * (bounce * 9.0 + 0.04);
        col = vel * uD6 + col * (1.0 - uD6);
    }
    // cenefa de la cortina arriba
    float valance = SC.y + SH + 0.08 + 0.03 * sin(p.x * 9.0);
    if (p.y > valance) {
        float fold = 0.5 + 0.5 * sin(p.x * 22.0);
        col = mix(col, vec3(0.15, 0.04, 0.04) * (0.3 + 0.7 * fold) * (bounce * 7.0 + 0.03), uD6);
        float fringe = step(abs(p.y - valance - 0.012), 0.012) * (0.6 + 0.4 * sin(p.x * 300.0));
        col = mix(col, vec3(0.20, 0.15, 0.07) * (bounce * 8.0 + 0.05), fringe * uD6);
    }
    // marco dorado del arco
    float fr = abs(hkBox(p - SC, SW + vec2(0.06, 0.05))) - 0.018;
    col = mix(col, vec3(0.20, 0.16, 0.09) * (bounce * 8.0 + 0.04) * (0.6 + 0.4 * sin(atan(p.y - SC.y, p.x) * 60.0)), (1.0 - smoothstep(0.0, 0.004, fr)) * uD6);

    // --- pantalla / pelicula ---
    vec2 sq = p - SC;
    // gate weave + salto de cuadro
    float jump = hit * uD3 * step(0.5, hash21(vec2(fps, 2.0))) * 0.25 + hit * loco * 0.15
               + shake * step(0.65, hash21(vec2(fps, 7.0))) * 0.20 + keyJump * 0.12;
    sq += vec2(sin(t * 3.1) * 0.003, sin(t * 2.3) * 0.004) * (0.5 + mid * 2.0);
    vec2 sc = sq / (2.0 * SW) + 0.5;                    // 0..1 de la pantalla
    vec2 fr2 = vec2(sc.x, fract(sc.y + jump));
    float inScr = step(abs(sq.x), SW.x) * step(abs(sq.y), SW.y);
    if (inScr > 0.5) {
        vec2 mu = hkMediaCover(fr2, 4.0 / 3.0);
        mu += (vec2(noise21(vec2(fps, 3.0)), noise21(vec2(fps, 4.0))) - 0.5) * 0.004;
        vec3 im = hkMediaGet(mu, 0.8, has);
        float l = dot(im, vec3(0.2126, 0.7152, 0.0722));
        l = pow(clamp(l * 1.3, 0.0, 1.0), 0.85);
        l = smoothstep(0.0, 1.0, l);                      // contraste de nitrato
        vec3 film = vec3(l) * mix(vec3(0.92, 0.95, 1.0), vec3(1.0, 0.80, 0.55), uD5);
        // linea negra entre fotogramas cuando salta
        float bar = smoothstep(0.03, 0.0, abs(fract(sc.y + jump) - 0.0)) + smoothstep(0.03, 0.0, abs(fract(sc.y + jump) - 1.0));
        film *= 1.0 - bar * step(0.01, jump) * 0.95;
        // grano
        float gr = hash21(sc * vec2(640.0, 480.0) + fps * 13.0);
        film *= 0.80 + 0.40 * gr;
        // rayas verticales que viajan
        for (int k = 0; k < 3; k++) {
            float fk = float(k);
            float sx = fract(hash21(vec2(floor(t * 0.7 + fk * 0.37), fk)) + t * 0.01 * (fk - 1.0));
            float on = step(0.45 - uD1 * 0.35, hash21(vec2(floor(t * 2.0 + fk), fk + 9.0)));
            float sline = 1.0 - smoothstep(0.0, 0.0015 + fk * 0.0006, abs(sc.x - sx));
            film = mix(film, k == 1 ? vec3(0.0) : vec3(1.0), sline * on * 0.55);
        }
        // polvo, pelos y manchas (cambian por cuadro)
        vec2 dg = sc * vec2(28.0, 21.0);
        vec2 di = floor(dg);
        float dh = hash21(di + fps * 7.1);
        float dust = (1.0 - smoothstep(0.05, 0.12, length(fract(dg) - hash22(di + fps)))) * step(1.0 - (0.012 + uD1 * 0.05 + high * 0.03), dh);
        film = mix(film, dh > 0.996 ? vec3(1.0) : vec3(0.0), dust);
        vec2 hq = sc - vec2(0.15 + 0.7 * hash21(vec2(floor(t * 0.5), 5.0)), 0.8);
        float hair = hkLine(sin(hq.x * 25.0) * 0.02 - hq.y * 0.3, 1.0) * step(abs(hq.x), 0.12) * step(0.6, hash21(vec2(floor(t * 0.5), 6.0)));
        film = mix(film, vec3(0.0), hair * uD1);
        // parpadeo + vineta + iris
        film *= flick;
        vec2 vc = (sc - 0.5) * vec2(4.0 / 3.0, 1.0);
        film *= 1.0 - (0.25 + uD4 * 0.55) * smoothstep(0.2, 0.75, length(vc));
        float irisClose = max(irisE * (1.0 - abs(irisPh * 2.0 - 1.0)) * 1.6, irisC);
        if (irisClose > 0.001) {
            float irisR = 0.9 * (1.0 - clamp(irisClose, 0.0, 1.0));
            film *= smoothstep(irisR, irisR - 0.02, length(vc));
        }
        // piano: rayones blancos en la posicion de cada tecla
        for (int k = 0; k < N_KEYS; k++) {
            float e = keyEnv(k, 0.01, 0.5);
            if (e < 0.01) continue;
            float sx = mix(0.06, 0.94, keyPos(k)) + (noise21(vec2(sc.y * 6.0, uKclock * 8.0 + float(k))) - 0.5) * 0.02 * (1.0 + keyHeld(k));
            float wsc = 0.002 + keyVel(k) * 0.006;
            float scr = (1.0 - smoothstep(0.0, wsc, abs(sc.x - sx))) * (0.6 + 0.4 * step(0.3, noise21(vec2(sc.y * 40.0, floor(uKclock * 18.0)))));
            film = mix(film, vec3(1.0), scr * e * 0.9);
        }
        // cartel de titulo
        if (cardE > 0.01) {
            vec2 cq = vc;
            float bord = abs(hkBox(cq, vec2(0.58, 0.40))) - 0.006;
            float orn = abs(hkBox(cq, vec2(0.55, 0.37))) - 0.002;
            float lines = 0.0;
            for (int k = 0; k < 3; k++) {
                float fk = float(k);
                vec2 lq = cq - vec2(0.0, 0.10 - fk * 0.10);
                float w = 0.40 - fk * 0.08;
                float glyph = step(0.45, noise21(vec2(floor(lq.x * 70.0), fk + floor(uRTime / 57.0)))) * step(abs(lq.y), 0.022) * step(abs(lq.x), w);
                lines = max(lines, glyph * step(0.15, fract(lq.x * 70.0)));
            }
            vec3 card = vec3(0.02) + vec3(0.85) * max(max(1.0 - smoothstep(0.0, 0.004, bord), 1.0 - smoothstep(0.0, 0.003, orn)), lines);
            card *= 0.8 + 0.4 * gr;
            film = mix(film, card * flick * mix(vec3(0.92, 0.95, 1.0), vec3(1.0, 0.8, 0.55), uD5), cardE);
        }
        // la cinta se quema / se traba con locura
        float melt = burnE * smoothstep(0.0, 1.0, burnPh) + hit * loco * step(0.75, loco) * 0.5;
        if (melt > 0.001) {
            vec2 bc = vec2(0.5 + 0.2 * hash21(vec2(floor(uRTime / 73.0), 1.0)) - 0.1, 0.55);
            float bd = length((sc - bc) * vec2(4.0 / 3.0, 1.0)) + (fbm(sc * 6.0 + t * 0.2, 3, 0.5) - 0.5) * 0.25;
            float r = melt * 1.1;
            float hole = smoothstep(r, r - 0.02, bd);
            float rim = exp(-abs(bd - r) * 40.0);
            film = mix(film, vec3(1.0, 0.97, 0.9), hole);
            film = mix(film, vec3(0.05, 0.03, 0.02), smoothstep(r + 0.08, r, bd) * (1.0 - hole) * 0.8);
            film += vec3(1.0, 0.6, 0.25) * rim * 0.9;
        }
        col = film * 0.9;
    }
    // borde de la pantalla, levemente iluminado
    col += vec3(0.6) * exp(-max(hkBox(sq, SW), 0.0) * 40.0) * 0.02 * flick * (1.0 - inScr);

    // borde del escenario debajo de la pantalla
    if (p.y < SC.y - SH - 0.02) {
        float lip = SC.y - SH - 0.10;
        float stage = smoothstep(0.0, -0.01, p.y - lip);
        vec3 boards = vec3(0.10, 0.07, 0.05) * (0.6 + 0.4 * noise21(vec2(p.x * 30.0, 1.0))) * (bounce * 6.0 + 0.02);
        col = mix(boards * smoothstep(-0.12, 0.0, p.y - lip - 0.08), col, stage);
        col += vec3(0.5, 0.45, 0.4) * exp(-abs(p.y - lip) * 80.0) * bounce * 0.8;
    }
    // --- publico: cabezas y respaldos recortados abajo ---
    if (uD6 > 0.02 && p.y < -0.30) {
        float row = 0.0;
        for (int r = 0; r < 2; r++) {
            float fr3 = float(1 - r);
            float yb = -0.66 - fr3 * 0.24;
            float sp = 0.42 + fr3 * 0.08;
            float cx = (floor(p.x / sp + 0.5 + fr3 * 0.5) - fr3 * 0.5) * sp;
            float hh = hash21(vec2(cx, fr3));
            float turn = step(0.92, hh) * turnE;
            vec2 hq = p - vec2(cx + (hh - 0.5) * 0.1, yb + 0.20 + hh * 0.05);
            float head = length(hq * vec2(1.0, 0.85)) - 0.085 - fr3 * 0.02;
            float hat = step(0.7, hh) * min(hkRBox(hq - vec2(0.0, 0.07), vec2(0.07, 0.04), 0.02), hkRBox(hq - vec2(0.0, 0.035), vec2(0.13, 0.008), 0.004));
            if (hh < 0.7) hat = 1.0;
            float shoulders = length((p - vec2(cx, yb)) * vec2(0.6, 1.6)) - 0.20;
            shoulders = max(shoulders, -(p.y - yb + 0.5));
            float seat = hkRBox(p - vec2(cx, yb - 0.05), vec2(sp * 0.48, 0.12), 0.04);
            float sil = min(min(head, hat), min(shoulders, seat));
            float a = 1.0 - smoothstep(0.0, 0.004, sil);
            vec3 sc2 = vec3(0.004) + vec3(0.35) * bounce * exp(-max(-head, 0.0) * 30.0) * step(head, 0.01) * 0.5;
            // alguien se da vuelta: dos puntitos brillantes
            sc2 += vec3(0.9, 0.85, 0.7) * turn * (1.0 - smoothstep(0.006, 0.012, length(vec2(abs(hq.x) - 0.03, hq.y + 0.005))));
            col = mix(col, sc2, a * uD6);
        }
    }
    return vec4(hkFinish(col, uv, vec3(0.3, 0.28, 0.25)), 1.0);
}
