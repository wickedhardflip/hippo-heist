// ================= ACTORS: hippo (viewmodel + body), leopard, captive rigs, farmers, dogs =================
const HM = {
  skin: new THREE.MeshStandardMaterial({ map: TEX.hippo, color: 0xc4b4bc, roughness: 0.48, metalness: 0.02 }),
  skinVM: new THREE.MeshStandardMaterial({ map: TEX.hippo, color: 0x9a8c94, roughness: 0.42, metalness: 0.04 }),
  skinWet: new THREE.MeshStandardMaterial({ map: TEX.hippo, color: 0xb0a0a8, roughness: 0.28, metalness: 0.05 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xc98a8e, roughness: 0.5 }),
  mouth: new THREE.MeshStandardMaterial({ color: 0xb2475f, roughness: 0.35 }),
  tongue: new THREE.MeshStandardMaterial({ color: 0xd8788a, roughness: 0.3 }),
  ivory: new THREE.MeshStandardMaterial({ color: 0xf0e6cc, roughness: 0.25 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x1a0f0c, roughness: 0.1, metalness: 0.2 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a1c20, roughness: 0.6 })
};
function makeHippoHead(vm = false) {
  const h = {}; const g = h.g = new THREE.Group(); const S = vm ? HM.skinVM : HM.skin;
  h.cranium = mk(GEO.sphHi, S, 0, 0.18, 0.12, 0.8, 0.64, 0.86, g);
  const U = h.jawU = grp(g, 0, 0.05, 0.42);
  mk(GEO.sphHi, S, 0, 0.08, 0.64, 0.9, 0.42, 0.92, U);
  for (const s of [-1, 1]) {
    mk(GEO.sph, S, s * 0.27, 0.34, 1.12, 0.22, 0.19, 0.22, U);
    const n = mk(GEO.sph, HM.dark, s * 0.28, 0.5, 1.17, 0.07, 0.035, 0.11, U); n.rotation.y = s * 0.4;
    const c = mk(GEO.cone, HM.ivory, s * 0.6, -0.33, 1.0, 0.065, 0.3, 0.065, U); c.rotation.x = Math.PI;
    mk(GEO.sph, HM.pink, s * 0.66, -0.12, 0.85, 0.2, 0.18, 0.3, U);
  }
  mk(GEO.sph, HM.mouth, 0, -0.27, 0.62, 0.8, 0.12, 0.86, U);
  const Lj = h.jawL = grp(g, 0, -0.12, 0.4);
  mk(GEO.sphHi, S, 0, -0.25, 0.64, 0.86, 0.36, 0.9, Lj);
  mk(GEO.sph, HM.mouth, 0, -0.05, 0.64, 0.74, 0.12, 0.8, Lj);
  mk(GEO.sph, HM.tongue, 0, 0.02, 0.52, 0.4, 0.13, 0.52, Lj);
  for (const s of [-1, 1]) {
    const t = mk(GEO.cone, HM.ivory, s * 0.6, 0.2, 1.0, 0.1, 0.62, 0.1, Lj); t.rotation.z = -s * 0.18; t.rotation.x = 0.12;
    const i = mk(GEO.cone, HM.ivory, s * 0.17, -0.06, 1.44, 0.055, 0.36, 0.055, Lj); i.rotation.x = Math.PI / 2 - 0.15;
    mk(GEO.sph, HM.pink, s * 0.64, -0.18, 0.88, 0.22, 0.2, 0.32, Lj);
  }
  h.eyes = grp(g); h.ears = [];
  for (const s of [-1, 1]) {
    mk(GEO.sph, S, s * 0.38, 0.6, 0.28, 0.21, 0.18, 0.22, h.eyes);
    mk(GEO.sph, HM.eye, s * 0.44, 0.66, 0.4, 0.085, 0.085, 0.085, h.eyes);
    const ear = grp(h.eyes, s * 0.36, 0.78, -0.02); mk(GEO.sph, S, 0, 0.08, 0, 0.1, 0.16, 0.07, ear); mk(GEO.sph, HM.pink, 0, 0.08, 0.03, 0.06, 0.11, 0.04, ear); ear.rotation.z = -s * 0.35; h.ears.push(ear);
  }
  if (vm) { h.eyes.visible = false; h.cranium.visible = false; g.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }); }
  h.setOpen = (o) => { U.rotation.x = -o * 0.62; Lj.rotation.x = o * 1.05; };
  return h;
}
// ----- first-person viewmodel -----
const VM = { root: new THREE.Group() };
vmScene.add(VM.root);
const vmHemi = new THREE.HemisphereLight(0xfff4e6, 0x4a3a30, 0.55); vmScene.add(vmHemi);
const vmSun = new THREE.DirectionalLight(0xffe2b8, 0.55); vmSun.position.set(1, 3, 1.5); vmScene.add(vmSun);
VM.head = makeHippoHead(true); VM.pivot = grp(VM.root); VM.pivot.add(VM.head.g);
VM.head.g.rotation.y = Math.PI; VM.head.g.position.set(0, -1.38, -0.55);
VM.pivot.rotation.x = 0.06;
VM.bunch = new THREE.Mesh(bunchGeo, bunchMat); VM.bunch.scale.setScalar(0.62); VM.bunch.position.set(-0.95, 0.3, 1.15); VM.bunch.rotation.set(0.2, 0, -1.1); VM.head.jawL.add(VM.bunch);
// ----- third-person hippo -----
function makeHippoBody() {
  const b = { g: new THREE.Group() }; const S = HM.skin, g = b.g;
  b.body = grp(g);
  mk(GEO.sphHi, S, 0, 1.25, 0, 1.18, 0.98, 1.95, b.body);
  mk(GEO.sphHi, S, 0, 1.38, 1.05, 1.08, 0.92, 0.95, b.body);
  mk(GEO.sphHi, S, 0, 1.3, -1.1, 1.08, 0.92, 0.95, b.body);
  mk(GEO.sph, HM.pink, 0, 0.82, 0.15, 0.95, 0.55, 1.55, b.body);
  b.legs = [];
  for (const [x, z] of [[-0.72, 1.15], [0.72, 1.15], [-0.75, -1.15], [0.75, -1.15]]) {
    const p = grp(b.body, x, 0.95, z); mk(GEO.cyl, S, 0, -0.42, 0, 0.34, 0.9, 0.34, p); mk(GEO.sph, S, 0, -0.86, 0.05, 0.38, 0.17, 0.42, p);
    for (let i = -1; i <= 1; i++) mk(GEO.sph, HM.ivory, i * 0.16, -0.9, 0.38, 0.07, 0.05, 0.06, p);
    b.legs.push(p);
  }
  const t = mk(GEO.cone, S, 0, 1.4, -2.05, 0.12, 0.5, 0.05, b.body); t.rotation.x = -2.2;
  b.headPivot = grp(b.body, 0, 1.6, 1.78);
  b.head = makeHippoHead(false); b.head.g.position.set(0, -0.15, 0.1); b.headPivot.add(b.head.g);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.visible = false; scene.add(g);
  b.mouthHold = grp(b.head.jawL, 0, 0.15, 0.95);
  return b;
}
const HIPPO = makeHippoBody();
// ----- leopard -----
const LM = { spot: new THREE.MeshStandardMaterial({ map: TEX.spots, roughness: 0.78 }), cream: new THREE.MeshStandardMaterial({ color: 0xeedcb4, roughness: 0.8 }), nose: new THREE.MeshStandardMaterial({ color: 0x5a3a36, roughness: 0.5 }), eye: new THREE.MeshStandardMaterial({ color: 0xc8d24a, emissive: 0x9aa020, emissiveIntensity: 0.9, roughness: 0.1 }), leather: new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.7 }), metal: new THREE.MeshStandardMaterial({ color: 0x8e9398, roughness: 0.35, metalness: 0.85 }), dark: new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 }) };
function makeLeopard() {
  const l = { g: new THREE.Group() }; const g = l.g, S = LM.spot;
  l.body = grp(g);
  mk(GEO.sphHi, S, 0, 0.95, 0, 0.42, 0.4, 1.05, l.body);
  mk(GEO.sphHi, S, 0, 0.99, 0.62, 0.4, 0.45, 0.5, l.body);
  mk(GEO.sphHi, S, 0, 0.99, -0.68, 0.41, 0.43, 0.46, l.body);
  mk(GEO.sph, LM.cream, 0, 0.75, 0.05, 0.32, 0.26, 0.85, l.body);
  const nk = mk(GEO.sph, S, 0, 1.18, 0.95, 0.23, 0.29, 0.4, l.body); nk.rotation.x = -0.6;
  l.collar = mk(new THREE.TorusGeometry(0.26, 0.05, 8, 20), LM.leather, 0, 1.2, 1.0, 1, 1, 1, l.body); l.collar.rotation.x = Math.PI / 2 - 0.55;
  l.ring = mk(new THREE.TorusGeometry(0.07, 0.02, 6, 12), LM.metal, 0, 1.0, 1.14, 1, 1, 1, l.body);
  l.head = grp(l.body, 0, 1.38, 1.22);
  mk(GEO.sphHi, S, 0, 0, 0, 0.27, 0.24, 0.3, l.head);
  mk(GEO.sph, LM.cream, 0, -0.07, 0.24, 0.15, 0.12, 0.17, l.head);
  mk(GEO.sph, LM.nose, 0, -0.02, 0.39, 0.06, 0.04, 0.04, l.head);
  for (const s of [-1, 1]) { mk(GEO.sph, LM.eye, s * 0.11, 0.06, 0.23, 0.045, 0.04, 0.03, l.head); const e = mk(GEO.sph, S, s * 0.17, 0.2, -0.02, 0.07, 0.09, 0.035, l.head); e.rotation.z = -s * 0.3; const f = mk(GEO.cone, HM.ivory, s * 0.05, -0.16, 0.32, 0.018, 0.08, 0.018, l.head); f.rotation.x = Math.PI; }
  l.jaw = grp(l.head, 0, -0.11, 0.08); mk(GEO.sph, LM.cream, 0, -0.03, 0.16, 0.12, 0.05, 0.17, l.jaw); mk(GEO.sph, HM.mouth, 0, 0.01, 0.15, 0.1, 0.03, 0.14, l.jaw);
  l.legs = [];
  for (const [x, y, z] of [[-0.2, 0.95, 0.66], [0.2, 0.95, 0.66], [-0.22, 0.98, -0.72], [0.22, 0.98, -0.72]]) {
    const p = grp(l.body, x, y, z); const back = z < 0;
    mk(GEO.sph, S, 0, -0.08, 0, 0.13, 0.22, back ? 0.22 : 0.15, p);
    mk(GEO.cyl, S, 0, -0.32, 0, 0.085, 0.5, 0.085, p);
    const k = grp(p, 0, -0.55, 0); mk(GEO.cyl, S, 0, -0.18, 0, 0.065, 0.38, 0.065, k); mk(GEO.sph, LM.cream, 0, -0.38, 0.04, 0.1, 0.06, 0.13, k);
    p.knee = k; l.legs.push(p);
  }
  l.tail = []; let parent = grp(l.body, 0, 1.05, -1.06); parent.rotation.x = -2.3;
  for (let i = 0; i < 10; i++) { const s = grp(parent, 0, i === 0 ? 0 : 0.17, 0); mk(GEO.cyl8, i > 7 ? LM.dark : S, 0, 0.085, 0, 0.05 - i * 0.002, 0.18, 0.05 - i * 0.002, s); l.tail.push(s); parent = s; }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  l.pose = (o) => { // o: lie 0..1, gait phase, speed 0..1, t time, roar 0..1, crouch
    const lie = o.lie || 0, sp = o.speed || 0, ph = o.phase || 0;
    l.body.position.y = -0.52 * lie + Math.sin(o.t * 2) * 0.01 * (1 - sp) - (o.crouch || 0) * 0.25;
    l.body.rotation.x = Math.sin(ph * 2) * 0.05 * sp;
    l.legs.forEach((p, i) => {
      const front = i < 2, off = (i % 2) * Math.PI + (front ? 0 : 0.6);
      const sw = Math.sin(ph + off) * 0.75 * sp;
      p.rotation.x = lerp(sw, front ? -1.45 : -1.25, lie); p.knee.rotation.x = lerp(Math.max(0, Math.sin(ph + off + 1.4)) * 0.9 * sp * (front ? -1 : 1), front ? 0.2 : 1.9, lie);
    });
    l.head.rotation.x = lerp(o.look || 0, 0.35, lie) - (o.roar || 0) * 0.5; l.head.rotation.y = o.turn || 0;
    l.jaw.rotation.x = (o.roar || 0) * 0.7 + (o.chew || 0) * Math.max(0, Math.sin(o.t * 14)) * 0.35;
    l.tail.forEach((s, i) => { s.rotation.x = 0.06 + Math.sin(o.t * 1.8 + i * 0.5) * 0.06 + sp * 0.03; s.rotation.z = Math.sin(o.t * (1.2 + sp * 2) - i * 0.35) * (0.1 + i * 0.012); });
  };
  worldRoot.add(g);
  return l;
}
// ----- captive rigs -----
const linkGeo = new THREE.TorusGeometry(0.11, 0.032, 6, 12); linkGeo.userData.keep = true;
// steel cage with a hinged door on its +z side, shared by the flatbed truck and the circus train
function buildCage(r, x0, y0, z0) {
  const cg = r.cage = grp(r.g, x0, y0, z0); r.bars = [];
  const W = 2.3, H = 1.85, D = 3.4, frame = mat(0x4a4e50, { metalness: 0.7, roughness: 0.4 }), bar = mat(0x8a8f92, { metalness: 0.8, roughness: 0.35 });
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) mk(GEO.box, frame, x, H / 2, z, 0.1, H, 0.1, cg);
  for (const yy of [0.04, H]) { mk(GEO.box, frame, 0, yy, -D / 2, W, 0.1, 0.1, cg); mk(GEO.box, frame, 0, yy, D / 2, W, 0.1, 0.1, cg); mk(GEO.box, frame, -W / 2, yy, 0, 0.1, 0.1, D, cg); mk(GEO.box, frame, W / 2, yy, 0, 0.1, 0.1, D, cg); }
  mk(GEO.box, mat(0x3f4446, { metalness: 0.6, roughness: 0.5 }), 0, H + 0.05, 0, W, 0.04, D, cg);
  for (const s of [-1, 1]) for (let z = -D / 2 + 0.22; z < D / 2 - 0.1; z += 0.24) { const b = mk(GEO.cyl8, bar, s * W / 2, H / 2, z, 0.03, H, 0.03, cg); b.userData.side = s; r.bars.push(b); }
  for (let x = -W / 2 + 0.22; x < W / 2 - 0.1; x += 0.24) { const b = mk(GEO.cyl8, bar, x, H / 2, -D / 2, 0.03, H, 0.03, cg); b.userData.side = 0; r.bars.push(b); }
  r.door = grp(cg, -W / 2, 0, D / 2);
  for (let x = 0.12; x < W - 0.05; x += 0.24) mk(GEO.cyl8, bar, x, H / 2, 0, 0.03, H, 0.03, r.door);
  mk(GEO.box, frame, W / 2, H * 0.3, 0, W, 0.08, 0.08, r.door); mk(GEO.box, frame, W / 2, H * 0.7, 0, W, 0.08, 0.08, r.door);
  mk(GEO.box, mat(0x6a6a30, { metalness: 0.6 }), W - 0.1, H * 0.5, 0.08, 0.18, 0.25, 0.12, r.door);
}
function makeRig(cp) {
  const r = { type: cp.type, g: new THREE.Group(), x: cp.x, z: cp.z, y: groundH(cp.x, cp.z) };
  worldRoot.add(r.g);
  const B = new Builder();
  if (cp.type === 'chain') {
    r.stake = { x: cp.x + 2.4, z: cp.z, y: r.y };
    B.add(GEO.cyl8, 0x4a4a48, M(r.stake.x, r.y + 0.35, r.stake.z, 0, 0, 0, 0.12, 0.9, 0.12)); B.add(GEO.cyl8, 0x5a5a58, M(r.stake.x, r.y + 0.8, r.stake.z, 0, 0, 0, 0.18, 0.08, 0.18));
    B.add(GEO.cyl, 0x6a5a40, M(r.stake.x, r.y + 0.02, r.stake.z, 0, 0, 0, 1.2, 0.05, 1.2));
    const gate = Math.PI, R = 9, n = 30;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU; if (Math.abs(angDiff(a, gate)) < 0.3) continue;
      const x = cp.x + Math.cos(a) * R, z = cp.z + Math.sin(a) * R, y = groundH(x, z);
      B.add(GEO.box, 0x6b5636, M(x, y + 0.7, z, 0, -a, 0, 0.18, 1.6, 0.18)); COL.addCircle(x, z, 0.32);
      const a2 = (i + 0.5) / n * TAU; if (Math.abs(angDiff(a2, gate)) < 0.32) continue;
      const x2 = cp.x + Math.cos(a2) * R, z2 = cp.z + Math.sin(a2) * R, y2 = groundH(x2, z2);
      for (const h of [0.6, 1.2]) B.add(GEO.box, 0x7a6442, M(x2, y2 + h, z2, 0, -a2, 0, 0.08, 0.14, TAU * R / n + 0.15));
      COL.addCircle(x2, z2, 0.32);
    }
    for (const s of [-1, 1]) { const a = gate + s * 0.33, x = cp.x + Math.cos(a) * R, z = cp.z + Math.sin(a) * R; B.add(GEO.box, 0x5a4630, M(x, groundH(x, z) + 1.1, z, 0, 0, 0, 0.26, 2.4, 0.26)); COL.addCircle(x, z, 0.3); }
    { const gx = cp.x + Math.cos(gate + 0.33) * R, gz = Math.abs(Math.sin(0.33) * R); B.add(GEO.box, 0x5a4630, M(gx, groundH(gx, cp.z) + 2.25, cp.z, 0, 0, 0, 0.3, 0.28, gz * 2 + 0.6)); B.add(GEO.box, 0x8a7a5a, M(gx - 0.17, groundH(gx, cp.z) + 1.9, cp.z, 0, 0, 0, 0.05, 0.5, 2.4)); }
    { const sx = cp.x - 10.5, sz = cp.z + 6, sy = groundH(sx, sz); B.add(GEO.box, 0x6d5838, M(sx, sy + 1.2, sz, 0, 0.3, 0, 0.1, 1.0, 1.4)); for (const o of [-0.55, 0.55]) B.add(GEO.box, 0x4a3a26, M(sx + Math.sin(0.3) * o, sy + 0.6, sz + o * Math.cos(0.3), 0, 0.3, 0, 0.1, 1.3, 0.1)); }
    B.add(GEO.cyl, 0x5a6a70, M(cp.x - 2, r.y + 0.3, cp.z + 3, 0, 0, 0, 0.6, 0.5, 0.6)); B.add(GEO.cyl, 0x3a6a8a, M(cp.x - 2, r.y + 0.53, cp.z + 3, 0, 0, 0, 0.52, 0.02, 0.52));
    r.links = [];
    for (let i = 0; i < 16; i++) { const m = mk(linkGeo, LM.metal, 0, 0, 0, 1, 1, 1, r.g); r.links.push(m); }
    COL.addCircle(r.stake.x, r.stake.z, 0.3);
    r.feedPt = { x: cp.x, z: cp.z }; r.feedR = 4.8; r.leoBase = { x: cp.x - 0.5, z: cp.z, y: r.y }; r.radius = 2.6;
  } else if (cp.type === 'truck') {
    const y = r.y, bed = y + 1.35; r.bed = bed;
    B.add(GEO.box, 0x2c2c2c, M(cp.x, y + 0.75, cp.z, 0, 0, 0, 1.4, 0.4, 9));
    B.add(GEO.box, 0x6a5a48, M(cp.x, y + 1.18, cp.z - 1.1, 0, 0, 0, 2.7, 0.3, 6.6));
    B.add(GEO.box, 0x2f5f86, M(cp.x, y + 1.85, cp.z + 3.4, 0, 0, 0, 2.5, 1.9, 2.2)); B.add(GEO.box, 0x182630, M(cp.x, y + 2.35, cp.z + 4.52, -0.15, 0, 0, 2.2, 0.8, 0.05));
    B.add(GEO.box, 0x2f5f86, M(cp.x, y + 1.25, cp.z + 4.4, 0, 0, 0, 2.5, 0.9, 0.6)); B.add(GEO.box, 0xd8d8c8, M(cp.x, y + 1.0, cp.z + 4.72, 0, 0, 0, 2.2, 0.3, 0.06));
    for (const z of [-3.4, -2.2, 3.4]) B.add(GEO.cyl8, 0x222222, M(cp.x, y + 0.52, cp.z + z, 0, 0, Math.PI / 2, 0.14, 2.3, 0.14));
    for (const s of [-1, 1]) for (const z of [-3.4, -2.2, 3.4]) B.add(GEO.cyl, 0x151515, M(cp.x + s * 1.18, y + 0.52, cp.z + z, 0, 0, Math.PI / 2, 0.52, 0.38, 0.52));
    for (const s of [-1, 1]) B.add(GEO.box, 0xc8a83a, M(cp.x + s * 0.7, y + 1.35, cp.z - 1.1, 0, 0, 0, 0.06, 0.02, 6.4));
    COL.addBox(cp.x, cp.z, 1.5, 4.8, false);
    buildCage(r, cp.x, bed, cp.z - 1.2);
    r.feedPt = { x: cp.x, z: cp.z - 1.2 }; r.feedR = 5.2; r.leoBase = { x: cp.x, z: cp.z - 1.2, y: bed + 0.05 }; r.radius = 0.25;
  } else if (cp.type === 'train') {
    // circus train stopped at the platform: engine at the +x end, the leopard's flatcar in the middle
    const z = cp.z, y0 = r.y + 0.31, fl = y0 + 1.05, red = 0xa8282a, gold = 0xd8b23a;
    const wheels = (x0, x1, n, rad = 0.45) => { for (let i = 0; i < n; i++) { const x = lerp(x0, x1, n > 1 ? i / (n - 1) : 0.5); for (const s of [-1, 1]) B.add(GEO.cyl, 0x1a1a1a, M(x, y0 + rad, z + s * 0.78, Math.PI / 2, 0, 0, rad, 0.14, rad)); } };
    const frame = (x0, x1) => { B.add(GEO.box, 0x222222, M((x0 + x1) / 2, fl - 0.25, z, 0, 0, 0, x1 - x0, 0.3, 2.4)); for (const x of [x0, x1]) B.add(GEO.box, 0x3a3a3a, M(x, fl - 0.3, z, 0, 0, 0, 0.3, 0.2, 0.5)); };
    // engine
    frame(40, 54.5); wheels(41.5, 43.5, 2, 0.5); wheels(52, 53.6, 2, 0.45);
    for (const x of [45.2, 47.4, 49.6]) for (const s of [-1, 1]) { B.add(GEO.cyl, 0x8a1e1e, M(x, y0 + 0.85, z + s * 1.0, Math.PI / 2, 0, 0, 0.85, 0.12, 0.85)); B.add(GEO.cyl8, 0x2a2a2a, M(x, y0 + 0.85, z + s * 1.08, Math.PI / 2, 0, 0, 0.18, 0.1, 0.18)); }
    for (const s of [-1, 1]) B.add(GEO.box, 0x9a9a9a, M(47.4, y0 + 0.85, z + s * 1.12, 0, 0, 0, 4.6, 0.12, 0.06));
    B.add(GEO.cyl, 0x1c1c1e, M(48.6, fl + 1.25, z, 0, 0, Math.PI / 2, 1.2, 9.4, 1.2)); B.add(GEO.cyl, 0x2a2a2c, M(53.35, fl + 1.25, z, 0, 0, Math.PI / 2, 1.25, 0.3, 1.25));
    for (const x of [45, 47.6, 50.2]) B.add(GEO.cyl, gold, M(x, fl + 1.25, z, 0, 0, Math.PI / 2, 1.22, 0.12, 1.22));
    B.add(GEO.cyl, 0x1c1c1e, M(52.2, fl + 3.0, z, 0, 0, 0, 0.36, 1.4, 0.36)); B.add(GEO.cyl, 0x1c1c1e, M(52.2, fl + 3.8, z, 0, 0, 0, 0.55, 0.3, 0.55));
    B.add(GEO.sph, gold, M(49, fl + 2.4, z, 0, 0, 0, 0.5, 0.45, 0.5)); B.add(GEO.sph, 0x1c1c1e, M(46.3, fl + 2.35, z, 0, 0, 0, 0.4, 0.4, 0.4));
    B.add(GEO.box, 0x6a1a1a, M(42.2, fl + 1.6, z, 0, 0, 0, 3.6, 3.2, 2.9)); B.add(GEO.box, 0x1a1a1a, M(42.2, fl + 3.3, z, 0, 0, 0, 4.2, 0.18, 3.3));
    for (const s of [-1, 1]) B.add(GEO.box, L.sky.night ? 0xffc46a : 0x24323c, M(42.6, fl + 2.2, z + s * 1.46, 0, 0, 0, 1.4, 1.0, 0.04));
    B.add(GEO.prism, 0x8a1e1e, M(55.0, y0 + 0.4, z, 0, Math.PI / 2, 0, 2.4, 0.6, 0.9));
    B.add(GEO.box, 0xfff2c0, M(54.2, fl + 2.1, z, 0, 0, 0, 0.3, 0.5, 0.5));
    // coal tender
    frame(31, 39); wheels(32, 38, 3); B.add(GEO.box, 0x1e3a2a, M(35, fl + 1.0, z, 0, 0, 0, 8, 2.0, 2.9)); B.add(GEO.box, 0x111111, M(35, fl + 2.05, z, 0, 0, 0, 7.4, 0.2, 2.5)); B.add(GEO.box, gold, M(35, fl + 1.7, z, 0, 0, 0, 8.05, 0.14, 2.95));
    // circus wagons and the caboose
    const wagon = (x0, x1, col) => {
      frame(x0, x1); wheels(x0 + 1.2, x1 - 1.2, 4, 0.42);
      const cx = (x0 + x1) / 2, L2 = x1 - x0;
      B.add(GEO.box, col, M(cx, fl + 1.6, z, 0, 0, 0, L2, 3.2, 2.9)); B.add(GEO.box, 0x3a2a24, M(cx, fl + 3.3, z, 0, 0, 0, L2 + 0.4, 0.2, 3.2));
      for (const y of [0.35, 2.9]) B.add(GEO.box, gold, M(cx, fl + y, z, 0, 0, 0, L2 + 0.04, 0.12, 2.95));
      for (let x = x0 + 1; x < x1 - 0.5; x += 2) B.add(GEO.box, gold, M(x, fl + 1.6, z, 0, 0, 0, 0.12, 2.5, 2.95));
      for (const sd of [-1, 1]) { const sg = signMesh('MAESTRO BROS. CIRCUS', Math.min(9, L2 - 2), 1.1, '#7a1414', '#f6d36a'); sg.position.set(cx, fl + 1.65, z + sd * 1.48); sg.rotation.y = sd > 0 ? 0 : Math.PI; r.g.add(sg); }
      COL.addBox(cx, z, L2 / 2, 1.5, true);
    };
    wagon(17, 29, red); wagon(-13, -1, 0x2e4a8a); wagon(-27, -15, red);
    frame(-39, -30); wheels(-38, -31, 3); B.add(GEO.box, 0x6a3a22, M(-34.5, fl + 1.5, z, 0, 0, 0, 9, 3.0, 2.9)); B.add(GEO.box, 0x6a3a22, M(-34.5, fl + 3.4, z, 0, 0, 0, 3, 1.0, 2.2));
    COL.addBox(-34.5, z, 4.5, 1.5, true); COL.addBox(35, z, 4, 1.5, true); COL.addBox(47.3, z, 7.2, 1.5, true);
    // the flatcar that carries the leopard
    frame(2, 14); wheels(3.2, 12.8, 4, 0.42); B.add(GEO.box, 0x5a4632, M(8, fl, z, 0, 0, 0, 12, 0.24, 3.4));
    for (let x = 2.4; x <= 13.6; x += 1.6) for (const s of [-1, 1]) B.add(GEO.box, 0x4a3a2a, M(x, fl + 0.4, z + s * 1.62, 0, 0, 0, 0.14, 0.7, 0.14));
    COL.addBox(8, z, 6, 1.75, false);
    buildCage(r, cp.x, fl + 0.12, z);
    r.stack = { x: 52.2, y: fl + 4.1, z };
    r.feedPt = { x: cp.x, z }; r.feedR = 5.4; r.leoBase = { x: cp.x, z, y: fl + 0.17 }; r.radius = 0.25;
  } else {
    const y = r.y; r.top = y + 7.6;
    for (const s of [-1, 1]) { B.add(GEO.box, 0x5a4632, M(cp.x + s * 3.4, y + 3.8, cp.z, 0, 0, 0, 0.45, 7.8, 0.45)); B.add(GEO.box, 0x5a4632, M(cp.x + s * 3.4, y + 1.8, cp.z + s * 0, s * 0.0, 0, 0, 0.3, 0.3, 3.4)); B.add(GEO.box, 0x4a3a28, M(cp.x + s * 3.4, y + 2.4, cp.z + 1.2, -0.6, 0, 0, 0.22, 4.2, 0.22)); B.add(GEO.box, 0x4a3a28, M(cp.x + s * 3.4, y + 2.4, cp.z - 1.2, 0.6, 0, 0, 0.22, 4.2, 0.22)); COL.addCircle(cp.x + s * 3.4, cp.z, 0.5); }
    B.add(GEO.box, 0x5a4632, M(cp.x, y + 7.75, cp.z, 0, 0, 0, 7.6, 0.5, 0.5)); B.add(GEO.cyl, 0x6a6a6a, M(cp.x, y + 7.4, cp.z, 0, 0, Math.PI / 2, 0.25, 0.4, 0.25));
    B.add(GEO.box, 0x3a3020, M(cp.x - 3.4 + 0.52, y + 1.6, cp.z, 0, 0, 0, 0.6, 0.4, 0.4));
    r.swing = grp(r.g, cp.x, y + 7.4, cp.z);
    r.rope = mk(GEO.cyl8, mat(0xb8a070, { roughness: 1 }), 0, -1.1, 0, 0.045, 2.2, 0.045, r.swing);
    r.ropeTail = mk(GEO.cyl8, mat(0xb8a070, { roughness: 1 }), -1.4, -0.6, 0, 0.04, 2.2, 0.04, r.swing); r.ropeTail.rotation.z = 0.9;
    const cg = r.cage = grp(r.swing, 0, -2.2 - 2.0, 0); r.bars = [];
    const W = 2.1, H = 1.9, D = 2.7, wood = mat(0x6a5236, { roughness: 0.9 }), bar = mat(0x7a7f82, { metalness: 0.7, roughness: 0.4 });
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) mk(GEO.box, wood, x, H / 2, z, 0.14, H, 0.14, cg);
    mk(GEO.box, wood, 0, 0.05, 0, W + 0.1, 0.12, D + 0.1, cg); mk(GEO.box, wood, 0, H, 0, W + 0.1, 0.14, D + 0.1, cg);
    for (const s of [-1, 1]) for (let z = -D / 2 + 0.2; z < D / 2 - 0.1; z += 0.22) { const b = mk(GEO.cyl8, bar, s * W / 2, H / 2, z, 0.028, H, 0.028, cg); b.userData.side = s; r.bars.push(b); }
    for (const s of [-1, 1]) for (let x = -W / 2 + 0.2; x < W / 2 - 0.1; x += 0.22) { const b = mk(GEO.cyl8, bar, x, H / 2, s * D / 2, 0.028, H, 0.028, cg); b.userData.side = 2 * s; r.bars.push(b); }
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) { const c = mk(GEO.cyl8, mat(0xb8a070, { roughness: 1 }), x / 2, H + 0.5, z / 2, 0.025, 1.3, 0.025, cg); c.rotation.z = x > 0 ? 0.6 : -0.6; c.rotation.x = z > 0 ? -0.6 : 0.6; }
    r.feedPt = { x: cp.x, z: cp.z }; r.feedR = 5.0; r.cageY = y + 7.4 - 4.2; r.leoBase = { x: cp.x, z: cp.z, y: r.cageY + 0.08 }; r.radius = 0.2;
  }
  (r.type === 'train' ? r.g : worldRoot).add(B.mesh(propMat));
  return r;
}
// ----- farmers -----
const FM = {
  skin: [0xd9a67e, 0xb57b55, 0x8a5a3c, 0xeec39a, 0x6e4a32].map(c => mat(c, { roughness: 0.7 })),
  shirt: [0xa33b2e, 0x3e6b8a, 0xd8d0b8, 0x6b7b3a, 0x8a4f6a, 0xc9a33a, 0x5a5a5a, 0xc76a3a].map(c => mat(c, { roughness: 0.9 })),
  over: [0x2f4f7a, 0x3b3b3b, 0x5a4632, 0x41542e, 0x3a4a6a].map(c => mat(c, { roughness: 0.92 })),
  boot: mat(0x3a2a1e, { roughness: 0.8 }), straw: mat(0xd2b46a, { roughness: 0.95 }), band: mat(0x3a2418), hair: [0x2a1e16, 0x6a5a4a, 0xa8a090, 0x4a3020].map(c => mat(c)),
  steel: mat(0xa6acb2, { metalness: 0.85, roughness: 0.3 }), handle: mat(0x7a5634, { roughness: 0.85 }), orange: mat(0xe0641e, { roughness: 0.5 }), cap: [0x2e5a2e, 0x8a2a2a, 0x2a3a6a].map(c => mat(c)), hard: mat(0xf2c41a, { roughness: 0.4 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffd28a }), eye: mat(0x1a1410)
};
function makeTool(kind) {
  const t = new THREE.Group();
  if (kind === 'hatchet') { mk(GEO.cyl8, FM.handle, 0, 0, 0.32, 0.03, 0.75, 0.03, t).rotation.x = Math.PI / 2; mk(GEO.box, FM.steel, 0, 0.09, 0.62, 0.04, 0.22, 0.17, t); mk(GEO.box, FM.steel, 0, 0.2, 0.62, 0.02, 0.06, 0.26, t); }
  else if (kind === 'machete') { mk(GEO.cyl8, FM.handle, 0, 0, 0.06, 0.035, 0.2, 0.035, t).rotation.x = Math.PI / 2; mk(GEO.box, FM.steel, 0, 0.02, 0.48, 0.015, 0.09, 0.7, t); mk(GEO.box, FM.steel, 0, 0.05, 0.82, 0.015, 0.13, 0.08, t); }
  else if (kind === 'pitchfork') { mk(GEO.cyl8, FM.handle, 0, 0, 0.55, 0.028, 1.5, 0.028, t).rotation.x = Math.PI / 2; mk(GEO.box, FM.steel, 0, 0, 1.3, 0.3, 0.03, 0.04, t); for (let i = -1; i <= 1; i++) mk(GEO.cyl8, FM.steel, i * 0.13, 0, 1.48, 0.012, 0.36, 0.012, t).rotation.x = Math.PI / 2; }
  else if (kind === 'shovel') { mk(GEO.cyl8, FM.handle, 0, 0, 0.5, 0.028, 1.2, 0.028, t).rotation.x = Math.PI / 2; mk(GEO.box, FM.steel, 0, 0, 1.25, 0.3, 0.025, 0.36, t); }
  else if (kind === 'chainsaw') { mk(GEO.box, FM.orange, 0, 0, 0.12, 0.24, 0.3, 0.42, t); mk(GEO.box, FM.steel, 0, -0.02, 0.72, 0.04, 0.12, 0.9, t); mk(GEO.box, mat(0x222222), 0, 0.2, 0.05, 0.05, 0.05, 0.3, t); }
  else if (kind === 'baton') { mk(GEO.cyl8, mat(0x161616, { roughness: 0.5 }), 0, 0, 0.3, 0.035, 0.62, 0.035, t).rotation.x = Math.PI / 2; mk(GEO.cyl8, FM.handle, 0, 0, 0.04, 0.04, 0.14, 0.04, t).rotation.x = Math.PI / 2; }
  else if (kind === 'netgun') { mk(GEO.box, mat(0x2a2e34, { metalness: 0.5 }), 0, 0.02, 0.18, 0.1, 0.16, 0.46, t); mk(GEO.cyl8, FM.steel, 0, 0.06, 0.55, 0.09, 0.4, 0.09, t).rotation.x = Math.PI / 2; mk(GEO.sph, mat(0xd8d0b0), 0, 0.06, 0.78, 0.1, 0.1, 0.08, t); }
  else if (kind === 'whip') { mk(GEO.cyl8, mat(0x3a2418), 0, 0, 0.12, 0.03, 0.3, 0.03, t).rotation.x = Math.PI / 2; for (let i = 0; i < 6; i++) { const sg = mk(GEO.cyl8, mat(0x2a1a10), 0, -0.05 - i * i * 0.012, 0.36 + i * 0.22, 0.014, 0.24, 0.014, t); sg.rotation.x = Math.PI / 2 + i * 0.12; } }
  return t;
}
const LOOK = {
  police: { shirt: [0x1d2a48], over: [0x161c2c], hat: ['helmet'] }, sergeant: { shirt: [0x1d2a48], over: [0x161c2c], hat: ['peak'] }, ring: { shirt: [0xb0202a], over: [0xe8e2d2], hat: ['top'] },
  civ: { shirt: [0xb04a3a, 0x3e6b8a, 0xd8c8a0, 0x6a8a4a, 0x8a4f7a, 0xd8a43a, 0x6a6a72, 0xe0a0a8, 0x4a8a8a], over: [0x4a4038, 0x2e3440, 0x5a5248, 0x6a4a3a, 0x3a3a3a], hat: ['none', 'none', 'cap', 'straw', 'bonnet'] }
};
function makeFarmer(tool, opt = {}) {
  const f = { g: new THREE.Group() }; const g = f.g, lk = LOOK[opt.look];
  const skin = pick(FM.skin), shirt = lk ? mat(pick(lk.shirt), { roughness: 0.9 }) : opt.foreman ? mat(0xb8302a) : pick(FM.shirt), over = lk ? mat(pick(lk.over), { roughness: 0.92 }) : opt.foreman ? mat(0x2a2a2a) : pick(FM.over);
  f.hips = grp(g, 0, 0.98, 0);
  f.legs = []; f.knees = [];
  for (const s of [-1, 1]) {
    const p = grp(f.hips, s * 0.12, 0, 0); mk(GEO.cyl, over, 0, -0.24, 0, 0.085, 0.5, 0.085, p);
    const k = grp(p, 0, -0.48, 0); mk(GEO.cyl, over, 0, -0.22, 0, 0.075, 0.46, 0.075, k); mk(GEO.box, FM.boot, 0, -0.46, 0.05, 0.15, 0.12, 0.28, k);
    f.legs.push(p); f.knees.push(k);
  }
  f.torso = grp(f.hips, 0, 0, 0);
  mk(GEO.cyl, over, 0, 0.18, 0, 0.21, 0.4, 0.17, f.torso);
  mk(GEO.cyl, shirt, 0, 0.56, 0, 0.25, 0.42, 0.17, f.torso);
  mk(GEO.box, over, 0, 0.5, 0.15, 0.3, 0.28, 0.04, f.torso);
  for (const s of [-1, 1]) mk(GEO.box, over, s * 0.12, 0.7, 0.0, 0.05, 0.04, 0.36, f.torso);
  mk(GEO.cyl, skin, 0, 0.83, 0, 0.07, 0.1, 0.07, f.torso);
  f.head = grp(f.torso, 0, 0.92, 0);
  mk(GEO.sph, skin, 0, 0.1, 0, 0.15, 0.18, 0.16, f.head);
  mk(GEO.sph, skin, 0, 0.08, 0.155, 0.035, 0.045, 0.04, f.head);
  for (const s of [-1, 1]) { mk(GEO.sph, FM.eye, s * 0.055, 0.14, 0.135, 0.018, 0.018, 0.012, f.head); mk(GEO.sph, skin, s * 0.15, 0.1, 0, 0.03, 0.05, 0.03, f.head); }
  if (Math.random() < 0.55) mk(GEO.sph, pick(FM.hair), 0, 0.0, 0.07, 0.13, 0.08, 0.11, f.head);
  f.hat = grp(f.head, 0, 0.25, 0);
  const hk = lk ? pick(lk.hat) : opt.foreman ? 'hard' : pick(['straw', 'straw', 'straw', 'cap']), navy = mat(0x141c30, { roughness: 0.7 });
  if (hk === 'helmet') { mk(GEO.sph, navy, 0, 0.0, 0, 0.17, 0.27, 0.18, f.hat); mk(GEO.cyl, navy, 0, -0.07, 0, 0.2, 0.025, 0.21, f.hat); mk(GEO.box, FM.steel, 0, 0.02, 0.17, 0.06, 0.07, 0.02, f.hat); mk(GEO.sph, FM.steel, 0, 0.27, 0, 0.03, 0.03, 0.03, f.hat); }
  else if (hk === 'peak') { mk(GEO.cyl, navy, 0, -0.02, 0, 0.18, 0.1, 0.18, f.hat); mk(GEO.cyl, mat(0xe8e8e8), 0, -0.04, 0, 0.181, 0.03, 0.181, f.hat); mk(GEO.box, mat(0x111111, { roughness: 0.3 }), 0, -0.07, 0.17, 0.2, 0.02, 0.12, f.hat); }
  else if (hk === 'top') { mk(GEO.cyl, mat(0x141414), 0, 0.12, 0, 0.15, 0.34, 0.15, f.hat); mk(GEO.cyl, mat(0x141414), 0, -0.04, 0, 0.27, 0.02, 0.27, f.hat); mk(GEO.cyl, mat(0xb0202a), 0, 0.0, 0, 0.152, 0.05, 0.152, f.hat); }
  else if (hk === 'bonnet') { mk(GEO.sph, mat(pick([0xe8e0d0, 0xc8a0b0, 0x9ab0c8])), 0, -0.06, -0.02, 0.18, 0.16, 0.19, f.hat); }
  else if (hk === 'none') { }
  else if (hk === 'straw') { mk(GEO.cyl, FM.straw, 0, 0, 0, 0.34, 0.025, 0.34, f.hat); mk(GEO.cyl, FM.straw, 0, 0.08, 0, 0.16, 0.16, 0.16, f.hat); mk(GEO.cyl, FM.band, 0, 0.03, 0, 0.165, 0.04, 0.165, f.hat); }
  else if (hk === 'cap') { const c = pick(FM.cap); mk(GEO.sph, c, 0, -0.02, 0, 0.16, 0.1, 0.17, f.hat); mk(GEO.box, c, 0, -0.04, 0.17, 0.2, 0.02, 0.16, f.hat); }
  else { mk(GEO.sph, FM.hard, 0, -0.02, 0, 0.18, 0.12, 0.19, f.hat); mk(GEO.cyl, FM.hard, 0, -0.06, 0, 0.21, 0.02, 0.22, f.hat); }
  f.arms = []; f.elbows = [];
  for (const s of [-1, 1]) {
    const p = grp(f.torso, s * 0.3, 0.74, 0); mk(GEO.sph, shirt, 0, 0, 0, 0.09, 0.09, 0.09, p); mk(GEO.cyl, shirt, 0, -0.16, 0, 0.065, 0.34, 0.065, p);
    const e = grp(p, 0, -0.32, 0); mk(GEO.cyl, skin, 0, -0.14, 0, 0.055, 0.3, 0.055, e); mk(GEO.sph, skin, 0, -0.31, 0.01, 0.06, 0.07, 0.06, e);
    p.rotation.z = s * 0.12; f.arms.push(p); f.elbows.push(e);
  }
  f.tool = makeTool(tool); f.tool.position.set(0, -0.31, 0.02); f.elbows[1].add(f.tool);
  if (opt.lantern) {
    const ln = grp(f.elbows[0], 0, -0.4, 0.05); mk(GEO.box, mat(0x2a2a2a), 0, 0.12, 0, 0.14, 0.03, 0.14, ln); mk(GEO.box, mat(0x2a2a2a), 0, -0.12, 0, 0.16, 0.03, 0.16, ln);
    mk(GEO.sph, FM.glow, 0, 0, 0, 0.07, 0.09, 0.07, ln, false); mk(GEO.cyl8, mat(0xffe8b0, { transparent: true, opacity: 0.35 }), 0, 0, 0, 0.08, 0.22, 0.08, ln, false); f.lantern = ln;
  }
  if (opt.foreman) g.scale.setScalar(1.18);
  g.traverse(m => { if (m.isMesh && m.castShadow !== false) { m.castShadow = true; } });
  worldRoot.add(g);
  return f;
}
// ----- dogs -----
function makeDog() {
  const d = { g: new THREE.Group() }; const c = pick([[0x6a4a2a, 0x2a1e14], [0x2a2420, 0xb08a5a], [0x8a6a42, 0xe8d8b8], [0x3a3a3e, 0xd0c8b8]]);
  const A = mat(c[0], { roughness: 0.9 }), Bm = mat(c[1], { roughness: 0.9 }); const g = d.g;
  d.body = grp(g);
  mk(GEO.sph, A, 0, 0.58, 0, 0.22, 0.24, 0.52, d.body); mk(GEO.sph, Bm, 0, 0.5, 0.15, 0.17, 0.17, 0.32, d.body); mk(GEO.sph, A, 0, 0.62, 0.38, 0.21, 0.24, 0.24, d.body);
  d.head = grp(d.body, 0, 0.82, 0.55); mk(GEO.sph, A, 0, 0, 0, 0.13, 0.13, 0.15, d.head); mk(GEO.sph, Bm, 0, -0.04, 0.15, 0.075, 0.07, 0.13, d.head); mk(GEO.sph, mat(0x111111), 0, -0.01, 0.27, 0.035, 0.03, 0.025, d.head);
  d.jaw = grp(d.head, 0, -0.07, 0.06); mk(GEO.sph, Bm, 0, -0.02, 0.1, 0.06, 0.03, 0.1, d.jaw);
  for (const s of [-1, 1]) { const e = mk(GEO.sph, A, s * 0.1, 0.06, -0.02, 0.05, 0.1, 0.03, d.head); e.rotation.z = s * 0.5; mk(GEO.sph, FM.eye, s * 0.055, 0.04, 0.12, 0.018, 0.018, 0.012, d.head); }
  d.legs = [];
  for (const [x, z] of [[-0.11, 0.36], [0.11, 0.36], [-0.12, -0.36], [0.12, -0.36]]) { const p = grp(d.body, x, 0.52, z); mk(GEO.cyl8, A, 0, -0.24, 0, 0.045, 0.5, 0.045, p); mk(GEO.sph, Bm, 0, -0.49, 0.03, 0.05, 0.03, 0.06, p); d.legs.push(p); }
  d.tail = grp(d.body, 0, 0.7, -0.5); mk(GEO.cyl8, A, 0, 0.15, 0, 0.03, 0.32, 0.03, d.tail); d.tail.rotation.x = -0.7;
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  worldRoot.add(g); return d;
}
