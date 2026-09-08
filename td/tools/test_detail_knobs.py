#!/usr/bin/env python3
"""Chequea que TODAS las escenas usen sus 6 perillas Detail (D1..D6).

Nacio de una auditoria real: D5 y D6 estaban completamente documentados
(@D5/@D6 en el header, visibles en la Leyenda Detail del dashboard) pero
NINGUN .frag los leia -- 2 de 6 perillas Detail eran pura decoracion en
las 36 escenas (108 de 540 combinaciones perilla x escena, muertas).

Este test evita que la misma perilla vuelva a quedar muerta en una
escena futura: para cada visuals/*.frag exige que el CUERPO (sin el
header @D1..@D6, que documenta la intencion pero no cuenta como uso)
referencie uD1..uD6 al menos una vez cada una.

Un @Dn documentado como "reservado"/"no usado directo" en el header es
la unica excepcion legitima -- se detecta por texto y no exige uso real
de esa perilla.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
VISUALS = os.path.join(TD, 'visuals')

RESERVED_HINTS = ('reservad', 'no usado directo')


def scene_files():
    return sorted(
        f for f in os.listdir(VISUALS)
        if f.endswith('.frag') and f != '_TEMPLATE.frag'
    )


def parse_legend(text):
    """{'D1': (linea_completa, reservado_bool), ...}"""
    legend = {}
    for m in re.finditer(r'^//\s*@(D[1-6]):(.*)$', text, re.MULTILINE):
        key, desc = m.group(1), m.group(2)
        reserved = any(h in desc.lower() for h in RESERVED_HINTS)
        legend[key] = reserved
    return legend


def main():
    fails = []

    def check(label, cond, detail=''):
        print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                                    ('  -> ' + detail) if detail else ''))
        if not cond:
            fails.append(label)

    files = scene_files()
    check('hay escenas para revisar', len(files) > 0)

    for fname in files:
        path = os.path.join(VISUALS, fname)
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()

        legend = parse_legend(text)
        missing_legend = [d for d in ('D1', 'D2', 'D3', 'D4', 'D5', 'D6')
                          if d not in legend]
        check('{}: header documenta @D1..@D6'.format(fname),
              not missing_legend,
              'faltan: {}'.format(missing_legend))

        for d, reserved in legend.items():
            if reserved:
                continue
            uname = 'u' + d
            # El header documenta '@D5' (sin 'u'), nunca 'uD5' literal --
            # asi que cualquier aparicion de 'uD5' en el archivo viene del
            # cuerpo de render(), no del comentario de header.
            used_in_body = re.search(r'\b{}\b'.format(uname), text) is not None
            check('{}: {} se usa en render()'.format(fname, uname),
                  used_in_body)

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
