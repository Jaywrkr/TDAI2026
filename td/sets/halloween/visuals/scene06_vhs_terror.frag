// ===============================================================
// HALLOWEEN 06 - VHS DE TERROR (usa la carpeta Media)
// Un living abandonado de noche: empapelado descascarado, persiana con
// luz de luna, sillon, lampara y una tele de tubo con su videocasetera
// (LAMINAS horneadas, plates/scene06, ver td/tools/bake_plates_tele.py).
// En la pantalla pasa la imagen o video de la carpeta Media como una
// cinta VHS maldita (tracking, color corrido, ruido, banda que sube) y su
// luz ilumina el cuarto. Un acto si y otro no la camara se mete en la
// tele hasta que la imagen llena todo el cuadro (y vuelve a alejarse).
// Sin archivo cargado se ve estatica.
//
// BAILE (cada cosa escucha una parte distinta de la musica):
//   bajo   -> se separan los colores y la pantalla bombea luz al cuarto
//   medios -> la camara se acerca un poco y la imagen ondula
//   agudos -> mas nieve en la senal
//   golpe  -> salto de tracking y de cuadro; con Chaos: la camara salta
//             adentro de la tele, cuadro invertido y la imagen rueda
// PIANO: cada tecla rasga la cinta con una linea de tracking a la altura
//   de la nota (grave abajo, agudo arriba) y la imagen salta de lado; la
//   fuerza la hace mas ancha; apretada, la linea se queda y repta; la
//   pantalla tambien echa un fogonazo de luz al cuarto.
// Speed mueve la banda, el ruido y el reloj aun en silencio.
// HISTORIA: cada ~44 s alguien cambia de canal (estatica), cada ~83 s
// aparece una figura sentada en el sillon, y cada acto alterna entre ver
// el cuarto y ver la pantalla completa.
// CLIMAX (~97 s, 18 s, en tres tiempos): la imagen empieza a deformarse y
//   aparece la figura en el sillon; se levanta y camina hacia la camara
//   hasta tapar todo; justo cuando llega la cinta se come y queda estatica.
//   Cada ~4.5 min termina con cambio de canal (gran climax).
//
// @D1: cantidad de ruido / estatica
// @D2: perdida de tracking
// @D3: color (sepia <-> rojo terror)
// @D4: lineas de barrido
// @D5: banda que sube
// @D6: contraste
// ===============================================================

const vec4 ROOM_R = vec4(-3.1, -1.2, 6.2, 2.4);
const vec4 TV_R = vec4(-0.95, -1.0, 1.9, 1.95);
const vec2 SCR_C = vec2(-0.12, 0.06), SCR_H = vec2(0.42, 0.32);
vec2 rUV(vec2 p, vec4 r) { return (p - r.xy) / r.zw; }
vec3 plateCol(vec3 c) { return pow(c, vec3(2.2)) * 0.5; }

