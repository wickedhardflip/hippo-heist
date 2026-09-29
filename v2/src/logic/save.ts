export type SaveData = { version: 1; levels: Record<string, { stars: number }>; muted: boolean };
export type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };
export const SAVE_KEY = 'hippoheist.v2.save';
export const freshSave = (): SaveData => ({ version: 1, levels: {}, muted: false });

/** Never throws: missing, corrupt, wrong-version, or blocked storage all yield a fresh save. */
export function loadSave(kv: KV | null): SaveData {
  try {
    const raw = kv?.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    const d = JSON.parse(raw);
    if (d?.version !== 1 || typeof d.levels !== 'object' || d.levels === null) return freshSave();
    return { version: 1, levels: d.levels, muted: !!d.muted };
  } catch { return freshSave(); }
}
export function writeSave(kv: KV | null, s: SaveData): void {
  try { kv?.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* storage full or blocked: progress stays in memory only */ }
}
export function recordResult(s: SaveData, levelId: string, stars: number): SaveData {
  const best = Math.max(stars, s.levels[levelId]?.stars ?? 0);
  return { ...s, levels: { ...s.levels, [levelId]: { stars: best } } };
}
export function safeStorage(): KV | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}
