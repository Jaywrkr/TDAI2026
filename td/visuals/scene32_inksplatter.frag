// ===============================================================
// SCENE 32 - SALPICADURA DE TINTA
// Hermana violenta de scene02 (ink): un charco base tranquilo, pero cada
// golpe de bombo dispara gotas de tinta que salen despedidas hacia
// afuera desde el centro, como un impacto real salpicando pintura.
// ===============================================================
//
// COMO FUNCIONA
// El charco base es el mismo fbm suave de scene02. Las gotas de
// salpicadura son puntos que nacen en el centro y viajan en una
// direccion FIJA por gota (hash), en un ciclo que se reinicia solo; el
// KICK empuja la velocidad de ese viaje -- con cada golpe, las gotas
// saltan mas lejos y mas rapido, exactamente como una salpicadura real
// reaccionando a un impacto.
//
// CONTROLES
//   Speed    velocidad base del ciclo de las gotas (ademas del kick)
//   Density  cuantas gotas hay
//   Hue      color de la tinta
//   Chaos    no usado directo (reservado)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     las gotas salen despedidas mas lejos y mas rapido
//   High     no usado directo (reservado)
//
// @D1: tamano de las gotas
// @D2: no usado directo (reservado)
// @D3: visibilidad de la niebla de fondo
// @D4: no usado directo (reservado)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    vec3  col = vec3(0.0);

    float h = audioHue(uHue, uMid * 0.15);
    vec3 inkCol = hsv2rgb(vec3(h, 0.85, 0.9));

    // Umbral bajado (0.45-0.65 -> 0.32-0.52): el charco base casi nunca
    // llegaba a mostrarse -- ahora aparece de forma confiable en reposo,
    // no solo en zonas de fbm con suerte.
    float poolField = fbm(p * 1.2 + t * 0.02, 4);
    float pool = smoothstep(0.32, 0.52, poolField) * smoothstep(0.6, 0.0, length(p));
    col += inkCol * pool * 0.7;

    int nDrops = 10 + int(floor(uDensity * 22.0));
    for (int i = 0; i < 32; i++) {
        if (i >= nDrops) break;
        float fi = float(i);
        vec2 seed = vec2(fi * 11.0, fi * 5.0);
        float dropAng = hash21(seed) * TAU;
        vec2 dir = vec2(cos(dropAng), sin(dropAng));

        float speed = 0.15 + hash21(seed + 1.0) * 0.4 + uKick * 1.8;
        float cyclePos = fract(t * (0.15 + uSpeed * 0.3) + hash21(seed + 2.0));
        float dist = cyclePos * (0.4 + speed * 0.6);
        vec2 dropPos = dir * dist;

        // Piso subido (0.5->0.9): en D1=0 las gotas quedaban casi
        // invisibles, no se leia la salpicadura en reposo.
        float dropSize = mix(0.015, 0.05, hash21(seed + 3.0)) * (1.0 - cyclePos * 0.6) * (0.9 + uD1 * 0.8);
        float d = length(p - dropPos);
        float drop = smoothstep(dropSize, dropSize * 0.3, d) * smoothstep(1.0, 0.6, cyclePos);
        col += inkCol * drop;
    }

    float fogField = fbm(p * 0.2 + vec2(t * 0.01, -t * 0.008) + 13.0, 3);
    col += hsv2rgb(vec3(fract(h + 0.02), 0.2, 0.6)) * smoothstep(0.4, 0.9, fogField) * uD3 * 0.4;

    // PIANO: un impacto directo grande cae en el punto que elige
    // uKeypos, mas alla de lo que ya dispara el kick -- uKeypulse decae
    // solo (se expande y se disuelve), uKeyvel escala el tamano.
    if (uKeypulse > 0.0015) {
        vec2 impactPosP = vec2((uKeypos - 0.5) * 2.2, cos(uKeypos * 8.0) * 0.7);
        float impactR = (1.0 - uKeypulse) * (0.12 + uKeyvel * 0.25);
        float dImpact = abs(length(p - impactPosP) - impactR);
        float impactRing = exp(-dImpact * dImpact / 0.001) * uKeypulse;
        float impactCore = exp(-length(p - impactPosP) * length(p - impactPosP) / 0.006) * uKeypulse * 0.6;
        col += inkCol * (impactRing + impactCore);
    }

    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
