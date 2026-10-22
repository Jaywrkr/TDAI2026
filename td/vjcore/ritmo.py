"""RITMO (fase 36 de Halloween): que el show siga a la musica.

Hasta ahora el calendario de sucesos y climax (common.glsl) era solo
reloj: un suceso cada ~55 s, un climax cada ~4 min, en momentos al azar.
Este modulo sigue el pulso del bombo y le pasa al shader lo necesario
para que:

  - los sucesos y detalles arranquen en el "1" de una frase (8 compases)
    o de un compas, segun cuanto lugar tengan;
  - en un BREAK (la musica sigue pero sin bombo) los sucesos se apaguen
    (respiro) y, si toca climax, el aviso crezca durante el break;
  - el PICO del climax caiga justo en el DROP (vuelve el bombo despues
    del break);
  - si pasa mucho sin drop, el climax caiga igual, al empezar una frase.

Sin pulso (musica sin bombo, sin audio, o el control apagado) todo
vuelve al calendario de reloj de siempre: los canales quedan en 0.

Es Python puro: lo llama control_script (ritmoBeat en cada golpe de
bombo, ritmoTick cada ~0.5 s) y se prueba fuera de TD con
td/tools/test_ritmo.py.

Tiempos: 'wall' es el reloj de la maquina (para medir el pulso) y 'rt'
es uRTime, el reloj del calendario del shader (corre con la musica). Lo
que se publica esta en 'rt'.
"""

BEAT_MIN = 0.30          # 200 BPM
BEAT_MAX = 0.80          # 75 BPM
PHRASE_BEATS = 32        # frase de 8 compases de 4
LOCK_ONSETS = 6          # intervalos coherentes para enganchar el pulso
MISS_UNLOCK = 6          # golpes seguidos fuera de tiempo -> se suelta
BREAK_MIN = 2.5          # s sin bombo (y al menos 4 tiempos) = break
DROP_MIN_BREAK = 4.0     # un break de al menos esto termina en DROP
CLX_MIN = 150.0          # entre dos climax, al menos (s, del pico al pico)
CLX_MAX = 330.0          # sin drop, el climax cae igual en una frase
CLX_LEN = 26.0           # climax mas largo del set (gran climax)
CLX_PRE = 0.38           # el pico empieza al 38 % del climax (hkClimaxShape)
LOST = 60.0              # s sin bombo -> vuelve al calendario de reloj

CHANNELS = ('mbeat', 'manchor', 'mbrk0', 'mbrk1', 'mclx', 'mclxt', 'mclxn', 'mclxarm')


