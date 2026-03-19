// ── engine.js ── Physics, Input, Entity System ──
//
// CHANGES FROM ORIGINAL:
//
// [FIX 1] Double-jump bug — InputManager now tracks "justPressed" keys
//   (rising edge only). Jump previously used isDown(), which fired every
//   frame the key was held. Landing while still holding the key would
//   immediately re-trigger a second jump. Now jump uses isJustPressed(),
//   which is true for exactly ONE frame per keypress.
//
// [FIX 2] Sluggish / fighting movement — The original applied vx += speed*0.5
//   each frame and then multiplied by FRICTION=0.45 BEFORE the speed cap.
//   This caused velocity to fight itself and never cleanly reach MAX_SPEED.
//   New approach: set vx directly to ±MAX_SPEED when a key is held (instant
//   response), apply friction only when no key is pressed (smooth stop).
//   This matches the feel of the original browser game.
//
// [FIX 3] FRICTION constant renamed / changed — old value 0.45 caused
//   extremely heavy deceleration making the character feel like it was
//   running through mud. New FRICTION=0.75 is applied only on idle frames,
//   giving a short but perceptible slide-to-stop that feels natural.

const TILE     = 32;
const COLS     = 30;
const ROWS     = 20;
const GRAVITY  = 0.45;
const FRICTION = 0.75;   // [CHANGED] Was 0.45 — now only applied when no key held
const MAX_FALL = 10;
const MAX_SPEED = 3.5;

// ── Input Manager ──────────────────────────────────────────────────────────
// [CHANGED] Added justPressed tracking (rising-edge detection).
//   justPressed[code] is set true on keydown and cleared after one isJustPressed() read.
//   This prevents the double-jump: holding the jump key no longer re-fires on landing.
class InputManager {
  constructor() {
    this.keys      = {};  // currently held keys
    this._justDown = {};  // keys pressed this frame (cleared after read)

    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        // Only mark justDown on the initial press, not key-repeat events
        this._justDown[e.code] = true;
      }
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code]      = false;
      this._justDown[e.code] = false;
    });
  }

  /** True every frame the key is held down. Use for movement. */
  isDown(code) { return !!this.keys[code]; }

  /**
   * True for exactly ONE frame when the key is first pressed.
   * [NEW] Use for jump to prevent auto-repeat re-triggering on landing.
   */
  isJustPressed(code) {
    const val = !!this._justDown[code];
    this._justDown[code] = false; // consume the event — only fires once
    return val;
  }
}

// ── Entity base ────────────────────────────────────────────────────────────
// Unchanged from original — provides shared AABB helpers used by all objects.
class Entity {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.onGround   = false;
    this.alive      = true;
    this.facingRight = true;
  }

  get left()    { return this.x; }
  get right()   { return this.x + this.w; }
  get top()     { return this.y; }
  get bottom()  { return this.y + this.h; }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  overlaps(other) {
    return this.left  < other.right  &&
           this.right > other.left   &&
           this.top   < other.bottom &&
           this.bottom > other.top;
  }
}

// ── Player ────────────────────────────────────────────────────────────────
class Player extends Entity {
  constructor(x, y, type) {
    super(x, y, 20, 30);
    this.type       = type; // 'fire' or 'water'
    this.speed      = MAX_SPEED;   // [CHANGED] direct target speed, not an accumulator
    this.jumpForce  = -11;
    this.gems       = 0;
    this.atDoor     = false;
    this.walkFrame  = 0;
    this.walkTimer  = 0;
    this.eyeBlink   = 0;
    this.particles  = [];

    // [NEW] Track whether jump key was already consumed this landing
    // so bouncing on a platform frame-perfectly can't sneak a second jump.
    this._jumpConsumed = false;
  }

