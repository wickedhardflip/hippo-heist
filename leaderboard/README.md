# Hippo Heist leaderboard backend

A Cloudflare Worker with a D1 database that stores scores for completed missions. The game talks to it through `LB_API` in `src/leaderboard.js`. While `LB_API` is empty, the game hides every leaderboard control.

## Endpoints

- `POST /run` with `{mission, difficulty}` returns `{run}`. The game calls it when a mission starts.
- `POST /scores` with `{run, name, score, time, stats}` returns `{ok, rank, name}`. The game calls it when the player posts a winning score.
- `GET /scores?mission=1&difficulty=all&limit=100` returns the top scores, best first.

## Cheat resistance

The score is computed in the player's browser, so a determined player can still fake one. The Worker makes that harder:

- A score must be posted against a run id the Worker handed out, and each run id can be posted only once.
- The reported mission time cannot be longer than the real time since the run started, and must be at least 60 seconds.
- The score must be at most `3000 + 25 x seconds`, and the leopard must have been fed enough bananas to break free.
- Each address can start 60 runs and post 20 scores per hour.
- Writes are only accepted from the origins in `ALLOWED_ORIGINS`.
- Names are capped at 24 characters with control and hidden characters removed. The game shows them as plain text.

To remove a bad entry, run `DELETE FROM scores WHERE id = ...` against the database in the Cloudflare dashboard (D1 > hippo-heist-leaderboard > Console).

## Deploy

The D1 database already exists, and its tables have been created from `schema.sql`. To deploy or redeploy the Worker:

    cd leaderboard
    npx wrangler deploy

Wrangler uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the environment, or a browser login through `npx wrangler login`. The token needs Account > Workers Scripts: Edit and Account > D1: Edit.

To test locally:

    npx wrangler d1 execute hippo-heist-leaderboard --local --file=schema.sql
    npx wrangler dev --local --var ALLOWED_ORIGINS:http://localhost:8080

Then serve `test.html` on port 8080 and open `http://localhost:8080/test.html?lb=http://localhost:8787`.
