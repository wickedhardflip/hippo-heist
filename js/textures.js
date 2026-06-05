// Procedural texture & material factory for Hippo Heist 3D
// All textures are generated at runtime on offscreen canvases - no image files needed,
// keeping the game fully self-contained and offline-capable.
const Tex = {
    cache: {},

    _canvas(size = 256) {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        return c;
    },

    _toTexture(canvas, repeat = 1, srgb = true) {
        const t = new THREE.CanvasTexture(canvas);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat, repeat);
        t.anisotropy = 8;
        if (THREE.sRGBEncoding !== undefined) {
            t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
        }
        t.needsUpdate = true;
        return t;
    },

    // Simple value-noise helper (deterministic-ish) drawn as soft blobs
    _noiseFill(ctx, size, base, spots, spotColor, spotAlpha, count) {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = spotColor;
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = spots * (0.4 + Math.random() * 0.8);
            ctx.globalAlpha = spotAlpha * (0.4 + Math.random() * 0.6);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    grass() {
        if (this.cache.grass) return this.cache.grass;
        const size = 512;
        const c = this._canvas(size);
        const ctx = c.getContext('2d');
        // base gradient of greens
        const g = ctx.createLinearGradient(0, 0, size, size);
        g.addColorStop(0, '#3fa14a');
        g.addColorStop(0.5, '#4cb85a');
        g.addColorStop(1, '#379a46');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        // darker clumps
        this._noiseFill(ctx, size, 'rgba(0,0,0,0)', 22, '#2f8a3e', 0.18, 260);
        // lighter clumps
        this._noiseFill(ctx, size, 'rgba(0,0,0,0)', 14, '#69d178', 0.16, 320);
        // tiny blade flecks
        for (let i = 0; i < 1400; i++) {
            ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(40,120,55,0.35)' : 'rgba(120,210,130,0.30)';
            ctx.lineWidth = 1;
            const x = Math.random() * size, y = Math.random() * size;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 3 - Math.random() * 4);
            ctx.stroke();
        }
        this.cache.grass = this._toTexture(c, 6);
        return this.cache.grass;
    },

    grassBump() {
        if (this.cache.grassBump) return this.cache.grassBump;
        const size = 256;
        const c = this._canvas(size);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 900; i++) {
            const v = Math.random() > 0.5 ? 255 : 0;
            ctx.fillStyle = `rgba(${v},${v},${v},0.12)`;
            const x = Math.random() * size, y = Math.random() * size;
            ctx.fillRect(x, y, 2, 2);
        }
        this.cache.grassBump = this._toTexture(c, 6, false);
        return this.cache.grassBump;
    },

    dirt() {
        if (this.cache.dirt) return this.cache.dirt;
        const size = 512;
        const c = this._canvas(size);
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, size, size);
        g.addColorStop(0, '#8a6a3a');
        g.addColorStop(1, '#6f5230');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        this._noiseFill(ctx, size, 'rgba(0,0,0,0)', 18, '#5c4327', 0.25, 300);
        this._noiseFill(ctx, size, 'rgba(0,0,0,0)', 8, '#a9844f', 0.2, 260);
        // pebbles
        for (let i = 0; i < 120; i++) {
            ctx.fillStyle = 'rgba(90,80,70,0.5)';
            const x = Math.random() * size, y = Math.random() * size;
            ctx.beginPath();
            ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        this.cache.dirt = this._toTexture(c, 4);
        return this.cache.dirt;
    },

    rock() {
        if (this.cache.rock) return this.cache.rock;
        const size = 512;
        const c = this._canvas(size);
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, size);
        g.addColorStop(0, '#8d8f95');
        g.addColorStop(0.5, '#75777d');
        g.addColorStop(1, '#5f6166');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        this._noiseFill(ctx, size, 'rgba(0,0,0,0)', 30, '#55575c', 0.2, 200);
        this._noiseFill(ctx, size, 'rgba(0,0,0,0)', 16, '#9aa0a6', 0.18, 240);
        // cracks
        ctx.strokeStyle = 'rgba(40,40,45,0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            let x = Math.random() * size, y = Math.random() * size;
            ctx.moveTo(x, y);
            for (let s = 0; s < 5; s++) {
                x += (Math.random() - 0.5) * 60;
                y += (Math.random() - 0.5) * 60;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        this.cache.rock = this._toTexture(c, 3);
        return this.cache.rock;
    },

    bark() {
        if (this.cache.bark) return this.cache.bark;
        const size = 256;
        const c = this._canvas(size);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#7a5a2e';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < size; i += 4) {
            ctx.strokeStyle = `rgba(${60 + Math.random() * 40},${40 + Math.random() * 30},${20 + Math.random() * 20},0.5)`;
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(i + (Math.random() - 0.5) * 6, 0);
            ctx.lineTo(i + (Math.random() - 0.5) * 6, size);
            ctx.stroke();
        }
        this.cache.bark = this._toTexture(c, 1);
        return this.cache.bark;
    },

    // Leopard fur with rosette spots
    leopard() {
        if (this.cache.leopard) return this.cache.leopard;
        const size = 256;
        const c = this._canvas(size);
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, size);
        g.addColorStop(0, '#f6c560');
        g.addColorStop(1, '#e0a035');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        // rosettes
        for (let i = 0; i < 90; i++) {
            const x = Math.random() * size, y = Math.random() * size;
            const r = 6 + Math.random() * 8;
            ctx.strokeStyle = 'rgba(70,40,15,0.9)';
            ctx.lineWidth = 2;
            for (let k = 0; k < 4; k++) {
                const a = (k / 4) * Math.PI * 2 + Math.random();
                ctx.beginPath();
                ctx.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5,
                    r * 0.35, r * 0.5, a, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(120,70,25,0.5)';
            ctx.beginPath();
            ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }
        this.cache.leopard = this._toTexture(c, 1);
        return this.cache.leopard;
    },

    // Water normal-ish ripple map
    waterNormal() {
        if (this.cache.waterNormal) return this.cache.waterNormal;
        const size = 256;
        const c = this._canvas(size);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * size, y = Math.random() * size;
            const r = 10 + Math.random() * 40;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, 'rgba(150,150,255,0.5)');
            grad.addColorStop(1, 'rgba(128,128,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        this.cache.waterNormal = this._toTexture(c, 4, false);
        return this.cache.waterNormal;
    }
};
