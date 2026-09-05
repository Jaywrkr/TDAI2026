// ===============================================================
// SCENE 30 - PRISMA / DISPERSION
// Un haz de luz blanca entra desde un costado, atraviesa un prisma y sale
// dispersado en un abanico de arcoiris real -- el angulo de apertura del
// abanico reacciona a Mid (geometria real, no solo color).
// ===============================================================
//
// COMO FUNCIONA
// El prisma es una forma triangular simple (tres semi-planos combinados
// con max()). El haz incidente es una franja horizontal blanca que llega
// hasta el prisma. Del vertice de salida sale un abanico angular: dentro
// de ese abanico, el HUE de cada rayo depende de su angulo (no de una
// paleta fija) -- eso es la dispersion real, cada "color" de luz sale en
// un angulo distinto, como en un prisma de verdad.
//
// CONTROLES
//   Speed    no usado directo (reservado)
//   Density  no usado directo (reservado)
//   Hue      corrimiento fino sobre el arcoiris de dispersion
//   Chaos    no usado directo (reservado)
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      ABRE el abanico de dispersion (geometria real)
//   Kick     el abanico destella mas fuerte
//   High     no usado directo (reservado)
//
// @D1: alcance/opacidad de los rayos dispersos
// @D2: no usado directo (reservado)
// @D3: no usado directo (reservado)
// @D4: apertura base del abanico (ademas de la que agrega Mid)
// ===============================================================

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);

    vec2 prismCenter = vec2(-0.15, 0.0);
    vec2 pp = p - prismCenter;
    float pTri = max(pp.y - 0.32, max(-pp.y - 0.32, pp.x * 1.7 - 0.35));
    float inPrism = smoothstep(0.012, -0.012, pTri);

    float beam = smoothstep(0.045, 0.0, abs(p.y)) * step(p.x, prismCenter.x - 0.08);
    vec3 beamCol = vec3(1.0);
    // PIANO: el haz incidente cambia de color un instante antes de
    // entrar al prisma, con cada tecla -- uKeypos elige el tinte,
    // uKeypulse decae solo (vuelve a blanco por su cuenta).
    if (uKeypulse > 0.0015) {
        vec3 tintBeam = hsv2rgb(vec3(fract(uKeypos), 0.8, 1.0));
        beamCol = mix(vec3(1.0), tintBeam, uKeypulse * (0.6 + uKeyvel * 0.4));
    }
    vec3 col = beamCol * beam * 0.8;
    col = mix(col, vec3(0.55, 0.65, 0.72) * 0.3, inPrism);

    vec2 fanOrigin = prismCenter + vec2(0.2, 0.0);
    vec2 fp = p - fanOrigin;
    float fanR = length(fp);
    float fanAng = atan(fp.y, fp.x);
    // PIANO: el abanico se abre mucho mas de golpe con cada tecla --
    // geometria real (spread es el angulo de apertura, no un tinte de
    // color), como una explosion real de dispersion. uKeypulse decae
    // solo; uKeyvel escala cuanto se abre.
    float spread = 0.12 + uD4 * 0.25 + uMid * 0.55 + uKeypulse * (0.5 + uKeyvel * 0.9);
    float inFan = step(0.0, fp.x) * smoothstep(spread, spread - 0.03, abs(fanAng));

    float hueInFan = clamp(0.5 + (fanAng / max(spread, 0.001)) * 0.5, 0.0, 1.0) * 0.8;
    vec3 rayCol = hsv2rgb(vec3(fract(hueInFan + uHue * 0.15), 0.9, 1.0));

    float rayFade = smoothstep(1.4, 0.1, fanR) * (0.4 + uD1 * 1.0);
    col += rayCol * inFan * rayFade * (1.0 + uKick * 0.9);

    col += col * uKick * 0.3;
    col = audioLift(col, uBass * 0.5);
    col *= vignette(uv, 0.25);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.008;

    return vec4(col, 1.0);
}
