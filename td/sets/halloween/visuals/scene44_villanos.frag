// HALLOWEEN VJ 44 — VILLANOS: caras de villanos en estilo caricatura de los 80 (colores planos,
// contorno grueso, VHS). Hechicero calavera, vampiro, bruja, rey calabaza y demonio.
// @D1: una cara / trio / pared de caras
// @D2: VHS (colores corridos, rayas, temblor)
// @D3: tramas y detalles de la ilustracion
// @D4: cuanto bailan (cabeceo y mandibula)
// @D5: paleta clasica a paleta alterna
// @D6: estrellas y halo de fondo
// PIANO: cada nota enciende los ojos de su villano. Momento: todos gritan.

#define V_OUT vec3(0.035, 0.012, 0.09)

float vlE(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return (length(q) - 1.0) * min(r.x, r.y); }
float vlB(vec2 p, vec2 c, vec2 b, float rad) { return hkBox(p - c, b - rad) - rad; }
float vlT(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
    vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
    vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                     vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                 vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
}
float vlS(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

// capa con contorno grueso oscuro y relleno plano
void vlLay(inout vec3 col, inout float al, float d, vec3 c, float aa) {
    float o = smoothstep(aa, -aa, d - 0.05);
    col = mix(col, V_OUT, o); al = max(al, o);
    col = mix(col, c, smoothstep(aa, -aa, d));
}
// detalle interior sin contorno
void vlFlat(inout vec3 col, float d, vec3 c, float aa) { col = mix(col, c, smoothstep(aa, -aa, d)); }
// trama de puntos (halftone) dentro de una zona
float vlDots(vec2 q, float s) { vec2 g = fract(q * s) - 0.5; return smoothstep(0.32, 0.22, length(g)); }

// dientes: fila de rectangulos redondeados entre x0..x1 a la altura y
void vlTeeth(inout vec3 col, vec2 q, float y, float x0, float x1, float h, vec3 c, float aa) {
    float w = (x1 - x0) / 7.0;
    float cx = clamp(floor((q.x - x0) / w), 0.0, 6.0);
    float d = vlB(q, vec2(x0 + (cx + 0.5) * w, y), vec2(w * 0.42, h), 0.02);
    vlFlat(col, d - 0.012, V_OUT, aa);
    vlFlat(col, d, c, aa);
}

// Un villano en q (alto ~2, y hacia arriba). vec4(color, cobertura).
vec4 vlVillain(float id, vec2 q, float jaw, float eye, float alt, float aa) {
    vec3 col = vec3(0.0);
    float al = 0.0;
    float det = 0.4 + 0.6 * uD3;
    if (id < 0.5) {
        // ---- HECHICERO CALAVERA ENCAPUCHADO ----
        vec3 hood = mix(vec3(0.38, 0.08, 0.62), vec3(0.12, 0.48, 0.2), alt);
        vec3 inner = mix(vec3(0.92, 0.13, 0.14), vec3(0.95, 0.45, 0.05), alt);
        vec3 skull = mix(vec3(0.72, 1.0, 0.28), vec3(0.98, 0.92, 0.7), alt);
        float dh = vlS(vlE(q, vec2(0.0, -0.18), vec2(0.82, 0.86)), vlT(q, vec2(0.0, 1.05), vec2(-0.62, 0.15), vec2(0.62, 0.15)), 0.12);
        vlLay(col, al, dh, hood, aa);
        float di = vlS(vlE(q, vec2(0.0, -0.18), vec2(0.66, 0.72)), vlT(q, vec2(0.0, 0.86), vec2(-0.5, 0.1), vec2(0.5, 0.1)), 0.1);
        vlLay(col, al, di, inner, aa);
        // rayas de la capucha abajo
        vlFlat(col, max(di, -(q.y + 0.45)) + 0.0, inner * (0.75 + 0.25 * step(0.5, fract(q.y * 14.0))), aa);
        // cuello / pechera
        vlLay(col, al, vlB(q, vec2(0.0, -0.95), vec2(0.42, 0.14), 0.05), vec3(0.1, 0.75, 0.85), aa);
        // calavera
        float ds = vlS(vlE(q, vec2(0.0, 0.08), vec2(0.46, 0.5)), vlB(q, vec2(0.0, -0.36 - jaw * 0.5), vec2(0.33, 0.2), 0.08), 0.08);
        vlLay(col, al, ds, skull, aa);
        // frente con trama
        float df = vlT(q, vec2(0.0, 0.62), vec2(-0.3, 0.3), vec2(0.3, 0.3));
        vlFlat(col, df, mix(skull, inner, vlDots(q, 18.0) * det), aa);
        vlFlat(col, abs(q.x) - 0.025 + max(q.y - 0.62, 0.0) * 10.0 + step(q.y, 0.18) * 10.0, vec3(0.1, 0.75, 0.85), aa);
        // cejas, cuencas y ojos
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vec2 e = rot2(-fs * 0.35) * (q - vec2(fs * 0.19, 0.14));
            vlFlat(col, vlE(e, vec2(0.0), vec2(0.15, 0.09)), V_OUT, aa);
            float g = vlE(e, vec2(0.0, -0.01), vec2(0.045, 0.035));
            col += vec3(1.0, 0.15, 0.05) * smoothstep(0.05, -0.02, g) * eye;
            vlFlat(col, hkSeg(q, vec2(fs * 0.08, 0.27), vec2(fs * 0.36, 0.36)) - 0.022, V_OUT, aa);
            // mejillas
            vlFlat(col, hkSeg(q, vec2(fs * 0.16, -0.08), vec2(fs * 0.36, -0.02)) - 0.03, vec3(0.1, 0.75, 0.85), aa);
        }
        vlFlat(col, vlT(q, vec2(0.0, -0.08), vec2(-0.06, 0.04), vec2(0.06, 0.04)), V_OUT, aa);
        // boca
        vlFlat(col, vlB(q, vec2(0.0, -0.26 - jaw * 0.25), vec2(0.27, 0.05 + jaw * 0.25), 0.04), V_OUT, aa);
        vlTeeth(col, q, -0.2, -0.25, 0.25, 0.05, vec3(1.0, 0.98, 0.9), aa);
        vlTeeth(col, q, -0.31 - jaw * 0.5, -0.23, 0.23, 0.045, vec3(1.0, 0.98, 0.9), aa);
    } else if (id < 1.5) {
        // ---- VAMPIRO ----
        vec3 cape = mix(vec3(0.85, 0.05, 0.08), vec3(0.45, 0.1, 0.75), alt);
        vec3 skin = mix(vec3(0.78, 0.74, 1.0), vec3(0.75, 0.95, 0.8), alt);
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vlLay(col, al, vlT(q, vec2(fs * 0.05, -1.0), vec2(fs * 0.95, -0.95), vec2(fs * 0.75, 0.45)), cape, aa);
            vlFlat(col, vlT(q, vec2(fs * 0.12, -0.95), vec2(fs * 0.75, -0.88), vec2(fs * 0.6, 0.2)), vec3(0.05, 0.02, 0.06), aa);
            vlLay(col, al, vlT(q, vec2(fs * 0.4, 0.15), vec2(fs * 0.62, 0.42), vec2(fs * 0.42, 0.0)), skin, aa);   // oreja
        }
        float face = vlS(vlE(q, vec2(0.0, 0.05), vec2(0.42, 0.56)), vlT(q, vec2(0.0, -0.72), vec2(-0.3, -0.25), vec2(0.3, -0.25)), 0.1);
        vlLay(col, al, face, skin, aa);
        // pelo con pico de viuda: casquete negro arriba de una linea en V
        float hairline = 0.2 + 0.16 * min(abs(q.x) / 0.28, 1.0);
        float hair = max(vlE(q, vec2(0.0, 0.16), vec2(0.47, 0.5)), hairline - q.y);
        vlLay(col, al, hair, vec3(0.2, 0.08, 0.34), aa);
        vlFlat(col, max(hair + 0.03, abs(fract(q.x * 9.0) - 0.5) - 0.06), vec3(0.42, 0.24, 0.62) * det, aa);   // brillo del pelo
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vlFlat(col, vlE(q, vec2(fs * 0.25, -0.12), vec2(0.08, 0.14)), skin * 0.8, aa);          // ojeras
            vec2 e = rot2(fs * 0.25) * (q - vec2(fs * 0.17, 0.08));
            vlFlat(col, vlE(e, vec2(0.0), vec2(0.11, 0.045)), V_OUT, aa);
            col += vec3(1.0, 0.05, 0.05) * smoothstep(0.03, -0.02, vlE(e, vec2(0.0), vec2(0.08, 0.03))) * (0.6 + eye);
            vlFlat(col, hkSeg(q, vec2(fs * 0.06, 0.18), vec2(fs * 0.3, 0.25)) - 0.025, V_OUT, aa);
        }
        vlFlat(col, vlT(q, vec2(0.0, -0.12), vec2(-0.05, 0.02), vec2(0.05, 0.02)), skin * 0.7, aa);
        // boca con colmillos
        vlFlat(col, vlE(q, vec2(0.0, -0.33 - jaw * 0.2), vec2(0.17, 0.035 + jaw * 0.25)), vec3(0.25, 0.0, 0.03), aa);
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vlFlat(col, vlT(q, vec2(fs * 0.1, -0.31), vec2(fs * 0.06, -0.31), vec2(fs * 0.085, -0.42 - jaw * 0.1)), vec3(1.0), aa);
        }
    } else if (id < 2.5) {
        // ---- BRUJA ----
        vec3 hat = mix(vec3(0.42, 0.1, 0.72), vec3(0.1, 0.42, 0.18), alt);
        vec3 skin = mix(vec3(0.45, 0.88, 0.22), vec3(0.62, 0.9, 0.55), alt);
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vlLay(col, al, vlT(q, vec2(fs * 0.25, 0.3), vec2(fs * 0.62, -0.75), vec2(fs * 0.25, -0.6)), vec3(0.1, 0.06, 0.12), aa);   // pelo
        }
        float face = vlS(vlE(q, vec2(0.0, -0.05), vec2(0.42, 0.52)), vlT(q, vec2(0.05, -0.75), vec2(-0.25, -0.35), vec2(0.3, -0.35)), 0.1);
        vlLay(col, al, face, skin, aa);
        // sombrero
        vlLay(col, al, vlT(q, vec2(0.35, 1.18), vec2(-0.42, 0.42), vec2(0.42, 0.42)), hat, aa);
        vlLay(col, al, vlE(q, vec2(0.0, 0.4), vec2(0.85, 0.12)), hat, aa);
        vlFlat(col, vlB(q, vec2(0.0, 0.5), vec2(0.38, 0.06), 0.01), vec3(1.0, 0.5, 0.05), aa);
        vlFlat(col, vlB(q, vec2(0.0, 0.5), vec2(0.07, 0.07), 0.01) , vec3(1.0, 0.85, 0.2), aa);
        vlFlat(col, vlB(q, vec2(0.0, 0.5), vec2(0.035, 0.035), 0.005), hat, aa);
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vec2 e = rot2(-fs * 0.2) * (q - vec2(fs * 0.17, 0.08));
            vlFlat(col, vlE(e, vec2(0.0), vec2(0.11, 0.07)), V_OUT, aa);
            vlFlat(col, vlE(e, vec2(0.0), vec2(0.08, 0.05)), vec3(1.0, 0.9, 0.1) * (0.6 + 0.6 * eye), aa);
            vlFlat(col, vlE(e, vec2(0.0), vec2(0.015, 0.045)), V_OUT, aa);
            vlFlat(col, hkSeg(q, vec2(fs * 0.05, 0.16), vec2(fs * 0.3, 0.25)) - 0.022, V_OUT, aa);
        }
        // nariz ganchuda y verruga
        vlLay(col, al, vlT(q, vec2(0.0, 0.05), vec2(0.2, -0.22), vec2(-0.04, -0.12)), skin * 0.85, aa);
        vlFlat(col, vlE(q, vec2(0.12, -0.12), vec2(0.03, 0.03)), vec3(0.3, 0.55, 0.1), aa);
        // sonrisa
        float smile = max(vlE(q, vec2(0.0, -0.28 - jaw * 0.2), vec2(0.24, 0.1 + jaw * 0.2)), -vlE(q, vec2(0.0, -0.2), vec2(0.26, 0.08)));
        vlFlat(col, smile, vec3(0.2, 0.0, 0.05), aa);
        vlFlat(col, vlB(q, vec2(-0.08, -0.3), vec2(0.03, 0.035), 0.01), vec3(1.0, 0.95, 0.7), aa);
        vlFlat(col, vlB(q, vec2(0.1, -0.3), vec2(0.03, 0.03), 0.01), vec3(1.0, 0.95, 0.7), aa);
    } else if (id < 3.5) {
        // ---- REY CALABAZA ----
        vec3 pump = mix(vec3(1.0, 0.45, 0.04), vec3(0.95, 0.85, 0.7), alt);
        vec3 fire = vec3(1.0, 0.85, 0.15) * (0.7 + 0.6 * eye);
        vlLay(col, al, vlB(q, vec2(0.0, -0.95), vec2(0.6, 0.18), 0.08), vec3(0.3, 0.06, 0.45), aa);   // cuello de capa
        float pk = min(min(vlE(q, vec2(0.0, -0.1), vec2(0.42, 0.58)), vlE(q, vec2(-0.32, -0.12), vec2(0.36, 0.52))), vlE(q, vec2(0.32, -0.12), vec2(0.36, 0.52)));
        vlLay(col, al, pk, pump, aa);
        for (int s = -1; s <= 1; s += 2)
            vlFlat(col, abs(vlE(q, vec2(float(s) * 0.18, -0.1), vec2(0.18, 0.56))) - 0.015, pump * 0.62, aa);   // gajos
        vlLay(col, al, vlB(q, vec2(0.04, 0.55), vec2(0.06, 0.12), 0.02), vec3(0.25, 0.6, 0.15), aa);   // tallo
        // corona
        float cr = vlB(q, vec2(0.0, 0.47), vec2(0.4, 0.07), 0.01);
        for (int k = 0; k < 5; k++) {
            float x = -0.32 + float(k) * 0.16;
            cr = min(cr, vlT(q, vec2(x - 0.07, 0.5), vec2(x + 0.07, 0.5), vec2(x, 0.72 + 0.04 * mod(float(k), 2.0))));
        }
        vlLay(col, al, cr, vec3(1.0, 0.8, 0.15), aa);
        vlFlat(col, vlB(q, vec2(0.0, 0.47), vec2(0.4, 0.02), 0.0), vec3(0.85, 0.1, 0.1), aa);
        // ojos, nariz y boca tallados que brillan
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vlFlat(col, vlT(q, vec2(fs * 0.08, 0.02), vec2(fs * 0.36, 0.02), vec2(fs * 0.24, 0.24)) - 0.01, V_OUT, aa);
            vlFlat(col, vlT(q, vec2(fs * 0.11, 0.035), vec2(fs * 0.33, 0.035), vec2(fs * 0.24, 0.19)), fire, aa);
        }
        vlFlat(col, vlT(q, vec2(-0.06, -0.15), vec2(0.06, -0.15), vec2(0.0, -0.05)), fire, aa);
        float mouth = vlE(q, vec2(0.0, -0.35 - jaw * 0.15), vec2(0.34, 0.1 + jaw * 0.2));
        float zig = q.y - (-0.3 - jaw * 0.1 + 0.05 * abs(fract(q.x * 6.0) - 0.5) * 2.0);
        vlFlat(col, max(mouth, -zig * 0.0) - 0.01, V_OUT, aa);
        vlFlat(col, max(mouth + 0.01, max(zig - 0.0, -(q.y + 0.47 + jaw * 0.25 - 0.05 * abs(fract(q.x * 6.0 + 0.5) - 0.5) * 2.0))), fire, aa);
    } else {
        // ---- DEMONIO ----
        vec3 skin = mix(vec3(0.88, 0.1, 0.08), vec3(0.55, 0.12, 0.7), alt);
        vec3 horn = vec3(0.95, 0.88, 0.7);
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vlLay(col, al, vlT(q, vec2(fs * 0.18, 0.4), vec2(fs * 0.38, 0.3), vec2(fs * 0.62, 0.98)), horn, aa);
            vlLay(col, al, vlT(q, vec2(fs * 0.38, 0.12), vec2(fs * 0.62, 0.32), vec2(fs * 0.4, -0.08)), skin, aa);   // oreja
        }
        float face = vlS(vlE(q, vec2(0.0, 0.05), vec2(0.43, 0.5)), vlT(q, vec2(0.0, -0.85), vec2(-0.32, -0.25), vec2(0.32, -0.25)), 0.1);
        vlLay(col, al, face, skin, aa);
        vlFlat(col, vlE(q, vec2(0.0, 0.3), vec2(0.3, 0.12)) , skin * mix(1.0, 0.75, vlDots(q, 20.0) * det), aa);   // frente con trama
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vlFlat(col, vlT(q, vec2(fs * 0.06, 0.12), vec2(fs * 0.34, 0.12), vec2(fs * 0.3, 0.0)) - 0.025, V_OUT, aa);
            vlFlat(col, vlT(q, vec2(fs * 0.09, 0.115), vec2(fs * 0.3, 0.115), vec2(fs * 0.27, 0.03)), vec3(1.0, 0.9, 0.1) * (0.6 + 0.7 * eye), aa);
            vlFlat(col, hkSeg(q, vec2(fs * 0.04, 0.2), vec2(fs * 0.36, 0.3)) - 0.035, V_OUT, aa);
        }
        vlFlat(col, vlT(q, vec2(0.0, -0.62), vec2(-0.12, -0.42), vec2(0.12, -0.42)), V_OUT, aa);   // chivita
        vlFlat(col, vlB(q, vec2(0.0, -0.27 - jaw * 0.2), vec2(0.2, 0.04 + jaw * 0.22), 0.03), vec3(0.15, 0.0, 0.02), aa);
        for (int s = -1; s <= 1; s += 2) {
            float fs = float(s);
            vlFlat(col, vlT(q, vec2(fs * 0.15, -0.24), vec2(fs * 0.08, -0.24), vec2(fs * 0.115, -0.36 - jaw * 0.1)), vec3(1.0), aa);
        }
    }
    return vec4(col, al);
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float hit = hkHit(), B = hkBass(), st = hkStepBeat();
    vec4 C = hkClimax(44.0, 151.0, 22.0);
    float bt = uMbeat > 0.05 ? uMbeat : 0.5;
    float ph = uMbeat > 0.05 ? fract((uRTime - uManchor) / uMbeat) : fract(uRTime * 2.0);
    float dance = 0.4 + 0.9 * uD4;
    float vhs = 0.3 + 0.7 * uD2;
    float alt = step(0.5, uD5);
    // fondo: negro con estrellas y halo de color detras de las caras
    vec3 col = vec3(0.004, 0.002, 0.01);
    vec2 sg = floor(uv * vec2(uAspect, 1.0) * 90.0);
    col += vec3(0.8, 0.85, 1.0) * step(0.985, hash21(sg)) * (0.3 + 0.7 * hash21(sg + 3.0)) * uD6 * 0.5;
    // distribucion: 1 cara, trio o pared
    float mode = uD1 < 0.34 ? 0.0 : (uD1 < 0.67 ? 1.0 : 2.0);
    float cell = 0.0, sc = 1.0;
    vec2 q = p;
    if (mode < 0.5) {
        sc = 0.9;
    } else if (mode < 1.5) {
        cell = clamp(floor(p.x / (uAspect * 2.0 / 3.0) + 1.5), 0.0, 2.0);
        q.x -= (cell - 1.0) * uAspect * 2.0 / 3.0;
        sc = cell == 1.0 ? 0.82 : 0.62;
    } else {
        vec2 n = vec2(5.0, 2.0);
        vec2 g = (uv * n);
        vec2 id = floor(g);
        cell = id.x + id.y * n.x;
        q = (fract(g) - 0.5) * vec2(uAspect * 2.0 / n.x, 2.0 / n.y);
        sc = 0.42;
    }
    // que villano: cambia cada 8 tiempos (cada casillero su propio villano)
    float round8 = floor(st / 8.0);
    float id = mod(floor(hash21(vec2(cell, round8)) * 5.0 + cell * 2.0 + round8), 5.0);
