// ChessQuest sounds — all synthesized with WebAudio, no assets.
// Three packs (classic / arcade / zen), volume, haptics.
// iOS: audio context must be unlocked by a user gesture (see unlock()).

let ctx = null;
let enabled = JSON.parse(localStorage.getItem("cq_sound") ?? "true");
let pack = "classic";
let volume = 1;
let hapticsOn = true;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function unlock() {
  const c = ac();
  if (c.state === "suspended") c.resume();
}

export function soundEnabled() { return enabled; }
export function setSoundEnabled(v) {
  enabled = v;
  localStorage.setItem("cq_sound", JSON.stringify(v));
}
export function configureSound(opts) {
  if (opts.pack !== undefined) pack = opts.pack;
  if (opts.volume !== undefined) volume = opts.volume;
  if (opts.haptics !== undefined) hapticsOn = opts.haptics;
}

let hadGesture = false;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", () => { hadGesture = true; }, { once: true, passive: true });
}
export function haptic(pattern = 10) {
  if (hadGesture && hapticsOn && navigator.vibrate) { try { navigator.vibrate(pattern); } catch { /* ok */ } }
}

// pack flavor: waveform + pitch scaling + volume shaping per pack
const PACKS = {
  classic: { wave: null, pitch: 1, vol: 1, noise: 1 },
  arcade:  { wave: "square", pitch: 1.35, vol: 0.75, noise: 0.5 },
  zen:     { wave: "sine", pitch: 0.72, vol: 0.9, noise: 0.55 },
};

