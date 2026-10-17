// ================= GAME: state, player, AI, objectives, killcam, cutscenes =================
const G = {
  state: 'menu', li: 0, diff: 'regular', rt: 0, t: 0, score: 0, strength: 0, phase: 'gather', killcam: null, cine: null,
  settings: { sens: 1, vol: 0.8, fov: 78, killcam: true }, stats: null, waveIdx: 0, spawnT: 0, bunchT: 0, lightT: 10, flash: 0, shake: 0,
  noLock: false, locked: false, hints: {}, progress: {}, hitT: 0, hitKill: false, dmgArcs: [], fade: 1, ambT: 2
};
const P = { x: 0, z: 0, y: 2, yaw: 0, pitch: 0, vx: 0, vz: 0, alive: false };
let farmers = [], dogs = [], bunches = [], pickups = [], hats = [], leo = null, rig = null, exfil = { x: 0, z: 0 }, ROUTES = [];
const keys = {}; let mouseDown = false;
// ---------- key bindings: [rebindable primary, fixed alternate] ----------
const ACTIONS = [
  ['forward', 'Move forward', 'KeyW', 'ArrowUp'], ['back', 'Move back', 'KeyS', 'ArrowDown'], ['left', 'Strafe left', 'KeyA', 'ArrowLeft'], ['right', 'Strafe right', 'KeyD', 'ArrowRight'],
  ['burst', 'Burst sprint (hold)', 'ShiftLeft', 'ShiftRight'], ['sneak', 'Sneak toggle', 'KeyC', 'KeyX'], ['bite', 'Bite', 'Mouse0', 'Space'],
  ['bellow', 'Bellow lure', 'KeyQ', 'Mouse2'], ['feed', 'Feed leopard (hold)', 'KeyE', 'KeyF'], ['mute', 'Mute sound', 'KeyM', null]
];
const BIND = {};
function resetBinds() { for (const [a, , k, alt] of ACTIONS) BIND[a] = [k, alt]; }
resetBinds();
const act = a => { const b = BIND[a]; return !!(keys[b[0]] || (b[1] && keys[b[1]])); };
const isAct = (a, code) => BIND[a][0] === code || BIND[a][1] === code;
function keyName(code) {
  if (!code) return '';
  const M = { Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', Mouse3: 'MB4', Mouse4: 'MB5', Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'R-Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'Tab', CapsLock: 'Caps', Enter: 'Enter', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' };
  if (M[code]) return M[code]; if (code.startsWith('Key')) return code.slice(3); if (code.startsWith('Digit')) return code.slice(5); if (code.startsWith('Numpad')) return 'Num' + code.slice(6); return code;
}
const kn = a => keyName(BIND[a][0]);
try { const s = JSON.parse(localStorage.getItem('hh-progress') || '{}'); G.progress = s.progress || {}; Object.assign(G.settings, s.settings || {}); if (G.settings.binds) { for (const a in G.settings.binds) if (BIND[a]) { const v = G.settings.binds[a], p = Array.isArray(v) ? v[0] : v; if (typeof p === 'string' && p) BIND[a][0] = p; if (Array.isArray(v) && (v[1] === null || typeof v[1] === 'string')) BIND[a][1] = v[1]; }
    const seen = new Set(); for (const [a, , k] of ACTIONS) { if (seen.has(BIND[a][0])) BIND[a][0] = k; seen.add(BIND[a][0]); } } } catch (e) { }
function saveProgress() { G.settings.binds = {}; for (const a in BIND) G.settings.binds[a] = BIND[a].slice(); try { localStorage.setItem('hh-progress', JSON.stringify({ progress: G.progress, settings: G.settings })); } catch (e) { } }

// ---------- routes ----------
function ringRoute(cx, cz, r, n) { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }); } return pts; }
function cleanRoute(pts) {
  const out = [];
  for (const p of pts) { const q = { x: clamp(p.x, -WORLD + 4, WORLD - 4), z: clamp(p.z, -WORLD + 4, WORLD - 4) }; if (waterDist(q.x, q.z) < 16) continue; COL.resolve(q, 1.2); out.push(q); }
  return out.length >= 3 ? out : null;
}
function buildRoutes() {
  const R = [];
  for (const f of L.fields) { const m = 3.4; R.push([{ x: f.x0 - m, z: f.z0 - m }, { x: (f.x0 + f.x1) / 2, z: f.z0 - m }, { x: f.x1 + m, z: f.z0 - m }, { x: f.x1 + m, z: (f.z0 + f.z1) / 2 }, { x: f.x1 + m, z: f.z1 + m }, { x: (f.x0 + f.x1) / 2, z: f.z1 + m }, { x: f.x0 - m, z: f.z1 + m }, { x: f.x0 - m, z: (f.z0 + f.z1) / 2 }]); }
  const cp = L.captive; R.push(ringRoute(cp.x, cp.z, 13, 10)); R.push(ringRoute(cp.x, cp.z, 20, 12).reverse());
  for (const p of L.props) if (PROP_PADS[p.t] && ['farmhouse', 'barn', 'packing', 'sawmill'].includes(p.t)) R.push(ringRoute(p.x, p.z, Math.max(...PROP_PADS[p.t]) + 5, 8));
  return R.map(cleanRoute).filter(Boolean);
}
function nearestWp(a) { let bi = 0, bd = 1e9; a.route.forEach((p, i) => { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < bd) { bd = d; bi = i; } }); return bi; }
// route through the pen gate when the agent and its target are on opposite sides of the level-1 fence
function viaGate(a, tx, tz) {
  if (!rig || rig.type !== 'chain') return [tx, tz];
  const cx = rig.x, cz = rig.z, R = 9, gx = cx - R, gz = cz;
  const inA = Math.hypot(a.x - cx, a.z - cz) < R, inT = Math.hypot(tx - cx, tz - cz) < R;
  if (inA && inT) return [tx, tz];
  const nearGate = Math.hypot(a.x - gx, a.z - gz) < 2.4;
  if (inA) return nearGate ? [gx - 3.5, gz] : [gx + 1.8, gz];
  // outside: does the straight path cross the fence?
  const sx = tx - a.x, sz = tz - a.z, L2 = sx * sx + sz * sz || 1, u = clamp(((cx - a.x) * sx + (cz - a.z) * sz) / L2, 0, 1);
  const cross = inT || Math.hypot(a.x + sx * u - cx, a.z + sz * u - cz) < R + 0.6;
  if (!cross) return [tx, tz];
  if (inT && nearGate) return [gx + 3, gz];
  const ta = Math.atan2(a.z - cz, a.x - cx), goal = inT ? Math.PI : Math.atan2(tz - cz, tx - cx), dg = angDiff(ta, goal);
  if (inT && Math.abs(dg) < 0.3) return [gx - 1, gz];
  const tn = ta + Math.sign(dg || 1) * Math.min(Math.abs(dg), 0.6);
  return [cx + Math.cos(tn) * 12.5, cz + Math.sin(tn) * 12.5];
}
function stepAgent(a, tx, tz, spd, dt, r, turn, waterMul = 0.45) {
  [tx, tz] = viaGate(a, tx, tz);
  const dx = tx - a.x, dz = tz - a.z; if (dx * dx + dz * dz < 0.01) return 0;
  let want = Math.atan2(dx, dz); if (a.side) want += a.side * 1.2;
  a.yaw += clamp(angDiff(a.yaw, want), -turn * dt, turn * dt);
  let v = spd; if (groundH(a.x, a.z) < -0.2) v *= waterMul;
  const nx = a.x + Math.sin(a.yaw) * v * dt, nz = a.z + Math.cos(a.yaw) * v * dt;
  if (groundH(nx, nz) < -1.2 && groundH(nx, nz) < groundH(a.x, a.z)) return -1;
  const ox = a.x, oz = a.z; a.x = nx; a.z = nz; COL.resolve(a, r);
  return Math.hypot(a.x - ox, a.z - oz) / Math.max(dt, 1e-4);
}

