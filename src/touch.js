// ================= TOUCH: on-screen controls for phones and tablets =================
// Left thumb: floating analog stick (appears where you touch). Right side: drag to look, plus action buttons.
// Buttons feed TKEYS (read by act()), the stick feeds TSTICK (read by updatePlayer); nothing here touches game rules.
const TC = { stick: null, look: {}, btn: {}, on: false, shown: false };
const STICK_R = 52, LOOK_K = 0.0052;
function touchUI() {
  document.body.classList.add('touch');
  $('touchnote').textContent = 'Touch controls: left thumb moves, drag the right side to look. Play in landscape.';
  const n = document.querySelector('#ctlpanel .note'); if (n) n.textContent = 'On-screen controls on touch devices. Keys apply to a keyboard.';
  if (TC.on) return; TC.on = true;
  const L = $('touch');
  L.addEventListener('touchstart', tStart, { passive: false });
  L.addEventListener('touchmove', tMove, { passive: false });
  L.addEventListener('touchend', tEnd, { passive: false });
  L.addEventListener('touchcancel', tEnd, { passive: false });
  addEventListener('blur', tReset);
  requestAnimationFrame(tFrame);
}
// a touchscreen laptop reports a fine pointer; switch to touch controls the first time the screen is touched
addEventListener('touchstart', () => { if (!G.touch) { G.touch = true; G.noLock = true; if (document.pointerLockElement) document.exitPointerLock(); touchUI(); renderBinds(); } }, { passive: true, capture: true });
function goFull() {
  const d = document.documentElement, rf = d.requestFullscreen || d.webkitRequestFullscreen;
  if (!rf || document.fullscreenElement || document.webkitFullscreenElement) return;
  try { const r = rf.call(d, { navigationUI: 'hide' }); if (r && r.then) r.then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { }); } catch (e) { }
}
function tReset() {
  for (const a in TKEYS) TKEYS[a] = false; TSTICK.x = TSTICK.y = 0; TC.stick = null; TC.look = {}; TC.btn = {};
  $('tstick').style.display = 'none'; document.querySelectorAll('.tbtn.dn').forEach(b => b.classList.remove('dn'));
}
function tStart(e) {
  e.preventDefault();
  if (G.state !== 'playing') return;
  for (const t of e.changedTouches) {
    const b = t.target.closest && t.target.closest('[data-t]');
    if (b) {
      const a = b.dataset.t; b.classList.add('dn');
      if (a === 'pause') { tReset(); pauseGame(); return; }
      if (a === 'sneak') { P.sneak = !P.sneak; if (navigator.vibrate) navigator.vibrate(8); }
      else { TKEYS[a] = true; TC.btn[t.identifier] = { a, el: b }; }
      continue;
    }
    if (!TC.stick && t.clientX < innerWidth * 0.42) {
      TC.stick = { id: t.identifier, ox: t.clientX, oy: t.clientY };
      const s = $('tstick'); s.style.display = 'block'; s.style.left = t.clientX + 'px'; s.style.top = t.clientY + 'px'; $('tknob').style.transform = 'translate(-50%,-50%)';
    } else TC.look[t.identifier] = { x: t.clientX, y: t.clientY };
  }
}
function tMove(e) {
  e.preventDefault();
  if (G.state !== 'playing') return;
  for (const t of e.changedTouches) {
    const S = TC.stick;
    if (S && t.identifier === S.id) {
      let dx = t.clientX - S.ox, dy = t.clientY - S.oy; const d = Math.hypot(dx, dy);
      if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
      $('tknob').style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
      const m = Math.min(1, d / STICK_R), dz = 0.14, k = m < dz ? 0 : (m - dz) / (1 - dz) / (m || 1);
      TSTICK.x = dx / STICK_R * k; TSTICK.y = -dy / STICK_R * k;
      continue;
    }
    const l = TC.look[t.identifier]; if (!l) continue;
    const mx = t.clientX - l.x, my = t.clientY - l.y; l.x = t.clientX; l.y = t.clientY;
    if (G.killcam || G.cine || !P.alive) continue;
    const s = LOOK_K * G.settings.sens;
    P.yaw -= mx * s; P.pitch = clamp(P.pitch - my * s, -1.25, 1.2);
    P.swayX = clamp((P.swayX || 0) - mx * 0.0003, -0.06, 0.06); P.swayY = clamp((P.swayY || 0) + my * 0.0003, -0.05, 0.05);
  }
}
function tEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (TC.stick && t.identifier === TC.stick.id) { TC.stick = null; TSTICK.x = TSTICK.y = 0; $('tstick').style.display = 'none'; }
    const b = TC.btn[t.identifier]; if (b) { TKEYS[b.a] = Object.values(TC.btn).some(o => o !== b && o.a === b.a); b.el.classList.remove('dn'); delete TC.btn[t.identifier]; }
    delete TC.look[t.identifier];
  }
}
// show the controls only while the player is in control, and reflect sneak / feed / bellow state on the buttons
function tFrame() {
  requestAnimationFrame(tFrame);
  const show = G.state === 'playing' && P.alive && !G.killcam && !G.cine;
  if (show !== TC.shown) { TC.shown = show; $('touch').hidden = !show; document.body.classList.toggle('tplay', show); if (!show) tReset(); }
  if (!show) return;
  $('tb-sneak').classList.toggle('on', !!P.sneak);
  $('tb-feed').classList.toggle('ready', !!(P.canFeed && P.carry > 0));
  $('tb-bellow').classList.toggle('cool', P.bellowCool > 0);
  $('tb-burst').classList.toggle('cool', !!P.winded);
}
