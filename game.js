/* Game Constants */
const FPS = 60;
const FRICTION = 0.7; // 0 = no friction, 1 = lots of friction
const SHIP_SIZE = 30; // Ship height in pixels
const TURN_SPEED = 180; // Degrees per second
const THRUST = 2.5; // Acceleration pixels per second per second

/* Canvas Setup */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* Game State */
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;

/* Input Handling */
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    KeyF: false,
    KeyE: false,
    Space: false
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.ArrowUp = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.ArrowDown = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = true;
    if (e.code === 'KeyF') {
        if (gameState === 'PLAYING') keys.KeyF = true;
    }
    if (e.code === 'KeyE') {
        if (gameState === 'PLAYING') keys.KeyE = true;
    }
    if (e.code === 'Space') {
        if (gameState === 'START' || gameState === 'GAMEOVER') {
            startGame();
        } else {
            keys.Space = true;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.ArrowUp = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.ArrowDown = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = false;
    if (e.code === 'KeyF') keys.KeyF = false;
    if (e.code === 'KeyE') keys.KeyE = false;
    if (e.code === 'Space') keys.Space = false;
});

/* Mobile Input Handling */
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const mobileControls = document.getElementById('mobile-controls');
const joystickStick = document.getElementById('joystick-stick');
const joystickBase = document.getElementById('joystick-base');

if (isTouchDevice) {
    mobileControls.classList.remove('hidden');

    // Joystick Variables
    let joystickActive = false;
    let joystickTouchId = null;
    let joystickCenter = { x: 0, y: 0 };
    const maxDistance = 40;

    joystickBase.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystickActive = true;
        joystickTouchId = touch.identifier;
        const rect = joystickBase.getBoundingClientRect();
        joystickCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === joystickTouchId) {
                const dx = touch.clientX - joystickCenter.x;
                const dy = touch.clientY - joystickCenter.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const angle = Math.atan2(dy, dx);
                const limitedDist = Math.min(dist, maxDistance);

                const stickX = limitedDist * Math.cos(angle);
                const stickY = limitedDist * Math.sin(angle);

                joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

                // Map to keys
                // Rotate Left
                keys.ArrowLeft = (dx < -15);
                // Rotate Right
                keys.ArrowRight = (dx > 15);
                // Thrust
                keys.ArrowUp = (dy < -15);

                break;
            }
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === joystickTouchId) {
                joystickActive = false;
                joystickTouchId = null;
                joystickStick.style.transform = 'translate(0px, 0px)';
                keys.ArrowLeft = false;
                keys.ArrowRight = false;
                keys.ArrowUp = false;
                break;
            }
        }
    });

    // Action Buttons
    const btnFire = document.getElementById('btn-fire');
    const btnShield = document.getElementById('btn-shield');
    const btnHyper = document.getElementById('btn-hyper');

    const handleBtn = (btn, key, start = true) => {
        btn.addEventListener(start ? 'touchstart' : 'touchend', (e) => {
            e.preventDefault();
            if (key === 'Space' && start && (gameState === 'START' || gameState === 'GAMEOVER')) {
                startGame();
            } else {
                keys[key] = start;
            }
        }, { passive: false });
    };

    handleBtn(btnFire, 'Space', true);
    handleBtn(btnFire, 'Space', false);
    handleBtn(btnShield, 'KeyF', true);
    handleBtn(btnShield, 'KeyF', false);
    handleBtn(btnHyper, 'KeyE', true);
    handleBtn(btnHyper, 'KeyE', false);
}

