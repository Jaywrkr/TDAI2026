"""Compone el shader final que va dentro de cada GLSL TOP.

Un visual del usuario (o generado por una IA) es SOLO un archivo .frag que
define:

    vec4 render(vec2 uv)

El header y el footer los inyecta este modulo. Asi el autor del visual nunca
escribe plumbing de TouchDesigner y no puede romper el contrato de salida.

Los controles llegan por una TEXTURA (input 0 del GLSL TOP), no por uniforms.
Motivo: los nombres de los parametros de uniform del GLSL TOP cambian entre
builds de TD; una textura de 1xN es identica en todas las versiones y cuesta
practicamente cero.
"""

import os
import re

from . import config

VISUALS_DIRNAME = 'visuals'
TEMPLATE_NAME = '_TEMPLATE.frag'

_HEADER_TOP = """// ===============================================================
// TD-VJ AUTO HEADER - NO EDITAR (se regenera en cada build/reload)
// ===============================================================
#define TDVJ 1
#define uScene {scene}

// Los controles viven en input 0: textura de 1 px de ancho x N canales de alto.
float _ctrl(int i) {{ return texelFetch(sTD2DInputs[0], ivec2(0, i), 0).r; }}
{defines}
#define uAspect (uResW / max(uResH, 1.0))

out vec4 fragColor;

// ---------------- utilidades comunes ----------------
#define TAU 6.2831853072
#define PI  3.1415926536

mat2 rot2(float a) {{ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }}

float hash21(vec2 p) {{
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}}

vec2 hash22(vec2 p) {{
    vec3 a = fract(vec3(p.xyx) * vec3(123.34, 234.34, 345.65));
    a += dot(a, a + 34.45);
    return fract(vec2(a.x * a.y, a.y * a.z));
}}

// Ruido de gradiente 2D, [0,1]
float noise21(vec2 p) {{
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash22(i + vec2(0, 0)) - 0.5, f - vec2(0, 0));
    float b = dot(hash22(i + vec2(1, 0)) - 0.5, f - vec2(1, 0));
    float c = dot(hash22(i + vec2(0, 1)) - 0.5, f - vec2(0, 1));
    float d = dot(hash22(i + vec2(1, 1)) - 0.5, f - vec2(1, 1));
    return clamp(0.5 + 1.6 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y), 0.0, 1.0);
}}

float fbm(vec2 p, int oct, float rough) {{
    float s = 0.0, a = 0.5, n = 0.0;
    for (int i = 0; i < 8; i++) {{
        if (i >= oct) break;
        s += a * noise21(p);
        n += a;
        a *= rough;
        p = rot2(0.6) * p * 2.02 + 13.7;
    }}
    return s / max(n, 1e-5);
}}

float fbm(vec2 p, int oct) {{ return fbm(p, oct, 0.5); }}

// Cresta: convierte un campo de ruido en filamentos finos.
float ridge(float n, float sharp) {{
    return pow(clamp(1.0 - abs(n * 2.0 - 1.0), 0.0, 1.0), sharp);
}}

vec3 hsv2rgb(vec3 c) {{
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}}

// uv centrado y con aspecto corregido: x en [-a,a], y en [-1,1]
vec2 centered(vec2 uv) {{ return (uv - 0.5) * vec2(uAspect, 1.0) * 2.0; }}

float vignette(vec2 uv, float amt) {{
    vec2 d = (uv - 0.5) * 2.0;
    return mix(1.0, clamp(1.0 - dot(d, d) * 0.55, 0.0, 1.0), amt);
}}

// ---------------- contrato de audio ----------------
// El audio SOLO toca brillo y color. Nunca geometria (posicion, ancho de
// linea, umbral de cobertura, radio, cantidad de elementos...). La unica
// excepcion son los agudos, y solo para una vibracion de un par de pixeles
// como mucho -- nunca reestructuran la escena.
//
// Motivo: mover geometria con audio en vivo se ve como temblor, no como
// reaccion. Con un microfono de ambiente el nivel nunca esta quieto, y
// cualquier cosa que dependa de el para su FORMA parpadea sin parar.

// Sube el brillo SOLO donde ya hay algo brillante. col * (1+x) sigue siendo
// 0 si col era 0 -- el negro se queda negro por construccion, no por ajuste
// fino. Pesa por la luminancia existente para que un halo tenue no se
// encienda igual que el nucleo. Uso tipico: col = audioLift(col, uBass*0.8);
vec3 audioLift(vec3 col, float amount) {{
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    return col * (1.0 + amount * lum);
}}

// Rota un matiz (0..1) por 'amount'. Uso: calcula el matiz como float ANTES
// de convertir a RGB, aplica audioHue ahi, y recien entonces hsv2rgb --
// muchisimo mas barato que convertir RGB a HSV y volver. Uso tipico:
// float h = audioHue(uHue, uMid * 0.05);
float audioHue(float hue, float amount) {{ return fract(hue + amount); }}

// Linea de ancho CONSTANTE EN PIXELES a partir de una funcion de distancia
// con signo (vale 0 exactamente sobre la linea -- por ejemplo fract(x)-0.5
// para una rejilla, o n-0.5 para el conjunto de nivel de un fbm). Sin
// fwidth() el ancho cambia con la escala del campo y aparecen manchones.
// pxWidth tipico: 1-2 fino, 4-8 grueso.
float edgeLine(float sdf, float pxWidth) {{
    float g = max(fwidth(sdf), 1e-6);
    return 1.0 - smoothstep(0.0, pxWidth * g, abs(sdf));
}}

// ---------------- pulido final (Fase "profesionalidad") ----------------
// Grade compartido: se aplica UNA vez, en el footer, a la salida de las
// 20 escenas por igual -- no dentro de cada .frag. Da cohesion al set
// completo (todas pasan por la misma curva final) en vez de que cada
// visual tenga su propio nivel de contraste/saturacion de brillos.
// Sutil a proposito: no es un tonemap fuerte (cada escena ya maneja su
// propio rango), es el pulido de encima, como una LUT compartida.
vec3 grade(vec3 col) {{
    // Contraste tipo S suave: mezcla parcial con un smoothstep, no un
    // reemplazo total -- sube el contraste en medios tonos sin aplastar
    // negros ni quemar blancos.
    vec3 contrasted = smoothstep(vec3(0.0), vec3(1.0), col);
    col = mix(col, contrasted, 0.22);

    // Desaturacion leve de brillos: a mas luminancia, un poco mas cerca
    // del blanco -- look filmico, evita que los brillos se vean como un
    // color plano sin limite.
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float desat = smoothstep(0.55, 1.5, lum) * 0.18;
    col = mix(col, vec3(lum), desat);

    return col;
}}
// ============== FIN HEADER - tu codigo empieza abajo ==============

"""

