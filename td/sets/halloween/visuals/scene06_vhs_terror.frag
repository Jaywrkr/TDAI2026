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
// Cada acto alterna entre ver el cuarto y ver la pantalla completa.
// REPERTORIO (fase 32, motor hkSuceso del kit):
//   ESTADOS (~5 min): luz de luna, cinta gastada (mas nieve y tracking) y
//     a oscuras (el cuarto lo ilumina solo la tele).
//   SUCESOS (~55 s, 7): alguien cambia de canal (estatica); una figura
//     aparece sentada en el sillon; pantalla azul con el PLAY; una cara se
//     arma en la estatica; la tele se apaga (linea y punto) y vuelve; una
//     mano se apoya en el vidrio desde adentro; alguien pasa detras de la
//     persiana.
//   DETALLES (~30 s, 5): el reloj marca 00:00, una banda de tracking
//     sube, un gato cruza el piso, dos ojos en la persiana, la imagen se
//     da vuelta.
//   CLIMAX (~4 min, 18 s, rotan 3 guiones en tres tiempos):
//     A la figura: se deforma la imagen, la figura del sillon se levanta y
//       camina hacia la camara hasta tapar todo; la cinta se come.
//     B la camara del cuarto: la pantalla muestra este mismo cuarto, como
//       una camara de seguridad, y alguien parado detras de la camara se
//       acerca hasta mirar de frente; despues estatica.
//     C la cinta sangra: la imagen chorrea sangre, que sale de la pantalla
//       y baja por el mueble hasta el piso.
//   GRAN CLIMAX (uno de cada tres o el pad Momento): A con cambio de canal.
// @EST: luz de luna | cinta gastada | a oscuras
// @SUC: cambio de canal | figura en el sillon | pantalla azul | cara en la estatica | la tele se apaga | mano en el vidrio | detras de la persiana
// @DET: reloj 00:00 | banda de tracking | gato | ojos en la persiana | imagen al reves
// @CLX: A la figura | B la camara del cuarto | C la cinta sangra
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

// desgaste de la cinta (estado), lo pone render()
float gWear = 0.0;

