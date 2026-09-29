import Phaser from 'phaser';
import { PALETTE as P } from '../art/palette';
import { LevelData } from '../logic/level';
import { smoothClosedCurve, Vec } from '../logic/geometry';

function poly(g: Phaser.GameObjects.Graphics, pts: Vec[], color: number, alpha = 1, dy = 0) {
  g.fillStyle(color, alpha); g.beginPath(); g.moveTo(pts[0].x, pts[0].y + dy);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y + dy);
  g.closePath(); g.fillPath();
}
const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
function path(ctx: CanvasRenderingContext2D, pts: Vec[], dx = 0, dy = 0) {
  ctx.moveTo(pts[0].x + dx, pts[0].y + dy);
  for (const p of pts.slice(1)) ctx.lineTo(p.x + dx, p.y + dy);
  ctx.closePath();
}

let waterSeq = 0;

export function drawTerrain(scene: Phaser.Scene, lvl: LevelData) {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(P.land, 1).fillRect(0, 0, lvl.world.w, lvl.world.h);
  for (const p of lvl.paths) poly(g, smoothClosedCurve(p, 8), P.path);
  for (const f of lvl.fields) { poly(g, f, P.soilDark, 1, 8); poly(g, f, P.soil); }
  drawWater(scene, lvl);
}

/**
 * All water is painted as ONE merged shape, so where ditches and rivers meet there are no seams.
 * Banks go on the base canvas first; water, its deep tint and the shallow rim are built on a
 * separate water-only canvas (tints use source-atop so they never spill onto banks or land),
 * then composited on top. The rim is an inner glow along the OUTER edge of the merged water only.
 */
function drawWater(scene: Phaser.Scene, lvl: LevelData) {
  const { w, h } = lvl.world;
  const canvas = (fill?: (c: CanvasRenderingContext2D) => void) => {
    const el = document.createElement('canvas'); el.width = w; el.height = h;
    const c = el.getContext('2d')!; fill?.(c); return { el, c };
  };
  const fillAll = (c: CanvasRenderingContext2D, color: string, dx = 0, dy = 0) => {
    c.fillStyle = color;
    for (const s of lvl.water) { c.beginPath(); path(c, s, dx, dy); c.fill(); }
  };

  // Land mask: opaque everywhere except the merged water.
  const land = canvas((c) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'destination-out'; fillAll(c, '#000'); });
  // Deep band: the merged water shifted down, so a lighter strip stays along the top shorelines.
  const deep = canvas((c) => fillAll(c, css(P.waterDeep), 0, 40));

  // Water-only layer.
  const water = canvas((c) => {
    fillAll(c, css(P.water));
    c.globalCompositeOperation = 'source-atop';
    c.globalAlpha = 0.45; c.drawImage(deep.el, 0, 0); c.globalAlpha = 1;
    c.shadowColor = css(P.waterLight, 0.75); c.shadowBlur = 16;
    c.shadowOffsetX = w + 100;                    // draw the mask off-canvas; only its shadow lands on the water
    c.drawImage(land.el, -(w + 100), 0);
  });

  const key = `water-${lvl.id}-${waterSeq++}`;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  fillAll(ctx, css(P.bankDark), 0, 14);
  fillAll(ctx, css(P.bank), 0, 8);
  ctx.drawImage(water.el, 0, 0);
  tex.refresh();
  scene.add.image(0, 0, key).setOrigin(0).setDepth(1);
  scene.events.once('shutdown', () => scene.textures.remove(key));
}
