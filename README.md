# Fireboy & Watergirl – Temple of Elements

A cooperative two-player platformer inspired by the classic Fireboy and Watergirl series, built with vanilla HTML5 Canvas — no dependencies, no build step.

![Game Preview](https://img.shields.io/badge/Players-2_(Local)-blue) ![Tech](https://img.shields.io/badge/Tech-HTML5_Canvas-orange) ![Build](https://img.shields.io/badge/Build-None_Required-green)

## Notes
Main Updates/Changes/Notes from Original Code:
- Original developer used JS/HTML/CSS, so built on those languages instead of translating to other languages
- Fixed bugs with character movement, velocity, and acceleration
- Fixed collision detection
- Changed gem collection ordering
- Door-open algorithm and visuals when users gather all gems
- Improved game background appearance 

## 🎮 How to Play

### Controls
| Player | Move Left | Move Right | Jump |
|--------|-----------|------------|------|
| 🔥 Fireboy | `A` | `D` | `W` |
| 💧 Watergirl | `←` | `→` | `↑` |

### Rules
- **Fireboy** can walk through lava but **dies in water**
- **Watergirl** can walk through water but **dies in lava**
- **Green poison** kills **both** players
- Collect gems matching your element (fire gems for Fireboy, water gems for Watergirl)
- All gems of each type must be collecgtged before that character's door will open 
- Both players must reach their respective doors to complete a level
- **Cooperate!** Some puzzles require both players working together

## 🏗️ Features

- 5 hand-crafted levels with progressive difficulty
- Gem-locked doors: doors stay shut until every matching gem is collected
- Physics engine with gravity, friction, and collision
- Moving platforms that carry players
- Pressure buttons & gates requiring cooperation
- Particle effects for fire and water
- Animated liquid hazards (lava, water, poison)
- Squash & stretch character animations
- No dependencies — pure HTML5/CSS/JS

## Physics and Controls
- Physics enge with gravity and collision resolution
- Responsive, smooth movement
- Jump detection preventing double-jump bugs
- Smooth acceleration and deceleration 

## 🚀 Deploy

### GitHub Pages
1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, root `/`
4. Your game is live!

### Netlify / Vercel
Just drag and drop the folder — no build step needed.

### Local
```bash
# Any static file server works:
npx serve .
# or
python3 -m http.server 8080
```

## 📁 Project Structure

```
fireboy-watergirl/
├── index.html          # Entry point
├── src/
│   ├── styles.css      # UI styling
│   ├── engine.js       # Physics, entities, input
│   ├── levels.js       # Level tile data (5 levels)
│   ├── renderer.js     # Canvas drawing & effects
│   └── game.js         # Game loop & state management
└── README.md
```

## 🎨 Architecture

- **Engine** (`engine.js`): Tile-based collision, entity system, player physics, moving platforms, buttons/gates
- **Renderer** (`renderer.js`): Canvas 2D drawing with stone textures, animated liquids, character sprites with squash/stretch, particle systems, gem sparkles
- **Levels** (`levels.js`): 30×20 tile grids with entity placement data
- **Game** (`game.js`): State machine (title → playing → win/dead), game loop, UI management



## License

MIT
