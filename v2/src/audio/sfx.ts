/** Tiny Web Audio synth: every sound is generated in code, so there are no audio files to load. */
let ctx: AudioContext | null = null, muted = false;

/** Must run inside a user gesture (iOS requirement). Safe to call repeatedly. */
export function unlockAudio(): void {
  try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); } catch { ctx = null; }
}
export const setMuted = (m: boolean) => { muted = m; };
export const isMuted = () => muted;

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slideTo?: number, delay = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol = 0.12, filterFreq = 1200) {
  if (!ctx || muted) return;
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'bandpass'; f.frequency.value = filterFreq; g.gain.value = vol;
  src.buffer = buf; src.connect(f).connect(g).connect(ctx.destination); src.start();
}
export const sfx = {
  pluck: (n: number) => tone([523, 659, 784][Math.min(3, Math.max(1, n)) - 1], 0.18, 'triangle', 0.18),
  dash: () => noise(0.25, 0.15, 900),
  bloop: () => tone(300, 0.22, 'sine', 0.2, 120),
  pop: () => tone(500, 0.08, 'sine', 0.15, 900),
  question: () => { tone(660, 0.12, 'triangle', 0.12); tone(880, 0.16, 'triangle', 0.12, undefined, 0.1); },
  alert: () => { tone(988, 0.1, 'square', 0.08); tone(988, 0.14, 'square', 0.08, undefined, 0.12); },
  feed: () => { tone(110, 0.3, 'sawtooth', 0.05, 90); tone(784, 0.2, 'triangle', 0.14, undefined, 0.15); tone(1047, 0.25, 'triangle', 0.14, undefined, 0.28); },
  click: () => tone(180, 0.05, 'triangle', 0.12),
  star: () => tone(1175, 0.2, 'triangle', 0.14, 1568),
  caught: () => tone(400, 0.35, 'sawtooth', 0.08, 150),
};
