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