/* Game Classes */
class Ship {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.r = SHIP_SIZE / 2;
        this.a = 90 / 180 * Math.PI; // Angle in radians
        this.rot = 0;
        this.thrusting = false;
        this.thrust = { x: 0, y: 0 };
        this.blinkTime = Math.ceil(0.1 * FPS);
        this.blinkNum = Math.ceil(3.0 * FPS);
        this.canShoot = true;
        this.lasers = [];
        this.shieldActive = false;
        this.shieldTime = 0; // Duration of active shield in frames
        this.shieldCooldown = 0; // Cooldown timer in frames
        this.shieldMaxTime = 3 * FPS; // 3 seconds
        this.shieldMaxCooldown = 10 * FPS; // 10 seconds
        this.hyperDriveCooldown = 0;
        this.hyperDriveMaxCooldown = 5 * FPS; // 5 seconds
        this.trail = []; // For visual feedback
    }

    shoot() {
        if (this.canShoot && this.lasers.length < 10) {
            this.lasers.push(new Laser(
                this.x + 4 / 3 * this.r * Math.cos(this.a),
                this.y - 4 / 3 * this.r * Math.sin(this.a),
                this.a
            ));
            this.canShoot = false;
            setTimeout(() => this.canShoot = true, 250); // Fire rate limiting
        }
    }

    update() {
        // Rotate
        if (keys.ArrowLeft) this.rot = TURN_SPEED / 180 * Math.PI / FPS;
        else if (keys.ArrowRight) this.rot = -TURN_SPEED / 180 * Math.PI / FPS;
        else this.rot = 0;
        this.a += this.rot;

        // --- Shield Logic ---
        if (keys.KeyF && this.shieldCooldown === 0 && !this.shieldActive) {
            this.shieldActive = true;
            this.shieldTime = this.shieldMaxTime;
            this.shieldCooldown = this.shieldMaxCooldown;
        }

        if (this.shieldActive) {
            this.shieldTime--;
            if (this.shieldTime <= 0) {
                this.shieldActive = false;
            }
        }

        if (this.shieldCooldown > 0) {
            this.shieldCooldown--;
        }

        // --- Hyper-Drive Logic ---
        if (keys.KeyE && this.hyperDriveCooldown === 0) {
            // Store current position for trail
            for (let i = 0; i < 5; i++) {
                this.trail.push({
                    x: this.x + (i * 30 * Math.cos(this.a)),
                    y: this.y - (i * 30 * Math.sin(this.a)),
                    a: this.a,
                    life: 1.0
                });
            }

            // Instantly move forward
            this.x += 150 * Math.cos(this.a);
            this.y -= 150 * Math.sin(this.a);

            this.hyperDriveCooldown = this.hyperDriveMaxCooldown;
        }

        if (this.hyperDriveCooldown > 0) {
            this.hyperDriveCooldown--;
        }

        // Update trail
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].life -= 0.05;
            if (this.trail[i].life <= 0) {
                this.trail.splice(i, 1);
            }
        }

        // Update UI Status
        let shieldStatus = document.getElementById('shield-status');
        if (shieldStatus) {
            if (this.shieldCooldown > 0) {
                shieldStatus.innerText = `SHIELD COOLDOWN: ${Math.ceil(this.shieldCooldown / FPS)}s`;
                shieldStatus.style.color = '#ff3300';
            } else {
                shieldStatus.innerText = 'SHIELD READY (PRESS F)';
                shieldStatus.style.color = '#00f3ff';
            }
        }

        let hdStatus = document.getElementById('hyper-drive-status');
        if (hdStatus) {
            if (this.hyperDriveCooldown > 0) {
                hdStatus.innerText = `HYPER-DRIVE COOLDOWN: ${Math.ceil(this.hyperDriveCooldown / FPS)}s`;
                hdStatus.style.color = '#ff3300';
            } else {
                hdStatus.innerText = 'HYPER-DRIVE READY (PRESS E)';
                hdStatus.style.color = '#ff00ff';
            }
        }

        // Thrust
        if (keys.ArrowUp) {
            this.thrusting = true;
            this.thrust.x += THRUST * Math.cos(this.a) / FPS;
            this.thrust.y -= THRUST * Math.sin(this.a) / FPS;
        } else if (keys.ArrowDown) {
            // Reverse Thrust
            this.thrusting = true;
            this.thrust.x -= (THRUST / 2) * Math.cos(this.a) / FPS;
            this.thrust.y += (THRUST / 2) * Math.sin(this.a) / FPS;
        } else {
            this.thrusting = false;
            this.thrust.x -= FRICTION * this.thrust.x / FPS;
            this.thrust.y -= FRICTION * this.thrust.y / FPS;
        }

        // Move
        this.x += this.thrust.x;
        this.y += this.thrust.y;

        // Screen wrap
        if (this.x < 0 - this.r) this.x = canvas.width + this.r;
        else if (this.x > canvas.width + this.r) this.x = 0 - this.r;
        if (this.y < 0 - this.r) this.y = canvas.height + this.r;
        else if (this.y > canvas.height + this.r) this.y = 0 - this.r;

        // Shooting
        if (keys.Space) {
            this.shoot();
        }

        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].update();
            if (this.lasers[i].dist > canvas.width * 0.8) {
                this.lasers.splice(i, 1);
            }
        }
    }

    draw() {
        // Draw Lasers
        for (let i = 0; i < this.lasers.length; i++) {
            this.lasers[i].draw();
        }

        ctx.lineWidth = SHIP_SIZE / 20;

        // --- Hyper-Drive Trail ---
        this.trail.forEach(t => {
            ctx.strokeStyle = `rgba(255, 0, 255, ${t.life})`;
            ctx.lineWidth = (SHIP_SIZE / 20) * t.life;
            ctx.beginPath();
            ctx.moveTo(
                t.x + 4 / 3 * this.r * Math.cos(t.a),
                t.y - 4 / 3 * this.r * Math.sin(t.a)
            );
            ctx.lineTo(
                t.x - this.r * (2 / 3 * Math.cos(t.a) + Math.sin(t.a)),
                t.y + this.r * (2 / 3 * Math.sin(t.a) - Math.cos(t.a))
            );
            ctx.lineTo(
                t.x - this.r * (2 / 3 * Math.cos(t.a) - Math.sin(t.a)),
                t.y + this.r * (2 / 3 * Math.sin(t.a) + Math.cos(t.a))
            );
            ctx.closePath();
            ctx.stroke();
        });

        // --- Realistic Ship Body ---
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#1a1a1a'; // Dark metallic hull

        // Main Hull Path
        ctx.beginPath();
        // Nose
        let noseX = this.x + 4 / 3 * this.r * Math.cos(this.a);
        let noseY = this.y - 4 / 3 * this.r * Math.sin(this.a);
        ctx.moveTo(noseX, noseY);

        // Rear Left Wing Tip
        ctx.lineTo(
            this.x - this.r * (2 / 3 * Math.cos(this.a) + 1.2 * Math.sin(this.a)),
            this.y + this.r * (2 / 3 * Math.sin(this.a) - 1.2 * Math.cos(this.a))
        );

        // Rear Inner Left
        ctx.lineTo(
            this.x - this.r * (1 / 3 * Math.cos(this.a) + 0.5 * Math.sin(this.a)),
            this.y + this.r * (1 / 3 * Math.sin(this.a) - 0.5 * Math.cos(this.a))
        );

        // Rear Inner Right
        ctx.lineTo(
            this.x - this.r * (1 / 3 * Math.cos(this.a) - 0.5 * Math.sin(this.a)),
            this.y + this.r * (1 / 3 * Math.sin(this.a) + 0.5 * Math.cos(this.a))
        );

        // Rear Right Wing Tip
        ctx.lineTo(
            this.x - this.r * (2 / 3 * Math.cos(this.a) - 1.2 * Math.sin(this.a)),
            this.y + this.r * (2 / 3 * Math.sin(this.a) + 1.2 * Math.cos(this.a))
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // --- Cockpit ---
        ctx.fillStyle = '#00daff'; // Cyan glow cockpit
        ctx.beginPath();
        ctx.ellipse(
            this.x + 0.2 * this.r * Math.cos(this.a),
            this.y - 0.2 * this.r * Math.sin(this.a),
            this.r * 0.4,
            this.r * 0.2,
            -this.a,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // --- Thruster Glow ---
        if (this.thrusting) {
            let gradient = ctx.createRadialGradient(
                this.x - this.r * Math.cos(this.a),
                this.y + this.r * Math.sin(this.a),
                0,
                this.x - this.r * 1.5 * Math.cos(this.a),
                this.y + this.r * 1.5 * Math.sin(this.a),
                this.r * 1.2
            );
            gradient.addColorStop(0, '#ffcc00'); // Orange/Yellow center
            gradient.addColorStop(0.5, 'rgba(255, 68, 0, 0.8)'); // Reddish outer
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(
                this.x - this.r * (0.8 * Math.cos(this.a) + 0.3 * Math.sin(this.a)),
                this.y + this.r * (0.8 * Math.sin(this.a) - 0.3 * Math.cos(this.a))
            );
            ctx.lineTo(
                this.x - this.r * 2.5 * Math.cos(this.a),
                this.y + this.r * 2.5 * Math.sin(this.a)
            );
            ctx.lineTo(
                this.x - this.r * (0.8 * Math.cos(this.a) - 0.3 * Math.sin(this.a)),
                this.y + this.r * (0.8 * Math.sin(this.a) + 0.3 * Math.cos(this.a))
            );
            ctx.closePath();
            ctx.fill();

            // Core flick
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(
                this.x - this.r * 0.8 * Math.cos(this.a),
                this.y + this.r * 0.8 * Math.sin(this.a),
                this.r * 0.2,
                0, Math.PI * 2
            );
            ctx.fill();
        }

        // --- Shield Bubble Rendering ---
        if (this.shieldActive) {
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f3ff';

            // Pulsing effect
            let pulse = Math.sin(Date.now() / 100) * 5;

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r * 1.8 + pulse, 0, Math.PI * 2);
            ctx.stroke();

            // Inner faint fill
            ctx.fillStyle = 'rgba(0, 243, 255, 0.1)';
            ctx.fill();

            ctx.shadowBlur = 0;
        }
    }
}

