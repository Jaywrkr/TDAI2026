// ===============================================================
// HALLOWEEN 27 - EL RELOJ DE LA MEDIANOCHE
// La torre del reloj vista desde abajo (LAMINAS horneadas,
// plates/scene27, ver td/tools/bake_plates_reloj.py): sillares, gargolas,
// el campanario arriba, la esfera con numeros romanos y vidrio
// esmerilado iluminado desde adentro, y los tejados del pueblo. En vivo:
// el cielo, los engranajes que se ven por el centro calado de la esfera y
// por el arco de abajo, las agujas, el segundero, el pendulo, las grietas,
// el polvo en la luz de la luna, las campanadas y los murcielagos.
//
// LA HORA ES LA DE LA FIESTA: las agujas marcan la hora real de la noche
// (uNight: 22:00 -> 05:30, la misma cuenta de la pagina Noche). Si la
// escena esta al aire a la medianoche real, llega su gran climax solo.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> empuja el pendulo y los engranajes
//   medios -> el polvo flota en los haces de luz
//   agudos -> destellos en el hierro
//   golpe  -> el segundero salta y los engranajes avanzan un diente
// PIANO: cada tecla es una campana: se enciende el numero de esa posicion
//   (grave = I ... agudo = XII) y sale un anillo de luz que deja caer
//   polvo. Las graves dan campanas grandes; mantenida, sigue sonando.
// Speed mueve todo el mecanismo, aun en silencio.
// HISTORIA: cada acto cambia cuantos engranajes se ven; cada ~53 s pasa
//   una bandada lejos; cada ~73 s una nube tapa la luna.
// CLIMAX (~101 s, 22 s, en tres tiempos): las agujas se disparan hasta
//   las doce y la esfera se pone roja; suenan doce campanadas, con un
//   anillo y un temblor cada una; despues salen los murcielagos del
//   campanario y las agujas vuelven a la hora real. Gran climax (~4.5 min,
//   el pad Momento o la medianoche real): ademas, relampagos y la esfera
//   se raja entera mientras dura.
//
// @D1: engranajes a la vista (aparecen de a uno)
// @D2: polvo
// @D3: luz (la esfera y los haces de luna)
// @D4: salto con el golpe
// @D5: color del metal (bronce <-> verdin)
// @D6: grietas en la esfera
// ===============================================================

// >>> RELOJ_GEOM (bake_plates_reloj.py hornea con este mismo bloque)
const vec4 RJ_DIAL = vec4(0.0, 0.36, 0.50, 0.0);   // centro y radio exterior
const float RJ_RIN = 0.36;                          // aro interior de los numeros
const float RJ_RNUM = 0.43;                         // donde van los numeros
const float RJ_RCUT = 0.235;                        // el centro calado
const float RJ_TOWER = 0.72;                        // medio ancho de la torre
const vec4 RJ_ARCH = vec4(0.0, -0.55, 0.24, 0.0);  // arco del pendulo: x, arranque, medio ancho
float rjArchD(vec2 p) {
    vec2 q = p - RJ_ARCH.xy;
    float d = min(max(abs(q.x) - RJ_ARCH.z, max(q.y, -q.y - 1.0)), length(q) - RJ_ARCH.z);
    return max(d, -(q.y + 1.0));
}
// <<< RELOJ_GEOM

const vec4 PL_R = vec4(-3.4, -1.25, 6.8, 2.5);
vec2 rUV(vec2 p) { return (p - PL_R.xy) / PL_R.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }
const vec2 MOON = vec2(1.70, 0.62);
const vec2 BELFRY = vec2(0.0, 1.14);

