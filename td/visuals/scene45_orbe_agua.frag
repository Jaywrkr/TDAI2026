// ===============================================================
// SCENE - ORBE AGUA (Orbkit SHDR-16)
// Luz de sol a traves del agua: una red de causticas que se arrastra sobre la esfera y se tine de colores donde se mueve.
// ===============================================================
// ---------------------------------------------------------------
// Adaptado de Orbkit SHDR-16 (c) 2026 zzzzshawn -- MIT License
// https://github.com/zzzzshawn/orbkit  (orbs/orbs/shdr-16.tsx)
// Texto completo de la licencia MIT: td/visuals/LICENSE_ORBKIT.md (tiene
// que acompanar cualquier copia de este archivo).
// (Orbe ORIGINAL de Orbkit, MIT. No usar aca los orbes de XorDev: son
// solo para uso no comercial, ver LICENSE-SHADERS.md de Orbkit.)
// ---------------------------------------------------------------
//
// COMO FUNCIONA
// Es el shader original de Orbkit, casi intacto, envuelto para el rig:
// - main() pasa a orbMain(); su salida (premultiplicada sobre negro) se
//   lee en render().
// - Las senales de voz de Orbkit (uInput/uOutput) quedan FIJAS en valores
//   tipo "hablando": en Orbkit cambian la forma, y el contrato del rig
//   dice que el audio solo toca brillo y color (si no, el orbe tiembla con
//   el ruido de sala). El audio real entra despues, en brillo y tinte.
// - Sus relojes (velocidades) corren con uTime del rig, que ya integra el
//   knob Speed: ninguna velocidad esta en una perilla D (saltaria).
// - Seis parametros del orbe van a D1-D6; en 0.5 cada uno vale el default
//   de Orbkit.
//
// CONTROLES
//   Speed    velocidad de todo el orbe (sus relojes internos)
//   Hue      gira el tono de toda la paleta del orbe
//   Density  cuanto brilla el halo alrededor del orbe
//   Chaos    temblor de la silueta (micro, en brillo) -- sutil
//   Bass     brillo de lo ya claro (audioLift)
//   Mid      tinte que se mueve con la musica (girado bien notorio)
//   Kick     destello breve
//   High     destello en el borde del vidrio (rim light)
//   Piano    una gota cae en el agua y abre un anillo de luz (ver PIANO)
//
// @D1: tamano del orbe
// @D2: tamano de la red de luz (grande <-> fina)
// @D3: cuanto ondula el agua
// @D4: nitidez de las lineas de luz
// @D5: flecos de color en los bordes que se mueven
// @D6: potencia del sol
// ===============================================================

// gOrbPhase desfasa el reloj de cada copia del orbe (ver render(), varios
// orbes en pantalla): 0.0 no cambia nada, asi que sigue siendo un no-op
// para cualquier otro shader que copie este patron con un solo orbe.
float gOrbPhase = 0.0;
#define ORB_TIME ((uTime + gOrbPhase) * 0.5)
#define ORB_CLOCK ((uTime + gOrbPhase) * 0.85)
#define ORB_IN 0.6
#define ORB_OUT 0.7
#define uP_flow (0.9 * ORB_CLOCK)
#define uP_spin (0.08 * ORB_CLOCK)
#define uP_swellRate (0.6 * ORB_CLOCK)
#define uP_radius (uD1 < 0.5 ? mix(0.4, 0.8, uD1 * 2.0) : mix(0.8, 1.05, uD1 * 2.0 - 1.0))
#define uP_scale (uD2 < 0.5 ? mix(4.0, 9.0, uD2 * 2.0) : mix(9.0, 20.0, uD2 * 2.0 - 1.0))
#define uP_warp (uD3 < 0.5 ? mix(0.1, 0.8, uD3 * 2.0) : mix(0.8, 2.0, uD3 * 2.0 - 1.0))
#define uP_edge (uD4 < 0.5 ? mix(1.0, 2.2, uD4 * 2.0) : mix(2.2, 6.0, uD4 * 2.0 - 1.0))
#define uP_split (uD5 < 0.5 ? mix(0.0, 0.6, uD5 * 2.0) : mix(0.6, 2.0, uD5 * 2.0 - 1.0))
#define uP_swell 0.15
#define uP_gain (uD6 < 0.5 ? mix(0.5, 1.6, uD6 * 2.0) : mix(1.6, 4.0, uD6 * 2.0 - 1.0))
#define uP_contrast 1.1
#define uP_light 0.9
#define uP_rim 0.6
#define uC_deep vec3(0.0431, 0.1843, 0.4314)
#define uC_sun vec3(0.4980, 0.9647, 1.0000)
#define uC_sheen vec3(0.7490, 0.9098, 1.0000)

