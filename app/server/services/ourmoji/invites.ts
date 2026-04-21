/**
 * Ourmoji pairing invites.
 *
 * The UX: rather than entering raw participant user IDs, users pick a
 * partner by username and send a pending invite. The invitee reviews
 * the proposed dates and accepts or declines. On accept, we create the
 * underlying experiment run via the existing createExperiment service.
 */

import { nanoid } from "nanoid";
import { eq, ne, sql } from "drizzle-orm";

import { db } from "~/server/db";
import { users, userPreferences } from "~/server/db/schema";
import {
  getInviteById,
  insertInvite,
  listInvitesForUser,
  updateInviteStatus,
} from "./repository";
import { createExperiment } from "./experiments";
import { isOurmojiEnabledForUser } from "./access";
import { forbidden, notFound } from "./validation";
import { OURMOJI_MODULE_FLAG } from "~/utils/ourmoji/constants";
import type {
  OurmojiExperimentRun,
  OurmojiInvite,
} from "~/server/db/schema";

export interface PartnerCandidate {
  id: string;
  username: string;
}

export async function listOurmojiPartners(
  viewerId: string,
): Promise<PartnerCandidate[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      enabledModules: userPreferences.enabledModules,
    })
    .from(users)
    .innerJoin(userPreferences, eq(userPreferences.userId, users.id))
    .where(ne(users.id, viewerId));

  return rows
    .filter((row) => {
      const flags = row.enabledModules;
      return (
        flags &&
        typeof flags === "object" &&
        (flags as Record<string, unknown>)[OURMOJI_MODULE_FLAG] === true
      );
    })
    .map((row) => ({ id: row.id, username: row.username }));
}

export interface CreateInviteInput {
  fromUserId: string;
  toUserId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export async function createInvite(
  input: CreateInviteInput,
): Promise<OurmojiInvite> {
  if (input.fromUserId === input.toUserId) {
    forbidden("Cannot invite yourself");
  }
  if (input.startDate > input.endDate) {
    forbidden("startDate must be on or before endDate");
  }

  const [fromOk, toOk] = await Promise.all([
    isOurmojiEnabledForUser(input.fromUserId),
    isOurmojiEnabledForUser(input.toUserId),
  ]);
  if (!fromOk) forbidden("Ourmoji is not enabled for your account");
  if (!toOk) forbidden("Selected partner does not have Ourmoji enabled");

  return insertInvite({
    id: nanoid(),
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    status: "pending",
  });
}

export interface ListedInvite extends OurmojiInvite {
  fromUsername: string;
  toUsername: string;
}

export async function listInvitesForViewer(
  viewerId: string,
): Promise<{ incoming: ListedInvite[]; outgoing: ListedInvite[] }> {
  const rows = await listInvitesForUser(viewerId);
  if (rows.length === 0) return { incoming: [], outgoing: [] };

  const userIds = Array.from(
    new Set(rows.flatMap((r) => [r.fromUserId, r.toUserId])),
  );
  const userRows = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(
      sql`${users.id} IN (${sql.join(
        userIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  const usernameById = new Map(userRows.map((u) => [u.id, u.username]));

  const decorate = (r: OurmojiInvite): ListedInvite => ({
    ...r,
    fromUsername: usernameById.get(r.fromUserId) ?? "(unknown)",
    toUsername: usernameById.get(r.toUserId) ?? "(unknown)",
  });

  return {
    incoming: rows
      .filter((r) => r.toUserId === viewerId)
      .map(decorate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    outgoing: rows
      .filter((r) => r.fromUserId === viewerId)
      .map(decorate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function acceptInvite(
  inviteId: string,
  accepterId: string,
): Promise<{ invite: OurmojiInvite; run: OurmojiExperimentRun }> {
  const invite = await getInviteById(inviteId);
  if (!invite) notFound("Invite");
  if (invite.toUserId !== accepterId) {
    forbidden("Only the invited user can accept this invite");
  }
  if (invite.status !== "pending") {
    forbidden(`Cannot accept an invite in status "${invite.status}"`);
  }

  const { run } = await createExperiment({
    name: invite.name,
    startDate: invite.startDate,
    endDate: invite.endDate,
    participantUserIds: [invite.fromUserId, invite.toUserId],
    createdBy: invite.fromUserId,
  });

  await updateInviteStatus(invite.id, {
    status: "accepted",
    runId: run.id,
  });

  const updated = await getInviteById(invite.id);
  return { invite: updated!, run };
}

export async function declineInvite(
  inviteId: string,
  declinerId: string,
): Promise<OurmojiInvite> {
  const invite = await getInviteById(inviteId);
  if (!invite) notFound("Invite");
  if (invite.toUserId !== declinerId) {
    forbidden("Only the invited user can decline this invite");
  }
  if (invite.status !== "pending") {
    forbidden(`Cannot decline an invite in status "${invite.status}"`);
  }

  await updateInviteStatus(invite.id, { status: "declined" });
  return (await getInviteById(invite.id))!;
}

export async function cancelInvite(
  inviteId: string,
  cancelerId: string,
): Promise<OurmojiInvite> {
  const invite = await getInviteById(inviteId);
  if (!invite) notFound("Invite");
  if (invite.fromUserId !== cancelerId) {
    forbidden("Only the inviter can cancel this invite");
  }
  if (invite.status !== "pending") {
    forbidden(`Cannot cancel an invite in status "${invite.status}"`);
  }

  await updateInviteStatus(invite.id, { status: "cancelled" });
  return (await getInviteById(invite.id))!;
}
