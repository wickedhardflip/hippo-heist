import Phaser from 'phaser';
import { bakeSprites } from '../art/sprites';
import { validateLevel, LevelData } from '../logic/level';
import { loadSave, safeStorage } from '../logic/save';
import { LEVEL_ORDER, RAW_LEVELS } from '../levels/index';
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    bakeSprites(this);
    const levels: Record<string, LevelData> = {};
    for (const id of LEVEL_ORDER) levels[id] = validateLevel(RAW_LEVELS[id]);
    this.registry.set('levels', levels);
    this.registry.set('save', loadSave(safeStorage()));
    this.registry.set('levelId', LEVEL_ORDER[0]);
    this.scene.start('Level');
  }
}
