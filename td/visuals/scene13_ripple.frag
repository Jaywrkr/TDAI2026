// ===============================================================
// SCENE 13 - RIPPLE
// Un pulso de anillo (mas un par de ecos detras) que respira con el
// ritmo, desde el centro. Reescrita para ser mas simple y distinta de
// scene10_chroma (que usa el mismo campo de anillos periodico infinito
// -- esta es un solo pulso finito, sin ese patron).
// ===============================================================
//
// COMO FUNCIONA
//
// Nada de fract() ni patron periodico de anillos: hay UN radio de anillo
// (ringR) que respira lento con el tiempo como respaldo sin musica, y que
// Beat/Kick empujan hacia afuera en cada golpe. Alrededor de ese radio se
// dibuja un solo pulso gaussiano (exp(-(r-ringR)^2/w^2)) -- suave, no un
// borde nitido. Density agrega hasta 2 ecos mas detras del principal,
// cada uno mas tenue, en un bucle finito de a lo sumo 3 -- no un campo
// infinito de anillos como en chroma.
//
// CONTROLES
//   Speed    velocidad de respiracion del radio de reposo (respaldo sin
//            musica)
//   Density  cuantos ecos hay detras del anillo principal (1 a 3)
//   Hue      color del pulso
//   Chaos    separacion entre el anillo principal y sus ecos
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte adicional (audioHue)
//   Kick     empuje extra del radio + flash -- ya llega con envolvente de
//            golpe-y-caida (audio.py)
//   High     vibracion micro del radio (excepcion del contrato)
//
// @D1: ancho del pulso (fino y nitido <-> ancho y difuso)
// @D2: cuanto empuja Beat el radio hacia afuera en cada golpe
// @D3: caida de los ecos (todos brillan casi igual <-> se apagan rapido)
// @D4: radio base del pulso en reposo (chico y centrado <-> grande,
//      casi llena la pantalla)
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Radio de reposo: respira lento, respaldo para cuando no hay musica.
    // D4: escala el radio base -- chico y centrado <-> grande, casi
    // llena la pantalla. D2 tambien escala CUANTO respira en reposo (ademas
    // de cuanto empuja Beat mas abajo) -- asi el knob se nota aunque no
    // haya musica sonando en ese momento, no solo cuando hay beat.
    float baseR = 0.12 + uD4 * 0.55;
    float restR = baseR + (0.04 + uD2 * 0.20) * sin(t * (0.15 + uSpeed * 0.3));

    // Beat empuja el anillo hacia afuera en cada golpe (D2 = cuanto);
    // Kick suma un empujon extra, instantaneo.
    float ringR = restR + uBeat * (0.35 + uD2 * 0.9) + uKick * 0.15;

    // uHigh: vibracion micro del radio -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    ringR += uHigh * 0.006 * sin(t * 12.0);

    float r = length(p);
    float width = 0.03 + uD1 * 0.12;

    float h = audioHue(uHue, uMid * 0.16);
    vec3 waveCol = hsv2rgb(vec3(h, 0.75, 1.0));

    int echoes = 1 + int(floor(uDensity * 2.99));
    float spacing = 0.10 + uChaos * 0.10;
    // D3: que tan rapido se apagan los ecos -- bajo = todos casi igual de
    // brillantes, alto = el primero domina y el resto casi no se ve.
    float echoDecay = 0.15 + uD3 * 1.6;

    vec3 col = vec3(0.0);
    for (int i = 0; i < 3; i++) {
        if (i >= echoes) break;

        float fi = float(i);
        float rr = ringR - fi * spacing;
        float d = r - rr;
        float wave = exp(-d * d / (width * width)) * exp(-fi * echoDecay);

        col += waveCol * wave;
    }

    // Kick: flash breve, ademas del empujon de radio de arriba.
    col += col * uKick * 0.4;

    // Bajos: brillo de lo ya claro. Nunca geometria.
    col = audioLift(col, uBass * 0.7);

    col *= vignette(uv, 0.4);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
