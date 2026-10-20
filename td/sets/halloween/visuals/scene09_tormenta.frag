// ===============================================================
// HALLOWEEN 09 - TORMENTA GOTICA
// Un paramo de noche bajo una tormenta (LAMINAS horneadas,
// plates/scene09, ver td/tools/bake_plates_tormenta.py): colinas, una
// granja lejana con la ventana encendida, un campo de pasto alto con una
// cerca torcida, un espantapajaros y un arbol muerto adelante. Arriba,
// nubarrones con relieve que se desplazan y se iluminan desde adentro
// con cada rayo; relampagos ramificados que caen al campo; lluvia en dos
// capas y charcos que reflejan el destello.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> retumba: las nubes se encienden desde adentro
//   medios -> el viento inclina la lluvia y mece el pasto y el arbol
//   agudos -> brilla la lluvia
//   golpe  -> cae el rayo (cada golpe en otro lugar) y recorta el
//             paisaje; con Chaos: dos y tres rayos
// Speed mueve nubes y lluvia aun en silencio.
// HISTORIA: cada acto la tormenta es mas o menos intensa; cada ~57 s
// llega el pico (rayos seguidos sin golpe); cada ~73 s un rayo cae en el
// arbol y lo deja ardiendo un rato; la ventana de la granja se apaga y
// se prende.
//
// @D1: cantidad de lluvia
// @D2: ramificacion del rayo
// @D3: rayos tambien sin golpe (tormenta constante)
// @D4: brillo del relampago
// @D5: color (violeta <-> azul electrico)
// @D6: arbol muerto (de tenue a nitido)
// ===============================================================

const vec4 LAND_R = vec4(-3.1, -1.2, 6.2, 1.30);
const vec4 TREE_R = vec4(-3.1, -1.2, 6.2, 2.40);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// Rayo vertical quebrado desde 'top' hasta 'bot' en x0. Devuelve
// distancia aproximada al rayo.
float hwBolt(vec2 p, float x0, float top, float bot, float seed) {
    if (p.y > top || p.y < bot) return 1e3;
    float y = p.y;
    float k = (top - y) / (top - bot);
    // zigzag: suma de ruidos de distinta escala
    float x = x0 + (noise21(vec2(y * 6.0, seed)) - 0.5) * 0.30 * k
                 + (noise21(vec2(y * 22.0, seed + 3.0)) - 0.5) * 0.07;
    return abs(p.x - x);
}

float hwBranchy(vec2 p, float x0, float top, float bot, float seed, float branches) {
    float d = hwBolt(p, x0, top, bot, seed);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        if (fi >= branches) break;
        float by = mix(top, bot, 0.25 + 0.15 * fi);
        float bx = x0 + (noise21(vec2(by * 6.0, seed)) - 0.5) * 0.30 * (0.25 + 0.15 * fi);
        float dir = (fract(seed * 7.0 + fi * 0.37) > 0.5) ? 1.0 : -1.0;
        vec2 q = p - vec2(bx, by);
        q = rot2(dir * 0.55) * q;
        d = min(d, hwBolt(q + vec2(0.0, by), 0.0, by, by - 0.35 - 0.1 * fi, seed + fi * 9.0) + 0.0015);
    }
    return d;
}

