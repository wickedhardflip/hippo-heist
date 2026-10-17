# Hippo Heist

**A first-person stealth heist where you are the hippo.**

Version 2.0 ([changelog](CHANGELOG.md))

The farmers of the lower valley have caught a leopard, and they are starving him in a cage. You are a river hippo with a plan: raid their banana groves, smuggle the fruit to the captive cat, and feed him until he is strong enough to break free. Then get out the way you came in, through the water, where no farmer can keep up and your bite is lethal.

### [▶ Play Hippo Heist in your browser](https://wickedhardflip.github.io/hippo-heist/)

No download, no install. Runs in any modern desktop browser with WebGL. Keyboard and mouse required.

[<img width="100%" alt="Watch the Hippo Heist trailer on YouTube" src="docs/screenshots/trailer.jpg" />](https://youtu.be/eN5AChiksxU)

<img width="100%" alt="Mission 1, Chain Breaker: the hippo looks out over the Lower Valley Plantation banana groves at sunrise" src="docs/screenshots/mission1-chain-breaker.jpg" />

## How to play

Every mission follows the same three objectives, shown in the top left of the screen.

1. **Gather bananas.** Walk up to a banana tree to strip a bunch. You can only carry a few at a time, so plan your runs.
2. **Feed the leopard.** Bring the bananas to the leopard's pen and hold the feed key. Each delivery fills his strength bar. Once it is full, he breaks free.
3. **Reach the river exfil.** The exit unlocks once the leopard is free. Escort him to the green marker to win.

Farmers patrol the farm armed with hatchets, machetes, pitchforks, shovels and the occasional chainsaw, and later missions add guard dogs that bark to call them. On open ground they will cut you down. In the water the odds turn: you are faster than any of them, and a single bite is lethal. The best hippos lure farmers to the riverbank with a bellow and finish them there.

You score points for every banana picked and fed, every power-up collected, every farmer taken down, and a big bonus for freeing the leopard.

### Tips

- Sneaking makes you much harder to spot, and the banana groves give extra cover. Sprinting makes you easier to see, so save your burst for when you are already spotted.
- Bellow to pull a farmer away from a grove, or to draw him toward the water.
- Deep water hides you as well as protecting you. The minimap shows it in blue, so when things go wrong, head for it.
- Stamina drains while sprinting. If you run it dry you are winded and slow, which is a bad time to be on dry land.

## Controls

| Action | Default keys |
|--------|--------------|
| Move | W A S D or arrow keys |
| Look | Mouse |
| Burst sprint (hold) | Shift |
| Sneak (toggle) | C or X |
| Bite | Left mouse or Space |
| Bellow (lure farmers) | Q or right mouse |
| Feed the leopard (hold) | E or F |
| Pause | Esc |
| Mute | M |

Every key can be rebound from the Controls panel on the main menu. Mouse sensitivity, volume, field of view, graphics quality and the killcam can all be set there too.

## Leaderboard

Each mission has an online leaderboard, which you can open from the main menu or after a win. When you complete a mission, you can post your score under any name you like. The board can be filtered and sorted by difficulty, score, time or name. The backend is a small Cloudflare Worker described in [leaderboard/](leaderboard/README.md).

## Missions

<img width="100%" alt="Mission briefing for Chain Breaker with a tactical map of the plantation" src="docs/screenshots/briefing.jpg" />

| # | Operation | Location | The leopard |
|---|-----------|----------|-------------|
| 01 | **Chain Breaker** | Lower Valley Plantation, sunrise | Chained to an iron stake inside a fenced pen |
| 02 | **Hard Cargo** | Cooper Packing Yard, dusk | Locked in a steel cage on a flatbed truck |
| 03 | **Black Rain** | Monsoon Ridge Sawmill, midnight storm | Caged and hoisted under the sawmill gantry |

Each mission opens with a briefing and a tactical map showing the water, the leopard and the exfil point.

<table>
  <tr>
    <td><img alt="Mission 2, Hard Cargo: palm groves under a dusk sky at the Cooper Packing Yard" src="docs/screenshots/mission2-hard-cargo.jpg" /></td>
    <td><img alt="Mission 3, Black Rain: a river at night in a monsoon storm, with the leopard marker in the distance" src="docs/screenshots/mission3-black-rain.jpg" /></td>
  </tr>
  <tr>
    <td align="center"><em>Hard Cargo</em></td>
    <td align="center"><em>Black Rain</em></td>
  </tr>
</table>

## Difficulty

| Level | What to expect |
|-------|----------------|
| Recruit | Farmers are slow to notice you and hit softly. |
| Regular | A fair fight. Farmers react quickly once they spot you. |
| Hardened | More farmers, sharper eyes, heavier swings. |
| Veteran | The whole valley is armed and awake. Use the water. |

## Power-ups

Look for these scattered around each farm.

| Power-up | Effect |
|----------|--------|
| Golden Banana | Counts as three bananas |
| Watermelon | Restores full health |
| Hot Pepper | Speed boost and endless stamina |
| Mud Camo | Farmers struggle to see you |
| Thick Hide | Armor that absorbs damage |
| Recon Parrot | Every farmer shows on your map |
| Feeding Frenzy | Your bite is lethal anywhere, not just in the water |

<img width="100%" alt="Main menu with mission select, difficulty and settings" src="docs/screenshots/main-menu.jpg" />

## Classic Hippo Heist

The original 2D arcade version, with touch controls for phones, is still playable:

### [▶ Play Hippo Heist Classic](https://wickedhardflip.github.io/hippo-heist/classic/)

Its source is preserved at the `v1-original` tag and on the `legacy-2d-original` branch.

## Building from source

The game ships as a single self-contained page. Source lives in `src/`, and `build.py` stitches it together:

    python3 build.py

The version number lives in the `VERSION` file; `build.py` stamps it into the page title, a meta tag and the main menu.

This writes `index.html`, the page GitHub Pages serves. It also writes `game.html` and `test.html` for local use (both git-ignored). `index.html` loads Three.js r128 from cdnjs; `test.html` expects a local `three.min.js` next to it.

Built with Three.js (WebGL), the Web Audio API for sound, and plain JavaScript.

## License

MIT License. Feel free to use, modify and share.
