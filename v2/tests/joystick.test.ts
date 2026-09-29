import { joystickVector } from '../src/logic/joystick';
it('zero when released', () => { expect(joystickVector(null, null)).toEqual({ x: 0, y: 0 }); });
it('zero inside deadzone', () => { expect(joystickVector({x:0,y:0}, {x:5,y:0})).toEqual({ x: 0, y: 0 }); });
it('clamps to unit length', () => {
  const v = joystickVector({x:0,y:0}, {x:500,y:0});
  expect(v.x).toBeCloseTo(1); expect(v.y).toBeCloseTo(0);
});
it('partial tilt is proportional', () => {
  expect(joystickVector({x:0,y:0}, {x:0,y:35}).y).toBeCloseTo(0.5);
});
