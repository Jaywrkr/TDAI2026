# Prompt para generar visuales con IA

Copia el bloque de abajo, cambia lo que va entre `<< >>`, y pégalo en
ChatGPT, Claude o el que uses. Está escrito para que la respuesta sea
**directamente instalable**, sin traducción manual.

---

## El prompt

````text
Escribe un shader de fragmento para un rig de VJ en TouchDesigner.
Devuelve SOLO el código GLSL, sin explicación fuera del código.

=== CONTRATO (obligatorio) ===

Define exactamente una función:

    vec4 render(vec2 uv)

NO escribas main(). NO declares "out vec4 fragColor". NO declares uniforms.
Todo eso lo inyecta el sistema. GLSL 3.30 core.

uv va de 0 a 1. Usa centered(uv) para coordenadas con aspecto corregido
(x en [-uAspect, uAspect], y en [-1, 1]).

=== UNIFORMS YA DISPONIBLES ===

  uSpeed uDensity uHue uChaos    knobs del controlador, 0..1
  uBright                        master fade. INFORMATIVO: NO multipliques por él
  uLevel uBass uMid uHigh        audio en vivo, 0..1
  uKick                          transitorio de graves: pico corto en el golpe
  uBeat                          envolvente que decae ~0.22 s tras cada golpe
  uTime                          SEGUNDOS PARA ANIMAR. Ya escalado por Speed
                                 e integrado, así que nunca produce saltos de
                                 fase. USA ESTE, no uRTime*uSpeed.
  uRTime                         segundos reales, independientes de Speed
  uResW uResH uAspect uScene
  uKeypulse uKeypos uKeyvel      piano: pulso/tono/fuerza de la ultima tecla
                                 tocada. El anillo base YA sale gratis del
                                 footer -- usa esto solo para un efecto propio
                                 ADEMAS del anillo, no para reemplazarlo
  uD1 uD2 uD3 uD4 uD5 uD6        perillas de Detail, 0..1. Ver seccion
                                 "PERILLAS DE DETAIL" abajo -- documentalas

=== HELPERS YA DISPONIBLES (no los redefinas) ===

  mat2  rot2(float a)
  float hash21(vec2 p)
  vec2  hash22(vec2 p)
  float noise21(vec2 p)                    ruido de gradiente, 0..1
  float fbm(vec2 p, int oct)
  float fbm(vec2 p, int oct, float rough)
  float ridge(float n, float sharp)        1-|2n-1| elevado a sharp
  vec3  hsv2rgb(vec3 hsv)
  vec2  centered(vec2 uv)
  float vignette(vec2 uv, float amt)
  vec3  audioLift(vec3 col, float amount)   ver regla 4, USAR para bajos/nivel
  float audioHue(float hue, float amount)   ver regla 4, USAR para medios
  float edgeLine(float sdf, float pxWidth)  linea de ancho CONSTANTE EN
                                             PIXELES a partir de una distancia
                                             con signo (0 sobre la linea).
                                             Usalo para cualquier rejilla o
                                             contorno en vez de threshold
  Constantes: PI, TAU

=== REGLAS DE CALIDAD ===

1. Fondo NEGRO. Los negros son el negro real del show.
2. TouchDesigner NO aplica gamma a la salida: lo que devuelves es lo que se
   ve. No compenses con pow(col, 1/2.2).
3. Los cuatro knobs deben cambiar el visual de forma CLARA y distinta entre
   sí. Un knob que solo mueve un 5% de brillo es un knob desperdiciado.
   - Speed   → ritmo del movimiento
   - Density → cuánta imagen hay: cobertura, cantidad de elementos, detalle
   - Hue     → paleta COMPLETA, no un tinte
   - Chaos   → desorden: turbulencia, distorsión, ruptura
4. CONTRATO DE AUDIO -- regla dura, casi sin excepciones:
   EL AUDIO NUNCA MUEVE GEOMETRIA. Nunca posicion, ancho de linea, radio,
   umbral de cobertura, ni cantidad de elementos. Solo brillo y color.
   Motivo: con un microfono de ambiente el nivel nunca esta perfectamente
   quieto, y cualquier cosa cuya FORMA dependa de el tiembla sin parar en
   vivo -- no se lee como "reacciona a la musica", se lee como un glitch.
     - uBass / uLevel -> SOLO brillo, con audioLift:
           col = audioLift(col, uBass * 0.8);
       Sube el brillo SOLO donde ya hay algo brillante (col*(1+x) sigue
       siendo 0 si col era 0) -- lo oscuro se queda oscuro por
       construccion, no por ajuste fino.
     - uMid -> SOLO color, con audioHue, ANTES de convertir a RGB:
           float h = audioHue(uHue, uMid * 0.05);
       amount pequeno (centesimas de vuelta): es un tinte, no un carrusel.
     - uHigh -> la UNICA excepcion. Puede tocar geometria, pero SOLO a
       escala micro (unos pocos pixeles/unidades como mucho) -- una
       vibracion de detalle en las intersecciones o los bordes, nunca una
       reestructuracion. Ejemplo real en scene00_veins.frag:
           vec2 wa = warp(p, t, 0.25 + uChaos*0.80 + uHigh*0.05);
       (uHigh ya llega suavizado desde el core, asi que no reintroduce
       temblor aunque toque geometria a esta escala).
     - uKick / uBeat -> acentos puntuales (flash, pulso), NO modulacion
       continua. Esto ya estaba bien, no cambia.
