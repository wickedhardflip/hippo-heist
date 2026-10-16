// ================= HUD, overlay, menus, input, main loop =================
const ov = $('ov'), oc = ov.getContext('2d');
let OW = 1, OH = 1, ODPR = 1;
function resizeAll() { makeRTs(); ODPR = Math.min(devicePixelRatio, 2); OW = innerWidth; OH = innerHeight; ov.width = OW * ODPR; ov.height = OH * ODPR; }
const FONT = '"Barlow Condensed","Arial Narrow","Roboto Condensed",sans-serif', MONO = '"Share Tech Mono",ui-monospace,Menlo,monospace';

// ---------- DOM HUD helpers ----------
let notifyT = null;
function notify(title, sub = '', kind = '', color = '') {
  const n = $('notify'); n.className = 'hud ' + (kind === 'red' ? 'red' : kind === 'green' ? 'green' : '');
  n.querySelector('h2').textContent = title; n.querySelector('h2').style.color = color || ''; n.querySelector('p').textContent = sub; n.style.opacity = 1;
  clearTimeout(notifyT); notifyT = setTimeout(() => n.style.opacity = 0, 3200);
}
let hintT = null;
function hint(text, secs = 5) { const h = $('hint'); h.textContent = text; h.style.opacity = 1; clearTimeout(hintT); hintT = setTimeout(() => h.style.opacity = 0, secs * 1000); }
function xp(v, label) { const d = document.createElement('div'); d.className = 'xp'; d.innerHTML = `${v}<small>${label}</small>`; $('xp').appendChild(d); setTimeout(() => d.remove(), 1650); while ($('xp').children.length > 4) $('xp').firstChild.remove(); }
function killfeedRaw(html) { const d = document.createElement('div'); d.className = 'kf'; d.innerHTML = html; $('killfeed').prepend(d); setTimeout(() => { d.style.opacity = 0; }, 5200); setTimeout(() => d.remove(), 5900); while ($('killfeed').children.length > 5) $('killfeed').lastChild.remove(); }
function hitmark(kill) { G.hitT = 0.28; G.hitKill = kill; }
function insertion(lines, run) {
  const box = $('insert'); box.innerHTML = ''; let i = 0;
  const next = () => {
    if (G.runId !== run) return;
    if (i >= lines.length || G.state !== 'playing') { setTimeout(() => { if (G.runId !== run) return; box.style.transition = 'opacity 1s'; box.style.opacity = 0; }, 2600); return; }
    const d = document.createElement('div'); if (i === 0) d.className = 'big'; box.appendChild(d); const s = lines[i++]; let c = 0;
    const iv = setInterval(() => { if (G.runId !== run) { clearInterval(iv); return; } d.textContent = s.slice(0, ++c); if (c % 2) SFX.type(); if (c >= s.length) { clearInterval(iv); setTimeout(next, 260); } }, 38);
  };
  box.style.transition = 'none'; box.style.opacity = 1; setTimeout(next, 600);
}
const HUDC = {};
function setText(id, v) { if (HUDC[id] !== v) { HUDC[id] = v; $(id).textContent = v; } }
function setHTML(id, v) { if (HUDC[id] !== v) { HUDC[id] = v; $(id).innerHTML = v; } }
function hudReset() { for (const k in HUDC) delete HUDC[k]; $('killfeed').innerHTML = ''; $('xp').innerHTML = ''; $('mission').textContent = `${L.op} · ${L.clock}`; $('zone').textContent = L.water[0].type === 'river' ? 'RIVER ADVANTAGE · BITES ARE LETHAL' : 'WATER ADVANTAGE · BITES ARE LETHAL'; }
function updateHUD() {
  setText('score', String(G.score));
  const full = P.carry >= P.cap; setHTML('bcnt', `${P.carry}<small> / ${P.cap}</small>`); $('bcnt').classList.toggle('full', full);
  setText('o1s', P.carry ? `${P.carry} carried${full ? ' · mouth full' : ''}` : `${bunches.length} bunches on the trees`);
  $('strbar').style.width = G.strength + '%';
  setText('o2s', `Strength ${Math.round(G.strength)}% · ${Math.max(0, Math.ceil((100 - G.strength) / (100 / L.need) - 1e-6))} more bananas`);
  const freed = G.phase !== 'gather';
  $('o1').className = 'orow ' + (freed ? 'done' : 'active'); $('o2').className = 'orow ' + (freed ? 'done' : 'active'); $('o3').className = 'orow ' + (G.phase === 'done' ? 'done' : freed ? 'active' : '');
  setText('o3s', freed ? `${Math.round(Math.hypot(exfil.x - P.x, exfil.z - P.z))}m · green smoke` : 'Locked until the leopard is free');
  setText('o2t', freed ? 'Leopard freed' : rig.type === 'hang' ? 'Toss bananas to the leopard' : 'Feed the leopard');
  const st = !P.alive ? 'DOWN' : P.deep ? (P.sneak ? 'SUBMERGED' : 'SWIMMING') : P.inWater ? 'WADING' : P.sneak ? 'SNEAKING' : P.sprinting ? 'BURST' : P.winded ? 'WINDED' : 'STANDING';
  setText('stance', st + (P.camo > 0 ? ' · CAMO' : ''));
  $('hpb').querySelector('i').style.width = Math.max(0, P.hp) + '%'; $('arb').querySelector('i').style.width = P.armor + '%'; $('arb').style.display = P.armor > 0 ? '' : 'none';
  $('stb').querySelector('i').style.width = P.stamina + '%'; $('stb').querySelector('i').style.background = P.pepper > 0 ? '#ff6a4e' : P.winded ? '#c8503a' : P.sprinting ? '#f2d16b' : ''; $('stb').classList.toggle('winded', !!P.winded);
  const eq = [`<div class="eq"><span class="k">${kn('bellow')}</span>BELLOW${P.bellowCool > 0 ? ` ${Math.ceil(P.bellowCool)}` : ''}<i class="cd" style="width:${(1 - P.bellowCool / 10) * 100}%"></i></div>`];
  for (const k of ['pepper', 'camo', 'frenzy', 'recon']) if (P[k] > 0) { const key = k === 'recon' ? 'parrot' : k; eq.push(`<div class="eq pu" style="color:${POWER[key].css}">${POWER[key].short} ${Math.ceil(P[k])}</div>`); }
  setHTML('equip', eq.join(''));
  const zone = (P.zone || P.frenzy > 0) && P.alive; $('zone').style.display = zone ? 'block' : 'none'; $('zone').classList.toggle('frenzy', !P.zone && P.frenzy > 0);
  if (!P.zone && P.frenzy > 0) setText('zone', 'FEEDING FRENZY · BITES ARE LETHAL'); else if (P.zone) setText('zone', L.water.some(w => w.type === 'river') && waterDistType() === 'river' ? 'RIVER ADVANTAGE · BITES ARE LETHAL' : 'WATER ADVANTAGE · BITES ARE LETHAL');
  let pr = '';
  if (P.canFeed && leo.state === 'captive') pr = P.carry > 0 ? `Hold <span class="key">${kn('feed')}</span> to ${rig.type === 'hang' ? 'toss' : 'feed'} bananas` : 'Leopard is hungry. Find bananas';
  setHTML('prompt', pr); $('prompt').style.display = pr ? 'block' : 'none';
  const tint = $('fx-tint');
  if (P.camo > 0) { tint.style.background = 'radial-gradient(ellipse at center,transparent 50%,rgba(70,52,30,.55))'; tint.style.opacity = 1; }
  else if (P.frenzy > 0) { tint.style.background = 'radial-gradient(ellipse at center,transparent 50%,rgba(120,40,170,.45))'; tint.style.opacity = 1; }
  else if (P.pepper > 0) { tint.style.background = 'radial-gradient(ellipse at center,transparent 55%,rgba(200,60,20,.35))'; tint.style.opacity = 1; }
  else tint.style.opacity = 0;
}
function waterDistType() { let best = 1e9, type = 'pond'; for (const w of L.water) { const v = w.type === 'river' ? (w.axis === 'z' ? Math.abs(P.x - riverCoord(w, P.z)) : Math.abs(P.z - riverCoord(w, P.x))) : Math.max(0, Math.hypot(P.x - w.x, P.z - w.z) - (w.r - WATER_CORE)); if (v < best) { best = v; type = w.type; } } return type; }

