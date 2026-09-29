# Hippo Heist v2 Rebuild — Tasks

Started 2026-09-28. Process: brainstorm → spec → mockup (approve) → plan → build. Nothing on `main` changes until Brian approves the merge.

## Decisions (locked 2026-09-28)
- Direction: **polished 2D** (2.5D hybrid saved for a later version)
- Art: **vibrant cartoon vector** (drawn in code/SVG: bold outlines, soft gradients)
- Tech: **Phaser 3 + Vite**, deploy to **GitHub Pages**, PWA (home-screen install, offline)
- Audio: **free CC0 assets (Kenney/OpenGameArt) + Web Audio synth effects**
- Mobile: **landscape**, floating joystick left, action/ability buttons right, rotate prompt in portrait
- Scope: **expand significantly**: hippo abilities, power-ups, more enemy types, progression/unlocks
- Rollback: tag current `main` as `v1-original`; all work on a `rebuild` branch

## Assumptions (awaiting confirmation)
- Core loop kept: steal bananas → feed leopard → avoid farmers → water = safe zone
- Local save only (no accounts/leaderboards)
- Same repo (`wickedhardflip/hippo-heist`, public)

## Proposed phasing (awaiting confirmation)
1. Mockup: clickable art/feel prototype (title, world map, one level, HUD, mobile controls, sound sample)
2. Vertical slice: World 1 Farm, ~4 levels, dash+splash, vision-cone farmers, 2 power-ups, 3-star scoring
3. Content: Worlds 2 (River Delta) + 3 (Jungle), dogs, scarecrows, tractor boss, hats/skins (~12 levels total)

## Checklist
- [x] Clarifying questions (direction, scope, art, tech, audio, features, orientation)
- [ ] **← START HERE:** Brian confirms the understanding summary + phasing
- [ ] Present design sections (architecture, game systems, art/UI, audio, mobile)
- [ ] Write spec → `docs/superpowers/specs/2026-09-XX-hippo-heist-v2-design.md`
- [ ] Brian reviews spec
- [ ] Tag `v1-original`, create `rebuild` branch
- [ ] Build mockup → Brian approves
- [ ] Implementation plan (writing-plans) → Brian picks execution method
- [ ] Build vertical slice
