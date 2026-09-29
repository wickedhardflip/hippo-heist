import { SaveData } from './save';
/** First level is always open; each later level opens once the previous one has at least 1 star. */
export function isUnlocked(save: SaveData, order: string[], id: string): boolean {
  const i = order.indexOf(id);
  if (i < 0) return false;
  return i === 0 || (save.levels[order[i - 1]]?.stars ?? 0) >= 1;
}
export function nextLevelId(order: string[], id: string): string | null {
  const i = order.indexOf(id);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}
