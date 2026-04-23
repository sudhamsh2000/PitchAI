/**
 * Wall-clock seconds after session start before the pitch countdown consumes budget.
 * Lets Friday introduce herself without eating the user's timed NABC window.
 */
export const SESSION_COUNTDOWN_GRACE_SECONDS = 15;

/** Elapsed seconds that count against the chosen session length (after intro grace). */
export function budgetElapsedSeconds(wallElapsedSeconds: number): number {
  return Math.max(0, wallElapsedSeconds - SESSION_COUNTDOWN_GRACE_SECONDS);
}
