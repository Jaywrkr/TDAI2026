// ===============================================================
// HALLOWEEN 05 - SANGRE QUE CHORREA
// Una franja de sangre arriba que chorrea en hilos espesos, con gota
// redonda en la punta y brillo humedo. Al fondo, pared oscura.
// Speed hace bajar los hilos. El bajo engorda el brillo humedo; el
// golpe suelta hilos nuevos y rapidos (cada columna a su tiempo).
//
// @D1: cantidad de hilos
// @D2: largo de los chorreones
// @D3: grosor de los hilos
// @D4: brillo humedo
// @D5: color (rojo vivo <-> sangre negra)
// @D6: textura de la pared
// ===============================================================

vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime;
    float bass = clamp(uBass, 0.0, 1.0) * uAudioamt;
    float hit = clamp(max(uKick, uBeat * 0.7), 0.0, 1.0) * uAudioamt;
    float hue = audioHue(uHue, clamp(uMid, 0.0, 1.0) * 0.006);

    // pared
    float wallN = fbm(p * vec2(2.0, 3.0) + 11.0, 5, 0.55);
    float cracks = ridge(noise21(p * 6.0 + 3.0), 6.0);
    vec3 col = vec3(0.060, 0.032, 0.036) * (0.6 + (0.5 + uD6) * wallN);
    col -= vec3(0.02) * cracks * uD6;

    float top = 1.0 - 0.16 - 0.04 * sin(p.x * 3.0 + 0.7) - 0.03 * noise21(vec2(p.x * 5.0, 0.0));
    float cols = 14.0 + floor(uD1 * 30.0 + uDensity * 8.0);
    float cw = 2.0 * uAspect / cols;
    float cx = floor((p.x + uAspect) / cw);

    // distancia firmada: negativa = sangre. La franja es todo lo que
    // queda ARRIBA de 'top'.
    float d = top - p.y;
    float bodyH = 0.0;
    for (int k = -1; k <= 1; k++) {
        float id = cx + float(k);
        float h1 = hash21(vec2(id, 1.7));
        float h2 = hash21(vec2(id, 8.3));
        if (h1 < 0.25) continue;
        float x0 = (id + 0.5) * cw - uAspect + (h2 - 0.5) * cw * 0.5;
        // ciclo de cada hilo: crece, se suelta, vuelve a crecer
        // (el golpe NO toca la velocidad: t*velocidad saltaria de fase)
        float speed = 0.05 + 0.10 * h2;
        float cyc = fract(t * speed + h1 * 5.0);
        float len = (0.55 + 1.3 * uD2) * (0.25 + 0.75 * h1) * smoothstep(0.0, 0.85, cyc);
        // el golpe estira de golpe la mitad de los hilos, cada uno distinto
        len *= 1.0 + hit * (0.15 + 0.35 * h2) * step(0.5, h1);
        float w = cw * (0.10 + 0.18 * uD3) * (0.7 + 0.6 * h2);
        float tipY = top - len;
        // hilo: mas ancho arriba, se afina, con la gota en la punta
        float yy = clamp((top - p.y) / max(len, 1e-3), 0.0, 1.0);
        float width = w * mix(1.6, 0.75, yy);
        float strand = max(abs(p.x - x0) - width, max(p.y - top, tipY - p.y));
        float drop = length((p - vec2(x0, tipY)) / vec2(1.0, 1.25)) - w * 1.55;
        float dd = min(strand, drop);
        // gota que cae sola al final del ciclo
        float fall = smoothstep(0.85, 1.0, cyc);
        float fy = tipY - fall * 0.9;
        float falling = length((p - vec2(x0, fy)) / vec2(1.0, 1.4)) - w * 1.2 * step(0.86, cyc);
        dd = min(dd, falling);
        d = min(d, dd);
    }
    float mask = 1.0 - smoothstep(-0.0025, 0.0025, d);

    // color y brillo humedo: normal falsa desde la distancia
    vec2 gd = vec2(dFdx(d), dFdy(d));
    vec3 n = normalize(vec3(-gd * 60.0, 1.0));
    vec3 L = normalize(vec3(-0.4, 0.6, 0.7));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float spec = pow(clamp(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 24.0);
    vec3 red = hsv2rgb(vec3(fract(0.995 + hue), 1.0, 0.85));
    vec3 dark = hsv2rgb(vec3(fract(0.985 + hue), 1.0, 0.22));
    vec3 bc = mix(red, dark, uD5 * 0.8);
    float depthShade = smoothstep(0.05, -0.02, d);
    vec3 bcol = bc * (0.45 + 0.55 * diff) * mix(1.0, 0.65, depthShade);
    bcol += vec3(1.0, 0.85, 0.85) * spec * (0.35 + uD4 * 1.1 + bass * 0.8);
    col = mix(col, bcol, mask);
    // la sangre tiñe la pared de abajo, como reflejo
    col += red * 0.06 * exp(-max(d, 0.0) * 18.0) * (1.0 - mask);

    col *= vignette(uv, 0.40);
    return vec4(col, 1.0);
}