vec2 gOrbUV;
vec4 gOrbOut;

// --- helpers de Orbkit (renombrados para no chocar con los del rig) ---
float ohash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float onoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(ohash(i), ohash(i + vec2(1.0, 0.0)), f.x),
             mix(ohash(i + vec2(0.0, 1.0)), ohash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float ofbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * onoise(p); p = p * 2.03 + vec2(11.7, 7.3); a *= 0.5; }
  return v;
}
vec3 tanh3(vec3 x) { x = clamp(x, -10.0, 10.0); vec3 e = exp(2.0 * x); return (e - 1.0) / (e + 1.0); }
// Gira el tono de un color RGB (espacio YIQ): el knob Hue del rig.
vec3 hueRot(vec3 c, float a) {
  const mat3 toY = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toR = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toY * c;
  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);
  return max(toR * vec3(yiq.x, ch * cos(h), ch * sin(h)), vec3(0.0));
}

// ---------------- shader de Orbkit SHDR-16 ----------------
// Volume- and surge-reactive values, resolved once per fragment in main().
float causticWarp;

/*
  The water. The plane is folded on its own sines three times, each octave
  at a literal frequency and on its own share of the clock, so the ripples
  refract the net rather than scroll it. Amplitude is the one control.
*/
vec2 fold(vec2 p, float t) {
  p += causticWarp        * sin(p.yx * 1.31 + vec2( t * 0.90, -t * 0.70));
  p += causticWarp * 0.60 * sin(p.yx * 2.17 + vec2(-t * 1.30,  t * 1.10));
  p += causticWarp * 0.35 * sin(p.yx * 3.73 + vec2( t * 1.90,  t * 1.60));
  return p;
}

/*
  The light. Two crossed families of crest lines, sharpened by the edge
  exponent — the base is 1 - abs(sin), always in [0, 1], so pow is defined —
  with their product added back so the crossings, where wavefronts focus,
  burn hotter than the lines between them.
*/
float net(vec2 p, float t) {
  vec2 q = fold(p, t);
  vec2 s = 1.0 - abs(sin(q));
  vec2 l = pow(s, vec2(uP_edge));
  // Normalised to [0, 1]: the sum peaks at four on a crossing, and left
  // unbounded it drove the tone knee into clipping all three channels,
  // which turns any sun colour white. Bounded, the sun colour survives
  // the knee at the foci and gain is a real brightness rather than a
  // race to white.
  return (l.x + l.y + 2.0 * l.x * l.y) * 0.25;
}

/*
  Triplanar: the plane field read on the three axis planes of the surface
  direction and blended by the fourth power of each component, so each
  plane only shows where it faces squarely. No pole and no seam — the ball
  can turn forever.
*/
float netOn(vec3 sp, float t) {
  vec3 w = sp * sp;
  w *= w;
  w /= (w.x + w.y + w.z);
  float k = uP_scale;
  return w.x * net(sp.yz * k, t) + w.y * net(sp.zx * k, t) + w.z * net(sp.xy * k, t);
}

void orbMain() {
  vec2 uv = gOrbUV;
  float rd = length(uv);
  float R = uP_radius;
  float mask = smoothstep(0.012, -0.012, rd - R);
  if (mask <= 0.0) {
    gOrbOut = vec4(0.0);
    return;
  }

  vec2 pl = uv / R;
  float z = sqrt(max(1.0 - dot(pl, pl), 0.0));
  vec3 n = vec3(pl, z);

  // the ball turns about Y on its own integrated clock
  float cr = cos(uP_spin);
  float sr = sin(uP_spin);
  vec3 sp = vec3(n.x * cr - n.z * sr, n.y, n.x * sr + n.z * cr);

  float t = uP_flow; // integrated clock: the water

  /*
    The surge: a round trip on an integrated clock through cos, so it eases
    through both ends and never wraps. It lifts the gain and deepens the
    ripple together — brighter as the water heaves — and uP_swell is how
    much of that a state takes.

    Volume coupling in the family language: the agent's voice brightens the
    light, the user's deepens the water.
  */
  float surge = 0.5 - 0.5 * cos(uP_swellRate);
  float gainNow = uP_gain * mix(1.0, 0.55 + 0.9 * surge, uP_swell) * (0.8 + 0.5 * ORB_OUT);
  causticWarp = uP_warp * mix(1.0, 0.8 + 0.4 * surge, uP_swell) * (1.0 + 0.35 * ORB_IN);

  /*
    Three moments of the fold, one per channel. The LIGHT is the net's
    luminance under the sun colour, so gold is gold at the foci; the
    per-channel disagreement is split off as a zero-mean residual and added
    back scaled by uP_split, so the rainbow is a fringe that rides on the
    edges where they move and vanishes where they hold — never a tint on
    the whole net. Read once with the offset baked in and once without
    would cost the same three evaluations, so the offset is constant and
    the split is a plain amplitude on the residual: safe to stage.
  */
  float ds = 0.09;
  vec3 c = vec3(netOn(sp, t + ds), netOn(sp, t), netOn(sp, t - ds));
  float cLum = dot(c, vec3(1.0 / 3.0));
  vec3 fringe = (c - cLum) * uP_split;

  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  float fres = pow(1.0 - z, 2.5);

  // the floor of the pool, then the light thrown on it — dimmer round the
  // limb, where the floor tilts away from the sun
  vec3 col = uC_deep * (0.35 + 0.65 * uP_light * lambert);
  col += (uC_sun * cLum + fringe) * gainNow * (0.55 + 0.45 * lambert);
  col += uC_sheen * uP_rim * fres;

  col = pow(max(col, vec3(0.0)), vec3(uP_contrast));
  col = tanh3(col);

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see shdr-31).
  float a = mask;
  gOrbOut = vec4(max(col, vec3(0.0)) * a, a);
}
// ---------------- fin del shader de Orbkit ----------------

