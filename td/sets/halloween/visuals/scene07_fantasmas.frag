// ===============================================================
// HALLOWEEN 07 - FANTASMAS
// Un pasillo de mansion en perspectiva (LAMINAS horneadas,
// plates/scene07, ver td/tools/bake_plates_pasillo.py): alfombra larga,
// zocalo de paneles, empapelado, puertas, retratos, vigas y un ventanal
// en arco al fondo con la luna. Por el pasillo flotan fantasmas de
// sabana translucida a distintas profundidades (se achican al alejarse),
// con pliegues, cola que se deshace y una luz fria que ilumina paredes y
// piso. Apliques de pared con velas y rayos de luna desde el ventanal.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> brillan los ojos de los retratos; los fantasmas laten
//   medios -> ondea el borde de las sabanas
//   agudos -> titilan las velas de los apliques; polvo en la luz de luna
//   golpe  -> los fantasmas se asoman (brillan y crecen); con Chaos se
//             abalanzan hacia la camara
// PIANO: cada tecla trae un fantasma que aparece en esa posicion y cruza
//   el pasillo (la fuerza: mas grande y brillante); apretada, se queda
//   flotando y se acerca de a poco; al soltarla se va volando al fondo.
// Speed los hace flotar y avanzar por el pasillo aun en silencio.
// Cada acto cambia cuantos hay.
// REPERTORIO (fase 32, motor hkSuceso del kit):
//   ESTADOS (~5 min): velas encendidas, velas bajas (manda la luna) y
//     niebla espectral (mas espesa y verdosa).
//   SUCESOS (~55 s, 7): uno pasa volando junto a la camara; se entreabre
//     una puerta con luz; los retratos encienden los ojos; las velas se
//     apagan de a una y vuelven; una dama de blanco cruza al fondo; un
//     fantasma atraviesa la pared; el pasillo se estira.
//   DETALLES (~30 s, 5): los retratos guinan, una vela titila, polvo en la
//     luz de luna, una puerta golpea, un fantasmita espia desde una puerta.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A la puerta: se juntan girando en espiral frente a la puerta, entran
//       todos y la puerta estalla de luz; despues vuelven de a uno.
//     B el baile: se juntan de a dos y bailan en ronda por el pasillo, las
//       velas se avivan; al final desaparecen todos de golpe con las velas.
//     C la estampida: uno tras otro vienen corriendo por el pasillo hacia
//       la camara, el viento acuesta las velas y el ultimo te atraviesa.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con uno que pasa
//     volando junto a la camara.
// @EST: velas encendidas | velas bajas | niebla espectral
// @SUC: pasa volando | la puerta se entreabre | ojos de los retratos | las velas se apagan | la dama de blanco | atraviesa la pared | el pasillo se estira
// @DET: los retratos guinan | una vela titila | polvo en la luna | una puerta golpea | un fantasmita espia
// @CLX: A la puerta | B el baile | C la estampida
//
// @D1: cantidad de fantasmas (aparecen de a uno)
// @D2: transparencia
// @D3: ondulacion del borde
// @D4: brillo interior
// @D5: color (blanco frio <-> verde espectral)
// @D6: niebla
// ===============================================================

const vec4 PL_R = vec4(-3.1, -1.2, 6.2, 2.4);
const vec2 VP = vec2(0.0, 0.05);
const float HF = 1.05, HC = 0.95, WC = 1.40, ZB = 4.6;
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// punto del mundo que se ve en p (y en w el id de superficie)
vec4 hwSurf(vec2 p) {
    vec2 d = p - VP;
    float z = 1e3; float id = 4.0;
    if (d.y < 0.0) { float zz = HF / (-d.y); if (zz < z) { z = zz; id = 0.0; } }
    if (d.y > 0.0) { float zz = HC / d.y; if (zz < z) { z = zz; id = 1.0; } }
    if (abs(d.x) > 1e-4) { float zz = WC / abs(d.x); if (zz < z) { z = zz; id = 2.0; } }
    z = min(z, ZB);
    return vec4(d * z, z, id);
}

