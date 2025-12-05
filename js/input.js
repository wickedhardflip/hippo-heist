// Input handling for Hippo Heist
const Input = {
    keys: {},
    touch: {
        action: false
    },
    // Joystick state - values from -1 to 1
    joystick: {
        x: 0,
        y: 0,
        active: false
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
            touchControls.style.display = 'block';
        }

        // Joystick setup
        const joystickZone = document.getElementById('joystick-zone');
        const joystickBase = document.getElementById('joystick-base');
        const joystickThumb = document.getElementById('joystick-thumb');

        if (joystickZone && joystickThumb) {
            let touchId = null;

            joystickZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (touchId === null) {
                    const touch = e.changedTouches[0];
                    touchId = touch.identifier;
                    this.joystick.active = true;
                    joystickThumb.classList.add('active');
                    this.updateJoystick(touch, joystickBase, joystickThumb);
                }
            });

            joystickZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.identifier === touchId) {
                        this.updateJoystick(touch, joystickBase, joystickThumb);
                    }
                }
            });

            const endJoystick = (e) => {
                for (const touch of e.changedTouches) {
                    if (touch.identifier === touchId) {
                        touchId = null;
                        this.joystick.active = false;
                        this.joystick.x = 0;
                        this.joystick.y = 0;
                        joystickThumb.classList.remove('active');
                        joystickThumb.style.transform = 'translate(0, 0)';
                    }
                }
            };

            joystickZone.addEventListener('touchend', endJoystick);
            joystickZone.addEventListener('touchcancel', endJoystick);
        }

        // Action button
        const actionBtn = document.getElementById('action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touch.action = true;
                actionBtn.classList.add('active');
            });

            actionBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touch.action = false;
                actionBtn.classList.remove('active');
            });

            actionBtn.addEventListener('touchcancel', (e) => {
                this.touch.action = false;
                actionBtn.classList.remove('active');
            });
        }

        // Prevent default touch behavior on game canvas
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => e.preventDefault());
            canvas.addEventListener('touchmove', (e) => e.preventDefault());
        }
    },

    updateJoystick(touch, base, thumb) {
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxDist = rect.width / 2 - 10;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Clamp to max distance
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        // Update joystick values (-1 to 1)
        this.joystick.x = dx / maxDist;
        this.joystick.y = dy / maxDist;

        // Move thumb visual
        thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    },

    isDown(key) {
        return this.keys[key] === true;
    },

    // Movement helpers - check both keyboard and joystick
    get up() {
        return this.isDown('KeyW') || this.isDown('ArrowUp') || this.joystick.y < -0.3;
    },
    get down() {
        return this.isDown('KeyS') || this.isDown('ArrowDown') || this.joystick.y > 0.3;
    },
    get left() {
        return this.isDown('KeyA') || this.isDown('ArrowLeft') || this.joystick.x < -0.3;
    },
    get right() {
        return this.isDown('KeyD') || this.isDown('ArrowRight') || this.joystick.x > 0.3;
    },
    get action() { return this.isDown('Space') || this.touch.action; },
    get escape() { return this.isDown('Escape'); },

    // Get analog joystick values for smooth movement
    getMovementVector() {
        let x = 0, y = 0;

        // Keyboard input (digital)
        if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
        if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
        if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
        if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;

        // Joystick input (analog) - takes priority if active
        if (this.joystick.active) {
            x = this.joystick.x;
            y = this.joystick.y;
        }

        // Normalize if needed
        const len = Math.sqrt(x * x + y * y);
        if (len > 1) {
            x /= len;
            y /= len;
        }

        return { x, y };
    },

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