  update(input, level) {
    // ── Determine keys for this player type ────────────────────────────
    // Fireboy: WASD  |  Watergirl: Arrow keys  (unchanged from original)
    let moveLeft, moveRight, jumpPressed;

    if (this.type === 'fire') {
      moveLeft   = input.isDown('KeyA');
      moveRight  = input.isDown('KeyD');
      jumpPressed = input.isJustPressed('KeyW');   // [CHANGED] isJustPressed, not isDown
    } else {
      moveLeft   = input.isDown('ArrowLeft');
      moveRight  = input.isDown('ArrowRight');
      jumpPressed = input.isJustPressed('ArrowUp'); // [CHANGED] isJustPressed, not isDown
    }

    // ── Horizontal movement ─────────────────────────────────────────────
    // [CHANGED] Set vx directly to the target speed rather than accumulating.
    // This gives immediate, crisp direction changes with no velocity fighting.
    if (moveLeft && !moveRight) {
      this.vx       = -this.speed;
      this.facingRight = false;
    } else if (moveRight && !moveLeft) {
      this.vx       = this.speed;
      this.facingRight = true;
    } else {
      // No key held — apply friction to slide gracefully to a stop.
      // [CHANGED] Friction is only applied here (idle), not on every frame.
      this.vx *= FRICTION;
      if (Math.abs(this.vx) < 0.15) this.vx = 0;
    }

    // Hard clamp (safety net — direct assignment should never exceed this)
    if (this.vx >  MAX_SPEED) this.vx =  MAX_SPEED;
    if (this.vx < -MAX_SPEED) this.vx = -MAX_SPEED;

    // ── Jump ────────────────────────────────────────────────────────────
    // [CHANGED] Uses isJustPressed (rising-edge) so holding the key never
    // auto-repeats. onGround must also be true, same as before.
    if (jumpPressed && this.onGround) {
      this.vy        = this.jumpForce;
      this.onGround  = false;
    }

    // ── Gravity ─────────────────────────────────────────────────────────
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;

    // ── Walk animation counter ──────────────────────────────────────────
    // Unchanged from original
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

    this.eyeBlink = (this.eyeBlink + 1) % 200;

    // ── Collision resolution (axis-separated) ──────────────────────────
    // Unchanged from original — horizontal first, then vertical
    this.x += this.vx;
    this.resolveCollisionX(level);

    this.y += this.vy;
    this.onGround = false;
    this.resolveCollisionY(level);

    // ── Particles ───────────────────────────────────────────────────────
    // Unchanged from original
    this.updateParticles();
    if (Math.abs(this.vx) > 1 || !this.onGround) {
      this.spawnParticle();
    }
  }

  // Unchanged from original — resolves horizontal solid-tile overlap
  resolveCollisionX(level) {
    const tiles    = level.tiles;
    const startCol = Math.floor(this.left  / TILE);
    const endCol   = Math.floor(this.right / TILE);
    const startRow = Math.floor(this.top   / TILE);
    const endRow   = Math.floor(this.bottom / TILE);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const tile = tiles[r]?.[c];
        if (tile === 1 || tile === 10) {
          const tileRect = { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
          if (this.left   < tileRect.x + tileRect.w &&
              this.right  > tileRect.x &&
              this.top    < tileRect.y + tileRect.h &&
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

  // Unchanged from original — resolves vertical solid-tile overlap
  resolveCollisionY(level) {
    const tiles    = level.tiles;
    const startCol = Math.floor(this.left  / TILE);
    const endCol   = Math.floor(this.right / TILE);
    const startRow = Math.floor(this.top   / TILE);
    const endRow   = Math.floor(this.bottom / TILE);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const tile = tiles[r]?.[c];
        if (tile === 1 || tile === 10) {
          const tileRect = { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
          if (this.left   < tileRect.x + tileRect.w &&
              this.right  > tileRect.x &&
              this.top    < tileRect.y + tileRect.h &&
              this.bottom > tileRect.y) {
            if (this.vy > 0) {
              this.y        = tileRect.y - this.h;
              this.vy       = 0;
              this.onGround = true;
            } else if (this.vy < 0) {
              this.y  = tileRect.y + tileRect.h;
              this.vy = 0;
            }
          }
        }
      }
    }
  }

  // Unchanged from original
  spawnParticle() {
    if (Math.random() > 0.3) return;
    this.particles.push({
      x:    this.centerX + (Math.random() - 0.5) * 8,
      y:    this.bottom - 2,
      vx:   (Math.random() - 0.5) * 1.5,
      vy:   -Math.random() * 2 - 0.5,
      life: 1,
      size: Math.random() * 3 + 1,
    });
  }

  // Unchanged from original
  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x   += p.vx;
      p.y   += p.vy;
      p.life -= 0.03;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (this.particles.length > 30) this.particles.splice(0, this.particles.length - 30);
  }

  // Unchanged from original — checks bottom-edge tile for hazard type
  checkHazards(level) {
    const tiles = level.tiles;
    const checkPoints = [
      { x: this.left  + 2, y: this.bottom + 1 },
      { x: this.right - 2, y: this.bottom + 1 },
      { x: this.centerX,   y: this.bottom + 1 },
    ];

    for (const pt of checkPoints) {
      const c = Math.floor(pt.x / TILE);
      const r = Math.floor(pt.y / TILE);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      const tile = tiles[r][c];

      if (tile === 2 && this.type === 'water') return 'lava';
      if (tile === 3 && this.type === 'fire')  return 'water';
      if (tile === 4)                           return 'poison';
    }
    return null;
  }
}

// ── Gem ───────────────────────────────────────────────────────────────────
// Unchanged from original
class Gem extends Entity {
  constructor(x, y, type) {
    super(x, y, 16, 16);
    this.type       = type;
    this.collected  = false;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.sparkles   = [];
  }

  update() {
    this.floatPhase += 0.05;
    if (Math.random() < 0.05) {
      this.sparkles.push({
        x:    this.centerX + (Math.random() - 0.5) * 12,
        y:    this.centerY + (Math.random() - 0.5) * 12,
        life: 1,
        size: Math.random() * 2 + 1,
      });
    }
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      this.sparkles[i].life -= 0.04;
      this.sparkles[i].y    -= 0.3;
      if (this.sparkles[i].life <= 0) this.sparkles.splice(i, 1);
    }
  }
}

// ── Door ─────────────────────────────────────────────────────────────────
// [CHANGED] Added openAmount (0→1) that smoothly lerps toward 1 once
//   open=true is set by game.js. The renderer reads openAmount to animate
//   the door sliding upward and brightening its glow.
//   open is set externally (in game.js) when all matching gems are collected.
class Door extends Entity {
  constructor(x, y, type) {
    super(x, y, 28, 40);
    this.type       = type;
    this.glowPhase  = Math.random() * Math.PI * 2;
    this.open       = false;   // set true by game.js when all gems of this type collected
    this.openAmount = 0;       // 0 = fully closed, 1 = fully open (drives animation)
  }

