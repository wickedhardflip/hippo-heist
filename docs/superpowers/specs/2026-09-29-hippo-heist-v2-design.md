# Hippo Heist v2: Design Spec

**Date:** 2026-09-29
**Status:** Draft, awaiting Brian's review
**Repo:** `wickedhardflip/hippo-heist` (public), work on the `rebuild` branch

---

## 1. Goal

A ground-up, professional-quality rebuild of Hippo Heist as a polished 2D stealth-arcade game that looks and plays well on iPhone (landscape) and desktop. Graphics are the top priority: a distinct style that isn't overly cartoonish, with no balloon/inflated look, textured water and ground, and an organic (not boxy) map.

**Out of scope for v2:** 2.5D hybrid (saved for a later version), accounts, leaderboards, online features.

## 2. Locked Decisions

| Area | Decision |
|------|----------|
| Direction | Polished 2D |
| Art style | **Style C, textured flat vector.** Reference: `docs/art-samples/C-textured-vector.jpg` (the original, not C2) |
| Tech | Phaser 3 + Vite + TypeScript |
| Hosting | GitHub Pages, installable PWA, works offline |
| Audio | CC0 music (Kenney/OpenGameArt) + Web Audio synth SFX |
| Orientation | Landscape on mobile |
| Save | Local only (localStorage, versioned) |
| Rollback | Tag `main` as `v1-original`; all work on `rebuild`; live site changes only when Brian approves the merge |

## 3. Phasing

1. **Mockup:** a clickable art/feel prototype: title, world map, one level, HUD, mobile controls, sound sample. Brian must approve it before phase 2.
2. **Vertical slice:** World 1 (Farm), ~4 levels, dash + splash, vision-cone farmers, 2 power-ups, 3-star scoring.
3. **Content:** World 2 (River Delta) + World 3 (Jungle), dogs, scarecrows, tractor boss, hats/skins, ~12 levels total.

---

## 4. Architecture

### Stack
Phaser 3, Vite, TypeScript. Deployed as static files to GitHub Pages. A service worker provides offline play and the home-screen install.

### Art pipeline
- **Characters and props are drawn in code** as flat faceted polygons (2–3 shading planes per shape, matching the sample hippo). Each is drawn once at boot and baked into a cached texture for performance.
- **Animation:** rigged polygon pieces (legs step, head bobs, body squashes on dash). No frame-by-frame sprite sheets.
- **Terrain:** organic curves (shorelines, fields, paths) defined in level data, filled with flat color, and given raised rust-brown bank edges for a cut-paper depth. No tile grid.
- **Grain + ripples:** a lightweight full-screen noise overlay plus animated concentric ripple rings on water.
- **AI-generated images are reference only.** None ship in the game.

### Code layout
```
src/
  scenes/     Boot, Title, WorldMap, Level, HUD (overlay), Pause, Results
  entities/   Hippo, Farmer, Dog, Leopard, Pickups
  systems/    Input, Stealth, Abilities, Save, Audio
  art/        palette.ts + shape builders (hippo.ts, farmer.ts, barn.ts, ...)
  levels/     world1/level1.json ...
```
- **Levels are data (JSON):** terrain curves, spawn points, patrol routes, banana spots, leopard location, banana target, time target. New levels don't require touching game logic.
- **Save:** localStorage with a schema version and migration, holding stars per level, unlocks, cosmetics, and audio settings.

## 5. Game Systems

### Core loop
Sneak onto the farm → grab bananas → deliver them to the leopard → retreat to water when spotted.

### Hippo
| Mechanic | Behavior |
|----------|----------|
| Movement | Weighty with slight momentum; faster in water; slower while carrying |
| Carry | Up to **3 bananas**, stacked visibly on its back; all dropped when caught |
| Dash | Short speed burst, ~3 s cooldown |
| Splash | **Water only.** Wave stuns nearby farmers ~2 s and puts out lanterns; recharges while submerged |
| Submerge | In water the hippo is hidden (only eyes and ears show) and farmers lose track of it |

### Farmers and stealth
- **Vision cones** are always drawn on the ground (pale wedge).
- **Awareness:** unaware → **suspicious** ("?", turns and walks toward the spot) → **alert** ("!", chases). Breaking line of sight or submerging brings them back down.
- **Caught:** −1 heart, bananas dropped, respawn at the nearest water. 3 hearts per level; at 0 the level restarts.
- **Phase 3 enemies:** dogs (follow scent trails), scarecrows (alert when you pass close), tractor boss.

### Power-ups (slice)
- **Mud Coat:** shrinks vision cones for 8 s.
- **Banana Magnet:** pulls in nearby bananas for 6 s.

### Scoring and progression
- Level is cleared when the leopard has been fed the target number of bananas.
- **Stars:** clear the level / beat the time target / never spotted.
- Stars unlock the next world and cosmetic hats (phase 3).
- Target level length: **2–4 minutes**.

