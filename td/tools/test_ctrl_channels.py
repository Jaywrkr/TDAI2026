#!/usr/bin/env python3
"""Verifica que la textura de control (/project1/ctrl) tenga EXACTAMENTE
un origen por canal -- ni canales sin fuente, ni dos fuentes escribiendo
el mismo nombre.

Por que existe: el bug que arreglo esta rama era justo eso. 'keypulse'
tenia DOS fuentes -- el pasamanos directo de PAR_CHANNELS (sin
envolvente) Y la cadena de Trigger CHOP de midi.build_keypulse() (con
envolvente) -- mergeadas en el mismo CHOP. Cual de las dos "ganaba" en el
Merge CHOP de TouchDesigner no se puede saber sin abrir TD; lo unico
seguro es que dos fuentes para el mismo canal es SIEMPRE un error de
cableado, gane la que gane. Los 8 efectos de pad (grain..posterize)
tenian el problema inverso: CERO fuentes con envolvente -- iban derecho
de Python a la textura, asi que un pad duraba en pantalla los ~2 frames
que Python tardaba en resetearlo (invisible).

Esto no puede probarse abriendo TD (no hay TD aca). Lo que SI se puede
probar sin TD es la aritmetica de conjuntos: que union de fuentes
declaradas en config.py cubre CTRL_CHANNELS exactamente una vez cada
uno. Eso ya habria marcado el bug de 'keypulse' antes de que llegara a
un build real.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TD = os.path.dirname(HERE)
sys.path.insert(0, TD)

from vjcore import config as c  # noqa: E402

# Canales que NO vienen de config.PAR_CHANNELS ni de FX_TRIGGER_PARS:
# audio.py (build de audio_chop) y las dos cadenas de envolvente de
# midi.py. Escritos a mano aca porque son las unicas fuentes que
# realmente no se pueden leer de config.py -- estan armadas como nodos
# TD en midi.py/audio.py, no como una lista de datos.
AUDIO_CHANNELS = {'level', 'bass', 'mid', 'high', 'kick', 'beat'}
KEY_CHOP_CHANNELS = {'keypulse'}                 # midi.build_keypulse
FX_CHOP_CHANNELS = {c2 for _, c2 in c.FX_TRIGGER_PARS}  # midi.build_effects_envelope


def main():
    fails = []

    def check(label, cond, detail=''):
        print('  [{}] {}{}'.format('OK' if cond else '!!', label,
                                   ('  -> ' + detail) if detail else ''))
        if not cond:
            fails.append(label)

    par_channels = [ch for _, ch in c.PAR_CHANNELS]
    fx_channels = [ch for _, ch in c.FX_TRIGGER_PARS]

    print('--- ninguna lista se repite canales a si misma ---')
    check('PAR_CHANNELS sin nombres repetidos',
          len(par_channels) == len(set(par_channels)),
          'repetidos: {}'.format([x for x in set(par_channels)
                                   if par_channels.count(x) > 1]))
    check('FX_TRIGGER_PARS sin nombres repetidos',
          len(fx_channels) == len(set(fx_channels)))

    print('\n--- ninguna fuente pisa a otra (el bug real de "keypulse") ---')
    sources = {
        'PAR_CHANNELS': set(par_channels),
        'FX_TRIGGER_PARS (midi.build_effects_envelope)': set(fx_channels),
        'midi.build_keypulse': KEY_CHOP_CHANNELS,
        'audio.py': AUDIO_CHANNELS,
        'time/rtime (control.py, fijos)': {'time', 'rtime'},
    }
    names = list(sources)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = names[i], names[j]
            overlap = sources[a] & sources[b]
            check('{} vs {}'.format(a, b), not overlap,
                  'los dos escriben: {}'.format(sorted(overlap)))

    print('\n--- la union de todas las fuentes cubre CTRL_CHANNELS exacto ---')
    union = set()
    for s in sources.values():
        union |= s
    ctrl = set(c.CTRL_CHANNELS)
    faltan = sorted(ctrl - union)
    sobran = sorted(union - ctrl)
    check('nada de CTRL_CHANNELS queda sin fuente', not faltan,
          'faltan: {}'.format(faltan))
    check('ninguna fuente escribe un canal que CTRL_CHANNELS no declara',
          not sobran, 'sobran: {}'.format(sobran))

    print('\n--- keypulse y los 8 efectos de pad NO estan en el pasamanos directo ---')
    # Este es el chequeo que habria atrapado el bug original: si alguno
    # de estos 9 nombres aparece TAMBIEN en PAR_CHANNELS, hay dos fuentes
    # para el mismo canal otra vez.
    envolvente_channels = KEY_CHOP_CHANNELS | set(fx_channels)
    choca = envolvente_channels & set(par_channels)
    check('ninguno de los 9 canales con envolvente aparece en PAR_CHANNELS',
          not choca, 'choca: {}'.format(sorted(choca)))

    print('\n--- FX_TRIGGER_PARS coincide con los pads del MIDI (EFFECT_TRIGGERS) ---')
    midi_logic_path = os.path.join(TD, 'vjcore', 'dats', 'midi_logic.py')
    src = open(midi_logic_path, encoding='utf-8').read()
    import re
    m = re.search(r'EFFECT_TRIGGERS\s*=\s*\[(.*?)\]', src, re.S)
    effect_triggers = re.findall(r"'(\w+)'", m.group(1)) if m else []
    fx_pars = [p for p, _ in c.FX_TRIGGER_PARS]
    check('mismos 8 nombres, mismo orden no importa',
          sorted(effect_triggers) == sorted(fx_pars),
          'EFFECT_TRIGGERS={} FX_TRIGGER_PARS={}'.format(
              sorted(effect_triggers), sorted(fx_pars)))

    print('\n--- la envolvente decae mas lento que el piano, no al reves ---')
    # El pedido explicito era "que los pads sean mas largos" -- si algun
    # dia alguien achica FX_DECAY_SECONDS por debajo del release del
    # piano (0.35s), el pad volveria a sentirse como un destello.
    check('FX_DECAY_SECONDS > 0.35 (release del piano)',
          c.FX_DECAY_SECONDS > 0.35, str(c.FX_DECAY_SECONDS))

    print('')
    if fails:
        print('FALLARON {}: {}'.format(len(fails), fails))
        return 1
    print('TODO OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