// ---------- minimap ----------
const MM = { cv: document.createElement('canvas'), ppu: 2 };
function drawMap(ctx, size, opts = {}) {
  const S = 2 * WORLD, k = size / S; ctx.clearRect(0, 0, size, size);
  const step = 2;
  for (let z = -WORLD; z < WORLD; z += step) for (let x = -WORLD; x < WORLD; x += step) {
    const cx = x + 1, cz = z + 1, h = groundH(cx, cz), wd = waterDist(cx, cz);
    let c;
    if (h < -0.2) c = h < -1.1 ? '#1f5d74' : '#2e7489';
    else if (wd < ZONE_D) c = '#3c5b4c';
    else if (inField(cx, cz)) c = ((Math.floor(cx / 6.2) + Math.floor(cz / 6.2)) & 1) ? '#405a2a' : '#3a5326';
    else c = '#4a5536';
    ctx.fillStyle = c; ctx.fillRect((x + WORLD) * k, (z + WORLD) * k, step * k + 0.6, step * k + 0.6);
  }
  ctx.fillStyle = '#9a9a88'; for (const b of COL.boxes) if (b.tall) ctx.fillRect((b.x0 + WORLD) * k, (b.z0 + WORLD) * k, (b.x1 - b.x0) * k, (b.z1 - b.z0) * k);
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; for (const b of COL.boxes) if (b.tall) ctx.strokeRect((b.x0 + WORLD) * k, (b.z0 + WORLD) * k, (b.x1 - b.x0) * k, (b.z1 - b.z0) * k);
  if (L.captive.type === 'chain') { ctx.strokeStyle = 'rgba(210,190,140,.7)'; ctx.lineWidth = Math.max(1, k * 0.6); ctx.beginPath(); ctx.arc((L.captive.x + WORLD) * k, (L.captive.z + WORLD) * k, 9 * k, Math.PI + 0.3, Math.PI - 0.3 + TAU); ctx.stroke(); }
  if (opts.brief) {
    const st = waterPoint(L.start), cp = L.captive;
    const px = v => (v + WORLD) * k;
    ctx.font = `700 ${Math.round(size / 34)}px ${FONT}`; ctx.textAlign = 'center';
    star(ctx, px(cp.x), px(cp.z), size / 40, '#ffd23f'); ctx.fillStyle = '#ffd23f'; ctx.fillText('LEOPARD', px(cp.x), px(cp.z) - size / 28);
    ctx.strokeStyle = '#93e06c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px(exfil.x), px(exfil.z), size / 40, 0, TAU); ctx.stroke(); ctx.fillStyle = '#93e06c'; ctx.fillText('EXFIL', px(exfil.x), px(exfil.z) - size / 28);
    ctx.fillStyle = '#8fd4ff'; ctx.beginPath(); ctx.arc(px(st.x), px(st.z), size / 70, 0, TAU); ctx.fill(); ctx.fillText('INSERTION', px(st.x), px(st.z) + size / 22);
    ctx.fillStyle = 'rgba(232,235,226,.75)'; ctx.font = `600 ${Math.round(size / 44)}px ${FONT}`;
    for (const p of L.props) if (['farmhouse', 'barn', 'packing', 'sawmill', 'silo', 'watertower'].includes(p.t)) ctx.fillText(p.t === 'packing' ? 'PACKING HOUSE' : p.t.toUpperCase(), px(p.x), px(p.z) + 4);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; for (let g = 0; g <= 10; g++) { ctx.beginPath(); ctx.moveTo(g * size / 10, 0); ctx.lineTo(g * size / 10, size); ctx.moveTo(0, g * size / 10); ctx.lineTo(size, g * size / 10); ctx.stroke(); }
    ctx.fillStyle = 'rgba(232,235,226,.5)'; ctx.font = `500 ${Math.round(size / 50)}px ${MONO}`; ctx.textAlign = 'left'; ctx.fillText('N ↑', 8, 18); ctx.fillText('GRID 23m', 8, size - 10);
  }
}
function star(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
function buildMinimap() { const size = Math.round(2 * WORLD * MM.ppu); MM.cv.width = MM.cv.height = size; drawMap(MM.cv.getContext('2d'), size); }

// ---------- overlay ----------
const _pv = new THREE.Vector3();
function proj(x, y, z) { _pv.set(x, y, z).project(camera); return { x: (_pv.x * 0.5 + 0.5) * OW, y: (-_pv.y * 0.5 + 0.5) * OH, on: _pv.z < 1 && Math.abs(_pv.x) < 1.05 && Math.abs(_pv.y) < 1.05 }; }
function heading() { return Math.atan2(-Math.sin(P.yaw), Math.cos(P.yaw)); }
function bearingTo(x, z) { return Math.atan2(x - P.x, -(z - P.z)); }
function drawOverlay(rdt) {
  const c = oc; c.setTransform(ODPR, 0, 0, ODPR, 0, 0); c.clearRect(0, 0, OW, OH);
  if (G.state !== 'playing' || G.killcam || G.cine) return;
  const hd = heading(); c.textBaseline = 'middle';
  // ---- compass
  const cw = Math.min(480, OW * 0.5), cx = OW / 2, cy = 26;
  c.save(); c.beginPath(); c.rect(cx - cw / 2, cy - 18, cw, 40); c.clip();
  const fade = (x) => 1 - Math.pow(Math.abs(x - cx) / (cw / 2), 3);
  const pxPerRad = cw / 2 / (Math.PI / 2.4);
  for (let deg = 0; deg < 360; deg += 5) {
    const a = angDiff(hd, deg * Math.PI / 180); if (Math.abs(a) > Math.PI / 2.3) continue; const x = cx + a * pxPerRad; c.globalAlpha = Math.max(0, fade(x));
    c.fillStyle = '#e8ebe2'; const major = deg % 45 === 0;
    if (major) { c.font = `700 16px ${FONT}`; c.textAlign = 'center'; c.fillText(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][deg / 45], x, cy); }
    else if (deg % 15 === 0) { c.font = `500 11px ${MONO}`; c.textAlign = 'center'; c.fillStyle = 'rgba(232,235,226,.7)'; c.fillText(String(deg), x, cy + 1); }
    else { c.fillRect(x - 0.5, cy + 9, 1, 5); }
  }
  const markOnCompass = (b, col, shape) => { const a = angDiff(hd, b); if (Math.abs(a) > Math.PI / 2.3) return; const x = cx + a * pxPerRad; c.globalAlpha = Math.max(0, fade(x)); c.fillStyle = col; c.beginPath(); if (shape === 'd') { c.moveTo(x, cy - 15); c.lineTo(x + 5, cy - 10); c.lineTo(x, cy - 5); c.lineTo(x - 5, cy - 10); } else { c.moveTo(x - 5, cy - 14); c.lineTo(x + 5, cy - 14); c.lineTo(x, cy - 6); } c.fill(); };
  const obj = objective();
  if (obj) markOnCompass(bearingTo(obj.x, obj.z), obj.col, 'd');
  for (const f of farmers) if (f.active && f.state === 'chase') markOnCompass(bearingTo(f.x, f.z), '#ee4a2f', 't');
  c.restore(); c.globalAlpha = 1;
  c.fillStyle = '#e8ebe2'; c.fillRect(cx - 1, cy + 12, 2, 8);
  c.font = `500 12px ${MONO}`; c.textAlign = 'center'; c.fillText(String(Math.round(((hd * 180 / Math.PI) + 360) % 360)).padStart(3, '0'), cx, cy + 30);
  // ---- minimap
  const ms = Math.round(Math.min(200, OW * 0.32, OH * 0.27)), mx = 18, my = 18, k = ms / 150;
  if (ms !== MM.lastMs) { MM.lastMs = ms; document.documentElement.style.setProperty('--mm', ms + 'px'); }
  c.save(); c.fillStyle = 'rgba(8,10,7,.55)'; c.fillRect(mx - 3, my - 3, ms + 6, ms + 6);
  c.beginPath(); c.rect(mx, my, ms, ms); c.clip();
  c.translate(mx + ms / 2, my + ms / 2); c.rotate(-hd);
  c.globalAlpha = 0.92; c.drawImage(MM.cv, (-WORLD - P.x) * k, (-WORLD - P.z) * k, 2 * WORLD * k, 2 * WORLD * k); c.globalAlpha = 1;
  const W2 = (x, z) => [(x - P.x) * k, (z - P.z) * k];
  if (G.bellowRing > 0) { c.strokeStyle = `rgba(255,255,255,${G.bellowRing})`; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, (1 - G.bellowRing) * 45 * k, 0, TAU); c.stroke(); }
  c.fillStyle = '#ffd23f'; for (const b of bunches) { const [x, z] = W2(b.x, b.z); if (x * x + z * z < ms * ms) { c.beginPath(); c.arc(x, z, 2, 0, TAU); c.fill(); } }
  for (const pk of pickups) if (pk.active) { const [x, z] = W2(pk.x, pk.z); c.fillStyle = POWER[pk.type].css; c.save(); c.translate(x, z); c.rotate(hd + Math.PI / 4); c.fillRect(-3.5, -3.5, 7, 7); c.restore(); }
  { const [x, z] = W2(leo.x, leo.z); c.save(); c.translate(x, z); c.rotate(hd); star(c, 0, 0, 7, G.phase === 'gather' ? '#ffd23f' : '#ffb03f'); c.restore(); }
  if (G.phase !== 'gather') { const [x, z] = W2(exfil.x, exfil.z); c.strokeStyle = '#93e06c'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, z, 7, 0, TAU); c.stroke(); }
  for (const f of farmers) { if (!f.active) continue; const vis = P.recon > 0 || f.state === 'chase' || Math.hypot(f.x - P.x, f.z - P.z) < 15; if (!vis) continue; const [x, z] = W2(f.x, f.z); c.save(); c.translate(x, z); c.rotate(-f.yaw + Math.PI); c.fillStyle = f.state === 'chase' ? '#ee4a2f' : f.aware > 0.4 ? '#f3a632' : '#d9d2c8'; c.beginPath(); c.moveTo(0, -5); c.lineTo(4, 4); c.lineTo(-4, 4); c.closePath(); c.fill(); if (f.foreman) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); } c.restore(); }
  for (const d of dogs) { if (!d.active) continue; const vis = P.recon > 0 || d.state === 'chase' || Math.hypot(d.x - P.x, d.z - P.z) < 15; if (!vis) continue; const [x, z] = W2(d.x, d.z); c.fillStyle = d.state === 'chase' ? '#ee4a2f' : '#c8a27a'; c.beginPath(); c.arc(x, z, 3, 0, TAU); c.fill(); }
  c.restore();
  c.save(); c.translate(mx + ms / 2, my + ms / 2); c.fillStyle = '#8fd4ff'; c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(0, 3); c.lineTo(-5, 6); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(143,212,255,.25)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-ms * 0.35, -ms * 0.5); c.moveTo(0, 0); c.lineTo(ms * 0.35, -ms * 0.5); c.stroke(); c.restore();
  c.strokeStyle = 'rgba(232,235,226,.35)'; c.lineWidth = 1; c.strokeRect(mx - 0.5, my - 0.5, ms + 1, ms + 1);
  c.fillStyle = 'rgba(232,235,226,.7)'; c.font = `600 11px ${MONO}`; c.textAlign = 'left'; c.fillText(`${L.place.toUpperCase()}`, mx, my + ms + 12);
  if (P.recon > 0) { c.fillStyle = '#5fe3f0'; c.textAlign = 'right'; c.fillText('RECON', mx + ms, my + ms + 12); }
  // ---- world markers
  if (obj) {
    const p = proj(obj.x, obj.y, obj.z), dist = Math.round(Math.hypot(obj.x - P.x, obj.z - P.z));
    if (p.on) { c.fillStyle = obj.col; c.beginPath(); c.moveTo(p.x, p.y - 9); c.lineTo(p.x + 7, p.y); c.lineTo(p.x, p.y + 9); c.lineTo(p.x - 7, p.y); c.closePath(); c.fill(); c.font = `700 13px ${FONT}`; c.textAlign = 'center'; c.fillText(`${obj.label}`, p.x, p.y - 20); c.font = `500 12px ${MONO}`; c.fillStyle = '#e8ebe2'; c.fillText(`${dist}m`, p.x, p.y + 20); }
  }
  for (const b of nearestBunches(2)) { const p = proj(b.x, b.y + 0.8, b.z); if (p.on) { c.fillStyle = 'rgba(255,210,63,.85)'; c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.fill(); } }
  for (const pk of pickups) if (pk.active) { const d = Math.hypot(pk.x - P.x, pk.z - P.z); if (d < 35) { const p = proj(pk.x, groundH(pk.x, pk.z) + 2.4, pk.z); if (p.on) { c.globalAlpha = clamp((35 - d) / 10, 0, 1); c.fillStyle = POWER[pk.type].css; c.font = `700 13px ${FONT}`; c.textAlign = 'center'; c.fillText(POWER[pk.type].name, p.x, p.y); c.globalAlpha = 1; } } }
  // threat indicators
  const threats = [...farmers.filter(f => f.active && f.aware > 0.05), ...dogs.filter(d => d.active && d.aware > 0.05 && d.state !== 'flee')];
  for (const f of threats) {
    const isF = f instanceof Farmer, hgt = isF ? (f.foreman ? 2.75 : 2.35) : 1.3;
    const p = proj(f.x, groundH(f.x, f.z) + hgt, f.z), d = Math.hypot(f.x - P.x, f.z - P.z);
    const chase = f.state === 'chase', a = clamp(f.aware, 0, 1);
    if (p.on && d < 70) {
      const s = 9; c.save(); c.translate(p.x, p.y);
      c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.moveTo(0, -s * 1.2); c.lineTo(s, s * 0.6); c.lineTo(-s, s * 0.6); c.closePath(); c.fill();
      c.save(); c.clip(); c.fillStyle = chase ? '#ee4a2f' : '#f3d9a0'; c.fillRect(-s, s * 0.6 - (s * 1.8) * (chase ? 1 : a), s * 2, s * 1.8 * (chase ? 1 : a)); c.restore();
      c.fillStyle = chase ? '#fff' : '#111'; c.font = `800 11px ${FONT}`; c.textAlign = 'center'; c.fillText(chase ? '!' : '?', 0, 0);
      if (isF && (chase || d < 25)) { c.fillStyle = 'rgba(232,235,226,.85)'; c.font = `600 11px ${FONT}`; c.fillText(f.name.toUpperCase(), 0, -s * 1.9); }
      c.restore();
    } else if (!p.on && (chase || a > 0.3) && d < 70) {
      const rb = angDiff(hd, bearingTo(f.x, f.z)), R = Math.min(OW, OH) * 0.32;
      const x = OW / 2 + Math.sin(rb) * R, y = OH / 2 - Math.cos(rb) * R;
      c.save(); c.translate(x, y); c.rotate(rb); c.fillStyle = chase ? 'rgba(238,74,47,.9)' : 'rgba(243,166,50,.85)'; c.beginPath(); c.moveTo(0, -12); c.lineTo(8, 4); c.lineTo(0, 0); c.lineTo(-8, 4); c.closePath(); c.fill(); c.restore();
    }
  }
  // damage arcs
  for (const a of G.dmgArcs) {
    const rb = angDiff(hd, bearingTo(a.x, a.z)), R = 120; c.strokeStyle = `rgba(238,40,20,${Math.min(1, a.t) * 0.85})`; c.lineWidth = 7;
    c.beginPath(); c.arc(OW / 2, OH / 2, R, rb - Math.PI / 2 - 0.28, rb - Math.PI / 2 + 0.28); c.stroke();
  }
  // crosshair
  const spread = 8 + Math.min(14, (P.speed || 0) * 1.6) + (P.biteCool > 0.3 ? 6 : 0);
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 3;
  const X = OW / 2, Y = OH / 2;
  c.beginPath(); c.moveTo(X - spread - 8, Y); c.lineTo(X - spread, Y); c.moveTo(X + spread, Y); c.lineTo(X + spread + 8, Y); c.moveTo(X, Y + spread); c.lineTo(X, Y + spread + 8); c.stroke();
  c.fillStyle = (P.zone || P.frenzy > 0) ? '#5fd0e0' : '#fff'; c.beginPath(); c.arc(X, Y, 1.8, 0, TAU); c.fill(); c.shadowBlur = 0;
  if (G.hitT > 0) { const s = 8 + (0.28 - G.hitT) * 20; c.strokeStyle = G.hitKill ? '#ee4a2f' : '#fff'; c.lineWidth = 2.5; c.beginPath(); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.moveTo(X + dx * s, Y + dy * s); c.lineTo(X + dx * (s + 9), Y + dy * (s + 9)); } c.stroke(); }
  // feed progress ring
  if (P.feedT > 0) { c.strokeStyle = '#ffd23f'; c.lineWidth = 3; c.beginPath(); c.arc(X, Y, 22, -Math.PI / 2, -Math.PI / 2 + TAU * (P.feedT / 0.36)); c.stroke(); }
}
function nearestBunches(n) { if (P.carry >= P.cap || G.phase !== 'gather') return []; return bunches.map(b => [b, Math.hypot(b.x - P.x, b.z - P.z)]).filter(a => a[1] < 70).sort((a, b) => a[1] - b[1]).slice(0, n).map(a => a[0]); }
function objective() {
  if (G.phase === 'gather') return { x: leo.x, y: (rig.type === 'hang' ? rig.cageY : (rig.leoBase.y || groundH(leo.x, leo.z))) + 2.6, z: leo.z, col: P.carry > 0 ? '#ffd23f' : 'rgba(255,210,63,.55)', label: P.carry > 0 ? (rig.type === 'hang' ? 'TOSS' : 'FEED') : 'LEOPARD' };
  if (G.phase === 'escape') return { x: exfil.x, y: exfil.y + 3, z: exfil.z, col: '#93e06c', label: 'EXFIL' };
  return null;
}

