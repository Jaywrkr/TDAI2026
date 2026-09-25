import os
import numpy as np

OUT = os.path.dirname(os.path.abspath(__file__))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

S = OUT + '/'
BG, FG, DIM = '#0d0f14', '#e6e8ee', '#8a90a0'
OLD, NEW, ACC = '#6b7280', '#ff3b30', '#38bdf8'

fig, axes = plt.subplots(2, 2, figsize=(13, 6.6), facecolor=BG)
for col, name, title in ((0, 'techno', 'Techno 128 BPM'), (1, 'reggaeton', 'Reggaetón 95 BPM (808 sostenido)')):
    d = np.load(S + 'final_{}.npz'.format(name))
    t = d['t']
    m = (t > 3.0) & (t < 11.5)
    for row in range(2):
        ax = axes[row, col]
        ax.set_facecolor(BG)
        for s in ax.spines.values():
            s.set_color('#2a2f3a')
        ax.tick_params(colors=DIM, labelsize=9)
        ax.axvspan(8.0, 11.5, color='#1a1e27', zorder=0)
        ax.text(9.75, 1.02 if row == 0 else 0.62, 'break (sin bombo)', color=DIM, ha='center', fontsize=9)
    ax = axes[0, col]
    ax.plot(t[m], d['kick_old'][m], color=OLD, lw=1.6, label='detector de bombo ANTES')
    ax.plot(t[m], d['kick_new'][m], color=ACC, lw=1.6, label='detector NUEVO')
    ax.set_ylim(0, 1.1)
    ax.set_title(title, color=FG, fontsize=12, loc='left')
    if col == 0:
        ax.set_ylabel('señal de bombo (uKick)', color=DIM)
    ax.legend(loc='lower left', fontsize=8.5, facecolor=BG, edgecolor='#2a2f3a', labelcolor=FG)
    ax = axes[1, col]
    ax.plot(t[m], d['antes'][m], color=OLD, lw=1.6, label='luz del filo ANTES')
    ax.plot(t[m], d['nuevo'][m], color=NEW, lw=1.8, label='luz del filo AHORA')
    ax.set_ylim(0.15, 0.65)
    ax.set_xlabel('segundos', color=DIM)
    if col == 0:
        ax.set_ylabel('luz que emite un filo rojo', color=DIM)
    ax.legend(loc='lower left', fontsize=8.5, facecolor=BG, edgecolor='#2a2f3a', labelcolor=FG)
fig.suptitle('Por qué "no bailaba": el detector confundía el bajo con el bombo (nunca se apagaba) y el brillo casi no se movía',
             color=FG, fontsize=12.5, x=0.01, ha='left')
fig.tight_layout(rect=(0, 0, 1, 0.95))
fig.savefig(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(OUT))), 'docs', 'img', 'baile_antes_despues.png'), dpi=110, facecolor=BG)
print('ok')
