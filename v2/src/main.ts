import Phaser from 'phaser';
import { PALETTE } from './art/palette';
export const GAME_W = 1280, GAME_H = 720;
class Hello extends Phaser.Scene { create() { this.cameras.main.setBackgroundColor(PALETTE.bg); } }
new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: GAME_W, height: GAME_H,
  backgroundColor: PALETTE.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [Hello],
});
