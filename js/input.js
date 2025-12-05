// Input handling for Hippo Heist
const Input = {
    keys: {},

    init() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent spacebar from scrolling
            if (e.code === 'Space') e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    },

    isDown(key) {
        return this.keys[key] === true;
    },

    // Movement helpers
    get up() { return this.isDown('KeyW') || this.isDown('ArrowUp'); },
    get down() { return this.isDown('KeyS') || this.isDown('ArrowDown'); },
    get left() { return this.isDown('KeyA') || this.isDown('ArrowLeft'); },
    get right() { return this.isDown('KeyD') || this.isDown('ArrowRight'); },
    get action() { return this.isDown('Space'); },
    get escape() { return this.isDown('Escape'); },

    // For single-press detection (action button)
    actionPressed: false,
    wasActionPressed: false,

    update() {
        this.wasActionPressed = this.actionPressed;
        this.actionPressed = this.action;
    },

    get actionJustPressed() {
        return this.actionPressed && !this.wasActionPressed;
    }
};
