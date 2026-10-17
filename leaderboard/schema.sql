-- Hippo Heist leaderboard (Cloudflare D1)
-- runs: one row per mission start; a score can only be posted once against a run, and not faster than real time allows
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  mission INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS runs_started ON runs (started_at);
CREATE INDEX IF NOT EXISTS runs_ip ON runs (ip_hash, started_at);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  time_s INTEGER NOT NULL,
  stats TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_board ON scores (mission, score DESC);
CREATE INDEX IF NOT EXISTS scores_ip ON scores (ip_hash, created_at);
