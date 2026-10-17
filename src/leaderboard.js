// ================= LEADERBOARD: online high scores (Cloudflare Worker + D1, see leaderboard/) =================
// One board per mission; difficulty is a column you can filter and sort by. Only completed missions are posted.
// LB_API is the deployed Worker URL. Empty hides every leaderboard control. ?lb=<url> overrides it for testing.
const LB_API = (new URLSearchParams(location.search).get('lb') || '').replace(/\/$/, '') || '';
const LB = { mission: 1, diff: 'all', sort: 'score', dir: -1, rows: [], prev: 'menu', reqId: 0 };
const lbFetch = (path, opt) => fetch(LB_API + path, opt).then(r => r.json().then(j => { if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j; }));
const lbPost = (path, data) => lbFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

function lbInit() {
  if (!LB_API) return;
  $('b-board').hidden = false; $('b-board2').hidden = false;
  $('b-board').onclick = () => { SFX.ui(); openBoard(L.id, 'menu'); };
  $('b-board2').onclick = () => { SFX.ui(); openBoard(L.id, 'end'); };
  $('lb-back').onclick = () => { SFX.ui(); if (LB.prev === 'end') { G.state = 'end'; showScreen('end'); } else { G.state = 'menu'; showScreen('menu'); } };
  $('lb-mis').innerHTML = LEVELS.map(lv => `<button data-m="${lv.id}">0${lv.id} ${lv.op}</button>`).join('');
  $('lb-mis').querySelectorAll('button').forEach(b => b.onclick = () => { SFX.ui(); LB.mission = +b.dataset.m; loadBoard(); });
  $('lb-dif').innerHTML = ['all', ...Object.keys(DIFF)].map(d => `<button data-d="${d}">${d === 'all' ? 'All' : DIFF[d].label}</button>`).join('');
  $('lb-dif').querySelectorAll('button').forEach(b => b.onclick = () => { SFX.ui(); LB.diff = b.dataset.d; loadBoard(); });
  $('lb-tab').querySelectorAll('th[data-s]').forEach(th => th.onclick = () => { const s = th.dataset.s; if (LB.sort === s) LB.dir = -LB.dir; else { LB.sort = s; LB.dir = s === 'name' || s === 'time' || s === 'rank' ? 1 : -1; } renderBoard(); });
  $('lb-send').onclick = lbSubmit;
  $('lb-name').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') lbSubmit(); });
  try { $('lb-name').value = localStorage.getItem('hh-name') || ''; } catch (e) { }
}
// called by startMission: the server hands out a run id that the score is later posted against
function lbStartRun() {
  G.lbRun = null; if (!LB_API) return;
  const run = G.runId;
  lbPost('/run', { mission: L.id, difficulty: G.diff }).then(j => { if (G.runId === run) G.lbRun = j.run; }).catch(() => { });
}
// called by endMission
function lbEnd(win) {
  const box = $('lbsub'); box.hidden = !(LB_API && win);
  if (box.hidden) return;
  $('lb-send').disabled = false; $('lb-name').disabled = false;
  $('lb-msg').textContent = G.lbRun ? 'Post your score to the leaderboard.' : 'Offline when the mission started, so this score cannot be posted.';
  if (!G.lbRun) { $('lb-send').disabled = true; $('lb-name').disabled = true; }
}
function lbSubmit() {
  if (!G.lbRun || $('lb-send').disabled) return;
  const name = $('lb-name').value.trim(); try { localStorage.setItem('hh-name', name); } catch (e) { }
  const st = G.stats, stats = {}; for (const k of ['eaten', 'fed', 'ko', 'dogs', 'spotted', 'power', 'bananas']) stats[k] = st[k] | 0;
  $('lb-send').disabled = true; $('lb-msg').textContent = 'Posting...';
  const run = G.lbRun;
  lbPost('/scores', { run, name, score: G.score, time: Math.floor(G.t), stats })
    .then(j => { G.lbRun = null; $('lb-name').disabled = true; $('lb-msg').textContent = `Posted as ${j.name}. Rank ${j.rank} on ${L.op}.`; })
    .catch(e => { $('lb-send').disabled = false; $('lb-msg').textContent = 'Could not post: ' + e.message; });
}
function openBoard(mission, prev) {
  LB.prev = prev; LB.mission = mission || 1; G.state = prev === 'end' ? 'end' : 'menu';
  showScreen('board'); loadBoard();
}
function loadBoard() {
  $('lb-mis').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.m === LB.mission));
  $('lb-dif').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.d === LB.diff));
  $('lb-note').textContent = 'Loading...'; LB.rows = []; renderBoard();
  const id = ++LB.reqId;
  lbFetch(`/scores?mission=${LB.mission}&difficulty=${LB.diff}&limit=100`)
    .then(j => { if (id !== LB.reqId) return; LB.rows = j.scores.map((r, i) => ({ ...r, rank: i + 1 })); $('lb-note').textContent = LB.rows.length ? `Top ${LB.rows.length}. Tap a column to sort.` : 'No scores yet. Be the first.'; renderBoard(); })
    .catch(e => { if (id === LB.reqId) $('lb-note').textContent = 'Could not load the leaderboard: ' + e.message; });
}
function renderBoard() {
  const k = LB.sort, dir = LB.dir, order = Object.keys(DIFF);
  const val = r => k === 'difficulty' ? order.indexOf(r.difficulty) : k === 'name' ? r.name.toLowerCase() : r[k];
  const rows = LB.rows.slice().sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : a.rank - b.rank) * (x === y ? 1 : dir); });
  $('lb-tab').querySelectorAll('th[data-s]').forEach(th => th.className = th.dataset.s === k ? (dir > 0 ? 'asc' : 'desc') : '');
  const tb = $('lb-tab').tBodies[0]; tb.textContent = '';
  for (const r of rows) {
    const tr = tb.insertRow(), t = r.time | 0;
    [r.rank, r.name, r.score, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, (DIFF[r.difficulty] || {}).label || r.difficulty, new Date(r.at).toLocaleDateString()]
      .forEach(v => { tr.insertCell().textContent = v; }); // textContent: player names are never parsed as HTML
  }
}