class Laser {
    constructor(x, y, a) {
        this.x = x;
        this.y = y;
        this.xv = 500 * Math.cos(a) / FPS;
        this.yv = -500 * Math.sin(a) / FPS;
        this.dist = 0;
    }

    update() {
        this.x += this.xv;
        this.y += this.yv;
        this.dist += Math.sqrt(this.xv * this.xv + this.yv * this.yv);

        if (this.x < 0) this.x = canvas.width;
        else if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        else if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        ctx.fillStyle = '#00f3ff'; // Neon Blue
        ctx.beginPath();
        ctx.arc(this.x, this.y, SHIP_SIZE / 15, 0, Math.PI * 2, false);
        ctx.fill();
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f3ff';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Asteroid {
    constructor(x, y, r) {
        this.x = x;
        this.y = y;
        this.r = r || Math.ceil(Math.random() * 30 + 20); // Random radius 20-50
        this.xv = Math.random() * 50 / FPS * (Math.random() < 0.5 ? 1 : -1);
        this.yv = Math.random() * 50 / FPS * (Math.random() < 0.5 ? 1 : -1);
        this.a = Math.random() * Math.PI * 2;
        this.vert = Math.floor(Math.random() * 10 + 5); // Vertices
        this.offs = [];
        for (let i = 0; i < this.vert; i++) {
            this.offs.push(Math.random() * 0.4 + 0.8); // Random jaggedness
        }
    }

    update() {
        this.x += this.xv;
        this.y += this.yv;

        // Screen wrap
        if (this.x < 0 - this.r) this.x = canvas.width + this.r;
        else if (this.x > canvas.width + this.r) this.x = 0 - this.r;
        if (this.y < 0 - this.r) this.y = canvas.height + this.r;
        else if (this.y > canvas.height + this.r) this.y = 0 - this.r;
    }

    draw() {
        ctx.strokeStyle = '#ff00aa'; // Neon Pink/Redish
        ctx.lineWidth = SHIP_SIZE / 20;
        ctx.beginPath();
        for (let i = 0; i < this.vert; i++) {
            ctx.lineTo(
                this.x + this.r * this.offs[i] * Math.cos(this.a + i * Math.PI * 2 / this.vert),
                this.y + this.r * this.offs[i] * Math.sin(this.a + i * Math.PI * 2 / this.vert)
            );
        }
        ctx.closePath();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff00aa';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

class Bomb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 25; // Fixed size
        this.xv = Math.random() * 40 / FPS * (Math.random() < 0.5 ? 1 : -1);
        this.yv = Math.random() * 40 / FPS * (Math.random() < 0.5 ? 1 : -1);
        this.blinkTime = Math.ceil(0.5 * FPS);
        this.blinkNum = Math.ceil(1.0 * FPS);
    }

    update() {
        this.x += this.xv;
        this.y += this.yv;

        // Screen wrap
        if (this.x < 0 - this.r) this.x = canvas.width + this.r;
        else if (this.x > canvas.width + this.r) this.x = 0 - this.r;
        if (this.y < 0 - this.r) this.y = canvas.height + this.r;
        else if (this.y > canvas.height + this.r) this.y = 0 - this.r;
    }

    draw() {
        ctx.strokeStyle = '#ff3300'; // Red
        ctx.fillStyle = '#660000'; // Dark red fill
        ctx.lineWidth = SHIP_SIZE / 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff3300';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

let ship;
let asteroids = [];
let bombs = [];
let level = 0;

function createAsteroids(numAsteroids, numBombs) {
    asteroids = [];
    bombs = [];
    let x, y;
    for (let i = 0; i < numAsteroids; i++) {
        do {
            x = Math.floor(Math.random() * canvas.width);
            y = Math.floor(Math.random() * canvas.height);
        } while (distBetweenPoints(ship.x, ship.y, x, y) < 150); // Keep distance from ship
        asteroids.push(new Asteroid(x, y));
    }

    // Create Bombs
    for (let i = 0; i < numBombs; i++) {
        do {
            x = Math.floor(Math.random() * canvas.width);
            y = Math.floor(Math.random() * canvas.height);
        } while (distBetweenPoints(ship.x, ship.y, x, y) < 150);
        bombs.push(new Bomb(x, y));
    }
}

function newLevel() {
    level++;
    document.getElementById('level').innerText = level;
    let numAsteroids = level + 5;
    let numBombs = Math.floor(level / 2) + 2;
    createAsteroids(numAsteroids, numBombs);
}

function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function startGame() {
    ship = new Ship();
    level = 0;
    newLevel();
    gameState = 'PLAYING';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    score = 0;
    updateScore();
}


function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
}

function updateScore() {
    document.getElementById('score').innerText = score;
}

/* Loop */
function loop() {
    // Background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'PLAYING') {
        ship.update();
        ship.draw();

        // Update Asteroids
        for (let i = 0; i < asteroids.length; i++) {
            asteroids[i].update();
            asteroids[i].draw();
        }

        // Collision: Laser hit Asteroid
        for (let i = asteroids.length - 1; i >= 0; i--) {
            let ax = asteroids[i].x;
            let ay = asteroids[i].y;
            let ar = asteroids[i].r;

            // Loop over lasers
            for (let j = ship.lasers.length - 1; j >= 0; j--) {
                let lx = ship.lasers[j].x;
                let ly = ship.lasers[j].y;

                if (distBetweenPoints(ax, ay, lx, ly) < ar) {
                    // Hit!
                    createExplosion(ax, ay, 10); // Create particles
                    ship.lasers.splice(j, 1);
                    asteroids.splice(i, 1);
                    score += 100;
                    updateScore();

                    // Spawn new asteroids if cleared
                    if (asteroids.length === 0) {
                        newLevel();
                    }
                    break;
                }
            }
        }

        // Loop over Bombs -> Update & Draw
        for (let i = 0; i < bombs.length; i++) {
            bombs[i].update();
            bombs[i].draw();
        }

        // Collision: Laser hit Bomb
        for (let i = bombs.length - 1; i >= 0; i--) {
            let bx = bombs[i].x;
            let by = bombs[i].y;
            let br = bombs[i].r;

            // Loop over lasers
            for (let j = ship.lasers.length - 1; j >= 0; j--) {
                let lx = ship.lasers[j].x;
                let ly = ship.lasers[j].y;

                if (distBetweenPoints(bx, by, lx, ly) < br) {
                    // Hit Bomb!
                    createExplosion(bx, by, 20);
                    ship.lasers.splice(j, 1);
                    bombs.splice(i, 1);
                    score -= 500; // PENALTY
                    updateScore();
                    break; // Bomb destroyed
                }
            }
        }

        // Collision: Ship hit Asteroid
        for (let i = 0; i < asteroids.length; i++) {
            if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.r + asteroids[i].r) {
                if (ship.shieldActive) {
                    // Destroy asteroid instead of game over or just bounce? 
                    // Let's destroy it for satisfying feel
                    createExplosion(asteroids[i].x, asteroids[i].y, 10);
                    asteroids.splice(i, 1);
                    score += 50;
                    updateScore();
                    if (asteroids.length === 0) newLevel();
                    break;
                } else {
                    createExplosion(ship.x, ship.y, 30); // Big explosion
                    gameOver();
                    break;
                }
            }
        }

        // Collision: Ship hit Bomb
        for (let i = 0; i < bombs.length; i++) {
            if (distBetweenPoints(ship.x, ship.y, bombs[i].x, bombs[i].y) < ship.r + bombs[i].r) {
                if (ship.shieldActive) {
                    createExplosion(bombs[i].x, bombs[i].y, 15);
                    bombs.splice(i, 1);
                    break;
                } else {
                    createExplosion(ship.x, ship.y, 40);
                    gameOver();
                    break;
                }
            }
        }

        // Update Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    requestAnimationFrame(loop);
}

/* Particles */
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.xv = (Math.random() - 0.5) * (Math.random() * 200 + 50) / FPS;
        this.yv = (Math.random() - 0.5) * (Math.random() * 200 + 50) / FPS;
        this.r = Math.random() * 3 + 1;
        this.life = 1.0; // Seconds to live
        this.decay = Math.random() * 0.05 + 0.02; // Fade speed
    }

    update() {
        this.x += this.xv;
        this.y += this.yv;
        this.life -= this.decay;
        this.r -= 0.05;
        if (this.r < 0) this.r = 0;
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, false);
        ctx.fill();
    }
}

let particles = [];
function createExplosion(x, y, num) {
    for (let i = 0; i < num; i++) {
        particles.push(new Particle(x, y));
    }
}

// Initial Kickoff
loop();
