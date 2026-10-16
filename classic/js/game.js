// Main game controller for Hippo Heist
const Game = {
    state: 'title',
    lastTime: 0,
    damageFlash: 0,
    eatEffect: null,
    levelTime: 60000,
    timeRemaining: 60000,
    stats: { totalBananas: 0, totalFarmers: 0, levelTimes: [] },
    levelStartTime: 0,
    wasInWater: false,
    dustCooldown: 0,

    // Grace period - invincibility at level start
    gracePeriod: 2500,  // 2.5 seconds
    graceTimer: 0,

    init() {
        Render.init('gameCanvas');
        Input.init();
        Audio.init();

        // UI event listeners with sounds
        document.getElementById('start-btn').addEventListener('click', () => { Audio.playClick(); this.startGame(); });
        document.getElementById('rules-btn').addEventListener('click', () => { Audio.playClick(); this.showRules(); });
        document.getElementById('rules-back-btn').addEventListener('click', () => { Audio.playClick(); this.showTitle(); });
        document.getElementById('start-level-btn').addEventListener('click', () => { Audio.playClick(); this.startLevel(); });
        document.getElementById('next-level-btn').addEventListener('click', () => { Audio.playClick(); this.nextLevel(); });
        document.getElementById('retry-btn').addEventListener('click', () => { Audio.playClick(); this.retryLevel(); });
        document.getElementById('retry-time-btn').addEventListener('click', () => { Audio.playClick(); this.retryLevel(); });
        document.getElementById('menu-btn').addEventListener('click', () => { Audio.playClick(); this.showTitle(); });
        document.getElementById('menu-time-btn').addEventListener('click', () => { Audio.playClick(); this.showTitle(); });
        document.getElementById('play-again-btn').addEventListener('click', () => { Audio.playClick(); this.showTitle(); });

        // Mute button
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const muted = Audio.toggleMute();
                muteBtn.textContent = muted ? '🔇' : '🔊';
            });
        }

        // Debug level skip
        window.addEventListener('keydown', (e) => {
            if (this.state === 'title') {
                if (e.key === '1') { Level.load(1); this.showLevelIntro(); }
                if (e.key === '2') { Level.load(2); this.showLevelIntro(); }
                if (e.key === '3') { Level.load(3); this.showLevelIntro(); }
                if (e.key === '4') { Level.load(4); this.showLevelIntro(); }
            }
        });

        this.showTitle();
        requestAnimationFrame((time) => this.loop(time));
    },

    showTitle() {
        this.state = 'title';
        this.stats = { totalBananas: 0, totalFarmers: 0, levelTimes: [] };
        Audio.stopMusic();
        this.showScreen('title-screen');
    },

    showRules() {
        this.state = 'rules';
        this.showScreen('rules-screen');
    },

    startGame() {
        Level.load(1);
        this.showLevelIntro();
    },

    showLevelIntro() {
        this.state = 'levelIntro';
        const lvl = Level.levels[Level.currentLevel];
        document.getElementById('intro-level-title').textContent = `Level ${Level.currentLevel}`;
        document.getElementById('intro-level-name').textContent = lvl.name;

        let objectives = `<div class="objective-item"><span class="objective-icon">🍌</span> Feed ${lvl.bananasToFeed} bananas to the leopard</div>`;
        if (lvl.farmersToEat > 0) {
            objectives += `<div class="objective-item"><span class="objective-icon">👨‍🌾</span> Eat ${lvl.farmersToEat} farmers near water</div>`;
        }
        if (lvl.leopardType === 'caged') {
            objectives += `<div class="objective-item"><span class="objective-icon">🐆</span> The leopard is caged - rescue it!</div>`;
        } else if (lvl.leopardType === 'stationary') {
            objectives += `<div class="objective-item"><span class="objective-icon">🐆</span> Find the leopard - it's hiding somewhere!</div>`;
        } else if (lvl.leopardType === 'roaming') {
            objectives += `<div class="objective-item"><span class="objective-icon">🐆</span> Chase the roaming leopard!</div>`;
        } else if (lvl.leopardType === 'hunter') {
            objectives += `<div class="objective-item"><span class="objective-icon">🐆</span> The leopard hunts farmers! Lure them close!</div>`;
        }
        objectives += `<div class="objective-item"><span class="objective-icon">⚠️</span> Watch out for ${lvl.farmerCount} farmers!</div>`;
        document.getElementById('intro-objectives').innerHTML = objectives;
        this.showScreen('level-intro');
    },

    startLevel() {
        this.state = 'playing';
        // Check for level-specific timer (Level 4 = 90 seconds)
        const lvl = Level.levels[Level.currentLevel];
        this.levelTime = lvl.levelTime || 60000;
        this.timeRemaining = this.levelTime;
        this.levelStartTime = performance.now();
        this.wasInWater = false;
        this.graceTimer = this.gracePeriod; // Start grace period
        this.hideAllScreens();
        this.updateHUD();
        document.getElementById('hud').classList.remove('hidden');
        Audio.startMusic();
    },

    isGracePeriod() {
        return this.graceTimer > 0;
    },

    nextLevel() {
        if (Level.currentLevel + 1 > 4) {
            this.showVictory();
        } else {
            Level.load(Level.currentLevel + 1);
            this.showLevelIntro();
        }
    },

    retryLevel() {
        Level.load(Level.currentLevel);
        this.showLevelIntro();
    },

    showScreen(screenId) {
        this.hideAllScreens();
        document.getElementById(screenId).classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
    },

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    },

    showLevelComplete() {
        this.state = 'levelComplete';
        Audio.stopMusic();
        Audio.playLevelComplete();
        const timeUsed = ((this.levelTime - this.timeRemaining) / 1000).toFixed(1);
        this.stats.levelTimes.push(parseFloat(timeUsed));
        this.stats.totalBananas += Leopard.fedBananas;
        this.stats.totalFarmers += Level.farmersEaten;
        document.getElementById('level-stats').innerHTML = `Bananas Fed: ${Leopard.fedBananas}<br>Farmers Eaten: ${Level.farmersEaten}<br>Time: ${timeUsed}s`;
        this.showScreen('level-complete');
    },

    showTimesUp() {
        this.state = 'timesUp';
        Audio.stopMusic();
        Audio.playGameOver();
        this.showScreen('times-up');
    },

    showGameOver() {
        this.state = 'gameOver';
        Audio.stopMusic();
        Audio.playGameOver();
        this.showScreen('game-over');
    },

    showVictory() {
        this.state = 'victory';
        Audio.stopMusic();
        Audio.playLevelComplete();
        const totalTime = this.stats.levelTimes.reduce((a, b) => a + b, 0).toFixed(1);
        document.getElementById('final-stats').innerHTML = `Total Bananas Fed: ${this.stats.totalBananas}<br>Total Farmers Eaten: ${this.stats.totalFarmers}<br>Total Time: ${totalTime}s<br><br>The leopard is free and well-fed!`;
        this.showScreen('victory');
    },

    updateHUD() {
        const healthDiv = document.getElementById('health-display');
        let hearts = '';
        for (let i = 0; i < Player.maxHealth; i++) {
            const pulseClass = (Player.health <= 2 && i < Player.health) ? ' pulse' : '';
            hearts += `<div class="heart${i < Player.health ? pulseClass : ' empty'}"></div>`;
        }
        healthDiv.innerHTML = hearts;

        document.getElementById('banana-count').textContent = `Bananas: ${Player.bananas}/${Player.maxBananas}`;

        const seconds = Math.ceil(this.timeRemaining / 1000);
        const timerDisplay = document.getElementById('timer-display');
        timerDisplay.textContent = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
        timerDisplay.classList.toggle('warning', seconds <= 10);

        document.getElementById('level-name').textContent = `Level ${Level.currentLevel}: ${Level.getName()}`;
        document.getElementById('level-progress').textContent = `Fed: ${Leopard.fedBananas}/${Level.bananasToFeed}`;

        const farmerCountDiv = document.getElementById('farmer-count');
        if (Level.farmersToEat > 0) {
            farmerCountDiv.classList.remove('hidden');
            farmerCountDiv.textContent = `Farmers eaten: ${Level.farmersEaten}/${Level.farmersToEat}`;
        } else {
            farmerCountDiv.classList.add('hidden');
        }
    },

    loop(time) {
        const dt = Math.min(time - this.lastTime, 50);
        this.lastTime = time;

        if (this.state === 'playing') this.update(dt, time);
        this.render(time);
        requestAnimationFrame((t) => this.loop(t));
    },

    update(dt, time) {
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) { this.showTimesUp(); return; }

        // Update grace period timer
        if (this.graceTimer > 0) {
            this.graceTimer -= dt;
        }

        Input.update();
        const prevHealth = Player.health;
        const prevInWater = Player.isSubmerged;

        Player.update(dt, Level);
        Render.updateCamera(Player, Level.width, Level.height);
        Leopard.update(dt, Level, Farmers);
        Farmers.update(dt, Player, Level, this.isGracePeriod());

        // Level 4: Hunter leopard eats farmers
        if (Leopard.isHunter) {
            for (const farmer of Farmers.getAlive()) {
                if (Leopard.canEatFarmer(farmer)) {
                    farmer.startBeingEaten();
                    Audio.playEat();
                    Render.startShake(10, 250);
                    Render.spawnParticles(farmer.x + 16, farmer.y + 20, 'poof', 12);
                    Render.addFloatingText(Leopard.getCenterX(), Leopard.y - 10, 'CHOMP!', '#f39c12');
                }
            }
        }

        // Splash effects
        if (Player.isSubmerged !== prevInWater) {
            Audio.playSplash();
            Render.spawnParticles(Player.x + 20, Player.y + 20, 'splash', 8);
        }

        // Dust particles when moving
        if (!Player.isSubmerged && (Input.keys.w || Input.keys.a || Input.keys.s || Input.keys.d)) {
            this.dustCooldown -= dt;
            if (this.dustCooldown <= 0) {
                Render.spawnParticles(Player.x + 20, Player.y + 35, 'dust', 2);
                this.dustCooldown = 200;
            }
        }

        // Damage effects
        if (this.damageFlash > 0) this.damageFlash -= dt / 200;
        if (Player.health < prevHealth) {
            this.damageFlash = 1;
            Audio.playHurt();
            Render.startShake(8, 200);
        }

        if (this.eatEffect) {
            this.eatEffect.progress += dt / 500;
            if (this.eatEffect.progress >= 1) this.eatEffect = null;
        }

        if (Input.actionJustPressed && Player.canAct()) this.handleAction();

        if (Player.health <= 0) this.showGameOver();
        if (Level.isComplete()) this.showLevelComplete();

        Render.updateParticles(dt);
        Render.updateFloatingTexts(dt);
        Render.updateShake(dt);
        this.updateHUD();
    },

    handleAction() {
        if (Player.isSubmerged) {
            const farmer = Farmers.checkEatable(Player, Level);
            if (farmer) {
                farmer.startBeingEaten();
                Player.heal(1);
                Level.farmersEaten++;
                Player.doAction();
                Audio.playEat();
                Render.startShake(6, 150);
                Render.spawnParticles(farmer.x + 16, farmer.y + 20, 'poof', 10);
                Render.addFloatingText(farmer.x + 16, farmer.y, '+1 ❤️', '#e74c3c');
                this.eatEffect = { x: farmer.x, y: farmer.y, progress: 0 };
                return;
            }
        }

        if (Player.bananas > 0 && Player.isNear(Leopard, 60)) {
            const fed = Player.feedLeopard();
            if (fed > 0) {
                Leopard.feed(fed);
                Player.doAction();
                Audio.playFeed();
                Render.spawnParticles(Leopard.x + 24, Leopard.y + 10, 'heart', 5);
                Render.addFloatingText(Leopard.x + 24, Leopard.y - 10, `+${fed} 🍌`, '#f1c40f');
                return;
            }
        }

        const tree = Level.getTreeNear(Player);
        if (tree && tree.hasBananas && Player.bananas < Player.maxBananas) {
            Player.collectBanana();
            tree.hasBananas = false;
            Player.doAction();
            Audio.playPickup();
            Render.spawnParticles(tree.x + 20, tree.y + 20, 'sparkle', 8);
            return;
        }
    },

    render(time) {
        Render.clear();

        if (this.state === 'playing' || this.state === 'paused') {
            Render.applyShake();
            Render.drawMap(Level, time);

            for (const tree of Level.trees) Render.drawBananaGlow(tree);
            for (const tree of Level.trees) Render.drawBananaTree(tree, time);

            Render.drawLeopard(Leopard, time);
            for (const farmer of Farmers.getVisible()) Render.drawFarmer(farmer, time);
            Render.drawHippo(Player, time, this.isGracePeriod());

            Render.drawParticles();
            Render.drawFloatingTexts();

            if (this.damageFlash > 0) Render.drawDamageFlash(this.damageFlash * 0.3);
            if (this.eatEffect) Render.drawEatEffect(this.eatEffect.x, this.eatEffect.y, this.eatEffect.progress);

            Render.drawVignette();
            Render.resetShake();
        }
    }
};

window.addEventListener('load', () => Game.init());
