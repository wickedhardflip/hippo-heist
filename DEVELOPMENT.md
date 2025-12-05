# Hippo Heist - Development Documentation

## Game Overview

**Hippo Heist** is a browser-based game where you play as a hippo stealing bananas from trees to feed a hungry leopard, all while avoiding angry farmers. The game features Minecraft-inspired pixel art graphics with modern polish, retro 8-bit synthesized sound effects, and progressive difficulty across multiple levels.

## How to Play

- **Arrow Keys / WASD**: Move the hippo
- **Space**: Pick up bananas (near trees) / Feed leopard (near leopard)
- **Objective**: Collect bananas and feed them to the leopard before time runs out
- **Avoid**: Farmers who chase and damage you
- **Water**: Hippo can hide in water (submerged, slower movement, safe from farmers)

## Project Structure

```
Hippo/
├── index.html          # Main HTML file, game container
├── css/
│   └── style.css       # All styling, animations, UI layout
├── js/
│   ├── game.js         # Main game controller, state management, game loop
│   ├── player.js       # Hippo player logic, movement, collision
│   ├── farmer.js       # Farmer AI (patrol, chase, flee), damage dealing
│   ├── leopard.js      # Leopard behavior (caged, roaming, hunter types)
│   ├── level.js        # Level definitions, maps, tile system
│   ├── render.js       # All canvas rendering, sprites, effects, particles
│   ├── input.js        # Keyboard input handling
│   └── audio.js        # Web Audio API synthesized sounds and music
└── DEVELOPMENT.md      # This file
```

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

### Rendering System (render.js)

Canvas-based rendering with:
- `TILE_SIZE` - 32px per tile
- `toScreen(x, y)` - Convert world coords to screen coords
- `cameraX, cameraY` - Camera offset for scrolling

**Drawing functions:**
- `drawMap()` - Tiles (water with shimmer, grass with variation)
- `drawHippo(hippo, time, isGracePeriod)` - Player with bobbing, flashing during grace
- `drawFarmer(farmer, time)` - Farmers with patrol/chase animations
- `drawLeopard(leopard, time)` - Leopard with spots pattern
- `drawBananaTree(tree, time)` - Trees with swaying leaves
- `drawCage(leopard)` - Cage overlay when leopard is caged

**Effects:**
- `particles` array - Splash, dust, sparkle, heart, poof effects
- `addParticle(type, x, y)` - Spawn particle effect
- `screenShake(intensity)` - Camera shake effect
- `floatingTexts` array - Damage numbers, pickup text

### Audio System (audio.js)

Pure Web Audio API synthesis (no external files):
- `playPickup()` - Banana collection (cheerful arpeggio)
- `playSplash()` - Water entry (noise burst)
- `playHurt()` - Taking damage (dissonant chord)
- `playEat()` - Leopard eating farmer (crunch sound)
- `playFeed()` - Feeding leopard (satisfied sound)
- `playAlert()` - Farmer spots player (alarm)
- `playLevelComplete()` - Victory fanfare
- `playGameOver()` - Defeat sound
- `playClick()` - UI button click
- `startMusic()` / `stopMusic()` - Background music loop

Music runs at lower volume (0.08) with simple chord progressions.

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

- Game uses `requestAnimationFrame` for smooth 60fps loop
- Delta time (`dt`) passed to all update functions for frame-independent movement
- Canvas clears and redraws every frame
- No external dependencies - pure vanilla JavaScript
- All sounds synthesized at runtime via Web Audio API oscillators

## Browser Compatibility

Tested on modern browsers with:
- HTML5 Canvas
- Web Audio API
- ES6+ JavaScript features

## Running the Game

Simply open `index.html` in a web browser. No build process or server required.
