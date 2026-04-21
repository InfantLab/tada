/**
 * POST /api/ourmoji/invites/:id/cancel
 *
 * Cancel a pending pairing invite (inviter side).
 */

import { defineEventHandler, createError, getRouterParam } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { cancelInvite } from "~/server/services/ourmoji/invites";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError(unauthorized(event));

  if (!(await isOurmojiEnabledForUser(user.id))) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing invite id" });
  }

  const invite = await cancelInvite(id, user.id);
  return { invite };
});
