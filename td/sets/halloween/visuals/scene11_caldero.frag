// ===============================================================
// HALLOWEEN 11 - CALDERO DE BRUJA
// Caldero negro sobre brasas, con liquido verde toxico que burbujea y
// vapor brillante que sube y se enrosca.
// Speed hace subir el vapor y las burbujas. El bajo enciende el liquido
// desde adentro; el golpe revienta burbujas grandes (cada una en su
// lugar) y aviva las brasas.
//
// @D1: cantidad de burbujas
// @D2: altura del vapor
// @D3: brillo del liquido
// @D4: brasas bajo el caldero
// @D5: color de la pocion (verde <-> violeta)
// @D6: chispas
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = hkPunch(hkShake(centered(uv)));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    vec3 potion = mix(hsv2rgb(vec3(fract(0.32 + hue), 0.95, 1.0)),
                      hsv2rgb(vec3(fract(0.78 + hue), 0.80, 1.0)), uD5);
    vec3 ember = vec3(1.0, 0.40, 0.08);

    vec3 col = vec3(0.010, 0.010, 0.015);
    col += potion * 0.10 * exp(-length(p - vec2(0.0, -0.25)) * 1.3);

    // caldero: cuerpo redondo + boca eliptica
    vec2 cp = p - vec2(0.0, -0.42);
    float bodyD = length(cp / vec2(0.62, 0.48)) - 1.0;
    float rimY = 0.20;
    float body = max(bodyD * 0.48, cp.y - rimY);
    vec2 mp = (cp - vec2(0.0, rimY)) / vec2(0.58, 0.10);
    float mouth = length(mp) - 1.0;
    float rim = abs(mouth) - 0.12;
    float legs = 1e3;
    for (int s = -1; s <= 1; s += 2) {
        vec2 lq = cp - vec2(float(s) * 0.38, -0.50);
        legs = min(legs, max(abs(lq.x) - 0.04, abs(lq.y) - 0.08));
    }
    float pot = min(min(body, rim * 0.1), legs);
    float potM = 1.0 - smoothstep(-0.003, 0.003, pot);

    // brasas debajo
    float coals = fbm(vec2(p.x * 6.0, t * 0.8), 3) * exp(-pow((p.y + 0.98) / 0.06, 2.0));
    coals *= smoothstep(0.75, 0.2, abs(p.x));
    col += ember * coals * (0.6 + uD4 * 1.6 + hit * 0.8);
    col += ember * 0.12 * exp(-abs(p.y + 0.95) * 4.0) * (0.4 + uD4) * smoothstep(0.9, 0.0, abs(p.x));

    // metal del caldero con reflejo verde arriba y rojo abajo
    vec3 metal = vec3(0.025, 0.025, 0.03);
    metal += potion * 0.25 * smoothstep(-0.2, 0.2, cp.y) * smoothstep(0.6, 0.0, abs(cp.x));
    metal += ember * 0.20 * smoothstep(-0.2, -0.5, cp.y) * (0.5 + uD4);
    float spec = exp(-pow((cp.x + 0.30) / 0.05, 2.0)) * smoothstep(0.1, -0.3, cp.y) * smoothstep(-0.48, -0.1, cp.y);
    metal += vec3(0.25) * spec;
    col = mix(col, metal, potM);
    // perfil del caldero recortado por la luz de la pocion
    col += potion * edgeLine(pot, 1.5) * 0.35 * smoothstep(-0.6, 0.25, cp.y);

    // superficie del liquido dentro de la boca
    float liquidM = 1.0 - smoothstep(-0.05, 0.0, mouth + 0.10);
    float lb = 0.55 + uD3 * 0.45 + bass * 0.45;
    vec3 liquid = vec3(0.0);
    if (liquidM > 0.0) {
    float surf = fbm(mp * vec2(3.0, 1.5) + vec2(t * 0.4, 0.0), 4, 0.5);
    liquid = potion * (0.35 + 0.65 * surf) * lb;
    // burbujas en la superficie
    float nb = 8.0 + floor(uD1 * 14.0);
    for (int i = 0; i < 22; i++) {
        float fi = float(i);
        if (fi >= nb) break;
        float h1 = fract(sin(fi * 12.989) * 43758.5);
        float h2 = fract(sin(fi * 78.233) * 12345.6);
        float life = fract(t * (0.25 + h2 * 0.35) + h1);
        vec2 bc = vec2(h1 * 1.6 - 0.8, h2 * 1.2 - 0.6);
        float big = 1.0 + hit * step(0.6, h2) * 1.4;
        float rad = 0.10 + 0.25 * life * big;
        float ring = abs(length((mp - bc) * vec2(1.0, 1.6)) - rad);
        float bub = (1.0 - smoothstep(0.0, 0.05, ring)) * (1.0 - life);
        liquid += potion * bub * 0.8 + vec3(0.8) * bub * 0.25;
    }
    }
    col = mix(col, liquid, liquidM);
    col += potion * exp(-max(mouth + 0.1, 0.0) * 6.0) * 0.12 * lb * (1.0 - potM);

    // vapor que sube y se enrosca
    vec2 vp = p - vec2(0.0, -0.22);
    float rise = clamp(vp.y / (0.6 + uD2 * 0.9), 0.0, 1.0);
    vec2 sq = vec2(vp.x * (1.6 - rise * 0.6) + 0.25 * sin(vp.y * 3.0 - t * 1.2), vp.y * 1.4 - t * 0.5);
    float colMask = smoothstep(0.65 + rise * 0.5, 0.0, abs(vp.x)) * smoothstep(0.0, 0.05, vp.y) * (1.0 - rise);
    float steam = colMask > 0.0 ? fbm(sq, 5, 0.55) : 0.0;
    float sAmt = smoothstep(0.38, 0.80, steam) * colMask;
    col += potion * sAmt * (0.75 + bass * 0.6 + uD3 * 0.4);

    // LOCURA: la pocion erupciona en un geiser con el golpe
    float geyser = hit * smoothstep(0.3, 0.9, loco);
    if (geyser > 0.01) {
        vec2 gq = p - vec2(0.0, -0.22);
        float hgt = geyser * 1.3;
        float w = 0.10 + 0.10 * gq.y + 0.04 * sin(gq.y * 12.0 - uRTime * 20.0);
        float gn = fbm(vec2(gq.x * 8.0, gq.y * 3.0 - uRTime * 6.0), 3);
        float col1 = smoothstep(w, w * 0.3, abs(gq.x)) * smoothstep(0.0, 0.05, gq.y) * smoothstep(hgt, hgt * 0.6, gq.y);
        col += (potion * 1.1 + vec3(0.12)) * col1 * (0.5 + gn);
        col += potion * exp(-abs(gq.x) * 5.0) * smoothstep(hgt + 0.3, 0.0, gq.y) * geyser * 0.25;
    }
    // chispas verdes que saltan
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 g = vec2(p.x * (14.0 + fi * 8.0), p.y * 4.0 - t * (1.2 + fi * 0.5));
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5 - (hash22(id + fi) - 0.5) * 0.6;
        float alive = step(0.80 - uD6 * 0.30 - hit * 0.2, hash21(id + 3.0 + fi));
        float sp = exp(-dot(f, f) * 200.0) * alive * colMask;
        col += mix(potion, vec3(1.0), 0.4) * sp * 1.2;
    }

    return vec4(hkFinish(col, uv, vec3(0.2, 0.6, 0.2)), 1.0);
}