// ---------- farmers ----------
class Farmer {
  constructor(x, z, route, opt = {}) {
    this.tool = opt.tool || pick(L.enemies.tools); this.T = TOOLS[this.tool]; this.foreman = !!opt.foreman;
    this.m = makeFarmer(this.tool, { lantern: L.enemies.lanterns, foreman: this.foreman });
    this.name = opt.name || pick(FARMER_NAMES); this.x = x; this.z = z; this.yaw = rand(0, TAU); this.route = route; this.wp = 0; this.wp = nearestWp(this);
    this.state = 'patrol'; this.aware = 0; this.hp = this.foreman ? 220 : 100; this.atk = 0; this.atkEl = 0; this.cool = 0; this.hitDone = false;
    this.lk = { x, z }; this.lost = 0; this.walk = rand(0, 10); this.spd = 0; this.stun = 0; this.kx = 0; this.kz = 0; this.side = 0; this.sideT = 0;
    this.prog = { x, z, t: 0 }; this.shoutT = 0; this.r = this.foreman ? 0.55 : 0.42; this.deadT = 0; this.removed = false; this.seen = false; this.atBank = false; this.revving = false;
    if (opt.alert) { this.aware = 0.8; this.state = 'investigate'; this.invT = 12; this.target = { x: P.x, z: P.z }; }
    this.anim(0, 0, 'walk');
  }
  get active() { return this.state !== 'dead' && this.state !== 'eaten' && !this.removed; }
  hear(x, z, level) {
    if (!this.active || this.state === 'chase') return;
    this.aware = Math.max(this.aware, level); this.state = 'investigate'; this.invT = 12; this.target = { x: x + rand(-3, 3), z: z + rand(-3, 3) };
  }
  toChase(shout) {
    if (this.state !== 'chase') {
      G.stats.spotted++;
      if (shout) {
        SFX.shout(this, this.foreman ? 0.7 : 1); if (G.state === 'playing') SFX.alert();
        if (!G.hints.spotted) { G.hints.spotted = 1; hint('You have been spotted. Run for the water. Your bite is lethal there.', 6); }
        killfeedRaw(`<span class="en">${this.name}</span><span class="w">SPOTTED YOU</span>`);
        for (const o of farmers) if (o !== this && Math.hypot(o.x - this.x, o.z - this.z) < 34) o.hear(P.x, P.z, 0.85);
      }
    }
    this.state = 'chase'; this.aware = 1.25; this.lost = 0; this.lk = { x: P.x, z: P.z };
  }
  die(how, by) {
    if (!this.active) return;
    this.state = 'dead'; this.deadT = 0; this.fallDir = rand(-0.4, 0.4);
    if (by === 'leopard') { killfeedRaw(`<span class="ally">LEOPARD</span><span class="w">POUNCE</span><span class="en">${this.name}</span>`); G.score += 75; xp('+75', 'ASSIST'); }
    else { killfeedRaw(`<span class="you">HIPPO</span><span class="w">${how}</span><span class="en">${this.name}</span>`); G.score += 100; xp('+100', 'KNOCKED OUT'); G.stats.ko++; }
    dust(this.x, groundH(this.x, this.z) + 0.2, this.z, 12);
  }
  remove() { this.removed = true; worldRoot.remove(this.m.g); }
  update(dt) {
    if (this.removed) return;
    if (this.state === 'eaten') { if (this.quick) this.quickEat(dt); return; }
    if (this.state === 'dead') {
      this.deadT += dt; const k = smooth(this.deadT / 0.55), m = this.m;
      m.g.rotation.set(-k * 1.45, this.yaw + this.fallDir, 0, 'YXZ'); m.g.position.y = groundH(this.x, this.z) + k * 0.15 - (this.deadT > 10 ? (this.deadT - 10) * 0.3 : 0);
      m.arms.forEach((a, i) => a.rotation.z = (i ? 1 : -1) * 1.2 * k);
      if (this.deadT > 13) this.remove(); return;
    }
    const D = DIFF[G.diff], dx = P.x - this.x, dz = P.z - this.z, d = Math.hypot(dx, dz);
    let seen = false; let range = 30;
    if (P.alive && G.state === 'playing' && !G.killcam && !G.cine) {
      range = 30 * (P.sneak ? 0.55 : 1) * (P.camo > 0 ? 0.38 : 1);
      if (inField(P.x, P.z)) range *= 0.72; if (P.deep) range *= P.sneak ? 0.38 : 0.7;
      if (L.sky.night) range *= (this.m.lantern && d < 12) ? 1 : 0.62;
      if (this.state === 'chase') range = Math.max(range, 44);
      const ang = Math.abs(angDiff(this.yaw, Math.atan2(dx, dz))), fov = this.state === 'chase' ? Math.PI : 1.15;
      if (d < range && (ang < fov || d < 3.5) && COL.los(this.x, this.z, P.x, P.z)) seen = true;
      if (!seen && !P.inWater && d < (P.sprinting ? 13 : 4.5) && this.state !== 'chase') this.aware += dt * 0.55 * D.detect;
    }
    this.seen = seen;
    if (seen) { const rate = (0.35 + 2.4 * Math.pow(Math.max(0, 1 - d / range), 1.4)) * D.detect * (P.sprinting ? 1.4 : 1) * (P.sneak ? 0.7 : 1); this.aware = Math.min(1.25, this.aware + rate * dt); this.lk.x = P.x; this.lk.z = P.z; this.lost = 0; }
    else if (this.state !== 'chase') this.aware = Math.max(0, this.aware - dt * 0.12);
    if (this.stun > 0) {
      this.stun -= dt; this.x += this.kx * dt; this.z += this.kz * dt; this.kx *= Math.max(0, 1 - 5 * dt); this.kz *= Math.max(0, 1 - 5 * dt); COL.resolve(this, this.r);
      this.anim(dt, 0, 'stun'); if (this.stun <= 0) this.toChase(false); return;
    }
    if (this.state !== 'chase' && this.aware >= 1) this.toChase(true);
    else if ((this.state === 'patrol' || this.state === 'search') && this.aware > 0.45 && seen) { this.state = 'investigate'; this.invT = 12; this.target = { x: P.x, z: P.z }; }
    let tx = this.x, tz = this.z, spd = 0, pose = 'walk';
    if (this.state === 'patrol') { const w = this.route[this.wp]; tx = w.x; tz = w.z; spd = 1.7; if (Math.hypot(tx - this.x, tz - this.z) < 1.8) this.wp = (this.wp + 1) % this.route.length; }
    else if (this.state === 'investigate') { tx = this.target.x; tz = this.target.z; spd = 3.6; pose = 'alert'; this.invT = (this.invT === undefined ? 12 : this.invT) - dt; if (Math.hypot(tx - this.x, tz - this.z) < 2.4 || this.atBank || this.invT <= 0) { this.state = 'search'; this.searchT = 9; this.sub = null; } }
    else if (this.state === 'search') {
      this.searchT -= dt; this.subT = (this.subT || 0) - dt;
      if (!this.sub || this.subT < 0 || Math.hypot(this.sub.x - this.x, this.sub.z - this.z) < 1.5) { this.sub = { x: this.target.x + rand(-10, 10), z: this.target.z + rand(-10, 10) }; this.subT = 4; }
      tx = this.sub.x; tz = this.sub.z; spd = 2.3; pose = 'alert';
      if (this.searchT <= 0) { this.state = 'patrol'; this.wp = nearestWp(this); }
    } else if (this.state === 'chase') {
      if (!seen) { this.lost += dt; if (this.lost > 6) { this.state = 'search'; this.searchT = 10; this.target = { x: this.lk.x, z: this.lk.z }; this.aware = 0.6; } }
      tx = seen ? P.x : this.lk.x; tz = seen ? P.z : this.lk.z; spd = 6.8 * this.T.speed * (0.9 + 0.1 * D.detect); pose = 'chase';
      if (d < this.T.reach * 0.75 && seen) spd = 0;
      if (!P.alive) spd = 0;
    }
    if (this.state === 'chase' && P.alive && !P.invuln && d < this.T.reach && this.cool <= 0 && this.atk <= 0 && G.state === 'playing' && !G.killcam && !G.cine) {
      this.atk = this.T.wind + 0.3; this.atkEl = 0; this.hitDone = false; if (this.tool !== 'chainsaw') SFX.swing(this);
    }
    if (this.atk > 0) {
      this.atk -= dt; this.atkEl += dt; spd *= 0.5; pose = 'attack';
      if (!this.hitDone && this.atkEl >= this.T.wind) {
        this.hitDone = true; const dd = Math.hypot(P.x - this.x, P.z - this.z), fa = Math.abs(angDiff(this.yaw, Math.atan2(P.x - this.x, P.z - this.z)));
        if (dd < this.T.reach + 0.6 && fa < 1.25 && G.state === 'playing' && !G.killcam && !G.cine) damagePlayer(this.T.dmg * D.dmg, this, this.T.knock || 0);
      }
      if (this.atk <= 0) this.cool = this.T.cool * rand(0.85, 1.25);
    }
    if (this.cool > 0) this.cool -= dt;
    this.shoutT -= dt;
    if (spd > 0) {
      const r = stepAgent(this, tx, tz, spd, dt, this.r, this.state === 'chase' ? 7 : 3.5);
      if (r < 0) { this.spd = 0; this.atBank = true; this.yaw += clamp(angDiff(this.yaw, Math.atan2(dx, dz)), -5 * dt, 5 * dt); if (this.shoutT <= 0 && this.state === 'chase') { SFX.shout(this, this.foreman ? 0.7 : 1.1); this.shoutT = rand(2.5, 4.5); } pose = this.state === 'chase' ? 'taunt' : pose; }
      else {
        this.atBank = false; this.spd = r;
        this.prog.t += dt; if (this.prog.t > 1.1) { if (Math.hypot(this.x - this.prog.x, this.z - this.prog.z) < 0.7 && this.state !== 'patrol') { this.side = Math.random() < 0.5 ? -1 : 1; this.sideT = 1.3; } else if (this.state === 'patrol' && Math.hypot(this.x - this.prog.x, this.z - this.prog.z) < 0.4) this.wp = (this.wp + 1) % this.route.length; this.prog = { x: this.x, z: this.z, t: 0 }; }
      }
    } else { this.spd = 0; if (this.state === 'chase' && P.alive) this.yaw += clamp(angDiff(this.yaw, Math.atan2(dx, dz)), -7 * dt, 7 * dt); }
    if (this.sideT > 0) { this.sideT -= dt; if (this.sideT <= 0) this.side = 0; }
    this.revving = this.tool === 'chainsaw' && this.state === 'chase' && d < 8;
    this.anim(dt, this.spd, pose);
  }
  anim(dt, spd, pose, noRoot) {
    const m = this.m; this.walk += dt * (spd > 3 ? spd * 1.9 : spd * 2.7);
    const ph = this.walk, a = spd > 0.1 ? Math.min(1.05, 0.35 + spd / 7) : 0;
    const run = spd > 3.2 ? 1 : 0, t = G.rt;
    if (!noRoot) { m.g.position.set(this.x, groundH(this.x, this.z) + (run ? Math.abs(Math.sin(ph)) * 0.07 : 0), this.z); m.g.rotation.set(0, this.yaw, 0); }
    m.legs[0].rotation.x = Math.sin(ph) * a; m.legs[1].rotation.x = -Math.sin(ph) * a;
    m.knees[0].rotation.x = Math.max(0, Math.sin(ph - 1.4)) * a * 1.4; m.knees[1].rotation.x = Math.max(0, -Math.sin(ph - 1.4)) * a * 1.4;
    m.torso.rotation.set(run ? 0.2 : 0.03, 0, Math.sin(ph) * 0.04 * a);
    const [aL, aR] = m.arms, [eL, eR] = m.elbows;
    aL.rotation.set(-Math.sin(ph) * a * 0.8, 0, -0.12); eL.rotation.x = -0.25 - run * 0.9;
    if (m.lantern) { aL.rotation.x = -0.5 + Math.sin(ph) * 0.15; eL.rotation.x = -0.8; }
    aR.rotation.set(Math.sin(ph) * a * 0.6, 0, 0.12); eR.rotation.x = -0.2;
    if (pose === 'chase') { aR.rotation.x = -1.7 + Math.sin(ph) * 0.15; eR.rotation.x = -0.7; }
    else if (pose === 'alert') { aR.rotation.x = -0.9; eR.rotation.x = -0.9; }
    else if (pose === 'taunt') { aR.rotation.x = -2.6 + Math.sin(t * 9) * 0.35; eR.rotation.x = -0.4; aL.rotation.x = -1.2 + Math.sin(t * 7) * 0.3; }
    else if (pose === 'attack') {
      const w = this.T.wind, e = this.atkEl;
      if (e < w) { const k = smooth(e / w); aR.rotation.x = lerp(-1.6, -2.95, k); eR.rotation.x = lerp(-0.7, -0.5, k); m.torso.rotation.x = lerp(0.2, -0.15, k); }
      else { const k = smooth((e - w) / 0.12); aR.rotation.x = lerp(-2.95, -0.35, k); eR.rotation.x = lerp(-0.5, -0.05, k); m.torso.rotation.x = lerp(-0.15, 0.35, k); }
      if (this.tool === 'chainsaw') { aR.rotation.x = -1.2 + Math.sin(t * 40) * 0.05; aL.rotation.x = -1.1; eL.rotation.x = -0.6; }
    } else if (pose === 'stun') { m.torso.rotation.x = -0.35 + Math.sin(t * 14) * 0.08; aL.rotation.set(-0.6, 0, -1.0); aR.rotation.set(-0.6, 0, 1.0); }
    else if (pose === 'cower') { aL.rotation.set(-2.7, 0, -0.4); aR.rotation.set(-2.7, 0, 0.4); eL.rotation.x = -0.8; eR.rotation.x = -0.8; m.torso.rotation.x = -0.25; }
    else if (pose === 'cheer') { aL.rotation.set(-2.9 + Math.sin(t * 8) * 0.2, 0, -0.3); aR.rotation.set(-2.9 + Math.sin(t * 8 + 1) * 0.2, 0, 0.3); }
    if (this.tool === 'chainsaw' && pose !== 'attack') { aL.rotation.x = aR.rotation.x; eL.rotation.x = eR.rotation.x; }
    if (this.aware > 0.2 || pose === 'chase') m.head.rotation.y = clamp(angDiff(this.yaw, Math.atan2(P.x - this.x, P.z - this.z)), -0.9, 0.9) * 0.7; else m.head.rotation.y = Math.sin(t * 0.4 + this.walk * 0.1) * 0.4;
  }
  quickEat(dt) {
    this.eatT += dt; const k = clamp(this.eatT / 0.55, 0, 1), m = this.m;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    m.g.position.x = lerp(this.x, P.x + fx * 1.2, k); m.g.position.z = lerp(this.z, P.z + fz * 1.2, k); m.g.position.y = lerp(groundH(this.x, this.z), P.y - 1.4, k);
    m.g.scale.setScalar((this.foreman ? 1.18 : 1) * (1 - k * 0.92)); m.g.rotation.x = k * 1.2;
    if (k >= 1) { this.remove(); }
  }
}

