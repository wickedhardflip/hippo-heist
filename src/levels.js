// ================= LEVELS, DIFFICULTY, POWER-UPS =================
const WORLD = 115;
const DIFF = {
  recruit: { dmg: 0.45, detect: 0.65, extra: -1, regen: 16, label: 'Recruit', note: 'Farmers are slow to notice you and hit softly.' },
  regular: { dmg: 0.8, detect: 1.0, extra: 0, regen: 12, label: 'Regular', note: 'A fair fight. Farmers react quickly once they spot you.' },
  hardened: { dmg: 1.1, detect: 1.3, extra: 2, regen: 9, label: 'Hardened', note: 'More farmers, sharper eyes, heavier swings.' },
  veteran: { dmg: 1.55, detect: 1.65, extra: 4, regen: 6, label: 'Veteran', note: 'The whole valley is armed and awake. Use the water.' }
};
const TOOLS = {
  hatchet: { dmg: 17, reach: 2.4, wind: 0.36, cool: 1.0, speed: 1, name: 'HATCHET' },
  machete: { dmg: 14, reach: 2.5, wind: 0.28, cool: 0.85, speed: 1.04, name: 'MACHETE' },
  pitchfork: { dmg: 13, reach: 3.1, wind: 0.42, cool: 1.15, speed: 0.97, name: 'PITCHFORK' },
  shovel: { dmg: 12, reach: 2.7, wind: 0.45, cool: 1.15, speed: 1, knock: 7, name: 'SHOVEL' },
  chainsaw: { dmg: 7, reach: 2.6, wind: 0.12, cool: 0.22, speed: 0.82, name: 'CHAINSAW' }
};
const POWER = {
  golden: { name: 'GOLDEN BANANA', short: 'GOLD', color: 0xffc81e, css: '#ffc81e', desc: 'Counts as three bananas' },
  melon: { name: 'WATERMELON', short: 'MELON', color: 0x5fcf4f, css: '#7ee06a', desc: 'Restores full health' },
  pepper: { name: 'HOT PEPPER', short: 'PEPPER', color: 0xff3a1e, css: '#ff6a4e', desc: 'Speed boost and endless stamina', dur: 15 },
  camo: { name: 'MUD CAMO', short: 'CAMO', color: 0x9b7448, css: '#c79a66', desc: 'Farmers struggle to see you', dur: 25 },
  hide: { name: 'THICK HIDE', short: 'HIDE', color: 0xb8c2cc, css: '#c9d3dc', desc: 'Armor that absorbs damage' },
  parrot: { name: 'RECON PARROT', short: 'RECON', color: 0x35d7e8, css: '#5fe3f0', desc: 'Every farmer shows on your map', dur: 30 },
  frenzy: { name: 'FEEDING FRENZY', short: 'FRENZY', color: 0xb44dff, css: '#c98bff', desc: 'Your bite is lethal anywhere', dur: 15 }
};
const LEVELS = [
  {
    id: 1, op: 'CHAIN BREAKER', place: 'Lower Valley Plantation', clock: 'DAY 1 · 05:47', seed: 11,
    captiveLine: 'Chained to an iron stake inside a fenced pen',
    brief: [
      'A leopard was caught raiding the henhouse and now sits chained to an iron stake in the middle of the Lower Valley plantation. He is half starved and too weak to fight the chain.',
      'The farm is ringed with banana groves. Strip the bunches from the trees, carry them to the pen and feed him until he can snap the chain himself.',
      'Six farmers walk the groves with hatchets, machetes and pitchforks. On open ground they will cut you down. Lead them to the river, where you are faster than any of them and your bite is lethal.'
    ],
    intel: [['Captive', 'Chained in pen'], ['Hostiles', 'Farmers'], ['Supply', 'Gold, melon, pepper, camo']],
    sky: { top: 0x587ca8, hor: 0xeac08e, sun: [0.85, 0.2, -0.32], sunCol: 0xffc58a, sunInt: 1.3, hemiSky: 0xc3d6ef, hemiGround: 0x6b5638, hemiInt: 0.72, fog: 0xcfb48e, fogD: 0.0062, cloud: 0.42, cloudCol: 0xf6dcc0, night: 0, rain: 0, gain: [1.06, 1.0, 0.9], lift: [0.012, 0.012, 0.02], expo: 1.05, grass: [0x5f7434, 0x7f8a3e], mud: 0x5c4a33 },
    water: [{ type: 'river', axis: 'z', base: -70, a1: 8, f1: 0.022, p1: 0, a2: 3, f2: 0.061, p2: 1.3 }],
    base: 1.6, hill: 2.4,
    fields: [{ x0: -34, x1: -8, z0: -80, z1: -30 }, { x0: 4, x1: 40, z0: -84, z1: -38 }, { x0: -34, x1: -8, z0: 22, z1: 78 }, { x0: 8, x1: 42, z0: 36, z1: 86 }, { x0: 52, x1: 88, z0: -14, z1: 22 }],
    captive: { type: 'chain', x: 22, z: 4 },
    props: [
      { t: 'farmhouse', x: 74, z: -62, ry: 0 }, { t: 'barn', x: 78, z: 58, ry: 0 }, { t: 'silo', x: 94, z: 44 }, { t: 'shed', x: -16, z: -4, ry: Math.PI / 2 },
      { t: 'tractor', x: 50, z: -30, ry: 0.4 }, { t: 'pickup', x: 62, z: -46, ry: Math.PI / 2 }, { t: 'hay', x: 64, z: 46 }, { t: 'hay', x: 66, z: 49 }, { t: 'hay', x: 62, z: 70 },
      { t: 'crates', x: 32, z: -8 }, { t: 'crates', x: 12, z: 16 }, { t: 'scarecrow', x: -20, z: -55 }, { t: 'scarecrow', x: 25, z: 60 }, { t: 'well', x: 58, z: -60 },
      { t: 'barrels', x: 68, z: -50 }, { t: 'fence', x0: 46, z0: -72, x1: 46, z1: -48 }, { t: 'fence', x0: 46, z0: -48, x1: 100, z1: -48 }, { t: 'outhouse', x: 88, z: -72 }
    ],
    start: { river: 0, t: 96, off: 17 }, exfil: { river: 0, t: -96, off: 15 },
    enemies: { farmers: 6, tools: ['hatchet', 'machete', 'pitchfork'], dogs: 0, lanterns: false },
    waves: [{ at: 30, f: 2 }, { at: 60, f: 2 }, { at: 85, f: 2 }],
    need: 16, cap: 5, power: ['golden', 'melon', 'pepper', 'camo'],
    insertion: ['OPERATION CHAIN BREAKER', 'DAY 1 · 05:47:12', 'Lower Valley Plantation', 'Callsign: MUDSLIDE']
  },
  {
    id: 2, op: 'HARD CARGO', place: 'Cooper Packing Yard', clock: 'DAY 2 · 18:42', seed: 23,
    captiveLine: 'Locked in a steel cage on a flatbed truck',
    brief: [
      'The farmers moved the leopard. He is locked in a steel shipping cage strapped to a flatbed in the Cooper packing yard, ready to be hauled out of the valley at nightfall.',
      'Feed him through the bars. When he is strong enough he will tear the cage door off its hinges.',
      'Expect more farmers armed with shovels, and two guard dogs that can smell you from far away. Dogs bark to call the farmers and run if you bite them. Three ponds and a lake surround the yard. Use them.'
    ],
    intel: [['Captive', 'Cage on a flatbed'], ['Hostiles', 'Farmers and guard dogs'], ['Supply', 'Gold, melon, hide, recon, pepper']],
    sky: { top: 0x3c4c7c, hor: 0xf1925a, sun: [-0.75, 0.1, 0.42], sunCol: 0xff8d42, sunInt: 1.45, hemiSky: 0xd6a7a6, hemiGround: 0x4b3a2a, hemiInt: 0.62, fog: 0xd59468, fogD: 0.0088, cloud: 0.55, cloudCol: 0xf7a774, night: 0, rain: 0, gain: [1.08, 0.97, 0.9], lift: [0.02, 0.01, 0.02], expo: 1.05, grass: [0x6a6f32, 0x8a7c3a], mud: 0x56432f },
    water: [{ type: 'pond', x: -70, z: -60, r: 38 }, { type: 'pond', x: -64, z: 64, r: 22 }, { type: 'pond', x: 82, z: 84, r: 22 }],
    base: 1.6, hill: 2.0,
    fields: [{ x0: -20, x1: 10, z0: -98, z1: -52 }, { x0: 30, x1: 62, z0: -94, z1: -54 }, { x0: -24, x1: 10, z0: 34, z1: 84 }, { x0: 28, x1: 58, z0: 22, z1: 50 }, { x0: 72, x1: 102, z0: -42, z1: 8 }],
    captive: { type: 'truck', x: 14, z: -10 },
    props: [
      { t: 'packing', x: 47, z: -12, ry: 0 }, { t: 'farmhouse', x: 92, z: 30, ry: Math.PI / 2 }, { t: 'barn', x: -42, z: 2, ry: Math.PI / 2 },
      { t: 'pickup', x: 30, z: -30, ry: 0.3 }, { t: 'pickup', x: -6, z: 16, ry: -1.2 }, { t: 'watertower', x: 76, z: -62 }, { t: 'crates', x: 36, z: 4 }, { t: 'crates', x: 58, z: 4 },
      { t: 'crates', x: 22, z: -24 }, { t: 'barrels', x: 2, z: -18 }, { t: 'hay', x: -30, z: 20 }, { t: 'hay', x: -26, z: 16 }, { t: 'lamp', x: 24, z: -2 }, { t: 'lamp', x: 4, z: -20 },
      { t: 'lamp', x: 36, z: -26 }, { t: 'fence', x0: 20, z0: -46, x1: 70, z1: -46 }, { t: 'tractor', x: 66, z: 30, ry: -0.6 }, { t: 'scarecrow', x: 44, z: -75 }
    ],
    start: { pond: 1, a: 0.55, off: 18 }, exfil: { pond: 0, a: 0.3, off: 15 },
    enemies: { farmers: 7, tools: ['shovel', 'pitchfork', 'hatchet', 'machete'], dogs: 2, lanterns: false },
    waves: [{ at: 30, f: 2, d: 1 }, { at: 60, f: 2 }, { at: 85, f: 2, d: 1 }],
    need: 18, cap: 5, power: ['golden', 'melon', 'hide', 'parrot', 'pepper'],
    insertion: ['OPERATION HARD CARGO', 'DAY 2 · 18:42:55', 'Cooper Packing Yard', 'Callsign: MUDSLIDE']
  },
  {
    id: 3, op: 'BLACK RAIN', place: 'Monsoon Ridge Sawmill', clock: 'DAY 3 · 23:10', seed: 37,
    captiveLine: 'Caged and hoisted under the sawmill gantry',
    brief: [
      'Last chance. The leopard is caged and hoisted off the ground on a timber gantry behind the Monsoon Ridge sawmill. Tomorrow he is sold.',
      'Toss bananas up into the cage. When he is strong enough his weight will snap the rope and the fall will break the cage open.',
      'It is night and the monsoon has arrived. Farmers carry lanterns, so you can see them coming, and three dogs roam the mill. At half strength the sawmill foreman joins the hunt with a chainsaw. The river cuts the valley in two and the far bank is yours to exfil from.'
    ],
    intel: [['Captive', 'Hanging cage'], ['Hostiles', 'Farmers, dogs, the foreman'], ['Supply', 'All seven power-ups']],
    sky: { top: 0x0a111e, hor: 0x2a3443, sun: [0.3, 0.55, 0.6], sunCol: 0x9db4dc, sunInt: 0.62, hemiSky: 0x5d7196, hemiGround: 0x1b1c16, hemiInt: 0.5, fog: 0x1c2531, fogD: 0.0135, cloud: 0.82, cloudCol: 0x2e3747, night: 1, rain: 1, gain: [0.95, 1.02, 1.1], lift: [0.015, 0.02, 0.035], expo: 1.25, grass: [0x3b4a2a, 0x4f5a32], mud: 0x3d3326 },
    water: [{ type: 'river', axis: 'x', base: 8, a1: 9, f1: 0.025, p1: 0, a2: 3, f2: 0.07, p2: 2 }, { type: 'pond', x: -78, z: -72, r: 22 }],
    base: 1.6, hill: 2.8,
    fields: [{ x0: -40, x1: -6, z0: -100, z1: -52 }, { x0: 52, x1: 96, z0: -98, z1: -64 }, { x0: -62, x1: -22, z0: 50, z1: 96 }, { x0: 8, x1: 48, z0: 56, z1: 100 }, { x0: 64, x1: 100, z0: 46, z1: 86 }],
    captive: { type: 'hang', x: 26, z: -56 },
    props: [
      { t: 'sawmill', x: 62, z: -38, ry: 0 }, { t: 'logs', x: 44, z: -34 }, { t: 'logs', x: 80, z: -50, ry: Math.PI / 2 }, { t: 'watertower', x: -12, z: -36 },
      { t: 'farmhouse', x: 92, z: -24, ry: Math.PI }, { t: 'shed', x: -4, z: 72, ry: 0 }, { t: 'tractor', x: 30, z: 46, ry: 1.2 }, { t: 'lamp', x: 30, z: -44 }, { t: 'lamp', x: 12, z: -64 },
      { t: 'lamp', x: 50, z: -52 }, { t: 'crates', x: 16, z: -42 }, { t: 'barrels', x: 40, z: -60 }, { t: 'pickup', x: 72, z: -24, ry: 0.2 }, { t: 'scarecrow', x: -40, z: 70 },
      { t: 'fence', x0: -100, z0: 44, x1: -70, z1: 44 }, { t: 'hay', x: -20, z: -46 }
    ],
    start: { river: 0, t: -96, off: 17, side: 1 }, exfil: { river: 0, t: 98, off: 15, side: 1 },
    enemies: { farmers: 8, tools: ['hatchet', 'machete', 'pitchfork', 'shovel'], dogs: 3, lanterns: true },
    waves: [{ at: 25, f: 2, d: 1 }, { at: 50, f: 1, foreman: true }, { at: 80, f: 3 }],
    need: 20, cap: 5, power: ['golden', 'melon', 'pepper', 'camo', 'hide', 'parrot', 'frenzy'],
    insertion: ['OPERATION BLACK RAIN', 'DAY 3 · 23:10:04', 'Monsoon Ridge Sawmill', 'Callsign: MUDSLIDE']
  }
];
const FARMER_NAMES = ['Dale', 'Earl', 'Wade', 'Rusty', 'Hank', 'Otis', 'Merle', 'Buck', 'Vern', 'Gus', 'Roy', 'Lyle', 'Floyd', 'Amos', 'Boone', 'Jeb', 'Cal', 'Walt', 'Abe', 'Ned', 'Clem', 'Hoyt', 'Ike', 'Jud'];
const DOG_NAMES = ['Biscuit', 'Rufus', 'Duke', 'Bandit', 'Ranger', 'Blue'];
const DEATH_QUOTES = [
  'Never fight a farmer on dry land. The river is your ally.',
  'A hippo can outrun a farmer in the shallows. On open grass, the hatchet wins.',
  'Bellow from the water and let them come to you.',
  'Mud camo hides you. Sprinting through the groves does not.',
  'The dogs are the alarm. Silence the alarm and the yard stays quiet.',
  'Every banana counts. Every farmer you eat is one less hatchet.'
];
