/** Two independent reasons to pause: the player pressed pause, or the phone is in portrait. */
export type PauseState = { user: boolean; portrait: boolean };
export const newPause = (): PauseState => ({ user: false, portrait: false });
export const onOrientation = (s: PauseState, portrait: boolean): PauseState => ({ ...s, portrait });
export const onToggle = (s: PauseState): PauseState => ({ ...s, user: !s.user });
export const isPaused = (s: PauseState) => s.user || s.portrait;
