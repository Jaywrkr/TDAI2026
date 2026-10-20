// ===============================================================
// HALLOWEEN 04 - MURCIELAGOS Y CASTILLO
// Un castillo gotico sobre un acantilado de roca, con la luna enorme
// detras, montanas lejanas, niebla en el valle y un arbol muerto en
// primer plano (LAMINAS horneadas, plates/scene04, ver
// td/tools/bake_plates_castillo.py). Bandadas de murcielagos en tres
// profundidades cruzan la luna; las ventanas se encienden en vivo, cada
// una con su vela, y en lo alto de la torre mayor late la ventana roja
// del vampiro.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> halo de la luna y la ventana roja del vampiro
//   medios -> la bandada ondula; el arbol se mece
//   agudos -> titilan las estrellas; los murcielagos lejanos aletean
//   golpe  -> la bandada se dispersa (D4) y parpadean las ventanas;
//             con Chaos: relampago y murcielagos que vienen a la camara
// Speed mueve la bandada, las nubes y la niebla aun en silencio.
// HISTORIA: cada ~61 s cruza una bandada enorme, cada ~53 s relampaguea,
// cada ~2 min la luna sangra, y cada acto cambia el color de la luna.
//
// @D1: cantidad de murcielagos
// @D2: tamano de la luna
// @D3: velocidad del aleteo
// @D4: cuanto se dispersan con el golpe
// @D5: color de la luna (palida <-> sangre)
// @D6: luz de las ventanas
// ===============================================================