// engranaje: distancia con signo (q local, radio R, N dientes, giro a) y
// en .y cuanto es hueco entre rayos (para ver lo de atras)
vec2 rjGear(vec2 q, float R, float N, float a) {
    float r = length(q);
    float an = atan(q.y, q.x) + a;
    float th = R * 0.13;
    float tooth = clamp(cos(an * N) * 2.2, -1.0, 1.0);
    float d = r - (R - th * 0.5 + th * 0.5 * tooth);
    // rayos y hueco
    float spokes = 5.0 + floor(N / 10.0);
    float sp = abs(sin(an * spokes * 0.5)) * r;
    float hole = step(R * 0.25, r) * step(r, R * 0.74) * step(R * 0.10, sp);
    return vec2(d, hole);
}

// metal con cepillado y bisel; lit 0..1
vec3 rjMetal(vec3 base, vec2 q, float d, float R, float lit) {
    float an = atan(q.y, q.x);
    float brush = 0.75 + 0.25 * noise21(vec2(an * 30.0, length(q) * 80.0));
    float bevel = smoothstep(-0.012, 0.0, d) * 0.6;
    float side = 0.6 + 0.4 * dot(normalize(q + 1e-4), normalize(vec2(0.7, 0.6)));
    return base * brush * lit * (0.55 + 0.55 * side) + base * bevel * lit;
}

// mano del reloj: punta de lanza y contrapeso; a = angulo desde las 12
float rjHand(vec2 q, float a, float len, float w) {
    vec2 dir = vec2(sin(a), cos(a));
    vec2 nrm = vec2(dir.y, -dir.x);
    vec2 l = vec2(dot(q, nrm), dot(q, dir));
    float shaft = max(abs(l.x) - w * (1.0 - l.y / len * 0.4), max(-l.y - len * 0.22, l.y - len * 0.80));
    vec2 tq = l - vec2(0.0, len * 0.86);
    float tip = max(abs(tq.x) * 1.7 + abs(tq.y) * 0.9 - w * 4.2, -tq.y - len * 0.10);
    tip = max(tip, tq.y - len * 0.14);
    float ring = abs(length(l - vec2(0.0, len * 0.55)) - w * 2.6) - w * 0.7;
    float cw = length((l + vec2(0.0, len * 0.22)) * vec2(1.0, 1.4)) - w * 3.0;
    return min(min(shaft, tip), min(ring, cw));
}

