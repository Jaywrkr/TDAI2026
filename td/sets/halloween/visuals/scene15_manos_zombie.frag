// ===============================================================
// HALLOWEEN 15 - MANOS DE ZOMBIE
// Matte painting con LAMINAS horneadas (plates/scene15, ver
// td/tools/bake_plates_zombies.py): cementerio de noche con reja de
// hierro, mausoleo, lapidas torcidas y arboles pelados; adelante, la
// tierra recien removida con montículos, terrones, raices y un agujero
// en cada tumba. De los agujeros salen manos de zombie (piel podrida,
// venas, hueso en las puntas, manga rota) que abren y cierran los dedos:
// el shader mezcla la pose abierta y la de garra. Una luz verde
// enfermiza sale de la tierra.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la luz de la tierra crece y late
//   medios -> las manos se mecen y abren/cierran los dedos
//   agudos -> brillo humedo en la piel y en la niebla
//   golpe  -> estiron (D4), cada mano con su retraso, y saltan terrones;
//             con Chaos salen casi enteras y tiemblan
// PIANO: cada tecla hace salir con fuerza la mano de la tumba mas cercana
//   (grave a la izquierda), que se estira y cierra la garra mientras la
//   tecla siga apretada, con terrones que saltan; al soltarla vuelve a
//   hundirse. Un acorde saca varias.
// Speed mueve la niebla, las nubes y el ritmo de los dedos en silencio.
// HISTORIA: cada acto cambia cuantas manos hay; cada ~53 s un relampago
// lejano recorta el fondo.
// CLIMAX (~69 s, 18 s, en tres tiempos): la tierra tiembla, cae un rayo y
//   sale una mano sola; despues salen todas en ola de izquierda a derecha;
//   se quedan arriba arañando el aire mientras la luz de la tierra baja.
//   Cada ~4.5 min con relampagos seguidos (gran climax).
//
// @D1: cantidad de manos (cada una nueva sale de la tierra)
// @D2: cuanto salen de la tierra
// @D3: cuanto se abren los dedos
// @D4: estiron con el golpe
// @D5: luz (verde enfermizo <-> rojo)
// @D6: tierra que salta
// ===============================================================

const vec4 BACK_R = vec4(-3.1, -0.8, 6.2, 1.4);
const vec4 GROUND_R = vec4(-3.1, -1.2, 6.2, 0.95);
const vec4 HAND_R = vec4(-0.5, -0.25, 1.0, 1.55);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// agujeros de las tumbas: la misma lista que el horneado
const vec2 HOLES[9] = vec2[9](vec2(-2.25, -0.50), vec2(-1.50, -0.47), vec2(-0.75, -0.52), vec2(0.0, -0.46), vec2(0.75, -0.51),
                              vec2(1.50, -0.47), vec2(2.25, -0.50), vec2(-1.12, -0.60), vec2(1.12, -0.60));
// orden en que aparecen las manos al subir D1 (centro primero)
const int ORDER[9] = int[9](3, 2, 4, 1, 5, 7, 8, 0, 6);

