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

// CLIMAX EN TRES TIEMPOS: aviso -> pico -> secuelas, en vez de un golpe
// que aparece y se va. Mismo calendario que hkEvent(seed, every, len).
//   x: aviso    0..1, crece despacio durante el primer 35 % (la luz baja,
//               el viento sube) y se queda en 1 hasta que pasan las secuelas
//   y: pico     0..1, la parte fuerte (35 %..70 %), con entrada y salida suaves
//   z: secuelas 0..1, sube al terminar el pico y se apaga al final
//   w: fase     0..1 a lo largo de todo el climax (0 fuera de el)
// Ademas, cada ~4.5 min (hkGrand) el climax de la escena coincide con su
// otro evento: ver hkGrand().
vec4 hkClimaxShape(float k, float len) {
    float ph = clamp(k / len, 0.0, 1.0);
    float inside = step(0.0, k) * step(k, len);
    float pre = smoothstep(0.0, 0.35, ph) * (1.0 - smoothstep(0.9, 1.0, ph));
    float peak = smoothstep(0.33, 0.42, ph) * (1.0 - smoothstep(0.62, 0.72, ph));
    float post = smoothstep(0.62, 0.72, ph) * (1.0 - smoothstep(0.85, 1.0, ph));
    return vec4(pre, peak, post, ph) * inside;
}

// MOMENTO (pad 16, control_script.triggerMoment): el climax a mano. uMoment
// es el kclock en que se pidio (-1 = nunca). Mientras dura, hkClimax y
// hkGrandClimax devuelven ESTE climax (el gran climax, con su otro evento)
// y el calendario automatico se calla. Debe coincidir con MOMENT_SECONDS.
#define HK_MOMENT_LEN 22.0
float hkMomentK() { return uMoment > 0.0 ? uKclock - uMoment : -1.0; }
bool hkMomentOn() { float k = hkMomentK(); return k >= 0.0 && k <= HK_MOMENT_LEN; }

vec4 hkClimaxAuto(float seed, float every, float len) {
    float slot = floor(uRTime / every);
    float start = hash21(vec2(slot, seed + float(uScene))) * (every - len - 2.0);
    return hkClimaxShape(uRTime - slot * every - start, len);
}

vec4 hkClimax(float seed, float every, float len) {
#ifdef HK_STILL
    return vec4(0.0);      // miniaturas (render_thumbs.py): la escena en reposo
#endif
    if (hkMomentOn()) return hkClimaxShape(hkMomentK(), HK_MOMENT_LEN);
    return hkClimaxAuto(seed, every, len);
}

// Gran climax: una vez cada ~4.5 min (26 s), el climax principal de la
// escena llega junto con su otro evento, mas grande. Mismo formato que
// hkClimax. hkClimaxOr: mientras dura el gran climax, reemplaza al comun
// (no se suman: dos climax a medias se verian como ninguno). El MOMENTO
// (pad) es siempre un gran climax.
vec4 hkGrandClimax(float seed) {
#ifdef HK_STILL
    return vec4(0.0);
#endif
    if (hkMomentOn()) return hkClimaxShape(hkMomentK(), HK_MOMENT_LEN);
    return hkClimaxAuto(seed + 500.0, 270.0, 26.0);
}
vec4 hkClimaxOr(vec4 grand, vec4 c) { return grand.w > 0.0 ? grand : c; }

// Dentro de un climax de fase ph: cuanto esta "apagado" un elemento que
// se apaga en el aviso (en el punto o, 0..1 del aviso) y vuelve en las
// secuelas (en el punto r, 0..1 de las secuelas). 0 fuera del climax.
float hkOffWindow(float ph, float o, float r) {
    if (ph <= 0.0) return 0.0;
    float a = 0.02 + o * 0.30, b = 0.70 + r * 0.22;
    return smoothstep(a, a + 0.04, ph) * (1.0 - smoothstep(b, b + 0.04, ph));
}

