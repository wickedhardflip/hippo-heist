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
