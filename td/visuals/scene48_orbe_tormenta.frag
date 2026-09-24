// ===============================================================
// SCENE - ORBE TORMENTA (Orbkit SHDR-17)
// Una tormenta granulada y muy saturada girando sobre la esfera, con bandas que se cortan y relampagos.
// ===============================================================
// ---------------------------------------------------------------
// Adaptado de Orbkit SHDR-17 (c) 2026 zzzzshawn -- MIT License
// https://github.com/zzzzshawn/orbkit  (orbs/orbs/shdr-17.tsx)
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
//   Piano    cae un rayo sobre la tormenta en la X de la tecla (ver PIANO)
//
// @D1: tamano del orbe
// @D2: escala del clima (grandes frentes <-> muchas celdas)
// @D3: cantidad de bandas
// @D4: cuanto se arremolina
// @D5: iridiscencia
// @D6: grano del campo
// ===============================================================

// gOrbPhase desfasa el reloj de cada copia del orbe (ver render(), varios
// orbes en pantalla): 0.0 no cambia nada, asi que sigue siendo un no-op
// para cualquier otro shader que copie este patron con un solo orbe.
float gOrbPhase = 0.0;
#define ORB_TIME ((uTime + gOrbPhase) * 0.5)
#define ORB_CLOCK ((uTime + gOrbPhase) * 0.85)
#define ORB_IN 0.6
#define ORB_OUT 0.7
#define uP_speed (0.9 * ORB_CLOCK)
#define uP_spin (0.12 * ORB_CLOCK)
#define uP_radius (uD1 < 0.5 ? mix(0.4, 0.8, uD1 * 2.0) : mix(0.8, 1.05, uD1 * 2.0 - 1.0))
#define uP_scale (uD2 < 0.5 ? mix(1.2, 2.4, uD2 * 2.0) : mix(2.4, 5.0, uD2 * 2.0 - 1.0))
#define uP_bands (uD3 < 0.5 ? mix(1.0, 6.0, uD3 * 2.0) : mix(6.0, 14.0, uD3 * 2.0 - 1.0))
#define uP_shear 1.1
#define uP_warp (uD4 < 0.5 ? mix(0.5, 2.2, uD4 * 2.0) : mix(2.2, 5.0, uD4 * 2.0 - 1.0))
#define uP_churn 1.4
#define uP_gain 1.15
#define uP_contrast 1.35
#define uP_grain (uD6 < 0.5 ? mix(0.0, 0.4, uD6 * 2.0) : mix(0.4, 1.2, uD6 * 2.0 - 1.0))
#define uP_filmGrain 0.35
#define uP_grainSize 2.0
#define uP_rainbow (uD5 < 0.5 ? mix(0.0, 0.65, uD5 * 2.0) : mix(0.65, 1.6, uD5 * 2.0 - 1.0))
#define uP_flashRate 1.6
#define uP_flash 1.2
#define uP_light 0.85
#define uP_rim 0.5
#define uC_deep vec3(0.1647, 0.0588, 0.3059)
#define uC_low vec3(0.0588, 0.8157, 0.7647)
#define uC_mid vec3(1.0000, 0.3686, 0.6157)
#define uC_hot vec3(1.0000, 0.8196, 0.4000)
#define uC_flash vec3(0.9176, 0.9569, 1.0000)

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

// ---------------- shader de Orbkit SHDR-17 ----------------
// Animated white noise, one tap per grain cell per grain frame. The seed
// decorrelates the two taps so field grain and film grain never line up.
float grainNoise(vec2 gpix, float frame, float seed) {
  return ohash(gpix + vec2(frame * 13.71 + seed, frame * 7.37 - seed));
}

