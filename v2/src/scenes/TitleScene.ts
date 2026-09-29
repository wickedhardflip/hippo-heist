import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { PALETTE as P } from '../art/palette';
import { TEX } from '../art/sprites';
import { FONT } from '../art/ui';
import { addGrain, ripple } from '../render/effects';
import { unlockAudio } from '../audio/sfx';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.cameras.main.setBackgroundColor(P.water);
    const deep = this.add.graphics();
    deep.fillStyle(P.waterDeep, 0.35).fillEllipse(GAME_W / 2, GAME_H * 0.62, GAME_W * 0.9, GAME_H * 0.7);
    const hippo = this.add.image(GAME_W / 2, GAME_H * 0.62, TEX.hippoSub).setScale(2.2);
    this.tweens.add({ targets: hippo, y: hippo.y - 6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({ delay: 1100, loop: true, callback: () => ripple(this, { x: GAME_W / 2 + Phaser.Math.Between(-60, 60), y: GAME_H * 0.64 }, 1.6) });

    this.add.text(GAME_W / 2, GAME_H * 0.3, 'Hippo Heist', { ...FONT, fontSize: '88px', color: '#f3ead3', stroke: '#3b3a36', strokeThickness: 10 }).setOrigin(0.5);
    const tap = this.add.text(GAME_W / 2, GAME_H * 0.86, 'Tap to play', { ...FONT, fontSize: '28px', color: '#f3ead3' }).setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
    addGrain(this);

    const go = () => { unlockAudio(); this.scene.start('Map'); };
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
  }
}
