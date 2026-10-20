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

// Niebla con dominio deformado, barata: la deformacion sale de dos
// noise21 (no de dos fbm) y el detalle de un fbm de 3 octavas.
float hkFog(vec2 p, float t) {
    vec2 q = vec2(noise21(p * 0.9 + vec2(0.0, t * 0.05)), noise21(p * 0.9 + vec2(5.2, 1.3) - t * 0.04));
    return fbm(p + q * 1.4 + vec2(t * 0.03, 0.0), 3, 0.55);
}

// ---------------------------------------------------------------
// HISTORIA: que pasen cosas durante 20-25 minutos sin costo extra.
// Todo esto es aritmetica sobre el reloj (igual para todos los pixeles),
// no trabajo por pixel. Usa uRTime: se detiene en silencio y sigue con
// la musica.
// ---------------------------------------------------------------
#define HK_ACT 78.0          // segundos por acto (16 actos ~ 21 minutos)

// Acto actual (entero) y avance dentro del acto (0..1).
vec2 hkAct() {
    float a = uRTime / HK_ACT;
    return vec2(floor(a), fract(a));
}

// Valor aleatorio estable por acto, con un fundido suave hacia el del
// acto siguiente en los ultimos segundos (nada salta de golpe).
float hkActVal(float seed) {
    vec2 a = hkAct();
    float v0 = hash21(vec2(a.x, seed + float(uScene) * 7.13));
    float v1 = hash21(vec2(a.x + 1.0, seed + float(uScene) * 7.13));
    return mix(v0, v1, smoothstep(0.82, 1.0, a.y));
}

// Evento propio de la escena: aparece una vez cada 'every' segundos en
// un momento al azar, sube, dura 'len' segundos y baja. 0..1.
float hkEvent(float seed, float every, float len) {
    float slot = floor(uRTime / every);
    float start = hash21(vec2(slot, seed + float(uScene))) * (every - len - 2.0);
    float k = uRTime - slot * every - start;
    return smoothstep(0.0, 1.2, k) * (1.0 - smoothstep(len - 1.5, len, k));
}

// Avance 0..1 dentro del mismo evento (para cosas que cruzan la
// pantalla de un lado al otro mientras dura). Fuera del evento: 0.
float hkEventPhase(float seed, float every, float len) {
    float slot = floor(uRTime / every);
    float start = hash21(vec2(slot, seed + float(uScene))) * (every - len - 2.0);
    return clamp((uRTime - slot * every - start) / len, 0.0, 1.0);
}

