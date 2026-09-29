import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { PALETTE as P } from '../art/palette';
import { TEX } from '../art/sprites';
import { facet } from '../art/facets';
import { joystickVector } from '../logic/joystick';
import { Vec } from '../logic/geometry';
import { GameState } from '../logic/game';
import { HippoState, DASH_CD } from '../logic/hippo';
import { PauseState, newPause, onOrientation, onToggle, isPaused } from '../logic/pause';

const JOY_R = 70;
const DASH = { x: GAME_W - 110, y: GAME_H - 120, r: 64 };
const SPLASH = { x: GAME_W - 250, y: GAME_H - 70, r: 44 };
const FONT = { fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', color: '#3b3a36' };

export class HudScene extends Phaser.Scene {
  private joyId: number | null = null;
  private joyOrigin: Vec | null = null;
  private joyCur: Vec | null = null;
  private dashPressed = false;
  private joyRing!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;
  private bananaText!: Phaser.GameObjects.Text;
  private hearts!: Phaser.GameObjects.Graphics;
  private dashSweep!: Phaser.GameObjects.Graphics;
  private splashBtn!: Phaser.GameObjects.Container;
  private pausedText!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pause: PauseState = newPause();

  constructor() { super('Hud'); }

  create() {
    this.joyId = null; this.joyOrigin = null; this.joyCur = null; this.dashPressed = false;
    this.pause = newPause();

    // The CSS rotate prompt only covers the screen; also pause the simulation while in portrait.
    const portraitMq = matchMedia('(orientation: portrait) and (pointer: coarse)');
    const onMq = () => {
      if (portraitMq.matches) this.releaseJoystick();
      this.pause = onOrientation(this.pause, portraitMq.matches);
      this.applyPause();
    };
    portraitMq.addEventListener('change', onMq);
    this.events.once('shutdown', () => portraitMq.removeEventListener('change', onMq));
    this.time.delayedCall(0, onMq); // after the HUD objects below exist

    // Top-left pills: bananas delivered/target, hearts.
    const pills = this.add.graphics();
    pills.fillStyle(P.cream, 0.95).fillRoundedRect(24, 20, 150, 52, 26).fillRoundedRect(186, 20, 150, 52, 26);
    this.add.image(58, 46, TEX.banana).setScale(1.2);
    this.bananaText = this.add.text(82, 46, '0/0', { ...FONT, fontSize: '26px' }).setOrigin(0, 0.5);
    this.hearts = this.add.graphics();

    // Top-right pause button.
    const pause = this.add.container(GAME_W - 56, 46);
    const pg = this.add.graphics();
    pg.fillStyle(P.cream, 0.95).fillCircle(0, 0, 26);
    pg.fillStyle(P.ink, 1).fillRoundedRect(-9, -11, 6, 22, 2).fillRoundedRect(3, -11, 6, 22, 2);
    pause.add(pg).setSize(52, 52).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.togglePause());
    this.pausedText = this.add.text(GAME_W / 2, GAME_H / 2, 'Paused', { ...FONT, fontSize: '48px', color: '#f3ead3', stroke: '#3b3a36', strokeThickness: 8 }).setOrigin(0.5).setVisible(false);

    // Dash button with a cooldown sweep.
    const dash = this.add.graphics();
    dash.fillStyle(P.cream, 0.9).fillCircle(DASH.x, DASH.y, DASH.r);
    this.add.text(DASH.x, DASH.y, 'DASH', { ...FONT, fontSize: '24px' }).setOrigin(0.5);
    this.dashSweep = this.add.graphics();
    this.add.zone(DASH.x, DASH.y, DASH.r * 2, DASH.r * 2).setInteractive().on('pointerdown', () => { this.dashPressed = true; });

    // Splash button: visual placeholder in the mockup, greyed out on land.
    const sg = this.add.graphics();
    sg.fillStyle(P.cream, 0.9).fillCircle(0, 0, SPLASH.r);
    sg.fillStyle(P.water, 1).fillTriangle(-16, 10, 0, -16, 16, 10);
    this.splashBtn = this.add.container(SPLASH.x, SPLASH.y, [sg]);

    // Floating joystick on the left half.
    this.joyRing = this.add.circle(0, 0, JOY_R, P.cream, 0.35).setVisible(false);
    this.joyKnob = this.add.circle(0, 0, 28, P.cream, 0.6).setVisible(false);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.joyId !== null || p.x >= GAME_W / 2) return;
      this.joyId = p.id; this.joyOrigin = { x: p.x, y: p.y }; this.joyCur = { x: p.x, y: p.y };
      this.joyRing.setPosition(p.x, p.y).setVisible(true); this.joyKnob.setPosition(p.x, p.y).setVisible(true);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joyId || !this.joyOrigin) return;
      this.joyCur = { x: p.x, y: p.y };
      const dx = p.x - this.joyOrigin.x, dy = p.y - this.joyOrigin.y, l = Math.hypot(dx, dy), k = l > JOY_R ? JOY_R / l : 1;
      this.joyKnob.setPosition(this.joyOrigin.x + dx * k, this.joyOrigin.y + dy * k);
    });
    const release = (p: Phaser.Input.Pointer) => { if (p.id === this.joyId) this.releaseJoystick(); };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);

    // Keyboard: WASD/arrows move, Space dashes, Esc pauses.
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard!.addKeys({ up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D, space: K.SPACE, esc: K.ESC }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys.space.on('down', () => { this.dashPressed = true; });
    this.keys.esc.on('down', () => this.togglePause());
  }

  private releaseJoystick() {
    this.joyId = null; this.joyOrigin = null; this.joyCur = null;
    this.joyRing.setVisible(false); this.joyKnob.setVisible(false);
  }

  private togglePause() {
    this.pause = onToggle(this.pause);
    this.applyPause();
  }

  private applyPause() {
    const want = isPaused(this.pause), is = this.scene.isPaused('Level');
    if (want && !is) this.scene.pause('Level');
    else if (!want && is) this.scene.resume('Level');
    this.pausedText.setVisible(this.pause.user);
  }

  update() {
    const k = this.keys;
    const kx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const ky = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const joy = joystickVector(this.joyOrigin, this.joyCur, JOY_R);
    const kl = Math.hypot(kx, ky) || 1;
    const move = joy.x || joy.y ? joy : { x: kx / kl, y: ky / kl };
    const prev = this.registry.get('input') ?? { dash: false };
    this.registry.set('input', { move, dash: this.dashPressed || prev.dash });
    this.dashPressed = false;

    const gs: GameState | undefined = this.registry.get('game');
    const hs: HippoState | undefined = this.registry.get('hippo');
    if (gs) {
      this.bananaText.setText(`${gs.delivered}/${gs.target}`);
      this.hearts.clear();
      for (let i = 0; i < 3; i++) {
        const x = 214 + i * 40, y = 34, c = i < gs.hearts ? P.alert : P.creamDark;
        facet(this.hearts, [x, y + 6, x + 7, y, x + 14, y + 4, x + 21, y, x + 28, y + 6, x + 28, y + 12, x + 14, y + 26, x, y + 12], c);
      }
    }
    if (hs) {
      this.dashSweep.clear();
      if (hs.dashCd > 0) {
        this.dashSweep.fillStyle(P.ink, 0.35).slice(DASH.x, DASH.y, DASH.r, -Math.PI / 2, -Math.PI / 2 + (hs.dashCd / DASH_CD) * Math.PI * 2, false).fillPath();
      }
      this.splashBtn.setAlpha(hs.inWater ? 1 : 0.35);
    }
  }
}
