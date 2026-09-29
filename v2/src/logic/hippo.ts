import { Vec } from './geometry';
import { LevelData, isWater } from './level';
export const LAND_SPEED = 260, WATER_SPEED = 340, CARRY_SLOW = 0.12, DASH_MULT = 2.6, DASH_TIME = 0.25, DASH_CD = 3, ACCEL = 10;
const EDGE = 40;
export type HippoState = { pos: Vec; vel: Vec; inWater: boolean; submerged: boolean; carrying: number; dashCd: number; dashT: number; splashCd: number; facingLeft: boolean };
export type HippoInput = { move: Vec; dash: boolean; submerge: boolean };
export const newHippo = (start: Vec): HippoState => ({ pos: { ...start }, vel: { x: 0, y: 0 }, inWater: false, submerged: false, carrying: 0, dashCd: 0, dashT: 0, splashCd: 0, facingLeft: false });
export function stepHippo(h: HippoState, input: HippoInput, dt: number, lvl: LevelData): HippoState {
  const inWater = isWater(lvl, h.pos);
  let dashCd = Math.max(0, h.dashCd - dt), dashT = Math.max(0, h.dashT - dt);
  if (input.dash && dashCd === 0) { dashT = DASH_TIME; dashCd = DASH_CD; }
  const base = (inWater ? WATER_SPEED : LAND_SPEED) * (1 - CARRY_SLOW * h.carrying);
  const max = base * (dashT > 0 ? DASH_MULT : 1);
  const target = { x: input.move.x * max, y: input.move.y * max };
  const a = Math.min(1, ACCEL * dt);
  const vel = { x: h.vel.x + (target.x - h.vel.x) * a, y: h.vel.y + (target.y - h.vel.y) * a };
  const pos = {
    x: Math.min(lvl.world.w - EDGE, Math.max(EDGE, h.pos.x + vel.x * dt)),
    y: Math.min(lvl.world.h - EDGE, Math.max(EDGE, h.pos.y + vel.y * dt)),
  };
  const nowWater = isWater(lvl, pos);
  const submerged = nowWater && (input.submerge || (h.submerged && Math.hypot(vel.x, vel.y) < 30));
  const facingLeft = Math.abs(vel.x) > 5 ? vel.x < 0 : h.facingLeft;
  return { ...h, pos, vel, inWater: nowWater, submerged, dashCd, dashT, splashCd: Math.max(0, h.splashCd - dt), facingLeft };
}