// ---------- rain & ambience ----------
let rain = null;
function initRain() {
  if (rain) { scene.remove(rain.mesh); rain.mesh.geometry.dispose(); rain = null; }
  if (!L.sky.rain) return;
  const n = RQ.quality === 'low' ? 1500 : 4000, pos = new Float32Array(n * 6), drops = [];
  for (let i = 0; i < n; i++) drops.push({ x: rand(-40, 40), y: rand(0, 30), z: rand(-40, 40), v: rand(24, 32) });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9fb2c8, transparent: true, opacity: 0.38 })); mesh.frustumCulled = false; scene.add(mesh);
  rain = { mesh, drops, pos };
}
function updateRain(dt) {
  if (!rain) return; const cp = camera.position, p = rain.pos;
  rain.drops.forEach((d, i) => {
    d.y -= d.v * dt; if (d.y < -2) { d.y = rand(22, 30); d.x = rand(-40, 40); d.z = rand(-40, 40); }
    const x = cp.x + d.x, z = cp.z + d.z, y = cp.y + d.y - 8;
    p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z; p[i * 6 + 3] = x + 0.08; p[i * 6 + 4] = y + 0.7; p[i * 6 + 5] = z + 0.05;
  });
  rain.mesh.geometry.attributes.position.needsUpdate = true;
}

