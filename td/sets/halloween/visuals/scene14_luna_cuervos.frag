// ===============================================================
// HALLOWEEN 14 - LUNA DE SANGRE Y CUERVOS
// Matte painting con LAMINAS horneadas (plates/scene14, ver
// td/tools/bake_plates_cuervos.py): colinas con una capilla en ruinas,
// cruces y arboles pelados; un arbol muerto enorme con corteza en
// relieve y una rama larga que cruza la luna; cuervos posados de perfil
// con plumas tornasoladas, repetidos a lo largo de la rama. En vivo: la
// luna roja con crateres, nubes que la cruzan, la rama que se mece y los
// cuervos (posados y volando).
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la luna late y su halo crece
//   medios -> el viento mece la rama (y los cuervos con ella)
//   agudos -> brillo en las plumas y en el borde de las nubes
//   golpe  -> los cuervos posados se asustan y saltan, cada uno a su
//             tiempo; con Chaos levantan vuelo
// PIANO: cada tecla hace levantar vuelo a un cuervo desde la rama en esa
//   posicion (la fuerza: mas grande, mas cerca de la camara); apretada, da
//   vueltas sobre la rama; al soltarla se va volando lejos.
// Speed mueve las nubes, el vuelo y el viento aun en silencio.
// REPERTORIO (fase 33, motor hkSuceso del kit):
//   ESTADOS (~5 min): luna llena, nubes (el cielo se tapa) y luna de
//     sangre (mas roja, con bruma en el valle).
//   SUCESOS (~55 s, 7): una bandada grande cruza la luna; todos giran la
//     cabeza; una lechuza pasa lenta frente a la luna; dos cuervos pelean
//     en el aire; se enciende una luz en la capilla; un caminante con
//     baston cruza la colina; un cuervo viene volando hacia la camara.
//   DETALLES (~30 s, 5): estrella fugaz, un cuervo sacude las alas, un
//     murcielago lejano, una luz en la colina, caen hojas de la rama.
//   CLIMAX (~4 min, 24 s, rotan 3 guiones en tres tiempos):
//     A el eclipse: giran la cabeza, la luna se tapa, levantan vuelo y la
//       bandada cruza la luna; vuelve la luz y regresan de a uno.
//     B el remolino: una nube de cuervos gira en espiral alrededor de la
//       luna, se cierra y se dispersa.
//     C la luna sangra: la luna se pone roja, chorrea sangre por el borde
//       de abajo y la bruma del valle sube roja.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con la bandada
//     grande.
// @EST: luna llena | nubes | luna de sangre
// @SUC: bandada | giran la cabeza | la lechuza | pelea en el aire | luz en la capilla | el caminante | hacia la camara
// @DET: estrella fugaz | sacude las alas | murcielago lejano | luz en la colina | caen hojas
// @CLX: A el eclipse | B el remolino | C la luna sangra
//
// @D1: cantidad de cuervos volando (aparecen de a uno)
// @D2: tamano de la luna
// @D3: cuanto se mueven las ramas
// @D4: cuervos posados (el nuevo llega volando y se posa)
// @D5: rojo de la luna (cobre <-> sangre)
// @D6: nubes
// ===============================================================

const vec4 FAR_R = vec4(-3.1, -1.0, 6.2, 1.05);
const vec4 TREE_R = vec4(-3.1, -1.2, 6.2, 2.4);
const vec4 CROW_R = vec4(-0.5, -0.55, 1.0, 1.1);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// rama de los cuervos: la misma poligonal que el horneado
const vec2 PERCH[7] = vec2[7](vec2(-1.85, 0.22), vec2(-1.0, 0.30), vec2(-0.2, 0.34), vec2(0.6, 0.40),
                              vec2(1.4, 0.43), vec2(2.1, 0.50), vec2(2.75, 0.58));
// borde de arriba de la rama en x (donde se apoyan las patas)
float c14PerchTop(float x) {
    for (int i = 0; i < 6; i++) {
        if (x <= PERCH[i + 1].x || i == 5) {
            float k = clamp((x - PERCH[i].x) / (PERCH[i + 1].x - PERCH[i].x), 0.0, 1.0);
            float y = mix(PERCH[i].y, PERCH[i + 1].y, k);
            float r = mix(0.075, 0.016, (float(i) + k) / 6.0);
            return y + r - 0.012 * sin(x * 7.0 + float(i)) - 0.004;
        }
    }
    return 0.0;
}

