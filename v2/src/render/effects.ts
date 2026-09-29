import Phaser from 'phaser';
import { PALETTE as P } from '../art/palette';
import { LevelData, isWater } from '../logic/level';
import { Vec } from '../logic/geometry';

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Subtle film grain over the whole view (screen-fixed). */
export function addGrain(scene: Phaser.Scene) {
  if (!scene.textures.exists('grain')) {
    const tex = scene.textures.createCanvas('grain', 256, 256)!;
    const ctx = tex.getContext();
    const img = ctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 14 + Math.random() * 12; // alpha ~0.06-0.1
    }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
  }
  const cam = scene.cameras.main;
  const grain = scene.add.tileSprite(0, 0, cam.width, cam.height, 'grain').setOrigin(0).setScrollFactor(0).setDepth(10000);
  if (!reducedMotion()) {
    scene.time.addEvent({ delay: 120, loop: true, callback: () => grain.setTilePosition(Math.random() * 256, Math.random() * 256) });
  }
  return grain;
}

/** Spawns one pair of concentric ripple rings at a point. */
export function ripple(scene: Phaser.Scene, at: Vec, scale = 1) {
  for (let i = 0; i < 2; i++) {
    const ring = scene.add.ellipse(at.x, at.y, 90 * scale, 40 * scale).setStrokeStyle(3, P.waterLight, 0.7).setDepth(2).setScale(0.2);
    scene.tweens.add({ targets: ring, scale: 1 - i * 0.35, alpha: 0, duration: 1800, delay: i * 250, onComplete: () => ring.destroy() });
  }
}

/** Ambient ripples at random water points. */
export function addRipples(scene: Phaser.Scene, lvl: LevelData) {
  const delay = reducedMotion() ? 1800 : 900;
  scene.time.addEvent({
    delay, loop: true, callback: () => {
      for (let tries = 0; tries < 12; tries++) {
        const v = scene.cameras.main.worldView; // only where the player can see it
        const p = { x: v.x + Math.random() * v.width, y: v.y + Math.random() * v.height };
        if (isWater(lvl, p)) { ripple(scene, p); return; }
      }
    },
  });
}
