// Level management for Hippo Heist
const Level = {
    currentLevel: 1,
    map: [],
    width: 0,
    height: 0,
    tileSize: 32,

    // Banana trees
    trees: [],

    // Level objectives
    bananasToFeed: 0,
    farmersToEat: 0,
    farmersEaten: 0,

    // Level definitions
    levels: {
        1: {
            name: "The Rescue",
            width: 25,
            height: 19,
            bananasToFeed: 8,
            farmersToEat: 0,
            farmerCount: 2,
            leopardType: 'caged',
            // Map: W = water, G = grass
            layout: [
                "WWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWGGGGGGGGGGGGGWWWWWW",
                "WWWWWWGGGGGGGGGGGGGWWWWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWGGGGGGGGGGGGGWWWWWW",
                "WWWWWWGGGGGGGGGGGGGWWWWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWW"
            ],
            playerStart: { x: 100, y: 280 },
            leopardPos: { x: 620, y: 280 },
            treePositions: [
                { x: 120, y: 100 }, { x: 280, y: 90 }, { x: 450, y: 100 },
                { x: 200, y: 260 }, { x: 400, y: 280 },
                { x: 150, y: 340 }, { x: 320, y: 360 }, { x: 480, y: 340 },
                { x: 240, y: 460 }, { x: 420, y: 450 }
            ],
            farmerPatrols: [
                [{ x: 250, y: 150 }, { x: 420, y: 150 }, { x: 420, y: 280 }, { x: 250, y: 280 }],
                [{ x: 280, y: 360 }, { x: 450, y: 360 }, { x: 450, y: 460 }, { x: 280, y: 460 }]
            ]
        },
        2: {
            name: "Trust Earned",
            width: 35,
            height: 25,
            bananasToFeed: 12,
            farmersToEat: 0,
            farmerCount: 4,
            leopardType: 'stationary',
            layout: [
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWW",
                "WWWWWWWWGGGGGGGGGGGGGGGGGGWWWWWWWWW",
                "WWWWWWWWGGGGGGGGGGGGGGGGGGWWWWWWWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWWWWWWGGGGGGGGGGGGGGGGGGGGWWWWWWWW",
                "WWWWWWWGGGGGGGGGGGGGGGGGGGGWWWWWWWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGGWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
            ],
            playerStart: { x: 100, y: 380 },
            leopardPos: null, // Random position
            treePositions: [
                { x: 120, y: 100 }, { x: 280, y: 90 }, { x: 420, y: 110 },
                { x: 620, y: 100 }, { x: 800, y: 90 }, { x: 950, y: 100 },
                { x: 150, y: 260 }, { x: 350, y: 280 }, { x: 550, y: 250 },
                { x: 750, y: 260 }, { x: 900, y: 270 },
                { x: 180, y: 420 }, { x: 380, y: 450 }, { x: 600, y: 420 },
                { x: 800, y: 440 }, { x: 950, y: 420 },
                { x: 250, y: 580 }, { x: 500, y: 600 }, { x: 750, y: 580 }
            ],
            farmerPatrols: [
                [{ x: 200, y: 120 }, { x: 400, y: 120 }, { x: 400, y: 250 }, { x: 200, y: 250 }],
                [{ x: 600, y: 100 }, { x: 850, y: 100 }, { x: 850, y: 200 }],
                [{ x: 300, y: 380 }, { x: 500, y: 380 }, { x: 500, y: 520 }, { x: 300, y: 520 }],
                [{ x: 700, y: 350 }, { x: 900, y: 350 }, { x: 900, y: 480 }, { x: 700, y: 480 }]
            ]
        },
        3: {
            name: "Wild Chase",
            width: 30,
            height: 22,
            bananasToFeed: 15,
            farmersToEat: 2,
            farmerCount: 6,
            leopardType: 'roaming',
            // More complex map with water channels dividing areas
            layout: [
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
            ],
            playerStart: { x: 100, y: 180 },
            leopardPos: { x: 700, y: 380 },
            treePositions: [
                // Left section trees (cols 2-11 are grass, rows 2-6, 9-13, 16-19)
                { x: 100, y: 100 }, { x: 200, y: 110 }, { x: 280, y: 130 },
                { x: 120, y: 180 }, { x: 250, y: 190 },
                { x: 100, y: 320 }, { x: 200, y: 340 }, { x: 280, y: 360 },
                { x: 150, y: 420 }, { x: 260, y: 430 },
                // Right section trees (cols 16-27 are grass)
                { x: 550, y: 100 }, { x: 680, y: 110 }, { x: 800, y: 130 },
                { x: 580, y: 190 }, { x: 720, y: 180 }, { x: 820, y: 200 },
                { x: 600, y: 320 }, { x: 750, y: 340 },
                { x: 550, y: 420 }, { x: 700, y: 430 }, { x: 820, y: 400 }
            ],
            farmerPatrols: [
                // Left side patrols
                [{ x: 150, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 180 }, { x: 150, y: 180 }],
                [{ x: 120, y: 300 }, { x: 280, y: 300 }, { x: 280, y: 400 }, { x: 120, y: 400 }],
                [{ x: 150, y: 420 }, { x: 300, y: 420 }, { x: 300, y: 500 }, { x: 150, y: 500 }],
                // Right side patrols
                [{ x: 550, y: 100 }, { x: 780, y: 100 }, { x: 780, y: 200 }, { x: 550, y: 200 }],
                [{ x: 580, y: 300 }, { x: 800, y: 300 }, { x: 800, y: 400 }, { x: 580, y: 400 }],
                [{ x: 550, y: 420 }, { x: 780, y: 420 }, { x: 780, y: 520 }, { x: 550, y: 520 }]
            ]
        },
        3: {
            name: "Wild Chase",
            width: 30,
            height: 22,
            bananasToFeed: 15,
            farmersToEat: 2,
            farmerCount: 6,
            leopardType: 'roaming',
            layout: [
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGWWWWGGGGGGGGGGGGWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
            ],
            playerStart: { x: 100, y: 180 },
            leopardPos: { x: 700, y: 380 },
            treePositions: [
                { x: 100, y: 100 }, { x: 200, y: 110 }, { x: 280, y: 130 },
                { x: 120, y: 180 }, { x: 250, y: 190 },
                { x: 100, y: 320 }, { x: 200, y: 340 }, { x: 280, y: 360 },
                { x: 150, y: 420 }, { x: 260, y: 430 },
                { x: 550, y: 100 }, { x: 680, y: 110 }, { x: 800, y: 130 },
                { x: 580, y: 190 }, { x: 720, y: 180 }, { x: 820, y: 200 },
                { x: 600, y: 320 }, { x: 750, y: 340 },
                { x: 550, y: 420 }, { x: 700, y: 430 }, { x: 820, y: 400 }
            ],
            farmerPatrols: [
                [{ x: 150, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 180 }, { x: 150, y: 180 }],
                [{ x: 120, y: 300 }, { x: 280, y: 300 }, { x: 280, y: 400 }, { x: 120, y: 400 }],
                [{ x: 150, y: 420 }, { x: 300, y: 420 }, { x: 300, y: 500 }, { x: 150, y: 500 }],
                [{ x: 550, y: 100 }, { x: 780, y: 100 }, { x: 780, y: 200 }, { x: 550, y: 200 }],
                [{ x: 580, y: 300 }, { x: 800, y: 300 }, { x: 800, y: 400 }, { x: 580, y: 400 }],
                [{ x: 550, y: 420 }, { x: 780, y: 420 }, { x: 780, y: 520 }, { x: 550, y: 520 }]
            ]
        },
        4: {
            name: "The Hunt",
            width: 35,
            height: 25,
            bananasToFeed: 18,
            farmersToEat: 0,
            farmerCount: 8,
            leopardType: 'hunter',
            levelTime: 90000, // 90 seconds (1:30)
            layout: [
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGWWWWWWWGGGGGGGGGGGGWWW",
                "WWGGGGGGGGGGGWWWWWWWGGGGGGGGGGGGWWW",
                "WWGGGGGGGGGGGWWWWWWWGGGGGGGGGGGGWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWWWWWGGGGGGGGGGGGGGGGGGGGGGGWWWWWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
                "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
            ],
            playerStart: { x: 100, y: 200 },
            leopardPos: { x: 900, y: 400 },
            treePositions: [
                { x: 100, y: 100 }, { x: 220, y: 90 }, { x: 350, y: 110 }, { x: 480, y: 95 },
                { x: 600, y: 105 }, { x: 720, y: 90 }, { x: 850, y: 100 }, { x: 980, y: 110 },
                { x: 150, y: 220 }, { x: 300, y: 240 }, { x: 700, y: 230 }, { x: 900, y: 220 },
                { x: 120, y: 380 }, { x: 280, y: 400 }, { x: 750, y: 380 }, { x: 920, y: 390 },
                { x: 100, y: 550 }, { x: 250, y: 560 }, { x: 400, y: 540 }, { x: 550, y: 550 },
                { x: 700, y: 560 }, { x: 850, y: 540 }, { x: 980, y: 555 }, { x: 500, y: 300 }
            ],
            farmerPatrols: [
                [{ x: 150, y: 100 }, { x: 350, y: 100 }, { x: 350, y: 200 }, { x: 150, y: 200 }],
                [{ x: 500, y: 100 }, { x: 700, y: 100 }, { x: 700, y: 200 }, { x: 500, y: 200 }],
                [{ x: 800, y: 100 }, { x: 1000, y: 100 }, { x: 1000, y: 200 }, { x: 800, y: 200 }],
                [{ x: 150, y: 350 }, { x: 350, y: 350 }, { x: 350, y: 450 }, { x: 150, y: 450 }],
                [{ x: 700, y: 350 }, { x: 950, y: 350 }, { x: 950, y: 450 }, { x: 700, y: 450 }],
                [{ x: 150, y: 500 }, { x: 400, y: 500 }, { x: 400, y: 600 }, { x: 150, y: 600 }],
                [{ x: 500, y: 500 }, { x: 750, y: 500 }, { x: 750, y: 600 }, { x: 500, y: 600 }],
                [{ x: 800, y: 500 }, { x: 1000, y: 500 }, { x: 1000, y: 600 }, { x: 800, y: 600 }]
            ]
        }
    },

    load(levelNum) {
        this.currentLevel = levelNum;
        const lvl = this.levels[levelNum];

        this.width = lvl.width * this.tileSize;
        this.height = lvl.height * this.tileSize;
        this.bananasToFeed = lvl.bananasToFeed;
        this.farmersToEat = lvl.farmersToEat;
        this.farmersEaten = 0;

        // Parse map
        this.map = [];
        for (let row = 0; row < lvl.layout.length; row++) {
            this.map[row] = [];
            for (let col = 0; col < lvl.layout[row].length; col++) {
                const char = lvl.layout[row][col];
                this.map[row][col] = char === 'W' ? 'water' : 'grass';
            }
        }

        // Set up trees - filter out any outside map bounds
        this.trees = lvl.treePositions
            .filter(pos => pos.x > 50 && pos.x < this.width - 50 && pos.y > 50 && pos.y < this.height - 50)
            .map(pos => ({
                x: pos.x,
                y: pos.y,
                hasBananas: true
            }));

        // Set up player
        Player.init(lvl.playerStart.x, lvl.playerStart.y);

        // Set up leopard
        let leopardX, leopardY;
        if (lvl.leopardPos) {
            leopardX = lvl.leopardPos.x;
            leopardY = lvl.leopardPos.y;
        } else {
            // Random position on grass
            const pos = this.getRandomGrassPosition();
            leopardX = pos.x;
            leopardY = pos.y;
        }
        Leopard.init(leopardX, leopardY, lvl.leopardType, lvl.bananasToFeed);

        // Set up farmers
        Farmers.init();
        for (let i = 0; i < lvl.farmerCount; i++) {
            const patrol = lvl.farmerPatrols[i] || lvl.farmerPatrols[0];
            Farmers.add(patrol[0].x, patrol[0].y, patrol);
        }
    },

    getRandomGrassPosition() {
        for (let attempts = 0; attempts < 100; attempts++) {
            const x = Math.random() * (this.width - 150) + 75;
            const y = Math.random() * (this.height - 150) + 75;
            if (this.getTileAtPixel(x, y) === 'grass') {
                // Also check it's not too close to player start
                const dist = Math.sqrt(Math.pow(x - Player.x, 2) + Math.pow(y - Player.y, 2));
                if (dist > 200) {
                    return { x, y };
                }
            }
        }
        return { x: this.width / 2, y: this.height / 2 };
    },

    getTile(col, row) {
        if (row < 0 || row >= this.map.length) return null;
        if (col < 0 || col >= this.map[row].length) return null;
        return this.map[row][col];
    },

    getTileAtPixel(x, y) {
        const col = Math.floor(x / this.tileSize);
        const row = Math.floor(y / this.tileSize);
        return this.getTile(col, row);
    },

    // Get tree near player
    getTreeNear(player, distance = 50) {
        for (const tree of this.trees) {
            if (!tree.hasBananas) continue;
            const dx = (player.x + player.width / 2) - (tree.x + 20);
            const dy = (player.y + player.height / 2) - (tree.y + 24);
            if (Math.sqrt(dx * dx + dy * dy) < distance) {
                return tree;
            }
        }
        return null;
    },

    getName() {
        return this.levels[this.currentLevel].name;
    },

    isComplete() {
        const bananasComplete = Leopard.fedBananas >= this.bananasToFeed;
        const farmersComplete = this.farmersEaten >= this.farmersToEat;
        return bananasComplete && farmersComplete;
    }
};