// ---------------------------------------------------------------
// REPERTORIO DE SUCESOS (fase 30, docs/53): que una escena aguante media
// hora sin repetirse. Cuatro niveles, todo aritmetica sobre el reloj:
//   DETALLE     cada ~30 s  algo chico (6-8 variantes)
//   SUCESO      cada ~55 s  una mini historia (5-9 variantes); con la
//               Noche avanzada y el Miedo, otro entre medio
//   CLIMAX      cada ~4 min  uno de 3 guiones (rotan)
//   GRAN CLIMAX uno de cada tres climax (~12 min) o con el pad Momento
// Mas el ESTADO de la escena, que cambia cada ~5 min (clima, actividad).
// Las variantes salen de una PERMUTACION por ciclo: en cada vuelta salen
// todas una vez, en otro orden, y nunca la misma dos veces seguidas. Cada
// vez trae ademas una semilla propia (que ventana, que lado, que chimenea).
// Ningun suceso ni detalle cae encima de un climax (se calla 4 s antes y
// vuelve 4 s despues).
// Uso en una escena: al principio de render() hkSetClimax(semilla, largo);
// despues hkClimaxV / hkGrandV / hkSuceso / hkDetalle / hkEstadoW.
// ---------------------------------------------------------------
#define HK_CLX_EVERY 240.0    // climax (s)
#define HK_ESTADO 300.0       // estado de la escena (s)

float hkCSeed = -1.0;   // climax de la escena (lo fija hkSetClimax)
float hkCLen = 20.0;
float hkGLen = 26.0;
void hkSetClimax(float seed, float len, float grandLen) { hkCSeed = seed; hkCLen = len; hkGLen = grandLen; }

// elemento i de una permutacion de n (n <= 9) propia del ciclo 'cyc':
// (a*i + b) mod n con 'a' coprimo con n, los dos al azar por ciclo. Es una
// cuenta (no un ordenamiento): el calendario cuesta casi nada por pixel.
// coprimos de n (1..n-1) para n = 0..9, de a 6 por fila (tabla: sin bucles)
const int HK_COP[60] = int[60](
    1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1,
    1, 2, 1, 1, 1, 1,
    1, 3, 1, 1, 1, 1,
    1, 2, 3, 4, 1, 1,
    1, 5, 1, 1, 1, 1,
    1, 2, 3, 4, 5, 6,
    1, 3, 5, 7, 1, 1,
    1, 2, 4, 5, 7, 8);
const int HK_NCOP[10] = int[10](1, 1, 1, 2, 2, 4, 2, 6, 4, 6);
int hkPermRaw(float cyc, float seed, int i, int n) {
    float h1 = hash21(vec2(cyc * 1.37, seed + float(uScene) * 3.3));
    float h2 = hash21(vec2(cyc * 2.11 + 5.0, seed + float(uScene) * 3.3));
    int a = HK_COP[n * 6 + int(floor(h1 * float(HK_NCOP[n])))];
    int v = a * i + int(floor(h2 * float(n)));
    return v - (v / n) * n;
}
// variante del casillero 'slot': recorre la permutacion de su ciclo (cada
// variante una vez por vuelta) y en el borde entre vueltas no repite las
// dos ultimas de la vuelta anterior (con n >= 5; con menos, la ultima)
int hkPick(float slot, float seed, int n) {
    if (n <= 1) return 0;
    float cyc = floor(slot / float(n));
    int i = int(slot - cyc * float(n));
    int q1 = hkPermRaw(cyc - 1.0, seed, n - 1, n);
    if (n < 5) {
        int first = hkPermRaw(cyc, seed, 0, n);
        if (first == q1) {
            if (i == 0) return hkPermRaw(cyc, seed, 1, n);
            if (i == 1) return first;
        }
        return hkPermRaw(cyc, seed, i, n);
    }
    if (i > 3) return hkPermRaw(cyc, seed, i, n);
    // se reordenan los primeros cuatro: el 1ro no es ninguno de los 3
    // ultimos de la vuelta anterior, el 2do ninguno de los 2 ultimos y el
    // 3ro no es el ultimo (un climax puede comerse hasta dos casilleros)
    int q2 = hkPermRaw(cyc - 1.0, seed, n - 2, n);
    int q3 = hkPermRaw(cyc - 1.0, seed, n - 3, n);
    int e[4];
    for (int k = 0; k < 4; k++) e[k] = hkPermRaw(cyc, seed, k, n);
    for (int pos = 0; pos < 3; pos++) {
        for (int k = 0; k < 4; k++) {
            if (k < pos) continue;
            int x = e[k];
            bool bad = x == q1 || (pos < 2 && x == q2) || (pos < 1 && x == q3);
            if (!bad) {
                int tmp = e[pos]; e[pos] = e[k]; e[k] = tmp;
                break;
            }
        }
    }
    return e[i];
}

