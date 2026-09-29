import { isUnlocked, nextLevelId } from '../src/logic/progress';
import { freshSave, recordResult } from '../src/logic/save';
const order = ['pond', 'ditches', 'barn'];
it('first level always unlocked', () => { expect(isUnlocked(freshSave(), order, 'pond')).toBe(true); });
it('later levels need a star on the previous one', () => {
  expect(isUnlocked(freshSave(), order, 'ditches')).toBe(false);
  expect(isUnlocked(recordResult(freshSave(), 'pond', 1), order, 'ditches')).toBe(true);
});
it('unknown level is locked', () => { expect(isUnlocked(freshSave(), order, 'nope')).toBe(false); });
it('nextLevelId is null after the last level', () => {
  expect(nextLevelId(order, 'pond')).toBe('ditches'); expect(nextLevelId(order, 'barn')).toBeNull();
});