// ---------- world simulation tick ----------
function updateWorld(dt, live) {
  G.t += live ? dt : 0;
  for (const f of farmers) f.update(dt);
  for (const d of dogs) d.update(dt);
  farmers = farmers.filter(f => !f.removed); dogs = dogs.filter(d => !d.removed);
  for (let i = 0; i < farmers.length; i++) for (let j = i + 1; j < farmers.length; j++) {
    const a = farmers[i], b = farmers[j]; if (!a.active || !b.active) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r;
    if (d < m && d > 0.001) { const p = (m - d) / 2; a.x -= dx / d * p; a.z -= dz / d * p; b.x += dx / d * p; b.z += dz / d * p; }
  }
  if (P.alive) for (const f of farmers) if (f.active) { const dx = f.x - P.x, dz = f.z - P.z, d = Math.hypot(dx, dz), m = f.r + 0.95; if (d < m && d > 0.001) { f.x += dx / d * (m - d); f.z += dz / d * (m - d); } }
  updateLeopard(dt);
  const t = G.rt;
  for (const b of bunches) { b.m.rotation.z = Math.sin(t * 1.3 + b.ph) * 0.06; }
  for (const pk of pickups) {
    if (!pk.active) { pk.respawn -= dt; if (pk.respawn <= 0) { const type = pick(L.power); worldRoot.remove(pk.g); const np = makePickup(type, pk.x, pk.z); Object.assign(pk, np); } continue; }
    pk.t += dt; pk.holder.position.y = 1.3 + Math.sin(pk.t * 2) * 0.18; pk.holder.rotation.y = pk.t * 1.6; pk.ring.scale.setScalar(1 + Math.sin(pk.t * 3) * 0.08); pk.beam.material.opacity = 0.1 + Math.sin(pk.t * 2.5) * 0.04;
  }
  for (const h of hats) {
    h.t += dt; if (h.y > 0.06 || h.vy > 0) { h.vy -= 9.8 * dt; h.x += h.vx * dt; h.z += h.vz * dt; h.y += h.vy * dt; const gy = Math.max(groundH(h.x, h.z), 0.04); if (h.y < gy) { h.y = gy; h.vy = 0; h.vx *= 0.2; h.vz *= 0.2; h.landed = gy; } }
    if (h.landed !== undefined && groundH(h.x, h.z) < 0) { h.y = 0.04 + Math.sin(h.t * 2) * 0.03; const w = L.water.find(w => w.type === 'river'); if (w) { if (w.axis === 'z') h.z += dt * 0.6; else h.x += dt * 0.6; } }
    h.m.position.set(h.x, h.y, h.z); h.m.rotation.set(h.landed !== undefined ? Math.sin(h.t) * 0.08 : h.t * h.spin * 0.3, h.t * (h.landed !== undefined ? 0.2 : h.spin), 0);
  }
  if (!live) return;
  G.bunchT -= dt; if (G.bunchT <= 0) { G.bunchT = 5; if (bunches.length < 22) spawnBunch(); }
  G.spawnT -= dt; const base = Math.max(3, L.enemies.farmers + DIFF[G.diff].extra);
  if (G.spawnT <= 0) { G.spawnT = 28; if (farmers.filter(f => f.active).length < Math.ceil(base * 0.6)) spawnFarmer(); }
  G.dmgArcs.forEach(a => a.t -= dt); G.dmgArcs = G.dmgArcs.filter(a => a.t > 0);
  G.hitT -= dt; if (G.bellowRing > 0) G.bellowRing = Math.max(0, G.bellowRing - dt * 0.6);
  if (G.phase !== 'gather' && Math.random() < dt * 14) PT.spawn({ x: exfil.x + rand(-0.4, 0.4), y: exfil.y + 0.3, z: exfil.z + rand(-0.4, 0.4), vx: rand(-0.3, 0.3) + 0.6, vy: rand(2, 3.4), vz: rand(-0.3, 0.3), s: rand(0.5, 0.9), c: pick([0x6fdc5a, 0x8ee67a, 0x5ac84a]), life: rand(3, 4.5), g: 0.25, grow: 4, drag: 0.2, op: 0.42 });
}

