// ===============================================================
// SCENE - ORBE ORBITAL (Orbkit SHDR-11)
// Un orbital cuantico: la funcion de onda de un atomo proyectada sobre una esfera metalica, con bandas de color arcoiris.
// ===============================================================
// ---------------------------------------------------------------
// Adaptado de Orbkit SHDR-11 (c) 2026 zzzzshawn -- MIT License
// https://github.com/zzzzshawn/orbkit  (orbs/orbs/shdr-11.tsx)
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
//   Piano    el electron salta de nivel: una banda de color cruza el orbe (ver PIANO)
//
// @D1: tamano del orbe
// @D2: zoom del orbital (lobulos grandes <-> muchos chicos)
// @D3: cuanto fluye y se derrite el patron
// @D4: cuanta superficie se enciende
// @D5: dispersion del arcoiris
// @D6: brillo
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
#define uP_rotSpeed 0.5
#define uP_radius (uD1 < 0.5 ? mix(0.4, 0.8, uD1 * 2.0) : mix(0.8, 1.05, uD1 * 2.0 - 1.0))
#define uP_swell 0.07
#define uP_posScale (uD2 < 0.5 ? mix(0.25, 0.5, uD2 * 2.0) : mix(0.5, 1.1, uD2 * 2.0 - 1.0))
#define uP_flowSpeed (0.35 * ORB_CLOCK)
#define uP_flowAmp (uD3 < 0.5 ? mix(0.0, 0.45, uD3 * 2.0) : mix(0.45, 1.4, uD3 * 2.0 - 1.0))
#define uP_flowScale 0.3
#define uP_precess 0.3
#define uP_radialPow 0.5
#define uP_radialDecay 1.0
#define uP_probPow 0.4
#define uP_probGain (uD4 < 0.5 ? mix(1.0, 3.0, uD4 * 2.0) : mix(3.0, 8.0, uD4 * 2.0 - 1.0))
#define uP_waveFreq 4.0
#define uP_chromaSpread (uD5 < 0.5 ? mix(0.02, 0.18, uD5 * 2.0) : mix(0.18, 0.9, uD5 * 2.0 - 1.0))
#define uP_glow (uD6 < 0.5 ? mix(0.3, 0.9, uD6 * 2.0) : mix(0.9, 2.2, uD6 * 2.0 - 1.0))
#define uP_metalDark 0.0
#define uP_baseVis 0.12

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

