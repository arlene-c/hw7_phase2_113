// ── renderer.js ── Canvas drawing with temple aesthetic ──

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = COLS * TILE;
    canvas.height = ROWS * TILE;
    this.time = 0;

    // Cache gradient textures
    this.lavaGrad = this.ctx.createLinearGradient(0, 0, 0, TILE);
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

  clear() {
    this.ctx.fillStyle = '#1a1612';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawTiles(tiles) {
    this.time += 0.02;
    const ctx = this.ctx;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = tiles[r][c];
        const x = c * TILE;
        const y = r * TILE;

        if (tile === 1 || tile === 10) {
          // Stone wall
          this.drawStone(x, y, r, c);
        } else if (tile === 2) {
          // Lava
          this.drawLiquid(x, y, '#ff3300', '#ff6600', '#ff9900', r, c);
        } else if (tile === 3) {
          // Water
          this.drawLiquid(x, y, '#1166dd', '#2288ff', '#44aaff', r, c);
        } else if (tile === 4) {
          // Poison
          this.drawLiquid(x, y, '#22aa22', '#44cc44', '#66ee66', r, c);
        }
      }
    }
  }

  drawStone(x, y, r, c) {
    const ctx = this.ctx;
    // Base stone
    const shade = ((r * 7 + c * 13) % 20) - 10;
    const base = 50 + shade;
    ctx.fillStyle = `rgb(${base + 8}, ${base + 4}, ${base})`;
    ctx.fillRect(x, y, TILE, TILE);

    // Brick pattern
    ctx.strokeStyle = `rgba(0,0,0,0.3)`;
    ctx.lineWidth = 1;
    if (r % 2 === 0) {
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    } else {
      ctx.strokeRect(x - TILE / 2 + 0.5, y + 0.5, TILE - 1, TILE - 1);
      ctx.strokeRect(x + TILE / 2 + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }

    // Edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, y, TILE, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(x, y + TILE - 1, TILE, 1);
  }

  drawLiquid(x, y, dark, mid, light, r, c) {
    const ctx = this.ctx;
    ctx.fillStyle = dark;
    ctx.fillRect(x, y, TILE, TILE);

    // Animated surface wave
    const wave = Math.sin(this.time * 3 + c * 0.8) * 3;
    ctx.fillStyle = mid;
    ctx.fillRect(x, y, TILE, TILE / 2 + wave);

    // Glow on top
    ctx.fillStyle = light;
    const waveTop = Math.sin(this.time * 2 + c * 0.5) * 2;
    ctx.fillRect(x, y + waveTop, TILE, 3);

    // Bubbles
    if (Math.random() < 0.01) {
      ctx.beginPath();
      ctx.arc(x + Math.random() * TILE, y + Math.random() * TILE * 0.6, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
    }

    // Surface shimmer
    const shimmer = Math.sin(this.time * 4 + c * 1.2) * 0.15 + 0.1;
    ctx.fillStyle = `rgba(255,255,255,${shimmer})`;
    ctx.fillRect(x, y, TILE, 2);
  }

  drawPlayer(player) {
    const ctx = this.ctx;
    const { x, y, w, h, type, facingRight, walkFrame, eyeBlink, onGround, vy } = player;

    ctx.save();

    // Glow underneath
    const glowColor = type === 'fire' ? 'rgba(255,107,43,0.15)' : 'rgba(43,164,255,0.15)';
    const glowRad = ctx.createRadialGradient(x + w / 2, y + h, 0, x + w / 2, y + h, 25);
    glowRad.addColorStop(0, glowColor);
    glowRad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowRad;
    ctx.fillRect(x - 15, y + h - 15, w + 30, 30);

    const cx = x + w / 2;
    const flip = facingRight ? 1 : -1;

    ctx.translate(cx, y + h);
    ctx.scale(flip, 1);
    ctx.translate(-cx, -(y + h));

    // Squash & stretch
    let scaleX = 1, scaleY = 1;
    if (!onGround && vy < -2) {
      scaleX = 0.85;
      scaleY = 1.15;
    } else if (!onGround && vy > 2) {
      scaleX = 1.1;
      scaleY = 0.9;
    }
    // Walk bob
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

    // Draw particles
    this.drawPlayerParticles(player);
  }

  drawFireboy(ctx, x, y, w, h) {
    // Body
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
    bodyGrad.addColorStop(0, '#ff8844');
    bodyGrad.addColorStop(0.4, '#ff6622');
    bodyGrad.addColorStop(1, '#cc4400');
    ctx.fillStyle = bodyGrad;

    // Rounded body
    const bx = x + 1, by = y + 8, bw = w - 2, bh = h - 8;
    ctx.beginPath();
    ctx.moveTo(bx + 3, by);
    ctx.lineTo(bx + bw - 3, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 3);
    ctx.lineTo(bx + bw, by + bh - 2);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 3, by + bh);
    ctx.lineTo(bx + 3, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 2);
    ctx.lineTo(bx, by + 3);
    ctx.quadraticCurveTo(bx, by, bx + 3, by);
    ctx.fill();

    // Head (flame-like)
    ctx.fillStyle = '#ff7733';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 7, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flame hair
    const flicker = Math.sin(this.time * 8) * 2;
    ctx.fillStyle = '#ffaa33';
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 5);
    ctx.quadraticCurveTo(x + w / 2, y - 6 + flicker, x + w - 3, y + 5);
    ctx.fill();

    ctx.fillStyle = '#ffcc44';
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 4);
    ctx.quadraticCurveTo(x + w / 2, y - 3 + flicker * 0.7, x + w - 5, y + 4);
    ctx.fill();

    // Eyes
    const blinkH = this.isBlinking(this.time) ? 0.5 : 2.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 7, 2.5, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 7, 2.5, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    if (!this.isBlinking(this.time)) {
      ctx.fillStyle = '#331100';
      ctx.beginPath();
      ctx.arc(x + 7, y + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 15, y + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Legs
    ctx.fillStyle = '#cc4400';
    ctx.fillRect(x + 3, y + h - 4, 5, 4);
    ctx.fillRect(x + w - 8, y + h - 4, 5, 4);
  }

  drawWatergirl(ctx, x, y, w, h) {
    // Body
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
    bodyGrad.addColorStop(0, '#55bbff');
    bodyGrad.addColorStop(0.4, '#2299ee');
    bodyGrad.addColorStop(1, '#0066bb');
    ctx.fillStyle = bodyGrad;

    const bx = x + 1, by = y + 8, bw = w - 2, bh = h - 8;
    ctx.beginPath();
    ctx.moveTo(bx + 3, by);
    ctx.lineTo(bx + bw - 3, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 3);
    ctx.lineTo(bx + bw, by + bh - 2);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 3, by + bh);
    ctx.lineTo(bx + 3, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 2);
    ctx.lineTo(bx, by + 3);
    ctx.quadraticCurveTo(bx, by, bx + 3, by);
    ctx.fill();

    // Head
    ctx.fillStyle = '#44aaee';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 7, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water droplet hair
    const wobble = Math.sin(this.time * 4) * 1.5;
    ctx.fillStyle = '#66ccff';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - 5 + wobble);
    ctx.quadraticCurveTo(x + w / 2 - 6, y + 2, x + 3, y + 5);
    ctx.quadraticCurveTo(x + w / 2, y + 1, x + w - 3, y + 5);
    ctx.quadraticCurveTo(x + w / 2 + 6, y + 2, x + w / 2, y - 5 + wobble);
    ctx.fill();

    ctx.fillStyle = '#88ddff';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - 2 + wobble * 0.6);
    ctx.quadraticCurveTo(x + w / 2 - 3, y + 3, x + 5, y + 4);
    ctx.quadraticCurveTo(x + w / 2, y + 2, x + w - 5, y + 4);
    ctx.quadraticCurveTo(x + w / 2 + 3, y + 3, x + w / 2, y - 2 + wobble * 0.6);
    ctx.fill();

    // Eyes
    const blinkH = this.isBlinking(this.time + 1) ? 0.5 : 2.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 7, 2.5, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 7, 2.5, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!this.isBlinking(this.time + 1)) {
      ctx.fillStyle = '#003366';
      ctx.beginPath();
      ctx.arc(x + 7, y + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 15, y + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Legs
    ctx.fillStyle = '#0066bb';
    ctx.fillRect(x + 3, y + h - 4, 5, 4);
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
    const ctx = this.ctx;
    const float = Math.sin(gem.floatPhase) * 3;
    const cx = gem.x + gem.w / 2;
    const cy = gem.y + gem.h / 2 + float;

    // Glow
    const glowColor = gem.type === 'fire'
      ? 'rgba(255,107,43,0.25)'
      : 'rgba(43,164,255,0.25)';
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 20, cy - 20, 40, 40);

    // Diamond shape
    const colors = gem.type === 'fire'
      ? ['#ff6b2b', '#ff9a5c', '#ffcc88']
      : ['#2ba4ff', '#5cc3ff', '#88ddff'];

    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 7, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 7, cy);
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.fillStyle = colors[2];
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 3, cy - 1);
    ctx.lineTo(cx, cy + 1);
    ctx.lineTo(cx - 3, cy - 1);
    ctx.closePath();
    ctx.fill();

    // Sparkles
    for (const s of gem.sparkles) {
      ctx.fillStyle = `rgba(255,255,255,${s.life * 0.8})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y + float, s.size * s.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDoor(door) {
    const ctx = this.ctx;
    const { x, y, w, h, type, glowPhase } = door;

    // Door glow
    const pulse = Math.sin(glowPhase) * 0.15 + 0.3;
    const color = type === 'fire'
      ? `rgba(255,107,43,${pulse})`
      : `rgba(43,164,255,${pulse})`;

    const glow = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, 35);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 20, y - 20, w + 40, h + 40);

    // Door frame
    ctx.fillStyle = type === 'fire' ? '#553320' : '#203355';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

    // Door interior
    const doorGrad = ctx.createLinearGradient(x, y, x, y + h);
    if (type === 'fire') {
      doorGrad.addColorStop(0, '#ff8844');
      doorGrad.addColorStop(1, '#cc4400');
    } else {
      doorGrad.addColorStop(0, '#4488ff');
      doorGrad.addColorStop(1, '#0044cc');
    }
    ctx.fillStyle = doorGrad;
    ctx.fillRect(x, y, w, h);

    // Arch top
    ctx.fillStyle = type === 'fire' ? '#553320' : '#203355';
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 8);
    ctx.quadraticCurveTo(x + w / 2, y - 8, x + w + 2, y + 8);
    ctx.lineTo(x + w + 2, y);
    ctx.lineTo(x - 2, y);
    ctx.closePath();
    ctx.fill();

    // Inner arch
    if (type === 'fire') {
      ctx.fillStyle = '#ffaa66';
    } else {
      ctx.fillStyle = '#66aaff';
    }
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 10);
    ctx.quadraticCurveTo(x + w / 2, y - 2, x + w - 2, y + 10);
    ctx.lineTo(x + w - 2, y + h);
    ctx.lineTo(x + 2, y + h);
    ctx.closePath();
    ctx.fill();

    // Symbol
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText(type === 'fire' ? '🔥' : '💧', x + w / 2, y + h / 2 + 5);
  }

  drawButton(button) {
    const ctx = this.ctx;
    const { x, y, w, h, pressed, pressAnim } = button;
    const pressedY = y + pressAnim * 4;

    // Base plate
    ctx.fillStyle = '#555';
    ctx.fillRect(x - 2, y + h - 2, w + 4, 6);

    // Button top
    ctx.fillStyle = pressed ? '#cc8800' : '#aa7700';
    ctx.fillRect(x, pressedY, w, h - pressAnim * 4);

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, pressedY, w, 2);
  }

  drawGate(gate) {
    const ctx = this.ctx;
    if (gate.openAmount > 0.95) return; // fully open

    const drawH = gate.originalH * (1 - gate.openAmount);
    const drawY = gate.originalY;

    ctx.fillStyle = '#665544';
    ctx.fillRect(gate.x, drawY, gate.w, drawH);

    // Bars
    ctx.strokeStyle = '#887766';
    ctx.lineWidth = 2;
    for (let i = 4; i < gate.w; i += 8) {
      ctx.beginPath();
      ctx.moveTo(gate.x + i, drawY);
      ctx.lineTo(gate.x + i, drawY + drawH);
      ctx.stroke();
    }

    // Cross bars
    ctx.strokeStyle = '#776655';
    for (let j = 8; j < drawH; j += 16) {
      ctx.beginPath();
      ctx.moveTo(gate.x, drawY + j);
      ctx.lineTo(gate.x + gate.w, drawY + j);
      ctx.stroke();
    }
  }

  drawPlatform(platform) {
    const ctx = this.ctx;
    const { x, y, w, h } = platform;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 2, y + 3, w, h);

    // Platform body
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#888070');
    grad.addColorStop(0.5, '#6a6258');
    grad.addColorStop(1, '#555048');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w, 2);

    // Edge marks
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x, y + h - 2, w, 2);

    // Rivets
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(x + 5, y + h / 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w - 5, y + h / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBackground() {
    const ctx = this.ctx;
    // Ambient torch glow
    const torchPositions = [
      { x: 2 * TILE, y: 4 * TILE },
      { x: 27 * TILE, y: 4 * TILE },
      { x: 14 * TILE, y: 2 * TILE },
    ];

    for (const torch of torchPositions) {
      const flicker = Math.sin(this.time * 6 + torch.x) * 5 + 30;
      const glow = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, flicker + 40);
      glow.addColorStop(0, 'rgba(255,150,50,0.06)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(torch.x - 80, torch.y - 80, 160, 160);
    }
  }
}