// cuervo volando: alas en V que aletean
float c14Flyer(vec2 p, float flap) {
    float ax = abs(p.x);
    float y = p.y - flap * 0.5 * ax + 0.25 * ax * ax;
    float wing = max(abs(y) - 0.07 * (1.0 - ax * 1.2), ax - 0.55);
    float body = length(p / vec2(0.20, 0.07)) - 1.0;
    return min(wing, body * 0.07);
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    // --- calendario (fase 33) ---
    hkSetClimax(15.0, 24.0, 28.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(15.0, 7, 12.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(15.0, 5, 3.5);
    int dv = int(D.z);
    vec4 EST = hkEstado(15.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(15.0, 3));
    float cph = cA * C.w;
    float inC = step(0.0001, cph);
    float flockE = max(sv == 0 ? se : 0.0, cA * C.y);
    float flockPh = inC > 0.5 ? clamp((cph - 0.33) / 0.40, 0.0, 1.0) : sp;
    float eclE = smoothstep(0.08, 0.25, cph) * (1.0 - smoothstep(0.72, 0.84, cph));
    float eclPh = clamp((cph - 0.08) / 0.76, 0.0, 1.0);
    float turnE = max(sv == 1 ? se : 0.0, inC * step(0.04, cph) * (1.0 - step(0.30, cph)));
    // B: remolino de cuervos; C: la luna sangra
    float swirl = cB * smoothstep(0.05, 0.30, C.w) * (1.0 - smoothstep(0.75, 0.95, C.w));
    float bleed = cC * smoothstep(0.08, 0.45, C.w) * (1.0 - smoothstep(0.78, 0.97, C.w));
    // los posados levantan vuelo con la luna tapada y vuelven al final
    float perchGone = smoothstep(0.38, 0.48, cph) * (1.0 - smoothstep(0.93, 1.0, cph));

    // --- cielo ---
    vec3 moonC = mix(vec3(1.0, 0.48, 0.22), vec3(1.0, 0.12, 0.06), clamp(uD5 + cA * C.y * 0.5 + EST.z * 0.5 + bleed, 0.0, 1.0));
    vec3 col = mix(moonC * 0.07, vec3(0.010, 0.002, 0.004), smoothstep(-0.6, 1.0, p.y));
    float sh = hash21(floor(p * 120.0));
    col += vec3(0.8, 0.7, 0.7) * step(0.996, sh) * (0.4 + 0.6 * sin(t * 2.0 + sh * 50.0) * (0.5 + high)) * smoothstep(0.2, 0.9, p.y);

    // --- luna ---
    vec2 mc = vec2(0.55, 0.14);
    float R = hkDR(0.30, 0.64, 0.95, uD2);
    vec2 mp = p - mc;
    float mr = length(mp);
    float pulse = 1.0 + bass * 0.30;
    col += moonC * exp(-max(mr - R, 0.0) * 3.2) * 0.45 * pulse;
    col += moonC * exp(-max(mr - R, 0.0) * 0.9) * 0.10 * pulse;
    if (mr < R * 1.02) {
        vec4 mt = plate5(mp / (R * 2.0) + 0.5);
        vec3 face = moonC * (0.55 + 0.75 * mt.r) * (1.0 + bass * 0.15);
        face *= 1.0 - 0.35 * smoothstep(0.6, 1.0, mr / R);          // limbo oscuro
        // eclipse: un disco oscuro cruza la luna
        if (eclE > 0.01) {
            vec2 ec = mc + vec2(mix(-1.4, 1.4, eclPh) * R, 0.08 * R);
            float ed = length(p - ec) - R * 0.96;
            face = mix(face, moonC * 0.06, (1.0 - smoothstep(-0.02, 0.03, ed)) * eclE);
            face += moonC * exp(-abs(ed) * 40.0) * 0.4 * eclE;      // anillo de fuego
        }
        col = mix(col, face, mt.a);
    }

    col = hkStyleMoon(col, p, mc, R);
    // C: la sangre chorrea por el borde de abajo de la luna
    if (bleed > 0.0) {
        float cx = floor((p.x - mc.x) / 0.05);
        float h = hash21(vec2(cx, 4.0));
        float x0 = (cx + 0.5) * 0.05 + mc.x + (h - 0.5) * 0.02;
        float h2 = hash21(vec2(cx, 9.0));
        float edge = mc.y + sqrt(max(R * R - (x0 - mc.x) * (x0 - mc.x), 0.0)) * (0.35 + 0.4 * h2);
        float len = smoothstep(h2 * 0.4, h2 * 0.4 + 0.6, bleed) * (0.1 + 1.0 * h * h) * step(0.3, h) * step(abs(x0 - mc.x), R * 0.9);
        float w = 0.004 + 0.010 * h * h2;
        float yy = clamp((edge - p.y) / max(len, 1e-3), 0.0, 1.0);
        float wob = (noise21(vec2(p.y * 5.0, cx)) - 0.5) * 0.02;
        float dd = max(abs(p.x - x0 - wob) - w * mix(1.6, 0.5, yy), max(p.y - edge, edge - len - p.y));
        dd = min(dd, length((p - vec2(x0, edge - len)) / vec2(1.0, 1.3)) - w * 1.5);
        col = mix(col, vec3(0.45, 0.02, 0.01) * (0.8 + bass * 0.4), (1.0 - smoothstep(-0.002, 0.002, dd)) * step(0.01, len));
    }
    // detalle: estrella fugaz
    if (dv == 0) {
        vec2 s0 = vec2((D.w - 0.7) * 3.0, 0.95);
        vec2 sd = normalize(vec2(-0.8, -0.3));
        vec2 rel = p - (s0 + sd * D.y * 1.2);
        float along = dot(rel, sd), perp = abs(rel.x * sd.y - rel.y * sd.x);
        col += vec3(0.9, 0.85, 0.8) * exp(-perp * 500.0) * smoothstep(-0.3, 0.0, along) * step(along, 0.0) * (1.0 + along * 3.0) * D.x * 1.4;
    }
    // --- nubes que cruzan ---
    float cl = plate6Wrap(vec2(p.x * 0.12 - t * 0.008, p.y * 0.5 + 0.2)).r;
    float cl2 = plate6Wrap(vec2(p.x * 0.20 - t * 0.013 + 0.3, p.y * 0.8)).g;
    float d6 = clamp(uD6 + EST.y * 0.6, 0.0, 1.0);
    float clouds = smoothstep(0.55 - d6 * 0.2, 0.78 - d6 * 0.15, cl * 0.65 + cl2 * 0.35) * smoothstep(-0.3, 0.3, p.y) * (0.3 + d6 * 0.7);
    float rim = (smoothstep(0.50, 0.58, cl) - smoothstep(0.58, 0.72, cl)) * exp(-mr * 1.6);
    col = mix(col, vec3(0.03, 0.008, 0.012) + moonC * 0.05 * exp(-mr * 1.2), clouds * 0.85);
    col += moonC * rim * (0.3 + high * 0.4) * d6;

    // --- cuervos volando (dos capas; la bandada grande cruza la luna) ---
    // 0..7: los que vuelan siempre (D1, de a uno); 8..21: la bandada
    float nAmb = hkDR(0.0, 5.0, 8.0, uD1);
    float nFlock = flockE * 14.0;
    for (int i = 0; i < 22; i++) {
        float fi = float(i);
        float big = step(8.0, fi);
        float on = big > 0.5 ? revealAt(nFlock, fi - 8.0) : revealAt(nAmb, fi);
        if (on < 0.01) continue;
        float h1 = hash21(vec2(fi, 3.0)), h2 = hash21(vec2(fi, 7.0));
        float spd = 0.05 + h1 * 0.05;
        float x = big > 0.5 ? mix(-uAspect - 0.6, uAspect + 0.6, flockPh + h1 * 0.15)
                            : mix(-uAspect - 0.6, uAspect + 0.6, fract(h2 + t * spd));
        float y = big > 0.5 ? mc.y + (h2 - 0.5) * 0.9 + sin(flockPh * 6.0 + fi) * 0.05
                            : 0.0 + h2 * 0.6 + 0.06 * sin(t * (0.5 + h1) + fi);     // bajo las nubes, cruzando la luna
        float s = big > 0.5 ? 0.06 + h1 * 0.05 : 0.10 + h1 * 0.07;
        vec2 q = (p - vec2(x, y)) / s;
        if (dot(q, q) > 2.0) continue;
        float flap = sin(t * (7.0 + h1 * 5.0) + fi * 2.0);
        float d = c14Flyer(q, flap) * s;
        col = mix(col, vec3(0.006, 0.003, 0.004), (1.0 - smoothstep(0.0, 0.003, d)) * on);
    }
    // --- B: remolino de cuervos alrededor de la luna ---
    if (swirl > 0.0) {
        float close = smoothstep(0.30, 0.60, C.w), out_ = smoothstep(0.72, 0.95, C.w);
        for (int i = 0; i < 40; i++) {
            float fi = float(i);
            float h1 = hash21(vec2(fi, 31.0)), h2 = hash21(vec2(fi, 37.0));
            float ang = fi * 2.39996 + uRTime * (0.9 + h1 * 0.6);
            float rad = R * mix(1.9 + h2 * 0.8, 1.05 + h2 * 0.25, close) + out_ * (2.0 + h1 * 2.0);
            vec2 c = mc + vec2(cos(ang), sin(ang) * 0.62) * rad;
            float sc = 0.08 + 0.05 * h2;
            vec2 q = (p - c) / sc;
            if (dot(q, q) > 2.0) continue;
            q = rot2(-ang - 1.57) * q;
            col = mix(col, vec3(0.006, 0.003, 0.004), (1.0 - smoothstep(0.0, 0.003, c14Flyer(q, sin(uRTime * 9.0 + fi)) * sc)) * swirl);
        }
    }
    // --- suceso: la lechuza pasa lenta frente a la luna ---
    if (sv == 2 && se > 0.0) {
        vec2 c = mc + vec2(mix(-1.6, 1.6, ss > 0.5 ? sp : 1.0 - sp), 0.15 + 0.05 * sin(sp * 8.0));
        vec2 q = (p - c) / 0.26;
        if (dot(q, q) < 2.0) col = mix(col, vec3(0.008, 0.004, 0.004), (1.0 - smoothstep(0.0, 0.003, c14Flyer(q, sin(uRTime * 3.5)) * 0.26)) * se);
    }
    // --- suceso: dos cuervos pelean en el aire ---
    if (sv == 3 && se > 0.0) {
        vec2 c0 = vec2((ss - 0.5) * 2.5, 0.75 + 0.1 * sin(sp * 5.0));
        for (int i = 0; i < 2; i++) {
            float a = uRTime * 3.0 + float(i) * PI;
            vec2 c = c0 + vec2(cos(a), sin(a) * 0.6) * 0.14;
            vec2 q = (p - c) / 0.09;
            if (dot(q, q) > 2.0) continue;
            if (i == 1) q.x = -q.x;
            col = mix(col, vec3(0.006, 0.003, 0.004), (1.0 - smoothstep(0.0, 0.003, c14Flyer(rot2(sin(a) * 0.6) * q, sin(uRTime * 14.0 + float(i))) * 0.09)) * se);
        }
    }
    // --- suceso: un cuervo viene hacia la camara ---
    if (sv == 6 && se > 0.0) {
        float k = smoothstep(0.1, 0.95, sp);
        vec2 c = mix(vec2((ss - 0.5) * 3.0, 0.6), vec2(0.2, 0.1), k);
        float sc = mix(0.04, 1.6, k * k * k);
        vec2 q = (p - c) / sc;
        if (dot(q, q) < 2.0) col = mix(col, vec3(0.006, 0.003, 0.004), (1.0 - smoothstep(0.0, 0.003, c14Flyer(q, sin(uRTime * 8.0)) * sc)) * se * (1.0 - smoothstep(0.92, 1.0, sp)));
    }
    if (dv == 2) {
        vec2 q = (p - vec2(mix(-2.5, 2.5, D.y), 0.8 + 0.06 * sin(D.y * 30.0))) / 0.035;
        if (dot(q, q) < 2.0) col = mix(col, vec3(0.01), (1.0 - smoothstep(0.0, 0.003, c14Flyer(q, sin(uRTime * 16.0)) * 0.035)) * D.x);
    }
    // --- PIANO: un cuervo levanta vuelo de la rama por tecla ---
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.05, 2.5);
        if (e < 0.01) continue;
        float vel = keyVel(k), age = keyAge(k), rel = keyRelAge(k);
        float x0 = hkKeyX(k) * 0.80;
        vec2 start = vec2(x0, c14PerchTop(x0) + 0.08);
        // despega hacia arriba, da vueltas mientras la tecla siga apretada,
        // y al soltarla se va lejos (crece: viene hacia la camara)
        float up = min(age, 1.0);
        vec2 c = start + vec2(0.15, 0.20) * up * (0.8 + vel * 0.4)
               + vec2(cos(age * 2.2 + float(k)), sin(age * 2.2 + float(k)) * 0.4) * 0.18 * smoothstep(0.8, 1.5, age) * (1.0 - smoothstep(0.0, 0.4, rel))
               + vec2(1.6, 0.25) * rel * (0.8 + vel);
        float s = (0.20 + vel * 0.14) * (1.0 + rel * 1.8);
        vec2 q = (p - c) / s;
        if (dot(q, q) > 2.0) continue;
        q.x *= sign(1.0 - 2.0 * step(0.5, fract(age * 0.37 * keyHeld(k))) + 0.001);
        float d = c14Flyer(q, sin(uKclock * (9.0 + vel * 4.0) + float(k) * 2.0)) * s;
        col = mix(col, vec3(0.006, 0.003, 0.004), (1.0 - smoothstep(0.0, 0.003, d)) * e);
    }

    // --- colinas lejanas ---
    vec4 fr = plate0(rUV(p, FAR_R));
    if (fr.a > 0.0) {
        vec3 fc = plateCol(fr.rgb) * (0.25 + moonC * 0.25);
        // borde de arriba de cada colina encendido por la luna
        float top = fr.a * (1.0 - plate0(rUV(p + vec2(0.0, 0.012), FAR_R)).a);
        fc += moonC * top * 0.35 * exp(-abs(p.x - mc.x) * 0.6);
        col = mix(col, fc + moonC * 0.012, fr.a);
    }
    // bruma roja en el valle
    float mist = plate6Wrap(vec2(p.x * 0.10 - t * 0.006, p.y * 0.6)).b;
    float mistUp = EST.z * 0.12 + bleed * 0.35;
    col = mix(col, moonC * (0.10 + bleed * 0.12), smoothstep(0.45 - mistUp * 0.5, 0.8, mist) * exp(-pow((p.y + 0.55 - mistUp) / (0.18 + mistUp * 0.6), 2.0)) * (0.5 + mistUp));
    // suceso: luz en la capilla; detalle: una luz en la colina
    if (sv == 4) col += vec3(1.0, 0.7, 0.3) * se * (0.7 + 0.3 * noise21(vec2(uRTime * 5.0, 1.0))) * (exp(-dot(p - vec2(1.22, -0.07), p - vec2(1.22, -0.07)) * 9000.0) * 1.8 + exp(-length(p - vec2(1.22, -0.07)) * 8.0) * 0.12);
    if (dv == 3) { vec2 lq = p - vec2(-1.2 + D.w * 2.0, -0.27); col += vec3(1.0, 0.75, 0.35) * D.x * (exp(-dot(lq, lq) * 20000.0) * 1.5 + exp(-length(lq) * 15.0) * 0.05); }
    // suceso: un caminante con baston cruza la colina
    if (sv == 5 && se > 0.0) {
        float wx = mix(-1.6, 1.0, ss > 0.5 ? sp : 1.0 - sp);
        vec2 wq = (p - vec2(wx, -0.22 + 0.015 * sin(wx * 2.0))) / 0.14;
        float stepA = sin(sp * 70.0);
        float body = length(max(abs(wq - vec2(0.0, 0.55)) - vec2(0.13, 0.40), 0.0)) - 0.07;
        float head = length(wq - vec2(0.03, 1.10)) - 0.13;
        float hat = max(abs(wq.y - 1.22) - 0.03, abs(wq.x - 0.03) - 0.25);
        float legs = min(hkSeg(wq, vec2(0.0, 0.2), vec2(0.12 * stepA, -0.25)), hkSeg(wq, vec2(0.0, 0.2), vec2(-0.12 * stepA, -0.25))) - 0.05;
        float cane = hkSeg(wq, vec2(0.25, 0.6), vec2(0.35 + 0.05 * stepA, -0.25)) - 0.02;
        float fig = min(min(min(body, head), min(hat, legs)), cane);
        col = mix(col, vec3(0.004, 0.002, 0.002), (1.0 - smoothstep(-0.03, 0.03, fig)) * se);
    }

    // --- arbol (la rama se mece con los medios; D3) ---
    float wind = hkDR(0.0, 0.9, 3.2, uD3) * (0.4 * sin(t * 0.9) + 0.25 * sin(t * 2.1 + 1.0) + mid * 0.8 * sin(t * 3.3));
    float bend = wind * 0.012;
    vec2 pt = p;
    float yb = max(p.y + 0.2, 0.0);
    pt.y -= bend * yb * yb * smoothstep(-1.8, 0.0, p.x) * 3.0;
    pt.x -= bend * yb * yb;
    vec2 tu = rUV(pt, TREE_R);
    vec4 ta = plate1(tu);
    vec2 toMoon = normalize(mc - p);
    if (ta.a > 0.0) {
        vec4 tn = plate2(tu);
        vec2 nxy = tn.rg * 2.0 - 1.0;
        float back = max(dot(nxy, toMoon), 0.0);                    // borde que mira a la luna
        float near = exp(-max(length(p - mc) - R, 0.0) * 1.2);
        vec3 tc = plateCol(ta.rgb) * (0.12 + moonC * 0.10);
        tc += moonC * pow(back, 1.5) * (0.35 + 1.1 * near) * (1.0 + bass * 0.3);
        col = mix(col, tc * hkStyleSil(), ta.a);
    }

    vec2 EG = hkEgg(14.0);          // easter egg (abajo): libera el tramo del medio
    // --- cuervos posados en la rama ---
    // 8 lugares FIJOS en la rama; D4 decide cuales estan ocupados (cada uno
    // con su punto de la perilla) y el nuevo llega volando desde arriba
    const float nSlot = 8.0;
    float nP = hkDR(0.0, 4.5, 8.0, uD4);
    float spacing = 3.3 / nSlot;
    float ci = floor((p.x + 0.95) / spacing);
    for (int kk = -1; kk <= 1; kk++) {
        float k = ci + float(kk);
        if (k < 0.0 || k >= nSlot) continue;
        float h = hash21(vec2(k, 11.0));
        // orden de llegada salteado (0,5,2,7,4,1,6,3): no se llena de izquierda a derecha
        float land = revealAt(nP, mod(k * 5.0, 8.0)) * (1.0 - perchGone);
        if (land < 0.01) continue;
        float x = -0.95 + (k + 0.5) * spacing + (h - 0.5) * spacing * 0.4;
        land *= 1.0 - smoothstep(0.0, 0.3, EG.x) * step(abs(x), 0.62 * hkEggS);
        if (land < 0.01) continue;
        float s = 0.26 + 0.06 * h;
        float yTop = c14PerchTop(x);
        // se asustan con el golpe: saltan (cada uno con su retraso); con
        // Chaos levantan vuelo hacia arriba
        float lag = fract(h * 7.0) * 0.25;
        float scare = hit * smoothstep(0.0, 0.3, hit - lag) * (0.4 + uD4 * 0.4);
        if (dv == 1 && abs(k - floor(D.w * nSlot)) < 0.5) scare = max(scare, D.x * abs(sin(D.y * 18.0)) * 0.5);   // detalle: sacude las alas
        float fly = hit * loco * step(0.5, loco) * step(0.4, h);
        // llega volando (desde arriba a la derecha) mientras 'land' sube
        vec2 off = vec2(fly * 0.8 + (1.0 - land) * 0.6, scare * 0.12 + fly * 0.9 + (1.0 - land) * 0.7);
        float yb2 = max(yTop + 0.2, 0.0);
        vec2 base = vec2(x + bend * yb2 * yb2, yTop + bend * yb2 * yb2 * 3.0) + off;
        vec2 q = (p - base) / s;
        q.y -= 0.44;                                                  // las patas en la rama
        // gira la cabeza: espejo cada tanto (todos juntos en el evento)
        float face = step(0.5, fract(h * 13.0 + floor(uRTime / (5.0 + h * 6.0)) * 0.5));
        face = mix(face, 1.0 - face, step(0.5, turnE));
        if (face > 0.5) q.x = -q.x;
        vec2 cu = rUV(q, CROW_R);
        vec4 cc = plate3(cu);
        if (cc.a <= 0.0) continue;
        vec4 cn = plate4(cu);
        vec2 nxy = cn.rg * 2.0 - 1.0;
        if (face > 0.5) nxy.x = -nxy.x;
        float back = max(dot(nxy, toMoon), 0.0);
        vec3 crowC = plateCol(cc.rgb) * 0.4 + moonC * pow(back, 2.0) * (0.25 + high * 0.3) * 0.9;
        crowC += vec3(0.25, 0.3, 0.6) * pow(max(nxy.y, 0.0), 6.0) * 0.06 * (0.5 + high);   // tornasol
        col = mix(col, crowC * hkStyleSil(), cc.a);
    }

    // EASTER EGG "JAY INFINITO" (fase 38): tres cuervos se posan de a uno
    // en la rama y sus siluetas son las letras J, A, Y (con cabeza y pico)
    if (EG.x > 0.0 && p.x > -0.6 && p.x < 0.9) {
        for (int L = 0; L < 3; L++) {
            float x = 0.0 + float(L - 1) * 0.30 * hkEggS;           // fase 39: mas chicos
            float land = smoothstep(0.05 + float(L) * 0.12, 0.25 + float(L) * 0.12, EG.y) * smoothstep(0.0, 0.3, EG.x);
            if (land < 0.01) continue;
            float yb = c14PerchTop(x) + bend * 0.04;
            vec2 c = vec2(x, yb + 0.14 * hkEggS + (1.0 - land) * 0.6);
            vec2 q = (p - c) / (0.26 * hkEggS);
            int ch = L == 0 ? 74 : (L == 1 ? 65 : 89);
            float dl = hkText(q, int[16](ch, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 1) - 0.09;
            // cabeza con pico arriba a la derecha de cada letra y una cola
            vec2 hq = q - vec2(0.22, 0.58);
            dl = min(dl, length(hq) - 0.13);
            dl = min(dl, max(abs(hq.y + 0.01) - 0.035 + (hq.x - 0.13) * 0.25, abs(hq.x - 0.22) - 0.10));
            dl = min(dl, hkSeg(q, vec2(-0.30, -0.35), vec2(-0.55, -0.55)) - 0.04);
            float m = (1.0 - smoothstep(0.0, 0.02, dl)) * land;
            col = mix(col, vec3(0.012, 0.01, 0.014) * hkStyleSil(), m);
            // el ojo brilla con la luna
            col += moonC * (1.0 - smoothstep(0.02, 0.035, length(hq - vec2(0.03, 0.03)))) * land * 0.8;
        }
    }
    // detalle: caen hojas de la rama
    if (dv == 4) {
        for (int i = 0; i < 3; i++) {
            float fi = float(i);
            vec2 lc = vec2((D.w - 0.5) * 3.0 + fi * 0.3 + 0.12 * sin(D.y * 9.0 + fi), mix(0.45, -0.6, fract(D.y + fi * 0.2)));
            vec2 lq = rot2(uRTime * 3.0 + fi) * (p - lc);
            col = mix(col, vec3(0.03, 0.01, 0.005), (1.0 - smoothstep(-0.003, 0.003, length(lq * vec2(1.0, 2.4)) - 0.018)) * D.x);
        }
    }
    // LUZ DE TECLA (fase 37): el cielo arde detras del cuervo
    col = hkKeyLit(col, p, 0.15, vec2(0.35, 0.6), vec3(1.0, 0.45, 0.15), vec3(1.0, 0.2, 0.1), 0.05, 1.2);
    return vec4(hkFinish(col, uv, vec3(0.5, 0.1, 0.1)), 1.0);
}
