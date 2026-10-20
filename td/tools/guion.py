"""Revisar un guion fuera de TouchDesigner.

uso:
  python3 td/tools/guion.py                    # guion.json del set activo (TDAI_SET)
  python3 td/tools/guion.py --set halloween    # guion del set halloween
  python3 td/tools/guion.py ruta/guion.json    # un archivo cualquiera
  python3 td/tools/guion.py --set halloween --hora 01:30   # que pasa a esa hora

Imprime la linea de tiempo (minuto, hora real, cue, que hace) y los
avisos de validar(). Sale con codigo 1 si el archivo no carga.
"""
import argparse
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('archivo', nargs='?')
    ap.add_argument('--set', dest='set_name')
    ap.add_argument('--hora', help='hh:mm: muestra el cue y las perillas a esa hora')
    a = ap.parse_args()
    if a.set_name:
        os.environ['TDAI_SET'] = a.set_name
    from vjcore import config, guion as G
    path = a.archivo or G.default_path(config.set_dir())
    try:
        g = G.load(path)
    except (OSError, ValueError) as e:
        print('NO CARGA:', path, '\n ', e)
        sys.exit(1)
    vis = config.VISUALS_DIR if os.path.isabs(config.VISUALS_DIR) else os.path.join(TD, config.VISUALS_DIR)
    n = len([f for f in os.listdir(vis) if re.match(r'scene\d+_.*\.frag$', f)]) if os.path.isdir(vis) else None
    print('{}  ({} cues, dura {}{})'.format(g['nombre'] or path, len(g['cues']), G.fmt_time(G.duration(g)),
                                          ', inicio ' + G.fmt_clock(g['inicio']) if g['inicio'] is not None else ''))
    print()
    for line in G.timeline(g):
        print(line)
    probs = G.validate(g, n)
    print()
    print('AVISOS:' if probs else 'Sin avisos.')
    for w in probs:
        print('  -', w)
    if a.hora:
        if g['inicio'] is None:
            print('--hora necesita "inicio" en el guion')
            sys.exit(1)
        pos = G.clock_position(G.parse_clock(a.hora), g['inicio'], G.duration(g))
        idx = G.index_at(g['cues'], pos)
        print()
        if idx < 0:
            print('{}: todavia no empieza (faltan {})'.format(a.hora, G.fmt_time(-pos)))
        else:
            c = g['cues'][idx]
            scn, _ = G.scene_at(g['cues'], idx)
            st = G.state_before(g['cues'], idx)
            st.update(G.ramp_values(g['cues'], idx, pos))
            print('{} = minuto {}: cue {} "{}", escena {}'.format(a.hora, G.fmt_time(pos), idx, c['nombre'], scn))
            print('  ' + '  '.join('{}={:.2f}'.format(k, v) for k, v in sorted(st.items())))


if __name__ == '__main__':
    main()