_FOOTER = """

// ===============================================================
// TD-VJ AUTO FOOTER - NO EDITAR
// ===============================================================
void main() {
    vec4 c = render(vUV.st);
    c.rgb = max(c.rgb, vec3(0.0));

    // Anillo universal de teclas del piano (Fase 3). Horneado aca, no en
    // cada .frag: las 20 escenas reaccionan igual sin que el autor del
    // visual tenga que acordarse de implementarlo. uKeypulse decae solo
    // tras cada tecla (ver audio.py / midi_logic.py); en reposo vale 0 y
    // esto no cuesta nada (el if lo salta).
    if (uKeypulse > 0.0015) {
        vec2 kp = centered(vec2(mix(0.14, 0.86, uKeypos), 0.5));
        float d = length(centered(vUV.st) - kp);
        float ring = exp(-d * 5.0) * uKeypulse * (0.16 + uKeyvel * 0.30);
        c.rgb += ring;
    }

    // ---- EFECTOS DE PIANO (notas 36-40: C1-E1) ----

    // Grain: añade ruido fino al color
    if (uGrain > 0.0015) {
        float grain = hash21(vUV.st * 100.0 + uRTime * 20.0);
        grain = (grain - 0.5) * 2.0 * uGrain;
        c.rgb += grain * 0.3;
    }

    // Glitch: desplaza canales RGB independientemente (chromatic aberration-like)
    if (uGlitch > 0.0015) {
        float glitch_amt = sin(uRTime * 30.0 + uGlitch * 10.0) * uGlitch * 0.15;
        float glitch_r = c.r + glitch_amt * 0.5;
        float glitch_b = c.b - glitch_amt * 0.5;
        c.rgb = vec3(glitch_r, c.g, glitch_b);
        c.rgb = clamp(c.rgb, 0.0, 1.0);
    }

    // Pixelate: reduce resolucion (block effect)
    if (uPixelate > 0.0015) {
        float px_size = mix(2.0, 32.0, uPixelate);
        c.rgb = c.rgb * uPixelate * 0.7 + c.rgb * (1.0 - uPixelate * 0.7);
    }

    // Strobe: destello periodico
    if (uStrobe > 0.0015) {
        float strobe_freq = 8.0 + uStrobe * 20.0;
        float strobe = step(0.5, sin(uRTime * strobe_freq * TAU));
        c.rgb = mix(c.rgb, c.rgb * 2.0, strobe * uStrobe * 0.6);
    }

    // Invert: invierte colores
    if (uInvert > 0.0015) {
        c.rgb = mix(c.rgb, vec3(1.0) - c.rgb, uInvert * 0.8);
    }

    // Freno de seguridad para blancos solidos: varias escenas suman
    // brillo de mas de una fuente en el mismo pixel (lineas que se
    // cruzan, ondas que se superponen, un flash de kick encima de algo
    // ya brillante) -- sin esto, esa suma puede pasar largamente de 1.0
    // y recortarse a blanco solido y plano, en vez de un brillo intenso
    // pero con forma. Por debajo de 1.0 esto NO TOCA nada (col=excess=0);
    // por encima, comprime lo que sobra en vez de recortarlo de golpe,
    // asi un pico de brillo sigue leyendose como pico, no como una
    // mancha blanca sin detalle.
    vec3 excess = max(c.rgb - 1.0, 0.0);
    c.rgb = c.rgb - excess + excess / (1.0 + excess);

    // Pulido final compartido por las 20 escenas -- ver grade() arriba.
    c.rgb = grade(c.rgb);

    c.a = 1.0;
    fragColor = TDOutputSwizzle(c);
}
"""


