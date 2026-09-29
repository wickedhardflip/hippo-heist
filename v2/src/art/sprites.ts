import Phaser from 'phaser';
import { PALETTE as P } from './palette';
import { facet } from './facets';
export const TEX = { hippo: 'hippo', hippoSub: 'hippo-sub', farmer: 'farmer', leopard: 'leopard', banana: 'banana', plant: 'plant', barn: 'barn' } as const;

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
  const g = scene.add.graphics(); draw(g); g.generateTexture(key, w, h); g.destroy();
}
export function bakeSprites(scene: Phaser.Scene) {
  // Hippo 140x100, facing right. Light from top-left: light plane on top, dark plane on the right/back.
  bake(scene, TEX.hippo, 140, 100, (g) => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(70, 90, 120, 18);
    facet(g, [30,62, 42,62, 42,88, 30,88], P.hippoDark); facet(g, [82,62, 94,62, 94,88, 82,88], P.hippoDark);
    facet(g, [22,30, 34,20, 96,20, 104,30, 104,70, 96,78, 30,78, 22,70], P.hippo);
    facet(g, [22,30, 34,20, 96,20, 104,30, 94,36, 32,36], P.hippoLight);
    facet(g, [104,30, 104,70, 96,78, 88,78, 94,36], P.hippoDark);
    facet(g, [44,64, 56,64, 56,90, 44,90], P.hippo); facet(g, [96,64, 108,64, 108,90, 96,90], P.hippo);
    facet(g, [92,26, 118,24, 132,38, 132,66, 118,74, 94,70], P.hippo);
    facet(g, [92,26, 118,24, 126,32, 100,36], P.hippoLight);
    facet(g, [118,52, 132,52, 132,66, 118,74], P.hippoDark);
    facet(g, [96,18, 104,12, 108,22], P.hippoDark); facet(g, [110,16, 118,10, 120,22], P.hippoDark);
    facet(g, [106,36, 112,36, 112,42, 106,42], P.ink);
    facet(g, [124,44, 128,44, 128,48, 124,48], P.hippoPink);
  });
  // Submerged hippo: only eyes, ears, and the top of the snout above water.
  bake(scene, TEX.hippoSub, 80, 40, (g) => {
    g.fillStyle(P.waterLight, 0.6); g.fillEllipse(40, 26, 76, 22);
    facet(g, [22,16, 30,8, 34,20], P.hippoDark); facet(g, [42,14, 50,6, 52,20], P.hippoDark);
    facet(g, [30,18, 38,18, 38,24, 30,24], P.hippo); facet(g, [44,18, 52,18, 52,24, 44,24], P.hippo);
    facet(g, [33,19, 36,19, 36,22, 33,22], P.ink); facet(g, [47,19, 50,19, 50,22, 47,22], P.ink);
  });
  // Farmer 50x90.
  bake(scene, TEX.farmer, 50, 90, (g) => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(25, 84, 36, 10);
    facet(g, [15,70, 23,70, 23,84, 15,84], P.soilDark); facet(g, [27,70, 35,70, 35,84, 27,84], P.soilDark);
    facet(g, [13,36, 37,36, 37,72, 13,72], P.farmerOveralls);
    facet(g, [29,36, 37,36, 37,72, 29,72], P.ink);
    facet(g, [9,34, 41,34, 41,48, 9,48], P.farmerShirt); facet(g, [15,40, 35,40, 35,56, 15,56], P.farmerOveralls);
    facet(g, [17,18, 33,18, 33,34, 17,34], P.skin);
    facet(g, [4,18, 46,18, 42,22, 8,22], P.farmerHat); facet(g, [15,6, 35,6, 37,18, 13,18], P.farmerHat);
    facet(g, [26,6, 35,6, 37,18, 28,18], P.bananaDark);
  });
  // Leopard 110x70, lying down.
  bake(scene, TEX.leopard, 110, 70, (g) => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(55, 62, 96, 12);
    facet(g, [10,30, 20,22, 76,22, 84,32, 84,58, 10,58], P.leopard);
    facet(g, [10,30, 20,22, 76,22, 84,32, 20,34], P.cream);
    facet(g, [70,14, 98,14, 104,28, 98,46, 72,46], P.leopard);
    facet(g, [92,28, 104,28, 98,46, 88,46], P.leopardDark);
    facet(g, [72,8, 78,14, 70,16], P.leopardDark); facet(g, [92,8, 98,14, 90,16], P.leopardDark);
    for (const [x, y] of [[26,40],[40,46],[54,38],[62,50],[34,52]]) facet(g, [x,y, x+5,y, x+5,y+4, x,y+4], P.spot);
    facet(g, [0,52, 12,48, 14,54, 2,58], P.leopardDark);
  });
  // Banana bunch 28x24.
  bake(scene, TEX.banana, 28, 24, (g) => {
    facet(g, [2,10, 14,2, 26,6, 20,20, 8,22], P.banana);
    facet(g, [14,2, 26,6, 20,20, 16,12], P.bananaDark);
  });
  // Banana plant 70x90.
  bake(scene, TEX.plant, 70, 90, (g) => {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(35, 84, 30, 8);
    facet(g, [32,40, 38,40, 38,84, 32,84], P.plantDark);
    facet(g, [34,40, 4,22, 10,14, 36,34], P.plant); facet(g, [36,40, 66,22, 60,14, 34,34], P.plantDark);
    facet(g, [34,36, 14,4, 24,2, 36,30], P.plantLight); facet(g, [36,36, 56,4, 46,2, 34,30], P.plant);
  });
  // Barn 200x190.
  bake(scene, TEX.barn, 200, 190, (g) => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(100, 180, 190, 20);
    facet(g, [10,80, 150,80, 150,176, 10,176], P.barn); facet(g, [150,80, 190,70, 190,166, 150,176], P.barnDark);
    facet(g, [0,82, 80,20, 160,82], P.roof); facet(g, [80,20, 180,10, 196,72, 160,82], P.roofDark);
    facet(g, [55,110, 105,110, 105,176, 55,176], P.ink);
  });
}