void orbMain() {
  // Volume coupling: user input churns the warp harder, agent output
  // brightens the field — the lightning gate opens separately below.
  float warpNow = uP_warp * (1.0 + 0.55 * ORB_IN);
  float gainNow = uP_gain * (0.85 + 0.45 * ORB_OUT);

  vec2 uv = gOrbUV;
  float rd = length(uv);
  float R = uP_radius;
  float mask = smoothstep(0.012, -0.012, rd - R);

  // The storm below costs five fbm evaluations per fragment — skip all of it
  // outside the silhouette instead of computing weather for transparent sky.
  if (mask <= 0.0) {
    gOrbOut = vec4(0.0);
    return;
  }

  vec2 pl = uv / R;
  float r2 = dot(pl, pl);
  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = vec3(pl, z);

  // roll the dome about Y on its own integrated clock
  float cr = cos(uP_spin);
  float sr = sin(uP_spin);
  vec3 sp = vec3(n.x * cr - n.z * sr, n.y, n.x * sr + n.z * cr);

  float t = uP_speed; // integrated clock

  // stereographic wrap: the weather travels around the ball and compresses
  // toward the limb instead of sliding across a flat disc
  vec2 st = sp.xy / (1.3 + sp.z) * uP_scale;

  /*
    Jovian band flow: a uniform stream plus a BOUNDED traveling wave of
    shear, so latitude rings appear to slip past each other. The obvious
    construction — t * sin(latitude) — accumulates the differential forever
    and rakes the field into hairline streaks within seconds of the random
    mount phase; the wave form keeps the shear amplitude fixed while its
    phase travels. sp.y is untouched by the Y-roll, so the bands hold
    horizontal while the dome turns underneath them.
  */
  st.x -= t * 0.3;
  st.x += uP_shear * sin(sp.y * uP_bands - t * 0.45);

  // two-level domain warp, the storm-cloud construction: q says where to
  // look, w says where q said to look, the field reads there
  vec2 q = vec2(
    ofbm(st + vec2(0.0, t * 0.35)),
    ofbm(st + vec2(5.2, 1.3) - vec2(t * 0.28, 0.0))
  );
  vec2 w = vec2(
    ofbm(st + warpNow * q + vec2(1.7, 9.2) + vec2(t * 0.12, 0.0)),
    ofbm(st + warpNow * q + vec2(8.3, 2.8) - vec2(0.0, t * 0.1))
  );
  float f = ofbm(st + uP_churn * w);

  /*
    Grain tap 1: speckle folded into the FIELD itself, before the gradient,
    so the colour stops below dither into grain instead of smooth bands.
    Refreshed on the ambient clock — the flicker rate stays constant across
    states on purpose (see the header note).
  */
  vec2 gpix = floor(gl_FragCoord.xy / max(uP_grainSize, 1.0));
  float frame = floor(ORB_TIME * 48.0);
  float g1 = grainNoise(gpix, frame, 3.1);
  f += (g1 - 0.5) * uP_grain;

  f = pow(clamp(f * gainNow, 0.0, 1.0), uP_contrast);

  // four-stop palette climbing the storm field
  vec3 col = mix(uC_deep, uC_low, smoothstep(0.05, 0.35, f));
  col = mix(col, uC_mid, smoothstep(0.35, 0.62, f));
  col = mix(col, uC_hot, smoothstep(0.62, 0.88, f));

  // iridescent shimmer: a cosine rainbow keyed to the field AND to the warp
  // vector — q varies at storm-cell scale, so the rainbow lands as coherent
  // coloured weather cells instead of hue noise that optically averages to
  // grey — multiplied in so it bends hues without erasing the palette
  vec3 shimmer = 0.5 + 0.5 * cos(2.0 * PI * (f * 0.9 + q.x * 1.1 + t * 0.06 + vec3(0.0, 0.33, 0.67)));
  col = mix(col, col * (0.35 + 1.9 * shimmer), uP_rainbow);

  /*
    Lightning: one hashed gate per flash interval with an exponential decay,
    so most intervals stay dark and some strike. Agent output opens the gate
    — an idle orb flickers occasionally, a speaking one strobes. The strike
    lands hardest on the high-pressure cells of the field.
  */
  float ft = t * uP_flashRate;
  float gate = step(1.0 - (0.1 + 0.5 * ORB_OUT), ohash(vec2(floor(ft), 7.7)));
  float flashEnv = gate * exp(-fract(ft) * 6.0);
  // squared so the strike stays inside the storm cells — a linear weight
  // tints the whole ball and reads as the canvas strobing, not as weather
  float high = smoothstep(0.55, 0.95, f);
  col += uC_flash * (flashEnv * uP_flash) * (0.06 + 0.94 * high * high);

  // dome shading keeps the ball a ball under the weather
  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  col *= 0.35 + uP_light * lambert;
  float fres = pow(1.0 - z, 2.5);
  col += uC_flash * uP_rim * fres * (0.4 + 0.35 * flashEnv);

  // grain tap 2: plain film grain over the final colour
  float g2 = grainNoise(gpix, frame, 27.9);
  col *= 1.0 + (g2 - 0.5) * uP_filmGrain;

  // Surface orb bounded by a mask: alpha IS coverage, so premultiply — the
  // opposite convention from the emissive orbs (see shdr-31).
  float a = mask;
  gOrbOut = vec4(max(col, vec3(0.0)) * a, a);
}
// ---------------- fin del shader de Orbkit ----------------

