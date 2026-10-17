// ================= AUDIO: synthesized, spatialized, with convolution reverb =================
const AU = {
  ctx: null, master: null, sfx: null, rev: null, nb: null, vol: 0.8, muted: false, loops: {}, nextBeat: 0, beatN: 0, listener: { x: 0, z: 0, yaw: 0 },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C();
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : this.vol;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    // generated impulse response for an outdoor slap-back reverb
    const len = Math.floor(c.sampleRate * 2.2), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < c.sampleRate * 0.012 ? 0 : 1); } }
    this.rev = c.createConvolver(); this.rev.buffer = ir; this.revIn = c.createGain(); this.revIn.gain.value = 0.28;
    this.revIn.connect(this.rev); this.rev.connect(this.master);
    const nl = c.sampleRate * 3, b = c.createBuffer(1, nl, c.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < nl; i++) { const w = Math.random() * 2 - 1; d[i] = w; }
    this.nb = b;
    const bl = c.createBuffer(1, nl, c.sampleRate), bd = bl.getChannelData(0); // brown noise for rumble
    for (let i = 0; i < nl; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
    this.brown = bl;
    this.loops.wind = this.loopNoise(this.brown, 'lowpass', 500, 0.0);
    this.loops.river = this.loopNoise(this.nb, 'bandpass', 650, 0.0, 0.5);
    this.loops.rain = this.loopNoise(this.nb, 'highpass', 1800, 0.0);
    this.loops.rain2 = this.loopNoise(this.nb, 'bandpass', 5200, 0.0, 0.7);
    // tension drone
    const dg = c.createGain(); dg.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 3;
    [[55, 'sawtooth'], [55.35, 'sawtooth'], [82.4, 'triangle'], [110.2, 'sine']].forEach(([f, t]) => { const o = c.createOscillator(); o.type = t; o.frequency.value = f; o.connect(lp); o.start(); });
    const lfo = c.createOscillator(); lfo.frequency.value = 0.11; const lg = c.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    lp.connect(dg); dg.connect(this.master); this.loops.drone = dg;
    // chainsaw voice
    const so = c.createOscillator(); so.type = 'sawtooth'; so.frequency.value = 92;
    const sl = c.createOscillator(); sl.frequency.value = 23; const sg2 = c.createGain(); sg2.gain.value = 16; sl.connect(sg2); sg2.connect(so.frequency);
    const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1100; sf.Q.value = 0.9;
    const sp = c.createStereoPanner ? c.createStereoPanner() : null;
    const sg = c.createGain(); sg.gain.value = 0; so.connect(sf); if (sp) { sf.connect(sp); sp.connect(sg); } else sf.connect(sg); sg.connect(this.sfx); so.start(); sl.start();
    this.loops.saw = { g: sg, p: sp, o: so };
  },
  loopNoise(buf, type, f, vol, q = 0.7) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = buf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(0, Math.random() * 2);
    return { g, f: fl };
  },
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.05); },
  toggleMute() { this.muted = !this.muted; this.setVolume(this.vol); return this.muted; },
  // returns [gain, pan] for a world position relative to the listener
  spatial(pos) {
    if (!pos) return [1, 0];
    const dx = pos.x - this.listener.x, dz = pos.z - this.listener.z, d = Math.hypot(dx, dz);
    const g = 1 / (1 + Math.max(0, d - 3) * 0.09); if (d < 0.5) return [1, 0];
    const fx = -Math.sin(this.listener.yaw), fz = -Math.cos(this.listener.yaw); const rx = -fz, rz = fx;
    const pan = clamp((dx * rx + dz * rz) / d, -1, 1) * 0.85;
    return [g, pan];
  },
  out(pos, wet = 0.3) {
    const c = this.ctx, [g, pan] = this.spatial(pos);
    const gn = c.createGain(); gn.gain.value = g;
    let node = gn;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; gn.connect(p); node = p; }
    node.connect(this.sfx);
    if (wet > 0) { const w = c.createGain(); w.gain.value = wet * (pos ? 1.4 - g * 0.6 : 1); node.connect(w); w.connect(this.revIn); }
    return gn;
  },
  tone(o) {
    if (!this.ctx || (o.pos && this.spatial(o.pos)[0] < 0.05)) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + (o.glide || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let n = osc;
    if (o.lp || o.bp) { const fl = c.createBiquadFilter(); fl.type = o.bp ? 'bandpass' : 'lowpass'; fl.frequency.value = o.bp || o.lp; fl.Q.value = o.q || 0.8; osc.connect(fl); n = fl; }
    n.connect(g); g.connect(this.out(o.pos, o.wet === undefined ? 0.25 : o.wet));
    osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  noise(o) {
    if (!this.ctx || (o.pos && this.spatial(o.pos)[0] < 0.05)) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const s = c.createBufferSource(); s.buffer = o.brown ? this.brown : this.nb; s.playbackRate.value = o.rate || 1;
    const fl = c.createBiquadFilter(); fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur); fl.Q.value = o.q || 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.a || 0.004));
    if (o.hold) g.gain.setValueAtTime(o.vol || 0.2, t + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(fl); fl.connect(g); g.connect(this.out(o.pos, o.wet === undefined ? 0.25 : o.wet));
    s.start(t, Math.random() * 2); s.stop(t + o.dur + 0.05);
  },
  update(dt, st) {
    if (!this.ctx) return;
    const c = this.ctx, now = c.currentTime;
    this.loops.wind.g.gain.setTargetAtTime(st.wind, now, 0.5);
    this.loops.river.g.gain.setTargetAtTime(st.water, now, 0.4);
    this.loops.rain.g.gain.setTargetAtTime(st.rain * 0.09, now, 0.5);
    this.loops.rain2.g.gain.setTargetAtTime(st.rain * 0.05, now, 0.5);
    this.loops.drone.gain.setTargetAtTime(0.085 * st.tension, now, 0.6);
    const saw = this.loops.saw;
    if (st.saw) { const [g, p] = this.spatial(st.saw); saw.g.gain.setTargetAtTime(0.12 * g * (st.sawRev ? 1.6 : 1), now, 0.08); if (saw.p) saw.p.pan.setTargetAtTime(p, now, 0.05); saw.o.frequency.setTargetAtTime(st.sawRev ? 150 : 92, now, 0.1); }
    else saw.g.gain.setTargetAtTime(0, now, 0.1);
    // combat percussion when hunted
    if (st.tension > 0.25) {
      if (now > this.nextBeat - 0.05) {
        const bt = Math.max(this.nextBeat, now), step = st.tension > 0.7 ? 0.21 : 0.29;
        const d = bt - now, n = this.beatN++ % 8;
        if (n === 0 || n === 3 || n === 6) { this.tone({ f: 120, f2: 40, dur: 0.28, vol: 0.32 * st.tension, delay: d, wet: 0.1 }); this.noise({ brown: true, f: 200, dur: 0.18, vol: 0.2 * st.tension, delay: d }); }
        if (n === 4) this.noise({ type: 'bandpass', f: 1800, q: 1.4, dur: 0.16, vol: 0.12 * st.tension, delay: d });
        this.noise({ type: 'highpass', f: 7000, dur: 0.04, vol: 0.035 * st.tension, delay: d, wet: 0 });
        if (n === 0 && st.tension > 0.6) this.tone({ type: 'sawtooth', f: 73.4, dur: step * 7, vol: 0.05, lp: 500, delay: d, a: 0.05 });
        this.nextBeat = bt + step;
      }
    } else this.nextBeat = now;
  }
};
const SFX = {
  chomp(pos) { AU.noise({ f: 2400, f2: 260, dur: 0.14, vol: 0.45, pos }); AU.tone({ type: 'square', f: 160, f2: 55, dur: 0.14, vol: 0.32, lp: 700, pos }); AU.noise({ type: 'bandpass', f: 3800, q: 3, dur: 0.05, vol: 0.2, delay: 0.09, pos }); },
  whiff() { AU.noise({ type: 'bandpass', f: 600, f2: 1600, q: 1.2, dur: 0.18, vol: 0.16 }); AU.tone({ f: 110, f2: 70, dur: 0.12, vol: 0.18 }); },
  gulp(pos) { AU.tone({ f: 340, f2: 85, dur: 0.38, vol: 0.45, pos }); AU.tone({ f: 200, f2: 60, dur: 0.32, vol: 0.32, delay: 0.2, pos }); AU.noise({ brown: true, f: 400, dur: 0.4, vol: 0.4, delay: 0.1, pos }); },
  crunch(pos) { for (let i = 0; i < 4; i++) AU.noise({ type: 'bandpass', f: rand(1500, 3500), q: 2.5, dur: 0.06, vol: 0.28, delay: i * 0.07 + rand(0, 0.02), pos }); },
  splash(pos, v = 0.4) { AU.noise({ type: 'bandpass', f: 1600, f2: 380, q: 0.6, dur: 0.7, vol: v, pos }); AU.noise({ brown: true, f: 300, dur: 0.5, vol: v * 0.8, pos }); AU.noise({ type: 'highpass', f: 4000, dur: 0.3, vol: v * 0.3, delay: 0.08, pos }); },
  wade(pos) { AU.noise({ type: 'bandpass', f: rand(700, 1100), q: 1, dur: 0.22, vol: 0.09, pos }); },
  step(pos, heavy) { AU.tone({ f: heavy ? 62 : 90, f2: 34, dur: heavy ? 0.16 : 0.08, vol: heavy ? 0.22 : 0.06, pos, wet: 0.1 }); AU.noise({ type: 'lowpass', f: 600, dur: 0.07, vol: heavy ? 0.05 : 0.03, pos, wet: 0 }); },
  hurt() { AU.tone({ type: 'sawtooth', f: 120, f2: 48, dur: 0.3, vol: 0.38, lp: 500 }); AU.noise({ f: 700, dur: 0.22, vol: 0.35 }); AU.tone({ f: 3200, dur: 0.6, vol: 0.02, a: 0.01 }); },
  hit(pos) { AU.noise({ type: 'highpass', f: 2500, dur: 0.05, vol: 0.28, wet: 0 }); AU.tone({ type: 'square', f: 1250, dur: 0.04, vol: 0.06, wet: 0 }); AU.noise({ brown: true, f: 300, dur: 0.15, vol: 0.3, pos }); },
  swing(pos) { AU.noise({ type: 'bandpass', f: 420, f2: 2600, q: 1.6, dur: 0.24, vol: 0.22, pos }); },
  clang(pos) { [1800, 2650, 3900].forEach((f, i) => AU.tone({ type: 'triangle', f, dur: 0.5 - i * 0.1, vol: 0.06, pos })); },
  shout(pos, pitch = 1) { // rough voiced "HEY!" via formant filtered saw
    if (!AU.ctx) return; const p = pitch * rand(0.9, 1.1);
    AU.noise({ type: 'bandpass', f: 2200, q: 2, dur: 0.07, vol: 0.12, pos });
    AU.tone({ type: 'sawtooth', f: 180 * p, f2: 235 * p, dur: 0.32, vol: 0.2, bp: 620, q: 3, pos, delay: 0.04, a: 0.02 });
    AU.tone({ type: 'sawtooth', f: 180 * p, f2: 235 * p, dur: 0.32, vol: 0.13, bp: 1900, q: 4, pos, delay: 0.04, a: 0.02 });
  },
  bark(pos) { for (let i = 0; i < 2; i++) { const d = i * 0.22; AU.tone({ type: 'sawtooth', f: 420, f2: 260, dur: 0.12, vol: 0.2, bp: 900, q: 2, pos, delay: d }); AU.noise({ type: 'bandpass', f: 1300, q: 1.2, dur: 0.1, vol: 0.18, pos, delay: d }); } },
  yelp(pos) { AU.tone({ type: 'sawtooth', f: 900, f2: 1500, glide: 0.08, dur: 0.3, vol: 0.18, bp: 1400, q: 2, pos }); AU.tone({ type: 'sawtooth', f: 1300, f2: 700, dur: 0.25, vol: 0.12, bp: 1200, delay: 0.25, pos }); },
  alert() { AU.tone({ type: 'square', f: 740, dur: 0.1, vol: 0.09, lp: 2400, wet: 0.05 }); AU.tone({ type: 'square', f: 988, dur: 0.16, vol: 0.09, lp: 2400, delay: 0.11, wet: 0.05 }); },
  pickup() { [784, 1046, 1568].forEach((f, i) => AU.tone({ type: 'triangle', f, dur: 0.14, vol: 0.12, delay: i * 0.045, wet: 0.2 })); AU.noise({ type: 'bandpass', f: 1200, q: 2, dur: 0.08, vol: 0.12 }); },
  power() { [392, 523, 659, 784, 1046].forEach((f, i) => AU.tone({ type: 'square', f, dur: 0.12, vol: 0.06, delay: i * 0.05, lp: 3200, wet: 0.35 })); AU.tone({ f: 130, f2: 260, dur: 0.5, vol: 0.18 }); },
  feed(pos) { AU.noise({ type: 'bandpass', f: 900, q: 2.5, dur: 0.09, vol: 0.28, pos }); AU.noise({ type: 'bandpass', f: 650, q: 2.5, dur: 0.09, vol: 0.26, delay: 0.12, pos }); AU.tone({ f: 120, f2: 80, dur: 0.1, vol: 0.15, delay: 0.2, pos }); },
  chain(pos) { AU.noise({ type: 'bandpass', f: 3600, q: 7, dur: 0.22, vol: 0.22, pos }); AU.tone({ type: 'triangle', f: 2100, f2: 1850, dur: 0.18, vol: 0.06, pos }); AU.tone({ type: 'triangle', f: 3150, dur: 0.12, vol: 0.04, delay: 0.05, pos }); },
  metal(pos) { AU.noise({ type: 'bandpass', f: 900, q: 5, dur: 0.6, vol: 0.3, pos }); AU.tone({ type: 'sawtooth', f: 180, f2: 120, dur: 0.6, vol: 0.12, bp: 700, q: 6, pos }); },
  snap(pos) { AU.noise({ type: 'highpass', f: 2200, dur: 0.45, vol: 0.55, pos }); [2400, 3150, 1780, 4200].forEach((f, i) => AU.tone({ type: 'triangle', f, dur: 0.6, vol: 0.1, delay: i * 0.035, pos })); AU.noise({ brown: true, f: 300, dur: 0.6, vol: 0.5, pos }); },
  crash(pos) { AU.noise({ brown: true, f: 500, dur: 0.9, vol: 0.7, pos }); AU.noise({ type: 'bandpass', f: 1200, q: 0.8, dur: 0.6, vol: 0.4, pos }); [600, 940, 1300].forEach((f, i) => AU.tone({ type: 'triangle', f, dur: 0.7, vol: 0.06, delay: i * 0.04, pos })); },
  roar(pos) { AU.noise({ type: 'lowpass', f: 650, f2: 200, dur: 1.6, vol: 0.7, a: 0.09, pos, wet: 0.5 }); AU.tone({ type: 'sawtooth', f: 135, f2: 72, dur: 1.5, vol: 0.32, lp: 800, a: 0.06, pos, wet: 0.5 }); AU.tone({ type: 'sawtooth', f: 270, f2: 140, dur: 1.2, vol: 0.12, bp: 1200, q: 2, a: 0.08, pos }); },
  growl(pos) { AU.noise({ type: 'lowpass', f: 300, dur: 0.7, vol: 0.3, a: 0.1, pos }); AU.tone({ type: 'sawtooth', f: 70, f2: 60, dur: 0.7, vol: 0.12, lp: 300, a: 0.1, pos }); },
  bellow() { AU.tone({ type: 'sawtooth', f: 74, f2: 56, dur: 1.4, vol: 0.5, lp: 380, a: 0.08, wet: 0.6 }); AU.tone({ type: 'sawtooth', f: 111, f2: 84, dur: 1.3, vol: 0.24, bp: 450, q: 3, a: 0.1, wet: 0.6 }); AU.noise({ brown: true, f: 260, dur: 1.2, vol: 0.4, a: 0.12 }); for (let i = 0; i < 5; i++) AU.tone({ f: 60, f2: 50, dur: 0.12, vol: 0.12, delay: 0.9 + i * 0.13 }); },
  death() { AU.tone({ type: 'sawtooth', f: 180, f2: 38, dur: 1.9, vol: 0.38, lp: 600, wet: 0.6 }); AU.noise({ brown: true, f: 300, dur: 1.6, vol: 0.4 }); },
  win() { [392, 523, 659, 784, 1046].forEach((f, i) => AU.tone({ type: 'triangle', f, dur: 0.7, vol: 0.14, delay: i * 0.14, wet: 0.5 })); },
  sting() { AU.tone({ type: 'sawtooth', f: 110, dur: 1.4, vol: 0.18, lp: 900, a: 0.02, wet: 0.6 }); AU.tone({ type: 'sawtooth', f: 164.8, dur: 1.4, vol: 0.12, lp: 900, a: 0.02, wet: 0.6 }); AU.tone({ f: 55, f2: 40, dur: 1.4, vol: 0.4 }); },
  thunder() { AU.noise({ brown: true, f: 900, f2: 120, dur: 3.5, vol: 0.9, a: 0.05, wet: 0.7 }); AU.noise({ type: 'lowpass', f: 2200, f2: 200, dur: 0.8, vol: 0.4, wet: 0.6 }); },
  bird(pos) { const f = rand(2600, 4200); AU.tone({ f, f2: f * 1.35, dur: 0.07, vol: 0.035, pos, wet: 0.5 }); AU.tone({ f: f * 1.2, f2: f * 0.85, dur: 0.1, vol: 0.035, delay: 0.1, pos, wet: 0.5 }); AU.tone({ f: f * 1.1, f2: f * 1.4, dur: 0.08, vol: 0.03, delay: 0.24, pos, wet: 0.5 }); },
  cricket() { const f = rand(4200, 5200); for (let i = 0; i < 6; i++) AU.tone({ type: 'triangle', f, dur: 0.03, vol: 0.015, delay: i * 0.05, wet: 0.4 }); },
  whistle(pos) { for (let i = 0; i < 2; i++) { const d = i * 0.32; AU.tone({ type: 'square', f: 2900, f2: 3100, dur: 0.24, vol: 0.07, lp: 4200, pos, delay: d, wet: 0.2 }); for (let k = 0; k < 5; k++) AU.tone({ type: 'sine', f: 2700, dur: 0.035, vol: 0.06, pos, delay: d + k * 0.045 }); } },
  scream(pos, v = 1) { const p = rand(0.9, 1.25); AU.tone({ type: 'sawtooth', f: 620 * p, f2: 1050 * p, glide: 0.25, dur: 0.75, vol: 0.16 * v, bp: 1300, q: 2.5, pos, a: 0.04 }); AU.tone({ type: 'sawtooth', f: 900 * p, f2: 1400 * p, glide: 0.3, dur: 0.7, vol: 0.08 * v, bp: 2600, q: 3, pos, a: 0.05 }); },
  netgun(pos) { AU.noise({ brown: true, f: 500, dur: 0.25, vol: 0.5, pos }); AU.noise({ type: 'bandpass', f: 900, f2: 2400, q: 1, dur: 0.3, vol: 0.2, pos }); },
  netHit() { AU.noise({ type: 'bandpass', f: 1400, q: 0.9, dur: 0.35, vol: 0.3 }); AU.tone({ f: 140, f2: 70, dur: 0.2, vol: 0.2 }); },
  rip() { AU.noise({ type: 'highpass', f: 2600, dur: 0.12, vol: 0.22, wet: 0.05 }); AU.noise({ type: 'bandpass', f: 900, q: 2, dur: 0.1, vol: 0.18, delay: 0.04 }); },
  trainWhistle() { const pos = rig && rig.stack ? { x: rig.stack.x + rig.g.position.x, z: rig.stack.z } : null; [[392, 0.13], [494, 0.1], [587, 0.08]].forEach(([f, v]) => { AU.tone({ type: 'sawtooth', f, f2: f * 0.98, dur: 1.6, vol: v, lp: 1600, a: 0.12, pos, wet: 0.6 }); }); AU.noise({ type: 'bandpass', f: 2200, q: 1.5, dur: 1.5, vol: 0.06, a: 0.1, pos, wet: 0.5 }); },
  ui() { AU.tone({ type: 'square', f: 1200, dur: 0.04, vol: 0.05, lp: 3000, wet: 0 }); },
  type() { AU.noise({ type: 'bandpass', f: 3000, q: 3, dur: 0.02, vol: 0.06, wet: 0 }); },
  powerdown() { AU.tone({ type: 'square', f: 660, f2: 330, dur: 0.25, vol: 0.05, lp: 2000 }); },
  burst() { AU.noise({ type: 'bandpass', f: 300, f2: 1400, q: 0.8, dur: 0.35, vol: 0.14, wet: 0.05 }); AU.tone({ f: 70, f2: 120, dur: 0.25, vol: 0.2, wet: 0.05 }); AU.noise({ brown: true, f: 200, dur: 0.3, vol: 0.18 }); },
  winded() { for (let i = 0; i < 3; i++) { AU.noise({ type: 'bandpass', f: 900, q: 1.4, dur: 0.32, vol: 0.12, delay: i * 0.55, a: 0.08 }); AU.tone({ type: 'sawtooth', f: 85, f2: 62, dur: 0.3, vol: 0.06, lp: 400, delay: i * 0.55 + 0.05 }); } }
};