function tone({ freq = 440, dur = 0.1, type = "sine", vol = 0.2, at = 0,
                slide = 0, attack = 0.005, release = null }) {
  if (!enabled) return;
  const pk = PACKS[pack] || PACKS.classic;
  const c = ac();
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = pk.wave || type;
  const f = freq * pk.pitch;
  osc.frequency.setValueAtTime(f, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide * pk.pitch), t0 + dur);
  const v = vol * pk.vol * volume;
  const rel = release ?? dur * 0.6;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(v, t0 + attack);
  gain.gain.setValueAtTime(v, t0 + Math.max(attack, dur - rel));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.06, vol = 0.15, at = 0, freq = 1800, q = 1 }) {
  if (!enabled) return;
  const pk = PACKS[pack] || PACKS.classic;
  const c = ac();
  const t0 = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq * pk.pitch;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol * pk.noise * pk.vol * volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

// small random pitch humanization so no two moves sound identical
const jig = (f) => f * (0.97 + Math.random() * 0.06);

export const sfx = {
  move()    { noise({ dur: 0.05, vol: 0.35, freq: jig(900), q: 0.8 });
              tone({ freq: jig(240), dur: 0.05, type: "sine", vol: 0.12 });
              haptic(8); },
  capture() { noise({ dur: 0.08, vol: 0.5, freq: jig(600), q: 0.6 });
              tone({ freq: jig(180), dur: 0.08, type: "triangle", vol: 0.22, slide: -60 });
              haptic([12, 20, 12]); },
  castle()  { noise({ dur: 0.05, vol: 0.3, freq: jig(900) });
              noise({ dur: 0.05, vol: 0.3, freq: jig(700), at: 0.09 });
              haptic(8); },
  check()   { tone({ freq: 660, dur: 0.09, type: "square", vol: 0.09 });
              tone({ freq: 880, dur: 0.12, type: "square", vol: 0.09, at: 0.09 });
              haptic([10, 30, 18]); },
  promote() { [523, 659, 784, 1047].forEach((f, i) =>
                tone({ freq: f, dur: 0.1, type: "triangle", vol: 0.15, at: i * 0.06 }));
              haptic([10, 20, 10, 20, 24]); },
  illegal() { tone({ freq: 160, dur: 0.12, type: "sawtooth", vol: 0.1, slide: -40 }); },
  click()   { noise({ dur: 0.03, vol: 0.2, freq: 2400, q: 2 }); },
  pickup()  { noise({ dur: 0.025, vol: 0.14, freq: jig(1600), q: 1.5 }); },

  correct() { tone({ freq: 660, dur: 0.09, type: "sine", vol: 0.2 });
              tone({ freq: 990, dur: 0.14, type: "sine", vol: 0.2, at: 0.08 });
              haptic(12); },
  wrong()   { tone({ freq: 280, dur: 0.15, type: "sawtooth", vol: 0.12, slide: -80 });
              tone({ freq: 180, dur: 0.25, type: "sawtooth", vol: 0.1, at: 0.13, slide: -60 });
              haptic([40, 40, 40]); },
  nearMiss() { tone({ freq: 500, dur: 0.12, type: "triangle", vol: 0.13 });
              tone({ freq: 470, dur: 0.22, type: "triangle", vol: 0.11, at: 0.12, slide: -40 }); },
  solve()   { [523, 659, 784].forEach((f, i) =>
                tone({ freq: f, dur: 0.12, type: "triangle", vol: 0.2, at: i * 0.07 }));
              tone({ freq: 1047, dur: 0.3, type: "triangle", vol: 0.22, at: 0.21 });
              haptic([10, 20, 10, 20, 30]); },
  streak(n) { const base = Math.min(1568, 523 * Math.pow(1.06, n));
              tone({ freq: base, dur: 0.08, type: "square", vol: 0.1 });
              tone({ freq: base * 1.5, dur: 0.15, type: "square", vol: 0.1, at: 0.07 }); },
  tick()    { noise({ dur: 0.02, vol: 0.1, freq: 3000, q: 3 }); },
  life()    { tone({ freq: 330, dur: 0.2, type: "sawtooth", vol: 0.14, slide: -120 });
              haptic([60, 40, 60]); },

  win()     { [392, 523, 659, 784, 1047].forEach((f, i) =>
                tone({ freq: f, dur: 0.18, type: "triangle", vol: 0.22, at: i * 0.11 }));
              [392, 523, 659, 784, 1047].forEach((f, i) =>
                tone({ freq: f * 2, dur: 0.18, type: "sine", vol: 0.08, at: i * 0.11 }));
              tone({ freq: 1319, dur: 0.5, type: "triangle", vol: 0.2, at: 0.55 });
              haptic([20, 30, 20, 30, 20, 30, 60]); },
  lose()    { [392, 349, 311, 262].forEach((f, i) =>
                tone({ freq: f, dur: 0.28, type: "triangle", vol: 0.16, at: i * 0.22 })); },
  draw()    { tone({ freq: 440, dur: 0.2, type: "triangle", vol: 0.15 });
              tone({ freq: 440, dur: 0.3, type: "triangle", vol: 0.12, at: 0.25 }); },

  levelup() { [523, 587, 659, 784, 880, 1047, 1319].forEach((f, i) =>
                tone({ freq: f, dur: 0.14, type: "triangle", vol: 0.2, at: i * 0.07 }));
              noise({ dur: 0.4, vol: 0.06, freq: 6000, q: 0.4, at: 0.5 });
              haptic([15, 30, 15, 30, 15, 30, 80]); },
  achievement() {
              tone({ freq: 784, dur: 0.1, type: "triangle", vol: 0.2 });
              tone({ freq: 1047, dur: 0.1, type: "triangle", vol: 0.2, at: 0.09 });
              tone({ freq: 1568, dur: 0.35, type: "triangle", vol: 0.22, at: 0.18 });
              haptic([20, 40, 20, 40, 50]); },
  xp()      { tone({ freq: 1200, dur: 0.05, type: "sine", vol: 0.1, slide: 300 }); },
  moduleDone() {
              [659, 784, 988, 1319].forEach((f, i) =>
                tone({ freq: f, dur: 0.16, type: "triangle", vol: 0.2, at: i * 0.09 }));
              haptic([15, 25, 15, 25, 40]); },
  rushStart() {
              [440, 554, 659].forEach((f, i) =>
                tone({ freq: f, dur: 0.1, type: "square", vol: 0.12, at: i * 0.1 }));
              tone({ freq: 880, dur: 0.25, type: "square", vol: 0.14, at: 0.3 }); },
  rushOver() {
              [659, 622, 587, 554].forEach((f, i) =>
                tone({ freq: f, dur: 0.2, type: "square", vol: 0.12, at: i * 0.14 })); },
};

// Play the right sound for a chess.js move object.
export function moveSound(move, inCheck) {
  if (inCheck) return sfx.check();
  if (move.promotion) return sfx.promote();
  if (move.flags && (move.flags.includes("k") || move.flags.includes("q"))) return sfx.castle();
  if (move.captured) return sfx.capture();
  sfx.move();
}
