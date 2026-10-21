// ===============================================================
// HALLOWEEN 18 - TUNEL DE CALAVERAS
// Una catacumba de verdad: pasillo con boveda de cañon cuyas paredes
// son hileras de calaveras apiladas con filas de puntas de femur entre
// ellas (LAMINAS que se repiten sin costura, plates/scene18, ver
// td/tools/bake_plates_catacumba.py), piso de losas con huesos sueltos,
// antorchas a los costados y una luz al fondo. Se avanza por el tunel.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> la luz del fondo late y las antorchas crecen
//   medios -> el tunel gira despacio
//   agudos -> titilan los ojos encendidos
//   golpe  -> un anillo de luz viaja por las paredes hacia la camara
//             (D3); con Chaos el tunel se retuerce
// PIANO: cada tecla enciende un anillo de ojos en las paredes, a una
//   profundidad segun la nota (graves cerca, agudos al fondo); la fuerza lo
//   hace mas brillante; apretada sigue encendido.
// Speed (y D2) avanzan por el tunel aun en silencio.
// HISTORIA: cada acto el tunel gira para otro lado.
// CLIMAX (~97 s, 18 s, en tres tiempos): aceleron, las antorchas pasan
//   cada vez mas rapido; los ojos se encienden en una ola que viene hacia
//   la camara; frenada brusca con sacudida y polvo; al final las antorchas
//   parpadean un instante. Cada ~4.5 min mas largo (gran climax).
//
// @D1: calaveras por vuelta (tamano de las hileras)
// @D2: velocidad de avance (encima de Speed)
// @D3: anillo de luz con el golpe
// @D4: ojos encendidos
// @D5: color de la luz (antorcha <-> verde)
// @D6: niebla del tunel
// ===============================================================

const float FLOOR_Y = -0.75;
const float ARCH_Y = 0.15;
const float HALF_W = 1.0;