// ---------- dogs ----------
class Dog {
  constructor(x, z, route) {
    this.m = makeDog(); this.name = pick(DOG_NAMES); this.x = x; this.z = z; this.yaw = rand(0, TAU); this.route = route; this.wp = 0; this.wp = nearestWp(this);
    this.state = 'roam'; this.aware = 0; this.walk = 0; this.spd = 0; this.cool = 0; this.barkT = 0; this.fleeT = 0; this.bites = 0; this.r = 0.35; this.removed = false; this.side = 0; this.sideT = 0;
  }
  get active() { return !this.removed && this.state !== 'gone'; }
  bitten(by) {
    this.bites++; SFX.yelp(this); this.state = 'flee'; this.fleeT = 9; this.aware = 0;
    if (by === 'leopard') killfeedRaw(`<span class="ally">LEOPARD</span><span class="w">SCARED OFF</span><span class="en">${this.name}</span>`);
    else { G.score += 50; xp('+50', 'DOG SCARED OFF'); killfeedRaw(`<span class="you">HIPPO</span><span class="w">SCARED OFF</span><span class="en">${this.name}</span>`); G.stats.dogs++; }
    if (this.bites >= 2) this.state = 'gone';
    dust(this.x, groundH(this.x, this.z), this.z, 8);
  }
  update(dt) {
    if (this.removed) return;
    const dx = P.x - this.x, dz = P.z - this.z, d = Math.hypot(dx, dz), D = DIFF[G.diff];
    let tx = this.x, tz = this.z, spd = 0;
    if (this.state === 'gone') { tx = this.x * 3; tz = this.z * 3; spd = 9.5; if (Math.max(Math.abs(this.x), Math.abs(this.z)) > WORLD - 3) { this.removed = true; worldRoot.remove(this.m.g); return; } }
    else if (this.state === 'flee') { this.fleeT -= dt; tx = this.x - dx; tz = this.z - dz; spd = 9; if (this.fleeT <= 0) { this.state = 'roam'; this.wp = nearestWp(this); } }
    else {
      if (P.alive && G.state === 'playing' && !G.cine && !G.killcam) {
        let range = 20 * (P.camo > 0 ? 0.45 : 1) * (P.sneak ? 0.75 : 1); if (P.deep) range *= 0.3;
        if (d < range) this.aware = Math.min(1.2, this.aware + dt * (0.6 + 2 * (1 - d / range)) * D.detect); else this.aware = Math.max(0, this.aware - dt * 0.2);
      }
      if (this.state === 'roam' && this.aware >= 1) { this.state = 'chase'; this.bark(); G.stats.spotted++; }
      if (this.state === 'chase') {
        if (!P.alive || d > 45 || P.deep && d > 10) { this.state = 'roam'; this.aware = 0.3; }
        tx = P.x; tz = P.z; spd = d < 1.5 ? 0 : 8.2;
        this.barkT -= dt; if (this.barkT <= 0) this.bark();
        if (d < 1.7 && this.cool <= 0 && !P.invuln && G.state === 'playing' && !G.killcam && !G.cine) { this.cool = 0.9; damagePlayer(7 * D.dmg, this, 0); this.m.jaw.rotation.x = 0.6; }
      } else { const w = this.route[this.wp]; tx = w.x; tz = w.z; spd = 2.4; if (Math.hypot(tx - this.x, tz - this.z) < 1.8) this.wp = (this.wp + 1) % this.route.length; }
    }
    this.cool -= dt; this.m.jaw.rotation.x *= 0.9;
    if (spd > 0) { const r = stepAgent(this, tx, tz, spd, dt, this.r, 8, 0.4); this.spd = r < 0 ? 0 : r; if (r < 0 && this.state === 'chase') { this.barkT -= dt; } }
    else { this.spd = 0; this.yaw += clamp(angDiff(this.yaw, Math.atan2(dx, dz)), -8 * dt, 8 * dt); }
    if (this.sideT > 0) { this.sideT -= dt; if (this.sideT <= 0) this.side = 0; }
    const m = this.m; this.walk += dt * this.spd * 2.2; const a = Math.min(1, this.spd / 6) * 0.9;
    m.g.position.set(this.x, groundH(this.x, this.z) + Math.abs(Math.sin(this.walk)) * 0.06 * a, this.z); m.g.rotation.y = this.yaw;
    m.legs.forEach((p, i) => p.rotation.x = Math.sin(this.walk + (i < 2 ? 0 : Math.PI * 0.6) + (i % 2) * 0.4) * a);
    m.tail.rotation.z = Math.sin(G.rt * (this.state === 'chase' ? 18 : 6)) * 0.5; m.body.rotation.x = Math.sin(this.walk * 2) * 0.04 * a;
  }
  bark() { SFX.bark(this); this.barkT = rand(1.2, 2); this.m.jaw.rotation.x = 0.5; for (const f of farmers) if (Math.hypot(f.x - this.x, f.z - this.z) < 40) f.hear(P.x, P.z, 0.9); }
}

