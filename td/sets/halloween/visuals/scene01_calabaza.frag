// ===============================================================
// HALLOWEEN 01 - JACK O'LANTERN
// Calabaza tallada con gajos y surcos, iluminada desde adentro por una
// llama que titila. Brasas que suben desde abajo.
// Speed mueve la llama y las brasas. El bajo sube la luz interior; el
// golpe aviva la llama (los huecos de la cara destellan) y suelta una
// rafaga de brasas. El piano hace brillar los ojos.
//
// @D1: tamano de la calabaza
// @D2: fuerza de la llama interior
// @D3: cantidad de brasas
// @D4: sonrisa (seria <-> enorme)
// @D5: relieve de los gajos
// @D6: aura naranja alrededor
// ===============================================================

float hwTri(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 e0 = b - a, e1 = c - b, e2 = a - c;
    vec2 v0 = p - a, v1 = p - b, v2 = p - c;
    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                     vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                 vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
}

// Huecos tallados (ojos, nariz, boca dentada). < 0 = hueco.
float hwFace(vec2 q, float smile) {
    float eyeL = hwTri(q, vec2(-0.40, 0.12), vec2(-0.12, 0.12), vec2(-0.27, 0.36));
    float eyeR = hwTri(q, vec2(0.12, 0.12), vec2(0.40, 0.12), vec2(0.27, 0.36));
    float nose = hwTri(q, vec2(-0.07, -0.02), vec2(0.07, -0.02), vec2(0.0, 0.10));
    // Boca: banda entre dos curvas, con dientes que la cortan.
    float x = q.x;
    float curve = -0.20 + (0.20 + smile * 0.55) * x * x;
    float halfH = 0.075 + smile * 0.04;
    float band = abs(q.y - curve) - halfH * (1.0 - smoothstep(0.30, 0.52, abs(x)));
    // Dientes: columnas alternas, arriba y abajo, que tapan la banda.
    float u = fract(x * 5.0 + 0.25);
    float colUp = (abs(u - 0.75) - 0.25) / 5.0;
    float colDn = (abs(u - 0.25) - 0.25) / 5.0;
    float toothTop = curve + halfH - 0.060;
    float toothBot = curve - halfH + 0.060;
    float upper = max(toothTop - q.y, colUp + 0.012);
    float lower = max(q.y - toothBot, colDn + 0.012);
    float mouth = max(band, -min(upper, lower));
    mouth = max(mouth, abs(x) - 0.50);
    return min(min(eyeL, eyeR), min(nose, mouth));
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = clamp(max(uKick, uBeat * 0.75), 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.008);

    float size = 0.80 + uD1 * 0.32;
    vec2 q = (p - vec2(0.0, -0.06)) / size;

    // Llama interior: titila con el tiempo, se aviva con el golpe.
    float flick = 0.70 + 0.18 * sin(t * 7.3) + 0.12 * sin(t * 13.1 + 1.7)
                + 0.10 * noise21(vec2(t * 3.0, 1.0));
    float inner = flick * (0.85 + uD2 * 0.70) + bass * 0.40 + hit * 0.70;

    // --- fondo: oscuro con un resplandor calido ---
    vec3 bg = mix(vec3(0.010, 0.004, 0.020), vec3(0.06, 0.018, 0.04),
                  smoothstep(1.2, 0.0, length(p)));
    vec3 col = bg;
    float aura = exp(-max(length(q * vec2(0.85, 1.05)) - 0.55, 0.0) * 3.2);
    vec3 orange = hsv2rgb(vec3(fract(0.065 + hue), 0.95, 1.0));
    col += orange * aura * (0.10 + uD6 * 0.40) * (0.6 + inner * 0.5);

    // --- cuerpo: cinco gajos ---
    float body = 1e3;
    float lobeShade = 0.0;
    float groove = 0.0;
    for (int i = -2; i <= 2; i++) {
        float fi = float(i);
        vec2 c = vec2(fi * 0.21, 0.0);
        vec2 r = vec2(0.36 - abs(fi) * 0.045, 0.50 - abs(fi) * 0.035);
        vec2 d = (q - c) / r;
        float e = (length(d) - 1.0) * min(r.x, r.y);
        if (e < body) {
            body = e;
            lobeShade = 1.0 - clamp(length(d), 0.0, 1.0);
        }
    }
    // surcos: donde dos gajos se encuentran
    for (int i = -2; i <= 1; i++) {
        float gx = (float(i) + 0.5) * 0.21;
        groove = max(groove, exp(-pow((q.x - gx) / 0.035, 2.0)));
    }
    float bodyMask = 1.0 - smoothstep(-0.004, 0.004, body);

    vec3 skinDark = hsv2rgb(vec3(fract(0.045 + hue), 1.0, 0.30));
    vec3 skinLit = hsv2rgb(vec3(fract(0.075 + hue), 0.92, 0.95));
    float relief = 0.45 + 0.55 * uD5;
    float shade = mix(0.35, 1.0, pow(lobeShade, 0.6)) * (1.0 - groove * 0.6 * relief);
    // luz de la llama que atraviesa la cascara cerca de los huecos
    float faceD = hwFace(q, uD4);
    float spill = exp(-max(faceD, 0.0) * 9.0);
    vec3 skin = mix(skinDark, skinLit, shade);
    skin *= 0.78 + 0.22 * fbm(q * vec2(3.0, 1.4) + 2.0, 3);
    skin += orange * spill * inner * 0.45;
    col = mix(col, skin, bodyMask);

    // --- tallo ---
    vec2 sq = q - vec2(0.03, 0.55);
    sq = rot2(0.25) * sq;
    float stem = max(abs(sq.x) - 0.045 + sq.y * 0.05, abs(sq.y) - 0.09);
    float stemMask = 1.0 - smoothstep(-0.004, 0.004, stem);
    col = mix(col, vec3(0.08, 0.10, 0.03) * (0.7 + 0.5 * noise21(sq * 40.0)), stemMask);

    // --- huecos tallados: se ve la llama ---
    float hole = (1.0 - smoothstep(-0.005, 0.005, faceD)) * bodyMask;
    vec3 flameCore = vec3(1.0, 0.92, 0.55);
    vec3 flameEdge = hsv2rgb(vec3(fract(0.08 + hue), 0.95, 1.0));
    float flameN = fbm(vec2(q.x * 6.0, q.y * 4.0 - t * 2.2), 3);
    vec3 flame = mix(flameEdge, flameCore, smoothstep(0.35, 0.80, flameN)) * inner * 1.25;
    // borde interior mas oscuro (grosor de la cascara)
    float wall = smoothstep(-0.035, -0.004, faceD);
    flame = mix(flame, skinDark * 0.6, wall * 0.55);
    // piano: los ojos brillan
    float eyes = step(0.12, q.y) * step(q.y, 0.36);
    flame += flameCore * eyes * uKeypulse * (0.6 + uKeyvel);
    col = mix(col, flame, hole);
    col += flameEdge * edgeLine(faceD, 2.0) * bodyMask * inner * 0.35;

    // --- brasas que suben ---
    float nEmb = 18.0 + uD3 * 40.0 + uDensity * 12.0;
    vec2 ep = p * vec2(1.0, 1.0);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 g = vec2(ep.x * (nEmb * 0.25 + fi * 3.0), ep.y * 3.0 - t * (0.35 + fi * 0.18) - hit * 0.3);
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        vec2 h = hash22(id + fi * 13.0);
        f -= (h - 0.5) * 0.7;
        float alive = step(0.55 - uD3 * 0.25, hash21(id + 7.0));
        float ember = exp(-dot(f, f) * 260.0) * alive;
        col += orange * ember * (0.9 + hit * 1.2) * smoothstep(0.9, -0.6, p.y);
    }

    col *= vignette(uv, 0.40);
    return vec4(col, 1.0);
}
