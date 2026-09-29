# Hippo Heist v2 Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A lean, playable one-level mockup of Hippo Heist v2 in the locked style C, testable on iPhone and desktop, which becomes the foundation of the vertical slice.

**Architecture:** A self-contained Vite + Phaser 3 + TypeScript project in `v2/` on the `rebuild` branch (v1 at the repo root stays untouched and live). Game rules live in pure, Phaser-free modules under `v2/src/logic/` with Vitest tests; Phaser scenes and entities only render and wire input. All art is drawn in code as faceted flat polygons and baked into textures at boot.

**Tech Stack:** Phaser 3.80+, Vite 5+, TypeScript 5 (strict), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-hippo-heist-v2-design.md`
**Style reference:** `docs/art-samples/C-textured-vector.jpg` (the original C. Faceted hippo, NOT the smoothed C2)

## Global Constraints

- All v2 code lives in `v2/`. Do not modify v1 files (`index.html`, `js/`, `css/` at the repo root).
- Work on the `rebuild` branch only. Never push to `main`.
- Logical game size is **1280×720** (landscape) with `Phaser.Scale.FIT` + `CENTER_BOTH`.
- No image files: all art is drawn in code with Phaser Graphics and baked with `generateTexture`.
- Characters are faceted: 2–3 flat shading planes per shape. Not smoothed, not inflated/balloon.
- Colors come only from `v2/src/art/palette.ts`. Water must stay a true teal-blue and never look muddy.
- No `innerHTML` anywhere (the repo's security hook blocks it).
- Carry limit is 3 bananas; 3 hearts; Dash cooldown ~3 s; Splash only in water, stuns ~2 s.
- Mockup scope excludes: world map, title animation, music, power-ups, stars, PWA/service worker, save.

## Review Focus

1. **Touch plus keyboard at the same time / multi-touch.** Holding the joystick with one thumb while tapping Dash with the other must work, and joystick release must stop movement. Owned by Task 4 (test: `joystickVector` returns zero after release; manual two-thumb check in Task 9).
2. **Hippo leaving the map or getting stuck in the barn.** The position must be clamped to world bounds. Owned by Task 5 (test: `stepHippo` clamps to bounds).
3. **Caught while submerged or at the exact water edge.** A submerged hippo must never be seen. Owned by Task 6 (test: `canSee` returns false when the target is submerged).
4. **Delivering with 0 bananas / picking up at the carry cap.** Delivery with 0 does nothing; bananas past 3 stay on the ground. Owned by Task 7 (tests included).
5. **Portrait phone / resize mid-game.** The rotate prompt shows in portrait, and the game resumes cleanly on rotating back. Owned by Task 8 (manual check in Task 9).

---

## File Structure

```
v2/
  package.json, tsconfig.json, vite.config.ts, index.html
  src/
    main.ts                 Phaser game config, scene list
    art/palette.ts          all colors
    art/facets.ts           helper to draw faceted polygons with shading planes
    art/sprites.ts          builds + bakes hippo, farmer, leopard, banana, plant, barn textures
    logic/geometry.ts       Vec, pointInPolygon, smoothClosedCurve, distance, angle helpers
    logic/level.ts          LevelData types + validateLevel
    logic/joystick.ts       joystickVector (deadzone, clamp)
    logic/hippo.ts          HippoState + stepHippo (momentum, water speed, bounds)
    logic/stealth.ts        canSee (cone + range + submerged) + awareness state machine
    logic/game.ts           GameState + pickup/deliver/caught/win/lose reducers
    levels/farm1.json       the mockup level
    scenes/BootScene.ts     bakes textures, starts Level
    scenes/LevelScene.ts    terrain, entities, camera, rules wiring
    scenes/HudScene.ts      banana pill, hearts, pause, Dash/Splash buttons, joystick
    render/terrain.ts       draws land, banks, water, fields, paths from LevelData
    render/effects.ts       grain overlay + ripple rings
  tests/*.test.ts           Vitest for every logic/ module
```

---

### Task 1: Scaffold v2 project

**Files:**
- Create: `v2/package.json`, `v2/tsconfig.json`, `v2/vite.config.ts`, `v2/index.html`, `v2/src/main.ts`, `v2/src/art/palette.ts`, `v2/tests/palette.test.ts`
- Modify: `.gitignore` (add `v2/node_modules/`, `v2/dist/`)

**Interfaces:**
- Produces: `PALETTE` (named hex numbers), `GAME_W = 1280`, `GAME_H = 720` exported from `src/main.ts`.

- [ ] **Step 1: Create config files**

`v2/package.json`:
```json
{
  "name": "hippo-heist-v2",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host",
    "test": "vitest run"
  },
  "dependencies": { "phaser": "^3.80.1" },
  "devDependencies": { "typescript": "^5.5.0", "vite": "^5.4.0", "vitest": "^2.0.0" }
}
```

`v2/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "resolveJsonModule": true, "esModuleInterop": true,
    "skipLibCheck": true, "noEmit": true, "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

`v2/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { port: 5173 }, test: { globals: true } });
```

`v2/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <title>Hippo Heist</title>
  <style>
    html, body { margin: 0; height: 100%; background: #6f6a3a; overflow: hidden; touch-action: none; }
    #game { position: fixed; inset: 0; }
  </style>
</head>
<body><div id="game"></div><script type="module" src="/src/main.ts"></script></body>
</html>
```

- [ ] **Step 2: Write failing palette test** (`v2/tests/palette.test.ts`)

```ts
import { PALETTE } from '../src/art/palette';
it('water is blue-dominant (never muddy)', () => {
  for (const c of [PALETTE.water, PALETTE.waterLight]) {
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    expect(b).toBeGreaterThan(r + 40);
    expect(b).toBeGreaterThanOrEqual(g - 10);
  }
});
```

- [ ] **Step 3: Run** `cd v2 && npm install && npm test`. Expected: FAIL (module not found).

- [ ] **Step 4: Implement palette** (`v2/src/art/palette.ts`), with values sampled from the C reference:

```ts
export const PALETTE = {
  land: 0xa99a4c, landDark: 0x8e8140, landLight: 0xc2b25e,
  bank: 0x8a4a33, bankDark: 0x6e3826,
  water: 0x3f8f9a, waterLight: 0x6fb3ba, waterDeep: 0x2f7582,
  path: 0xc9a86a, soil: 0x6b4630, soilDark: 0x553624,
  plant: 0x4f7d4a, plantDark: 0x3c6339, plantLight: 0x6b9a5c,
  banana: 0xf2c94c, bananaDark: 0xd9a92e,
  hippo: 0x8c8196, hippoDark: 0x6f657a, hippoLight: 0xa79db0, hippoPink: 0xc98e8e,
  barn: 0x9c4a3a, barnDark: 0x7d3a2e, roof: 0x8d8f8c, roofDark: 0x6f716e,
  farmerShirt: 0xe6ddc8, farmerOveralls: 0x4d6a86, farmerHat: 0xd8b56a, skin: 0xd9a27e,
  leopard: 0xd9a441, leopardDark: 0xb07f2c, spot: 0x4a3a2a,
  cream: 0xf3ead3, creamDark: 0xd9ceb2, ink: 0x3b3a36,
  cone: 0xfff6d8, alert: 0xd9534f, suspicious: 0xf2c94c,
  bg: 0x6f6a3a,
} as const;
```

- [ ] **Step 5: Implement `v2/src/main.ts`**, a minimal game config showing a bg color. (The Boot/Level scenes are added in Task 3; for now use a placeholder scene class that sets `this.cameras.main.setBackgroundColor(PALETTE.bg)`.)

```ts
import Phaser from 'phaser';
import { PALETTE } from './art/palette';
export const GAME_W = 1280, GAME_H = 720;
class Hello extends Phaser.Scene { create() { this.cameras.main.setBackgroundColor(PALETTE.bg); } }
new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: GAME_W, height: GAME_H,
  backgroundColor: PALETTE.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [Hello],
});
```

- [ ] **Step 6: Verify.** Run `npm test` (PASS) and `npm run build` (succeeds). Add `v2/node_modules/` and `v2/dist/` to the root `.gitignore`.

- [ ] **Step 7: Commit** `git add v2 .gitignore && git commit -m "v2: scaffold Vite + Phaser + TS project with palette"`

---

### Task 2: Geometry + level data

**Files:**
- Create: `v2/src/logic/geometry.ts`, `v2/src/logic/level.ts`, `v2/src/levels/farm1.json`, `v2/tests/geometry.test.ts`, `v2/tests/level.test.ts`

**Interfaces:**
- Produces:
  - `type Vec = { x: number; y: number }`
  - `pointInPolygon(p: Vec, poly: Vec[]): boolean`
  - `smoothClosedCurve(pts: Vec[], segments?: number): Vec[]` (Catmull-Rom, closed)
  - `dist(a: Vec, b: Vec): number`, `angleTo(a: Vec, b: Vec): number`, `angleDiff(a: number, b: number): number` (smallest signed, radians)
  - `type LevelData` (below), `validateLevel(d: unknown): LevelData` (throws `Error` with a message on invalid input), `isWater(level: LevelData, p: Vec): boolean`, `nearestWaterPoint(level: LevelData, p: Vec): Vec`

- [ ] **Step 1: Write failing tests**

`v2/tests/geometry.test.ts`:
```ts
import { pointInPolygon, smoothClosedCurve, angleDiff } from '../src/logic/geometry';
const sq = [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}];
it('pointInPolygon inside/outside', () => {
  expect(pointInPolygon({x:5,y:5}, sq)).toBe(true);
  expect(pointInPolygon({x:15,y:5}, sq)).toBe(false);
});
it('smoothClosedCurve passes through control points and adds detail', () => {
  const c = smoothClosedCurve(sq, 8);
  expect(c.length).toBe(32);
  expect(c[0]).toEqual({x:0,y:0});
});
it('angleDiff wraps', () => {
  expect(angleDiff(0.1, 2*Math.PI - 0.1)).toBeCloseTo(0.2);
});
```

`v2/tests/level.test.ts`:
```ts
import farm1 from '../src/levels/farm1.json';
import { validateLevel, isWater, nearestWaterPoint } from '../src/logic/level';
it('farm1 is valid', () => { expect(() => validateLevel(farm1)).not.toThrow(); });
it('rejects missing hippoStart', () => {
  const bad = { ...farm1, hippoStart: undefined };
  expect(() => validateLevel(bad)).toThrow(/hippoStart/);
});
it('rejects a banana target above the banana count', () => {
  expect(() => validateLevel({ ...farm1, bananaTarget: 999 })).toThrow(/bananaTarget/);
});
it('water detection + nearest water point', () => {
  const lvl = validateLevel(farm1);
  expect(isWater(lvl, lvl.hippoStart)).toBe(true);
  const w = nearestWaterPoint(lvl, lvl.leopard);
  expect(isWater(lvl, w)).toBe(true);
});
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `geometry.ts`**

```ts
export type Vec = { x: number; y: number };
export const dist = (a: Vec, b: Vec) => Math.hypot(b.x - a.x, b.y - a.y);
export const angleTo = (a: Vec, b: Vec) => Math.atan2(b.y - a.y, b.x - a.x);
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
export function pointInPolygon(p: Vec, poly: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function smoothClosedCurve(pts: Vec[], segments = 10): Vec[] {
  const out: Vec[] = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < segments; s++) {
      const t = s / segments, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}
```

- [ ] **Step 4: Implement `level.ts`**

```ts
import { Vec, pointInPolygon, smoothClosedCurve, dist } from './geometry';
export type Farmer = { patrol: Vec[]; facing: number };
export type LevelData = {
  id: string; world: { w: number; h: number };
  water: Vec[][];            // control points of closed shapes (smoothed at load)
  fields: Vec[][];           // banana field plots (drawn as soil)
  paths: Vec[][];            // dirt path shapes
  barn: Vec;                 // barn anchor (bottom-center)
  plants: Vec[];             // decorative banana plants
  bananas: Vec[];            // pickup spots
  leopard: Vec;
  hippoStart: Vec;
  farmers: Farmer[];
  bananaTarget: number;
};
const isVec = (v: any): v is Vec => v && typeof v.x === 'number' && typeof v.y === 'number';
export function validateLevel(d: any): LevelData {
  const need = (k: string, ok: boolean) => { if (!ok) throw new Error(`Invalid level: ${k}`); };
  need('id', typeof d?.id === 'string');
  need('world', d?.world?.w > 0 && d?.world?.h > 0);
  for (const k of ['water', 'fields', 'paths']) need(k, Array.isArray(d[k]) && d[k].every((s: any) => Array.isArray(s) && s.length >= 3 && s.every(isVec)));
  need('water', d.water.length >= 1);
  for (const k of ['barn', 'leopard', 'hippoStart']) need(k, isVec(d[k]));
  need('plants', Array.isArray(d.plants) && d.plants.every(isVec));
  need('bananas', Array.isArray(d.bananas) && d.bananas.length > 0 && d.bananas.every(isVec));
  need('farmers', Array.isArray(d.farmers) && d.farmers.every((f: any) => Array.isArray(f.patrol) && f.patrol.length >= 1 && f.patrol.every(isVec) && typeof f.facing === 'number'));
  need('bananaTarget', Number.isInteger(d.bananaTarget) && d.bananaTarget > 0 && d.bananaTarget <= d.bananas.length);
  return { ...d, water: d.water.map((s: Vec[]) => smoothClosedCurve(s, 10)) } as LevelData;
}
export const isWater = (lvl: LevelData, p: Vec) => lvl.water.some((s) => pointInPolygon(p, s));
export function nearestWaterPoint(lvl: LevelData, p: Vec): Vec {
  let best: Vec = lvl.hippoStart, bd = Infinity;
  for (const shape of lvl.water) {
    const cx = shape.reduce((s, q) => s + q.x, 0) / shape.length, cy = shape.reduce((s, q) => s + q.y, 0) / shape.length;
    for (const q of shape) {
      const inner = { x: q.x + (cx - q.x) * 0.15, y: q.y + (cy - q.y) * 0.15 }; // nudge inside the shoreline
      const d = dist(p, inner);
      if (d < bd && isWater(lvl, inner)) { bd = d; best = inner; }
    }
  }
  return best;
}
```

- [ ] **Step 5: Create `v2/src/levels/farm1.json`.** World is 2400×1400 (the camera scrolls). A winding river runs down the left third and curls under the bottom, with a peninsula near the start (mirroring the C reference); the banana field is top-right, the barn right, the leopard far bottom-right across a path, and one farmer patrols between the field and the barn.

```json
{
  "id": "farm1",
  "world": { "w": 2400, "h": 1400 },
  "water": [[
    {"x":250,"y":0},{"x":620,"y":0},{"x":560,"y":260},{"x":700,"y":520},
    {"x":1000,"y":760},{"x":1500,"y":900},{"x":2000,"y":1000},{"x":2400,"y":1080},
    {"x":2400,"y":1400},{"x":1700,"y":1400},{"x":1200,"y":1260},{"x":700,"y":1120},
    {"x":330,"y":900},{"x":200,"y":560},{"x":280,"y":260}
  ]],
  "fields": [
    [{"x":1300,"y":120},{"x":1900,"y":90},{"x":1960,"y":420},{"x":1360,"y":460}],
    [{"x":1450,"y":520},{"x":1950,"y":500},{"x":1990,"y":700},{"x":1480,"y":720}]
  ],
  "paths": [
    [{"x":900,"y":560},{"x":1250,"y":480},{"x":2150,"y":560},{"x":2200,"y":640},{"x":1260,"y":600},{"x":950,"y":660}]
  ],
  "barn": {"x":2180,"y":430},
  "plants": [
    {"x":1380,"y":180},{"x":1500,"y":170},{"x":1620,"y":160},{"x":1740,"y":150},{"x":1860,"y":140},
    {"x":1400,"y":330},{"x":1520,"y":320},{"x":1640,"y":310},{"x":1760,"y":300},{"x":1880,"y":290},
    {"x":1520,"y":600},{"x":1660,"y":590},{"x":1800,"y":580},{"x":1920,"y":570}
  ],
  "bananas": [
    {"x":1450,"y":250},{"x":1700,"y":230},{"x":1850,"y":380},
    {"x":1580,"y":650},{"x":1880,"y":640},{"x":1320,"y":400}
  ],
  "leopard": {"x":1150,"y":420},
  "hippoStart": {"x":430,"y":300},
  "farmers": [
    { "patrol": [{"x":1350,"y":480},{"x":2050,"y":470},{"x":2050,"y":740},{"x":1400,"y":760}], "facing": 0 }
  ],
  "bananaTarget": 4
}
```

(Check: `hippoStart` must be inside the smoothed water shape. If the test fails, move it toward the river center, e.g. `{"x":420,"y":200}`.)

- [ ] **Step 6: Run** `npm test`. Expected: all PASS.

- [ ] **Step 7: Commit** `git add v2 && git commit -m "v2: geometry helpers, level schema + validation, farm1 level"`

---

### Task 3: Faceted art + terrain render + Boot/Level scenes

**Files:**
- Create: `v2/src/art/facets.ts`, `v2/src/art/sprites.ts`, `v2/src/render/terrain.ts`, `v2/src/scenes/BootScene.ts`, `v2/src/scenes/LevelScene.ts`
- Modify: `v2/src/main.ts` (replace `Hello` with `[BootScene, LevelScene]`)

**Interfaces:**
- Consumes: `PALETTE`, `LevelData`, `validateLevel`, `Vec`.
- Produces:
  - `facet(g: Phaser.GameObjects.Graphics, pts: number[], color: number)` fills one polygon from a flat `[x,y,x,y...]` list.
  - `TEX` texture keys: `'hippo'`, `'hippo-sub'` (eyes/ears only), `'farmer'`, `'leopard'`, `'banana'`, `'plant'`, `'barn'`.
  - `bakeSprites(scene: Phaser.Scene): void` generates all `TEX` keys.
  - `drawTerrain(scene: Phaser.Scene, lvl: LevelData): void` draws land, fields, paths, banks and water at depth 0–2.
  - `LevelScene` registry key `'level'` holds the validated `LevelData`.

This task is visual and has no unit tests. The gate is a screenshot review against `docs/art-samples/C-textured-vector.jpg`.

- [ ] **Step 1: `facets.ts`**

```ts
import Phaser from 'phaser';
export function facet(g: Phaser.GameObjects.Graphics, pts: number[], color: number) {
  g.fillStyle(color, 1);
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath(); g.fillPath();
}
```

- [ ] **Step 2: `sprites.ts`.** Each sprite is drawn in a local box with the light coming from the top-left: light plane on top/left, base in the middle, dark plane on the right/bottom, plus a flat shadow ellipse. The hippo matches the C reference: a boxy torso with chamfered corners, a separate head block with a flat snout plane, small ears, and 4 short column legs.

```ts
import Phaser from 'phaser';
import { PALETTE as P } from './palette';
import { facet } from './facets';
export const TEX = { hippo: 'hippo', hippoSub: 'hippo-sub', farmer: 'farmer', leopard: 'leopard', banana: 'banana', plant: 'plant', barn: 'barn' } as const;

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
  const g = scene.add.graphics(); draw(g); g.generateTexture(key, w, h); g.destroy();
}
export function bakeSprites(scene: Phaser.Scene) {
  // Hippo 140x100, facing right. Shadow, legs, torso (3 planes), head (3 planes), ears, eye, nostrils.
  bake(scene, TEX.hippo, 140, 100, (g) => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(70, 90, 120, 18);
    facet(g, [30,62, 42,62, 42,88, 30,88], P.hippoDark); facet(g, [82,62, 94,62, 94,88, 82,88], P.hippoDark);
    facet(g, [22,30, 34,20, 96,20, 104,30, 104,70, 96,78, 30,78, 22,70], P.hippo);
    facet(g, [22,30, 34,20, 96,20, 104,30, 94,36, 32,36], P.hippoLight);
    facet(g, [104,30, 104,70, 96,78, 88,78, 94,36], P.hippoDark);
    facet(g, [44,64, 56,64, 56,90, 44,90], P.hippo); facet(g, [96,64, 108,64, 108,90, 96,90], P.hippo);
    facet(g, [92,26, 118,24, 132,38, 132,66, 118,74, 94,70], P.hippo);
    facet(g, [92,26, 118,24, 126,32, 100,36], P.hippoLight);
    facet(g, [118,52, 132,52, 132,66, 118,74], P.hippoDark);
    facet(g, [96,18, 104,12, 108,22], P.hippoDark); facet(g, [110,16, 118,10, 120,22], P.hippoDark);
    facet(g, [106,36, 112,36, 112,42, 106,42], P.ink);
    facet(g, [124,44, 128,44, 128,48, 124,48], P.hippoPink);
  });
  // Submerged hippo: water-colored oval, eyes, ears, snout top only.
  bake(scene, TEX.hippoSub, 80, 40, (g) => {
    g.fillStyle(P.waterLight, 0.6); g.fillEllipse(40, 26, 76, 22);
    facet(g, [22,16, 30,8, 34,20], P.hippoDark); facet(g, [42,14, 50,6, 52,20], P.hippoDark);
    facet(g, [30,18, 38,18, 38,24, 30,24], P.hippo); facet(g, [44,18, 52,18, 52,24, 44,24], P.hippo);
    facet(g, [33,19, 36,19, 36,22, 33,22], P.ink); facet(g, [47,19, 50,19, 50,22, 47,22], P.ink);
  });
  // Farmer 50x90: shadow, boots, overalls (2 planes), shirt arms, head, hat brim + crown (2 planes).
  bake(scene, TEX.farmer, 50, 90, (g) => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(25, 84, 36, 10);
    facet(g, [15,70, 23,70, 23,84, 15,84], P.soilDark); facet(g, [27,70, 35,70, 35,84, 27,84], P.soilDark);
    facet(g, [13,36, 37,36, 37,72, 13,72], P.farmerOveralls);
    facet(g, [29,36, 37,36, 37,72, 29,72], P.ink);
    facet(g, [9,34, 41,34, 41,48, 9,48], P.farmerShirt); facet(g, [15,40, 35,40, 35,56, 15,56], P.farmerOveralls);
    facet(g, [17,18, 33,18, 33,34, 17,34], P.skin);
    facet(g, [4,18, 46,18, 42,22, 8,22], P.farmerHat); facet(g, [15,6, 35,6, 37,18, 13,18], P.farmerHat);
    facet(g, [26,6, 35,6, 37,18, 28,18], P.bananaDark);
  });
  // Leopard 110x70, lying down, faceted, with a few square spots.
  bake(scene, TEX.leopard, 110, 70, (g) => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(55, 62, 96, 12);
    facet(g, [10,30, 20,22, 76,22, 84,32, 84,58, 10,58], P.leopard);
    facet(g, [10,30, 20,22, 76,22, 84,32, 20,34], P.cream);
    facet(g, [70,14, 98,14, 104,28, 98,46, 72,46], P.leopard);
    facet(g, [92,28, 104,28, 98,46, 88,46], P.leopardDark);
    facet(g, [72,8, 78,14, 70,16], P.leopardDark); facet(g, [92,8, 98,14, 90,16], P.leopardDark);
    for (const [x, y] of [[26,40],[40,46],[54,38],[62,50],[34,52]]) facet(g, [x,y, x+5,y, x+5,y+4, x,y+4], P.spot);
    facet(g, [0,52, 12,48, 14,54, 2,58], P.leopardDark);
  });
  // Banana bunch 28x24 (2 planes).
  bake(scene, TEX.banana, 28, 24, (g) => {
    facet(g, [2,10, 14,2, 26,6, 20,20, 8,22], P.banana);
    facet(g, [14,2, 26,6, 20,20, 16,12], P.bananaDark);
  });
  // Banana plant 70x90: stalk + 4 faceted leaves.
  bake(scene, TEX.plant, 70, 90, (g) => {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(35, 84, 30, 8);
    facet(g, [32,40, 38,40, 38,84, 32,84], P.plantDark);
    facet(g, [34,40, 4,22, 10,14, 36,34], P.plant); facet(g, [36,40, 66,22, 60,14, 34,34], P.plantDark);
    facet(g, [34,36, 14,4, 24,2, 36,30], P.plantLight); facet(g, [36,36, 56,4, 46,2, 34,30], P.plant);
  });
  // Barn 200x190: body (2 planes), roof (2 planes), door.
  bake(scene, TEX.barn, 200, 190, (g) => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(100, 180, 190, 20);
    facet(g, [10,80, 150,80, 150,176, 10,176], P.barn); facet(g, [150,80, 190,70, 190,166, 150,176], P.barnDark);
    facet(g, [0,82, 80,20, 160,82], P.roof); facet(g, [80,20, 180,10, 196,72, 160,82], P.roofDark);
    facet(g, [55,110, 105,110, 105,176, 55,176], P.ink);
  });
}
```

- [ ] **Step 3: `terrain.ts`.** The land fill covers the whole world. Water shapes get a rust bank: draw the shape offset by +10 px on y in `P.bank`, then the water on top, so the bank shows as a raised lip. Fields are soil with darker furrow stripes; paths are drawn in `P.path`. Everything uses smoothed outlines.

```ts
import Phaser from 'phaser';
import { PALETTE as P } from '../art/palette';
import { LevelData } from '../logic/level';
import { smoothClosedCurve, Vec } from '../logic/geometry';
function poly(g: Phaser.GameObjects.Graphics, pts: Vec[], color: number, alpha = 1, dy = 0) {
  g.fillStyle(color, alpha); g.beginPath(); g.moveTo(pts[0].x, pts[0].y + dy);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y + dy);
  g.closePath(); g.fillPath();
}
export function drawTerrain(scene: Phaser.Scene, lvl: LevelData) {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(P.land, 1).fillRect(0, 0, lvl.world.w, lvl.world.h);
  for (const path of lvl.paths) poly(g, smoothClosedCurve(path, 8), P.path);
  for (const f of lvl.fields) {
    poly(g, f, P.soilDark, 1, 8); poly(g, f, P.soil);
  }
  const water = scene.add.graphics().setDepth(1);
  for (const w of lvl.water) {
    poly(water, w, P.bankDark, 1, 14); poly(water, w, P.bank, 1, 8);
    poly(water, w, P.water);
    // inner deep band: shape scaled toward its centroid
    const cx = w.reduce((s, p) => s + p.x, 0) / w.length, cy = w.reduce((s, p) => s + p.y, 0) / w.length;
    poly(water, w.map((p) => ({ x: cx + (p.x - cx) * 0.8, y: cy + (p.y - cy) * 0.8 })), P.waterDeep, 0.35);
  }
}
```

- [ ] **Step 4: `BootScene.ts`**

```ts
import Phaser from 'phaser';
import { bakeSprites } from '../art/sprites';
import { validateLevel } from '../logic/level';
import farm1 from '../levels/farm1.json';
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    bakeSprites(this);
    this.registry.set('level', validateLevel(farm1));
    this.scene.start('Level');
  }
}
```

- [ ] **Step 5: `LevelScene.ts` (static first pass).** Draw the terrain, place the barn, plants, bananas and leopard as images with `setOrigin(0.5, 1)` and `setDepth(y)` for y-sorting; place the hippo at `hippoStart` and the farmer at `patrol[0]`. Set camera bounds to the world size, `startFollow` the hippo with lerp 0.1, zoom 1.

```ts
import Phaser from 'phaser';
import { LevelData } from '../logic/level';
import { drawTerrain } from '../render/terrain';
import { TEX } from '../art/sprites';
export class LevelScene extends Phaser.Scene {
  lvl!: LevelData;
  hippo!: Phaser.GameObjects.Image;
  constructor() { super('Level'); }
  create() {
    this.lvl = this.registry.get('level');
    drawTerrain(this, this.lvl);
    const put = (key: string, x: number, y: number) => this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(10 + y);
    put(TEX.barn, this.lvl.barn.x, this.lvl.barn.y);
    this.lvl.plants.forEach((p) => put(TEX.plant, p.x, p.y));
    this.lvl.bananas.forEach((p) => put(TEX.banana, p.x, p.y));
    put(TEX.leopard, this.lvl.leopard.x, this.lvl.leopard.y);
    this.lvl.farmers.forEach((f) => put(TEX.farmer, f.patrol[0].x, f.patrol[0].y));
    this.hippo = put(TEX.hippo, this.lvl.hippoStart.x, this.lvl.hippoStart.y);
    this.cameras.main.setBounds(0, 0, this.lvl.world.w, this.lvl.world.h).startFollow(this.hippo, true, 0.1, 0.1);
  }
}
```

- [ ] **Step 6: Wire scenes in `main.ts`**: `scene: [BootScene, LevelScene]` and remove `Hello`.

- [ ] **Step 7: Visual check.** Run `npm run dev`, open `http://localhost:5173`, screenshot to `screenshots/hh-v2-task3.png`, and compare with the C reference. Pass criteria: the water reads as true teal-blue, the banks show as a rust lip, the hippo is visibly faceted (planes, not smooth), and nothing looks inflated. Tune shapes or colors in `sprites.ts`/`palette.ts` until it passes. Also run `npm run build` (must succeed).

- [ ] **Step 8: Commit** `git add v2 && git commit -m "v2: faceted sprite builders, terrain renderer, Boot + Level scenes"`

---

### Task 4: Input (joystick math + keyboard)

**Files:**
- Create: `v2/src/logic/joystick.ts`, `v2/tests/joystick.test.ts`

**Interfaces:**
- Produces: `joystickVector(origin: Vec | null, current: Vec | null, radius = 70, deadzone = 0.15): Vec` returns a vector with length 0..1. Returns `{x:0,y:0}` if either argument is null (released) or it's inside the deadzone.

- [ ] **Step 1: Failing tests**

```ts
import { joystickVector } from '../src/logic/joystick';
it('zero when released', () => { expect(joystickVector(null, null)).toEqual({ x: 0, y: 0 }); });
it('zero inside deadzone', () => { expect(joystickVector({x:0,y:0}, {x:5,y:0})).toEqual({ x: 0, y: 0 }); });
it('clamps to unit length', () => {
  const v = joystickVector({x:0,y:0}, {x:500,y:0});
  expect(v.x).toBeCloseTo(1); expect(v.y).toBeCloseTo(0);
});
it('partial tilt is proportional', () => {
  expect(joystickVector({x:0,y:0}, {x:0,y:35}).y).toBeCloseTo(0.5);
});
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import { Vec } from './geometry';
export function joystickVector(origin: Vec | null, current: Vec | null, radius = 70, deadzone = 0.15): Vec {
  if (!origin || !current) return { x: 0, y: 0 };
  const dx = current.x - origin.x, dy = current.y - origin.y;
  const len = Math.hypot(dx, dy) / radius;
  if (len < deadzone) return { x: 0, y: 0 };
  const k = Math.min(len, 1) / (len || 1) / radius;
  return { x: dx * k, y: dy * k };
}
```

- [ ] **Step 4: Run.** Expected: PASS. **Step 5: Commit** `git add v2 && git commit -m "v2: joystick vector math"`

(The Phaser wiring for the joystick and keyboard lives in HudScene, Task 8, which calls this function.)

---

### Task 5: Hippo movement model + wiring

**Files:**
- Create: `v2/src/logic/hippo.ts`, `v2/tests/hippo.test.ts`
- Modify: `v2/src/scenes/LevelScene.ts`

**Interfaces:**
- Consumes: `Vec`, `LevelData`, `isWater`.
- Produces:
  - `type HippoState = { pos: Vec; vel: Vec; inWater: boolean; submerged: boolean; carrying: number; dashCd: number; dashT: number; splashCd: number; facingLeft: boolean }`
  - `newHippo(start: Vec): HippoState`
  - `type HippoInput = { move: Vec; dash: boolean; submerge: boolean }`
  - `stepHippo(h: HippoState, input: HippoInput, dt: number, lvl: LevelData): HippoState` (pure; dt in seconds)
  - Constants `LAND_SPEED = 260`, `WATER_SPEED = 340`, `CARRY_SLOW = 0.12` (per banana), `DASH_MULT = 2.6`, `DASH_TIME = 0.25`, `DASH_CD = 3`, `ACCEL = 10`.

- [ ] **Step 1: Failing tests**

```ts
import { newHippo, stepHippo } from '../src/logic/hippo';
import { validateLevel } from '../src/logic/level';
import farm1 from '../src/levels/farm1.json';
const lvl = validateLevel(farm1);
const idle = { move: { x: 0, y: 0 }, dash: false, submerge: false };
const right = { ...idle, move: { x: 1, y: 0 } };
it('accelerates toward input (momentum, not instant)', () => {
  const h = stepHippo(newHippo({ x: 1200, y: 300 }), right, 1 / 60, lvl);
  expect(h.vel.x).toBeGreaterThan(0);
  expect(h.vel.x).toBeLessThan(260);
});
it('water is faster than land', () => {
  const down = { ...idle, move: { x: 0, y: 1 } };
  let w = newHippo(lvl.hippoStart), l = newHippo({ x: 1200, y: 300 });
  for (let i = 0; i < 30; i++) { w = stepHippo(w, down, 1 / 60, lvl); l = stepHippo(l, down, 1 / 60, lvl); }
  expect(Math.hypot(w.vel.x, w.vel.y)).toBeGreaterThan(Math.hypot(l.vel.x, l.vel.y));
});
it('carrying slows the hippo', () => {
  let a = newHippo({ x: 1200, y: 300 }), b = { ...newHippo({ x: 1200, y: 300 }), carrying: 3 };
  for (let i = 0; i < 60; i++) { a = stepHippo(a, right, 1 / 60, lvl); b = stepHippo(b, right, 1 / 60, lvl); }
  expect(b.vel.x).toBeLessThan(a.vel.x);
});
it('dash boosts then goes on cooldown', () => {
  let h = stepHippo(newHippo({ x: 1200, y: 300 }), { ...right, dash: true }, 1 / 60, lvl);
  expect(h.dashT).toBeGreaterThan(0); expect(h.dashCd).toBeGreaterThan(2.9);
  const again = stepHippo(h, { ...right, dash: true }, 1 / 60, lvl);
  expect(again.dashCd).toBeLessThan(h.dashCd); // no re-trigger while cooling down
});
it('can only submerge in water', () => {
  expect(stepHippo(newHippo({ x: 1200, y: 300 }), { ...idle, submerge: true }, 1 / 60, lvl).submerged).toBe(false);
  expect(stepHippo(newHippo(lvl.hippoStart), { ...idle, submerge: true }, 1 / 60, lvl).submerged).toBe(true);
});
it('clamps to world bounds', () => {
  let h = newHippo({ x: 5, y: 5 });
  for (let i = 0; i < 60; i++) h = stepHippo(h, { ...idle, move: { x: -1, y: -1 } }, 1 / 60, lvl);
  expect(h.pos.x).toBeGreaterThanOrEqual(40); expect(h.pos.y).toBeGreaterThanOrEqual(40);
});
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement `hippo.ts`**

```ts
import { Vec } from './geometry';
import { LevelData, isWater } from './level';
export const LAND_SPEED = 260, WATER_SPEED = 340, CARRY_SLOW = 0.12, DASH_MULT = 2.6, DASH_TIME = 0.25, DASH_CD = 3, ACCEL = 10;
const EDGE = 40;
export type HippoState = { pos: Vec; vel: Vec; inWater: boolean; submerged: boolean; carrying: number; dashCd: number; dashT: number; splashCd: number; facingLeft: boolean };
export type HippoInput = { move: Vec; dash: boolean; submerge: boolean };
export const newHippo = (start: Vec): HippoState => ({ pos: { ...start }, vel: { x: 0, y: 0 }, inWater: false, submerged: false, carrying: 0, dashCd: 0, dashT: 0, splashCd: 0, facingLeft: false });
export function stepHippo(h: HippoState, input: HippoInput, dt: number, lvl: LevelData): HippoState {
  const inWater = isWater(lvl, h.pos);
  let dashCd = Math.max(0, h.dashCd - dt), dashT = Math.max(0, h.dashT - dt);
  if (input.dash && dashCd === 0) { dashT = DASH_TIME; dashCd = DASH_CD; }
  const base = (inWater ? WATER_SPEED : LAND_SPEED) * (1 - CARRY_SLOW * h.carrying);
  const max = base * (dashT > 0 ? DASH_MULT : 1);
  const target = { x: input.move.x * max, y: input.move.y * max };
  const a = Math.min(1, ACCEL * dt);
  const vel = { x: h.vel.x + (target.x - h.vel.x) * a, y: h.vel.y + (target.y - h.vel.y) * a };
  const pos = {
    x: Math.min(lvl.world.w - EDGE, Math.max(EDGE, h.pos.x + vel.x * dt)),
    y: Math.min(lvl.world.h - EDGE, Math.max(EDGE, h.pos.y + vel.y * dt)),
  };
  const nowWater = isWater(lvl, pos);
  const submerged = nowWater && (input.submerge || (h.submerged && Math.hypot(vel.x, vel.y) < 30));
  const facingLeft = Math.abs(vel.x) > 5 ? vel.x < 0 : h.facingLeft;
  return { ...h, pos, vel, inWater: nowWater, submerged, dashCd, dashT, splashCd: Math.max(0, h.splashCd - dt), facingLeft };
}
```

Submerge rule: the hippo submerges when the player holds still in water, or presses submerge; moving fast surfaces it. The mockup uses **auto-submerge when idle in water**: the LevelScene passes `submerge: true` when `move` is zero and the hippo is in water.

- [ ] **Step 4: Run.** Expected: PASS.

- [ ] **Step 5: Wire into `LevelScene`.** Keep a `hippoState` field; in `update(_, dtMs)` read input from the registry key `'input'` (set by HudScene in Task 8; default `{move:{x:0,y:0},dash:false}`), call `stepHippo`, then update the image position, `setFlipX(facingLeft)`, `setDepth(10 + y)`, and swap the texture to `TEX.hippoSub` when submerged. For a quick test before Task 8, add temporary arrow-key reading directly in LevelScene via `this.input.keyboard!.createCursorKeys()`; Task 8 moves it into HudScene.

```ts
// in LevelScene
hs!: HippoState;
// create(): this.hs = newHippo(this.lvl.hippoStart);
update(_t: number, dtMs: number) {
  const dt = Math.min(dtMs / 1000, 1 / 20);
  const inp = this.registry.get('input') ?? { move: { x: 0, y: 0 }, dash: false };
  const idle = inp.move.x === 0 && inp.move.y === 0;
  this.hs = stepHippo(this.hs, { move: inp.move, dash: inp.dash, submerge: idle }, dt, this.lvl);
  this.registry.set('input', { ...inp, dash: false }); // dash is a one-shot press
  this.hippo.setPosition(this.hs.pos.x, this.hs.pos.y).setFlipX(this.hs.facingLeft).setDepth(10 + this.hs.pos.y)
    .setTexture(this.hs.submerged ? TEX.hippoSub : TEX.hippo);
  this.registry.set('hippo', this.hs);
}
```

- [ ] **Step 6: Manual check.** The hippo moves with weight, is faster in the river, and sinks to eyes and ears when stopped in water. **Step 7: Commit** `git add v2 && git commit -m "v2: hippo movement model (momentum, water speed, dash, submerge) + wiring"`

---

### Task 6: Stealth (vision + awareness) + farmer

**Files:**
- Create: `v2/src/logic/stealth.ts`, `v2/tests/stealth.test.ts`
- Modify: `v2/src/scenes/LevelScene.ts`

**Interfaces:**
- Consumes: `Vec`, `angleTo`, `angleDiff`, `dist`, `HippoState`.
- Produces:
  - `VISION_RANGE = 320`, `VISION_HALF_ANGLE = Math.PI / 5`, `SUSPICIOUS_AT = 0.35`, `ALERT_AT = 1`, `FILL_RATE = 1.4` (/s while seen), `DRAIN_RATE = 0.5` (/s while unseen)
  - `canSee(eye: Vec, facing: number, target: Vec, targetSubmerged: boolean): boolean`
  - `type Awareness = 'unaware' | 'suspicious' | 'alert'`
  - `type Watcher = { meter: number; state: Awareness; stunned: number }`
  - `stepWatcher(w: Watcher, sees: boolean, dt: number): Watcher`
  - `CATCH_RADIUS = 46`

- [ ] **Step 1: Failing tests**

```ts
import { canSee, stepWatcher, VISION_RANGE } from '../src/logic/stealth';
const eye = { x: 0, y: 0 };
it('sees inside the cone', () => { expect(canSee(eye, 0, { x: 100, y: 10 }, false)).toBe(true); });
it('does not see behind', () => { expect(canSee(eye, 0, { x: -100, y: 0 }, false)).toBe(false); });
it('does not see beyond range', () => { expect(canSee(eye, 0, { x: VISION_RANGE + 1, y: 0 }, false)).toBe(false); });
it('never sees a submerged hippo', () => { expect(canSee(eye, 0, { x: 50, y: 0 }, true)).toBe(false); });
it('awareness rises unaware -> suspicious -> alert, then calms', () => {
  let w = { meter: 0, state: 'unaware' as const, stunned: 0 } as any;
  w = stepWatcher(w, true, 0.3); expect(w.state).toBe('suspicious');
  w = stepWatcher(w, true, 1.0); expect(w.state).toBe('alert');
  for (let i = 0; i < 10; i++) w = stepWatcher(w, false, 0.5);
  expect(w.state).toBe('unaware');
});
it('stunned watcher gains no awareness', () => {
  const w = stepWatcher({ meter: 0, state: 'unaware', stunned: 1 }, true, 0.5);
  expect(w.meter).toBe(0); expect(w.stunned).toBeCloseTo(0.5);
});
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement `stealth.ts`**

```ts
import { Vec, angleTo, angleDiff, dist } from './geometry';
export const VISION_RANGE = 320, VISION_HALF_ANGLE = Math.PI / 5, SUSPICIOUS_AT = 0.35, ALERT_AT = 1, FILL_RATE = 1.4, DRAIN_RATE = 0.5, CATCH_RADIUS = 46;
export type Awareness = 'unaware' | 'suspicious' | 'alert';
export type Watcher = { meter: number; state: Awareness; stunned: number };
export function canSee(eye: Vec, facing: number, target: Vec, targetSubmerged: boolean): boolean {
  if (targetSubmerged) return false;
  if (dist(eye, target) > VISION_RANGE) return false;
  return Math.abs(angleDiff(angleTo(eye, target), facing)) <= VISION_HALF_ANGLE;
}
export function stepWatcher(w: Watcher, sees: boolean, dt: number): Watcher {
  if (w.stunned > 0) return { ...w, stunned: Math.max(0, w.stunned - dt) };
  const meter = Math.min(ALERT_AT, Math.max(0, w.meter + (sees ? FILL_RATE : -DRAIN_RATE) * dt));
  const state: Awareness = meter >= ALERT_AT ? 'alert' : meter >= SUSPICIOUS_AT ? 'suspicious' : (w.state === 'alert' && meter > 0.1 ? 'suspicious' : 'unaware');
  return { ...w, meter, state };
}
```

- [ ] **Step 4: Run.** Expected: PASS.

- [ ] **Step 5: Farmer in `LevelScene`.** For each farmer keep `{ img, pos, facing, patrolIdx, watcher, cone: Graphics, icon: Text }`:
  - **Movement:** unaware = walk the patrol at 90 px/s, turning `facing` smoothly toward the next point; suspicious = turn toward the hippo's last seen position and walk at 60 px/s; alert = chase the hippo at 210 px/s (slower than the hippo on land without bananas, faster than a hippo carrying 3); stunned = stand still.
  - **Cone:** redraw each frame as a filled arc wedge (`PALETTE.cone`, alpha 0.35; alpha 0.5 tinted `PALETTE.alert` when alert), range `VISION_RANGE`, at depth 5 (on the ground under sprites).
  - **Icon** above the head: `?` in `PALETTE.suspicious` or `!` in `PALETTE.alert`, using a bold 28px sans text object.
  - **Caught:** if alert and `dist(farmer, hippo) < CATCH_RADIUS` and the hippo isn't submerged, emit `this.events.emit('caught')` (handled in Task 7), then reset this watcher to unaware and send the farmer back to its patrol.

- [ ] **Step 6: Manual check.** Walking into the cone shows `?` then `!`; diving into water makes the farmer lose track. **Step 7: Commit** `git add v2 && git commit -m "v2: vision cones, awareness state machine, patrolling farmer"`

---

### Task 7: Bananas, leopard, hearts, win/lose

**Files:**
- Create: `v2/src/logic/game.ts`, `v2/tests/game.test.ts`
- Modify: `v2/src/scenes/LevelScene.ts`

**Interfaces:**
- Produces:
  - `CARRY_MAX = 3`, `PICK_RADIUS = 50`, `FEED_RADIUS = 90`, `START_HEARTS = 3`
  - `type GameState = { hearts: number; carried: number; delivered: number; target: number; remaining: boolean[]; status: 'playing' | 'won' | 'lost' }`
  - `newGame(bananaCount: number, target: number): GameState`
  - `pickup(s: GameState, index: number): GameState` (no-op if at `CARRY_MAX`, already taken, or not playing)
  - `deliver(s: GameState): GameState` (no-op if carrying 0; sets `won` when `delivered >= target`)
  - `caught(s: GameState): GameState` (−1 heart, carried set to 0, `lost` at 0 hearts). The scene then calls `restoreDropped` so the dropped bananas reappear at their original spots.
  - `restoreDropped(s: GameState, taken: number[]): GameState` re-enables the given banana indices

- [ ] **Step 1: Failing tests**

```ts
import { newGame, pickup, deliver, caught, restoreDropped } from '../src/logic/game';
it('picks up to the carry cap of 3', () => {
  let s = newGame(5, 4);
  for (const i of [0, 1, 2, 3]) s = pickup(s, i);
  expect(s.carried).toBe(3); expect(s.remaining[3]).toBe(true);
});
it('cannot pick the same banana twice', () => {
  let s = pickup(newGame(2, 1), 0); s = pickup(s, 0); expect(s.carried).toBe(1);
});
it('delivering with 0 does nothing', () => { expect(deliver(newGame(2, 1))).toEqual(newGame(2, 1)); });
it('delivery counts and wins at target', () => {
  let s = newGame(4, 2); s = pickup(pickup(s, 0), 1); s = deliver(s);
  expect(s.delivered).toBe(2); expect(s.carried).toBe(0); expect(s.status).toBe('won');
});
it('caught costs a heart and drops carried bananas', () => {
  let s = pickup(newGame(3, 2), 0); s = caught(s);
  expect(s.hearts).toBe(2); expect(s.carried).toBe(0);
});
it('dropped bananas can be restored', () => {
  let s = pickup(newGame(3, 2), 0); s = restoreDropped(caught(s), [0]); expect(s.remaining[0]).toBe(true);
});
it('loses at 0 hearts', () => {
  let s = newGame(3, 2); s = caught(caught(caught(s))); expect(s.status).toBe('lost');
});
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement `game.ts`**

```ts
export const CARRY_MAX = 3, PICK_RADIUS = 50, FEED_RADIUS = 90, START_HEARTS = 3;
export type GameState = { hearts: number; carried: number; delivered: number; target: number; remaining: boolean[]; status: 'playing' | 'won' | 'lost' };
export const newGame = (count: number, target: number): GameState => ({ hearts: START_HEARTS, carried: 0, delivered: 0, target, remaining: Array(count).fill(true), status: 'playing' });
export function pickup(s: GameState, i: number): GameState {
  if (s.status !== 'playing' || s.carried >= CARRY_MAX || !s.remaining[i]) return s;
  const remaining = s.remaining.slice(); remaining[i] = false;
  return { ...s, carried: s.carried + 1, remaining };
}
export function deliver(s: GameState): GameState {
  if (s.status !== 'playing' || s.carried === 0) return s;
  const delivered = s.delivered + s.carried;
  return { ...s, carried: 0, delivered, status: delivered >= s.target ? 'won' : 'playing' };
}
export function caught(s: GameState): GameState {
  if (s.status !== 'playing') return s;
  const hearts = s.hearts - 1;
  return { ...s, hearts, carried: 0, status: hearts <= 0 ? 'lost' : 'playing' };
}
export function restoreDropped(s: GameState, taken: number[]): GameState {
  const remaining = s.remaining.slice(); for (const i of taken) remaining[i] = true;
  return { ...s, remaining };
}
```

- [ ] **Step 4: Run.** Expected: PASS.

- [ ] **Step 5: Wire in `LevelScene`.**
  - Keep `gs: GameState` and `carriedIdx: number[]`. Each frame: for each remaining banana within `PICK_RADIUS` of the (non-submerged) hippo, call `pickup`, hide that banana image, and push its index. Set `hs.carrying = gs.carried`, and show up to 3 small banana images stacked on the hippo's back (offset −y, following the hippo).
  - Within `FEED_RADIUS` of the leopard, call `deliver`, clear `carriedIdx`, and play a quick scale-pop tween on the leopard.
  - On the `'caught'` event: `gs = restoreDropped(caught(gs), carriedIdx)`, show those bananas again, clear `carriedIdx`, teleport the hippo to `nearestWaterPoint(lvl, hippoPos)`, and flash the camera (`this.cameras.main.flash(200, 243, 234, 211)`).
  - When status becomes `won` or `lost`: pause updates and show a centered cream card (rounded rect `PALETTE.cream`, `ink` text: "Heist complete!" or "Caught! Try again") with a "Play again" button that calls `this.scene.restart()` (and restarts Hud).
  - Publish `this.registry.set('game', gs)` every frame for the HUD.

- [ ] **Step 6: Manual check.** A full loop works: grab 3 → feed → grab 1 → feed → win. Getting caught drops the bananas back to the field. **Step 7: Commit** `git add v2 && git commit -m "v2: banana pickup, leopard delivery, hearts, win/lose card"`

---

### Task 8: HUD, touch controls, effects, rotate prompt

**Files:**
- Create: `v2/src/scenes/HudScene.ts`, `v2/src/render/effects.ts`
- Modify: `v2/src/scenes/LevelScene.ts` (launch HUD, add effects, remove temp cursor keys), `v2/src/main.ts` (add `HudScene`), `v2/index.html` (rotate overlay)

**Interfaces:**
- Consumes: `joystickVector`, registry keys `'game'` (GameState) and `'hippo'` (HippoState).
- Produces: registry key `'input'`: `{ move: Vec; dash: boolean }`.

- [ ] **Step 1: `HudScene`** (launched by `LevelScene.create()` via `this.scene.launch('Hud')`, fixed to the screen, not scrolling):
  - **Top-left pills:** a cream rounded rect (radius 22) holding the banana image + `delivered/target` text, then a second pill with 3 hearts (faceted heart polygons in `PALETTE.alert`; lost hearts drawn as `creamDark` outlines).
  - **Top-right:** round pause button (two ink bars). It toggles `this.scene.pause('Level')`/`resume` and shows "Paused" text.
  - **Floating joystick:** on `pointerdown` with `x < GAME_W / 2`, record `origin` and that pointer's id and show a translucent cream ring (r=70, alpha 0.35) plus a knob (r=28, alpha 0.6). On `pointermove` for the same id, update the knob (clamped to 70). On `pointerup`, clear it and hide. Each frame compute `joystickVector(origin, current)`.
  - **Dash button:** circle r=64 at (GAME_W−110, GAME_H−120) in cream with an ink "DASH" label. `pointerdown` sets `dash: true`. The cooldown sweep is an ink arc at alpha 0.35 whose sweep is proportional to `hippo.dashCd / 3`.
  - **Splash button** (placeholder for the slice, visual only in the mockup): circle r=44 at (GAME_W−250, GAME_H−70), grayed out (alpha 0.35) when `!hippo.inWater`.
  - **Keyboard:** WASD/arrows produce `move` (normalized), Space sets `dash`, and Esc toggles pause. Keyboard and joystick are combined: if the joystick is non-zero it wins; otherwise the keys are used.
  - Each frame write `this.registry.set('input', { move, dash: dashPressed || prev.dash })`, then reset the local `dashPressed`.
  - **Safe area:** at create, read `env(safe-area-inset-left/right)` through a CSS variable on `#game` (set in index.html: `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` with `box-sizing: border-box`). This keeps the canvas inside the safe area so the HUD needs no extra offsets.

- [ ] **Step 2: `effects.ts`**
  - `addGrain(scene)`: generate a 256×256 noise texture once (random gray pixels, alpha 0.06–0.1) with a canvas texture, add it as a `TileSprite` covering the camera with `setScrollFactor(0)` at depth 10000, and offset `tilePosition` randomly every ~120 ms for a subtle film-grain look.
  - `addRipples(scene, lvl)`: every 900 ms pick a random point inside a water shape and spawn 2 concentric circles (stroke `waterLight`, width 3, alpha 0.7) that scale 0.2→1 and fade out over 1.8 s, at depth 2. Also spawn a ripple under the hippo when it submerges or moves in water.
  - When `matchMedia('(prefers-reduced-motion: reduce)').matches`, halve the ripple rate and freeze the grain offset.

- [ ] **Step 3: Rotate prompt** (in `index.html`, pure CSS + text, no `innerHTML`): add
```html
<div id="rotate"><div>🦛</div><p>Turn your phone sideways to play</p></div>
```
with CSS `#rotate{display:none;position:fixed;inset:0;background:#6f6a3a;color:#f3ead3;font:600 20px system-ui;align-items:center;justify-content:center;flex-direction:column;text-align:center;z-index:10} #rotate div{font-size:64px;transform:rotate(90deg)} @media (orientation: portrait) and (pointer: coarse){#rotate{display:flex}}`. Phaser's FIT scaling handles the resize on rotating back.

- [ ] **Step 4: Remove the temporary cursor-key code from LevelScene** and verify input only comes from the registry.

- [ ] **Step 5: Run** `npm test` (all PASS) and `npm run build` (succeeds). **Step 6: Commit** `git add v2 && git commit -m "v2: HUD, floating joystick, dash button, grain + ripples, rotate prompt"`

---

### Task 9: Preview + device test

**Files:**
- Modify: `TASKS.md` (tick the mockup items, record results)

- [ ] **Step 1: Desktop check.** Run `cd v2 && npm run build && npm run preview`, open `http://localhost:4173`, and play one full win and one full loss. Screenshot to `screenshots/hh-v2-mockup-desktop.png`.

- [ ] **Step 2: iPhone over LAN.** `npm run preview` already binds `--host`. Find the PC's LAN IP (`ipconfig` → IPv4) and have Brian open `http://<ip>:4173` on the iPhone (same Wi-Fi). If it doesn't load, allow TCP 4173 inbound on the Private profile in Windows Firewall. This is a change outside the repo, so ask Brian first.

- [ ] **Step 3: Brian's device checklist** (ask him to report each):
  1. The look matches the C reference (faceted hippo, true-blue water, not muddy).
  2. Landscape fills the screen; portrait shows the rotate prompt; rotating back resumes play.
  3. Joystick with the left thumb while tapping Dash with the right both work at the same time.
  4. Joystick release stops the hippo (no drift).
  5. It stays smooth (no visible stutter).

- [ ] **Step 4: Record** the results and any requested tweaks in `TASKS.md`; commit `git add TASKS.md && git commit -m "v2 mockup: device test results"` and push `git push origin rebuild`.
