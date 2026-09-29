# Hippo Heist v2 Vertical Slice A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the mockup into a real game loop: Title → World map → Level 1 (Back Pond) / Level 2 (Irrigation Ditches) → Results with stars → saved progress, with farmers that respect water and synthesized SFX.

**Architecture:** Builds on the `v2/` mockup (Phaser 3 + Vite + TS). Rules stay in pure `src/logic/*` modules with Vitest tests; scenes only render and wire. Levels are JSON validated at boot; a registry lists them in order. Progress lives in a versioned localStorage save behind a storage interface, so it's testable with a fake.

**Tech Stack:** Phaser 3.90, Vite 5, TypeScript strict, Vitest, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-09-29-hippo-heist-v2-design.md` (see §5 "Level design rules")
**Previous plan:** `docs/superpowers/plans/2026-09-29-hippo-heist-v2-mockup.md` (its ledger's deferred minors are Task 1 here)

## Global Constraints

- All code in `v2/`. Work on the `rebuild` branch only; never push to `main`.
- Logical size 1280×720, FIT scaling. All art is drawn in code; colors come only from `src/art/palette.ts`; faceted style (see `docs/art-samples/C-textured-vector.jpg`).
- No `innerHTML`. No image or audio files. SFX are synthesized with Web Audio. **Music is deferred** (ruling: needs CC0 track selection and downloads).
- Level design rules (spec §5) are enforced by tests where measurable: every banana is ≤ 450 px from water (about 2 s at land speed + dash).
- Carry max 3, hearts 3, stars = clear / beat the time target / never spotted (never reached `alert`).
- Save key `hippoheist.v2.save`, schema `version: 1`. Corrupt or missing saves must never crash the game.
- Out of scope (Plan B): obstacles/collision, Splash, lanterns, Mud Coat, Banana Magnet, levels 3–4, iPhone test, music, PWA, the `/classic/` deploy.

## Review Focus

1. **Corrupt or old save data** (bad JSON, wrong version, localStorage throwing in private mode) must load as a fresh save, never crash. Owned by Task 5 (tests).
2. **Farmer chasing the hippo toward water** must stop or slide along the bank, never walk onto the water or jitter in place. Owned by Task 3 (tests plus a browser check).
3. **Replaying a level with fewer stars** must never lower the saved best. Owned by Task 5 (test).
4. **Locked levels** can't be started from the map, and finishing the last level doesn't offer "Next". Owned by Task 6 (tests) and Task 9 (browser check).
5. **Audio on iOS** only starts after a user gesture, and muting persists across reloads. Owned by Task 10 (browser check; the iOS device check is in Plan B).

---

## File Structure (new or changed)

```
v2/src/
  logic/level.ts        + channels (polyline+width → polygon), timeTarget, name; distToWater
  logic/geometry.ts     + strokeToPolygon, distToSegment
  logic/move.ts         NEW stepToward (water-blocked movement with axis slide)
  logic/score.ts        NEW scoreStars
  logic/save.ts         NEW SaveData, loadSave, recordResult, Storage interface
  logic/progress.ts     NEW isUnlocked, nextLevelId
  levels/index.ts       NEW ordered registry [pond, ditches]
  levels/pond.json      NEW Level 1 Back Pond
  levels/ditches.json   NEW Level 2 Irrigation Ditches
  audio/sfx.ts          NEW Web Audio synth + unlock + mute
  scenes/TitleScene.ts  NEW
  scenes/MapScene.ts    NEW
  scenes/BootScene.ts   load all levels, start Title
  scenes/LevelScene.ts  level by id, timer, spotted, results card, sfx hooks
  scenes/HudScene.ts    timer pill, deferred-minor fixes, mute button
  entities/Farmer.ts    uses stepToward