// El climax cae cerca del MEDIO de su casillero de 4 min (+-40 s): entre
// dos climax hay de 2.5 a 5.5 min. Uno de cada tres casilleros es el GRAN
// climax (en vez del comun, nunca pegado a el).
bool hkIsGrandSlot(float slot) { return mod(slot + floor(hkCSeed), 3.0) > 1.5; }
float hkClxLenAt(float slot) { return hkIsGrandSlot(slot) ? hkGLen : hkCLen; }
float hkClxStartSlot(float slot) {
    float len = hkClxLenAt(slot);
    return slot * HK_CLX_EVERY + 0.5 * (HK_CLX_EVERY - len) + (hash21(vec2(slot, hkCSeed + float(uScene))) - 0.5) * 80.0;
}
// hay un climax entre a y b, con 4 s de margen?
bool hkClxNear(float a, float b) {
    if (hkCSeed < 0.0) return false;
    float s = floor(a / HK_CLX_EVERY);
    for (int k = -1; k <= 1; k++) {
        float sl = s + float(k);
        float c0 = hkClxStartSlot(sl);
        if (b > c0 - 4.0 && a < c0 + hkClxLenAt(sl) + 4.0) return true;
    }
    return false;
}

// variante del climax comun que toca ahora. Se cuentan solo los
// casilleros comunes (los del gran climax no gastan variante), asi nunca
// sale el mismo dos veces seguidas aunque haya un gran climax en medio.
int hkClimaxVar(int n) {
    float slot = floor(uRTime / HK_CLX_EVERY);
    if (hkMomentOn()) slot += 1.0;
    float g = floor((slot + floor(hkCSeed)) / 3.0);        // grandes ya pasados
    float ordinal = slot - g;
    return hkPick(ordinal, hkCSeed + 41.0, n);
}
// climax comun de la escena: mismo formato que hkClimax (aviso, pico,
// secuelas, fase). En el casillero del gran climax devuelve 0.
vec4 hkClimaxV() {
#ifdef HK_STILL
    return vec4(0.0);
#endif
    if (hkMomentOn()) return hkClimaxShape(hkMomentK(), HK_MOMENT_LEN);
    float slot = floor(uRTime / HK_CLX_EVERY);
    if (hkIsGrandSlot(slot)) return vec4(0.0);
    return hkClimaxShape(uRTime - hkClxStartSlot(slot), hkCLen);
}
vec4 hkGrandV() {
#ifdef HK_STILL
    return vec4(0.0);
#endif
    if (hkMomentOn()) return hkClimaxShape(hkMomentK(), HK_MOMENT_LEN);
    float slot = floor(uRTime / HK_CLX_EVERY);
    if (!hkIsGrandSlot(slot)) return vec4(0.0);
    return hkClimaxShape(uRTime - hkClxStartSlot(slot), hkGLen);
}