// Varios orbes en pantalla (pedido explicito: "que se vea mas bonito, no
// solo una"). Posiciones/escalas fijas, mismo shader repetido con una fase
// de reloj distinta cada uno (gOrbPhase) para que no queden clonados. El
// mas grande (offs[1]) queda al centro-derecha como protagonista; los
// otros dos son satelites mas chicos.
vec3 renderOrbAt(vec2 p, vec2 center, float scale, float phase, out float coverOut) {
    gOrbPhase = phase;
    gOrbUV = (p - center) / scale;
    gOrbOut = vec4(0.0);
    orbMain();
    vec3 col = gOrbOut.rgb;
    float cover = clamp(gOrbOut.a, 0.0, 1.0);

    // Halo tenue alrededor (Density): el orbe no flota en negro absoluto.
    float rOrb = uP_radius;
    float rd = length(gOrbUV);
    col += uC_sun * exp(-max(rd - rOrb, 0.0) * 5.0) * (1.0 - cover) * (0.04 + uDensity * 0.16);
    // uHigh: destello justo en el borde del orbe -- reusa rd/rOrb ya
    // calculados, se nota como un brillo de vidrio que titila con los
    // agudos.
    col += uC_sheen * exp(-abs(rd - rOrb) * 40.0) * uHigh * 0.6;
    coverOut = cover;
    return col;
}

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);

    vec3 col = vec3(0.0);
    float cover = 0.0;
    vec2  centers[3];
    float scales[3];
    float phases[3];
    centers[0] = vec2(-0.95,  0.28); scales[0] = 0.55; phases[0] = 0.0;
    centers[1] = vec2( 0.55, -0.15); scales[1] = 1.00; phases[1] = 2.7;
    centers[2] = vec2( 0.05,  0.80); scales[2] = 0.40; phases[2] = 5.4;
    for (int i = 0; i < 3; i++) {
        float oc;
        vec3 oCol = renderOrbAt(p, centers[i], scales[i], phases[i], oc);
        col = oCol + col * (1.0 - oc);
        cover = oc + cover * (1.0 - oc);
    }

    // PIANO: "gota". La tecla deja caer una gota sobre TODA la escena, en
    // la X que elige uKeypos: un anillo de luz cruza cualquier orbe que
    // encuentre en el camino.
    if (uKeypulse > 0.0015) {
        vec2  gp = vec2(mix(-1.6, 1.6, uKeypos), 0.15);
        float front = (1.0 - uKeypulse) * 1.8 * (0.5 + uKeyvel * 0.9);
        float ring = exp(-pow((length(p - gp) - front) * 18.0, 2.0));
        col += uC_sun * ring * cover * uKeypulse * (0.8 + uKeyvel * 1.2);
    }

    // Hue del rig + tinte de medios (audioHue): gira toda la paleta.
    // Chaos: un titilar fino de brillo sobre el orbe (no mueve la forma).
    col *= 1.0 + (noise21(p * 9.0 + vec2(uTime * 1.7, -uTime * 1.3)) - 0.5) * uChaos * 0.35 * cover;

    // Mid subido (0.04 -> 0.12): pedido explicito de que el tinte de
    // medios se note de verdad, no solo un barrido casi imperceptible.
    col = hueRot(col, (uHue + uMid * 0.12) * TAU);
    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.7);
    return vec4(col, 1.0);
}
