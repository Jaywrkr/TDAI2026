// ===============================================================
// SCENE - ORBE PLASMA (Orbkit SHDR-13)
// Un globo de plasma: filamentos electricos que se retuercen desde el nucleo hasta el vidrio.
// ===============================================================
// ---------------------------------------------------------------
// Adaptado de Orbkit SHDR-13 (c) 2026 zzzzshawn -- MIT License
// https://github.com/zzzzshawn/orbkit  (orbs/orbs/shdr-13.tsx)
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
//   Mid      tinte que se mueve con la musica
//   Kick     destello breve
//   Piano    tocar el vidrio atrae un rayo hacia la tecla (ver PIANO)
//
// @D1: tamano del globo
// @D2: cantidad de filamentos
// @D3: cuanto se retuercen los filamentos
// @D4: nitidez de los arcos (difusos <-> filosos)
// @D5: brillo del nucleo
// @D6: exposicion general
// ===============================================================

#define ORB_TIME (uTime * 0.5)
#define ORB_CLOCK (uTime * 0.85)
#define ORB_IN 0.6
#define ORB_OUT 0.7
#define uP_speed (1.0 * ORB_CLOCK)
#define uP_spin (0.2 * ORB_CLOCK)
#define uP_camDist 7.0
#define uP_focal (uD1 < 0.5 ? mix(1.4, 2.25, uD1 * 2.0) : mix(2.25, 3.1, uD1 * 2.0 - 1.0))
#define uP_envRadius 2.6
#define uP_swell 0.15
#define uP_tilt 0.4
#define uP_fils (uD2 < 0.5 ? mix(2.0, 6.0, uD2 * 2.0) : mix(6.0, 11.0, uD2 * 2.0 - 1.0))
#define uP_writhe (uD3 < 0.5 ? mix(0.1, 0.9, uD3 * 2.0) : mix(0.9, 2.2, uD3 * 2.0 - 1.0))
#define uP_writheFreq 1.6
#define uP_sharp (uD4 < 0.5 ? mix(1.5, 4.0, uD4 * 2.0) : mix(4.0, 14.0, uD4 * 2.0 - 1.0))
#define uP_soft 0.06
#define uP_whiten 0.008
#define uP_coreGain (uD5 < 0.5 ? mix(0.2, 1.6, uD5 * 2.0) : mix(1.6, 4.0, uD5 * 2.0 - 1.0))
#define uP_tipGain 1.8
#define uP_fill 0.02
#define uP_stepClamp 40.0
#define uP_scatter 0.012
#define uP_exposure (uD6 < 0.5 ? mix(4.0, 11.0, uD6 * 2.0) : mix(11.0, 28.0, uD6 * 2.0 - 1.0))
#define uP_contrast 1.0
#define uP_saturation 1.2
#define uP_alphaGain 2.5
#define uP_edge 1.0
#define uC_inner vec3(1.0000, 0.4392, 0.8471)
#define uC_arc vec3(0.3529, 0.3608, 1.0000)
#define uC_tint vec3(1.0000, 1.0000, 1.0000)

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

// ---------------- shader de Orbkit SHDR-13 ----------------
#define STEPS 64

// Volume-reactive values, resolved once per fragment in main().
float ionSharp;
float ionWrithe;
float ionCore;
float ionExposure;
float ionRadius;

mat2 ionRot2(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

vec3 ionRender(vec2 fragCoord) {
  float t = uP_speed;      // integrated clock: filament crawl
  float spinAng = uP_spin; // integrated clock: array precession

  vec2 uv = (2.0 * fragCoord - vec2(uResW, uResH)) / min(vec2(uResW, uResH).x, vec2(uResW, uResH).y);
  vec3 ro = vec3(0.0, 0.0, uP_camDist);
  vec3 rd = normalize(vec3(uv, -uP_focal));

  // exact ray/sphere chord — the march never leaves the globe, so no
  // envelope fade is needed and every step length is meaningful
  float proj = dot(-ro, rd);
  float b2 = dot(ro, ro) - proj * proj;
  float half_ = sqrt(max(ionRadius * ionRadius - b2, 0.0));
  float zNear = proj - half_;
  float stepLen = 2.0 * half_ / float(STEPS);
  // per-pixel jitter of the march start: a filament grazed at a shallow
  // angle is crossed periodically by the fixed step grid and renders as a
  // dotted chain — the jitter decorrelates neighbouring rays and melts the
  // dots into plasma grain
  zNear += (ohash(fragCoord) - 0.5) * stepLen;

  vec3 acc = vec3(0.0);
  float T = 1.0;

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * (zNear + (float(i) + 0.5) * stepLen);

    // precess the whole filament array; a static tilt keeps the spin axis
    // off-vertical so the motion reads in 3D
    vec3 pr = p;
    pr.xz = ionRot2(spinAng) * pr.xz;
    pr.yz = ionRot2(uP_tilt) * pr.yz;

    float r = length(pr);
    vec3 dir = pr / max(r, 1e-4);
    float rr = r / max(ionRadius, 1e-3);

    // writhe: bend the sampling direction with radius and time, rooted at
    // the nucleus by the smoothstep so filaments stay attached
    float wr = ionWrithe * smoothstep(0.0, ionRadius * 0.35, r);
    vec3 q = dir * uP_fils;
    q += wr * vec3(
      sin(r * uP_writheFreq        - t * 1.2 + q.y * 1.8),
      sin(r * uP_writheFreq * 0.83 + t * 1.0 + q.z * 1.8),
      sin(r * uP_writheFreq * 1.19 - t * 0.7 + q.x * 1.8));

    // two independent fields over the direction sphere; their joint zero
    // set is the filament curves. Time enters as additive phase only.
    float f1 = sin(q.x + t * 0.70)
             + sin(q.y * 1.31 - t * 0.50)
             + sin(q.z * 1.13 + t * 0.90);
    float f2 = sin(q.y * 1.21 + t * 0.60 + 1.7)
             + sin(q.z * 1.43 - t * 0.80 + 3.1)
             + sin(q.x * 0.87 + t * 0.40 + 5.0);
    float d2 = f1 * f1 + f2 * f2;
    float g = 1.0 / (d2 * ionSharp + uP_soft);

    // flare where a streamer lands on the glass, and the hot nucleus
    g *= 1.0 + uP_tipGain * smoothstep(0.55, 0.95, rr);
    float core = ionCore / (r * r * 8.0 + 0.05);

    // pink near the nucleus, violet-blue at the glass, cores whitened by
    // their own intensity
    vec3 fCol = mix(uC_inner, uC_arc, smoothstep(0.1, 0.75, rr));
    vec3 w = (fCol + vec3(uP_whiten) * g) * g + uC_inner * core + vec3(uP_fill);
    w = min(w, vec3(uP_stepClamp));
    w *= stepLen; // length-fair: limb chords are short and dim correctly

    acc += T * w;
    T *= exp(-dot(w, vec3(0.299, 0.587, 0.114)) * uP_scatter);
    if (T < 0.004) break;
  }

  return acc;
}

