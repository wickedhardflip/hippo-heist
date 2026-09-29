import Phaser from 'phaser';
export function facet(g: Phaser.GameObjects.Graphics, pts: number[], color: number) {
  g.fillStyle(color, 1);
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath(); g.fillPath();
}
