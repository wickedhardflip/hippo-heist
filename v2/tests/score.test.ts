import { scoreStars } from '../src/logic/score';
const base = { won: true, time: 50, timeTarget: 60, spotted: false };
it('3 stars: won, fast, unseen', () => { expect(scoreStars(base)).toBe(3); });
it('2 stars when spotted', () => { expect(scoreStars({ ...base, spotted: true })).toBe(2); });
it('2 stars when slow', () => { expect(scoreStars({ ...base, time: 61 })).toBe(2); });
it('1 star when slow and spotted', () => { expect(scoreStars({ ...base, time: 61, spotted: true })).toBe(1); });
it('0 stars when lost', () => { expect(scoreStars({ ...base, won: false })).toBe(0); });
it('time star uses whole seconds, matching the m:ss shown to the player', () => {
  expect(scoreStars({ ...base, time: 60.4 })).toBe(3);
  expect(scoreStars({ ...base, time: 61 })).toBe(2);
});