// SUCESO / DETALLE: vec4(envolvente 0..1, avance 0..1, variante, semilla
// 0..1). Sin suceso: (0, 0, -1, 0). Un casillero de slotLen segundos trae
// siempre uno, en su primera mitad (salvo cerca de un climax). Con
// 'extra' > 0, la segunda mitad puede traer otro (con esa chance), de una
// variante distinta a la de los dos casilleros vecinos.
// envolvente del suceso que empieza en s0 (o -1 si no hay); la variante
// se calcula afuera y solo si hace falta
float hkHappenEnv(float s0, float len) {
    float k = uRTime - s0;
    if (k < 0.0 || k > len) return -1.0;
    if (hkClxNear(s0, s0 + len)) return -1.0;
    float env = smoothstep(0.0, min(1.2, len * 0.25), k) * (1.0 - smoothstep(len - min(1.5, len * 0.3), len, k));
    float mk = hkMomentK();
    if (mk >= 0.0 && mk <= HK_MOMENT_LEN + 4.0) env *= 1.0 - smoothstep(0.0, 1.0, mk);
    return env;
}
vec4 hkHappen(float seed, float slotLen, float extra, int n, float len) {
#ifdef HK_STILL
    return vec4(0.0, 0.0, -1.0, 0.0);
#endif
    float slot = floor(uRTime / slotLen);
    float hs = slotLen * 0.5;
    float base = slot * slotLen;
    float room = max(hs - len - 2.0, 0.0);
    float sd = hash21(vec2(slot, seed + 19.3 + float(uScene)));
    if (uRTime - base < hs) {
        float s0 = base + 1.0 + hash21(vec2(slot, seed + float(uScene))) * room;
        float env = hkHappenEnv(s0, len);
        if (env < 0.0) return vec4(0.0, 0.0, -1.0, 0.0);
        return vec4(env, clamp((uRTime - s0) / len, 0.0, 1.0), float(hkPick(slot, seed, n)), sd);
    }
    if (hash21(vec2(slot, seed + 7.7 + float(uScene))) >= extra) return vec4(0.0, 0.0, -1.0, 0.0);
    float s0 = base + hs + 1.0 + hash21(vec2(slot, seed + 3.1 + float(uScene))) * room;
    float env = hkHappenEnv(s0, len);
    if (env < 0.0) return vec4(0.0, 0.0, -1.0, 0.0);
    // distinta de los vecinos (tambien de los de al lado, por si un climax
    // se come el casillero de al lado)
    int a = hkPick(slot, seed, n), b = hkPick(slot + 1.0, seed, n);
    int c = hkPick(slot + 2.0, seed, n), d = hkPick(slot - 1.0, seed, n);
    int v = int(floor(hash21(vec2(slot, seed + 11.0 + float(uScene))) * float(n)));
    for (int k = 0; k < 5; k++) {
        if (v != a && v != b && (n < 5 || (v != c && v != d))) break;
        v = int(mod(float(v + 1), float(n)));
    }
    return vec4(env, clamp((uRTime - s0) / len, 0.0, 1.0), float(v),
                hash21(vec2(slot + 0.5, seed + 19.3 + float(uScene))));
}
// un suceso cada ~55 s; con la Noche avanzada y el Miedo, otro en medio
#define HK_SUC_EVERY 55.0
vec4 hkSuceso(float seed, int n, float len) {
    float extra = clamp(0.15 + 0.35 * uNight + 0.55 * clamp(uFear, 0.0, 1.0), 0.0, 0.9);
    return hkHappen(seed, HK_SUC_EVERY, extra, n, len);
}
// un detalle cada ~30 s
#define HK_DET_EVERY 30.0
vec4 hkDetalle(float seed, int n, float len) {
    return hkHappen(seed + 31.0, HK_DET_EVERY, 0.0, n, len);
}

int hkEstadoIdx(float seed, int n) { return hkPick(floor(uRTime / HK_ESTADO), seed + 61.0, n); }

// LINEA DE TIEMPO (td/tools/timeline_sucesos.py): la escena anota lo que
// eligio el calendario; con HK_TIMELINE la herramienta lo lee en vez de
// la imagen. Sin HK_TIMELINE no cuesta nada.
vec4 hkTL0 = vec4(0.0), hkTL1 = vec4(0.0);
void hkTimeline(vec4 suc, vec4 det, vec4 clx, int cvar, float grand, int estado) {
    hkTL0 = vec4(suc.z, suc.x, det.z, det.x);
    hkTL1 = vec4(clx.w > 0.0 ? float(cvar) : -1.0, clx.w, grand, float(estado));
}

// ESTADO de la escena (clima, actividad): pesos 0..1 de los estados 0..3
// (n <= 4), con fundido de 25 s entre uno y el siguiente (suman 1).
vec4 hkEstado(float seed, int n) {
    float a = uRTime / HK_ESTADO;
    float slot = floor(a);
    int s0 = hkPick(slot, seed + 61.0, n);
    int s1 = hkPick(slot + 1.0, seed + 61.0, n);
    float m = smoothstep(1.0 - 25.0 / HK_ESTADO, 1.0, fract(a));
    vec4 w = vec4(0.0);
    for (int i = 0; i < 4; i++) w[i] = (s0 == i ? 1.0 - m : 0.0) + (s1 == i ? m : 0.0);
    return w;
}

// Tecla del piano -> x en pantalla (grave a la izquierda), en las mismas
// coordenadas que centered(): -aspect..aspect.
float hkKeyX(int i) { return mix(-uAspect * 0.85, uAspect * 0.85, keyPos(i)); }

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


