// Audio system for Hippo Heist - Retro synthesized sounds
const Audio = {
    ctx: null,
    masterVolume: 0.5,
    musicVolume: 0.15, // Lower than sound effects
    muted: false,
    musicPlaying: false,
    musicInterval: null,

    init() {
        // Create AudioContext on first user interaction
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Load mute preference
        this.muted = localStorage.getItem('hippoHeistMuted') === 'true';
        return this;
    },

    ensureContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('hippoHeistMuted', this.muted);
        if (this.muted) {
            this.stopMusic();
        }
        return this.muted;
    },

    // Play a tone with given parameters
    playTone(freq, type, duration, volume = 0.3, delay = 0) {
        if (this.muted) return;
        this.ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = type;
        osc.frequency.value = freq;

        const now = this.ctx.currentTime + delay;
        gain.gain.setValueAtTime(volume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    },

    // Play noise (for splash, etc)
    playNoise(duration, volume = 0.2) {
        if (this.muted) return;
        this.ensureContext();

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(volume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.start(now);
        noise.stop(now + duration);
    },

    // Sound Effects

    // Banana pickup - quick ascending blip
    playPickup() {
        this.playTone(400, 'square', 0.08, 0.25);
        this.playTone(600, 'square', 0.08, 0.25, 0.05);
        this.playTone(800, 'square', 0.1, 0.2, 0.1);
    },

    // Water splash
    playSplash() {
        this.playNoise(0.2, 0.3);
        this.playTone(200, 'sine', 0.15, 0.15);
    },

    // Take damage - descending buzz
    playHurt() {
        this.playTone(400, 'sawtooth', 0.1, 0.3);
        this.playTone(300, 'sawtooth', 0.1, 0.25, 0.08);
        this.playTone(200, 'sawtooth', 0.15, 0.2, 0.15);
    },

    // Eat farmer - crunchy chomp
    playEat() {
        this.playNoise(0.08, 0.35);
        this.playTone(150, 'square', 0.1, 0.3);
        this.playNoise(0.06, 0.25);
        this.playTone(120, 'square', 0.08, 0.25, 0.1);
    },

    // Feed leopard - happy ascending arpeggio
    playFeed() {
        this.playTone(523, 'triangle', 0.12, 0.25); // C5
        this.playTone(659, 'triangle', 0.12, 0.25, 0.1); // E5
        this.playTone(784, 'triangle', 0.15, 0.2, 0.2); // G5
    },

    // Farmer alert - quick "!" sound
    playAlert() {
        this.playTone(880, 'square', 0.05, 0.2);
        this.playTone(1200, 'square', 0.1, 0.25, 0.03);
    },

    // Level complete - victory fanfare
    playLevelComplete() {
        const notes = [523, 659, 784, 1047]; // C E G C
        notes.forEach((freq, i) => {
            this.playTone(freq, 'square', 0.2, 0.25, i * 0.15);
            this.playTone(freq * 1.5, 'triangle', 0.2, 0.15, i * 0.15);
        });
    },

    // Game over - sad descending
    playGameOver() {
        this.playTone(400, 'triangle', 0.3, 0.25);
        this.playTone(350, 'triangle', 0.3, 0.2, 0.25);
        this.playTone(300, 'triangle', 0.4, 0.15, 0.5);
    },

    // Button click
    playClick() {
        this.playTone(600, 'square', 0.05, 0.15);
    },

    // Footstep (subtle)
    playFootstep() {
        if (this.muted) return;
        this.ensureContext();

        // Very subtle thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.value = 80 + Math.random() * 20;

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.08 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
    },

    // Background Music - simple ambient loop
    startMusic() {
        if (this.muted || this.musicPlaying) return;
        this.musicPlaying = true;

        // Simple 4-bar loop pattern
        const pattern = [
            { note: 130.81, duration: 0.4 }, // C3
            { note: 0, duration: 0.4 }, // rest
            { note: 164.81, duration: 0.4 }, // E3
            { note: 0, duration: 0.4 },
            { note: 196.00, duration: 0.4 }, // G3
            { note: 0, duration: 0.4 },
            { note: 164.81, duration: 0.4 }, // E3
            { note: 0, duration: 0.4 },
        ];

        let patternIndex = 0;

        const playNote = () => {
            if (!this.musicPlaying || this.muted) {
                this.musicPlaying = false;
                return;
            }

            const { note, duration } = pattern[patternIndex];

            if (note > 0) {
                this.ensureContext();
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.type = 'triangle';
                osc.frequency.value = note;

                const now = this.ctx.currentTime;
                gain.gain.setValueAtTime(this.musicVolume * this.masterVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

                osc.start(now);
                osc.stop(now + duration);
            }

            patternIndex = (patternIndex + 1) % pattern.length;
            this.musicInterval = setTimeout(playNote, duration * 1000);
        };

        playNote();
    },

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearTimeout(this.musicInterval);
            this.musicInterval = null;
        }
    }
};