void orbMain() {
  // Louder agent output softens and thickens the arcs and quickens the
  // writhe; user input flares the nucleus — the globe answers being spoken
  // to the way the real toy answers a fingertip.
  ionSharp = uP_sharp * (1.0 - 0.25 * ORB_OUT);
  ionWrithe = uP_writhe * (1.0 + 0.6 * ORB_OUT);
  ionCore = uP_coreGain * (1.0 + 1.6 * ORB_IN + 0.4 * ORB_OUT);
  ionExposure = uP_exposure * (1.0 - 0.35 * ORB_OUT);
  ionRadius = uP_envRadius + uP_swell * ORB_IN;

  vec3 acc = ionRender(gl_FragCoord.xy);

  // tanh tone map with a tunable knee, then the usual finishing chain
  vec3 col = tanh3(acc / max(ionExposure, 0.01));
  col = pow(clamp(col, 0.0, 1.0), vec3(uP_contrast));

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, uP_saturation);
  col *= uC_tint;

  // alpha from the brightest channel — a saturated violet streamer has low
  // luminance but must not go transparent
  float peak = max(col.r, max(col.g, col.b));
  float a = clamp(peak * uP_alphaGain, 0.0, 1.0);

  // analytic silhouette, identical construction to shdr-01: exact
  // ray-to-centre distance against the radius, colour AND alpha
  vec3 mrd = normalize(vec3(gOrbUV, -uP_focal));
  float closest = length(cross(vec3(0.0, 0.0, uP_camDist), mrd));
  float band = mix(0.35, 0.012, clamp(uP_edge, 0.0, 1.0));
  float mask = 1.0 - smoothstep(ionRadius * (1.0 - band), ionRadius * 1.005, closest);
  col *= mask;
  a *= mask;

  // Emitted light, so rgb is already premultiplied — do NOT scale by alpha
  // again (see the same note in shdr-31).
  gOrbOut = vec4(col, a);
}
// ---------------- fin del shader de Orbkit ----------------

vec4 render(vec2 uv)
{
    vec2 p = centered(uv);
    gOrbUV = p;
    gOrbOut = vec4(0.0);
    orbMain();
    vec3 col = gOrbOut.rgb;
    float cover = clamp(gOrbOut.a, 0.0, 1.0);

    // Halo tenue alrededor (Density): el orbe no flota en negro absoluto.
    float rOrb = (uP_focal * uP_envRadius / uP_camDist);
    float rd = length(p);
    col += uC_arc * exp(-max(rd - rOrb, 0.0) * 5.0) * (1.0 - cover) * (0.04 + uDensity * 0.16);

    // PIANO: "tocar el vidrio". Como en un globo de plasma real, apoyar
    // un dedo en el vidrio atrae un filamento: la tecla elige el angulo
    // (el teclado da la vuelta al globo) y aparece un arco brillante del
    // nucleo al borde, con un destello donde toca. Velocity = mas brillo.
    if (uKeypulse > 0.0015) {
        float ka = uKeypos * TAU + 1.2;
        vec2  tip = vec2(cos(ka), sin(ka)) * rOrb;
        float h = clamp(dot(p, tip) / dot(tip, tip), 0.0, 1.0);
        vec2  nrm = vec2(-tip.y, tip.x) / rOrb;
        float wob = sin(h * 23.0 + uTime * 9.0) * 0.03 * h * (1.0 - h) * 4.0;
        float dd = length(p - (tip * h + nrm * wob));
        float arc = exp(-dd * dd / 0.0006) + exp(-dd * dd / 0.01) * 0.35;
        float touch = exp(-dot(p - tip, p - tip) / 0.004);
        col += mix(uC_arc, uC_inner, h) * (arc + touch * 1.5) * uKeypulse * (1.0 + uKeyvel * 1.5);
    }

    // Hue del rig + tinte de medios (audioHue): gira toda la paleta.
    // Chaos: un titilar fino de brillo sobre el orbe (no mueve la forma).
    col *= 1.0 + (noise21(p * 9.0 + vec2(uTime * 1.7, -uTime * 1.3)) - 0.5) * uChaos * 0.35 * cover;

    col = hueRot(col, (uHue + uMid * 0.04) * TAU);
    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.7);
    return vec4(col, 1.0);
}
