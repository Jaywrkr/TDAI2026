// ===============================================================
// HALLOWEEN 05 - SANGRE QUE CHORREA
// Un bano de hospital abandonado: azulejos viejos con juntas sucias,
// azulejos caidos, oxido, pintura descascarada arriba, un fluorescente
// y piso de baldosas con desague (LAMINAS horneadas, plates/scene05,
// ver td/tools/bake_plates_sangre.py). En la pared hay huellas de manos
// arrastradas y salpicaduras secas; desde arriba chorrea sangre fresca
// que brilla y se junta en un charco en el piso.
// Tres luces iluminan el relieve de los azulejos en vivo: el
// fluorescente, una luz roja de emergencia y una linterna que barre.
//
// BAILE (cada luz y cada cosa escucha una parte distinta):
//   bajo   -> late la luz roja de emergencia; mas brillo humedo
//   medios -> la linterna barre la pared
//   agudos -> el fluorescente zumba y parpadea
//   golpe  -> se sueltan hilos nuevos y rapidos; con Chaos: salpicaduras
// Speed hace bajar los hilos aun en silencio.
// HISTORIA: cada ~50 s la pared sangra entera y crece el charco; cada
// ~79 s estalla una salpicadura; cada ~67 s se corta la luz y quedan
// solo la emergencia y la linterna.
//
// @D1: cantidad de hilos
// @D2: largo de los chorreones
// @D3: grosor de los hilos
// @D4: brillo humedo
// @D5: color (rojo vivo <-> sangre negra)
// @D6: manchas y huellas en la pared
// ===============================================================

