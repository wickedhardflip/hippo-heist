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
  const h = stepHippo(newHippo({ x: 1200, y: 300 }), { ...right, dash: true }, 1 / 60, lvl);
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