const vec4 FAR_R = vec4(-3.1, -1.0, 6.2, 1.30);
const vec4 CAS_R = vec4(-2.2, -1.1, 3.2, 2.00);
const vec4 NEAR_R = vec4(-3.1, -1.2, 6.2, 2.40);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// Murcielago de ~1 de envergadura. flap -1..1.
float hwBat(vec2 p, float flap) {
    float ax = abs(p.x);
    float body = length(p / vec2(0.07, 0.13)) - 1.0;
    body *= 0.07;
    vec2 ep = vec2(ax - 0.035, p.y - 0.13);
    float ear = max(abs(ep.x) * 2.2 + ep.y - 0.06, -ep.y);
    body = min(body, ear);
    float y = p.y - flap * 0.35 * ax;
    float top = 0.07 + 0.10 * sin(ax * 4.2) - 0.22 * ax * ax;
    float span = 0.52;
    float thick = 0.20 * (1.0 - ax / span) + 0.05;
    float scallop = 0.05 * abs(sin(ax * PI * 3.0 / span));
    float bottom = top - thick + scallop;
    float wing = max(max(y - top, bottom - y), max(ax - span, 0.04 - ax));
    return min(body, wing);
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 pc = hkCam(p0);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.01);

    vec2 dolly = vec2(sin(uRTime * 0.03) * 0.12 + sin(uRTime * 0.011 + 3.0) * 0.06, 0.0);
    vec2 pS = p0 + (pc - p0) * 0.5 + dolly * 0.05;
    vec2 pF = pc + dolly * 0.25, pC = pc + dolly * 0.55, pN = pc + dolly * 1.2;

    // --- cielo y estrellas (los agudos las hacen titilar) ---
    vec3 col = mix(hsv2rgb(vec3(fract(0.70 + hue), 0.75, 0.20)),
                   hsv2rgb(vec3(fract(0.66 + hue), 0.85, 0.02)),
                   smoothstep(-0.6, 1.0, pS.y));
    vec2 sg = floor(pS * 90.0);
    float sh = hash21(sg);
    float tw = 0.5 + 0.5 * sin(t * (2.0 + sh * 4.0) * (1.0 + high * 2.0) + sh * 30.0);
    col += vec3(0.8, 0.8, 1.0) * step(0.993, sh) * tw * (0.6 + high * 0.8) * smoothstep(-0.2, 0.6, pS.y);

    // --- luna (lamina con crateres) ---
    vec2 mc = vec2(0.35, 0.28);
    float moonR = 0.42 + uD2 * 0.30;
    vec2 mp = pS - mc;
    float mr = length(mp);
    vec3 pale = vec3(1.0, 0.93, 0.78);
    vec3 blood = hsv2rgb(vec3(fract(0.015 + hue), 0.85, 1.0));
    float bloodE = hkEvent(4.0, 117.0, 20.0);
    vec3 moonC = mix(pale, blood, clamp(uD5 + hkActVal(5.0) * 0.25 + bloodE, 0.0, 1.0));
    col += moonC * exp(-max(mr - moonR, 0.0) * 4.0) * (0.22 + bass * 0.45);
    col += moonC * exp(-pow((mr - moonR * 1.6) * 12.0, 2.0)) * 0.04;
    float disk = 0.0;
    if (mr < moonR * 1.02) {
        vec4 mt = plate5(mp / (moonR * 2.0) + 0.5);
        disk = mt.a;
        col = mix(col, moonC * mt.r * 1.1, mt.a);
    }
    col += moonC * hkRays(pS, mc, t, 14.0) * 0.16 * (1.0 - disk);
    // relampago
    float zap = max(hit * smoothstep(0.4, 0.9, loco), hkEvent(6.0, 53.0, 6.0) * step(0.85, noise21(vec2(uRTime * 6.0, 1.0))));
    float bslot = floor(uRTime * 1.5);
    float bd = hkBolt(pS, (hash21(vec2(bslot, 2.0)) - 0.5) * uAspect * 1.6, 1.05, -0.35, bslot * 5.0, 0.4);
    col += vec3(0.8, 0.75, 1.0) * (exp(-bd * 160.0) + exp(-bd * 20.0) * 0.3) * zap * 1.5;
    col += vec3(0.5, 0.45, 0.8) * zap * 0.15;
    // nubes que cruzan la luna, con borde iluminado
    float cl = plate4Wrap(vec2(pS.x * 0.12 - t * 0.005, pS.y * 0.45 + 0.2)).r;
    float cm = smoothstep(0.55, 0.78, cl);
    float crim = smoothstep(0.50, 0.58, cl) - smoothstep(0.58, 0.72, cl);
    col = mix(col, col * 0.30 + vec3(0.01, 0.01, 0.02), cm * 0.85 * smoothstep(-0.3, 0.2, pS.y));
    col += moonC * crim * exp(-max(mr - moonR * 0.8, 0.0) * 2.5) * 0.35;

    // --- montanas lejanas ---
    vec4 far = plate0(rUV(pF, FAR_R));
    vec3 farC = mix(col * 0.55, moonC * 0.06 + vec3(0.02, 0.02, 0.04), 0.5) * (0.5 + 0.8 * far.r);
    col = mix(col, farC, far.a);

    // --- castillo y ventanas ---
    vec2 cu = rUV(pC, CAS_R);
    vec4 cas = plate1(cu);
    if (cas.a > 0.0) {
        vec3 cc = plateCol(cas.rgb) * (0.9 + 0.6 * dot(moonC, vec3(0.33))) * 1.3;
        cc += plateCol(cas.rgb) * vec3(0.8, 0.75, 1.0) * zap * 4.0;
        col = mix(col, cc, cas.a);
        float wid = plate2(cu).r;
        if (wid > 0.01) {
            float idq = floor(wid * 24.0 + 0.5);
            float candle = 0.75 + 0.25 * sin(t * (7.0 + idq) + idq * 3.0) + 0.15 * noise21(vec2(t * 3.0, idq));
            float on = step(0.25, hash21(vec2(idq, floor(uRTime * 0.08 + idq * 0.3))));
            // el golpe hace parpadear algunas
            on *= 1.0 - hit * step(0.55, hash21(vec2(idq, floor(uRTime * 6.0))));
            vec3 wc = vec3(1.0, 0.62, 0.25) * candle * on * (0.8 + uD6 * 1.4);
            // ventana roja del vampiro en lo alto de la torre mayor
            if (abs(idq - 9.0) < 0.5) wc = vec3(1.0, 0.08, 0.05) * (0.8 + bass * 2.0 + hit);
            col = mix(col, wc, smoothstep(0.0, 0.02, wid));
        }
    }
    // halo de las ventanas y niebla del valle
    col += vec3(1.0, 0.6, 0.25) * 0.05 * (0.4 + uD6) * exp(-abs(pC.y + 0.1) * 3.0) * smoothstep(1.4, 0.2, abs(pC.x + 0.6));
    float fz = plate4Wrap(vec2(pF.x * 0.10 - t * 0.006, pF.y * 0.4)).g;
    float vfog = smoothstep(0.38, 0.78, fz) * exp(-pow((pF.y + 0.78) / 0.20, 2.0));
    col = mix(col, moonC * 0.10 + vec3(0.03, 0.03, 0.06), vfog * 0.6);

    // --- bandadas en tres profundidades ---
    float swarmE = hkEvent(3.0, 61.0, 9.0);
    float presence = clamp(0.30 + uD1 * 0.45 + uDensity * 0.10 + swarmE * 0.45, 0.0, 0.95);
    float bats = 1e3;
    float batRim = 0.0;
    for (int L = 0; L < 3; L++) {
        float fl = float(L);
        float depth = 1.25 - fl * 0.35;
        float cs = 0.62 * depth;
        vec2 q0 = pS + vec2(t * (0.10 + 0.05 * fl) * depth, 0.0);
        // la bandada ondula con los medios
        q0.y += sin(q0.x * 1.3 + t * 0.6) * (0.04 + mid * 0.12) * depth;
        vec2 cid = floor(q0 / cs);
        if (cid.y * cs < -0.75 || cid.y * cs > 1.1) continue;
        vec2 h = hash22(cid + fl * 13.0);
        if (hash21(cid + fl * 7.0 + 0.5) > presence) continue;
        vec2 center = (cid + 0.5 + (h - 0.5) * 0.35) * cs;
        center.y += 0.06 * sin(t * (0.8 + h.x) + h.y * 9.0);
        vec2 world = center - vec2(t * (0.10 + 0.05 * fl) * depth, 0.0);
        vec2 away = normalize(world - mc + 1e-4);
        center += (away + (h - 0.5)) * hit * (0.03 + uD4 * 0.10) * depth;
        float scale = 0.17 * depth * (1.0 + hit * loco * 0.6 * h.x + swarmE * 0.25);
        vec2 bq = (q0 - center) / scale;
        if (dot(bq, bq) > 0.6) { bats = min(bats, (length(bq) - 0.55) * scale); continue; }
        float fspd = (9.0 + uD3 * 12.0) * (0.8 + h.y * 0.4) * (1.0 + high * 0.5 * fl);
        float flap = sin(t * fspd + h.x * 20.0);
        bq = rot2((h.x - 0.5) * 0.5) * bq;
        float bd2 = hwBat(bq, flap) * scale;
        bats = min(bats, bd2);
    }
    float batMask = 1.0 - smoothstep(-0.0015, 0.0015, bats);
    col = mix(col, vec3(0.0), batMask);
    col += moonC * (1.0 - smoothstep(0.0, 2.4 / uResH, abs(bats))) * (disk * 0.6 + zap * 0.8);

    // --- primer plano: rocas, pasto y el arbol que se mece ---
    vec2 nu = rUV(pN, NEAR_R);
    float sway = (0.002 + mid * 0.006) * sin(t * 1.1 + pN.y * 2.0) * smoothstep(-0.4, 0.8, pN.y);
    nu.x += sway;
    vec4 nr = plate3(nu);
    vec3 nc = plateCol(nr.rgb) * 2.4 + moonC * 0.012 * smoothstep(-1.2, -0.7, pN.y) + plateCol(nr.rgb) * vec3(0.8, 0.75, 1.0) * zap * 3.0;
    col = mix(col, nc, nr.a);

    col = audioLift(col, high * 0.08);
    return vec4(hkFinish(col, uv, vec3(0.35, 0.3, 0.8)), 1.0);
}
