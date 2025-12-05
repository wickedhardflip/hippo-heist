// Input handling for Hippo Heist
const Input = {
    keys: {},
    touch: {
        up: false,
        down: false,
        left: false,
        right: false,
        action: false
    },
    isTouchDevice: false,

    init() {
        // Detect touch device
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent spacebar from scrolling
            if (e.code === 'Space') e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Initialize touch controls if touch device
        if (this.isTouchDevice) {
            this.initTouchControls();
        }
    },

    initTouchControls() {
        // Show touch controls
        const touchControls = document.getElementById('touch-controls');
        if (touchControls) {
            touchControls.style.display = 'flex';
        }

        // D-Pad buttons
        const buttons = {
            'dpad-up': 'up',
            'dpad-down': 'down',
            'dpad-left': 'left',
            'dpad-right': 'right',
            'action-btn': 'action'
        };

        for (const [id, dir] of Object.entries(buttons)) {
            const btn = document.getElementById(id);
            if (btn) {
                // Touch start
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.touch[dir] = true;
                    btn.classList.add('active');
                });

                // Touch end
                btn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.touch[dir] = false;
                    btn.classList.remove('active');
                });

                // Handle touch leaving the button
                btn.addEventListener('touchcancel', (e) => {
                    this.touch[dir] = false;
                    btn.classList.remove('active');
                });
            }
        }

        // Prevent default touch behavior on game canvas
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => e.preventDefault());
            canvas.addEventListener('touchmove', (e) => e.preventDefault());
        }
    },

    isDown(key) {
        return this.keys[key] === true;
    },

    // Movement helpers - check both keyboard and touch
    get up() { return this.isDown('KeyW') || this.isDown('ArrowUp') || this.touch.up; },
    get down() { return this.isDown('KeyS') || this.isDown('ArrowDown') || this.touch.down; },
    get left() { return this.isDown('KeyA') || this.isDown('ArrowLeft') || this.touch.left; },
    get right() { return this.isDown('KeyD') || this.isDown('ArrowRight') || this.touch.right; },
    get action() { return this.isDown('Space') || this.touch.action; },
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