// Varios orbes en pantalla (pedido explicito: "que se vea mas bonito, no
// solo una"). Mismo shader repetido con offset/escala/fase distintos para
// que no queden clonados. El mas grande queda de protagonista.
vec3 renderOrbAt(vec2 p, vec2 center, float scale, float phase, out float coverOut, out vec2 localP) {
    gOrbPhase = phase;
    gOrbUV = (p - center) / scale;
    gOrbOut = vec4(0.0);
    orbMain();
    vec3 col = gOrbOut.rgb;
    float cover = clamp(gOrbOut.a, 0.0, 1.0);

    // Halo tenue alrededor (Density): el orbe no flota en negro absoluto.
    float rOrb = uP_radius;
    float rd = length(gOrbUV);
    col += uC_mid * exp(-max(rd - rOrb, 0.0) * 5.0) * (1.0 - cover) * (0.04 + uDensity * 0.16);
    coverOut = cover;
    localP = gOrbUV;
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
    vec2 pMain = p; // el orbe principal (el mas grande) recibe el rayo
    for (int i = 0; i < 3; i++) {
        float oc; vec2 lp;
        vec3 oCol = renderOrbAt(p, centers[i], scales[i], phases[i], oc, lp);
        col = oCol + col * (1.0 - oc);
        cover = oc + cover * (1.0 - oc);
        if (i == 1) { pMain = lp; }
    }

    // PIANO: "rayo", sobre el orbe principal. La tecla hace caer un
    // relampago vertical sobre la esfera en la X que elige uKeypos: trazo
    // quebrado con resplandor, solo dentro del orbe. Velocity = mas brillo.
    if (uKeypulse > 0.0015) {
        float rOrb = uP_radius;
        float x0 = mix(-0.7, 0.7, uKeypos) * rOrb;
        float seg = floor(pMain.y * 9.0);
        float fy = fract(pMain.y * 9.0);
        float xa = x0 + (hash21(vec2(seg, floor(uKeypos * 25.0))) - 0.5) * 0.12;
        float xb = x0 + (hash21(vec2(seg + 1.0, floor(uKeypos * 25.0))) - 0.5) * 0.12;
        float dd = abs(pMain.x - mix(xa, xb, fy));
        float bolt = exp(-dd * dd / 0.00012) + exp(-dd * dd / 0.004) * 0.3;
        col += uC_flash * bolt * cover * uKeypulse * (1.0 + uKeyvel * 1.5);
    }

    // Hue del rig + tinte de medios (audioHue): gira toda la paleta.
    // Chaos: un titilar fino de brillo sobre el orbe (no mueve la forma).
    col *= 1.0 + (noise21(p * 9.0 + vec2(uTime * 1.7, -uTime * 1.3)) - 0.5) * uChaos * 0.35 * cover;

    col = hueRot(col, (uHue + uMid * 0.04) * TAU);
    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.7);
    return vec4(col, 1.0);
}
