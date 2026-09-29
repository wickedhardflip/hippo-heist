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
