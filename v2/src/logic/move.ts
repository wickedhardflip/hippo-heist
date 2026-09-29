import { Vec } from './geometry';
/** Steps up to maxStep toward target; if blocked, slides along x then y; otherwise stays put. */
export function stepToward(pos: Vec, target: Vec, maxStep: number, blocked: (p: Vec) => boolean): Vec {
  const dx = target.x - pos.x, dy = target.y - pos.y, d = Math.hypot(dx, dy);
  if (d === 0) return pos;
  const k = Math.min(1, maxStep / d);
  const full = { x: pos.x + dx * k, y: pos.y + dy * k };
  if (!blocked(full)) return full;
  const sx = { x: pos.x + Math.sign(dx) * Math.min(Math.abs(dx), maxStep), y: pos.y };
  if (dx !== 0 && !blocked(sx)) return sx;
  const sy = { x: pos.x, y: pos.y + Math.sign(dy) * Math.min(Math.abs(dy), maxStep) };
  if (dy !== 0 && !blocked(sy)) return sy;
  return pos;
}
