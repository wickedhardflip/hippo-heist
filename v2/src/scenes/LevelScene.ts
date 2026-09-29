import Phaser from 'phaser';
import { LevelData, nearestWaterPoint } from '../logic/level';
import { HippoState, newHippo, stepHippo } from '../logic/hippo';
import { GameState, newGame, pickup, deliver, caught, restoreDropped, PICK_RADIUS, FEED_RADIUS } from '../logic/game';
import { dist } from '../logic/geometry';
import { drawTerrain } from '../render/terrain';
import { TEX } from '../art/sprites';
import { PALETTE as P } from '../art/palette';
import { Farmer } from '../entities/Farmer';
import { addGrain, addRipples, ripple } from '../render/effects';
import { GAME_W, GAME_H } from '../config';

export class LevelScene extends Phaser.Scene {
  lvl!: LevelData;
  hippo!: Phaser.GameObjects.Image;
  hs!: HippoState;
  gs!: GameState;
  farmers: Farmer[] = [];
  bananaImgs: Phaser.GameObjects.Image[] = [];
  stack: Phaser.GameObjects.Image[] = [];
  carriedIdx: number[] = [];
  leopard!: Phaser.GameObjects.Image;
  ended = false;
  rippleCd = 0;
  constructor() { super('Level'); }

  create() {
    this.lvl = this.registry.get('level');
    this.ended = false;
    this.carriedIdx = [];
    this.registry.set('input', { move: { x: 0, y: 0 }, dash: false });
    drawTerrain(this, this.lvl);
    const put = (key: string, x: number, y: number) => this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(10 + y);
    put(TEX.barn, this.lvl.barn.x, this.lvl.barn.y);
    this.lvl.plants.forEach((p) => put(TEX.plant, p.x, p.y));
    this.bananaImgs = this.lvl.bananas.map((p) => put(TEX.banana, p.x, p.y));
    this.leopard = put(TEX.leopard, this.lvl.leopard.x, this.lvl.leopard.y);
    this.farmers = this.lvl.farmers.map((f) => new Farmer(this, f));
    this.hippo = put(TEX.hippo, this.lvl.hippoStart.x, this.lvl.hippoStart.y);
    this.stack = [0, 1, 2].map(() => this.add.image(0, 0, TEX.banana).setOrigin(0.5, 1).setVisible(false));
    this.hs = newHippo(this.lvl.hippoStart);
    this.gs = newGame(this.lvl.bananas.length, this.lvl.bananaTarget);
    this.rippleCd = 0;
    this.registry.set('ended', false);
    this.registry.set('hippo', this.hs);
    this.registry.set('game', this.gs);
    this.cameras.main.setBounds(0, 0, this.lvl.world.w, this.lvl.world.h).startFollow(this.hippo, true, 0.1, 0.1);
    addGrain(this);
    addRipples(this, this.lvl);
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    this.events.on('caught', this.onCaught, this);
    this.events.once('shutdown', () => this.events.off('caught', this.onCaught, this));
  }

  update(_t: number, dtMs: number) {
    if (this.ended) return;
    const dt = Math.min(dtMs / 1000, 1 / 20);
    const base = this.registry.get('input') ?? { move: { x: 0, y: 0 }, dash: false };
    const inp = base;
    const idle = inp.move.x === 0 && inp.move.y === 0;
    this.hs = stepHippo({ ...this.hs, carrying: this.gs.carried }, { move: inp.move, dash: inp.dash, submerge: idle }, dt, this.lvl);
    this.registry.set('input', { ...base, dash: false }); // dash is a one-shot press
    this.hippo.setPosition(this.hs.pos.x, this.hs.pos.y).setFlipX(this.hs.facingLeft).setDepth(10 + this.hs.pos.y)
      .setTexture(this.hs.submerged ? TEX.hippoSub : TEX.hippo).setScale(this.hs.submerged ? 1.35 : 1);

    const wasSub = this.hs.submerged;
    this.handleBananas();
    this.rippleCd -= dt;
    if (this.hs.inWater && this.rippleCd <= 0 && (Math.hypot(this.hs.vel.x, this.hs.vel.y) > 60 || this.hs.submerged !== wasSub)) {
      ripple(this, this.hs.pos, 0.8); this.rippleCd = 0.35;
    }
    this.stack.forEach((img, i) => img.setVisible(!this.hs.submerged && i < this.gs.carried)
      .setPosition(this.hs.pos.x + (this.hs.facingLeft ? 12 : -12), this.hs.pos.y - 70 - i * 14).setDepth(11 + this.hs.pos.y));

    this.registry.set('hippo', this.hs);
    for (const f of this.farmers) if (f.update(dt, this.hs)) this.events.emit('caught');
    this.registry.set('game', this.gs);
    if (this.gs.status !== 'playing') this.showEnd(this.gs.status === 'won');
  }

  private handleBananas() {
    if (this.hs.submerged) return;
    this.lvl.bananas.forEach((b, i) => {
      if (!this.gs.remaining[i] || dist(b, this.hs.pos) > PICK_RADIUS) return;
      const next = pickup(this.gs, i);
      if (next !== this.gs) { this.gs = next; this.carriedIdx.push(i); this.bananaImgs[i].setVisible(false); }
    });
    if (this.gs.carried > 0 && dist(this.lvl.leopard, this.hs.pos) < FEED_RADIUS) {
      this.gs = deliver(this.gs);
      this.carriedIdx = [];
      this.tweens.add({ targets: this.leopard, scaleX: 1.15, scaleY: 1.15, yoyo: true, duration: 140 });
    }
  }

  private onCaught() {
    this.gs = restoreDropped(caught(this.gs), this.carriedIdx);
    this.carriedIdx.forEach((i) => this.bananaImgs[i].setVisible(true));
    this.carriedIdx = [];
    this.hs = { ...this.hs, pos: nearestWaterPoint(this.lvl, this.hs.pos), vel: { x: 0, y: 0 }, submerged: true };
    this.cameras.main.flash(200, 243, 234, 211);
  }

  private showEnd(won: boolean) {
    this.ended = true;
    this.registry.set('ended', true);
    const cx = GAME_W / 2, cy = GAME_H / 2;
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.25).fillRect(0, 0, GAME_W, GAME_H);
    card.fillStyle(P.cream, 1).fillRoundedRect(cx - 220, cy - 120, 440, 240, 28);
    const title = this.add.text(cx, cy - 50, won ? 'Heist complete!' : 'Caught! Try again', { fontFamily: 'system-ui, sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#3b3a36' }).setOrigin(0.5);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(P.ink, 1).fillRoundedRect(cx - 110, cy + 20, 220, 64, 32);
    const btnTxt = this.add.text(cx, cy + 52, 'Play again', { fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#f3ead3' }).setOrigin(0.5);
    const hit = this.add.zone(cx, cy + 52, 220, 64).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.scene.restart());
    // Pin each element to the screen individually: input hit-testing on container children ignores the container's scroll factor.
    [card, title, btnBg, btnTxt, hit].forEach((o) => o.setScrollFactor(0).setDepth(30000));
  }
}