// ---------- camera & render ----------
function updateCamera(rdt) {
  if (G.killcam || G.cine) { P.fovK = 0; if (camera.fov !== G.settings.fov) { camera.fov = G.settings.fov; camera.updateProjectionMatrix(); } return; }
  if (G.state === 'menu' || G.state === 'brief' || G.state === 'end') {
    if (P.fovK || camera.fov !== G.settings.fov) { P.fovK = 0; camera.fov = G.settings.fov; camera.updateProjectionMatrix(); }
    const a = G.rt * 0.05, cx = L.captive.x, cz = L.captive.z;
    camera.position.set(cx + Math.cos(a) * 34, Math.max(groundH(cx + Math.cos(a) * 34, cz + Math.sin(a) * 34), 0) + 9, cz + Math.sin(a) * 34);
    camera.lookAt(cx, 2, cz); return;
  }
  G.shake = Math.max(0, G.shake - rdt * 2.5);
  const sh = G.shake * G.shake * 0.12, bob = P.inWater ? 0 : Math.sin(P.stepPh * TAU) * Math.min(1, (P.speed || 0) / 6) * 0.07;
  camera.position.set(P.x + rand(-sh, sh), P.y + bob + rand(-sh, sh), P.z + rand(-sh, sh));
  P.hitTilt = (P.hitTilt || 0) * Math.exp(-6 * rdt);
  camera.rotation.set(P.pitch, P.yaw, (P.inWater ? Math.sin(G.rt * 1.3) * 0.015 : 0) + P.hitTilt);
  P.fovK = lerp(P.fovK || 0, P.sprinting ? 1 : 0, 1 - Math.exp(-(P.sprinting ? 7 : 4) * rdt));
  const fv = G.settings.fov + P.fovK * 10; if (Math.abs(camera.fov - fv) > 0.01) { camera.fov = fv; camera.updateProjectionMatrix(); }
}
function updateViewmodel(rdt) {
  const h = VM.head, jt = P.jawT || 1;
  let open = jt < 0.09 ? jt / 0.09 : jt < 0.17 ? 1 - (jt - 0.09) / 0.08 : 0;
  if (P.feedT > 0 || (leo && leo.state === 'captive' && act('feed') && P.canFeed && P.carry > 0)) open = Math.max(open, 0.35 + Math.sin(G.rt * 14) * 0.15);
  h.setOpen(open * 1.0);
  P.swayX = lerp(P.swayX || 0, 0, 1 - Math.exp(-8 * rdt)); P.swayY = lerp(P.swayY || 0, 0, 1 - Math.exp(-8 * rdt));
  const sp = Math.min(1, (P.speed || 0) / 7), ph = P.stepPh * TAU;
  VM.pivot.position.set(Math.sin(ph / 2) * 0.05 * sp + P.swayX, -Math.abs(Math.cos(ph / 2)) * 0.05 * sp + P.swayY + (P.inWater ? Math.sin(G.rt * 1.7) * 0.03 - 0.05 : 0), -open * 0.25);
  VM.pivot.rotation.set(0.06 - open * 0.25 + (P.sprinting ? 0.08 : 0), 0, Math.sin(ph / 2) * 0.02 * sp);
  VM.bunch.visible = P.carry > 0; VM.bunch.scale.setScalar(0.45 + Math.min(P.carry, 6) * 0.05);
  vmCam.fov = 60; vmCam.updateProjectionMatrix();
}
function updateLights(rdt) {
  const cp = camera.position, sd = skyMat.uniforms.sunDir.value;
  sun.position.set(cp.x + sd.x * 120, sd.y * 120 + 20, cp.z + sd.z * 120); sun.target.position.set(cp.x, 0, cp.z);
  sky.position.copy(cp);
  skyMat.uniforms.time.value = G.rt; waterMat.uniforms.time.value = G.rt;
  if (L.enemies.lanterns) {
    const lit = farmers.filter(f => f.active && f.m.lantern).map(f => [f, Math.hypot(f.x - cp.x, f.z - cp.z)]).sort((a, b) => a[1] - b[1]);
    LANTERNS.forEach((l, i) => { const e = lit[i]; if (e && e[1] < 70) { e[0].m.lantern.getWorldPosition(l.position); l.intensity = 2.2 + Math.sin(G.rt * 13 + i) * 0.25 + Math.sin(G.rt * 7.3 + i * 2) * 0.2; } else l.intensity = 0; });
  } else LANTERNS.forEach(l => l.intensity = 0);
  // lightning
  if (L.sky.rain) {
    G.lightT -= rdt;
    if (G.lightT <= 0) { G.lightT = rand(9, 22); G.flash = 1; setTimeout(() => SFX.thunder(), rand(400, 2200)); }
  }
  G.flash = Math.max(0, G.flash - rdt * 2.2);
  const fl = G.flash > 0 ? G.flash * (0.6 + Math.random() * 0.4) : 0;
  skyMat.uniforms.flash.value = fl; hemi.intensity = (hemi.userData.base || 0.6) + fl * 1.8;
  compMat.uniforms.flash.value = Math.max(compMat.uniforms.flash.value * Math.exp(-rdt * 5), fl * 0.08);
  compMat.uniforms.time.value = G.rt;
  compMat.uniforms.dmg.value = P.alive && G.state === 'playing' ? clamp((60 - P.hp) / 60, 0, 1) * 0.9 : 0;
  compMat.uniforms.slowmo.value = lerp(compMat.uniforms.slowmo.value, G.killcam ? 1 : 0, 1 - Math.exp(-8 * rdt));
  const tgt = L.sky.expo; G.fade = Math.min(1, G.fade + rdt * 0.5); compMat.uniforms.expo.value = tgt * smooth(G.fade);
  if (P.camo > 0) compMat.uniforms.tint.value.set(0.25, 0.18, 0.08, 0.5); else if (P.frenzy > 0) compMat.uniforms.tint.value.set(0.4, 0.1, 0.6, 0.4); else compMat.uniforms.tint.value.set(0, 0, 0, 0);
}
function audioTick(rdt) {
  if (!AU.ctx) return;
  AU.listener.x = camera.position.x; AU.listener.z = camera.position.z; AU.listener.yaw = G.killcam || G.cine ? Math.atan2(-(camera.getWorldDirection(_wq).x), -_wq.z) : P.yaw;
  const chasing = farmers.filter(f => f.active && f.state === 'chase').length + dogs.filter(d => d.active && d.state === 'chase').length;
  const wd = waterDist(camera.position.x, camera.position.z);
  const playing = G.state === 'playing';
  let saw = null, sawRev = false; for (const f of farmers) if (f.active && f.tool === 'chainsaw') { saw = f; sawRev = f.revving; }
  AU.update(rdt, { wind: L.sky.rain ? 0.12 : 0.06, water: clamp((30 - wd) / 30, 0, 1) * 0.07, rain: L.sky.rain || 0, tension: playing && P.alive ? clamp(chasing / 3, 0, 1) : 0, saw: playing ? saw : null, sawRev });
  G.ambT -= rdt;
  if (G.ambT <= 0) { G.ambT = rand(2, 6); const a = rand(0, TAU), pos = { x: camera.position.x + Math.cos(a) * 20, z: camera.position.z + Math.sin(a) * 20 }; if (L.sky.night) SFX.cricket(); else SFX.bird(pos); }
}