// La cinta: toda la cadena VHS de siempre sobre coordenadas 0..1.
vec3 hwVHS(vec2 uv, float t, float rt, float bass, float high, float hit, float loco, float zap, float eaten) {
    float band = floor(uv.y * 40.0);
    float jitter = (noise21(vec2(band, floor(rt * 18.0))) - 0.5);
    float wobble = sin(uv.y * 30.0 + t * 3.0) * 0.002;
    float trackAmt = (0.004 + uD2 * 0.03) + hit * (0.02 + uD2 * 0.06) * (1.0 + loco * 2.0);
    float tear = step(0.82 - hit * 0.5, noise21(vec2(band * 0.37, floor(rt * 6.0))));
    vec2 suv = uv;
    suv.x = mix(suv.x, 0.5 + (suv.x - 0.5) * (1.0 + 0.4 * sin(uv.y * 8.0 + rt * 3.0)), eaten);
    suv.y = fract(suv.y + hit * loco * 0.25 * step(0.5, noise21(vec2(floor(rt * 4.0), 9.0))));
    suv.x += jitter * trackAmt * (0.3 + tear) + wobble;
    suv.y = fract(suv.y + hit * 0.04 * step(0.6, noise21(vec2(floor(rt * 10.0), 2.0))));
    // piano: una linea de tracking por tecla, a la altura de la nota
    float keyTear = 0.0;
    for (int k = 0; k < N_KEYS; k++) {
        float e = keyEnv(k, 0.02, 0.5);
        if (e < 0.01) continue;
        float ky = mix(0.08, 0.92, keyPos(k)) + keyHeld(k) * sin(uKclock * 1.3 + float(k)) * 0.03;
        float kw = 0.018 + keyVel(k) * 0.05;
        float inBand = exp(-pow((uv.y - ky) / kw, 2.0)) * e;
        keyTear = max(keyTear, inBand);
        suv.x += (noise21(vec2(floor(uv.y * 120.0), floor(uKclock * 24.0) + float(k))) - 0.3) * 0.10 * inBand * (0.5 + keyVel(k));
    }
    float split = 0.002 + bass * 0.010 + hit * 0.008 + keyTear * 0.02;
    vec3 img;
    img.r = mediaTex(suv + vec2(split, 0.0)).r;
    img.g = mediaTex(suv).g;
    img.b = mediaTex(suv - vec2(split, 0.0)).b;
    float has = step(0.02, dot(mediaTex(vec2(0.5)).rgb + mediaTex(vec2(0.3, 0.7)).rgb, vec3(1.0)));
    float stat = hash21(floor(uv * vec2(uResW, uResH) * 0.5) + floor(rt * 30.0));
    img = mix(vec3(stat) * 0.55, img, has * (1.0 - smoothstep(0.2, 0.6, zap)));
    float l = dot(img, vec3(0.299, 0.587, 0.114));
    vec3 sepia = vec3(1.0, 0.85, 0.65) * l;
    vec3 redT = vec3(1.0, 0.18, 0.12) * pow(l, 0.9) + vec3(0.05, 0.0, 0.0);
    vec3 col = mix(img * 0.35 + sepia * 0.65, redT, uD3);
    col = clamp((col - 0.5) * (1.0 + uD6 * 0.9) + 0.5, 0.0, 1.0);
    float n = hash21(uv * vec2(uResW, uResH) + fract(rt * 7.0) * 100.0);
    col += (n - 0.5) * (0.06 + uD1 * 0.35 + high * 0.15);
    float scan = 0.5 + 0.5 * sin(uv.y * uResH * PI);
    col *= 1.0 - (0.10 + uD4 * 0.35) * scan;
    float roll = fract(uv.y - t * 0.08);
    col += vec3(0.25, 0.22, 0.22) * smoothstep(0.08, 0.0, abs(roll - 0.5)) * uD5;
    float bottom = smoothstep(0.08, 0.0, uv.y) * step(0.6, noise21(vec2(uv.x * 80.0, floor(rt * 20.0))));
    col += vec3(0.6) * bottom * (0.3 + uD2);
    col += vec3(0.9, 0.85, 0.85) * hit * 0.12 * tear;
    col += vec3(0.85) * keyTear * step(0.55, hash21(vec2(floor(uv.x * 300.0), floor(uKclock * 30.0)))) * 0.5;
    float inv = hit * step(0.75, loco) * step(0.7, noise21(vec2(floor(rt * 12.0), 4.0)));
    col = mix(col, vec3(1.0) - col, inv);
    vec2 rp = (uv - vec2(0.06, 0.90)) * vec2(1.4, 1.0);
    col += vec3(1.0, 0.05, 0.05) * (1.0 - smoothstep(0.012, 0.016, length(rp))) * step(0.5, fract(rt * 0.8));
    return max(col, 0.0);
}

// La imagen llena el cuadro sin deformarse (recorta lo que sobra).
vec2 hwCover(vec2 uv, float frameAspect) {
    vec2 ts = vec2(textureSize(sTD2DInputs[1], 0));
    float ma = ts.x / max(ts.y, 1.0);
    if (frameAspect > ma) uv.y = 0.5 + (uv.y - 0.5) * ma / frameAspect;
    else uv.x = 0.5 + (uv.x - 0.5) * frameAspect / ma;
    return uv;
}