// ---------- leopard ----------
function initLeopard() {
  const m = makeLeopard(); const lb = rig.leoBase;
  const s = { m, x: lb.x, z: lb.z, y: lb.y, yaw: Math.PI / 2, state: 'captive', chew: 0, roar: 0, cool: 1, phase: 0, speed: 0, paceA: Math.PI, pounce: null, jump: null };
  if (rig.type !== 'chain') { rig.cage.add(m.g); m.g.position.set(0, 0.06, 0); m.g.rotation.y = 0; m.g.scale.setScalar(0.88); }
  else { m.g.position.set(s.x, groundH(s.x, s.z), s.z); m.g.rotation.y = -Math.PI / 2; }
  return s;
}
const _wp = new THREE.Vector3(), _wq = new THREE.Vector3();
function updateLeopard(dt) {
  const s = leo, m = s.m, str = G.strength / 100, t = G.rt;
  s.chew = Math.max(0, s.chew - dt); s.roar = Math.max(0, s.roar - dt * 0.8);
  if (s.state === 'captive' || s.state === 'breaking') {
    const lie = clamp(1 - (str - 0.12) / 0.3, 0, 1) * (rig.type === 'chain' ? 1 : 0.8);
    const near = Math.hypot(P.x - s.x, P.z - s.z) < 18;
    let speed = 0;
    if (rig.type === 'chain') {
      if (str > 0.45 && s.state === 'captive' && s.chew <= 0) { s.paceA += dt * (0.25 + str * 0.35) * (s.paceDir || 1); if (Math.random() < 0.002) s.paceDir = -(s.paceDir || 1); speed = 0.45; }
      const R = 2.25; const tx = rig.stake.x + Math.cos(s.paceA) * R, tz = rig.stake.z + Math.sin(s.paceA) * R;
      s.x = lerp(s.x, tx, 1 - Math.exp(-3 * dt)); s.z = lerp(s.z, tz, 1 - Math.exp(-3 * dt));
      const wantYaw = speed > 0 ? Math.atan2(-Math.sin(s.paceA) * (s.paceDir || 1), Math.cos(s.paceA) * (s.paceDir || 1)) : Math.atan2(s.x - rig.stake.x, s.z - rig.stake.z);
      s.yaw += clamp(angDiff(s.yaw, near && speed === 0 ? Math.atan2(P.x - s.x, P.z - s.z) : wantYaw), -2 * dt, 2 * dt);
      m.g.position.set(s.x, groundH(s.x, s.z), s.z); m.g.rotation.y = s.yaw;
      // chain
      m.ring.getWorldPosition(_wp); const sx = rig.stake.x, sy = rig.stake.y + 0.82, sz = rig.stake.z;
      const n = rig.links.length, span = Math.hypot(_wp.x - sx, _wp.z - sz), sag = Math.max(0.05, 0.9 - span * 0.25) * (s.state === 'breaking' ? 0.1 : 1);
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n, x = lerp(_wp.x, sx, k), z = lerp(_wp.z, sz, k), y = Math.max(groundH(x, z) + 0.04, lerp(_wp.y, sy, k) - sag * 4 * k * (1 - k)) + (s.state === 'breaking' ? Math.sin(t * 60 + i) * 0.02 : 0);
        const L2 = rig.links[i]; L2.position.set(x, y, z); L2.lookAt(lerp(_wp.x, sx, k + 0.05), y, lerp(_wp.z, sz, k + 0.05)); L2.rotateY(Math.PI / 2); if (i % 2) L2.rotateX(Math.PI / 2);
      }
    } else {
      const lp = m.g; lp.position.x = Math.sin(t * 0.3) * 0.15 * str; lp.updateMatrixWorld();
      lp.getWorldPosition(_wp); s.x = _wp.x; s.z = _wp.z;
      const want = near ? Math.atan2(P.x - s.x, P.z - s.z) - (rig.cage.parent === rig.swing ? 0 : 0) : 0;
      m.g.rotation.y += clamp(angDiff(m.g.rotation.y, near ? want : Math.sin(t * 0.2) * 0.6), -1.5 * dt, 1.5 * dt);
      if (rig.type === 'hang') { rig.swing.rotation.z = Math.sin(t * 0.9) * (0.03 + str * 0.06) + (s.state === 'breaking' ? Math.sin(t * 25) * 0.04 : 0); rig.swing.rotation.x = Math.sin(t * 0.7 + 1) * (0.02 + str * 0.04); }
      else rig.cage.rotation.z = s.state === 'breaking' ? Math.sin(t * 50) * 0.01 : 0;
    }
    s.phase += dt * 4 * speed;
    m.pose({ lie: s.state === 'breaking' ? 0 : lie, speed, phase: s.phase, t, roar: s.roar > 0 ? Math.min(1, s.roar * 2) : 0, chew: s.chew > 0 ? 1 : 0, look: lie > 0.5 ? 0.2 : -0.1, crouch: s.state === 'breaking' ? 0.6 : 0 });
    if (s.state === 'captive' && str > 0.5 && Math.random() < dt * 0.25 * str) { if (rig.type === 'chain') SFX.chain(s); else SFX.metal(s); s.roar = 0.4; }
    return;
  }
  if (s.state === 'jump') {
    s.jump.t += dt; const k = clamp(s.jump.t / s.jump.dur, 0, 1);
    s.x = lerp(s.jump.x0, s.jump.x1, k); s.z = lerp(s.jump.z0, s.jump.z1, k);
    const y = lerp(s.jump.y0, groundH(s.x, s.z), k) + Math.sin(k * Math.PI) * s.jump.h;
    m.g.position.set(s.x, y, s.z); m.g.rotation.y = s.yaw; m.pose({ speed: 1, phase: 1.2, t, roar: 0.3 });
    if (k >= 1) { s.state = 'free'; dust(s.x, groundH(s.x, s.z), s.z, 14); }
    return;
  }
  if (s.state === 'pounce') {
    const p = s.pounce; p.t += dt; const k = clamp(p.t / 0.45, 0, 1);
    s.x = lerp(p.x0, p.f.x, k); s.z = lerp(p.z0, p.f.z, k); const y = Math.max(groundH(s.x, s.z), -0.7) + Math.sin(k * Math.PI) * 1.3;
    m.g.position.set(s.x, y, s.z); m.g.rotation.y = s.yaw; m.pose({ speed: 1, phase: 0.9, t, roar: 1 });
    if (k >= 1) { if (p.f.active) p.f.die('POUNCE', 'leopard'); s.state = 'free'; s.cool = 2.6; SFX.growl(s); }
    return;
  }
  if (s.state === 'ride') return;
  // free: follow the hippo, pounce on nearby farmers
  s.cool -= dt;
  if (s.cool <= 0 && G.state === 'playing') {
    let best = null, bd = 12; for (const f of farmers) if (f.active && f.state !== 'eaten') { const dd = Math.hypot(f.x - s.x, f.z - s.z); if (dd < bd) { bd = dd; best = f; } }
    if (best) { s.state = 'pounce'; s.pounce = { t: 0, x0: s.x, z0: s.z, f: best }; s.yaw = Math.atan2(best.x - s.x, best.z - s.z); SFX.roar(s); s.roar = 1; return; }
    for (const dg of dogs) if (dg.state === 'chase' && Math.hypot(dg.x - s.x, dg.z - s.z) < 10) dg.bitten('leopard');
  }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  let tx = P.x - fx * 3.5 + Math.cos(t * 0.5) * 1.5, tz = P.z - fz * 3.5 + Math.sin(t * 0.5) * 1.5;
  const dP = Math.hypot(P.x - s.x, P.z - s.z);
  s.stuckT = (s.stuckT || 0) + dt; if (!s.lastPos || Math.hypot(s.x - s.lastPos.x, s.z - s.lastPos.z) > 1.2 || dP < 6) { s.lastPos = { x: s.x, z: s.z }; s.stuckT = 0; }
  if (dP > 30 || s.stuckT > 3) { // catch up out of sight, behind the hippo
    const o = { x: P.x - fx * 5, z: P.z - fz * 5 };
    if (rig.type === 'chain') { const rx = o.x - rig.x, rz = o.z - rig.z, rd = Math.hypot(rx, rz); if (rd < 10.5 && Math.hypot(P.x - rig.x, P.z - rig.z) >= 9) { o.x = rig.x + rx / (rd || 1) * 10.5; o.z = rig.z + rz / (rd || 1) * 10.5; } }
    o.x = clamp(o.x, -WORLD + 4, WORLD - 4); o.z = clamp(o.z, -WORLD + 4, WORLD - 4); COL.resolve(o, 0.5); s.x = o.x; s.z = o.z; s.lastPos = { x: s.x, z: s.z }; s.stuckT = 0;
  }
  [tx, tz] = viaGate(s, tx, tz);
  const d = Math.hypot(tx - s.x, tz - s.z);
  let spd = d > 2 ? clamp(d * 1.4, 3, 13) : 0; if (groundH(s.x, s.z) < -0.4) spd *= 0.75;
  if (spd > 0) { const want = Math.atan2(tx - s.x, tz - s.z); s.yaw += clamp(angDiff(s.yaw, want), -6 * dt, 6 * dt); s.x += Math.sin(s.yaw) * spd * dt; s.z += Math.cos(s.yaw) * spd * dt; const o = { x: s.x, z: s.z }; COL.resolve(o, 0.4); s.x = o.x; s.z = o.z; }
  else s.yaw += clamp(angDiff(s.yaw, Math.atan2(P.x - s.x, P.z - s.z)), -3 * dt, 3 * dt);
  s.speed = lerp(s.speed, Math.min(1, spd / 8), 1 - Math.exp(-6 * dt)); s.phase += dt * (3 + s.speed * 9);
  const gy = groundH(s.x, s.z); const swim = gy < -0.75;
  m.g.position.set(s.x, swim ? -0.75 + Math.sin(t * 3) * 0.04 : gy, s.z); m.g.rotation.y = s.yaw;
  m.pose({ speed: swim ? 0.5 : s.speed, phase: s.phase, t, roar: s.roar });
}

