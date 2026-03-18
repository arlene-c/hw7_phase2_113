// ── engine.js ── Physics, Input, Entity System ──

const TILE = 32;
const COLS = 30;
const ROWS = 20;
const GRAVITY = 0.45;
const FRICTION = 0.45;
const MAX_FALL = 10;
const MAX_SPEED = 3.5;

// ── Input Manager ──
class InputManager {
  constructor() {
    this.keys = {};
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }
  isDown(code) { return !!this.keys[code]; }
}

// ── Entity base ──
class Entity {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.alive = true;
    this.facingRight = true;
  }

  get left() { return this.x; }
  get right() { return this.x + this.w; }
  get top() { return this.y; }
  get bottom() { return this.y + this.h; }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  overlaps(other) {
    return this.left < other.right &&
           this.right > other.left &&
           this.top < other.bottom &&
           this.bottom > other.top;
  }
}

// ── Player ──
class Player extends Entity {
  constructor(x, y, type) {
    super(x, y, 20, 30);
    this.type = type; // 'fire' or 'water'
    this.speed = 2.4;
    this.jumpForce = -11;
    this.gems = 0;
    this.atDoor = false;
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.eyeBlink = 0;
    this.particles = [];
  }

  update(input, level) {
    // Movement
    let moveLeft, moveRight, jump;

    if (this.type === 'fire') {
      moveLeft = input.isDown('KeyA');
      moveRight = input.isDown('KeyD');
      jump = input.isDown('KeyW');
    } else {
      moveLeft = input.isDown('ArrowLeft');
      moveRight = input.isDown('ArrowRight');
      jump = input.isDown('ArrowUp');
    }

    if (moveLeft) {
      this.vx -= this.speed * 0.5;
      this.facingRight = false;
    }
    if (moveRight) {
      this.vx += this.speed * 0.5;
      this.facingRight = true;
    }

    if (!moveLeft && !moveRight) {
      this.vx *= 0.3;
    }

    if (jump && this.onGround) {
      this.vy = this.jumpForce;
      this.onGround = false;
    }

    // Physics
    this.vx *= FRICTION;
    if (Math.abs(this.vx) < 0.15) this.vx = 0;
    if (this.vx > MAX_SPEED) this.vx = MAX_SPEED;
    if (this.vx < -MAX_SPEED) this.vx = -MAX_SPEED;
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;

    // Walk animation
    if (Math.abs(this.vx) > 0.5) {
      this.walkTimer += Math.abs(this.vx);
      if (this.walkTimer > 8) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }
    } else {
      this.walkFrame = 0;
      this.walkTimer = 0;
    }

    // Blink
    this.eyeBlink = (this.eyeBlink + 1) % 200;

    // Collision X
    this.x += this.vx;
    this.resolveCollisionX(level);

    // Collision Y
    this.y += this.vy;
    this.onGround = false;
    this.resolveCollisionY(level);

    // Particles
    this.updateParticles();
    if (Math.abs(this.vx) > 1 || !this.onGround) {
      this.spawnParticle();
    }
  }

  resolveCollisionX(level) {
    const tiles = level.tiles;
    const startCol = Math.floor(this.left / TILE);
    const endCol = Math.floor(this.right / TILE);
    const startRow = Math.floor(this.top / TILE);
    const endRow = Math.floor(this.bottom / TILE);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const tile = tiles[r]?.[c];
        if (tile === 1 || tile === 10) { // solid wall or stone
          const tileRect = { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
          if (this.left < tileRect.x + tileRect.w &&
              this.right > tileRect.x &&
              this.top < tileRect.y + tileRect.h &&
              this.bottom > tileRect.y) {
            if (this.vx > 0) {
              this.x = tileRect.x - this.w;
            } else if (this.vx < 0) {
              this.x = tileRect.x + tileRect.w;
            }
            this.vx = 0;
          }
        }
      }
    }
  }

  resolveCollisionY(level) {
    const tiles = level.tiles;
    const startCol = Math.floor(this.left / TILE);
    const endCol = Math.floor(this.right / TILE);
    const startRow = Math.floor(this.top / TILE);
    const endRow = Math.floor(this.bottom / TILE);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const tile = tiles[r]?.[c];
        if (tile === 1 || tile === 10) {
          const tileRect = { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
          if (this.left < tileRect.x + tileRect.w &&
              this.right > tileRect.x &&
              this.top < tileRect.y + tileRect.h &&
              this.bottom > tileRect.y) {
            if (this.vy > 0) {
              this.y = tileRect.y - this.h;
              this.vy = 0;
              this.onGround = true;
            } else if (this.vy < 0) {
              this.y = tileRect.y + tileRect.h;
              this.vy = 0;
            }
          }
        }
      }
    }
  }

  spawnParticle() {
    if (Math.random() > 0.3) return;
    this.particles.push({
      x: this.centerX + (Math.random() - 0.5) * 8,
      y: this.bottom - 2,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -Math.random() * 2 - 0.5,
      life: 1,
      size: Math.random() * 3 + 1,
    });
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.03;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (this.particles.length > 30) this.particles.splice(0, this.particles.length - 30);
  }

  checkHazards(level) {
    const tiles = level.tiles;
    // Check surrounding tiles for hazards
    const checkPoints = [
      { x: this.left + 2, y: this.bottom + 1 },
      { x: this.right - 2, y: this.bottom + 1 },
      { x: this.centerX, y: this.bottom + 1 },
    ];

    for (const pt of checkPoints) {
      const c = Math.floor(pt.x / TILE);
      const r = Math.floor(pt.y / TILE);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      const tile = tiles[r][c];

      // Lava (2) kills water, safe for fire
      if (tile === 2 && this.type === 'water') return 'lava';
      // Water (3) kills fire, safe for water
      if (tile === 3 && this.type === 'fire') return 'water';
      // Poison/green (4) kills both
      if (tile === 4) return 'poison';
    }
    return null;
  }
}

