#!/usr/bin/env python3
"""Genera la GUIA DE ESCENAS del manual web (docs/10_MANUAL_MINILAB.html).

Lee, de cada visuals/sceneNN_*.frag: el titulo y la descripcion del
encabezado, y el texto COMPLETO de @D1..@D6 (incluidas las lineas que
siguen abajo). De docs/05_VISUALES_GUIA.md toma que hace el piano en cada
escena. Lo inserta en el manual entre los marcadores
/*SCENES_DATA*/ ... /*END_SCENES_DATA*/.

    python3 td/tools/build_manual_scenes.py [carpeta_de_miniaturas]

Las miniaturas (sNN_0.png, render de la escena en reposo) son opcionales:
sin carpeta se conservan las que ya tiene el manual. Si cambias un .frag
y no corres esto, test_manual_sync.py avisa que la guia quedo vieja.
"""
import base64
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
REPO = os.path.dirname(TD)
sys.path.insert(0, TD)

from vjcore import config, shader  # noqa: E402

MANUAL = os.path.join(REPO, 'docs', '10_MANUAL_MINILAB.html')
GUIA = os.path.join(REPO, 'docs', '05_VISUALES_GUIA.md')
START, END = '/*SCENES_DATA*/', '/*END_SCENES_DATA*/'


def detail_texts(body):
    """{1: 'texto completo', ...} -- une las lineas de continuacion."""
    out, cur = {}, None
    for line in body.split('\n'):
        m = re.match(r'\s*//\s*@D([1-6])\s*:\s*(.*)', line)
        if m:
            cur = int(m.group(1))
            out[cur] = m.group(2).strip()
            continue
        c = re.match(r'\s*//\s{3,}(\S.*)', line)
        if cur and c and not c.group(1).startswith('@'):
            out[cur] += ' ' + c.group(1).strip()
        else:
            cur = None
    return out


def header(body):
    """(titulo, descripcion corta) del bloque entre las dos lineas ====."""
    lines = body.split('\n')
    title, desc = '', []
    for i, line in enumerate(lines[:40]):
        m = re.match(r'//\s*SCENE[^-]*-\s*(.+)', line)
        if m:
            title = m.group(1).strip()
            for nxt in lines[i + 1:i + 12]:
                if nxt.startswith('// ====') or not nxt.startswith('//'):
                    break
                desc.append(nxt[2:].strip())
            break
    text = ' '.join(desc)
    # Muchos encabezados arrancan con la historia ("Reemplaza a ...:"):
    # en vivo interesa lo que se VE, que viene despues de los dos puntos.
    if re.match(r'(Reemplaza|Reescritura|Antes)', text) and ':' in text:
        text = text.split(':', 1)[1].strip()
    cut = re.search(r'\.(\s|$)', text)
    if cut and cut.end() > 30:
        text = text[:cut.end()].strip()
    if len(text) > 200:
        text = text[:200].rsplit(' ', 1)[0] + '…'
    return title, text[:1].upper() + text[1:]


def piano_table():
    out = {}
    for line in open(GUIA, encoding='utf-8'):
        m = re.match(r'\|\s*(\d\d)\s*\|\s*([^|]+)\|\s*(.+?)\s*\|\s*$', line)
        if m:
            out[int(m.group(1))] = m.group(3).replace('**', '')
    return out


def thumb_uri(folder, idx):
    if not folder:
        return None
    path = os.path.join(folder, 's{:02d}_0.png'.format(idx))
    if not os.path.isfile(path):
        return None
    from PIL import Image
    im = Image.open(path).convert('RGB').resize((256, 144))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=62, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def scenes_data(thumbs=None, old=None):
    piano = piano_table()
    data = []
    for i in range(config.N_SCENES):
        body, path = shader.read_body(i)
        title, desc = header(body)
        name = os.path.basename(path)[8:-5]
        d = detail_texts(body)
        prev = (old or {}).get(i, {})
        data.append({
            'i': i,
            'file': os.path.basename(path),
            'name': name,
            'title': title or name.upper(),
            'desc': desc,
            'media': i in config.MEDIA_SCENES,
            'piano': piano.get(i, ''),
            'd': [d.get(k, '') for k in range(1, 7)],
            'thumb': thumb_uri(thumbs, i) or prev.get('thumb'),
        })
    return data


def read_embedded(html):
    a, b = html.find(START), html.find(END)
    if a < 0 or b < 0:
        return None
    raw = html[a + len(START):b].strip()
    raw = raw[raw.index('=') + 1:].strip().rstrip(';')
    return json.loads(raw)


def main():
    args = sys.argv[1:]
    manual = MANUAL
    if '--manual' in args:
        k = args.index('--manual')
        manual = args[k + 1]
        del args[k:k + 2]
    thumbs = args[0] if args else None
    html = open(manual, encoding='utf-8').read()
    old = {s['i']: s for s in (read_embedded(html) or [])}
    data = scenes_data(thumbs, old)
    block = '{}\n  const SCENES = {};\n  {}'.format(START, json.dumps(data, ensure_ascii=False), END)
    a, b = html.find(START), html.find(END)
    if a < 0:
        print('No encuentro los marcadores en', MANUAL)
        sys.exit(1)
    html = html[:a] + block + html[b + len(END):]
    open(manual, 'w', encoding='utf-8').write(html)
    print('Guia de escenas: {} escenas, {} con miniatura'.format(
        len(data), sum(1 for s in data if s['thumb'])))


if __name__ == '__main__':
    main()
