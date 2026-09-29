import Phaser from 'phaser';
import { PALETTE as P } from './palette';
import { facet } from './facets';

export const FONT = { fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', color: '#3b3a36' } as const;

/** Faceted 5-point star: banana yellow with a darker right half when filled, cream when empty. */
export function drawStar(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, filled: boolean) {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  facet(g, pts, filled ? P.banana : P.creamDark);
  if (filled) facet(g, [x, y - r, ...pts.slice(2, 10), x, y + r * 0.45], P.bananaDark);
}

/** Rounded pill button. Returns its parts so callers can pin them (scroll factor / depth). */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, label: string, onTap: () => void, dark = true) {
  const g = scene.add.graphics();
  g.fillStyle(dark ? P.ink : P.creamDark, 1).fillRoundedRect(x - w / 2, y - 30, w, 60, 30);
  const t = scene.add.text(x, y, label, { ...FONT, fontSize: '24px', color: dark ? '#f3ead3' : '#3b3a36' }).setOrigin(0.5);
  const z = scene.add.zone(x, y, w, 60).setInteractive({ useHandCursor: true }).on('pointerdown', onTap);
  return [g, t, z] as const;
}