// Digito de 7 segmentos (para el reloj 12:00 de la videocasetera).
float hwSeg7(vec2 p, int dgt) {
    int m = dgt == 1 ? 6 : (dgt == 2 ? 91 : 63);    // 1, 2, 0
    float d = 0.0;
    vec2 q = p;
    for (int s = 0; s < 7; s++) {
        if ((m / int(pow(2.0, float(s)))) % 2 == 0) continue;
        vec2 c = s == 0 ? vec2(0.0, 1.0) : s == 1 ? vec2(0.5, 0.5) : s == 2 ? vec2(0.5, -0.5) :
                 s == 3 ? vec2(0.0, -1.0) : s == 4 ? vec2(-0.5, -0.5) : s == 5 ? vec2(-0.5, 0.5) : vec2(0.0, 0.0);
        vec2 hs = (s == 0 || s == 3 || s == 6) ? vec2(0.38, 0.09) : vec2(0.09, 0.38);
        vec2 e = abs(q - c) - hs;
        d = max(d, 1.0 - smoothstep(0.0, 0.06, max(e.x, e.y)));
    }
    return d;
}

// Figura: sentada (stand 0) o parada (stand 1, ~0.75 de alto): hombros
// caidos, brazos largos que cuelgan hasta las rodillas, cabeza ladeada.
float hwFigure(vec2 q, float stand) {
    float sit;
    {
        float head = length((q - vec2(0.02, 0.36)) / vec2(0.85, 1.0)) - 0.075;
        float neck = length(max(abs(q - vec2(0.015, 0.27)) - vec2(0.025, 0.04), 0.0)) - 0.01;
        float torso = hkRBox(q - vec2(0.0, 0.04), vec2(0.17, 0.17), 0.08);
        sit = hkSmin(hkSmin(head, neck, 0.02), torso, 0.05);
    }
    if (stand <= 0.0) return sit;
    vec2 hq = rot2(0.28) * (q - vec2(0.03, 0.63));
    float head = length(hq / vec2(0.82, 1.0)) - 0.062;
    float neck = hkSeg(q, vec2(0.012, 0.50), vec2(0.025, 0.58)) - 0.018;
    // torso que se angosta hacia la cintura
    float k = clamp((q.y - 0.10) / 0.40, 0.0, 1.0);
    float hw = mix(0.085, 0.135, k);
    float torso = max(abs(q.x) - hw, max(0.10 - q.y, q.y - 0.52 + 0.06 * (q.x * q.x / 0.02)));
    float arms = min(hkSeg(q, vec2(-0.14, 0.46), vec2(-0.19, -0.02)), hkSeg(q, vec2(0.14, 0.46), vec2(0.18, 0.0))) - 0.020;
    float hands = min(length(q - vec2(-0.19, -0.05)), length(q - vec2(0.18, -0.03))) - 0.028;
    float legs = min(hkSeg(q, vec2(-0.055, 0.14), vec2(-0.07, -0.40)), hkSeg(q, vec2(0.055, 0.14), vec2(0.065, -0.40))) - 0.034;
    float f = hkSmin(hkSmin(head, neck, 0.015), torso, 0.03);
    f = hkSmin(f, min(arms, hands), 0.02);
    f = hkSmin(f, legs, 0.03);
    // ropa rota: borde deshilachado
    f += (noise21(q * 38.0) - 0.5) * 0.010 + (noise21(q * 110.0) - 0.5) * 0.004;
    return mix(sit, f, stand);
}

