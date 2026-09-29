export const CARRY_MAX = 3, PICK_RADIUS = 50, FEED_RADIUS = 90, START_HEARTS = 3;
export type GameState = { hearts: number; carried: number; delivered: number; target: number; remaining: boolean[]; status: 'playing' | 'won' | 'lost'; time: number; spotted: boolean };
export const newGame = (count: number, target: number): GameState => ({ hearts: START_HEARTS, carried: 0, delivered: 0, target, remaining: Array(count).fill(true), status: 'playing', time: 0, spotted: false });
export function pickup(s: GameState, i: number): GameState {
  if (s.status !== 'playing' || s.carried >= CARRY_MAX || !s.remaining[i]) return s;
  const remaining = s.remaining.slice(); remaining[i] = false;
  return { ...s, carried: s.carried + 1, remaining };
}
export function deliver(s: GameState): GameState {
  if (s.status !== 'playing' || s.carried === 0) return s;
  const delivered = s.delivered + s.carried;
  return { ...s, carried: 0, delivered, status: delivered >= s.target ? 'won' : 'playing' };
}
export function caught(s: GameState): GameState {
  if (s.status !== 'playing') return s;
  const hearts = s.hearts - 1;
  return { ...s, hearts, carried: 0, status: hearts <= 0 ? 'lost' : 'playing' };
}
export function restoreDropped(s: GameState, taken: number[]): GameState {
  const remaining = s.remaining.slice(); for (const i of taken) remaining[i] = true;
  return { ...s, remaining };
}
export const tick = (s: GameState, dt: number): GameState => (s.status === 'playing' ? { ...s, time: s.time + dt } : s);
export const markSpotted = (s: GameState): GameState => (s.spotted ? s : { ...s, spotted: true });
