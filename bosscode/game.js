/* Game Constants */
const FPS = 60;
const FRICTION = 0.7; // 0 = no friction, 1 = lots of friction
const SHIP_SIZE = 50; // Ship height in pixels
const TURN_SPEED = 360; // Degrees per second
const THRUST = 5; // Acceleration pixels per second per second

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
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp') keys.ArrowUp = true;
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') {
        if (gameState === 'START' || gameState === 'GAMEOVER') {
            startGame();
        } else {
            keys.Space = true;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp') keys.ArrowUp = false;
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

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

        // Thrust
        if (keys.ArrowUp) {
            this.thrusting = true;
            this.thrust.x += THRUST * Math.cos(this.a) / FPS;
            this.thrust.y -= THRUST * Math.sin(this.a) / FPS;
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

        ctx.strokeStyle = 'white';
        ctx.lineWidth = SHIP_SIZE / 20;
        ctx.beginPath();
        ctx.moveTo( // Nose
            this.x + 4 / 3 * this.r * Math.cos(this.a),
            this.y - 4 / 3 * this.r * Math.sin(this.a)
        );
        ctx.lineTo( // Rear Left
            this.x - this.r * (2 / 3 * Math.cos(this.a) + Math.sin(this.a)),
            this.y + this.r * (2 / 3 * Math.sin(this.a) - Math.cos(this.a))
        );
        ctx.lineTo( // Rear Right
            this.x - this.r * (2 / 3 * Math.cos(this.a) - Math.sin(this.a)),
            this.y + this.r * (2 / 3 * Math.sin(this.a) + Math.cos(this.a))
        );
        ctx.closePath();
        ctx.stroke();

        // Thruster
        if (this.thrusting) {
            ctx.fillStyle = '#ff00ff';
            ctx.strokeStyle = '#ff00ff';
            ctx.beginPath();
            ctx.moveTo( // Rear Left
                this.x - this.r * (2 / 3 * Math.cos(this.a) + 0.5 * Math.sin(this.a)),
                this.y + this.r * (2 / 3 * Math.sin(this.a) - 0.5 * Math.cos(this.a))
            );
            ctx.lineTo( // Center Behind
                this.x - this.r * 6 / 3 * Math.cos(this.a),
                this.y + this.r * 6 / 3 * Math.sin(this.a)
            );
            ctx.lineTo( // Rear Right
                this.x - this.r * (2 / 3 * Math.cos(this.a) - 0.5 * Math.sin(this.a)),
                this.y + this.r * (2 / 3 * Math.sin(this.a) + 0.5 * Math.cos(this.a))
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
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
                createExplosion(ship.x, ship.y, 30); // Big explosion
                gameOver();
                break;
            }
        }

        // Collision: Ship hit Bomb
        for (let i = 0; i < bombs.length; i++) {
            if (distBetweenPoints(ship.x, ship.y, bombs[i].x, bombs[i].y) < ship.r + bombs[i].r) {
                createExplosion(ship.x, ship.y, 40);
                gameOver();
                break;
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
