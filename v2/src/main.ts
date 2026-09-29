import Phaser from 'phaser';
import { PALETTE } from './art/palette';
import { BootScene } from './scenes/BootScene';
import { LevelScene } from './scenes/LevelScene';
import { HudScene } from './scenes/HudScene';
import { GAME_W, GAME_H } from './config';
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: GAME_W, height: GAME_H,
  backgroundColor: PALETTE.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [BootScene, LevelScene, HudScene],
});
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
