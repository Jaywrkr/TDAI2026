// ===============================================================
// HALLOWEEN 06 - VHS DE TERROR (usa la carpeta Media)
// La imagen o video de la carpeta Media como una cinta VHS maldita:
// lineas de barrido, perdida de tracking, color corrido, ruido y una
// banda que sube. Sin archivo cargado se ve estatica de televisor.
// Speed mueve la banda y el ruido. El golpe dispara un salto de
// tracking; el bajo separa los canales de color. Historia: cada ~44 s
// cambio de canal con estatica; cada ~97 s la cinta se come y se estira.
//
// @D1: cantidad de ruido / estatica
// @D2: perdida de tracking
// @D3: color (sepia <-> rojo terror)
// @D4: lineas de barrido
// @D5: banda que sube
// @D6: contraste
// ===============================================================

vec4 render(vec2 uv) {
    float t = uTime;
    float rt = uRTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = hkHit();
    float loco = hkLoco();

    // tracking: bandas horizontales que se corren
    float band = floor(uv.y * 40.0);
    float jitter = (noise21(vec2(band, floor(rt * 18.0))) - 0.5);
    float wobble = sin(uv.y * 30.0 + t * 3.0) * 0.002;
    float trackAmt = (0.004 + uD2 * 0.03) + hit * (0.02 + uD2 * 0.06) * (1.0 + loco * 2.0);
    float tear = step(0.82 - hit * 0.5, noise21(vec2(band * 0.37, floor(rt * 6.0))));
    // historia: cada ~44 s alguien cambia de canal (estatica total un
    // momento) y cada ~97 s la cinta se "come" y la imagen se estira
    float zap = hkEvent(3.0, 44.0, 2.2);
    float eaten = hkEvent(4.0, 97.0, 6.0);
    vec2 suv = uv;
    suv.x = mix(suv.x, 0.5 + (suv.x - 0.5) * (1.0 + 0.4 * sin(uv.y * 8.0 + rt * 3.0)), eaten);
    // locura: la imagen rueda verticalmente y se duplica
    suv.y = fract(suv.y + hit * loco * 0.25 * step(0.5, noise21(vec2(floor(rt * 4.0), 9.0))));
    suv.x += jitter * trackAmt * (0.3 + tear) + wobble;
    // salto vertical del golpe
    suv.y = fract(suv.y + hit * 0.04 * step(0.6, noise21(vec2(floor(rt * 10.0), 2.0))));

    // separacion de color
    float split = 0.002 + bass * 0.010 + hit * 0.008;
    vec3 img;
    img.r = mediaTex(suv + vec2(split, 0.0)).r;
    img.g = mediaTex(suv).g;
    img.b = mediaTex(suv - vec2(split, 0.0)).b;

    // sin imagen: estatica
    float has = step(0.02, dot(mediaTex(vec2(0.5)).rgb + mediaTex(vec2(0.3, 0.7)).rgb, vec3(1.0)));
    float stat = hash21(floor(uv * vec2(uResW, uResH) * 0.5) + floor(rt * 30.0));
    vec3 staticCol = vec3(stat) * 0.55;
    img = mix(staticCol, img, has * (1.0 - smoothstep(0.2, 0.6, zap)));

    // grade: desaturado, sepia o rojo
    float l = dot(img, vec3(0.299, 0.587, 0.114));
    vec3 sepia = vec3(1.0, 0.85, 0.65) * l;
    vec3 redT = vec3(1.0, 0.18, 0.12) * pow(l, 0.9) + vec3(0.05, 0.0, 0.0);
    vec3 col = mix(img * 0.35 + sepia * 0.65, redT, uD3);
    float contrast = 1.0 + uD6 * 0.9;
    col = clamp((col - 0.5) * contrast + 0.5, 0.0, 1.0);

    // ruido y nieve
    float n = hash21(uv * vec2(uResW, uResH) + fract(rt * 7.0) * 100.0);
    col += (n - 0.5) * (0.06 + uD1 * 0.35);
    // barrido
    float scan = 0.5 + 0.5 * sin(uv.y * uResH * PI);
    col *= 1.0 - (0.10 + uD4 * 0.35) * scan;
    // banda que sube
    float roll = fract(uv.y - t * 0.08);
    col += vec3(0.25, 0.22, 0.22) * smoothstep(0.08, 0.0, abs(roll - 0.5)) * uD5;
    // lineas blancas de tracking en el borde inferior
    float bottom = smoothstep(0.08, 0.0, uv.y) * step(0.6, noise21(vec2(uv.x * 80.0, floor(rt * 20.0))));
    col += vec3(0.6) * bottom * (0.3 + uD2);
    // mancha de golpe: cuadro casi blanco un instante
    col += vec3(0.9, 0.85, 0.85) * hit * 0.12 * tear;

    // cuadro invertido de locura
    float inv = hit * step(0.75, loco) * step(0.7, noise21(vec2(floor(rt * 12.0), 4.0)));
    col = mix(col, vec3(1.0) - col, inv);
    // REC: punto rojo que parpadea arriba a la izquierda
    vec2 rp = (uv - vec2(0.06, 0.92)) * vec2(uAspect, 1.0);
    col += vec3(1.0, 0.05, 0.05) * (1.0 - smoothstep(0.012, 0.016, length(rp))) * step(0.5, fract(rt * 0.8));
    return vec4(hkFinish(max(col, 0.0), uv, vec3(0.5, 0.1, 0.1)), 1.0);
}