vec4 render(vec2 uv) {
    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 p = hkCam(p0);
    float t = uTime;
    float rt = uRTime;
    float hit = hkHit();
    float loco = hkLoco();
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, mid * 0.008);

    float slot = floor(rt * 1.7);
    float peak = hkEvent(3.0, 57.0, 10.0);
    float treeHit = hkEvent(5.0, 73.0, 9.0);
    float ambient = max(uD3, peak) * step(0.86 - peak * 0.2 - hkActVal(4.0) * 0.08, hash21(vec2(floor(rt * 3.0), 5.0)));
    float strike = clamp(hit + ambient, 0.0, 1.0);
    // el destello se apaga en una fraccion de segundo, con un rebote
    float flick = strike * (0.75 + 0.25 * step(0.5, hash21(vec2(floor(rt * 22.0), 2.0))));
    vec3 boltC = mix(hsv2rgb(vec3(fract(0.77 + hue), 0.45, 1.0)),
                     hsv2rgb(vec3(fract(0.60 + hue), 0.55, 1.0)), uD5);
    float bx = (hash21(vec2(slot, 1.0)) - 0.5) * uAspect * 1.5;
    vec2 treeTop = vec2(-1.55, 0.55);
    if (treeHit > 0.5) bx = treeTop.x;

    // --- cielo y nubarrones con relieve (textura de ruido que se mueve) ---
    vec3 col = mix(vec3(0.02, 0.018, 0.04), vec3(0.005, 0.004, 0.012), smoothstep(-0.3, 1.2, p.y));
    vec2 cu = vec2(p.x * 0.11 - t * 0.006, p.y * 0.40 + 0.1);
    vec2 cw = vec2(plate2Wrap(cu * 0.5 + 0.3).g, plate2Wrap(cu * 0.5 + 0.7).b) - 0.5;
    vec4 n1 = plate2Wrap(cu + cw * 0.12);
    vec4 n2 = plate2Wrap(cu + cw * 0.12 + vec2(0.004, 0.012));
    float cl = n1.r * 0.7 + n1.a * 0.3;
    float cl2 = n2.r * 0.7 + n2.a * 0.3;
    float shape = smoothstep(0.38, 0.70, cl) * smoothstep(-0.55, 0.15, p.y);
    float relief = clamp(0.5 + (cl - cl2) * 9.0, 0.0, 1.0);    // luz desde arriba
    vec3 cloudDark = hsv2rgb(vec3(fract(0.74 + hue), 0.55, 0.06));
    vec3 cloudLit = hsv2rgb(vec3(fract(0.76 + hue), 0.40, 0.32));
    col = mix(col, mix(cloudDark, cloudLit, relief * 0.8 + n1.a * 0.2), shape);
    // brillo interno: el rayo y el bajo encienden las nubes desde adentro
    float inside = exp(-abs(p.x - bx) * 1.8) * shape * (0.4 + 0.6 * cl);
    col += boltC * inside * flick * (0.6 + uD4 * 1.2);
    col += boltC * shape * bass * 0.10 * (0.5 + 0.5 * n1.g) * exp(-abs(p.x - sin(rt * 0.3) * 1.5) * 0.8);
    col += boltC * 0.08 * flick * (0.5 + uD4);

    // --- rayo ---
    float d = hwBranchy(p, bx, 1.35, treeHit > 0.5 ? treeTop.y : -0.62, hash21(vec2(slot, 3.0)) * 50.0, floor(1.0 + uD2 * 3.0));
    float px = 2.0 / uResH;
    if (loco > 0.35) d = min(d, hwBranchy(p, bx + 0.7 * uAspect * (hash21(vec2(slot, 8.0)) - 0.5) * 2.0, 1.35, -0.62, slot * 13.0 + 1.0, 2.0));
    if (loco > 0.70) d = min(d, hwBranchy(p, -bx * 0.8, 1.35, -0.62, slot * 29.0 + 4.0, 3.0));
    float core = 1.0 - smoothstep(px * 0.8, px * 2.2, d);
    float glow = exp(-d * 60.0) * 0.6 + exp(-d * 12.0) * 0.25;
    col += (vec3(1.0) * core + boltC * glow) * flick * (0.8 + uD4 * 1.2);

    // --- paisaje: oscuro, el relampago lo recorta ---
    vec4 ld = plate0(rUV(p + vec2(0.0, 0.0), LAND_R));
    vec3 la = plateCol(ld.rgb);
    float near = exp(-abs(p.x - bx) * 0.6);
    vec3 lc = la * (0.45 + vec3(0.15, 0.15, 0.25) + boltC * flick * (1.5 + uD4 * 2.0) * (0.4 + 0.6 * near));
    // la ventana de la granja: se apaga y se prende
    vec2 wq = p - vec2(1.55, -0.42 + 0.0);
    float lamp = step(0.25, hash21(vec2(floor(rt / 9.0), 4.0)));
    lc += vec3(1.0, 0.65, 0.25) * exp(-dot(wq * vec2(1.0, 1.6), wq * vec2(1.0, 1.6)) * 4000.0) * 1.5 * lamp;
    col = mix(col, lc, ld.a);

    // --- charcos en el campo que reflejan el destello ---
    if (p.y < -0.70) {
        float z = 1.0 / (-0.55 - p.y + 0.08);
        float pud = smoothstep(0.55, 0.62, plate2Wrap(vec2(p.x * z * 0.05, z * 0.06)).a);
        vec2 rg = vec2(p.x * z * 1.6, z * 1.3);
        vec2 rid = floor(rg);
        float rr = fract(rt * 1.4 + hash21(rid) * 7.0);
        float ring = exp(-pow((length((fract(rg) - 0.5) * vec2(1.0, 2.2)) - rr * 0.45) * 28.0, 2.0)) * (1.0 - rr) * step(0.5, hash21(rid + 3.0));
        vec3 pc = vec3(0.02, 0.02, 0.035) + boltC * flick * 0.35 * near + vec3(0.4, 0.45, 0.6) * ring * 0.3;
        col = mix(col, pc, pud * 0.85);
    }

    // --- arbol muerto (D6), se mece con los medios; arde si le cae el rayo ---
    vec2 tu = rUV(p, TREE_R);
    tu.x += (0.0015 + mid * 0.004) * sin(t * 1.2 + p.y * 2.0) * smoothstep(-0.6, 0.6, p.y);
    vec4 tr = plate1(tu);
    float treeOn = 0.35 + 0.65 * uD6;
    vec3 tc = plateCol(tr.rgb) * (0.4 + boltC * flick * 2.5 * exp(-abs(p.x - bx) * 0.8));
    float burn = treeHit * smoothstep(0.3, 0.5, hkEventPhase(5.0, 73.0, 9.0));
    if (burn > 0.0 && tr.a > 0.0) {
        float fl = plate2Wrap(vec2(p.x * 0.4, p.y * 0.3 - rt * 0.15)).g;
        tc += vec3(1.0, 0.45, 0.10) * smoothstep(0.45, 0.75, fl) * burn * 1.8 * smoothstep(-0.5, 0.4, p.y);
    }
    col = mix(col, tc, tr.a * treeOn);
    if (burn > 0.0) {
        float emb = hkParticles(p - vec2(-1.55, 0.2), rt, 0.25 * burn, vec2(0.2, 1.0), 0.03);
        col += vec3(1.0, 0.5, 0.15) * emb * burn * exp(-length((p - vec2(-1.55, 0.3)) * vec2(1.2, 0.7)) * 1.5);
        col += vec3(1.0, 0.45, 0.12) * burn * 0.10 * exp(-length(p - vec2(-1.55, 0.0)) * 1.8);
    }

    // --- lluvia diagonal (los medios la inclinan) ---
    vec2 rp = p;
    rp.x += rp.y * (0.20 + mid * 0.25);
    float rain = 0.0;
    float rainBoost = 1.0 + loco * hit * 1.5;
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 g = vec2(rp.x * (60.0 + fi * 40.0), rp.y * 2.0 + t * (2.2 + fi));
        vec2 id = floor(g);
        float h = hash21(id + fi * 7.0);
        float streak = smoothstep(0.0, 0.4, fract(g.y + h)) * (1.0 - smoothstep(0.4, 0.5, fract(g.y + h)));
        float lane = 1.0 - smoothstep(0.02, 0.10, abs(fract(g.x) - 0.5));
        rain += streak * lane * step(1.0 - (0.25 + uD1 * 0.55) * rainBoost, h) * (0.5 - fi * 0.2);
    }
    col += vec3(0.55, 0.6, 0.8) * rain * (0.14 + high * 0.6 + flick * 0.6);

    return vec4(hkFinish(col, uv, vec3(0.3, 0.3, 0.8)), 1.0);
}