// ---------- spawning ----------
function farRoutePoint(minD = 45) {
  const pts = []; ROUTES.forEach(r => r.forEach(p => { if (Math.hypot(p.x - P.x, p.z - P.z) > minD) pts.push([r, p]); }));
  return pts.length ? pick(pts) : [ROUTES[0], ROUTES[0][0]];
}
function spawnFarmer(opt = {}) {
  const [r, p] = opt.route ? [opt.route, opt.route[randi(0, opt.route.length - 1)]] : farRoutePoint();
  const used = new Set(farmers.map(f => f.name)); const name = FARMER_NAMES.find(n => !used.has(n)) || pick(FARMER_NAMES);
  const f = new Farmer(p.x + rand(-1, 1), p.z + rand(-1, 1), r, Object.assign({ name }, opt)); farmers.push(f); return f;
}
function spawnDog(opt = {}) { const [r, p] = opt.route ? [opt.route, opt.route[0]] : farRoutePoint(30); const d = new Dog(p.x, p.z, r); dogs.push(d); return d; }
function spawnBunch() {
  const free = TREES.filter(t => !t.bunch && (!P.alive || Math.hypot(t.x - P.x, t.z - P.z) > 10)); if (!free.length) return;
  const t = pick(free), a = rand(0, TAU), m = new THREE.Mesh(bunchGeo, bunchMat);
  const b = { tree: t, m, x: t.tx + Math.cos(a) * 0.42, z: t.tz + Math.sin(a) * 0.42, y: t.top - 0.85, ph: rand(0, 6) };
  m.position.set(b.x, b.y, b.z); m.rotation.set(0.15, rand(0, TAU), 0); m.castShadow = true; worldRoot.add(m); t.bunch = b; bunches.push(b);
}
const PU_GEO = {
  golden: new THREE.TorusGeometry(0.45, 0.13, 10, 20, 2.2), melon: new THREE.SphereGeometry(0.45, 16, 12), pepper: new THREE.ConeGeometry(0.2, 0.8, 10), camo: new THREE.CylinderGeometry(0.3, 0.36, 0.6, 12),
  hide: new THREE.CylinderGeometry(0.5, 0.5, 0.12, 6), parrot: new THREE.SphereGeometry(0.28, 12, 10), frenzy: new THREE.ConeGeometry(0.22, 0.75, 8)
};
Object.values(PU_GEO).forEach(g => g.userData.keep = true);
const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 14, 16, 1, true); beamGeo.translate(0, 7, 0); beamGeo.userData.keep = true;
const ringGeo = new THREE.TorusGeometry(1.0, 0.05, 6, 32); ringGeo.userData.keep = true;
function makePickup(type, x, z) {
  const pw = POWER[type], g = new THREE.Group(), y = groundH(x, z); g.position.set(x, y, z);
  const em = new THREE.MeshStandardMaterial({ color: pw.color, emissive: pw.color, emissiveIntensity: 0.55, roughness: 0.3, metalness: type === 'hide' ? 0.8 : 0.1 });
  const core = new THREE.Mesh(PU_GEO[type], em); core.castShadow = true;
  const holder = grp(g, 0, 1.3, 0); holder.add(core);
  if (type === 'golden') core.rotation.z = 0.8;
  if (type === 'melon') { core.scale.set(1, 0.85, 1.25); mk(GEO.sph, mat(0x1e5a1e), 0, 0, 0, 0.455, 0.39, 0.57, holder).visible = true; core.material = new THREE.MeshStandardMaterial({ color: 0x6ad15a, emissive: 0x2a7a1a, emissiveIntensity: 0.6 }); core.scale.set(1.02, 0.88, 1.27); }
  if (type === 'pepper') { core.rotation.x = Math.PI; mk(GEO.cyl8, mat(0x3a7a2a), 0, 0.48, 0, 0.04, 0.2, 0.04, holder); }
  if (type === 'parrot') { mk(GEO.cone, mat(0xffd23a), 0, 0.02, 0.3, 0.08, 0.2, 0.08, holder).rotation.x = Math.PI / 2; mk(GEO.cone, em, 0, -0.1, -0.4, 0.12, 0.5, 0.06, holder).rotation.x = -Math.PI / 2 - 0.4; }
  if (type === 'hide') core.rotation.x = Math.PI / 2;
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: pw.color, transparent: true, opacity: 0.85 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; g.add(ring);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: pw.color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); g.add(beam);
  worldRoot.add(g);
  return { type, x, z, g, holder, ring, beam, active: true, t: rand(0, 6), respawn: 0 };
}
function powerSpots() {
  const pts = []; srand(L.seed * 31 + 7);
  for (let tries = 0; tries < 4000 && pts.length < 9; tries++) {
    const x = srange(-WORLD + 10, WORLD - 10), z = srange(-WORLD + 10, WORLD - 10);
    if (groundH(x, z) < 0.3 || inField(x, z, 2)) continue;
    if (Math.hypot(x - L.captive.x, z - L.captive.z) < 14) continue;
    const pr = { x, z }; if (COL.resolve(pr, 2)) continue;
    if (pts.some(p => Math.hypot(p.x - x, p.z - z) < 38)) continue;
    pts.push({ x, z });
  }
  return pts;
}

// ---------- level lifecycle ----------
function newStats() { return { eaten: 0, ko: 0, dogs: 0, bananas: 0, fed: 0, spotted: 0, time: 0, power: 0, dmg: 0 }; }
function cleanupCine() {
  G.killcam = null; G.cine = null; HIPPO.g.visible = false; HIPPO.body.rotation.set(0, 0, 0); HIPPO.body.position.y = 0; HIPPO.headPivot.rotation.set(0, 0, 0); HIPPO.head.setOpen(0);
  while (HIPPO.mouthHold.children.length) HIPPO.mouthHold.remove(HIPPO.mouthHold.children[0]);
  compMat.uniforms.sat.value = 0.9; compMat.uniforms.flash.value = 0; G.shake = 0;
  $('lb-top').classList.remove('on'); $('lb-bot').classList.remove('on'); $('kcam').style.display = 'none'; $('fx-flash').style.opacity = 0;
}
function loadLevel(i) {
  cleanupCine(); G.runId = (G.runId || 0) + 1;
  G.li = i; buildWorld(LEVELS[i]);
  const night = !!L.sky.night; vmHemi.intensity = night ? 0.42 : 0.55; vmHemi.color.set(night ? 0x9fb4d8 : 0xfff4e6); vmSun.intensity = night ? 0.32 : 0.55; vmSun.color.set(night ? 0xa8c0ff : 0xffe2b8);
  rig = makeRig(L.captive); leo = initLeopard();
  exfil = waterPoint(L.exfil); exfil.y = groundH(exfil.x, exfil.z);
  farmers = []; dogs = []; bunches = []; pickups = []; hats = [];
  ROUTES = buildRoutes();
  P.alive = false; P.x = L.captive.x + 30; P.z = L.captive.z + 30;
  const n = Math.max(3, L.enemies.farmers + DIFF[G.diff].extra);
  for (let k = 0; k < n; k++) { const r = ROUTES[k % ROUTES.length]; spawnFarmer({ route: r }); }
  for (let k = 0; k < L.enemies.dogs; k++) spawnDog({ route: ROUTES[(k * 3 + 1) % ROUTES.length] });
  for (let k = 0; k < 24; k++) spawnBunch();
  const types = L.power; powerSpots().forEach((p, k) => pickups.push(makePickup(types[k % types.length], p.x, p.z)));
  G.strength = 0; G.phase = 'gather'; G.waveIdx = 0; G.score = 0; G.stats = newStats(); G.spawnT = 25; G.bunchT = 4; G.killcam = null; G.cine = null; G.dmgArcs = []; G.hints = {};
  buildMinimap(); initRain();
}
function resetPlayer() {
  const s = waterPoint(L.start);
  Object.assign(P, { x: s.x, z: s.z, vx: 0, vz: 0, hp: 100, armor: 0, stamina: 100, winded: false, fovK: 0, carry: 0, cap: L.cap, alive: true, biteCool: 0, jawT: 1, bellowCool: 0, camo: 0, pepper: 0, frenzy: 0, recon: 0, lastHit: 99, sneak: false, sprinting: false, lunge: 0, stepPh: 0, feedT: 0, invuln: 0, bob: 0, swayX: 0, swayY: 0, pitch: -0.05, inWater: false, deep: false, zone: false, hitTilt: 0 });
  P.yaw = Math.atan2(-(L.captive.x - P.x), -(L.captive.z - P.z));
  P.y = groundH(P.x, P.z) + 1.55;
}
function startMission(i) {
  loadLevel(i); resetPlayer();
  G.state = 'playing'; G.t = 0; G.fade = 0;
  HIPPO.g.visible = false;
  $('hud').classList.remove('off');
  hudReset(); const run = G.runId; insertion(L.insertion, run); lbStartRun();
  setTimeout(() => { if (G.state === 'playing' && G.runId === run) { notify('Free the leopard', L.captiveLine); } }, 4200);
  setTimeout(() => { if (G.state === 'playing' && G.runId === run && !G.hints.move) { G.hints.move = 1; hint(`Walk into banana bunches on the trees to grab them. Carry them to the leopard and hold ${kn('feed')} to feed him. Hold ${kn('burst')} for a burst of speed.`, 8); } }, 7500);
}