// ---------------------------------------------------------------
// ESTILO "AEROGRAFO RETRO" (perilla Estilo = uStyle, marco = uStylearch)
// Como un afiche pintado con aerografo e impreso en papel: formas suaves
// (las laminas se leen desenfocadas, ver set.json "plate_lod"), paleta
// corta negro -> violeta -> naranja -> crema, grano de spray (puntitos
// sueltos donde el tono cambia), polvo y pelusas del papel, y un marco
// de arco negro alrededor. Todo es por pixel y sin texturas: barato.
// ---------------------------------------------------------------
// PALETAS del estilo, de lo oscuro a lo claro (6 tonos cada una). El
// orden es el de set.json "style_palettes" y la perilla Estilopaleta las
// recorre: Calabaza, Sangre, Veneno, Fantasma, Infierno, Hechizo,
// Pantano, Sepia.
#define HK_NPAL 8
const vec3 HK_PAL[48] = vec3[48](
    // Calabaza: negro, violeta, malva, naranja, durazno, crema
    vec3(0.022, 0.018, 0.024), vec3(0.15, 0.065, 0.20), vec3(0.42, 0.22, 0.42), vec3(0.88, 0.36, 0.10), vec3(0.97, 0.68, 0.46), vec3(0.97, 0.93, 0.86),
    // Sangre: negro, ciruela, granate, rojo, rosa sucio, hueso
    vec3(0.020, 0.010, 0.014), vec3(0.12, 0.02, 0.08), vec3(0.42, 0.04, 0.05), vec3(0.78, 0.10, 0.08), vec3(0.92, 0.45, 0.35), vec3(0.95, 0.90, 0.84),
    // Veneno (bruja): negro, violeta oscuro, verde botella, verde toxico, lima, amarillo palido
    vec3(0.016, 0.012, 0.020), vec3(0.12, 0.04, 0.17), vec3(0.10, 0.28, 0.16), vec3(0.36, 0.68, 0.14), vec3(0.78, 0.95, 0.40), vec3(0.94, 0.98, 0.82),
    // Fantasma: negro, azul noche, acero, celeste, hielo, blanco
    vec3(0.010, 0.014, 0.024), vec3(0.05, 0.08, 0.18), vec3(0.20, 0.28, 0.45), vec3(0.48, 0.62, 0.78), vec3(0.78, 0.88, 0.95), vec3(0.96, 0.98, 1.00),
    // Infierno: negro, rojo oscuro, rojo fuego, naranja, ambar, blanco caliente
    vec3(0.018, 0.008, 0.006), vec3(0.22, 0.03, 0.01), vec3(0.62, 0.10, 0.02), vec3(0.95, 0.40, 0.04), vec3(1.00, 0.75, 0.20), vec3(1.00, 0.96, 0.75),
    // Hechizo: negro, indigo, purpura, magenta, rosa, lila
    vec3(0.014, 0.008, 0.024), vec3(0.12, 0.04, 0.25), vec3(0.36, 0.10, 0.52), vec3(0.80, 0.22, 0.62), vec3(0.95, 0.60, 0.82), vec3(0.98, 0.90, 0.97),
    // Pantano: negro, petroleo, musgo, ocre, paja, pergamino
    vec3(0.012, 0.016, 0.014), vec3(0.04, 0.10, 0.09), vec3(0.24, 0.26, 0.10), vec3(0.50, 0.46, 0.16), vec3(0.78, 0.70, 0.40), vec3(0.94, 0.90, 0.76),
    // Sepia: negro, tierra, sepia, tostado, arena, crema
    vec3(0.020, 0.016, 0.012), vec3(0.12, 0.08, 0.05), vec3(0.32, 0.22, 0.13), vec3(0.58, 0.42, 0.26), vec3(0.82, 0.68, 0.50), vec3(0.96, 0.91, 0.82)
);

vec3 hkPalMap(int pi, float l) {
    int b = clamp(pi, 0, HK_NPAL - 1) * 6;
    vec3 c = mix(HK_PAL[b], HK_PAL[b + 1], smoothstep(0.03, 0.28, l));
    c = mix(c, HK_PAL[b + 2], smoothstep(0.28, 0.45, l));
    c = mix(c, HK_PAL[b + 3], smoothstep(0.45, 0.62, l));
    c = mix(c, HK_PAL[b + 4], smoothstep(0.62, 0.80, l));
    return mix(c, HK_PAL[b + 5], smoothstep(0.80, 0.97, l));
}