vec4 t18Tex(int which, vec2 uv, float lod) {
    // laminas que se repiten: muestreo con nivel de mip calculado a mano
    // (con fract la derivada salta y el mip automatico dejaria una linea)
    if (which == 0) return plate0WrapLod(uv, lod);
    if (which == 1) return plate1WrapLod(uv, lod);
    if (which == 2) return plate2WrapLod(uv, lod);
    return plate3WrapLod(uv, lod);
}
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv))));
    // sacudida y golpe de zoom de la frenada del climax (se aplica a la
    // camara, antes de todo lo demas)
    {
        vec4 C0 = hkClimaxOr(hkGrandClimax(4.0), hkClimax(4.0, 97.0, 18.0));
        float br = C0.w > 0.70 ? exp(-(C0.w - 0.70) * 40.0) : 0.0;
        p += (vec2(noise21(vec2(uRTime * 40.0, 1.0)), noise21(vec2(uRTime * 40.0, 4.0))) - 0.5) * 0.08 * br;
        p *= 1.0 - 0.06 * br;
    }
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    vec3 lightC = mix(vec3(1.0, 0.55, 0.22), vec3(0.35, 1.0, 0.45), uD5);
    vec4 G = hkGrandClimax(4.0);
    vec4 CC = hkClimaxOr(G, hkClimax(4.0, 97.0, 18.0));
    float cph = CC.w;
    // aceleron: avance extra que crece con el cuadrado de la fase y se
    // congela de golpe en 0.70 (frenada). Al terminar el climax ese avance
    // vuelve a 0: lo tapa un parpadeo de las antorchas (blink).
    float rush = cph > 0.0 ? 22.0 * min(cph, 0.70) * min(cph, 0.70) : 0.0;
    float travel = t * (0.6 + uD2 * 1.6) + rush;
    float brake = cph > 0.70 ? exp(-(cph - 0.70) * 40.0) : 0.0;
    float blink = smoothstep(0.93, 0.97, cph) * (1.0 - smoothstep(0.985, 1.0, cph));
    // ola de ojos hacia la camara en el pico
    float eyeWaveZ = mix(24.0, 0.5, clamp((cph - 0.35) / 0.33, 0.0, 1.0));
    float eyeWaveA = step(0.35, cph) * (1.0 - smoothstep(0.80, 0.92, cph));
    float eyesAll = 0.0;
    float tile = mix(1.25, 0.60, uD1);

    // rayo de la camara (con giro lento; la locura retuerce el tunel)
    float roll = (hkActVal(5.0) > 0.5 ? 1.0 : -1.0) * (0.06 * sin(t * 0.13) + mid * 0.05);
    vec3 d = normalize(vec3(p * 0.62, 1.0));
    float twist = hit * loco * 0.5 * sin(uRTime * 3.0);
    float ca = cos(roll), sa = sin(roll);
    d.xy = mat2(ca, sa, -sa, ca) * d.xy;

    // paredes, boveda o piso
    float tw = HALF_W / max(abs(d.x), 1e-4);
    float yw = d.y * tw;
    int surf;
    float th;
    vec2 tuv;
    vec3 N, T, B;
    if (yw >= FLOOR_Y && yw <= ARCH_Y) {
        surf = 0; th = tw;
        float z = th * d.z + travel;
        tuv = vec2(z, yw - FLOOR_Y) / tile;
        N = vec3(-sign(d.x), 0.0, 0.0); T = vec3(0.0, 0.0, sign(d.x)); B = vec3(0.0, 1.0, 0.0);
    } else if (yw > ARCH_Y) {
        surf = 1;
        float a = dot(d.xy, d.xy), b = -2.0 * ARCH_Y * d.y, c = ARCH_Y * ARCH_Y - HALF_W * HALF_W;
        th = (-b + sqrt(max(b * b - 4.0 * a * c, 0.0))) / (2.0 * a);
        vec3 hp = d * th;
        float ang = atan(hp.x, hp.y - ARCH_Y);                     // 0 arriba
        float z = th * d.z + travel;
        tuv = vec2(z, (ARCH_Y - FLOOR_Y) + (1.5708 - abs(ang)) * HALF_W) / tile;
        N = -normalize(vec3(hp.x, hp.y - ARCH_Y, 0.0)); T = vec3(0.0, 0.0, 1.0); B = cross(N, T);
    } else {
        surf = 2;
        th = FLOOR_Y / min(d.y, -1e-4);
        vec3 hp = d * th;
        tuv = vec2(hp.x, hp.z + travel) / (tile * 1.4);
        N = vec3(0.0, 1.0, 0.0); T = vec3(1.0, 0.0, 0.0); B = vec3(0.0, 0.0, 1.0);
    }
    tuv.y += twist * 0.2 * sin(th * 0.8);
    float graz = max(abs(dot(d, N)), 0.12);
    float lod = log2(max(th * 1.24 / uResH / graz / tile * 768.0, 1.0));
    vec3 hp = d * th;

    vec4 ac = t18Tex(surf == 2 ? 2 : 0, tuv, lod);
    vec4 an = t18Tex(surf == 2 ? 3 : 1, tuv, lod);
    vec3 alb = plateCol(ac.rgb);
    vec2 nxy = an.rg * 2.0 - 1.0;
    vec3 n = normalize(T * nxy.x + B * nxy.y + N * sqrt(max(1.0 - dot(nxy, nxy), 0.05)));

    // luz: antorchas a los costados (las 3 mas cercanas), fondo y anillo
    vec3 L = vec3(0.008, 0.007, 0.006);
    float zw = hp.z + travel;
    float k0 = floor(zw / 3.0);
    for (int k = -1; k <= 1; k++) {
        float kk = k0 + float(k);
        float side = mod(kk, 2.0) < 1.0 ? -1.0 : 1.0;
        vec3 lp = vec3(side * 0.88, -0.05, kk * 3.0 + 1.5 - travel);
        vec3 lv = lp - hp;
        float d2 = dot(lv, lv);
        float fl = 0.8 + 0.2 * noise21(vec2(t * 8.0, kk));
        L += vec3(1.0, 0.55, 0.22) * fl * (0.8 + bass * 0.5) * max(dot(n, normalize(lv)), 0.0) * 0.55 / (0.12 + d2);
    }
    // luz del fondo: llega por el pasillo
    L += lightC * (0.25 + bass * 0.5) * max(dot(n, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5, 0.0) * exp(-max(30.0 - th, 0.0) * 0.09) * 0.3;
    // anillo del golpe que viaja hacia la camara
    float ringZ = mix(18.0, 0.5, fract(uRTime * 0.8));
    L += lightC * exp(-pow((th * d.z - ringZ) * 1.2, 2.0)) * hit * (0.4 + uD3 * 2.0);
    vec3 col = alb * L * 3.0;

    // ojos que se encienden
    if (surf < 2) {
        vec2 cell = floor(tuv * vec2(6.0, 4.0));
        float th4 = 0.93 - uD4 * 0.45;
        float on = smoothstep(th4 - 0.02, th4 + 0.02, hash21(cell + 7.0));
        // climax: la ola de ojos viene hacia la camara
        float zc = th * d.z;
        float waveK = eyeWaveA * (exp(-pow((zc - eyeWaveZ) * 0.7, 2.0)) * 2.0 + step(zc, eyeWaveZ) * smoothstep(0.35, 0.68, cph) * 0.6);
        float keyRing = 0.0;
        // piano: anillos de ojos a la profundidad de la nota
        for (int k = 0; k < N_KEYS; k++) {
            float e = keyEnv(k, 0.04, 0.8);
            if (e < 0.01) continue;
            float zk = 1.2 + keyPos(k) * 12.0;
            keyRing = max(keyRing, e * (0.6 + keyVel(k)) * exp(-pow((zc - zk) * 0.8, 2.0)));
        }
        // la ola del climax: blanco caliente; el piano: rojo, sobre los ojos de siempre
        col += vec3(1.0, 0.92, 0.75) * an.b * waveK * 0.9 * exp(-th * 0.06);
        col += vec3(1.0, 0.12, 0.05) * (an.b * 3.0 + 0.18) * keyRing * exp(-th * 0.05);
        col += lightC * an.b * on * (0.35 + bass * 0.6 + high * 0.4 * sin(t * 20.0 + cell.x)) * exp(-th * 0.10);
    }
    // antorchas visibles (llama y soporte)
    for (int k = -1; k <= 2; k++) {
        float kk = k0 + float(k);
        float side = mod(kk, 2.0) < 1.0 ? -1.0 : 1.0;
        vec3 lp = vec3(side * 0.88, -0.05, kk * 3.0 + 1.5 - travel);
        if (lp.z < 0.2) continue;
        vec2 sp = lp.xy / lp.z / 0.62;
        vec2 sq = p - mat2(ca, -sa, sa, ca) * sp;
        float sz = 0.10 / lp.z;
        vec2 fq = sq / sz;
        fq.x += (noise21(vec2(fq.y * 1.5 - t * 6.0, kk)) - 0.5) * 0.5 * max(fq.y + 0.3, 0.0);
        float fl = 1.0 - smoothstep(0.4, 1.0, length(fq * vec2(1.0, 0.55)) + max(fq.y, 0.0) * 0.25);
        col += mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.9, 0.6), fl) * fl * 1.5 * step(lp.z, th + 0.3);
        col += vec3(1.0, 0.5, 0.18) * exp(-length(sq) / (sz * 2.5)) * 0.25;
    }
    // niebla y resplandor del fondo
    float fog = 1.0 - exp(-th * (0.05 + uD6 * 0.16));
    col = mix(col, lightC * (0.10 + bass * 0.15), fog);
    col += lightC * exp(-length(p) * (5.0 - bass * 2.0)) * (0.5 + bass);
    // polvo de la frenada y parpadeo final
    col += vec3(0.55, 0.45, 0.35) * brake * 0.25 * hkParticles(p * 2.0, uRTime, 0.3, vec2(0.0, -0.3), 0.05);
    col *= 1.0 - blink * 0.92;

    return vec4(hkFinish(col, uv, vec3(0.6, 0.35, 0.1)), 1.0);
}