  update() {
    this.glowPhase += 0.04;
    // Smoothly animate toward open or closed target
    const target = this.open ? 1 : 0;
    this.openAmount += (target - this.openAmount) * 0.07;
  }
}

// ── Button ───────────────────────────────────────────────────────────────
// Unchanged from original
class Button extends Entity {
  constructor(x, y, gateId) {
    super(x, y, 28, 8);
    this.gateId    = gateId;
    this.pressed   = false;
    this.pressAnim = 0;
  }

  checkPress(players) {
    this.pressed = false;
    for (const p of players) {
      if (p.alive && this.overlaps({
        x: p.x, y: p.y, w: p.w, h: p.h,
        get left()   { return this.x; },
        get right()  { return this.x + this.w; },
        get top()    { return this.y; },
        get bottom() { return this.y + this.h; }
      })) {
        this.pressed = true;
      }
    }
    this.pressAnim += (this.pressed ? 1 - this.pressAnim : -this.pressAnim) * 0.2;
  }
}

// ── Gate ─────────────────────────────────────────────────────────────────
// Unchanged from original
class Gate extends Entity {
  constructor(x, y, h, gateId) {
    super(x, y, TILE, h);
    this.gateId     = gateId;
    this.openAmount = 0;
    this.originalY  = y;
    this.originalH  = h;
  }

  update(buttons) {
    const isActive = buttons.some(b => b.gateId === this.gateId && b.pressed);
    const target   = isActive ? 1 : 0;
    this.openAmount += (target - this.openAmount) * 0.08;
    this.y = this.originalY - this.originalH * this.openAmount;
  }
}

// ── Moving Platform ───────────────────────────────────────────────────────
// Unchanged from original
class MovingPlatform extends Entity {
  constructor(x, y, w, dx, dy, speed) {
    super(x, y, w, 12);
    this.startX = x;
    this.startY = y;
    this.dx     = dx;
    this.dy     = dy;
    this.speed  = speed || 0.01;
    this.t      = 0;
    this.prevX  = x;
    this.prevY  = y;
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;
    this.t    += this.speed;
    const ease = (Math.sin(this.t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    this.x = this.startX + this.dx * ease;
    this.y = this.startY + this.dy * ease;
  }

  get deltaX() { return this.x - this.prevX; }
  get deltaY() { return this.y - this.prevY; }

  carryPlayer(player) {
    const onPlatform =
      player.bottom >= this.y - 2 &&
      player.bottom <= this.y + 6 &&
      player.right  >  this.x     &&
      player.left   <  this.right;

    if (onPlatform && player.vy >= 0) {
      player.y      = this.y - player.h;
      player.vy     = 0;
      player.onGround = true;
      player.x     += this.deltaX;
      player.y     += this.deltaY;
    }
  }
}