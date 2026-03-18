# Prompt Log — Fireboy & Watergirl

## Prompt 1: "run"
**Request:** Run the game.
**Action:** Opened `index.html` in the default browser.

## Prompt 2: "there's no CSS"
**Request:** The page rendered as unstyled plain HTML — all screens visible at once, no CSS or game canvas.
**Issue:** `index.html` referenced files in a `src/` subdirectory (`src/styles.css`, `src/engine.js`, etc.) but all files were in the root directory.
**Fix:** Updated all `<link>` and `<script>` paths in `index.html` to point to root-level files (`styles.css`, `engine.js`, `levels.js`, `renderer.js`, `game.js`).

## Prompt 3: "i'm unable to click on start game"
**Request:** The "Start Game" button was unresponsive.
**Issue:** In `game.js`, the `render()` function called `requestAnimationFrame(gameLoop)` during the title screen state, while `gameLoop()` also called `requestAnimationFrame(gameLoop)`. This caused exponential frame doubling, freezing the browser.
**Fix:** Removed the extra `requestAnimationFrame(gameLoop)` call from inside the `render()` function's title-screen branch.

## Prompt 4: "can you lower the speed and the characters are not being able to jump over the platforms"
**Request:** Characters moved too fast and couldn't jump high enough to reach platforms spaced 3 tiles apart.
**Fix (in `engine.js`):**
- `speed`: 3.2 → 2.4 (slower movement)
- `jumpForce`: -9.5 → -11 (higher jumps, ~3.5 tiles vs ~2.5 tiles)
- `GRAVITY`: 0.55 → 0.45 (floatier, more controllable jumps)
- `MAX_FALL`: 12 → 10 (slightly slower falling)

## Prompt 5: "can you make the controls more controlled?"
**Request:** Characters felt slippery and hard to control — they slid after releasing keys.
**Fix (in `engine.js`):**
- `FRICTION`: 0.82 → 0.68 (faster deceleration)
- Acceleration multiplier: 0.4 → 0.7 (snappier response)
- Added instant braking: velocity halves when no movement keys are pressed
- Added deadzone: velocities below 0.15 snap to zero (no micro-drift)
- Added speed cap (`MAX_SPEED = 4.5`) to prevent runaway velocity

## Prompt 6: "controls are still flowy - make it more friction, lower acceleration"
**Request:** Characters still felt too floaty/slidey despite previous tuning.
**Fix (in `engine.js`):**
- `FRICTION`: 0.68 → 0.45 (much heavier drag per frame)
- Acceleration multiplier: 0.7 → 0.5 (gentler ramp-up)
- Brake on release: 0.5 → 0.3 (nearly instant stop when keys released)
- `MAX_SPEED`: 4.5 → 3.5 (lower top speed)