// ── Gem ──
class Gem extends Entity {
  constructor(x, y, type) {
    super(x, y, 16, 16);
    this.type = type; // 'fire' or 'water'
    this.collected = false;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.sparkles = [];
  }

  update() {
    this.floatPhase += 0.05;
    if (Math.random() < 0.05) {
      this.sparkles.push({
        x: this.centerX + (Math.random() - 0.5) * 12,
        y: this.centerY + (Math.random() - 0.5) * 12,
        life: 1,
        size: Math.random() * 2 + 1,
      });
    }
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      this.sparkles[i].life -= 0.04;
      this.sparkles[i].y -= 0.3;
      if (this.sparkles[i].life <= 0) this.sparkles.splice(i, 1);
    }
  }
}

// ── Door ──
class Door extends Entity {
  constructor(x, y, type) {
    super(x, y, 28, 40);
    this.type = type;
    this.glowPhase = Math.random() * Math.PI * 2;
    this.open = false;
  }

  update() {
    this.glowPhase += 0.04;
  }
}

// ── Lever & Gate (Buttons + Platforms) ──
class Button extends Entity {
  constructor(x, y, gateId) {
    super(x, y, 28, 8);
    this.gateId = gateId;
    this.pressed = false;
    this.pressAnim = 0;
  }

  checkPress(players) {
    this.pressed = false;
    for (const p of players) {
      if (p.alive && this.overlaps({
        x: p.x, y: p.y, w: p.w, h: p.h,
        get left() { return this.x; },
        get right() { return this.x + this.w; },
        get top() { return this.y; },
        get bottom() { return this.y + this.h; }
      })) {
        this.pressed = true;
      }
    }
    this.pressAnim += (this.pressed ? 1 - this.pressAnim : -this.pressAnim) * 0.2;
  }
}

class Gate extends Entity {
  constructor(x, y, h, gateId) {
    super(x, y, TILE, h);
    this.gateId = gateId;
    this.openAmount = 0;
    this.originalY = y;
    this.originalH = h;
  }

  update(buttons) {
    const isActive = buttons.some(b => b.gateId === this.gateId && b.pressed);
    const target = isActive ? 1 : 0;
    this.openAmount += (target - this.openAmount) * 0.08;
    // Gate slides up
    this.y = this.originalY - this.originalH * this.openAmount;
  }
}

// ── Moving Platform ──
class MovingPlatform extends Entity {
  constructor(x, y, w, dx, dy, speed) {
    super(x, y, w, 12);
    this.startX = x;
    this.startY = y;
    this.dx = dx; // total movement distance x
    this.dy = dy; // total movement distance y
    this.speed = speed || 0.01;
    this.t = 0;
    this.prevX = x;
    this.prevY = y;
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;
    this.t += this.speed;
    const ease = (Math.sin(this.t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    this.x = this.startX + this.dx * ease;
    this.y = this.startY + this.dy * ease;
  }

  get deltaX() { return this.x - this.prevX; }
  get deltaY() { return this.y - this.prevY; }

  carryPlayer(player) {
    // Check if player is standing on this platform
    const onPlatform =
      player.bottom >= this.y - 2 &&
      player.bottom <= this.y + 6 &&
      player.right > this.x &&
      player.left < this.right;

    if (onPlatform && player.vy >= 0) {
      player.y = this.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.x += this.deltaX;
      player.y += this.deltaY;
    }
  }
}
