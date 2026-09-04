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
4. El audio debe leerse: uKick/uBeat para acentos, uBass para peso,
   uHigh para chispa. Que no sea solo un multiplicador de brillo global.
5. Presupuesto: menos de 2 ms de GPU a 1280x720. Máximo ~24 octavas de ruido
   por píxel en total. Pon las octavas en #define arriba del archivo.
6. Termina con un tonemap col = col/(1.0+col) si el visual tiene núcleos
   brillantes, para que no se claven en blanco plano.
7. Añade dither anti-banding si hay degradados oscuros amplios:
   col += (hash21(uv*uResW + fract(uRTime)*17.0) - 0.5) * 0.012;

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