vec4 render(vec2 uv) {
    // encuadre bajo: la tierra y las manos ocupan mas de la pantalla
    vec2 p = hkCam(hkPunch(hkShake(centered(uv)))) * 0.82 + vec2(0.0, -0.30);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    vec4 G = hkGrandClimax(20.0);
    vec4 C = hkClimaxOr(G, hkClimax(20.0, 69.0, 18.0));
    float cph = C.w;
    float horde = 0.0;
    // aviso: tiembla la tierra; un rayo cerca del final del aviso
    float quake = C.x * (1.0 - C.y) * (1.0 - C.z);
    float boltE = max(hkEvent(21.0, 53.0, 3.0), max(step(0.24, cph) * step(cph, 0.30), G.y)) * step(0.75, noise21(vec2(uRTime * 8.0, 2.0)));
    // ola de izquierda a derecha en el pico
    float waveX = mix(-2.8, 2.8, clamp((cph - 0.36) / 0.28, 0.0, 1.0));
    float inWave = step(0.36, cph) * (1.0 - smoothstep(0.92, 1.0, cph));
    vec3 glowC = mix(vec3(0.35, 1.0, 0.30), vec3(1.0, 0.18, 0.08), uD5);
    float glow = 0.55 + bass * 0.9 + hit * 0.3 + C.x * 0.4 * (1.0 - C.z) + C.y * 0.6;
    vec3 moonC = vec3(0.55, 0.62, 0.75);

    // --- cielo, luna y nubes ---
    vec3 col = mix(vec3(0.020, 0.035, 0.030), vec3(0.004, 0.006, 0.010), smoothstep(-0.4, 1.0, p.y));
    vec2 mc = vec2(-uAspect * 0.62, 0.70);
    float md = length(p - mc);
    col += moonC * (1.0 - smoothstep(0.10, 0.11, md)) * (0.45 + 0.3 * fbm((p - mc) * 14.0, 3, 0.5));
    col += moonC * exp(-md * 3.5) * 0.12;
    float cl = plate7Wrap(vec2(p.x * 0.12 - t * 0.006, p.y * 0.5)).r;
    col = mix(col, vec3(0.012, 0.018, 0.018) + moonC * 0.05 * exp(-md * 2.0), smoothstep(0.5, 0.75, cl) * smoothstep(0.0, 0.5, p.y) * 0.85);
    col += vec3(0.7, 0.8, 1.0) * boltE * 0.25 * smoothstep(-0.3, 0.8, p.y);

    // --- cementerio del fondo ---
    vec4 bk = plate0(rUV(p, BACK_R));
    if (bk.a > 0.0) {
        vec3 bc = plateCol(bk.rgb) * (0.4 + moonC * 0.4) + glowC * 0.012;
        bc = mix(bc, vec3(0.002), boltE * 0.9);                       // recorte con el relampago
        col = mix(col, bc, bk.a);
    }
    // niebla entre el fondo y las tumbas
    float fz = plate7Wrap(vec2(p.x * 0.09 - t * 0.007, p.y * 0.6)).g;
    col = mix(col, glowC * 0.10 + moonC * 0.06, smoothstep(0.4, 0.8, fz) * exp(-pow((p.y + 0.45) / 0.15, 2.0)) * 0.6);

    // --- manos ---
    vec2 quakeOff = (vec2(noise21(vec2(uRTime * 30.0, 1.0)), noise21(vec2(uRTime * 30.0, 5.0))) - 0.5) * 0.02 * quake;
    p += quakeOff;
    float nH = 2.0 + uD1 * 6.0 + hkActVal(3.0) * 1.0;
    for (int kk = 0; kk < 9; kk++) {
        int i = ORDER[kk];
        vec2 hole = HOLES[i];
        if (abs(p.x - hole.x) > 0.65) continue;
        // presencia: D1 de a una + la mano sola del aviso + la ola del pico + el piano
        float kb = 0.0;
        for (int k = 0; k < N_KEYS; k++) {
            if (abs(hkKeyX(k) * 1.05 - hole.x) < 0.38) kb = max(kb, keyEnv(k, 0.12, 0.8) * (0.5 + keyVel(k) * 0.7));
        }
        float lone = kk == 0 ? smoothstep(0.26, 0.34, cph) : 0.0;
        float emerge = max(max(revealAt(nH, float(kk)), kb), max(lone, inWave * smoothstep(hole.x + 0.3, hole.x - 0.1, waveX)));
        if (emerge < 0.01) continue;
        float fi = float(i);
        float h1 = hash21(vec2(fi, 4.0));
        float s = (0.56 + 0.08 * h1) * (i >= 7 ? 0.8 : 1.0);
        // cuanto sale: D2 + ola propia + estiron del golpe con retraso
        float lag = fract(h1 * 5.0) * 0.3;
        float stretch = smoothstep(0.0, 0.25, hit - lag) * uD4 * 0.5 + kb * 0.45;
        float rise = clamp(0.40 + uD2 * 0.60 + 0.08 * sin(t * (0.6 + h1 * 0.5) + fi * 2.0) + stretch + C.y * 0.35 + hit * loco * 0.3, 0.0, 1.15);
        // sale de la tierra: con emerge = 0 queda bajo tierra
        rise = mix(-0.15, rise, emerge);
        float sway = (0.06 + mid * 0.18) * sin(t * (0.8 + h1) + fi * 1.7) + hit * loco * 0.08 * sin(uRTime * 30.0 + fi);
        vec2 base = hole + vec2(0.0, (rise - 0.95) * s * 1.2);
        vec2 q = p - base;
        float c = cos(sway), sn = sin(sway);
        q = vec2(c * q.x + sn * q.y, -sn * q.x + c * q.y) / s;
        if (h1 > 0.5) q.x = -q.x;                                     // mano izquierda/derecha
        vec2 hu = rUV(q, HAND_R);
        // abre y cierra los dedos: mezcla de las dos poses
        float open = clamp(0.5 + 0.5 * sin(t * (1.1 + h1) + fi * 3.0) * (0.4 + mid) + (uD3 - 0.5) * 1.2 + stretch, 0.0, 1.0);
        // garra: con el piano apretado o arañando el aire despues de la ola
        open = mix(open, 0.5 + 0.5 * sin(uRTime * 7.0 + fi), max(kb, C.z) * 0.8);
        vec4 ho = plate3(hu), hg = plate5(hu);
        float k = smoothstep(0.35, 0.65, open);
        vec4 hc = mix(hg, ho, k);
        if (hc.a <= 0.01) continue;
        vec4 hn = mix(plate6(hu), plate4(hu), k);
        vec2 nxy = hn.rg * 2.0 - 1.0;
        if (h1 > 0.5) nxy.x = -nxy.x;
        vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
        vec3 alb = plateCol(hc.rgb);
        // luz de la tierra desde abajo + luna arriba a la izquierda
        float below = exp(-max(p.y - hole.y, 0.0) * 1.6);
        vec3 lit = glowC * glow * (0.20 + max(-n.y, 0.0) * 0.9) * below * 1.1;
        lit += moonC * 0.30 * max(dot(n, normalize(vec3(-0.6, 0.5, 0.6))), 0.0);
        lit += vec3(0.02);
        vec3 hcol = alb * lit;
        hcol += vec3(0.6, 0.7, 0.6) * pow(max(dot(n, normalize(vec3(-0.3, 0.4, 0.86))), 0.0), 24.0) * (0.05 + high * 0.15);   // brillo humedo
        col = mix(col, hcol, hc.a);
    }

    // --- tierra removida (tapa el antebrazo) ---
    vec2 gu = rUV(p, GROUND_R);
    vec4 ga = plate1(gu);
    if (ga.a > 0.0) {
        vec4 gn = plate2(gu);
        vec2 nxy = gn.rg * 2.0 - 1.0;
        vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
        vec3 alb = plateCol(ga.rgb);
        float gl = 0.0;
        for (int kk = 0; kk < 9; kk++) {
            vec2 d = (p - HOLES[ORDER[kk]]) * vec2(1.0, 2.0);
            gl += exp(-dot(d, d) * 9.0) * max(revealAt(nH, float(kk)), max(inWave, C.x * 0.5));
        }
        vec3 lit = vec3(0.025) + moonC * 0.30 * max(dot(n, normalize(vec3(-0.6, 0.6, 0.5))), 0.0) + glowC * glow * gl * 0.45;
        col = mix(col, alb * lit * 2.2, ga.a);
    }
    // resplandor de los agujeros en el aire
    for (int kk = 0; kk < 9; kk++) {
        vec2 hole = HOLES[ORDER[kk]];
        vec2 d = (p - hole - vec2(0.0, 0.12)) * vec2(1.4, 0.9);
        col += glowC * exp(-dot(d, d) * 14.0) * glow * 0.10 * max(revealAt(nH, float(kk)), max(inWave, C.x * 0.5));
    }

    // --- terrones que saltan con el golpe ---
    // piano: tambien saltan terrones donde sale la mano
    float dirtAmt = max(uD6 * hit, 0.0);
    for (int k = 0; k < N_KEYS; k++) dirtAmt = max(dirtAmt, keyEnv(k, 0.05, 0.5) * exp(-keyAge(k) * 1.5) * 0.8);
    dirtAmt = max(dirtAmt, quake * 0.5);
    if (dirtAmt > 0.02) {
        float ph = fract(uRTime * 1.3);
        for (int kk = 0; kk < 4; kk++) {
            vec2 hole = HOLES[ORDER[kk]];
            if (abs(p.x - hole.x) > 0.5) continue;
            for (int j = 0; j < 5; j++) {
                float fj = float(j);
                vec2 v = (hash22(vec2(float(kk) * 7.0 + fj, floor(uRTime * 1.3))) - vec2(0.5, 0.0)) * vec2(0.9, 1.3);
                vec2 cp = hole + v * ph * 0.6 + vec2(0.0, -1.6 * ph * ph * 0.5);
                float r = 0.012 + 0.012 * hash21(vec2(fj, float(kk)));
                col = mix(col, vec3(0.06, 0.045, 0.03) + glowC * 0.05, (1.0 - smoothstep(r, r + 0.004, length(p - cp))) * dirtAmt);
            }
        }
    }

    // --- niebla baja adelante ---
    float fz2 = plate7Wrap(vec2(p.x * 0.07 - t * 0.010, p.y * 0.4 + 0.5)).b;
    col = mix(col, glowC * 0.08 + moonC * 0.05, smoothstep(0.42, 0.8, fz2) * exp(-pow((p.y + 0.85) / 0.22, 2.0)) * (0.35 + high * 0.15));

    return vec4(hkFinish(col, uv, vec3(0.15, 0.4, 0.2)), 1.0);
}
