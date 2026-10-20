// ===============================================================
// KIT DE HALLOWEEN - funciones compartidas por las escenas del set
// Se agrega al final del header de cada escena (set.json "prelude").
// Todo empieza con "hk" para no chocar con las funciones de cada .frag.
//
// LOCURA: la perilla Chaos (knob 4) es la "locura" de todo el set.
// En 0 las escenas son cinematograficas y sobrias; arriba suman
// sacudida de camara, destellos, aberracion y elementos extra con el
// golpe. Ninguna escena depende de ella para verse bien.
// ===============================================================

float hkHit() { return clamp(max(uKick, uBeat * 0.75), 0.0, 1.0) * uAudioamt; }
float hkLoco() { return clamp(uChaos, 0.0, 1.0); }

// Sacudida de camara con el golpe, proporcional a la locura. Ruido
// suave (no un salto aleatorio por frame): se lee como impacto, no
// como error.
vec2 hkShake(vec2 p) {
    float a = hkHit() * hkLoco();
    if (a < 0.002) return p;
    float tt = uRTime * 23.0;
    vec2 o = vec2(noise21(vec2(tt, 1.3)), noise21(vec2(tt, 7.9))) - 0.5;
    return p + o * a * 0.07;
}

// Zoom de impacto: el cuadro se acerca un pelo en el golpe.
vec2 hkPunch(vec2 p) {
    return p * (1.0 - hkHit() * (0.015 + hkLoco() * 0.035));
}

float hkBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float hkRBox(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
float hkSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}
float hkSmin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}
// Linea de ancho fijo en pixeles (sin fwidth: seguro dentro de bucles
// con 'continue', donde las derivadas no valen).
float hkLine(float d, float px) {
    return 1.0 - smoothstep(0.0, px * 2.0 / uResH, abs(d));
}

// Niebla con dominio deformado: mas organica que un fbm plano.
float hkFog(vec2 p, float t) {
    vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05), 3), fbm(p + vec2(5.2, 1.3) - t * 0.04, 3));
    return fbm(p + q * 1.6 + vec2(t * 0.03, 0.0), 4, 0.55);
}

// Rayos de luz (god rays) falsos desde 'src': estrias radiales de ruido
// que se apagan con la distancia. 'occ' oscurece donde hay cosas.
float hkRays(vec2 p, vec2 src, float t, float spread) {
    vec2 d = p - src;
    float r = length(d);
    float a = atan(d.y, d.x);
    float s = noise21(vec2(a * spread, t * 0.15)) * 0.65 +
              noise21(vec2(a * spread * 2.7 + 3.0, -t * 0.11)) * 0.35;
    s = smoothstep(0.35, 0.95, s);
    return s * exp(-r * 1.2) * smoothstep(0.0, 0.25, r);
}

// Particulas (chispas, polvo, brasas): capas de celdas con un punto
// cada una. dir = direccion del viaje (0,1 sube). Devuelve intensidad.
float hkParticles(vec2 p, float t, float density, vec2 dir, float size) {
    float acc = 0.0;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float sc = 6.0 + fi * 5.0;
        vec2 g = p * sc - dir * t * (0.6 + fi * 0.35) * sc * 0.15 + fi * 17.0;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        vec2 h = hash22(id + fi * 31.0);
        f -= (h - 0.5) * 0.7;
        float on = step(1.0 - density, hash21(id + fi * 7.0));
        float tw = 0.6 + 0.4 * sin(t * (3.0 + h.x * 5.0) + h.y * 30.0);
        acc += exp(-dot(f, f) / (size * size * (1.0 + fi * 0.5))) * on * tw * (1.0 - fi * 0.25);
    }
    return acc;
}

// Rayo quebrado vertical entre y0 (arriba) e y1 (abajo) en x0.
float hkBolt(vec2 p, float x0, float y0, float y1, float seed, float amp) {
    if (p.y > y0 || p.y < y1) return 1e3;
    float k = (y0 - p.y) / max(y0 - y1, 1e-3);
    float x = x0 + (noise21(vec2(p.y * 5.0, seed)) - 0.5) * amp * k
                 + (noise21(vec2(p.y * 21.0, seed + 3.0)) - 0.5) * amp * 0.25;
    return abs(p.x - x);
}

// Tonemap filmico (ACES aproximado): los brillos se comprimen con
// gracia en vez de quemarse en blanco plano.
vec3 hkACES(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// Acabado de cine para TODO el set: exposicion, tonemap, negros con
// un poco de color (tint), grano y un parpadeo de proyector viejo que
// crece con la locura. Llamarlo una vez, al final de render().
vec3 hkFinish(vec3 col, vec2 uv, vec3 tint) {
    float loco = hkLoco();
    float hit = hkHit();
    col *= 1.15;
    col = hkACES(col);
    col = max(col, tint * 0.018);
    float g = hash21(uv * vec2(uResW, uResH) + fract(uRTime * 13.0) * 91.0) - 0.5;
    col += g * (0.022 + loco * 0.03);
    float flicker = 1.0 - loco * 0.06 * (0.5 + 0.5 * sin(uRTime * 31.0)) * step(0.4, noise21(vec2(uRTime * 6.0, 2.0)));
    col *= flicker * (1.0 + hit * loco * 0.12);
    float v = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(uAspect * 0.85, 1.0)));
    col *= mix(0.55, 1.0, v);
    return max(col, 0.0);
}