vec4 render(vec2 uv) {
    vec2 p = hkCam(hkPunch(hkShake(centered(uv)))) * 1.05 + vec2(0.0, 0.12);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float hue = audioHue(uHue, mid * 0.006);

    // gran climax: el de siempre, o la medianoche real de la fiesta
    vec4 G = hkGrandClimax(7.0);
#ifndef HK_STILL
    float mk0 = (uNight - 2.0 / 7.5) * 7.5 * 3600.0;   // segundos desde las 00:00
    if (G.w <= 0.0 && mk0 >= 0.0 && mk0 <= 26.0) G = hkClimaxShape(mk0, 26.0);
#endif
    vec4 C = hkClimaxOr(G, hkClimax(7.0, 101.0, 22.0));
    float cph = C.w;
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    // doce campanadas en el pico
    float pk = clamp((cph - 0.35) / 0.35, 0.0, 1.0);
    float strike = cph > 0.35 && cph < 0.70 ? fract(pk * 12.0) : 1.0;
    float strikeA = exp(-strike * 5.0) * step(0.0, cph) * C.y;
    p += (vec2(noise21(vec2(uRTime * 40.0, 1.0)), noise21(vec2(uRTime * 40.0, 4.0))) - 0.5) * strikeA * 0.025;
    float flock = hkEvent(4.0, 53.0, 9.0);
    float cloudE = hkEvent(9.0, 73.0, 10.0);
    float bolt = G.y * step(0.6, fract(uRTime * 1.1 + 0.3)) * step(0.5, hash21(vec2(floor(uRTime * 1.1), 3.0)));
    float bx = hash21(vec2(floor(uRTime * 1.1), 8.0)) > 0.5 ? -1.6 : 1.3;    // donde cae el rayo

    vec3 bronze = vec3(0.62, 0.42, 0.22);
    vec3 verd = vec3(0.28, 0.55, 0.45);
    vec3 metC = mix(bronze, verd, uD5);
    vec3 warm = vec3(1.0, 0.78, 0.45);
    vec3 red = vec3(1.0, 0.18, 0.08);
    float moonK = (0.55 + uD3 * 0.6) * (1.0 - cloudE * 0.5) * (1.0 - C.x * 0.35) + bolt * 1.4;
    float dialK = (0.35 + uD3 * 0.9) * (1.0 + strikeA * 0.8);
    vec3 dialC = mix(warm, red, C.x * (1.0 - C.z * 0.6));

    vec2 pu = rUV(p);
    vec4 tw = plate0(pu);
    vec4 mk = plate1(pu);
    // relieve horneado de la torre y la esfera (fase 23)
    vec4 rl = plate3(pu);
    float rlOn = rl.a;
    vec3 nrm = vec3(rl.rg * 2.0 - 1.0, 0.0);
    nrm.z = sqrt(max(1.0 - dot(nrm.xy, nrm.xy), 0.0));
    vec2 dc = RJ_DIAL.xy;
    vec2 q = p - dc;
    float r = length(q);

    // --- cielo ---
    vec3 col = vec3(0.0);
    vec3 sky = mix(vec3(0.05, 0.05, 0.11), vec3(0.01, 0.012, 0.035), smoothstep(-0.5, 1.2, p.y));
    vec2 mq = p - MOON;
    float mr = length(mq);
    sky += vec3(0.4, 0.45, 0.6) * exp(-mr * 2.4) * 0.35 * moonK;
    float st = step(0.995, hash21(floor(p * 150.0)));
    sky += vec3(0.7) * st * smoothstep(0.0, 0.7, p.y) * (0.5 + 0.5 * sin(uRTime * 2.0 + hash21(floor(p * 150.0)) * 30.0));
    sky = mix(sky, vec3(0.92, 0.90, 0.82) * (0.8 + 0.2 * plate2Wrap(mq * 0.8 + 0.6).r) * (0.6 + 0.5 * uD3), 1.0 - smoothstep(0.14, 0.148, mr));
    sky = hkStyleMoon(sky, p, MOON, 0.14);
    float cl = plate2Wrap(vec2(p.x * 0.2 + t * 0.010, p.y * 0.32 + 0.4)).r;
    float cl2 = plate2Wrap(vec2(p.x * 0.45 - t * 0.018, p.y * 0.6 + 0.1)).r;
    float cov = smoothstep(0.52, 0.80, cl * 0.7 + cl2 * 0.4 + cloudE * 0.35 * exp(-mr)) * smoothstep(-0.4, 0.3, p.y);
    sky = mix(sky, vec3(0.04, 0.04, 0.08) + vec3(0.3, 0.32, 0.42) * exp(-mr * 1.7) * moonK * 0.5, cov * 0.88);
    sky += vec3(0.10, 0.08, 0.16) * grand * G.x * smoothstep(-0.2, 0.9, p.y);
    if (bolt > 0.01) {
        float bd = hkBolt(p, bx, 1.2, -0.4, floor(uRTime * 1.1), 0.6);
        sky += vec3(0.8, 0.85, 1.0) * bolt * (0.004 / (bd + 0.004) + 0.3);
    }
    // bandada lejana
    if (flock > 0.01) {
        float fp = hkEventPhase(4.0, 53.0, 9.0);
        for (int b = 0; b < 7; b++) {
            float fb = float(b);
            vec2 bp = vec2(mix(-3.0, 3.0, fp) + fb * 0.07 - 0.2, 0.72 + sin(fb * 1.7) * 0.05 + sin(fp * 9.0 + fb) * 0.02);
            vec2 bq = (p - bp) / 0.018;
            bq.x = abs(bq.x);
            float fl = sin(uRTime * 15.0 + fb * 2.0);
            float wing = smoothstep(0.25, 0.0, abs(bq.y - bq.x * (0.2 + fl * 0.5))) * step(bq.x, 1.2);
            sky = mix(sky, vec3(0.01), wing * flock);
        }
    }
    col = sky;

    // --- la torre a la luz de la luna ---
    vec3 alb = plateCol(tw.rgb);
    // con relieve: la luna desde la derecha (contraluz en los cantos), el
    // relampago desde su lado y el resplandor de la esfera sobre la piedra
    // que la rodea (el bisel, los sillares de alrededor)
    float difM = max(dot(nrm, vec3(0.6365, 0.4620, 0.6176)), 0.0);
    float rimM = pow(1.0 - nrm.z, 1.5) * max(dot(normalize(nrm.xy + 1e-4), vec2(0.81, 0.59)), 0.0);
    float difB = max(dot(nrm, normalize(vec3(clamp((bx - p.x) * 0.6, -1.2, 1.2), 0.8, 0.5))), 0.0);
    float moonOnly = (0.55 + uD3 * 0.6) * (1.0 - cloudE * 0.5) * (1.0 - C.x * 0.35);
    float keyL = mix(moonK, moonOnly * (0.30 + 1.30 * difM + rimM * 0.9) + bolt * 1.4 * (0.25 + 1.8 * difB), rlOn);
    vec3 toDial = vec3(dc - p, 0.12);
    float glowD = max(dot(nrm, normalize(toDial)), 0.0) * exp(-max(r - RJ_DIAL.z, 0.0) * 4.0) * step(RJ_RCUT, r);
    vec3 stone = alb * (vec3(0.42, 0.44, 0.58) * keyL * mix(1.0, rl.b, rlOn) + vec3(0.03)
               + dialC * dialK * glowD * 0.9 * rlOn * step(RJ_DIAL.z - 0.035, r));
    // el vidrio de la esfera, iluminado desde adentro
    float glassM = mk.g * step(r, RJ_DIAL.z);
    stone = mix(stone, alb * 2.4 * dialC * dialK, glassM);
    // ventanitas del pueblo
    stone += alb * warm * 1.2 * mk.g * step(RJ_DIAL.z + 0.06, r) * (0.8 + 0.2 * noise21(vec2(uRTime * 1.5, floor(p.x * 9.0))));
    // hierro: D5 lo tine; brilla con los agudos
    float iron = mk.r * step(0.75, mk.r);
    stone = mix(stone, stone * metC * 2.2 + metC * 0.015, iron * 0.8);
    if (iron > 0.01 && high > 0.05) {
        vec2 gq = fract(p * 9.0) - 0.5;
        float gl = step(0.92, hash21(floor(p * 9.0) + floor(uRTime * 3.0))) * hkSparkle(gq, 0.10);
        stone += vec3(1.0, 0.9, 0.7) * gl * high * 1.4 * iron;
    }
    // grietas de la esfera (D6; el gran climax la raja entera)
    float crackOpen = max(uD6, grand * G.y);
    if (mk.b > 0.004) {
        float cr = smoothstep(mk.b, mk.b + 0.03, crackOpen * 1.02);
        stone = mix(stone, vec3(0.012, 0.008, 0.006), cr * 0.9);
        stone += dialC * cr * dialK * 0.25 * exp(-r * 2.0) * (1.0 + grand * G.y * 2.0);     // la luz se escapa por la grieta
    }
    // persianas del campanario: de adentro sale luz en el climax
    float lou = smoothstep(0.4, 0.5, mk.r) * (1.0 - smoothstep(0.6, 0.7, mk.r));
    stone = mix(stone, dialC * (0.05 + alb * 6.0), lou * clamp(C.y * 0.6 + strikeA * 0.9, 0.0, 1.0));
    col = mix(col, stone, tw.a);

    // --- el centro calado: engranajes ---
    if (r < RJ_RCUT) {
        vec3 inside = vec3(0.04, 0.025, 0.015) + dialC * 0.10 * dialK * exp(-r * 6.0);
        float nG = 2.0 + uD1 * 5.0 + hkActVal(2.0) * 1.0;
        float jolt = hit * uD4 * 0.35;
        float om = t * 0.45 + bass * 0.06 + jolt;
        // de atras hacia adelante
        vec4 GR[7];
        GR[0] = vec4(-0.06, 0.17, 0.070, 12.0); GR[1] = vec4(0.12, -0.15, 0.090, 16.0);
        GR[2] = vec4(-0.19, 0.08, 0.050, 9.0);  GR[3] = vec4(0.155, 0.085, 0.075, 12.0);
        GR[4] = vec4(-0.14, -0.11, 0.065, 11.0); GR[5] = vec4(0.0, 0.0, 0.120, 20.0);
        GR[6] = vec4(0.05, -0.02, 0.040, 8.0);
        float dirs[7] = float[7](1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0);
        float order[7] = float[7](3.0, 4.0, 5.0, 1.0, 2.0, 0.0, 6.0);   // en que orden aparecen con D1
        for (int i = 0; i < 7; i++) {
            float on = revealAt(nG, order[i]);
            if (on <= 0.0) continue;
            vec4 g = GR[i];
            float Rg = g.z * mix(0.6, 1.0, on);
            vec2 gq = q - g.xy;
            if (length(gq) > Rg * 1.15) continue;
            vec2 gd = rjGear(gq, Rg, g.w, dirs[i] * om * 20.0 / g.w);
            float back = i < 3 ? 0.55 : 1.0;
            float a = (1.0 - smoothstep(-0.003, 0.003, gd.x)) * (1.0 - gd.y) * on;
            vec3 mc = rjMetal(metC * 0.6, gq, gd.x, Rg, back * (0.5 + 0.5 * dialK)) + dialC * 0.05;
            inside = mix(inside, mc, a);
            inside *= 1.0 - 0.35 * smoothstep(0.02, 0.0, gd.x) * smoothstep(-0.02, 0.0, gd.x) * (1.0 - a);   // sombra al borde
        }
        col = mix(inside, col, smoothstep(RJ_RCUT - 0.004, RJ_RCUT, r));
    }

    // --- el arco: engranajes grandes y el pendulo ---
    float ad = rjArchD(p);
    if (ad < 0.0) {
        vec2 aq = p - RJ_ARCH.xy;
        vec3 inside = vec3(0.025, 0.018, 0.012) + warm * 0.05 * exp(-length(aq - vec2(0.0, -0.1)) * 3.0) * dialK;
        vec2 g1 = aq - vec2(0.17, -0.50);
        vec2 gd = rjGear(g1, 0.21, 30.0, -t * 0.45 * 20.0 / 30.0);
        inside = mix(inside, rjMetal(metC * 0.35, g1, gd.x, 0.21, 0.5), (1.0 - smoothstep(-0.003, 0.003, gd.x)) * (1.0 - gd.y));
        vec2 g2 = aq - vec2(-0.20, -0.22);
        gd = rjGear(g2, 0.13, 20.0, t * 0.45);
        inside = mix(inside, rjMetal(metC * 0.35, g2, gd.x, 0.13, 0.5), (1.0 - smoothstep(-0.003, 0.003, gd.x)) * (1.0 - gd.y));
        // pendulo: el bajo lo empuja
        vec2 piv = vec2(0.0, 0.18);
        float sw = (0.20 + bass * 0.08) * sin(t * 2.3) + hit * uD4 * 0.03 * sin(t * 2.3 + 1.0);
        vec2 dir = vec2(sin(sw), -cos(sw));
        vec2 bob = piv + dir * 0.50;
        float rod = hkSeg(aq, piv, bob) - 0.006;
        float disc = length(aq - bob) - 0.07;
        float pend = min(rod, disc);
        vec3 pc = rjMetal(metC * 0.55, aq - bob, disc, 0.07, 0.5 + dialK * 0.25);
        float pa = 1.0 - smoothstep(-0.003, 0.003, pend);
        inside = mix(inside * (1.0 - 0.5 * smoothstep(0.08, 0.0, pend)), pc, pa);
        inside += vec3(1.0, 0.9, 0.7) * hkSparkle(aq - bob - vec2(0.03, 0.03), 0.04) * (0.3 + high * 1.5) * pa;
        col = mix(inside, col, smoothstep(-0.004, 0.0, ad));
    }

    // --- agujas: la hora de la fiesta (las 12 en el climax) ---
    float hrs = 22.0 + clamp(uNight, 0.0, 1.0) * 7.5;
    float hR = mod(hrs, 12.0) / 12.0 * 6.2831853;
    float mR = fract(hrs) * 6.2831853;
    float spin = smoothstep(0.0, 0.35, cph);
    float back = smoothstep(0.74, 1.0, cph);
    float hA = hR, mA = mR;
    if (cph > 0.0) {
        if (cph < 0.72) {
            mA = mR + spin * (6.2831853 * 3.0 + (6.2831853 - mR));
            hA = hR + spin * (6.2831853 - hR);
        } else {
            mA = mR * back;
            hA = hR * back;
        }
    }
    float secA = floor(uRTime) / 60.0 * 6.2831853 + hit * uD4 * 0.35;
    if (r < RJ_DIAL.z) {
        float hd = min(rjHand(q, hA, 0.30, 0.012), rjHand(q, mA, 0.42, 0.009));
        float sd = max(abs(dot(q, vec2(cos(secA), -sin(secA)))) - 0.003, abs(dot(q, vec2(sin(secA), cos(secA))) - 0.16) - 0.24);
        float hub = length(q) - 0.03;
        float d = min(min(hd, sd), hub);
        // sombra de las agujas sobre el vidrio
        float sh = 1.0 - smoothstep(0.0, 0.03, min(hd, sd) + 0.0) ;
        col *= 1.0 - 0.35 * sh * glassM;
        vec3 hc = metC * 0.45 * (0.5 + 0.6 * moonK) * (0.8 + 0.4 * smoothstep(-0.01, 0.0, d)) + metC * strikeA * 0.4;
        // contorno claro: se leen contra el vidrio y contra el calado oscuro
        col = mix(col, col + dialC * 0.25 * dialK, (1.0 - smoothstep(0.0, 0.006, d)) * step(r, RJ_RCUT) * 0.8);
        col = mix(col, hc, 1.0 - smoothstep(-0.002, 0.002, d));
    }

    // --- campanas del piano y campanadas del climax ---
    float ringAll = 0.0;
    vec3 ringC = vec3(0.0);
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.05, 2.5);
        if (e <= 0.001) continue;
        float age = keyAge(k);
        float big = mix(1.5, 0.6, keyPos(k));
        // el numero de esa posicion se enciende
        float n = floor(keyPos(k) * 11.99) + 1.0;
        float a0 = n / 12.0 * 6.2831853;
        vec2 nc = dc + vec2(sin(a0), cos(a0)) * RJ_RNUM;
        float nGlow = exp(-length(p - nc) * 22.0) * e;
        col += mix(warm, metC, 0.3) * nGlow * (0.6 + keyVel(k)) * (0.5 + 1.5 * iron);
        // anillo que se abre (mantenida: vuelve a sonar cada ~1.2 s)
        float ra = keyHeld(k) > 0.5 ? mod(age, 1.2) : age;
        float rr = RJ_DIAL.z + ra * 0.85 * big;
        float ring = exp(-abs(r - rr) * (40.0 / big)) * exp(-ra * 1.6) * e * (0.5 + keyVel(k));
        ringAll += ring;
        ringC += warm * ring;
        // polvo que cae del anillo
        float dust = hkParticles(p * 1.4 + vec2(float(k) * 3.1, 0.0), uRTime, 0.10, vec2(0.0, -1.0), 0.03);
        col += warm * dust * smoothstep(rr + 0.2, rr, r) * smoothstep(rr - 0.5, rr, r) * e * 0.5 * exp(-ra * 0.8);
    }
    // campanada del climax: anillo grande + resplandor de la esfera
    if (strikeA > 0.001) {
        float rr = RJ_DIAL.z + (1.0 - exp(-strike * 4.0)) * 1.6;
        float ring = exp(-abs(r - rr) * 18.0) * strikeA;
        ringC += dialC * ring * 1.5;
        col += dialC * strikeA * 0.25 * exp(-r * 1.8);
    }
    col += ringC * 0.55;

    // --- haces de luna y polvo (D2, medios) ---
    float rays = hkRays(p, MOON, t, 24.0) * hkStyleRays() * (0.3 + uD3 * 0.7) * (1.0 - cov) * 0.55;
    float dust = hkParticles(p * 1.1 + vec2(0.0, sin(t * 0.2) * 0.2), t * 0.3 + mid * 0.6, 0.04 + uD2 * 0.16 + mid * 0.08, vec2(-0.3, 0.15 + mid * 0.4), 0.018);
    col += vec3(0.55, 0.6, 0.75) * rays * 0.22 + vec3(0.85, 0.88, 1.0) * dust * (0.15 + rays * 3.0) * (0.3 + uD2);

    // --- murcielagos del campanario (secuelas del climax) ---
    if (cph > 0.62 && cph < 1.0) {
        float bt = (cph - 0.62) * 22.0;
        int nb = grand > 0.0 ? 22 : 14;
        for (int b = 0; b < 22; b++) {
            if (b >= nb) break;
            float fb = float(b);
            float h1 = hash21(vec2(fb, 12.0)), h2 = hash21(vec2(fb, 15.0));
            float age = (bt - h2 * 3.0) * (0.16 + 0.12 * h1);
            if (age <= 0.0 || age > 2.2) continue;
            float a = 1.5708 + (h1 - 0.5) * 3.0;
            vec2 bp = BELFRY + vec2(cos(a) * 1.6, sin(a) * 0.15 - 0.30) * age
                    + vec2(sin(age * 5.0 + fb) * 0.05, sin(age * 7.0 + fb * 2.0) * 0.04);
            float sz = 0.03 + age * 0.09;
            vec2 bq = (p - bp) / sz;
            if (abs(bq.x) > 1.4 || abs(bq.y) > 1.0) continue;
            bq.x = abs(bq.x);
            float flap = sin(uRTime * 17.0 + fb * 2.3);
            float topE = 0.08 + bq.x * (0.15 + 0.55 * flap);
            float botE = topE - 0.40 * (1.0 - bq.x / 1.25) - 0.02 + 0.12 * abs(sin(bq.x * 7.5));
            float wing = smoothstep(1.25, 1.15, bq.x) * smoothstep(-0.04, 0.04, topE - bq.y) * smoothstep(-0.04, 0.04, bq.y - botE);
            float body = 1.0 - smoothstep(0.16, 0.22, length(bq * vec2(1.4, 0.75) - vec2(0.0, 0.02)));
            float bm = max(wing, body);
            // borde rojo de la esfera y ojitos: se leen contra el cielo oscuro
            float rim = smoothstep(0.0, 0.5, bm) * (1.0 - smoothstep(0.5, 1.0, bm));
            col = mix(col, vec3(0.012, 0.01, 0.015), bm * 0.95) + dialC * rim * 0.25;
            col += red * 1.5 * (1.0 - smoothstep(0.03, 0.06, length(bq - vec2(0.06, 0.06)))) * step(0.0, bq.y);
        }
    }

    col = audioLift(col, high * 0.05);
    return vec4(hkFinish(col, uv, vec3(0.4, 0.35, 0.55)), 1.0);
}