tests/                  move, score, save, progress, level rules
```

---

### Task 1: Deferred review fixes from the mockup

**Files:** Modify `v2/src/scenes/HudScene.ts`, `v2/src/scenes/LevelScene.ts`

**Interfaces:** Produces registry key `'ended'` (boolean), set true by LevelScene when the end card shows and false in `create()`.

This is scene glue with no pure logic, so it's verified in the browser (ruling recorded in the ledger).

- [ ] **Step 1: LevelScene**: in `create()` add `this.registry.set('ended', false); this.registry.set('hippo', this.hs); this.rippleCd = 0;` (after `this.hs` is created). In `showEnd()` add `this.registry.set('ended', true);`.
- [ ] **Step 2: HudScene**:
  - `togglePause()`: `if (this.registry.get('ended')) return;` at the top.
  - The joystick `pointerdown` handler: `if (this.registry.get('ended') || this.scene.isPaused('Level')) return;` at the top.
  - `update()`: when `this.scene.isPaused('Level')`, set `this.dashPressed = false` and skip writing dash (write `{ move: {x:0,y:0}, dash: false }`).
- [ ] **Step 3: Browser check** (drive it with `window.__game` + `game.step` while the tab is hidden):
  - After a win, Esc does NOT pause and "Play again" works.
  - Space while paused → no dash after resume (`hs.dashT === 0`).
  - Clicking Play again on its left half doesn't show the joystick ring.
- [ ] **Step 4:** `npx tsc --noEmit` and `npm test` pass. Commit `git add v2 && git commit -m "v2: fix mockup review minors (pause/end-card/dash/joystick/HUD reset)"`.

---

### Task 2: Level format: channels, time target, distance to water

**Files:**
- Modify: `v2/src/logic/geometry.ts`, `v2/src/logic/level.ts`
- Test: `v2/tests/geometry.test.ts` (append), `v2/tests/level.test.ts` (append)

**Interfaces:**
- Produces:
  - `distToSegment(p: Vec, a: Vec, b: Vec): number`
  - `strokeToPolygon(points: Vec[], width: number): Vec[]` (closed polygon around a polyline: left offsets forward, then right offsets backward)
  - `LevelData` gains `name: string`, `timeTarget: number` (seconds), and optional input field `channels?: { points: Vec[]; width: number }[]`. `validateLevel` converts each channel to a polygon with `strokeToPolygon` and appends it to `water` (channels are NOT smoothed; river shapes still are).
  - `distToWater(lvl: LevelData, p: Vec): number` (0 if inside water; otherwise min distance to any water polygon edge)

- [ ] **Step 1: Failing tests** (append):

`tests/geometry.test.ts`:
```ts
import { distToSegment, strokeToPolygon, pointInPolygon } from '../src/logic/geometry';
it('distToSegment measures to the nearest point', () => {
  expect(distToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  expect(distToSegment({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
});
it('strokeToPolygon wraps a polyline with the given width', () => {
  const poly = strokeToPolygon([{ x: 0, y: 0 }, { x: 100, y: 0 }], 20);
  expect(pointInPolygon({ x: 50, y: 5 }, poly)).toBe(true);
  expect(pointInPolygon({ x: 50, y: 15 }, poly)).toBe(false);
});
```

`tests/level.test.ts`:
```ts
import { distToWater } from '../src/logic/level';
it('channels become water and distToWater measures to them', () => {
  const lvl = validateLevel({ ...farm1, name: 'T', timeTarget: 60,
    channels: [{ width: 40, points: [{ x: 1200, y: 100 }, { x: 1200, y: 400 }] }] });
  expect(isWater(lvl, { x: 1200, y: 250 })).toBe(true);
  expect(distToWater(lvl, { x: 1300, y: 250 })).toBeCloseTo(80, 0);
  expect(distToWater(lvl, { x: 1200, y: 250 })).toBe(0);
});
it('rejects a missing timeTarget', () => {
  const { timeTarget: _omit, ...noTime } = farm1 as Record<string, unknown>;
  expect(() => validateLevel(noTime)).toThrow(/timeTarget/);
});
```
Also update `src/levels/farm1.json` to add `"name": "Test Farm", "timeTarget": 120` so the existing tests keep passing.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL (missing exports / no timeTarget validation).

- [ ] **Step 3: Implement** (`geometry.ts` additions):
```ts
export function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
export function strokeToPolygon(points: Vec[], width: number): Vec[] {
  const h = width / 2, left: Vec[] = [], right: Vec[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * h, ny = dx / l * h;
    left.push({ x: p.x + nx, y: p.y + ny }); right.push({ x: p.x - nx, y: p.y - ny });
  });
  return [...left, ...right.reverse()];
}
```
`level.ts` changes: add `name: string; timeTarget: number;` to `LevelData`; in `validateLevel` add
```ts
  need('name', typeof d.name === 'string' && d.name.length > 0);
  need('timeTarget', typeof d.timeTarget === 'number' && d.timeTarget > 0);
  const channels = d.channels ?? [];
  need('channels', Array.isArray(channels) && channels.every((c: any) => c.width > 0 && Array.isArray(c.points) && c.points.length >= 2 && c.points.every(isVec)));
```
and build water as `[...d.water.map((s: Vec[]) => smoothClosedCurve(s, 10)), ...channels.map((c: any) => strokeToPolygon(c.points, c.width))]`. Add:
```ts
export function distToWater(lvl: LevelData, p: Vec): number {
  if (isWater(lvl, p)) return 0;
  let best = Infinity;
  for (const s of lvl.water) for (let i = 0; i < s.length; i++) best = Math.min(best, distToSegment(p, s[i], s[(i + 1) % s.length]));
  return best;
}
```
(Change `need('water', d.water.length >= 1)` to allow zero river shapes when there are channels: `need('water', d.water.length + channels.length >= 1)`.)

- [ ] **Step 4: Run** `npm test`. Expected: PASS. **Step 5: Commit** `git add v2 && git commit -m "v2: level channels, time target, distToWater"`

---

### Task 3: Farmers respect water

**Files:** Create `v2/src/logic/move.ts`, `v2/tests/move.test.ts`; Modify `v2/src/entities/Farmer.ts`, `v2/src/scenes/LevelScene.ts` (pass the level into Farmer)

**Interfaces:**
- Produces: `stepToward(pos: Vec, target: Vec, maxStep: number, blocked: (p: Vec) => boolean): Vec`. Moves up to `maxStep` toward `target`. If the full step lands in a blocked spot, it tries the x-only then the y-only component (sliding along the bank); if all are blocked it returns `pos` unchanged.
- Farmer constructor becomes `new Farmer(scene, data, lvl: LevelData)`.

- [ ] **Step 1: Failing tests** (`tests/move.test.ts`):
```ts
import { stepToward } from '../src/logic/move';
const wallAtX100 = (p: { x: number }) => p.x > 100;
it('moves toward the target by at most maxStep', () => {
  expect(stepToward({ x: 0, y: 0 }, { x: 50, y: 0 }, 10, () => false)).toEqual({ x: 10, y: 0 });
});
it('does not overshoot', () => {
  expect(stepToward({ x: 0, y: 0 }, { x: 5, y: 0 }, 10, () => false)).toEqual({ x: 5, y: 0 });
});
it('slides along a blocked axis', () => {
  const p = stepToward({ x: 98, y: 0 }, { x: 200, y: 100 }, 10, wallAtX100);
  expect(p.x).toBeLessThanOrEqual(100); expect(p.y).toBeGreaterThan(0);
});
it('stays put when fully blocked', () => {
  expect(stepToward({ x: 100, y: 0 }, { x: 200, y: 0 }, 10, wallAtX100)).toEqual({ x: 100, y: 0 });
});
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**
```ts
import { Vec } from './geometry';
export function stepToward(pos: Vec, target: Vec, maxStep: number, blocked: (p: Vec) => boolean): Vec {
  const dx = target.x - pos.x, dy = target.y - pos.y, d = Math.hypot(dx, dy);
  if (d === 0) return pos;
  const k = Math.min(1, maxStep / d);
  const full = { x: pos.x + dx * k, y: pos.y + dy * k };
  if (!blocked(full)) return full;
  const sx = { x: pos.x + Math.sign(dx) * Math.min(Math.abs(dx), maxStep), y: pos.y };
  if (dx !== 0 && !blocked(sx)) return sx;
  const sy = { x: pos.x, y: pos.y + Math.sign(dy) * Math.min(Math.abs(dy), maxStep) };
  if (dy !== 0 && !blocked(sy)) return sy;
  return pos;
}
```
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Wire.** In `Farmer.update`, replace the manual position step with `this.pos = stepToward(this.pos, target, SPEED[st] * dt, (p) => isWater(this.lvl, p));`. Keep the facing turn toward `want`. If in the `unaware` state the farmer didn't move for 1.5 s (stuck), advance `patrolIdx`. If in the `alert` state the hippo is in water, the farmer holds at the bank (the stepToward result) and awareness drains naturally.
- [ ] **Step 6: Browser check.** Put the hippo in water in front of an alert farmer: the farmer stops at the bank without jittering onto the water. Commit `git add v2 && git commit -m "v2: farmers can't walk onto water"`.

---

### Task 4: Stars, level timer, spotted flag

**Files:** Create `v2/src/logic/score.ts`, `v2/tests/score.test.ts`; Modify `v2/src/logic/game.ts` (+ test), `LevelScene.ts`, `HudScene.ts`

**Interfaces:**
- Produces:
  - `scoreStars(r: { won: boolean; time: number; timeTarget: number; spotted: boolean }): 0 | 1 | 2 | 3`
  - `GameState` gains `time: number; spotted: boolean`; `newGame` initializes them to `0`/`false`; new `tick(s, dt)` adds time while playing; `markSpotted(s)` sets spotted.

- [ ] **Step 1: Failing tests** (`tests/score.test.ts` + append to `tests/game.test.ts`):
```ts
import { scoreStars } from '../src/logic/score';
const base = { won: true, time: 50, timeTarget: 60, spotted: false };
it('3 stars: won, fast, unseen', () => { expect(scoreStars(base)).toBe(3); });
it('2 stars when spotted', () => { expect(scoreStars({ ...base, spotted: true })).toBe(2); });
it('2 stars when slow', () => { expect(scoreStars({ ...base, time: 61 })).toBe(2); });
it('1 star when slow and spotted', () => { expect(scoreStars({ ...base, time: 61, spotted: true })).toBe(1); });
it('0 stars when lost', () => { expect(scoreStars({ ...base, won: false })).toBe(0); });
```
```ts
import { tick, markSpotted } from '../src/logic/game';
it('tick only counts while playing', () => {
  let s = tick(newGame(2, 1), 1.5); expect(s.time).toBeCloseTo(1.5);
  s = deliver(pickup(s, 0)); s = tick(s, 5); expect(s.time).toBeCloseTo(1.5);
});
it('markSpotted sets the flag', () => { expect(markSpotted(newGame(1, 1)).spotted).toBe(true); });
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**
```ts
// score.ts
export function scoreStars(r: { won: boolean; time: number; timeTarget: number; spotted: boolean }): 0 | 1 | 2 | 3 {
  if (!r.won) return 0;
  return (1 + (r.time <= r.timeTarget ? 1 : 0) + (r.spotted ? 0 : 1)) as 1 | 2 | 3;
}
// game.ts additions (GameState gets time: number; spotted: boolean; newGame sets time: 0, spotted: false)
export const tick = (s: GameState, dt: number): GameState => (s.status === 'playing' ? { ...s, time: s.time + dt } : s);
export const markSpotted = (s: GameState): GameState => (s.spotted ? s : { ...s, spotted: true });
```
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Wire.** In LevelScene `update`: `this.gs = tick(this.gs, dt)`, and if any farmer's `watcher.state === 'alert'`, call `this.gs = markSpotted(this.gs)`. HUD: a third cream pill at x 348–478 showing `m:ss` of `gs.time`, with the text in `PALETTE.alert` color once `time > timeTarget` (read `level.timeTarget` from registry `'level'`). Commit `git add v2 && git commit -m "v2: stars scoring, level timer, spotted tracking"`.

---

### Task 5: Save data

**Files:** Create `v2/src/logic/save.ts`, `v2/tests/save.test.ts`

**Interfaces:**
- Produces:
  - `type SaveData = { version: 1; levels: Record<string, { stars: number }>; muted: boolean }`
  - `type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void }`
  - `SAVE_KEY = 'hippoheist.v2.save'`
  - `freshSave(): SaveData`
  - `loadSave(kv: KV | null): SaveData`. It never throws; bad JSON, a wrong version, or a throwing kv all return `freshSave()`.
  - `writeSave(kv: KV | null, s: SaveData): void` (never throws)
  - `recordResult(s: SaveData, levelId: string, stars: number): SaveData` (keeps the best)
  - `safeStorage(): KV | null` (returns `window.localStorage` inside try/catch, else null)

- [ ] **Step 1: Failing tests**
```ts
import { loadSave, writeSave, recordResult, freshSave, SAVE_KEY, KV } from '../src/logic/save';
const mem = (init: Record<string, string> = {}): KV => ({ getItem: (k) => init[k] ?? null, setItem: (k, v) => { init[k] = v; } });
it('missing save → fresh', () => { expect(loadSave(mem())).toEqual(freshSave()); });
it('corrupt JSON → fresh', () => { expect(loadSave(mem({ [SAVE_KEY]: '{nope' }))).toEqual(freshSave()); });
it('wrong version → fresh', () => { expect(loadSave(mem({ [SAVE_KEY]: '{"version":99}' }))).toEqual(freshSave()); });
it('throwing storage → fresh, and write does not throw', () => {
  const bad: KV = { getItem: () => { throw new Error('private'); }, setItem: () => { throw new Error('quota'); } };
  expect(loadSave(bad)).toEqual(freshSave());
  expect(() => writeSave(bad, freshSave())).not.toThrow();
});
it('round-trips', () => {
  const kv = mem(); const s = recordResult(freshSave(), 'pond', 2); writeSave(kv, s);
  expect(loadSave(kv)).toEqual(s);
});
it('keeps the best stars', () => {
  expect(recordResult(recordResult(freshSave(), 'pond', 3), 'pond', 1).levels.pond.stars).toBe(3);
});
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**
```ts
export type SaveData = { version: 1; levels: Record<string, { stars: number }>; muted: boolean };
export type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };
export const SAVE_KEY = 'hippoheist.v2.save';
export const freshSave = (): SaveData => ({ version: 1, levels: {}, muted: false });
export function loadSave(kv: KV | null): SaveData {
  try {
    const raw = kv?.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    const d = JSON.parse(raw);
    if (d?.version !== 1 || typeof d.levels !== 'object' || d.levels === null) return freshSave();
    return { version: 1, levels: d.levels, muted: !!d.muted };
  } catch { return freshSave(); }
}
export function writeSave(kv: KV | null, s: SaveData): void { try { kv?.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* storage full or blocked: progress is kept in memory only */ } }
export function recordResult(s: SaveData, levelId: string, stars: number): SaveData {
  const best = Math.max(stars, s.levels[levelId]?.stars ?? 0);
  return { ...s, levels: { ...s.levels, [levelId]: { stars: best } } };
}
export function safeStorage(): KV | null { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; } }
```
- [ ] **Step 4: Run.** Expected: PASS. **Step 5: Commit** `git add v2 && git commit -m "v2: versioned, crash-proof save data"`

---

### Task 6: Level registry + progression

**Files:** Create `v2/src/levels/index.ts`, `v2/src/logic/progress.ts`, `v2/tests/progress.test.ts`; Modify `BootScene.ts`, `LevelScene.ts`

**Interfaces:**
- Produces:
  - `LEVEL_ORDER: string[]` = `['pond', 'ditches']`; `RAW_LEVELS: Record<string, unknown>` (`index.ts` imports the JSON; until Tasks 7–8 land, `pond`/`ditches` both temporarily point at `farm1.json`, since the registry test only checks ids)
  - `isUnlocked(save: SaveData, order: string[], id: string): boolean`: the first level is always unlocked; each later level unlocks when the previous one has ≥ 1 star
  - `nextLevelId(order: string[], id: string): string | null`
  - Registry keys: `'levels'` (Record<id, LevelData>), `'levelId'` (current), `'save'` (SaveData)

- [ ] **Step 1: Failing tests**
```ts
import { isUnlocked, nextLevelId } from '../src/logic/progress';
import { freshSave, recordResult } from '../src/logic/save';
const order = ['pond', 'ditches', 'barn'];
it('first level always unlocked', () => { expect(isUnlocked(freshSave(), order, 'pond')).toBe(true); });
it('later levels need a star on the previous one', () => {
  expect(isUnlocked(freshSave(), order, 'ditches')).toBe(false);
  expect(isUnlocked(recordResult(freshSave(), 'pond', 1), order, 'ditches')).toBe(true);
});
it('unknown level is locked', () => { expect(isUnlocked(freshSave(), order, 'nope')).toBe(false); });
it('nextLevelId is null after the last level', () => {
  expect(nextLevelId(order, 'pond')).toBe('ditches'); expect(nextLevelId(order, 'barn')).toBeNull();
});
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**
```ts
import { SaveData } from './save';
export function isUnlocked(save: SaveData, order: string[], id: string): boolean {
  const i = order.indexOf(id);
  if (i < 0) return false;
  return i === 0 || (save.levels[order[i - 1]]?.stars ?? 0) >= 1;
}
export function nextLevelId(order: string[], id: string): string | null {
  const i = order.indexOf(id); return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}
```
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Wire.** BootScene: validate every level in `RAW_LEVELS` into registry `'levels'`, set `'save'` = `loadSave(safeStorage())`, set `'levelId'` = `LEVEL_ORDER[0]`, and start `'Level'` for now (`'Title'` after Task 9). LevelScene `create()`: `this.lvl = this.registry.get('levels')[this.registry.get('levelId')]` and also `this.registry.set('level', this.lvl)` (the HUD reads it). Commit `git add v2 && git commit -m "v2: level registry and unlock progression"`.

---

### Task 7: Level 1: Back Pond

**Files:** Create `v2/src/levels/pond.json`; Modify `v2/src/levels/index.ts` (point `pond` at it); Test `v2/tests/levels.test.ts`

**Design:** A round pond in the middle of the farm, with banana patches at the four corners around it. One slow farmer circles the pond on the ring road. The leopard is on the east bank past the ring, so the carry home crosses the patrol. The hippo starts in the pond. New idea: sinking to hide.

- [ ] **Step 1: Failing rule tests** (`tests/levels.test.ts`). These apply to every registered level, so levels 2–4 inherit them:
```ts
import { RAW_LEVELS, LEVEL_ORDER } from '../src/levels/index';
import { validateLevel, distToWater, isWater } from '../src/logic/level';
for (const id of LEVEL_ORDER) {
  describe(id, () => {
    const lvl = validateLevel(RAW_LEVELS[id]);
    it('is valid and its id matches', () => { expect(lvl.id).toBe(id); });
    it('hippo starts in water', () => { expect(isWater(lvl, lvl.hippoStart)).toBe(true); });
    it('rule 1: every banana is within a dash of water', () => {
      for (const b of lvl.bananas) expect(distToWater(lvl, b)).toBeLessThanOrEqual(450);
    });
    it('bananas, leopard and patrol points are on land', () => {
      for (const p of [...lvl.bananas, lvl.leopard, ...lvl.farmers.flatMap((f) => f.patrol)]) expect(isWater(lvl, p)).toBe(false);
    });
  });
}
```
- [ ] **Step 2: Run.** Expected: FAIL (`pond` still points at farm1, whose id is `farm1`).
- [ ] **Step 3: Create `pond.json`**
```json
{
  "id": "pond", "name": "Back Pond", "timeTarget": 90,
  "world": { "w": 2000, "h": 1300 },
  "water": [[
    {"x":1310,"y":640},{"x":1250,"y":790},{"x":1090,"y":870},{"x":900,"y":850},{"x":745,"y":770},
    {"x":690,"y":640},{"x":760,"y":515},{"x":915,"y":430},{"x":1100,"y":445},{"x":1245,"y":515}
  ]],
  "fields": [
    [{"x":430,"y":220},{"x":820,"y":200},{"x":840,"y":400},{"x":450,"y":420}],
    [{"x":1250,"y":200},{"x":1600,"y":210},{"x":1590,"y":380},{"x":1260,"y":400}],
    [{"x":430,"y":920},{"x":820,"y":900},{"x":840,"y":1100},{"x":450,"y":1110}],
    [{"x":1250,"y":900},{"x":1600,"y":910},{"x":1590,"y":1100},{"x":1260,"y":1110}]
  ],
  "paths": [[{"x":1330,"y":610},{"x":1700,"y":590},{"x":1720,"y":720},{"x":1330,"y":700}]],
  "barn": {"x":1780,"y":330},
  "plants": [
    {"x":500,"y":300},{"x":640,"y":290},{"x":760,"y":280},{"x":1320,"y":290},{"x":1540,"y":280},
    {"x":500,"y":1020},{"x":760,"y":1000},{"x":1320,"y":1010},{"x":1530,"y":1000}
  ],
  "bananas": [{"x":560,"y":340},{"x":700,"y":370},{"x":1420,"y":300},{"x":560,"y":1000},{"x":1450,"y":1000}],
  "leopard": {"x":1760,"y":660},
  "hippoStart": {"x":1000,"y":650},
  "farmers": [{ "patrol": [{"x":1000,"y":250},{"x":1450,"y":420},{"x":1480,"y":880},{"x":1000,"y":1070},{"x":540,"y":880},{"x":520,"y":420}], "facing": 0 }],
  "bananaTarget": 3
}
```
Point `index.ts` `pond` at `./pond.json`.
- [ ] **Step 4: Run.** Expected: PASS for `pond` (`ditches` still fails until Task 8; run `npx vitest run tests/levels.test.ts -t pond`).
- [ ] **Step 5: Commit** `git add v2 && git commit -m "v2: level 1 Back Pond"`

---

### Task 8: Level 2: Irrigation Ditches

**Files:** Create `v2/src/levels/ditches.json`; Modify `index.ts`

**Design:** A river on the west edge where the hippo starts. Three irrigation ditches (channels) branch east: two horizontal, one vertical, all connected to the river. Four field blocks sit between them. Farmer 1 walks the south bank of the upper ditch; Farmer 2 loops the east block. Their routes meet near (1300, 620), where the best bananas are. The leopard is on the east edge, so the carry home crosses both patrols or takes the lower ditch and a short land dash. New ideas: Dash and two patrols. Swimming in a ditch is fast but visible (you only hide while still).

- [ ] **Step 1: Create `ditches.json`**
```json
{
  "id": "ditches", "name": "Irrigation Ditches", "timeTarget": 150,
  "world": { "w": 2400, "h": 1400 },
  "water": [[{"x":-40,"y":-40},{"x":260,"y":-40},{"x":230,"y":350},{"x":280,"y":700},{"x":220,"y":1050},{"x":260,"y":1440},{"x":-40,"y":1440}]],
  "channels": [
    { "width": 70, "points": [{"x":180,"y":520},{"x":700,"y":540},{"x":1300,"y":510},{"x":2000,"y":530}] },
    { "width": 70, "points": [{"x":1130,"y":110},{"x":1150,"y":500},{"x":1120,"y":950},{"x":1140,"y":1290}] },
    { "width": 70, "points": [{"x":180,"y":980},{"x":800,"y":1000},{"x":1500,"y":970},{"x":2100,"y":990}] }
  ],
  "fields": [
    [{"x":380,"y":150},{"x":1030,"y":140},{"x":1040,"y":440},{"x":390,"y":450}],
    [{"x":1240,"y":140},{"x":1950,"y":150},{"x":1940,"y":440},{"x":1250,"y":450}],
    [{"x":380,"y":640},{"x":1030,"y":630},{"x":1040,"y":900},{"x":390,"y":910}],
    [{"x":1240,"y":660},{"x":1980,"y":650},{"x":1990,"y":900},{"x":1250,"y":910}]
  ],
  "paths": [[{"x":2020,"y":600},{"x":2330,"y":620},{"x":2340,"y":820},{"x":2030,"y":800}]],
  "barn": {"x":2200,"y":430},
  "plants": [
    {"x":480,"y":260},{"x":700,"y":250},{"x":920,"y":240},{"x":1350,"y":250},{"x":1600,"y":240},{"x":1850,"y":260},
    {"x":480,"y":760},{"x":750,"y":750},{"x":960,"y":740},{"x":1450,"y":780},{"x":1700,"y":770},{"x":1900,"y":760}
  ],
  "bananas": [
    {"x":600,"y":320},{"x":1300,"y":220},{"x":1700,"y":330},{"x":700,"y":780},
    {"x":1310,"y":700},{"x":1850,"y":820},{"x":900,"y":1150},{"x":1700,"y":1150}
  ],
  "leopard": {"x":2250,"y":720},
  "hippoStart": {"x":110,"y":700},
  "farmers": [
    { "patrol": [{"x":400,"y":610},{"x":2050,"y":610}], "facing": 0 },
    { "patrol": [{"x":1290,"y":640},{"x":1290,"y":920},{"x":1960,"y":920},{"x":1960,"y":640}], "facing": 1.5708 }
  ],
  "bananaTarget": 5
}
```
Point `index.ts` `ditches` at `./ditches.json`.
- [ ] **Step 2: Run** `npm test`. Expected: all level rule tests PASS. If a patrol point or banana lands in water (a smoothed shoreline or channel width), nudge it ≥ 20 px onto land and note it in the ledger.
- [ ] **Step 3: Browser check.** Screenshot both levels (`registry.set('levelId', …)` then restart Level): channels read as clean blue ditches with banks, and both patrols are visible. Commit `git add v2 && git commit -m "v2: level 2 Irrigation Ditches"`.

---

### Task 9: Title, World Map, Results card

**Files:** Create `v2/src/scenes/TitleScene.ts`, `v2/src/scenes/MapScene.ts`; Modify `LevelScene.ts` (`showEnd`), `BootScene.ts` (start `'Title'`), `main.ts` (scene list `[Boot, Title, Map, Level, Hud]`)

**Interfaces:** Consumes `isUnlocked`, `nextLevelId`, `scoreStars`, `recordResult`, `writeSave`, `safeStorage`, `LEVEL_ORDER`, registry `'levels'|'levelId'|'save'`. Produces `drawStar(g, x, y, r, filled)` in `v2/src/art/ui.ts` (faceted 5-point star: fill `PALETTE.banana` with a `bananaDark` right half when filled, `creamDark` when empty).

- [ ] **Step 1: `art/ui.ts`**
```ts
import Phaser from 'phaser';
import { PALETTE as P } from './palette';
import { facet } from './facets';
export function drawStar(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, filled: boolean) {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  facet(g, pts, filled ? P.banana : P.creamDark);
  if (filled) facet(g, [x, y - r, pts[2], pts[3], pts[4], pts[5], pts[6], pts[7], x, y + r * 0.45], P.bananaDark);
}
export const FONT = { fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', color: '#3b3a36' } as const;
export function button(scene: Phaser.Scene, x: number, y: number, w: number, label: string, onTap: () => void, dark = true) {
  const g = scene.add.graphics();
  g.fillStyle(dark ? P.ink : P.cream, 1).fillRoundedRect(x - w / 2, y - 30, w, 60, 30);
  const t = scene.add.text(x, y, label, { ...FONT, fontSize: '24px', color: dark ? '#f3ead3' : '#3b3a36' }).setOrigin(0.5);
  const z = scene.add.zone(x, y, w, 60).setInteractive({ useHandCursor: true }).on('pointerdown', onTap);
  return [g, t, z] as const;
}
```
- [ ] **Step 2: TitleScene.** Background `PALETTE.water` with 3 slow ripple rings (reuse `ripple`) and the faceted `hippo-sub` texture bobbing (tween y ±6, 1.6 s yoyo). The title "Hippo Heist" is 88px bold cream with an ink stroke of 10; "Tap to play" is 28px and pulses (alpha tween). On `pointerdown` or any key: `unlockAudio()` (Task 10), then `this.scene.start('Map')`. Add grain.
- [ ] **Step 3: MapScene.** Land background plus a winding river polyline (`strokeToPolygon` of `[(120,560),(360,420),(640,520),(900,360),(1160,460)]`, width 60, drawn in water color with a bank lip like terrain). Level nodes sit at those points (one per `LEVEL_ORDER` entry, in order). Each node is a cream circle r=46 with the level number (32px), the level name below (18px), and 3 small stars (r=10) from `save.levels[id]?.stars`. Locked nodes are drawn at alpha 0.4 with a small faceted padlock; tapping a locked node does nothing. Tapping an unlocked node: `registry.set('levelId', id)`, `this.scene.start('Level')`. A "Back" cream button top-left → Title.
- [ ] **Step 4: Results card** (replace the body of `LevelScene.showEnd`). Compute `stars = scoreStars({ won, time: gs.time, timeTarget: lvl.timeTarget, spotted: gs.spotted })`. If won: `save = recordResult(save, levelId, stars)`, `writeSave(safeStorage(), save)`, `registry.set('save', save)`. The card is 520×300 cream: the title ("Heist complete!" / "Caught!") and 3 stars (r=30) that pop in one by one (scale 0→1, 150 ms apart, `sfx.star()` each). Below them a small line: "⏱ m:ss / target m:ss · Unseen ✓/✗". Buttons: `Retry` (restart), `Map` (stop Hud, start Map), and `Next` only if won and `nextLevelId` exists (set levelId, restart). All elements `setScrollFactor(0)` individually at depth 30000.
- [ ] **Step 5: Stop the HUD when leaving a level:** LevelScene `shutdown` → `this.scene.stop('Hud')` only when the next scene isn't Level (simplest: the Map/Title buttons call `this.scene.stop('Hud')` before `start`).
- [ ] **Step 6: Browser check:**
  - Title → Map shows level 1 unlocked and level 2 locked.
  - Win level 1 → the results card shows stars and Next → level 2 loads.
  - Map now shows level 1 stars and level 2 unlocked.
  - A reload keeps them.
  - Commit `git add v2 && git commit -m "v2: title, world map, results with stars + save"`.

---

### Task 10: Synthesized SFX + mute

**Files:** Create `v2/src/audio/sfx.ts`; Modify `LevelScene.ts`, `HudScene.ts`, `TitleScene.ts`, `Farmer.ts` (fire state-change sounds)

**Interfaces:** Produces `unlockAudio(): void`, `setMuted(m: boolean): void`, `isMuted(): boolean`, and `sfx` with `pluck(n: 1|2|3)`, `dash()`, `bloop()`, `pop()`, `question()`, `alert()`, `feed()`, `click()`, `star()`, `caught()`.

- [ ] **Step 1: Implement `sfx.ts`**
```ts
let ctx: AudioContext | null = null, muted = false;
export function unlockAudio() {
  try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); } catch { ctx = null; }
}
export const setMuted = (m: boolean) => { muted = m; };
export const isMuted = () => muted;
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slideTo?: number, delay = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol = 0.12, filterFreq = 1200) {
  if (!ctx || muted) return;
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'bandpass'; f.frequency.value = filterFreq; g.gain.value = vol;
  src.buffer = buf; src.connect(f).connect(g).connect(ctx.destination); src.start();
}
export const sfx = {
  pluck: (n: 1 | 2 | 3) => tone([523, 659, 784][n - 1], 0.18, 'triangle', 0.18),
  dash: () => noise(0.25, 0.15, 900),
  bloop: () => tone(300, 0.22, 'sine', 0.2, 120),
  pop: () => tone(500, 0.08, 'sine', 0.15, 900),
  question: () => { tone(660, 0.12, 'triangle', 0.12); tone(880, 0.16, 'triangle', 0.12, undefined, 0.1); },
  alert: () => { tone(988, 0.1, 'square', 0.08); tone(988, 0.14, 'square', 0.08, undefined, 0.12); },
  feed: () => { tone(110, 0.3, 'sawtooth', 0.05, 90); tone(784, 0.2, 'triangle', 0.14, undefined, 0.15); tone(1047, 0.25, 'triangle', 0.14, undefined, 0.28); },
  click: () => tone(180, 0.05, 'triangle', 0.12),
  star: () => tone(1175, 0.2, 'triangle', 0.14, 1568),
  caught: () => tone(400, 0.35, 'sawtooth', 0.08, 150),
};
```
- [ ] **Step 2: Hook the sounds up:**
  - **LevelScene:** `pluck(carried)` on pickup, `feed()` on deliver, `bloop()` when `submerged` turns on, `pop()` when it turns off, `caught()` in `onCaught`, `dash()` when `hs.dashT` goes from 0 to >0.
  - **Farmer:** `question()` or `alert()` when the watcher's state changes to suspicious or alert.
  - **Buttons:** `click()` on every button tap.
- [ ] **Step 3: Mute.**
  - At boot: `setMuted(save.muted)`.
  - HUD: a cream round speaker button left of pause at (GAME_W−120, 46). It toggles `setMuted`, sets `save.muted`, calls `writeSave`, and redraws the icon (a speaker, with or without two arcs).
  - Also call `unlockAudio()` on the first HUD pointerdown, as a fallback.
- [ ] **Step 4: Browser check.** Sounds play after the title tap; mute persists after a reload. `npm test` and `npm run build` pass. Commit `git add v2 && git commit -m "v2: synthesized SFX and persistent mute"`.

---

### Task 11: Playtest + tune

**Files:** Modify level JSONs or constants only as the playtest demands; `TASKS.md`

- [ ] **Step 1:** Play both levels in the browser (drive with keys, or teleport via `window.__game` for reachability). For each level record: can it be won? Is there a real choice between routes? Does the carry home feel tense? Is 3-starring possible but hard?
- [ ] **Step 2:** Tune only data or constants (patrol points, banana spots, `timeTarget`, farmer `SPEED`). Every change must keep `tests/levels.test.ts` green. Record each change in the ledger.
- [ ] **Step 3:** `npm test` and `npm run build` pass. Update `TASKS.md` (slice A done; Plan B next). Commit and push `rebuild`.