const vec4 PL_R = vec4(-3.1, -1.2, 6.2, 2.4);
const float FLOOR_Y = -0.70;
const float TILE_TOP = 0.78;
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 alb(vec3 c) { return pow(c, vec3(2.2)); }

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 p = hkCam(p0);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.006);

    float bleed = hkEvent(3.0, 50.0, 10.0);
    float splatE = hkEvent(4.0, 79.0, 2.5);
    float powerOut = hkEvent(6.0, 67.0, 6.0);

    vec3 red = hsv2rgb(vec3(fract(0.995 + hue), 1.0, 0.62));
    vec3 dark = hsv2rgb(vec3(fract(0.985 + hue), 1.0, 0.22));
    vec3 bc = mix(red, dark, uD5 * 0.8);

    // --- luces ---
    float buzz = step(0.82 - high * 0.5, hash21(vec2(floor(uRTime * (10.0 + high * 25.0)), 5.0)));
    float fluo = (0.95 - buzz * (0.6 + high * 0.3)) * (1.0 - powerOut * step(0.15, hash21(vec2(floor(uRTime * 9.0), 2.0))));
    vec3 fluoC = vec3(0.80, 1.0, 0.88) * fluo;
    float emerg = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uRTime * 3.0), 3.0);
    vec3 emergC = vec3(1.0, 0.08, 0.04) * (emerg * 0.6 + bass * 1.4) * (1.0 + powerOut * 0.8);
    vec2 lc = vec2(sin(t * 0.22) * uAspect * 0.55 + mid * 0.35 * sin(t * 1.3), 0.15 + 0.15 * sin(t * 0.17) + mid * 0.1 * cos(t * 1.1));
    vec3 Pl0 = vec3(clamp(p.x, -0.55, 0.55), 1.06, 0.12);
    vec3 Pl1 = vec3(-2.55, 0.98, 0.15);

    // --- pared y piso (relieve de laminas) ---
    vec2 pu = rUV(p);
    vec3 wa = alb(plate0(pu).rgb);
    vec4 wn = plate1(pu);
    vec2 nxy = wn.rg * 2.0 - 1.0;
    vec3 n = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.05))));
    float rough = wn.b;
    // manchas secas: oscurecen y enrojecen el azulejo
    float st = plate2(pu).r * (0.25 + uD6 * 0.9);
    vec3 dried = mix(vec3(0.20, 0.025, 0.02), dark * 0.6, 0.4) * (0.7 + 0.5 * plate2(pu).g);
    wa = mix(wa, dried, clamp(st, 0.0, 0.92));
    rough = mix(rough, 0.6, st);

    bool onFloor = p.y < FLOOR_Y;
    vec3 P = vec3(p, 0.0);
    // en el piso la "pared" es horizontal: normal hacia arriba, inclinada a la camara
    if (onFloor) n = normalize(vec3(nxy * 0.6, 0.0) + vec3(0.0, 0.85, 0.5));
    vec3 V = vec3(0.0, 0.0, 1.0);
    float shin = mix(80.0, 6.0, rough);
    vec3 lit = vec3(0.012, 0.012, 0.016);
    vec3 spec = vec3(0.0);
    {
        vec3 v = Pl0 - P; float dd = dot(v, v); vec3 L = v * inversesqrt(dd);
        float att = 1.0 / (1.0 + dd * 0.45);
        lit += fluoC * max(dot(n, L), 0.0) * att * 1.5;
        spec += fluoC * pow(max(dot(reflect(-L, n), V), 0.0), shin) * att * (1.0 - rough) * 1.4;
    }
    {
        vec3 v = Pl1 - P; float dd = dot(v, v); vec3 L = v * inversesqrt(dd);
        float att = 1.0 / (1.0 + dd * 1.6);
        lit += emergC * max(dot(n, L), 0.0) * att * 1.6;
        spec += emergC * pow(max(dot(reflect(-L, n), V), 0.0), shin) * att * (1.0 - rough);
    }
    // linterna: circulo de luz que barre
    vec2 sq = (p - lc) * vec2(0.85, 1.15);
    float spot = exp(-dot(sq, sq) * 2.6) * (0.7 + 0.3 * smoothstep(0.0, 0.5, length(sq)));
    vec3 Lf = normalize(vec3(-0.15, 0.25, 1.0));
    lit += vec3(1.0, 0.92, 0.75) * spot * max(dot(n, Lf), 0.0) * 1.3;
    spec += vec3(1.0, 0.92, 0.75) * spot * pow(max(dot(reflect(-Lf, n), V), 0.0), shin) * (1.0 - rough) * 1.2;
    vec3 col = wa * lit + spec;
    // brillo del tubo del fluorescente
    float tube = exp(-abs(p.y - 1.06) * 90.0) * step(abs(p.x), 0.56);
    col += fluoC * tube * 1.6 + fluoC * exp(-length((p - vec2(clamp(p.x, -0.55, 0.55), 1.06)) * vec2(1.0, 2.5)) * 6.0) * 0.12;
    col += emergC * exp(-length(p - Pl1.xy) * 14.0) * 0.8;

    // --- sangre fresca: franja de arriba y chorreones ---
    float top = TILE_TOP - 0.02 - 0.04 * sin(p.x * 3.0 + 0.7) - 0.03 * noise21(vec2(p.x * 5.0, 0.0));
    float cols = 14.0 + floor(uD1 * 30.0 + uDensity * 8.0 + hkActVal(5.0) * 8.0);
    float cw = 2.0 * uAspect / cols;
    float cx = floor((p.x + uAspect) / cw);
    float d = max(top - p.y, p.y - 1.00);   // franja entre la moldura y el techo
    for (int k = -1; k <= 1; k++) {
        float id = cx + float(k);
        float h1 = hash21(vec2(id, 1.7));
        float h2 = hash21(vec2(id, 8.3));
        if (h1 < 0.25 * (1.0 - bleed)) continue;
        float x0 = (id + 0.5) * cw - uAspect + (h2 - 0.5) * cw * 0.5;
        float speed = 0.05 + 0.10 * h2;
        float cyc = fract(t * speed + h1 * 5.0);
        float len = (0.55 + 1.3 * uD2) * (0.25 + 0.75 * h1) * smoothstep(0.0, 0.85, cyc);
        len *= 1.0 + hit * (0.15 + 0.35 * h2) * step(0.5, h1) + bleed * 0.8;
        len = min(len, top - FLOOR_Y - 0.02);
        float w = cw * (0.05 + 0.13 * uD3) * (0.6 + 0.8 * h2);
        float tipY = top - len;
        float yy = clamp((top - p.y) / max(len, 1e-3), 0.0, 1.0);
        float width = w * mix(1.7, 0.6, yy) * (0.8 + 0.4 * noise21(vec2(p.y * 9.0, id)));
        float wob = (noise21(vec2(p.y * 3.0, id * 1.7)) - 0.5) * w * 2.0;
        float strand = max(abs(p.x - x0 - wob) - width, max(p.y - top, tipY - p.y));
        float wobT = (noise21(vec2(tipY * 3.0, id * 1.7)) - 0.5) * w * 2.0;
        float drop = length((p - vec2(x0 + wobT, tipY)) / vec2(1.0, 1.35)) - w * 1.35;
        float dd = min(strand, drop);
        float fall = smoothstep(0.85, 1.0, cyc);
        float fy = tipY - fall * 0.9;
        float falling = length((p - vec2(x0, fy)) / vec2(1.0, 1.4)) - w * 1.2 * step(0.86, cyc) * step(FLOOR_Y, fy);
        dd = min(dd, falling);
        d = min(d, dd);
    }
    float mask = (1.0 - smoothstep(-0.0025, 0.0025, d)) * step(FLOOR_Y, p.y);
    vec2 gd = vec2(dFdx(d), dFdy(d));
    vec3 bn = normalize(vec3(-gd * 60.0, 1.0));
    float bd1 = max(dot(bn, normalize(Pl0 - P)), 0.0), bd2 = max(dot(bn, normalize(Pl1 - P)), 0.0);
    float bs0 = pow(max(dot(reflect(-normalize(Pl0 - P), bn), V), 0.0), 40.0);
    float bs1 = pow(max(dot(reflect(-normalize(Pl1 - P), bn), V), 0.0), 40.0);
    float bsf = pow(max(dot(reflect(-Lf, bn), V), 0.0), 40.0) * spot;
    float depthShade = smoothstep(0.05, -0.02, d);
    vec3 bcol = bc * (0.12 + 0.45 * (bd1 * fluo + bd2 * emerg * 0.5) + spot * 0.55) * mix(1.0, 0.55, depthShade);
    bcol += (fluoC * bs0 + emergC * bs1 + vec3(1.0, 0.9, 0.8) * bsf) * (0.25 + uD4 * 0.9 + bass * 0.6);
    col = mix(col, bcol, mask);
    // la sangre fresca deja un tinte en el azulejo de abajo
    col += red * 0.03 * exp(-max(d, 0.0) * 20.0) * (1.0 - mask) * step(FLOOR_Y, p.y);

    // --- charco en el piso con reflejos ---
    if (onFloor) {
        float depth = FLOOR_Y - p.y;
        float z = 1.0 / (depth + 0.12);
        vec2 pc2 = vec2(p.x * z * 0.45, depth * 3.0);
        float edge = plate3Wrap(vec2(pc2.x * 0.08, pc2.y * 0.12)).a;
        float r = length(vec2(p.x * 0.30, depth * 2.2 - 0.45)) - (0.25 + bleed * 0.25 + uD2 * 0.12) - (edge - 0.5) * 0.12;
        float pool = smoothstep(0.01, -0.01, r);
        vec3 pref = fluoC * exp(-pow(p.x * 2.2, 2.0) - pow((depth - 0.10) * 14.0, 2.0)) * 0.35
                  + emergC * exp(-pow((p.x + 2.2) * 1.6, 2.0) - pow((depth - 0.08) * 12.0, 2.0)) * 0.35
                  + vec3(1.0, 0.9, 0.8) * exp(-pow((p.x - lc.x) * 2.0, 2.0) - pow((depth - 0.12) * 12.0, 2.0)) * 0.2;
        vec3 poolC = dark * 0.12 + bc * 0.10 + bc * 0.08 * (lit.r + 0.1) + pref * bc * 1.6 * (0.4 + uD4 * 0.6) + pref * 0.15;
        // gotas que caen al charco: anillos
        float rings = 0.0;
        vec2 rg = vec2(p.x * z * 1.2, z * 1.0);
        vec2 rid = floor(rg);
        float rt = fract(uRTime * 0.7 + hash21(rid) * 5.0);
        rings = exp(-pow((length((fract(rg) - 0.5) * vec2(1.0, 2.0)) - rt * 0.45) * 28.0, 2.0)) * (1.0 - rt) * step(0.6, hash21(rid + 2.0));
        poolC += (fluoC * 0.3 + vec3(0.1)) * rings * (0.4 + hit);
        col = mix(col, poolC, pool);
    }

    // --- LOCURA: salpicaduras frescas con el golpe ---
    float splatOn = max(hit * smoothstep(0.3, 0.9, loco), splatE);
    if (splatOn > 0.01 && !onFloor) {
        float sl = floor(uRTime * 2.0);
        for (int i = 0; i < 3; i++) {
            float fi = float(i);
            vec2 sc = (hash22(vec2(sl, fi)) - 0.5) * vec2(uAspect * 1.6, 1.0);
            vec2 sq2 = p - sc;
            float ang = atan(sq2.y, sq2.x);
            float spikes = 0.07 + 0.09 * pow(noise21(vec2(ang * 4.0, sl + fi)), 2.0) + 0.12 * pow(noise21(vec2(ang * 17.0, sl + fi + 3.0)), 6.0);
            float sd = length(sq2) - spikes * (0.4 + splatOn * 0.8);
            vec2 dg = sq2 * 22.0;
            vec2 did = floor(dg);
            vec2 df = fract(dg) - 0.5 - (hash22(did + sl) - 0.5) * 0.6;
            float dr = 0.10 + 0.25 * hash21(did + fi);
            float drops = (1.0 - smoothstep(dr - 0.05, dr, length(df))) * step(0.80, hash21(did + sl * 3.0))
                        * smoothstep(0.40 * splatOn + 0.05, 0.10, length(sq2));
            float m = max(1.0 - smoothstep(-0.004, 0.004, sd), drops);
            col = mix(col, bc * (0.18 + 0.45 * spot + 0.30 * fluo), m * splatOn);
        }
    }

    col = audioLift(col, high * 0.06);
    return vec4(hkFinish(col, uv, vec3(0.6, 0.05, 0.05)), 1.0);
}
