import Phaser from 'phaser';
import { LevelData } from '../logic/level';
import { HippoState, newHippo, stepHippo } from '../logic/hippo';
import { drawTerrain } from '../render/terrain';
import { TEX } from '../art/sprites';
export class LevelScene extends Phaser.Scene {
  lvl!: LevelData;
  hippo!: Phaser.GameObjects.Image;
  hs!: HippoState;
  cursors?: Phaser.Types.Input.Keyboard.CursorKeys; // TEMP until HudScene (Task 8)
  constructor() { super('Level'); }
  create() {
    this.lvl = this.registry.get('level');
    drawTerrain(this, this.lvl);
    const put = (key: string, x: number, y: number) => this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(10 + y);
    put(TEX.barn, this.lvl.barn.x, this.lvl.barn.y);
    this.lvl.plants.forEach((p) => put(TEX.plant, p.x, p.y));
    this.lvl.bananas.forEach((p) => put(TEX.banana, p.x, p.y));
    put(TEX.leopard, this.lvl.leopard.x, this.lvl.leopard.y);
    this.lvl.farmers.forEach((f) => put(TEX.farmer, f.patrol[0].x, f.patrol[0].y));
    this.hippo = put(TEX.hippo, this.lvl.hippoStart.x, this.lvl.hippoStart.y);
    this.hs = newHippo(this.lvl.hippoStart);
    this.cameras.main.setBounds(0, 0, this.lvl.world.w, this.lvl.world.h).startFollow(this.hippo, true, 0.1, 0.1);
    this.cursors = this.input.keyboard?.createCursorKeys();
  }
  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs / 1000, 1 / 20);
    const base = this.registry.get('input') ?? { move: { x: 0, y: 0 }, dash: false };
    let inp = base;
    if (this.cursors) { // TEMP
      const c = this.cursors, x = (c.right.isDown ? 1 : 0) - (c.left.isDown ? 1 : 0), y = (c.down.isDown ? 1 : 0) - (c.up.isDown ? 1 : 0);
      const l = Math.hypot(x, y) || 1;
      if (x || y) inp = { move: { x: x / l, y: y / l }, dash: inp.dash || Phaser.Input.Keyboard.JustDown(c.space) };
    }
    const idle = inp.move.x === 0 && inp.move.y === 0;
    this.hs = stepHippo(this.hs, { move: inp.move, dash: inp.dash, submerge: idle }, dt, this.lvl);
    this.registry.set('input', { ...base, dash: false }); // dash is a one-shot press
    this.hippo.setPosition(this.hs.pos.x, this.hs.pos.y).setFlipX(this.hs.facingLeft).setDepth(10 + this.hs.pos.y)
      .setTexture(this.hs.submerged ? TEX.hippoSub : TEX.hippo);
    this.registry.set('hippo', this.hs);
  }
}