// Paleta actual: la perilla (fundido corto entre vecinas) o, en modo
// automatico, una al azar por acto con fundido al final del acto.
vec3 hkStyleMap(float l) {
    int i0, i1;
    float k;
    if (uStyleauto > 0.5) {
        vec2 a = hkAct();
        i0 = int(hash21(vec2(a.x, 77.0 + float(uScene))) * float(HK_NPAL));
        i1 = int(hash21(vec2(a.x + 1.0, 77.0 + float(uScene))) * float(HK_NPAL));
        k = smoothstep(0.85, 1.0, a.y);
    } else {
        float f = clamp(uStylepal, 0.0, 1.0) * float(HK_NPAL - 1);
        i0 = int(floor(f));
        i1 = min(i0 + 1, HK_NPAL - 1);
        k = smoothstep(0.3, 0.7, fract(f));
    }
    return mix(hkPalMap(i0, l), hkPalMap(i1, l), k);
}

// Destello en cruz (las estrellitas de 4 puntas de los afiches).
float hkSparkle(vec2 d, float size) {
    vec2 a = abs(d) / size;
    float cross = exp(-a.y * 60.0) * exp(-a.x * 2.2) + exp(-a.x * 60.0) * exp(-a.y * 2.2);
    return cross + exp(-dot(a, a) * 40.0) * 1.5;
}

// Adaptacion por escena (cada escena las llama donde le toca; con
// Estilo en 0 no hacen nada):
// luna como esfera de aerografo con destellos en cruz
vec3 hkStyleMoon(vec3 col, vec2 p, vec2 mc, float R) {
    float s = uStyle;
    if (s < 0.001) return col;
    vec2 mp = p - mc;
    float mr = length(mp);
    col += hkStyleMap(0.85) * exp(-max(mr - R * 0.75, 0.0) * 9.0 / max(R, 0.1) * 0.25) * 0.22 * s;
    col += hkStyleMap(0.98) * hkSparkle(mp - vec2(-0.30, 0.32) * R, 0.55 * R + 0.12) * 0.40 * s;
    for (int k = 0; k < 3; k++) {
        float fk = float(k);
        vec2 sp = mc + vec2(0.45 + fk * 0.20, -0.55 + fk * 0.28) * R;
        col += hkStyleMap(0.95) * exp(-dot(p - sp, p - sp) * 9000.0) * s * (0.5 + 0.5 * sin(uRTime * 3.0 + fk * 2.0));
    }
    return col;
}
// cuanto dejar de los rayos duros (god rays) con el estilo
float hkStyleRays() { return 1.0 - uStyle * 0.85; }
// resplandor de la paleta detras de las siluetas, centrado en la altura y0
vec3 hkStyleBacklight(vec3 col, vec2 p, float y0, float width) {
    float s = uStyle;
    if (s < 0.001) return col;
    float gy = p.y - y0;
    vec3 gc = mix(hkStyleMap(0.60), hkStyleMap(0.92), exp(-abs(gy) * 6.0)) * 1.1;
    float g = exp(-pow((gy + 0.05) / width, 2.0)) * (0.35 + 0.65 * exp(-pow(p.x / (uAspect * 0.7), 2.0)));
    return mix(col, col * 0.45, s * 0.5) + gc * g * s * 0.9;
}
// siluetas mas oscuras contra el resplandor
float hkStyleSil() { return mix(1.0, 0.30, uStyle); }

float hkArchMask(vec2 uv) {
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0) * 2.0;
    float k = uStylearch;
    float w = mix(uAspect + 0.2, 1.25, k);          // medio ancho de la ventana
    float top = mix(1.3, 0.92, k);
    float cy = top - w;                              // centro del semicirculo
    float d = p.y > cy ? length(vec2(p.x, p.y - cy)) - w : abs(p.x) - w;
    d = max(d, -(p.y + mix(1.3, 0.92, k)));         // tambien un margen abajo
    return d;
}

