import Phaser from 'phaser';
import { bakeSprites } from '../art/sprites';
import { validateLevel } from '../logic/level';
import farm1 from '../levels/farm1.json';
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    bakeSprites(this);
    this.registry.set('level', validateLevel(farm1));
    this.scene.start('Level');
  }
}