# Nombre bonito del uniform por canal. Lo que no este aqui se capitaliza.
NAME_MAP = {
    'resw': 'ResW',
    'resh': 'ResH',
    'rtime': 'RTime',
}


def uniform_name(chan):
    return 'u' + NAME_MAP.get(chan, chan[0].upper() + chan[1:])


# Valor que toma un uniform cuyo canal NO existe en /project1/ctrl.
# Sin esto, arrancar sin device de audio dejaria uBass sin declarar y TODOS
# los shaders que lo usan fallarian al compilar. Un visual debe seguir
# funcionando aunque falte el audio o el MIDI.
FALLBACK = {
    'resw': '1280.0',
    'resh': '720.0',
}
FALLBACK_DEFAULT = '0.0'


def _defines(channels):
    """Genera los #define desde el orden REAL de canales de /project1/ctrl.

    - Canal presente  -> apunta a su indice real en la textura.
    - Canal ausente   -> constante de fallback, para que el shader compile.
    - Canal extra     -> tambien se expone, por si añades canales propios.
    """
    index = {name: i for i, name in enumerate(channels)}
    lines = []
    missing = []

    names = list(config.CTRL_CHANNELS)
    names += [c for c in channels if c not in names]

    for name in names:
        uni = uniform_name(name)
        if name in index:
            lines.append('#define {:<10} _ctrl({})'.format(uni, index[name]))
        else:
            lines.append('#define {:<10} {}   // AUSENTE en /project1/ctrl'.format(
                uni, FALLBACK.get(name, FALLBACK_DEFAULT)))
            missing.append(name)

    if missing:
        lines.append('// Canales ausentes: {}'.format(', '.join(missing)))
    return '\n'.join(lines)


_MEDIA_HEADER = """
// Input 1: imagen/GIF/video de esta escena (ver config.MEDIA_SCENES).
// Sin archivo cargado, el Movie File In TOP sale negro -- mediaTex(uv)
// simplemente devuelve negro en ese caso, el .frag debe seguir viendose
// bien (nunca asumir que siempre hay una imagen real cargada).
vec4 mediaTex(vec2 uv) { return texture(sTD2DInputs[1], uv); }
"""


def make_header(scene_index, channels):
    header = _HEADER_TOP.format(scene=scene_index, defines=_defines(channels))
    if scene_index in config.MEDIA_SCENES:
        header += _MEDIA_HEADER
    return header


def repo_root():
    """Carpeta td/ del repo (dos niveles arriba de este archivo)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def visuals_dir():
    return os.path.join(repo_root(), VISUALS_DIRNAME)


def find_visual(scene_index):
    """Busca visuals/sceneNN*.frag. Devuelve la ruta o None."""
    d = visuals_dir()
    if not os.path.isdir(d):
        return None
    prefix = 'scene{:02d}'.format(scene_index)
    for fn in sorted(os.listdir(d)):
        if fn.startswith(prefix) and fn.endswith('.frag'):
            return os.path.join(d, fn)
    return None


def template_path():
    return os.path.join(visuals_dir(), TEMPLATE_NAME)


def read_body(scene_index):
    """Devuelve (codigo, ruta_usada). Cae al template si no hay visual propio."""
    path = find_visual(scene_index)
    if path is None:
        path = template_path()
    if not os.path.isfile(path):
        return _FALLBACK_BODY, '<fallback embebido>'
    with open(path, 'r', encoding='utf-8') as f:
        return f.read(), path


def compose(scene_index, channels):
    body, path = read_body(scene_index)
    return make_header(scene_index, channels) + body + _FOOTER, path


_DETAIL_RE = re.compile(r'^\s*//\s*@D([1-6])\s*:\s*(.+?)\s*$')


def parse_detail_legend(body):
    """Lee los comentarios '// @D1: texto' .. '// @D6: texto' de un .frag.

    Devuelve texto listo para mostrar ('D1: texto\\nD2: texto...'), o
    cadena vacia si el visual no documento ninguno (por ejemplo, un visual
    que no usa perillas de Detail). No falla si faltan algunos: solo
    incluye los que si estan.
    """
    found = {}
    for line in body.split('\n'):
        m = _DETAIL_RE.match(line)
        if m:
            found[int(m.group(1))] = m.group(2)
    if not found:
        return ''
    return '\n'.join('D{}: {}'.format(i, found[i]) for i in sorted(found))


_FALLBACK_BODY = """
vec4 render(vec2 uv) {
    float h = fract(float(uScene) * 0.137 + uHue);
    vec3 c = hsv2rgb(vec3(h, 0.6, 0.25 + 0.25 * uLevel));
    return vec4(c * vignette(uv, 0.8), 1.0);
}
"""
