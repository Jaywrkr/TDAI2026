// ===============================================================
// SCENE 00 - VEINS
// Red vascular luminosa con pulsos de flujo, reactiva a audio.
// ===============================================================
//
// COMO FUNCIONA (leelo si vas a modificarlo o a pedirle cambios a una IA)
//
// 1. LA FORMA no sale de un Edge TOP ni de un threshold sobre ruido.
//    Sale del CONJUNTO DE NIVEL de un campo fbm: el lugar donde el ruido
//    cruza 0.5 es una curva continua que se ramifica sola. Un threshold da
//    manchas; un conjunto de nivel da filamentos. Esa es toda la diferencia
//    entre "plasma" y "venas".
//
// 2. EL GROSOR es constante en pixeles, no en unidades de ruido. Se logra
//    dividiendo la distancia al nivel por fwidth() -> la derivada en
//    pantalla. Sin esto las venas se ensanchan en las zonas planas del
//    ruido y aparecen manchones blancos.
//
// 3. LA JERARQUIA: troncos (baja frecuencia, gruesos) + capilares (alta
//    frecuencia, finos) enmascarados por el halo de los troncos, para que
//    nazcan DE ellos y no floten sueltos.
//
// 4. LOS VACIOS: una mascara de cobertura de muy baja frecuencia apaga
//    regiones enteras. Sin ella la pantalla se llena por igual y se lee
//    como textura, no como organismo.
//
// 5. CONTRATO DE AUDIO (Fase 2): el audio SOLO toca brillo y color, nunca
//    geometria. La version anterior tenia uLevel en 'breathe' y en 'cover',
//    y uBass en el ancho de linea (wT/wC) -- eso es lo que se veia como
//    temblor: con un microfono de ambiente el nivel nunca esta quieto, y
//    ahi estaba escalando la POSICION y el GROSOR de cada pixel cada frame.
//    Ahora Bass solo sube el brillo (audioLift, al final, antes del
//    tonemap) y High se deja tocar el warp pero a escala micro (+0.05 como
//    mucho) porque esa es la unica excepcion del contrato -- ademas ya
//    llega suavizado desde audio.py, asi que no reintroduce el temblor.
//
// CONTROLES
//   Speed    velocidad global (uTime ya viene integrado: sin saltos de fase)
//   Density  cuanta red se ve (abre la mascara de cobertura) + capilares
//   Hue      paleta completa: sangre / cyan / violeta...
//   Chaos    domain warp = que tan retorcidas van
//   Bass     brillo de lo que ya esta claro (audioLift) + un poco de
//            movimiento del warp (ya suavizado, no reintroduce temblor)
//   Mid      tinte adicional (audioHue)
//   Kick     flash -- ya llega con envolvente de golpe-y-caida (audio.py)
//   Beat     empuja los pulsos de flujo
//   High     brillo de los capilares + vibracion micro de las intersecciones
//   Level    halo (brillo), NO la respiracion -- esa es solo tiempo ahora
//
// @D1: grosor general de la red (troncos + capilares juntos)
// @D2: intensidad del halo/resplandor alrededor de los troncos
// @D3: alcance de los capilares -- cuanto se alejan del tronco antes de
//      desvanecerse (cortos y pegados <-> largos, se extienden lejos)
// @D4: separacion entre troncos -- pocos y muy separados <-> tupido y junto
// ===============================================================

// Baja estas octavas si te faltan fps en una GPU modesta (ver docs/05).
#define OCT_TRUNK 4
#define OCT_CAP   3
#define OCT_WARP  3

// Linea de ancho constante en pixeles sobre el nivel 0.5 de un campo.
float vein(float n, float pxWidth)
{
    float d = abs(n - 0.5);
    float g = max(fwidth(n), 1e-6);
    return 1.0 - smoothstep(0.0, pxWidth * g, d);
}

