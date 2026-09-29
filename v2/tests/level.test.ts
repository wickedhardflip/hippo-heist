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
