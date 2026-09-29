import { newPause, onOrientation, onToggle, isPaused } from '../src/logic/pause';
it('rotating to portrait pauses the game', () => {
  expect(isPaused(onOrientation(newPause(), true))).toBe(true);
});
it('rotating back to landscape resumes when the player had not paused', () => {
  expect(isPaused(onOrientation(onOrientation(newPause(), true), false))).toBe(false);
});
it('a manual pause survives a rotate round-trip', () => {
  const s = onOrientation(onOrientation(onToggle(newPause()), true), false);
  expect(isPaused(s)).toBe(true);
});
it('manual toggle while in portrait keeps the game paused', () => {
  expect(isPaused(onToggle(onOrientation(newPause(), true)))).toBe(true);
});
