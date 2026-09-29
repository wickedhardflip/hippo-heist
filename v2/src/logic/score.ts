/** Stars: 1 for clearing, +1 for beating the time target, +1 for never being spotted. */
export function scoreStars(r: { won: boolean; time: number; timeTarget: number; spotted: boolean }): 0 | 1 | 2 | 3 {
  if (!r.won) return 0;
  return (1 + (r.time <= r.timeTarget ? 1 : 0) + (r.spotted ? 0 : 1)) as 1 | 2 | 3;
}
