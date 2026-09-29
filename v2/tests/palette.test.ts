import { PALETTE } from '../src/art/palette';
it('water is blue-dominant (never muddy)', () => {
  for (const c of [PALETTE.water, PALETTE.waterLight]) {
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    expect(b).toBeGreaterThan(r + 40);
    expect(b).toBeGreaterThanOrEqual(g - 10);
  }
});
