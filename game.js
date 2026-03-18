// ── game.js ── Main game loop and state management ──

(function () {
  const canvas = document.getElementById('gameCanvas');
  const renderer = new Renderer(canvas);
  const input = new InputManager();

  // UI elements
  const titleScreen = document.getElementById('title-screen');
  const levelSelect = document.getElementById('level-select');
  const hud = document.getElementById('hud');
  const winScreen = document.getElementById('win-screen');
  const deathScreen = document.getElementById('death-screen');
  const fireGemsEl = document.getElementById('fire-gems');
  const waterGemsEl = document.getElementById('water-gems');
  const levelNameEl = document.getElementById('level-name');
  const timerEl = document.getElementById('timer');

  let state = 'title'; // title, playing, win, dead
  let currentLevel = 0;
  let fireboy, watergirl;
  let gems, doors, buttons, gates, platforms;
  let startTime, elapsedTime;

  // ── Build level select ──
  const levelGrid = document.getElementById('level-grid');
  LEVELS.forEach((lvl, i) => {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.textContent = i + 1;
    btn.title = lvl.name;
    btn.addEventListener('click', () => {
      currentLevel = i;
      startLevel(i);
    });
    levelGrid.appendChild(btn);
  });

  // ── Button handlers ──
  document.getElementById('startBtn').addEventListener('click', () => {
    currentLevel = 0;
    startLevel(0);
  });

  document.getElementById('levelSelectBtn').addEventListener('click', () => {
    titleScreen.classList.add('hidden');
    levelSelect.classList.remove('hidden');
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    levelSelect.classList.add('hidden');
    titleScreen.classList.remove('hidden');
  });

  document.getElementById('nextLevelBtn').addEventListener('click', () => {
    currentLevel++;
    if (currentLevel >= LEVELS.length) {
      currentLevel = 0;
      showTitle();
    } else {
      startLevel(currentLevel);
    }
  });

  document.getElementById('menuBtn').addEventListener('click', showTitle);
  document.getElementById('retryBtn').addEventListener('click', () => startLevel(currentLevel));

  function showTitle() {
    state = 'title';
    titleScreen.classList.remove('hidden');
    levelSelect.classList.add('hidden');
    hud.classList.add('hidden');
    winScreen.classList.add('hidden');
    deathScreen.classList.add('hidden');
  }

  function startLevel(idx) {
    const lvl = LEVELS[idx];

    // Hide all UI, show HUD
    titleScreen.classList.add('hidden');
    levelSelect.classList.add('hidden');
    winScreen.classList.add('hidden');
    deathScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    levelNameEl.textContent = lvl.name;

    // Create players
    fireboy = new Player(lvl.fireStart.x, lvl.fireStart.y, 'fire');
    watergirl = new Player(lvl.waterStart.x, lvl.waterStart.y, 'water');

    // Create gems
    gems = lvl.gems.map(g => new Gem(g.x, g.y, g.type));

    // Create doors
    doors = [
      new Door(lvl.fireDoor.x, lvl.fireDoor.y, 'fire'),
      new Door(lvl.waterDoor.x, lvl.waterDoor.y, 'water'),
    ];

    // Create buttons & gates
    buttons = (lvl.buttons || []).map(b => new Button(b.x, b.y, b.gateId));
    gates = (lvl.gates || []).map(g => new Gate(g.x, g.y, g.h, g.gateId));

    // Create platforms
    platforms = (lvl.platforms || []).map(p =>
      new MovingPlatform(p.x, p.y, p.w, p.dx, p.dy, p.speed)
    );

    startTime = Date.now();
    state = 'playing';
  }

  // ── Game Loop ──
  function update() {
    if (state !== 'playing') return;

    const lvl = LEVELS[currentLevel];

    // Update players
    fireboy.update(input, lvl);
    watergirl.update(input, lvl);

    // Platforms
    for (const plat of platforms) {
      plat.update();
      plat.carryPlayer(fireboy);
      plat.carryPlayer(watergirl);
    }

    // Buttons & gates
    for (const btn of buttons) {
      btn.checkPress([fireboy, watergirl]);
    }
    for (const gate of gates) {
      gate.update(buttons);
    }

    // Gem collection
    for (const gem of gems) {
      gem.update();
      if (gem.collected) continue;

      if (gem.type === 'fire' && overlapsEntity(fireboy, gem)) {
        gem.collected = true;
        fireboy.gems++;
      }
      if (gem.type === 'water' && overlapsEntity(watergirl, gem)) {
        gem.collected = true;
        watergirl.gems++;
      }
    }

    // Door check
    const fireDoor = doors.find(d => d.type === 'fire');
    const waterDoor = doors.find(d => d.type === 'water');
    fireDoor.update();
    waterDoor.update();

    fireboy.atDoor = overlapsEntity(fireboy, fireDoor);
    watergirl.atDoor = overlapsEntity(watergirl, waterDoor);

    // Win condition
    if (fireboy.atDoor && watergirl.atDoor) {
      winLevel();
      return;
    }

    // Hazard check
    const fireHazard = fireboy.checkHazards(lvl);
    const waterHazard = watergirl.checkHazards(lvl);

    if (fireHazard) {
      die(fireHazard === 'water'
        ? 'Fireboy fell in water!'
        : 'Fireboy touched poison!');
      return;
    }
    if (waterHazard) {
      die(waterHazard === 'lava'
        ? 'Watergirl fell in lava!'
        : 'Watergirl touched poison!');
      return;
    }

    // Out of bounds
    if (fireboy.y > ROWS * TILE + 50 || watergirl.y > ROWS * TILE + 50) {
      die('A player fell out of the level!');
      return;
    }

    // Timer
    elapsedTime = Date.now() - startTime;
    const secs = Math.floor(elapsedTime / 1000);
    const mins = Math.floor(secs / 60);
    timerEl.textContent = `${mins}:${String(secs % 60).padStart(2, '0')}`;
    fireGemsEl.textContent = fireboy.gems;
    waterGemsEl.textContent = watergirl.gems;
  }

  function render() {
    renderer.clear();

    if (state === 'title' || state === 'levelselect') {
      drawTitleBackground();
      return;
    }

    const lvl = LEVELS[currentLevel];

    renderer.drawBackground();
    renderer.drawTiles(lvl.tiles);

    // Doors (behind players)
    for (const door of doors) renderer.drawDoor(door);

    // Gates
    for (const gate of gates) renderer.drawGate(gate);

    // Platforms
    for (const plat of platforms) renderer.drawPlatform(plat);

    // Buttons
    for (const btn of buttons) renderer.drawButton(btn);

    // Gems
    for (const gem of gems) renderer.drawGem(gem);

    // Players
    renderer.drawPlayer(fireboy);
    renderer.drawPlayer(watergirl);
  }

  function drawTitleBackground() {
    const ctx = renderer.ctx;
    renderer.clear();

    // Animated embers
    renderer.time += 0.01;
    for (let i = 0; i < 30; i++) {
      const t = renderer.time + i * 0.7;
      const x = (Math.sin(t * 0.3 + i) * 0.5 + 0.5) * canvas.width;
      const y = canvas.height - ((t * 30 + i * 50) % canvas.height);
      const size = Math.sin(t + i) * 1.5 + 2;
      const alpha = Math.max(0, 1 - y / canvas.height) * 0.4;

      ctx.fillStyle = i % 2 === 0
        ? `rgba(255,107,43,${alpha})`
        : `rgba(43,164,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function winLevel() {
    state = 'win';
    hud.classList.add('hidden');
    winScreen.classList.remove('hidden');

    const secs = Math.floor(elapsedTime / 1000);
    const mins = Math.floor(secs / 60);
    document.getElementById('win-time').textContent =
      `${mins}:${String(secs % 60).padStart(2, '0')}`;
    document.getElementById('win-fire').textContent = fireboy.gems;
    document.getElementById('win-water').textContent = watergirl.gems;
  }

  function die(msg) {
    state = 'dead';
    hud.classList.add('hidden');
    deathScreen.classList.remove('hidden');
    document.getElementById('death-msg').textContent = msg;
  }

  function overlapsEntity(a, b) {
    return a.left < b.right &&
           a.right > b.left &&
           a.top < b.bottom &&
           a.bottom > b.top;
  }

  function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
  }

  // Start!
  gameLoop();
})();