// ---------- key rebinding ----------
let rebinding = null;
function renderBinds() {
  const html = ACTIONS.map(([a, label]) => `<div class="bind"><span>${label}</span><button class="kbtn${rebinding === a ? ' wait' : ''}" data-a="${a}">${rebinding === a ? 'Press a key' : kn(a)}</button><span class="alt">${BIND[a][1] ? keyName(BIND[a][1]) : ''}</span></div>`).join('') + `<div class="bind foot"><button class="ghost" data-reset="1">Reset to defaults</button><span class="note">Click a key, then press the new key or mouse button. Esc cancels.</span></div>`;
  for (const id of ['binds', 'binds2']) { const el = $(id); if (!el) continue; el.innerHTML = html;
    el.querySelectorAll('.kbtn').forEach(b => b.onclick = ev => { ev.stopPropagation(); if (rebinding) return; SFX.ui(); rebinding = b.dataset.a; setTimeout(renderBinds, 0); });
    el.querySelector('[data-reset]').onclick = () => { SFX.ui(); resetBinds(); saveProgress(); renderBinds(); }; }
}
function finishRebind(code) {
  const a = rebinding; rebinding = null; if (!a) return;
  if (code && !/^Mouse[34]$/.test(code)) {
    for (const o in BIND) { if (o === a) continue; if (BIND[o][0] === code) BIND[o][0] = BIND[a][0]; if (BIND[o][1] === code) BIND[o][1] = null; }
    if (BIND[a][1] === code) BIND[a][1] = null; BIND[a][0] = code; SFX.ui(); saveProgress();
  }
  for (const k in keys) keys[k] = false; mouseDown = false; renderBinds();
}