#ifdef VL_FORCE
    id = VL_FORCE;
#endif
    // baile: cabeceo en el golpe, balanceo con el bajo, cada casillero a destiempo
    float off = mode > 1.5 ? mod(cell, 2.0) * 0.5 : 0.0;
    float bob = pow(1.0 - fract(ph + off), 3.0) * (uMbeat > 0.05 ? 1.0 : 0.0);
    q.y -= -0.06 * bob * dance * sc + 0.02 * sin(uRTime * 1.7 + cell) * sc;
    q = rot2(0.06 * sin(st * PI * 0.5 + cell) * dance + 0.03 * B * sin(uRTime * 3.0)) * q;
    q /= sc * (1.0 + 0.05 * hit * dance + 0.04 * C.y);
    float jaw = (0.1 * hit + 0.05 * B) * dance + 0.12 * C.y;
    float eye = 0.3 + B + hit;
    for (int k = 0; k < N_KEYS; k++) {
        float ek = keyEnv(k, 0.04, 0.8);
        if (ek > 0.001) eye += ek * 1.5 * step(abs(keyPos(k) * (mode < 1.5 ? 3.0 : 10.0) - cell - 0.5), 0.5 + step(mode, 0.5) * 10.0);
    }
    // cambio de villano con glitch: rebanadas corridas en el primer tramo
    float swap = (uMbeat > 0.05 && mod(floor(st), 8.0) < 0.5) ? (1.0 - smoothstep(0.0, 0.35, fract(st))) : 0.0;
    float slice = floor(uv.y * 30.0);
    q.x += (hash21(vec2(slice, floor(uRTime * 20.0))) - 0.5) * 0.25 * swap * step(0.6, hash21(vec2(slice, 7.0)));
    // VHS: colores corridos (cada canal lee la cara un poco movida), temblor por renglon
    float aa = 2.5 / max(uResH, 1.0) / sc;
    float jit = (hash21(vec2(floor(uv.y * 160.0), floor(uRTime * 30.0))) - 0.5) * 0.006 * vhs * (0.3 + hit);
    q.x += jit / sc;
    float split = (0.008 + 0.025 * hit) * vhs / sc;
    vec4 fr = vlVillain(id, q + vec2(split, 0.0), jaw, eye, alt, aa);
    vec4 fg = vlVillain(id, q, jaw, eye, alt, aa);
    vec4 fb = vlVillain(id, q - vec2(split, 0.0), jaw, eye, alt, aa);
    vec3 face = vec3(fr.r, fg.g, fb.b);
    float a = max(fg.a, max(fr.a, fb.a));
    // halo detras
    vec3 halo = mix(vec3(0.5, 0.1, 0.9), vec3(1.0, 0.4, 0.05), mod(id, 2.0)) * smoothstep(1.4, 0.3, length(q)) * 0.12 * uD6 * (0.6 + B);
    col = mix(col + halo, face, a);
    // rayas de VHS y grano
    col *= 1.0 - 0.18 * vhs * (0.5 + 0.5 * sin(uv.y * uResH * 1.3));
    col += (hash21(uv * vec2(uResH * uAspect, uResH) + floor(uRTime * 24.0)) - 0.5) * 0.06 * vhs;
    col = max(col, 0.0);
    col = hkKeyLit(col, p, 0.0, vec2(0.36, 0.9), vec3(1.0, 0.5, 0.1), vec3(0.6, 0.2, 1.0), 0.04, 0.8);
    return vec4(hkFinish(pow(col, vec3(2.2)), uv, vec3(0.0)), 1.0);
}
