import Phaser from 'phaser';
import { LevelData, nearestWaterPoint } from '../logic/level';
import { HippoState, newHippo, stepHippo } from '../logic/hippo';
import { GameState, newGame, pickup, deliver, caught, restoreDropped, tick, markSpotted, PICK_RADIUS, FEED_RADIUS } from '../logic/game';
import { dist } from '../logic/geometry';
import { drawTerrain } from '../render/terrain';
import { TEX } from '../art/sprites';
import { PALETTE as P } from '../art/palette';
import { Farmer } from '../entities/Farmer';
import { scoreStars } from '../logic/score';
import { recordResult, writeSave, safeStorage } from '../logic/save';
import { nextLevelId } from '../logic/progress';
import { LEVEL_ORDER } from '../levels/index';
import { FONT, drawStar, button } from '../art/ui';
import { sfx } from '../audio/sfx';
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
    this.lvl = this.registry.get('levels')[this.registry.get('levelId')];
    this.registry.set('level', this.lvl);
    this.ended = false;
    this.carriedIdx = [];
    this.registry.set('input', { move: { x: 0, y: 0 }, dash: false });
    drawTerrain(this, this.lvl);
    const put = (key: string, x: number, y: number) => this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(10 + y);
    put(TEX.barn, this.lvl.barn.x, this.lvl.barn.y);
    this.lvl.plants.forEach((p) => put(TEX.plant, p.x, p.y));
    this.bananaImgs = this.lvl.bananas.map((p) => put(TEX.banana, p.x, p.y));
    this.leopard = put(TEX.leopard, this.lvl.leopard.x, this.lvl.leopard.y);
    this.farmers = this.lvl.farmers.map((f) => new Farmer(this, f, this.lvl));
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
    const prevSub = this.hs.submerged, prevDashT = this.hs.dashT;
    this.hs = stepHippo({ ...this.hs, carrying: this.gs.carried }, { move: inp.move, dash: inp.dash, submerge: idle }, dt, this.lvl);
    this.registry.set('input', { ...base, dash: false }); // dash is a one-shot press
    this.hippo.setPosition(this.hs.pos.x, this.hs.pos.y).setFlipX(this.hs.facingLeft).setDepth(10 + this.hs.pos.y)
      .setTexture(this.hs.submerged ? TEX.hippoSub : TEX.hippo).setScale(this.hs.submerged ? 1.35 : 1);

    const wasSub = this.hs.submerged;
    if (this.hs.submerged !== prevSub) (this.hs.submerged ? sfx.bloop : sfx.pop)();
    if (prevDashT === 0 && this.hs.dashT > 0) sfx.dash();
    this.handleBananas();
    this.rippleCd -= dt;
    if (this.hs.inWater && this.rippleCd <= 0 && (Math.hypot(this.hs.vel.x, this.hs.vel.y) > 60 || this.hs.submerged !== wasSub)) {
      ripple(this, this.hs.pos, 0.8); this.rippleCd = 0.35;
    }
    this.stack.forEach((img, i) => img.setVisible(!this.hs.submerged && i < this.gs.carried)
      .setPosition(this.hs.pos.x + (this.hs.facingLeft ? 12 : -12), this.hs.pos.y - 70 - i * 14).setDepth(11 + this.hs.pos.y));

    this.registry.set('hippo', this.hs);
    for (const f of this.farmers) if (f.update(dt, this.hs)) this.events.emit('caught');
    this.gs = tick(this.gs, dt);
    if (this.farmers.some((f) => f.watcher.state === 'alert')) this.gs = markSpotted(this.gs);
    this.registry.set('game', this.gs);
    if (this.gs.status !== 'playing') this.showEnd(this.gs.status === 'won');
  }

  private handleBananas() {
    if (this.hs.submerged) return;
    this.lvl.bananas.forEach((b, i) => {
      if (!this.gs.remaining[i] || dist(b, this.hs.pos) > PICK_RADIUS) return;
      const next = pickup(this.gs, i);
      if (next !== this.gs) { this.gs = next; this.carriedIdx.push(i); this.bananaImgs[i].setVisible(false); sfx.pluck(this.gs.carried); }
    });
    if (this.gs.carried > 0 && dist(this.lvl.leopard, this.hs.pos) < FEED_RADIUS) {
      this.gs = deliver(this.gs);
      sfx.feed();
      this.carriedIdx = [];
      this.tweens.add({ targets: this.leopard, scaleX: 1.15, scaleY: 1.15, yoyo: true, duration: 140 });
    }
  }

  private onCaught() {
    sfx.caught();
    this.gs = restoreDropped(caught(this.gs), this.carriedIdx);
    this.carriedIdx.forEach((i) => this.bananaImgs[i].setVisible(true));
    this.carriedIdx = [];
    this.hs = { ...this.hs, pos: nearestWaterPoint(this.lvl, this.hs.pos), vel: { x: 0, y: 0 }, submerged: true };
    this.cameras.main.flash(200, 243, 234, 211);
  }

  private showEnd(won: boolean) {
    this.ended = true;
    this.registry.set('ended', true);
    const levelId: string = this.registry.get('levelId');
    const stars = scoreStars({ won, time: this.gs.time, timeTarget: this.lvl.timeTarget, spotted: this.gs.spotted });
    if (won) {
      const save = recordResult(this.registry.get('save'), levelId, stars);
      writeSave(safeStorage(), save);
      this.registry.set('save', save);
    }
    const cx = GAME_W / 2, cy = GAME_H / 2;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.25).fillRect(0, 0, GAME_W, GAME_H);
    card.fillStyle(P.cream, 1).fillRoundedRect(cx - 260, cy - 170, 520, 340, 28);
    parts.push(card, this.add.text(cx, cy - 120, won ? 'Heist complete!' : 'Caught!', { ...FONT, fontSize: '40px' }).setOrigin(0.5));
    for (let i = 0; i < 3; i++) {
      const sg = this.add.graphics();
      drawStar(sg, 0, 0, 30, i < stars);
      sg.setPosition(cx - 80 + i * 80, cy - 45).setScale(0);
      this.tweens.add({ targets: sg, scale: 1, duration: 220, delay: 200 + i * 150, ease: 'Back.easeOut', onStart: () => { if (i < stars) sfx.star(); } });
      parts.push(sg);
    }
    const t = Math.floor(this.gs.time), tt = this.lvl.timeTarget, fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
    parts.push(this.add.text(cx, cy + 15, `Time ${fmt(t)} / ${fmt(tt)}   ·   Unseen ${this.gs.spotted ? '✗' : '✓'}`, { ...FONT, fontSize: '20px' }).setOrigin(0.5));
    const next = won ? nextLevelId(LEVEL_ORDER, levelId) : null;
    const toMap = () => { this.scene.stop('Hud'); this.scene.start('Map'); };
    const btns: [string, () => void][] = [['Retry', () => this.scene.restart()], ['Map', toMap]];
    if (next) btns.push(['Next', () => { this.registry.set('levelId', next); this.scene.restart(); }]);
    const w = 150, gap = 16, x0 = cx - (btns.length * w + (btns.length - 1) * gap) / 2 + w / 2;
    btns.forEach(([label, fn], i) => parts.push(...button(this, x0 + i * (w + gap), cy + 100, w, label, fn, label !== 'Map')));
    // Pin each element to the screen individually: input hit-testing on container children ignores the container's scroll factor.
    parts.forEach((o) => (o as unknown as Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth).setScrollFactor(0).setDepth(30000));
  }
}
