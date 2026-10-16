// Farmer enemy AI for Hippo Heist
class Farmer {
    constructor(x, y, patrolPoints) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 42;
        this.speed = 1.5;
        this.chaseSpeed = 2.5;

        // Patrol behavior
        this.patrolPoints = patrolPoints || [{ x, y }];
        this.currentPatrolIndex = 0;
        this.waitTime = 0;
        this.waitDuration = 1000;

        // Chase behavior
        this.isChasing = false;
        this.sightRange = 150;
        this.loseRange = 250;
        this.lastSeenX = 0;
        this.lastSeenY = 0;

        // Combat
        this.attackCooldown = 0;
        this.attackRange = 35;

        // State
        this.isAlive = true;
        this.isBeingEaten = false;
        this.eatProgress = 0;

        // Respawn
        this.respawnTimer = 0;
        this.respawnDelay = 5000; // 5 seconds

        // Delayed leopard awareness (for hunter leopard)
        this.leopardAwarenessTimer = 0;
        this.leopardAwarenessDelay = 400; // 0.4 seconds to notice leopard
    }

    update(dt, player, level, isGracePeriod = false) {
        // Handle respawn timer
        if (!this.isAlive) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.respawn(level);
            }
            return;
        }

        if (this.isBeingEaten) {
            this.eatProgress += dt / 500; // 500ms to eat
            if (this.eatProgress >= 1) {
                this.isAlive = false;
                this.respawnTimer = this.respawnDelay;
            }
            return;
        }

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        // Check distance to leopard - farmers fear the leopard!
        const distToLeopard = this.distanceToPoint(Leopard.getCenterX(), Leopard.getCenterY());

        // Delayed leopard awareness - takes time to notice the leopard
        let fleeingFromLeopard = false;
        if (distToLeopard < Leopard.avoidanceRadius && !Leopard.isCaged) {
            this.leopardAwarenessTimer += dt;
            if (this.leopardAwarenessTimer >= this.leopardAwarenessDelay) {
                fleeingFromLeopard = true;
            }
        } else {
            this.leopardAwarenessTimer = 0; // Reset if leopard is far
        }

        // During grace period, just patrol - don't chase or attack
        if (isGracePeriod) {
            this.isChasing = false;
            this.patrol(dt, level);
            return;
        }

        // Check if player is visible (not submerged)
        const canSeePlayer = !player.isSubmerged;
        const distToPlayer = this.distanceTo(player);

        // Chase logic (but not if fleeing from leopard)
        if (!fleeingFromLeopard && canSeePlayer && distToPlayer < this.sightRange) {
            this.isChasing = true;
            this.lastSeenX = player.x;
            this.lastSeenY = player.y;
        } else if (this.isChasing && (distToPlayer > this.loseRange || fleeingFromLeopard)) {
            this.isChasing = false;
        }

        // Movement
        if (fleeingFromLeopard) {
            // Run away from leopard!
            this.fleeFrom(Leopard.getCenterX(), Leopard.getCenterY(), this.chaseSpeed, level);
        } else if (this.isChasing && canSeePlayer) {
            // Chase the player
            this.moveToward(player.x, player.y, this.chaseSpeed, level);

            // Attack if close enough
            if (distToPlayer < this.attackRange && this.attackCooldown <= 0) {
                this.attack(player);
            }
        } else {
            // Patrol
            this.patrol(dt, level);
        }
    }

    fleeFrom(x, y, speed, level) {
        const dx = this.x - x;
        const dy = this.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            const moveX = (dx / dist) * speed;
            const moveY = (dy / dist) * speed;

            const newX = this.x + moveX;
            const newY = this.y + moveY;

            if (this.canMoveTo(newX, this.y, level)) {
                this.x = newX;
            }
            if (this.canMoveTo(this.x, newY, level)) {
                this.y = newY;
            }
        }
    }

    respawn(level) {
        // Find a random grass position away from player
        const pos = this.findRespawnPosition(level);
        this.x = pos.x;
        this.y = pos.y;
        this.isAlive = true;
        this.isBeingEaten = false;
        this.eatProgress = 0;
        this.isChasing = false;
        this.currentPatrolIndex = 0;

        // Create new patrol points around spawn location
        this.patrolPoints = [
            { x: pos.x, y: pos.y },
            { x: pos.x + 100, y: pos.y },
            { x: pos.x + 100, y: pos.y + 80 },
            { x: pos.x, y: pos.y + 80 }
        ];
    }

    findRespawnPosition(level) {
        // Try to find a grass tile away from player
        for (let attempts = 0; attempts < 50; attempts++) {
            const x = Math.random() * (level.width - 100) + 50;
            const y = Math.random() * (level.height - 100) + 50;

            const tile = level.getTileAtPixel(x, y);
            if (tile === 'grass') {
                // Check distance from player
                const distToPlayer = Math.sqrt(
                    Math.pow(x - Player.x, 2) + Math.pow(y - Player.y, 2)
                );
                if (distToPlayer > 200) {
                    return { x, y };
                }
            }
        }
        // Fallback to start position
        return { x: this.startX, y: this.startY };
    }

    moveToward(targetX, targetY, speed, level) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            const moveX = (dx / dist) * speed;
            const moveY = (dy / dist) * speed;

            // Check if can move (don't walk into water)
            const newX = this.x + moveX;
            const newY = this.y + moveY;

            if (this.canMoveTo(newX, this.y, level)) {
                this.x = newX;
            }
            if (this.canMoveTo(this.x, newY, level)) {
                this.y = newY;
            }
        }
    }

    canMoveTo(x, y, level) {
        const centerX = x + this.width / 2;
        const centerY = y + this.height / 2;
        const tile = level.getTileAtPixel(centerX, centerY);
        // Farmers avoid water
        return tile === 'grass';
    }

    patrol(dt, level) {
        if (this.waitTime > 0) {
            this.waitTime -= dt;
            return;
        }

        const target = this.patrolPoints[this.currentPatrolIndex];
        const dist = this.distanceToPoint(target.x, target.y);

        if (dist < 5) {
            // Reached patrol point, wait then move to next
            this.waitTime = this.waitDuration;
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        } else {
            this.moveToward(target.x, target.y, this.speed, level);
        }
    }

    attack(player) {
        if (player.takeDamage()) {
            this.attackCooldown = 1000; // 1 second between attacks
            return true;
        }
        return false;
    }

    distanceTo(obj) {
        return this.distanceToPoint(obj.x + (obj.width || 0) / 2, obj.y + (obj.height || 0) / 2);
    }

    distanceToPoint(x, y) {
        const dx = x - (this.x + this.width / 2);
        const dy = y - (this.y + this.height / 2);
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Check if farmer is near water (can be eaten)
    isNearWater(level) {
        const checkPoints = [
            { x: this.x - 20, y: this.y + this.height / 2 },
            { x: this.x + this.width + 20, y: this.y + this.height / 2 },
            { x: this.x + this.width / 2, y: this.y - 20 },
            { x: this.x + this.width / 2, y: this.y + this.height + 20 }
        ];

        for (const point of checkPoints) {
            const tile = level.getTileAtPixel(point.x, point.y);
            if (tile === 'water') {
                return true;
            }
        }
        return false;
    }

    startBeingEaten() {
        this.isBeingEaten = true;
        this.eatProgress = 0;
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

// Farmer manager
const Farmers = {
    list: [],

    init() {
        this.list = [];
    },

    add(x, y, patrolPoints) {
        this.list.push(new Farmer(x, y, patrolPoints));
    },

    update(dt, player, level, isGracePeriod = false) {
        for (const farmer of this.list) {
            farmer.update(dt, player, level, isGracePeriod);
        }
    },

    getAlive() {
        return this.list.filter(f => f.isAlive && !f.isBeingEaten);
    },

    // Get all farmers for rendering (including being eaten)
    getVisible() {
        return this.list.filter(f => f.isAlive);
    },

    // Check if any farmer can be eaten by player
    checkEatable(player, level) {
        if (!player.isSubmerged || !player.canAct()) return null;

        for (const farmer of this.list) {
            if (!farmer.isAlive || farmer.isBeingEaten) continue;

            const dist = Math.sqrt(
                Math.pow(player.x - farmer.x, 2) +
                Math.pow(player.y - farmer.y, 2)
            );

            if (dist < 60 && farmer.isNearWater(level)) {
                return farmer;
            }
        }
        return null;
    }
};
