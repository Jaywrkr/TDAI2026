// HALLOWEEN VJ 45 — REVELADO: la mansion (laminas de la 26) casi a oscuras; solo se prenden
// PEDAZOS del arte, cada uno con su luz de color que dibuja el relieve (tablas, molduras,
// tejas), y saltan a otros pedazos con el ritmo. Algunas ventanas se encienden como ojos.
// @D1: cuantos pedazos se prenden
// @D2: cada cuanto cambian (4 tiempos -> cada tiempo)
// @D3: tamano de los pedazos
// @D4: ventanas que se encienden
// @D5: calabaza/violeta a magenta/cian
// @D6: luna y cielo
// PIANO: cada nota prende los pedazos de su lado. Momento: se revela la casa entera.

#define MN_NW 19
const vec4 MN_WIN[19] = vec4[19](
    vec4(-0.76, -0.30, 0.070, 0.100), vec4(-0.50, -0.30, 0.070, 0.100),
    vec4(0.50, -0.30, 0.070, 0.100), vec4(0.76, -0.30, 0.070, 0.100),
    vec4(-0.76, 0.05, 0.070, 0.100), vec4(-0.50, 0.05, 0.070, 0.100),
    vec4(-0.17, 0.05, 0.070, 0.100), vec4(0.17, 0.05, 0.070, 0.100),
    vec4(0.50, 0.05, 0.070, 0.100), vec4(0.76, 0.05, 0.070, 0.100),
    vec4(-0.55, 0.355, 0.050, 0.065), vec4(0.55, 0.355, 0.050, 0.065),
    vec4(0.00, 0.60, 0.075, 0.105),
    vec4(-1.47, -0.30, 0.065, 0.100), vec4(-1.17, -0.30, 0.065, 0.100),
    vec4(-1.34, 0.17, 0.060, 0.060),
    vec4(1.20, -0.30, 0.055, 0.100), vec4(1.20, 0.05, 0.055, 0.100),
    vec4(1.20, 0.38, 0.050, 0.080)
);
const vec4 PL_R = vec4(-3.4, -1.25, 6.8, 2.5);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// celda de Voronoi: (id, distancia al borde)
vec3 rvCell(vec2 x) {
    vec2 n = floor(x), f = fract(x);
    vec2 mg = vec2(0.0), mr = vec2(0.0);
    float md = 8.0;
    for (int j = -1; j <= 1; j++)
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < md) { md = d; mr = r; mg = g; }
        }
    md = 8.0;
    for (int j = -2; j <= 2; j++)
        for (int i = -2; i <= 2; i++) {
            vec2 g = mg + vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            vec2 r = g + o - f;
            if (dot(mr - r, mr - r) > 1e-5) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
        }
    vec2 id = n + mg;
    return vec3(hash21(id), hash21(id + 17.3), md);
}

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float hit = hkHit(), B = hkBass(), st = hkStepBeat();
    vec4 C = hkClimax(45.0, 149.0, 22.0);
    float has = uMbeat > 0.05 ? 1.0 : 0.0;
    float ph = has > 0.5 ? fract((uRTime - uManchor) / uMbeat) : fract(uRTime * 0.5);
    float every = uD2 < 0.34 ? 4.0 : (uD2 < 0.67 ? 2.0 : 1.0);
    float k = has > 0.5 ? floor(st / every) : floor(uRTime / 2.0);
    float since = has > 0.5 ? fract(st / every) : fract(uRTime / 2.0);

    vec2 pu = rUV(p);
    vec4 fa = plate0(pu);
    vec4 rl = plate3(pu);
    vec3 nrm = vec3(rl.rg * 2.0 - 1.0, 0.0);
    nrm.z = sqrt(max(1.0 - dot(nrm.xy, nrm.xy), 0.0));
    nrm = normalize(mix(vec3(0.0, 0.0, 1.0), nrm, rl.a));
    vec3 alb = plateCol(fa.rgb);

    // cielo: azul muy oscuro abajo, negro arriba; luna tenue
    vec3 sky = mix(vec3(0.015, 0.03, 0.12), vec3(0.0), smoothstep(-0.9, 1.0, p.y)) * hkDR(0.1, 0.9, 2.0, uD6);
    vec2 mq = p - vec2(-1.75, 0.72);
    sky += vec3(0.5, 0.55, 0.8) * (smoothstep(0.17, 0.16, length(mq)) * 0.25 + exp(-length(mq) * 3.0) * 0.06) * hkDR(0.0, 0.5, 1.8, uD6);

    // pedazos del arte
    vec3 cv = rvCell(p * hkDR(5.0, 2.4, 0.9, uD3) + 3.0);
    float dens = hkDR(0.0, 0.31, 0.85, uD1) + 0.12 * B;
    float on = step(hash21(vec2(cv.x * 91.0, k)), dens);
    // piano: prende los pedazos de su lado
    for (int kk = 0; kk < N_KEYS; kk++) {
        float ek = keyEnv(kk, 0.04, 0.8);
        if (ek > 0.2 && abs(uv.x - keyPos(kk)) < 0.12) on = max(on, ek);
    }
    on = max(on, C.y);
    float attack = 1.0 + 0.8 * exp(-since * every * 6.0) * has;
    // cada pedazo es un foco: mas luz al centro, se apaga hacia el borde
    float lit = on * smoothstep(0.0, 0.22, cv.z);

    // luz de color de este pedazo: viene de su propio angulo, rasante
    vec3 pA = mix(vec3(1.0, 0.42, 0.04), vec3(1.0, 0.08, 0.5), step(0.5, uD5));
    vec3 pB = mix(vec3(0.6, 0.2, 1.0), vec3(0.1, 0.85, 1.0), step(0.5, uD5));
    vec3 pC = vec3(0.45, 1.0, 0.15);
    float pick = floor(cv.y * 3.0 + k * 0.37);
    vec3 lc = mod(pick, 3.0) < 1.0 ? pA : (mod(pick, 3.0) < 2.0 ? pB : pC);
    float a = cv.y * TAU + k * 1.7 + 0.3 * sin(uRTime * 0.7 + cv.x * 6.0);
    vec3 L = normalize(vec3(cos(a), sin(a), 0.35));
    float dif = max(dot(nrm, L), 0.0);
    float sp = max(dot(reflect(-L, nrm), vec3(0.0, 0.0, 1.0)), 0.0);
    float spe = smoothstep(0.86, 0.9, sp);
    float rimt = (1.0 - nrm.z) * max(dot(normalize(nrm.xy + 1e-4), L.xy), 0.0);
    float rim = smoothstep(0.08, 0.14, rimt);
    // poca luz de relleno: lo que se ve son los filos del relieve encendidos
    vec3 piece = (alb * lc * (0.3 + 2.4 * dif * dif) + lc * (spe * 1.2 + rim * 1.2)) * 1.6;

    // la casa casi negra; el pedazo prendido se revela
    vec3 house = alb * vec3(0.04, 0.05, 0.09) + piece * lit * attack * (0.8 + 0.4 * hit);
    // ventanas que se encienden como ojos
    vec3 eyes = vec3(0.0);
    for (int i = 0; i < MN_NW; i++) {
        vec4 w = MN_WIN[i];
        vec2 d2 = abs(p - w.xy) - w.zw;
        float d = length(max(d2, 0.0)) + min(max(d2.x, d2.y), 0.0);
        if (d > 0.05) continue;
        float wo = step(hash21(vec2(float(i), floor(st / 2.0) + 3.0)), hkDR(0.0, 0.29, 0.85, uD4)) * (0.35 + 0.45 * B + 0.6 * hit);
        eyes += vec3(1.0, 0.45, 0.08) * (smoothstep(0.004, -0.004, d) * 0.9 + exp(-max(d, 0.0) * 60.0) * 0.25) * wo;
    }
    vec3 col = mix(sky, house + eyes, fa.a);
    // barrido de luz muy tenue que cruza de lado a lado cada 8 tiempos
    float sweep = exp(-pow((p.x - (fract(st / 8.0) * 2.0 - 1.0) * uAspect * 1.2) * 2.5, 2.0)) * has;
    col += alb * fa.a * pA * sweep * 0.35 * (0.5 + B);
    col += (hash21(uv * 1000.0 + floor(uRTime * 24.0)) - 0.5) * 0.012;
    return vec4(hkFinish(max(col, 0.0), uv, vec3(0.0)), 1.0);
}