// Camara lenta de documental: cada acto encuadra un poco distinto
// (acercamiento y paneo suaves). Mantiene el centro de interes.
vec2 hkCam(vec2 p) {
    float z = mix(0.88, 1.10, hkActVal(91.0));
    vec2 pan = (vec2(hkActVal(92.0), hkActVal(93.0)) - 0.5) * vec2(0.18, 0.08);
    float drift = sin(uRTime * 0.021 + float(uScene)) * 0.03;
    return p * z + pan + vec2(drift, 0.0);
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

// ---------------------------------------------------------------
// NOCHE (uNight 0..1): la fiesta avanza de 22:00 a 05:30 y el set se
// va poniendo mas oscuro y mas gore: menos colores (solo sobreviven los
// rojos, naranjas y el fuego), negros mas profundos, brillos mas
// fuertes, y alrededor de la pantalla aparecen cosas chiquitas que van
// sumando: humo y brasas (desde 0.15), telaranas y murcielagos en las
// esquinas (0.35), fuego que lame el borde de abajo (0.55), sangre que
// chorrea del borde de arriba (0.70) y un latido rojo en los bordes con
// el bombo (0.85). Todo vive en los bordes: el centro de cada escena no
// se tapa. Fuera de los bordes no se calcula nada (barato).
// ---------------------------------------------------------------
float hkNightK(float from, float to) { return smoothstep(from, to, uNight); }

vec3 hkNightGrade(vec3 col) {
    float n = uNight;
    if (n < 0.005) return col;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    // cuanto de calido tiene el pixel (rojo/naranja/fuego sobreviven)
    float warm = smoothstep(0.02, 0.25, col.r - max(col.g * 0.85, col.b));
    vec3 mono = vec3(lum) * vec3(1.0, 0.92, 0.88);
    vec3 keep = col * vec3(1.10, 0.78, 0.65);
    col = mix(col, mix(mono, keep, warm), n * 0.80);
    // negros mas profundos, brillos mas fuertes
    col = pow(max(col, 0.0), vec3(1.0 + n * 0.55)) * (1.0 + n * 0.35);
    col += max(col - 0.45, 0.0) * n * 0.6;
    return col;
}

vec3 hkNightFrame(vec3 col, vec2 uv) {
    float n = uNight;
    if (n < 0.12) return col;
    float hit = hkHit();
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    vec2 q = (uv - 0.5) * vec2(uAspect, 1.0) * 2.0;          // -aspect..aspect, -1..1
    float ex = uAspect - abs(q.x);                           // distancia al borde lateral
    float eb = q.y + 1.0;                                    // al borde de abajo
    float et = 1.0 - q.y;                                    // al borde de arriba
    float edge = min(min(ex, eb), et);
    if (edge > 0.55) return col;                             // centro: nada
    float t = uRTime;

    // humo que se arrastra por los bordes
    float kSmoke = hkNightK(0.12, 0.45);
    if (kSmoke > 0.0) {
        float sm = noise21(vec2(q.x * 1.4 - t * 0.05, q.y * 1.8 + t * 0.03)) * noise21(vec2(q.x * 3.1 + t * 0.04, q.y * 2.6 - 1.7));
        col = mix(col, vec3(0.03, 0.025, 0.03), smoothstep(0.10, 0.35, sm) * smoothstep(0.55, 0.0, edge) * 0.6 * kSmoke);
    }
    // brasas que suben por los costados
    float kEmb = hkNightK(0.15, 0.50);
    if (kEmb > 0.0 && ex < 0.6) {
        float em = hkParticles(q * 0.9, t * 0.8, 0.08 + 0.12 * n + hit * 0.1, vec2(0.0, 1.0), 0.03);
        col += vec3(1.0, 0.45, 0.10) * em * smoothstep(0.6, 0.0, ex) * kEmb * 1.4;
    }
    // telaranas en las esquinas de arriba
    float kWeb = hkNightK(0.35, 0.60);
    if (kWeb > 0.0 && et < 0.7 && ex < 0.9) {
        for (int s = -1; s <= 1; s += 2) {
            vec2 c = vec2(float(s) * uAspect, 1.0);
            vec2 d = (q - c) * vec2(-float(s), -1.0);
            float r = length(d);
            if (r > 0.65 || d.x < 0.0 || d.y < 0.0) continue;
            float a = atan(d.y, d.x);
            float spoke = abs(fract(a / 1.5708 * 6.0) - 0.5) * 1.5708 / 6.0 * r;
            float ring = abs(fract(r * 10.0 + 0.2 * sin(a * 6.0)) - 0.5) / 10.0;
            float w = hkLine(min(spoke, ring), 0.6) * smoothstep(0.65, 0.2, r);
            col = mix(col, vec3(0.55, 0.55, 0.58), w * 0.5 * kWeb);
        }
    }
    // murcielaguitos que revolotean en las esquinas
    float kBat = hkNightK(0.40, 0.70);
    if (kBat > 0.0 && edge < 0.45) {
        for (int i = 0; i < 4; i++) {
            float fi = float(i);
            float side = mod(fi, 2.0) * 2.0 - 1.0;
            vec2 c = vec2(side * (uAspect - 0.25 - 0.15 * sin(t * 0.5 + fi * 2.0)), (fi < 2.0 ? 0.70 : -0.55) + 0.12 * sin(t * 0.9 + fi * 1.3));
            vec2 bq = (q - c) / 0.045;
            if (dot(bq, bq) > 4.0) continue;
            float ax = abs(bq.x);
            float y = bq.y - sin(t * 14.0 + fi * 2.0) * 0.5 * ax + 0.25 * ax * ax;
            float wing = max(abs(y) - 0.12 * (1.0 - ax), ax - 1.0);
            float bat = min(wing, length(bq / vec2(0.35, 0.22)) - 1.0);
            col = mix(col, vec3(0.0), (1.0 - smoothstep(-0.05, 0.05, bat)) * kBat);
        }
    }
    // fuego que lame el borde de abajo: lenguas sueltas, no una franja
    float kFire = hkNightK(0.55, 0.85);
    if (kFire > 0.0 && eb < 0.40) {
        float h = (0.06 + 0.14 * kFire) * (1.0 + bass * 0.5 + hit * 0.4);
        float tongue = h * (0.25 + 1.1 * pow(noise21(vec2(q.x * 5.0, t * 0.7)), 1.5) + 0.4 * noise21(vec2(q.x * 13.0, t * 1.3)));
        float lick = noise21(vec2(q.x * 9.0, eb * 10.0 - t * 3.0));
        float fl = smoothstep(tongue, tongue * 0.25, eb) * (0.45 + 0.75 * lick);
        vec3 fc = mix(vec3(0.70, 0.08, 0.01), vec3(1.0, 0.55, 0.12), smoothstep(0.35, 1.0, fl));
        fc = mix(fc, vec3(1.0, 0.85, 0.45), smoothstep(0.85, 1.1, fl) * smoothstep(0.05, 0.0, eb));
        col = col * (1.0 - fl * 0.5 * kFire) + fc * fl * 1.1 * kFire;
        col += vec3(0.9, 0.25, 0.05) * exp(-eb * 9.0) * 0.08 * kFire * (1.0 + bass);
    }
    // sangre que chorrea desde el borde de arriba
    float kBlood = hkNightK(0.70, 0.95);
    if (kBlood > 0.0 && et < 0.6) {
        float cw = 0.06;
        float cid = floor(q.x / cw);
        float h1 = hash21(vec2(cid, 3.0)), h2 = hash21(vec2(cid, 9.0));
        float x0 = (cid + 0.5 + (h2 - 0.5) * 0.4) * cw;
        float len = (0.04 + 0.45 * h1 * h1) * kBlood * smoothstep(0.0, 0.8, fract(t * (0.03 + 0.05 * h2) + h1));
        float w = cw * (0.10 + 0.12 * h2) * mix(1.4, 0.7, clamp(et / max(len, 1e-3), 0.0, 1.0));
        float strand = max(abs(q.x - x0) - w, et - len);
        float band = et - (0.03 + 0.02 * noise21(vec2(q.x * 6.0, 1.0))) * kBlood;
        float drop = length(vec2(q.x - x0, (et - len) * 0.8)) - w * 1.5;
        float bd = min(min(strand, band), drop);
        float bm = 1.0 - smoothstep(-0.003, 0.003, bd);
        vec3 bc = vec3(0.35, 0.0, 0.0) * (0.6 + 0.6 * smoothstep(0.004, -0.02, bd)) + vec3(0.6, 0.3, 0.3) * hkLine(bd + 0.006, 0.8) * 0.4;
        col = mix(col, bc, bm);
    }
    // latido rojo en los bordes con el bombo (redondeado, como un vineteo)
    float kBeat = hkNightK(0.85, 1.0);
    if (kBeat > 0.0) {
        float rad = length(q / vec2(uAspect, 1.0));
        col += vec3(0.45, 0.0, 0.0) * smoothstep(0.80, 1.25, rad) * (0.12 + hit * 0.55 + bass * 0.15) * kBeat;
    }
    return col;
}

// Acabado de cine para TODO el set: exposicion, tonemap, negros con
// un poco de color (tint), grano y un parpadeo de proyector viejo que
// crece con la locura. Llamarlo una vez, al final de render().
vec3 hkFinish(vec3 col, vec2 uv, vec3 tint) {
    float loco = hkLoco();
    col = hkNightFrame(hkNightGrade(col), uv);
    col *= 1.15;
    col = hkACES(col);
    col = max(col, tint * 0.018);
    // grano: un hash barato por pixel (sin noise21)
    vec2 gp = uv * vec2(uResW, uResH) + fract(uRTime * 13.0) * 91.0;
    col += (fract(sin(dot(gp, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * (0.022 + loco * 0.03);
    // parpadeo de proyector: solo con locura (el valor es igual para toda
    // la imagen, asi que en 0 no se calcula)
    if (loco > 0.01) {
        float fl = step(0.4, fract(sin(floor(uRTime * 6.0) * 17.31) * 4371.7));
        col *= (1.0 - loco * 0.06 * (0.5 + 0.5 * sin(uRTime * 31.0)) * fl) * (1.0 + hkHit() * loco * 0.12);
    }
    vec2 vq = (uv - 0.5) * vec2(uAspect * 0.85, 1.0);
    col *= mix(0.55 - uNight * 0.30, 1.0, smoothstep(1.56 - uNight * 0.5, 0.06, dot(vq, vq)));
    return max(col, 0.0);
}
