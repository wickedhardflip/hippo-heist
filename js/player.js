// Hippo player for Hippo Heist
const Player = {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    speed: 3,
    health: 5,
    maxHealth: 5,
    bananas: 0,
    maxBananas: 5,
    isSubmerged: false,
    facingX: 0,
    facingY: 1,

    // Invincibility after taking damage
    invincibleTime: 0,
    invincibleDuration: 1000,

    // Action cooldown
    actionCooldown: 0,

    init(x, y) {
        this.x = x;
        this.y = y;
        this.health = this.maxHealth;
        this.bananas = 0;
        this.isSubmerged = false;
        this.invincibleTime = 0;
        this.facingX = 0;
        this.facingY = 1;
    },

    update(dt, level) {
        // Update invincibility
        if (this.invincibleTime > 0) {
            this.invincibleTime -= dt;
        }

        // Update action cooldown
        if (this.actionCooldown > 0) {
            this.actionCooldown -= dt;
        }

        // Handle movement
        let dx = 0;
        let dy = 0;

        if (Input.up) dy -= 1;
        if (Input.down) dy += 1;
        if (Input.left) dx -= 1;
        if (Input.right) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        // Update facing direction
        if (dx !== 0 || dy !== 0) {
            this.facingX = dx;
            this.facingY = dy;
        }

        // Apply movement
        const newX = this.x + dx * this.speed;
        const newY = this.y + dy * this.speed;

        // Check collision with map bounds
        if (this.canMoveTo(newX, this.y, level)) {
            this.x = newX;
        }
        if (this.canMoveTo(this.x, newY, level)) {
            this.y = newY;
        }

        // Check if in water
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const tile = level.getTileAtPixel(centerX, centerY);
        this.isSubmerged = (tile === 'water');

        return { dx, dy };
    },

    canMoveTo(x, y, level) {
        // Check all four corners of the hitbox
        const padding = 4;
        const corners = [
            { x: x + padding, y: y + padding },
            { x: x + this.width - padding, y: y + padding },
            { x: x + padding, y: y + this.height - padding },
            { x: x + this.width - padding, y: y + this.height - padding }
        ];

        for (const corner of corners) {
            const tile = level.getTileAtPixel(corner.x, corner.y);
            if (tile === 'blocked' || tile === null) {
                return false;
            }
        }
        return true;
    },

    takeDamage() {
        if (this.invincibleTime > 0 || this.isSubmerged) return false;

        this.health--;
        this.invincibleTime = this.invincibleDuration;
        return true;
    },

    heal(amount = 1) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    },

    collectBanana() {
        if (this.bananas < this.maxBananas) {
            this.bananas++;
            return true;
        }
        return false;
    },

    feedLeopard() {
        if (this.bananas > 0) {
            const fed = this.bananas;
            this.bananas = 0;
            this.heal(1);
            return fed;
        }
        return 0;
    },

    canAct() {
        return this.actionCooldown <= 0;
    },

    doAction() {
        this.actionCooldown = 300; // 300ms cooldown
    },

    // Get bounding box for collision
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    },

    // Check if near something
    isNear(obj, distance = 50) {
        const dx = (this.x + this.width / 2) - (obj.x + (obj.width || 40) / 2);
        const dy = (this.y + this.height / 2) - (obj.y + (obj.height || 40) / 2);
        return Math.sqrt(dx * dx + dy * dy) < distance;
    }
};
