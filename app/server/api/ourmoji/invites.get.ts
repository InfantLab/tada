/**
 * GET /api/ourmoji/invites
 *
 * List the viewer's incoming and outgoing pairing invites.
 */

import { defineEventHandler, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { listInvitesForViewer } from "~/server/services/ourmoji/invites";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError(unauthorized(event));

  if (!(await isOurmojiEnabledForUser(user.id))) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const { incoming, outgoing } = await listInvitesForViewer(user.id);
  return { incoming, outgoing };
});
