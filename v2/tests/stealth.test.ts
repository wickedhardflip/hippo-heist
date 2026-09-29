import { canSee, stepWatcher, VISION_RANGE, Watcher } from '../src/logic/stealth';
const eye = { x: 0, y: 0 };
it('sees inside the cone', () => { expect(canSee(eye, 0, { x: 100, y: 10 }, false)).toBe(true); });
it('does not see behind', () => { expect(canSee(eye, 0, { x: -100, y: 0 }, false)).toBe(false); });
it('does not see beyond range', () => { expect(canSee(eye, 0, { x: VISION_RANGE + 1, y: 0 }, false)).toBe(false); });
it('never sees a submerged hippo', () => { expect(canSee(eye, 0, { x: 50, y: 0 }, true)).toBe(false); });
it('awareness rises unaware -> suspicious -> alert, then calms', () => {
  let w: Watcher = { meter: 0, state: 'unaware', stunned: 0 };
  w = stepWatcher(w, true, 0.3); expect(w.state).toBe('suspicious');
  w = stepWatcher(w, true, 1.0); expect(w.state).toBe('alert');
  for (let i = 0; i < 10; i++) w = stepWatcher(w, false, 0.5);
  expect(w.state).toBe('unaware');
});
it('stunned watcher gains no awareness', () => {
  const w = stepWatcher({ meter: 0, state: 'unaware', stunned: 1 }, true, 0.5);
  expect(w.meter).toBe(0); expect(w.stunned).toBeCloseTo(0.5);
});
