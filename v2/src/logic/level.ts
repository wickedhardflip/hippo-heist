import { Vec, pointInPolygon, smoothClosedCurve, dist } from './geometry';
export type Farmer = { patrol: Vec[]; facing: number };
export type LevelData = {
  id: string; world: { w: number; h: number };
  water: Vec[][];            // closed shapes (smoothed at load)
  fields: Vec[][];           // banana field plots (drawn as soil)
  paths: Vec[][];            // dirt path shapes
  barn: Vec;                 // barn anchor (bottom-center)
  plants: Vec[];             // decorative banana plants
  bananas: Vec[];            // pickup spots
  leopard: Vec;
  hippoStart: Vec;
  farmers: Farmer[];
  bananaTarget: number;
};
const isVec = (v: any): v is Vec => !!v && typeof v.x === 'number' && typeof v.y === 'number';
export function validateLevel(d: any): LevelData {
  const need = (k: string, ok: boolean) => { if (!ok) throw new Error(`Invalid level: ${k}`); };
  need('id', typeof d?.id === 'string');
  need('world', d?.world?.w > 0 && d?.world?.h > 0);
  for (const k of ['water', 'fields', 'paths']) need(k, Array.isArray(d[k]) && d[k].every((s: any) => Array.isArray(s) && s.length >= 3 && s.every(isVec)));
  need('water', d.water.length >= 1);
  for (const k of ['barn', 'leopard', 'hippoStart']) need(k, isVec(d[k]));
  need('plants', Array.isArray(d.plants) && d.plants.every(isVec));
  need('bananas', Array.isArray(d.bananas) && d.bananas.length > 0 && d.bananas.every(isVec));
  need('farmers', Array.isArray(d.farmers) && d.farmers.every((f: any) => Array.isArray(f.patrol) && f.patrol.length >= 1 && f.patrol.every(isVec) && typeof f.facing === 'number'));
  need('bananaTarget', Number.isInteger(d.bananaTarget) && d.bananaTarget > 0 && d.bananaTarget <= d.bananas.length);
  return { ...d, water: d.water.map((s: Vec[]) => smoothClosedCurve(s, 10)) } as LevelData;
}
export const isWater = (lvl: LevelData, p: Vec) => lvl.water.some((s) => pointInPolygon(p, s));
export function nearestWaterPoint(lvl: LevelData, p: Vec): Vec {
  let best: Vec = lvl.hippoStart, bd = Infinity;
  for (const shape of lvl.water) {
    const cx = shape.reduce((s, q) => s + q.x, 0) / shape.length, cy = shape.reduce((s, q) => s + q.y, 0) / shape.length;
    for (const q of shape) {
      const inner = { x: q.x + (cx - q.x) * 0.15, y: q.y + (cy - q.y) * 0.15 }; // nudge inside the shoreline
      const d = dist(p, inner);
      if (d < bd && isWater(lvl, inner)) { bd = d; best = inner; }
    }
  }
  return best;
}