5. Presupuesto: menos de 2 ms de GPU a 1280x720. Máximo ~24 octavas de ruido
   por píxel en total. Pon las octavas en #define arriba del archivo.
6. Termina con un tonemap col = col/(1.0+col) si el visual tiene núcleos
   brillantes, para que no se claven en blanco plano.
7. Añade dither anti-banding si hay degradados oscuros amplios:
   col += (hash21(uv*uResW + fract(uRTime)*17.0) - 0.5) * 0.012;

=== PERILLAS DE DETAIL (uD1..uD6) ===

Usa 2 o 3 de las 6 (no hace falta usarlas todas). Cada una debe cambiar algo
CONCRETO y VISIBLE -- igual que Speed/Density/Hue/Chaos, una perilla que no
se nota es una perilla desperdiciada. Ideas: cantidad de elementos, un
segundo parametro de forma que Density no cubre, velocidad de un efecto
secundario, intensidad de una capa extra, ángulo de algo.

Documenta cada una que uses con un comentario, en cualquier parte del
archivo (cerca de la cabecera es lo normal):

    // @D1: cantidad de nodos
    // @D2: grosor de linea

Esto alimenta la leyenda que se muestra en el dashboard al activar la
escena -- sin el comentario, nadie sabe qué hace esa perilla en vivo.

=== TÉCNICAS QUE FUNCIONAN BIEN AQUÍ ===

- Filamentos / venas / rayos: NO uses threshold sobre ruido (da manchas).
  Usa el CONJUNTO DE NIVEL: la curva donde fbm cruza 0.5 se ramifica sola.
  Y dale ancho constante en píxeles dividiendo por fwidth():
      float d = abs(n - 0.5);
      float line = 1.0 - smoothstep(0.0, W * max(fwidth(n), 1e-6), d);
- Formas orgánicas: domain warp, p += amt*(fbm(p)-0.5)*2.0, antes de evaluar.
- Composición: una máscara de cobertura de muy baja frecuencia que apague
  regiones enteras. Sin vacíos, la pantalla se lee como textura plana.
- Jerarquía: una capa de baja frecuencia + una de alta enmascarada por la
  primera, para que la segunda nazca de la primera.
- Profundidad: 2-3 capas con parallax y brillo decreciente.

=== LO QUE QUIERO ===

<< DESCRIBE AQUÍ TU VISUAL >>

Ejemplos de descripción útil:
  "Túnel de partículas que viajan hacia cámara, estelas largas, se estiran
   con el kick, paleta fría"
  "Retícula isométrica que se ondula con los graves, líneas de neón sobre
   negro, el Chaos la rompe en fragmentos"
  "Fluido tipo tinta en agua, se dispersa lentamente, cada golpe inyecta una
   nueva gota"
````

---

## Después de pegar la respuesta

```bash
# 1. Guarda el código en el archivo de la escena que quieras
#    (NN = 00..19, el nombre después del número es libre)
$EDITOR td/visuals/scene07_tunel.frag

# 2. Compílalo sin abrir TouchDesigner
python3 td/tools/validate_shaders.py
```

Si sale `FAIL`, el validador te muestra la línea culpable del fuente
compuesto. Pásale ese error de vuelta a la IA tal cual — normalmente lo
arregla al primer intento.

Si sale `OK`: en TouchDesigner, `/project1` → **System** → `Recargar Shaders`,
y haz click en la escena en el dashboard.

---

## Iterar sobre un visual que ya existe

Pásale el archivo completo y pide el cambio concreto:

```text
Este es mi shader actual [pega el .frag].
Mantén el mismo contrato (solo vec4 render(vec2 uv), sin main, sin uniforms).
Cambia: << las venas son muy finas al subir Density; quiero que Density
las haga MÁS GRUESAS y ramificadas, no más delgadas >>
Devuelve el archivo completo.
```

Pedir el archivo completo evita que te devuelva un fragmento que no sabes
dónde pegar.

---

## Errores frecuentes de las IAs con este contrato

| Lo que hacen | Cómo pedírselo |
|---|---|
| Escriben `void main()` | "El sistema inyecta main(). Define solo `vec4 render(vec2 uv)`." |
| Declaran `uniform float uTime;` | "Los uniforms ya están declarados, no los redeclares." |
| Usan `gl_FragColor` | "GLSL 3.30 core: `gl_FragColor` no existe. Devuelve el vec4." |
| Redefinen `noise()` o `hash()` | "Ya existen `noise21`, `hash21`, `hash22`, `fbm`. Úsalos." |
| Devuelven algo casi negro | "TouchDesigner no aplica gamma. Sube los valores." |
| Meten 8 octavas en 3 capas | "Máximo ~24 octavas de ruido por píxel en total." |
| Usan uBass/uLevel para escalar posición, ancho o radio | "El audio no mueve geometría, ver regla 4. Usa `audioLift` para brillo." |
