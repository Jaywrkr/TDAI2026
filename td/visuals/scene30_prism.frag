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

    // TRIANGULO de verdad. La version anterior era max() de tres
    // semiplanos que NO formaban un triangulo: dos horizontales
    // (y < 0.32, y > -0.32) y uno vertical (x < 0.21) -- o sea una CAJA
    // abierta a la izquierda. En pantalla se veia literalmente un
    // rectangulo gris, no un prisma.
    //
    // Ahora son los tres lados reales de un triangulo con el vertice
    // apuntando a la DERECHA, que es de donde sale el abanico de
    // dispersion (fanOrigin, mas abajo): cara plana a la izquierda por
    // donde entra el haz, y las dos caras inclinadas que se juntan en la
    // punta por donde sale.
    const vec2 TRI_A = vec2(-0.18,  0.30);   // esquina arriba-izquierda
    const vec2 TRI_B = vec2(-0.18, -0.30);   // esquina abajo-izquierda
    const vec2 TRI_C = vec2( 0.22,  0.00);   // vertice de salida
    // Cada semiplano es normal . (punto - vertice); negativo = adentro.
    float e0 = -(pp.x - TRI_A.x);                              // cara de entrada
    float e1 = dot(normalize(vec2(0.6, 0.8)), pp - TRI_A);     // cara superior
    float e2 = dot(normalize(vec2(0.6, -0.8)), pp - TRI_B);    // cara inferior
    float pTri = max(e0, max(e1, e2));
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

    // MATERIAL DE VIDRIO. Antes era un gris plano (0.55,0.65,0.72)*0.3
    // en todo el interior: se leia como cartulina recortada, no como un
    // objeto. Tres cosas baratas lo convierten en vidrio:
    //   1. un gradiente interno (mas denso abajo, como vidrio grueso),
    //   2. bordes brillantes -- en un solido transparente la luz se
    //      concentra en los cantos, es lo que mas "lo hace vidrio",
    //   3. un reflejo especular corrido del centro.
    float edgeGlow = smoothstep(0.05, 0.0, abs(pTri));      // canto
    float depth = smoothstep(0.35, -0.35, pp.y);            // grosor
    vec3 glassCol = mix(vec3(0.16, 0.21, 0.28),
                        vec3(0.34, 0.42, 0.52), depth);
    float spec = smoothstep(0.16, 0.0, length(pp - vec2(-0.02, 0.12)));
    glassCol += vec3(0.55, 0.62, 0.70) * spec * 0.35;
    glassCol += vec3(0.75, 0.85, 1.0) * edgeGlow * 0.55;
    col = mix(col, glassCol, inPrism);
    // El canto tambien brilla por FUERA del solido, como un borde de
    // vidrio captando luz -- sin esto el triangulo se recorta demasiado
    // duro contra el negro.
    col += vec3(0.5, 0.62, 0.8) * edgeGlow * 0.25;

    // El abanico nace en el VERTICE real del triangulo, no en un punto
    // aproximado: antes iba a prismCenter + 0.2 en x, que con la forma
    // vieja caia en cualquier lado.
    vec2 fanOrigin = prismCenter + TRI_C;
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
