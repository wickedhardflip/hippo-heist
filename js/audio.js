// Audio system for Hippo Heist - richer Web Audio synthesis (no external files).
// Layered: SFX + ambient nature bed (wind/birds) + per-level music (pad/bass/arp).
const Audio = {
    ctx: null,
    master: null,
    sfxGain: null,
    musicGain: null,
    ambientGain: null,
    muted: false,
    musicPlaying: false,
    musicTimer: null,
    ambientNodes: null,
    birdTimer: null,
    currentLevel: 1,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.6;
            this.master.connect(this.ctx.destination);

            // light master compression for glue
            try {
                const comp = this.ctx.createDynamicsCompressor();
                comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3;
                comp.attack.value = 0.004; comp.release.value = 0.25;
                this.master.disconnect();
                this.master.connect(comp);
                comp.connect(this.ctx.destination);
            } catch (e) { /* compressor optional */ }

            this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.9;
            this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.0; // faded in
            this.ambientGain = this.ctx.createGain(); this.ambientGain.gain.value = 0.0;
            this.sfxGain.connect(this.master);
            this.musicGain.connect(this.master);
            this.ambientGain.connect(this.master);
        }
        this.muted = localStorage.getItem('hippoHeistMuted') === 'true';
        return this;
    },

    ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('hippoHeistMuted', this.muted);
        if (this.muted) {
            this.stopMusic();
            if (this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        } else if (this.master) {
            this.master.gain.setTargetAtTime(0.6, this.ctx.currentTime, 0.05);
        }
        return this.muted;
    },

    now() { return this.ctx.currentTime; },

    // ---- low-level voices ----
    tone(freq, type, dur, vol = 0.3, delay = 0, dest = null, detune = 0) {
        if (this.muted) return;
        this.ensureContext();
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type; osc.frequency.value = freq; osc.detune.value = detune;
        osc.connect(g); g.connect(dest || this.sfxGain);
        const t = this.now() + delay;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.start(t); osc.stop(t + dur + 0.02);
    },

    // a quick frequency sweep voice
    sweep(f0, f1, type, dur, vol, delay = 0, dest = null) {
        if (this.muted) return;
        this.ensureContext();
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        const t = this.now() + delay;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        osc.connect(g); g.connect(dest || this.sfxGain);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.start(t); osc.stop(t + dur + 0.02);
    },

    noise(dur, vol = 0.2, filterType = 'lowpass', cutoff = 2000, dest = null, delay = 0) {
        if (this.muted) return;
        this.ensureContext();
        const n = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource(); src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType; filter.frequency.value = cutoff;
        const g = this.ctx.createGain();
        src.connect(filter); filter.connect(g); g.connect(dest || this.sfxGain);
        const t = this.now() + delay;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.start(t); src.stop(t + dur + 0.02);
    },

    // ---- Sound effects ----
    playPickup() {
        // bright ascending pluck + sparkle
        this.tone(523, 'triangle', 0.10, 0.28);
        this.tone(784, 'triangle', 0.10, 0.24, 0.06);
        this.tone(1047, 'sine', 0.14, 0.20, 0.12);
        this.tone(1568, 'sine', 0.10, 0.10, 0.12);
    },

    playSplash() {
        this.noise(0.28, 0.32, 'lowpass', 1400);
        this.noise(0.16, 0.18, 'highpass', 1200, null, 0.02);
        this.sweep(420, 120, 'sine', 0.25, 0.18);
    },

    playHurt() {
        this.sweep(420, 90, 'sawtooth', 0.22, 0.30);
        this.tone(160, 'square', 0.18, 0.20, 0.02);
        this.noise(0.12, 0.15, 'bandpass', 800, null, 0.0);
    },

    playEat() {
        // crunchy double chomp
        this.noise(0.07, 0.4, 'lowpass', 1200);
        this.tone(120, 'square', 0.10, 0.32);
        this.sweep(200, 70, 'sawtooth', 0.12, 0.22, 0.0);
        this.noise(0.06, 0.3, 'lowpass', 900, null, 0.11);
        this.tone(100, 'square', 0.09, 0.26, 0.11);
    },

    playFeed() {
        // happy gulp + chime
        this.sweep(180, 360, 'sine', 0.18, 0.26);
        this.tone(659, 'triangle', 0.12, 0.20, 0.10);
        this.tone(880, 'triangle', 0.16, 0.18, 0.18);
        this.tone(1319, 'sine', 0.12, 0.10, 0.22);
    },

    playAlert() {
        this.tone(880, 'square', 0.06, 0.22);
        this.tone(1245, 'square', 0.12, 0.24, 0.04);
    },

    playLevelComplete() {
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((f, i) => {
            this.tone(f, 'triangle', 0.32, 0.26, i * 0.13);
            this.tone(f * 2, 'sine', 0.24, 0.10, i * 0.13);
            this.tone(f / 2, 'sawtooth', 0.3, 0.08, i * 0.13);
        });
    },

    playGameOver() {
        const notes = [392, 349, 311, 262];
        notes.forEach((f, i) => {
            this.tone(f, 'triangle', 0.4, 0.24, i * 0.22);
            this.tone(f * 0.5, 'sine', 0.45, 0.12, i * 0.22);
        });
    },

    playClick() {
        this.tone(660, 'square', 0.05, 0.16);
        this.tone(990, 'square', 0.04, 0.10, 0.02);
    },

    playFootstep() {
        if (this.muted) return;
        this.tone(70 + Math.random() * 25, 'sine', 0.06, 0.07);
        this.noise(0.04, 0.05, 'lowpass', 500);
    },

    // ---- Ambient nature bed ----
    startAmbient() {
        if (this.muted || this.ambientNodes) return;
        this.ensureContext();
        // wind = looping brown-ish noise through a slow-moving lowpass
        const n = Math.floor(this.ctx.sampleRate * 3);
        const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < n; i++) {
            const white = Math.random() * 2 - 1;
            last = (last + 0.02 * white) / 1.02;
            data[i] = last * 3.5;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer; src.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 500;
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 0.07; lfoGain.gain.value = 280;
        lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
        const g = this.ctx.createGain(); g.gain.value = 0.5;
        src.connect(filter); filter.connect(g); g.connect(this.ambientGain);
        src.start(); lfo.start();

        this.ambientNodes = { src, lfo };
        this.ambientGain.gain.setTargetAtTime(0.5, this.now(), 1.5);
        this.scheduleBird();
    },

    scheduleBird() {
        if (this.muted || !this.ambientNodes) return;
        const delay = 2500 + Math.random() * 6000;
        this.birdTimer = setTimeout(() => {
            this.chirp();
            this.scheduleBird();
        }, delay);
    },

    chirp() {
        if (this.muted) return;
        this.ensureContext();
        const base = 1800 + Math.random() * 1400;
        const reps = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < reps; i++) {
            const t = i * 0.09;
            this.sweep(base, base * (1.2 + Math.random() * 0.3), 'sine', 0.07, 0.05, t, this.ambientGain);
        }
    },

    stopAmbient() {
        if (this.birdTimer) { clearTimeout(this.birdTimer); this.birdTimer = null; }
        if (this.ambientNodes) {
            this.ambientGain.gain.setTargetAtTime(0, this.now(), 0.4);
            const nodes = this.ambientNodes;
            this.ambientNodes = null;
            setTimeout(() => {
                try { nodes.src.stop(); nodes.lfo.stop(); } catch (e) {}
            }, 800);
        }
    },

    // ---- Music (layered, per-level mood) ----
    levelMoods: {
        1: { root: 196.00, scale: [0, 2, 4, 7, 9], tempo: 560, wave: 'triangle' },   // G major, calm
        2: { root: 174.61, scale: [0, 2, 4, 7, 9], tempo: 520, wave: 'triangle' },   // F major
        3: { root: 164.81, scale: [0, 2, 3, 5, 7, 10], tempo: 430, wave: 'sawtooth' }, // E minor-ish, tense
        4: { root: 146.83, scale: [0, 1, 3, 5, 7, 8], tempo: 360, wave: 'sawtooth' }   // D phrygian, hunt
    },

    startMusic(level = 1) {
        if (this.muted || this.musicPlaying) return;
        this.ensureContext();
        this.currentLevel = level;
        this.musicPlaying = true;
        this.musicGain.gain.cancelScheduledValues(this.now());
        this.musicGain.gain.setValueAtTime(0.0001, this.now());
        this.musicGain.gain.setTargetAtTime(0.5, this.now(), 1.2);

        this.startAmbient();

        const mood = this.levelMoods[level] || this.levelMoods[1];
        let step = 0;
        const beat = mood.tempo;
        const noteAt = (deg, oct) => mood.root * Math.pow(2, oct) * Math.pow(2, (mood.scale[((deg % mood.scale.length) + mood.scale.length) % mood.scale.length]) / 12);

        const tick = () => {
            if (!this.musicPlaying || this.muted) { this.musicPlaying = false; return; }
            const bar = Math.floor(step / 8) % 4;

            // bassline every 2 steps
            if (step % 2 === 0) {
                const bass = noteAt(bar, -1);
                this.tone(bass, mood.wave, beat / 1000 * 1.6, 0.16, 0, this.musicGain);
            }
            // pad chord at bar start
            if (step % 8 === 0) {
                [0, 2, 4].forEach((d, i) => {
                    this.tone(noteAt(bar + d, 0), 'sine', beat / 1000 * 7, 0.06, i * 0.02, this.musicGain);
                });
            }
            // arpeggio melody
            const deg = [0, 2, 4, 2, 4, 6, 4, 2][step % 8] + bar;
            this.tone(noteAt(deg, 1), mood.wave === 'sawtooth' ? 'triangle' : 'sine',
                beat / 1000 * 0.9, 0.07, 0, this.musicGain);

            step++;
            this.musicTimer = setTimeout(tick, beat);
        };
        tick();
    },

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) { clearTimeout(this.musicTimer); this.musicTimer = null; }
        if (this.musicGain) this.musicGain.gain.setTargetAtTime(0.0001, this.now(), 0.3);
        this.stopAmbient();
    }
};