// La cinta: toda la cadena VHS de siempre sobre coordenadas 0..1.
vec3 hwVHS(vec2 uv, float t, float rt, float bass, float high, float hit, float loco, float zap, float eaten) {
    float band = floor(uv.y * 40.0);
    float jitter = (noise21(vec2(band, floor(rt * 18.0))) - 0.5);
    float wobble = sin(uv.y * 30.0 + t * 3.0) * 0.002;
    float trackAmt = (0.004 + uD2 * 0.03 + gWear * 0.02) + hit * (0.02 + uD2 * 0.06) * (1.0 + loco * 2.0);
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
    col += (n - 0.5) * (0.06 + uD1 * 0.35 + high * 0.15 + gWear * 0.18);
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

// huella de una mano (palma + cuatro dedos + pulgar), s = alto de la palma
float hwHand(vec2 p, vec2 c, float s, float ang) {
    vec2 q = rot2(ang) * (p - c) / s;
    float d = length(max(abs(q * vec2(1.0, 1.1)) - vec2(0.32, 0.28), 0.0)) - 0.16;
    for (int i = 0; i < 4; i++) {
        float x = -0.33 + float(i) * 0.22;
        float l = (i == 0 ? 0.48 : (i == 3 ? 0.55 : 0.68 + float(i) * 0.04));
        d = min(d, hkSeg(q, vec2(x, 0.35), vec2(x * 1.25, 0.35 + l)) - 0.085);
    }
    d = min(d, hkSeg(q, vec2(0.40, 0.0), vec2(0.78, 0.36)) - 0.09);
    return d * s;
}

// --- lo que pasa EN la pantalla (sucesos y climax B y C), sobre la
// imagen u 0..1; vale igual en la tele del cuarto y a pantalla completa ---
float gBlue = 0.0, gFace = 0.0, gOff = 0.0, gHand = 0.0, gHandX = 0.0, gCam = 0.0, gCamPh = 0.0, gBleed = 0.0, gBand = -1.0;
vec3 hwOverlay(vec2 u, vec3 col, float rt) {
    vec2 q = u * 2.0 - 1.0;
    float stat = hash21(floor(u * vec2(uResW, uResH) * 0.35) + floor(rt * 30.0));
    // B: la pantalla muestra este cuarto y alguien parado detras de la camara
    if (gCam > 0.0) {
        vec2 rp = vec2(q.x * 1.75, q.y * 0.95 - 0.05);
        vec3 room = plateCol(plate0(rUV(rp, ROOM_R)).rgb) * 1.3;
        room = mix(room, vec3(dot(room, vec3(0.3, 0.59, 0.11))) * vec3(0.85, 1.0, 0.85), 0.7);
        float near = smoothstep(0.15, 0.72, gCamPh);
        float fsz = mix(0.55, 2.3, near * near);
        float feet = mix(-0.55, -1.65, near);
        vec2 fq = (vec2(q.x * 1.75, q.y) - vec2(mix(1.1, 0.05, near), feet + 0.40 * fsz)) / fsz;
        fq.x += sin(gCamPh * 40.0) * 0.01 * (1.0 - near);
        float fig = hwFigure(fq, 1.0);
        room = mix(room, vec3(0.01), 1.0 - smoothstep(-0.006, 0.006, fig));
        vec2 eq = vec2(abs(fq.x - 0.02) - 0.028, fq.y - 0.63);
        room += vec3(1.0, 0.95, 0.9) * exp(-dot(eq, eq) * 30000.0) * smoothstep(0.55, 0.75, gCamPh) * 1.5;
        room += (stat - 0.5) * 0.10;
        room *= 0.85 + 0.15 * sin(u.y * uResH * 1.2);
        // el puntito rojo de grabacion
        room += vec3(1.0, 0.05, 0.05) * (1.0 - smoothstep(0.02, 0.03, length((q - vec2(0.82, 0.78)) * vec2(1.6, 1.0)))) * step(0.5, fract(rt));
        col = mix(col, room, gCam);
    }
    // suceso: pantalla azul con el PLAY
    if (gBlue > 0.0) {
        vec2 tq = (q - vec2(-0.70, 0.62)) / 0.10;
        float tri = max(-tq.x - 0.5, abs(tq.y) * 1.7 + tq.x * 0.85 - 0.6);
        vec3 b = vec3(0.04, 0.10, 0.62) + vec3(1.0) * (1.0 - smoothstep(-0.05, 0.05, tri)) * 0.9;
        b *= 0.92 + 0.08 * sin(u.y * uResH * PI);
        col = mix(col, b, gBlue);
    }
    // suceso: una cara se arma en la estatica
    if (gFace > 0.0) {
        float eyes = min(length((vec2(abs(q.x) - 0.30, q.y - 0.18)) / vec2(0.15, 0.20)), 9.0);
        float mouth = length((q - vec2(0.0, -0.42)) / vec2(0.28, 0.11 + 0.05 * sin(rt * 2.0)));
        float skull = length(q / vec2(0.78, 0.95));
        float form = smoothstep(0.2, 0.9, gFace);
        float v = stat * (0.25 + 0.55 * smoothstep(1.05, 0.85, skull) * form);
        v *= 1.0 - form * 0.95 * (smoothstep(1.0, 0.6, eyes) + smoothstep(1.0, 0.6, mouth));
        col = mix(col, vec3(v), gFace);
    }
    // C: la imagen sangra y chorrea hacia abajo
    if (gBleed > 0.0) {
        float cx = floor(u.x * 26.0);
        float h = hash21(vec2(cx, 3.0));
        float len = gBleed * (0.4 + 0.9 * h) * 1.2;
        float wob = (noise21(vec2(u.y * 4.0, cx)) - 0.5) * 0.25;
        float strand = step(abs(fract(u.x * 26.0) - 0.5 - wob * 0.5), 0.12 + 0.2 * h) * step(1.0 - len, u.y);
        float top = smoothstep(1.0 - gBleed * 0.35, 1.0, u.y);
        float bm = max(strand, top);
        vec3 red = vec3(0.55, 0.02, 0.02) * (0.6 + 0.6 * noise21(u * vec2(30.0, 6.0) + rt * vec2(0.0, 0.6)));
        col = mix(col * mix(vec3(1.0), vec3(1.0, 0.35, 0.3), gBleed), red, bm * gBleed);
    }
    // suceso: una mano se apoya en el vidrio desde adentro
    if (gHand > 0.0) {
        float hd = hwHand(q, vec2(gHandX, -0.05), 0.42, 0.15 * gHandX);
        float press = 1.0 - smoothstep(-0.01, 0.01, hd);
        col = mix(col, col * 0.25 + vec3(0.02), press * gHand);
        col += vec3(0.9, 0.85, 0.8) * (1.0 - smoothstep(0.0, 0.03, abs(hd))) * gHand * 0.35;
    }
    // detalle: una banda de tracking que sube
    if (gBand >= 0.0) {
        float bb = exp(-pow((u.y - gBand) / 0.035, 2.0));
        col = mix(col, vec3(stat * 0.8), bb * 0.8);
    }
    // suceso: la tele se apaga: la imagen se cierra en una linea y un punto
    if (gOff > 0.0) {
        float hgt = max(1.0 - smoothstep(0.0, 0.5, gOff), 0.004);
        float wid = 1.0 - smoothstep(0.5, 1.0, gOff);
        float vis = step(abs(q.y), hgt) * step(abs(q.x), wid + 0.02);
        float line = exp(-pow(q.y / max(hgt, 0.01), 2.0) * 3.0) * exp(-pow(q.x / max(wid, 0.02), 2.0) * 2.0) * smoothstep(0.3, 0.6, gOff);
        col = col * vis * (1.0 + (1.0 - hgt) * 2.0) + vec3(0.9, 0.95, 1.0) * line * (1.0 - smoothstep(0.95, 1.0, gOff));
    }
    return col;
}

vec4 render(vec2 uv) {
    float t = uTime;
    float rt = uRTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float high = clamp(uHigh, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    // --- calendario (fase 32) ---
    hkSetClimax(4.0, 18.0, 22.0);
    vec4 G = hkGrandV();
    vec4 C = hkClimaxOr(G, hkClimaxV());
    float grand = G.w > 0.0 ? 1.0 : 0.0;
    int cv = grand > 0.0 ? 0 : hkClimaxVar(3);
    float cA = (C.w > 0.0 && cv == 0) ? 1.0 : 0.0;
    float cB = (C.w > 0.0 && cv == 1) ? 1.0 : 0.0;
    float cC = (C.w > 0.0 && cv == 2) ? 1.0 : 0.0;
    vec4 S = hkSuceso(4.0, 7, 9.0);
    int sv = int(S.z);
    float se = S.x, sp = S.y, ss = S.w;
    vec4 D = hkDetalle(4.0, 5, 3.5);
    int dv = int(D.z);
    vec4 EST = hkEstado(4.0, 3);
    hkTimeline(S, D, C, cv, grand, hkEstadoIdx(4.0, 3));
    gWear = EST.y;
    // camina hacia la camara durante el pico; en las secuelas la cinta se come
    float walk = cA * clamp((C.w - 0.36) / 0.32, 0.0, 1.0) * step(0.0001, C.w) * (1.0 - step(0.70, C.w));
    float zap = max(sv == 0 ? se * step(0.25, sp) * (1.0 - step(0.75, sp)) : 0.0, G.z * step(0.85, G.w));
    // B termina en estatica
    zap = max(zap, cB * smoothstep(0.80, 0.83, C.w) * (1.0 - smoothstep(0.92, 0.96, C.w)));
    float eaten = cA * max(C.z, C.x * 0.25 * (1.0 - C.z));
    float figure = max(sv == 1 ? se : 0.0, cA * C.x * (1.0 - smoothstep(0.30, 0.38, C.w)));
    // lo que pasa en la pantalla
    gBlue = sv == 2 ? se : 0.0;
    gFace = sv == 3 ? se * smoothstep(0.0, 0.5, sp) : 0.0;
    gOff = sv == 4 ? se * smoothstep(0.08, 0.22, sp) * (1.0 - smoothstep(0.70, 0.74, sp)) : 0.0;
    gHand = sv == 5 ? se * smoothstep(0.15, 0.25, sp) * (1.0 - smoothstep(0.75, 0.9, sp)) : 0.0;
    gHandX = (ss - 0.5) * 1.0;
    gCam = cB * smoothstep(0.04, 0.12, C.w) * (1.0 - smoothstep(0.82, 0.86, C.w));
    gCamPh = C.w;
    float bleedK = cC * smoothstep(0.08, 0.55, C.w) * (1.0 - smoothstep(0.84, 0.97, C.w));
    gBleed = bleedK;
    gBand = dv == 1 ? D.y * 1.2 - 0.1 : -1.0;
    float flip = dv == 4 ? step(0.3, D.y) * (1.0 - step(0.7, D.y)) : 0.0;
    float keyFlash = 0.0;
    for (int k = 0; k < N_KEYS; k++) keyFlash += keyEnv(k, 0.02, 0.5) * (0.3 + keyVel(k)) * exp(-keyAge(k) * 3.0);

    // vista: cuarto <-> pantalla completa (por acto) y salto con locura
    vec2 act = hkAct();
    float mode = mix(mod(act.x, 2.0), mod(act.x + 1.0, 2.0), smoothstep(0.86, 1.0, act.y));
    float full = clamp(mode + hit * step(0.7, loco), 0.0, 1.0);
    // los sucesos del cuarto sacan la camara de la tele mientras duran
    full *= 1.0 - ((sv == 1 || sv == 6) ? se : 0.0);
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
        vec2 su = hwCover(sb * 0.5 + 0.5, SCR_H.x / SCR_H.y);
        if (flip > 0.5) su.y = 1.0 - su.y;
        screen = hwOverlay(sb * 0.5 + 0.5, hwVHS(su, t, rt, bass, high, hit, loco, zap, eaten), rt);
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
    // la luz del cuarto sigue a lo que pasa en la pantalla
    glowC = mix(glowC, vec3(0.10, 0.22, 0.95) * 0.7, gBlue);
    glowC = mix(glowC, vec3(0.55, 0.65, 0.6) * 0.35, gCam);
    glowC = mix(glowC, vec3(0.9, 0.08, 0.05) * 0.6, bleedK);
    glowC *= 1.0 - gOff * 0.9;
    float dist = length((p - SCR_C) * vec2(0.8, 1.0));
    float glowFall = 1.0 / (1.0 + dist * dist * 3.0);

    // --- cuarto ---
    vec4 rm = plate0(rUV(p, ROOM_R));
    vec3 col = plateCol(rm.rgb) * (0.35 * (1.0 + EST.x * 0.25 - EST.z * 0.65) + glowC * glowFall * 3.0);
    // la persiana (de -2.5 a -1.75): alguien pasa detras; dos ojos (detalle)
    vec2 wq = (p - vec2(-2.12, 0.22)) / vec2(0.38, 0.52);
    if (max(abs(wq.x), abs(wq.y)) < 1.0) {
        if (sv == 6 && se > 0.0) {
            vec2 fq = (p - vec2(mix(-2.9, -1.3, ss > 0.5 ? sp : 1.0 - sp), -0.42)) / 1.05;
            fq.x += sin(sp * 30.0) * 0.006;
            float fig = hwFigure(fq, 1.0);
            col = mix(col, col * 0.12, (1.0 - smoothstep(-0.01, 0.01, fig)) * se);
        }
        if (dv == 3) {
            vec2 ec = vec2(mix(-2.35, -1.9, D.w), mix(0.0, 0.55, fract(D.w * 7.3)));
            float bl = step(0.12, fract(rt * 0.4 + D.w));
            vec2 eq = vec2(abs(p.x - ec.x) - 0.035, p.y - ec.y);
            col += vec3(1.0, 0.85, 0.3) * exp(-dot(eq, eq) * 9000.0) * D.x * bl * 1.4;
        }
    }
    // figura sentada en el sillon (evento)
    if (figure > 0.01) {
        vec2 fq = p - vec2(1.25, -0.30);
        float fig = hwFigure(fq, 0.0);
        float fm = (1.0 - smoothstep(-0.004, 0.004, fig)) * figure;
        col = mix(col, vec3(0.005), fm);
        col += glowC * 0.25 * (1.0 - smoothstep(0.0, 0.006, abs(fig))) * figure * step(fq.x, 0.0);
    }

    // EASTER EGG "JAY INFINITO" (fase 38): la tele muestra el cartel de la
    // videocasetera (letras blancas con sombra, como un OSD de VHS) con
    // "JAY" y un infinito, y el reloj de la videocasetera dice JAY8
    vec2 EG = hkEgg(6.0);
    if (EG.x > 0.0) {
        vec2 oq = (p - SCR_C - vec2(-SCR_H.x * 0.28, SCR_H.y * 0.52)) / (SCR_H.y * 0.27);
        float od = hkText(oq, int[16](74, 65, 89, 32, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 5);
        float osh = hkText(oq - vec2(0.08, -0.08), int[16](74, 65, 89, 32, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 5);
        float on = EG.x;
        screen = mix(screen, vec3(0.0), (1.0 - smoothstep(0.07, 0.12, osh)) * on * 0.8);
        screen = mix(screen, vec3(0.95, 0.97, 1.0), (1.0 - smoothstep(0.07, 0.12, od)) * on);
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
        bool zero = dv == 0 && D.x > 0.5;              // detalle: el reloj marca 00:00
        if (zero) blinkC = step(0.3, fract(rt * 1.5));
        dig = max(dig, hwSeg7(cq - vec2(-3.6, 0.0), zero ? 0 : 1));
        dig = max(dig, hwSeg7(cq - vec2(-1.9, 0.0), zero ? 0 : 2));
        dig = max(dig, hwSeg7(cq - vec2(1.0, 0.0), 0));
        dig = max(dig, hwSeg7(cq - vec2(2.7, 0.0), 0));
        dig = max(dig, (1.0 - smoothstep(0.1, 0.2, length(vec2(cq.x + 0.45, abs(cq.y) - 0.45)))));
        if (EG.x > 0.0) {                               // easter egg: el reloj dice JAY8
            float jd = hkText(cq / 1.9 + vec2(0.1, 0.0), int[16](74, 65, 89, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 4);
            dig = mix(dig, 1.0 - smoothstep(0.06, 0.12, jd), EG.x);
            blinkC = mix(blinkC, 1.0, EG.x);
        }
        col += mix(vec3(0.2, 1.0, 0.6), vec3(1.0, 0.15, 0.1), zero ? 1.0 : 0.0) * dig * blinkC * 0.9;
    }
    // C: la sangre sale de la pantalla y baja por el mueble hasta el piso
    if (bleedK > 0.0) {
        float bottomY = SCR_C.y - SCR_H.y + 0.02;
        float cx = floor((p.x - SCR_C.x) / 0.045);
        if (abs(p.x - SCR_C.x) < SCR_H.x * 0.95 && p.y < bottomY) {
            float h = hash21(vec2(cx, 11.0));
            float len = smoothstep(0.35 + h * 0.2, 0.85, bleedK + 0.25) * (0.35 + 0.65 * h) * 0.75;
            float x0 = (cx + 0.5) * 0.045 + SCR_C.x + (h - 0.5) * 0.015;
            float w = 0.006 + 0.008 * h;
            float yy = clamp((bottomY - p.y) / max(len, 1e-3), 0.0, 1.0);
            float dd = max(abs(p.x - x0 - (noise21(vec2(p.y * 6.0, cx)) - 0.5) * 0.01) - w * mix(1.4, 0.7, yy), max(p.y - bottomY, bottomY - len - p.y));
            dd = min(dd, length((p - vec2(x0, bottomY - len)) / vec2(1.0, 1.3)) - w * 1.4);
            float bm = 1.0 - smoothstep(-0.002, 0.002, dd);
            col = mix(col, vec3(0.30, 0.01, 0.01) + glowC * 0.15, bm * step(0.01, len));
        }
        // charco al pie del mueble
        float pd = length((p - vec2(SCR_C.x, -0.93)) / vec2(0.9, 0.08)) - smoothstep(0.55, 1.0, bleedK) * 0.9;
        col = mix(col, vec3(0.20, 0.0, 0.0) + glowC * 0.1, (1.0 - smoothstep(-0.05, 0.05, pd)) * step(0.05, bleedK));
    }
    // detalle: un gato cruza el piso por delante
    if (dv == 2) {
        vec2 cc = vec2(mix(-3.2, 3.2, ss > 0.5 ? D.y : 1.0 - D.y), -0.86);
        vec2 kq = (p - cc) / 0.18;
        if (ss <= 0.5) kq.x = -kq.x;
        float stp = sin(D.y * 120.0);
        float body = length(kq / vec2(0.55, 0.22)) - 1.0;
        float head = length(kq - vec2(0.58, 0.18)) - 0.17;
        float ears = max(abs(kq.x - 0.58) - 0.13 + (kq.y - 0.30) * 0.6, abs(kq.y - 0.37) - 0.08);
        float tail = hkSeg(kq, vec2(-0.5, 0.05), vec2(-0.85, 0.45 + 0.1 * stp)) - 0.05;
        float legs = min(hkSeg(kq, vec2(0.35, -0.1), vec2(0.35 + stp * 0.08, -0.42)), hkSeg(kq, vec2(-0.35, -0.1), vec2(-0.35 - stp * 0.08, -0.42))) - 0.06;
        float cat = min(min(body * 0.2, head), min(min(ears, tail), legs));
        col = mix(col, vec3(0.004), (1.0 - smoothstep(-0.01, 0.01, cat)) * D.x);
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
        vec2 kk = clamp(ku, 0.0, 1.0);
        if (flip > 0.5) kk.y = 1.0 - kk.y;
        if (inside > 0.0) fcol = mix(side, hwOverlay(clamp(ku, 0.0, 1.0), hwVHS(kk, t, rt, bass, high, hit, loco, zap, eaten), rt), inside);
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
              cA * C.z * (1.0 - smoothstep(0.80, 0.95, C.w)) * smoothstep(0.69, 0.72, C.w) * 0.65);
    return vec4(hkFinish(max(col, 0.0), uv, vec3(0.5, 0.1, 0.1)), 1.0);
}
