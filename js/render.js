// Rendering system for Hippo Heist - Modern pixel graphics with gradients
const Render = {
    canvas: null,
    ctx: null,
    camera: { x: 0, y: 0 },
    TILE_SIZE: 32,

    // Particle system
    particles: [],

    // Screen shake
    shake: { x: 0, y: 0, intensity: 0, duration: 0 },

    // Floating text
    floatingTexts: [],

    // Color palette - modern cool colors with warm accents
    colors: {
        water: '#3498db',
        waterDeep: '#2980b9',
        waterLight: '#5dade2',
        waterHighlight: '#85c1e9',
        grass: '#2ecc71',
        grassLight: '#58d68d',
        grassDark: '#27ae60',
        grassAccent: '#1e8449',
        hippo: '#8e9aeb',
        hippoLight: '#a8b4f0',
        hippoShadow: '#6a7bd4',
        hippoSubmerged: '#5c6bc0',
        farmer: '#e74c3c',
        farmerLight: '#ec7063',
        farmerShadow: '#c0392b',
        farmerSkin: '#f5cba7',
        leopard: '#f39c12',
        leopardLight: '#f5b041',
        leopardSpots: '#d35400',
        banana: '#f1c40f',
        bananaLight: '#f4d03f',
        bananaShadow: '#d4ac0d',
        tree: '#27ae60',
        treeLight: '#2ecc71',
        treeDark: '#1e8449',
        trunk: '#8b6914',
        trunkDark: '#6b4423',
        cage: '#95a5a6',
        cageDark: '#7f8c8d'
    },

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.ctx.imageSmoothingEnabled = false;

        // Polyfill for roundRect if not supported
        if (!this.ctx.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                if (typeof r === 'number') {
                    r = { tl: r, tr: r, br: r, bl: r };
                }
                this.beginPath();
                this.moveTo(x + r.tl, y);
                this.lineTo(x + w - r.tr, y);
                this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
                this.lineTo(x + w, y + h - r.br);
                this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
                this.lineTo(x + r.bl, y + h);
                this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
                this.lineTo(x, y + r.tl);
                this.quadraticCurveTo(x, y, x + r.tl, y);
                this.closePath();
            };
        }
    },

    clear() {
        // Modern gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a2a4a');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    updateCamera(target, mapWidth, mapHeight) {
        this.camera.x = target.x - this.canvas.width / 2;
        this.camera.y = target.y - this.canvas.height / 2;
        this.camera.x = Math.max(0, Math.min(this.camera.x, mapWidth - this.canvas.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, mapHeight - this.canvas.height));
    },

    toScreen(x, y) {
        return { x: x - this.camera.x, y: y - this.camera.y };
    },

    // Create gradient for blocks
    createGradient(x, y, height, colorTop, colorBottom) {
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, colorTop);
        gradient.addColorStop(1, colorBottom);
        return gradient;
    },

    // Draw water tile - smooth natural look
    drawWater(x, y, time) {
        const pos = this.toScreen(x, y);

        // Solid water base color
        this.ctx.fillStyle = '#2980b9';
        this.ctx.fillRect(pos.x, pos.y, this.TILE_SIZE, this.TILE_SIZE);

        // Subtle animated shimmer using sine waves
        const shimmer1 = Math.sin(time / 800 + x / 60 + y / 80) * 0.15 + 0.1;
        const shimmer2 = Math.sin(time / 600 + x / 50 - y / 70) * 0.1;

        // Light caustic-like effect
        this.ctx.fillStyle = `rgba(133, 193, 233, ${shimmer1})`;
        this.ctx.beginPath();
        this.ctx.arc(pos.x + 10 + Math.sin(time/700 + x) * 3, pos.y + 12, 6, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = `rgba(174, 214, 241, ${shimmer2 + 0.15})`;
        this.ctx.beginPath();
        this.ctx.arc(pos.x + 24 + Math.cos(time/900 + y) * 2, pos.y + 22, 5, 0, Math.PI * 2);
        this.ctx.fill();
    },

    // Draw grass tile - natural seamless look
    drawGrass(x, y) {
        const pos = this.toScreen(x, y);

        // Use position-based variation for natural look (pseudo-random based on tile position)
        const seed = (x * 13 + y * 7) % 100;
        const variation = seed / 100;

        // Base grass color with slight variation
        const r = 46 + Math.floor(variation * 20);
        const g = 204 - Math.floor(variation * 30);
        const b = 113 - Math.floor(variation * 20);
        this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        this.ctx.fillRect(pos.x, pos.y, this.TILE_SIZE, this.TILE_SIZE);

        // Subtle texture dots (sparse, natural)
        this.ctx.globalAlpha = 0.25;
        const dotSeed = (x * 17 + y * 23) % 5;
        if (dotSeed > 2) {
            this.ctx.fillStyle = '#1e8449';
            this.ctx.beginPath();
            this.ctx.arc(pos.x + 8 + (seed % 12), pos.y + 10 + (seed % 8), 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        if (dotSeed < 3) {
            this.ctx.fillStyle = '#58d68d';
            this.ctx.beginPath();
            this.ctx.arc(pos.x + 20 + (seed % 6), pos.y + 22 + (seed % 5), 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    },

    // Draw the hippo with modern styling
    drawHippo(hippo, time, isGracePeriod = false) {
        const pos = this.toScreen(hippo.x, hippo.y);
        const bobOffset = Math.sin(time / 200) * 2;

        // Flash effect during grace period (blink rapidly)
        if (isGracePeriod) {
            const flashRate = Math.sin(time / 80); // Fast flashing
            if (flashRate < 0) {
                this.ctx.globalAlpha = 0.3; // Semi-transparent during flash
            }
        }

        if (hippo.isSubmerged) {
            // Submerged hippo - only top visible
            // Water ripple effect
            this.ctx.strokeStyle = this.colors.waterHighlight;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.7;
            this.ctx.beginPath();
            this.ctx.ellipse(pos.x + 20, pos.y + 30 + bobOffset, 18 + Math.sin(time / 250) * 4, 6, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;

            // Head peeking out
            const headGrad = this.ctx.createLinearGradient(pos.x + 8, pos.y + 14, pos.x + 8, pos.y + 28);
            headGrad.addColorStop(0, this.colors.hippoLight);
            headGrad.addColorStop(1, this.colors.hippoSubmerged);
            this.ctx.fillStyle = headGrad;
            this.ctx.beginPath();
            this.ctx.roundRect(pos.x + 6, pos.y + 14 + bobOffset, 28, 14, 6);
            this.ctx.fill();

            // Eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(pos.x + 14, pos.y + 20 + bobOffset, 4, 0, Math.PI * 2);
            this.ctx.arc(pos.x + 26, pos.y + 20 + bobOffset, 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Pupils
            this.ctx.fillStyle = '#232931';
            this.ctx.beginPath();
            this.ctx.arc(pos.x + 15, pos.y + 21 + bobOffset, 2, 0, Math.PI * 2);
            this.ctx.arc(pos.x + 27, pos.y + 21 + bobOffset, 2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Full hippo on land
            // Shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
            this.ctx.beginPath();
            this.ctx.ellipse(pos.x + 20, pos.y + 38, 18, 5, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Body gradient
            const bodyGrad = this.ctx.createLinearGradient(pos.x, pos.y + 8, pos.x, pos.y + 36);
            bodyGrad.addColorStop(0, this.colors.hippoLight);
            bodyGrad.addColorStop(0.5, this.colors.hippo);
            bodyGrad.addColorStop(1, this.colors.hippoShadow);
            this.ctx.fillStyle = bodyGrad;

            // Body
            this.ctx.beginPath();
            this.ctx.roundRect(pos.x + 4, pos.y + 10, 32, 26, 8);
            this.ctx.fill();

            // Head
            this.ctx.beginPath();
            this.ctx.roundRect(pos.x + 8, pos.y + 2, 24, 16, 8);
            this.ctx.fill();

            // Snout
            this.ctx.fillStyle = this.colors.hippo;
            this.ctx.beginPath();
            this.ctx.roundRect(pos.x + 12, pos.y + 20, 16, 12, 4);
            this.ctx.fill();

            // Ears
            this.ctx.fillStyle = this.colors.hippoShadow;
            this.ctx.beginPath();
            this.ctx.ellipse(pos.x + 10, pos.y + 4, 4, 5, 0, 0, Math.PI * 2);
            this.ctx.ellipse(pos.x + 30, pos.y + 4, 4, 5, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(pos.x + 14, pos.y + 10, 5, 0, Math.PI * 2);
            this.ctx.arc(pos.x + 26, pos.y + 10, 5, 0, Math.PI * 2);
            this.ctx.fill();

            // Pupils (follow direction)
            this.ctx.fillStyle = '#232931';
            const eyeOffsetX = hippo.facingX * 1.5;
            const eyeOffsetY = hippo.facingY * 1.5;
            this.ctx.beginPath();
            this.ctx.arc(pos.x + 14 + eyeOffsetX, pos.y + 10 + eyeOffsetY, 2.5, 0, Math.PI * 2);
            this.ctx.arc(pos.x + 26 + eyeOffsetX, pos.y + 10 + eyeOffsetY, 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Eye shine
            this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
            this.ctx.beginPath();
            this.ctx.arc(pos.x + 12, pos.y + 8, 1.5, 0, Math.PI * 2);
            this.ctx.arc(pos.x + 24, pos.y + 8, 1.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Nostrils
            this.ctx.fillStyle = this.colors.hippoShadow;
            this.ctx.beginPath();
            this.ctx.ellipse(pos.x + 16, pos.y + 26, 2, 2.5, 0, 0, Math.PI * 2);
            this.ctx.ellipse(pos.x + 24, pos.y + 26, 2, 2.5, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw carried bananas
        if (hippo.bananas > 0) {
            for (let i = 0; i < hippo.bananas; i++) {
                this.drawMiniBanana(pos.x + 38 + (i % 3) * 10, pos.y + Math.floor(i / 3) * 12);
            }
        }

        // Reset alpha after grace period flashing
        this.ctx.globalAlpha = 1;
    },

    // Small banana icon
    drawMiniBanana(screenX, screenY) {
        const grad = this.ctx.createLinearGradient(screenX, screenY, screenX + 8, screenY + 12);
        grad.addColorStop(0, this.colors.bananaLight);
        grad.addColorStop(1, this.colors.bananaShadow);
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.roundRect(screenX, screenY, 7, 11, 3);
        this.ctx.fill();
    },

    // Draw a banana tree
    drawBananaTree(tree, time) {
        const pos = this.toScreen(tree.x, tree.y);

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(pos.x + 20, pos.y + 44, 16, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Trunk gradient
        const trunkGrad = this.ctx.createLinearGradient(pos.x + 14, pos.y, pos.x + 26, pos.y);
        trunkGrad.addColorStop(0, this.colors.trunk);
        trunkGrad.addColorStop(0.5, '#a07820');
        trunkGrad.addColorStop(1, this.colors.trunkDark);
        this.ctx.fillStyle = trunkGrad;
        this.ctx.fillRect(pos.x + 14, pos.y + 20, 12, 24);

        // Leaves gradient
        const leafGrad = this.ctx.createRadialGradient(pos.x + 20, pos.y + 12, 0, pos.x + 20, pos.y + 12, 24);
        leafGrad.addColorStop(0, this.colors.treeLight);
        leafGrad.addColorStop(0.6, this.colors.tree);
        leafGrad.addColorStop(1, this.colors.treeDark);
        this.ctx.fillStyle = leafGrad;

        // Main leaf cluster
        this.ctx.beginPath();
        this.ctx.ellipse(pos.x + 20, pos.y + 12, 18, 14, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Side leaves
        this.ctx.fillStyle = this.colors.tree;
        this.ctx.beginPath();
        this.ctx.ellipse(pos.x + 4, pos.y + 10, 8, 12, -0.3, 0, Math.PI * 2);
        this.ctx.ellipse(pos.x + 36, pos.y + 10, 8, 12, 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // Bananas on tree
        if (tree.hasBananas) {
            const sway = Math.sin(time / 400 + tree.x) * 2;

            // Banana bunch gradient
            const bananaGrad = this.ctx.createLinearGradient(0, pos.y + 14, 0, pos.y + 28);
            bananaGrad.addColorStop(0, this.colors.bananaLight);
            bananaGrad.addColorStop(1, this.colors.bananaShadow);
            this.ctx.fillStyle = bananaGrad;

            // Left bunch
            this.ctx.beginPath();
            this.ctx.roundRect(pos.x + 2 + sway, pos.y + 14, 8, 14, 3);
            this.ctx.fill();

            // Right bunch
            this.ctx.beginPath();
            this.ctx.roundRect(pos.x + 30 - sway, pos.y + 12, 8, 14, 3);
            this.ctx.fill();

            // Center bunch
            this.ctx.beginPath();
            this.ctx.roundRect(pos.x + 15, pos.y + 18 + sway * 0.5, 10, 12, 3);
            this.ctx.fill();
        }
    },

    // Draw farmer enemy
    drawFarmer(farmer, time) {
        const pos = this.toScreen(farmer.x, farmer.y);
        const walkBob = farmer.isChasing ? Math.sin(time / 80) * 4 : Math.sin(time / 300) * 1;

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
        this.ctx.beginPath();
        this.ctx.ellipse(pos.x + 16, pos.y + 40, 12, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Legs
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(pos.x + 8, pos.y + 28 + walkBob, 6, 12);
        this.ctx.fillRect(pos.x + 18, pos.y + 28 - walkBob, 6, 12);

        // Body gradient
        const bodyGrad = this.ctx.createLinearGradient(pos.x + 6, pos.y + 14, pos.x + 26, pos.y + 14);
        bodyGrad.addColorStop(0, this.colors.farmerShadow);
        bodyGrad.addColorStop(0.5, this.colors.farmer);
        bodyGrad.addColorStop(1, this.colors.farmerLight);
        this.ctx.fillStyle = bodyGrad;
        this.ctx.beginPath();
        this.ctx.roundRect(pos.x + 6, pos.y + 14, 20, 16, 3);
        this.ctx.fill();

        // Head
        const headGrad = this.ctx.createRadialGradient(pos.x + 16, pos.y + 10, 0, pos.x + 16, pos.y + 10, 8);
        headGrad.addColorStop(0, '#f8d7a8');
        headGrad.addColorStop(1, this.colors.farmerSkin);
        this.ctx.fillStyle = headGrad;
        this.ctx.beginPath();
        this.ctx.arc(pos.x + 16, pos.y + 10, 7, 0, Math.PI * 2);
        this.ctx.fill();

        // Hat
        const hatGrad = this.ctx.createLinearGradient(pos.x + 6, pos.y - 4, pos.x + 6, pos.y + 6);
        hatGrad.addColorStop(0, '#f7dc6f');
        hatGrad.addColorStop(1, '#d4ac0d');
        this.ctx.fillStyle = hatGrad;
        this.ctx.fillRect(pos.x + 4, pos.y, 24, 5);
        this.ctx.fillRect(pos.x + 8, pos.y - 6, 16, 8);

        // Eyes
        this.ctx.fillStyle = '#232931';
        if (farmer.isChasing) {
            // Angry eyebrows
            this.ctx.fillRect(pos.x + 10, pos.y + 6, 5, 2);
            this.ctx.fillRect(pos.x + 17, pos.y + 6, 5, 2);
        }
        this.ctx.beginPath();
        this.ctx.arc(pos.x + 13, pos.y + 10, 1.5, 0, Math.PI * 2);
        this.ctx.arc(pos.x + 19, pos.y + 10, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Stick
        const stickAngle = farmer.isChasing ? Math.sin(time / 80) * 0.4 : 0.3;
        this.ctx.save();
        this.ctx.translate(pos.x + 26, pos.y + 18);
        this.ctx.rotate(stickAngle);

        const stickGrad = this.ctx.createLinearGradient(0, 0, 4, 24);
        stickGrad.addColorStop(0, '#a07820');
        stickGrad.addColorStop(1, this.colors.trunkDark);
        this.ctx.fillStyle = stickGrad;
        this.ctx.fillRect(0, 0, 4, 24);
        this.ctx.restore();
    },

    // Draw leopard
    drawLeopard(leopard, time) {
        const pos = this.toScreen(leopard.x, leopard.y);
        const breathe = Math.sin(time / 500) * 1;

        // Cage (back) if caged
        if (leopard.isCaged) {
            this.ctx.fillStyle = this.colors.cageDark;
            for (let i = 0; i < 5; i++) {
                this.ctx.fillRect(pos.x - 12 + i * 16, pos.y - 10, 4, 58);
            }
        }

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
        this.ctx.beginPath();
        this.ctx.ellipse(pos.x + 20, pos.y + 40, 20, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Body gradient
        const bodyGrad = this.ctx.createLinearGradient(pos.x, pos.y + 10, pos.x, pos.y + 34);
        bodyGrad.addColorStop(0, this.colors.leopardLight);
        bodyGrad.addColorStop(0.6, this.colors.leopard);
        bodyGrad.addColorStop(1, '#c87f0a');
        this.ctx.fillStyle = bodyGrad;

        // Body
        this.ctx.beginPath();
        this.ctx.roundRect(pos.x - 2, pos.y + 12 + breathe, 44, 22, 8);
        this.ctx.fill();

        // Head
        this.ctx.beginPath();
        this.ctx.roundRect(pos.x + 26, pos.y + 4, 20, 18, 6);
        this.ctx.fill();

        // Ears
        this.ctx.fillStyle = this.colors.leopard;
        this.ctx.beginPath();
        this.ctx.ellipse(pos.x + 30, pos.y + 2, 4, 5, -0.3, 0, Math.PI * 2);
        this.ctx.ellipse(pos.x + 42, pos.y + 2, 4, 5, 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // Spots
        this.ctx.fillStyle = this.colors.leopardSpots;
        const spots = [
            { x: 6, y: 16 }, { x: 16, y: 14 }, { x: 12, y: 24 },
            { x: 24, y: 18 }, { x: 32, y: 22 }, { x: 8, y: 28 }
        ];
        for (const spot of spots) {
            this.ctx.beginPath();
            this.ctx.ellipse(pos.x + spot.x, pos.y + spot.y + breathe, 3, 4, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Tail
        const tailWag = Math.sin(time / 200) * 4;
        this.ctx.fillStyle = this.colors.leopard;
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x - 2, pos.y + 20);
        this.ctx.quadraticCurveTo(pos.x - 12, pos.y + 16 + tailWag, pos.x - 10, pos.y + 10 + tailWag);
        this.ctx.lineTo(pos.x - 6, pos.y + 10 + tailWag);
        this.ctx.quadraticCurveTo(pos.x - 8, pos.y + 18 + tailWag, pos.x + 2, pos.y + 22);
        this.ctx.fill();

        // Tail spots
        this.ctx.fillStyle = this.colors.leopardSpots;
        this.ctx.beginPath();
        this.ctx.arc(pos.x - 8, pos.y + 14 + tailWag, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.beginPath();
        this.ctx.ellipse(pos.x + 32, pos.y + 10, 3, 4, 0, 0, Math.PI * 2);
        this.ctx.ellipse(pos.x + 42, pos.y + 10, 3, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupils
        this.ctx.fillStyle = '#232931';
        this.ctx.beginPath();
        this.ctx.ellipse(pos.x + 33, pos.y + 10, 1.5, 2.5, 0, 0, Math.PI * 2);
        this.ctx.ellipse(pos.x + 43, pos.y + 10, 1.5, 2.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Eye shine
        this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this.ctx.beginPath();
        this.ctx.arc(pos.x + 31, pos.y + 8, 1, 0, Math.PI * 2);
        this.ctx.arc(pos.x + 41, pos.y + 8, 1, 0, Math.PI * 2);
        this.ctx.fill();

        // Legs
        this.ctx.fillStyle = this.colors.leopard;
        this.ctx.fillRect(pos.x + 4, pos.y + 30, 7, 10);
        this.ctx.fillRect(pos.x + 14, pos.y + 30, 7, 10);
        this.ctx.fillRect(pos.x + 24, pos.y + 30, 7, 10);
        this.ctx.fillRect(pos.x + 34, pos.y + 30, 7, 10);

        // Cage (front) if caged
        if (leopard.isCaged) {
            this.ctx.fillStyle = this.colors.cage;
            for (let i = 0; i < 5; i++) {
                this.ctx.fillRect(pos.x - 12 + i * 16, pos.y - 10, 4, 58);
            }
            this.ctx.fillRect(pos.x - 12, pos.y - 10, 66, 4);
            this.ctx.fillRect(pos.x - 12, pos.y + 44, 66, 4);
        }

        // Hunger indicator
        if (leopard.fedBananas < leopard.targetBananas) {
            const hunger = leopard.targetBananas - leopard.fedBananas;
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.beginPath();
            this.ctx.roundRect(pos.x - 5, pos.y - 26, 60, 18, 4);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Segoe UI, sans-serif';
            this.ctx.fillText(`Need: ${hunger} 🍌`, pos.x, pos.y - 12);
        }
    },

    // Draw the map tiles
    drawMap(level, time) {
        const startCol = Math.floor(this.camera.x / this.TILE_SIZE);
        const endCol = Math.ceil((this.camera.x + this.canvas.width) / this.TILE_SIZE);
        const startRow = Math.floor(this.camera.y / this.TILE_SIZE);
        const endRow = Math.ceil((this.camera.y + this.canvas.height) / this.TILE_SIZE);

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const tile = level.getTile(col, row);
                const x = col * this.TILE_SIZE;
                const y = row * this.TILE_SIZE;

                if (tile === 'water') {
                    this.drawWater(x, y, time);
                } else if (tile === 'grass') {
                    this.drawGrass(x, y);
                }
            }
        }
    },

    // Draw damage flash
    drawDamageFlash(alpha) {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
        );
        gradient.addColorStop(0, `rgba(231, 76, 60, 0)`);
        gradient.addColorStop(0.7, `rgba(231, 76, 60, ${alpha * 0.3})`);
        gradient.addColorStop(1, `rgba(231, 76, 60, ${alpha})`);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    // Draw eat effect
    drawEatEffect(x, y, progress) {
        const pos = this.toScreen(x, y);
        const size = 50 * (1 - progress);
        const alpha = 1 - progress;

        // Outer ring
        this.ctx.strokeStyle = `rgba(78, 204, 163, ${alpha})`;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(pos.x + 16, pos.y + 20, size, 0, Math.PI * 2);
        this.ctx.stroke();

        // Inner glow
        const gradient = this.ctx.createRadialGradient(
            pos.x + 16, pos.y + 20, 0,
            pos.x + 16, pos.y + 20, size
        );
        gradient.addColorStop(0, `rgba(78, 204, 163, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(78, 204, 163, 0)`);
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(pos.x + 16, pos.y + 20, size, 0, Math.PI * 2);
        this.ctx.fill();
    },

    // ============ PARTICLE SYSTEM ============

    // Spawn particles of a given type
    spawnParticles(worldX, worldY, type, count = 5) {
        for (let i = 0; i < count; i++) {
            const particle = {
                x: worldX,
                y: worldY,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                life: 1,
                maxLife: 1,
                type: type
            };

            // Customize by type
            switch (type) {
                case 'splash':
                    particle.vx = (Math.random() - 0.5) * 6;
                    particle.vy = -Math.random() * 5 - 2;
                    particle.maxLife = 0.5;
                    particle.life = 0.5;
                    particle.size = 3 + Math.random() * 3;
                    particle.color = this.colors.waterLight;
                    break;
                case 'dust':
                    particle.vx = (Math.random() - 0.5) * 2;
                    particle.vy = -Math.random() * 1;
                    particle.maxLife = 0.4;
                    particle.life = 0.4;
                    particle.size = 4 + Math.random() * 4;
                    particle.color = '#a07820';
                    break;
                case 'sparkle':
                    particle.vx = (Math.random() - 0.5) * 3;
                    particle.vy = -Math.random() * 4 - 1;
                    particle.maxLife = 0.6;
                    particle.life = 0.6;
                    particle.size = 3 + Math.random() * 2;
                    particle.color = this.colors.bananaLight;
                    break;
                case 'heart':
                    particle.vx = (Math.random() - 0.5) * 1;
                    particle.vy = -Math.random() * 2 - 1;
                    particle.maxLife = 1;
                    particle.life = 1;
                    particle.size = 8;
                    particle.color = '#e74c3c';
                    break;
                case 'poof':
                    particle.vx = (Math.random() - 0.5) * 3;
                    particle.vy = (Math.random() - 0.5) * 3;
                    particle.maxLife = 0.5;
                    particle.life = 0.5;
                    particle.size = 8 + Math.random() * 8;
                    particle.color = '#7f8c8d';
                    break;
            }

            this.particles.push(particle);
        }
    },

    // Update all particles
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // gravity
            p.life -= dt / 1000;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },

    // Draw all particles
    drawParticles() {
        for (const p of this.particles) {
            const pos = this.toScreen(p.x, p.y);
            const alpha = p.life / p.maxLife;

            this.ctx.globalAlpha = alpha;

            if (p.type === 'heart') {
                // Draw heart shape
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                const size = p.size * alpha;
                this.ctx.moveTo(pos.x, pos.y + size * 0.3);
                this.ctx.bezierCurveTo(pos.x, pos.y, pos.x - size, pos.y, pos.x - size, pos.y + size * 0.3);
                this.ctx.bezierCurveTo(pos.x - size, pos.y + size * 0.6, pos.x, pos.y + size, pos.x, pos.y + size);
                this.ctx.bezierCurveTo(pos.x, pos.y + size, pos.x + size, pos.y + size * 0.6, pos.x + size, pos.y + size * 0.3);
                this.ctx.bezierCurveTo(pos.x + size, pos.y, pos.x, pos.y, pos.x, pos.y + size * 0.3);
                this.ctx.fill();
            } else if (p.type === 'sparkle') {
                // Draw star/sparkle
                this.ctx.fillStyle = p.color;
                const size = p.size * alpha;
                this.ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    const x = pos.x + Math.cos(angle) * size;
                    const y = pos.y + Math.sin(angle) * size;
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                    const midAngle = angle + Math.PI / 4;
                    const midX = pos.x + Math.cos(midAngle) * size * 0.4;
                    const midY = pos.y + Math.sin(midAngle) * size * 0.4;
                    this.ctx.lineTo(midX, midY);
                }
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                // Draw circle for other particles
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, p.size * alpha, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.globalAlpha = 1;
        }
    },

    // ============ SCREEN SHAKE ============

    startShake(intensity, duration) {
        this.shake.intensity = intensity;
        this.shake.duration = duration;
    },

    updateShake(dt) {
        if (this.shake.duration > 0) {
            this.shake.duration -= dt;
            this.shake.x = (Math.random() - 0.5) * this.shake.intensity * 2;
            this.shake.y = (Math.random() - 0.5) * this.shake.intensity * 2;
        } else {
            this.shake.x = 0;
            this.shake.y = 0;
        }
    },

    applyShake() {
        if (this.shake.duration > 0) {
            this.ctx.translate(this.shake.x, this.shake.y);
        }
    },

    resetShake() {
        if (this.shake.duration > 0) {
            this.ctx.translate(-this.shake.x, -this.shake.y);
        }
    },

    // ============ FLOATING TEXT ============

    addFloatingText(worldX, worldY, text, color = '#fff') {
        this.floatingTexts.push({
            x: worldX,
            y: worldY,
            text: text,
            color: color,
            life: 1,
            maxLife: 1
        });
    },

    updateFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 1; // Float upward
            ft.life -= dt / 1000;

            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    },

    drawFloatingTexts() {
        for (const ft of this.floatingTexts) {
            const pos = this.toScreen(ft.x, ft.y);
            const alpha = ft.life / ft.maxLife;

            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = ft.color;
            this.ctx.font = 'bold 16px Segoe UI, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.text, pos.x, pos.y);
            this.ctx.globalAlpha = 1;
        }
    },

    // ============ VIGNETTE EFFECT ============

    drawVignette() {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.3,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    // ============ GLOW EFFECT ============

    drawGlow(worldX, worldY, radius, color, alpha = 0.3) {
        const pos = this.toScreen(worldX, worldY);
        const gradient = this.ctx.createRadialGradient(
            pos.x, pos.y, 0,
            pos.x, pos.y, radius
        );
        gradient.addColorStop(0, color.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    },

    // Draw glow around banana trees with bananas
    drawBananaGlow(tree) {
        if (!tree.hasBananas) return;
        const pos = this.toScreen(tree.x + 20, tree.y + 20);

        this.ctx.globalAlpha = 0.15 + Math.sin(Date.now() / 500) * 0.05;
        const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 40);
        gradient.addColorStop(0, 'rgba(241, 196, 15, 0.4)');
        gradient.addColorStop(1, 'rgba(241, 196, 15, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
};