// ---------- menus ----------
function refreshMissionList() {
  $('mlist').innerHTML = LEVELS.map((lv, i) => { const pr = G.progress[lv.id]; return `<button class="mcard${i === G.li ? ' sel' : ''}" data-i="${i}"><span class="n">0${lv.id}</span><span><span class="nm">${lv.op}</span><div class="loc">${lv.place} · ${lv.captiveLine}</div></span><span class="st">${pr && pr.done ? 'COMPLETE<br>' + pr.best : lv.clock}</span></button>`; }).join('');
  $('mlist').querySelectorAll('.mcard').forEach(b => b.onclick = () => { SFX.ui(); const i = +b.dataset.i; if (i !== G.li) { G.li = i; loadLevel(i); } refreshMissionList(); });
}
function showScreen(id) { ['menu', 'brief', 'pause', 'end', 'clicklock'].forEach(s => $(s).hidden = s !== id); }
function openBrief() {
  G.state = 'brief'; showScreen('brief');
  $('br-eye').textContent = `MISSION 0${L.id} · ${L.clock} · ${DIFF[G.diff].label.toUpperCase()}`;
  $('br-title').textContent = L.op;
  $('br-text').innerHTML = `<h3>${L.place}</h3>` + L.brief.map(p => `<p>${p}</p>`).join('');
  $('br-intel').innerHTML = L.intel.map(([a, b]) => `<div><b>${a.toUpperCase()}</b><span>${b}</span></div>`).join('') ;
  const cv = $('mapcv'); drawMap(cv.getContext('2d'), cv.width, { brief: true });
}
function deploy() {
  AU.init(); AU.setVolume(G.settings.vol); showScreen(null); requestLock();
  startMission(G.li);
}
function requestLock() {
  const el = $('game');
  if (!el.requestPointerLock) { G.noLock = true; return; }
  const fail = () => { if (!G.noLock && G.state === 'playing' && !document.pointerLockElement) { G.state = 'paused'; showScreen('clicklock'); if (AU.ctx) AU.ctx.suspend(); } };
  try { const r = el.requestPointerLock(); if (r && r.catch) r.catch(fail); } catch (e) { fail(); }
}
function pauseGame() { if (G.state !== 'playing') return; G.state = 'paused'; showScreen('pause'); if (AU.ctx) AU.ctx.suspend(); }
function resumeGame() { showScreen(null); G.state = 'playing'; if (AU.ctx) AU.ctx.resume(); requestLock(); }
function toMenu() { G.state = 'menu'; showScreen('menu'); $('hud').classList.add('off'); P.alive = false; HIPPO.g.visible = false; if (AU.ctx) AU.ctx.resume(); refreshMissionList(); G.cine = null; G.killcam = null; $('kcam').style.display = 'none'; $('lb-top').classList.remove('on'); $('lb-bot').classList.remove('on'); }
function bindUI() {
  refreshMissionList();
  $('diffseg').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.d === G.diff); b.onclick = () => { SFX.ui(); G.diff = b.dataset.d; $('diffseg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('diffnote').textContent = DIFF[G.diff].note; }; });
  $('diffnote').textContent = DIFF[G.diff].note; renderBinds();
  const rng = (id, out, key, fmt, apply) => { const el = $(id); el.value = G.settings[key]; $(out).textContent = fmt(G.settings[key]); el.oninput = () => { G.settings[key] = +el.value; $(out).textContent = fmt(+el.value); apply && apply(+el.value); saveProgress(); }; };
  rng('s-sens', 'o-sens', 'sens', v => v.toFixed(2), v => { $('s-sens2').value = v; $('o-sens2').textContent = v.toFixed(2); });
  rng('s-sens2', 'o-sens2', 'sens', v => v.toFixed(2), v => { $('s-sens').value = v; $('o-sens').textContent = v.toFixed(2); });
  rng('s-vol', 'o-vol', 'vol', v => Math.round(v * 100), v => AU.setVolume(v));
  rng('s-fov', 'o-fov', 'fov', v => String(v), v => { camera.fov = v; camera.updateProjectionMatrix(); });
  camera.fov = G.settings.fov; camera.updateProjectionMatrix();
  $('qseg').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.q === RQ.quality); b.onclick = () => { SFX.ui(); RQ.quality = b.dataset.q; $('qseg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); resizeAll(); loadLevel(G.li); }; });
  $('kseg').querySelectorAll('button').forEach(b => { b.classList.toggle('on', (b.dataset.k === '1') === G.settings.killcam); b.onclick = () => { SFX.ui(); G.settings.killcam = b.dataset.k === '1'; $('kseg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); saveProgress(); }; });
  $('b-brief').onclick = () => { SFX.ui(); AU.init(); AU.setVolume(G.settings.vol); openBrief(); };
  $('b-back').onclick = () => { SFX.ui(); G.state = 'menu'; showScreen('menu'); };
  $('b-deploy').onclick = () => { SFX.ui(); deploy(); };
  $('b-resume').onclick = () => resumeGame();
  $('b-restart').onclick = () => { showScreen(null); if (AU.ctx) AU.ctx.resume(); requestLock(); startMission(G.li); };
  $('b-quit').onclick = () => { loadLevel(G.li); toMenu(); };
  $('b-retry').onclick = () => { showScreen(null); requestLock(); startMission(G.li); };
  $('b-next').onclick = () => { G.li = Math.min(LEVELS.length - 1, G.li + 1); loadLevel(G.li); openBrief(); };
  $('b-menu').onclick = () => { loadLevel(G.li); toMenu(); };
  $('clicklock').onclick = () => { showScreen(null); G.state = 'playing'; if (AU.ctx) AU.ctx.resume(); requestLock(); };
  if (matchMedia('(pointer: coarse)').matches) $('touchnote').textContent = 'Keyboard and mouse required.';
}

// ---------- input ----------
addEventListener('keydown', e => {
  if (rebinding) { e.preventDefault(); e.stopPropagation(); finishRebind(e.code === 'Escape' ? null : e.code); return; }
  if (G.state === 'playing' && Object.values(BIND).some(b => b[0] === e.code) && e.code !== 'Escape') e.preventDefault();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && G.state === 'playing') e.preventDefault();
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (G.state === 'playing') {
    if (isAct('sneak', e.code)) { P.sneak = !P.sneak; }
    if (isAct('mute', e.code)) { const m = AU.toggleMute(); notify(m ? 'Sound off' : 'Sound on', ''); }
    if (e.code === 'Escape' && (G.noLock || !document.pointerLockElement)) pauseGame();
  } else if (G.state === 'paused' && e.code === 'Escape') { if (!$('clicklock').hidden) showScreen('pause'); else resumeGame(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; if (rebinding) finishRebind(null); if (G.state === 'playing' && !G.cine && !G.killcam) pauseGame(); });
$('game').addEventListener('mousedown', e => {
  if (G.state !== 'playing') return;
  if (!document.pointerLockElement && !G.noLock) { requestLock(); return; }
  keys['Mouse' + e.button] = true; if (e.button === 0) mouseDown = true;
  const mc = 'Mouse' + e.button; if (isAct('sneak', mc)) P.sneak = !P.sneak; if (isAct('mute', mc)) { const m = AU.toggleMute(); notify(m ? 'Sound off' : 'Sound on', ''); }
});
let swallowClick = false, swallowCtx = false;
addEventListener('contextmenu', e => { if (swallowCtx || rebinding) { swallowCtx = false; e.preventDefault(); } }, true);
addEventListener('mousedown', e => { if (!rebinding) return; e.preventDefault(); e.stopPropagation(); swallowClick = e.button === 0; if (e.button === 2) swallowCtx = true; finishRebind(e.target.closest && e.target.closest('.kbtn.wait') ? 'Mouse' + e.button : null); }, true);
addEventListener('click', e => { if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); } }, true);
addEventListener('auxclick', e => { if (e.button > 2) e.preventDefault(); });
addEventListener('mouseup', e => { if (e.button > 2 && G.state === 'playing') e.preventDefault(); keys['Mouse' + e.button] = false; if (e.button === 0) mouseDown = false; });
$('game').addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (G.state !== 'playing' || G.killcam || G.cine || !P.alive) return;
  if (!document.pointerLockElement && !G.noLock) return;
  const s = 0.0022 * G.settings.sens;
  P.yaw -= e.movementX * s; P.pitch = clamp(P.pitch - e.movementY * s, -1.25, 1.2);
  P.swayX = clamp((P.swayX || 0) - e.movementX * 0.00025, -0.06, 0.06); P.swayY = clamp((P.swayY || 0) + e.movementY * 0.00025, -0.05, 0.05);
});
document.addEventListener('pointerlockchange', () => {
  const locked = !!document.pointerLockElement; G.locked = locked;
  if (locked) G.noLock = false;
  if (!locked && G.state === 'playing' && !G.noLock) pauseGame();
});
document.addEventListener('pointerlockerror', () => { if (!G.noLock && G.state === 'playing') { G.state = 'paused'; showScreen('clicklock'); if (AU.ctx) AU.ctx.suspend(); } });
addEventListener('resize', resizeAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

// ---------- main loop ----------
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, Math.max(0.0005, (now - lastT) / 1000)); lastT = now;
  tick(rdt, true);
}
function tick(rdt, render) {
  G.rt += rdt;
  let wdt = rdt;
  if (G.killcam) wdt *= 0.22; else if (G.cine && G.cine.slow) wdt *= G.cine.slow;
  const live = G.state === 'playing';
  if (G.state !== 'paused') {
    if (live && P.alive && !G.killcam && !G.cine) updatePlayer(wdt);
    updateWorld(wdt, live && !G.cine);
    if (G.killcam) updateKillcam(rdt);
    if (G.cine && G.state !== 'end') updateCine(rdt);
    PT.update(wdt);
  }
  updateCamera(rdt); updateLights(rdt); updateRain(wdt);
  const showVM = live && P.alive && !G.killcam && !G.cine;
  if (showVM) updateViewmodel(rdt);
  if (live && !G.killcam && !G.cine) updateHUD();
  audioTick(rdt);
  if (!render) return;
  renderFrame(showVM);
  drawOverlay(rdt);
}
function boot() {
  resizeAll(); bindUI(); loadLevel(0); showScreen('menu');
  requestAnimationFrame(frame);
  window.__hh = { G, P, LEVELS, VM, HIPPO, scene, camera, worldRoot, vmScene, vmCam, PT, get farmers() { return farmers; }, get dogs() { return dogs; }, get leo() { return leo; }, get rig() { return rig; }, startMission, loadLevel, feedOne, step: (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt, false); }, damagePlayer, applyPower, get pickups() { return pickups; }, get bunches() { return bunches; }, startWin, bellow, eat, bite, startBreak, waterPoint, groundH, waterDist, exfil: () => exfil, keys, BIND, act };
}
boot();