// ---------------- shader de Orbkit SHDR-11 ----------------
void orbMain() {
  vec2 uv = gOrbUV;
  float r2d = length(uv);
  float R = uP_radius + uP_swell * ORB_IN;
  float mask = smoothstep(0.012, -0.012, r2d - R);
  float nr = clamp(r2d / max(R, 0.001), 0.0, 1.0);
  float z = sqrt(max(1.0 - nr * nr, 0.0));

  // uP_speed and uP_flowSpeed arrive pre-integrated as clocks (see
  // OrbParamDef.integrate), so state transitions stay phase-continuous.
  // The state volumes reshape the orbital itself: the params set the base,
  // input/output excitement bends zoom, radial form, probability and chroma,
  // so each state settles into a different interference pattern.
  float posScale = uP_posScale * (0.8 + 0.45 * ORB_OUT + 0.2 * ORB_IN);
  float radialPow = uP_radialPow * (0.7 + 0.8 * ORB_OUT);
  float radialDecay = uP_radialDecay * (1.25 - 0.5 * ORB_OUT);
  float probPow = uP_probPow * (1.3 - 0.55 * ORB_OUT);
  float probGain = uP_probGain * (0.7 + 0.6 * ORB_OUT + 0.5 * ORB_IN);
  float waveFreq = uP_waveFreq * (0.6 + 1.0 * ORB_OUT);
  float chromaSpread = uP_chromaSpread * (0.6 + 0.9 * ORB_OUT + 0.5 * ORB_IN);

  // dome point rotated around Y — the fake 3D of the flat disc
  float animTime = uP_speed; // integrated clock
  float cosT = cos(animTime * uP_rotSpeed);
  float sinT = sin(animTime * uP_rotSpeed);
  vec3 sp = vec3(uv / max(R, 0.001), z) * posScale;
  vec3 pos = vec3(sp.x * cosT - sp.z * sinT, sp.y, sp.x * sinT + sp.z * cosT);

  // precession: the rotation axis itself drifts, so the pattern never
  // settles into a repeating spin
  float tilt = sin(animTime * 0.21 + 1.7) * uP_precess;
  float cx = cos(tilt), sx = sin(tilt);
  pos = vec3(pos.x, pos.y * cx - pos.z * sx, pos.y * sx + pos.z * cx);

  // liquid flow: drifting fbm warps the 3D domain, so the wave function
  // smears and migrates around the sphere instead of wobbling in place.
  // (sampled on pos components — continuous everywhere, no phi seam)
  float flowT = uP_flowSpeed; // integrated clock
  float fAmp = uP_flowAmp * (0.7 + 0.6 * ORB_OUT + 0.4 * ORB_IN);
  vec3 w;
  w.x = ofbm(pos.yz * uP_flowScale + vec2(flowT * 0.70, -flowT * 0.40));
  w.y = ofbm(pos.zx * uP_flowScale + vec2(-flowT * 0.55, flowT * 0.62) + 3.7);
  w.z = ofbm(pos.xy * uP_flowScale + vec2(flowT * 0.50, flowT * 0.85) + 7.1);
  pos += (w - 0.5) * fAmp;

  float r = length(pos) + 0.001;
  float theta = acos(clamp(pos.y / r, -1.0, 1.0));
  float phi = atan(pos.z, pos.x);

  float a0 = 0.5;
  float rho = 2.0 * r / (5.0 * a0);
  float radial = pow(rho, radialPow) * exp(-rho / radialDecay);
  float angular = pow(sin(theta), 3.0) * cos(phi + animTime * 0.2); // single lobe

  float psi = radial * angular;
  float probability = psi * psi;

  // travelling spiral wave — the modulation moves across the surface instead
  // of pulsing in place. The azimuthal harmonic count must be a whole number,
  // else sin(phi * f) doesn't line up across the +/-PI wrap and leaves a
  // vertical meridian seam. Snap it to the nearest integer.
  float waveN = max(1.0, floor(waveFreq + 0.5));
  float wavePhase = phi * waveN + theta * 2.5 - animTime * 2.0;
  probability *= (0.85 + 0.15 * sin(wavePhase));

  // drifting bright patches, like convection cells wandering the surface
  float patches = ofbm(pos.xy * 1.6 + vec2(flowT * 0.4, -flowT * 0.3));
  probability *= 0.65 + 0.7 * patches;

  probability = pow(probability, probPow) * probGain;
  probability = clamp(probability, 0.0, 1.0);

  float fresnel = pow(1.0 - z, 1.5);

  // rainbow chromatic aberration
  float chromaOffset = phi * 2.0 + theta * 1.5 + animTime * 0.3 + probability * 3.0;
  vec3 rainbow;
  rainbow.r = sin(chromaOffset) * 0.5 + 0.5;
  rainbow.g = sin(chromaOffset + chromaSpread) * 0.5 + 0.5;
  rainbow.b = sin(chromaOffset + chromaSpread * 2.0) * 0.5 + 0.5;
  rainbow = normalize(rainbow + 0.01) * length(rainbow);

  float bandFreq = chromaOffset * 3.0 + fresnel * 2.4;
  vec3 chromaticBands;
  chromaticBands.r = sin(bandFreq) * 0.5 + 0.5;
  chromaticBands.g = sin(bandFreq + 2.094) * 0.5 + 0.5;
  chromaticBands.b = sin(bandFreq + 4.189) * 0.5 + 0.5;

  vec3 glowColor = mix(rainbow, chromaticBands, 0.12);
  glowColor = pow(glowColor, vec3(0.8));

  vec3 darkMetal = vec3(uP_metalDark);
  vec3 lightMetal = mix(vec3(0.9, 0.92, 0.95), glowColor, 0.7);

  float metalGradient = smoothstep(0.0, 1.0, probability * 0.7 + fresnel * 0.3);
  vec3 metalColor = mix(darkMetal, lightMetal, metalGradient);

  float orbGlow = uP_glow + 0.6 * ORB_OUT;
  float totalGlow = (0.25 + fresnel * 0.6 + probability * 0.8) * orbGlow;
  float glowAmount = clamp(pow(totalGlow, 0.7), 0.0, 1.0);

  vec3 surfaceColor = mix(metalColor, glowColor, glowAmount);

  vec3 normal = vec3(uv / max(R, 0.001), z);
  float specular = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 2.0))), 0.0), 32.0);
  surfaceColor += mix(vec3(1.0), glowColor, 0.6) * specular * 0.4;

  float visibility = clamp(probability * 1.2 + fresnel * 0.3 + uP_baseVis + ORB_IN * 0.15, 0.0, 1.0);

  float a = mask * visibility;
  gOrbOut = vec4(surfaceColor * a, a);
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
    col += vec3(0.75, 0.8, 1.0) * exp(-max(rd - rOrb, 0.0) * 5.0) * (1.0 - cover) * (0.04 + uDensity * 0.16);
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
    vec2 pMain = p; // el orbe principal (el mas grande) recibe el piano
    for (int i = 0; i < 3; i++) {
        float oc; vec2 lp;
        vec3 oCol = renderOrbAt(p, centers[i], scales[i], phases[i], oc, lp);
        col = oCol + col * (1.0 - oc);
        cover = oc + cover * (1.0 - oc);
        if (i == 1) { pMain = lp; }
    }

    // PIANO: "salto de nivel", sobre el orbe principal. Como un electron
    // que cambia de orbita, una banda de color recorre el orbe a la
    // altura que elige uKeypos (grave abajo, agudo arriba) y el color
    // depende de la tecla. Velocity = banda mas ancha y brillante.
    if (uKeypulse > 0.0015) {
        float rOrb = uP_radius;
        float y0 = mix(-0.8, 0.8, uKeypos) * rOrb;
        float band = exp(-pow((pMain.y - y0) / (0.04 + uKeyvel * 0.08), 2.0));
        col += hsv2rgb(vec3(uKeypos, 0.8, 1.0)) * band * cover * uKeypulse * (1.0 + uKeyvel * 1.2);
    }

    // Hue del rig + tinte de medios (audioHue): gira toda la paleta.
    // Chaos: un titilar fino de brillo sobre el orbe (no mueve la forma).
    col *= 1.0 + (noise21(p * 9.0 + vec2(uTime * 1.7, -uTime * 1.3)) - 0.5) * uChaos * 0.35 * cover;

    col = hueRot(col, (uHue + uMid * 0.04) * TAU);
    col += col * uKick * 0.35;
    col = audioLift(col, uBass * 0.7);
    return vec4(col, 1.0);
}