// Domain warp: desplaza el espacio antes de evaluar el ruido.
// Es lo que convierte un fbm generico en algo que parece crecido.
vec2 warp(vec2 p, float t, float amt)
{
    float a = fbm(p * 0.70 + vec2(0.0, t * 0.07), OCT_WARP);
    float b = fbm(p * 0.70 + vec2(4.3, 1.7) - vec2(t * 0.05, 0.0), OCT_WARP);
    return p + amt * (vec2(a, b) - 0.5) * 2.0;
}

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    // Respiracion: SOLO tiempo. El audio nunca mueve geometria (ver
    // contrato de audio en el header automatico) -- esto era antes
    // "+ 0.10 * uLevel" y era la causa principal del temblor: con un
    // microfono de ambiente el nivel nunca esta quieto, y aqui escalaba
    // literalmente la posicion de cada pixel cada frame.
    float breathe = 1.0 + 0.05 * sin(t * 0.50);
    p /= breathe;
    p += vec2(t * 0.018, t * 0.011);          // deriva lenta

    // ---------------- COBERTURA ----------------
    // Density abre o cierra el organismo. Esto es lo que da composicion.
    // Antes tambien tenia "+ uLevel * 0.10": regiones enteras aparecian y
    // desaparecian con el nivel de audio. Misma causa que 'breathe'.
    float cv = fbm(p * 0.42 + vec2(3.1, t * 0.03), 3);
    float cover = smoothstep(0.52 - uDensity * 0.30,
                             0.80 - uDensity * 0.22,
                             cv);

    // ---------------- TRONCOS ----------------
    // uHigh (agudos) SI se deja tocar el warp, a proposito: es la unica
    // excepcion del contrato de audio, y a esta escala (+0.05 como mucho,
    // sobre una base de 0.25-1.05) es una vibracion de las intersecciones,
    // no una reestructuracion. Ademas uHigh ya llega suavizado (ver
    // audio.py Fase 2), asi que no reintroduce temblor.
    // Bass: un poco de movimiento del warp, ademas del brillo de mas abajo.
    // Seguro porque uBass YA llega suavizado desde audio.py (ataque .05s /
    // caida .20s, Fase 2) -- no es el nivel crudo, asi que esto no
    // reintroduce el temblor que el contrato de audio evita. Escala chica
    // (0.06), igual de contenida que la excepcion de uHigh.
    vec2  wa = warp(p, t, 0.25 + uChaos * 0.80 + uHigh * 0.05 + uBass * 0.06);

    // PIANO: empuja el campo de troncos para que una vena nueva y mas
    // gruesa atraviese la pantalla de borde a borde -- se deforma el
    // INPUT del fbm de troncos (wa), no se dibuja una chispa encima, asi
    // que la vena nueva nace y se ramifica como cualquier otra. uKeypulse
    // decae solo; uKeypos elige el angulo de la vena; uKeyvel el empuje.
    if (uKeypulse > 0.0015) {
        float veinAng = uKeypos * TAU;
        vec2 veinDir = vec2(cos(veinAng), sin(veinAng));
        float alongVein = dot(p, veinDir);
        vec2 perpVein = p - alongVein * veinDir;
        float pushAmt = uKeypulse * (0.6 + uKeyvel * 0.9);
        wa -= perpVein * pushAmt * smoothstep(1.5, 0.0, abs(alongVein));
    }

    // D4: separacion entre troncos -- frecuencia del campo base. D4 bajo =
    // pocos troncos, muy separados; D4 alto = red mucho mas tupida y junta.
    float trunkFreq = 0.50 + uD4 * 0.95;
    float na = fbm(wa * trunkFreq, OCT_TRUNK, 0.50);
    // El ancho de linea es geometria: ya NO depende de uBass (era la otra
    // causa grande del temblor -- las venas engordaban y adelgazaban con
    // cada golpe de graves). Bass ahora solo sube el brillo, mas abajo.
    // D1 es un multiplicador de grosor GENERAL (troncos y capilares juntos),
    // independiente de Density -- rango amplio a proposito, de casi hilo a
    // notablemente grueso.
    // El grosor respira con los bajos -- pedido explicito del usuario
    // (mismo patron que el perimetro de las metaballs). Seguro: uBass ya
    // llega suavizado (Fase 2), escala chica y contenida (+-15%), no
    // reintroduce el temblor que el contrato de audio evita.
    float widthMul = (0.5 + uD1 * 1.7) * (1.0 + uBass * 0.15);
    float wT = (1.3 + (1.0 - uDensity) * 1.0) * widthMul;
    float trunk  = vein(na, wT);
    float tGlow  = vein(na, wT * 7.0);        // halo ancho, gratis

    // ---------------- CAPILARES ----------------
    vec2  wb = warp(p * 2.6 + 7.1, t * 1.30, 0.15 + uChaos * 0.45 + uHigh * 0.04);
    float nb = fbm(wb * 2.2, OCT_CAP, 0.55);
    float wC = (0.8 + (1.0 - uDensity) * 0.5) * widthMul;
    // D3: alcance de los capilares. hugReach chico = el area "cerca del
    // tronco" es angosta -> capilares cortos, pegados. hugReach grande =
    // el area se extiende lejos del tronco -> capilares largos. Rango
    // extendido (0.55 a 0.03) y ademas D3 sube el brillo de los capilares
    // en si (no solo su alcance), para que el cambio se note claramente.
    float hugReach = mix(0.55, 0.03, uD3);
    float hug = smoothstep(0.01, hugReach, tGlow);   // cerca de un tronco
    float capBright = 0.5 + uD3 * 0.8;
    float cap   = vein(nb, wC) * hug * (0.35 + uDensity * 0.90) * capBright;
    float cGlow = vein(nb, wC * 6.0) * hug * capBright;

    float veins = max(trunk, cap) * cover;
    tGlow *= cover;
    cGlow *= cover;

    // ---------------- FLUJO ----------------
    // Bandas que viajan a lo largo de la red, como sangre.
    float phase = fbm(wa * 0.90, 2);
    float flow  = fract(phase * 3.5 - t * 0.30 - uBeat * 0.20);
    float pulse = smoothstep(0.00, 0.30, flow) * smoothstep(0.90, 0.55, flow);

    // Chispa: un pulso angosto y brillante que recorre la MISMA fase que
    // la banda de flujo, pero mas rapido -- se lee como un corpusculo
    // viajando por la vena, no la banda ancha de fondo. Su velocidad
    // sube con Beat, asi el "latido" se siente en el movimiento, no
    // solo en el brillo.
    float sparkPhase = fract(phase * 3.5 - t * (0.55 + uBeat * 1.2));
    float spark = smoothstep(0.06, 0.0, abs(sparkPhase - 0.5)) * veins;

    float core = veins * (0.35 + 1.20 * pulse + 1.00 * uKick) + spark * 1.8;
    // D2: intensidad del halo -- rango amplio, de casi apagado a resplandor
    // fuerte, independiente de lo que ya module el audio (Level/Beat).
    float halo = (tGlow * 0.75 + cGlow * 0.30)
               * (0.45 + 0.55 * uLevel + 0.85 * uBeat)
               * (0.25 + uD2 * 1.6);

    // ---------------- COLOR ----------------
    float h = audioHue(uHue, uMid * 0.15);
    vec3 cDeep = hsv2rgb(vec3(fract(h + 0.60), 0.85, 1.0)) * 0.10;  // atmosfera
    vec3 cBody = hsv2rgb(vec3(fract(h + 0.98), 0.95, 1.0));         // vaso
    vec3 cCore = hsv2rgb(vec3(fract(h + 0.06), 0.40, 1.0));         // nucleo caliente

    vec3 col = cDeep * (0.14 + 1.00 * halo)
             + cBody * core * 1.45
             + cCore * pow(core, 3.0) * 2.60
             + cBody * halo * 0.75
             + cCore * cap * uHigh * 0.35;

    // Bajos = brillo de lo que ya esta claro. Nunca geometria (ver arriba),
    // y col*(1+x) no puede encender un pixel que ya era negro -- lo oscuro
    // se queda oscuro por construccion.
    col = audioLift(col, uBass * 0.8);

    // Tonemap POR LUMINANCIA, no por canal: dividir cada canal por separado
    // (col/(1+col) directo sobre un vec3) empuja los tonos saturados hacia
    // blanco -- un rojo intenso (3.0, 0.2, 0.1) se aplasta a (0.75, 0.17,
    // 0.09), mucho menos saturado que el original. Escalando los TRES
    // canales por el mismo factor (basado en la luminancia) se evita el
    // recorte sin lavar el color -- esto es lo que hacia que los defaults
    // se vieran menos vivos que en la paleta pensada.
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col *= 1.0 / (1.0 + lum);

    col *= vignette(uv, 0.55);

    // Dither: mata el banding en los degradados oscuros. Casi gratis.
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.012;

    return vec4(col, 1.0);
}
