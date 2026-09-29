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
    it('patrol legs never cross water (farmers cannot swim)', () => {
      for (const f of lvl.farmers) {
        const pts = f.patrol.length > 1 ? [...f.patrol, f.patrol[0]] : f.patrol;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10);
          for (let k = 0; k <= n; k++) {
            const p = { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n };
            expect(isWater(lvl, p), `leg ${i} at ${Math.round(p.x)},${Math.round(p.y)}`).toBe(false);
          }
        }
      }
    });
    it('bananas, leopard and patrol points are on land', () => {
      for (const p of [...lvl.bananas, lvl.leopard, ...lvl.farmers.flatMap((f) => f.patrol)]) expect(isWater(lvl, p)).toBe(false);
    });
  });
}
