export type Vec = { x: number; y: number };
export const dist = (a: Vec, b: Vec) => Math.hypot(b.x - a.x, b.y - a.y);
export const angleTo = (a: Vec, b: Vec) => Math.atan2(b.y - a.y, b.x - a.x);
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
export function pointInPolygon(p: Vec, poly: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function smoothClosedCurve(pts: Vec[], segments = 10): Vec[] {
  const out: Vec[] = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < segments; s++) {
      const t = s / segments, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}
export function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
/** Closed polygon around a polyline with round end caps: left side forward, end cap, right side back, start cap. */
export function strokeToPolygon(points: Vec[], width: number): Vec[] {
  const h = width / 2, left: Vec[] = [], right: Vec[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * h, ny = (dx / l) * h;
    left.push({ x: p.x + nx, y: p.y + ny }); right.push({ x: p.x - nx, y: p.y - ny });
  });
  const cap = (c: Vec, from: number) => Array.from({ length: 7 }, (_, k) => {
    const a = from - (Math.PI * (k + 1)) / 8;
    return { x: c.x + Math.cos(a) * h, y: c.y + Math.sin(a) * h };
  });
  const n = points.length;
  const endDir = Math.atan2(points[n - 1].y - points[n - 2].y, points[n - 1].x - points[n - 2].x);
  const startDir = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
  return [...left, ...cap(points[n - 1], endDir + Math.PI / 2), ...right.reverse(), ...cap(points[0], startDir - Math.PI / 2)];
}
/** Catmull-Rom through an open polyline; ends are clamped so the curve starts and ends on the endpoints. */
export function smoothOpenCurve(pts: Vec[], segments = 10): Vec[] {
  const out: Vec[] = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < segments; s++) {
      const t = s / segments, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push({ ...pts[n - 1] });
  return out;
}
