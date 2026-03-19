// ── renderer.js ── Canvas drawing with temple aesthetic ──
//
// CHANGES FROM ORIGINAL:
//
// [CHANGE 1] drawBackground() — completely reworked.
//   Original: drew three static radial torch glows.
//   New: multi-layer parallax cave — distant stalactites, mid-layer rock
//   formations, animated falling dust motes, flickering wall sconces with
//   lens-flare halos, and a depth-fog gradient overlay. All layers are
//   offset by small fractions of this.time to give independent movement
//   speeds (parallax effect without a camera system).
//
// [CHANGE 2] drawTitleBackground() moved here from game.js as
//   renderer.drawTitleBackground() so the renderer owns all canvas drawing.
//   The original ember loop is kept and expanded with a comet streak layer
//   and a radial spotlight vignette.
//
// All other methods (drawTiles, drawPlayer, drawFireboy, drawWatergirl,
// drawGem, drawDoor, drawButton, drawGate, drawPlatform) are UNCHANGED.

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    canvas.width  = COLS * TILE;
    canvas.height = ROWS * TILE;
    this.time = 0;

    // Pre-build parallax cave geometry once so drawBackground() is cheap.
    // [NEW] Static random arrays replace per-frame Math.random() calls.
    this._stalactites = Array.from({ length: 22 }, () => ({
      x:     Math.random() * canvas.width,
      len:   18 + Math.random() * 55,
      w:     4  + Math.random() * 7,
      speed: 0.3 + Math.random() * 0.7,  // parallax scroll multiplier
      phase: Math.random() * Math.PI * 2,
    }));
    this._stalagmites = Array.from({ length: 18 }, () => ({
      x:     Math.random() * canvas.width,
      len:   14 + Math.random() * 40,
      w:     3  + Math.random() * 6,
      phase: Math.random() * Math.PI * 2,
    }));
    this._dustMotes = Array.from({ length: 70 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     0.6 + Math.random() * 2,
      speed: 0.15 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 0.4,
      alpha: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));

    // Wall sconce positions (in canvas pixels, not tile coords)
    this._sconces = [
      { x: 1.5 * TILE, y: 3.5 * TILE },
      { x: (COLS - 1.5) * TILE, y: 3.5 * TILE },
      { x: 1.5 * TILE, y: 10 * TILE },
      { x: (COLS - 1.5) * TILE, y: 10 * TILE },
    ];

    // Cache gradient textures (unchanged from original)
    this.lavaGrad  = this.ctx.createLinearGradient(0, 0, 0, TILE);
    this.lavaGrad.addColorStop(0, '#ff6600');
    this.lavaGrad.addColorStop(0.5, '#ff3300');
    this.lavaGrad.addColorStop(1, '#cc2200');

    this.waterGrad = this.ctx.createLinearGradient(0, 0, 0, TILE);
    this.waterGrad.addColorStop(0, '#2288ff');
    this.waterGrad.addColorStop(0.5, '#1166dd');
    this.waterGrad.addColorStop(1, '#0044aa');

    this.poisonGrad = this.ctx.createLinearGradient(0, 0, 0, TILE);
    this.poisonGrad.addColorStop(0, '#44cc44');
    this.poisonGrad.addColorStop(0.5, '#22aa22');
    this.poisonGrad.addColorStop(1, '#118811');
  }

  // ── Unchanged ────────────────────────────────────────────────────────────
  clear() {
    this.ctx.fillStyle = '#1a1612';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ── Unchanged ────────────────────────────────────────────────────────────
  drawTiles(tiles) {
    this.time += 0.02;
    const ctx = this.ctx;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = tiles[r][c];
        const x    = c * TILE;
        const y    = r * TILE;

        if (tile === 1 || tile === 10) {
          this.drawStone(x, y, r, c);
        } else if (tile === 2) {
          this.drawLiquid(x, y, '#ff3300', '#ff6600', '#ff9900', r, c);
        } else if (tile === 3) {
          this.drawLiquid(x, y, '#1166dd', '#2288ff', '#44aaff', r, c);
        } else if (tile === 4) {
          this.drawLiquid(x, y, '#22aa22', '#44cc44', '#66ee66', r, c);
        }
      }
    }
  }

  // ── Unchanged ────────────────────────────────────────────────────────────
  drawStone(x, y, r, c) {
    const ctx   = this.ctx;
    const shade = ((r * 7 + c * 13) % 20) - 10;
    const base  = 50 + shade;
    ctx.fillStyle = `rgb(${base + 8}, ${base + 4}, ${base})`;
    ctx.fillRect(x, y, TILE, TILE);

    ctx.strokeStyle = `rgba(0,0,0,0.3)`;
    ctx.lineWidth   = 1;
    if (r % 2 === 0) {
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    } else {
      ctx.strokeRect(x - TILE / 2 + 0.5, y + 0.5, TILE - 1, TILE - 1);
      ctx.strokeRect(x + TILE / 2 + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, y, TILE, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(x, y + TILE - 1, TILE, 1);
  }

  // ── Unchanged ────────────────────────────────────────────────────────────
  drawLiquid(x, y, dark, mid, light, r, c) {
    const ctx  = this.ctx;
    ctx.fillStyle = dark;
    ctx.fillRect(x, y, TILE, TILE);

    const wave = Math.sin(this.time * 3 + c * 0.8) * 3;
    ctx.fillStyle = mid;
    ctx.fillRect(x, y, TILE, TILE / 2 + wave);

    ctx.fillStyle = light;
    const waveTop = Math.sin(this.time * 2 + c * 0.5) * 2;
    ctx.fillRect(x, y + waveTop, TILE, 3);

    if (Math.random() < 0.01) {
      ctx.beginPath();
      ctx.arc(x + Math.random() * TILE, y + Math.random() * TILE * 0.6, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
    }

    const shimmer = Math.sin(this.time * 4 + c * 1.2) * 0.15 + 0.1;
    ctx.fillStyle = `rgba(255,255,255,${shimmer})`;
    ctx.fillRect(x, y, TILE, 2);
  }

  // ────────────────────────────────────────────────────────────────────────
  // [CHANGED] drawBackground — full multi-layer parallax cave atmosphere.
  //
  // Render order (back to front):
  //   1. Deep-cave gradient sky
  //   2. Far stalactites (slow parallax)
  //   3. Mid-layer rock ribs (vertical lines suggesting cave walls)
  //   4. Stalagmites rising from floor
  //   5. Flickering torch sconces with multi-ring glow halos
  //   6. Animated dust motes drifting upward
  //   7. Depth-fog vignette (darkens edges to focus eye on play area)
  // ────────────────────────────────────────────────────────────────────────
  drawBackground() {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    const t   = this.time;

    // ── 1. Deep gradient sky ──────────────────────────────────────────────
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0,    '#0d0b18');  // near-black deep indigo at top
    skyGrad.addColorStop(0.35, '#1a1020');
    skyGrad.addColorStop(0.7,  '#1c1008');  // warmer near the lava floor
    skyGrad.addColorStop(1,    '#200a04');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ── 2. Far stalactites (parallax layer A — slowest) ───────────────────
    ctx.save();
    for (const s of this._stalactites) {
      // Tiny horizontal sway keyed to individual phase — gives life
      const sway = Math.sin(t * 0.08 * s.speed + s.phase) * 1.5;
      const bx   = s.x + sway;

      // Gradient fill: dark tip fading lighter toward base (emulates ambient)
      const stGrad = ctx.createLinearGradient(bx, 0, bx, s.len);
      stGrad.addColorStop(0, 'rgba(38, 28, 18, 0.9)');
      stGrad.addColorStop(1, 'rgba(20, 14, 8, 0.3)');
      ctx.fillStyle = stGrad;

      ctx.beginPath();
      ctx.moveTo(bx - s.w / 2, 0);
      ctx.lineTo(bx + s.w / 2, 0);
      ctx.lineTo(bx + 1,        s.len);
      ctx.lineTo(bx - 1,        s.len);
      ctx.closePath();
      ctx.fill();

      // Thin highlight edge to give stone facet
      ctx.strokeStyle = 'rgba(70,55,35,0.3)';
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(bx - s.w / 4, 0);
      ctx.lineTo(bx,            s.len * 0.85);
      ctx.stroke();
    }
    ctx.restore();

    // ── 3. Mid-layer vertical rock ribs (suggests cave walls receding) ────
    ctx.save();
    const RIB_COUNT = 8;
    for (let i = 0; i < RIB_COUNT; i++) {
      const rx    = (i / RIB_COUNT) * W + ((t * 0.5 + i * 37) % 60) - 30;
      const alpha = 0.03 + Math.abs(Math.sin(t * 0.05 + i)) * 0.03;
      const ribGrad = ctx.createLinearGradient(rx, 0, rx + 12, 0);
      ribGrad.addColorStop(0, `rgba(0,0,0,0)`);
      ribGrad.addColorStop(0.5, `rgba(30,20,10,${alpha})`);
      ribGrad.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = ribGrad;
      ctx.fillRect(rx - 6, 0, 24, H);
    }
    ctx.restore();

    // ── 4. Stalagmites rising from floor ──────────────────────────────────
    ctx.save();
    for (const s of this._stalagmites) {
      const sway  = Math.sin(t * 0.06 + s.phase) * 0.8;
      const baseY = H;
      const bx    = s.x + sway;

      const stGrad = ctx.createLinearGradient(bx, baseY - s.len, bx, baseY);
      stGrad.addColorStop(0, 'rgba(25, 18, 10, 0.2)');
      stGrad.addColorStop(1, 'rgba(40, 28, 14, 0.85)');
      ctx.fillStyle = stGrad;

      ctx.beginPath();
      ctx.moveTo(bx - s.w / 2, baseY);
      ctx.lineTo(bx + s.w / 2, baseY);
      ctx.lineTo(bx + 1,        baseY - s.len);
      ctx.lineTo(bx - 1,        baseY - s.len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ── 5. Wall sconces — flickering torch glow ───────────────────────────
    ctx.save();
    for (const sc of this._sconces) {
      // Per-sconce flicker: unique phase so they don't pulse in sync
      const flicker = 0.75 + Math.sin(t * 7.3 + sc.x * 0.01) * 0.12
                            + Math.sin(t * 13.1 + sc.x * 0.02) * 0.06;

      // Outer soft halo (large, very low alpha)
      const halo = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, 90 * flicker);
      halo.addColorStop(0,   `rgba(255,140,40,${0.08 * flicker})`);
      halo.addColorStop(0.5, `rgba(200,80,10,${0.04 * flicker})`);
      halo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(sc.x - 100, sc.y - 100, 200, 200);

      // Mid glow ring
      const midGlow = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, 40 * flicker);
      midGlow.addColorStop(0,   `rgba(255,180,60,${0.25 * flicker})`);
      midGlow.addColorStop(0.6, `rgba(200,80,10,${0.12 * flicker})`);
      midGlow.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = midGlow;
      ctx.fillRect(sc.x - 50, sc.y - 50, 100, 100);

      // Bright core
      const coreGlow = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, 14 * flicker);
      coreGlow.addColorStop(0,   `rgba(255,230,140,${0.85 * flicker})`);
      coreGlow.addColorStop(0.4, `rgba(255,160,50,${0.5 * flicker})`);
      coreGlow.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = coreGlow;
      ctx.fillRect(sc.x - 20, sc.y - 20, 40, 40);

      // Torch bracket (small dark rectangle on the wall)
      ctx.fillStyle = `rgba(60,40,20,0.8)`;
      ctx.fillRect(sc.x - 4, sc.y - 2, 8, 6);

      // Flame tip (tiny triangle)
      ctx.fillStyle = `rgba(255,200,80,${flicker * 0.9})`;
      ctx.beginPath();
      ctx.moveTo(sc.x,     sc.y - 3);
      ctx.lineTo(sc.x - 3, sc.y + 3);
      ctx.lineTo(sc.x + 3, sc.y + 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ── 6. Dust motes drifting upward ─────────────────────────────────────
    ctx.save();
    for (const m of this._dustMotes) {
      // Advance position (mutate the cached objects — reset when off-screen)
      m.y -= m.speed;
      m.x += Math.sin(t * 0.8 + m.phase) * m.drift;
      if (m.y < -4) {
        m.y = H + 4;
        m.x = Math.random() * W;
      }

      const alpha = m.alpha * (0.6 + Math.sin(t * 1.2 + m.phase) * 0.4);
      ctx.fillStyle = `rgba(200,180,140,${alpha})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ── 7. Depth-fog vignette — darkens edges, focuses eye inward ─────────
    // This layer sits on top of everything else in the background stack.
    ctx.save();
    const vigGrad = ctx.createRadialGradient(
      W / 2, H / 2, H * 0.2,
      W / 2, H / 2, H * 0.9
    );
    vigGrad.addColorStop(0,   'rgba(0,0,0,0)');
    vigGrad.addColorStop(0.6, 'rgba(0,0,0,0.08)');
    vigGrad.addColorStop(1,   'rgba(0,0,0,0.55)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ────────────────────────────────────────────────────────────────────────
  // [NEW] drawTitleBackground — moved from game.js so all canvas drawing
  //   lives in the renderer. Original ember loop is kept and expanded with:
  //   - A radial gradient backdrop (deep cave ambiance)
  //   - Comet/streak layer for a magical feel
  //   - The original ember particles, unchanged
  //   - Vignette overlay
  // ────────────────────────────────────────────────────────────────────────
  drawTitleBackground() {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    const t   = this.time;

    // Deep cave gradient base
    const bg = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, H);
    bg.addColorStop(0,   '#1e1228');
    bg.addColorStop(0.5, '#140e18');
    bg.addColorStop(1,   '#080408');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Comet streaks — thin diagonal lines that glide across
    const COMETS = 12;
    for (let i = 0; i < COMETS; i++) {
      const ct    = (t * 0.4 + i * (1 / COMETS)) % 1;
      const cx    = ct * (W + 200) - 100;
      const cy    = (i / COMETS) * H + Math.sin(t * 0.2 + i) * 30;
      const len   = 60 + Math.sin(i) * 40;
      const alpha = Math.max(0, Math.sin(ct * Math.PI)) * 0.18;
      const col   = i % 2 === 0 ? `rgba(255,120,60,${alpha})` : `rgba(60,140,255,${alpha})`;

      const cGrad = ctx.createLinearGradient(cx - len, cy, cx, cy);
      cGrad.addColorStop(0, 'rgba(0,0,0,0)');
      cGrad.addColorStop(1, col);
      ctx.strokeStyle = cGrad;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - len, cy - len * 0.2);
      ctx.lineTo(cx,        cy);
      ctx.stroke();
    }

    // Original ember particles — kept exactly as in game.js
    for (let i = 0; i < 30; i++) {
      const et    = t + i * 0.7;
      const ex    = (Math.sin(et * 0.3 + i) * 0.5 + 0.5) * W;
      const ey    = H - ((et * 30 + i * 50) % H);
      const esize = Math.sin(et + i) * 1.5 + 2;
      const ealpha = Math.max(0, 1 - ey / H) * 0.4;

      ctx.fillStyle = i % 2 === 0
        ? `rgba(255,107,43,${ealpha})`
        : `rgba(43,164,255,${ealpha})`;
      ctx.beginPath();
      ctx.arc(ex, ey, esize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vignette to frame the title UI
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.8);
    vig.addColorStop(0,   'rgba(0,0,0,0)');
    vig.addColorStop(1,   'rgba(0,0,0,0.65)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // ── All methods below are UNCHANGED from the original ─────────────────

  drawPlayer(player) {
    const ctx = this.ctx;
    const { x, y, w, h, type, facingRight, walkFrame, eyeBlink, onGround, vy } = player;

    ctx.save();

    const glowColor = type === 'fire' ? 'rgba(255,107,43,0.15)' : 'rgba(43,164,255,0.15)';
    const glowRad   = ctx.createRadialGradient(x + w / 2, y + h, 0, x + w / 2, y + h, 25);
    glowRad.addColorStop(0, glowColor);
    glowRad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowRad;
    ctx.fillRect(x - 15, y + h - 15, w + 30, 30);

    const cx   = x + w / 2;
    const flip = facingRight ? 1 : -1;

    ctx.translate(cx, y + h);
    ctx.scale(flip, 1);
    ctx.translate(-cx, -(y + h));

    let scaleX = 1, scaleY = 1;
    if (!onGround && vy < -2) {
      scaleX = 0.85; scaleY = 1.15;
    } else if (!onGround && vy > 2) {
      scaleX = 1.1; scaleY = 0.9;
    }
    const bob = onGround ? Math.sin(walkFrame * Math.PI / 2) * 2 : 0;

    ctx.translate(cx, y + h);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-cx, -(y + h));

    if (type === 'fire') {
      this.drawFireboy(ctx, x, y - bob, w, h);
    } else {
      this.drawWatergirl(ctx, x, y - bob, w, h);
    }

    ctx.restore();
    this.drawPlayerParticles(player);
  }

  drawFireboy(ctx, x, y, w, h) {
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
    bodyGrad.addColorStop(0,   '#ff8844');
    bodyGrad.addColorStop(0.4, '#ff6622');
    bodyGrad.addColorStop(1,   '#cc4400');
    ctx.fillStyle = bodyGrad;

    const bx = x + 1, by = y + 8, bw = w - 2, bh = h - 8;
    ctx.beginPath();
    ctx.moveTo(bx + 3, by);
    ctx.lineTo(bx + bw - 3, by);
    ctx.quadraticCurveTo(bx + bw, by,      bx + bw, by + 3);
    ctx.lineTo(bx + bw, by + bh - 2);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 3, by + bh);
    ctx.lineTo(bx + 3,  by + bh);
    ctx.quadraticCurveTo(bx, by + bh,      bx, by + bh - 2);
    ctx.lineTo(bx, by + 3);
    ctx.quadraticCurveTo(bx, by,           bx + 3, by);
    ctx.fill();

    ctx.fillStyle = '#ff7733';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 7, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const flicker = Math.sin(this.time * 8) * 2;
    ctx.fillStyle  = '#ffaa33';
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 5);
    ctx.quadraticCurveTo(x + w / 2, y - 6 + flicker, x + w - 3, y + 5);
    ctx.fill();

    ctx.fillStyle = '#ffcc44';
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 4);
    ctx.quadraticCurveTo(x + w / 2, y - 3 + flicker * 0.7, x + w - 5, y + 4);
    ctx.fill();

    const blinkH = this.isBlinking(this.time) ? 0.5 : 2.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + 6,  y + 7, 2.5, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 7, 2.5, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!this.isBlinking(this.time)) {
      ctx.fillStyle = '#331100';
      ctx.beginPath();
      ctx.arc(x + 7,  y + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 15, y + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#cc4400';
    ctx.fillRect(x + 3,     y + h - 4, 5, 4);
    ctx.fillRect(x + w - 8, y + h - 4, 5, 4);
  }

  drawWatergirl(ctx, x, y, w, h) {
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
    bodyGrad.addColorStop(0,   '#55bbff');
    bodyGrad.addColorStop(0.4, '#2299ee');
    bodyGrad.addColorStop(1,   '#0066bb');
    ctx.fillStyle = bodyGrad;

    const bx = x + 1, by = y + 8, bw = w - 2, bh = h - 8;
    ctx.beginPath();
    ctx.moveTo(bx + 3, by);
    ctx.lineTo(bx + bw - 3, by);
    ctx.quadraticCurveTo(bx + bw, by,      bx + bw, by + 3);
    ctx.lineTo(bx + bw, by + bh - 2);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 3, by + bh);
    ctx.lineTo(bx + 3,  by + bh);
    ctx.quadraticCurveTo(bx, by + bh,      bx, by + bh - 2);
    ctx.lineTo(bx, by + 3);
    ctx.quadraticCurveTo(bx, by,           bx + 3, by);
    ctx.fill();

    ctx.fillStyle = '#44aaee';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 7, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const wobble = Math.sin(this.time * 4) * 1.5;
    ctx.fillStyle = '#66ccff';
    ctx.beginPath();
    ctx.moveTo(x + w / 2,     y - 5 + wobble);
    ctx.quadraticCurveTo(x + w / 2 - 6, y + 2, x + 3,     y + 5);
    ctx.quadraticCurveTo(x + w / 2,     y + 1, x + w - 3, y + 5);
    ctx.quadraticCurveTo(x + w / 2 + 6, y + 2, x + w / 2, y - 5 + wobble);
    ctx.fill();

    ctx.fillStyle = '#88ddff';
    ctx.beginPath();
    ctx.moveTo(x + w / 2,     y - 2 + wobble * 0.6);
    ctx.quadraticCurveTo(x + w / 2 - 3, y + 3, x + 5,     y + 4);
    ctx.quadraticCurveTo(x + w / 2,     y + 2, x + w - 5, y + 4);
    ctx.quadraticCurveTo(x + w / 2 + 3, y + 3, x + w / 2, y - 2 + wobble * 0.6);
    ctx.fill();

    const blinkH = this.isBlinking(this.time + 1) ? 0.5 : 2.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + 6,  y + 7, 2.5, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 7, 2.5, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!this.isBlinking(this.time + 1)) {
      ctx.fillStyle = '#003366';
      ctx.beginPath();
      ctx.arc(x + 7,  y + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 15, y + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#0066bb';
    ctx.fillRect(x + 3,     y + h - 4, 5, 4);
    ctx.fillRect(x + w - 8, y + h - 4, 5, 4);
  }

  isBlinking(t) {
    return (t * 60) % 200 < 8;
  }

  drawPlayerParticles(player) {
    const ctx = this.ctx;
    for (const p of player.particles) {
      const alpha = p.life * 0.6;
      if (player.type === 'fire') {
        ctx.fillStyle = `rgba(255,${Math.floor(150 * p.life)},${Math.floor(50 * p.life)},${alpha})`;
      } else {
        ctx.fillStyle = `rgba(${Math.floor(100 * p.life)},${Math.floor(180 * p.life)},255,${alpha})`;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGem(gem) {
    if (gem.collected) return;
    const ctx   = this.ctx;
    const float = Math.sin(gem.floatPhase) * 3;
    const cx    = gem.x + gem.w / 2;
    const cy    = gem.y + gem.h / 2 + float;

    const glowColor = gem.type === 'fire'
      ? 'rgba(255,107,43,0.25)'
      : 'rgba(43,164,255,0.25)';
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 20, cy - 20, 40, 40);

    const colors = gem.type === 'fire'
      ? ['#ff6b2b', '#ff9a5c', '#ffcc88']
      : ['#2ba4ff', '#5cc3ff', '#88ddff'];

    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.moveTo(cx,      cy - 8);
    ctx.lineTo(cx + 7,  cy);
    ctx.lineTo(cx,      cy + 8);
    ctx.lineTo(cx - 7,  cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors[2];
    ctx.beginPath();
    ctx.moveTo(cx,      cy - 6);
    ctx.lineTo(cx + 3,  cy - 1);
    ctx.lineTo(cx,      cy + 1);
    ctx.lineTo(cx - 3,  cy - 1);
    ctx.closePath();
    ctx.fill();

    for (const s of gem.sparkles) {
      ctx.fillStyle = `rgba(255,255,255,${s.life * 0.8})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y + float, s.size * s.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // [CHANGED] drawDoor now reads door.open and door.openAmount to show three
  //   distinct visual states:
  //
  //   LOCKED  (open=false, openAmount≈0)
  //     - Dark, desaturated interior — visually "shut"
  //     - Faint glow so players can find the door
  //     - Lock bar drawn across the middle of the doorway
  //     - X mark instead of element emoji
  //
  //   OPENING  (open=true, 0 < openAmount < 1)
  //     - Interior brightens as openAmount rises
  //     - Lock bar slides upward out of the doorway (clipped by openAmount)
  //     - Glow expands and intensifies
  //
  //   OPEN  (open=true, openAmount≈1)
  //     - Full bright interior with a radiant inner glow
  //     - Lock bar gone, element emoji visible
  //     - Pulsing outer halo signals "enter here"
  drawDoor(door) {
    const ctx = this.ctx;
    const { x, y, w, h, type, glowPhase, open, openAmount } = door;

    const isFire    = type === 'fire';
    const frameCol  = isFire ? '#553320' : '#203355';

    // ── Outer glow — expands and brightens as door opens ──────────────────
    // Locked: faint pulse. Open: strong, wide halo.
    const basePulse  = Math.sin(glowPhase) * 0.1 + 0.15;
    const openPulse  = Math.sin(glowPhase * 1.5) * 0.2 + 0.55;
    const pulseAlpha = basePulse + (openPulse - basePulse) * openAmount;
    const glowRadius = 30 + openAmount * 30;   // grows from 30 → 60 as door opens

    const glowColor  = isFire
      ? `rgba(255,107,43,${pulseAlpha})`
      : `rgba(43,164,255,${pulseAlpha})`;
    const glow = ctx.createRadialGradient(
      x + w / 2, y + h / 2, 0,
      x + w / 2, y + h / 2, glowRadius
    );
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - glowRadius, y - glowRadius, w + glowRadius * 2, h + glowRadius * 2);

    // ── Door frame ─────────────────────────────────────────────────────────
    ctx.fillStyle = frameCol;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

    // ── Door interior — dark when locked, bright when open ────────────────
    // Interpolate between a muted locked colour and the full open colour.
    const doorGrad = ctx.createLinearGradient(x, y, x, y + h);
    if (isFire) {
      // Locked: dim brown-orange. Open: vivid flame orange.
      const topLocked  = `rgba(120, 55, 20, 1)`;
      const topOpen    = `rgba(255, 136, 68, 1)`;
      const botLocked  = `rgba(80, 30, 5, 1)`;
      const botOpen    = `rgba(204, 68, 0, 1)`;
      // Use openAmount to pick the stop colours by mixing via global alpha trick
      ctx.globalAlpha = 1;
      doorGrad.addColorStop(0, topLocked);
      doorGrad.addColorStop(1, botLocked);
      ctx.fillStyle = doorGrad;
      ctx.fillRect(x, y, w, h);
      // Overlay the bright open colours at openAmount opacity
      const brightGrad = ctx.createLinearGradient(x, y, x, y + h);
      brightGrad.addColorStop(0, topOpen);
      brightGrad.addColorStop(1, botOpen);
      ctx.fillStyle = brightGrad;
      ctx.globalAlpha = openAmount;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    } else {
      const topLocked = `rgba(25, 55, 120, 1)`;
      const topOpen   = `rgba(68, 136, 255, 1)`;
      const botLocked = `rgba(10, 30, 80, 1)`;
      const botOpen   = `rgba(0, 68, 204, 1)`;
      doorGrad.addColorStop(0, topLocked);
      doorGrad.addColorStop(1, botLocked);
      ctx.fillStyle = doorGrad;
      ctx.fillRect(x, y, w, h);
      const brightGrad = ctx.createLinearGradient(x, y, x, y + h);
      brightGrad.addColorStop(0, topOpen);
      brightGrad.addColorStop(1, botOpen);
      ctx.fillStyle = brightGrad;
      ctx.globalAlpha = openAmount;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }

    // ── Inner radiant glow (only visible when open) ────────────────────────
    if (openAmount > 0.05) {
      const innerColor = isFire ? 'rgba(255,200,100,' : 'rgba(150,210,255,';
      const innerGlow  = ctx.createRadialGradient(
        x + w / 2, y + h * 0.4, 0,
        x + w / 2, y + h * 0.4, w * 0.9
      );
      innerGlow.addColorStop(0, innerColor + (0.55 * openAmount) + ')');
      innerGlow.addColorStop(1, innerColor + '0)');
      ctx.fillStyle = innerGlow;
      ctx.fillRect(x, y, w, h);
    }

    // ── Arch top (frame detail) ────────────────────────────────────────────
    ctx.fillStyle = frameCol;
    ctx.beginPath();
    ctx.moveTo(x - 2,     y + 8);
    ctx.quadraticCurveTo(x + w / 2, y - 8, x + w + 2, y + 8);
    ctx.lineTo(x + w + 2, y);
    ctx.lineTo(x - 2,     y);
    ctx.closePath();
    ctx.fill();

    // Inner arch
    ctx.fillStyle = isFire ? '#ffaa66' : '#66aaff';
    ctx.globalAlpha = 0.4 + openAmount * 0.6;   // dim when locked, full when open
    ctx.beginPath();
    ctx.moveTo(x + 2,     y + 10);
    ctx.quadraticCurveTo(x + w / 2, y - 2, x + w - 2, y + 10);
    ctx.lineTo(x + w - 2, y + h);
    ctx.lineTo(x + 2,     y + h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Lock bar — slides upward out of doorway as the door opens ──────────
    // When fully locked: a horizontal bar covers the middle third of the door.
    // As openAmount rises the bar rises out of frame, disappearing at openAmount=1.
    const lockBarH  = 6;
    const lockBarY  = y + h * 0.55 - openAmount * (h + lockBarH + 10);
    if (lockBarY < y + h && lockBarY + lockBarH > y) {
      // Clip drawing so the bar doesn't spill outside the door rect
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x + 2, lockBarY, w - 4, lockBarH);
      // Keyhole circle
      const ky = lockBarY + lockBarH / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(x + w / 2, ky, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Status symbol — X when locked, element emoji when open ────────────
    ctx.font      = '14px serif';
    ctx.textAlign = 'center';
    if (open) {
      ctx.globalAlpha = openAmount;
      ctx.fillText(isFire ? '🔥' : '💧', x + w / 2, y + h * 0.65);
      ctx.globalAlpha = 1;
    } else {
      // Greyed-out X to signal "not yet"
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font      = 'bold 13px sans-serif';
      ctx.fillText('✕', x + w / 2, y + h * 0.65);
    }
  }

  drawButton(button) {
    const ctx = this.ctx;
    const { x, y, w, h, pressed, pressAnim } = button;
    const pressedY = y + pressAnim * 4;

    ctx.fillStyle = '#555';
    ctx.fillRect(x - 2, y + h - 2, w + 4, 6);

    ctx.fillStyle = pressed ? '#cc8800' : '#aa7700';
    ctx.fillRect(x, pressedY, w, h - pressAnim * 4);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, pressedY, w, 2);
  }

  drawGate(gate) {
    const ctx = this.ctx;
    if (gate.openAmount > 0.95) return;

    const drawH = gate.originalH * (1 - gate.openAmount);
    const drawY = gate.originalY;

    ctx.fillStyle = '#665544';
    ctx.fillRect(gate.x, drawY, gate.w, drawH);

    ctx.strokeStyle = '#887766';
    ctx.lineWidth   = 2;
    for (let i = 4; i < gate.w; i += 8) {
      ctx.beginPath();
      ctx.moveTo(gate.x + i, drawY);
      ctx.lineTo(gate.x + i, drawY + drawH);
      ctx.stroke();
    }

    ctx.strokeStyle = '#776655';
    for (let j = 8; j < drawH; j += 16) {
      ctx.beginPath();
      ctx.moveTo(gate.x,           drawY + j);
      ctx.lineTo(gate.x + gate.w,  drawY + j);
      ctx.stroke();
    }
  }

  drawPlatform(platform) {
    const ctx = this.ctx;
    const { x, y, w, h } = platform;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 2, y + 3, w, h);

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0,   '#888070');
    grad.addColorStop(0.5, '#6a6258');
    grad.addColorStop(1,   '#555048');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w, 2);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x, y + h - 2, w, 2);

    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(x + 5,     y + h / 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w - 5, y + h / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}