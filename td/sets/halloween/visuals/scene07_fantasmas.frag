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
// HISTORIA: cada acto cambia cuantos hay; cada ~59 s uno pasa volando
// muy cerca de la camara; cada ~71 s se entreabre una puerta con luz.
// CLIMAX (~83 s, 18 s, en tres tiempos): la puerta se entreabre y los
//   fantasmas se juntan girando en espiral frente a ella; el remolino se
//   cierra y entran todos por la puerta, que estalla de luz; despues la
//   puerta se apaga y vuelven de a uno. Cada ~4.5 min, ademas, uno pasa
//   volando junto a la camara (gran climax).
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
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.008);
    vec3 cold = vec3(0.80, 0.90, 1.0);
    vec3 spectral = hsv2rgb(vec3(fract(0.36 + hue), 0.60, 1.0));
    vec3 gc = mix(cold, spectral, uD5);
    vec3 moonC = vec3(0.50, 0.60, 0.95);

    vec4 GC = hkGrandClimax(4.0);
    vec4 C = hkClimaxOr(GC, hkClimax(4.0, 83.0, 18.0));
    float cph = C.w;
    float flyBy = max(hkEvent(3.0, 59.0, 6.0), GC.x * (1.0 - GC.y));
    float doorE = max(hkEvent(6.0, 71.0, 8.0), C.x * 0.5 + C.y * 1.3);
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
    vec4 G[13];
    for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float h1 = hash21(vec2(fi, 1.3)), h2 = hash21(vec2(fi, 7.7));
        float z = 1.05 + mod(h1 * 2.6 + fi * 0.37 - t * (0.03 + 0.03 * h2) * (h2 > 0.5 ? 1.0 : -1.0), 2.6);
        float x = (fract(fi * 0.381 + h2 * 0.3) - 0.5) * 2.1 + 0.20 * sin(t * (0.2 + h1 * 0.2) + fi);
        float y = -0.35 + 0.25 * h1 + 0.06 * sin(t * (0.7 + h1 * 0.5) + fi * 2.3);
        if (i == 0) {     // el que pasa volando cerca de la camara
            float fp = hkEventPhase(3.0, 59.0, 6.0);
            z = mix(z, mix(3.5, 0.55, fp), flyBy);
            x = mix(x, mix(-0.4, 0.5, fp), flyBy);
        }
        float on = revealAt(n, fi);
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
    // luz de los fantasmas sobre las superficies
    float gl = 0.0;
    for (int i = 0; i < 13; i++) {
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
    vec3 lit = vec3(0.07, 0.075, 0.10) + vec3(1.0, 0.62, 0.30) * sl * 1.3 + gc * gl * 0.7 + moonC * moonPatch * 0.6;
    vec3 col = alb * lit;
    // ojos de los retratos (bajo) y rendija de las puertas (evento)
    col += vec3(1.0, 0.10, 0.05) * mk.r * (0.3 + bass * 1.8 + hit * 0.5);
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
    col += moonC * rays * 0.20 + vec3(0.9, 0.95, 1.0) * dust * (0.6 + high);
    // niebla del pasillo (mas lejos, mas espesa)
    float fz = plate2Wrap(vec2(X.x * 0.12 + t * 0.004, X.z * 0.10 - t * 0.003)).g;
    float fogA = (1.0 - exp(-X.z * (0.08 + uD6 * 0.18))) * (0.6 + 0.5 * fz);
    col = mix(col, vec3(0.05, 0.06, 0.09) + gc * gl * 0.08, clamp(fogA, 0.0, 0.85));

    // la puerta del climax estalla de luz cuando entran
    col += vec3(1.0, 0.85, 0.6) * C.y * smoothstep(0.50, 0.62, cph) * 0.35 * exp(-length((p - (VP + doorP.xy / doorP.z)) * vec2(2.5, 1.2)) * 2.0);

    // --- fantasmas en pantalla (translucidos: el orden casi no se nota) ---
    for (int i = 0; i < 13; i++) {
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
        if (dot(q, q) > 1.6) continue;
        q.x += 0.06 * sin(q.y * 3.0 + t * 1.3 + fi);
        float wave = 0.4 + uD3 * 1.2 + mid * 1.5;
        float d = hwGhost(q, t, wave, fi * 3.7);
        // cola que se deshace en jirones
        float wisp = plate2Wrap(vec2(q.x * 0.3 + fi * 0.2, q.y * 0.25 - t * 0.03)).a;
        float tail = smoothstep(-0.50, -0.12, q.y + (wisp - 0.5) * 0.5);
        float body = (1.0 - smoothstep(-0.02, 0.02, d)) * tail;
        // pliegues verticales de la sabana
        float folds = 0.65 + 0.35 * sin(q.x * 11.0 + sin(q.y * 4.0 + fi) * 1.5 + wisp * 2.0);
        float fres = smoothstep(-0.12, 0.0, d);                 // borde mas brillante
        float density = (0.18 + 0.35 * smoothstep(-0.6, 0.3, q.y)) * (1.0 - uD2 * 0.6) * (0.85 + bass * 0.3);
        float lum = (0.55 + uD4 * 0.6 + peek * 0.8) * (1.0 / (0.6 + zz * 0.3)) * exp(-zz * 0.06 * (1.0 + uD6));
        vec3 gcol = gc * lum * (0.45 + 0.4 * folds + 0.6 * fres);
        col = mix(col, col * 0.55 + gcol, body * density * min(g.w, 1.0));
        // ojos y boca huecos
        vec2 ep = vec2(abs(q.x) - 0.11, q.y - 0.22);
        float eyes = 1.0 - smoothstep(0.045, 0.06, length(ep / vec2(0.8, 1.3)));
        float mouth = 1.0 - smoothstep(0.05, 0.065, length((q - vec2(0.0, 0.04)) / vec2(0.7 + rush * 0.4, 1.0 + peek * 0.8 + rush * 2.5)));
        col = mix(col, col * 0.12, max(eyes, mouth) * body * 0.9 * min(g.w, 1.0));
        // halo frio alrededor
        col += gc * exp(-max(d, 0.0) * 9.0) * 0.12 * lum * (1.0 - body) * min(g.w, 1.0);
    }

    col = audioLift(col, high * 0.08);
    return vec4(hkFinish(col, uv, vec3(0.3, 0.6, 0.8)), 1.0);
}
