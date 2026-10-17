// Hippo Heist leaderboard: a Cloudflare Worker backed by a D1 database (binding DB).
//
//   POST /run     {mission, difficulty}                    -> {run}        called when a mission starts
//   POST /scores  {run, name, score, time, stats}          -> {ok, rank}   called when a mission is won
//   GET  /scores?mission=1[&difficulty=regular][&limit=100] -> {scores:[...]}
//
// The score is computed in the player's browser, so no check here can make cheating impossible.
// These checks make it harder: a score needs a run started on this server, each run posts once,
// the reported mission time cannot beat the real time since the run started, the score must be
// plausible for that time, the leopard must actually have been fed, and each address is rate limited.

const MISSIONS = { 1: { need: 16 }, 2: { need: 18 }, 3: { need: 20 } }; // bananas the leopard needs (src/levels.js)
const DIFFS = ['recruit', 'regular', 'hardened', 'veteran'];
const NAME_MAX = 24;
const MIN_TIME = 60, MAX_TIME = 3 * 3600;          // seconds a winning run can take
const scoreCap = t => 3000 + 25 * t;                 // generous ceiling on points for a run of t seconds
const RUNS_PER_HOUR = 60, SCORES_PER_HOUR = 20;      // per address
const STAT_KEYS = ['eaten', 'fed', 'ko', 'dogs', 'spotted', 'power', 'bananas'];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors, ...extra } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    // browsers always send Origin on cross-site POSTs; refuse writes from sites that are not the game
    if (req.method === 'POST' && !allowed.includes(origin)) return json({ error: 'origin not allowed' }, 403);
    try {
      if (url.pathname === '/run' && req.method === 'POST') return json(await startRun(req, env));
      if (url.pathname === '/scores' && req.method === 'POST') return json(await postScore(req, env));
      if (url.pathname === '/scores' && req.method === 'GET') return json(await getScores(url, env), 200, { 'Cache-Control': 'public, max-age=15' });
      return json({ error: 'not found' }, 404);
    } catch (e) {
      if (e instanceof Bad) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'server error' }, 500);
    }
  },
};

class Bad extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

async function body(req) {
  const text = await req.text();
  if (text.length > 4096) throw new Bad('request too large', 413);
  try { return JSON.parse(text); } catch { throw new Bad('invalid JSON'); }
}

async function ipHash(req, env) {
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const data = new TextEncoder().encode((env.IP_SALT || 'hippo-heist') + '|' + ip);
  const h = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(h)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

function cleanName(raw) {
  let s = String(raw ?? '').normalize('NFKC');
  s = s.replace(/[\p{C}]/gu, '').replace(/\s+/g, ' ').trim(); // drop control/format/private-use characters
  s = [...s].slice(0, NAME_MAX).join('').trim();
  return s || 'Anonymous hippo';
}

const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

async function startRun(req, env) {
  const b = await body(req);
  const mission = b.mission, difficulty = b.difficulty;
  if (!MISSIONS[mission]) throw new Bad('bad mission');
  if (!DIFFS.includes(difficulty)) throw new Bad('bad difficulty');
  const ip = await ipHash(req, env), now = Date.now();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM runs WHERE ip_hash = ? AND started_at > ?').bind(ip, now - 3600e3).first();
  if (n >= RUNS_PER_HOUR) throw new Bad('too many runs, try again later', 429);
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM runs WHERE started_at < ?').bind(now - 6 * 3600e3), // housekeeping: unposted runs expire
    env.DB.prepare('INSERT INTO runs (id, mission, difficulty, started_at, ip_hash) VALUES (?, ?, ?, ?, ?)').bind(id, mission, difficulty, now, ip),
  ]);
  return { run: id };
}

async function postScore(req, env) {
  const b = await body(req);
  if (typeof b.run !== 'string' || b.run.length > 64) throw new Bad('missing run');
  const score = b.score, time = b.time, st = b.stats && typeof b.stats === 'object' ? b.stats : {};
  if (!int(score, 0, 10_000_000)) throw new Bad('bad score');
  if (!int(time, MIN_TIME, MAX_TIME)) throw new Bad('bad time');
  const stats = {};
  for (const k of STAT_KEYS) { const v = st[k] ?? 0; if (!int(v, 0, 100000)) throw new Bad('bad stats'); stats[k] = v; }

  const ip = await ipHash(req, env), now = Date.now();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE ip_hash = ? AND created_at > ?').bind(ip, now - 3600e3).first();
  if (n >= SCORES_PER_HOUR) throw new Bad('too many scores, try again later', 429);

  // claim the run atomically so it can only post once
  const run = await env.DB.prepare('UPDATE runs SET used = 1 WHERE id = ? AND used = 0 RETURNING mission, difficulty, started_at').bind(b.run).first();
  if (!run) throw new Bad('unknown or already used run', 409);
  const elapsed = (now - run.started_at) / 1000;
  if (time > elapsed + 5) throw new Bad('time does not match the run', 422);
  if (score > scoreCap(time)) throw new Bad('score is not plausible for that time', 422);
  if (stats.fed < MISSIONS[run.mission].need) throw new Bad('the leopard was not freed', 422);

  const name = cleanName(b.name);
  await env.DB.prepare('INSERT INTO scores (mission, difficulty, name, score, time_s, stats, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(run.mission, run.difficulty, name, score, time, JSON.stringify(stats), now, ip).run();
  const { r } = await env.DB.prepare('SELECT COUNT(*) + 1 AS r FROM scores WHERE mission = ? AND (score > ? OR (score = ? AND time_s < ?))').bind(run.mission, score, score, time).first();
  return { ok: true, rank: r, name, mission: run.mission, difficulty: run.difficulty };
}

async function getScores(url, env) {
  const mission = +url.searchParams.get('mission');
  if (!MISSIONS[mission]) throw new Bad('bad mission');
  const d = url.searchParams.get('difficulty');
  const limit = Math.min(200, Math.max(1, +url.searchParams.get('limit') || 100));
  const filter = d && d !== 'all';
  if (filter && !DIFFS.includes(d)) throw new Bad('bad difficulty');
  const sql = `SELECT name, difficulty, score, time_s AS time, created_at AS at FROM scores WHERE mission = ?${filter ? ' AND difficulty = ?' : ''} ORDER BY score DESC, time_s ASC, created_at ASC LIMIT ?`;
  const q = filter ? env.DB.prepare(sql).bind(mission, d, limit) : env.DB.prepare(sql).bind(mission, limit);
  const { results } = await q.all();
  return { mission, difficulty: filter ? d : 'all', scores: results };
}