// ---------- player ----------
function damagePlayer(amt, src, knock) {
  if (!P.alive || P.invuln > 0) return;
  if (P.armor > 0) { const ab = Math.min(P.armor, amt * 0.7); P.armor -= ab; amt -= ab; }
  P.hp -= amt; P.lastHit = 0; G.stats.dmg += amt;
  G.dmgArcs.push({ x: src.x, z: src.z, t: 1.6 }); G.shake = Math.min(1, G.shake + 0.5); P.hitTilt = rand(-0.06, 0.06);
  $('fx-flash').style.opacity = 1; setTimeout(() => $('fx-flash').style.opacity = 0, 90);
  SFX.hurt(); if (src.tool && src.tool !== 'chainsaw') SFX.hit(src);
  if (knock) { const dx = P.x - src.x, dz = P.z - src.z, d = Math.hypot(dx, dz) || 1; P.vx += dx / d * knock; P.vz += dz / d * knock; }
  if (P.hp <= 0) killPlayer(src);
}
function killPlayer(src) {
  P.alive = false; P.hp = 0; SFX.death();
  G.cine = { type: 'death', t: 0, src, x: P.x, z: P.z, yaw: P.yaw };
  HIPPO.g.visible = true; poseHippo(P.x, P.z, P.yaw + Math.PI, 0);
  for (const f of farmers) if (f.active && f.state === 'chase') f.cheer = true;
}
function poseHippo(x, z, yaw, open) {
  HIPPO.body.rotation.set(0, 0, 0); HIPPO.body.position.y = 0; HIPPO.headPivot.rotation.set(0, 0, 0); HIPPO.legs.forEach(l => l.rotation.x = 0);
  const gy = groundH(x, z); HIPPO.g.position.set(x, Math.max(gy, -1.25), z); HIPPO.g.rotation.set(0, yaw, 0); HIPPO.head.setOpen(open);
  const wet = gy < 0.2; HIPPO.body.traverse(m => { if (m.isMesh && (m.material === HM.skin || m.material === HM.skinWet)) m.material = wet ? HM.skinWet : HM.skin; });
}
function bite() {
  P.biteCool = 0.5; P.jawT = 0;
  const lethal = P.zone || P.frenzy > 0, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  let reach = lethal ? 3.4 : 2.7;
  if (lethal && P.inWater) { P.lunge = 0.22; P.lungeDir = { x: fx, z: fz }; reach += 1.6; splash(P.x + fx * 1.5, P.z + fz * 1.5, 12, 0.7); SFX.splash({ x: P.x, z: P.z }, 0.25); }
  let best = null, bd = 1e9;
  const test = (e, r) => { const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d > reach + r) return; const a = Math.abs(angDiff(Math.atan2(dx, dz), Math.atan2(fx, fz))); if (a > 0.8 && d > 1.8) return; if (d < bd) { bd = d; best = e; } };
  farmers.forEach(f => { if (f.active) test(f, f.r); }); dogs.forEach(d => { if (d.active && d.state !== 'flee') test(d, 0.4); });
  if (!best) { SFX.whiff(); SFX.chomp(); return; }
  SFX.chomp(best);
  if (best instanceof Dog) { best.bitten(); hitmark(false); return; }
  if (lethal) { eat(best); return; }
  best.hp -= 34; best.stun = 1.1; const d = Math.hypot(best.x - P.x, best.z - P.z) || 1; best.kx = (best.x - P.x) / d * 7; best.kz = (best.z - P.z) / d * 7; best.atk = 0;
  SFX.hit(best); hitmark(false); G.score += 25; xp('+25', 'HIT');
  if (best.hp <= 0) best.die('TRAMPLE'); else best.aware = 1.25;
  if (!G.hints.landbite) { G.hints.landbite = 1; hint('On dry land your bite only staggers them. Lure farmers to the water to eat them.', 6); }
}
function eat(f) {
  f.state = 'eaten'; f.atk = 0; P.hp = Math.min(100, P.hp + 20); G.score += 150; G.stats.eaten++; hitmark(true);
  killfeedRaw(`<span class="you">HIPPO</span><span class="w">CHOMP</span><span class="en">${f.name}</span>`); xp('+150', 'EATEN');
  if (G.settings.killcam) startKillcam(f);
  else { f.quick = true; f.eatT = 0; SFX.crunch(f); SFX.gulp(); if (groundH(f.x, f.z) < 0.1) { splash(f.x, f.z, 30, 1); SFX.splash(f, 0.5); dropHat(f); } }
}
function dropHat(f) {
  const h = f.m.hat; if (!h || !h.parent) return; h.getWorldPosition(_wp); worldRoot.attach(h);
  hats.push({ m: h, x: _wp.x, y: _wp.y, z: _wp.z, vy: 4, vx: rand(-1.5, 1.5), vz: rand(-1.5, 1.5), spin: rand(-8, 8), t: 0 });
}
function bellow() {
  P.bellowCool = 10; SFX.bellow(); G.shake = Math.min(1, G.shake + 0.3); let n = 0;
  for (const f of farmers) if (f.active && Math.hypot(f.x - P.x, f.z - P.z) < 45) { f.hear(P.x, P.z, 0.75); n++; }
  for (const d of dogs) if (d.active && d.state === 'roam' && Math.hypot(d.x - P.x, d.z - P.z) < 40) d.aware = Math.max(d.aware, 0.8);
  G.bellowRing = 1;
  if (n) xp('', `${n} LURED`);
  if (P.inWater) splash(P.x, P.z, 10, 0.5);
}
function feedOne() {
  P.carry--; G.stats.fed++; leo.chew = 0.9;
  const per = 100 / L.need; const before = G.strength; G.strength = Math.min(100, G.strength + per);
  SFX.feed(leo); G.score += 40; xp('+40', 'FED');
  sparkle(leo.x, (rig.leoBase.y || 0) + 1.4, leo.z, 0xffd23f, 8);
  for (const w of L.waves.slice(G.waveIdx)) { if (before < w.at && G.strength >= w.at) { G.waveIdx++; doWave(w); } }
  for (const th of [25, 50, 75]) if (before < th && G.strength >= th) { notify(`Leopard strength ${th}%`, th === 75 ? 'He is almost ready to break free' : 'Keep the bananas coming'); SFX.growl(leo); leo.roar = 0.6; }
  if (G.strength >= 100 && leo.state === 'captive' && !G.killcam && !G.cine) startBreak();
}
function doWave(w) {
  for (let k = 0; k < (w.f || 0); k++) spawnFarmer({ alert: true });
  for (let k = 0; k < (w.d || 0); k++) spawnDog();
  if (w.foreman) { const f = spawnFarmer({ tool: 'chainsaw', foreman: true, alert: true, name: 'Foreman Boyd' }); notify('The foreman is here', 'Chainsaw. Do not fight him on land'); SFX.sting(); return; }
  notify('Reinforcements inbound', `${(w.f || 0) + (w.d || 0)} more hostiles from the farmhouse`, 'red'); SFX.sting();
}
function applyPower(pk) {
  const pw = POWER[pk.type]; SFX.power(); G.stats.power++; sparkle(pk.x, groundH(pk.x, pk.z) + 1.3, pk.z, pw.color, 22);
  switch (pk.type) {
    case 'golden': P.carry = Math.min(P.cap + 3, P.carry + 3); break;
    case 'melon': P.hp = 100; break;
    case 'pepper': P.pepper = POWER.pepper.dur; P.stamina = 100; break;
    case 'camo': P.camo = POWER.camo.dur; break;
    case 'hide': P.armor = 100; break;
    case 'parrot': P.recon = POWER.parrot.dur; break;
    case 'frenzy': P.frenzy = POWER.frenzy.dur; break;
  }
  notify(pw.name, pw.desc, 'power', pw.css); G.score += 50;
}
function updatePlayer(dt) {
  const D = DIFF[G.diff];
  P.lastHit += dt; P.invuln = Math.max(0, P.invuln - dt);
  for (const k of ['camo', 'pepper', 'frenzy', 'recon']) if (P[k] > 0) { P[k] -= dt; if (P[k] <= 0) { P[k] = 0; SFX.powerdown(); } }
  let ix = 0, iz = 0;
  if (act('forward')) iz += 1; if (act('back')) iz -= 1; if (act('left')) ix -= 1; if (act('right')) ix += 1;
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = -fz, rz = fx;
  const gh = groundH(P.x, P.z); P.inWater = gh < -0.2; P.deep = gh < -1.1; P.zone = waterDist(P.x, P.z) < ZONE_D;
  let base = P.sneak ? 3.4 : 6.2; if (P.deep) base = P.sneak ? 5.0 : 8.4; else if (P.inWater) base = 6.8;
  const moving = il > 0.1;
  // burst sprint: a short charge that drains fast and recharges after a brief rest; fully draining it leaves you winded until 35%
  const wasSprint = P.sprinting; P.sprinting = false;
  if (P.winded && P.stamina >= 35) P.winded = false;
  if (act('burst') && P.sneak && moving && iz > 0 && !P.winded) P.sneak = false;
  if (act('burst') && moving && iz > 0 && !P.sneak && !P.winded && (P.stamina > 0 || P.pepper > 0)) {
    base *= P.deep ? 1.45 : 2.05; P.sprinting = true; P.stamT = 0;
    if (!P.pepper) { P.stamina = Math.max(0, P.stamina - 30 * dt); if (P.stamina <= 0) { P.winded = true; SFX.winded && SFX.winded(); } }
    if (!wasSprint) { SFX.burst && SFX.burst(); G.shake = Math.max(G.shake, 0.25); }
  } else { P.stamT = (P.stamT || 0) + dt; if (P.stamT > 0.6) P.stamina = Math.min(100, P.stamina + (P.winded ? 16 : 22) * dt); }
  if (P.pepper > 0) base *= 1.35;
  const tvx = (fx * iz + rx * ix) * base, tvz = (fz * iz + rz * ix) * base, k = 1 - Math.exp(-(P.deep ? 4 : 9) * dt);
  P.vx = lerp(P.vx, tvx, k); P.vz = lerp(P.vz, tvz, k);
  let mx = P.vx, mz = P.vz; if (P.lunge > 0) { P.lunge -= dt; mx += P.lungeDir.x * 14; mz += P.lungeDir.z * 14; }
  P.x += mx * dt; P.z += mz * dt; COL.resolve(P, 0.95);
  const spd = Math.hypot(P.vx, P.vz);
  if (P.lastHit > 4 && P.hp < 100) P.hp = Math.min(100, P.hp + D.regen * dt);
  // eye height
  let eye = gh + 1.55; if (P.inWater) eye = Math.max(gh + 1.55, (P.sneak && P.deep ? 0.2 : 0.46) + Math.sin(G.rt * 1.7) * 0.04);
  P.y = lerp(P.y, eye, 1 - Math.exp(-9 * dt));
  // footsteps
  P.stepPh += spd * dt * 0.55;
  if (P.stepPh > 1) { P.stepPh -= 1; if (P.inWater) { SFX.wade(); if (Math.random() < 0.4) PT.spawn({ x: P.x + rand(-1, 1), y: 0.05, z: P.z + rand(-1, 1), s: 0.5, sy: 0.1, c: 0xe8f4f4, life: 0.8, g: 0, grow: 2.5, op: 0.35 }); } else SFX.step(null, true); }
  // bite / bellow / feed
  P.biteCool -= dt; P.bellowCool = Math.max(0, P.bellowCool - dt); P.jawT += dt;
  if (act('bite') && P.biteCool <= 0) bite();
  if (G.killcam) { P.speed = spd; return; }
  if (act('bellow') && P.bellowCool <= 0) bellow();
  const fd = Math.hypot(P.x - rig.feedPt.x, P.z - rig.feedPt.z);
  P.canFeed = leo.state === 'captive' && fd < rig.feedR;
  if (P.canFeed && act('feed') && P.carry > 0) { P.feedT += dt; if (P.feedT >= 0.36) { P.feedT = 0; feedOne(); } } else P.feedT = 0;
  // pickups
  if (P.carry < P.cap) for (const b of bunches) if (b.m.parent && Math.hypot(b.x - P.x, b.z - P.z) < 2.4) {
    worldRoot.remove(b.m); b.tree.bunch = null; b.dead = true; P.carry++; G.stats.bananas++; SFX.pickup(); sparkle(b.x, b.y, b.z); xp('+10', 'BANANA'); G.score += 10;
    if (P.carry >= P.cap) { hint(`Mouth full. Take the bananas to the leopard.`, 4); }
    else if (!G.hints.first) { G.hints.first = 1; hint('Follow the diamond marker to the leopard.', 5); }
    if (P.carry >= P.cap) break;
  }
  bunches = bunches.filter(b => !b.dead);
  for (const pk of pickups) if (pk.active && Math.hypot(pk.x - P.x, pk.z - P.z) < 2.3) { pk.active = false; pk.g.visible = false; pk.respawn = 40; applyPower(pk); }
  if (G.strength >= 100 && leo.state === 'captive' && !G.cine) startBreak();
  // exfil
  if (G.phase === 'escape' && Math.hypot(P.x - exfil.x, P.z - exfil.z) < 8) {
    if (Math.hypot(leo.x - exfil.x, leo.z - exfil.z) < 14) startWin(); else if (!G.hints.waitleo) { G.hints.waitleo = 1; hint('Wait for the leopard to reach you at the exfil point.', 4); }
  }
  if (G.phase === 'escape' && !G.hints.escape) { G.hints.escape = 1; hint('Reach the green smoke on the riverbank. The leopard will follow you and pounce on farmers.', 7); }
  P.speed = spd;
}

