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
  const s = restoreDropped(caught(pickup(newGame(3, 2), 0)), [0]); expect(s.remaining[0]).toBe(true);
});
it('loses at 0 hearts', () => {
  const s = caught(caught(caught(newGame(3, 2)))); expect(s.status).toBe('lost');
});
