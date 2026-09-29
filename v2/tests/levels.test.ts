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
