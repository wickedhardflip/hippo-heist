import Phaser from 'phaser';
import { PALETTE as P } from '../art/palette';
import { facet } from '../art/facets';
import { FONT, drawStar, button } from '../art/ui';
import { strokeToPolygon, smoothOpenCurve, Vec } from '../logic/geometry';
import { isUnlocked } from '../logic/progress';
import { SaveData } from '../logic/save';
import { LevelData } from '../logic/level';
import { LEVEL_ORDER } from '../levels/index';
import { addGrain } from '../render/effects';

const NODES: Vec[] = [{ x: 170, y: 540 }, { x: 420, y: 400 }, { x: 690, y: 500 }, { x: 950, y: 350 }, { x: 1170, y: 450 }];

function poly(g: Phaser.GameObjects.Graphics, pts: Vec[], color: number, dy = 0) {
  g.fillStyle(color, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y + dy);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y + dy);
  g.closePath(); g.fillPath();
}

export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }
  create() {
    this.cameras.main.setBackgroundColor(P.land);
    const save: SaveData = this.registry.get('save');
    const levels: Record<string, LevelData> = this.registry.get('levels');

    // Winding river linking the level nodes, with the same raised-bank look as the terrain.
    const river = strokeToPolygon(smoothOpenCurve([{ x: 40, y: 600 }, ...NODES, { x: 1260, y: 420 }], 12), 60);
    const g = this.add.graphics();
    poly(g, river, P.bankDark, 12); poly(g, river, P.bank, 6); poly(g, river, P.water);

    this.add.text(640, 90, 'World 1: The Farm', { ...FONT, fontSize: '40px' }).setOrigin(0.5);

    LEVEL_ORDER.forEach((id, i) => {
      const n = NODES[i], open = isUnlocked(save, LEVEL_ORDER, id), stars = save.levels[id]?.stars ?? 0;
      const node = this.add.graphics().setAlpha(open ? 1 : 0.45);
      node.fillStyle(0x000000, 0.18).fillEllipse(n.x, n.y + 44, 80, 16);
      node.fillStyle(P.cream, 1).fillCircle(n.x, n.y, 46);
      node.fillStyle(P.creamDark, 1).slice(n.x, n.y, 46, 0, Math.PI, false).fillPath();
      if (open) this.add.text(n.x, n.y, String(i + 1), { ...FONT, fontSize: '34px' }).setOrigin(0.5);
      else { // faceted padlock
        facet(node, [n.x - 14, n.y - 2, n.x + 14, n.y - 2, n.x + 14, n.y + 20, n.x - 14, n.y + 20], P.ink);
        node.lineStyle(5, P.ink, 1).beginPath().arc(n.x, n.y - 4, 10, Math.PI, 0).strokePath();
      }
      const label = this.add.text(n.x, n.y + 76, levels[id].name, { ...FONT, fontSize: '18px' }).setOrigin(0.5).setAlpha(open ? 1 : 0.6).setDepth(2);
      this.add.graphics().setDepth(1).fillStyle(P.cream, 0.9).fillRoundedRect(n.x - label.width / 2 - 12, n.y + 62, label.width + 24, 28, 14);
      const sg = this.add.graphics();
      for (let s = 0; s < 3; s++) drawStar(sg, n.x - 26 + s * 26, n.y - 66, 11, s < stars);
      if (open) {
        this.add.zone(n.x, n.y, 100, 100).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          this.registry.set('levelId', id);
          this.scene.start('Level');
        });
      }
    });

    button(this, 110, 50, 150, 'Back', () => this.scene.start('Title'), false);
    addGrain(this);
  }
}