### Level design rules (added 2026-09-29)
Maps don't need to copy v1's layouts. What matters is good maps and solid gameplay. Every level must meet these:
1. **Water within a short dash** (~2 s) of every banana, so escaping is always a real option.
2. **2+ routes to each goal:** a fast, exposed route and a slower one through water or cover.
3. **Risk = reward:** the best-placed bananas sit in the riskiest spots.
4. **Overlapping patrols with learnable gaps:** timing is a skill, not luck.
5. **The carry home is the tension peak:** there are farmers between the field and the leopard, and carrying slows the hippo.
6. **One new idea per level:** a new layout feature, enemy behavior, ability, or power-up.

The mockup's `farm1` map is a **placeholder** for testing art and controls. It doesn't meet these rules and will be replaced.

## 6. Art & UI

### Palette (from the C sample)
- Land: muted olive / mustard
- Water: true teal-blue with lighter ripple rings, **never muddy**
- Banks: rust-brown edges
- Hippo: lavender-gray; barn: muted red; UI: soft cream
- Bananas: the one warm accent, so collectibles always stand out
- Per-world variations: Farm (olive/mustard), River Delta (sage/slate), Jungle (deep green/warm clay)

### View
Three-quarter top-down view. Objects lower on screen are drawn in front, so the hippo can walk behind the barn and plants. Flat soft shadows under every object.

### Characters
Faceted geometric builds (2–3 planes per shape), **not smoothed**, **not inflated**. Simple expressive faces (ear flicks, raised farmer eyebrows). Shared palette and plane rules so new characters match automatically.

### Screens
- **Title:** animated river scene, the hippo surfaces, logo, "Tap to play."
- **World map:** winding river path with level markers along the curves and stars under each.
- **HUD:** rounded cream pills (banana count, 3 hearts), pause button top-right. Minimal, nothing covering the play area.
- **Pause / Results:** cream cards over a blurred view of the level; stars pop in one at a time.

### Typography
A geometric sans-serif (e.g. **Outfit**), bundled with the game for offline use. Friendly without being bubbly.

### Motion
UI transitions ~150 ms. Ambient life in the world: swaying reeds, drifting lily pads, ripples. Respects the player's reduced-motion setting.

## 7. Audio

- **Music:** one CC0 loop per world, plus a calm menu version of the title theme.
- **Adaptive tension:** a percussion layer fades in when a farmer is suspicious, a full chase mix plays when alert, and both fade out when the hippo escapes.
- **SFX (generated in code with Web Audio):** banana pluck (pitch rises 1→3), dash whoosh, splash burst, submerge bloop, surface pop, "?" chime, "!" sting, leopard purr + chime, UI wood click.
- **Ambience:** quiet river, birds, and reed rustle.
- **Settings:** separate music and SFX volume sliders plus mute, saved between sessions.
- **Platform:** audio unlocks on the first tap (iOS requirement, handled by "Tap to play") and pauses automatically when the app is backgrounded.
- **Budget:** under ~3 MB of audio.

## 8. Mobile & Controls

### Phone (landscape)
- **Left:** a floating joystick appears where the thumb lands on the left half of the screen; translucent cream ring that fades on release.
- **Right:** Dash (large) + Splash (smaller, grayed out on land); round cream buttons with a cooldown sweep.
- **Pause:** top-right.
- **Portrait:** a "rotate your phone" screen with the hippo turning sideways.
- **Safe areas:** HUD and controls stay clear of the notch and home bar.
- **Haptics:** short vibration on spotted/dash where supported (limited on iOS, so a bonus only).

### Desktop
WASD / arrow keys to move, Space = dash, E or Shift = splash, Esc = pause. Basic gamepad support.

### Scaling and camera
The playfield has a fixed size and scales to fit; wider screens show extra scenery at the edges, but every player gets the same playable area. The camera follows the hippo with a slight look-ahead.

### Performance
- 60 fps on iPhones from roughly the last 4 years.
- Initial load under ~5 MB; offline after the first visit.
- Low-power mode: if the frame rate drops, the grain overlay turns off and ripples are reduced.

### Install
"Add to Home Screen" tip shown after the first level clear (manual Share-menu instructions on iOS). Runs full-screen once installed.

---

## 9. Testing

- **Unit tests (Vitest):** save/migration, stealth awareness state machine, scoring/star rules, level JSON validation.
- **Manual device checks each phase:** iPhone Safari landscape (installed and in the browser), desktop Chrome, touch controls, audio unlock, offline launch.
- **Performance check:** frame rate on a real iPhone before each merge.

## 10. Open Questions

None blocking. To be decided during the mockup phase:
- Exact CC0 music tracks
- Final hippo proportions and rig pieces (must match the C reference)
