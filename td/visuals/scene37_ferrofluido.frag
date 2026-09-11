// ===============================================================
// SCENE - FERROFLUIDO
// Un charco liquido casi negro con picos metalicos tipo limadura de
// hierro que se paran alrededor del borde, mas puntiagudos o mas romos
// segun Detail, con un brillo especular fino en el borde y en las
// puntas. Es la primera escena del set con una MATERIA distinta al
// resto: todo lo demas es luz/glow sobre negro, esto es liquido y metal
// -- oscuro, con textura, no una silueta de linea fina.
// ===============================================================
//
// COMO FUNCIONA
// El borde del charco es un radio que varia con el angulo: R(ang) =
// radio base + una cresta (ridge() sobre fbm, mismo mecanismo que el
// filo de una montana) muestreada en (cos(ang), sin(ang)) -- ese truco
// hace que el patron cierre perfecto en el circulo completo, sin costura
// en 0/2pi. Los picos DERIVAN solo con el tiempo (nunca con el audio);
// el Kick les da un empujon de altura ACOTADO que se relaja solo con la
// propia envolvente de uKick (la excepcion documentada del contrato),
// como si el campo magnetico real pulsara con el golpe.
//
// CONTROLES
//   Speed    velocidad de deriva de los picos alrededor del charco
//   Density  cuantos picos entran en la vuelta completa
//   Hue      tinte del brillo especular (borde + puntas)
//   Chaos    irregularidad extra del contorno del charco
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional del brillo especular (audioHue)
//   Kick     empuja la altura de los picos -- ACOTADO, se relaja solo
//            con la envolvente de uKick (excepcion del contrato)
//   High     vibracion micro del borde (excepcion del contrato)
//
// @D1: agudeza de los picos (romos/redondeados <-> agujas finas)
// @D2: altura de los picos
// @D3: visibilidad de las lineas de campo magnetico internas
// @D4: brillo del reflejo especular (borde + puntas)
// @D5: velocidad extra de deriva de los picos
// @D6: que tan negro (0) o plateado (1) se ve el liquido en reposo
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);
    float r = length(p);
    float ang = atan(p.y, p.x);

    // Los picos giran despacio alrededor del charco: se rota el angulo
    // de muestreo, no el propio p -- el patron sigue cerrando perfecto.
    float drift = t * (0.03 + uSpeed * 0.08 + uD5 * 0.10);
    float angS = ang + drift;

    float freq = 5.0 + uDensity * 11.0;
    vec2  ridgeDom = vec2(cos(angS), sin(angS)) * freq;
    float n = fbm(ridgeDom, 4, 0.55);
    float spikeShape = ridge(n, 1.5 + uD1 * 4.5);

    // Kick: empuje de altura ACOTADO -- se relaja solo con la propia
    // envolvente de uKick (ya decae sola en el control), nunca queda
    // "trabado" arriba. Es la excepcion documentada del contrato para
    // Kick, no una perilla nueva.
    float spikeAmp = (0.10 + uD2 * 0.24) * (1.0 + uKick * 1.3);
    float R0 = 0.42 + uChaos * 0.12;
    float R = R0 + spikeShape * spikeAmp;
    // uHigh: vibracion micro del borde -- unica excepcion del contrato.
    R += uHigh * 0.006 * sin(ang * 23.0 + t * 9.0);

    float sdf = r - R;

    float h = audioHue(fract(uHue + 0.5), uMid * 0.08);
    vec3  accent = hsv2rgb(vec3(h, 0.55, 1.0));
    // El liquido en reposo: de negro absoluto a un plateado apagado,
    // segun D6 -- nunca compite con el brillo especular.
    vec3  liquidCol = mix(vec3(0.0), vec3(0.55, 0.58, 0.62), uD6 * 0.4);

    // Adentro del charco: el liquido, con lineas de campo tenues.
    float inside = 1.0 - smoothstep(-0.01, 0.01, sdf);
    float fieldFreq = 2.0 + uD3 * 5.0;
    float fieldLine = ridge(fbm(ridgeDom * 0.35 + fieldFreq, 3, 0.5), 6.0);
    vec3  col = liquidCol * inside * (0.10 + fieldLine * uD3 * 0.25);

    // Brillo especular sobre el borde: una linea fina justo en sdf=0,
    // mas fuerte donde el pico es mas agudo (como luz real prendiendo
    // sobre una punta metalica).
    float rim = exp(-sdf * sdf * 900.0);
    float tipGlint = smoothstep(0.7, 1.0, spikeShape) * rim;
    col += accent * rim * (0.5 + uD4 * 1.4);
    col += vec3(1.0) * tipGlint * (0.3 + uD4 * 0.7);

    // Afuera del charco: aire oscuro, casi vacio, para que el objeto
    // respire -- ligerisimo resplandor apagado alrededor del borde.
    float halo = exp(-max(sdf, 0.0) * max(sdf, 0.0) * 40.0) * (1.0 - inside);
    col += accent * halo * 0.12;

    // PIANO: un dedo "toca" el liquido en el angulo que elige uKeypos --
    // empuja un pico puntual mas alto ahi mismo, decae solo con
    // uKeypulse (mismo patron que el resto del set), uKeyvel escala
    // cuanto empuja.
    if (uKeypulse > 0.0015) {
        float pokeAng = uKeypos * TAU;
        float angDiff = mod(ang - pokeAng + PI, TAU) - PI;
        float pokeW = 0.35;
        float poke = exp(-angDiff * angDiff / (pokeW * pokeW)) * uKeypulse * (0.25 + uKeyvel * 0.5);
        float rPoke = r - (R + poke);
        float pokeGlow = exp(-rPoke * rPoke * 500.0) * step(0.0, poke - 0.001);
        col += vec3(1.0, 0.95, 0.85) * pokeGlow * uKeypulse;
    }

    col += col * uKick * 0.2;
    col = audioLift(col, uBass * 0.6);
    col *= vignette(uv, 0.22);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
