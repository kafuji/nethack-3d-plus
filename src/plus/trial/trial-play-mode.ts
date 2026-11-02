/**
 * Trial-and-error is a client-side play mode: NetHack runs it as a normal
 * game, and the client adds save slots on top. The `playmode:trial` token is
 * kept in the startup options (and so in save metadata) to remember the mode,
 * but must never reach NetHack, which only knows normal/explore/debug.
 */
export const TRIAL_PLAY_MODE = "trial";

const TRIAL_PLAY_MODE_TOKEN = `playmode:${TRIAL_PLAY_MODE}`;

function isTrialToken(token: unknown): boolean {
  return String(token ?? "").trim().toLowerCase() === TRIAL_PLAY_MODE_TOKEN;
}

export function isTrialPlayMode(initOptions: readonly unknown[] | null | undefined): boolean {
  return Array.isArray(initOptions) && initOptions.some(isTrialToken);
}

export function toRuntimePlayModeTokens(tokens: string[]): string[] {
  return tokens.map(token => (isTrialToken(token) ? "playmode:normal" : token));
}
