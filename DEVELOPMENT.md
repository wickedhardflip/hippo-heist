# Hippo Heist - Development Documentation

## Game Overview

**Hippo Heist** is a browser-based game where you play as a hippo stealing bananas from trees to feed a hungry leopard, all while avoiding angry farmers. The game is rendered in real-time **3D** (Three.js / WebGL) from an angled, orbiting top-down camera, set in a grassy valley ringed by mountains. All geometry, textures, animations, sound effects and music are generated procedurally at runtime — there are no image, model or audio asset files.

> **Architecture note:** Gameplay logic still runs in the original 2D world-pixel coordinate space (tiles are 32px). The 3D layer in `render.js` maps those coordinates into the 3D world (game `x` → world `X`, game `y` → world `Z`, with `Render.S` units-per-pixel) and drives all rendering. This kept the game's mechanics, levels and balance identical through the 2D→3D rewrite.

## How to Play

- **Arrow Keys / WASD**: Move the hippo
- **Space**: Pick up bananas (near trees) / Feed leopard (near leopard)
- **Objective**: Collect bananas and feed them to the leopard before time runs out
- **Avoid**: Farmers who chase and damage you
- **Water**: Hippo can hide in water (submerged, slower movement, safe from farmers)

## Project Structure

```
Hippo/
├── index.html          # Main HTML file, game container, WebGL fallback
├── css/
│   └── style.css       # UI/menu/HUD styling, flash & vignette overlays
├── js/
│   ├── vendor/
│   │   └── three.min.js  # Three.js r137 (vendored, global THREE) — the 3D engine
│   ├── textures.js     # Procedural canvas textures (grass, rock, bark, fur, water...)
│   ├── models.js       # Procedural 3D models (hippo, leopard, farmer, tree, cage, props)
│   ├── render.js       # 3D scene manager: world build, camera, lights, water, FX, sync+render
│   ├── game.js         # Main game controller, state management, game loop
│   ├── player.js       # Hippo player logic, camera-relative movement, collision
│   ├── farmer.js       # Farmer AI (patrol, chase, flee), damage dealing
│   ├── leopard.js      # Leopard behavior (caged, roaming, hunter types)
│   ├── level.js        # Level definitions, maps, tile system
│   ├── input.js        # Keyboard / touch input handling
│   └── audio.js        # Web Audio API: SFX, ambient bed, per-level music
└── DEVELOPMENT.md      # This file
```

Script load order matters: `three.min.js` → `textures.js` → `models.js` must load before `render.js`.

## Core Systems

### Game States (game.js)

The game uses a state machine:
- `title` - Main menu screen
- `playing` - Active gameplay
- `paused` - Game paused
- `levelComplete` - Level victory screen
- `gameOver` - Death or time out screen

Key game.js properties:
- `levelTime` / `timeRemaining` - Level timer (default 60000ms, Level 4 uses 90000ms)
- `gracePeriod` / `graceTimer` - 2.5s invincibility at level start
- `isGracePeriod()` - Returns true during grace period

### Player System (player.js)

The hippo player with properties:
- `x, y` - Position
- `health` - 3 hearts max
- `bananas` - Currently carried (max 5)
- `isSubmerged` - In water (safe from farmers, slower)
- `facingX, facingY` - Direction for eye animation
- `invincible, invincibleTimer` - Brief invincibility after taking damage

### Farmer AI (farmer.js)

Each farmer has:
- `patrolPoints` - Array of waypoints for patrol behavior
- `isChasing` - Currently chasing player
- `detectionRange` - 150px to spot player
- `chaseRange` - 250px before giving up chase
- `attackRange` - 30px to deal damage
- `leopardAwarenessTimer/Delay` - 0.4s delay before noticing leopard (allows leopard to catch them)

**Farmer behaviors:**
1. **Patrol** - Walk between waypoints
2. **Chase** - Pursue player when spotted (disabled during grace period)
3. **Flee** - Run from leopard when within avoidance radius (120px)

The `Farmers` manager object handles the collection of all farmers.

### Leopard System (leopard.js)

Leopard types (set per level):
- `caged` - Stationary, must be fed to win
- `stationary` - Doesn't move, just feeds
- `roaming` - Bounces around the map within grass boundaries
- `hunter` - Roams AND can eat farmers (Level 4)

Key properties:
- `fedBananas` / `targetBananas` - Feeding progress
- `avoidanceRadius` - 120px, farmers flee within this range
- `lungeSpeed` - 4.5x normal speed when hunting
- `lungeRange` - 150px detection for lunge attack
- `isLunging` - Currently lunging at a farmer

**Bounce movement:** Leopard moves in a direction until hitting water, then reverses. Periodically changes direction randomly.

### Level System (level.js)

Each level definition includes:
```javascript
{
    name: "Level Name",
    width: 25,              // Map width in tiles
    height: 20,             // Map height in tiles
    bananasToFeed: 10,      // Bananas needed to win
    farmerCount: 4,         // Number of farmers
    leopardType: 'caged',   // caged|stationary|roaming|hunter
    levelTime: 60000,       // Optional, defaults to 60000ms
    layout: [...],          // Array of strings, W=water, G=grass
    playerStart: {x, y},    // Hippo spawn position
    leopardPos: {x, y},     // Leopard position
    treePositions: [...],   // Array of {x, y} for banana trees
    farmerPatrols: [...]    // Array of patrol point arrays
}
```

Tile types:
- `W` = Water (hippo can swim, farmers/leopard cannot enter)
- `G` = Grass (all characters can walk)

### Rendering System (render.js) — 3D

`render.js` is a Three.js scene manager. Key pieces:

