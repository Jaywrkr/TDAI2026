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
// Speed mueve las nubes, el vuelo y el viento aun en silencio.
// HISTORIA: cada ~63 s una bandada grande cruza la luna; cada ~127 s un
// eclipse le pasa por encima; cada ~41 s todos giran la cabeza a la vez.
//
// @D1: cantidad de cuervos volando
// @D2: tamano de la luna
// @D3: cuanto se mueven las ramas
// @D4: cuervos posados
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

    float flockE = hkEvent(14.0, 63.0, 12.0);
    float flockPh = hkEventPhase(14.0, 63.0, 12.0);
    float eclE = hkEvent(15.0, 127.0, 16.0);
    float eclPh = hkEventPhase(15.0, 127.0, 16.0);
    float turnE = hkEvent(16.0, 41.0, 4.0);

    // --- cielo ---
    vec3 moonC = mix(vec3(1.0, 0.48, 0.22), vec3(1.0, 0.12, 0.06), uD5);
    vec3 col = mix(moonC * 0.07, vec3(0.010, 0.002, 0.004), smoothstep(-0.6, 1.0, p.y));
    float sh = hash21(floor(p * 120.0));
    col += vec3(0.8, 0.7, 0.7) * step(0.996, sh) * (0.4 + 0.6 * sin(t * 2.0 + sh * 50.0) * (0.5 + high)) * smoothstep(0.2, 0.9, p.y);

    // --- luna ---
    vec2 mc = vec2(0.55, 0.14);
    float R = 0.50 + uD2 * 0.28;
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

    // --- nubes que cruzan ---
    float cl = plate6Wrap(vec2(p.x * 0.12 - t * 0.008, p.y * 0.5 + 0.2)).r;
    float cl2 = plate6Wrap(vec2(p.x * 0.20 - t * 0.013 + 0.3, p.y * 0.8)).g;
    float clouds = smoothstep(0.55 - uD6 * 0.2, 0.78 - uD6 * 0.15, cl * 0.65 + cl2 * 0.35) * smoothstep(-0.3, 0.3, p.y) * (0.3 + uD6 * 0.7);
    float rim = (smoothstep(0.50, 0.58, cl) - smoothstep(0.58, 0.72, cl)) * exp(-mr * 1.6);
    col = mix(col, vec3(0.03, 0.008, 0.012) + moonC * 0.05 * exp(-mr * 1.2), clouds * 0.85);
    col += moonC * rim * (0.3 + high * 0.4) * uD6;

    // --- cuervos volando (dos capas; la bandada grande cruza la luna) ---
    float nF = 2.0 + floor(uD1 * 6.0) + flockE * 14.0;
    for (int i = 0; i < 22; i++) {
        float fi = float(i);
        if (fi >= nF) break;
        float h1 = hash21(vec2(fi, 3.0)), h2 = hash21(vec2(fi, 7.0));
        float big = step(2.0 + floor(uD1 * 6.0), fi);           // los de la bandada
        float spd = 0.05 + h1 * 0.05;
        float x = big > 0.5 ? mix(-uAspect - 0.6, uAspect + 0.6, flockPh + h1 * 0.15)
                            : mix(-uAspect - 0.6, uAspect + 0.6, fract(h2 + t * spd));
        float y = big > 0.5 ? mc.y + (h2 - 0.5) * 0.9 + sin(flockPh * 6.0 + fi) * 0.05
                            : 0.35 + h2 * 0.5 + 0.06 * sin(t * (0.5 + h1) + fi);
        float s = big > 0.5 ? 0.06 + h1 * 0.05 : 0.05 + h1 * 0.04;
        vec2 q = (p - vec2(x, y)) / s;
        if (dot(q, q) > 2.0) continue;
        float flap = sin(t * (7.0 + h1 * 5.0) + fi * 2.0);
        float d = c14Flyer(q, flap) * s;
        col = mix(col, vec3(0.006, 0.003, 0.004), 1.0 - smoothstep(0.0, 0.003, d));
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
    col = mix(col, moonC * 0.10, smoothstep(0.45, 0.8, mist) * exp(-pow((p.y + 0.55) / 0.18, 2.0)) * 0.5);

    // --- arbol (la rama se mece con los medios; D3) ---
    float wind = (0.4 + uD3) * (0.4 * sin(t * 0.9) + 0.25 * sin(t * 2.1 + 1.0) + mid * 0.8 * sin(t * 3.3));
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
        col = mix(col, tc, ta.a);
    }

    // --- cuervos posados en la rama ---
    float nP = 1.0 + floor(uD4 * 7.0);
    float spacing = 3.3 / nP;
    float ci = floor((p.x + 0.95) / spacing);
    for (int kk = -1; kk <= 1; kk++) {
        float k = ci + float(kk);
        if (k < 0.0 || k >= nP) continue;
        float h = hash21(vec2(k, 11.0));
        float x = -0.95 + (k + 0.5) * spacing + (h - 0.5) * spacing * 0.4;
        float s = 0.26 + 0.06 * h;
        float yTop = c14PerchTop(x);
        // se asustan con el golpe: saltan (cada uno con su retraso); con
        // Chaos levantan vuelo hacia arriba
        float lag = fract(h * 7.0) * 0.25;
        float scare = hit * smoothstep(0.0, 0.3, hit - lag) * (0.4 + uD4 * 0.4);
        float fly = hit * loco * step(0.5, loco) * step(0.4, h);
        vec2 off = vec2(fly * 0.8, scare * 0.12 + fly * 0.9);
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
        col = mix(col, crowC, cc.a);
    }

    return vec4(hkFinish(col, uv, vec3(0.5, 0.1, 0.1)), 1.0);
}
