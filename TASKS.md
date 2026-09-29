# Hippo Heist v2 Rebuild — Tasks

Started 2026-09-28. Process: brainstorm → spec → mockup (approve) → plan → build. Nothing on `main` changes until Brian approves the merge.

## Decisions (locked 2026-09-28)
- Direction: **polished 2D** (2.5D hybrid saved for a later version)
- Art: ~~vibrant cartoon vector~~ **REOPENED 2026-09-29**: Brian wants the graphics to be the top priority: professional, a distinct style, not too cartoonish, NO balloon/inflated look, textured water + ground, an organic fresh map (not boxy). Bloomtown: A Different Story is a reference for mood (not to copy). Brian offered to generate images with Gemini or install other tools.
- Tech: **Phaser 3 + Vite**, deploy to **GitHub Pages**, PWA (home-screen install, offline)
- Audio: **free CC0 assets (Kenney/OpenGameArt) + Web Audio synth effects**
- Mobile: **landscape**, floating joystick left, action/ability buttons right, rotate prompt in portrait
- Scope: **expand significantly**: hippo abilities, power-ups, more enemy types, progression/unlocks
- Rollback: tag current `main` as `v1-original`; all work on a `rebuild` branch

## Assumptions (confirmed 2026-09-29)
- Core loop kept: steal bananas → feed leopard → avoid farmers → water = safe zone
- Local save only (no accounts/leaderboards)
- Same repo (`wickedhardflip/hippo-heist`, public)

## Phasing (confirmed 2026-09-29)
1. Mockup: clickable art/feel prototype (title, world map, one level, HUD, mobile controls, sound sample)
2. Vertical slice: World 1 Farm, ~4 levels, dash+splash, vision-cone farmers, 2 power-ups, 3-star scoring
3. Content: Worlds 2 (River Delta) + 3 (Jungle), dogs, scarecrows, tractor boss, hats/skins (~12 levels total)

## Checklist
- [x] Clarifying questions (direction, scope, art, tech, audio, features, orientation)
- [x] Brian confirms the understanding summary + phasing (2026-09-29)
- [x] **DECIDED 2026-09-29: ORIGINAL C sample (`docs/art-samples/C-textured-vector.jpg`) is the locked style reference**, including its faceted geometric hippo ("different, has something unique"). The smoothed C2 was rejected, and A was rejected as muddy.
- [x] Refined C2 sample made (rejected; original C kept)
- [x] Pick art direction (painterly / modern pixel / textured vector), then generate style samples to compare.
  - Options given 9/29: **A. Hand-painted illustration (Claude recommends)**: three-quarter top-down view, painted textures, water effects, organic curved shorelines, characters built from painted pieces animated in code (avoids AI frame consistency problems). **B. Modern pixel art + dynamic lighting** (closest to Bloomtown; AI makes messy pixel art). **C. Flat stylized shapes + texture effects** (all code, least textured).
  - 9/29: Brian asked for one mockup per style (A/B/C) before picking, and wants to keep credit usage low.
  - 9/29: Gemini API image generation (`gemini-3-pro-image`) failed with 429 because the free-tier quota **limit is 0**, so the API free tier can't make images at all. No charge was made. Options: Brian runs the prompts in the free Gemini app, OR enable API billing, OR code-drawn mockups.
  - 9/29: Billing enabled with a $10/mo spend cap. Generated 1 sample per style (about $0.40, logged in `logs/api-costs.md`) → `docs/art-samples/A-hand-painted.jpg`, `B-pixel-lighting.jpg`, `C-textured-vector.jpg`.
  - Resolved 9/29: original C picked.
- [x] Present design sections (architecture, game systems, art/UI, audio, mobile)
  - [x] 1. Architecture approved 9/29 (Phaser+Vite+TS, code-drawn faceted polygons baked to textures, curve-based terrain, grain overlay, JSON levels, versioned localStorage save)
  - [x] 2. Game systems approved 9/29 (3-banana carry, dash + water-only splash, submerge hides, 3-stage farmer awareness w/ visible cones, 3 hearts, Mud Coat + Banana Magnet, stars = clear/time/unseen, 2-4 min levels)
  - [x] 3. Art & UI approved 9/29 (palette from C sample, per-world palette variations, y-sorted 3/4 view, faceted chars 2-3 planes, river-path world map, cream pill HUD, Outfit font bundled, subtle motion + reduced-motion)
  - [x] 4. Audio approved 9/29 (CC0 music per world + adaptive tension layer on suspicious/alert, synth SFX in code, quiet ambience, music/SFX sliders saved, tap-to-unlock on iOS, auto-pause on background, <3 MB)
  - [x] 5. Mobile & controls approved 9/29
- [x] Write spec → `docs/superpowers/specs/2026-09-29-hippo-heist-v2-design.md` (committed on rebuild)
- [x] Brian reviews spec (approved 2026-09-29)
- [x] Tag `v1-original` (on origin/main), create `rebuild` branch (2026-09-29)
- [ ] **← START HERE:** Build mockup → Brian approves. Plan: `docs/superpowers/plans/2026-09-29-hippo-heist-v2-mockup.md` (9 tasks, lean scope; v2 lives in `v2/`). Awaiting Brian's plan review + execution method
- [ ] **Deploy requirement (Brian 9/29):** keep v1 playable after v2 launches, e.g. v1 at `/classic/`, v2 at root, with a "Play the original" link. (`v1-original` tag = exact copy.)
- [ ] Implementation plan (writing-plans) → Brian picks execution method
- [ ] Build vertical slice
