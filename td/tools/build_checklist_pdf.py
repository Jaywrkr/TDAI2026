#!/usr/bin/env python3
"""Genera docs/08_CHECKLIST_PRESET.pdf a partir del .html del mismo nombre.

El PDF es el entregable (se lee en el celular en la cabina), pero el
FUENTE es el .html: se edita ahi y se regenera con este script, para que
el checklist no se vuelva un binario huerfano que nadie puede corregir.

Usa el Chromium que ya viene instalado -- no hay que instalar nada.
"""
import os
import subprocess
import sys
import glob

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
HTML = os.path.join(REPO, 'docs', '08_CHECKLIST_PRESET.html')
PDF = os.path.join(REPO, 'docs', '08_CHECKLIST_PRESET.pdf')

CANDIDATOS = [
    '/opt/pw-browsers/chromium-*/chrome-linux/chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
]


def find_chrome():
    for pat in CANDIDATOS:
        for p in sorted(glob.glob(pat), reverse=True):
            if os.path.isfile(p) and os.access(p, os.X_OK):
                return p
    return None


def main():
    if not os.path.isfile(HTML):
        print('NO ESTA EL FUENTE:', HTML)
        return 1
    chrome = find_chrome()
    if not chrome:
        print('No encontre Chromium. Probados:', CANDIDATOS)
        return 1

    cmd = [chrome, '--headless', '--disable-gpu', '--no-sandbox',
           '--no-pdf-header-footer',
           '--print-to-pdf=' + PDF, 'file://' + HTML]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if not os.path.isfile(PDF):
        print('FALLO la generacion.')
        print(r.stderr[-2000:])
        return 1
    print('OK  {}  ({:.0f} KB)'.format(PDF, os.path.getsize(PDF) / 1024.0))
    return 0


if __name__ == '__main__':
    sys.exit(main())
