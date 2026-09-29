import Phaser from 'phaser';
import { LevelData } from '../logic/level';
import { drawTerrain } from '../render/terrain';
import { TEX } from '../art/sprites';
export class LevelScene extends Phaser.Scene {
  lvl!: LevelData;
  hippo!: Phaser.GameObjects.Image;
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
    this.cameras.main.setBounds(0, 0, this.lvl.world.w, this.lvl.world.h).startFollow(this.hippo, true, 0.1, 0.1);
  }
}