def _median(v):
    s = sorted(v)
    n = len(s)
    return 0.0 if n == 0 else (s[n // 2] if n % 2 else 0.5 * (s[n // 2 - 1] + s[n // 2]))


def _fold(iv):
    """Intervalo entre golpes -> intervalo de un tiempo (los huecos de 2 o
    3 tiempos se dividen). None si es mas corto que un tiempo (contratiempo)."""
    if iv < BEAT_MIN * 0.9:
        return None
    for k in (1, 2, 3, 4):
        if iv / k <= BEAT_MAX * 1.05:
            return iv / k
    return None


class Ritmo:
    def __init__(self):
        self.reset()

    def reset(self):
        self.walls = []           # golpes recientes (wall)
        self.period = 0.0         # s por tiempo (0 = sin pulso)
        self.locked = False
        self.misses = 0
        self.last_wall = None     # ultimo golpe EN tiempo
        self.last_rt = None
        self.last_any = None      # ultimo golpe, en tiempo o no
        self.beat_idx = 0
        self.hist = []            # (indice de tiempo, rt) de los golpes en tiempo
        self.anchor = 0.0         # rt de un "1" de frase
        # grilla PUBLICADA: el shader encaja en anchor + n * 32 * period, y
        # si eso cambia un poco con cada golpe, un suceso que cae cerca de
        # un "1" salta al siguiente y titila. Se publica de nuevo solo si
        # el pulso real se corrio de verdad (ver _sync_grid).
        self.pub_period = 0.0
        self.pub_anchor = 0.0
        self.in_break = False
        self.brk0 = 0.0           # rt en que se detecto el break
        self.brk1 = 0.0           # rt en que termino
        self.mode = False         # climax por la musica
        self.lock_rt = None
        self.clx_t = 0.0          # rt del pico del climax actual / pendiente
        self.clx_n = -1           # indice del climax (gran climax = n % 3 == 2)
        self.clx_arm = 0.0        # rt en que empezo el aviso de un break
        self.last_clx = None      # rt del ultimo pico (o Momento)
        self.events = []          # para las pruebas: (tipo, rt, ...)

    # -- pulso --------------------------------------------------------
    def _estimate(self):
        ivs = [b - a for a, b in zip(self.walls, self.walls[1:])]
        folded = [f for f in (_fold(iv) for iv in ivs[-12:]) if f is not None]
        if len(folded) < LOCK_ONSETS:
            return 0.0
        p = _median(folded)
        good = [f for f in folded if abs(f - p) < 0.06 * p]
        return p if len(good) >= max(LOCK_ONSETS, int(0.7 * len(folded))) else 0.0

    def beat(self, wall, rt):
        """Un golpe de bombo (onOffToOn del canal 'beat')."""
        if self.last_any is not None and wall - self.last_any < 0.18:
            return                                   # doble disparo
        self.last_any = wall
        self.walls.append(wall)
        self.walls = self.walls[-16:]

        if not self.locked:
            p = self._estimate()
            if p <= 0.0:
                return
            self.period = p
            self.locked = True
            self.misses = 0
            self.lock_rt = rt
            self._start_phrase(rt, 'pulso')
            self.mode = True
            self.last_wall, self.last_rt = wall, rt
            return

        if not self.in_break:
            # cambio de tempo: los ultimos golpes dan otro pulso, claro y
            # distinto -> se re-engancha ahi (empieza frase en este golpe)
            p = self._estimate()
            if p > 0.0 and abs(p - self.period) > 0.08 * self.period:
                self.period = p
                self.misses = 0
                self._start_phrase(rt, 'tempo')
                self.last_wall, self.last_rt = wall, rt
                return
        dt = wall - self.last_wall
        k = int(round(dt / self.period))
        err = abs(dt - k * self.period) / self.period if k >= 1 else 1.0
        if self.in_break and self._end_break(rt):
            return                                    # drop: la frase empieza aca
        if k < 1 or err > 0.22:
            self.misses += 1
            if self.misses >= MISS_UNLOCK:          # cambio de tempo: re-engancha
                self.locked = False
                self.period = 0.0
                self.walls = self.walls[-2:]
            return
        self.misses = 0
        prev = self.beat_idx
        self.beat_idx += k
        # tempo y fase: recta (indice -> rt) sobre los ultimos golpes en
        # tiempo; mucho mas firme que corregir golpe a golpe (el jitter de
        # cada golpe se promedia)
        self.hist.append((self.beat_idx, rt))
        self.hist = self.hist[-48:]
        a, b = self._fit()
        if b > 0.0:
            self.period = b
        m = (prev // PHRASE_BEATS + 1) * PHRASE_BEATS
        if m <= self.beat_idx:
            self.anchor = (a + b * m) if b > 0.0 else rt - (self.beat_idx - m) * self.period
            self.events.append(('frase', self.anchor))
            self._sync_grid(False)
            self._maybe_overdue(rt)
        self.last_wall, self.last_rt = wall, rt

    def _fit(self):
        """(a, b) de rt = a + b * indice; b = 0 si hay pocos golpes."""
        h = self.hist
        if len(h) < 8:
            return 0.0, 0.0
        n = float(len(h))
        mx = sum(i for i, _ in h) / n
        my = sum(t for _, t in h) / n
        sxx = sum((i - mx) ** 2 for i, _ in h)
        if sxx <= 0.0:
            return 0.0, 0.0
        b = sum((i - mx) * (t - my) for i, t in h) / sxx
        if not (0.85 * self.period < b < 1.15 * self.period):
            return 0.0, 0.0
        return my - b * mx, b

    def _start_phrase(self, rt, why):
        self.beat_idx = 0
        self.hist = [(0, rt)]
        self.anchor = rt
        self.events.append((why, rt))
        self._sync_grid(True)

    def _sync_grid(self, force):
        g = PHRASE_BEATS * self.pub_period
        if not force and g > 0.0:
            n = round((self.anchor - self.pub_anchor) / g)
            drift = abs(self.pub_anchor + n * g - self.anchor)
            if drift < 0.04 and abs(self.period - self.pub_period) < 0.01 * self.pub_period:
                return
        self.pub_period = self.period
        self.pub_anchor = self.anchor
        self.events.append(('grilla', self.anchor))

    def _end_break(self, rt):
        """Vuelve el bombo. True si fue un DROP (break largo): la frase
        arranca en este golpe. Si el hueco fue corto, el golpe se cuenta
        como cualquier otro (devuelve False)."""
        dur = rt - self.brk0 + BREAK_MIN
        self.in_break = False
        self.brk1 = rt
        if dur < DROP_MIN_BREAK:
            if self.clx_arm > self.clx_t:
                self.clx_arm = 0.0
            return False
        self.events.append(('drop', rt))
        self._start_phrase(rt, 'uno')
        if self.mode and self.clx_arm > self.clx_t:
            self.clx_t = rt                           # el pico cae en el drop
            self.last_clx = rt
            self.events.append(('climax', rt, self.clx_n))
        self.last_wall, self.last_rt = self.last_any, rt
        return True

    # -- climax ---------------------------------------------------------
    def _due(self, rt):
        if self.last_clx is None:
            return self.lock_rt is not None and rt - self.lock_rt >= 60.0
        return rt - self.last_clx >= CLX_MIN

    def _clx_busy(self, rt):
        if self.clx_arm > self.clx_t:
            return True
        return self.clx_t > 0.0 and rt < self.clx_t + (1.0 - CLX_PRE) * CLX_LEN + 4.0

    def _maybe_overdue(self, rt):
        """Al empezar una frase: si hace mucho que no hay climax, el
        proximo pico cae en el "1" de una frase que viene."""
        if not self.mode or self._clx_busy(rt):
            return
        # el primero de la noche: a los 2 min de enganchar el pulso
        ref = self.last_clx if self.last_clx is not None else self.lock_rt - (CLX_MAX - 120.0)
        if rt - ref < CLX_MAX:
            return
        g = PHRASE_BEATS * self.period
        nxt = self.anchor + g
        while nxt - rt < CLX_PRE * CLX_LEN:
            nxt += g
        self.clx_n += 1
        self.clx_t = nxt
        self.last_clx = nxt
        self.events.append(('climax', nxt, self.clx_n))

    def moment(self, rt):
        """Momento a mano (pad 16 / clic 1): cuenta como climax para el
        espaciado, y cancela el climax de la musica que estaba por venir."""
        self.last_clx = rt
        if self.clx_arm > self.clx_t:
            self.clx_arm = 0.0
        if self.clx_t > rt:
            self.clx_t = 0.0

    # -- cada ~0.5 s -----------------------------------------------------
    def tick(self, wall, rt, music=True):
        if self.last_wall is None or not self.locked:
            if self.mode and self.last_any is not None and wall - self.last_any > LOST:
                self.mode = False
            return
        quiet = wall - self.last_any
        if not self.in_break and music and quiet > max(BREAK_MIN, 4.0 * self.period):
            self.in_break = True
            self.brk0 = rt
            self.events.append(('break', rt))
        if self.in_break and self.mode and self.clx_arm <= self.clx_t and self._due(rt) \
                and not self._clx_busy(rt) and rt - self.brk0 + BREAK_MIN >= DROP_MIN_BREAK:
            self.clx_n += 1
            self.clx_arm = rt                         # el aviso crece en el break
            self.events.append(('aviso', rt, self.clx_n))
        if quiet > LOST:
            self.locked = False
            self.period = 0.0
            self.in_break = False
            self.brk1 = rt
            self.mode = False
            self.clx_arm = 0.0 if self.clx_arm > self.clx_t else self.clx_arm

    # -- lo que va al shader --------------------------------------------
    def values(self):
        """Canales para la textura de control (ver CHANNELS). Sin pulso:
        mbeat = 0 (no encaja nada) y mclx = 0 (climax por reloj)."""
        on = self.locked and self.period > 0.0
        return {
            'mbeat': self.pub_period if on else 0.0,
            'manchor': self.pub_anchor if on else 0.0,
            'mbrk0': self.brk0 if self.in_break else 0.0,
            'mbrk1': self.brk1,
            'mclx': 1.0 if self.mode else 0.0,
            'mclxt': self.clx_t,
            'mclxn': float(max(self.clx_n, 0)),
            'mclxarm': self.clx_arm,
        }

    def bpm(self):
        return 60.0 / self.period if self.locked and self.period > 0 else 0.0