vec4 render(vec2 uv) {
    float t = uTime;
    float rt = uRTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    vec4 G = hkGrandClimax(4.0);
    vec4 C = hkClimaxOr(G, hkClimax(4.0, 97.0, 18.0));
    // camina hacia la camara durante el pico; en las secuelas la cinta se come
    float walk = clamp((C.w - 0.36) / 0.32, 0.0, 1.0) * step(0.0001, C.w) * (1.0 - step(0.70, C.w));
    float zap = max(hkEvent(3.0, 44.0, 2.2), G.z * step(0.85, G.w));
    float eaten = max(C.z, C.x * 0.25 * (1.0 - C.z));
    float figure = max(hkEvent(5.0, 83.0, 9.0), C.x * (1.0 - smoothstep(0.30, 0.38, C.w)));
    float keyFlash = 0.0;
    for (int k = 0; k < N_KEYS; k++) keyFlash += keyEnv(k, 0.02, 0.5) * (0.3 + keyVel(k)) * exp(-keyAge(k) * 3.0);

    // vista: cuarto <-> pantalla completa (por acto) y salto con locura
    vec2 act = hkAct();
    float mode = mix(mod(act.x, 2.0), mod(act.x + 1.0, 2.0), smoothstep(0.86, 1.0, act.y));
    float full = clamp(mode + hit * step(0.7, loco), 0.0, 1.0);
    float fe = full * full * (3.0 - 2.0 * full);
    float z = mix(1.0, 3.25, fe) * (1.0 + mid * 0.04);

    vec2 p0 = hkPunch(hkShake(centered(uv)));
    vec2 pc = hkCam(p0) * mix(1.0, 0.0, fe) + p0 * fe;   // adentro de la tele no hay paneo
    vec2 p = pc / z + SCR_C * (1.0 - 1.0 / z);

    // --- pantalla ---
    vec2 s = (p - SCR_C) / SCR_H;
    vec2 sb = s * (1.0 + 0.07 * dot(s, s));          // curvatura del tubo
    float scrD = length(max(abs(sb) - (1.0 - 0.18), 0.0)) - 0.18;
    float scrM = 1.0 - smoothstep(-0.02, 0.02, scrD);
    vec3 screen = vec3(0.0);
    if (scrM > 0.0) {
        screen = hwVHS(hwCover(sb * 0.5 + 0.5, SCR_H.x / SCR_H.y), t, rt, bass, high, hit, loco, zap, eaten);
        screen *= 1.0 - 0.35 * dot(sb, sb);            // borde del tubo mas oscuro
        // reflejo de la persiana en el vidrio
        screen += vec3(0.06, 0.07, 0.10) * step(0.6, fract((sb.y - sb.x * 0.2) * 6.0)) * smoothstep(0.2, -0.8, sb.x) * 0.5;
        screen += vec3(0.08) * exp(-dot(sb - vec2(-0.5, 0.55), sb - vec2(-0.5, 0.55)) * 6.0);
    }
    // luz que la pantalla echa al cuarto (promedio barato de la imagen)
    vec3 avg = (mediaTex(vec2(0.3, 0.35)).rgb + mediaTex(vec2(0.7, 0.55)).rgb + mediaTex(vec2(0.5, 0.75)).rgb) / 3.0;
    float lavg = dot(avg, vec3(0.3, 0.59, 0.11));
    vec3 glowC = mix(vec3(0.55, 0.65, 0.9) * (0.5 + 0.5 * hash21(vec2(floor(rt * 20.0), 1.0))), mix(vec3(1.0, 0.85, 0.65) * lavg, vec3(1.0, 0.2, 0.12) * lavg, uD3), step(0.02, lavg) * (1.0 - zap));
    glowC *= (0.8 + bass * 0.8 + hit * 0.4 + keyFlash * 0.8) * (0.9 + 0.1 * sin(rt * 60.0));
    float dist = length((p - SCR_C) * vec2(0.8, 1.0));
    float glowFall = 1.0 / (1.0 + dist * dist * 3.0);

    // --- cuarto ---
    vec4 rm = plate0(rUV(p, ROOM_R));
    vec3 col = plateCol(rm.rgb) * (0.35 + glowC * glowFall * 3.0);
    // figura sentada en el sillon (evento)
    if (figure > 0.01) {
        vec2 fq = p - vec2(1.25, -0.30);
        float fig = hwFigure(fq, 0.0);
        float fm = (1.0 - smoothstep(-0.004, 0.004, fig)) * figure;
        col = mix(col, vec3(0.005), fm);
        col += glowC * 0.25 * (1.0 - smoothstep(0.0, 0.006, abs(fig))) * figure * step(fq.x, 0.0);
    }

    // --- tele y videocasetera ---
    vec4 tv = plate1(rUV(p, TV_R));
    vec3 tvc = plateCol(tv.rgb) * (0.35 + glowC * glowFall * 2.2);
    // el borde del mueble brilla con la pantalla
    tvc += plateCol(tv.rgb) * glowC * exp(-max(scrD, 0.0) * 25.0) * 1.5;
    col = mix(col, tvc, tv.a);
    col = mix(col, screen, scrM * (1.0 - tv.a));
    // el brillo del tubo se derrama sobre el marco
    col += glowC * exp(-max(scrD, 0.0) * 18.0) * 0.08 * (1.0 - scrM);
    // reloj 12:00 que parpadea en la videocasetera
    vec2 cq = (p - vec2(0.25, -0.52)) / 0.016;
    if (abs(cq.x) < 6.0 && abs(cq.y) < 1.6) {
        float blinkC = step(0.5, fract(rt * 0.5));
        float dig = 0.0;
        dig = max(dig, hwSeg7(cq - vec2(-3.6, 0.0), 1));
        dig = max(dig, hwSeg7(cq - vec2(-1.9, 0.0), 2));
        dig = max(dig, hwSeg7(cq - vec2(1.0, 0.0), 0));
        dig = max(dig, hwSeg7(cq - vec2(2.7, 0.0), 0));
        dig = max(dig, (1.0 - smoothstep(0.1, 0.2, length(vec2(cq.x + 0.45, abs(cq.y) - 0.45)))));
        col += vec3(0.2, 1.0, 0.6) * dig * blinkC * 0.9;
    }

    // --- adentro de la tele: la imagen llena el cuadro ---
    float fs = smoothstep(0.86, 1.0, full);
    if (fs > 0.0) {
        vec2 fu = (uv - 0.5) * 2.0;
        vec2 fb = fu * (1.0 + 0.05 * dot(fu, fu));
        // la imagen entera, sin recortar; a los costados la misma imagen
        // desenfocada y oscura (como en la tele de un bar)
        vec2 cu = fb * 0.5 + 0.5;
        vec2 ts = vec2(textureSize(sTD2DInputs[1], 0));
        float ma = ts.x / max(ts.y, 1.0);
        vec2 ku = cu;
        if (uAspect > ma) ku.x = 0.5 + (cu.x - 0.5) * uAspect / ma;
        else ku.y = 0.5 + (cu.y - 0.5) * ma / uAspect;
        vec3 side = textureLod(sTD2DInputs[1], hwCover(cu, uAspect), 4.0).rgb * 0.22;
        side = mix(side, vec3(dot(side, vec3(0.33))) * vec3(1.0, 0.8, 0.7), 0.6 - uD3 * 0.3);
        side += (hash21(uv * vec2(uResW, uResH) + fract(rt * 7.0) * 100.0) - 0.5) * 0.05;
        vec2 kin = min(ku, 1.0 - ku);
        float inside = smoothstep(0.0, 0.015, min(kin.x, kin.y));
        vec3 fcol = side;
        if (inside > 0.0) fcol = mix(side, hwVHS(clamp(ku, 0.0, 1.0), t, rt, bass, high, hit, loco, zap, eaten), inside);
        fcol *= 1.0 - 0.25 * dot(fb, fb);
        col = mix(col, fcol, fs);
    }
    // --- CLIMAX: la figura se levanta y camina hacia la camara ---
    if (walk > 0.0) {
        // del sillon (en pantalla) al centro, creciendo hasta tapar todo
        vec2 sofa = (vec2(1.25, -0.30) - SCR_C * (1.0 - 1.0 / z)) * z;
        float a = walk * walk;
        float fsz = mix(z, 6.5, a);
        // al final la cabeza queda en el centro: los ojos miran a la camara
        vec2 fc = mix(sofa, vec2(-0.03, 0.10) - fsz * vec2(0.03, 0.63), smoothstep(0.0, 1.0, walk));
        vec2 fq = (p0 - fc) / fsz + vec2(0.0, 0.0);
        // pasos: se balancea al caminar
        fq.x += sin(walk * 18.0) * 0.012;
        float fig = hwFigure(fq, smoothstep(0.0, 0.15, walk));
        float fm = 1.0 - smoothstep(-0.004, 0.004, fig);
        col = mix(col, vec3(0.004), fm);
        // la luz de la tele le recorta el borde
        col += glowC * 0.35 * (1.0 - smoothstep(0.0, 0.01, abs(fig))) * (1.0 - fm * 0.5);
        // los ojos: dos puntos que se ven cuando ya esta cerca
        vec2 eq = vec2(abs(fq.x - 0.02) - 0.028, fq.y - mix(0.36, 0.63, smoothstep(0.0, 0.15, walk)));
        col += vec3(1.0, 0.9, 0.85) * exp(-dot(eq, eq) * 26000.0) * smoothstep(0.3, 0.7, walk);
    }
    // la cinta comida ensucia toda la imagen, no solo la pantalla
    col = mix(col, vec3(hash21(floor(uv * vec2(uResW, uResH) * 0.5) + floor(rt * 30.0))) * 0.5,
              C.z * (1.0 - smoothstep(0.80, 0.95, C.w)) * smoothstep(0.69, 0.72, C.w) * 0.65);
    return vec4(hkFinish(max(col, 0.0), uv, vec3(0.5, 0.1, 0.1)), 1.0);
}
