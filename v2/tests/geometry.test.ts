import { pointInPolygon, smoothClosedCurve, angleDiff } from '../src/logic/geometry';
const sq = [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}];
it('pointInPolygon inside/outside', () => {
  expect(pointInPolygon({x:5,y:5}, sq)).toBe(true);
  expect(pointInPolygon({x:15,y:5}, sq)).toBe(false);
});
it('smoothClosedCurve passes through control points and adds detail', () => {
  const c = smoothClosedCurve(sq, 8);
  expect(c.length).toBe(32);
  expect(c[0]).toEqual({x:0,y:0});
});
it('angleDiff wraps', () => {
  expect(angleDiff(0.1, 2*Math.PI - 0.1)).toBeCloseTo(0.2);
});
import { distToSegment, strokeToPolygon, pointInPolygon as pip } from '../src/logic/geometry';
it('distToSegment measures to the nearest point', () => {
  expect(distToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  expect(distToSegment({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
});
it('strokeToPolygon wraps a polyline with the given width', () => {
  const poly = strokeToPolygon([{ x: 0, y: 0 }, { x: 100, y: 0 }], 20);
  expect(pip({ x: 50, y: 5 }, poly)).toBe(true);
  expect(pip({ x: 50, y: 15 }, poly)).toBe(false);
});
import { smoothOpenCurve } from '../src/logic/geometry';
it('smoothOpenCurve keeps both endpoints and adds detail', () => {
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
  const c = smoothOpenCurve(pts, 5);
  expect(c[0]).toEqual({ x: 0, y: 0 });
  expect(c[c.length - 1]).toEqual({ x: 20, y: 0 });
  expect(c.length).toBe(11);
});
it('strokeToPolygon rounds both ends (no square corners)', () => {
  const poly = strokeToPolygon([{ x: 0, y: 0 }, { x: 100, y: 0 }], 20);
  expect(pip({ x: 106, y: 0 }, poly)).toBe(true);   // inside the round cap
  expect(pip({ x: 108, y: 8 }, poly)).toBe(false);  // where a square corner would have been
  expect(pip({ x: -6, y: 0 }, poly)).toBe(true);
});
