import Phaser from 'phaser';
import { PALETTE as P } from '../art/palette';
import { LevelData } from '../logic/level';
import { smoothClosedCurve, Vec } from '../logic/geometry';
function poly(g: Phaser.GameObjects.Graphics, pts: Vec[], color: number, alpha = 1, dy = 0) {
  g.fillStyle(color, alpha); g.beginPath(); g.moveTo(pts[0].x, pts[0].y + dy);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y + dy);
  g.closePath(); g.fillPath();
}
export function drawTerrain(scene: Phaser.Scene, lvl: LevelData) {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(P.land, 1).fillRect(0, 0, lvl.world.w, lvl.world.h);
  for (const path of lvl.paths) poly(g, smoothClosedCurve(path, 8), P.path);
  for (const f of lvl.fields) { poly(g, f, P.soilDark, 1, 8); poly(g, f, P.soil); }
  const water = scene.add.graphics().setDepth(1);
  // Detail layer clipped to the water so non-convex rivers never bleed onto land.
  const maskShape = scene.make.graphics({}, false);
  const detail = scene.add.graphics().setDepth(1.5);
  for (const w of lvl.water) {
    poly(water, w, P.bankDark, 1, 14); poly(water, w, P.bank, 1, 8);
    poly(water, w, P.water);
    poly(maskShape, w, 0xffffff);
    // Deep channel: the shoreline pushed down-right, darker. Shallow rim: a light stroke along the edge.
    poly(detail, w, P.waterDeep, 0.45, 40);
    detail.lineStyle(28, P.waterLight, 0.35).strokePoints(w, true, true);
  }
  detail.setMask(maskShape.createGeometryMask());
}
