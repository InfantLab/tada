/**
 * Participant membership + eligibility for Ourmoji experiment runs.
 *
 * Enforces the "one active experiment per user" guard at the service
 * layer. The DB has a unique (experiment_run_id, user_id) index but
 * cross-run exclusivity is a service-level rule.
 */

import { findActiveParticipationForUser } from "./repository";
import { forbidden } from "./validation";

/** Throw 403 if any of `userIds` is already in an active/scheduled run. */
export async function assertNoActiveParticipation(
  userIds: string[],
): Promise<void> {
  for (const userId of userIds) {
    const rows = await findActiveParticipationForUser(userId);
    if (rows.length > 0) {
      forbidden(
        `User ${userId} is already enrolled in an active Ourmoji experiment`,
      );
    }
  }
}

/** Build a deterministic anonymous label like "participantA" by index. */
export function anonymousLabelForIndex(index: number): string {
  // 0 → A, 25 → Z, 26 → AA, etc.
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `participant${s}`;
}