// Fantasma de ~1 de alto, base ondulada en y = -0.5.
float hwGhost(vec2 p, float t, float wave, float seed) {
    float head = length(p - vec2(0.0, 0.18)) - 0.30;
    float w = 0.30 + 0.07 * (p.y < 0.18 ? (0.18 - p.y) : 0.0);
    float body = max(abs(p.x) - w, p.y - 0.18);
    float hem = -0.48 + wave * 0.07 * sin(p.x * 18.0 + t * 4.0 + seed)
              + 0.03 * sin(p.x * 7.0 - t * 2.0 + seed * 2.0);
    body = max(body, hem - p.y);
    return hkSmin(head, body, 0.05);
}

vec4 render(vec2 uv) {
    // --- calendario (fase 32) ---
    hkSetClimax(4.0, 18.0, 22.0);
    vec4 GC = hkGrandV();
    vec4 C = hkClimaxOr(GC, hkClimaxV());
    float grand = GC.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(4.0, 7, 9.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(4.0, 5, 3.5);
    int dv = int(D.z);
    vec4 EST = hkEstado(4.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(4.0, 3));

    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    // suceso: el pasillo se estira (se aleja todo y vuelve)
    float stretch = sv == 6 ? se * sin(sp * PI) : 0.0;
    p = VP + (p - VP) * (1.0 + stretch * 0.20);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.008);
    vec3 cold = vec3(0.80, 0.90, 1.0);
    vec3 spectral = hsv2rgb(vec3(fract(0.36 + hue), 0.60, 1.0));
    vec3 gc = mix(cold, spectral, clamp(uD5 + EST.z * 0.45, 0.0, 1.0));
    vec3 moonC = vec3(0.50, 0.60, 0.95);

    float cph = cA * C.w;
    float flyBy = max(sv == 0 ? se : 0.0, GC.x * (1.0 - GC.y));
    float flyPh = sv == 0 ? sp : clamp(GC.w / 0.33, 0.0, 1.0);
    float doorE = max(sv == 1 ? se : 0.0, cA * (C.x * 0.5 + C.y * 1.3));
    // detalle: una puerta golpea (un golpe de luz por la rendija)
    if (dv == 3) doorE = max(doorE, D.x * smoothstep(0.25, 0.30, D.y) * (1.0 - smoothstep(0.30, 0.55, D.y)) * 1.2);
    // B: en parejas, bailando; C: corren hacia la camara de a uno
    float waltz = cB * smoothstep(0.0, 0.25, C.w) * (1.0 - smoothstep(0.80, 0.84, C.w));
    float vanish = cB * smoothstep(0.83, 0.85, C.w) * (1.0 - smoothstep(0.93, 0.99, C.w));
    // la puerta del climax: en la pared izquierda, a media profundidad
    vec3 doorP = vec3(-WC + 0.25, -0.30, 1.85);
    float gather = smoothstep(0.0, 0.33, cph) * (1.0 - smoothstep(0.66, 0.72, cph));
    float spin = 1.0 - smoothstep(0.30, 0.62, cph);

    vec4 sf = hwSurf(p);
    vec3 X = vec3(sf.xy, sf.z);
    float sid = sf.w;
    // relieve horneado (fase 25): normal en el mundo del pasillo
    vec3 nW = normalize(plate3(rUV(p)).rgb * 2.0 - 1.0);
    // normal de la superficie lisa: el relieve solo suma o resta luz
    // alrededor de la de siempre (la vela, rasante sobre su pared, no se apaga)
    vec3 nB = sid < 0.5 ? vec3(0.0, 1.0, 0.0) : (sid < 1.5 ? vec3(0.0, -1.0, 0.0) : (sid < 2.5 ? vec3(-sign(X.x), 0.0, 0.0) : vec3(0.0, 0.0, -1.0)));

    // --- fantasmas: posicion en el mundo (se calculan una vez) ---
    // cantidad continua: el fantasma nuevo aparece de a poco
    float n = min(3.0 + uD1 * 4.0 + uDensity + hkActVal(5.0) * 2.0, 7.0);
    vec4 G[14];
    for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float h1 = hash21(vec2(fi, 1.3)), h2 = hash21(vec2(fi, 7.7));
        float z = 1.05 + mod(h1 * 2.6 + fi * 0.37 - t * (0.03 + 0.03 * h2) * (h2 > 0.5 ? 1.0 : -1.0), 2.6);
        float x = (fract(fi * 0.381 + h2 * 0.3) - 0.5) * 2.1 + 0.20 * sin(t * (0.2 + h1 * 0.2) + fi);
        float y = -0.35 + 0.25 * h1 + 0.06 * sin(t * (0.7 + h1 * 0.5) + fi * 2.3);
        float on = revealAt(n, fi);
        if (i == 0) {     // el que pasa volando cerca de la camara
            float fp = flyPh;
            z = mix(z, mix(3.5, 0.55, fp), flyBy);
            x = mix(x, mix(-0.4, 0.5, fp), flyBy);
            on = max(on, flyBy);
        }
        if (i == 1 && sv == 5) {   // suceso: atraviesa la pared
            float sd = ss > 0.5 ? 1.0 : -1.0;
            x = mix(x, sd * mix(WC + 0.40, -0.35, smoothstep(0.05, 0.85, sp)), se);
            z = mix(z, 1.65, se);
            y = mix(y, -0.22, se);
            on = max(on, se);
        }
        if (waltz > 0.0) {
            float pr = floor(fi * 0.5);
            vec3 ctr = vec3(mod(pr, 2.0) > 0.5 ? 0.62 : -0.62, -0.25, 1.30 + pr * 0.60);
            float ang = uRTime * 1.7 + mod(fi, 2.0) * PI + pr;
            vec3 dance = ctr + vec3(cos(ang) * 0.36, 0.05 * sin(ang * 2.0) + 0.03 * bass, sin(ang) * 0.24);
            vec3 cur = mix(vec3(x, y, z), dance, waltz);
            x = cur.x; y = cur.y; z = cur.z;
            on = max(on, waltz) * (1.0 - vanish);
        }
        if (cC > 0.0) {
            float lc = (C.w - 0.12 - fi * 0.075) / 0.20;
            if (lc > 0.0 && lc < 1.0) {
                z = mix(4.2, 0.22, lc * lc);
                x = (hash21(vec2(fi, 9.0)) - 0.5) * 0.5 * (1.0 - lc);
                y = -0.25 + 0.08 * sin(lc * 12.0 + fi);
                on = 1.0;
            } else {
                on *= smoothstep(0.88, 0.98, C.w) * step(1.0, lc) + (lc <= 0.0 ? 1.0 : 0.0);
            }
        }
        // climax: espiral frente a la puerta, entran y vuelven de a uno
        if (cph > 0.0) {
            float ang = fi * 0.9 + uRTime * (2.2 + fi * 0.15);
            float rad = 0.12 + 0.75 * spin;
            vec3 orbit = doorP + vec3(cos(ang) * rad * 0.55, sin(ang) * rad * 0.35 + 0.15, sin(ang) * rad * 0.6);
            vec3 cur = mix(vec3(x, y, z), orbit, gather);
            x = cur.x; y = cur.y; z = cur.z;
            float into = smoothstep(0.52 + fi * 0.018, 0.62 + fi * 0.018, cph);
            float back = smoothstep(0.73 + hash21(vec2(fi, 31.0)) * 0.20, 0.77 + hash21(vec2(fi, 31.0)) * 0.20, cph);
            on *= 1.0 - into * (1.0 - back);
        }
        G[i] = vec4(x, y, z, on);
    }
    // fantasmas del piano (voces 0..5 -> G[7..12])
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.25, 1.6);
        float age = keyAge(k), rel = keyRelAge(k);
        float side = keyPos(k) < 0.5 ? 1.0 : -1.0;
        float x = hkKeyX(k) * 0.55 + side * min(age, 4.0) * 0.12 * (1.0 - keyHeld(k) * 0.7);
        float y = -0.25 + 0.25 * fract(keyPos(k) * 5.3) + 0.05 * sin(uKclock * 1.4 + float(k));
        // apretada se acerca despacio; al soltarla se va al fondo
        float z = max(2.2 - min(age, 3.0) * 0.30 * keyHeld(k), 0.9) + rel * 2.5;
        G[7 + k] = vec4(x, y, z, e * (0.6 + keyVel(k) * 0.6));
    }
    // suceso: la dama de blanco cruza al fondo
    G[13] = vec4(mix(-1.1, 1.1, ss > 0.5 ? sp : 1.0 - sp), -0.12, 2.9, sv == 4 ? se : 0.0);
    // luz de los fantasmas sobre las superficies
    float gl = 0.0;
    for (int i = 0; i < 14; i++) {
        vec3 dv = X - G[i].xyz;
        gl += G[i].w / (1.0 + dot(dv, dv) * 5.0);
    }
    gl *= (0.8 + uD4 * 0.6 + bass * 0.5);

    // --- pasillo ---
    vec2 pu = rUV(p);
    vec4 cor = plate0(pu);
    vec4 mk = plate1(pu);
    vec3 alb = plateCol(cor.rgb);
    // velas de los apliques (los agudos las hacen titilar)
    vec3 sconce[4];
    sconce[0] = vec3(-WC, 0.20, 1.00); sconce[1] = vec3(-WC, 0.20, 2.25);
    sconce[2] = vec3(WC, 0.20, 1.65); sconce[3] = vec3(WC, 0.20, 2.90);
    float sl = 0.0;
    vec3 flameAdd = vec3(0.0);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float fl = 0.75 + 0.15 * sin(t * (8.0 + fi * 2.0) + fi) + (0.10 + high * 0.5) * (noise21(vec2(uRTime * (6.0 + high * 14.0), fi)) - 0.5) * 2.0;
        fl *= 1.0 - EST.y * 0.55;                                       // velas bajas
        if (sv == 3) fl *= 1.0 - se * smoothstep(0.10 + fi * 0.10, 0.14 + fi * 0.10, sp) * (1.0 - smoothstep(0.66 + fi * 0.05, 0.70 + fi * 0.05, sp));
        if (dv == 1 && i == int(D.w * 3.99)) fl *= 1.0 - D.x * 0.7 * noise21(vec2(uRTime * 5.0, fi));
        fl *= 1.0 + waltz * 0.5;
        fl *= 1.0 - vanish * 0.9;
        fl *= 1.0 - cC * 0.55 * smoothstep(0.10, 0.25, C.w) * (1.0 - smoothstep(0.75, 0.9, C.w));   // el viento las acuesta
        vec3 dv = X - sconce[i];
        sl += fl / (1.0 + dot(dv, dv) * 2.2) * clamp(1.0 + 2.6 * (dot(nW, -normalize(dv)) - dot(nB, -normalize(dv))), 0.25, 2.2);
        // llama en pantalla
        vec2 sp = VP + sconce[i].xy / sconce[i].z + vec2(0.0, 0.035 / sconce[i].z);
        vec2 dq = (p - sp) * sconce[i].z;
        float core = exp(-dot(dq * vec2(55.0, 26.0), dq * vec2(55.0, 26.0)));
        flameAdd += vec3(1.0, 0.65, 0.25) * (core * 1.6 + exp(-dot(dq, dq) * 160.0) * 0.10) * fl;
    }
    // luz de luna en la alfombra cerca del ventanal
    float moonPatch = sid < 0.5 ? exp(-pow(X.x / 0.55, 2.0)) * smoothstep(2.6, 4.2, X.z) : 0.0;
    vec3 lit = vec3(0.07, 0.075, 0.10) + vec3(1.0, 0.62, 0.30) * sl * 1.3 + gc * gl * 0.7 + moonC * moonPatch * (0.6 + EST.y * 0.9);
    vec3 col = alb * lit;
    // ojos de los retratos (bajo) y rendija de las puertas (evento)
    float portrait = (0.3 + bass * 1.8 + hit * 0.5 + (sv == 2 ? se * 4.0 * (0.8 + 0.2 * sin(uRTime * 3.0)) : 0.0))
                   * (1.0 - (dv == 0 ? D.x * step(0.40, D.y) * (1.0 - step(0.58, D.y)) : 0.0));
    col += vec3(1.0, 0.10, 0.05) * mk.r * portrait;
    col += vec3(1.0, 0.75, 0.40) * mk.g * doorE * 1.5;
    col += vec3(1.0, 0.70, 0.35) * doorE * 0.12 * exp(-pow((X.z - 1.85) * 3.0, 2.0)) * step(sid, 0.5) * smoothstep(0.0, -1.0, X.x);
    col += flameAdd;
    // cielo en el ventanal
    if (cor.a < 1.0) {
        vec2 b = (p - VP) * ZB;
        vec3 sky = mix(vec3(0.06, 0.08, 0.18), vec3(0.02, 0.025, 0.07), smoothstep(-0.4, 0.6, b.y));
        vec2 mq = b - vec2(0.18, 0.30);
        sky += vec3(0.95) * (1.0 - smoothstep(0.08, 0.09, length(mq))) + moonC * exp(-length(mq) * 6.0) * 0.4;
        float cl = plate2Wrap(vec2(b.x * 0.4 + t * 0.01, b.y * 0.6)).r;
        sky = mix(sky, vec3(0.03, 0.035, 0.07), smoothstep(0.58, 0.78, cl) * 0.8);
        col = mix(sky, col, cor.a);
    }
    // rayos de luna desde el ventanal y polvo
    vec2 wsrc = VP + vec2(0.0, 0.12) / ZB;
    float rays = hkRays(p, wsrc, t, 22.0) * smoothstep(0.02, 0.15, length(p - wsrc)) * smoothstep(0.1, -0.5, p.y - wsrc.y) * 0.5;
    float dust = hkParticles(p * 1.5, t * 0.2, 0.06 + high * 0.12, vec2(0.1, -0.2), 0.02) * rays;
    rays *= 1.0 + EST.y * 0.6;
    col += moonC * rays * 0.20 + vec3(0.9, 0.95, 1.0) * dust * (0.6 + high) * (1.0 + (dv == 2 ? D.x * 3.0 : 0.0));
    // niebla del pasillo (mas lejos, mas espesa)
    float fz = plate2Wrap(vec2(X.x * 0.12 + t * 0.004, X.z * 0.10 - t * 0.003)).g;
    float fogA = (1.0 - exp(-X.z * (0.08 + uD6 * 0.18 + EST.z * 0.16))) * (0.6 + 0.5 * fz);
    col = mix(col, vec3(0.05, 0.06, 0.09) + gc * gl * 0.08, clamp(fogA, 0.0, 0.85));

    // la puerta del climax estalla de luz cuando entran
    col += vec3(1.0, 0.85, 0.6) * cA * C.y * smoothstep(0.50, 0.62, cph) * 0.35 * exp(-length((p - (VP + doorP.xy / doorP.z)) * vec2(2.5, 1.2)) * 2.0);

    // --- fantasmas en pantalla (translucidos: el orden casi no se nota) ---
    for (int i = 0; i < 14; i++) {
        vec4 g = G[i];
        if (g.w <= 0.005) continue;
        float fi = float(i);
        float h1 = hash21(vec2(fi, 1.3)), h2 = hash21(vec2(fi, 7.7));
        float peek = hit * step(0.45, fract(h1 * 7.0 + h2 * 3.0));
        float rush = hit * loco * step(0.5, fract(h2 * 5.0 + floor(uRTime * 2.0) * 0.37));
        float zz = g.z / (1.0 + rush * 1.5);
        vec2 c = VP + g.xy / zz;
        float s = (0.95 / zz) * (1.0 + peek * 0.12);
        vec2 q = (p - c) / s;
        if (i == 13) q.y = q.y / 1.5 + 0.12;           // la dama: alta y con vestido largo
        if (dot(q, q) > 1.6) continue;
        q.x += 0.06 * sin(q.y * 3.0 + t * 1.3 + fi);
        float wave = 0.4 + uD3 * 1.2 + mid * 1.5;
        float d = hwGhost(q, t, wave, fi * 3.7);
        // cola que se deshace en jirones
        float wisp = plate2Wrap(vec2(q.x * 0.3 + fi * 0.2, q.y * 0.25 - t * 0.03)).a;
        float tail = smoothstep(-0.50, -0.12, q.y + (wisp - 0.5) * 0.5);
        float body = (1.0 - smoothstep(-0.02, 0.02, d)) * tail;
        // el que atraviesa la pared: lo que esta adentro de la pared no se ve
        if (i == 1 && sv == 5) body *= mix(1.0, smoothstep(WC + 0.02, WC - 0.10, abs(g.x + q.x * 0.95)), se);
        // pliegues verticales de la sabana
        float folds = 0.65 + 0.35 * sin(q.x * 11.0 + sin(q.y * 4.0 + fi) * 1.5 + wisp * 2.0);
        float fres = smoothstep(-0.12, 0.0, d);                 // borde mas brillante
        float density = (0.18 + 0.35 * smoothstep(-0.6, 0.3, q.y)) * (1.0 - uD2 * 0.6) * (0.85 + bass * 0.3);
        float lum = (0.55 + uD4 * 0.6 + peek * 0.8) * (1.0 / (0.6 + zz * 0.3)) * exp(-zz * 0.06 * (1.0 + uD6));
        vec3 gcol = gc * lum * (0.45 + 0.4 * folds + 0.6 * fres);
        if (i == 13) gcol = vec3(1.0, 0.97, 0.92) * lum * 2.2 * (0.55 + 0.3 * folds + 0.5 * fres);   // la dama, blanca
        col = mix(col, col * 0.55 + gcol, body * density * min(g.w, 1.0));
        // ojos y boca huecos
        vec2 ep = vec2(abs(q.x) - 0.11, q.y - 0.22);
        float eyes = 1.0 - smoothstep(0.045, 0.06, length(ep / vec2(0.8, 1.3)));
        float mouth = 1.0 - smoothstep(0.05, 0.065, length((q - vec2(0.0, 0.04)) / vec2(0.7 + rush * 0.4, 1.0 + peek * 0.8 + rush * 2.5)));
        col = mix(col, col * 0.12, max(eyes, mouth) * body * 0.9 * min(g.w, 1.0));
        // halo frio alrededor
        col += gc * exp(-max(d, 0.0) * 9.0) * 0.12 * lum * (1.0 - body) * min(g.w, 1.0);
    }

    // detalle: un fantasmita espia desde la puerta de la izquierda
    if (dv == 4) {
        float pk = D.x * smoothstep(0.1, 0.35, D.y) * (1.0 - smoothstep(0.65, 0.9, D.y));
        vec2 q = (p - vec2(-0.93 + pk * 0.10, 0.02)) / 0.20;
        float d = hwGhost(q, t, 0.6, 9.0);
        float body = (1.0 - smoothstep(-0.03, 0.03, d)) * step(-0.955, p.x) * smoothstep(-0.5, -0.1, q.y);
        col = mix(col, col * 0.5 + gc * 0.45, body * 0.7 * pk);
        vec2 ep = vec2(abs(q.x) - 0.11, q.y - 0.22);
        col = mix(col, col * 0.15, (1.0 - smoothstep(0.045, 0.06, length(ep / vec2(0.8, 1.3)))) * body * pk);
    }
    // C: el ultimo te atraviesa: el cuadro se llena de sabana un momento
    col = mix(col, gc * 0.30 + col * 0.4, cC * smoothstep(0.60, 0.68, C.w) * (1.0 - smoothstep(0.70, 0.80, C.w)) * 0.7);

    col = audioLift(col, high * 0.08);
    return vec4(hkFinish(col, uv, vec3(0.3, 0.6, 0.8)), 1.0);
}
