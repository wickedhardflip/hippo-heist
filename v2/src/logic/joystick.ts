import { Vec } from './geometry';
export function joystickVector(origin: Vec | null, current: Vec | null, radius = 70, deadzone = 0.15): Vec {
  if (!origin || !current) return { x: 0, y: 0 };
  const dx = current.x - origin.x, dy = current.y - origin.y;
  const len = Math.hypot(dx, dy) / radius;
  if (len < deadzone) return { x: 0, y: 0 };
  const k = Math.min(len, 1) / (len || 1) / radius;
  return { x: dx * k, y: dy * k };
}