// ---------- killcam ----------
function startKillcam(f) {
  const yaw = Math.atan2(f.x - P.x, f.z - P.z);
  G.killcam = { t: 0, dur: 2.3, f, yaw, side: Math.random() < 0.5 ? 1 : -1, x0: P.x, z0: P.z, water: groundH(f.x, f.z) < 0.4 || P.inWater, hat: false, spl: false };
  HIPPO.g.visible = true; poseHippo(P.x, P.z, yaw, 0); HIPPO.headPivot.rotation.set(0, 0, 0);
  P.invuln = 3; $('lb-top').classList.add('on'); $('lb-bot').classList.add('on'); $('kcam').style.display = 'block'; $('kcamt').textContent = f.name.toUpperCase(); $('hud').classList.add('off');
  SFX.sting();
}
function updateKillcam(rdt) {
  const k = G.killcam, t = (k.t += rdt), f = k.f, hb = HIPPO;
  const open = t < 0.42 ? smooth(t / 0.42) : t < 0.52 ? 1 - smooth((t - 0.42) / 0.1) * 0.85 : t < 1.35 ? 0.15 + 0.06 * Math.sin(t * 30) : t < 1.75 ? 0.15 + Math.sin((t - 1.35) / 0.4 * Math.PI) * 0.35 : 0.05;
  const lunge = t < 0.5 ? smooth(t / 0.5) * 1.6 : 1.6 - smooth((t - 1.4) / 0.8) * 0.8;
  const hx = k.x0 + Math.sin(k.yaw) * lunge, hz = k.z0 + Math.cos(k.yaw) * lunge;
  poseHippo(hx, hz, k.yaw, open);
  hb.headPivot.rotation.x = t < 0.42 ? -0.45 * smooth(t / 0.42) : t < 0.52 ? lerp(-0.45, 0.3, (t - 0.42) / 0.1) : t < 1.35 ? 0.3 - (t - 0.52) * 0.2 : lerp(0.14, 0, smooth((t - 1.35) / 0.6));
  hb.headPivot.rotation.y = (t > 0.55 && t < 1.35) ? Math.sin(t * 24) * 0.28 * (1 - (t - 0.55) / 0.8) : 0;
  hb.body.rotation.z = (t > 0.55 && t < 1.35) ? Math.sin(t * 24 + 1) * 0.04 : 0;
  hb.body.position.y = t < 0.5 ? smooth(t / 0.5) * 0.35 : 0.35 * (1 - smooth((t - 0.5) / 0.6));
  hb.legs.forEach((l, i) => l.rotation.x = t < 0.5 ? (i < 2 ? -0.5 : 0.3) * smooth(t / 0.5) : 0);
  if (t < 0.48) { f.anim(0.016, 0, 'cower'); f.m.g.rotation.y = Math.atan2(hx - f.x, hz - f.z); }
  else {
    if (f.m.g.parent !== hb.mouthHold) { hb.mouthHold.add(f.m.g); f.m.g.position.set(0.8, 0, 0); f.m.g.rotation.set(0, 0, Math.PI / 2); f.m.g.scale.setScalar(0.82); SFX.crunch(f); G.shake = 1; if (k.water) { splash(f.x, f.z, 46, 1.4); SFX.splash(f, 0.7); } else dust(f.x, groundH(f.x, f.z), f.z, 18); }
    f.anim(0.016, 0, 'cower', true); f.m.legs[0].rotation.x = Math.sin(t * 30) * 0.8; f.m.legs[1].rotation.x = -Math.sin(t * 30) * 0.8;
    if (!k.hat && t > 0.75) { k.hat = true; dropHat(f); }
    if (t > 1.0) f.m.g.scale.setScalar(0.82 * Math.max(0.001, 1 - smooth((t - 1.0) / 0.55)));
    if (t > 1.5 && !k.gulp) { k.gulp = true; SFX.gulp(); }
    if (k.water && t > 0.55 && t < 1.35 && Math.random() < 0.5) splash(hx + Math.sin(k.yaw) * 2.2, hz + Math.cos(k.yaw) * 2.2, 3, 0.6);
  }
  // camera orbit
  const mid = { x: hx + Math.sin(k.yaw) * 2.1, z: hz + Math.cos(k.yaw) * 2.1 };
  const ang = k.yaw + k.side * (1.75 - t * 0.28), dist = 6.6 - t * 0.7;
  const cy = Math.max(groundH(mid.x, mid.z), 0) + 2.4 + t * 0.15;
  camera.position.set(mid.x + Math.sin(ang) * dist, Math.max(cy, groundH(mid.x + Math.sin(ang) * dist, mid.z + Math.cos(ang) * dist) + 0.8), mid.z + Math.cos(ang) * dist);
  camera.lookAt(mid.x, Math.max(0, groundH(mid.x, mid.z)) + 1.7, mid.z);
  if (t >= k.dur) endKillcam();
}
function endKillcam() {
  const k = G.killcam; G.killcam = null; HIPPO.g.visible = false; HIPPO.body.rotation.set(0, 0, 0); HIPPO.body.position.y = 0; HIPPO.headPivot.rotation.set(0, 0, 0);
  if (k.f.m.g.parent) k.f.m.g.parent.remove(k.f.m.g); k.f.removed = true;
  $('lb-top').classList.remove('on'); $('lb-bot').classList.remove('on'); $('kcam').style.display = 'none'; $('hud').classList.remove('off');
  P.invuln = 1.0; camera.rotation.set(P.pitch, P.yaw, 0);
}

