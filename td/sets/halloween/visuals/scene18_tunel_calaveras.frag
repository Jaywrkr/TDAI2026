// ===============================================================
// HALLOWEEN 18 - TUNEL DE CALAVERAS
// Catacumba infinita: un tunel cuyas paredes estan hechas de calaveras
// apiladas, iluminado por una luz que viene desde el fondo.
// Speed avanza por el tunel. El bajo enciende la luz del fondo; el
// golpe ilumina un anillo de calaveras que viaja hacia la camara; los
// medios hacen girar el tunel despacio.
//
// @D1: calaveras por vuelta
// @D2: velocidad de avance (encima de Speed)
// @D3: anillo de luz con el golpe
// @D4: ojos encendidos
// @D5: color de la luz (antorcha <-> verde)
// @D6: niebla del tunel
// ===============================================================

float hwMiniSkull(vec2 q) {
    float c = length((q - vec2(0.0, 0.08)) / vec2(1.0, 0.95)) - 0.36;
    float jaw = length(max(abs(q - vec2(0.0, -0.22)) - vec2(0.17, 0.08), 0.0)) - 0.04;
    float s = min(c, jaw);
    float eye = length(vec2(abs(q.x) - 0.14, q.y - 0.02)) - 0.095;
    float nose = max(abs(q.x) * 1.5 + (q.y + 0.12) * 0.8 - 0.05, -(q.y + 0.16));
    return max(s, -min(eye, nose));
}

vec4 render(vec2 uv) {
    vec2 p = hkPunch(hkShake(centered(uv)));
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float mid = clamp(uMid, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();
    float hue = audioHue(uHue, mid * 0.006);

    vec3 lightC = mix(vec3(1.0, 0.55, 0.20), hsv2rgb(vec3(fract(0.33 + hue), 0.85, 1.0)), uD5);
    float r = length(p);
    float a = atan(p.y, p.x) + t * 0.03 + mid * 0.08;
    // locura: el tunel se retuerce con el golpe
    a += hit * loco * 0.6 * sin(0.35 / max(r, 0.02) * 0.8 + uRTime * 3.0);
    // coordenadas del tunel: profundidad 1/r
    float depth = 0.35 / max(r, 0.02);
    float travel = t * (0.35 + uD2 * 0.8);
    float z = depth + travel;
    float per = 10.0 + floor(uD1 * 10.0);
    vec2 tc = vec2(a / TAU * per, z * per / TAU * 2.2);
    vec2 id = floor(tc);
    tc.x += 0.5 * mod(id.y, 2.0);
    id = floor(tc);
    vec2 f = fract(tc) - 0.5;
    float sk = hwMiniSkull(f * 1.15);
    float mask = 1.0 - smoothstep(-0.03, 0.03, sk);
    float shade = 0.55 + 0.45 * hash21(id);
    vec3 boneC = vec3(0.85, 0.78, 0.62) * shade;

    // luz: mas fuerte cerca del fondo (r chico) y con niebla
    float fogAmt = 1.0 - exp(-depth * (0.10 + uD6 * 0.25));
    float lightFall = exp(-depth * 0.18) ;
    vec3 lit = boneC * lightC * (0.25 + 1.6 * (1.0 - lightFall) * 0.0 + 0.9 * exp(-(depth - 0.35) * 0.08));
    lit *= 0.35 + 0.65 * smoothstep(-0.25, 0.25, f.y);   // volumen
    // anillo del golpe que viaja hacia la camara
    float ringZ = fract(uRTime * 0.8) * 8.0;
    float ring = exp(-pow((depth - (8.0 - ringZ)) * 1.5, 2.0)) * hit * (0.5 + uD3 * 1.5);
    lit += boneC * lightC * ring * 1.5;
    // antorchas en las paredes cada tanto: bandas de luz calida
    float ring2 = fract(z * 0.22);
    float torchB = exp(-pow((ring2 - 0.5) * 8.0, 2.0)) * (0.6 + 0.4 * sin(t * 9.0 + floor(z * 0.22)));
    lit += boneC * vec3(1.0, 0.55, 0.20) * torchB * 0.9;
    vec3 col = mix(vec3(0.01, 0.006, 0.004), lit, mask);
    col += vec3(1.0, 0.5, 0.15) * torchB * 0.06 * (1.0 - mask);
    // ojos encendidos en algunas calaveras
    float eyeOn = step(0.80 - uD4 * 0.5, hash21(id + 7.0));
    float eyes = 1.0 - smoothstep(0.0, 0.05, length(vec2(abs(f.x * 1.15) - 0.14, f.y * 1.15 - 0.02)) - 0.06);
    col += lightC * eyes * eyeOn * (0.6 + bass * 0.8 + hit * 0.4) * (1.0 - fogAmt * 0.7);
    // niebla y luz del fondo
    vec3 fogC = lightC * (0.35 + bass * 0.5);
    col = mix(col, fogC * 0.5, fogAmt * 0.85);
    col += lightC * exp(-r * (6.0 - bass * 2.0)) * (0.8 + bass);

    return vec4(hkFinish(col, uv, vec3(0.7, 0.4, 0.1)), 1.0);
}
