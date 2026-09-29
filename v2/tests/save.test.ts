import { loadSave, writeSave, recordResult, freshSave, SAVE_KEY, KV } from '../src/logic/save';
const mem = (init: Record<string, string> = {}): KV => ({ getItem: (k) => init[k] ?? null, setItem: (k, v) => { init[k] = v; } });
it('missing save → fresh', () => { expect(loadSave(mem())).toEqual(freshSave()); });
it('corrupt JSON → fresh', () => { expect(loadSave(mem({ [SAVE_KEY]: '{nope' }))).toEqual(freshSave()); });
it('wrong version → fresh', () => { expect(loadSave(mem({ [SAVE_KEY]: '{"version":99}' }))).toEqual(freshSave()); });
it('throwing storage → fresh, and write does not throw', () => {
  const bad: KV = { getItem: () => { throw new Error('private'); }, setItem: () => { throw new Error('quota'); } };
  expect(loadSave(bad)).toEqual(freshSave());
  expect(() => writeSave(bad, freshSave())).not.toThrow();
});
it('round-trips', () => {
  const kv = mem(); const s = recordResult(freshSave(), 'pond', 2); writeSave(kv, s);
  expect(loadSave(kv)).toEqual(s);
});
it('keeps the best stars', () => {
  expect(recordResult(recordResult(freshSave(), 'pond', 3), 'pond', 1).levels.pond.stars).toBe(3);
});
it('drops malformed star entries and clamps to 0-3', () => {
  const s = loadSave(mem({ [SAVE_KEY]: JSON.stringify({ version: 1, levels: { pond: { stars: 'x' }, ditches: { stars: 9 }, a: null, b: 'x' }, muted: false }) }));
  expect(s.levels).toEqual({ ditches: { stars: 3 } });
  expect(recordResult(s, 'pond', 2).levels.pond.stars).toBe(2);
});
