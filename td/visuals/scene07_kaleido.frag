// ===============================================================
// SCENE 34 - CALEIDOSCOPIO
// Toma una imagen/GIF de la carpeta comun de media y la convierte en un
// mandala simetrico que gira. Primera de las dos escenas nuevas que usan
// la carpeta compartida (ver config.MEDIA_SCENES y la pagina Media de
// /project1).
// ===============================================================
//
// COMO FUNCIONA
//
// Todo pasa en coordenadas POLARES. El angulo de cada pixel se pliega en
// N cunas iguales (mod), y dentro de cada cuna se refleja sobre su
// mitad (abs) -- eso es exactamente lo que hace un caleidoscopio real
// con sus espejos, y es lo que garantiza que la simetria sea perfecta
// sin dibujar nada dos veces. Recien despues se vuelve a cartesianas
// para muestrear la imagen.
//
// El muestreo usa un espejado manual (abs(fract(x*0.5)*2-1)) en vez de
// dejar que la textura se repita: con repeticion normal, el borde
// derecho de la imagen queda pegado al izquierdo y se ve una costura
// dura en cada baldosa. Espejado, las baldosas se continuan solas.
//
// POR QUE SIRVE EN VIVO: cualquier foto, logo o GIF -- incluso uno
// feo -- se vuelve un mandala hipnotico. Es la escena que convierte
// contenido propio en visual sin que el contenido tenga que ser bueno.
//
// CONTROLES
//   Speed    velocidad de giro del mandala
//   Density  zoom sobre la imagen (de la imagen entera a un detalle)
//   Hue      tinte que se mezcla sobre la imagen (0 = colores originales)
//   Chaos    ondulacion del radio -- los espejos dejan de ser rectos
//   Bass     el giro queda ESTATICO a proposito (pedido explicito, ya
//            no acelera con el bajo) -- en cambio suma amplitud a la
//            ondulacion del radio (el mandala sigue "respirando" mas
//            fuerte) y empuja mucho mas fuerte el brillo/bloom del
//            nucleo y de la imagen entera
//   Mid      tinte adicional (audioHue)
//   Kick     empujon de zoom hacia adentro, y vuelve solo
//   High     vibracion micro del angulo (excepcion del contrato)
//
// @D1: cuantos espejos tiene el caleidoscopio (6 a 18)
// @D2: desplazamiento del centro de muestreo (que parte de la imagen
//      cae en el eje del mandala)
// @D3: brillo del nucleo central
// @D4: mezcla del tinte de Hue sobre la imagen original
// @D5: velocidad de la ondulacion de radio (respiracion mas lenta <->
//      mas rapida)
// @D6: ganancia de brillo de la imagen muestreada antes del tinte
// ===============================================================