// ---------- cutscenes: break free, win, death ----------
function startBreak() {
  leo.state = 'breaking'; G.cine = { type: 'break', t: 0, snapped: false, slow: 0.15 };
  P.invuln = 99; HIPPO.g.visible = true; poseHippo(P.x, P.z, Math.atan2(leo.x - P.x, leo.z - P.z), 0);
  $('lb-top').classList.add('on'); $('lb-bot').classList.add('on'); $('hud').classList.add('off'); SFX.growl(leo);
}
function snapFree() {
  const c = G.cine; c.snapped = true; compMat.uniforms.flash.value = 0.5; G.shake = 1; leo.roar = 1.5; SFX.roar(leo);
  if (rig.type === 'chain') {
    SFX.snap(leo);
    rig.links.forEach(l => { PT.spawn({ x: l.position.x, y: l.position.y, z: l.position.z, vx: rand(-5, 5), vy: rand(3, 8), vz: rand(-5, 5), s: 0.09, c: 0x8e9398, life: 1.6, g: -14 }); l.visible = false; });
    leo.m.ring.visible = false;
  } else if (rig.type === 'truck') {
    SFX.metal(leo); SFX.crash(leo);
    rig.bars.forEach(b => { if (b.userData.side) { b.rotation.z = -b.userData.side * rand(0.2, 0.45); b.rotation.x = rand(-0.2, 0.2); } });
    c.door = { v: new THREE.Vector3(-4, 5, 7), spin: 6 };
  } else {
    SFX.snap(leo); c.fall = { v: 0 };
    rig.rope.scale.y = 0.4; rig.rope.position.y = -0.45;
  }
  sparkle(leo.x, (rig.leoBase.y || 0) + 1, leo.z, 0xffffff, 30);
}
function releaseLeopard() {
  const m = leo.m; m.g.updateMatrixWorld(); m.g.getWorldPosition(_wp); worldRoot.attach(m.g); m.g.scale.setScalar(1);
  leo.x = _wp.x; leo.z = _wp.z; leo.yaw = Math.atan2(P.x - leo.x, P.z - leo.z);
  const tx = leo.x + Math.sin(leo.yaw) * 5, tz = leo.z + Math.cos(leo.yaw) * 5;
  leo.state = 'jump'; leo.jump = { t: 0, dur: 0.75, x0: leo.x, z0: leo.z, y0: _wp.y, x1: tx, z1: tz, h: 1.4 };
}
function updateCine(rdt) {
  const c = G.cine, t = (c.t += rdt);
  if (c.type === 'break') {
    const cx = rig.feedPt.x, cz = rig.feedPt.z, cyBase = rig.type === 'hang' ? rig.cageY + 1 : (rig.leoBase.y || 0) + 1;
    const a = Math.atan2(P.x - cx, P.z - cz) + 0.9 - t * 0.12, R = 9.5 - t * 0.6;
    const camX = cx + Math.sin(a) * R, camZ = cz + Math.cos(a) * R;
    camera.position.set(camX, Math.max(groundH(camX, camZ) + 1.5, cyBase + 1.6 - t * 0.1), camZ); camera.lookAt(cx, cyBase + 0.4, cz);
    c.slow = t < 1.6 ? 0.15 : t < 2.0 ? 0.05 : 0.6;
    if (t > 0.3 && !c.r1) { c.r1 = 1; SFX.roar(leo); leo.roar = 1.2; }
    if (t > 0.6 && t < 1.6 && Math.random() < 0.12) { if (rig.type === 'chain') SFX.chain(leo); else SFX.metal(leo); G.shake = 0.4; }
    if (t > 1.6 && !c.snapped) snapFree();
    if (c.door) { c.door.v.y -= 9.8 * rdt * 0.6; rig.door.position.addScaledVector(c.door.v, rdt * 0.6); rig.door.rotation.y += c.door.spin * rdt * 0.6; rig.door.rotation.x += c.door.spin * 0.5 * rdt * 0.6; }
    if (c.fall && !c.landed) {
      rig.swing.rotation.set(0, 0, 0); c.fall.v += 18 * rdt; rig.cage.position.y -= c.fall.v * rdt; rig.cage.getWorldPosition(_wp);
      if (_wp.y <= rig.y + 0.02) {
        c.landed = true; rig.cage.position.y += (rig.y + 0.02 - _wp.y); SFX.crash(leo); dust(_wp.x, rig.y, _wp.z, 30, 0x7a6a50); G.shake = 1;
        rig.bars.forEach(b => { if (Math.random() < 0.6) { b.getWorldPosition(_wq); b.visible = false; PT.spawn({ x: _wq.x, y: _wq.y, z: _wq.z, vx: rand(-6, 6), vy: rand(2, 7), vz: rand(-6, 6), s: 0.06, sy: 12, c: 0x7a7f82, life: 1.6, g: -14 }); } });
      }
    }
    if (t > 2.3 && leo.state === 'breaking') releaseLeopard();
    if (t > 4.1) {
      G.cine = null; leo.state = leo.state === 'jump' ? 'jump' : 'free'; G.phase = 'escape'; HIPPO.g.visible = false; P.invuln = 2;
      $('lb-top').classList.remove('on'); $('lb-bot').classList.remove('on'); $('hud').classList.remove('off');
      notify('The leopard is free', 'Escort him to the river exfil', 'green'); G.score += 500; xp('+500', 'LEOPARD FREED');
      for (const f of farmers) if (f.active) { f.hear(P.x, P.z, 0.95); }
      camera.rotation.set(P.pitch, P.yaw, 0);
    }
    return;
  }
  if (c.type === 'win') {
    const hb = HIPPO, sp = 2.2 * t; const dir = c.dir;
    const hx = c.x + dir.x * sp, hz = c.z + dir.z * sp;
    poseHippo(hx, hz, Math.atan2(dir.x, dir.z), Math.max(0, Math.sin(t * 2)) * 0.15);
    hb.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 5 + i * 1.6) * 0.5);
    leo.m.g.position.set(hx - dir.x * 0.3, Math.max(groundH(hx, hz), -1.25) + 2.05, hz - dir.z * 0.3); leo.m.g.rotation.y = Math.atan2(dir.x, dir.z);
    leo.m.pose({ lie: 0.7, t: G.rt, roar: t > 1 && t < 1.8 ? 0.8 : 0, look: -0.3 });
    if (t > 1 && !c.roared) { c.roared = 1; SFX.roar(leo); }
    if (Math.random() < 0.3) PT.spawn({ x: hx + rand(-1.2, 1.2), y: 0.05, z: hz + rand(-1.2, 1.2), s: 0.6, sy: 0.1, c: 0xe8f4f4, life: 1, g: 0, grow: 2.5, op: 0.4 });
    const a = Math.atan2(dir.x, dir.z) + 1.9 - t * 0.18;
    camera.position.set(hx + Math.sin(a) * (9 + t), 3.2 + t * 0.4, hz + Math.cos(a) * (9 + t)); camera.lookAt(hx, 1.6, hz);
    if (t > 5.5 && !c.done) { c.done = true; endMission(true); }
    return;
  }
  if (c.type === 'death') {
    const hb = HIPPO, k = smooth(t / 1.3);
    poseHippo(c.x, c.z, c.yaw + Math.PI, 0.25 * (1 - k)); hb.body.rotation.z = k * 1.35; hb.body.position.y = -k * 0.55; hb.headPivot.rotation.x = k * 0.4;
    const a = c.yaw + 0.6 + t * 0.15, R = 6 + t * 1.8;
    camera.position.set(c.x + Math.sin(a) * R, Math.max(groundH(c.x, c.z), 0) + 2.5 + t * 1.6, c.z + Math.cos(a) * R); camera.lookAt(c.x, Math.max(groundH(c.x, c.z), 0) + 0.8, c.z);
    compMat.uniforms.sat.value = lerp(0.9, 0.15, clamp(t / 2.5, 0, 1));
    for (const f of farmers) if (f.cheer && f.active) f.anim(0.016, 0, 'cheer');
    if (t > 3.6 && !c.done) { c.done = true; endMission(false); }
  }
}
function startWin() {
  P.invuln = 99; G.phase = 'done'; SFX.win();
  const w = L.water[L.exfil.river !== undefined ? L.exfil.river : L.exfil.pond]; let dir;
  if (w.type === 'river') { dir = w.axis === 'z' ? { x: 0, z: L.exfil.t > 0 ? 1 : -1 } : { x: L.exfil.t > 0 ? 1 : -1, z: 0 }; }
  else { const dx = w.x - P.x, dz = w.z - P.z, d = Math.hypot(dx, dz); dir = { x: dx / d, z: dz / d }; }
  const wx = P.x - (w.type === 'river' ? 0 : 0); G.cine = { type: 'win', t: 0, x: P.x, z: P.z, dir, slow: 0.4 };
  if (w.type === 'river') { const c = riverCoord(w, L.exfil.t); if (w.axis === 'z') G.cine.x = c; else G.cine.z = c; }
  HIPPO.g.visible = true; leo.state = 'ride';
  $('lb-top').classList.add('on'); $('lb-bot').classList.add('on'); $('hud').classList.add('off');
  notify('Exfil complete', 'Mission accomplished', 'green');
}
function endMission(win) {
  G.state = 'end'; if (document.pointerLockElement) document.exitPointerLock();
  $('lb-top').classList.remove('on'); $('lb-bot').classList.remove('on'); $('hud').classList.add('off');
  const st = G.stats, tm = Math.floor(G.t);
  if (win) {
    const rec = G.progress[L.id] || {}; G.progress[L.id] = { done: true, best: Math.max(rec.best || 0, G.score), diff: G.diff }; saveProgress();
  }
  $('end-eye').textContent = `${L.op} · ${L.place}`;
  const h = $('end-title'); h.textContent = win ? 'Mission complete' : 'Mission failed'; h.className = win ? 'win' : 'fail';
  $('end-quote').textContent = win ? (G.li < LEVELS.length - 1 ? 'The leopard is free and the river carried you both out of the valley. Command has another job for you.' : 'Three captives freed, one valley in uproar, and not one farmer willing to go near the water again.') : `"${pick(DEATH_QUOTES)}"`;
  $('end-stats').innerHTML = [[G.score, 'SCORE'], [`${Math.floor(tm / 60)}:${String(tm % 60).padStart(2, '0')}`, 'TIME'], [st.eaten, 'FARMERS EATEN'], [st.fed, 'BANANAS FED'], [st.ko, 'KNOCKED OUT'], [st.dogs, 'DOGS SCARED'], [st.spotted, 'TIMES SPOTTED'], [st.power, 'POWER-UPS']].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  $('b-next').hidden = !(win && G.li < LEVELS.length - 1);
  $('b-retry').textContent = win ? 'Replay' : 'Retry';
  lbEnd(win); $('end').hidden = false; refreshMissionList();
  compMat.uniforms.sat.value = 0.9;
}
