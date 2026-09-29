import { Vec, angleTo, angleDiff, dist } from './geometry';
export const VISION_RANGE = 320, VISION_HALF_ANGLE = Math.PI / 5, SUSPICIOUS_AT = 0.35, ALERT_AT = 1, FILL_RATE = 1.4, DRAIN_RATE = 0.5, CATCH_RADIUS = 46;
export type Awareness = 'unaware' | 'suspicious' | 'alert';
export type Watcher = { meter: number; state: Awareness; stunned: number };
export function canSee(eye: Vec, facing: number, target: Vec, targetSubmerged: boolean): boolean {
  if (targetSubmerged) return false;
  if (dist(eye, target) > VISION_RANGE) return false;
  return Math.abs(angleDiff(angleTo(eye, target), facing)) <= VISION_HALF_ANGLE;
}
export function stepWatcher(w: Watcher, sees: boolean, dt: number): Watcher {
  if (w.stunned > 0) return { ...w, stunned: Math.max(0, w.stunned - dt) };
  const meter = Math.min(ALERT_AT, Math.max(0, w.meter + (sees ? FILL_RATE : -DRAIN_RATE) * dt));
  const state: Awareness = meter >= ALERT_AT ? 'alert' : meter >= SUSPICIOUS_AT ? 'suspicious' : (w.state === 'alert' && meter > 0.1 ? 'suspicious' : 'unaware');
  return { ...w, meter, state };
}
