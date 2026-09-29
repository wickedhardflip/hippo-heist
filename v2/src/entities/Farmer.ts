import Phaser from 'phaser';
import { Vec, dist, angleTo, angleDiff } from '../logic/geometry';
import { Farmer as FarmerData } from '../logic/level';
import { HippoState } from '../logic/hippo';
import { canSee, stepWatcher, Watcher, VISION_RANGE, VISION_HALF_ANGLE, CATCH_RADIUS } from '../logic/stealth';
import { PALETTE as P } from '../art/palette';
import { TEX } from '../art/sprites';

const SPEED = { unaware: 90, suspicious: 60, alert: 210 } as const;
const TURN_RATE = 4; // rad/s

export class Farmer {
  img: Phaser.GameObjects.Image;
  cone: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Text;
  pos: Vec;
  facing: number;
  patrolIdx = 0;
  watcher: Watcher = { meter: 0, state: 'unaware', stunned: 0 };
  lastSeen: Vec | null = null;

  constructor(scene: Phaser.Scene, private data: FarmerData) {
    this.pos = { ...data.patrol[0] };
    this.facing = data.facing;
    this.cone = scene.add.graphics().setDepth(5);
    this.img = scene.add.image(this.pos.x, this.pos.y, TEX.farmer).setOrigin(0.5, 1);
    this.icon = scene.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', stroke: '#3b3a36', strokeThickness: 5 }).setOrigin(0.5, 1);
  }

  /** Advances the farmer one frame. Returns true when the hippo is caught. */
  update(dt: number, h: HippoState): boolean {
    const sees = canSee(this.pos, this.facing, h.pos, h.submerged);
    if (sees) this.lastSeen = { ...h.pos };
    this.watcher = stepWatcher(this.watcher, sees, dt);
    const st = this.watcher.state;

    let target: Vec | null = null;
    if (this.watcher.stunned > 0) target = null;
    else if (st === 'alert') target = h.submerged ? this.lastSeen : h.pos;
    else if (st === 'suspicious') target = this.lastSeen;
    else target = this.data.patrol[this.patrolIdx];

    if (target) {
      const d = dist(this.pos, target);
      if (st === 'unaware' && d < 8) this.patrolIdx = (this.patrolIdx + 1) % this.data.patrol.length;
      else if (d > 4) {
        const want = angleTo(this.pos, target);
        const diff = angleDiff(want, this.facing);
        this.facing += Math.sign(diff) * Math.min(Math.abs(diff), TURN_RATE * dt);
        const step = Math.min(d, SPEED[st] * dt);
        this.pos = { x: this.pos.x + Math.cos(want) * step, y: this.pos.y + Math.sin(want) * step };
      }
    }

    const caught = st === 'alert' && !h.submerged && dist(this.pos, h.pos) < CATCH_RADIUS;
    if (caught) { this.watcher = { meter: 0, state: 'unaware', stunned: 0 }; this.lastSeen = null; }
    this.render();
    return caught;
  }

  private render() {
    const st = this.watcher.state;
    this.img.setPosition(this.pos.x, this.pos.y).setDepth(10 + this.pos.y).setFlipX(Math.cos(this.facing) < 0);
    this.cone.clear();
    this.cone.fillStyle(st === 'alert' ? P.alert : P.cone, st === 'alert' ? 0.4 : 0.35);
    this.cone.slice(this.pos.x, this.pos.y - 6, VISION_RANGE, this.facing - VISION_HALF_ANGLE, this.facing + VISION_HALF_ANGLE, false);
    this.cone.fillPath();
    const txt = st === 'alert' ? '!' : st === 'suspicious' ? '?' : '';
    this.icon.setText(txt).setColor(st === 'alert' ? '#d9534f' : '#f2c94c').setPosition(this.pos.x, this.pos.y - 92).setDepth(20000);
  }
}