- `S` - world units per game pixel; `toWorld(px, py)` maps a game pixel position to a centered 3D ground point.
- `init(canvasId)` - creates the WebGL renderer (ACES tone mapping, soft shadows), scene, fog, lighting (hemisphere + sun with shadow camera + fill), gradient sky dome, cloud sprites, particle/FX pools and camera controls. Fails gracefully to `#webgl-error` if WebGL is unavailable.
- `buildLevel(level)` - rebuilds the per-level world: `buildValley()` (mountain-ringed bowl terrain via value-noise displacement + height-based vertex colors), `buildWater()` (animated ShaderMaterial with waves/fresnel/foam), `buildGround()` (merged grass-island geometry with dirt banks down to the water), `scatterDecor()` (bushes/rocks), then instantiates tree/hippo/leopard/cage/farmer models.
- `renderWorld(player, leopard, farmers, level, time, game)` - per-frame entry: camera keys, camera smoothing, water time, then `syncHippo/syncLeopard/syncFarmers/syncTrees` map game state onto the 3D models (position, facing, and procedural walk/idle/tail/chomp animations), update FX, and render.
- `renderIdle(time)` - menu/title backdrop render with slow auto-orbit.

**Camera:** orbiting follow camera (`cam` state). Q/E rotate, mouse/touch drag orbits, wheel/pinch zooms; pitch and distance are clamped and smoothed. `getCameraYaw()` feeds camera-relative player movement.

**Effects:**
- 3D particle pool (`spawnParticles`/`updateParticles3D`) - splash, dust, sparkle, heart, poof as small meshes with gravity.
- Floating text - billboard `Sprite`s with canvas-text textures that rise and fade.
- `startShake/updateShake` - applied as a camera position offset.
- Damage flash & vignette - CSS overlays (`#fx-flash`, `#game-container::after`) driven by `drawDamageFlash()`.

### Audio System (audio.js)

Pure Web Audio API synthesis (no external files), routed through a master bus
(gain → compressor) with separate `sfxGain`, `musicGain` and `ambientGain` submixes.

Low-level voices: `tone()`, `sweep()` (pitch glide) and `noise()` (filtered).

- `playPickup()` / `playSplash()` / `playHurt()` / `playEat()` / `playFeed()` / `playAlert()` - richer multi-voice SFX
- `playLevelComplete()` / `playGameOver()` / `playClick()` / `playFootstep()`
- `startAmbient()` / `stopAmbient()` - looping wind (filtered brown noise + LFO) plus randomly scheduled bird `chirp()`s
- `startMusic(level)` / `stopMusic()` - layered, faded music keyed to a per-level mood (`levelMoods`): root note, scale, tempo and waveform get tenser from level 1 → 4. Each tick plays a bassline, bar-start pad chord and an arpeggio melody.

Mute is persisted in `localStorage` and fades the master bus.

## Level Progression

### Level 1: "First Heist"
- Small map, 4 farmers, caged leopard
- Tutorial level, learn mechanics

### Level 2: "River Run"
- Larger map with river, 5 farmers
- More water for hiding, stationary leopard

### Level 3: "Wild Chase"
- Complex layout, 6 farmers
- **Roaming leopard** - bounces around the map
- Farmers avoid the leopard (120px radius)

### Level 4: "The Hunt"
- Large open map, 8 farmers
- **Hunter leopard** - can eat farmers!
- 90 second timer (longer than normal)
- Strategy: Lure leopard near farmers to reduce threats

## Key Mechanics

### Grace Period
- 2.5 seconds of invincibility when level starts
- Hippo flashes rapidly during this time
- Farmers patrol but don't chase
- Gives player time to orient and plan

### Farmer-Leopard Interaction
- Farmers flee from leopard within 120px
- Farmers have 0.4s delay before noticing leopard
- Hunter leopard lunges at 4.5x speed within 150px
- This delay allows leopard to catch farmers

### Water Mechanics
- Hippo becomes submerged (only head visible)
- Movement slowed to 60% speed
- Farmers cannot enter water or attack
- Leopard cannot enter water

## Adding New Levels

1. Add level definition to `Level.levels` in `level.js`
2. Design map layout using W and G characters
3. Set appropriate difficulty (farmerCount, bananasToFeed)
4. Choose leopardType based on desired mechanics
5. Position trees, player start, leopard, and farmer patrols

## Common Modifications

### Adjust Difficulty
- `farmer.js`: `detectionRange`, `chaseRange`, `speed`
- `level.js`: `farmerCount`, `bananasToFeed`, `levelTime`
- `game.js`: `gracePeriod` duration

### Adjust Leopard Hunting
- `leopard.js`: `lungeSpeed`, `lungeRange`, `avoidanceRadius`
- `farmer.js`: `leopardAwarenessDelay`

### Adjust Player
- `player.js`: `speed`, `maxBananas`, `maxHealth`

## Technical Notes

- Game uses `requestAnimationFrame` for a smooth loop
- Delta time (`dt`) passed to all update functions for frame-independent movement
- Rendering is retained-mode 3D: the scene graph persists and entity transforms are synced from game state each frame, then rendered once
- One vendored dependency (Three.js r137, global build) under `js/vendor/`; everything else is vanilla JS
- All geometry, textures, sounds and music are synthesized/generated at runtime — no asset files

## Browser Compatibility

Tested on modern browsers with:
- WebGL (Three.js)
- Web Audio API
- ES6+ JavaScript features

If WebGL can't start, the game shows a `#webgl-error` message instead of failing silently.

## Running the Game

Simply open `index.html` in a web browser. No build process or server required.