vec4 render(vec2 uv)
{
    float t = uTime;
    vec2  p = centered(uv);

    float r = length(p);
    float ang = atan(p.y, p.x);

    // --- GIRO ---
    // Estatico a proposito -- pedido explicito de que el bajo YA NO
    // acelere el giro (antes lo hacia). Solo Speed y el tiempo lo
    // mueven; el resto del audio se nota en otro lado (respiracion del
    // radio y brillo/bloom, ver mas abajo).
    ang += t * (0.10 + uSpeed * 0.55);

    // uHigh: vibracion micro del angulo -- unica excepcion del contrato,
    // amplitud pequena, ya suavizado.
    ang += uHigh * 0.02 * sin(t * 12.0 + r * 8.0);

    // --- PLIEGUE DE ESPEJOS ---
    // D1: cuantas cunas. mod() reparte el circulo en N, y el abs() de
    // abajo refleja dentro de cada una: dos operaciones y ya hay
    // simetria perfecta.
    //
    // El piso es 6 y no 3 porque las perillas Detail arrancan en 0: con
    // 3 cunas la escena se abre mostrando tres manchas grandes y no se
    // lee como un caleidoscopio: hay que subir la perilla para que
    // aparezca el mandala. Seis es la simetria de copo de nieve, la que
    // el ojo reconoce al instante -- y arriba llega a 18, mas que las 16
    // de antes, asi que no se pierde rango, se corre.
    float segs = 6.0 + floor(uD1 * 12.0);
    float seg = TAU / segs;
    float a = mod(ang, seg);
    a = abs(a - seg * 0.5);

    // Chaos: el radio ondula, asi los espejos dejan de ser rectos y el
    // mandala "respira" en vez de ser un patron rigido. El bajo suma
    // amplitud extra a esa misma ondulacion -- otro punto donde el
    // mandala "baila" con la musica, no solo gira mas rapido.
    float wobbleSpeed = 0.1 + uD5 * 1.4;
    float wobbleAmt = uChaos * 0.18 + uBass * 0.30;
    float rr = r * (1.0 + sin(a * segs * 2.0 + t * wobbleSpeed) * wobbleAmt);

    // --- ZOOM ---
    // Density va de ver la imagen entera a clavarse en un detalle. El
    // kick empuja hacia adentro y vuelve solo (uKick ya trae envolvente).
    float zoom = (0.45 + (1.0 - uDensity) * 1.9) * (1.0 - uKick * 0.22);

    // Vuelta a cartesianas, ya plegado.
    vec2 q = vec2(cos(a), sin(a)) * rr * zoom;
    // D2: corre el centro de muestreo -- cambia QUE parte de la imagen
    // queda en el eje del mandala, que es lo que mas cambia el dibujo.
    q += vec2(uD2 - 0.5, 0.0) * 0.8;

    // --- MUESTREO CON ESPEJADO ---
    // Sin este espejado manual, las baldosas repetidas muestran la
    // costura entre el borde derecho y el izquierdo de la imagen.
    vec2 muv = q * 0.5 + 0.5;
    muv = abs(fract(muv * 0.5) * 2.0 - 1.0);

    // PIANO: cada tecla ROTA el mandala a un angulo propio y le suma
    // espejos -- geometria real (cambia el pliegue, no un brillo
    // encima), y vuelve sola porque uKeypulse decae. Tocar una escala
    // hace que el mandala "baile" entre configuraciones distintas.
    if (uKeypulse > 0.0015) {
        float kAng = uKeypos * TAU;
        vec2 kq = rot2(kAng * uKeypulse) * (q - 0.5) + 0.5;
        vec2 kuv = abs(fract((kq * 0.5 + 0.5) * 0.5) * 2.0 - 1.0);
        muv = mix(muv, kuv, uKeypulse * (0.5 + uKeyvel * 0.5));
    }

    vec3 src = mediaTex(muv).rgb * (0.6 + uD6 * 1.2);

    // --- COLOR ---
    // D4: cuanto se tine. En 0 salen los colores originales de la
    // imagen; subiendo, se fuerza hacia la paleta de Hue conservando la
    // luminancia (o sea sin perder el dibujo de la imagen).
    float h = audioHue(uHue, uMid * 0.16);
    float lum = dot(src, vec3(0.299, 0.587, 0.114));
    vec3 tinted = hsv2rgb(vec3(h, 0.75, 1.0)) * lum;
    vec3 col = mix(src, tinted, uD4 * 0.9);

    // Nucleo central: sin esto el centro del mandala -- donde convergen
    // todas las cunas -- queda como un agujero negro. El piso (0.45, no
    // 0.15) es para que ese nucleo exista ya con la perilla en 0: un
    // caleidoscopio real tiene luz justo en el eje, es de donde parece
    // venir todo el dibujo.
    col += hsv2rgb(vec3(fract(h + 0.5), 0.4, 1.0))
         * exp(-r * r * 22.0) * (0.45 + uD3 * 0.9 + uBass * 0.20);

    // Grading tipo lente real: un tinte frio muy sutil hacia los bordes y
    // calido hacia el centro -- el toque de color grading que separa una
    // imagen "cruda" de una trabajada, sin tapar el dibujo del mandala.
    col = mix(col * vec3(0.96, 1.0, 1.06), col * vec3(1.05, 1.0, 0.94), 1.0 - smoothstep(0.0, 1.1, r));

    // Bajos: brillo de lo ya claro. El giro ya NO es excepcion (ver
    // arriba, ahora es estatico) -- parte de ese peso se movio para
    // aca y al nucleo de arriba, pedido explicito de que se note mas
    // el bloom ya que la rotacion dejo de reaccionar. Bajado de la
    // primera prueba (2.7 -> 1.8): con una imagen clara se lavaba a
    // blanco solido ya a partir de bajo medio, sin dejar margen para
    // que "mas bajo" siguiera notandose mas.
    col = audioLift(col, uBass * 1.8);
    col += col * uKick * 0.3;

    col *= vignette(uv, 0.35);
    col += (hash21(uv * uResW + fract(uRTime) * 17.0) - 0.5) * 0.01;

    return vec4(col, 1.0);
}
