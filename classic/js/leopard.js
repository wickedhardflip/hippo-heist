// Leopard for Hippo Heist
const Leopard = {
    x: 0,
    y: 0,
    width: 48,
    height: 44,

    // State
    isCaged: false,
    isStationary: false,
    isRoaming: false,
    isHunter: false, // Level 4 - can eat farmers

    // Feeding
    fedBananas: 0,
    targetBananas: 10,

    // Simple roaming - bounce within boundaries
    roamSpeed: 1.2,
    roamDirX: 1,
    roamDirY: 0.5,
    dirChangeTimer: 0,

    // Farmer avoidance radius
    avoidanceRadius: 120,

    // Lunge mechanic for hunter mode
    lungeSpeed: 4.5,
    lungeRange: 150,
    isLunging: false,
    lungeTarget: null,
    lungeCooldown: 0,

    init(x, y, type, targetBananas) {
        this.x = x;
        this.y = y;
        this.fedBananas = 0;
        this.targetBananas = targetBananas;

        this.isCaged = (type === 'caged');
        this.isStationary = (type === 'stationary');
        this.isRoaming = (type === 'roaming');
        this.isHunter = (type === 'hunter');

        // Random initial direction
        if (this.isRoaming || this.isHunter) {
            this.roamDirX = Math.random() > 0.5 ? 1 : -1;
            this.roamDirY = Math.random() > 0.5 ? 0.6 : -0.6;
            this.dirChangeTimer = 2000 + Math.random() * 2000;
        }

        // Reset lunge state
        this.isLunging = false;
        this.lungeTarget = null;
        this.lungeCooldown = 0;
    },

    update(dt, level, farmers) {
        if (!this.isRoaming && !this.isHunter) return;

        // Update lunge cooldown
        if (this.lungeCooldown > 0) this.lungeCooldown -= dt;

        let speed = this.roamSpeed;

        // Hunter mode: look for farmers to lunge at
        if (this.isHunter && farmers && this.lungeCooldown <= 0) {
            const aliveFarmers = farmers.getAlive();
            let closestFarmer = null;
            let closestDist = this.lungeRange;

            for (const farmer of aliveFarmers) {
                const dist = this.distanceToPoint(farmer.x + 16, farmer.y + 20);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestFarmer = farmer;
                }
            }

            if (closestFarmer) {
                // Lunge towards the farmer!
                this.isLunging = true;
                this.lungeTarget = closestFarmer;
                const dx = (closestFarmer.x + 16) - this.getCenterX();
                const dy = (closestFarmer.y + 20) - this.getCenterY();
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                    this.roamDirX = dx / len;
                    this.roamDirY = dy / len;
                }
                speed = this.lungeSpeed;
            } else {
                this.isLunging = false;
                this.lungeTarget = null;
            }
        }

        // Simple bounce movement within grass boundaries
        const newX = this.x + this.roamDirX * speed;
        const newY = this.y + this.roamDirY * speed;

        // Check if can move horizontally
        if (this.canMoveTo(newX, this.y, level)) {
            this.x = newX;
        } else {
            this.roamDirX *= -1; // Bounce
            this.lungeCooldown = 500; // Brief cooldown after hitting wall
        }

        // Check if can move vertically
        if (this.canMoveTo(this.x, newY, level)) {
            this.y = newY;
        } else {
            this.roamDirY *= -1; // Bounce
            this.lungeCooldown = 500;
        }

        // Occasionally change direction for variety (only when not lunging)
        if (!this.isLunging) {
            this.dirChangeTimer -= dt;
            if (this.dirChangeTimer <= 0) {
                this.roamDirX = (Math.random() - 0.5) * 2;
                this.roamDirY = (Math.random() - 0.5) * 1.5;
                // Normalize
                const len = Math.sqrt(this.roamDirX * this.roamDirX + this.roamDirY * this.roamDirY);
                if (len > 0) {
                    this.roamDirX /= len;
                    this.roamDirY /= len;
                }
                this.dirChangeTimer = 2000 + Math.random() * 3000;
            }
        }
    },

    canMoveTo(x, y, level) {
        const padding = 10;
        const points = [
            { x: x + this.width / 2, y: y + this.height / 2 },
            { x: x + padding, y: y + padding },
            { x: x + this.width - padding, y: y + padding },
            { x: x + padding, y: y + this.height - padding },
            { x: x + this.width - padding, y: y + this.height - padding }
        ];

        for (const point of points) {
            const tile = level.getTileAtPixel(point.x, point.y);
            if (tile !== 'grass') return false;
        }
        return true;
    },

    // Get center position for distance calculations
    getCenterX() { return this.x + this.width / 2; },
    getCenterY() { return this.y + this.height / 2; },

    distanceToPoint(x, y) {
        const dx = x - this.getCenterX();
        const dy = y - this.getCenterY();
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Check if a farmer is close enough to eat (Level 4)
    canEatFarmer(farmer) {
        if (!this.isHunter) return false;
        const dist = this.distanceToPoint(farmer.x + 16, farmer.y + 20);
        return dist < 50;
    },

    feed(amount) {
        this.fedBananas += amount;
        if (this.isCaged && this.fedBananas >= this.targetBananas) {
            this.isCaged = false;
        }
        return this.fedBananas >= this.targetBananas;
    },

    isComplete() {
        return this.fedBananas >= this.targetBananas;
    },

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
};
