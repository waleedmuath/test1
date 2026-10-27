"""JoFunction 3D reel — original score, synthesized from scratch with numpy/scipy.

120 BPM, 15 bars (30.0 s). D minor through the divisions, a dominant build in
the recall, and a D-major resolution on the end card. Every hit is placed on the
same clock as the picture (times below mirror src/reel.js and src/stations.js).

    python3 audio/score.py [out.wav]
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi, fftconvolve

SR = 48000
DUR = 30.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(2026)

# buses: dry, reverb send, sidechained (pads/bass/arp), delay send
dry = np.zeros((2, N))
verb = np.zeros((2, N))
side = np.zeros((2, N))
dly = np.zeros((2, N))
kicks = []


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tvec(dur):
    return np.arange(int(dur * SR)) / SR


def place(bus, sig, t, pan=0.0, gain=1.0):
    """constant-power pan a mono signal (or stereo pair) onto a bus at time t"""
    i = int(round(t * SR))
    if i >= N:
        return
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        st = np.vstack([sig * np.cos(a), sig * np.sin(a)])
    else:
        st = sig
    if i < 0:
        st = st[:, -i:]
        i = 0
    n = min(st.shape[1], N - i)
    bus[:, i:i + n] += st[:, :n] * gain


def out(sig, t, pan=0.0, gain=1.0, rv=0.0, dl=0.0, sc=False):
    place(side if sc else dry, sig, t, pan, gain)
    if rv:
        place(verb, sig, t, pan, gain * rv)
    if dl:
        place(dly, sig, t, pan, gain * dl)


def lp(x, f, q=0.707):
    return sosfilt(butter(2, min(f, SR * 0.45), 'low', fs=SR, output='sos'), x)


def hp(x, f):
    return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)


def sweep(x, f0, f1, kind='low', block=256, curve='exp'):
    """time-varying 2-pole filter, coefficients updated per block"""
    y = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nb):
        u = b / max(1, nb - 1)
        f = f0 * (f1 / f0) ** u if curve == 'exp' else f0 + (f1 - f0) * u
        f = float(np.clip(f, 20, SR * 0.45))
        if kind == 'band':
            sos = butter(1, [f / 1.6, min(f * 1.6, SR * 0.45)], 'band', fs=SR, output='sos')
        else:
            sos = butter(2, f, kind, fs=SR, output='sos')
        if zi is None:
            zi = sosfilt_zi(sos) * 0
        seg = x[b * block:(b + 1) * block]
        y[b * block:b * block + len(seg)], zi = sosfilt(sos, seg, zi=zi)
    return y


def noise(dur):
    return rng.uniform(-1, 1, int(dur * SR))


def saw(freq, dur, phase0=0.0):
    """polyBLEP band-limited saw; freq may be an array"""
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    dt = f / SR
    ph = (phase0 + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]
    y[m] -= x * x + x + x + 1
    return y


def sine(freq, dur, phase0=0.0):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    return np.sin(2 * np.pi * (phase0 + np.cumsum(f) / SR))


def env_exp(dur, decay, attack=0.002):
    t = tvec(dur)
    e = np.exp(-t / decay)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def adsr(dur, a, d, s, r):
    n = int(dur * SR)
    t = tvec(dur)
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = int(r * SR)
    if rel and rel < n:
        e[-rel:] *= np.linspace(1, 0, rel) ** 2
    return e


# ------------------------------------------------------------------ instruments
def kick(t, v=1.0):
    d = 0.42
    tt = tvec(d)
    f = 46 + 120 * np.exp(-tt / 0.032) + 30 * np.exp(-tt / 0.006)
    body = sine(f, d) * env_exp(d, 0.16, 0.001)
    click = hp(noise(0.012), 2500) * env_exp(0.012, 0.003)
    s = np.tanh(2.2 * body) * 0.9
    s[:len(click)] += click * 0.35
    out(s, t, 0, v * 0.95)
    kicks.append((t, v))


def clap(t, v=0.5):
    d = 0.32
    n = noise(d)
    e = np.zeros(int(d * SR))
    for k, off in enumerate([0, 0.009, 0.019, 0.03]):
        i = int(off * SR)
        seg = env_exp(d, 0.011 if k < 3 else 0.075)[:len(e) - i]
        e[i:i + len(seg)] += seg * (0.8 if k < 3 else 1)
    s = bp(n, 900, 2600) * e
    out(s, t, 0.05, v, rv=0.35)


_hat_tone = None


def hat(t, v=0.2, open_=False, pan=0.2):
    global _hat_tone
    d = 0.32 if open_ else 0.06
    if _hat_tone is None:
        tt = tvec(0.4)
        sq = sum(np.sign(np.sin(2 * np.pi * f * tt)) for f in [317, 465, 523, 791, 1033, 1239])
        _hat_tone = hp(sq / 6 + 0.6 * noise(0.4), 7000)
    s = _hat_tone[:int(d * SR)] * env_exp(d, 0.11 if open_ else 0.018, 0.0005)
    out(s, t, pan, v, rv=0.05)


def snare(t, v=0.4, tone=185):
    d = 0.25
    s = bp(noise(d), 1200, 7000) * env_exp(d, 0.06) + 0.6 * sine(tone * (1 + 0.5 * np.exp(-tvec(d) / 0.01)), d) * env_exp(d, 0.045)
    out(s, t, -0.05, v, rv=0.25)


def sub_note(t, m, dur, v=0.5):
    tt = tvec(dur)
    s = sine(mtof(m), dur) * adsr(dur, 0.004, 0.25, 0.75, min(0.05, dur * 0.3))
    out(np.tanh(1.4 * s), t, 0, v, sc=True)


def bass_pluck(t, m, dur=0.22, v=0.35):
    s = saw(mtof(m), dur) * 0.6 + saw(mtof(m) * 1.003, dur) * 0.4
    s = sweep(s, 1800, 260, 'low') * adsr(dur, 0.003, 0.08, 0.5, 0.03)
    out(s, t, 0, v, sc=True)


def supersaw(m, dur, voices=5, spread=0.012, seed=0):
    r = np.random.default_rng(seed + int(m * 10))
    acc = np.zeros(int(dur * SR))
    for k in range(voices):
        det = 1 + spread * (k - (voices - 1) / 2) / ((voices - 1) / 2 + 1e-9)
        acc += saw(mtof(m) * det, dur, r.random())
    return acc / voices


def pad(t, notes, dur, v=0.12, cut0=600, cut1=2400, attack=0.4, rv=0.55, sc=True, pan_w=0.6):
    L = np.zeros(int(dur * SR))
    R = np.zeros(int(dur * SR))
    for j, m in enumerate(notes):
        s = supersaw(m, dur, 5, 0.01, seed=j)
        p = (j / max(1, len(notes) - 1) - 0.5) * pan_w
        a = (p + 1) * np.pi / 4
        L += s * np.cos(a)
        R += s * np.sin(a)
    e = adsr(dur, attack, 2.0, 0.85, min(0.6, dur * 0.4))
    L = sweep(L, cut0, cut1, 'low') * e
    R = sweep(R, cut0, cut1, 'low') * e
    st = np.vstack([L, R]) / max(1, len(notes)) * 2
    out(st, t, 0, v, rv=rv, sc=sc)


def stab(t, notes, v=0.16, dur=0.32):
    acc = np.zeros(int(dur * SR))
    for j, m in enumerate(notes):
        acc += supersaw(m + 12, dur, 3, 0.008, seed=j + 7)
    acc = sweep(acc, 5200, 700, 'low') * env_exp(dur, 0.09, 0.002)
    out(acc / len(notes) * 2, t, 0, v, rv=0.3, dl=0.25, sc=True)


def fm_bell(t, m, v=0.3, dur=1.6, ratio=3.5, index=3.0, pan=0.0, rv=0.45, dl=0.3):
    tt = tvec(dur)
    f = mtof(m)
    mod = np.sin(2 * np.pi * f * ratio * tt) * index * np.exp(-tt / 0.25)
    s = np.sin(2 * np.pi * f * tt + mod) * env_exp(dur, 0.45, 0.001)
    s += 0.25 * np.sin(2 * np.pi * f * 2 * tt) * env_exp(dur, 0.18)
    out(s, t, pan, v, rv=rv, dl=dl)


def blip(t, f, v=0.15, pan=0.0, dur=0.09):
    tt = tvec(dur)
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.7 * np.exp(-tt / 0.012))) / SR) * env_exp(dur, 0.03, 0.001)
    out(s, t, pan, v, rv=0.2)


def tick(t, v=0.08, f=4500, pan=0.0):
    s = hp(noise(0.008), f) * env_exp(0.008, 0.0018, 0.0002)
    out(s, t, pan, v)


def thud(t, f=70, v=0.5, pan=0.0, dur=0.3):
    tt = tvec(dur)
    s = sine(f * (1 + 1.2 * np.exp(-tt / 0.02)), dur) * env_exp(dur, 0.08, 0.001)
    s += lp(noise(dur), 900) * env_exp(dur, 0.02) * 0.5
    out(np.tanh(1.5 * s), t, pan, v, rv=0.1)


def plunk(t, m, v=0.22, pan=0.0):
    dur = 0.5
    tt = tvec(dur)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * tt) * env_exp(dur, 0.12, 0.001) + 0.35 * np.sin(2 * np.pi * f * 3.98 * tt) * env_exp(dur, 0.025)
    s[:200] += hp(noise(200 / SR), 2000) * 0.4
    out(s, t, pan, v, rv=0.15)


def whoosh(t_peak, dur=0.5, v=0.25, f0=300, f1=5000, p0=-0.8, p1=0.8):
    n = noise(dur)
    s = sweep(n, f0, f1, 'band')
    u = np.linspace(0, 1, len(s))
    peak = 0.62
    e = np.where(u < peak, (u / peak) ** 2.2, ((1 - u) / (1 - peak)) ** 1.6)
    s = s * e
    pans = np.linspace(p0, p1, len(s))
    a = (pans + 1) * np.pi / 4
    st = np.vstack([s * np.cos(a), s * np.sin(a)])
    out(st, t_peak - dur * peak, 0, v, rv=0.25)


def riser(t0, t1, v=0.2, f0=200, f1=6000):
    d = t1 - t0
    n = sweep(noise(d), f0, f1, 'band')
    tt = tvec(d)
    tone = saw(np.geomspace(mtof(50), mtof(74), len(tt)), d) * 0.25
    tone = sweep(tone, 400, 4000, 'low')
    e = (tt / d) ** 2.5
    out((n + tone) * e, t0, 0, v, rv=0.35)


def reverse_cym(t1, d=0.8, v=0.2):
    s = hp(noise(d), 5000) * (tvec(d) / d) ** 3
    out(np.vstack([s, np.roll(s, 37)]), t1 - d, 0, v, rv=0.3)


def crash(t, v=0.18, d=2.2):
    s = hp(noise(d), 4200) * env_exp(d, 0.55, 0.001)
    out(np.vstack([s, np.roll(s, 53)]), t, 0, v, rv=0.4)


def impact(t, v=1.0, f=52):
    d = 2.2
    tt = tvec(d)
    boom = sine(f * (1 + 1.5 * np.exp(-tt / 0.05)), d) * env_exp(d, 0.55, 0.001)
    burst = sweep(noise(d), 6000, 120, 'low') * env_exp(d, 0.22, 0.001)
    s = np.tanh(1.8 * boom) * 0.9 + burst * 0.55
    out(s, t, 0, v, rv=0.6)
    crash(t, 0.22 * v)


def servo(t0, t1, f0, f1, v=0.06, pan=-0.2):
    d = t1 - t0
    s = saw(np.linspace(f0, f1, int(d * SR)), d)
    s = bp(s, 300, 2500) * np.sin(np.linspace(0, np.pi, int(d * SR))) ** 0.6
    out(s, t0, pan, v, rv=0.08)


def gulp(t1, d=0.16, v=0.35):
    tt = tvec(d)
    s = sine(np.geomspace(900, 60, len(tt)), d) * (tt / d) ** 0.5 * (1 - (tt / d) ** 4)
    out(s, t1 - d, 0, v)


# ------------------------------------------------------------------ harmony
CH = {
    'Dm': ([50, 53, 57, 60], 38), 'Bb': ([46, 50, 53, 57], 34), 'F': ([53, 57, 60, 64], 41),
    'C': ([48, 52, 55, 62], 36), 'Gm': ([55, 58, 62, 65], 43), 'A': ([57, 61, 64, 67], 33),
    'Asus': ([57, 62, 64, 67], 33), 'D': ([50, 54, 57, 64], 38)
}
BAR_CH = ['Dm', 'Dm', 'Dm', 'Dm', 'Bb', 'F', 'C', 'Gm', 'Bb', 'C', 'Bb', 'Asus', 'D', 'D', 'D']

# ------------------------------------------------------------------ INTRO 0–6
dron = sine(mtof(26), 6.2) * 0.6 + sine(mtof(38), 6.2) * 0.25
dron *= adsr(6.2, 1.2, 3, 1, 0.3)
out(dron, 0, 0, 0.28, sc=False)
air = sweep(noise(6.0), 300, 2400, 'band') * adsr(6.0, 2.0, 3, 1, 0.3)
out(np.vstack([air, np.roll(air, 211)]), 0, 0, 0.05, rv=0.4)
pad(0.0, [50, 57, 60, 64, 69], 6.1, v=0.11, cut0=300, cut1=2600, attack=1.5, rv=0.8, sc=False)
for i in range(10):
    tick(0.12 + i / 22, 0.05, 5000, 0.1)
for i in range(20):
    tick(0.32 + i / 40, 0.035, 6000, -0.1)
# the four bars: fly-in whoosh + landing thock + sonic logo D A C F
logo_notes = [74, 81, 84, 89]
for j, tl in enumerate([1.0, 1.5, 2.0, 2.5]):
    whoosh(tl - 0.02, 0.42, 0.16, 500, 7000, [0, -0.7, 0.7, 0.5][j], 0)
    thud(tl, 62 + j * 4, 0.55)
    tick(tl, 0.25, 2500)
    fm_bell(tl, logo_notes[j], 0.2, 1.8, pan=[-0.25, 0.25, -0.1, 0.1][j])
    kick(tl, 0.45)
# tile closes
whoosh(3.0, 0.36, 0.14, 200, 2500, 0.2, -0.2)
impact(3.0, 0.5, 46)
for b in np.arange(3.0, 4.0, 0.125):
    hat(b, 0.05 + 0.04 * ((b * 8) % 2), False, 0.3)
riser(3.0, 4.0, 0.06, 400, 3000)
# scan: a falling filter sweep with row ticks
sc_d = 0.66
scan = sweep(saw(np.geomspace(1400, 300, int(sc_d * SR)), sc_d), 5000, 600, 'band') * adsr(sc_d, 0.02, 1, 1, 0.08)
out(scan, 4.0, 0, 0.07, rv=0.3, dl=0.2)
for r in range(34):
    tick(4.0 + r * (0.62 / 34), 0.05 + 0.02 * (r % 2), 3500 + 60 * r, (r % 2) * 0.4 - 0.2)
kick(4.0, 0.7)
clap(4.5, 0.3)
# seven wedges light on 32nds: the D-minor scale up
for k, m in enumerate([74, 76, 77, 79, 81, 82, 84]):
    blip(4.75 + k * 0.0625, mtof(m), 0.16, (k / 6 - 0.5) * 1.2)
    fm_bell(4.75 + k * 0.0625, m + 12, 0.035, 0.6, rv=0.3, dl=0.3)
riser(4.25, 5.25, 0.16)
reverse_cym(5.25, 0.9, 0.2)
for k, b in enumerate(np.arange(4.5, 5.25, 0.0625)):
    snare(b, 0.04 + 0.2 * (k / 12) ** 2, 200 + k * 6)
# burst + push-through
impact(5.25, 0.8, 50)
whoosh(5.75, 0.9, 0.35, 150, 9000, -0.3, 0.3)
for i in range(30):  # pills streaming into Services
    blip(5.85 + rng.random() * 0.36, mtof(rng.choice([86, 88, 89, 91, 93])), 0.035, rng.uniform(-0.8, 0.8), 0.05)

# ------------------------------------------------------------------ GROOVE 6–20
for bar in range(3, 10):
    t0 = bar * 2.0
    notes, root = CH[BAR_CH[bar]]
    pad(t0, notes, 2.05, v=0.07, cut0=900, cut1=2200, attack=0.05, rv=0.5)
    for beat in range(4):
        tb = t0 + beat * BEAT
        kick(tb, 0.95 if beat == 0 else 0.85)
        if beat in (1, 3):
            clap(tb, 0.42)
        hat(tb + 0.25, 0.13, True, 0.15)
        for s16 in (0.125, 0.375):
            hat(tb + s16 + 0.012, 0.06 + 0.02 * rng.random(), False, -0.25)
        bass_pluck(tb + 0.25, root, 0.2, 0.34)
        sub_note(tb + 0.25, root - 12 + 12, 0.22, 0.32)
        if beat == 1 or beat == 3:
            bass_pluck(tb + 0.375, root + 12, 0.11, 0.2)
    stab(t0 + 0.75, notes, 0.1)
    stab(t0 + 1.75, notes, 0.08)
    # 16th arp, quiet, through the delay
    arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[3] + 12]
    for s in range(16):
        if s % 4 == 0 and bar % 2 == 0:
            continue
        m = arp[[0, 2, 1, 3, 2, 1, 3, 0][s % 8]] + (12 if s >= 12 else 0)
        tb = t0 + s * 0.125
        dur = 0.12
        p = saw(mtof(m), dur) * env_exp(dur, 0.04)
        out(lp(p, 3200), tb, (s % 2) * 0.6 - 0.3, 0.035, dl=0.5, sc=True)
    # transition into the next division
    if bar < 9:
        whoosh(t0 + 2.0, 0.48, 0.22, 250, 6500, -0.8 if bar % 2 else 0.8, 0.8 if bar % 2 else -0.8)
        reverse_cym(t0 + 2.0, 0.5, 0.08)
    crash(t0, 0.06, 1.0)

# 01 services: morph shuffle, bars grow
for i in range(14):
    tick(6.66 + i * 0.024, 0.06, 3000, (i % 2) * 0.6 - 0.3)
whoosh(6.95, 0.36, 0.08, 400, 4000, 0.3, -0.3)
for i in range(9):
    blip(7.1 + i * 0.035, mtof(74 + [0, 2, 3, 5, 7, 8, 10, 12, 14][i]), 0.07, (i / 8 - 0.5))
# 02 products: card flips in a wave, house brand pop
for row in range(2):
    for col in range(5):
        tf = 8 - 0.12 + (col + row * 1.5) * 0.055 + 0.2
        s = sweep(noise(0.05), 1500, 6000, 'band') * env_exp(0.05, 0.015)
        out(s, tf, col / 4 - 0.5, 0.12)
fm_bell(8.95, 86, 0.14, 1.2, ratio=2.0, index=2.0)
blip(8.95, mtof(93), 0.1)
# 03 advertising: towers thump up, billboard clack, car pass
xs = [-4.0, -2.6, -1.1, 0.5, 2.0, 3.5, -3.3, -1.8, 0.0, 1.5, 3.1]
for j, x in enumerate(xs):
    tt0 = 10 - 0.18 + (x + 4.2) * 0.035 + (0.08 if j >= 6 else 0) + 0.18
    thud(tt0, 55 + j * 3, 0.22, x / 5)
thud(10.72, 120, 0.25)
tick(10.72, 0.2, 2000)
car_d = 2.3
car = saw(np.full(int(car_d * SR), 58.0), car_d) + 0.5 * noise(car_d)
car = lp(car, 700) * np.sin(np.linspace(0, np.pi, int(car_d * SR))) ** 2
pans = np.linspace(-0.9, 0.9, len(car))
a = (pans + 1) * np.pi / 4
out(np.vstack([car * np.cos(a), car * np.sin(a)]), 9.85, 0, 0.09)
# 04 store: every item plunks on its first contact, smaller second bounce
scale = [62, 65, 67, 69, 72, 74, 77, 79, 81]
for n in range(18):
    t0i = 12 - 0.05 + n * 0.058
    m = scale[(n * 5) % len(scale)]
    plunk(t0i + 0.2, m, 0.17, ((n % 6) / 5 - 0.5) * 0.9)
    plunk(t0i + 0.4, m + 12, 0.05, ((n % 6) / 5 - 0.5) * 0.9)
for k, x in enumerate([0, 1]):
    thud(11.85 + k * 0.05, 90, 0.2)
fm_bell(12.98, 93, 0.06, 0.8, ratio=5.0, index=1.5)
# 05 education: books, frame snaps, ignition + launch
for j in range(5):
    thud(14 - 0.12 + j * 0.085 + 0.145, 80 + j * 6, 0.25)
for j in range(6):
    tick(14 + 0.3 + j * 0.07 + 0.15, 0.22, 1800)
    blip(14 + 0.3 + j * 0.07 + 0.15, mtof(79 + j * 2), 0.05)
ig_d = 1.2
roar = lp(noise(ig_d), 900) * adsr(ig_d, 0.15, 1, 1, 0.4)
out(np.vstack([roar, np.roll(roar, 100)]), 15.0, 0, 0.18, rv=0.3)
whoosh(15.75, 0.9, 0.2, 200, 4000, 0.3, 0.3)
# 06 AI: shimmer burst, pings on the beat pulses, typing
for i in range(40):
    blip(16 - 0.1 + rng.random() * 0.4, mtof(rng.choice([86, 89, 91, 93, 96, 98])), 0.03, rng.uniform(-0.9, 0.9), 0.06)
for b in range(4):
    fm_bell(16 + b * BEAT, [74, 77, 81, 84][b] + 12, 0.04, 0.5, ratio=1.5, index=1)
for i in range(17):
    tick(16.7 + i / 22, 0.07, 3800, 0.3)
# 07 automation: servos follow the arm, grip, place, lights on
servo(17.8, 18.25, 140, 260, 0.05)
servo(18.25, 18.42, 260, 180, 0.04)
tick(18.45, 0.3, 1500)
servo(18.62, 19.18, 160, 330, 0.06, 0.2)
thud(19.36, 140, 0.25)
tick(19.36, 0.3, 1800)
fm_bell(19.42, 86, 0.1, 1.0, ratio=2.0, index=1.2)
fm_bell(19.52, 90, 0.08, 1.0, ratio=2.0, index=1.2)
servo(19.48, 19.8, 300, 150, 0.04)

# ------------------------------------------------------------------ OVERVIEW + RECALL 20–24
whoosh(20.3, 0.9, 0.22, 4000, 300, 0.6, -0.6)
pad(20.0, CH['Bb'][0] + [65], 2.05, v=0.13, cut0=500, cut1=3200, attack=0.3, rv=0.7, sc=False)
pad(22.0, CH['Asus'][0] + [69], 1.88, v=0.14, cut0=1200, cut1=5000, attack=0.1, rv=0.7, sc=False)
sub_note(20.0, 34, 2.0, 0.35)
sub_note(22.0, 33, 1.86, 0.38)
for k in range(7):
    blip(20.55 + k * 0.125, mtof([74, 77, 79, 81, 84, 86, 89][k]), 0.09, (k / 6 - 0.5))
for b in np.arange(20.0, 22.0, 0.5):
    hat(b + 0.25, 0.05, True, 0.2)
riser(21.2, 23.86, 0.22, 150, 9000)
for k in range(14):
    whoosh(21.6 + k * 0.15 + rng.random() * 0.1, 0.5, 0.05, 600, 5000, rng.uniform(-1, 1), rng.uniform(-1, 1))
tb, k = 22.0, 0
while tb < 23.86:
    step = 0.25 if tb < 22.75 else 0.125 if tb < 23.375 else 0.0625
    snare(tb, 0.05 + 0.3 * ((tb - 22.0) / 1.86) ** 2, 190 + 30 * (tb - 22))
    if tb < 23.5 and abs((tb * 2) % 1) < 1e-6:
        kick(tb, 0.6)
    tb += step
reverse_cym(23.86, 1.2, 0.25)
gulp(23.92, 0.12, 0.35)

# ------------------------------------------------------------------ IMPACT + END CARD 24–30
impact(24.0, 1.0, 44)
kick(24.0, 1.0)
crash(24.0, 0.25, 3.0)
notes, root = CH['D']
pad(24.0, notes + [69, 74], 6.0, v=0.13, cut0=3000, cut1=900, attack=0.02, rv=0.8, sc=True)
sub_note(24.0, 38, 2.5, 0.4)
for j, m in enumerate([74, 81, 85, 90]):  # the sonic logo, resolved to D major
    fm_bell(24.22 + j * 0.16, m, 0.17, 2.2, pan=[-0.3, 0.3, -0.15, 0.15][j])
for bar in (12, 13):
    t0 = bar * 2.0
    for beat in range(4):
        tb = t0 + beat * BEAT
        if beat in (0, 2):
            kick(tb, 0.55 if tb > 24.0 else 0)
        if beat == 2:
            clap(tb, 0.22)
        hat(tb + 0.25, 0.06, True, 0.15)
        hat(tb + 0.125, 0.03, False, -0.25)
        hat(tb + 0.375, 0.03, False, -0.25)
        bass_pluck(tb + 0.25, root, 0.2, 0.18)
for k in range(7):
    blip(25.55 + k * 0.125, mtof([74, 76, 78, 79, 81, 83, 85][k] + 12), 0.08, (k / 6 - 0.5))
for i in range(14):
    tick(26.85 + i / 30, 0.05, 4000, 0.2)
fm_bell(26.6, 86, 0.06, 1.5, ratio=2.0, index=1.0)
# impact debris: a spray of small glassy blips
for i in range(26):
    blip(24.02 + rng.random() ** 2 * 0.7, mtof(rng.choice([86, 90, 93, 95, 98, 102])), 0.03, rng.uniform(-1, 1), 0.05)
# last hit: the sonic logo once more as the four bars step forward
for j, m in enumerate([74, 81, 85, 90]):
    fm_bell(28.0 + j * 0.125, m + 12, 0.08, 1.4, pan=[-0.4, 0.4, -0.2, 0.2][j], rv=0.6, dl=0.4)
kick(28.0, 0.5)
fm_bell(28.0, 62, 0.12, 2.0, ratio=1.0, index=1.5)
fm_bell(28.0, 74, 0.08, 2.0)
pad(28.0, notes + [66, 69], 2.0, v=0.09, cut0=1800, cut1=500, attack=0.05, rv=0.9, sc=False)
sub_note(28.0, 38, 1.8, 0.25)

# ------------------------------------------------------------------ mix
# sidechain: duck the pads/bass on every kick
duck = np.ones(N)
for t, v in kicks:
    if v <= 0:
        continue
    i = int(t * SR)
    d = int(0.32 * SR)
    seg = 1 - (0.7 * min(1, v)) * np.exp(-np.arange(d) / (0.07 * SR))
    j = min(N, i + d)
    duck[i:j] = np.minimum(duck[i:j], seg[:j - i])
mix = dry + side * duck

# ping-pong dotted-eighth delay
D = int(0.375 * SR)
fb = 0.42
acc = np.zeros_like(dly)
cur = dly.copy()
for k in range(1, 7):
    cur = np.roll(cur, D, axis=1)
    cur[:, :D] = 0
    cur = cur[::-1] * fb  # swap channels each repeat
    acc += cur
acc = np.vstack([lp(acc[0], 3500), lp(acc[1], 3500)])
mix += acc * 0.8
verb += acc * 0.2

# reverb: decaying decorrelated noise IR, darker as it decays
ir_d = 2.6
ti = tvec(ir_d)
irs = []
for ch in range(2):
    n = np.random.default_rng(100 + ch).uniform(-1, 1, len(ti)) * np.exp(-ti / 0.55)
    n = sweep(n, 9000, 1500, 'low', block=2048)
    n[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    irs.append(n / np.sqrt(np.sum(n ** 2)))
wet = np.vstack([fftconvolve(hp(verb[ch], 180), irs[ch])[:N] for ch in range(2)])
mix += wet * 0.55

# master: gentle glue, soft clip, fades
mix = hp(mix, 25)
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(1.6 * mix) / np.tanh(1.6)
fade_in = int(0.01 * SR)
mix[:, :fade_in] *= np.linspace(0, 1, fade_in)
fo = int(1.2 * SR)
mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
mix *= 0.89

outp = sys.argv[1] if len(sys.argv) > 1 else 'out/score_raw.wav'
from scipy.io import wavfile
wavfile.write(outp, SR, (mix.T * 32767).astype(np.int16))
print(outp, f'{N / SR:.2f}s', 'peak', float(np.max(np.abs(mix))))
