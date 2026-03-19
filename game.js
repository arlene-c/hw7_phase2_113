// ── game.js ── Main game loop and state management ──
//
// CHANGES FROM ORIGINAL:
//
// [CHANGE 1] drawTitleBackground() removed from this file.
//   It has been moved to renderer.drawTitleBackground() so all canvas
//   drawing lives in the Renderer class. The call site in render() is
//   updated accordingly — everything else is unchanged.
//
// [CHANGE 2] renderer.time is now incremented in the game loop (render())
//   rather than inside drawTitleBackground(), so the animation clock
//   advances correctly in all states.

(function () {
  const canvas   = document.getElementById('gameCanvas');
  const renderer = new Renderer(canvas);
  const input    = new InputManager();

  // UI elements (unchanged)
  const titleScreen = document.getElementById('title-screen');
  const levelSelect = document.getElementById('level-select');
  const hud         = document.getElementById('hud');
  const winScreen   = document.getElementById('win-screen');
  const deathScreen = document.getElementById('death-screen');
  const fireGemsEl  = document.getElementById('fire-gems');
  const waterGemsEl = document.getElementById('water-gems');
  const levelNameEl = document.getElementById('level-name');
  const timerEl     = document.getElementById('timer');

  let state        = 'title';
  let currentLevel = 0;
  let fireboy, watergirl;
  let gems, doors, buttons, gates, platforms;
  let startTime, elapsedTime;

  // ── Build level select (unchanged) ───────────────────────────────────────
  const levelGrid = document.getElementById('level-grid');
  LEVELS.forEach((lvl, i) => {
    const btn       = document.createElement('button');
    btn.className   = 'level-btn';
    btn.textContent = i + 1;
    btn.title       = lvl.name;
    btn.addEventListener('click', () => {
      currentLevel = i;
      startLevel(i);
    });
    levelGrid.appendChild(btn);
  });

  // ── Button handlers (unchanged) ──────────────────────────────────────────
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

  // ── startLevel (unchanged) ────────────────────────────────────────────────
  function startLevel(idx) {
    const lvl = LEVELS[idx];

    titleScreen.classList.add('hidden');
    levelSelect.classList.add('hidden');
    winScreen.classList.add('hidden');
    deathScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    levelNameEl.textContent = lvl.name;

    fireboy   = new Player(lvl.fireStart.x,  lvl.fireStart.y,  'fire');
    watergirl = new Player(lvl.waterStart.x, lvl.waterStart.y, 'water');

    gems  = lvl.gems.map(g    => new Gem(g.x, g.y, g.type));
    doors = [
      new Door(lvl.fireDoor.x,  lvl.fireDoor.y,  'fire'),
      new Door(lvl.waterDoor.x, lvl.waterDoor.y, 'water'),
    ];
    buttons   = (lvl.buttons   || []).map(b => new Button(b.x, b.y, b.gateId));
    gates     = (lvl.gates     || []).map(g => new Gate(g.x, g.y, g.h, g.gateId));
    platforms = (lvl.platforms || []).map(p =>
      new MovingPlatform(p.x, p.y, p.w, p.dx, p.dy, p.speed)
    );

    startTime = Date.now();
    state     = 'playing';
  }

  // ── update (unchanged) ────────────────────────────────────────────────────
  function update() {
    if (state !== 'playing') return;

    const lvl = LEVELS[currentLevel];

    fireboy.update(input, lvl);
    watergirl.update(input, lvl);

    for (const plat of platforms) {
      plat.update();
      plat.carryPlayer(fireboy);
      plat.carryPlayer(watergirl);
    }

    for (const btn of buttons)  btn.checkPress([fireboy, watergirl]);
    for (const gate of gates)   gate.update(buttons);

    for (const gem of gems) {
      gem.update();
      if (gem.collected) continue;
      if (gem.type === 'fire'  && overlapsEntity(fireboy,   gem)) { gem.collected = true; fireboy.gems++;   }
      if (gem.type === 'water' && overlapsEntity(watergirl, gem)) { gem.collected = true; watergirl.gems++; }
    }

    const fireDoor  = doors.find(d => d.type === 'fire');
    const waterDoor = doors.find(d => d.type === 'water');

    // [FIX] Count remaining gems of each type every frame.
    //   A door only unlocks once ALL gems of its matching type are collected.
    //   open drives both the visual animation (renderer reads openAmount) and
    //   the win gate below — both must be true before the level can complete.
    const fireGemsLeft  = gems.filter(g => g.type === 'fire'  && !g.collected).length;
    const waterGemsLeft = gems.filter(g => g.type === 'water' && !g.collected).length;
    fireDoor.open  = fireGemsLeft  === 0;
    waterDoor.open = waterGemsLeft === 0;

    fireDoor.update();
    waterDoor.update();

    fireboy.atDoor   = overlapsEntity(fireboy,   fireDoor);
    watergirl.atDoor = overlapsEntity(watergirl, waterDoor);

    // [FIX] Win only fires when BOTH doors are open (gems cleared) AND
    //   both players are standing inside their matching open door.
    //   Previously this triggered with no gems collected at all.
    if (fireDoor.open && waterDoor.open && fireboy.atDoor && watergirl.atDoor) {
      winLevel();
      return;
    }

    const fireHazard  = fireboy.checkHazards(lvl);
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

    if (fireboy.y > ROWS * TILE + 50 || watergirl.y > ROWS * TILE + 50) {
      die('A player fell out of the level!');
      return;
    }

    elapsedTime = Date.now() - startTime;
    const secs  = Math.floor(elapsedTime / 1000);
    const mins  = Math.floor(secs / 60);
    timerEl.textContent = `${mins}:${String(secs % 60).padStart(2, '0')}`;

    // [CHANGED] Show remaining gem count so players know how many are left,
    //   with a checkmark once a door is unlocked — clearer feedback than
    //   showing a collected count that players have to compare against a total.
    fireGemsEl.textContent  = fireGemsLeft  === 0 ? '✓' : fireGemsLeft;
    waterGemsEl.textContent = waterGemsLeft === 0 ? '✓' : waterGemsLeft;
  }

  // ── render ────────────────────────────────────────────────────────────────
  function render() {
    // [CHANGED] Increment renderer time here so it advances in ALL states,
    // not just when drawTitleBackground was called in the original.
    renderer.time += 0.016;

    renderer.clear();

    // [CHANGED] Title/level-select background now delegates to renderer method
    if (state === 'title' || state === 'levelselect') {
      renderer.drawTitleBackground();
      return;
    }

    const lvl = LEVELS[currentLevel];

    renderer.drawBackground();
    renderer.drawTiles(lvl.tiles);

    for (const door  of doors)     renderer.drawDoor(door);
    for (const gate  of gates)     renderer.drawGate(gate);
    for (const plat  of platforms) renderer.drawPlatform(plat);
    for (const btn   of buttons)   renderer.drawButton(btn);
    for (const gem   of gems)      renderer.drawGem(gem);

    renderer.drawPlayer(fireboy);
    renderer.drawPlayer(watergirl);
  }

  // ── helpers (unchanged) ───────────────────────────────────────────────────
  function winLevel() {
    state = 'win';
    hud.classList.add('hidden');
    winScreen.classList.remove('hidden');

    const secs = Math.floor(elapsedTime / 1000);
    const mins = Math.floor(secs / 60);
    document.getElementById('win-time').textContent =
      `${mins}:${String(secs % 60).padStart(2, '0')}`;
    document.getElementById('win-fire').textContent  = fireboy.gems;
    document.getElementById('win-water').textContent = watergirl.gems;
  }

  function die(msg) {
    state = 'dead';
    hud.classList.add('hidden');
    deathScreen.classList.remove('hidden');
    document.getElementById('death-msg').textContent = msg;
  }

  function overlapsEntity(a, b) {
    return a.left  < b.right  &&
           a.right > b.left   &&
           a.top   < b.bottom &&
           a.bottom > b.top;
  }

  // ── game loop (unchanged) ─────────────────────────────────────────────────
  function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
})();