vec3 hkStyle(vec3 col, vec2 uv) {
    float s = clamp(uStyle, 0.0, 1.0);
    vec2 px = uv * vec2(uResW, uResH);
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    l = pow(clamp(l, 0.0, 1.0), 1.05);
    vec3 mapped = hkStyleMap(l);
    // conserva el color propio de lo muy saturado (sangre, fuego, verde
    // toxico, ojos): toma su TONO con la luminancia de la paleta. Antes se
    // media la saturacion absoluta y la sangre oscura caia a violeta.
    float mx = max(col.r, max(col.g, col.b));
    float mn = min(col.r, min(col.g, col.b));
    float sat = (mx - mn) / max(mx, 1e-4);
    float keep = smoothstep(0.55, 0.92, sat) * smoothstep(0.004, 0.03, mx);
    float lm = dot(mapped, vec3(0.2126, 0.7152, 0.0722));
    float lc = dot(col, vec3(0.2126, 0.7152, 0.0722));
    vec3 own = col * clamp(max(lm, lc) / max(lc, 1e-4), 1.0, 3.0);   // nunca mas oscuro que el original
    vec3 c = mix(col, mix(mapped, own, keep * 0.75), s * 0.88);
    // grano de spray: puntitos claros en los medios-oscuros, oscuros en
    // las luces (el aerografo deja niebla de puntos donde el tono cambia)
    float n = fract(sin(dot(floor(px), vec2(12.9898, 78.233))) * 43758.5453);
    float n2 = fract(sin(dot(floor(px) + floor(uRTime * 8.0), vec2(39.3468, 11.1351))) * 24634.6345);
    float lightDots = step(1.0 - smoothstep(0.10, 0.35, l) * (1.0 - smoothstep(0.40, 0.70, l)) * 0.05, n);
    float darkDots = step(1.0 - smoothstep(0.55, 0.95, l) * 0.10, n2);
    c = mix(c, hkStyleMap(min(l + 0.30, 1.0)), lightDots * s * 0.65);
    c = mix(c, hkStyleMap(max(l - 0.25, 0.0)), darkDots * s * 0.45);
    // papel: fibra suave + polvo y pelusas blancas que cambian de a ratos
    float paper = noise21(px * vec2(0.012, 0.35)) * 0.5 + noise21(px * 0.04) * 0.5;
    c *= 1.0 - s * 0.06 * paper;
    float slot = floor(uRTime * 2.5);
    vec2 dg = px / 90.0;
    vec2 di = floor(dg);
    float dh = hash21(di + slot * 3.1);
    vec2 dq = fract(dg) - hash22(di + slot);
    float speck = step(0.93, dh) * (1.0 - smoothstep(0.004, 0.012, length(dq)));
    float lint = step(0.985, dh) * hkLine(abs(dq.y + sin(dq.x * 20.0) * 0.02) - 0.0, 0.6) * step(abs(dq.x), 0.2);
    c = mix(c, vec3(0.95, 0.92, 0.86), (speck + lint) * s * 0.7);
    // marco de arco: negro de papel con un halo violeta en el borde interior
    if (uStylearch > 0.001) {
        float d = hkArchMask(uv);
        float inner = exp(-max(-d, 0.0) * 6.0) * smoothstep(0.02, -0.02, d);
        c = mix(c, c * 0.6 + hkStyleMap(0.36) * 0.5, inner * uStylearch * 0.6);
        vec3 outside = vec3(0.028, 0.024, 0.026) * (0.85 + 0.3 * paper) + vec3(0.6) * speck * 0.3;
        c = mix(c, outside, smoothstep(-0.006, 0.006, d) * smoothstep(0.0, 0.15, uStylearch));
    }
    return c;
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
    if (uStyle > 0.001 || uStylearch > 0.001) col = hkStyle(col, uv);
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

// ---------------------------------------------------------------
// IMAGEN (escenas de config.MEDIA_SCENES): la imagen/GIF/video de la
// carpeta Media. Todas las escenas de imagen muestran la MISMA imagen a
// la vez, cada una con su tratamiento. Sin archivo cargado el Movie File
// In sale negro: hkMediaGet devuelve entonces una silueta difusa para
// que la escena nunca se vea vacia.
// ---------------------------------------------------------------
#ifdef HAS_MEDIA
float hkMediaAspect() {
    vec2 ts = vec2(textureSize(sTD2DInputs[1], 0));
    return ts.x / max(ts.y, 1.0);
}
// uv 0..1 de un marco de aspecto fa -> uv de la imagen, llenando el
// marco sin deformar (recorta lo que sobra).
vec2 hkMediaCover(vec2 uv, float fa) {
    float ma = hkMediaAspect();
    if (fa > ma) uv.y = 0.5 + (uv.y - 0.5) * ma / fa;
    else uv.x = 0.5 + (uv.x - 0.5) * fa / ma;
    return uv;
}
float hkMediaHas() {
    vec3 a = textureLod(sTD2DInputs[1], vec2(0.5), 3.0).rgb
           + textureLod(sTD2DInputs[1], vec2(0.3, 0.7), 3.0).rgb
           + textureLod(sTD2DInputs[1], vec2(0.7, 0.3), 3.0).rgb;
    return step(0.02, dot(a, vec3(1.0)));
}
// Silueta difusa (busto) para cuando no hay archivo.
vec3 hkMediaGhost(vec2 m) {
    vec2 q = (m - vec2(0.5, 0.45)) * vec2(1.6, 1.0);
    float head = length(q - vec2(0.0, 0.12)) - 0.17;
    float body = length((q - vec2(0.0, -0.42)) * vec2(0.6, 1.2)) - 0.33;
    float s = 1.0 - smoothstep(-0.02, 0.06, min(head, body));
    return vec3(0.16) + vec3(0.05) * noise21(m * 9.0 + uRTime * 0.3) - vec3(0.13) * s;
}
// Color lineal de la imagen en muv (0..1). lod > 0 = desenfocado.
vec3 hkMediaGet(vec2 muv, float lod, float has) {
    vec2 c = clamp(muv, 0.0, 1.0);
    vec3 im = pow(textureLod(sTD2DInputs[1], c, lod).rgb, vec3(2.2));
    return mix(pow(hkMediaGhost(c), vec3(2.2)), im, has);
}
#endif

// Pocos colores: la imagen queda casi en gris, con un tinte (sepia,
// frio, rojo) y contraste. sat 0 = blanco y negro, 1 = original.
vec3 hkTone(vec3 c, float sat, vec3 tint, float contrast) {
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    l = pow(max(l, 0.0), contrast);
    return mix(vec3(l) * tint, c, sat);
}

// Telarana en una esquina: corner = centro de la esquina, s = tamano.
float hkCornerWeb(vec2 p, vec2 corner, float s) {
    vec2 d = (p - corner) / s;
    float r = length(d);
    if (r > 1.0) return 0.0;
    float a = atan(d.y, d.x);
    float spokes = hkLine(sin(a * 7.0) * r * 0.16, 0.8);
    float rings = hkLine((fract(r * 6.0 + sin(a * 7.0) * 0.04) - 0.5) * 0.16, 0.7);
    return max(spokes, rings) * (1.0 - smoothstep(0.7, 1.0, r)) * 0.5;
}

// Vela con llama (base en b, alto h del cirio). Devuelve vec4(color, cuanto tapa).
vec4 hkCandle(vec2 p, vec2 b, float w, float h, float t, float seed) {
    vec2 q = p - b;
    float body = hkRBox(q - vec2(0.0, h * 0.5), vec2(w, h * 0.5), w * 0.4);
    float fl = 0.8 + 0.2 * noise21(vec2(t * 6.0, seed));
    vec2 fq = (q - vec2(sin(t * 3.1 + seed) * w * 0.25, h + w * 1.6)) / vec2(w * 0.8, w * 2.4 * fl);
    float flame = 1.0 - smoothstep(0.6, 1.0, length(fq + vec2(0.0, fq.y * fq.y * 0.0)) + max(fq.y, 0.0) * 0.4);
    vec3 wax = vec3(0.55, 0.52, 0.46) * (0.35 + 0.65 * smoothstep(w, -w, q.x)) * (0.5 + 0.5 * smoothstep(0.0, h, q.y));
    float inB = 1.0 - smoothstep(0.0, 0.004, body);
    vec3 c = wax * inB + vec3(1.0, 0.62, 0.25) * flame * 1.6 + vec3(1.0, 0.9, 0.7) * flame * flame;
    float glow = exp(-length(q - vec2(0.0, h + w * 1.5)) / (w * 10.0)) * fl;
    return vec4(c + vec3(1.0, 0.55, 0.2) * glow * 0.25, max(inB, flame));
}
